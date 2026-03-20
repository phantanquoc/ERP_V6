-- CreateEnum
CREATE TYPE "common"."OvertimePlanStatus" AS ENUM ('CHO_DUYET', 'DA_DUYET', 'TU_CHOI', 'HOAN_THANH', 'HUY');

-- CreateTable
CREATE TABLE "common"."overtime_plans" (
    "id" TEXT NOT NULL,
    "ngayTao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nguoiTaoId" TEXT NOT NULL,
    "nguoiThamGiaIds" TEXT[],
    "noiDung" TEXT NOT NULL,
    "ngayTangCa" TIMESTAMP(3) NOT NULL,
    "gioBatDau" TEXT NOT NULL,
    "gioKetThuc" TEXT NOT NULL,
    "ghiChu" TEXT,
    "files" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mucDoUuTien" "common"."TaskPriority" NOT NULL,
    "trangThai" "common"."OvertimePlanStatus" NOT NULL DEFAULT 'CHO_DUYET',
    "trangThaiTiepNhan" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overtime_plans_pkey" PRIMARY KEY ("id")
);
