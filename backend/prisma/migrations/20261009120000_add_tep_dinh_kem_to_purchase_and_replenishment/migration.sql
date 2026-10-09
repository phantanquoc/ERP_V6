-- Add PurchaseRequest.tepDinhKem and ReplenishmentRequest.tepDinhKem (multi-file, max 4, code-based rename)
ALTER TABLE "business"."purchase_requests" ADD COLUMN IF NOT EXISTS "tep_dinh_kem" TEXT[] DEFAULT '{}';
ALTER TABLE "business"."replenishment_requests" ADD COLUMN IF NOT EXISTS "tep_dinh_kem" TEXT[] DEFAULT '{}';
