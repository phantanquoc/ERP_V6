-- Warehouse slip multi-item: header + child line rows.
-- Strictly additive: the ten item-level header columns are made nullable and kept
-- (marked @deprecated in the Prisma schema) so rollback never loses data.
-- The onDelete: Restrict audit fence on lotProduct follows the FK down to the lines.

-- DropForeignKey — the header no longer owns the lotProduct relation; lines do.
-- The scalar "lotProductId" column stays on the header as deprecated data.
ALTER TABLE "business"."warehouse_issues" DROP CONSTRAINT "warehouse_issues_lotProductId_fkey";

-- DropForeignKey
ALTER TABLE "business"."warehouse_receipts" DROP CONSTRAINT "warehouse_receipts_lotProductId_fkey";

-- AlterTable
ALTER TABLE "business"."warehouse_issues" ADD COLUMN     "soDongHang" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tongSoLuongThucTe" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "warehouseId" DROP NOT NULL,
ALTER COLUMN "tenKho" DROP NOT NULL,
ALTER COLUMN "lotId" DROP NOT NULL,
ALTER COLUMN "tenLo" DROP NOT NULL,
ALTER COLUMN "lotProductId" DROP NOT NULL,
ALTER COLUMN "tenSanPham" DROP NOT NULL,
ALTER COLUMN "soLuongTruoc" DROP NOT NULL,
ALTER COLUMN "soLuongXuat" DROP NOT NULL,
ALTER COLUMN "soLuongSau" DROP NOT NULL,
ALTER COLUMN "donViTinh" DROP NOT NULL;

-- AlterTable
ALTER TABLE "business"."warehouse_receipts" ADD COLUMN     "soDongHang" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tongSoLuongThucTe" DOUBLE PRECISION NOT NULL DEFAULT 0,
ALTER COLUMN "warehouseId" DROP NOT NULL,
ALTER COLUMN "tenKho" DROP NOT NULL,
ALTER COLUMN "lotId" DROP NOT NULL,
ALTER COLUMN "tenLo" DROP NOT NULL,
ALTER COLUMN "lotProductId" DROP NOT NULL,
ALTER COLUMN "tenSanPham" DROP NOT NULL,
ALTER COLUMN "soLuongNhap" DROP NOT NULL,
ALTER COLUMN "soLuongSau" DROP NOT NULL,
ALTER COLUMN "soLuongTruoc" DROP NOT NULL,
ALTER COLUMN "donViTinh" DROP NOT NULL;

-- CreateTable
CREATE TABLE "business"."warehouse_receipt_items" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "stt" INTEGER NOT NULL,
    "lotProductId" TEXT NOT NULL,
    "tenSanPham" TEXT NOT NULL,
    "donViTinh" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "tenKho" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "tenLo" TEXT NOT NULL,
    "soLuongYeuCau" DOUBLE PRECISION NOT NULL,
    "soLuongThucTe" DOUBLE PRECISION NOT NULL,
    "soLuongTruoc" DOUBLE PRECISION NOT NULL,
    "soLuongSau" DOUBLE PRECISION NOT NULL,
    "donGia" DOUBLE PRECISION,
    "thanhTien" DOUBLE PRECISION,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."warehouse_issue_items" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "stt" INTEGER NOT NULL,
    "lotProductId" TEXT NOT NULL,
    "tenSanPham" TEXT NOT NULL,
    "donViTinh" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "tenKho" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "tenLo" TEXT NOT NULL,
    "soLuongYeuCau" DOUBLE PRECISION NOT NULL,
    "soLuongThucTe" DOUBLE PRECISION NOT NULL,
    "soLuongTruoc" DOUBLE PRECISION NOT NULL,
    "soLuongSau" DOUBLE PRECISION NOT NULL,
    "donGia" DOUBLE PRECISION,
    "thanhTien" DOUBLE PRECISION,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_issue_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warehouse_receipt_items_receiptId_idx" ON "business"."warehouse_receipt_items"("receiptId");

