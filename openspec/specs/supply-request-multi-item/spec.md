# supply-request-multi-item Specification

## Purpose
TBD - created by archiving change rework-supply-replenish-purchase-flow. Update Purpose after archive.
## Requirements
### Requirement: Four-stage supply request status lifecycle
A `SupplyRequest` SHALL have the following valid status values: "Chưa cung cấp", "Đang xử lý", "Chờ bổ sung", "Đã duyệt mua", "Đã mua hàng", "Đã cung cấp", plus terminal "Đã hủy". Status SHALL only advance forward in that order; no backward transition is permitted. The initial status SHALL be "Chưa cung cấp". The fast-purchase shortcut sequence `["Chưa cung cấp", "Đã mua hàng", "Đã cung cấp"]` MAY be used only for `loaiYeuCau = "Mua nhanh"`.

#### Scenario: Initial status on creation
- **WHEN** a new supply request is created
- **THEN** its `trangThai` field is set to "Chưa cung cấp"

#### Scenario: Status cannot go backward
- **WHEN** a service method attempts to set status to a value earlier in the sequence
- **THEN** the system ignores the transition and retains the current status

#### Scenario: Shortage advances to Chờ bổ sung
- **WHEN** warehouse fulfillment records at least one shortage and creates replenishment purchase requests for the SR
- **THEN** the parent `SupplyRequest.trangThai` advances to "Chờ bổ sung" if it was "Đang xử lý"

### Requirement: Auto-transition to "Đang xử lý" when PurchaseRequest is linked
The system SHALL automatically set a SupplyRequest's status to "Đang xử lý" when the first `PurchaseRequest` with `supplyRequestId` matching that SupplyRequest is created, provided the current status is "Chưa cung cấp".

#### Scenario: First purchase request created for a supply request
- **WHEN** a PurchaseRequest is created with a non-null `supplyRequestId`
- **THEN** the linked SupplyRequest status is updated to "Đang xử lý"

#### Scenario: Subsequent purchase requests do not re-trigger transition
- **WHEN** a second PurchaseRequest is created for the same supplyRequestId
- **THEN** the SupplyRequest status remains unchanged (already "Đang xử lý" or later)

### Requirement: Auto-transition to "Đã duyệt mua" when PurchaseRequest is approved
The system SHALL automatically set a SupplyRequest's status to "Đã duyệt mua" when the linked `PurchaseRequest` has its `trangThai` changed to "Đã duyệt", provided the SupplyRequest current status is "Đang xử lý" or "Chờ bổ sung".

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

### Requirement: Supply request routes require authenticated access with ABAC

`GET /`, `GET /export/excel`, `GET /:id`, `GET /:id/decisions`, `POST /`, and `PATCH /:id/mark-purchased` on `/api/supply-requests` SHALL require `requireRule('supply-requests', { READ | EXPORT | CREATE | UPDATE })` respectively. `GET` list/detail SHALL filter by the caller's `departmentIds` / `subDepartmentIds` so users outside the owning departments receive an empty or 403 outcome. `POST /` SHALL derive `employeeId` from `req.user`, not from `req.body`.

#### Scenario: User outside the owning department cannot list supply requests
- **WHEN** an authenticated user outside the owning departments calls `GET /api/supply-requests`
- **THEN** the response contains no requests belonging to departments outside the caller's scope

#### Scenario: Client-supplied employeeId is ignored on create
- **WHEN** a caller sends `POST /api/supply-requests` with an arbitrary `employeeId`
- **THEN** the server uses the authenticated user's employee record and ignores the supplied id

### Requirement: Supply request service validates item input

`create` and `update` for supply requests SHALL reject items with blank `phanLoai`/`tenGoi`/`donViTinh`, non-positive or non-finite `soLuong`, or empty `mucDichYeuCau`. The decision producer `triggeredPurchaseRequestId` SHALL reference a real `PurchaseRequest`.

#### Scenario: Blank item field is rejected
- **WHEN** a caller sends `POST /api/supply-requests` with an item where `phanLoai = ''`
- **THEN** the server responds `400 ValidationError` and no record is persisted

