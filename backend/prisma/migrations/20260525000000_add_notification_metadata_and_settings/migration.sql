-- AlterTable: add optional metadata field to notifications for deep-link context
ALTER TABLE "common"."notifications" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- AlterTable: add optional notification settings to system_settings
ALTER TABLE "common"."system_settings" ADD COLUMN IF NOT EXISTS "notificationSettings" JSONB;
