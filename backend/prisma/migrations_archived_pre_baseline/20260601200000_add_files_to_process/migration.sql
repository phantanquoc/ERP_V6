-- AlterTable
ALTER TABLE "common"."processes" ADD COLUMN "files" TEXT[] DEFAULT ARRAY[]::TEXT[];
