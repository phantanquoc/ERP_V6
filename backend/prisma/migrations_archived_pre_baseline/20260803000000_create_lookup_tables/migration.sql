-- Shared lookup table (change: shared-lookup-table)
-- ADDITIVE ONLY: CREATE TYPE / CREATE TABLE / CREATE INDEX / ADD CONSTRAINT.
-- No DROP, no ALTER COLUMN, no TRUNCATE. No existing table is touched.

-- CreateEnum
CREATE TYPE "common"."LookupChangeAction" AS ENUM ('CREATE', 'UPDATE_LABEL', 'CASCADE_RENAME', 'UPDATE_SORT_ORDER', 'SOFT_DELETE', 'REACTIVATE');

-- CreateTable
CREATE TABLE "common"."lookups" (
    "id" TEXT NOT NULL,
    "group" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lookups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common"."lookup_change_logs" (
    "id" TEXT NOT NULL,
    "lookupId" TEXT,
    "group" TEXT NOT NULL,
    "action" "common"."LookupChangeAction" NOT NULL,
    "oldLabel" TEXT,
    "newLabel" TEXT,
    "affectedRecords" INTEGER NOT NULL DEFAULT 0,
    "affectedTables" JSONB,
    "changedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lookup_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lookups_group_isActive_sortOrder_idx" ON "common"."lookups"("group", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "lookups_group_code_key" ON "common"."lookups"("group", "code");

-- CreateIndex
CREATE INDEX "lookup_change_logs_lookupId_createdAt_idx" ON "common"."lookup_change_logs"("lookupId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "lookup_change_logs_group_createdAt_idx" ON "common"."lookup_change_logs"("group", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "common"."lookup_change_logs" ADD CONSTRAINT "lookup_change_logs_lookupId_fkey" FOREIGN KEY ("lookupId") REFERENCES "common"."lookups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
