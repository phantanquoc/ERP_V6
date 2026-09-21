-- Add soft-void columns to warehouse receipts and issues
ALTER TABLE "business"."warehouse_receipts" ADD COLUMN "isVoided" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "business"."warehouse_receipts" ADD COLUMN "voidReason" TEXT;
ALTER TABLE "business"."warehouse_receipts" ADD COLUMN "voidedAt" TIMESTAMPTZ(6);
ALTER TABLE "business"."warehouse_receipts" ADD COLUMN "voidedBy" TEXT;
CREATE INDEX "warehouse_receipts_isVoided_idx" ON "business"."warehouse_receipts"("isVoided");

ALTER TABLE "business"."warehouse_issues" ADD COLUMN "isVoided" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "business"."warehouse_issues" ADD COLUMN "voidReason" TEXT;
ALTER TABLE "business"."warehouse_issues" ADD COLUMN "voidedAt" TIMESTAMPTZ(6);
ALTER TABLE "business"."warehouse_issues" ADD COLUMN "voidedBy" TEXT;
CREATE INDEX "warehouse_issues_isVoided_idx" ON "business"."warehouse_issues"("isVoided");
