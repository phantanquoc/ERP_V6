-- ─── MaterialStandard: tiLeThuHoi (%) → kgNguyenLieuTren1KgThanhPham (kg NL/1kg TP) ───
-- Rename giữ dữ liệu tại chỗ, rồi chuyển đổi bằng nghịch đảo.
ALTER TABLE "common"."material_standards"
  RENAME COLUMN "tiLeThuHoi" TO "kgNguyenLieuTren1KgThanhPham";

-- Thứ tự bắt buộc: set NULL cho 0 TRƯỚC khi chia, nếu không 100.0/0 sẽ làm migration đổ.
-- Giá trị 0 là dữ liệu bất thường (nhập nhầm), không phải "chưa nhập" — nhưng hiển thị
-- "0 kg NL → 1kg TP" gây hiểu lầm hơn là để trống, nên chuyển thành NULL.
UPDATE "common"."material_standards"
SET "kgNguyenLieuTren1KgThanhPham" = NULL
WHERE "kgNguyenLieuTren1KgThanhPham" = 0;

UPDATE "common"."material_standards"
SET "kgNguyenLieuTren1KgThanhPham" = 100.0 / "kgNguyenLieuTren1KgThanhPham"
WHERE "kgNguyenLieuTren1KgThanhPham" IS NOT NULL;

-- ─── MaterialStandard.loaiDinhMuc: enum → text (sinh tự động từ loaiSanPham) ───
-- Enum MaterialStandardType giữ lại trong DB, chưa DROP TYPE, để không phá code chưa rà hết.
ALTER TABLE "common"."material_standards"
  ALTER COLUMN "loaiDinhMuc" DROP NOT NULL;

ALTER TABLE "common"."material_standards"
  ALTER COLUMN "loaiDinhMuc" TYPE TEXT USING "loaiDinhMuc"::TEXT;

-- Giá trị enum cũ không còn nghĩa dưới quy tắc mới; đặt NULL để service tính lại khi ghi.
UPDATE "common"."material_standards"
SET "loaiDinhMuc" = NULL
WHERE "loaiDinhMuc" IN ('RAW_MATERIAL', 'EQUIPMENT');

-- ─── Item đầu vào / đầu ra: link tới danh mục sản phẩm ───
ALTER TABLE "common"."material_standard_items"
  ADD COLUMN "internationalProductId" TEXT;

ALTER TABLE "common"."material_standard_input_items"
  ADD COLUMN "internationalProductId" TEXT;

CREATE INDEX "material_standard_items_internationalProductId_idx"
  ON "common"."material_standard_items"("internationalProductId");

CREATE INDEX "material_standard_input_items_internationalProductId_idx"
  ON "common"."material_standard_input_items"("internationalProductId");

ALTER TABLE "common"."material_standard_items"
  ADD CONSTRAINT "material_standard_items_internationalProductId_fkey"
  FOREIGN KEY ("internationalProductId") REFERENCES "business"."international_products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "common"."material_standard_input_items"
  ADD CONSTRAINT "material_standard_input_items_internationalProductId_fkey"
  FOREIGN KEY ("internationalProductId") REFERENCES "business"."international_products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: chỉ match tên chính xác (case-insensitive), và chỉ khi khớp đúng MỘT sản phẩm.
-- Fuzzy match có nguy cơ gán sai sản phẩm âm thầm; bỏ lỡ thì item vẫn dùng được như text tự do.
UPDATE "common"."material_standard_input_items" i
SET "internationalProductId" = p.id
FROM "business"."international_products" p
WHERE LOWER(TRIM(i."tenNguyenLieu")) = LOWER(TRIM(p."tenSanPham"))
  AND i."internationalProductId" IS NULL
  AND (
    SELECT COUNT(*) FROM "business"."international_products" p2
    WHERE LOWER(TRIM(p2."tenSanPham")) = LOWER(TRIM(i."tenNguyenLieu"))
  ) = 1;

UPDATE "common"."material_standard_items" it
SET "internationalProductId" = p.id
FROM "business"."international_products" p
WHERE LOWER(TRIM(it."tenThanhPham")) = LOWER(TRIM(p."tenSanPham"))
  AND it."internationalProductId" IS NULL
  AND (
    SELECT COUNT(*) FROM "business"."international_products" p2
    WHERE LOWER(TRIM(p2."tenSanPham")) = LOWER(TRIM(it."tenThanhPham"))
  ) = 1;

-- ─── ProductionFlowchartCost: năng suất thực hiện theo phút ───
ALTER TABLE "common"."production_flowchart_costs"
  ADD COLUMN "nangSuatTrenPhut" DOUBLE PRECISION,
  ADD COLUMN "donViNangSuat" TEXT;
