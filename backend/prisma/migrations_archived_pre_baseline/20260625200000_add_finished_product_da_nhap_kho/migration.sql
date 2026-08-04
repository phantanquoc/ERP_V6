-- AlterTable: add daNhapKho flag to FinishedProduct
-- Safe additive migration: existing rows get default false, no data loss
ALTER TABLE "business"."finished_products" ADD COLUMN "daNhapKho" BOOLEAN NOT NULL DEFAULT false;
