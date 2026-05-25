-- Migration: add hienThiTrongChung field to Process table
-- Safe: IF NOT EXISTS prevents errors if column already present (local dev drift)
ALTER TABLE "business"."Process" ADD COLUMN IF NOT EXISTS "hienThiTrongChung" BOOLEAN NOT NULL DEFAULT false;
