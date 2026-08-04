-- CreateTable
CREATE TABLE "business"."machine_systems" (
    "id" TEXT NOT NULL,
    "khuVuc" TEXT NOT NULL,
    "viTri" TEXT NOT NULL,
    "maHeThong" TEXT NOT NULL,
    "tenHeThong" TEXT NOT NULL,
    "chucNang" TEXT NOT NULL,
    "maThietBi" TEXT,
    "tenThietBi" TEXT,
    "nhiemVu" TEXT,
    "maNguoiThucHien" TEXT,
    "nguoiThucHien" TEXT,
    "fileDinhKem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machine_systems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "machine_systems_maHeThong_key" ON "business"."machine_systems"("maHeThong");

-- CreateIndex
CREATE INDEX "machine_systems_maHeThong_idx" ON "business"."machine_systems"("maHeThong");
