-- AlterTable: add check-in window fields and unique constraint on name
ALTER TABLE "common"."work_shifts" ADD COLUMN "checkInWindowStart" TEXT;
ALTER TABLE "common"."work_shifts" ADD COLUMN "checkInWindowEnd" TEXT;

-- Deduplicate any existing rows sharing the same name (keep earliest by createdAt)
DELETE FROM "common"."work_shifts" a
USING "common"."work_shifts" b
WHERE a.ctid < b.ctid
  AND a.name = b.name;

CREATE UNIQUE INDEX "work_shifts_name_key" ON "common"."work_shifts"("name");
