## ADDED Requirements

### Requirement: Supply request contains multiple product items
A supply request (SupplyRequest) SHALL support one or more product line items stored in a child `SupplyRequestItem` table. The parent `SupplyRequest` record SHALL NOT store `phanLoai`, `tenGoi`, `soLuong`, or `donViTinh` fields. Every supply request MUST have at least one item to be valid.

#### Scenario: Create supply request with multiple items
- **WHEN** a user submits a supply request form with two or more product rows
- **THEN** the system creates one `SupplyRequest` record and one `SupplyRequestItem` record per row, each linked by `supplyRequestId`

#### Scenario: Create supply request with a single item
- **WHEN** a user submits a supply request form with exactly one product row
- **THEN** the system creates one `SupplyRequest` record and exactly one `SupplyRequestItem` record

#### Scenario: Reject supply request with no items
- **WHEN** a user submits a supply request form with zero product rows
- **THEN** the system returns a validation error and does not persist any record

### Requirement: SupplyRequestItem fields
Each `SupplyRequestItem` SHALL contain: `id` (cuid), `supplyRequestId` (FK), `phanLoai` (String, required), `tenGoi` (String, required), `soLuong` (Float, required, > 0), `donViTinh` (String, required), `createdAt`, `updatedAt`. Deleting the parent `SupplyRequest` SHALL cascade-delete all child items.

#### Scenario: Item deleted on parent delete
- **WHEN** a `SupplyRequest` is deleted
- **THEN** all associated `SupplyRequestItem` records are also deleted

### Requirement: Supply request list includes items
The GET list and GET by ID endpoints for supply requests SHALL include the `items` relation so consumers have full item data without a second request.

#### Scenario: Fetch supply request by ID returns items
- **WHEN** a client calls GET /api/supply-requests/:id
- **THEN** the response body includes an `items` array with all child item records

#### Scenario: Fetch supply request list returns items
- **WHEN** a client calls GET /api/supply-requests
- **THEN** each entry in `data` includes an `items` array

### Requirement: Frontend multi-item form for creating supply requests
The `SupplyRequestModal` component SHALL render a dynamic item table where each row has fields for `phanLoai`, `tenGoi`, `soLuong`, and `donViTinh`. The user SHALL be able to add rows and remove individual rows. At least one row MUST be present to submit.

#### Scenario: Add product row
- **WHEN** the user clicks the "Thêm sản phẩm" button
- **THEN** a new empty row is appended to the item table

#### Scenario: Remove product row
- **WHEN** the user clicks the remove icon on a row (and at least one other row exists)
- **THEN** that row is removed from the table

#### Scenario: Cannot remove last remaining row
- **WHEN** the user clicks the remove icon on the only remaining row
- **THEN** the row is not removed (remove button is disabled or hidden)

### Requirement: Frontend view/edit shows items in sub-table
The view and edit modal in `SupplyRequestManagement` SHALL display all `SupplyRequestItem` records in a sub-table with columns: Phân loại, Tên gọi, Số lượng, Đơn vị tính. In edit mode, each row SHALL be editable.

#### Scenario: View modal renders item sub-table
- **WHEN** a user opens the view modal for a supply request
- **THEN** a table lists each item with its phanLoai, tenGoi, soLuong, donViTinh

### Requirement: Excel export includes item rows
The Excel export for supply requests SHALL produce one row per `SupplyRequestItem` (not per SupplyRequest), with the parent request header fields repeated on each item row.

#### Scenario: Export with two-item supply request
- **WHEN** a supply request with 2 items is exported to Excel
- **THEN** the workbook contains 2 rows for that request, each with the request's maYeuCau, tenNhanVien, boPhan, and the item's phanLoai, tenGoi, soLuong, donViTinh
