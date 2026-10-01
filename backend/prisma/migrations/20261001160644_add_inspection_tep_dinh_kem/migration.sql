-- Add InspectionRequest.tepDinhKem (multi-file attachments, max 4 enforced in app layer)
ALTER TABLE "common"."inspection_requests" ADD COLUMN IF NOT EXISTS "tep_dinh_kem" TEXT[] DEFAULT '{}';
