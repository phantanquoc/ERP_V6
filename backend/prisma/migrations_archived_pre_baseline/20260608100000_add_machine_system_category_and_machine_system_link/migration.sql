-- CreateEnum
CREATE TYPE "business"."MachineSystemCategory" AS ENUM ('SAN_XUAT', 'DONG_GOI', 'BAO_QUAN', 'DIEN', 'NUOC', 'HOI', 'KHI_NEN', 'LAM_NONG', 'VAN_CHUYEN', 'PCCC', 'CHAT_THAI', 'KIEM_TRA_CL', 'AN_TOAN', 'KHAC');

-- AlterTable: Add loaiHeThong to MachineSystem
ALTER TABLE "business"."machine_systems" ADD COLUMN "loaiHeThong" "business"."MachineSystemCategory" NOT NULL DEFAULT 'SAN_XUAT';

-- AlterTable: Add machineSystemId to Machine
ALTER TABLE "business"."machines" ADD COLUMN "machineSystemId" TEXT;

-- CreateIndex
CREATE INDEX "machines_machineSystemId_idx" ON "business"."machines"("machineSystemId");

-- AddForeignKey
ALTER TABLE "business"."machines" ADD CONSTRAINT "machines_machineSystemId_fkey" FOREIGN KEY ("machineSystemId") REFERENCES "business"."machine_systems"("id") ON DELETE SET NULL ON UPDATE CASCADE;
