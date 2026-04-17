ALTER TABLE common.notifications
ADD COLUMN IF NOT EXISTS metadata JSONB;
