-- =============================================================================
-- manual-migrate-kiem-tra.sql
-- Chuyen data rac: repair_requests WHERE request_type='KIEM_TRA' -> inspection_requests
-- Sinh tu migration sketch dong 980-992 trong common.prisma
-- Chay bang: psql "$DATABASE_URL" -f backend/prisma/migrations/manual-migrate-kiem-tra.sql
-- Hoac: docker compose exec db psql -U postgres -d erp -f /path/to/manual-migrate-kiem-tra.sql
-- LUU Y: read-only preview truoc — chay SELECT kiem tra so dong truoc khi chay INSERT/DELETE
-- =============================================================================

-- 0) Preview — chay rieng de xac nhan data rac ton tai
-- SELECT id, ma_yeu_cau, trang_thai, created_at FROM common.repair_requests WHERE request_type = 'KIEM_TRA';
-- SELECT COUNT(*) FROM common.repair_requests WHERE request_type = 'KIEM_TRA';
-- SELECT COUNT(*) FROM common.repair_request_items WHERE repair_request_id IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA');
-- SELECT COUNT(*) FROM common.repair_request_status_logs WHERE repair_request_id IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA');

BEGIN;

-- 1) Parent: repair_requests -> inspection_requests
--    LEN_KE_HOACH khong ton tai trong InspectionRequestStatus -> map sang HOAN_THANH
INSERT INTO common.inspection_requests (
  id, ngay_thang, ma_yeu_cau, muc_do_uu_tien, ghi_chu, trang_thai,
  phong_ban_id, file_dinh_kem, created_by_id, created_by_name, created_at, updated_at
)
SELECT
  id,
  ngay_thang,
  ma_yeu_cau,
  muc_do_uu_tien,
  ghi_chu,
  CASE trang_thai WHEN 'LEN_KE_HOACH' THEN 'HOAN_THANH'::common."InspectionRequestStatus" ELSE trang_thai::text::common."InspectionRequestStatus" END,
  phong_ban_id,
  file_dinh_kem,
  created_by_id,
  created_by_name,
  created_at,
  updated_at
FROM common.repair_requests
WHERE request_type = 'KIEM_TRA'
ON CONFLICT (id) DO NOTHING;

-- 2) Children: repair_request_items -> inspection_request_items
--    Su dung ON CONFLICT DO NOTHING de idempotent khi chay lai
INSERT INTO common.inspection_request_items (
  id, inspection_request_id, machine_system_id, machine_system_detail_id, fault_record_id,
  ten_he_thong, tinh_trang_thiet_bi, loai_loi, noi_dung_loi, created_at, updated_at
)
SELECT
  rri.id,
  rri.repair_request_id,
  rri.machine_system_id,
  rri.machine_system_detail_id,
  rri.fault_record_id,
  rri.ten_he_thong,
  rri.tinh_trang_thiet_bi,
  rri.loai_loi,
  rri.noi_dung_loi,
  rri.created_at,
  rri.updated_at
FROM common.repair_request_items rri
WHERE rri.repair_request_id IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA')
ON CONFLICT (id) DO NOTHING;

-- 3) Status logs: repair_request_status_logs -> inspection_request_status_logs
--    Chi insert neu id chua ton tai (idempotent)
INSERT INTO common.inspection_request_status_logs (
  id, inspection_request_id, old_status, new_status, actor_id, actor_role, reason, created_at
)
SELECT
  rsl.id,
  rsl.repair_request_id,
  CASE WHEN rsl.old_status IS NULL THEN NULL
       WHEN rsl.old_status::text = 'LEN_KE_HOACH' THEN 'HOAN_THANH'::common."InspectionRequestStatus"
       ELSE rsl.old_status::text::common."InspectionRequestStatus" END,
  CASE WHEN rsl.new_status::text = 'LEN_KE_HOACH' THEN 'HOAN_THANH'::common."InspectionRequestStatus"
       ELSE rsl.new_status::text::common."InspectionRequestStatus" END,
  rsl.actor_id,
  rsl.actor_role,
  rsl.reason,
  rsl.created_at
FROM common.repair_request_status_logs rsl
WHERE rsl.repair_request_id IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA')
ON CONFLICT (id) DO NOTHING;

-- 4) Fix sequences (autoincrement) sau khi insert voi id cu
SELECT setval('common.inspection_requests_id_seq', (SELECT COALESCE(MAX(id), 1) FROM common.inspection_requests), true);

-- 5) Xoa data rac khoi repair_requests (cascade xoa items/logs/assignees/links/need/handovers neu FK la CASCADE;
--    neu khong, can xoa children truoc — thu tu duoi day an toan cho ca 2 truong hop)
DELETE FROM common.repair_request_status_logs WHERE repair_request_id IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA');
DELETE FROM common.repair_request_items       WHERE repair_request_id IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA');
-- Cac bang lien quan khac (neu co KIEM_TRA rac thi thuong khong co link, nhung van xoa cho sach)
DELETE FROM common."RepairRequestAssignee"    WHERE "repairRequestId" IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA');
DELETE FROM common."RepairMaterialNeed"       WHERE "repairRequestId" IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA');
DELETE FROM common."RepairSupplyLink"         WHERE "repairRequestId" IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA');
DELETE FROM common."AcceptanceHandover"       WHERE "repairRequestId" IN (SELECT id FROM common.repair_requests WHERE request_type='KIEM_TRA');
DELETE FROM common.repair_requests            WHERE request_type = 'KIEM_TRA';

COMMIT;

-- 6) Verify sau chay
-- SELECT COUNT(*) AS kiem_tra_con_lai FROM common.repair_requests WHERE request_type='KIEM_TRA'; -- expect 0
-- SELECT COUNT(*) AS inspection_total FROM common.inspection_requests;
