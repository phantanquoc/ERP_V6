-- NOTE: pg_trgm extension requires superuser or rds_superuser on RDS.
-- If the prod DB owner cannot create extensions, run this line first as a privileged role.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- AlterTable: add nullable ngayXuLy column to FaultRecord
ALTER TABLE "business"."fault_records" ADD COLUMN "ngayXuLy" TIMESTAMP(3);
