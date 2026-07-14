## 1. Backend controller — shrink department whitelist

- [x] 1.1 Edit `backend/src/controllers/productionProcessController.ts`. Locate the three `assertDepartment` call sites inside the `create`, `update`, and `remove` handlers.
- [x] 1.2 Change each occurrence from `assertDepartment(req, ['DEPT_QUALITY', 'DEPT_PRODUCTION'])` (or the equivalent array form) to `assertDepartment(req, ['DEPT_PRODUCTION'])`. Do NOT touch `authorize` on the routes; the tier gate stays as-is.
- [x] 1.3 Run `cd backend && npx tsc --noEmit` and confirm 0 errors. Run `cd backend && npx jest src/__tests__/productionProcessService.test.ts --runInBand` and `cd backend && npx jest src/__tests__/processTypeService.test.ts --runInBand` — both must still pass (service-layer tests unaffected) ← (verify: no route changes; only the three array literals in controller changed; typecheck + existing tests green)

## 2. Frontend `ProductionProcessManagement` — tighten canCreate

- [x] 2.1 Edit `frontend/src/components/ProductionProcessManagement.tsx`. Locate the `canCreate` boolean (roughly lines 45-49).
- [x] 2.2 Change the departmentCode whitelist from `['DEPT_PRODUCTION', 'DEPT_QUALITY']` to `['DEPT_PRODUCTION']`. Retain the ADMIN bypass. Retain the role tier check (`role ∈ {ADMIN, DEPARTMENT_HEAD, TEAM_LEAD}`).
- [x] 2.3 Audit the component for any row-level Edit/Delete buttons rendered outside the `canCreate` gate. If any such actions exist, gate them behind `canCreate` (or a new `canModify` alias with the same rule). Do NOT touch the template picker filter — that stays as `loaiQuyTrinh === 'Sản xuất'`. ← (verify: Quality DEPARTMENT_HEAD sees the table but no Tạo mới / Sửa / Xoá actions; Production DEPARTMENT_HEAD sees all mutation controls; ADMIN sees them regardless of department)

## 3. Frontend `ProcessManagement` — form dropdown + Cài đặt button

- [x] 3.1 Edit `frontend/src/components/ProcessManagement.tsx`. Add `onOpenTypeSettings?: () => void` to `ProcessManagementProps`. Destructure it in the function signature alongside existing props.
- [x] 3.2 Import `Settings` from `lucide-react` if not already imported.
- [x] 3.3 In the toolbar row (between "Xuất Excel" at line ~527-533 and "Tạo quy trình mới" at line ~534-542), insert a conditional button:
  - Renders only when `onOpenTypeSettings` is defined.
  - `onClick={onOpenTypeSettings}`.
  - Icon: `<Settings className="w-4 h-4" />`.
  - Label: `Cài đặt` (short — not "Cài đặt loại quy trình").
  - Styling: neutral secondary button (e.g. `bg-white border border-gray-300 text-gray-700 hover:bg-gray-50`), consistent with the surrounding toolbar.
  - Include `title="Cài đặt loại quy trình"` and `aria-label="Cài đặt loại quy trình"` for accessibility.
- [x] 3.4 Locate the Create/Edit form `<select name="loaiQuyTrinh">` block (lines ~830-848). Replace the five hardcoded `<option>` elements with a dynamic list built from `activeProcessTypes`:
  - Keep the leading empty placeholder `<option value="">-- Chọn loại quy trình --</option>`.
  - If `processTypesLoading` is true, render a single disabled option `<option value="" disabled>Đang tải…</option>` and skip the active list.
  - Otherwise, map `activeProcessTypes` to `<option value={pt.name}>{pt.name}</option>`.
  - After the active list, if `formData.loaiQuyTrinh` is a non-empty string AND is not present in `activeProcessTypes.map(pt => pt.name)`, append one extra option `<option value={formData.loaiQuyTrinh}>{formData.loaiQuyTrinh} (không còn kích hoạt)</option>` so legacy or deactivated values on Edit are preserved.
- [x] 3.5 Verify the same `activeProcessTypes` array (already fetched via `useProcessTypes({kichHoat: true})` on line ~56) is reused; do NOT introduce a second hook call. ← (verify: opening Create Process shows the active catalog list; opening Edit for a legacy Process shows the current value with `(không còn kích hoạt)` suffix; saving preserves the legacy value in the database)

