-- AddColumn supplierId to debts (FK to business.suppliers)
ALTER TABLE "business"."debts" ADD COLUMN "supplierId" TEXT;

-- Backfill supplierId từ maNhaCungCap (khớp với suppliers.maNhaCungCap)
UPDATE "business"."debts" d
SET "supplierId" = s.id
FROM "business"."suppliers" s
WHERE s."maNhaCungCap" = d."maNhaCungCap";

-- Với rows không khớp supplier, tạo supplier placeholder để giữ NOT NULL constraint
-- (nếu không có supplier nào khớp, để NULL tạm — NOT NULL sẽ apply sau khi data sạch)

-- AddColumn files (thay fileDinhKem TEXT)
ALTER TABLE "business"."debts" ADD COLUMN "files" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Migrate data từ fileDinhKem → files (nếu có giá trị)
UPDATE "business"."debts"
SET "files" = ARRAY["fileDinhKem"]
WHERE "fileDinhKem" IS NOT NULL AND "fileDinhKem" != '';

-- Drop cột cũ fileDinhKem
ALTER TABLE "business"."debts" DROP COLUMN IF EXISTS "fileDinhKem";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "debts_supplierId_idx" ON "business"."debts"("supplierId");
CREATE INDEX IF NOT EXISTS "debts_ngayPhatSinh_idx" ON "business"."debts"("ngayPhatSinh");
CREATE INDEX IF NOT EXISTS "debts_ngayDenHan_idx" ON "business"."debts"("ngayDenHan");

-- AddForeignKey (chỉ khi supplierId NOT NULL — optional FK vì có thể NULL sau backfill)
ALTER TABLE "business"."debts" ADD CONSTRAINT "debts_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "business"."suppliers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE DEFERRABLE INITIALLY DEFERRED;
