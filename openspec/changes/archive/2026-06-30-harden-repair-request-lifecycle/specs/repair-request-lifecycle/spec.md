## ADDED Requirements

### Requirement: RepairRequest status is a typed forward-only enum

`RepairRequest.trangThai` SHALL be a Prisma enum `RepairRequestStatus` defined in the `common` schema with exactly four values: `CHO_XU_LY`, `DANG_SUA_CHUA`, `HOAN_THANH`, `DA_HUY`. The DB column SHALL default to `CHO_XU_LY`. The existing `String` column SHALL be migrated row-by-row by mapping `'Chờ xử lý' → CHO_XU_LY`, `'Đang sửa chữa' → DANG_SUA_CHUA`, `'Hoàn thành' → HOAN_THANH`, and any other value (including NULL or unknown legacy strings) → `CHO_XU_LY` with a row inserted into `repair_request_status_logs` carrying `reason = 'legacy_migration_fallback'` for later review. No data row SHALL be dropped by the migration.

#### Scenario: Known Vietnamese label is mapped

- **WHEN** the migration encounters a row whose old `trangThai = 'Đang sửa chữa'`
- **THEN** the row's new `trangThai` is `DANG_SUA_CHUA` and no `repair_request_status_logs` entry is created

#### Scenario: Unknown legacy label is mapped to CHO_XU_LY with audit row

- **WHEN** the migration encounters a row whose old `trangThai = 'Đang chờ duyệt'` (typo or stale value)
- **THEN** the row's new `trangThai` is `CHO_XU_LY` and exactly one `repair_request_status_logs` row is inserted with `reason = 'legacy_migration_fallback'`, `oldStatus = CHO_XU_LY`, `newStatus = CHO_XU_LY`, `actorId = null`

#### Scenario: Default for newly created RepairRequest

- **WHEN** `POST /api/repair-requests` is called with a valid body that omits `trangThai`
- **THEN** the created row is persisted with `trangThai = CHO_XU_LY`

### Requirement: Client cannot write trangThai through generic endpoints

The backend SHALL ignore any `trangThai` field present in `POST /api/repair-requests` and `PUT /api/repair-requests/:id` request bodies. When such a field is present, the backend SHALL emit a `logger.warn('Ignored client-supplied trangThai on repair-request <id>')` line and proceed with the rest of the body. The HTTP response SHALL stay `200` / `201` (no validation error to client) but the stored `trangThai` SHALL NOT change.

#### Scenario: PUT silently drops client trangThai

- **WHEN** an authenticated user sends `PUT /api/repair-requests/42` with body `{ ghiChu: 'updated', trangThai: 'HOAN_THANH' }` on a request currently at `CHO_XU_LY`
- **THEN** the row's `ghiChu` is updated, `trangThai` remains `CHO_XU_LY`, and a warning is logged

#### Scenario: POST seeds CHO_XU_LY regardless of client input

- **WHEN** an authenticated user sends `POST /api/repair-requests` with body containing `trangThai: 'HOAN_THANH'`
- **THEN** the created row's `trangThai` is `CHO_XU_LY` and a warning is logged

### Requirement: start-repair endpoint advances CHO_XU_LY to DANG_SUA_CHUA

The backend SHALL expose `POST /api/repair-requests/:id/start-repair` returning `{ success, data, message }`. The endpoint SHALL be available to roles `ADMIN`, `DEPARTMENT_HEAD`, `TEAM_LEAD`. The handler SHALL load the parent inside `prisma.$transaction`, call `advanceRepairRequestStatus(current, 'DANG_SUA_CHUA', { bypass: actorRole === 'ADMIN' })`, write the updated `trangThai`, insert a `RepairRequestStatusLog` row in the same transaction (with `actorId`, `actorRole`, `reason = 'start_repair'`), and after commit emit a registry notification `REPAIR_REQUEST_UPDATED` to the existing recipients. The endpoint SHALL throw `ValidationError` if the current status is already terminal (`HOAN_THANH` or `DA_HUY`) and `actorRole !== 'ADMIN'`.

