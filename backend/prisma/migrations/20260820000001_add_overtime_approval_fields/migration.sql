-- Add approval audit fields to overtime_plans (idempotent)
ALTER TABLE "common"."overtime_plans" ADD COLUMN IF NOT EXISTS "nguoiDuyetId" TEXT;
ALTER TABLE "common"."overtime_plans" ADD COLUMN IF NOT EXISTS "ngayDuyet" TIMESTAMPTZ;
ALTER TABLE "common"."overtime_plans" ADD COLUMN IF NOT EXISTS "lyDoTuChoi" TEXT;
