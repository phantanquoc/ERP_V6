-- Allow fixed kiện (physical pallet positions) to exist without a product until goods are entered.
-- lot_products baseline had internationalProductId NOT NULL; kiện cứng need it nullable.
ALTER TABLE "business"."lot_products" ALTER COLUMN "internationalProductId" DROP NOT NULL;
