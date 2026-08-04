-- CreateTable
CREATE TABLE "common"."data_entry_page_positions" (
    "id" TEXT NOT NULL,
    "pageKey" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_entry_page_positions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "data_entry_page_positions_pageKey_positionId_key" ON "common"."data_entry_page_positions"("pageKey", "positionId");

-- AddForeignKey
ALTER TABLE "common"."data_entry_page_positions" ADD CONSTRAINT "data_entry_page_positions_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "common"."positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
