-- Add qualityScore column to face_images
ALTER TABLE "common"."face_images"
  ADD COLUMN "qualityScore" DOUBLE PRECISION;
