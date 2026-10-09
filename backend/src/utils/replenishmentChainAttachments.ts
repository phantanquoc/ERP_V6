import prisma from '@config/database';
import { dedupOrdered, normalizeAttachments } from './attachmentUtils';

export type ReplenishmentAggregated = { own: string[]; yccc: string[]; ycmh: string[] | null; all: string[] };

type YBSRow = {
  id: string;
  tepDinhKem?: string[] | null;
  fileKemTheo?: string | null;
  supplyRequestId?: string | null;
  convertedPurchaseRequestId?: string | null;
  supplyRequest?: { tepDinhKem?: string[] | null; fileKemTheo?: string | null } | null;
  convertedPurchaseRequest?: { tepDinhKem?: string[] | null; fileKemTheo?: string | null } | null;
};

export async function resolveReplenishmentChainAttachments(row: YBSRow): Promise<ReplenishmentAggregated> {
  const own = normalizeAttachments(row as never);
  let yccc: string[] = [];
  if (row.supplyRequest) yccc = normalizeAttachments(row.supplyRequest as never);
  else if (row.supplyRequestId) {
    const sr = await prisma.supplyRequest.findUnique({ where: { id: row.supplyRequestId }, select: { tepDinhKem: true, fileKemTheo: true } });
    yccc = normalizeAttachments(sr as never);
  }
  let ycmh: string[] | null = null;
  if (row.convertedPurchaseRequest) ycmh = normalizeAttachments(row.convertedPurchaseRequest as never);
  else if (row.convertedPurchaseRequestId) {
    const pr = await prisma.purchaseRequest.findUnique({ where: { id: row.convertedPurchaseRequestId }, select: { tepDinhKem: true, fileKemTheo: true } });
    ycmh = pr ? normalizeAttachments(pr as never) : null;
  }
  const all = dedupOrdered(yccc, own, ycmh ?? []);
  return { own, yccc, ycmh, all };
}

export async function batchReplenishmentChainAttachments(rows: YBSRow[]): Promise<Map<string, ReplenishmentAggregated>> {
  if (!rows.length) return new Map();
  const ownById = new Map<string, string[]>();
  for (const r of rows) ownById.set(r.id, normalizeAttachments(r as never));

  // Pre-resolve yccc/ycmh from already-included relations if present; otherwise batch fetch missing.
  const needSrIds = rows.filter((r) => !r.supplyRequest && r.supplyRequestId).map((r) => r.supplyRequestId!) as string[];
  const needPrIds = rows.filter((r) => !r.convertedPurchaseRequest && r.convertedPurchaseRequestId).map((r) => r.convertedPurchaseRequestId!) as string[];
  const srMap = new Map<string, string[]>();
  const prMap = new Map<string, string[]>();
  if (needSrIds.length) {
    const uniq = [...new Set(needSrIds)];
    const srs = await prisma.supplyRequest.findMany({ where: { id: { in: uniq } }, select: { id: true, tepDinhKem: true, fileKemTheo: true } });
    for (const s of srs) srMap.set(s.id, normalizeAttachments(s as never));
  }
  if (needPrIds.length) {
    const uniq = [...new Set(needPrIds)];
    const prs = await prisma.purchaseRequest.findMany({ where: { id: { in: uniq } }, select: { id: true, tepDinhKem: true, fileKemTheo: true } });
    for (const p of prs) prMap.set(p.id, normalizeAttachments(p as never));
  }

  const out = new Map<string, ReplenishmentAggregated>();
  for (const r of rows) {
    const own = ownById.get(r.id) ?? [];
    const yccc = r.supplyRequest ? normalizeAttachments(r.supplyRequest as never) : (r.supplyRequestId ? (srMap.get(r.supplyRequestId) ?? []) : []);
    let ycmh: string[] | null = null;
    if (r.convertedPurchaseRequest) ycmh = normalizeAttachments(r.convertedPurchaseRequest as never);
    else if (r.convertedPurchaseRequestId) { const v = prMap.get(r.convertedPurchaseRequestId); ycmh = v !== undefined ? v : null; }
    const all = dedupOrdered(yccc, own, ycmh ?? []);
    out.set(r.id, { own, yccc, ycmh, all });
  }
  return out;
}
