-- AlterTable
ALTER TABLE "business"."quotations" ADD COLUMN "priceLocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "business"."quotations" ADD COLUMN "priceLockedAt" TIMESTAMP(3);
ALTER TABLE "business"."quotations" ADD COLUMN "priceLockedBy" TEXT;
