-- Add lyDoChenhLech to warehouse slips (header level).
-- InboundPlan/OutboundPlan already have this column since 20260918100000;
-- WarehouseReceipt/WarehouseIssue were missing it, so the service fell back
-- to embedding the reason in ghiChu ("| LyDoChenhLech: ..."), which the list
-- endpoint did not parse back — detail view always showed "Chưa ghi lý do".
-- This migration adds the proper column so the reason is stored and returned
-- directly, with ghiChu fallback only for legacy rows.

ALTER TABLE "business"."warehouse_receipts" ADD COLUMN "lyDoChenhLech" TEXT;
ALTER TABLE "business"."warehouse_issues" ADD COLUMN "lyDoChenhLech" TEXT;
