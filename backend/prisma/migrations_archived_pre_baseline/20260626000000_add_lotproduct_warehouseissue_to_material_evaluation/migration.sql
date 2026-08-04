-- AddColumn: lotProductId and warehouseIssueId to material_evaluations
-- Also adds reverse relations on LotProduct and WarehouseIssue
-- Applied via db push on 2026-06-26

ALTER TABLE "business"."material_evaluations"
  ADD COLUMN "lotProductId" TEXT,
  ADD COLUMN "warehouseIssueId" TEXT;

-- Unique constraint on warehouseIssueId (1-to-1 with WarehouseIssue)
ALTER TABLE "business"."material_evaluations"
  ADD CONSTRAINT "material_evaluations_warehouseIssueId_key" UNIQUE ("warehouseIssueId");

-- Index on lotProductId for efficient lookup
CREATE INDEX "material_evaluations_lotProductId_idx"
  ON "business"."material_evaluations"("lotProductId");

-- FK: lotProductId -> lot_products(id) ON DELETE SET NULL
ALTER TABLE "business"."material_evaluations"
  ADD CONSTRAINT "material_evaluations_lotProductId_fkey"
  FOREIGN KEY ("lotProductId")
  REFERENCES "business"."lot_products"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- FK: warehouseIssueId -> warehouse_issues(id) ON DELETE SET NULL
ALTER TABLE "business"."material_evaluations"
  ADD CONSTRAINT "material_evaluations_warehouseIssueId_fkey"
  FOREIGN KEY ("warehouseIssueId")
  REFERENCES "business"."warehouse_issues"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
