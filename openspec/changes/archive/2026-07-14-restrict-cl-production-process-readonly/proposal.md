## Why

The prior change `restructure-process-management` (archived 2026-07-14) granted the Quality department (DEPT_QUALITY) full create/update/delete rights over `ProductionProcess` alongside Production (DEPT_PRODUCTION). In practice this violates ownership: `ProductionProcess` records an actual production run — the batch, the machine, the operator — which only Production can accurately author. Quality's role stops at authoring the `Process` template. Two UI defects surfaced from the same change also need fixing in the same pass, because they touch the same components and users hit them together:

1. The "Loại quy trình" dropdown inside the Process **Create/Edit form** (`ProcessManagement.tsx` lines 841-847) is still hardcoded to the pre-catalog five values (`Sản xuất`, `Kiểm tra chất lượng`, `Đóng gói`, `Vận chuyển`, `Khác`). Users who add a new custom type via `/quality/process-types` still cannot pick it when creating/editing a Process — only the filter dropdown was fixed.
2. The "Cài đặt loại quy trình" entry point currently lives in the `QualityProcess` page header (visible in all four tabs). Users expect it inside the "Danh sách quy trình" tab, next to "Xuất Excel", because it belongs to the same table workflow. The label is also too long — should be just "Cài đặt".

## What Changes

- **BREAKING (permission)**: `DEPT_QUALITY` is removed from the departmentCode whitelist that gates `POST/PATCH/DELETE /api/production-processes`. After this change, only ADMIN and users in `DEPT_PRODUCTION` may mutate ProductionProcess. Quality retains **read** access via `GET`. This reverts decision 2-B from the prior change (which is why we MODIFY the existing spec rather than add a new capability).
- **Frontend permission mirror**: `ProductionProcessManagement.canCreate` no longer includes `DEPT_QUALITY`. The "Tạo mới"/"Sửa"/"Xoá" affordances hide for Quality users; the table remains readable. The "Quy trình sản xuất" tab on `QualityProcess` stays visible so Quality can inspect, but it is effectively read-only.
- **UI fix — form dropdown**: The Create/Edit form select for `loaiQuyTrinh` in `ProcessManagement.tsx` sources its options from `useProcessTypes({kichHoat: true})`, matching the filter dropdown fixed in the prior change. When editing a Process whose `loaiQuyTrinh` value is not present in the active catalog (either legacy — "Đóng gói", "Vận chuyển" — or a deactivated custom type), the current value is preserved by appending an extra option `${value} (không còn kích hoạt)` so save does not silently drop the value.
- **UI fix — settings button placement**: The "Cài đặt loại quy trình" button is removed from the `QualityProcess` page header. A new optional prop `onOpenTypeSettings?: () => void` is added to `ProcessManagement`; when the caller passes it, the component renders a **"Cài đặt"** button (icon Settings + short label) next to "Xuất Excel". `QualityProcess` passes the callback gated on `canManageProcessTypes`; `ProductionDepartment` does not pass it, so the button is naturally hidden there.

Non-changes preserved:
- The "Quy trình sản xuất" tab on QualityProcess is NOT removed.
- Route-level `authorize(ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)` / `authorize(ADMIN)` middleware stays as-is — the department check lives in the controller.
- ProcessType CRUD, the "Only Sản xuất templates instantiate" invariant, and the underlying service business logic are untouched.
- No schema or migration changes. Existing `ProductionProcess` rows authored by Quality users remain in place; ownership stays with the row, only future mutations are blocked from Quality.

## Capabilities

### New Capabilities
<!-- None. All changes update existing capabilities. -->

### Modified Capabilities
- `production-process-permission`: The departmentCode whitelist for mutation shrinks from `{DEPT_PRODUCTION, DEPT_QUALITY}` to `{DEPT_PRODUCTION}`. Scenarios that previously asserted Quality could create/update are inverted to assert rejection. The "Quality Page Exposes A ProductionProcess Tab" requirement is updated so the tab remains but Quality sees a read-only view.
- `process-catalog`: The "Settings Page At `/quality/process-types`" requirement is updated to relocate the entry-point button from the QualityProcess header into the "Danh sách quy trình" tab, next to the export action, with a shortened "Cài đặt" label. The "Frontend Dropdowns Source From The Active Catalog" requirement is extended to cover the Create/Edit form dropdown (previously only the filter dropdown was covered) and to specify the legacy-value preservation behavior.

## Impact

- **Frontend**: three files — `frontend/src/components/ProcessManagement.tsx` (add prop + settings button + form dropdown wiring), `frontend/src/pages/quality/QualityProcess.tsx` (remove header button, pass callback), `frontend/src/components/ProductionProcessManagement.tsx` (tighten `canCreate`).
- **Backend**: one file — `frontend/src/controllers/productionProcessController.ts` — `assertDepartment(req, ['DEPT_QUALITY', 'DEPT_PRODUCTION'])` becomes `assertDepartment(req, ['DEPT_PRODUCTION'])` at all three call sites (create, update, remove).
- **API surface**: no route changes. Response shape unchanged. `POST/PATCH/DELETE /api/production-processes` starts returning 403 for Quality users where it previously returned 200/201.
- **Data**: no schema or migration changes; existing rows unaffected. Quality-authored rows keep their `msnv/tenNhanVien` fields; only future mutation attempts are rejected.
- **Tests**: existing `productionProcessService.test.ts` tests remain valid (service-layer invariants unchanged). No new automated tests required — the department shift is a one-line array change gated by an already-tested helper. Manual smoke test in tasks 6.x confirms Quality is blocked at controller level.
- **User-visible**: Quality users still see the "Quy trình sản xuất" tab but no create/edit affordances render; if they attempt to call the API directly they receive HTTP 403 with the existing department-guard message. The "Cài đặt" button appears in the Danh sách quy trình tab next to Xuất Excel for Quality DEPARTMENT_HEAD and ADMIN; disappears from the page header. The form dropdown now reflects any custom process types added via /quality/process-types.
