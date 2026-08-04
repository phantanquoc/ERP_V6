-- Migration: enum_fault_record_status
-- Converts FaultRecord.trangThai from String to FaultRecordStatus enum.
-- Maps known Vietnamese string values to enum equivalents.
-- Any unknown/legacy value is mapped to DANG_THEO_DOI with an audit row.

-- Step 1: Create the FaultRecordStatus enum in business schema
CREATE TYPE "business"."FaultRecordStatus" AS ENUM ('DANG_THEO_DOI', 'DA_XU_LY', 'TAI_PHAT');

-- Step 2: Create the FaultRecordStatusLog table
CREATE TABLE "business"."fault_record_status_logs" (
    "id" VARCHAR(30) NOT NULL,
    "faultRecordId" TEXT NOT NULL,
    "oldStatus" "business"."FaultRecordStatus",
    "newStatus" "business"."FaultRecordStatus" NOT NULL,
    "actorId" VARCHAR(30),
    "reason" TEXT,
    "source" VARCHAR(64) NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT "fault_record_status_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "fault_record_status_logs_faultRecordId_createdAt_idx"
    ON "business"."fault_record_status_logs"("faultRecordId", "createdAt" DESC);

ALTER TABLE "business"."fault_record_status_logs"
    ADD CONSTRAINT "fault_record_status_logs_faultRecordId_fkey"
    FOREIGN KEY ("faultRecordId") REFERENCES "business"."fault_records"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 3: Add temp column for the new enum type
ALTER TABLE "business"."fault_records"
    ADD COLUMN "trangThai_new" "business"."FaultRecordStatus" NOT NULL DEFAULT 'DANG_THEO_DOI';

-- Step 4: Data migration — map known Vietnamese strings to enum values
UPDATE "business"."fault_records"
SET "trangThai_new" = CASE
    WHEN "trangThai" = 'Đang theo dõi' THEN 'DANG_THEO_DOI'::"business"."FaultRecordStatus"
    WHEN "trangThai" = 'Đã xử lý'      THEN 'DA_XU_LY'::"business"."FaultRecordStatus"
    WHEN "trangThai" = 'Tái phát'       THEN 'TAI_PHAT'::"business"."FaultRecordStatus"
    ELSE 'DANG_THEO_DOI'::"business"."FaultRecordStatus"
END;

-- Step 5: Insert legacy_migration_fallback log rows for unknown/unexpected trangThai values
INSERT INTO "business"."fault_record_status_logs" ("id", "faultRecordId", "oldStatus", "newStatus", "source", "reason", "createdAt")
SELECT
    gen_random_uuid()::text,
    "id",
    NULL,
    'DANG_THEO_DOI'::"business"."FaultRecordStatus",
    'legacy_migration_fallback',
    'Migrated from unknown legacy value: ' || COALESCE("trangThai", '(null)'),
    NOW()
FROM "business"."fault_records"
WHERE "trangThai" NOT IN ('Đang theo dõi', 'Đã xử lý', 'Tái phát')
   OR "trangThai" IS NULL;

-- Step 6: Drop the old string column and rename the new enum column
ALTER TABLE "business"."fault_records" DROP COLUMN "trangThai";
ALTER TABLE "business"."fault_records" RENAME COLUMN "trangThai_new" TO "trangThai";
