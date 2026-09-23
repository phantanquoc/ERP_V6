/**
 * Void 1 trong 2 phieu nhap trung 46/47 (cung YCMH/YCC).
 * Giu audit: detach supplyRequestId truoc khi isVoided, hoan tac ton, ghi auditLog.
 * Yeu cau: chay bang ADMIN userId de vuot guard isLocked.
 *
 * Usage:
 *   1. Dry-run (khong ghi DB):  npx ts-node scripts/void-duplicate-receipts-46-47.ts --dry --keep=46 --void=47
 *   2. That (can ADMIN_ID):      ADMIN_ID=<uuid admin> npx ts-node scripts/void-duplicate-receipts-46-47.ts --keep=46 --void=47
 *   3. Vo hieu nguoc lai:        ... --keep=47 --void=46
 *
 *   46/47 o day la HAU TO maPhieuNhap (VD PN-YYYY-046). Script tu dong tim maPhieuNhap chua "046"/"047"
 *   neu khong tim thay se fallback tim theo id chua "46"/"47". Co the truyen truc tiep maPhieuNhap day du:
 *     --void=PN-2026-047 --keep=PN-2026-046
 *
 * Prod:
 *   docker compose exec backend npx ts-node scripts/void-duplicate-receipts-46-47.ts --dry --keep=46 --void=47
 *   (kiem tra output), roi chay that voi ADMIN_ID cua ban.
 */

import prisma from '../src/config/database';

type Args = { keep: string; voidId: string; dry: boolean; adminId?: string };

function parseArgs(): Args {
  const raw = process.argv.slice(2);
  const get = (k: string) => {
    const hit = raw.find((a) => a.startsWith(`--${k}=`));
    return hit ? hit.slice(`--${k}=`.length) : undefined;
  };
  const keep = get('keep') ?? '';
  const voidId = get('void') ?? '';
  const dry = raw.includes('--dry');
  const adminId = process.env.ADMIN_ID?.trim() || undefined;
  if (!keep || !voidId) {
    console.error('Thieu --keep va --void. VD: --keep=46 --void=47  (hau to maPhieuNhap) hoac --keep=PN-2026-046 --void=PN-2026-047');
    process.exit(1);
  }
  return { keep, voidId, dry, adminId };
}

async function resolveReceipt(key: string) {
  // Try exact maPhieuNhap first
  let r: any = await prisma.warehouseReceipt.findFirst({
    where: { maPhieuNhap: key } as any,
    include: { items: true } as any,
  });
  if (r) return r;
  // Try contains (hau to "46"/"47")
  r = await prisma.warehouseReceipt.findFirst({
    where: { maPhieuNhap: { contains: key } } as any,
    include: { items: true } as any,
  });
  if (r) return r;
  // Fallback by id contains
  r = await prisma.warehouseReceipt.findFirst({
    where: { id: key } as any,
    include: { items: true } as any,
  });
  return r ?? null;
}

