import prisma from '@config/database';
import { dedupOrdered, normalizeAttachments } from './attachmentUtils';

export type SupplyAggregated = { own: string[]; ybs: string[]; ycmh: string[]; all: string[] };

// SupplyRequest already knows its purchaseRequests / replenishmentRequests from include.
// Fall back to lookups when not included (e.g. minimal selects).
async function ybsForSR(row: any): Promise<string[]> {
  if (Array.isArray(row?.replenishmentRequests)) {
    return dedupOrdered(...row.replenishmentRequests.map((r: any) => normalizeAttachments(r as never)));
  }
  if (row?.id) {
    const ybss = await prisma.replenishmentRequest.findMany({ where: { supplyRequestId: row.id }, select: { tepDinhKem: true, fileKemTheo: true } });
    return dedupOrdered(...ybss.map((r) => normalizeAttachments(r as never)));
  }
  return [];
}

async function ycmhForSR(row: any): Promise<string[]> {
  if (Array.isArray(row?.purchaseRequests)) {
    return dedupOrdered(...row.purchaseRequests.map((r: any) => normalizeAttachments(r as never)));
  }
  if (row?.id) {
    const prs = await prisma.purchaseRequest.findMany({ where: { supplyRequestId: row.id }, select: { tepDinhKem: true, fileKemTheo: true } });
    return dedupOrdered(...prs.map((r) => normalizeAttachments(r as never)));
  }
  return [];
}

export async function resolveSupplyChainAttachments(row: any): Promise<SupplyAggregated> {
  const own = normalizeAttachments(row as never);
  const [ybs, ycmh] = await Promise.all([ybsForSR(row), ycmhForSR(row)]);
  return { own, ybs, ycmh, all: dedupOrdered(own, ybs, ycmh) };
}

// Batch: collect all ids, single queries, map back. Keeps list responses O(1) round-trips.
export async function batchSupplyChainAttachments(rows: any[]): Promise<Map<string, SupplyAggregated>> {
  if (!rows.length) return new Map();
  const ownById = new Map<string, string[]>();
  for (const r of rows) ownById.set(r.id, normalizeAttachments(r as never));
  const ids = rows.map((r) => r.id);
  const hasIncludedYbs = rows.every((r) => Array.isArray(r.replenishmentRequests));
  const hasIncludedYcmh = rows.every((r) => Array.isArray(r.purchaseRequests));
  let ybsBySr = new Map<string, string[]>();
  let ycmhBySr = new Map<string, string[]>();
  if (!hasIncludedYbs) {
    const ybss = await prisma.replenishmentRequest.findMany({ where: { supplyRequestId: { in: ids } }, select: { supplyRequestId: true, tepDinhKem: true, fileKemTheo: true } });
    const tmp = new Map<string, string[][]>();
    for (const r of ybss) {
      const arr = tmp.get(r.supplyRequestId!) ?? [];
      arr.push(normalizeAttachments(r as never));
      tmp.set(r.supplyRequestId!, arr);
    }
    for (const [k, parts] of tmp) ybsBySr.set(k, dedupOrdered(...parts));
  } else {
    for (const r of rows) ybsBySr.set(r.id, dedupOrdered(...(r.replenishmentRequests ?? []).map((x: any) => normalizeAttachments(x as never))));
  }
  if (!hasIncludedYcmh) {
    const prs = await prisma.purchaseRequest.findMany({ where: { supplyRequestId: { in: ids } }, select: { supplyRequestId: true, tepDinhKem: true, fileKemTheo: true } });
    const tmp = new Map<string, string[][]>();
    for (const p of prs) {
      const arr = tmp.get(p.supplyRequestId!) ?? [];
      arr.push(normalizeAttachments(p as never));
      tmp.set(p.supplyRequestId!, arr);
    }
    for (const [k, parts] of tmp) ycmhBySr.set(k, dedupOrdered(...parts));
  } else {
    for (const r of rows) ycmhBySr.set(r.id, dedupOrdered(...(r.purchaseRequests ?? []).map((x: any) => normalizeAttachments(x as never))));
  }
  const out = new Map<string, SupplyAggregated>();
  for (const r of rows) {
    const own = ownById.get(r.id) ?? [];
    const ybs = ybsBySr.get(r.id) ?? [];
    const ycmh = ycmhBySr.get(r.id) ?? [];
    out.set(r.id, { own, ybs, ycmh, all: dedupOrdered(own, ybs, ycmh) });
  }
  return out;
}
