-- AlterTable
ALTER TABLE "business"."supply_requests"
  ADD COLUMN "loaiYeuCau" TEXT DEFAULT 'Thường',
  ADD COLUMN "soTien" DOUBLE PRECISION;
