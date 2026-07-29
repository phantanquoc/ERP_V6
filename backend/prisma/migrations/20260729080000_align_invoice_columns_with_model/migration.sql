-- Align business.invoices with the Invoice model.
--
-- The table was created by the init migration with `khachHang` (free text) and `thue`.
-- The model was later rewritten to use `customerId` + a relation to
-- international_customers, and `thueVAT`, but no migration was ever generated. Every read
-- of the table failed with P2022 ("column does not exist") and every insert would have
-- failed on `khachHang` being NOT NULL without a default.
--
-- The table holds 0 rows, so there is nothing to backfill.

-- Rename rather than add+drop, so any future data in the column is preserved.
ALTER TABLE "business"."invoices" RENAME COLUMN "thue" TO "thueVAT";

-- The model treats these as optional; the DB had them NOT NULL.
ALTER TABLE "business"."invoices" ALTER COLUMN "ngayLap" DROP NOT NULL;

-- `khachHang` is superseded by the customer relation. Kept as a nullable column instead
-- of dropped: dropping is irreversible, and leaving it nullable is enough to unblock
-- inserts. It can be removed later once confirmed unused.
ALTER TABLE "business"."invoices" ALTER COLUMN "khachHang" DROP NOT NULL;

ALTER TABLE "business"."invoices" ADD COLUMN "customerId" TEXT;

-- The model is named InternationalCustomer but maps to business.customers, so the FK
-- targets the mapped table name, not the model name.
ALTER TABLE "business"."invoices"
  ADD CONSTRAINT "invoices_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "business"."customers"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- The model declares these as required, the DB allowed NULL. Prisma throws when it reads
-- a NULL into a non-optional field, so the two must agree. Safe to tighten while the
-- table is empty; `files` gets a default so an insert that omits it still works.
ALTER TABLE "business"."invoices" ALTER COLUMN "files" SET DEFAULT ARRAY[]::TEXT[];
UPDATE "business"."invoices" SET "files" = ARRAY[]::TEXT[] WHERE "files" IS NULL;
ALTER TABLE "business"."invoices" ALTER COLUMN "files" SET NOT NULL;

UPDATE "business"."invoices" SET "nhanVienLap" = '' WHERE "nhanVienLap" IS NULL;
ALTER TABLE "business"."invoices" ALTER COLUMN "nhanVienLap" SET NOT NULL;

-- These three are Float? in the model but NOT NULL in the DB (they came from the init
-- migration with DEFAULT 0, and the rename above carried that over to thueVAT). An update
-- that explicitly sets one to null — which invoiceService does when recalculating — would
-- be rejected. The defaults are kept so an insert omitting them still works.
ALTER TABLE "business"."invoices" ALTER COLUMN "tongTien" DROP NOT NULL;
ALTER TABLE "business"."invoices" ALTER COLUMN "thueVAT" DROP NOT NULL;
ALTER TABLE "business"."invoices" ALTER COLUMN "thanhTien" DROP NOT NULL;

-- Declared by @@index in the model but never created.
CREATE INDEX "invoices_customerId_idx" ON "business"."invoices"("customerId");
CREATE INDEX "invoices_ngayLap_idx" ON "business"."invoices"("ngayLap");
CREATE INDEX "invoices_trangThai_idx" ON "business"."invoices"("trangThai");
