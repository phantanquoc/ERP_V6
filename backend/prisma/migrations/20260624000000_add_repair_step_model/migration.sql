-- CreateTable
CREATE TABLE "business"."repair_steps" (
    "id" TEXT NOT NULL,
    "faultTemplateId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "moTa" TEXT NOT NULL,
    "thoiGianUocTinh" INTEGER,
    "dungCu" TEXT,
    "ghiChu" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "repair_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "repair_steps_faultTemplateId_idx" ON "business"."repair_steps"("faultTemplateId");

-- CreateIndex
CREATE INDEX "repair_steps_faultTemplateId_stepNumber_idx" ON "business"."repair_steps"("faultTemplateId", "stepNumber");

-- AddForeignKey
ALTER TABLE "business"."repair_steps" ADD CONSTRAINT "repair_steps_faultTemplateId_fkey" FOREIGN KEY ("faultTemplateId") REFERENCES "business"."fault_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
