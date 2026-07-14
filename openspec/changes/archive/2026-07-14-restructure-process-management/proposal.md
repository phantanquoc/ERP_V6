## Why

The "quy trình" (process) module currently mixes two responsibilities that different departments should own: Quality (Chất lượng) drafts the process templates, while Production (Sản xuất) applies them to real production runs with cost data. Today the process type field (`loaiQuyTrinh`) is a free-form string with a hardcoded 5-value dropdown, there is no way for Quality to curate the list, and any authenticated user can create/edit/delete `ProductionProcess` records because `productionProcessRoutes.ts` lacks `authorize` middleware. The Quality page splits templates into two static filter tabs (production vs non-production) but has no entry point for the actual production instance workflow. This change restructures the module so ownership is explicit, adds a curated catalog of process types, enforces that only "Sản xuất" templates can be instantiated as ProductionProcess, and closes the ProductionProcess authorization gap.

## What Changes

- Add `ProcessType` model in `common` schema — a curated, orderable, activatable catalog decoupled from `Process.loaiQuyTrinh` (still a String, no FK). Seed four system-default types: Sản xuất, Bảo dưỡng, Vệ sinh, Thủ tục — flagged `macDinhHeThong=true` and immutable (rename+delete blocked, only order+active toggle allowed).
- Add `ProcessType` CRUD endpoints under `/api/process-types`: GET open to any authenticated user; POST/PATCH/DELETE gated to ADMIN or Quality department heads (DEPARTMENT_HEAD with departmentCode `DEPT_QUALITY`). Delete rejected when in-use by any Process (conflict) or when row is system default.
- **BREAKING (frontend routing)**: `QualityProcess` page tabs restructured from `[processProduction, processGeneral, orderList, inspection]` to `[processList, productionProcess, orderList, inspection]`. `processList` renders `ProcessManagement` without the `filterLoaiQuyTrinh` prop (dropdown filter now sources ProcessType.list()). `productionProcess` renders `ProductionProcessManagement`. URL query params for the old tab names become invalid.
- Add "Cài đặt loại quy trình" header button in `QualityProcess`, visible only to ADMIN or Quality DEPARTMENT_HEAD, routing to a new `/quality/process-types` settings page.
- Enforce "only Sản xuất templates instantiate ProductionProcess": backend `productionProcessService.createProductionProcess` validates `process.loaiQuyTrinh === 'Sản xuất'` and rejects otherwise; frontend template dropdown pre-filters to `'Sản xuất'`.
- Fix ProductionProcess permission bug: POST/PATCH require `authorize(ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)`, DELETE requires `authorize(ADMIN)`; controller also enforces user's departmentCode ∈ {`DEPT_PRODUCTION`, `DEPT_QUALITY`} (ADMIN bypass). GET remains authenticated-only.
- Change `ProcessManagement` filter dropdown from hardcoded 5 options to values sourced from `useProcessTypes({kichHoat: true})`. Drop the `filterLoaiQuyTrinh` prop entirely.
- Change `ProductionProcessManagement` template picker to filter Process list by `loaiQuyTrinh === 'Sản xuất'`; hide "Tạo mới" button for users outside the allowed departments.

Non-changes explicitly preserved:
- Cost input on `Process` (Quality page) remains as today — no UI removal or field deprecation.
- `ProductionProcess` is not renamed. `ProcessFlowchartCost` table is untouched.
- Legacy `loaiQuyTrinh` values in existing Process rows (e.g., "Đóng gói", "Vận chuyển") stay as-is; they simply won't match any active ProcessType and display verbatim.
- No Sidebar changes; the settings page is entered via a header button.

## Capabilities

### New Capabilities
- `process-catalog`: Curated CRUD catalog of process types (Sản xuất / Bảo dưỡng / Vệ sinh / Thủ tục + user-defined), with system-default freeze rules, delete-in-use protection, and active/ordering controls. Feeds the process-type dropdown across the module.
- `production-process-permission`: RBAC + ABAC contract for ProductionProcess mutations — role tier gate plus departmentCode whitelist ({DEPT_PRODUCTION, DEPT_QUALITY}), ADMIN bypass, and the "only Sản xuất templates instantiate" invariant.

### Modified Capabilities
<!-- No existing specs cover the process/production-process modules — all behavior for this change is captured by the two new capabilities above. -->

## Impact

- **Database**: New `process_types` table (`common` schema) plus a data migration seeding four system-default rows. Existing `processes` and `production_processes` tables are unchanged.
- **Backend**: New service/controller/route trio for ProcessType; edits to `productionProcessRoutes.ts` (add authorize), `productionProcessController.ts` (departmentCode guard), `productionProcessService.ts` (Sản xuất-only invariant); registration in `routes/index.ts` ROUTE_MAP; new departmentCode helper in `utils/permissions.ts` (or extended).
- **Frontend**: New `services/processTypeService.ts`, `hooks/useProcessTypes.ts`, `pages/quality/ProcessTypeSettings.tsx`; new route `/quality/process-types` in `App.tsx`; edits to `pages/quality/QualityProcess.tsx` (tab restructure, header settings button), `components/ProcessManagement.tsx` (dropdown from hook, prop removal), `components/ProductionProcessManagement.tsx` (template filter, button guard).
- **API surface**: New endpoints `GET/POST/PATCH/DELETE /api/process-types`. `POST/PATCH/DELETE /api/production-processes` become restricted (previous unauthenticated-role behavior was a defect).
- **Tests**: New `backend/src/__tests__/processTypeService.test.ts` (freeze rules, delete-in-use, unique name); extend or create `backend/src/__tests__/productionProcessService.test.ts` (reject non-Sản xuất create).
- **Callers/consumers**: `ProcessManagement.filterLoaiQuyTrinh` prop is removed — call sites in `QualityProcess.tsx` and `ProductionDepartment.tsx` reviewed; ProductionDepartment already uses `mode="standard-only"` without the prop so no change there.
- **URL/deep-link**: Old tab-query values `?tab=processProduction` and `?tab=processGeneral` no longer resolve; users landing on those URLs fall back to the default `processList` tab.
