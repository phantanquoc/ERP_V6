-- Backfill: project_tasks."thuTu"
--
-- Why this migration exists, and why its timestamp sits between two applied ones:
--
--   20260603000000_add_fault_record_spare_part_project  CREATE TABLE business.project_tasks  (no "thuTu")
--   20260604000000_backfill_project_tasks_thu_tu        <- this file: ADD COLUMN "thuTu"
--   20260605000000_complete_technical_department_batch_a CREATE INDEX ... ("projectId","projectPhaseId","thuTu")
--
-- The 20260605 migration indexes project_tasks."thuTu", but no migration ever created
-- that column. Live databases have it (it was added out-of-band), so day-to-day work is
-- unaffected — but replaying history from an empty database fails at the CREATE INDEX
-- with: column "thuTu" does not exist.
--
-- That replay is exactly what Prisma does when it builds a shadow database, so
-- `prisma migrate dev` has been unusable on this repo. Every schema change had to be
-- hand-written instead. This file closes the gap.
--
-- IF NOT EXISTS makes it a no-op on dev and prod, where the column is already present;
-- it only does real work when history is replayed from scratch.

ALTER TABLE "business"."project_tasks"
    ADD COLUMN IF NOT EXISTS "thuTu" INTEGER NOT NULL DEFAULT 0;
