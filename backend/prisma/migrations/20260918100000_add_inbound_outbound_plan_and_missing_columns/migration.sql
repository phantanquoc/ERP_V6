-- Vá schema drift: các thay đổi dưới đây đã có trong schema.prisma (nhiều commit,
-- gần nhất "aea2310 feat(warehouse): ngày hẹn hàng về + kế hoạch nhập/xuất cho kho")
-- nhưng KHÔNG CÓ migration file tương ứng — bảng/cột được tạo trên dev qua
-- `prisma db push` (bỏ qua migration), production CHƯA BAO GIỜ CÓ các đối tượng
-- này. Phát hiện 2026-09-18 khi restore dump production về dev để kiểm tra data
-- ĐVT: dev backup cũ CÓ bảng inbound_plans/outbound_plans, dump prod thì KHÔNG.
--
-- Đo tại thời điểm viết migration:
--   - inbound_plans/outbound_plans/inbound_plan_logs/outbound_plan_logs: 0 rows
--     trên production (bảng chưa từng tồn tại → chưa có dữ liệu).
--   - purchase_requests.warehouseId/ngayDuKienNhap/ghiChuVanChuyen: cột mới, NULL
--     mặc định, không mất dữ liệu.
--   - warehouse_receipts.inboundPlanId / warehouse_issues.outboundPlanId: cột mới
--     nullable, các phiếu đã có giữ nguyên giá trị NULL (không link vào kế hoạch
--     nào — đúng, vì kế hoạch chưa từng tồn tại trên prod).
--   - replenishment_requests/replenishment_request_items: đổi timestamptz(6) ->
--     timestamp(3) (bỏ TZ offset). DB chạy timezone UTC nên giá trị hiển thị
--     KHÔNG đổi (đã verify: '2026-09-16 08:55:06.917+00'::timestamp(3) =
--     '2026-09-16 08:55:06.917'). 2 rows + 19 rows bị ảnh hưởng trên production,
--     chỉ đổi kiểu cột, không đổi giá trị.
--   - evaluation_details.weightSnapshot, position_responsibilities.isActive: cột
--     mới, default có sẵn (isActive default true), không mất dữ liệu.
--   - Các DropForeignKey/AddForeignKey đầu file: Prisma tái tạo lại đúng constraint
--     đã tồn tại (đổi tên nội bộ do generator), không đổi hành vi FK.
--
-- AN TOÀN để apply — không có DROP TABLE/DROP COLUMN/TRUNCATE nào trong file này.
--
-- ⛔ CHƯA APPLY LÊN PRODUCTION. Bắt buộc backup trước khi chạy `prisma migrate
-- deploy` trên VPS theo playbook deploy — đây là migration lấp một schema drift
-- đã tồn tại từ commit trước, không phải thay đổi mới.

-- DropForeignKey
ALTER TABLE "business"."replenishment_request_items" DROP CONSTRAINT "replenishment_request_items_nhaCungCapId_fkey";

-- DropForeignKey
ALTER TABLE "business"."replenishment_requests" DROP CONSTRAINT "replenishment_requests_supplyRequestId_fkey";

-- DropForeignKey
ALTER TABLE "common"."evaluation_details" DROP CONSTRAINT "evaluation_details_positionResponsibilityId_fkey";

-- AlterTable
ALTER TABLE "business"."purchase_requests" ADD COLUMN     "ghiChuVanChuyen" TEXT,
ADD COLUMN     "ngayDuKienNhap" TIMESTAMP(3),
ADD COLUMN     "warehouseId" TEXT;

-- AlterTable
ALTER TABLE "business"."replenishment_request_items" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "business"."replenishment_requests" ALTER COLUMN "ngayYeuCau" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "business"."warehouse_issues" ADD COLUMN     "outboundPlanId" TEXT;

-- AlterTable
ALTER TABLE "business"."warehouse_receipts" ADD COLUMN     "inboundPlanId" TEXT;

