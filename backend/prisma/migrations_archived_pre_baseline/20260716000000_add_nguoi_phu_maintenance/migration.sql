-- AlterTable
ALTER TABLE "business"."maintenance_plan_item_logs" ADD COLUMN "nguoiPhu" TEXT[] NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "business"."maintenance_records" ADD COLUMN "nguoiPhu" TEXT[] NOT NULL DEFAULT '{}';
