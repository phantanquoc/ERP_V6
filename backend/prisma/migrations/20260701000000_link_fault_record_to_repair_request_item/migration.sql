-- Migration: link_fault_record_to_repair_request_item
-- Additive, non-destructive: adds optional FK from RepairRequestItem to FaultRecord.

-- Step 1: Add the nullable faultRecordId column
ALTER TABLE "common"."repair_request_items" ADD COLUMN "faultRecordId" VARCHAR(30) NULL;

-- Step 2: Create index on faultRecordId
CREATE INDEX "repair_request_items_faultRecordId_idx" ON "common"."repair_request_items"("faultRecordId");

-- Step 3: Add the foreign key constraint
ALTER TABLE "common"."repair_request_items"
    ADD CONSTRAINT "repair_request_items_faultRecordId_fkey"
    FOREIGN KEY ("faultRecordId") REFERENCES "business"."fault_records"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
