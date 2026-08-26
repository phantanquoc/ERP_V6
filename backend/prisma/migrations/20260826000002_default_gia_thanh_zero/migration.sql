-- Normalize un-priced parcels to 0 instead of placeholder 100000.
-- Default for future inserts also becomes 0 (explicitly set on insert wins).
ALTER TABLE "business"."lot_products" ALTER COLUMN "giaThanh" SET DEFAULT 0;
UPDATE "business"."lot_products" SET "giaThanh" = 0 WHERE "giaThanh" = 100000;