async function main() {
  const { keep, voidId, dry, adminId } = parseArgs();
  console.log(`[void-dup] keep=${keep} void=${voidId} dry=${dry} adminId=${adminId ? adminId.slice(0, 8) + '...' : '(none)'}`);

  const keepR: any = await resolveReceipt(keep);
  const voidR: any = await resolveReceipt(voidId);

  if (!keepR) { console.error(`Khong tim thay phieu keep=${keep}`); process.exit(2); }
  if (!voidR) { console.error(`Khong tim thay phieu void=${voidId}`); process.exit(2); }

  const sumQty = (r: any) => (r.items ?? []).reduce((s: number, it: any) => s + Number(it.soLuongThucTe ?? 0), 0);

  console.log(`\nKEEP: ${keepR.maPhieuNhap} id=${keepR.id} isVoided=${keepR.isVoided} supplyRequestId=${keepR.supplyRequestId ?? 'null'} purchaseRequestId=${(keepR as any).purchaseRequestId ?? 'null'} items=${keepR.items?.length} qty=${sumQty(keepR)}`);
  console.log(`VOID: ${voidR.maPhieuNhap} id=${voidR.id} isVoided=${voidR.isVoided} supplyRequestId=${voidR.supplyRequestId ?? 'null'} purchaseRequestId=${(voidR as any).purchaseRequestId ?? 'null'} items=${voidR.items?.length} qty=${sumQty(voidR)}`);

  if (voidR.isVoided) { console.log('\nPhieu void da isVoided=true — khong can lam gi.'); process.exit(0); }
  if (keepR.isVoided) console.warn('CANH BAO: phieu keep dang isVoided=true.');

  // Check cung YCMH ?
  const prKeep = (keepR as any).purchaseRequestId ?? null;
  const prVoid = (voidR as any).purchaseRequestId ?? null;
  if (prKeep && prVoid && prKeep !== prVoid) {
    console.warn(`CANH BAO: 2 phieu khac purchaseRequestId (${prKeep} vs ${prVoid}) — co the khong phai trung cung YCMH.`);
  }

  // So sanh ten hang trung
  const norm = (s: string) => (s ?? '').toLowerCase().trim();
  const keepNames = new Set((keepR.items ?? []).map((it: any) => norm(it.tenSanPham)));
  const overlap = (voidR.items ?? []).filter((it: any) => keepNames.has(norm(it.tenSanPham))).map((it: any) => it.tenSanPham);
  console.log(`Trung ten hang: ${overlap.length ? overlap.join(', ') : '(khong trung ten — kiem tra thu cong)'}`);

  if (dry) {
    console.log('\n[DRY-RUN] Khong ghi DB. De that: bo --dry va dat ADMIN_ID=<uuid admin>.');
    console.log('Hanh dong that se:');
    console.log('  1) SELECT ... FOR UPDATE phieu void');
    console.log('  2) sumByPackage -> increment lotProduct.soLuong (hoan tac ton)');
    console.log('  3) detach supplyRequestId -> null (ADMIN override, audit VOID_LINKED)');
    console.log('  4) update isVoided=true, voidReason="Trung phieu nhap voi <keep> — vo hieu theo yeu cau", voidedAt, voidedBy=ADMIN_ID');
    console.log('  5) recordAudit VOID');
    process.exit(0);
  }

  if (!adminId) {
    console.error('Thieu ADMIN_ID env. Dat ADMIN_ID=<uuid admin> de vuot guard isLocked. Lay id admin tu SELECT id FROM auth.users WHERE role=\'ADMIN\' LIMIT 1;');
    process.exit(3);
  }

  // That — goi service void da patch ADMIN override, hoac tu lam transaction nhu service
  // Thu goi service neu da patch
  try {
    const mod: any = await import('../src/services/warehouseReceiptService');
    const svc: any = mod.default ?? mod;
    if (svc?.void) {
      console.log('\nGoi warehouseReceiptService.void() voi ADMIN override...');
      const res = await svc.void(voidR.id, { voidReason: `Trùng phiếu nhập với ${keepR.maPhieuNhap} — vô hiệu theo yêu cầu (46/47)`, userId: adminId, userRole: 'ADMIN' });
      console.log('OK void via service:', res?.id ?? voidR.id, 'isVoided=', (res as any)?.isVoided);
      process.exit(0);
    }
  } catch (e: any) {
    console.warn('Khong goi duoc service void, fallback transaction thu cong:', e?.message);
  }

  // Fallback transaction thu cong (mirror service logic)
  console.log('\nFallback: transaction thu cong...');
  const result = await prisma.$transaction(async (tx: any) => {
    await tx.$queryRaw`SELECT id FROM business.warehouse_receipts WHERE id = ${voidR.id} FOR UPDATE`;
    const existing: any = await tx.warehouseReceipt.findUnique({ where: { id: voidR.id }, include: { items: true } });
    if (!existing) throw new Error('Khong tim thay phieu');
    if (existing.isVoided) throw new Error('Phieu da vo hieu');
    const stored: any[] = existing.items ?? [];
    // Hoan tac ton
    if (stored.length > 0) {
      const byLot = new Map<string, number>();
      for (const it of stored) {
        const k = it.lotProductId; if (!k) continue;
        byLot.set(k, (byLot.get(k) ?? 0) + Number(it.soLuongThucTe ?? 0));
      }
      for (const [lotProductId, qty] of byLot) {
        await tx.lotProduct.update({ where: { id: lotProductId }, data: { soLuong: { increment: qty } } });
      }
    }
    // Detach supplyRequestId truoc khi void (ADMIN)
    if (existing.supplyRequestId) {
      await tx.warehouseReceipt.update({ where: { id: voidR.id }, data: { supplyRequestId: null } as any });
    }
    const updated = await tx.warehouseReceipt.update({
      where: { id: voidR.id },
      data: { isVoided: true, voidReason: `Trùng phiếu nhập với ${keepR.maPhieuNhap} — vô hiệu theo yêu cầu (46/47)`, voidedAt: new Date(), voidedBy: adminId } as any,
    });
    try {
      const { recordAudit } = await import('../src/utils/auditLog');
      await recordAudit({
        entityType: 'WarehouseReceipt',
        entityId: voidR.id,
        action: 'VOID',
        actorId: adminId,
        actorRole: 'ADMIN',
        note: `Vô hiệu phiếu trùng ${voidR.maPhieuNhap} (giữ ${keepR.maPhieuNhap}), detach supplyRequestId ${existing.supplyRequestId ?? 'null'}`,
        after: { maPhieuNhap: existing.maPhieuNhap, voidedFrom: keepR.maPhieuNhap },
      } as any);
    } catch {}
    return updated;
  });

  console.log('OK fallback void:', (result as any).id, 'isVoided=', (result as any).isVoided);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
