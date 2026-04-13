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

### Requirement: Purchase request list and detail include items
The GET list and GET by ID endpoints for purchase requests SHALL include the `items` relation.

#### Scenario: Fetch purchase request by ID returns items
- **WHEN** a client calls GET /api/purchase-requests/:id
- **THEN** the response includes an `items` array with all child PurchaseRequestItem records
