-- Add nullable internationalProductId FK to finished_products
-- Existing rows remain valid with NULL value (no backfill)

ALTER TABLE "business"."finished_products"
  ADD COLUMN "internationalProductId" TEXT;

-- Add FK constraint with ON DELETE SET NULL
ALTER TABLE "business"."finished_products"
  ADD CONSTRAINT "finished_products_internationalProductId_fkey"
  FOREIGN KEY ("internationalProductId")
  REFERENCES "business"."international_products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index on the FK column
CREATE INDEX "finished_products_internationalProductId_idx"
  ON "business"."finished_products"("internationalProductId");