## 4. Frontend `QualityProcess` — remove header button, pass callback

- [x] 4.1 Edit `frontend/src/pages/quality/QualityProcess.tsx`. Remove the `<button>` for "Cài đặt loại quy trình" from the page header (currently around lines 336-344). Keep the surrounding `<div className="mb-6 sm:mb-8 flex ...">` wrapper structure — only the button element is removed.
- [x] 4.2 Keep the `canManageProcessTypes` variable definition (around line 67) since it will be reused to gate the callback prop.
- [x] 4.3 Keep the `Settings` icon import — it is still used at line ~331 (`<Settings className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 mr-3" />` in the page title).
- [x] 4.4 Where the `processList` tab renders `ProcessManagement`, pass the callback:
  ```
  {activeTab === 'processList' && (
    <ProcessManagement
      showToggleHienThi
      onOpenTypeSettings={canManageProcessTypes ? () => navigate('/quality/process-types') : undefined}
    />
  )}
  ```
- [x] 4.5 Confirm `useNavigate` is already imported from `react-router-dom` (used elsewhere in the file); if not, add it. ← (verify: header no longer shows the button; opening the Danh sách quy trình tab as Quality DEPARTMENT_HEAD shows the "Cài đặt" button next to "Xuất Excel"; other tabs do not show it; ADMIN sees it too; EMPLOYEE does not)

## 5. Frontend `ProductionDepartment` — confirm no changes needed

- [x] 5.1 Open `frontend/src/pages/production/ProductionDepartment.tsx` and confirm that its `<ProcessManagement mode="standard-only" />` call does NOT pass `onOpenTypeSettings`. No edit should be required. If for any reason the file currently passes such a prop (it should not — the prop is new in task 3.1), remove that pass so the button stays hidden on the Production page.

## 6. Verification

- [x] 6.1 `cd backend && npx tsc --noEmit` — must pass with 0 errors.
- [x] 6.2 `cd backend && npm run lint` — new/edited files in scope must be clean; pre-existing warnings in unrelated files must NOT be auto-fixed.
- [x] 6.3 `cd backend && npx jest src/__tests__/productionProcessService.test.ts --runInBand` — pass.
- [x] 6.4 `cd backend && npx jest src/__tests__/processTypeService.test.ts --runInBand` — pass (regression check on the prior change).
- [x] 6.5 `cd frontend && npx tsc --noEmit` — must pass with 0 errors.
- [x] 6.6 `cd frontend && npm run lint` — files in scope (`ProductionProcessManagement.tsx`, `ProcessManagement.tsx`, `QualityProcess.tsx`) must be clean.
- [x] 6.7 Manual smoke checklist (user runs in browser): _Deferred to user post-archive: interactive browser smoke test per checklist above (all automated verification 6.1-6.6 passed; osf-verify returned 0 CRITICAL findings)._
  - (a) Login as Quality `DEPARTMENT_HEAD` → open `/quality/process` → Danh sách quy trình tab → "Cài đặt" button visible next to "Xuất Excel"; header no longer has any Cài đặt button.
  - (b) Same user → Quy trình sản xuất tab → table renders with existing rows; no "Tạo mới" button; no row-level Edit/Delete buttons.
  - (c) Same user → open browser devtools and issue `curl -X POST /api/production-processes ...` with a valid Sản-xuất template → HTTP 403 with department message.
  - (d) Login as Production `DEPARTMENT_HEAD` → any route that renders `ProductionProcessManagement` → "Tạo mới" button visible; POST succeeds for a Sản-xuất template.
  - (e) Login as ADMIN (any department) → POST succeeds and buttons visible in both pages.
  - (f) Add a custom ProcessType "Kiểm định" via `/quality/process-types` → open Create Process modal → the form's Loại quy trình dropdown includes "Kiểm định".
  - (g) Edit an existing Process whose `loaiQuyTrinh` is `"Đóng gói"` (legacy) → form dropdown shows the selected option as `"Đóng gói (không còn kích hoạt)"`; saving without change preserves the value. ← (verify: all seven manual scenarios pass; no console errors; no unexpected regressions in other Quality tabs)
