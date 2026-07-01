# fault-record-lifecycle Specification

## Purpose
TBD - created by archiving change unify-repair-mechanical-modules. Update Purpose after archive.
## Requirements
### Requirement: FaultRecord status is a typed forward-only enum

`FaultRecord.trangThai` SHALL be a Prisma enum `FaultRecordStatus` defined in the `common` schema with exactly three values: `DANG_THEO_DOI`, `DA_XU_LY`, `TAI_PHAT`. The DB column SHALL default to `DANG_THEO_DOI`. The existing `String` column SHALL be migrated row-by-row by mapping `'Đang theo dõi' → DANG_THEO_DOI`, `'Đã xử lý' → DA_XU_LY`, `'Tái phát' → TAI_PHAT`, and any other value (including NULL, `'Đang áp dụng'`, `'Tạm dừng'`, or typos) → `DANG_THEO_DOI` with a row inserted into `fault_record_status_logs` carrying `reason = 'legacy_migration_fallback'` and `source = 'manual'` for later review. No data row SHALL be dropped by the migration.

#### Scenario: Known Vietnamese label is mapped

- **WHEN** the migration encounters a row whose old `trangThai = 'Đã xử lý'`
- **THEN** the row's new `trangThai` is `DA_XU_LY` and no `fault_record_status_logs` entry is created for that row

#### Scenario: Unknown legacy label is mapped to DANG_THEO_DOI with audit row

- **WHEN** the migration encounters a row whose old `trangThai = 'Tạm dừng'`
- **THEN** the row's new `trangThai` is `DANG_THEO_DOI` and exactly one `fault_record_status_logs` row is inserted with `reason = 'legacy_migration_fallback'`, `oldStatus = DANG_THEO_DOI`, `newStatus = DANG_THEO_DOI`, `source = 'manual'`, `actorId = null`

#### Scenario: Default for newly created FaultRecord

- **WHEN** `POST /api/fault-records` is called with a valid body that omits `trangThai`
- **THEN** the created row is persisted with `trangThai = DANG_THEO_DOI` and no status log row is created (creation is not a transition)

### Requirement: Client cannot write trangThai through generic endpoints

The backend SHALL ignore any `trangThai` field present in `POST /api/fault-records` and `PUT /api/fault-records/:id` request bodies. When such a field is present, the backend SHALL emit `logger.warn('Ignored client-supplied trangThai on fault-record <id>')` and proceed with the rest of the body. The HTTP response SHALL stay `200` / `201` (no validation error) but the stored `trangThai` SHALL NOT change.

#### Scenario: PUT silently drops client trangThai

- **WHEN** an authenticated user sends `PUT /api/fault-records/42` with body `{ ghiChu: 'noted', trangThai: 'DA_XU_LY' }` on a record currently at `DANG_THEO_DOI`
- **THEN** the row's `ghiChu` is updated, `trangThai` remains `DANG_THEO_DOI`, and a warning is logged

#### Scenario: POST seeds DANG_THEO_DOI regardless of client input

- **WHEN** an authenticated user sends `POST /api/fault-records` with body containing `trangThai: 'DA_XU_LY'`
- **THEN** the created row's `trangThai` is `DANG_THEO_DOI` and a warning is logged

### Requirement: mark-resolved endpoint advances DANG_THEO_DOI or TAI_PHAT to DA_XU_LY

The backend SHALL expose `POST /api/fault-records/:id/mark-resolved` returning `{ success, data, message }`. The endpoint SHALL be available to roles `ADMIN`, `DEPARTMENT_HEAD`, `TEAM_LEAD` (with `SUBDEPT_TECHNICAL_MECHANICAL` access enforced for non-ADMIN). The handler SHALL run inside `prisma.$transaction`, call `advanceFaultRecordStatus(current, 'DA_XU_LY', { bypass: actorRole === 'ADMIN' })`, write the updated `trangThai`, set `ngayXuLy = now()`, and insert a `FaultRecordStatusLog` row in the same transaction (with `actorId`, `source = 'manual'`, optional `reason` from body). The endpoint SHALL be a no-op returning `200` if the current status is already `DA_XU_LY`.

#### Scenario: Happy path from DANG_THEO_DOI

