-- AlterTable: Add nganSach to ProjectPhase
ALTER TABLE "business"."project_phases" ADD COLUMN "nganSach" DOUBLE PRECISION;

-- AlterTable: Add mucDoUuTien, laMilestone to ProjectTask
ALTER TABLE "business"."project_tasks" ADD COLUMN "mucDoUuTien" "common"."TaskPriority";
ALTER TABLE "business"."project_tasks" ADD COLUMN "laMilestone" BOOLEAN NOT NULL DEFAULT false;
