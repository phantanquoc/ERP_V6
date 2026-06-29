## ADDED Requirements

### Requirement: Server-driven pagination for quotation list

The `GET /api/quotations` endpoint SHALL return paginated results driven entirely by server-side `page`, `limit`, `search`, `customerType`, `status`, `dateFrom`, and `dateTo` query parameters. `limit` MUST be one of `10`, `20`, `50`, `100` with default `20`. The response envelope MUST be `{ success: true, data: Quotation[], pagination: { page, limit, total, totalPages } }`.

#### Scenario: Filter by status

- **WHEN** the client calls `GET /api/quotations?status=DANG_CHO_PHAN_HOI`
- **THEN** the server returns only quotations currently in `DANG_CHO_PHAN_HOI` and paginates them server-side

#### Scenario: Filter by date range

- **WHEN** the client calls `GET /api/quotations?dateFrom=2026-06-01&dateTo=2026-06-30`
- **THEN** the server returns only quotations whose creation date falls within June 2026

### Requirement: Forward-only quotation status transitions

`PATCH /api/quotations/:id` SHALL reject any change to the `tinhTrang` field that is not the immediate successor in `QUOTATION_STATUS_ORDER`, except for moves into a terminal cancel status (`KHONG_DAT_HANG`, `EXPIRED`, `REJECTED`) which are allowed from any non-terminal state. Once a quotation is in a terminal status (including `DA_DAT_HANG`), `tinhTrang` MUST NOT change. Callers with role `ADMIN` MAY bypass these rules via an explicit override.

#### Scenario: Legal forward transition

- **WHEN** a `DEPARTMENT_HEAD` updates a quotation from `DRAFT` to `DANG_CHO_PHAN_HOI`
- **THEN** the update succeeds and the new status is persisted

#### Scenario: Skipping a step is rejected

- **WHEN** a non-admin updates a quotation from `DRAFT` directly to `DA_DAT_HANG`
- **THEN** the server responds with HTTP 400 and a `ValidationError` describing the illegal transition

#### Scenario: Backward transition is rejected

- **WHEN** a non-admin updates a quotation from `DA_DAT_HANG` to `DRAFT`
- **THEN** the server responds with HTTP 400 and a `ValidationError`

#### Scenario: Cancel from any non-terminal state

- **WHEN** a non-admin updates a quotation from `DANG_CHO_PHAN_HOI` to `KHONG_DAT_HANG`
- **THEN** the update succeeds because `KHONG_DAT_HANG` is a permitted terminal cancel target

#### Scenario: Admin bypass

- **WHEN** an `ADMIN` updates a quotation in any direction
- **THEN** the update succeeds regardless of the ordered chain

### Requirement: Role-gated delete and edit for quotations

`DELETE /api/quotations/:id` SHALL be permitted only for users with role `ADMIN` or `DEPARTMENT_HEAD`. The Quotation Management UI SHALL hide the Delete button from users without those roles and SHALL hide the Edit button from users not in `ADMIN`, `DEPARTMENT_HEAD`, or `TEAM_LEAD`.

#### Scenario: Employee attempts delete via API

- **WHEN** an `EMPLOYEE` calls `DELETE /api/quotations/:id`
- **THEN** the server responds with HTTP 403 and the quotation is not deleted

#### Scenario: Employee sees no delete button

- **WHEN** an `EMPLOYEE` opens the Quotation Management page
- **THEN** rows do not render a Delete button

#### Scenario: Department head can delete and edit

- **WHEN** a `DEPARTMENT_HEAD` opens the Quotation Management page
- **THEN** rows render both Edit and Delete buttons and the API permits both actions

### Requirement: Toast and confirm dialog conventions

The Quotation Management UI SHALL surface success and error feedback via the project's toast utility and SHALL confirm destructive actions through the shared `ConfirmDialog` component. The UI SHALL NOT call `window.alert` or `window.confirm` for these flows.

#### Scenario: Successful delete shows toast

- **WHEN** a `DEPARTMENT_HEAD` deletes a quotation and the API succeeds
- **THEN** a success toast in Vietnamese appears and no `alert` is shown

#### Scenario: Delete asks for confirmation via dialog

- **WHEN** the user clicks Delete on a quotation row
- **THEN** a `ConfirmDialog` opens asking for confirmation in Vietnamese before the API call is issued
