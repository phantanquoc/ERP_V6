/**
 * cleanup-kiem-tra.ts
 * Admin script: chuyen data rac repair_requests WHERE request_type='KIEM_TRA'
 * sang inspection_requests (theo migration sketch common.prisma:980-992).
 *
 * KHONG tu dong xoa production — mac dinh la dry-run (preview only).
 * Chay that phai truyen --execute.
 *
 * Usage:
 *   npx ts-node backend/scripts/cleanup-kiem-tra.ts              # dry-run preview
 *   npx ts-node backend/scripts/cleanup-kiem-tra.ts --execute    # thuc hien migrate
 *   DATABASE_URL=... npx ts-node backend/scripts/cleanup-kiem-tra.ts --execute
 *
 * SQL tuong duong: backend/prisma/migrations/manual-migrate-kiem-tra.sql
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes('--execute');

async function main() {
  console.log(DRY_RUN ? '🔍 DRY-RUN — chi preview, khong ghi DB. Them --execute de thuc hien.' : '⚠️  EXECUTE mode — se ghi DB');
  console.log('');

  // 1) Preview
  const kiemTraRows: Array<{ id: number; maYeuCau: string; trangThai: string }> = await prisma.$queryRaw`
    SELECT id, ma_yeu_cau as "maYeuCau", trang_thai::text as "trangThai"
    FROM common.repair_requests WHERE request_type = 'KIEM_TRA' ORDER BY id`;
  console.log(`Found ${kiemTraRows.length} repair_requests WHERE request_type='KIEM_TRA'`);
  if (kiemTraRows.length > 0) {
    console.table(kiemTraRows.slice(0, 20));
    if (kiemTraRows.length > 20) console.log(`... and ${kiemTraRows.length - 20} more`);
  }

  const itemCount: Array<{ count: bigint }> = await prisma.$queryRaw`
    SELECT COUNT(*)::bigint as count FROM common.repair_request_items
    WHERE repair_request_id IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA')`;
  const logCount: Array<{ count: bigint }> = await prisma.$queryRaw`
    SELECT COUNT(*)::bigint as count FROM common.repair_request_status_logs
    WHERE repair_request_id IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA')`;
  console.log(`Related items: ${itemCount[0]?.count ?? 0}, status logs: ${logCount[0]?.count ?? 0}`);

  if (kiemTraRows.length === 0) {
    console.log('✅ Khong co data rac — khong can migrate.');
    return;
  }

  // Guard: repairRequestService.createRepairRequest da chan KIEM_TRA qua /repair-requests
  console.log('ℹ️  Guard: repairRequestService.createRepairRequest throws neu requestType=KIEM_TRA (khong tao them rac).');

  if (DRY_RUN) {
    console.log('\nTODO: chay lai voi --execute de thuc hien INSERT -> inspection_requests va DELETE khoi repair_requests.');
    console.log('Hoac chay SQL: psql "$DATABASE_URL" -f backend/prisma/migrations/manual-migrate-kiem-tra.sql');
    return;
  }

  // 2) Execute trong transaction — idempotent via ON CONFLICT DO NOTHING
  console.log('\n🚀 Bat dau migrate...');
  await prisma.$executeRaw`BEGIN`;

  // Parent
  const insertedParents = await prisma.$executeRaw`
    INSERT INTO common.inspection_requests (
      id, ngay_thang, ma_yeu_cau, muc_do_uu_tien, ghi_chu, trang_thai,
      phong_ban_id, file_dinh_kem, created_by_id, created_by_name, created_at, updated_at
    )
    SELECT
      id, ngay_thang, ma_yeu_cau, muc_do_uu_tien, ghi_chu,
      CASE trang_thai WHEN 'LEN_KE_HOACH' THEN 'HOAN_THANH'::common."InspectionRequestStatus" ELSE trang_thai::text::common."InspectionRequestStatus" END,
      phong_ban_id, file_dinh_kem, created_by_id, created_by_name, created_at, updated_at
    FROM common.repair_requests WHERE request_type = 'KIEM_TRA'
    ON CONFLICT (id) DO NOTHING`;
  console.log(`  inspection_requests inserted (attempted): ${insertedParents}`);

  const insertedItems = await prisma.$executeRaw`
    INSERT INTO common.inspection_request_items (
      id, inspection_request_id, machine_system_id, machine_system_detail_id, fault_record_id,
      ten_he_thong, tinh_trang_thiet_bi, loai_loi, noi_dung_loi, created_at, updated_at
    )
    SELECT id, repair_request_id, machine_system_id, machine_system_detail_id, fault_record_id,
           ten_he_thong, tinh_trang_thiet_bi, loai_loi, noi_dung_loi, created_at, updated_at
    FROM common.repair_request_items
    WHERE repair_request_id IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA')
    ON CONFLICT (id) DO NOTHING`;
  console.log(`  inspection_request_items inserted: ${insertedItems}`);

  const insertedLogs = await prisma.$executeRaw`
    INSERT INTO common.inspection_request_status_logs (
      id, inspection_request_id, old_status, new_status, actor_id, actor_role, reason, created_at
    )
    SELECT
      id, repair_request_id,
      CASE WHEN old_status IS NULL THEN NULL WHEN old_status::text='LEN_KE_HOACH' THEN 'HOAN_THANH'::common."InspectionRequestStatus" ELSE old_status::text::common."InspectionRequestStatus" END,
      CASE WHEN new_status::text='LEN_KE_HOACH' THEN 'HOAN_THANH'::common."InspectionRequestStatus" ELSE new_status::text::common."InspectionRequestStatus" END,
      actor_id, actor_role, reason, created_at
    FROM common.repair_request_status_logs
    WHERE repair_request_id IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA')
    ON CONFLICT (id) DO NOTHING`;
  console.log(`  inspection_request_status_logs inserted: ${insertedLogs}`);

  await prisma.$executeRaw`SELECT setval('common.inspection_requests_id_seq', (SELECT COALESCE(MAX(id),1) FROM common.inspection_requests), true)`;
  console.log('  sequence fixed');

  // Delete children first for FK safety, then parent
  await prisma.$executeRaw`DELETE FROM common.repair_request_status_logs WHERE repair_request_id IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA')`;
  await prisma.$executeRaw`DELETE FROM common.repair_request_items WHERE repair_request_id IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA')`;
  // Best-effort clean related tables (quoted identifiers) — ignore if not exists
  for (const sql of [
    `DELETE FROM common."RepairRequestAssignee" WHERE "repairRequestId" IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA')`,
    `DELETE FROM common."RepairMaterialNeed" WHERE "repairRequestId" IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA')`,
    `DELETE FROM common."RepairSupplyLink" WHERE "repairRequestId" IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA')`,
    `DELETE FROM common."AcceptanceHandover" WHERE "repairRequestId" IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA')`,
  ]) {
    try { await prisma.$executeRawUnsafe(sql); } catch { /* table may use different casing — skip */ }
  }
  const deleted = await prisma.$executeRaw`DELETE FROM common.repair_requests WHERE request_type='KIEM_TRA'`;
  console.log(`  repair_requests deleted: ${deleted}`);

  await prisma.$executeRaw`COMMIT`;
  console.log('\n✅ Migrate hoan tat. Verify: SELECT COUNT(*) FROM common.repair_requests WHERE request_type=\'KIEM_TRA\' -- expect 0');
}

main()
  .catch(async (e) => {
    try { await prisma.$executeRaw`ROLLBACK`; } catch {}
    console.error('❌ Loi:', e);
    process.exit(1);
  })
  .finally(async () => { await prisma.$disconnect(); });
