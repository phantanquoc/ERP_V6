import prisma from '@config/database';
import { dedupOrdered, normalizeAttachments } from './attachmentUtils';

export type AggregatedAttachments = { own: string[]; ybs: string[] | null; yccc: string[]; all: string[] };

type PRRow = { id: string; maYeuCau?: string; tepDinhKem?: string[] | null; fileKemTheo?: string | null; supplyRequestId?: string | null };

async function ycccForPR(pr: PRRow): Promise<string[]> {
  if (pr.supplyRequestId) {
    const sr = await prisma.supplyRequest.findUnique({ where: { id: pr.supplyRequestId }, select: { tepDinhKem: true, fileKemTheo: true } });
    return normalizeAttachments(sr as never);
  }
  // Via decisions hop (YCBS chain or legacy SHORTAGE)
  const decs = await prisma.supplyRequestDecision.findMany({
    where: { OR: [{ triggeredPurchaseRequestId: pr.id }, { triggeredReplenishmentRequest: { convertedPurchaseRequestId: pr.id } }] } as never,
    select: { supplyRequestItemId: true },
  });
  if (!decs.length) return [];
  const items = await prisma.supplyRequestItem.findMany({ where: { id: { in: decs.map((d: { supplyRequestItemId: string }) => d.supplyRequestItemId) } }, select: { supplyRequestId: true } });
  const srIds = [...new Set(items.map((i) => i.supplyRequestId))];
  if (!srIds.length) return [];
  const srs = await prisma.supplyRequest.findMany({ where: { id: { in: srIds } }, select: { tepDinhKem: true, fileKemTheo: true } });
  return dedupOrdered(...srs.map((s) => normalizeAttachments(s as never)));
}

async function ybsForPR(pr: PRRow): Promise<string[] | null> {
  const ybs = await prisma.replenishmentRequest.findFirst({ where: { convertedPurchaseRequestId: pr.id }, select: { tepDinhKem: true, fileKemTheo: true } });
  if (ybs) return normalizeAttachments(ybs as never);
  return null;
}

export async function resolvePurchaseChainAttachments(pr: PRRow): Promise<AggregatedAttachments> {
  const own = normalizeAttachments(pr as never);
  const [ybs, yccc] = await Promise.all([ybsForPR(pr), ycccForPR(pr)]);
  const all = dedupOrdered(yccc, ybs ?? [], own);
  return { own, ybs, yccc, all };
}

export async function batchPurchaseChainAttachments(prs: PRRow[]): Promise<Map<string, AggregatedAttachments>> {
  if (!prs.length) return new Map();
  const prIds = prs.map((p) => p.id);
  const srIds = [...new Set(prs.map((p) => p.supplyRequestId).filter(Boolean) as string[])];
  const srMap = new Map<string, string[]>();
  if (srIds.length) {
    const srs = await prisma.supplyRequest.findMany({ where: { id: { in: srIds } }, select: { id: true, tepDinhKem: true, fileKemTheo: true } });
    for (const s of srs) srMap.set(s.id, normalizeAttachments(s as never));
  }
  // Hop for prs without supplyRequestId
  const noSrIds = prs.filter((p) => !p.supplyRequestId).map((p) => p.id);
  const hopYccc = new Map<string, string[]>();
  if (noSrIds.length) {
    const decs = await (prisma.supplyRequestDecision.findMany as unknown as (args: unknown) => Promise<Array<{ triggeredPurchaseRequestId?: string | null; triggeredReplenishmentRequestId?: string | null; supplyRequestItemId: string }>>)({
      where: { OR: [{ triggeredPurchaseRequestId: { in: noSrIds } }, { triggeredReplenishmentRequest: { convertedPurchaseRequestId: { in: noSrIds } } }] },
      select: { triggeredPurchaseRequestId: true, triggeredReplenishmentRequestId: true, supplyRequestItemId: true },
    });
    // We need to map back: group by prId
    // For direct triggeredPurchaseRequestId, key is that id; for via YCBS we need to resolve YCBS -> PR
    const viaYbsIds = [...new Set(decs.filter((d) => d.triggeredReplenishmentRequestId).map((d) => d.triggeredReplenishmentRequestId!))];
    const ybsToPr = new Map<string, string>();
    if (viaYbsIds.length) {
      const ybss = await prisma.replenishmentRequest.findMany({ where: { id: { in: viaYbsIds } }, select: { id: true, convertedPurchaseRequestId: true } });
      for (const y of ybss) if (y.convertedPurchaseRequestId) ybsToPr.set(y.id, y.convertedPurchaseRequestId);
    }
    const byPr = new Map<string, string[]>();
    for (const d of decs) {
      const prId = d.triggeredPurchaseRequestId ?? (d.triggeredReplenishmentRequestId ? ybsToPr.get(d.triggeredReplenishmentRequestId) : undefined);
      if (!prId) continue;
      const arr = byPr.get(prId) ?? [];
      arr.push(d.supplyRequestItemId);
      byPr.set(prId, arr);
    }
    if (byPr.size) {
      const allItemIds = [...new Set([...byPr.values()].flat())];
      const items = await prisma.supplyRequestItem.findMany({ where: { id: { in: allItemIds } }, select: { id: true, supplyRequestId: true } });
      const itemToSr = new Map(items.map((i) => [i.id, i.supplyRequestId]));
      const srIdsHop = [...new Set(items.map((i) => i.supplyRequestId))];
      const srsHop = srIdsHop.length ? await prisma.supplyRequest.findMany({ where: { id: { in: srIdsHop } }, select: { id: true, tepDinhKem: true, fileKemTheo: true } }) : [];
      const srHopMap = new Map(srsHop.map((s) => [s.id, normalizeAttachments(s as never)]));
      for (const [prId, itemIds] of byPr) {
        const srsForPr = [...new Set(itemIds.map((iid) => itemToSr.get(iid)).filter(Boolean) as string[])];
        const parts = srsForPr.map((sid) => srHopMap.get(sid) ?? []);
        hopYccc.set(prId, dedupOrdered(...parts));
      }
    }
  }
  const ybsRows = await prisma.replenishmentRequest.findMany({ where: { convertedPurchaseRequestId: { in: prIds } }, select: { convertedPurchaseRequestId: true, tepDinhKem: true, fileKemTheo: true } });
  const ybsMap = new Map<string, string[]>();
  for (const r of ybsRows) if (r.convertedPurchaseRequestId) ybsMap.set(r.convertedPurchaseRequestId, normalizeAttachments(r as never));

  const out = new Map<string, AggregatedAttachments>();
  for (const pr of prs) {
    const own = normalizeAttachments(pr as never);
    const ybs = ybsMap.has(pr.id) ? ybsMap.get(pr.id)! : null;
    const ycccDirect = pr.supplyRequestId ? (srMap.get(pr.supplyRequestId) ?? []) : [];
    const ycccHop = hopYccc.get(pr.id) ?? [];
    const yccc = pr.supplyRequestId ? ycccDirect : ycccHop;
    const all = dedupOrdered(yccc, ybs ?? [], own);
    out.set(pr.id, { own, ybs, yccc, all });
  }
  return out;
}
