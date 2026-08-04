-- Move the dead `product_batches` table out of Prisma's managed `business` schema
-- into an unmanaged `archive` schema. This preserves all data (no DROP) while
-- removing the table from the Prisma datamodel. The `archive` schema is NOT listed
-- in the datasource `schemas` array, so Prisma will ignore it (no drift detection).

CREATE SCHEMA IF NOT EXISTS "archive";

-- Move table (and its data + constraints) to the archive schema. Idempotent guard:
-- only move if it still lives in `business`.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'business' AND table_name = 'product_batches'
  ) THEN
    EXECUTE 'ALTER TABLE "business"."product_batches" SET SCHEMA "archive"';
  END IF;
END $$;
