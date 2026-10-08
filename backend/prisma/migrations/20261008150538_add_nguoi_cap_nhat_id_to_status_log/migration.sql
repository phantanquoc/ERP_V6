-- Add nguoiCapNhatId to machine_status_logs for user traceability; backfill not needed (existing rows keep NULL)
ALTER TABLE "business"."machine_status_logs" ADD COLUMN IF NOT EXISTS "nguoiCapNhatId" TEXT;
CREATE INDEX IF NOT EXISTS "machine_status_logs_nguoiCapNhatId_idx" ON "business"."machine_status_logs"("nguoiCapNhatId");
