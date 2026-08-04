-- AlterTable: Remove thang1-thang12 boolean columns from maintenance_plan_items
ALTER TABLE "business"."maintenance_plan_items" DROP COLUMN "thang1";
ALTER TABLE "business"."maintenance_plan_items" DROP COLUMN "thang2";
ALTER TABLE "business"."maintenance_plan_items" DROP COLUMN "thang3";
ALTER TABLE "business"."maintenance_plan_items" DROP COLUMN "thang4";
ALTER TABLE "business"."maintenance_plan_items" DROP COLUMN "thang5";
ALTER TABLE "business"."maintenance_plan_items" DROP COLUMN "thang6";
ALTER TABLE "business"."maintenance_plan_items" DROP COLUMN "thang7";
ALTER TABLE "business"."maintenance_plan_items" DROP COLUMN "thang8";
ALTER TABLE "business"."maintenance_plan_items" DROP COLUMN "thang9";
ALTER TABLE "business"."maintenance_plan_items" DROP COLUMN "thang10";
ALTER TABLE "business"."maintenance_plan_items" DROP COLUMN "thang11";
ALTER TABLE "business"."maintenance_plan_items" DROP COLUMN "thang12";

-- CreateTable: maintenance_plan_item_logs
CREATE TABLE "business"."maintenance_plan_item_logs" (
    "id" TEXT NOT NULL,
    "maintenancePlanItemId" TEXT NOT NULL,
    "thang" INTEGER NOT NULL,
    "lanThu" INTEGER NOT NULL,
    "hoanThanh" BOOLEAN NOT NULL DEFAULT false,
    "ghiChu" TEXT,
    "ngayThucHien" TIMESTAMP(3),
    "nguoiThucHien" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_plan_item_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "maintenance_plan_item_logs_maintenancePlanItemId_idx" ON "business"."maintenance_plan_item_logs"("maintenancePlanItemId");

-- CreateIndex (unique constraint)
CREATE UNIQUE INDEX "maintenance_plan_item_logs_maintenancePlanItemId_thang_lanThu_key" ON "business"."maintenance_plan_item_logs"("maintenancePlanItemId", "thang", "lanThu");

-- AddForeignKey
ALTER TABLE "business"."maintenance_plan_item_logs" ADD CONSTRAINT "maintenance_plan_item_logs_maintenancePlanItemId_fkey" FOREIGN KEY ("maintenancePlanItemId") REFERENCES "business"."maintenance_plan_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
