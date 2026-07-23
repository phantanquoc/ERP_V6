## 1. Backend: auto-generate child rows on batch creation

- [x] 1.1 In `backend/src/services/materialEvaluationService.ts`, import `SystemOperationService` (or its `createBulkSystemOperations`) respecting `@services/*` path alias
- [x] 1.2 In the legacy `createMaterialEvaluation` path, after the `MaterialEvaluation` is created, call `createBulkSystemOperations(maChien, thoiGianChien)` wrapped in `try/catch` — log on failure, never rethrow
- [x] 1.3 In `createWithWarehouseLink`, after the `$transaction` returns the created evaluation, call `createBulkSystemOperations(maChien, thoiGianChien)` OUTSIDE the transaction, wrapped in `try/catch` — log on failure, never rethrow
- [x] 1.4 Ensure `thoiGianChien` passed to the seeder matches the stored value (ISO/Date consistency with how `createBulkSystemOperations` queries `MaterialEvaluation` by `maChien` + `thoiGianChien`)
- [x] 1.5 Confirm no duplicate seeding: rely on the existing `maChien`-exists guard; the `try/catch` absorbs the guard error harmlessly ← (verify: both create paths seed child rows for each active production machine; a seeding failure still returns a successful MaterialEvaluation; no duplicate SystemOperation rows)

## 2. Frontend: operation-parameters kiosk page

- [x] 2.1 Create `frontend/src/pages/production/ProductionSystemOperationEntry.tsx` with the kiosk session shell (call `markTab()` on mount; render "not activated" screen when no kiosk session) mirroring `ProductionDataEntry.tsx`
- [x] 2.2 Add shift gate using `ShiftSelectionScreen` with `onBack` navigating to `/production/nhap-lieu-hub` (consistent with the other entry pages)
- [x] 2.3 Add operator gate using `OperatorSelectionScreen` with `onBack` returning to shift selection
- [x] 2.4 Add fry-batch selection filtered by shift + production date via `useFryBatchCodes` (reuse from `useProductionDataEntry.ts`)
- [x] 2.5 Add machine selection for the chosen batch (active production machines)
- [x] 2.6 Build the parameter form: stage 1–4 `NhietDo`/`ApSuat`/`ThoiGian`, `khoiLuongDauVao`, `tongThoiGianSay`, with large tablet-friendly inputs
- [x] 2.7 Resolve the existing `SystemOperation` row id via `useSystemOperationByBatchAndFryer` and save through `useUpdateSystemOperationEntry` (PATCH by id); stamp `nguoiThucHien` = selected operator ← (verify: save PATCHes the pre-created row for (maChien, machine), does not create a duplicate, and stamps the operator name; route sits under /production/nhap-lieu prefix so isKioskTab works)

## 3. Frontend: routing, hub, config, label

- [x] 3.1 In `frontend/src/App.tsx`, register the kiosk route `/production/nhap-lieu-van-hanh` rendering the new page (public, outside `ProtectedLayout`, matching the other kiosk routes)
- [x] 3.2 In `frontend/src/App.tsx`, add an admin preview route following the `/production/tablet-hub-preview` pattern (wrapped in `AdminRoute`)
- [x] 3.3 In `frontend/src/pages/production/DataEntryHub.tsx`, replace the placeholder third button with "Thông số vận hành" navigating to `/production/nhap-lieu-van-hanh`
- [x] 3.4 In `frontend/src/pages/production/DataEntryPositionConfig.tsx`, add the `SYSTEM_OPERATION` entry type alongside `PRODUCTION_OUTPUT` and `MATERIAL_EVALUATION`
- [x] 3.5 In `frontend/src/pages/production/ProductionMaterialEvaluationEntry.tsx`, rename the display label "Đánh giá nguyên liệu" → "Đánh giá ngâm" (text only; do not touch fields, wizard steps, or save logic) ← (verify: hub button routes to the new page, config lists SYSTEM_OPERATION, label reads "Đánh giá ngâm" with unchanged behavior)

## 4. Verification

- [x] 4.1 Run `cd backend && npx tsc --noEmit` — must pass (PASS)
- [ ] 4.2 Run `cd backend && npm test` — 10 pre-existing failures UNRELATED to this change (employeeService/departmentService/machineIntegration/faultRecordService/technicalBatchB/routeAuth — mock/teardown issues). Not a regression from this change.
- [x] 4.3 Run `cd frontend && npx tsc --noEmit` — must pass (PASS)
- [x] 4.4 Run `cd frontend && npm run lint` — must pass (0 errors)
- [x] 4.5 Run `gitnexus_detect_changes` and confirm only expected symbols/files are affected — changed files match the 6 in-scope files from the proposal (backend materialEvaluationService.ts; frontend App.tsx, DataEntryHub.tsx, DataEntryPositionConfig.tsx, ProductionMaterialEvaluationEntry.tsx, new ProductionSystemOperationEntry.tsx). No desktop production tabs or QualityEvaluation kiosk page touched.
