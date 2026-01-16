-- AlterTable
ALTER TABLE "business"."finished_products" ADD COLUMN "machineId" TEXT;
ALTER TABLE "business"."finished_products" ADD COLUMN "tenMay" TEXT;

-- AddForeignKey
ALTER TABLE "business"."finished_products" ADD CONSTRAINT "finished_products_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "business"."machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "finished_products_maChien_machineId_key" ON "business"."finished_products"("maChien", "machineId");