#### Scenario: Happy path from CHO_XU_LY

- **WHEN** a `DEPARTMENT_HEAD` calls `POST /api/repair-requests/7/start-repair` on a request at `CHO_XU_LY`
- **THEN** the response is `{ success: true, data: { id: 7, trangThai: 'DANG_SUA_CHUA', ... } }`, a status log row exists with `oldStatus = CHO_XU_LY`, `newStatus = DANG_SUA_CHUA`, `actorRole = 'DEPARTMENT_HEAD'`, `reason = 'start_repair'`

#### Scenario: Already DANG_SUA_CHUA is a no-op

- **WHEN** a `TEAM_LEAD` calls `start-repair` on a request already at `DANG_SUA_CHUA`
- **THEN** the response stays `200`, `trangThai` remains `DANG_SUA_CHUA`, and no new status log row is created

#### Scenario: Forbidden role rejected

- **WHEN** an `EMPLOYEE` calls `start-repair`
- **THEN** the response is `403` and no transaction runs

#### Scenario: Cannot restart from HOAN_THANH

- **WHEN** a non-admin calls `start-repair` on a request at `HOAN_THANH`
- **THEN** the handler throws `ValidationError` with a Vietnamese message and the row is unchanged

### Requirement: cancel endpoint moves any non-terminal status to DA_HUY

The backend SHALL expose `POST /api/repair-requests/:id/cancel` accepting JSON body `{ reason?: string }`. Roles allowed: `ADMIN`, `DEPARTMENT_HEAD`. Inside `prisma.$transaction` the handler SHALL load the parent, call `advanceRepairRequestStatus(current, 'DA_HUY', { bypass: actorRole === 'ADMIN' })`, persist the new status, insert a `RepairRequestStatusLog` with `reason = body.reason ?? 'user_cancel'`, and after commit emit `REPAIR_REQUEST_UPDATED`. If `current` is already `HOAN_THANH` or `DA_HUY` and `actorRole !== 'ADMIN'`, the handler SHALL throw `ValidationError('Không thể hủy yêu cầu đã ở trạng thái cuối')`.

#### Scenario: Cancel from CHO_XU_LY succeeds

- **WHEN** a `DEPARTMENT_HEAD` calls `cancel` on `CHO_XU_LY` with body `{ reason: 'Thiết bị đã thay mới' }`
- **THEN** the row becomes `DA_HUY`, a log row exists with `oldStatus = CHO_XU_LY`, `newStatus = DA_HUY`, `reason = 'Thiết bị đã thay mới'`

#### Scenario: Cancel from DANG_SUA_CHUA succeeds

- **WHEN** a `DEPARTMENT_HEAD` calls `cancel` on `DANG_SUA_CHUA`
- **THEN** the row becomes `DA_HUY` and a log row is created with the default reason `'user_cancel'`

#### Scenario: Cannot cancel HOAN_THANH

- **WHEN** a `DEPARTMENT_HEAD` calls `cancel` on a request at `HOAN_THANH`
- **THEN** the handler throws `ValidationError` and the row is unchanged

#### Scenario: ADMIN can force-cancel even from terminal

- **WHEN** an `ADMIN` calls `cancel` on a request at `HOAN_THANH`
- **THEN** the row becomes `DA_HUY`, a log row is recorded with `actorRole = 'ADMIN'` and `reason` either the supplied value or `'admin_override'`

### Requirement: Acceptance handover is blocked unless parent is DANG_SUA_CHUA

`acceptanceHandoverService.createAcceptanceHandover` SHALL load the parent `RepairRequest` inside its existing `prisma.$transaction` with `select: { id: true, maYeuCau: true, trangThai: true }`. If `trangThai !== 'DANG_SUA_CHUA'` the service SHALL throw `ValidationError('Yêu cầu sửa chữa phải ở trạng thái "Đang sửa chữa" trước khi nghiệm thu')`. When the actor is `ADMIN` the bypass SHALL still write the handover, but the audit log row created by the auto-complete coverage check (if any) SHALL record `actorRole = 'ADMIN'` and `reason = 'admin_override'`.

