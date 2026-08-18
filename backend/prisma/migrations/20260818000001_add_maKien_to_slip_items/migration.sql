-- Add maKien (slot code K1.1…) to slip line items — denormalized from LotProduct.maKien at time of document creation
ALTER TABLE "business"."warehouse_receipt_items" ADD COLUMN IF NOT EXISTS "maKien" TEXT;
ALTER TABLE "business"."warehouse_issue_items" ADD COLUMN IF NOT EXISTS "maKien" TEXT;
