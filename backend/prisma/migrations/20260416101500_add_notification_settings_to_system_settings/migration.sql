ALTER TABLE "common"."system_settings"
ADD COLUMN IF NOT EXISTS "notificationSettings" JSONB;
