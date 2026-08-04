-- Add nullable "ca" (production shift: 1, 2, or 3) to material_evaluations.
-- Nullable so existing rows remain valid; new rows set it from the form.
ALTER TABLE "business"."material_evaluations" ADD COLUMN "ca" INTEGER;
