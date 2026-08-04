-- CreateTable: push_subscriptions
CREATE TABLE IF NOT EXISTS "auth"."push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_userId_endpoint_key" ON "auth"."push_subscriptions"("userId", "endpoint");

-- AddForeignKey
ALTER TABLE "auth"."push_subscriptions" ADD CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: purchase_request_items
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_request_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "business"."purchase_request_items" ADD CONSTRAINT "purchase_request_items_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "business"."purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey (nhaCungCapId -> suppliers) - only if suppliers table exists
DO $$ BEGIN
    ALTER TABLE "business"."purchase_request_items" ADD CONSTRAINT "purchase_request_items_nhaCungCapId_fkey" FOREIGN KEY ("nhaCungCapId") REFERENCES "business"."suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable: supply_request_items
CREATE TABLE IF NOT EXISTS "business"."supply_request_items" (
    "id" TEXT NOT NULL,
    "supplyRequestId" TEXT NOT NULL,
    "phanLoai" TEXT NOT NULL,
    "tenGoi" TEXT NOT NULL,
    "soLuong" DOUBLE PRECISION NOT NULL,
    "donViTinh" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supply_request_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "business"."supply_request_items" ADD CONSTRAINT "supply_request_items_supplyRequestId_fkey" FOREIGN KEY ("supplyRequestId") REFERENCES "business"."supply_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: system_settings
CREATE TABLE IF NOT EXISTS "common"."system_settings" (
    "id" TEXT NOT NULL,
    "activeTheme" TEXT NOT NULL DEFAULT 'DEFAULT',
    "slogan" TEXT NOT NULL DEFAULT 'Nếu có ngôi nhà thứ 2 đó chính là nơi làm việc của mình, nơi có những người đồng nghiệp tuyệt vời, sẻ chia và tri kỷ.',
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- AlterTable: employees - add secondarySubDepartmentId
ALTER TABLE "common"."employees" ADD COLUMN IF NOT EXISTS "secondarySubDepartmentId" TEXT;

-- AlterTable: notifications - add supplyRequestId
ALTER TABLE "common"."notifications" ADD COLUMN IF NOT EXISTS "supplyRequestId" TEXT;

-- CreateIndex on notifications
CREATE INDEX IF NOT EXISTS "notifications_employeeId_createdAt_idx" ON "common"."notifications"("employeeId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "notifications_employeeId_isRead_idx" ON "common"."notifications"("employeeId", "isRead");

-- AlterTable: purchase_requests - add new columns
ALTER TABLE "business"."purchase_requests" ADD COLUMN IF NOT EXISTS "supplyRequestId" TEXT;
ALTER TABLE "business"."purchase_requests" ADD COLUMN IF NOT EXISTS "nhaCungCapId" TEXT;
ALTER TABLE "business"."purchase_requests" ADD COLUMN IF NOT EXISTS "giaDuKien" DOUBLE PRECISION;
ALTER TABLE "business"."purchase_requests" ADD COLUMN IF NOT EXISTS "ghiChuMuaHang" TEXT;

-- AlterTable: purchase_requests - make deprecated columns nullable
ALTER TABLE "business"."purchase_requests" ALTER COLUMN "phanLoai" DROP NOT NULL;
ALTER TABLE "business"."purchase_requests" ALTER COLUMN "tenHangHoa" DROP NOT NULL;
ALTER TABLE "business"."purchase_requests" ALTER COLUMN "soLuong" DROP NOT NULL;
ALTER TABLE "business"."purchase_requests" ALTER COLUMN "donViTinh" DROP NOT NULL;

-- AddForeignKey purchase_requests.supplyRequestId
DO $$ BEGIN
    ALTER TABLE "business"."purchase_requests" ADD CONSTRAINT "purchase_requests_supplyRequestId_fkey" FOREIGN KEY ("supplyRequestId") REFERENCES "business"."supply_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AddForeignKey purchase_requests.nhaCungCapId
DO $$ BEGIN
    ALTER TABLE "business"."purchase_requests" ADD CONSTRAINT "purchase_requests_nhaCungCapId_fkey" FOREIGN KEY ("nhaCungCapId") REFERENCES "business"."suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: supply_requests - make deprecated columns nullable
ALTER TABLE "business"."supply_requests" ALTER COLUMN "phanLoai" DROP NOT NULL;
ALTER TABLE "business"."supply_requests" ALTER COLUMN "tenGoi" DROP NOT NULL;
ALTER TABLE "business"."supply_requests" ALTER COLUMN "soLuong" DROP NOT NULL;
ALTER TABLE "business"."supply_requests" ALTER COLUMN "donViTinh" DROP NOT NULL;

-- AlterTable: tasks - add evaluation fields
ALTER TABLE "common"."tasks" ADD COLUMN IF NOT EXISTS "diemDanhGia" INTEGER;
ALTER TABLE "common"."tasks" ADD COLUMN IF NOT EXISTS "noiDungDanhGia" TEXT;

-- AlterTable: users - add secondary role fields
ALTER TABLE "auth"."users" ADD COLUMN IF NOT EXISTS "secondaryDepartmentId" TEXT;
ALTER TABLE "auth"."users" ADD COLUMN IF NOT EXISTS "secondarySubDepartmentId" TEXT;
ALTER TABLE "auth"."users" ADD COLUMN IF NOT EXISTS "secondaryRole" "auth"."UserRole";

-- AlterTable: warehouse_issues - add supplyRequestId
ALTER TABLE "business"."warehouse_issues" ADD COLUMN IF NOT EXISTS "supplyRequestId" TEXT;

-- AddForeignKey warehouse_issues.supplyRequestId
DO $$ BEGIN
    ALTER TABLE "business"."warehouse_issues" ADD CONSTRAINT "warehouse_issues_supplyRequestId_fkey" FOREIGN KEY ("supplyRequestId") REFERENCES "business"."supply_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: quotation_calculator_products - add ngayBatDauSanXuatThucTe
ALTER TABLE "business"."quotation_calculator_products" ADD COLUMN IF NOT EXISTS "ngayBatDauSanXuatThucTe" TIMESTAMP(3);
