## Context

The `Dữ liệu sản xuất` manager screens (`SystemOperationManagement`, `FinishedProductManagement`, etc.) render dense desktop tables inside the sidebar `ProtectedLayout`. When a manager creates a material evaluation (one `mã chiên`), the backend `createBulkSystemOperations` auto-creates empty `SystemOperation`, `FinishedProduct`, and `QualityEvaluation` records for each active `SAN_XUAT` fryer (HT-CCK-01..08). Workers must fill those records in near a fryer on a tablet, where the on-screen keyboard covers ~50% of the screen. The backend, frontend service layer, and role permissions (EMPLOYEE already allowed on the PATCH endpoints) are already in place — only a new worker-facing frontend page is needed.

## Goals / Non-Goals

**Goals:**
- A dedicated full-screen, tablet-first page for workers to fill fryer operating parameters and output weights.
- Fast numeric input: numeric keyboard, large touch targets, save controls unobscured by the keyboard.
- Two independent save steps matching the two real-world entry moments (during frying, after frying).
- Auto-compute output percentages from kg weights so workers type half as many fields.
- Reuse existing services/hooks; no backend or schema change.

**Non-Goals:**
- No changes to backend, backend services, Prisma schema, migrations, or permission middleware.
- No changes to the existing manager screens.
- No Đánh giá chất lượng entry (auto-generated later) and no Đánh giá nguyên liệu entry (manager-created).
- Workers cannot create new fry-batch codes.

## Decisions

**1. Route placement: authenticated but outside `ProtectedLayout`.**
Wrap the new route in `ProtectedRoute` (needs token + `useAuth` user for `nguoiThucHien`) but NOT `ProtectedLayout`, so no sidebar renders — giving full-screen space. Proposed path `/production/nhap-lieu`, lazy-imported like other pages. Alternative considered: reuse `ProtectedLayout` with a "hide sidebar" flag — rejected because it complicates the shared layout and wastes tablet space.

**2. Data flow: load-then-PATCH, never create/bulk.**
For the selected (mã chiên + machineSystemId), load the existing SystemOperation via `getSystemOperationsByMaChien(maChien)` (filter by machineSystemId) and the existing FinishedProduct via `getAllFinishedProducts(page, limit, machineSystemId)` (filter by maChien). Pre-fill the form, and Save = PATCH that record (`updateSystemOperation` / `updateFinishedProduct`). This matches the auto-created-record model and avoids duplicate rows. Alternative (create-on-save) rejected — records already exist and a unique `[maChien, machineSystemId]` constraint exists on FinishedProduct.

**3. Percentages computed on the client, persisted on save.**
Worker types 8 kg weights; the page computes `tongKhoiLuong` and each `tiLe = round((weight/total)*100, 2)` (mirroring `calculatePercentage` in `FinishedProductManagement.tsx`) and sends both weights and percentages in the PATCH. Copy the small formula rather than refactoring the manager screen to export it (keeps manager screen untouched).

**4. Data access via new TanStack Query hook(s), not direct `apiClient`.**
Per project convention, components don't call `apiClient` directly. Add hook(s) under `frontend/src/hooks/` wrapping the existing services with a query-key factory. Reuse `useActiveFryerMachineSystems` for the fryer list and `materialEvaluationService.getAllMaterialEvaluations` (via a hook) for batch codes.

**5. Two independent steps as tabs with separate Save buttons.**
Each tab persists only its own record, so a worker can save operating parameters during frying and return later to save outputs. Save/tab controls live in a sticky top header so the keyboard never covers them.

**6. Numeric input primitive.**
All numeric fields use `inputMode="decimal"`, min touch target 44px, and `parseNumberInput` for onChange (already handles leading-zero issues). `ThoiGian` fields are integers (minutes) — still `inputMode="decimal"` but parsed as int on save.

## Risks / Trade-offs

- [Missing auto-created record for a batch+fryer] → If no record exists (e.g., fryer added after batch creation), the PATCH target is absent. Mitigation: show a clear Vietnamese empty-state message telling the worker the batch has no record for this fryer, rather than silently creating one.
- [Percentage drift vs. manager screen] → Copying the formula risks divergence if the manager logic changes. Mitigation: keep the formula identical and note the source; acceptable because rounding rule is stable.
- [Route outside layout loses shared providers] → Ensure the route still sits under whatever context providers the app root supplies (auth, query client) — it does, since providers wrap the whole `Routes` tree, only the sidebar `Layout` is skipped.
- [Tablet keyboard still covers content] → Sticky top controls mitigate for actions, but long forms may need internal scroll; keep each step compact and scrollable within the viewport.

## Migration Plan

Pure additive frontend change: new page + route + hook(s). No data migration, no rollback concerns beyond removing the new route/files. Deploy with the standard frontend build.

## Open Questions

None — all UX and data decisions were locked during exploration.
