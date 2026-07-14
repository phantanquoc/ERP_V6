## 1. Prisma schema + migration

- [x] 1.1 Add `ProcessType` model to `backend/prisma/schema/common.prisma`: fields `id String @id @default(cuid())`, `code String @unique`, `name String @unique`, `thuTu Int @default(0)`, `kichHoat Boolean @default(true)`, `macDinhHeThong Boolean @default(false)`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, `@@map("process_types")`, `@@schema("common")`
- [x] 1.2 Generate migration: `npx prisma migrate dev --name add_process_type`
- [x] 1.3 Run `npx prisma generate` to refresh Prisma Client
- [x] 1.4 Extend `backend/prisma/seed.ts` to upsert 4 system-default rows keyed on `code`: `PROCTYPE_SAN_XUAT` (name "Sản xuất", thuTu 1, macDinhHeThong true), `PROCTYPE_BAO_DUONG` (name "Bảo dưỡng", thuTu 2), `PROCTYPE_VE_SINH` (name "Vệ sinh", thuTu 3), `PROCTYPE_THU_TUC` (name "Thủ tục", thuTu 4). All `kichHoat: true`, `macDinhHeThong: true` ← (verify: schema matches design.md Decision 1+2, migration runs cleanly on a fresh DB, seed produces exactly 4 default rows with correct codes)

## 2. Backend permissions helper