#### Scenario: Block creation on CHO_XU_LY parent

- **WHEN** a `TEAM_LEAD` calls `POST /api/acceptance-handovers` with `repairRequestId` of a request at `CHO_XU_LY`
- **THEN** the service throws `ValidationError` and no row is inserted

#### Scenario: Allow creation on DANG_SUA_CHUA parent

- **WHEN** a `TEAM_LEAD` calls `POST /api/acceptance-handovers` with `repairRequestId` of a request at `DANG_SUA_CHUA`
- **THEN** the handover is created and items are inserted

#### Scenario: Block creation on HOAN_THANH parent for non-admin

- **WHEN** a `DEPARTMENT_HEAD` calls `POST /api/acceptance-handovers` with `repairRequestId` of a request at `HOAN_THANH`
- **THEN** the service throws `ValidationError` and no row is inserted

### Requirement: Coverage check auto-completes the parent only when every repair item has been accepted

Inside the same `prisma.$transaction` as the handover insert, `acceptanceHandoverService.createAcceptanceHandover` SHALL count `total = count of RepairRequestItem rows for the parent` and `covered = count of DISTINCT repairRequestItemId values appearing across all AcceptanceHandoverItem rows of the parent (including the just-inserted ones)`. When `covered < total`, the parent status SHALL remain `DANG_SUA_CHUA`. When `covered === total` AND the parent is currently `DANG_SUA_CHUA`, the service SHALL call `advanceRepairRequestStatus('DANG_SUA_CHUA', 'HOAN_THANH')`, update the parent in the same transaction, insert a `RepairRequestStatusLog` row with `reason = 'auto_complete_full_coverage'`, and after commit emit `REPAIR_REQUEST_COMPLETED` (wrapped in try/catch). When `covered === total` but the parent is already `HOAN_THANH` (only reachable via ADMIN bypass), the service SHALL NOT re-emit `REPAIR_REQUEST_COMPLETED`.

#### Scenario: Partial coverage keeps parent open

- **WHEN** a `RepairRequest` has 3 items and a handover is created covering only 2 of them
- **THEN** the parent stays at `DANG_SUA_CHUA` and no `REPAIR_REQUEST_COMPLETED` notification is emitted

#### Scenario: Full coverage on last handover triggers completion

- **WHEN** a `RepairRequest` has 3 items, items 1-2 were covered by a prior handover, and a new handover covers item 3
- **THEN** the parent becomes `HOAN_THANH` in the same transaction, a status log row exists with `reason = 'auto_complete_full_coverage'`, and a `REPAIR_REQUEST_COMPLETED` notification is emitted after commit

#### Scenario: Duplicate coverage on items already covered does not retrigger

- **WHEN** a `RepairRequest` has 3 items, items 1-2-3 were already covered (parent is `HOAN_THANH` after an ADMIN override left it open), and a new handover from ADMIN re-covers item 1
- **THEN** the parent stays at `HOAN_THANH` and no additional `REPAIR_REQUEST_COMPLETED` notification is emitted

### Requirement: Acceptance handover cannot be edited or deleted when parent is sealed

`acceptanceHandoverService.updateAcceptanceHandover` and `acceptanceHandoverService.deleteAcceptanceHandover` SHALL load the parent's `trangThai` inside `prisma.$transaction`. If `trangThai === 'HOAN_THANH'` and `actorRole !== 'ADMIN'`, the service SHALL throw `ValidationError('Không thể chỉnh sửa nghiệm thu của yêu cầu đã hoàn thành')` for update or `ValidationError('Không thể xóa nghiệm thu của yêu cầu đã hoàn thành')` for delete. When `actorRole === 'ADMIN'` the operation SHALL be allowed and a `RepairRequestStatusLog` SHALL be written with `oldStatus = HOAN_THANH`, `newStatus = HOAN_THANH`, `reason = 'admin_override:edit'` (or `'admin_override:delete'`) so the override is auditable.

#### Scenario: Non-admin edit on HOAN_THANH parent rejected

