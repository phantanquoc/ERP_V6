-- AlterTable
ALTER TABLE "common"."evaluations" ADD COLUMN "evaluatedBy1Id" VARCHAR(30),
ADD COLUMN "evaluatedBy2Id" VARCHAR(30),
ADD COLUMN "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN "acknowledgedBy" VARCHAR(30);