- **WHEN** a `TEAM_LEAD` in the technical mechanical sub-department calls `POST /api/fault-records/7/mark-resolved` with body `{ reason: 'Đã thay thế' }` on a record at `DANG_THEO_DOI`
- **THEN** the response is `{ success: true, data: { id: 7, trangThai: 'DA_XU_LY', ngayXuLy: '<now>' } }`, a status log row exists with `oldStatus = DANG_THEO_DOI`, `newStatus = DA_XU_LY`, `source = 'manual'`, `reason = 'Đã thay thế'`

#### Scenario: Already DA_XU_LY is a no-op

- **WHEN** an authorized user calls `mark-resolved` on a record already at `DA_XU_LY`
- **THEN** the response stays `200`, `trangThai` and `ngayXuLy` are unchanged, and no new status log row is created

#### Scenario: Forbidden role rejected

- **WHEN** an `EMPLOYEE` in production calls `mark-resolved`
- **THEN** the response is `403` and the record is unchanged

### Requirement: mark-recurred endpoint advances DA_XU_LY to TAI_PHAT

The backend SHALL expose `POST /api/fault-records/:id/mark-recurred` returning `{ success, data, message }`. The endpoint SHALL be available to roles `ADMIN`, `DEPARTMENT_HEAD`. The handler SHALL run inside `prisma.$transaction`, call `advanceFaultRecordStatus(current, 'TAI_PHAT', { bypass: actorRole === 'ADMIN' })`, clear `ngayXuLy = null`, and insert a `FaultRecordStatusLog` row (with `source = 'manual'` or `'recurrence_detected'` when caller passes a body flag `{ auto: true }`). The endpoint SHALL throw `ValidationError` when the current status is `DANG_THEO_DOI` (cannot mark recurred from initial state) unless `actorRole === 'ADMIN'`.

#### Scenario: Happy path from DA_XU_LY

- **WHEN** a `DEPARTMENT_HEAD` calls `POST /api/fault-records/9/mark-recurred` on a record at `DA_XU_LY`
- **THEN** the response is `{ success: true, data: { id: 9, trangThai: 'TAI_PHAT', ngayXuLy: null } }` and a status log row exists with `oldStatus = DA_XU_LY`, `newStatus = TAI_PHAT`, `source = 'manual'`

#### Scenario: From DANG_THEO_DOI rejected for non-ADMIN

- **WHEN** a `DEPARTMENT_HEAD` calls `mark-recurred` on a record at `DANG_THEO_DOI`
- **THEN** the response is `400` with a Vietnamese `ValidationError` message and the record is unchanged

#### Scenario: ADMIN bypass allowed

- **WHEN** an `ADMIN` calls `mark-recurred` on a record at `DANG_THEO_DOI`
- **THEN** the response is `200`, `trangThai = TAI_PHAT`, and a status log row is created

### Requirement: status-history endpoint returns audit trail ordered by createdAt

The backend SHALL expose `GET /api/fault-records/:id/status-history` returning `{ success: true, data: [{ id, oldStatus, newStatus, actorId, actorName, source, reason, createdAt }, ...] }` ordered by `createdAt` descending. `actorName` SHALL be joined from `auth.User.hoTen` when `actorId` is non-null, or `'Hệ thống'` when null (system-triggered).

#### Scenario: Returns chronological log

- **WHEN** an authorized user calls `GET /api/fault-records/9/status-history` on a record that went `DANG_THEO_DOI → DA_XU_LY → TAI_PHAT`
- **THEN** the response is `{ success: true, data: [<TAI_PHAT>, <DA_XU_LY>] }` with two entries newest-first

#### Scenario: Empty history for record that never transitioned

- **WHEN** an authorized user calls the endpoint on a freshly created record still at `DANG_THEO_DOI`
- **THEN** the response is `{ success: true, data: [] }`

### Requirement: Recurrence detection logs event on new record creation

When `faultRecordService.createFaultRecord` finishes successfully and the resulting record has both `machineSystemDetailId` and `loaiLoi` non-null, and at least one other `FaultRecord` exists with the same `(machineSystemDetailId, loaiLoi)` pair and `trangThai = DA_XU_LY` created within the last 90 days, the service SHALL insert a `FaultRecordStatusLog` row on the newly created record with `oldStatus = DANG_THEO_DOI`, `newStatus = DANG_THEO_DOI`, `source = 'recurrence_detected'`, `reason = 'Trùng máy+loại lỗi với FR-<maLoi> đã xử lý ngày <dd/MM/yyyy>'`, `actorId = null`. The service SHALL NOT modify the older record's status. All work SHALL run inside the create transaction; failure to log SHALL be caught and logged but not bubble.

