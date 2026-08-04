-- Migration: refactor_machine_as_physical_instance
-- Decision 4 ordering (design.md):
--   Step 1: Add new columns to machine_systems + nullable cols on downstream tables
--           + make FaultTemplate FKs nullable + add hint columns
--   Step 2: Create machine_status_logs table
--   Step 3: Insert placeholder MachineSystem rows for orphan Machines (machineSystemId IS NULL)
--   Step 4: Backfill machineSystemId on six downstream tables
--   Step 5: Drop machineId columns + FKs
--   Step 6: Drop old unique constraints and recreate as [maChien, machineSystemId]
--   Step 7: Drop machines and machine_activity_reports tables
-- All inside one transaction (Postgres transactional DDL).

BEGIN;

-- ─── Pre-flight collision check (task 1.1) ────────────────────────────────────
-- Abort if backfilling FinishedProduct or QualityEvaluation would produce
-- duplicate (maChien, machineSystemId) pairs.

DO $$
DECLARE
  fp_collisions  INTEGER;
  qe_collisions  INTEGER;
BEGIN
  SELECT COUNT(*) INTO fp_collisions
  FROM (
    SELECT fp."maChien",
           COALESCE(m."machineSystemId", ph."id") AS resolved_system_id,
           COUNT(*) AS cnt
    FROM business.finished_products fp
    LEFT JOIN business.machines m ON m.id = fp."machineId"
    LEFT JOIN business.machine_systems ph
           ON ph."maHeThong" = m."maMay"
         AND m."machineSystemId" IS NULL
    WHERE fp."machineId" IS NOT NULL
    GROUP BY fp."maChien", COALESCE(m."machineSystemId", ph."id")
    HAVING COUNT(*) > 1
  ) dupes;

  IF fp_collisions > 0 THEN
    RAISE EXCEPTION
      'Pre-flight FAILED: % duplicate (maChien, machineSystemId) in finished_products. De-duplicate before migrating.',
      fp_collisions;
  END IF;

  SELECT COUNT(*) INTO qe_collisions
  FROM (
    SELECT qe."maChien",
           COALESCE(m."machineSystemId", ph."id") AS resolved_system_id,
           COUNT(*) AS cnt
    FROM business.quality_evaluations qe
    LEFT JOIN business.machines m ON m.id = qe."machineId"
    LEFT JOIN business.machine_systems ph
           ON ph."maHeThong" = m."maMay"
         AND m."machineSystemId" IS NULL
    WHERE qe."machineId" IS NOT NULL
    GROUP BY qe."maChien", COALESCE(m."machineSystemId", ph."id")
    HAVING COUNT(*) > 1
  ) dupes;

  IF qe_collisions > 0 THEN
    RAISE EXCEPTION
      'Pre-flight FAILED: % duplicate (maChien, machineSystemId) in quality_evaluations. De-duplicate before migrating.',
      qe_collisions;
  END IF;
END $$;

-- ─── Step 1a: Add trangThai + parentSystemId to machine_systems ───────────────

ALTER TABLE business.machine_systems
  ADD COLUMN "trangThai"      business."MachineStatus" NOT NULL DEFAULT 'HOAT_DONG',
  ADD COLUMN "parentSystemId" TEXT;

