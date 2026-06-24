## ADDED Requirements

### Requirement: Production users SHALL be able to create fault records

Authenticated users from any department SHALL be able to read the fault records list and create new fault records. Production line operators must be able to log faults they observe without involving the technical team. Edit and delete operations SHALL remain restricted to ADMIN and the technical mechanical sub-department.

#### Scenario: Production user creates a fault record

- **WHEN** an authenticated user from a production department calls `POST /api/fault-records` with a valid payload
- **THEN** the system creates the record, generates `maLoi` in `LI-{year}-{seq}` format, persists it with `nguoiPhatHien` set to the caller's full name, and returns 200 with the new record

#### Scenario: Production user reads the fault records list

- **WHEN** an authenticated user from a production department calls `GET /api/fault-records`
- **THEN** the system returns the paginated list with the same shape technical users receive

#### Scenario: Production user is rejected when editing a fault record

- **WHEN** an authenticated user without ADMIN role and without `SUBDEPT_TECHNICAL_MECHANICAL` access calls `PUT /api/fault-records/:id` or `DELETE /api/fault-records/:id`
- **THEN** the system returns 403 with the existing technical-access error message and does not modify the record

#### Scenario: Technical user retains full CRUD

- **WHEN** an authenticated user with `SUBDEPT_TECHNICAL_MECHANICAL` access calls any CRUD endpoint
- **THEN** the system performs the operation as it does today

#### Scenario: ADMIN bypasses department check

- **WHEN** an authenticated user with role `ADMIN` calls any fault-records endpoint
- **THEN** the system performs the operation regardless of department

### Requirement: Fault template management SHALL remain technical-only

The system SHALL keep all fault template CRUD endpoints gated behind `requireTechnicalAccess(MECHANICAL)`. Production users SHALL NOT be able to create, edit, or delete fault templates.

#### Scenario: Production user is rejected when creating a fault template

- **WHEN** a production user calls `POST /api/fault-templates`
- **THEN** the system returns 403 and does not create the template

### Requirement: System SHALL surface recurrence count when creating a fault from a template

The system SHALL expose an endpoint that, given a `faultTemplateId` and a `machineSystemDetailId`, returns the count of prior `FaultRecord` rows matching both ids together with up to 5 most recent matching records. The frontend create form SHALL call this endpoint as soon as both ids are selected and SHALL display a warning banner when the count is greater than zero.

#### Scenario: Recurrence endpoint returns count and recent records

- **WHEN** an authenticated user calls `GET /api/fault-records/recurrence?faultTemplateId=X&machineSystemDetailId=Y` and prior records exist
- **THEN** the system returns `{ count: N, records: [...] }` where `records` contains up to 5 entries ordered by `ngayPhatHien` descending, each entry exposing `id`, `maLoi`, `ngayPhatHien`, `trangThai`, `mucDo`, and `nguoiPhatHien`

#### Scenario: Recurrence endpoint returns zero when no prior matches

- **WHEN** the same request is made and no prior `FaultRecord` matches both ids
- **THEN** the system returns `{ count: 0, records: [] }`

#### Scenario: Recurrence endpoint requires both ids

- **WHEN** the request is made with only one of `faultTemplateId` or `machineSystemDetailId`
- **THEN** the system returns 400 with a validation error

#### Scenario: Frontend shows warning when count is positive

- **WHEN** the user selects a template and a machine detail in the create modal and the recurrence response has `count > 0`
- **THEN** the modal renders an inline yellow banner reading `Lỗi này đã xảy ra N lần trước đó` followed by a list of up to 5 short links built from `maLoi` and `ngayPhatHien`

#### Scenario: Frontend shows new-fault confirmation when count is zero

- **WHEN** the recurrence response has `count === 0`
- **THEN** the modal renders an inline green confirmation reading `Lỗi mới với thiết bị này`

#### Scenario: Frontend skips recurrence call when ids are incomplete

- **WHEN** either `faultTemplateId` or `machineSystemDetailId` is empty in the create form
- **THEN** the frontend does NOT call the recurrence endpoint and does NOT render any banner

### Requirement: System SHALL provide aggregate fault statistics

The system SHALL expose a read-only stats endpoint that returns totals, severity buckets, status buckets, top 5 machines by fault count, and top 5 recurring template+device combinations. Authenticated users from any department SHALL be able to read this endpoint.

#### Scenario: Stats endpoint returns the full payload shape

- **WHEN** an authenticated user calls `GET /api/fault-records/stats`
- **THEN** the system returns `{ total, bySeverity: { 'Nghiêm trọng', 'Trung bình', 'Nhẹ' }, byStatus: { 'Đang theo dõi', 'Đã xử lý', 'Tái phát' }, topMachines: [...up to 5], topRecurring: [...up to 5] }`

#### Scenario: Top machines list contains hydrated names

- **WHEN** the stats response is built
- **THEN** each entry in `topMachines` exposes `machineSystemId`, `tenHeThong`, `maHeThong`, and `count`, ordered by `count` descending

#### Scenario: Top recurring list contains hydrated names

- **WHEN** the stats response is built
- **THEN** each entry in `topRecurring` exposes `faultTemplateId`, `tenMauLoi`, `machineSystemDetailId`, `tenChiTiet`, and `count`, ordered by `count` descending, and only entries where both ids are non-null are included

#### Scenario: Empty database returns zeroed payload

- **WHEN** the stats endpoint is called and no `FaultRecord` rows exist
- **THEN** the system returns `total: 0`, both bucket maps with all keys present and value 0, and both top lists as empty arrays

### Requirement: Fault records list view SHALL render summary cards and collapsible top-5 sections

The frontend `FaultRecordList.tsx` SHALL render, above the existing list, a row of 4 summary cards (Tổng / Đang theo dõi / Đã xử lý / Tái phát) with severity counts displayed inside or beneath, and SHALL render below the cards two collapsible sections labelled "Máy hay lỗi nhất" and "Lỗi hay tái phát" populated from the stats endpoint. The collapsibles SHALL default to collapsed.

#### Scenario: Summary cards render counts from stats

- **WHEN** the records view loads with stats data available
- **THEN** the page shows 4 cards displaying `total` and the three status counts, each card showing severity sub-counts

#### Scenario: Collapsibles default to collapsed

- **WHEN** the records view first renders
- **THEN** "Máy hay lỗi nhất" and "Lỗi hay tái phát" are collapsed and clicking the header expands them

#### Scenario: Top-5 sections render hydrated entries

- **WHEN** "Máy hay lỗi nhất" or "Lỗi hay tái phát" is expanded
- **THEN** up to 5 rows render with the hydrated names and counts from the stats response

### Requirement: Fault records list view SHALL split write capability into create vs mutate

The frontend SHALL replace the single `canWrite` flag in `FaultRecordList.tsx` with two flags: `canCreate` (true for any authenticated user) and `canMutate` (true only for ADMIN or technical-mechanical access). The "Thêm mới" action SHALL be gated on `canCreate`. Edit, delete, and the template management tab SHALL be gated on `canMutate`.

#### Scenario: Production user sees create button but not edit or delete

- **WHEN** a production user opens the records view
- **THEN** the "Thêm mới" button is visible while edit and delete actions are hidden, and the template tab is not accessible

#### Scenario: Technical user sees all actions

- **WHEN** a technical mechanical user or ADMIN opens the records view
- **THEN** the "Thêm mới" button, edit, delete, and the template tab are all visible
