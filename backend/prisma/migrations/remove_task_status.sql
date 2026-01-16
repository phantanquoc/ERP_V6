-- Remove trangThai column from tasks table
ALTER TABLE "common"."tasks" DROP COLUMN IF EXISTS "trangThai" CASCADE;

-- Drop TaskStatus enum if it exists
DROP TYPE IF EXISTS "common"."TaskStatus" CASCADE;

