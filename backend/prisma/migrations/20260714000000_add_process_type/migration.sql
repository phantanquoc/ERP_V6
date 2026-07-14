-- CreateTable
CREATE TABLE "common"."process_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "thuTu" INTEGER NOT NULL DEFAULT 0,
    "kichHoat" BOOLEAN NOT NULL DEFAULT true,
    "macDinhHeThong" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "process_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "process_types_code_key" ON "common"."process_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "process_types_name_key" ON "common"."process_types"("name");
