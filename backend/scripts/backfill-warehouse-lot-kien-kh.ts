/**
 * Backfill So Lo / So Kien KH/TT cho phieu cu bi NULL.
 * Lan tao dau KH == TT, nhung FE cu chua gui 4 field nay nen DB luu NULL.
 * Script lap day: KH = TT ?? tenLo/maKien, TT = tenLo/maKien neu cung NULL.
 *
 * Usage:
 *   Dry-run:  npx tsx scripts/backfill-warehouse-lot-kien-kh.ts --dry-run
 *   Thuc chay: npx tsx scripts/backfill-warehouse-lot-kien-kh.ts
 *   Prod:     docker compose exec backend npx tsx scripts/backfill-warehouse-lot-kien-kh.ts --dry-run
 */

import prisma from '../src/config/database';

async function main() {
  const dryRun = process.argv.includes('--dry-run') || process.argv.includes('--dry');

  const receiptCount: any = await prisma.$queryRaw`
    SELECT COUNT(*)::bigint as count FROM business.warehouse_receipt_items
    WHERE "soLoKeHoach" IS NULL OR "soKienKeHoach" IS NULL OR "soLoThucTe" IS NULL OR "soKienThucTe" IS NULL
  `;
  const issueCount: any = await prisma.$queryRaw`
    SELECT COUNT(*)::bigint as count FROM business.warehouse_issue_items
    WHERE "soLoKeHoach" IS NULL OR "soKienKeHoach" IS NULL OR "soLoThucTe" IS NULL OR "soKienThucTe" IS NULL
  `;
  const rc = Number(receiptCount[0]?.count ?? 0);
  const ic = Number(issueCount[0]?.count ?? 0);
  console.log(`[backfill] Receipt items NULL: ${rc}, Issue items NULL: ${ic}`);

  if (dryRun) {
    console.log('[backfill] Dry-run: khong ghi DB');
    const sampleR: any = await prisma.$queryRaw`
      SELECT id, "tenLo", "maKien", "soLoKeHoach", "soLoThucTe", "soKienKeHoach", "soKienThucTe"
      FROM business.warehouse_receipt_items
      WHERE "soLoKeHoach" IS NULL LIMIT 5
    `;
    const sampleI: any = await prisma.$queryRaw`
      SELECT id, "tenLo", "maKien", "soLoKeHoach", "soLoThucTe", "soKienKeHoach", "soKienThucTe"
      FROM business.warehouse_issue_items
      WHERE "soLoKeHoach" IS NULL LIMIT 5
    `;
    if (sampleR.length) console.log('[backfill] Sample receipt items:', JSON.stringify(sampleR, null, 2));
    if (sampleI.length) console.log('[backfill] Sample issue items:', JSON.stringify(sampleI, null, 2));
    return;
  }

  if (rc > 0) {
    const res: any = await prisma.$executeRaw`
      UPDATE business.warehouse_receipt_items
      SET "soLoKeHoach" = COALESCE("soLoKeHoach", "soLoThucTe", "tenLo"),
          "soKienKeHoach" = COALESCE("soKienKeHoach", "soKienThucTe", "maKien"),
          "soLoThucTe" = COALESCE("soLoThucTe", "tenLo"),
          "soKienThucTe" = COALESCE("soKienThucTe", "maKien")
      WHERE "soLoKeHoach" IS NULL OR "soKienKeHoach" IS NULL OR "soLoThucTe" IS NULL OR "soKienThucTe" IS NULL
    `;
    console.log(`[backfill] Updated receipt items: ${res}`);
  }
  if (ic > 0) {
    const res: any = await prisma.$executeRaw`
      UPDATE business.warehouse_issue_items
      SET "soLoKeHoach" = COALESCE("soLoKeHoach", "soLoThucTe", "tenLo"),
          "soKienKeHoach" = COALESCE("soKienKeHoach", "soKienThucTe", "maKien"),
          "soLoThucTe" = COALESCE("soLoThucTe", "tenLo"),
          "soKienThucTe" = COALESCE("soKienThucTe", "maKien")
      WHERE "soLoKeHoach" IS NULL OR "soKienKeHoach" IS NULL OR "soLoThucTe" IS NULL OR "soKienThucTe" IS NULL
    `;
    console.log(`[backfill] Updated issue items: ${res}`);
  }
  console.log('[backfill] Done');
}

main()
  .catch((e) => {
    console.error('[backfill] Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
