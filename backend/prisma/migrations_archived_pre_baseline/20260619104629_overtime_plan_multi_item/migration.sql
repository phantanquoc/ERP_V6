-- Migration: overtime_plan_multi_item
-- Refactors OvertimePlan to a parent-child model where each plan owns one or more
-- OvertimePlanItem rows. Per-day fields (ngayTangCa, gioBatDau, gioKetThuc,
-- nguoiThamGiaIds, trangThaiTiepNhan, gioThucTe) move from the parent to child items.
--
-- Order of operations (all inside one transaction):
--   Step 1: Create common.overtime_plan_items with FKs and indexes
--   Step 2: Backfill one item per existing overtime_plans row
--   Step 3: Drop the six migrated columns from overtime_plans
-- Timestamp 20260619104629 > 20260618120000 (refactor_machine_as_physical_instance chain).

BEGIN;

-- ─── Step 1: Create overtime_plan_items ──────────────────────────────────────

CREATE TABLE common.overtime_plan_items (
  id                  TEXT            NOT NULL,
  "overtimePlanId"    TEXT            NOT NULL,
  "ngayTangCa"        TIMESTAMPTZ     NOT NULL,
  "gioBatDau"         TEXT            NOT NULL,
  "gioKetThuc"        TEXT            NOT NULL,
  "workShiftId"       TEXT,
  "workShiftName"     TEXT,
  "nguoiThamGiaIds"   TEXT[]          NOT NULL DEFAULT '{}',
  "ghiChuItem"        TEXT,
  "trangThaiTiepNhan" JSONB           NOT NULL DEFAULT '{}',
  "gioThucTe"         JSONB           NOT NULL DEFAULT '{}',
  "createdAt"         TIMESTAMPTZ     NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMPTZ     NOT NULL DEFAULT now(),

  CONSTRAINT overtime_plan_items_pkey PRIMARY KEY (id),
  CONSTRAINT overtime_plan_items_overtime_plan_fk
    FOREIGN KEY ("overtimePlanId")
    REFERENCES common.overtime_plans (id)
    ON DELETE CASCADE,
  CONSTRAINT overtime_plan_items_work_shift_fk
    FOREIGN KEY ("workShiftId")
    REFERENCES common.work_shifts (id)
    ON DELETE SET NULL
);

CREATE INDEX overtime_plan_items_overtime_plan_id_idx
  ON common.overtime_plan_items ("overtimePlanId");

CREATE INDEX overtime_plan_items_ngay_tang_ca_idx
  ON common.overtime_plan_items ("ngayTangCa");

CREATE INDEX overtime_plan_items_work_shift_id_idx
  ON common.overtime_plan_items ("workShiftId");

-- ─── Step 2: Backfill one item per existing plan ─────────────────────────────
-- Each item gets a deterministic id from gen_random_uuid() prefixed with 'ovt_item_'
-- so it looks like a cuid-style string (Prisma generates ids app-side anyway;
-- the prefix makes the origin clear for debugging).

INSERT INTO common.overtime_plan_items (
  id,
  "overtimePlanId",
  "ngayTangCa",
  "gioBatDau",
  "gioKetThuc",
  "workShiftId",
  "workShiftName",
  "nguoiThamGiaIds",
  "trangThaiTiepNhan",
  "gioThucTe",
  "createdAt",
  "updatedAt"
)
SELECT
  concat('ovt_item_', gen_random_uuid()::text),
  id,
  "ngayTangCa",
  "gioBatDau",
  "gioKetThuc",
  NULL,
  NULL,
  "nguoiThamGiaIds",
  COALESCE("trangThaiTiepNhan"::jsonb, '{}'::jsonb),
  COALESCE("gioThucTe"::jsonb, '{}'::jsonb),
  "createdAt",
  "updatedAt"
FROM common.overtime_plans;

-- ─── Step 3: Drop the six migrated columns from overtime_plans ───────────────

ALTER TABLE common.overtime_plans
  DROP COLUMN "ngayTangCa",
  DROP COLUMN "gioBatDau",
  DROP COLUMN "gioKetThuc",
  DROP COLUMN "nguoiThamGiaIds",
  DROP COLUMN "trangThaiTiepNhan",
  DROP COLUMN "gioThucTe";

COMMIT;
