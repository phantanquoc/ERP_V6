-- AlterTable: Add machineId FK to FaultRecord
ALTER TABLE "business"."fault_records" ADD COLUMN "machineId" TEXT;

-- AlterTable: Add machineId FK to RepairRequestItem
ALTER TABLE "common"."repair_request_items" ADD COLUMN "machineId" TEXT;

-- AlterTable: Add machineId FK to AcceptanceHandoverItem
ALTER TABLE "common"."acceptance_handover_items" ADD COLUMN "machineId" TEXT;

-- CreateIndex
CREATE INDEX "fault_records_machineId_idx" ON "business"."fault_records"("machineId");

-- CreateIndex
CREATE INDEX "repair_request_items_machineId_idx" ON "common"."repair_request_items"("machineId");

-- CreateIndex
CREATE INDEX "acceptance_handover_items_machineId_idx" ON "common"."acceptance_handover_items"("machineId");

-- AddForeignKey
ALTER TABLE "business"."fault_records" ADD CONSTRAINT "fault_records_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "business"."machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."repair_request_items" ADD CONSTRAINT "repair_request_items_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "business"."machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."acceptance_handover_items" ADD CONSTRAINT "acceptance_handover_items_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "business"."machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;