ALTER TABLE business.machine_systems
  ADD CONSTRAINT "machine_systems_parentSystemId_fkey"
    FOREIGN KEY ("parentSystemId")
    REFERENCES business.machine_systems(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "machine_systems_parentSystemId_idx"
  ON business.machine_systems ("parentSystemId");

-- ─── Step 1b: Make FaultTemplate FKs nullable, add hint columns ───────────────

ALTER TABLE business.fault_templates
  ALTER COLUMN "machineSystemId"       DROP NOT NULL,
  ALTER COLUMN "machineSystemDetailId" DROP NOT NULL;

-- Drop old CASCADE FKs and recreate as SET NULL
ALTER TABLE business.fault_templates
  DROP CONSTRAINT "fault_templates_machineSystemId_fkey";

ALTER TABLE business.fault_templates
  ADD CONSTRAINT "fault_templates_machineSystemId_fkey"
    FOREIGN KEY ("machineSystemId")
    REFERENCES business.machine_systems(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE business.fault_templates
  DROP CONSTRAINT "fault_templates_machineSystemDetailId_fkey";

ALTER TABLE business.fault_templates
  ADD CONSTRAINT "fault_templates_machineSystemDetailId_fkey"
    FOREIGN KEY ("machineSystemDetailId")
    REFERENCES business.machine_system_details(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

ALTER TABLE business.fault_templates
  ADD COLUMN IF NOT EXISTS "tenDetailGoiY"  TEXT,
  ADD COLUMN IF NOT EXISTS "loaiDetailGoiY" TEXT;

-- ─── Step 1c: Add nullable machineSystemId columns to downstream tables ───────

-- system_operations
ALTER TABLE business.system_operations
  ADD COLUMN "machineSystemId" TEXT;

ALTER TABLE business.system_operations
  ADD CONSTRAINT "system_operations_machineSystemId_fkey"
    FOREIGN KEY ("machineSystemId")
    REFERENCES business.machine_systems(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "system_operations_machineSystemId_idx"
  ON business.system_operations ("machineSystemId");

-- finished_products
ALTER TABLE business.finished_products
  ADD COLUMN "machineSystemId" TEXT;

ALTER TABLE business.finished_products
  ADD CONSTRAINT "finished_products_machineSystemId_fkey"
    FOREIGN KEY ("machineSystemId")
    REFERENCES business.machine_systems(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "finished_products_machineSystemId_idx"
  ON business.finished_products ("machineSystemId");

-- quality_evaluations
ALTER TABLE business.quality_evaluations
  ADD COLUMN "machineSystemId" TEXT;

ALTER TABLE business.quality_evaluations
  ADD CONSTRAINT "quality_evaluations_machineSystemId_fkey"
    FOREIGN KEY ("machineSystemId")
    REFERENCES business.machine_systems(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "quality_evaluations_machineSystemId_idx"
  ON business.quality_evaluations ("machineSystemId");

-- ─── Step 2: Create machine_status_logs table ─────────────────────────────────

CREATE TABLE business.machine_status_logs (
  "id"              TEXT                             NOT NULL,
  "machineSystemId" TEXT                             NOT NULL,
  "trangThaiCu"     business."MachineStatus"         NOT NULL,
  "trangThaiMoi"    business."MachineStatus"         NOT NULL,
  "nguyenNhan"      TEXT                             NOT NULL,
  "nguoiCapNhat"    TEXT                             NOT NULL,
  "ghiChu"          TEXT,
  "thoiDiem"        TIMESTAMP(3)                     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"       TIMESTAMP(3)                     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3)                     NOT NULL,

  CONSTRAINT "machine_status_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE business.machine_status_logs
  ADD CONSTRAINT "machine_status_logs_machineSystemId_fkey"
    FOREIGN KEY ("machineSystemId")
    REFERENCES business.machine_systems(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;

CREATE INDEX "machine_status_logs_machineSystemId_idx"
  ON business.machine_status_logs ("machineSystemId");

CREATE INDEX "machine_status_logs_thoiDiem_idx"
  ON business.machine_status_logs ("thoiDiem");

-- ─── Step 3: Insert placeholder MachineSystem rows for orphan Machines ────────
-- Machines where machineSystemId IS NULL get a placeholder system row.
-- (In current dev data there are none, but this runs safely as a no-op.)

INSERT INTO business.machine_systems (
  id, "khuVuc", "viTri", "maHeThong", "tenHeThong", "chucNang",
  "loaiHeThong", "hoatDong", "trangThai", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'Chưa phân loại'::text,
  'Chưa xác định'::text,
  m."maMay",
  m."tenMay",
  ''::text,
  'KHAC'::business."MachineSystemCategory",
  TRUE,
  'HOAT_DONG'::business."MachineStatus",
  NOW(),
  NOW()
FROM business.machines m
WHERE m."machineSystemId" IS NULL
ON CONFLICT ("maHeThong") DO NOTHING;

-- ─── Step 4: Backfill machineSystemId on six downstream tables ────────────────

-- 4a. system_operations
UPDATE business.system_operations so
SET "machineSystemId" = COALESCE(m."machineSystemId", ph.id)
FROM business.machines m
LEFT JOIN business.machine_systems ph
  ON ph."maHeThong" = m."maMay"
 AND m."machineSystemId" IS NULL
WHERE so."machineId" = m.id
  AND so."machineSystemId" IS NULL;

-- 4b. finished_products
UPDATE business.finished_products fp
SET "machineSystemId" = COALESCE(m."machineSystemId", ph.id)
FROM business.machines m
LEFT JOIN business.machine_systems ph
  ON ph."maHeThong" = m."maMay"
 AND m."machineSystemId" IS NULL
WHERE fp."machineId" = m.id
  AND fp."machineSystemId" IS NULL;

-- 4c. quality_evaluations
UPDATE business.quality_evaluations qe
SET "machineSystemId" = COALESCE(m."machineSystemId", ph.id)
FROM business.machines m
LEFT JOIN business.machine_systems ph
  ON ph."maHeThong" = m."maMay"
 AND m."machineSystemId" IS NULL
WHERE qe."machineId" = m.id
  AND qe."machineSystemId" IS NULL;

-- 4d. repair_request_items (machineSystemId already exists on this table)
UPDATE common.repair_request_items rri
SET "machineSystemId" = COALESCE(m."machineSystemId", ph.id)
FROM business.machines m
LEFT JOIN business.machine_systems ph
  ON ph."maHeThong" = m."maMay"
 AND m."machineSystemId" IS NULL
WHERE rri."machineId" = m.id
  AND rri."machineSystemId" IS NULL;

-- 4e. acceptance_handover_items (machineSystemId already exists on this table)
UPDATE common.acceptance_handover_items ahi
SET "machineSystemId" = COALESCE(m."machineSystemId", ph.id)
FROM business.machines m
LEFT JOIN business.machine_systems ph
  ON ph."maHeThong" = m."maMay"
 AND m."machineSystemId" IS NULL
WHERE ahi."machineId" = m.id
  AND ahi."machineSystemId" IS NULL;

-- 4f. fault_records (machineSystemId already exists on this table)
UPDATE business.fault_records fr
SET "machineSystemId" = COALESCE(m."machineSystemId", ph.id)
FROM business.machines m
LEFT JOIN business.machine_systems ph
  ON ph."maHeThong" = m."maMay"
 AND m."machineSystemId" IS NULL
WHERE fr."machineId" = m.id
  AND fr."machineSystemId" IS NULL;

-- ─── Step 5: Drop machineId columns and FKs ───────────────────────────────────

-- 5a. system_operations
ALTER TABLE business.system_operations
  DROP CONSTRAINT "system_operations_machineId_fkey";
ALTER TABLE business.system_operations
  DROP COLUMN "machineId",
  DROP COLUMN "tenMay";

-- 5b. finished_products
ALTER TABLE business.finished_products
  DROP CONSTRAINT "finished_products_machineId_fkey";
ALTER TABLE business.finished_products
  DROP COLUMN "machineId",
  DROP COLUMN "tenMay";

-- 5c. quality_evaluations
ALTER TABLE business.quality_evaluations
  DROP CONSTRAINT "quality_evaluations_machineId_fkey";
ALTER TABLE business.quality_evaluations
  DROP COLUMN "machineId",
  DROP COLUMN "tenMay";

-- 5d. repair_request_items
ALTER TABLE common.repair_request_items
  DROP CONSTRAINT "repair_request_items_machineId_fkey";
DROP INDEX common."repair_request_items_machineId_idx";
ALTER TABLE common.repair_request_items
  DROP COLUMN "machineId";

-- 5e. acceptance_handover_items
ALTER TABLE common.acceptance_handover_items
  DROP CONSTRAINT "acceptance_handover_items_machineId_fkey";
DROP INDEX common."acceptance_handover_items_machineId_idx";
ALTER TABLE common.acceptance_handover_items
  DROP COLUMN "machineId";

-- 5f. fault_records
ALTER TABLE business.fault_records
  DROP CONSTRAINT "fault_records_machineId_fkey";
DROP INDEX business."fault_records_machineId_idx";
ALTER TABLE business.fault_records
  DROP COLUMN "machineId";

-- ─── Step 6: Create new unique constraints [maChien, machineSystemId] ────────
-- Note: the old [maChien, machineId] index is automatically dropped by Postgres
-- when the machineId column is dropped in Step 5.

CREATE UNIQUE INDEX "finished_products_maChien_machineSystemId_key"
  ON business.finished_products ("maChien", "machineSystemId");

CREATE UNIQUE INDEX "quality_evaluations_maChien_machineSystemId_key"
  ON business.quality_evaluations ("maChien", "machineSystemId");

-- ─── Step 7: Drop machines and machine_activity_reports ───────────────────────

DROP TABLE business.machines;
DROP TABLE business.machine_activity_reports;

COMMIT;
