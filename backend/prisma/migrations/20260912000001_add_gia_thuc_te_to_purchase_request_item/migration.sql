-- YCMH actual price: thu mua confirms what was really paid per line (giaThucTe).
-- giaDuKien is the estimate on the YCBS->YCMH chain; giaThucTe is the
-- reconciled amount when goods arrive. Pricing step sets Lot/Inventory prices.

ALTER TABLE "business"."purchase_request_items"
  ADD COLUMN IF NOT EXISTS "giaThucTe" DOUBLE PRECISION;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'purchase_request_items_giaThucTe_check') THEN
    ALTER TABLE "business"."purchase_request_items"
      ADD CONSTRAINT "purchase_request_items_giaThucTe_check" CHECK ("giaThucTe" IS NULL OR "giaThucTe" > 0);
  END IF;
END $$;