-- AlterTable
ALTER TABLE "common"."evaluation_details" ADD COLUMN     "weightSnapshot" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "common"."position_responsibilities" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "business"."inbound_plans" (
    "id" TEXT NOT NULL,
    "stt" SERIAL NOT NULL,
    "maKeHoach" TEXT NOT NULL,
    "purchaseRequestId" TEXT NOT NULL,
    "ngayDuKien" TIMESTAMP(3) NOT NULL,
    "warehouseId" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'Chờ nhập',
    "lyDoChenhLech" TEXT,
    "ngayDuKienMoi" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inbound_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."inbound_plan_logs" (
    "id" TEXT NOT NULL,
    "inboundPlanId" TEXT NOT NULL,
    "hanhDong" TEXT NOT NULL,
    "ngayCu" TIMESTAMP(3),
    "ngayMoi" TIMESTAMP(3),
    "lyDo" TEXT,
    "nguoiThucHien" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbound_plan_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."outbound_plans" (
    "id" TEXT NOT NULL,
    "stt" SERIAL NOT NULL,
    "maKeHoach" TEXT NOT NULL,
    "supplyRequestId" TEXT,
    "ngayDuKien" TIMESTAMP(3) NOT NULL,
    "warehouseId" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'Chờ xuất',
    "ghiChu" TEXT,
    "lyDoChenhLech" TEXT,
    "ngayDuKienMoi" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbound_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."outbound_plan_logs" (
    "id" TEXT NOT NULL,
    "outboundPlanId" TEXT NOT NULL,
    "hanhDong" TEXT NOT NULL,
    "ngayCu" TIMESTAMP(3),
    "ngayMoi" TIMESTAMP(3),
    "lyDo" TEXT,
    "nguoiThucHien" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbound_plan_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inbound_plans_maKeHoach_key" ON "business"."inbound_plans"("maKeHoach");

-- CreateIndex
CREATE UNIQUE INDEX "inbound_plans_purchaseRequestId_key" ON "business"."inbound_plans"("purchaseRequestId");

-- CreateIndex
CREATE INDEX "inbound_plans_warehouseId_idx" ON "business"."inbound_plans"("warehouseId");

-- CreateIndex
CREATE INDEX "inbound_plans_ngayDuKien_idx" ON "business"."inbound_plans"("ngayDuKien");

-- CreateIndex
CREATE INDEX "inbound_plans_trangThai_idx" ON "business"."inbound_plans"("trangThai");

-- CreateIndex
CREATE INDEX "inbound_plan_logs_inboundPlanId_idx" ON "business"."inbound_plan_logs"("inboundPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "outbound_plans_maKeHoach_key" ON "business"."outbound_plans"("maKeHoach");

-- CreateIndex
CREATE INDEX "outbound_plans_supplyRequestId_idx" ON "business"."outbound_plans"("supplyRequestId");

-- CreateIndex
CREATE INDEX "outbound_plans_warehouseId_idx" ON "business"."outbound_plans"("warehouseId");

-- CreateIndex
CREATE INDEX "outbound_plans_ngayDuKien_idx" ON "business"."outbound_plans"("ngayDuKien");

-- CreateIndex
CREATE INDEX "outbound_plans_trangThai_idx" ON "business"."outbound_plans"("trangThai");

-- CreateIndex
CREATE INDEX "outbound_plan_logs_outboundPlanId_idx" ON "business"."outbound_plan_logs"("outboundPlanId");

-- CreateIndex
CREATE INDEX "purchase_requests_warehouseId_idx" ON "business"."purchase_requests"("warehouseId");

-- CreateIndex
CREATE INDEX "purchase_requests_ngayDuKienNhap_idx" ON "business"."purchase_requests"("ngayDuKienNhap");

-- CreateIndex
CREATE INDEX "supply_requests_trangThai_idx" ON "business"."supply_requests"("trangThai");

-- CreateIndex
CREATE INDEX "warehouse_receipts_inboundPlanId_idx" ON "business"."warehouse_receipts"("inboundPlanId");

-- AddForeignKey
ALTER TABLE "business"."replenishment_requests" ADD CONSTRAINT "replenishment_requests_supplyRequestId_fkey" FOREIGN KEY ("supplyRequestId") REFERENCES "business"."supply_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."replenishment_request_items" ADD CONSTRAINT "replenishment_request_items_nhaCungCapId_fkey" FOREIGN KEY ("nhaCungCapId") REFERENCES "business"."suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."purchase_requests" ADD CONSTRAINT "purchase_requests_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "business"."warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."inbound_plans" ADD CONSTRAINT "inbound_plans_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "business"."purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."inbound_plans" ADD CONSTRAINT "inbound_plans_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "business"."warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."inbound_plan_logs" ADD CONSTRAINT "inbound_plan_logs_inboundPlanId_fkey" FOREIGN KEY ("inboundPlanId") REFERENCES "business"."inbound_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."outbound_plans" ADD CONSTRAINT "outbound_plans_supplyRequestId_fkey" FOREIGN KEY ("supplyRequestId") REFERENCES "business"."supply_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."outbound_plans" ADD CONSTRAINT "outbound_plans_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "business"."warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."outbound_plan_logs" ADD CONSTRAINT "outbound_plan_logs_outboundPlanId_fkey" FOREIGN KEY ("outboundPlanId") REFERENCES "business"."outbound_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."warehouse_receipts" ADD CONSTRAINT "warehouse_receipts_inboundPlanId_fkey" FOREIGN KEY ("inboundPlanId") REFERENCES "business"."inbound_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."warehouse_issues" ADD CONSTRAINT "warehouse_issues_outboundPlanId_fkey" FOREIGN KEY ("outboundPlanId") REFERENCES "business"."outbound_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."evaluation_details" ADD CONSTRAINT "evaluation_details_positionResponsibilityId_fkey" FOREIGN KEY ("positionResponsibilityId") REFERENCES "common"."position_responsibilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

