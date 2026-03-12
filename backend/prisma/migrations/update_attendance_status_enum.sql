-- Migration: Update AttendanceStatus enum
-- Remove EARLY and PRESENT_LATE, keep PRESENT, LATE, ABSENT, ON_LEAVE, OVERTIME

-- Step 1: Add OVERTIME to enum if not exists
ALTER TYPE "common"."AttendanceStatus" ADD VALUE IF NOT EXISTS 'OVERTIME';

-- Step 2: Update existing data - convert removed statuses
-- EARLY → PRESENT (về sớm vẫn tính là đúng giờ)
UPDATE "common"."attendances" SET "status" = 'PRESENT' WHERE "status" = 'EARLY';

-- PRESENT_LATE → LATE (nếu có dữ liệu cũ từ migration trước)
UPDATE "common"."attendances" SET "status" = 'LATE' WHERE "status" = 'PRESENT_LATE';

-- Step 3: Recreate enum without EARLY and PRESENT_LATE
CREATE TYPE "common"."AttendanceStatus_new" AS ENUM ('PRESENT', 'LATE', 'ABSENT', 'ON_LEAVE', 'OVERTIME');

ALTER TABLE "common"."attendances"
  ALTER COLUMN "status" TYPE "common"."AttendanceStatus_new"
  USING "status"::text::"common"."AttendanceStatus_new";

ALTER TABLE "common"."attendances"
  ALTER COLUMN "status" SET DEFAULT 'PRESENT'::"common"."AttendanceStatus_new";

DROP TYPE "common"."AttendanceStatus";
ALTER TYPE "common"."AttendanceStatus_new" RENAME TO "AttendanceStatus";
