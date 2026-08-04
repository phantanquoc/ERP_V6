-- Reconcile the live schema with prisma/schema/*.prisma
--
-- The database and the Prisma schema had drifted apart: columns existed in Postgres
-- that no model declared, index names differed, and several column types/defaults no
-- longer matched. `prisma migrate diff` therefore emitted these statements on every
-- run, meaning any future `migrate dev` would have swept them into an unrelated
-- change. This migration applies them deliberately, once, so the drift is gone.
--
-- Verified on BOTH dev and prod before writing (2026-08-04):
--   * invoices / tax_reports              0 rows       -> dropping the 4 unused columns loses nothing
--   * debts."supplierId" IS NULL          0 rows       -> SET NOT NULL cannot fail
--   * invoices."tongTien" IS NULL         0 rows       -> dropping the defaults is safe
--   * fault_record_status_logs            0 rows       -> the type change touches nothing
--   * overtime_plan_items                 46 dev / 55 prod rows, but the server runs UTC,
--                                                      so timestamptz -> timestamp(3) shifts by 00:00:00
--
-- Everything is guarded (IF EXISTS / IF NOT EXISTS / DO blocks) so re-running is a
-- no-op and the file stays safe if an environment has already been partially fixed.

-- ─── Enum value ──────────────────────────────────────────────────────────────
-- ADD VALUE cannot run inside a transaction block on older PostgreSQL, and cannot be
-- guarded by IF NOT EXISTS in all versions, so it is wrapped in a catch-duplicate DO.
DO $$
BEGIN
    ALTER TYPE "business"."MaintenanceFrequency" ADD VALUE IF NOT EXISTS 'KHONG_CO_DINH';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

-- ─── Drop columns that no model declares (verified empty on dev and prod) ────
ALTER TABLE "business"."invoices"    DROP COLUMN IF EXISTS "createdById";
ALTER TABLE "business"."invoices"    DROP COLUMN IF EXISTS "khachHang";
ALTER TABLE "business"."invoices"    DROP COLUMN IF EXISTS "nhaCungCap";
ALTER TABLE "business"."tax_reports" DROP COLUMN IF EXISTS "createdById";

-- Indexes on the dropped columns disappear with them; these guard the case where an
-- index outlived its column.
DROP INDEX IF EXISTS "business"."invoices_createdById_idx";
DROP INDEX IF EXISTS "business"."tax_reports_createdById_idx";

-- ─── Column nullability and defaults ─────────────────────────────────────────
ALTER TABLE "business"."debts"
    ALTER COLUMN "soTienPhaiTra"     DROP NOT NULL,
    ALTER COLUMN "soTienPhaiTra"     DROP DEFAULT,
    ALTER COLUMN "soTienDaThanhToan" DROP NOT NULL,
    ALTER COLUMN "supplierId"        SET NOT NULL;

ALTER TABLE "business"."invoices"
    ALTER COLUMN "tongTien"  DROP DEFAULT,
    ALTER COLUMN "thueVAT"   DROP DEFAULT,
    ALTER COLUMN "thanhTien" DROP DEFAULT;

-- ─── Column types ────────────────────────────────────────────────────────────
ALTER TABLE "business"."fault_record_status_logs"
    ALTER COLUMN "actorId"   SET DATA TYPE TEXT,
    ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

ALTER TABLE "common"."overtime_plan_items"
    ALTER COLUMN "ngayTangCa"      SET DATA TYPE TIMESTAMP(3),
    ALTER COLUMN "nguoiThamGiaIds" DROP DEFAULT,
    ALTER COLUMN "createdAt"       SET DATA TYPE TIMESTAMP(3),
    ALTER COLUMN "updatedAt"       DROP DEFAULT,
    ALTER COLUMN "updatedAt"       SET DATA TYPE TIMESTAMP(3);

-- ─── Foreign keys renamed to Prisma's convention ─────────────────────────────
ALTER TABLE "common"."overtime_plan_items"
    DROP CONSTRAINT IF EXISTS "overtime_plan_items_overtime_plan_fk";
ALTER TABLE "common"."overtime_plan_items"
    DROP CONSTRAINT IF EXISTS "overtime_plan_items_work_shift_fk";

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'overtime_plan_items_overtimePlanId_fkey') THEN
        ALTER TABLE "common"."overtime_plan_items"
            ADD CONSTRAINT "overtime_plan_items_overtimePlanId_fkey"
            FOREIGN KEY ("overtimePlanId") REFERENCES "common"."overtime_plans"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'overtime_plan_items_workShiftId_fkey') THEN
        ALTER TABLE "common"."overtime_plan_items"
            ADD CONSTRAINT "overtime_plan_items_workShiftId_fkey"
            FOREIGN KEY ("workShiftId") REFERENCES "common"."work_shifts"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END
$$;

-- ─── Missing indexes ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "fault_records_trangThai_idx" ON "business"."fault_records"("trangThai");
CREATE INDEX IF NOT EXISTS "tax_reports_orderId_idx"     ON "business"."tax_reports"("orderId");
CREATE INDEX IF NOT EXISTS "tax_reports_trangThai_idx"   ON "business"."tax_reports"("trangThai");

-- ─── Index names ─────────────────────────────────────────────────────────────
-- Renamed only when the old name is present and the new one is not, so a partially
-- reconciled database is left alone.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('business', 'finished_product_entry_history_maChien_ngaySanXuat_machineSy_id',
                         'finished_product_entry_history_maChien_ngaySanXuat_machineS_idx'),
            ('common',   'overtime_plan_items_ngay_tang_ca_idx',
                         'overtime_plan_items_ngayTangCa_idx'),
            ('common',   'overtime_plan_items_overtime_plan_id_idx',
                         'overtime_plan_items_overtimePlanId_idx'),
            ('common',   'overtime_plan_items_work_shift_id_idx',
                         'overtime_plan_items_workShiftId_idx')
        ) AS t(sch, old_name, new_name)
    LOOP
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = r.sch AND indexname = r.old_name)
           AND NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = r.sch AND indexname = r.new_name)
        THEN
            EXECUTE format('ALTER INDEX %I.%I RENAME TO %I', r.sch, r.old_name, r.new_name);
        END IF;
    END LOOP;
END
$$;
