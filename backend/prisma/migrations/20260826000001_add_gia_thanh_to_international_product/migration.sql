-- Add nullable giaThanh (VND / unit) to InternationalProduct.
-- Two-tier pricing: product default (InternationalProduct.giaThanh) + actual per-parcel (LotProduct.giaThanh).
-- Safe: ADD COLUMN without NOT NULL, no data loss; migrate deploy is non-destructive.
ALTER TABLE "business"."international_products" ADD COLUMN IF NOT EXISTS "giaThanh" DOUBLE PRECISION;
