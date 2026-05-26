ALTER TABLE "common"."overtime_plans" ADD COLUMN IF NOT EXISTS "gioThucTe" JSONB NOT NULL DEFAULT '{}';
