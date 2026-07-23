## Why

A fry batch (`maChien`) needs data entered across three production stages, but the kiosk hub only ships two of them. The third hub button is a placeholder, and the operation-parameters stage (`SystemOperation`) has no kiosk page at all. Worse, the child rows that the output/parameter pages edit are only created when someone manually clicks a desktop button — so a batch created on the kiosk has nothing for workers to fill until an admin intervenes. This change closes the kiosk loop so a single `maChien` can be fully populated from tablets alone.

## What Changes

- Add a new full-screen kiosk page for **operation parameters** (`SystemOperation`): shift → operator → fry-batch → machine → 4-stage temperature/pressure/time + input weight + total drying time, saved by PATCHing the pre-created `SystemOperation` row.
- Auto-generate the child rows (`SystemOperation` + `FinishedProduct` + `QualityEvaluation`) for every active production machine **immediately when a `maChien` is created**, on both create paths (warehouse-linked and legacy). This removes the manual desktop trigger from the kiosk flow. The generation is a non-fatal side effect — if it fails, the `MaterialEvaluation` create still succeeds.
- Wire the third hub button ("Thông số vận hành") to the new route; retire the placeholder.
- Rename the existing evaluation page's display label from "Đánh giá nguyên liệu" to "Đánh giá ngâm" (label text only — no field or logic change).
- Add a `SYSTEM_OPERATION` entry type to the tablet position-config screen.
- Add the new kiosk route (under the `/production/nhap-lieu` prefix so kiosk detection works) plus a matching admin preview route.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `production-data-tablet-entry`: Adds a new kiosk page for operation-parameter entry, adds auto-generation of production child rows on batch creation, wires the third hub button, and renames the evaluation page label.

## Impact

- **Frontend**: `pages/production/ProductionSystemOperationEntry.tsx` (new), `pages/production/DataEntryHub.tsx`, `pages/production/DataEntryPositionConfig.tsx`, `pages/production/ProductionMaterialEvaluationEntry.tsx` (label only), `App.tsx` (routes), `hooks/useProductionDataEntry.ts` and `services/systemOperationService.ts` (reuse/extend for PATCH).
- **Backend**: `services/materialEvaluationService.ts` — invoke `SystemOperationService.createBulkSystemOperations` as a non-fatal post-create side effect on both create branches.
- **Reused components**: `ShiftSelectionScreen`, `OperatorSelectionScreen`.
- **Data**: no schema change; existing `SystemOperation` / `FinishedProduct` / `QualityEvaluation` models and the `createBulkSystemOperations` transaction are unchanged.
- **Out of scope**: desktop "Dữ liệu sản xuất" tabs, full criteria-based automation of material evaluation, kiosk page for `QualityEvaluation`.
- **Risk**: impact analysis on `createMaterialEvaluation` and `createBulkSystemOperations` returned LOW (0 upstream impacted).
