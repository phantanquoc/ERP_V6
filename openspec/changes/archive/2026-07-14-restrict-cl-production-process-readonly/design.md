## Context

The just-archived change `restructure-process-management` (2026-07-14) enforces ProductionProcess mutations via a controller-level department check: `assertDepartment(req, ['DEPT_QUALITY', 'DEPT_PRODUCTION'])`. Route-level middleware provides only the role tier (`authorize(ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)` on POST/PATCH, `authorize(ADMIN)` on DELETE). The frontend `ProductionProcessManagement.canCreate` mirrors the same whitelist. The user has since concluded that granting Quality write access to ProductionProcess was too permissive and wants Quality restricted to read-only.

Two adjacent UI issues from the same change also need to be closed: the Create/Edit form's `loaiQuyTrinh` dropdown still hardcodes the pre-catalog five values (only the filter dropdown was migrated to `useProcessTypes`), and the "Cài đặt loại quy trình" entry point is placed in the QualityProcess page header instead of alongside the "Xuất Excel" action inside the Danh sách quy trình tab.

Constraints:
- No schema, migration, or business-logic changes.
- Route-level authorize middleware stays as-is (the tier gate is correct; only the department scope shrinks).
- The Quy trình sản xuất tab on QualityProcess must remain visible — Quality retains read visibility.
- Existing ProductionProcess rows must not be affected. Rows authored earlier by Quality users stay; only future mutation attempts are rejected.

## Goals / Non-Goals

**Goals:**
- Shrink the ProductionProcess mutation whitelist to `{DEPT_PRODUCTION}` (ADMIN bypass unchanged).
- Fix the Create/Edit form dropdown to source options from the catalog and preserve legacy values on Edit.
- Relocate the "Cài đặt" entry point into the ProcessManagement toolbar next to "Xuất Excel", shorten the label, and gate it via a callback prop so ProductionDepartment naturally does not render it.
- Keep the QualityProcess Quy trình sản xuất tab visible but read-only for Quality users.

**Non-Goals:**
- Removing the productionProcess tab from QualityProcess.
- Migrating existing ProductionProcess rows owned by Quality users.
- Adding a "propose edit" workflow from Quality to Production.
- Changing route-level middleware, ProcessType CRUD, or the "only Sản xuất instantiates" invariant.
- Adding a dedicated read-only mode component; visibility gating alone is sufficient because the "Tạo mới" / row-actions rely on `canCreate` and equivalent flags that will evaluate false for Quality users.

## Decisions

### Decision 1: Enforce at the controller (single-line array edit), not at the route

**Choice:** Change `assertDepartment(req, ['DEPT_QUALITY', 'DEPT_PRODUCTION'])` → `assertDepartment(req, ['DEPT_PRODUCTION'])` at all three call sites (`create`, `update`, `remove`) in `productionProcessController.ts`. Leave `productionProcessRoutes.ts` alone.

**Alternatives considered:**
- Wrap the route-level middleware with a department-aware variant. Overkill for a single feature and would leak a coupling into the middleware layer used by many other routes.
- Change `authorize` roles at the route level. Not correct — a `DEPARTMENT_HEAD` in Production is a legitimate authorizor; the issue is department, not tier.

**Why controller edit:** the existing pattern already delegates department checks to the controller. This is a one-line, three-site edit; changing anything else is unnecessary risk.

### Decision 2: Frontend gates by hiding, not by disabling

**Choice:** In `ProductionProcessManagement`, `canCreate` becomes `role ∈ {ADMIN, DEPARTMENT_HEAD, TEAM_LEAD} AND (role === 'ADMIN' OR departmentCode === 'DEPT_PRODUCTION')`. The "Tạo mới" button and any row-level Edit/Delete actions render inside `{canCreate && …}` so they are absent for Quality users, not merely disabled.

**Alternatives considered:**
- Render disabled buttons with a tooltip. Rejected: leaves Quality thinking a feature might unlock later and is inconsistent with other guarded surfaces in this codebase (e.g., ProcessType settings button is hidden, not disabled).
- Redirect Quality users away from the tab. Rejected: the user wants Quality to inspect ProductionProcess, so the tab needs to be reachable and the table readable.

### Decision 3: "Cài đặt" button is passed as a callback prop, not enabled via boolean flag

**Choice:** Add `onOpenTypeSettings?: () => void` to `ProcessManagementProps`. Inside the component, render the button only when the prop is defined. `QualityProcess` passes `canManageProcessTypes ? () => navigate('/quality/process-types') : undefined`. `ProductionDepartment` never passes the prop, so the button is naturally hidden.

**Alternatives considered:**
- Add a boolean `showTypeSettingsButton?: boolean` and hard-code the navigate URL inside `ProcessManagement`. Rejected: couples the component to a Quality-page route.
- Use React Context to inject the callback. Overkill for a single caller.

