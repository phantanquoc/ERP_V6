-- Migration: harden_repair_request_lifecycle
-- Converts RepairRequest.trangThai from String to RepairRequestStatus enum.
-- Maps known Vietnamese string values to enum equivalents.
-- Any unknown/legacy value is mapped to CHO_XU_LY with an audit row.

-- Step 1: Create the enum type
CREATE TYPE "common"."RepairRequestStatus" AS ENUM ('CHO_XU_LY', 'DANG_SUA_CHUA', 'HOAN_THANH', 'DA_HUY');

-- Step 2: Create the status log table BEFORE the enum cast
-- so we can insert legacy fallback rows (repair_requests.id is still accessible)
CREATE TABLE "business"."repair_request_status_logs" (
    "id" TEXT NOT NULL,
    "repairRequestId" INTEGER NOT NULL,
    "oldStatus" "common"."RepairRequestStatus" NOT NULL,
    "newStatus" "common"."RepairRequestStatus" NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repair_request_status_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "repair_request_status_logs_repairRequestId_idx" ON "business"."repair_request_status_logs"("repairRequestId");
CREATE INDEX "repair_request_status_logs_createdAt_idx" ON "business"."repair_request_status_logs"("createdAt");

ALTER TABLE "business"."repair_request_status_logs"
    ADD CONSTRAINT "repair_request_status_logs_repairRequestId_fkey"
    FOREIGN KEY ("repairRequestId") REFERENCES "common"."repair_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 3: Insert legacy fallback log rows BEFORE the enum cast
-- so the trangThai column is still a text column and we can query its value
INSERT INTO "business"."repair_request_status_logs" (id, "repairRequestId", "oldStatus", "newStatus", "actorId", reason, "createdAt")
SELECT
    gen_random_uuid()::text,
    id,
    'CHO_XU_LY'::"common"."RepairRequestStatus",
    'CHO_XU_LY'::"common"."RepairRequestStatus",
    NULL,
    'legacy_migration_fallback',
    NOW()
FROM "common"."repair_requests"
WHERE "trangThai" NOT IN ('Chờ xử lý', 'Đang sửa chữa', 'Hoàn thành');

-- Step 4: Map legacy string values to enum using CASE, then cast the column
-- Uses a temporary column approach for safe type conversion
ALTER TABLE "common"."repair_requests"
    ADD COLUMN "trangThaiNew" "common"."RepairRequestStatus" NOT NULL DEFAULT 'CHO_XU_LY';

UPDATE "common"."repair_requests"
SET "trangThaiNew" = CASE "trangThai"
    WHEN 'Đang sửa chữa' THEN 'DANG_SUA_CHUA'::"common"."RepairRequestStatus"
    WHEN 'Hoàn thành'    THEN 'HOAN_THANH'::"common"."RepairRequestStatus"
    ELSE                      'CHO_XU_LY'::"common"."RepairRequestStatus"
END;

ALTER TABLE "common"."repair_requests" DROP COLUMN "trangThai";
ALTER TABLE "common"."repair_requests" RENAME COLUMN "trangThaiNew" TO "trangThai";
