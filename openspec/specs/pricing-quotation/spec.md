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

### Requirement: Quotation versioning via QuotationRevision child table

The system SHALL persist a `QuotationRevision` row before every successful `Quotation` update. Each revision row SHALL capture `quotationId`, monotonically increasing `revisionNumber` (1-indexed per quotation), JSON `snapshot` of the current quotation plus its items, `createdBy`, optional `note`, and `createdAt`. The `snapshot` column is JSON because revision payloads are immutable historical artifacts. Revision rows MUST be created inside the same `prisma.$transaction` as the update; if revision creation fails the update SHALL roll back.

#### Scenario: First update creates revision #1

- **WHEN** a user updates an existing quotation that has no prior revisions
- **THEN** a `QuotationRevision` row is persisted with `revisionNumber = 1` and `snapshot` containing the quotation state BEFORE the update

#### Scenario: Sequential revisions increment number

- **WHEN** a user updates a quotation that already has revisions 1 and 2
- **THEN** the new revision is persisted with `revisionNumber = 3`

#### Scenario: Revision write failure rolls back the update

- **WHEN** the revision insert throws inside the transaction
- **THEN** the quotation row remains unchanged and the API returns an error envelope

### Requirement: Quotation revision read endpoints

The system SHALL expose `GET /api/quotations/:id/revisions` returning paginated revisions ordered by `revisionNumber` descending, and `GET /api/quotations/:id/revisions/:revisionId` returning a single revision detail. Both endpoints SHALL require authentication and be limited to roles `ADMIN`, `DEPARTMENT_HEAD`, `TEAM_LEAD`. Responses SHALL use the standard envelope.

#### Scenario: Authorized list call

- **WHEN** a `TEAM_LEAD` calls `GET /api/quotations/q1/revisions?page=1&limit=20`
- **THEN** the response is `{ success: true, data: [...], pagination: {...} }` sorted newest first

#### Scenario: EMPLOYEE denied

- **WHEN** an `EMPLOYEE` calls the revisions endpoint
- **THEN** the system rejects with HTTP 403

#### Scenario: Unknown revision id

- **WHEN** the detail endpoint receives a `revisionId` that does not belong to the given `quotationId`
- **THEN** the system returns HTTP 404 `NotFoundError('Không tìm thấy phiên bản báo giá')`

### Requirement: Quotation price lock fields and auto-lock semantics

The `Quotation` model SHALL include `priceLocked Boolean @default(false)`, `priceLockedAt DateTime?`, and `priceLockedBy String?`. When `advanceQuotationStatus` accepts a transition into `DANG_CHO_PHAN_HOI`, the same service write SHALL set `priceLocked = true`, `priceLockedAt = now`, and `priceLockedBy = actorUserId`. These fields SHALL be returned on every quotation list and detail payload.

#### Scenario: Auto-lock on transition

- **WHEN** a quotation's status advances into `DANG_CHO_PHAN_HOI`
- **THEN** the same write sets `priceLocked = true`, `priceLockedAt = now`, `priceLockedBy = actorUserId`

#### Scenario: Price fields exposed on payload

- **WHEN** a client fetches a quotation
- **THEN** the payload includes `priceLocked`, `priceLockedAt`, `priceLockedBy`

### Requirement: Price edits on locked quotations are rejected

`quotationService.update` SHALL reject any update payload that mutates `donGia`, `soLuong`, `thanhTien`, `vat`, or `totalAmount` (on the parent or inside any item) when `priceLocked = true`, unless the actor is `ADMIN` AND `forceUnlock === true`. Non-price fields SHALL remain editable on locked quotations. The rejection error SHALL be `ValidationError('Báo giá đã khóa giá, không thể sửa giá. Hãy tạo phiên bản mới hoặc liên hệ ADMIN để mở khóa.')`.

#### Scenario: Non-ADMIN attempts price edit on locked row

- **WHEN** a `DEPARTMENT_HEAD` submits an update changing `items[0].donGia` on a locked quotation
- **THEN** the service throws the locked-price `ValidationError` and the row is unchanged

#### Scenario: Non-ADMIN sends forceUnlock

- **WHEN** a non-ADMIN sends `forceUnlock: true` together with a price edit on a locked quotation
- **THEN** the service ignores `forceUnlock` and still throws the locked-price `ValidationError`

#### Scenario: Non-price edit on locked row succeeds

- **WHEN** a `TEAM_LEAD` updates `tenKhachHang` on a locked quotation (no price fields)
- **THEN** the update succeeds and the lock fields remain unchanged

### Requirement: ADMIN may force-unlock prices

When the actor is `ADMIN` AND the update payload includes `forceUnlock: true`, the service SHALL clear `priceLocked = false`, `priceLockedAt = null`, `priceLockedBy = null` as part of the same write, apply the requested price edits, and record an audit entry with `action = 'PRICE_UNLOCK'`.