**Why callback:** simplest, no coupling to routing, and permission gating stays with the caller (`QualityProcess` already computes `canManageProcessTypes`).

### Decision 4: Form dropdown preserves legacy values via an extra visible option

**Choice:** In the form `<select name="loaiQuyTrinh">`, build the options list dynamically:
1. Start with `activeProcessTypes.map(pt => ({value: pt.name, label: pt.name}))`.
2. If `formData.loaiQuyTrinh` is truthy AND not present in the active list, append one more option `{value: formData.loaiQuyTrinh, label: `${formData.loaiQuyTrinh} (không còn kích hoạt)`}`.
3. Keep the empty placeholder option `-- Chọn loại quy trình --`.
4. While `processTypesLoading` is true, replace the options with a single disabled `Đang tải…` option to prevent submission with an empty value.

**Alternatives considered:**
- Drop the legacy value silently on Edit (users would lose data). Rejected — silent mutation is a data-loss risk.
- Show the legacy value read-only in a separate label above the select and require the user to pick a new active type. Rejected as too invasive for a niche edge case.
- Auto-promote the legacy value into a ProcessType row. Rejected — pollutes the catalog with historical/typo values.

**Why label suffix:** signals to the user that the value is deprecated without forcing a change, keeps save-loop compatible with existing rows, and requires no data migration.

### Decision 5: No test churn beyond what's necessary

**Choice:** The existing `productionProcessService.test.ts` covers the "only Sản xuất" invariant at the service layer, which is unchanged by this change. The department check lives in the controller and is exercised by the already-vetted `assertDepartment` helper (unit-tested indirectly via the process-type tests). Adding a new controller test file for a one-line array shift is disproportionate. Manual smoke coverage in the tasks file (Quality user cannot POST/PATCH/DELETE) suffices.

If future changes add more department policies, we should add a dedicated `productionProcessController.test.ts` — but that is out of scope here.

## Risks / Trade-offs

- **[Risk] Quality users currently have in-progress work on ProductionProcess rows they authored** → Mitigation: existing rows are not touched; only future mutations are blocked. The row-level `msnv/tenNhanVien` fields keep the audit trail intact. If a Quality user needs to complete a specific edit, ADMIN can act on their behalf or the row can be transferred manually. This is acceptable because the wider goal is ownership clarity going forward.
- **[Risk] The tab remains visible on QualityProcess but Quality users see a hollow surface (no create/edit)** → Mitigation: the table is still useful for inspection. Consider a future banner "Chế độ chỉ đọc — mọi thay đổi phải do Phòng Sản xuất thực hiện" if user reports confusion. Not included here to keep scope tight.
- **[Risk] The form dropdown may confuse users editing a legacy Process — the "(không còn kích hoạt)" marker might look like an error** → Mitigation: the wording is Vietnamese and self-explanatory. If confusion arises, a tooltip can be added in a follow-up.
- **[Risk] The `canCreate` flag in `ProductionProcessManagement` gates the "Tạo mới" button but may not gate row-level Edit/Delete actions if those are separately rendered** → Mitigation: implementation must verify that Edit/Delete row actions respect the same flag (or an equivalent `canModify`). This is stated explicitly in `tasks.md` and called out in the Frontend Guards requirement.
- **[Risk] A Quality user could still POST directly via curl and be surprised by a 403** → This is correct behavior (the point of the change). The 403 error message is Vietnamese and clear.

## Migration Plan

**Deployment steps:**
1. Ship backend + frontend together (single deploy).
2. No migration; no seed; no data touch.
3. Smoke test post-deploy: (a) Quality DEPARTMENT_HEAD POSTs `/api/production-processes` → 403 with department message; (b) Production DEPARTMENT_HEAD POSTs → 201; (c) QualityProcess processList tab shows "Cài đặt" button next to "Xuất Excel" for the Quality DEPARTMENT_HEAD; (d) opening the ProductionProcess Create form dropdown shows the active catalog values; (e) editing an existing Process with legacy `loaiQuyTrinh` shows the legacy value with the `(không còn kích hoạt)` suffix.

**Rollback:**
- `git revert` the commits. No DB rollback needed since no schema changed.
- If already-deployed Quality users had scheduled create/update batches that failed after the change, retry as Production or ADMIN.

## Open Questions

- **Row-level Edit/Delete actions in `ProductionProcessManagement`**: does the component render per-row Edit/Delete buttons independently of `canCreate`? Implementation must audit and gate them consistently. If a separate `canModify` variable is introduced, tests in the spec's Frontend Guards requirement should be adjusted accordingly.
- **Do we need a read-only banner on the Quy trình sản xuất tab for Quality users?** Not included in this change. Revisit if the read-only surface becomes confusing.
