-- CreateTable
CREATE TABLE "business"."quotation_revisions" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "quotation_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "quotation_revisions_quotationId_idx" ON "business"."quotation_revisions"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "quotation_revisions_quotationId_revisionNumber_key" ON "business"."quotation_revisions"("quotationId", "revisionNumber");

-- AddForeignKey
ALTER TABLE "business"."quotation_revisions" ADD CONSTRAINT "quotation_revisions_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "business"."quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
