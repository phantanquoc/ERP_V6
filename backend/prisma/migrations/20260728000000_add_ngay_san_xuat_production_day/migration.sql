-- Step 1: Add ngaySanXuat columns (nullable) to all four tables
ALTER TABLE "business"."material_evaluations" ADD COLUMN "ngaySanXuat" DATE;
ALTER TABLE "business"."system_operations" ADD COLUMN "ngaySanXuat" DATE;
ALTER TABLE "business"."finished_products" ADD COLUMN "ngaySanXuat" DATE;
ALTER TABLE "business"."quality_evaluations" ADD COLUMN "ngaySanXuat" DATE;

-- Step 2: Backfill ngaySanXuat from thoiGianChien using the 06:30 boundary rule.
-- The production day boundary is 06:30 local time (Asia/Ho_Chi_Minh = UTC+7).
-- A timestamp before 06:30 local belongs to the PREVIOUS calendar date's production day.
-- 06:30 local = 23:30 UTC the previous day. So boundary in UTC terms:
-- local_time = utc_time + 7 hours
-- If local hour < 6 OR (local hour = 6 AND local minute < 30) => previous day
-- Otherwise => same calendar date (in local time)

-- For material_evaluations (thoiGianChien is timestamp without time zone storing UTC)
-- Double AT TIME ZONE: first declares the value is UTC (producing timestamptz),
-- then converts to Asia/Ho_Chi_Minh local time (producing timestamp without tz).
UPDATE "business"."material_evaluations"
SET "ngaySanXuat" = CASE
  WHEN EXTRACT(HOUR FROM ("thoiGianChien" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')) < 6
    OR (EXTRACT(HOUR FROM ("thoiGianChien" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')) = 6
        AND EXTRACT(MINUTE FROM ("thoiGianChien" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')) < 30)
  THEN (("thoiGianChien" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - INTERVAL '1 day')::date
  ELSE ("thoiGianChien" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
END
WHERE "thoiGianChien" IS NOT NULL;

-- For system_operations (thoiGianChien is timestamp without time zone storing UTC)
UPDATE "business"."system_operations"
SET "ngaySanXuat" = CASE
  WHEN EXTRACT(HOUR FROM ("thoiGianChien" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')) < 6
    OR (EXTRACT(HOUR FROM ("thoiGianChien" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')) = 6
        AND EXTRACT(MINUTE FROM ("thoiGianChien" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')) < 30)
  THEN (("thoiGianChien" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - INTERVAL '1 day')::date
  ELSE ("thoiGianChien" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
END
WHERE "thoiGianChien" IS NOT NULL;

-- For finished_products (thoiGianChien is timestamp without time zone storing UTC)
UPDATE "business"."finished_products"
SET "ngaySanXuat" = CASE
  WHEN EXTRACT(HOUR FROM ("thoiGianChien" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')) < 6
    OR (EXTRACT(HOUR FROM ("thoiGianChien" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')) = 6
        AND EXTRACT(MINUTE FROM ("thoiGianChien" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')) < 30)
  THEN (("thoiGianChien" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - INTERVAL '1 day')::date
  ELSE ("thoiGianChien" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
END
WHERE "thoiGianChien" IS NOT NULL;

-- For quality_evaluations (thoiGianChien is String/text — stored as ISO 8601 with Z suffix)
-- The ::timestamptz cast correctly interprets the Z suffix as UTC, producing a
-- timezone-aware timestamp. Then AT TIME ZONE 'Asia/Ho_Chi_Minh' converts to local.
-- This is DIFFERENT from the naive-timestamp tables above which need the double AT TIME ZONE.
UPDATE "business"."quality_evaluations"
SET "ngaySanXuat" = CASE
  WHEN EXTRACT(HOUR FROM (("thoiGianChien")::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')) < 6
    OR (EXTRACT(HOUR FROM (("thoiGianChien")::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')) = 6
        AND EXTRACT(MINUTE FROM (("thoiGianChien")::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')) < 30)
  THEN ((("thoiGianChien")::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - INTERVAL '1 day')::date
  ELSE (("thoiGianChien")::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
END
WHERE "thoiGianChien" IS NOT NULL AND "thoiGianChien" != '';

-- Step 3: Drop the old unique constraints
DROP INDEX IF EXISTS "business"."material_evaluations_maChien_key";
DROP INDEX IF EXISTS "business"."finished_products_maChien_machineSystemId_key";
DROP INDEX IF EXISTS "business"."quality_evaluations_maChien_machineSystemId_key";

-- Step 4: Add new composite unique constraints
CREATE UNIQUE INDEX "material_evaluations_maChien_ngaySanXuat_key" ON "business"."material_evaluations"("maChien", "ngaySanXuat");
CREATE UNIQUE INDEX "system_operations_maChien_ngaySanXuat_machineSystemId_key" ON "business"."system_operations"("maChien", "ngaySanXuat", "machineSystemId");
CREATE UNIQUE INDEX "finished_products_maChien_ngaySanXuat_machineSystemId_key" ON "business"."finished_products"("maChien", "ngaySanXuat", "machineSystemId");
CREATE UNIQUE INDEX "quality_evaluations_maChien_ngaySanXuat_machineSystemId_key" ON "business"."quality_evaluations"("maChien", "ngaySanXuat", "machineSystemId");
