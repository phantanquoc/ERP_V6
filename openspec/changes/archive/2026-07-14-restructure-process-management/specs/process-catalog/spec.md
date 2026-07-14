## ADDED Requirements

### Requirement: Curated Process Type Catalog

The system SHALL maintain a curated catalog of process types stored in a `ProcessType` table (schema `common`, table `process_types`) with fields `id` (cuid), `code` (unique), `name` (unique), `thuTu` (integer, default 0), `kichHoat` (boolean, default true), `macDinhHeThong` (boolean, default false), `createdAt`, `updatedAt`. The catalog SHALL be exposed via `GET /api/process-types` returning items ordered by `thuTu` ascending then `name` ascending. Any authenticated user MAY read the catalog. `Process.loaiQuyTrinh` remains a String column with NO foreign key to ProcessType — the catalog only feeds UI dropdowns.

#### Scenario: List returns ordered, unfiltered
- **WHEN** an authenticated user calls `GET /api/process-types`
- **THEN** the response returns all rows (active + inactive) ordered by `thuTu` ascending then `name` ascending
- **AND** the response shape is `{ success: true, data: ProcessType[] }`

#### Scenario: Active-only filter returns kichHoat=true rows
- **WHEN** an authenticated user calls `GET /api/process-types?kichHoat=true`
- **THEN** only rows with `kichHoat=true` are returned

### Requirement: System-Default Process Types Are Seeded And Immutable

The system SHALL seed four `ProcessType` rows on first migration with `macDinhHeThong=true`: `PROCTYPE_SAN_XUAT` (name "Sản xuất", thuTu 1), `PROCTYPE_BAO_DUONG` (name "Bảo dưỡng", thuTu 2), `PROCTYPE_VE_SINH` (name "Vệ sinh", thuTu 3), `PROCTYPE_THU_TUC` (name "Thủ tục", thuTu 4). For any row where `macDinhHeThong=true`, the system SHALL reject any attempt to update `name` or `code`, and SHALL reject `DELETE`. Only `thuTu` and `kichHoat` MAY be modified on system-default rows.

#### Scenario: Rename a system-default row is rejected
- **WHEN** an authorized user issues `PATCH /api/process-types/:id` with `name` changed for a row where `macDinhHeThong=true`
- **THEN** the request is rejected with HTTP 400 and message contains "loại quy trình hệ thống"
- **AND** the row remains unchanged in the database

#### Scenario: Delete a system-default row is rejected
- **WHEN** an authorized user issues `DELETE /api/process-types/:id` for a row where `macDinhHeThong=true`
- **THEN** the request is rejected with HTTP 400 and message contains "loại quy trình hệ thống"
- **AND** the row remains in the database

#### Scenario: Toggle active on a system-default row succeeds
- **WHEN** an authorized user issues `PATCH /api/process-types/:id` with `{ kichHoat: false }` on a row where `macDinhHeThong=true`
- **THEN** the row is updated and returned with `kichHoat: false`
- **AND** subsequent `GET /api/process-types?kichHoat=true` excludes it

#### Scenario: Update thuTu on a system-default row succeeds
- **WHEN** an authorized user issues `PATCH /api/process-types/:id` with `{ thuTu: 10 }` on a system-default row
- **THEN** the row is updated and returned with `thuTu: 10`

### Requirement: Delete Rejected When Type Is In Use

The system SHALL reject `DELETE /api/process-types/:id` when at least one `Process` row exists with `loaiQuyTrinh` equal to the target row's `name`. The rejection SHALL return HTTP 409 with a message indicating how many Process rows are using the type.

#### Scenario: Delete an in-use custom type is rejected
- **GIVEN** a `ProcessType` row with `name = "Kiểm định"` and `macDinhHeThong=false`
- **AND** at least one `Process` row exists with `loaiQuyTrinh = "Kiểm định"`
- **WHEN** an authorized user issues `DELETE /api/process-types/:id` on that row
- **THEN** the request is rejected with HTTP 409
- **AND** the message includes the count of Process rows using this type

#### Scenario: Delete an unused custom type succeeds
- **GIVEN** a `ProcessType` row with `macDinhHeThong=false`
- **AND** no `Process` row references the type's name
- **WHEN** an authorized user issues `DELETE /api/process-types/:id`
- **THEN** the row is removed and HTTP 200 is returned

### Requirement: Mutation Endpoints Are Gated To ADMIN Or Quality Department Head

