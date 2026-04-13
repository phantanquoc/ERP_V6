## ADDED Requirements

### Requirement: Four-stage supply request status lifecycle
A `SupplyRequest` SHALL have exactly four valid status values: "Chưa cung cấp", "Đang xử lý", "Đã duyệt mua", "Đã cung cấp". Status SHALL only advance forward; no backward transitions are permitted. The initial status on creation SHALL be "Chưa cung cấp".

#### Scenario: Initial status on creation
- **WHEN** a new supply request is created
- **THEN** its `trangThai` field is set to "Chưa cung cấp"

#### Scenario: Status cannot go backward
- **WHEN** a service method attempts to set status to a value earlier in the sequence
- **THEN** the system ignores the transition and retains the current status

### Requirement: Auto-transition to "Đang xử lý" when PurchaseRequest is linked
The system SHALL automatically set a SupplyRequest's status to "Đang xử lý" when the first `PurchaseRequest` with `supplyRequestId` matching that SupplyRequest is created, provided the current status is "Chưa cung cấp".

#### Scenario: First purchase request created for a supply request
- **WHEN** a PurchaseRequest is created with a non-null `supplyRequestId`
- **THEN** the linked SupplyRequest status is updated to "Đang xử lý"

#### Scenario: Subsequent purchase requests do not re-trigger transition
- **WHEN** a second PurchaseRequest is created for the same supplyRequestId
- **THEN** the SupplyRequest status remains unchanged (already "Đang xử lý" or later)

### Requirement: Auto-transition to "Đã duyệt mua" when PurchaseRequest is approved
The system SHALL automatically set a SupplyRequest's status to "Đã duyệt mua" when the linked `PurchaseRequest` has its `trangThai` changed to "Đã duyệt", provided the SupplyRequest current status is "Đang xử lý".

#### Scenario: Purchase request approved
- **WHEN** a PurchaseRequest status is updated to "Đã duyệt" and it has a non-null supplyRequestId
- **THEN** the linked SupplyRequest status is updated to "Đã duyệt mua"

#### Scenario: Purchase request rejected does not advance supply request
- **WHEN** a PurchaseRequest status is updated to "Từ chối"
- **THEN** the linked SupplyRequest status is not changed

### Requirement: Auto-transition to "Đã cung cấp" when warehouse document is linked
The system SHALL automatically set a SupplyRequest's status to "Đã cung cấp" when a WarehouseReceipt or WarehouseIssue referencing that supply request is created, provided the current status is "Đã duyệt mua" or later.

#### Scenario: Warehouse receipt created for supply request
- **WHEN** a WarehouseReceipt is created with a non-null `supplyRequestId`
- **THEN** the linked SupplyRequest status is updated to "Đã cung cấp"

#### Scenario: Status does not regress after already fulfilled
- **WHEN** a second WarehouseReceipt is created for the same supplyRequestId
- **THEN** the SupplyRequest status remains "Đã cung cấp"

### Requirement: Client cannot write status directly
The update supply request API endpoint SHALL ignore any `trangThai` value sent by the client. Status transitions are exclusively performed by server-side service logic.

#### Scenario: Client sends trangThai in update payload
- **WHEN** a PUT /api/supply-requests/:id request includes a `trangThai` field in the body
- **THEN** the `trangThai` field is stripped before persisting and the status remains as determined by workflow logic