- **WHEN** a `DEPARTMENT_HEAD` calls `PUT /api/acceptance-handovers/abc` whose parent is at `HOAN_THANH`
- **THEN** the service throws `ValidationError` and no row is updated

#### Scenario: Non-admin delete on HOAN_THANH parent rejected

- **WHEN** a `DEPARTMENT_HEAD` calls `DELETE /api/acceptance-handovers/abc` whose parent is at `HOAN_THANH`
- **THEN** the service throws `ValidationError` and no row is deleted

#### Scenario: ADMIN override is audited

- **WHEN** an `ADMIN` calls `DELETE /api/acceptance-handovers/abc` whose parent is at `HOAN_THANH`
- **THEN** the row is deleted, the parent is unchanged, and a `RepairRequestStatusLog` exists with `reason = 'admin_override:delete'` and `actorRole = 'ADMIN'`

### Requirement: RepairRequestStatusLog stores every status transition with actor and reason

The `business` schema SHALL contain the model `RepairRequestStatusLog { id String @id @default(cuid()); repairRequestId Int; repairRequest RepairRequest @relation(..., onDelete: Cascade); oldStatus RepairRequestStatus; newStatus RepairRequestStatus; actorId String?; actorRole String?; reason String?; createdAt DateTime @default(now()); }` with indexes on `repairRequestId` and `createdAt`, mapped to table `repair_request_status_logs`. Every status transition (create-seed, `start-repair`, `cancel`, auto-complete on full coverage, ADMIN override) SHALL write exactly one row inside the same `prisma.$transaction` as the status change. If the log write fails the entire transaction SHALL roll back.

#### Scenario: Log row written on start-repair

- **WHEN** `start-repair` succeeds on a `CHO_XU_LY` request
- **THEN** exactly one row exists in `repair_request_status_logs` with `oldStatus = CHO_XU_LY`, `newStatus = DANG_SUA_CHUA`, `actorId`, `actorRole`, `reason = 'start_repair'`, `createdAt` set

#### Scenario: Log row written on auto-complete

- **WHEN** `createAcceptanceHandover` reaches full coverage and auto-advances the parent to `HOAN_THANH`
- **THEN** exactly one row exists with `oldStatus = DANG_SUA_CHUA`, `newStatus = HOAN_THANH`, `reason = 'auto_complete_full_coverage'`

#### Scenario: Transaction rolls back when log insert fails

- **WHEN** the log insert raises a database error during `cancel`
- **THEN** the `RepairRequest.trangThai` change is rolled back, no notification is emitted, and the caller receives an error

### Requirement: GET /api/repair-requests/:id/status-history exposes the audit trail

The backend SHALL expose `GET /api/repair-requests/:id/status-history` returning `{ success: true, data: RepairRequestStatusLog[] }` ordered by `createdAt ASC`. The endpoint SHALL share the same RBAC as `GET /api/repair-requests/:id`. The actor's display name SHALL be hydrated via `User.employee.tenNhanVien` in the response when `actorId` is set.

#### Scenario: Returns history in chronological order

- **WHEN** a `DEPARTMENT_HEAD` calls `GET /api/repair-requests/7/status-history` on a request that has had create + start-repair + auto-complete
- **THEN** the response contains three rows in order `CHO_XU_LY→CHO_XU_LY` (create seed, if logged), `CHO_XU_LY→DANG_SUA_CHUA`, `DANG_SUA_CHUA→HOAN_THANH`

#### Scenario: Unauthorized role denied

- **WHEN** an unauthenticated request hits `GET /api/repair-requests/7/status-history`
- **THEN** the response is `401`

### Requirement: ACCEPTANCE_HANDOVER_CREATED is emitted through the notification registry

`acceptanceHandoverService.createAcceptanceHandover` SHALL emit the notification through `notificationService.notify(NotificationEvent.ACCEPTANCE_HANDOVER_CREATED, { entityId, metadata: { maNghiemThu, maYeuCauSuaChua, tenHeThongThietBi, nguoiBanGiao, nguoiNhanId }, targetEmployeeIds: nguoiNhanId ? [nguoiNhanId] : [] })` after the transaction commits, wrapped in `try/catch` so failures never bubble. The legacy method `notificationService.createAcceptanceHandoverNotification(...)` SHALL be removed from `acceptanceHandoverController.ts` and from the service surface.

