-- Cancel audit for the 3 request flows (YCCB / YCBS / YCMH): reason + timestamp + actor.
-- trangThai stays a free String ("Đã hủy" already used by YCCB/YCBS cancel); these
-- columns only carry the audit trail so the UI can show WHY a ticket was cancelled.
-- Apply: psql "$DATABASE_URL" -f backend/prisma/migrations/20260915000001_add_cancel_reason_to_requests/migration.sql

ALTER TABLE "business"."supply_requests"
  ADD COLUMN IF NOT EXISTS "lyDoHuy"   TEXT,
  ADD COLUMN IF NOT EXISTS "ngayHuy"   TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "nguoiHuy"  TEXT;

ALTER TABLE "business"."replenishment_requests"
  ADD COLUMN IF NOT EXISTS "lyDoHuy"   TEXT,
  ADD COLUMN IF NOT EXISTS "ngayHuy"   TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "nguoiHuy"  TEXT;

ALTER TABLE "business"."purchase_requests"
  ADD COLUMN IF NOT EXISTS "lyDoHuy"   TEXT,
  ADD COLUMN IF NOT EXISTS "ngayHuy"   TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "nguoiHuy"  TEXT;
