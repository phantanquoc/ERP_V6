-- AlterTable: add ghiChu to MaterialEvaluation
ALTER TABLE "business"."material_evaluations" ADD COLUMN "ghiChu" TEXT;

-- AlterTable: add ghiChu to FinishedProduct
ALTER TABLE "business"."finished_products" ADD COLUMN "ghiChu" TEXT;

-- CreateTable: entry history for per-grade attribution
CREATE TABLE "business"."finished_product_entry_history" (
    "id" TEXT NOT NULL,
    "finishedProductId" TEXT NOT NULL,
    "maChien" TEXT NOT NULL,
    "ngaySanXuat" DATE,
    "machineSystemId" TEXT,
    "grade" TEXT NOT NULL,
    "khoiLuong" DOUBLE PRECISION NOT NULL,
    "employeeId" TEXT,
    "employeeName" TEXT,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finished_product_entry_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "finished_product_entry_history_finishedProductId_idx" ON "business"."finished_product_entry_history"("finishedProductId");

-- CreateIndex
CREATE INDEX "finished_product_entry_history_maChien_ngaySanXuat_machineSy_idx" ON "business"."finished_product_entry_history"("maChien", "ngaySanXuat", "machineSystemId");

-- CreateIndex
CREATE INDEX "finished_product_entry_history_employeeId_idx" ON "business"."finished_product_entry_history"("employeeId");

-- AddForeignKey
ALTER TABLE "business"."finished_product_entry_history" ADD CONSTRAINT "finished_product_entry_history_finishedProductId_fkey" FOREIGN KEY ("finishedProductId") REFERENCES "business"."finished_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
