-- AlterTable: Change thoiGianChien from String to DateTime (timestamp)
-- Existing data is stored as ISO strings, which PostgreSQL can cast directly

ALTER TABLE "business"."finished_products"
ALTER COLUMN "thoiGianChien" TYPE TIMESTAMP(3) USING "thoiGianChien"::timestamp(3);
