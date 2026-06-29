## ADDED Requirements

### Requirement: QuotationRequest carries a status field

The `business.QuotationRequest` model SHALL include a `status` column typed by enum `QuotationRequestStatus` with values `CHO_XU_LY`, `DANG_BAO_GIA`, `DA_BAO_GIA`, `HUY`. New rows SHALL default to `CHO_XU_LY`. The status SHALL appear on every list and detail response.

#### Scenario: Default status on create

- **WHEN** a user creates a quotation request without specifying `status`
- **THEN** the persisted row has `status = 'CHO_XU_LY'` and the response payload includes that value

#### Scenario: Status surfaced in list payload

- **WHEN** a client calls `GET /api/quotation-requests`
- **THEN** every row in `data` includes the `status` field

### Requirement: QuotationRequest status auto-advances with quotation lifecycle

The system SHALL automatically advance a quotation request's status as the user moves through the conversion flow. The transitions SHALL be applied through `advanceQuotationRequestStatus` so they remain forward-only.

#### Scenario: Open quotation popup from a request

- **WHEN** a user opens the "Tạo báo giá" popup for a quotation request whose current status is `CHO_XU_LY`
- **THEN** the system advances the request to `DANG_BAO_GIA`

#### Scenario: Quotation created from a request

- **WHEN** a `Quotation` is successfully persisted with `quotationRequestId` set
- **THEN** the linked request advances to `DA_BAO_GIA`

#### Scenario: User cancels a request

- **WHEN** a user with an allowed role cancels a quotation request whose status is not terminal
- **THEN** the request status is set to `HUY`

#### Scenario: Illegal status jump rejected

- **WHEN** a service receives a status update from `CHO_XU_LY` to `DA_BAO_GIA`
- **THEN** `advanceQuotationRequestStatus` throws `ValidationError('Không thể chuyển trạng thái YCBG từ CHO_XU_LY sang DA_BAO_GIA')` and the row is unchanged

#### Scenario: ADMIN bypass

- **WHEN** an `ADMIN` updates a quotation request status with `bypass: true`
- **THEN** the helper returns the requested status without forward-only enforcement

### Requirement: QuotationRequest list supports status filtering

`GET /api/quotation-requests` SHALL accept an optional `status` query parameter and SHALL return only rows whose status matches when provided. The endpoint SHALL preserve the existing pagination, search, and date filter behavior.

#### Scenario: Filter by single status

- **WHEN** a client calls `GET /api/quotation-requests?status=CHO_XU_LY&page=1&limit=20`
- **THEN** the response contains only requests with `status = CHO_XU_LY` and the pagination metadata reflects that filter

#### Scenario: Unknown status value rejected

- **WHEN** a client calls `GET /api/quotation-requests?status=INVALID`
- **THEN** the system returns HTTP 400 with a Vietnamese validation message

### Requirement: QuotationRequest status badge on frontend list

The QuotationRequest management screen SHALL render a status badge per row with the following colors and Vietnamese labels: `CHO_XU_LY` gray "Chờ xử lý", `DANG_BAO_GIA` blue "Đang báo giá", `DA_BAO_GIA` green "Đã báo giá", `HUY` red "Huỷ". The screen SHALL expose a filter dropdown that submits the `status` query parameter to the backend.

#### Scenario: Badge rendering

- **WHEN** the list shows a row with status `DANG_BAO_GIA`
- **THEN** the badge uses Tailwind class `bg-blue-100 text-blue-800` with label "Đang báo giá"

#### Scenario: Filter dropdown wired to server

- **WHEN** the user picks "Đã báo giá" in the filter dropdown
- **THEN** the list re-fetches with `status=DA_BAO_GIA` and resets `page` to 1

### Requirement: QuotationRequest CRUD records audit entries

Create, update, delete, and status-change operations on `QuotationRequest` SHALL invoke `recordAudit` via `@utils/auditLog` after the primary write commits, with `entityType = 'QuotationRequest'` and the matching action. Audit failure SHALL NOT bubble.

#### Scenario: Update produces UPDATE audit entry

- **WHEN** a user updates a quotation request's `tenKhachHang`
- **THEN** an audit row is recorded with `action = 'UPDATE'`, `entityType = 'QuotationRequest'`, and full before/after snapshots

#### Scenario: Cancel produces STATUS_CHANGE audit entry

- **WHEN** a user cancels a quotation request
- **THEN** an audit row is recorded with `action = 'STATUS_CHANGE'`, `before = { status: 'CHO_XU_LY' }`, `after = { status: 'HUY' }`