#### Scenario: ADMIN unlocks and edits in one call

- **WHEN** an `ADMIN` submits `forceUnlock: true` with a price edit on a locked quotation
- **THEN** the price fields are updated, the lock fields are cleared, and a `PRICE_UNLOCK` audit row is recorded

### Requirement: Frontend price lock affordances

The Quotation management screen SHALL render a "Đã khóa giá" badge on locked rows and SHALL disable price inputs on the edit form when `priceLocked = true`. A "Mở khóa giá" action SHALL appear only when the current user is `ADMIN` and SHALL open a confirmation dialog before submitting `forceUnlock: true`.

#### Scenario: Locked badge

- **WHEN** the list shows a quotation with `priceLocked = true`
- **THEN** a "Đã khóa giá" badge is rendered next to the status badge

#### Scenario: Disabled inputs

- **WHEN** a non-ADMIN opens the edit form for a locked quotation
- **THEN** the `donGia`, `soLuong`, `thanhTien`, `vat`, and `totalAmount` inputs are disabled

#### Scenario: ADMIN unlock confirmation

- **WHEN** an `ADMIN` clicks "Mở khóa giá"
- **THEN** a confirmation dialog explains the consequence and only on confirmation does the frontend send `forceUnlock: true`

### Requirement: Quotation list returns daysOpen for non-terminal rows

`GET /api/quotations` SHALL compute and return a derived `daysOpen` field equal to `Math.floor((now - createdAt) / msPerDay)` for every row whose `tinhTrang` is NOT one of `{ DA_DAT_HANG, KHONG_DAT_HANG, EXPIRED, REJECTED }`. Terminal rows SHALL omit the field. The computation MUST happen in TypeScript after the Prisma query.

#### Scenario: Non-terminal row exposes daysOpen

- **WHEN** a quotation with `tinhTrang = DANG_CHO_PHAN_HOI` created 9 days ago is returned in a list
- **THEN** the row includes `daysOpen = 9`

#### Scenario: Terminal row omits daysOpen

- **WHEN** a quotation with `tinhTrang = DA_DAT_HANG` is returned in a list
- **THEN** the row does NOT include a `daysOpen` field

### Requirement: Quote aging warnings endpoint

The system SHALL expose `GET /api/quotations/aging-warnings?threshold=N` returning every non-terminal quotation with `daysOpen >= threshold`. The `threshold` query parameter SHALL accept integers `1`-`90`; any other value SHALL fall back to default `7`. Results SHALL be sorted by `daysOpen` descending. RBAC SHALL restrict the endpoint to roles `ADMIN` and `DEPARTMENT_HEAD`. The response SHALL include both `data` and a `warningBands` grouping (yellow 7-13, red >=14).

#### Scenario: Default threshold

- **WHEN** an `ADMIN` calls `GET /api/quotations/aging-warnings` without a threshold
- **THEN** the system returns all non-terminal quotations with `daysOpen >= 7`, sorted by `daysOpen` desc

#### Scenario: Invalid threshold falls back

- **WHEN** the request supplies `threshold=999`
- **THEN** the system uses `threshold = 7` and returns the standard envelope

#### Scenario: TEAM_LEAD denied

- **WHEN** a `TEAM_LEAD` calls the aging endpoint
- **THEN** the system rejects with HTTP 403

### Requirement: Frontend aging badges

The Quotation management list SHALL render an aging badge on non-terminal rows: no badge when `daysOpen < 7`; yellow `bg-yellow-100 text-yellow-800` with label `"X ngày"` when `7 <= daysOpen < 14`; red `bg-red-100 text-red-800` with label `"X ngày"` when `daysOpen >= 14`.

#### Scenario: Yellow badge

- **WHEN** a non-terminal row has `daysOpen = 10`
- **THEN** the badge renders with `bg-yellow-100 text-yellow-800` and the label "10 ngày"

#### Scenario: Red badge

- **WHEN** a non-terminal row has `daysOpen = 20`
- **THEN** the badge renders with `bg-red-100 text-red-800` and the label "20 ngày"

### Requirement: Quotation CRUD records audit entries

Quotation create, update, delete, status change, and price unlock operations SHALL invoke `recordAudit` via `@utils/auditLog` after the primary write commits, with `entityType = 'Quotation'` and the matching action. Audit failure SHALL NOT bubble.

#### Scenario: Quotation update audit

- **WHEN** a user updates a quotation
- **THEN** an audit row is recorded with `action = 'UPDATE'`, `entityType = 'Quotation'`, and before/after snapshots

#### Scenario: Price unlock audit

- **WHEN** an `ADMIN` force-unlocks a locked quotation
- **THEN** an audit row is recorded with `action = 'PRICE_UNLOCK'` and the unlocked snapshot
