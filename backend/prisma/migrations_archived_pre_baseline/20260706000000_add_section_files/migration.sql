-- CreateTable
CREATE TABLE "common"."process_flowchart_section_files" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "process_flowchart_section_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."production_flowchart_section_files" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "production_flowchart_section_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "process_flowchart_section_files_sectionId_order_idx" ON "common"."process_flowchart_section_files"("sectionId", "order");

-- CreateIndex
CREATE INDEX "production_flowchart_section_files_sectionId_order_idx" ON "common"."production_flowchart_section_files"("sectionId", "order");

-- AddForeignKey
ALTER TABLE "common"."process_flowchart_section_files" ADD CONSTRAINT "process_flowchart_section_files_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "common"."process_flowchart_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."process_flowchart_section_files" ADD CONSTRAINT "process_flowchart_section_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."production_flowchart_section_files" ADD CONSTRAINT "production_flowchart_section_files_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "common"."production_flowchart_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common"."production_flowchart_section_files" ADD CONSTRAINT "production_flowchart_section_files_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: migrate existing fileUrl data to new tables
INSERT INTO "common"."process_flowchart_section_files" ("id", "sectionId", "url", "fileName", "order", "uploadedAt")
SELECT
  'cf' || substr(md5(random()::text || id), 1, 23) AS "id",
  id AS "sectionId",
  "fileUrl" AS "url",
  regexp_replace(
    regexp_replace("fileUrl", '.*/', ''),
    '-\d+-\d+(?=\.)', '', 'g'
  ) AS "fileName",
  0 AS "order",
  NOW() AS "uploadedAt"
FROM "common"."process_flowchart_sections"
WHERE "fileUrl" IS NOT NULL AND "fileUrl" <> '';

INSERT INTO "common"."production_flowchart_section_files" ("id", "sectionId", "url", "fileName", "order", "uploadedAt")
SELECT
  'cf' || substr(md5(random()::text || id), 1, 23) AS "id",
  id AS "sectionId",
  "fileUrl" AS "url",
  regexp_replace(
    regexp_replace("fileUrl", '.*/', ''),
    '-\d+-\d+(?=\.)', '', 'g'
  ) AS "fileName",
  0 AS "order",
  NOW() AS "uploadedAt"
FROM "common"."production_flowchart_sections"
WHERE "fileUrl" IS NOT NULL AND "fileUrl" <> '';
