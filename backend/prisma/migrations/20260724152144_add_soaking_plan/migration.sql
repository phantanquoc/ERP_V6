-- CreateEnum
CREATE TYPE "business"."SoakingPlanStatus" AS ENUM ('HIEU_LUC', 'DA_DUNG', 'HUY');

-- CreateTable
CREATE TABLE "business"."soaking_plans" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "maSanPham" TEXT NOT NULL,
    "tenSanPham" TEXT NOT NULL,
    "soLanNgam" INTEGER NOT NULL,
    "nhietDoNuocTruocNgam" DOUBLE PRECISION NOT NULL,
    "nhietDoNuocSauVot" DOUBLE PRECISION NOT NULL,
    "thoiGianNgam" INTEGER NOT NULL,
    "brixNuocNgam" DOUBLE PRECISION NOT NULL,
    "khoiLuong" DOUBLE PRECISION NOT NULL,
    "trangThai" "business"."SoakingPlanStatus" NOT NULL DEFAULT 'HIEU_LUC',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soaking_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "soaking_plans_productId_idx" ON "business"."soaking_plans"("productId");

-- CreateIndex
CREATE INDEX "soaking_plans_trangThai_idx" ON "business"."soaking_plans"("trangThai");

-- CreateIndex
CREATE INDEX "soaking_plans_orderId_idx" ON "business"."soaking_plans"("orderId");

-- AddForeignKey
ALTER TABLE "business"."soaking_plans" ADD CONSTRAINT "soaking_plans_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "business"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."soaking_plans" ADD CONSTRAINT "soaking_plans_productId_fkey" FOREIGN KEY ("productId") REFERENCES "business"."international_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
