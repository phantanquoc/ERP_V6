-- YCKT: remove DANG_KIEM_TRA — merge into DA_TIEP_NHAN (DA_TIEP_NHAN now means "received + inspecting")
-- Data fix must run before the enum value is dropped.
UPDATE "common"."inspection_requests" SET "trangThai" = 'DA_TIEP_NHAN' WHERE "trangThai" = 'DANG_KIEM_TRA';
UPDATE "common"."inspection_request_status_logs" SET "newStatus" = 'DA_TIEP_NHAN' WHERE "newStatus" = 'DANG_KIEM_TRA';
UPDATE "common"."inspection_request_status_logs" SET "oldStatus" = 'DA_TIEP_NHAN' WHERE "oldStatus" = 'DANG_KIEM_TRA';

-- Recreate enum without DANG_KIEM_TRA (Postgres cannot DROP ENUM value while in use)
ALTER TYPE "common"."InspectionRequestStatus" RENAME TO "InspectionRequestStatus_old";
CREATE TYPE "common"."InspectionRequestStatus" AS ENUM ('CHO_XU_LY', 'DA_TIEP_NHAN', 'DA_KIEM_TRA', 'CHO_NGHIEM_THU', 'HOAN_THANH', 'DA_HUY', 'TU_CHOI');
-- Same E42804 guard as YCSC migration: drop defaults before ALTER TYPE.
ALTER TABLE "common"."inspection_requests" ALTER COLUMN "trangThai" DROP DEFAULT;
ALTER TABLE "common"."inspection_request_status_logs" ALTER COLUMN "oldStatus" DROP DEFAULT;
ALTER TABLE "common"."inspection_request_status_logs" ALTER COLUMN "newStatus" DROP DEFAULT;
ALTER TABLE "common"."inspection_requests" ALTER COLUMN "trangThai" TYPE "common"."InspectionRequestStatus" USING "trangThai"::text::"common"."InspectionRequestStatus";
ALTER TABLE "common"."inspection_requests" ALTER COLUMN "trangThai" SET DEFAULT 'CHO_XU_LY';
ALTER TABLE "common"."inspection_request_status_logs" ALTER COLUMN "oldStatus" TYPE "common"."InspectionRequestStatus" USING "oldStatus"::text::"common"."InspectionRequestStatus";
ALTER TABLE "common"."inspection_request_status_logs" ALTER COLUMN "newStatus" TYPE "common"."InspectionRequestStatus" USING "newStatus"::text::"common"."InspectionRequestStatus";
DROP TYPE "common"."InspectionRequestStatus_old";
