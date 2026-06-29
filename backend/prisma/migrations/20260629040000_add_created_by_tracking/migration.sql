-- AddColumn: createdById to FaultRecord (business schema)
ALTER TABLE "business"."fault_records" ADD COLUMN "createdById" TEXT;
CREATE INDEX "fault_records_createdById_idx" ON "business"."fault_records"("createdById");

-- AddColumn: createdById to MaintenancePlan (business schema)
ALTER TABLE "business"."maintenance_plans" ADD COLUMN "createdById" TEXT;
CREATE INDEX "maintenance_plans_createdById_idx" ON "business"."maintenance_plans"("createdById");

-- AddColumn: createdById to MaintenanceRecord (business schema)
ALTER TABLE "business"."maintenance_records" ADD COLUMN "createdById" TEXT;
CREATE INDEX "maintenance_records_createdById_idx" ON "business"."maintenance_records"("createdById");

-- AddColumn: createdById to RepairRequest (common schema)
ALTER TABLE "common"."repair_requests" ADD COLUMN "createdById" TEXT;
CREATE INDEX "repair_requests_createdById_idx" ON "common"."repair_requests"("createdById");

-- AddColumn: createdById to AcceptanceHandover (common schema)
ALTER TABLE "common"."acceptance_handovers" ADD COLUMN "createdById" TEXT;
CREATE INDEX "acceptance_handovers_createdById_idx" ON "common"."acceptance_handovers"("createdById");

-- AddColumn: createdById to InternalInspection (common schema)
ALTER TABLE "common"."internal_inspections" ADD COLUMN "createdById" TEXT;
CREATE INDEX "internal_inspections_createdById_idx" ON "common"."internal_inspections"("createdById");

-- AddColumn: createdById to MaterialEvaluation (business schema)
ALTER TABLE "business"."material_evaluations" ADD COLUMN "createdById" TEXT;
CREATE INDEX "material_evaluations_createdById_idx" ON "business"."material_evaluations"("createdById");

-- AddColumn: createdById to FinishedProduct (business schema)
ALTER TABLE "business"."finished_products" ADD COLUMN "createdById" TEXT;
CREATE INDEX "finished_products_createdById_idx" ON "business"."finished_products"("createdById");

-- AddColumn: createdById to QualityEvaluation (business schema)
ALTER TABLE "business"."quality_evaluations" ADD COLUMN "createdById" TEXT;
CREATE INDEX "quality_evaluations_createdById_idx" ON "business"."quality_evaluations"("createdById");

-- AddColumn: createdById to ProductionReport (business schema)
ALTER TABLE "business"."production_reports" ADD COLUMN "createdById" TEXT;
CREATE INDEX "production_reports_createdById_idx" ON "business"."production_reports"("createdById");

-- AddColumn: createdById to CustomerFeedback (business schema)
ALTER TABLE "business"."customer_feedbacks" ADD COLUMN "createdById" TEXT;
CREATE INDEX "customer_feedbacks_createdById_idx" ON "business"."customer_feedbacks"("createdById");

-- AddColumn: createdById to Invoice (business schema)
ALTER TABLE "business"."invoices" ADD COLUMN "createdById" TEXT;
CREATE INDEX "invoices_createdById_idx" ON "business"."invoices"("createdById");

-- AddColumn: createdById to TaxReport (business schema)
ALTER TABLE "business"."tax_reports" ADD COLUMN "createdById" TEXT;
CREATE INDEX "tax_reports_createdById_idx" ON "business"."tax_reports"("createdById");
