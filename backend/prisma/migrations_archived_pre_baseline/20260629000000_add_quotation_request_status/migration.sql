-- CreateEnum
CREATE TYPE "business"."QuotationRequestStatus" AS ENUM ('CHO_XU_LY', 'DANG_BAO_GIA', 'DA_BAO_GIA', 'HUY');

-- AlterTable
ALTER TABLE "business"."quotation_requests" ADD COLUMN "status" "business"."QuotationRequestStatus" NOT NULL DEFAULT 'CHO_XU_LY';
