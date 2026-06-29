## ADDED Requirements

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