#### Scenario: Detects recurrence within 90 days

- **WHEN** a new `FaultRecord` is created with `machineSystemDetailId = D1` and `loaiLoi = 'Cháy động cơ'` where another record with the same pair transitioned to `DA_XU_LY` 30 days ago
- **THEN** a `fault_record_status_logs` row exists on the new record with `source = 'recurrence_detected'` and the older record is untouched

#### Scenario: Does not detect beyond 90 days

- **WHEN** a new `FaultRecord` is created with the same pair as a `DA_XU_LY` record from 200 days ago
- **THEN** no `recurrence_detected` log row is created

### Requirement: Cascade auto-close from linked RepairRequest completion

When a `RepairRequest` transitions to `HOAN_THANH` via the auto-complete path (full handover coverage), the service SHALL — inside the same transaction — enumerate every `RepairRequestItem` of that request whose `faultRecordId` is non-null. For each linked FaultRecord currently at `DANG_THEO_DOI` or `TAI_PHAT`, the service SHALL advance it to `DA_XU_LY` (via `advanceFaultRecordStatus` with bypass=false — no-op if already `DA_XU_LY`), set `ngayXuLy = now()`, and insert a `FaultRecordStatusLog` row with `oldStatus = <prev>`, `newStatus = DA_XU_LY`, `source = 'auto_from_repair'`, `reason = 'Tự động đóng do YCSC <maYeuCau> hoàn thành'`, `actorId = <actor of the repair transition>`. The cascade SHALL be wrapped in an inner try/catch so that a single FaultRecord failure does not roll back the RepairRequest transaction, but each individual FaultRecord update either fully succeeds (row + log) or is skipped with an error log.

#### Scenario: Single linked FaultRecord auto-closes

- **WHEN** a `RepairRequest` with one `RepairRequestItem` linked to `FaultRecord` F1 (currently `DANG_THEO_DOI`) auto-completes because all handover items are covered
- **THEN** F1's `trangThai` becomes `DA_XU_LY`, `ngayXuLy` is set to the transition time, and a `fault_record_status_logs` row exists with `source = 'auto_from_repair'` and `reason` mentioning the RepairRequest's `maYeuCau`

#### Scenario: FaultRecord already resolved is skipped without error

- **WHEN** a `RepairRequest` auto-completes and one of its linked items points to a FaultRecord already at `DA_XU_LY`
- **THEN** the RepairRequest completion succeeds, no new status log row is created for that FaultRecord, and no error is thrown

#### Scenario: Cascade failure does not roll back parent

- **WHEN** the cascade encounters an unexpected error updating one of three linked FaultRecords
- **THEN** the RepairRequest transaction still commits (`trangThai = HOAN_THANH`), the two healthy FaultRecords are updated, and the failing FaultRecord is left unchanged with an error entry in the server log

### Requirement: FaultRecord typeahead endpoint for form pickers

The backend SHALL expose `GET /api/fault-records/typeahead?trangThai=<comma-list>&search=<q>&limit=<n>` returning `{ success: true, data: [{ id, maLoi, tenLoi, loaiLoi, machineSystemDetailId, tenChiTiet, ngayPhatHien, trangThai }, ...] }`. The endpoint SHALL default `limit = 20` (max 50), default `trangThai = DANG_THEO_DOI,TAI_PHAT` (open faults only) when the parameter is omitted, and match `search` against `maLoi`, `tenLoi`, and `loaiLoi` case-insensitively. Results SHALL be ordered by `ngayPhatHien` descending.

#### Scenario: Returns open faults for typeahead

- **WHEN** an authenticated user calls `GET /api/fault-records/typeahead?search=động%20cơ&limit=10`
- **THEN** the response contains up to 10 records whose `trangThai IN (DANG_THEO_DOI, TAI_PHAT)` and whose `maLoi`, `tenLoi`, or `loaiLoi` matches `động cơ`, sorted newest-first

#### Scenario: Empty search returns most recent open faults

- **WHEN** an authenticated user calls `GET /api/fault-records/typeahead` with no query params
- **THEN** the response returns the 20 most recent records where `trangThai IN (DANG_THEO_DOI, TAI_PHAT)`