-- CreateIndex
CREATE INDEX "warehouse_receipt_items_lotProductId_idx" ON "business"."warehouse_receipt_items"("lotProductId");

-- CreateIndex
CREATE INDEX "warehouse_issue_items_issueId_idx" ON "business"."warehouse_issue_items"("issueId");

-- CreateIndex
CREATE INDEX "warehouse_issue_items_lotProductId_idx" ON "business"."warehouse_issue_items"("lotProductId");

-- AddForeignKey
ALTER TABLE "business"."warehouse_receipt_items" ADD CONSTRAINT "warehouse_receipt_items_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "business"."warehouse_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."warehouse_receipt_items" ADD CONSTRAINT "warehouse_receipt_items_lotProductId_fkey" FOREIGN KEY ("lotProductId") REFERENCES "business"."lot_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."warehouse_issue_items" ADD CONSTRAINT "warehouse_issue_items_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "business"."warehouse_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."warehouse_issue_items" ADD CONSTRAINT "warehouse_issue_items_lotProductId_fkey" FOREIGN KEY ("lotProductId") REFERENCES "business"."lot_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: one line per existing slip, copying the header's item-level values
-- (including both snapshots) into the new line table. Historical slips have no
-- separate requested figure, so soLuongYeuCau is set equal to soLuongThucTe.
-- Header totals are then populated from that single line.
-- Rows with a NULL lotProductId (should not exist pre-migration, but guarded here
-- since the FK now requires a value) are skipped rather than inserted with a bad FK.

INSERT INTO "business"."warehouse_receipt_items"
  ("id", "receiptId", "stt", "lotProductId", "tenSanPham", "donViTinh",
   "warehouseId", "tenKho", "lotId", "tenLo",
   "soLuongYeuCau", "soLuongThucTe", "soLuongTruoc", "soLuongSau",
   "ghiChu", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  r."id",
  1,
  r."lotProductId",
  COALESCE(r."tenSanPham", ''),
  COALESCE(r."donViTinh", ''),
  COALESCE(r."warehouseId", ''),
  COALESCE(r."tenKho", ''),
  COALESCE(r."lotId", ''),
  COALESCE(r."tenLo", ''),
  COALESCE(r."soLuongNhap", 0),
  COALESCE(r."soLuongNhap", 0),
  COALESCE(r."soLuongTruoc", 0),
  COALESCE(r."soLuongSau", 0),
  r."ghiChu",
  r."createdAt",
  r."updatedAt"
FROM "business"."warehouse_receipts" r
WHERE r."lotProductId" IS NOT NULL;

UPDATE "business"."warehouse_receipts" r
SET "tongSoLuongThucTe" = COALESCE(r."soLuongNhap", 0),
    "soDongHang" = 1
WHERE r."lotProductId" IS NOT NULL;

INSERT INTO "business"."warehouse_issue_items"
  ("id", "issueId", "stt", "lotProductId", "tenSanPham", "donViTinh",
   "warehouseId", "tenKho", "lotId", "tenLo",
   "soLuongYeuCau", "soLuongThucTe", "soLuongTruoc", "soLuongSau",
   "ghiChu", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  i."id",
  1,
  i."lotProductId",
  COALESCE(i."tenSanPham", ''),
  COALESCE(i."donViTinh", ''),
  COALESCE(i."warehouseId", ''),
  COALESCE(i."tenKho", ''),
  COALESCE(i."lotId", ''),
  COALESCE(i."tenLo", ''),
  COALESCE(i."soLuongXuat", 0),
  COALESCE(i."soLuongXuat", 0),
  COALESCE(i."soLuongTruoc", 0),
  COALESCE(i."soLuongSau", 0),
  i."ghiChu",
  i."createdAt",
  i."updatedAt"
FROM "business"."warehouse_issues" i
WHERE i."lotProductId" IS NOT NULL;

UPDATE "business"."warehouse_issues" i
SET "tongSoLuongThucTe" = COALESCE(i."soLuongXuat", 0),
    "soDongHang" = 1
WHERE i."lotProductId" IS NOT NULL;