#### Scenario: Notification fires with the registry event

- **WHEN** a handover is created successfully with `nguoiNhanId = 'emp_9'`
- **THEN** `notificationService.notify` is invoked with event `ACCEPTANCE_HANDOVER_CREATED` and `targetEmployeeIds` includes `'emp_9'`

#### Scenario: Notification failure does not roll back the handover

- **WHEN** the notify call throws after the handover transaction commits
- **THEN** the handover row is still present, the API returns `201`, and the error is logged but not surfaced to the caller

### Requirement: REPAIR_REQUEST_COMPLETED is a registered notification event

`NotificationEvent.REPAIR_REQUEST_COMPLETED = 'REPAIR_REQUEST_COMPLETED'` SHALL exist in `backend/src/types/notification.types.ts`. The registry entry SHALL resolve recipients as `union(createdById of the RepairRequest, the same quality/admin pool used by REPAIR_REQUEST_CREATED)`. Title: `"Yêu cầu sửa chữa đã hoàn thành"`. Body: `"Yêu cầu sửa chữa <maYeuCau> đã được nghiệm thu đầy đủ"`. The event SHALL be emitted from `acceptanceHandoverService.createAcceptanceHandover` only after the auto-complete transaction commits, wrapped in `try/catch`.

#### Scenario: Event registered

- **WHEN** the backend boots
- **THEN** `notificationRegistry` contains a handler for `REPAIR_REQUEST_COMPLETED`

#### Scenario: Recipients include creator and quality pool

- **WHEN** auto-complete fires for a `RepairRequest` whose `createdById = 'user_3'`
- **THEN** the resolved recipients include `user_3` plus the same employees that `REPAIR_REQUEST_CREATED` would notify

### Requirement: getAllRepairRequests honors the trangThai filter

`repairRequestService.getAllRepairRequests` SHALL accept the optional argument shape `(page: number, limit: number, filters?: { search?: string; trangThai?: RepairRequestStatus })`. When `filters.trangThai` is provided, the Prisma `where` clause SHALL include `trangThai: filters.trangThai`. The controller SHALL forward `req.query.trangThai` (validated against the enum, otherwise dropped) and `req.query.search` to the service. `exportToExcel` SHALL accept the same filter shape and apply it to the export query.

#### Scenario: Filter is applied

- **WHEN** the controller receives `GET /api/repair-requests?trangThai=DANG_SUA_CHUA&page=1&limit=20`
- **THEN** the SQL `WHERE` clause includes `trangThai = 'DANG_SUA_CHUA'` and the returned list contains only requests in that state

#### Scenario: Invalid enum value silently dropped

- **WHEN** the controller receives `GET /api/repair-requests?trangThai=ABC`
- **THEN** the filter is dropped, all rows are returned (subject to pagination), and a warning is logged

### Requirement: Frontend exposes typed enum and business-event mutations

`frontend/src/services/repairRequestService.ts` SHALL export `export type RepairRequestStatus = 'CHO_XU_LY' | 'DANG_SUA_CHUA' | 'HOAN_THANH' | 'DA_HUY'` and a `STATUS_LABELS: Record<RepairRequestStatus, { label: string; tone: 'gray' | 'blue' | 'green' | 'red' }>` map. The service SHALL expose `startRepair(id: number): Promise<RepairRequestDto>`, `cancel(id: number, reason?: string): Promise<RepairRequestDto>`, and `getStatusHistory(id: number): Promise<RepairRequestStatusLogDto[]>`. The service SHALL NOT include `trangThai` in the body of update requests.

#### Scenario: Update payload omits trangThai

- **WHEN** the FE calls `updateRepairRequest(7, { ghiChu: 'x' })`
- **THEN** the request body sent to the backend does not contain a `trangThai` field

