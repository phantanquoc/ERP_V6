## ADDED Requirements

### Requirement: Server-driven pagination for order list

The `GET /api/orders` endpoint SHALL return paginated results driven entirely by server-side `page`, `limit`, `search`, `customerType`, `status`, `dateFrom`, and `dateTo` query parameters. `limit` MUST be one of `10`, `20`, `50`, `100` with default `20`. The response envelope MUST be `{ success: true, data: Order[], pagination: { page, limit, total, totalPages } }`.

#### Scenario: Filter by production status

- **WHEN** the client calls `GET /api/orders?status=DANG_SAN_XUAT`
- **THEN** the server returns only orders currently in `DANG_SAN_XUAT` and paginates them server-side

#### Scenario: Default behavior preserved when no filters

- **WHEN** the client calls `GET /api/orders` without filters
- **THEN** the server returns the first 20 orders ordered by creation date descending

### Requirement: Forward-only order production status transitions

`PATCH /api/orders/:id` SHALL reject any change to the `trangThaiSanXuat` field that is not the immediate successor in `ORDER_PRODUCTION_STATUS_ORDER`. Callers with role `ADMIN` MAY bypass via an explicit override.

#### Scenario: Legal forward step

- **WHEN** a `DEPARTMENT_HEAD` advances an order from `CHO_SAN_XUAT` to `DANG_SAN_XUAT`
- **THEN** the update succeeds

#### Scenario: Skipping production steps is rejected

- **WHEN** a non-admin advances an order from `CHO_SAN_XUAT` directly to `DA_GIAO`
- **THEN** the server responds with HTTP 400 and a `ValidationError`

#### Scenario: Backward production transition is rejected

- **WHEN** a non-admin moves an order from `DA_SAN_XUAT` back to `DANG_SAN_XUAT`
- **THEN** the server responds with HTTP 400 and a `ValidationError`

#### Scenario: Admin bypass

- **WHEN** an `ADMIN` updates an order production status in any direction
- **THEN** the update succeeds regardless of the ordered chain

### Requirement: Order CRUD records audit entries

Order create, update, delete, and status change operations SHALL invoke `recordAudit` via `@utils/auditLog` after the primary write commits, with `entityType = 'Order'` and the matching action. Audit failure SHALL NOT bubble.

#### Scenario: Order create audit

- **WHEN** a user creates a new order
- **THEN** an audit row is recorded with `action = 'CREATE'`, `entityType = 'Order'`, `before = null`, and `after` containing the created order snapshot

#### Scenario: Order status change audit

- **WHEN** a user advances an order's production status (no other fields changed)
- **THEN** an audit row is recorded with `action = 'STATUS_CHANGE'` capturing only the status transition

### Requirement: Order delivery triggers a creator notification

When an order's production status advances to `DA_GIAO_CHO_KHACH_HANG`, the order service SHALL fire a notification to the order creator after the primary write commits. The trigger SHALL be wrapped in `try/catch` so notification failure cannot bubble.

#### Scenario: Order delivered fires notification

- **WHEN** an order advances into `DA_GIAO_CHO_KHACH_HANG`
- **THEN** the creator receives a notification rendered from `"Đơn hàng {soDonHang} đã giao thành công"`

#### Scenario: Notification failure does not fail the update

- **WHEN** the notification service throws while sending the delivery notification
- **THEN** the order update HTTP response still resolves successfully
