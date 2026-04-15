ALTER TABLE "business"."supply_requests"
ADD COLUMN "approvedByEmployeeId" TEXT,
ADD COLUMN "approvedByName" TEXT,
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "rejectionReason" TEXT;

ALTER TABLE "business"."supply_requests"
ALTER COLUMN "trangThai" SET DEFAULT 'Chờ duyệt';

UPDATE "business"."supply_requests"
SET "trangThai" = 'Chờ duyệt'
WHERE "trangThai" = 'Chưa cung cấp';

UPDATE "business"."supply_requests"
SET
  "approvedByName" = COALESCE("approvedByName", 'Hệ thống'),
  "approvedAt" = COALESCE("approvedAt", "updatedAt")
WHERE "trangThai" IN ('Đã duyệt', 'Đang xử lý', 'Đã duyệt mua', 'Đã mua hàng', 'Đã cung cấp')
  AND ("approvedByName" IS NULL OR "approvedAt" IS NULL);
