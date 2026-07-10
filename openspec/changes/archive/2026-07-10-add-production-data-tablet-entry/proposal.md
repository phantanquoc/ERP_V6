## Why

Production line workers must record fryer operating parameters and output-product weights per fry-batch, but today those numbers can only be entered through the manager-oriented `Dữ liệu sản xuất` screens, which live inside the sidebar layout and use dense desktop tables. On a tablet standing next to a fryer, the on-screen keyboard covers ~50% of the display and the desktop layout is slow and error-prone to fill in. Workers need a dedicated, full-screen, touch-first entry page tuned for fast numeric input.

## What Changes

- Add a new full-screen, tablet-first data-entry page for production workers, reachable at a dedicated route outside the sidebar layout but still behind authentication.
- Worker flow: pick a fry-batch code (`mã chiên`, from manager-created material evaluations) → pick a fryer (1 of the active `SAN_XUAT` machines) → fill in the form.
- Single screen with two steps/tabs, each with its own independent Save button:
  - **Thông số vận hành** (SystemOperation): input weight + 4 stages × {time, temperature, pressure}.
  - **Thành phẩm đầu ra** (FinishedProduct): input 8 output-product weights (kg); percentages are auto-computed and saved.
- Numeric inputs use the numeric on-screen keyboard (`inputMode="decimal"`), large touch targets (≥44px), and the existing `parseNumberInput` helper.
- Save/navigation controls are placed in the upper half of the screen so the tablet keyboard does not cover them.
- Existing records for the selected (batch + fryer) are loaded into the form for editing; Save issues a PATCH to update them (no create, no bulk).
- Validation only blocks negative numbers and empty fields; totals are not enforced.
- This is a **frontend-only** change. Backend, service layer, database schema, and role permissions are already in place and are not modified.

## Capabilities

### New Capabilities
- `production-data-tablet-entry`: A worker-facing, full-screen tablet page that loads the auto-created SystemOperation and FinishedProduct records for a chosen fry-batch and fryer, lets workers fill in operating parameters and output weights via touch-optimized numeric inputs, auto-computes output percentages, and saves each step independently via PATCH.

### Modified Capabilities
<!-- None — no existing spec's requirements change. Reused services/endpoints are unchanged. -->

## Impact

- **New frontend page**: `frontend/src/pages/production/ProductionDataEntry.tsx` (plus optional child form components).
- **Possible new hook(s)**: TanStack Query wrapper(s) under `frontend/src/hooks/` for loading records by batch + fryer (no direct `apiClient` calls in components).
- **Routing**: `frontend/src/App.tsx` — new lazy-imported route wrapped in `ProtectedRoute` (auth required) but outside `ProtectedLayout` (no sidebar).
- **Reused, unchanged**: `useActiveFryerMachineSystems`, `systemOperationService` (`getSystemOperationsByMaChien`, `updateSystemOperation`), `finishedProductService` (`getAllFinishedProducts`, `updateFinishedProduct`), `materialEvaluationService.getAllMaterialEvaluations`, `parseNumberInput`, `useAuth`.
- **Not touched**: backend, backend services, Prisma schema, migrations, permission middleware; existing manager screens (`SystemOperationManagement`, `FinishedProductManagement`, `MaterialEvaluationManagement`, `QualityEvaluationManagement`); the Đánh giá chất lượng tab and Đánh giá nguyên liệu entry.
