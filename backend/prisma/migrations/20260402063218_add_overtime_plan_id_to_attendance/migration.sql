-- AlterTable
ALTER TABLE "common"."attendances" ADD COLUMN     "overtimePlanId" TEXT;

-- CreateIndex
CREATE INDEX "attendances_overtimePlanId_idx" ON "common"."attendances"("overtimePlanId");

-- AddForeignKey
ALTER TABLE "common"."attendances" ADD CONSTRAINT "attendances_overtimePlanId_fkey" FOREIGN KEY ("overtimePlanId") REFERENCES "common"."overtime_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
