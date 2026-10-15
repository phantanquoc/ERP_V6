-- YCSC: merge DA_TIEP_NHAN + LEN_KE_HOACH into CHO_XU_LY, rename CHO_NGHIEM_THU -> DA_SUA_CHUA
-- PostgreSQL cannot drop enum values in use, so rebuild the type with a USING remap.
--
-- NOTE (prod fix 2026-10-15): repair_requests lives in schema "common" but
-- repair_request_status_logs lives in schema "business" (see business_machines.prisma).
-- The first version of this migration used "common" for both and failed with 42P01.
-- Also: DROP DEFAULT before ALTER TYPE (E42804 otherwise).

ALTER TYPE "common"."RepairRequestStatus" RENAME TO "RepairRequestStatus_old";

CREATE TYPE "common"."RepairRequestStatus" AS ENUM ('CHO_XU_LY', 'DANG_SUA_CHUA', 'DA_SUA_CHUA', 'DA_NGHIEM_THU', 'HOAN_THANH', 'DA_HUY', 'TU_CHOI');

ALTER TABLE "common"."repair_requests" ALTER COLUMN "trangThai" DROP DEFAULT;
ALTER TABLE "business"."repair_request_status_logs" ALTER COLUMN "oldStatus" DROP DEFAULT;
ALTER TABLE "business"."repair_request_status_logs" ALTER COLUMN "newStatus" DROP DEFAULT;

ALTER TABLE "common"."repair_requests" ALTER COLUMN "trangThai" TYPE "common"."RepairRequestStatus" USING (
  CASE "trangThai"::text
    WHEN 'DA_TIEP_NHAN' THEN 'CHO_XU_LY'::common."RepairRequestStatus"
    WHEN 'LEN_KE_HOACH' THEN 'CHO_XU_LY'::common."RepairRequestStatus"
    WHEN 'CHO_NGHIEM_THU' THEN 'DA_SUA_CHUA'::common."RepairRequestStatus"
    ELSE "trangThai"::text::common."RepairRequestStatus"
  END
);
ALTER TABLE "common"."repair_requests" ALTER COLUMN "trangThai" SET DEFAULT 'CHO_XU_LY'::common."RepairRequestStatus";

ALTER TABLE "business"."repair_request_status_logs" ALTER COLUMN "oldStatus" TYPE "common"."RepairRequestStatus" USING (
  CASE "oldStatus"::text
    WHEN 'DA_TIEP_NHAN' THEN 'CHO_XU_LY'::common."RepairRequestStatus"
    WHEN 'LEN_KE_HOACH' THEN 'CHO_XU_LY'::common."RepairRequestStatus"
    WHEN 'CHO_NGHIEM_THU' THEN 'DA_SUA_CHUA'::common."RepairRequestStatus"
    ELSE "oldStatus"::text::common."RepairRequestStatus"
  END
);
ALTER TABLE "business"."repair_request_status_logs" ALTER COLUMN "newStatus" TYPE "common"."RepairRequestStatus" USING (
  CASE "newStatus"::text
    WHEN 'DA_TIEP_NHAN' THEN 'CHO_XU_LY'::common."RepairRequestStatus"
    WHEN 'LEN_KE_HOACH' THEN 'CHO_XU_LY'::common."RepairRequestStatus"
    WHEN 'CHO_NGHIEM_THU' THEN 'DA_SUA_CHUA'::common."RepairRequestStatus"
    ELSE "newStatus"::text::common."RepairRequestStatus"
  END
);

DROP TYPE "common"."RepairRequestStatus_old";
