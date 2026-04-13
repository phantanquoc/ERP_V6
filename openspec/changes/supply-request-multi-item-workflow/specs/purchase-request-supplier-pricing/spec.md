## ADDED Requirements

### Requirement: Purchase request has optional supplier reference
A `PurchaseRequest` SHALL have an optional `nhaCungCapId` field (String?) that is a foreign key to the `Supplier` model. One supplier applies to the entire purchase request.

#### Scenario: Create purchase request with supplier
- **WHEN** a purchase request is created with a valid `nhaCungCapId`
- **THEN** the persisted record has `nhaCungCapId` set and the relation to `Supplier` is resolvable

#### Scenario: Create purchase request without supplier
- **WHEN** a purchase request is created without `nhaCungCapId`
- **THEN** the field is null and the record is valid

### Requirement: Purchase request has optional estimated price field
A `PurchaseRequest` SHALL have an optional `giaDuKien` field (Float?) representing the estimated price per unit for the order. This is a header-level field applying to the overall request.

#### Scenario: Save estimated price
- **WHEN** a purchase request is created with `giaDuKien: 150000`
- **THEN** the persisted record has `giaDuKien` set to 150000

### Requirement: Purchase request has optional purchasing notes field
A `PurchaseRequest` SHALL have an optional `ghiChuMuaHang` field (String?) for additional notes from the purchasing team, separate from the existing `ghiChu` field.

#### Scenario: Save purchasing notes
- **WHEN** a purchase request is created with `ghiChuMuaHang: "Ưu tiên giao hàng trước 15/5"`
- **THEN** the persisted record has `ghiChuMuaHang` set to that string

### Requirement: Supplier dropdown in CreatePurchaseRequestModal
The `CreatePurchaseRequestModal` component SHALL render a searchable supplier dropdown that loads all active suppliers from the existing `Supplier` model. The dropdown SHALL display `tenNhaCungCap` and the selected value SHALL be the supplier `id`.

#### Scenario: Supplier dropdown populated on modal open
- **WHEN** the CreatePurchaseRequestModal opens
- **THEN** the supplier dropdown contains entries for each Supplier with `trangThai = "Đang cung cấp"`

#### Scenario: Selecting a supplier sets nhaCungCapId
- **WHEN** the user selects a supplier from the dropdown
- **THEN** the form's `nhaCungCapId` value is set to the selected supplier's `id`

### Requirement: Estimated price and purchasing notes fields visible in modal
The `CreatePurchaseRequestModal` SHALL render editable input fields for `giaDuKien` (number input, labeled "Giá dự kiến") and `ghiChuMuaHang` (textarea, labeled "Ghi chú mua hàng"). These fields SHALL be empty by default and SHALL NOT be pre-filled from the linked SupplyRequest.

#### Scenario: Fields visible and editable
- **WHEN** the CreatePurchaseRequestModal is open
- **THEN** the user can type a number into the "Giá dự kiến" field and text into "Ghi chú mua hàng"