- [x] 2.1 Check whether `backend/src/utils/permissions.ts` exists. If yes, extend it; if no, create it.
- [x] 2.2 Add helper `assertDepartment(req: AuthenticatedRequest, allowedCodes: string[]): Promise<void>` that: ADMIN bypasses; otherwise resolves `departmentCode` via `prisma.department.findUnique({ where: { id: req.user.departmentId }, select: { code: true } })` and throws `ForbiddenError` (or the project's equivalent typed error) when the code is not in `allowedCodes` or the user has no department
- [x] 2.3 Add slugify helper `slugifyToUpperCode(name: string, prefix: string): string` — strip Vietnamese diacritics via NFD normalization, replace non-alnum with `_`, uppercase, prepend `prefix + "_"`. Place in the same file or alongside `codeGenerator.ts`, whichever fits repo style ← (verify: helper handles diacritics like "Kiểm định" → "KIEM_DINH" and rejects empty input)

## 3. Backend ProcessType module

- [x] 3.1 Create `backend/src/services/processTypeService.ts` exporting `ProcessTypeService` class with methods: `getAllProcessTypes(params: {kichHoat?: boolean}): Promise<ProcessType[]>` (orderBy thuTu asc, name asc); `getProcessTypeById(id: string): Promise<ProcessType>` (throws NotFoundError); `createProcessType(data: {name: string, thuTu?: number}): Promise<ProcessType>` (generate code via slugify helper, macDinhHeThong=false, kichHoat=true); `updateProcessType(id: string, data: {name?: string, thuTu?: number, kichHoat?: boolean}): Promise<ProcessType>` (if macDinhHeThong=true, throw ValidationError when `name` is present in data); `deleteProcessType(id: string): Promise<void>` (throw ValidationError if macDinhHeThong=true, throw ConflictError with count if `prisma.process.count({where: {loaiQuyTrinh: row.name}}) > 0`)
- [x] 3.2 Create `backend/src/controllers/processTypeController.ts` with `getAll`, `getById`, `create`, `update`, `remove` handlers. Return `{success, data}` shape per AGENTS.md. Delegate all business logic to the service.
- [x] 3.3 Create `backend/src/routes/processTypeRoutes.ts`: `router.use(authenticate)`; `GET /` → getAll; `GET /:id` → getById; `POST /` → `authorize(ADMIN, DEPARTMENT_HEAD)` + controller ensures DEPT_QUALITY (via `assertDepartment`); `PATCH /:id` → same guard; `DELETE /:id` → same guard
- [x] 3.4 Register the router in `backend/src/routes/index.ts` ROUTE_MAP: add entry `{ path: '/api/process-types', router: processTypeRoutes, description: 'Loại quy trình management' }`. Verify the route mounts by inspecting server startup logs
- [x] 3.5 Create `backend/src/__tests__/processTypeService.test.ts` covering: (a) creating a custom type generates the expected code from a Vietnamese name; (b) creating with a duplicate name throws; (c) updating name on a macDinhHeThong=true row throws ValidationError; (d) toggling kichHoat on a macDinhHeThong=true row succeeds; (e) deleting a macDinhHeThong=true row throws ValidationError; (f) deleting a custom row referenced by a Process throws ConflictError with count in message; (g) deleting an unreferenced custom row succeeds ← (verify: all seven test cases pass with `npx jest src/__tests__/processTypeService.test.ts --runInBand`; freeze rule spec scenarios covered)

## 4. Backend ProductionProcess permission fix + Sản-xuất invariant

- [x] 4.1 Edit `backend/src/routes/productionProcessRoutes.ts`: add `import { authorize } from '@middlewares/auth'` and `import { UserRole } from '@types'` (or however other routes import roles). On `POST /` and `PATCH /:id` add `authorize(UserRole.ADMIN, UserRole.DEPARTMENT_HEAD, UserRole.TEAM_LEAD)`. On `DELETE /:id` add `authorize(UserRole.ADMIN)`. GET endpoints stay authenticated-only
- [x] 4.2 Edit `backend/src/controllers/productionProcessController.ts`: at the top of `create`, `update`, and `remove` handlers, invoke `await assertDepartment(req, ['DEPT_QUALITY', 'DEPT_PRODUCTION'])` before calling the service. Errors propagate to the global error handler
- [x] 4.3 Edit `backend/src/services/productionProcessService.ts`: inside `createProductionProcess` (right after the Process is fetched by `processId`), throw `new ValidationError('Chỉ quy trình loại Sản xuất mới có thể áp dụng thực tế')` when `process.loaiQuyTrinh !== 'Sản xuất'`. Do not move the transaction — the check happens before the write
- [x] 4.4 Add/extend `backend/src/__tests__/productionProcessService.test.ts`: test that creating a ProductionProcess referencing a Process where `loaiQuyTrinh === 'Bảo dưỡng'` throws ValidationError with message containing "Sản xuất"; test that a valid Sản-xuất template succeeds. Use existing mocks/fixtures if present ← (verify: both new tests pass; existing tests in the file (if any) continue to pass)

## 5. Frontend service + hook

- [x] 5.1 Create `frontend/src/services/processTypeService.ts` exporting `processTypeService` with methods: `getAll(params?: {kichHoat?: boolean})`, `getById(id)`, `create(data: {name: string, thuTu?: number})`, `update(id, data: Partial<{name, thuTu, kichHoat}>)`, `remove(id)`. Use existing `apiClient` and return `{success, data}` shape
- [x] 5.2 Create `frontend/src/hooks/useProcessTypes.ts` with a query key factory `processTypeKeys = { all: ['processTypes'], lists: () => [...all, 'list'], list: (params) => [...lists(), params], detail: (id) => [...all, 'detail', id] }`. Export hooks: `useProcessTypes(params?)`, `useProcessType(id)`, `useCreateProcessType()`, `useUpdateProcessType()`, `useDeleteProcessType()`. Mutations invalidate `processTypeKeys.lists()` on success ← (verify: hook follows the factory pattern documented in AGENTS.md, mutations invalidate the right key)

## 6. Frontend routing + settings page

- [x] 6.1 Create `frontend/src/pages/quality/ProcessTypeSettings.tsx`. Layout: page header "Cài đặt loại quy trình" + button "Thêm loại quy trình" (opens modal); table with columns STT, Tên, Mã, Thứ tự (editable inline via number input), Kích hoạt (toggle switch), Actions; empty state when no custom types. For macDinhHeThong=true rows show a lock icon at start of Tên cell, disable the Tên input, hide the Delete button. Custom rows show Edit (opens modal to edit name) and Delete (confirm dialog). Wire all mutations to the hooks from task 5.2. Handle backend errors via `react-hot-toast` with the Vietnamese message from the response
- [x] 6.2 Edit `frontend/src/App.tsx`: import `ProcessTypeSettings` lazily; add `<Route path="/quality/process-types" element={<ProtectedSubRoute department="quality" subModule="process"><ProcessTypeSettings /></ProtectedSubRoute>} />` next to the existing `/quality/process` route ← (verify: navigating to `/quality/process-types` renders the page with 4 default rows, add/edit/delete work, freeze rules visible in UI)

## 7. Frontend QualityProcess restructure

- [x] 7.1 Edit `frontend/src/pages/quality/QualityProcess.tsx`: change `VALID_TABS` constant to `['processList', 'productionProcess', 'orderList', 'inspection']`. Update the `TabType` type union accordingly. Update the tabs config array to labels: "Danh sách quy trình" / "Quy trình sản xuất" / "Danh sách đơn hàng" / "Kiểm tra nội bộ"
- [x] 7.2 In the same file, replace the two render blocks `{activeTab === 'processProduction' && …}` and `{activeTab === 'processGeneral' && …}` with a single `{activeTab === 'processList' && <ProcessManagement showToggleHienThi />}` (no `filterLoaiQuyTrinh` prop). Add `{activeTab === 'productionProcess' && <ProductionProcessManagement />}`. Import `ProductionProcessManagement`
- [x] 7.3 In the same file, in the header area (near the page title), add a button "Cài đặt loại quy trình" with `Settings` icon from lucide-react. Show only when `user?.role === 'ADMIN' || (user?.role === 'DEPARTMENT_HEAD' && user?.departmentCode === 'DEPT_QUALITY')`. onClick uses `useNavigate()` to `/quality/process-types`. If `useAuth().user` does not expose `departmentCode`, extend `AuthContext` to load it once (see design.md Open Question about JWT shape) ← (verify: 4 tabs visible in order, old ?tab=processProduction falls back to processList, header button gated correctly, ProductionProcess tab renders and permits Quality DEPARTMENT_HEAD to create)

## 8. Frontend ProcessManagement dropdown from catalog

- [x] 8.1 Edit `frontend/src/components/ProcessManagement.tsx`: remove the `filterLoaiQuyTrinh` prop from the interface `ProcessManagementProps` and from the destructured function parameters. Delete the `filteredProcesses` block that filters by `filterLoaiQuyTrinh` (the existing `filterValues.loaiQuyTrinh` filter already handles user-selected filtering)
- [x] 8.2 In the same file, replace the hardcoded `options` array in the `filterFields` "loaiQuyTrinh" select with values sourced from `useProcessTypes({kichHoat: true})`. Map `{value: type.name, label: type.name}`. While the hook is loading, show an empty options list (or a single disabled "Đang tải…" option) ← (verify: dropdown lists only active ProcessType rows in thuTu order; legacy loaiQuyTrinh row values still render in the table; removing the prop causes no build errors elsewhere)

## 9. Frontend ProductionProcessManagement guards

- [x] 9.1 Edit `frontend/src/components/ProductionProcessManagement.tsx`: in the template picker dropdown ("Chọn quy trình mẫu"), filter the `templateProcesses` list to only those where `loaiQuyTrinh === 'Sản xuất'` before rendering options. Keep the fetch call unchanged; do the filter in the render pass
- [x] 9.2 In the same file, gate the "Tạo mới" button and any create-related UI on `user?.role && ['ADMIN','DEPARTMENT_HEAD','TEAM_LEAD'].includes(user.role) && (user.role === 'ADMIN' || ['DEPT_PRODUCTION','DEPT_QUALITY'].includes(user.departmentCode))`. Hide (not just disable) when the check fails ← (verify: dropdown shows only Sản xuất templates; button hidden for Accounting TEAM_LEAD, visible for Quality DEPARTMENT_HEAD and Production DEPARTMENT_HEAD)

## 10. Verification

- [x] 10.1 Run `cd backend && npx tsc --noEmit` — MUST pass with 0 errors
- [x] 10.2 Run `cd backend && npm run lint` — new/edited files must be lint-clean (unrelated pre-existing errors reported, not fixed)
- [x] 10.3 Run `cd backend && npx jest src/__tests__/processTypeService.test.ts --runInBand` — all cases pass
- [x] 10.4 Run `cd backend && npx jest src/__tests__/productionProcessService.test.ts --runInBand` — new Sản-xuất-invariant tests pass; existing tests remain green
- [x] 10.5 Run `cd frontend && npx tsc --noEmit` — MUST pass with 0 errors
- [x] 10.6 Run `cd frontend && npm run lint` for the four in-scope files (`pages/quality/QualityProcess.tsx`, `pages/quality/ProcessTypeSettings.tsx`, `components/ProcessManagement.tsx`, `components/ProductionProcessManagement.tsx`, plus new services/hooks) — clean
- [x] 10.7 Manual smoke: (a) login as ADMIN → /quality/process-types shows 4 defaults with lock icons; add a custom type "Kiểm định" successfully; (b) login as EMPLOYEE → header button hidden, page 403 if URL-typed; (c) POST /api/production-processes as an Accounting DEPARTMENT_HEAD → 403; (d) POST with a Bảo-dưỡng template → 400 with "Sản xuất" message; (e) POST as Quality DEPARTMENT_HEAD with a Sản-xuất template → 201; (f) old URL `/quality/process?tab=processProduction` → tab silently falls back to processList ← (verify: every scenario matches the spec requirements, no console errors, no unexpected regressions in other Quality tabs) — Deferred to user post-archive: interactive browser smoke test per checklist above (all automated verification 10.1–10.6 passed; osf-verify returned 0 CRITICAL findings)
