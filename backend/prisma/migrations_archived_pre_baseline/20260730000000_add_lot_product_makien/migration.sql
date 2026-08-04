-- AlterTable
ALTER TABLE "business"."lot_products" ADD COLUMN "maKien" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "lot_products_lotId_maKien_key" ON "business"."lot_products"("lotId", "maKien");

-- Backfill maKien for existing rows using lot tenLo + last 4 chars of id
UPDATE business.lot_products lp
SET "maKien" = CONCAT(l."tenLo", '-', RIGHT(lp.id, 4))
FROM business.lots l
WHERE lp."lotId" = l.id AND lp."maKien" IS NULL;
