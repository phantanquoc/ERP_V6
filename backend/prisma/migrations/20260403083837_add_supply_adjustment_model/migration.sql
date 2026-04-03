-- CreateEnum
CREATE TYPE "business"."SupplyAdjustmentStatus" AS ENUM ('CHO_DUYET', 'DA_DUYET', 'TU_CHOI');

-- CreateTable
CREATE TABLE "business"."supply_adjustments" (
    "id" TEXT NOT NULL,
    "maDieuChinh" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "loaiVatTu" TEXT NOT NULL,
    "tenVatTu" TEXT NOT NULL,
    "soLuongHienTai" DOUBLE PRECISION NOT NULL,
    "soLuongDieuChinh" DOUBLE PRECISION NOT NULL,
    "donViTinh" TEXT NOT NULL,
    "lyDo" TEXT NOT NULL,
    "trangThai" "business"."SupplyAdjustmentStatus" NOT NULL DEFAULT 'CHO_DUYET',
    "nguoiDuyetId" TEXT,
    "ngayDuyet" TIMESTAMP(3),
    "ghiChuQC" TEXT,
    "lyDoTuChoi" TEXT,
    "ngayDieuChinh" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supply_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supply_adjustments_maDieuChinh_key" ON "business"."supply_adjustments"("maDieuChinh");

-- AddForeignKey
ALTER TABLE "business"."supply_adjustments" ADD CONSTRAINT "supply_adjustments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "common"."employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
