-- CreateTable: FaultRecord (Danh sách lỗi)
CREATE TABLE "business"."fault_records" (
    "id" TEXT NOT NULL,
    "maLoi" TEXT NOT NULL,
    "tenLoi" TEXT NOT NULL,
    "moTa" TEXT NOT NULL,
    "maHeThong" TEXT,
    "mucDo" TEXT NOT NULL,
    "trangThai" TEXT NOT NULL DEFAULT 'Đang theo dõi',
    "nguoiPhatHien" TEXT NOT NULL,
    "ngayPhatHien" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileDinhKem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fault_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: FaultRecord
CREATE UNIQUE INDEX "fault_records_maLoi_key" ON "business"."fault_records"("maLoi");
CREATE INDEX "fault_records_maLoi_idx" ON "business"."fault_records"("maLoi");
CREATE INDEX "fault_records_trangThai_idx" ON "business"."fault_records"("trangThai");

-- CreateTable: SparePart (Danh sách linh kiện)
CREATE TABLE "business"."spare_parts" (
    "id" TEXT NOT NULL,
    "maLinhKien" TEXT NOT NULL,
    "tenLinhKien" TEXT NOT NULL,
    "loai" TEXT NOT NULL,
    "donVi" TEXT NOT NULL,
    "soLuongTon" INTEGER NOT NULL DEFAULT 0,
    "giaNhap" DOUBLE PRECISION,
    "nhaCungCap" TEXT,
    "trangThai" TEXT NOT NULL DEFAULT 'Chưa sử dụng',
    "ngayMua" TIMESTAMP(3),
    "fileDinhKem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "spare_parts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: SparePart
CREATE UNIQUE INDEX "spare_parts_maLinhKien_key" ON "business"."spare_parts"("maLinhKien");
CREATE INDEX "spare_parts_maLinhKien_idx" ON "business"."spare_parts"("maLinhKien");
CREATE INDEX "spare_parts_loai_idx" ON "business"."spare_parts"("loai");
CREATE INDEX "spare_parts_trangThai_idx" ON "business"."spare_parts"("trangThai");

-- CreateTable: Project (Danh sách dự án)
CREATE TABLE "business"."projects" (
    "id" TEXT NOT NULL,
    "maDuAn" TEXT NOT NULL,
    "tenDuAn" TEXT NOT NULL,
    "moTa" TEXT,
    "ngayBatDau" TIMESTAMP(3) NOT NULL,
    "ngayKetThuc" TIMESTAMP(3),
    "trangThai" TEXT NOT NULL DEFAULT 'Lên kế hoạch',
    "nguoiTaoId" TEXT NOT NULL,
    "fileDinhKem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Project
CREATE UNIQUE INDEX "projects_maDuAn_key" ON "business"."projects"("maDuAn");
CREATE INDEX "projects_nguoiTaoId_idx" ON "business"."projects"("nguoiTaoId");
CREATE INDEX "projects_trangThai_idx" ON "business"."projects"("trangThai");

-- CreateTable: ProjectMember
CREATE TABLE "business"."project_members" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vaiTro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ProjectMember
CREATE INDEX "project_members_projectId_idx" ON "business"."project_members"("projectId");
CREATE INDEX "project_members_userId_idx" ON "business"."project_members"("userId");

-- CreateTable: ProjectTask
CREATE TABLE "business"."project_tasks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tenCongViec" TEXT NOT NULL,
    "moTa" TEXT,
    "ngayBatDau" TIMESTAMP(3),
    "ngayKetThuc" TIMESTAMP(3),
    "trangThai" TEXT NOT NULL DEFAULT 'Chưa bắt đầu',
    "nguoiPhuTrachId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: ProjectTask
CREATE INDEX "project_tasks_projectId_idx" ON "business"."project_tasks"("projectId");

-- AlterTable: Add hoatDong to MachineSystem
ALTER TABLE "business"."machine_systems" ADD COLUMN "hoatDong" BOOLEAN NOT NULL DEFAULT true;
