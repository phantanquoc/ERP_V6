-- YCKT: new status CHO_NGHIEM_THU (waiting for requester to confirm "Đã khắc phục" acceptance)
ALTER TYPE "common"."InspectionRequestStatus" ADD VALUE IF NOT EXISTS 'CHO_NGHIEM_THU';

-- AcceptanceHandover shared by YCSC and YCKT + requester confirmation fields
ALTER TABLE "common"."acceptance_handovers" ADD COLUMN IF NOT EXISTS "inspection_request_id" INTEGER,
ADD COLUMN IF NOT EXISTS "ly_do_xac_nhan" TEXT,
ADD COLUMN IF NOT EXISTS "nguoi_xac_nhan_id" TEXT,
ADD COLUMN IF NOT EXISTS "nguoi_xac_nhan_ten" TEXT,
ADD COLUMN IF NOT EXISTS "xac_nhan_boi_id" TEXT,
ADD COLUMN IF NOT EXISTS "xac_nhan_luc" TIMESTAMPTZ,
ALTER COLUMN "repairRequestId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "acceptance_handovers_inspection_request_id_idx" ON "common"."acceptance_handovers"("inspection_request_id");
CREATE INDEX IF NOT EXISTS "acceptance_handovers_nguoi_xac_nhan_id_idx" ON "common"."acceptance_handovers"("nguoi_xac_nhan_id");

ALTER TABLE "common"."acceptance_handovers" ADD CONSTRAINT "acceptance_handovers_inspection_request_id_fkey" FOREIGN KEY ("inspection_request_id") REFERENCES "common"."inspection_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Exactly one source document per acceptance slip
ALTER TABLE "common"."acceptance_handovers" ADD CONSTRAINT "acceptance_handovers_one_source_chk"
  CHECK (("repairRequestId" IS NOT NULL) <> ("inspection_request_id" IS NOT NULL));

-- Data: conclusion reduced to CAN_SUA_CHUA | DA_KHAC_PHUC; severity 'nguy_hiem' dropped (mapped to 'nang')
UPDATE "common"."inspection_requests" SET "ket_luan" = 'DA_KHAC_PHUC' WHERE "ket_luan" IN ('KHONG_CAN', 'THEO_DOI');
UPDATE "common"."inspection_requests" SET "muc_do_hu_hong" = 'nang' WHERE "muc_do_hu_hong" IN ('nguy_hiem', 'nguy hiem');
