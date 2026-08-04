-- AlterTable
ALTER TABLE "business"."invoices"
  ADD COLUMN "boPhanSuDung" TEXT,
  ADD COLUMN "mucDichSuDung" TEXT,
  ADD COLUMN "nhaCungCap" TEXT,
  ADD COLUMN "files" TEXT[] DEFAULT ARRAY[]::TEXT[];
