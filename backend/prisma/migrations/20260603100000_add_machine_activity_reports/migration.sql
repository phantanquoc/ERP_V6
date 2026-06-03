-- CreateTable: MachineActivityReport
CREATE TABLE "business"."machine_activity_reports" (
    "id" TEXT NOT NULL,
    "viTri" TEXT NOT NULL,
    "tenHeThong" TEXT NOT NULL,
    "tongSoLuong" INTEGER NOT NULL,
    "soLuongHoatDong" INTEGER NOT NULL,
    "soLuongNgung" INTEGER NOT NULL,
    "nguyenNhan" TEXT NOT NULL,
    "nguoiBaoCao" TEXT NOT NULL,
    "fileDinhKem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machine_activity_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "machine_activity_reports_createdAt_idx" ON "business"."machine_activity_reports"("createdAt");
