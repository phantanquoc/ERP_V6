-- Add PurchaseRequest.lyDoChenhLech and PurchaseRequestItem.soLuongThucTe
ALTER TABLE "business"."purchase_requests" ADD COLUMN IF NOT EXISTS "lyDoChenhLech" TEXT;
ALTER TABLE "business"."purchase_request_items" ADD COLUMN IF NOT EXISTS "soLuongThucTe" DOUBLE PRECISION;
