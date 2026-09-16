## ADDED Requirements

### Requirement: Confirm actual price is an operational update, not an approval

The `POST /api/purchase-requests/:id/confirm-actual-price` endpoint SHALL be gated by `requireRule('purchase-requests', 'UPDATE')` (not `APPROVE`). Its service layer SHALL accept the actor when any of the following holds: the actor is `ADMIN`; the actor's resolved department code is `DEPT_PURCHASING` (any role); or the actor is a `GENERAL/pricing` approver (`isPricingApprover`). A department lookup, not a hard-coded id, SHALL determine purchasing membership.

#### Scenario: Purchasing employee confirms actual price
- **WHEN** an `EMPLOYEE` whose primary or secondary department resolves to `DEPT_PURCHASING` calls `POST /api/purchase-requests/:id/confirm-actual-price` on a request in `Đã duyệt`
- **THEN** the system records the actual prices and returns `200`

#### Scenario: Unrelated department employee cannot confirm actual price
- **WHEN** an `EMPLOYEE` whose departments do not include `DEPT_PURCHASING` or `DEPT_GENERAL/pricing` calls `POST /api/purchase-requests/:id/confirm-actual-price`
- **THEN** the system returns `403`

#### Scenario: General pricing approver retains confirm access
- **WHEN** a `DEPT_GENERAL` user in `SUBDEPT_GENERAL_PRICING` (role `EMPLOYEE` or higher) calls `POST /api/purchase-requests/:id/confirm-actual-price`
- **THEN** the system returns `200`

### Requirement: Submit-for-approval is an operational update

The `POST /api/purchase-requests/:id/submit-approval` endpoint SHALL be gated by `requireRule('purchase-requests', 'UPDATE')`, so an in-department `EMPLOYEE` can hand a ticket to the approver. The actual approval transition to `Đã duyệt`/`Từ chối` SHALL remain restricted to a real approver check.

#### Scenario: Purchasing employee submits a quoted request for approval
- **WHEN** an `EMPLOYEE` in `DEPT_PURCHASING` with a complete-quoted `Chờ báo giá` request calls `POST /api/purchase-requests/:id/submit-approval`
- **THEN** the request moves to `Chờ duyệt` and the system returns `200`

#### Scenario: Real approval still gated
- **WHEN** an `EMPLOYEE` not a pricing approver calls `PUT /api/purchase-requests/:id` with `trangThai: 'Đã duyệt'`
- **THEN** the system returns `403`
