-- AlterTable: make deprecated scalar fields nullable
ALTER TABLE "common"."repair_requests"
    ALTER COLUMN "tenHeThong" DROP NOT NULL,
    ALTER COLUMN "tinhTrangThietBi" DROP NOT NULL,
    ALTER COLUMN "loaiLoi" DROP NOT NULL,
    ALTER COLUMN "noiDungLoi" DROP NOT NULL;

-- CreateTable
CREATE TABLE "common"."repair_request_items" (
    "id" TEXT NOT NULL,
    "repairRequestId" INTEGER NOT NULL,
    "tenHeThong" TEXT NOT NULL,
    "tinhTrangThietBi" TEXT NOT NULL,
    "loaiLoi" TEXT NOT NULL,
    "noiDungLoi" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_request_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "common"."repair_request_items"
    ADD CONSTRAINT "repair_request_items_repairRequestId_fkey"
    FOREIGN KEY ("repairRequestId")
    REFERENCES "common"."repair_requests"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