#### Scenario: New mutations exist

- **WHEN** the FE imports `startRepair, cancel, getStatusHistory` from the service
- **THEN** TypeScript resolves all three symbols with the signatures above

### Requirement: Frontend hooks invalidate caches and surface mutations

`frontend/src/hooks/useRepairRequests.ts` SHALL expose `useStartRepair()`, `useCancelRepair()`, and `useRepairStatusHistory(id)`. On success, both mutations SHALL `queryClient.invalidateQueries({ queryKey: repairRequestKeys.lists() })` and `invalidateQueries({ queryKey: repairRequestKeys.detail(id) })`. Errors SHALL surface as toast notifications. The status-history query SHALL be keyed under `repairRequestKeys.detail(id).concat('status-history')` so it co-invalidates with the detail.

#### Scenario: Successful start-repair invalidates list and detail

- **WHEN** `useStartRepair().mutateAsync(7)` resolves
- **THEN** TanStack Query invalidates `repairRequestKeys.lists()` and `repairRequestKeys.detail(7)`

#### Scenario: Failure surfaces toast

- **WHEN** `useCancelRepair().mutateAsync({ id: 7 })` rejects with a `ValidationError`
- **THEN** a toast with the Vietnamese error message is shown and queries are not invalidated

### Requirement: RepairRequestList shows status as a badge and gates row actions on state

`frontend/src/components/RepairRequestList.tsx` SHALL render `trangThai` only as a coloured badge using `STATUS_LABELS`. The free-form `<select>` SHALL be removed from inline edit and from the edit form. The row action menu SHALL show:
- "View" — always
- "Edit" — when `trangThai !== 'HOAN_THANH'`
- "Bắt đầu sửa chữa" — only when `trangThai === 'CHO_XU_LY'`
- "Nghiệm thu" — only when `trangThai === 'DANG_SUA_CHUA'`
- "Hủy yêu cầu" — when `trangThai` is not terminal
- "Delete" — only for `ADMIN`/`DEPARTMENT_HEAD` AND only when `trangThai` is `CHO_XU_LY` or `DA_HUY`

#### Scenario: Badge replaces select for CHO_XU_LY

- **WHEN** a row's `trangThai === 'CHO_XU_LY'`
- **THEN** the cell renders a gray badge with text "Chờ xử lý" and no `<select>` element

#### Scenario: Nghiệm thu hidden when not DANG_SUA_CHUA

- **WHEN** a row's `trangThai === 'CHO_XU_LY'`
- **THEN** the "Nghiệm thu" menu item is not rendered

#### Scenario: Cancel hidden on terminal status

- **WHEN** a row's `trangThai === 'HOAN_THANH'`
- **THEN** the "Hủy yêu cầu" menu item is not rendered

### Requirement: AcceptanceHandoverForm only accepts DANG_SUA_CHUA parents and shows coverage progress

`frontend/src/components/AcceptanceHandoverForm.tsx` SHALL filter the parent-`RepairRequest` selector to only show requests with `trangThai === 'DANG_SUA_CHUA'`. The form SHALL display "X/Y hạng mục đã nghiệm thu" computed from the parent's existing handovers' items. When the user is about to submit a handover that would bring coverage to `total`, a toast hint SHALL be shown: "Yêu cầu sửa chữa sẽ được đánh dấu hoàn thành sau khi lưu".

#### Scenario: Parent dropdown excludes non-active

- **WHEN** the form is opened
- **THEN** the parent dropdown only lists requests whose `trangThai === 'DANG_SUA_CHUA'`

#### Scenario: Coverage progress reflects current state

- **WHEN** the user selects a parent with 5 items, 2 of which are already covered by an earlier handover
- **THEN** the form shows "2/5 hạng mục đã nghiệm thu" before the user picks any items

#### Scenario: Hint shown when last item is about to be covered

- **WHEN** the user selects the remaining 3 items so that `covered + new = total`
- **THEN** a toast or inline hint "Yêu cầu sửa chữa sẽ được đánh dấu hoàn thành sau khi lưu" is shown on submit
