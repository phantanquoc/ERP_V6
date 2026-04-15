-- Sync database schema with the current Prisma datamodel.
-- Use conditional DDL so this migration remains safe on databases where some
-- objects may already exist from prior manual changes or db push usage.

ALTER TABLE "auth"."users"
  ADD COLUMN IF NOT EXISTS "secondaryDepartmentId" TEXT,
  ADD COLUMN IF NOT EXISTS "secondaryRole" "auth"."UserRole",
  ADD COLUMN IF NOT EXISTS "secondarySubDepartmentId" TEXT;

ALTER TABLE "business"."purchase_requests"
  ADD COLUMN IF NOT EXISTS "ghiChuMuaHang" TEXT,
  ADD COLUMN IF NOT EXISTS "giaDuKien" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "nhaCungCapId" TEXT;

ALTER TABLE "business"."purchase_requests"
  ALTER COLUMN "phanLoai" DROP NOT NULL,
  ALTER COLUMN "tenHangHoa" DROP NOT NULL,
  ALTER COLUMN "soLuong" DROP NOT NULL,
  ALTER COLUMN "donViTinh" DROP NOT NULL;

ALTER TABLE "business"."quotation_calculator_products"
  ADD COLUMN IF NOT EXISTS "ngayBatDauSanXuatThucTe" TIMESTAMP(3);

ALTER TABLE "business"."supply_requests"
  ALTER COLUMN "phanLoai" DROP NOT NULL,
  ALTER COLUMN "tenGoi" DROP NOT NULL,
  ALTER COLUMN "soLuong" DROP NOT NULL,
  ALTER COLUMN "donViTinh" DROP NOT NULL;

ALTER TABLE "business"."warehouse_issues"
  ADD COLUMN IF NOT EXISTS "supplyRequestId" TEXT;

ALTER TABLE "common"."employees"
  ADD COLUMN IF NOT EXISTS "secondarySubDepartmentId" TEXT;

ALTER TABLE "common"."notifications"
  ADD COLUMN IF NOT EXISTS "supplyRequestId" TEXT;

ALTER TABLE "common"."tasks"
  ADD COLUMN IF NOT EXISTS "diemDanhGia" INTEGER,
  ADD COLUMN IF NOT EXISTS "noiDungDanhGia" TEXT;

CREATE TABLE IF NOT EXISTS "business"."supply_request_items" (
  "id" TEXT NOT NULL,
  "supplyRequestId" TEXT NOT NULL,
  "phanLoai" TEXT NOT NULL,
  "tenGoi" TEXT NOT NULL,
  "soLuong" DOUBLE PRECISION NOT NULL,
  "donViTinh" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "supply_request_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "business"."purchase_request_items" (
  "id" TEXT NOT NULL,
  "purchaseRequestId" TEXT NOT NULL,
  "phanLoai" TEXT NOT NULL,
  "tenHangHoa" TEXT NOT NULL,
  "soLuong" DOUBLE PRECISION NOT NULL,
  "donViTinh" TEXT NOT NULL,
  "nhaCungCapId" TEXT,
  "giaDuKien" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "purchase_request_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "common"."system_settings" (
  "id" TEXT NOT NULL,
  "activeTheme" TEXT NOT NULL DEFAULT 'DEFAULT',
  "slogan" TEXT NOT NULL DEFAULT 'Nếu có ngôi nhà thứ 2 đó chính là nơi làm việc của mình, nơi có những người đồng nghiệp tuyệt vời, sẻ chia và tri kỷ.',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedBy" TEXT,

  CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_employeeId_createdAt_idx"
  ON "common"."notifications"("employeeId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "notifications_employeeId_isRead_idx"
  ON "common"."notifications"("employeeId", "isRead");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'supply_request_items_supplyRequestId_fkey'
  ) THEN
    ALTER TABLE "business"."supply_request_items"
      ADD CONSTRAINT "supply_request_items_supplyRequestId_fkey"
      FOREIGN KEY ("supplyRequestId")
      REFERENCES "business"."supply_requests"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchase_requests_nhaCungCapId_fkey'
  ) THEN
    ALTER TABLE "business"."purchase_requests"
      ADD CONSTRAINT "purchase_requests_nhaCungCapId_fkey"
      FOREIGN KEY ("nhaCungCapId")
      REFERENCES "business"."suppliers"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchase_request_items_nhaCungCapId_fkey'
  ) THEN
    ALTER TABLE "business"."purchase_request_items"
      ADD CONSTRAINT "purchase_request_items_nhaCungCapId_fkey"
      FOREIGN KEY ("nhaCungCapId")
      REFERENCES "business"."suppliers"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'purchase_request_items_purchaseRequestId_fkey'
  ) THEN
    ALTER TABLE "business"."purchase_request_items"
      ADD CONSTRAINT "purchase_request_items_purchaseRequestId_fkey"
      FOREIGN KEY ("purchaseRequestId")
      REFERENCES "business"."purchase_requests"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'warehouse_issues_supplyRequestId_fkey'
  ) THEN
    ALTER TABLE "business"."warehouse_issues"
      ADD CONSTRAINT "warehouse_issues_supplyRequestId_fkey"
      FOREIGN KEY ("supplyRequestId")
      REFERENCES "business"."supply_requests"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
