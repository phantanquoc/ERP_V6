## Why

Production output (FinishedProduct, 8 weight grades per fry batch) is completely disconnected from inventory (LotProduct.soLuong): finished goods never flow into the warehouse. FinishedProduct also has no structured link to InternationalProduct (only a free-text tenHangHoa), and the only date-based output aggregation (getTotalWeightByDate) is dead code with no UI. An audit of the production-data area additionally surfaced an inactive-machine bypass, a backend/frontend machine-filter mismatch, dead tables/pages, and missing TanStack hooks. This change closes the production→warehouse gap, adds multi-dimensional output statistics, and hardens the production-data area.

## What Changes

- **FinishedProduct → InternationalProduct link**: add nullable `internationalProductId` FK (relation, `onDelete: SetNull`, index) on FinishedProduct, pointing at the base product. Prisma `migrate dev`; existing rows stay null (no backfill).
- **Finished-product warehouse receipt (auto-fill + editable)**: new backend service method + controller + route (registered in ROUTE_MAP) that builds up to 8 `CreateReceiptInput` rows from one fry batch's 8 weight grades (including phế phẩm + ướt; grades with weight 0 are skipped), each grade resolving to its own SKU via a fixed `GRADE_LABELS` naming convention (`"{tenSanPham} - Loại A"`, `"- Loại B"`, `"- Loại B Dầu"`, `"- Loại C"`, `"- Vụn lớn"`, `"- Vụn nhỏ"`, `"- Phế phẩm"`, `"- Ướt"`), then delegates to existing `warehouseReceiptService.batchCreate`. New frontend "Nhập kho" button + modal on FinishedProductManagement: auto-fills the 8 quantity rows, user manually picks warehouse + lot, edits quantities before confirm, with loading/error/empty/success states. New TanStack hook invalidates warehouse + finished-product + lot-product queries.
- **Production output statistics (multi-dimensional)**: replace dead `getTotalWeightByDate` with `getOutputStatistics(filters)` aggregating by date + product + 8 grades + machine, with date-range and optional product/machine filters. New controller + route + TanStack hook + statistics table component.
- **Audit hardening**:
  - Unify the machine-eligibility filter between backend (`loaiHeThong ∈ {SAN_XUAT, DONG_GOI, BAO_QUAN}` + active) and frontend (hardcoded `^HT-CCK-(\d+)$` regex 1–8) into a single source of truth.
  - Add active-status validation to `createSystemOperation` so the single-create API cannot create data for a stopped machine (**BREAKING** for API callers that relied on the missing check).
  - Distinguish "good output" (A + B + B Dầu + C + vụn) from phế phẩm/ướt in statistics, without changing `tongKhoiLuong` semantics or warehouse-receipt behavior.
  - Surface (do NOT auto-drop) the dead `product_batches` table and the duplicate production-data page for manual removal.
  - Add TanStack hooks for the 5 production entities (SystemOperation, FinishedProduct, QualityEvaluation, MaterialEvaluation, ProductionReport) that components currently call directly.
  - Trace and fix the PUT/PATCH inconsistency and the dropped `danhGiaTongQuan` field in the production update flow.

## Capabilities

### New Capabilities
- `finished-product-warehouse-receipt`: receiving finished production output into warehouse stock — auto-filling quantities from a fry batch's 8 grades, mapping each grade to its own SKU, manual warehouse/lot selection, editable quantities, reusing the existing warehouse-receipt engine.
- `production-output-statistics`: multi-dimensional aggregation of finished-product output by date, product, grade, and machine, with good-output vs scrap distinction.

### Modified Capabilities
<!-- No existing OpenSpec capability spec governs these areas; audit fixes are captured as requirements inside the two new capabilities and the tasks list. -->

## Impact

- **Schema**: `backend/prisma/schema/business_production.prisma` (FinishedProduct: new FK + index), `business_orders.prisma` (InternationalProduct: reverse relation). New Prisma migration.
- **Backend**: `finishedProductService` (receipt-builder + getOutputStatistics, remove dead getTotalWeightByDate), `systemOperationService` (active-machine validation + unified filter), new controller(s)/route(s), `backend/src/routes/index.ts` ROUTE_MAP.
- **Frontend**: `FinishedProductManagement.tsx` (Nhập kho button + modal), new warehouse-receipt + statistics components, new hooks in `src/hooks/` (finished-product receipt, output statistics, 5 production-entity hooks), `useMachineSystemDetails.ts` (`useActiveFryerMachineSystems` filter unification), `SystemOperationManagement.tsx` (consumer of the unified filter).
- **Manual follow-up (not automated)**: drop of `product_batches` table and removal of the duplicate production-data page — surfaced in tasks for user confirmation.
- **Constraints**: multi-schema Prisma + `@@schema("business")`, CUID ids, Route→Controller→Service→Prisma, typed errors, standard response shape, no generic `PATCH /status`, Vietnamese user-facing text, `tsc --noEmit` + tests must pass.
