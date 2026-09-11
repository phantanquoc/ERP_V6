-- Link WarehouseReceipt to its PurchaseRequest (YCMH) so a single slip
-- can capture "what was actually bought and in what quantities" vs "what the
-- supply request asked for". Hand-added YCBS lines that were never part of the
-- source SR are still visible on the PR and thus on the receipt — the SR
-- aggregate (allDone = fulfilledQty >= soLuong) stays on the original lines so
-- the stranded-goods trap is gone, but the receipt is still audit-linked to the PR.
-- Apply: psql $DATABASE_URL -f .../migration.sql

ALTER TABLE "business"."warehouse_receipts"
  ADD COLUMN IF NOT EXISTS "purchaseRequestId" TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'warehouse_receipts_purchaseRequestId_fkey') THEN
    ALTER TABLE "business"."warehouse_receipts"
      ADD CONSTRAINT "warehouse_receipts_purchaseRequestId_fkey"
      FOREIGN KEY ("purchaseRequestId") REFERENCES "business"."purchase_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "warehouse_receipts_purchaseRequestId_idx"
  ON "business"."warehouse_receipts"("purchaseRequestId");
