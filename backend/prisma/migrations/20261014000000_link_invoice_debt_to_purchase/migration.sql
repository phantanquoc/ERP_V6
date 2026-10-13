-- Link Invoice/Debt to PurchaseRequest for accounting traceability (P0)
-- All FKs nullable + SetNull for backward compat with existing data

-- Add columns to business.invoices
ALTER TABLE "business"."invoices" ADD COLUMN IF NOT EXISTS "purchaseRequestId" TEXT;
ALTER TABLE "business"."invoices" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;

-- Add columns to business.debts
ALTER TABLE "business"."debts" ADD COLUMN IF NOT EXISTS "purchaseRequestId" TEXT;
ALTER TABLE "business"."debts" ADD COLUMN IF NOT EXISTS "invoiceId" TEXT;

-- FK: invoices.purchaseRequestId -> business.purchase_requests(id)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_purchaseRequestId_fkey') THEN
    ALTER TABLE "business"."invoices"
      ADD CONSTRAINT "invoices_purchaseRequestId_fkey"
      FOREIGN KEY ("purchaseRequestId") REFERENCES "business"."purchase_requests"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- FK: invoices.supplierId -> business.suppliers(id)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_supplierId_fkey') THEN
    ALTER TABLE "business"."invoices"
      ADD CONSTRAINT "invoices_supplierId_fkey"
      FOREIGN KEY ("supplierId") REFERENCES "business"."suppliers"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- FK: debts.purchaseRequestId -> business.purchase_requests(id)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debts_purchaseRequestId_fkey') THEN
    ALTER TABLE "business"."debts"
      ADD CONSTRAINT "debts_purchaseRequestId_fkey"
      FOREIGN KEY ("purchaseRequestId") REFERENCES "business"."purchase_requests"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- FK: debts.invoiceId -> business.invoices(id)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'debts_invoiceId_fkey') THEN
    ALTER TABLE "business"."debts"
      ADD CONSTRAINT "debts_invoiceId_fkey"
      FOREIGN KEY ("invoiceId") REFERENCES "business"."invoices"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS "invoices_purchaseRequestId_idx" ON "business"."invoices"("purchaseRequestId");
CREATE INDEX IF NOT EXISTS "invoices_supplierId_idx" ON "business"."invoices"("supplierId");
CREATE INDEX IF NOT EXISTS "debts_purchaseRequestId_idx" ON "business"."debts"("purchaseRequestId");
CREATE INDEX IF NOT EXISTS "debts_invoiceId_idx" ON "business"."debts"("invoiceId");
