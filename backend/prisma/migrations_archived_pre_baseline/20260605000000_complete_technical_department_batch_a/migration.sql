-- CreateEnum
CREATE TYPE "business"."MachineSystemDetailType" AS ENUM ('Thiet bi', 'Cum', 'Linh kien', 'Diem kiem tra');

-- CreateTable
CREATE TABLE "business"."machine_system_details" (
    "id" TEXT NOT NULL,
    "machineSystemId" TEXT NOT NULL,
    "parentDetailId" TEXT,
    "loaiChiTiet" "business"."MachineSystemDetailType" NOT NULL,
    "maChiTiet" TEXT NOT NULL,
    "tenChiTiet" TEXT NOT NULL,
    "viTri" TEXT,
    "moTa" TEXT,
    "maNguoiPhuTrach" TEXT,
    "nguoiPhuTrach" TEXT,
    "fileDinhKem" TEXT,
    "thuTu" INTEGER NOT NULL DEFAULT 0,
    "hoatDong" BOOLEAN NOT NULL DEFAULT true,
    "trangThai" TEXT NOT NULL DEFAULT 'Hoạt động',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machine_system_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."fault_templates" (
    "id" TEXT NOT NULL,
    "maMauLoi" TEXT NOT NULL,
    "tenMauLoi" TEXT NOT NULL,
    "moTa" TEXT NOT NULL,
    "mucDo" TEXT NOT NULL,
    "machineSystemId" TEXT NOT NULL,
    "machineSystemDetailId" TEXT NOT NULL,
    "hoatDong" BOOLEAN NOT NULL DEFAULT true,
    "trangThai" TEXT NOT NULL DEFAULT 'Hoạt động',
    "ghiChu" TEXT,
    "fileDinhKem" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fault_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."acceptance_handover_items" (
    "id" TEXT NOT NULL,
    "acceptanceHandoverId" TEXT NOT NULL,
    "repairRequestItemId" TEXT NOT NULL,
    "machineSystemId" TEXT,
    "machineSystemDetailId" TEXT,
    "tenHeThong" TEXT NOT NULL,
    "tenChiTiet" TEXT,
    "tinhTrangTruocSuaChua" TEXT NOT NULL,
    "tinhTrangSauSuaChua" TEXT NOT NULL,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acceptance_handover_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business"."project_phases" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "tenGiaiDoan" TEXT NOT NULL,
    "moTa" TEXT,
    "chuSoHuuId" TEXT,
    "chuSoHuu" TEXT,
    "nguoiPhuTrachId" TEXT,
    "nguoiPhuTrach" TEXT,
    "tienDo" INTEGER NOT NULL DEFAULT 0,
    "trangThai" TEXT NOT NULL DEFAULT 'Chưa bắt đầu',
    "thuTu" INTEGER NOT NULL DEFAULT 0,
    "ngayBatDau" TIMESTAMP(3),
    "ngayKetThuc" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_phases_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "business"."fault_records"
    ADD COLUMN "machineSystemId" TEXT,
    ADD COLUMN "machineSystemDetailId" TEXT,
    ADD COLUMN "faultTemplateId" TEXT;

-- AlterTable
ALTER TABLE "common"."repair_request_items"
    ADD COLUMN "machineSystemId" TEXT,
    ADD COLUMN "machineSystemDetailId" TEXT;

-- AlterTable
ALTER TABLE "business"."project_tasks"
    ADD COLUMN "projectPhaseId" TEXT,
    ADD COLUMN "tienDo" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "machine_system_details_maChiTiet_key" ON "business"."machine_system_details"("maChiTiet");

-- CreateIndex
CREATE INDEX "machine_system_details_machineSystemId_idx" ON "business"."machine_system_details"("machineSystemId");

-- CreateIndex
CREATE INDEX "machine_system_details_parentDetailId_idx" ON "business"."machine_system_details"("parentDetailId");

-- CreateIndex
CREATE INDEX "machine_system_details_loaiChiTiet_idx" ON "business"."machine_system_details"("loaiChiTiet");

-- CreateIndex
CREATE INDEX "machine_system_details_hoatDong_idx" ON "business"."machine_system_details"("hoatDong");

-- CreateIndex
CREATE INDEX "machine_system_details_trangThai_idx" ON "business"."machine_system_details"("trangThai");

-- CreateIndex
CREATE INDEX "machine_system_details_machineSystemId_thuTu_idx" ON "business"."machine_system_details"("machineSystemId", "thuTu");

-- CreateIndex
CREATE UNIQUE INDEX "fault_templates_maMauLoi_key" ON "business"."fault_templates"("maMauLoi");

-- CreateIndex
CREATE INDEX "fault_templates_machineSystemId_idx" ON "business"."fault_templates"("machineSystemId");

-- CreateIndex
CREATE INDEX "fault_templates_machineSystemDetailId_idx" ON "business"."fault_templates"("machineSystemDetailId");

-- CreateIndex
CREATE INDEX "fault_templates_hoatDong_idx" ON "business"."fault_templates"("hoatDong");

-- CreateIndex
CREATE INDEX "fault_templates_trangThai_idx" ON "business"."fault_templates"("trangThai");

-- CreateIndex
CREATE UNIQUE INDEX "acceptance_handover_items_acceptanceHandoverId_repairRequestItemId_key" ON "common"."acceptance_handover_items"("acceptanceHandoverId", "repairRequestItemId");

-- CreateIndex
CREATE INDEX "acceptance_handover_items_acceptanceHandoverId_idx" ON "common"."acceptance_handover_items"("acceptanceHandoverId");

-- CreateIndex
CREATE INDEX "acceptance_handover_items_repairRequestItemId_idx" ON "common"."acceptance_handover_items"("repairRequestItemId");

-- CreateIndex
CREATE INDEX "acceptance_handover_items_machineSystemId_idx" ON "common"."acceptance_handover_items"("machineSystemId");

-- CreateIndex
CREATE INDEX "acceptance_handover_items_machineSystemDetailId_idx" ON "common"."acceptance_handover_items"("machineSystemDetailId");

-- CreateIndex
CREATE INDEX "project_phases_projectId_idx" ON "business"."project_phases"("projectId");

-- CreateIndex
CREATE INDEX "project_phases_trangThai_idx" ON "business"."project_phases"("trangThai");

-- CreateIndex
CREATE INDEX "project_phases_projectId_thuTu_idx" ON "business"."project_phases"("projectId", "thuTu");

-- CreateIndex
CREATE INDEX "fault_records_machineSystemId_idx" ON "business"."fault_records"("machineSystemId");

-- CreateIndex
CREATE INDEX "fault_records_machineSystemDetailId_idx" ON "business"."fault_records"("machineSystemDetailId");

-- CreateIndex
CREATE INDEX "fault_records_faultTemplateId_idx" ON "business"."fault_records"("faultTemplateId");

-- CreateIndex
CREATE INDEX "repair_request_items_repairRequestId_idx" ON "common"."repair_request_items"("repairRequestId");

-- CreateIndex
CREATE INDEX "repair_request_items_machineSystemId_idx" ON "common"."repair_request_items"("machineSystemId");

-- CreateIndex
CREATE INDEX "repair_request_items_machineSystemDetailId_idx" ON "common"."repair_request_items"("machineSystemDetailId");

-- CreateIndex
CREATE INDEX "project_tasks_projectPhaseId_idx" ON "business"."project_tasks"("projectPhaseId");

-- CreateIndex
CREATE INDEX "project_tasks_projectId_projectPhaseId_thuTu_idx" ON "business"."project_tasks"("projectId", "projectPhaseId", "thuTu");

-- AddCheckConstraint
ALTER TABLE "business"."project_phases"
    ADD CONSTRAINT "project_phases_tienDo_check" CHECK ("tienDo" >= 0 AND "tienDo" <= 100);

-- AddCheckConstraint
ALTER TABLE "business"."project_tasks"
    ADD CONSTRAINT "project_tasks_tienDo_check" CHECK ("tienDo" >= 0 AND "tienDo" <= 100);

-- AddForeignKey
ALTER TABLE "business"."machine_system_details"
    ADD CONSTRAINT "machine_system_details_machineSystemId_fkey"
    FOREIGN KEY ("machineSystemId")
    REFERENCES "business"."machine_systems"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."machine_system_details"
    ADD CONSTRAINT "machine_system_details_parentDetailId_fkey"
    FOREIGN KEY ("parentDetailId")
    REFERENCES "business"."machine_system_details"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."fault_templates"
    ADD CONSTRAINT "fault_templates_machineSystemId_fkey"
    FOREIGN KEY ("machineSystemId")
    REFERENCES "business"."machine_systems"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."fault_templates"
    ADD CONSTRAINT "fault_templates_machineSystemDetailId_fkey"
    FOREIGN KEY ("machineSystemDetailId")
    REFERENCES "business"."machine_system_details"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."fault_records"
    ADD CONSTRAINT "fault_records_machineSystemId_fkey"
    FOREIGN KEY ("machineSystemId")
    REFERENCES "business"."machine_systems"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."fault_records"
    ADD CONSTRAINT "fault_records_machineSystemDetailId_fkey"
    FOREIGN KEY ("machineSystemDetailId")
    REFERENCES "business"."machine_system_details"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."fault_records"
    ADD CONSTRAINT "fault_records_faultTemplateId_fkey"
    FOREIGN KEY ("faultTemplateId")
    REFERENCES "business"."fault_templates"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."repair_request_items"
    ADD CONSTRAINT "repair_request_items_machineSystemId_fkey"
    FOREIGN KEY ("machineSystemId")
    REFERENCES "business"."machine_systems"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."repair_request_items"
    ADD CONSTRAINT "repair_request_items_machineSystemDetailId_fkey"
    FOREIGN KEY ("machineSystemDetailId")
    REFERENCES "business"."machine_system_details"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."acceptance_handover_items"
    ADD CONSTRAINT "acceptance_handover_items_acceptanceHandoverId_fkey"
    FOREIGN KEY ("acceptanceHandoverId")
    REFERENCES "common"."acceptance_handovers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."acceptance_handover_items"
    ADD CONSTRAINT "acceptance_handover_items_repairRequestItemId_fkey"
    FOREIGN KEY ("repairRequestItemId")
    REFERENCES "common"."repair_request_items"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."acceptance_handover_items"
    ADD CONSTRAINT "acceptance_handover_items_machineSystemId_fkey"
    FOREIGN KEY ("machineSystemId")
    REFERENCES "business"."machine_systems"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."acceptance_handover_items"
    ADD CONSTRAINT "acceptance_handover_items_machineSystemDetailId_fkey"
    FOREIGN KEY ("machineSystemDetailId")
    REFERENCES "business"."machine_system_details"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."project_phases"
    ADD CONSTRAINT "project_phases_projectId_fkey"
    FOREIGN KEY ("projectId")
    REFERENCES "business"."projects"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business"."project_tasks"
    ADD CONSTRAINT "project_tasks_projectPhaseId_fkey"
    FOREIGN KEY ("projectPhaseId")
    REFERENCES "business"."project_phases"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