The system SHALL restrict `POST /api/process-types`, `PATCH /api/process-types/:id`, and `DELETE /api/process-types/:id` to users where `role === 'ADMIN'` OR (`role === 'DEPARTMENT_HEAD'` AND user's `departmentCode === 'DEPT_QUALITY'`). ADMIN bypasses the department check. All other authenticated users SHALL receive HTTP 403.

#### Scenario: ADMIN can create a process type
- **WHEN** a user with `role === 'ADMIN'` POSTs `{ name: "Kiểm định" }` to `/api/process-types`
- **THEN** a new row is created with generated `code`, `macDinhHeThong=false`, `kichHoat=true`, `thuTu=0`
- **AND** HTTP 201 is returned with the created row

#### Scenario: Quality department head can update a process type
- **WHEN** a user with `role === 'DEPARTMENT_HEAD'` AND department `DEPT_QUALITY` PATCHes a non-system row
- **THEN** the update is applied and HTTP 200 is returned

#### Scenario: Production department head cannot mutate the catalog
- **WHEN** a user with `role === 'DEPARTMENT_HEAD'` AND department `DEPT_PRODUCTION` POSTs to `/api/process-types`
- **THEN** the request is rejected with HTTP 403

#### Scenario: TEAM_LEAD cannot mutate the catalog
- **WHEN** a user with `role === 'TEAM_LEAD'` in `DEPT_QUALITY` POSTs to `/api/process-types`
- **THEN** the request is rejected with HTTP 403

### Requirement: Unique Name And Auto-Generated Code On Create

The system SHALL auto-generate a `code` for new custom types by slugifying the `name` (Vietnamese diacritics stripped, non-alphanumeric replaced by underscore, uppercased, prefixed `PROCTYPE_`). The system SHALL reject creates when `name` collides with an existing row (case-sensitive unique constraint at the database level).

#### Scenario: Slugify Vietnamese diacritics on create
- **WHEN** a user POSTs `{ name: "Kiểm định chất lượng" }`
- **THEN** the created row has `code = "PROCTYPE_KIEM_DINH_CHAT_LUONG"`

#### Scenario: Duplicate name is rejected
- **GIVEN** a row exists with `name = "Sản xuất"` (the system default)
- **WHEN** a user POSTs `{ name: "Sản xuất" }`
- **THEN** the request is rejected with HTTP 409

### Requirement: Frontend Dropdowns Source From The Active Catalog

The system SHALL replace the previous hardcoded 5-value `loaiQuyTrinh` filter dropdown in `ProcessManagement` with an options list sourced from `useProcessTypes({kichHoat: true})`. Legacy `Process` rows whose `loaiQuyTrinh` value does not appear in the active catalog SHALL still be displayed in the table but are shown verbatim (no attempt to remap).

#### Scenario: Filter dropdown lists active types only
- **WHEN** the ProcessManagement component mounts
- **THEN** the "Loại quy trình" filter dropdown lists all `ProcessType` rows with `kichHoat=true` ordered by `thuTu`
- **AND** the previous hardcoded values ("Đóng gói", "Vận chuyển", "Kiểm tra chất lượng", "Sản xuất", "Khác") are not present unless they exist as ProcessType rows

#### Scenario: Legacy loaiQuyTrinh values remain visible in table rows
- **GIVEN** a Process row has `loaiQuyTrinh = "Đóng gói"` and no active ProcessType has that name
- **WHEN** the ProcessManagement table renders
- **THEN** the row still appears with `loaiQuyTrinh` shown as "Đóng gói"

### Requirement: Settings Page At `/quality/process-types`

The system SHALL provide a settings page at `/quality/process-types` that lists all `ProcessType` rows in a table with columns: STT, Tên, Mã, Thứ tự (editable inline), Kích hoạt (toggle), Actions. Rows with `macDinhHeThong=true` SHALL display a lock indicator, have the name input disabled, and hide the Delete button. Rows with `macDinhHeThong=false` SHALL expose Edit (opens name-edit modal) and Delete (confirmation dialog) actions. The page SHALL be reachable via a "Cài đặt loại quy trình" header button in `QualityProcess` that renders only for users authorized to mutate the catalog.

#### Scenario: Header button is hidden for unauthorized users
- **WHEN** a user with `role === 'EMPLOYEE'` opens `/quality/process`
- **THEN** the "Cài đặt loại quy trình" button is not rendered

#### Scenario: Settings page renders lock on system-default rows
- **WHEN** an ADMIN opens `/quality/process-types`
- **THEN** the four system-default rows show a lock icon
- **AND** their name inputs are disabled
- **AND** their Delete buttons are hidden
- **AND** their kichHoat toggle and thuTu input are enabled

#### Scenario: Custom row Delete asks for confirmation
- **WHEN** an authorized user clicks Delete on a custom row
- **THEN** a confirmation dialog appears before the DELETE request is issued
