-- AlterTable
ALTER TABLE "business"."finished_products" ADD COLUMN     "maSanPham" TEXT;

-- AlterTable
ALTER TABLE "business"."material_evaluations" ADD COLUMN     "maSanPham" TEXT;

-- CreateIndex
CREATE INDEX "finished_products_maSanPham_idx" ON "business"."finished_products"("maSanPham");

-- CreateIndex
CREATE INDEX "material_evaluations_maSanPham_idx" ON "business"."material_evaluations"("maSanPham");

-- Backfill: derive the commodity code from the existing warehouse link.
-- Idempotent via the IS NULL guard, so a re-run is a no-op.
UPDATE "business"."material_evaluations" me
SET "maSanPham" = ip."maSanPham"
FROM "business"."lot_products" lp
JOIN "business"."international_products" ip ON ip."id" = lp."internationalProductId"
WHERE me."lotProductId" = lp."id"
  AND me."maSanPham" IS NULL;

-- FinishedProduct links the product directly rather than through a lot.
UPDATE "business"."finished_products" fp
SET "maSanPham" = ip."maSanPham"
FROM "business"."international_products" ip
WHERE fp."internationalProductId" = ip."id"
  AND fp."maSanPham" IS NULL;

-- Rows with no product link keep maSanPham NULL; the kiosk screens render
-- without a code rather than failing.
