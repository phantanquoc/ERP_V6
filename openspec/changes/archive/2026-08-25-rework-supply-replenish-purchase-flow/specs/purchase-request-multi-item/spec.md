## ADDED Requirements

### Requirement: Purchase request contains multiple product line items
A `PurchaseRequest` SHALL support one or more product line items stored in a child `PurchaseRequestItem` table. The parent `PurchaseRequest` record SHALL NOT store `phanLoai`, `tenHangHoa`, `soLuong`, or `donViTinh` fields. Every purchase request MUST have at least one item.

#### Scenario: Create purchase request with multiple items
- **WHEN** a purchase request is created with an `items` array of two or more entries
- **THEN** the system creates one `PurchaseRequest` record and one `PurchaseRequestItem` record per entry

#### Scenario: Reject purchase request with no items
- **WHEN** a purchase request is submitted with an empty `items` array
- **THEN** the system returns a validation error and does not persist any record

### Requirement: PurchaseRequestItem fields
Each `PurchaseRequestItem` SHALL contain: `id` (cuid), `purchaseRequestId` (FK), `phanLoai` (String, required), `tenHangHoa` (String, required), `soLuong` (Float, required, > 0), `donViTinh` (String, required), `createdAt`, `updatedAt`. Deleting the parent `PurchaseRequest` SHALL cascade-delete all child items.

#### Scenario: Items cascade-deleted with parent
- **WHEN** a `PurchaseRequest` is deleted
- **THEN** all associated `PurchaseRequestItem` records are deleted

### Requirement: Pre-fill purchase request items from supply request
When creating a PurchaseRequest from a SupplyRequest (i.e., `supplyRequestId` is provided), the system SHALL pre-populate the `items` array with entries derived from the linked SupplyRequest's items: `phanLoai` → `phanLoai`, `tenGoi` → `tenHangHoa`, `soLuong` → `soLuong`, `donViTinh` → `donViTinh`.

#### Scenario: Pre-fill items on purchase request creation from supply request
- **WHEN** the frontend opens CreatePurchaseRequestModal with a selected SupplyRequest
- **THEN** the items table is pre-populated with rows matching the supply request's items

#### Scenario: User can edit pre-filled items before saving
- **WHEN** items are pre-filled from a supply request
- **THEN** the user can change soLuong, donViTinh, phanLoai, or tenHangHoa before submitting

### Requirement: Replenishment purchase requests are a named stage

A `PurchaseRequest` whose `sourceType = 'SHORTAGE'` and `trangThai = 'Chờ báo giá'` SHALL be treated as a **Yêu cầu bổ sung** and labeled as such in every UI surface (tabs, cards, notification titles, detail header) via a shared label helper. From `Chờ duyệt` onward the same record SHALL render as **Yêu cầu mua hàng**. The label is purely presentational; `maYeuCau` and the status workflow remain unchanged.

#### Scenario: Shortage ticket renders as replenishment in the waiting stage
- **WHEN** a `SHORTAGE` purchase request in `Chờ báo giá` is listed in the purchasing tabs
- **THEN** the list row and detail header show the label "Yêu cầu bổ sung" and its card is counted under the replenishment count, not the purchase count

#### Scenario: Approved replenishment ticket renders as a purchase request
- **WHEN** the same `SHORTAGE` ticket is advanced to `Chờ duyệt` via `submitForApproval`
- **THEN** the list row and detail header show "Yêu cầu mua hàng" and the purchasing stats for "Đã duyệt" include it

#### Scenario: Manual or QUICK tickets are never labeled as replenishment regardless of status
- **WHEN** a `MANUAL` or `QUICK` purchase request is in `Chờ báo giá`
- **THEN** it renders as "Yêu cầu mua hàng"

### Requirement: Purchase request list and detail include items
The GET list and GET by ID endpoints for purchase requests SHALL include the `items` relation.

#### Scenario: Fetch purchase request by ID returns items
- **WHEN** a client calls GET /api/purchase-requests/:id
- **THEN** the response includes an `items` array with all child PurchaseRequestItem records

#### Scenario: List supports filtering replenishment vs purchase by goods class and stage
- **WHEN** a caller calls `GET /api/purchase-requests?phanLoai=Nguyên vật liệu` or filters by `sourceType=SHORTAGE` in the purchasing tabs
- **THEN** only requests matching the class are returned and `pagination.total` reflects the filtered count
