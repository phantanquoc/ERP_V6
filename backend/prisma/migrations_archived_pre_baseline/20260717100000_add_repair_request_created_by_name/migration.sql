-- AlterTable
ALTER TABLE "common"."repair_requests" ADD COLUMN "createdByName" TEXT;

-- Backfill createdByName from auth.users for existing records
UPDATE "common"."repair_requests" rr
SET "createdByName" = TRIM(u."lastName" || ' ' || u."firstName")
FROM "auth"."users" u
WHERE rr."createdById" = u."id"
  AND rr."createdByName" IS NULL;
