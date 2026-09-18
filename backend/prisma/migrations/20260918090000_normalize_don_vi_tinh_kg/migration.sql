-- Normalize DON_VI_TINH "kg"/"KG" case variants to canonical "Kg".
--
-- Viết ngày: 2026-09-18. Đo dữ liệu trên DB dev (docker exec postgres, database
-- erp_database) cùng ngày — xem chi tiết số dòng ảnh hưởng ở khối MEASURED ON DEV DB
-- bên dưới (tổng 3 rows bẩn trên dev: quotation_request_items=3, quotation_calculator_products=1;
-- 19/21 cột còn lại = 0 rows).
--
-- ⚠️ CẢNH BÁO: CHƯA CHẠY - CẦN XÁC NHẬN TRƯỚC KHI APPLY. Đây là data migration ảnh
-- hưởng dữ liệu thật, khó revert nếu không backup trước. Số liệu trên production
-- CHƯA được đo lại — phải đo lại trên DB đích trước khi áp dụng, kể cả trên dev.
--
-- NOT APPLIED. Written for review only — see task instructions. This is a DATA
-- migration on production-shaped tables; get explicit confirmation before running.
--
-- Apply manually with:
--   psql "$DATABASE_URL" -f backend/prisma/migrations/20260918090000_normalize_don_vi_tinh_kg/migration.sql
-- or:
--   docker compose -f docker-compose.dev.yml exec -T postgres \
--     psql -U erp_user -d erp_database -f - < backend/prisma/migrations/20260918090000_normalize_don_vi_tinh_kg/migration.sql
--
-- BACKGROUND
-- `donViTinh` (and its `donVi`-named siblings) is a free-text String column copied
-- from `common.lookups.label` at write time — NOT a foreign key into Lookup. Every
-- one of the 21 columns below must be updated individually; updating only the
-- Lookup row would leave every already-written business record on "kg"/"KG".
-- (Verified against backend/src/services/lookupService.ts LOOKUP_COLUMN_MAP,
-- "21 columns across 20 tables", and against backend/prisma/schema/*.prisma —
-- no @relation exists from any donViTinh/donVi field to Lookup.)
--
-- MEASURED ON DEV DB (docker exec postgres, erp_database), 2026-09-18:
--   business.quotation_request_items.donViTinh:   kg=2, KG=1   (of 4 rows total)
--   business.quotation_calculator_products.donViTinh: kg=1     (of 2 rows total)
--   All other 19 columns below: 0 rows with 'kg' or 'KG' (checked individually).
--   common.lookups (group='DON_VI_TINH'): 23 rows total; 3 label variants of Kg
--     — code=DON_VI_TINH_KG   label='Kg' (sortOrder 0, canonical, KEEP)
--     — code=DON_VI_TINH_KG_2 label='kg' (sortOrder 21, DELETE after cascade)
--     — code=DON_VI_TINH_KG_3 label='KG' (sortOrder 22, DELETE after cascade)
--
-- Matching is EXACT on 'kg'/'KG' only — no other unit variants are touched (does
-- NOT touch dirty values in PHAN_LOAI_VAT_TU / LOAI_CHI_PHI, which are out of scope).

BEGIN;

-- 1) Cascade the label fix across every column that stores DON_VI_TINH values.
--    (List and column names verified 1:1 against LOOKUP_COLUMN_MAP.DON_VI_TINH.)

UPDATE business.international_products
  SET "donViTinh" = 'Kg' WHERE "donViTinh" IN ('kg', 'KG');

UPDATE business.quotation_request_items
  SET "donViTinh" = 'Kg' WHERE "donViTinh" IN ('kg', 'KG');

UPDATE business.quotations
  SET "donViTinh" = 'Kg' WHERE "donViTinh" IN ('kg', 'KG');

UPDATE business.general_costs
  SET "donViTinh" = 'Kg' WHERE "donViTinh" IN ('kg', 'KG');

UPDATE business.export_costs
  SET "donViTinh" = 'Kg' WHERE "donViTinh" IN ('kg', 'KG');

UPDATE business.quotation_calculator_products
  SET "donViTinh" = 'Kg' WHERE "donViTinh" IN ('kg', 'KG');

UPDATE business.quotation_calculator_general_costs
  SET "donViTinh" = 'Kg' WHERE "donViTinh" IN ('kg', 'KG');

UPDATE business.quotation_calculator_export_costs
  SET "donViTinh" = 'Kg' WHERE "donViTinh" IN ('kg', 'KG');

UPDATE business.supply_requests
  SET "donViTinh" = 'Kg' WHERE "donViTinh" IN ('kg', 'KG');

UPDATE business.supply_request_items
  SET "donViTinh" = 'Kg' WHERE "donViTinh" IN ('kg', 'KG');

UPDATE business.purchase_requests
  SET "donViTinh" = 'Kg' WHERE "donViTinh" IN ('kg', 'KG');

UPDATE business.purchase_request_items
  SET "donViTinh" = 'Kg' WHERE "donViTinh" IN ('kg', 'KG');

UPDATE business.lot_products
  SET "donViTinh" = 'Kg' WHERE "donViTinh" IN ('kg', 'KG');

UPDATE business.warehouse_receipt_items
  SET "donViTinh" = 'Kg' WHERE "donViTinh" IN ('kg', 'KG');

UPDATE business.warehouse_issue_items
  SET "donViTinh" = 'Kg' WHERE "donViTinh" IN ('kg', 'KG');

UPDATE business.order_items
  SET "donVi" = 'Kg' WHERE "donVi" IN ('kg', 'KG');

UPDATE business.spare_parts
  SET "donVi" = 'Kg' WHERE "donVi" IN ('kg', 'KG');

UPDATE business.project_costs
  SET "donVi" = 'Kg' WHERE "donVi" IN ('kg', 'KG');

UPDATE common.process_flowchart_costs
  SET "donVi" = 'Kg' WHERE "donVi" IN ('kg', 'KG');

UPDATE common.production_flowchart_costs
  SET "donVi" = 'Kg' WHERE "donVi" IN ('kg', 'KG');

-- TaxReport.donViTinh is @map("donVi") — the real Postgres column is "donVi",
-- not "donViTinh". Confirmed against schema comment in lookupService.ts.
UPDATE business.tax_reports
  SET "donVi" = 'Kg' WHERE "donVi" IN ('kg', 'KG');

-- 2) Remove the now-orphaned dirty Lookup rows for 'kg' / 'KG'. Safe only after
--    step 1 above has run in the SAME transaction — no business row can still
--    reference the old labels.
--    NOTE: production row ids will differ from dev; match by (group, code) or
--    (group, label) instead of hardcoding the dev cuids observed on 2026-09-18
--    (id=cmsctitbw000lg6k593o88h8d code=DON_VI_TINH_KG_2 label='kg';
--     id=cmsctitbx000mg6k5d3bv0ei0 code=DON_VI_TINH_KG_3 label='KG').

-- LookupChangeLog.lookup has onDelete: SetNull, so any existing audit rows
-- referencing these ids get lookupId=NULL automatically — the audit trail
-- itself is never deleted (it is documented as immutable).

DELETE FROM common.lookups
  WHERE "group" = 'DON_VI_TINH' AND label IN ('kg', 'KG');

COMMIT;

-- Post-migration verification (run manually, not part of the transaction):
--   SELECT "group", code, label FROM common.lookups WHERE "group"='DON_VI_TINH' ORDER BY "sortOrder";
--   -- expect exactly 21 rows, no 'kg'/'KG' labels left.
--   SELECT "donViTinh", COUNT(*) FROM business.quotation_request_items GROUP BY "donViTinh";
--   SELECT "donViTinh", COUNT(*) FROM business.quotation_calculator_products GROUP BY "donViTinh";
--   -- expect no 'kg'/'KG' rows, and the count under 'Kg' increased by the amounts above.
