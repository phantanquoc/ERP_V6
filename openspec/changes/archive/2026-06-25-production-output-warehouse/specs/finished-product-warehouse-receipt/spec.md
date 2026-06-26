## ADDED Requirements

### Requirement: FinishedProduct links to a base product
The system SHALL provide a nullable `internationalProductId` foreign key on `FinishedProduct` referencing `InternationalProduct`, with `onDelete: SetNull` and an index, so a finished-product row can be associated with a base product (e.g. "Mít sấy"). Existing rows MUST remain valid with a null value (no backfill).

#### Scenario: Existing rows after migration
- **WHEN** the migration adding `internationalProductId` is applied
- **THEN** all pre-existing `FinishedProduct` rows have `internationalProductId = null` and remain readable

#### Scenario: Base product deleted
- **WHEN** an `InternationalProduct` referenced by a `FinishedProduct` is deleted
- **THEN** the `FinishedProduct.internationalProductId` is set to null and the finished-product row is preserved

### Requirement: Auto-fill receipt rows from a fry batch's grades
The system SHALL build warehouse-receipt input rows from a single `FinishedProduct` by reading its 8 grade weights (A, B, B Dầu, C, vụn lớn, vụn nhỏ, phế phẩm, ướt), including phế phẩm and ướt. Grades with weight 0 MUST be skipped. Each grade MUST map to its own SKU name using a fixed `GRADE_LABELS` convention `"{tenSanPham} - {label}"`.

#### Scenario: All grades have weight
- **WHEN** a finished product has nonzero weight for all 8 grades
- **THEN** 8 receipt rows are produced, each with `tenSanPham = "{base} - {grade label}"` and `soLuongNhap = that grade's weight`

#### Scenario: Some grades are zero
- **WHEN** a finished product has weight 0 for vụn nhỏ and ướt
- **THEN** only the 6 nonzero grades produce receipt rows; the 2 zero grades are omitted

#### Scenario: Scrap grades are included
- **WHEN** phế phẩm and ướt have nonzero weight
- **THEN** their receipt rows are produced and included in the batch (scrap still enters stock)

### Requirement: Confirm finished-product warehouse receipt
The system SHALL expose an endpoint (Route→Controller→Service→Prisma, registered in ROUTE_MAP, no generic `PATCH /status`) that accepts a target warehouse, lot, and the user-confirmed per-grade rows, and delegates to the existing `warehouseReceiptService.batchCreate` to atomically create receipts and increase lot stock. Responses MUST use the standard shape and Vietnamese messages; errors MUST use typed errors from `@utils/errors`.

#### Scenario: Successful receipt
- **WHEN** a user confirms a receipt with warehouseId, lotId, and ≥1 nonzero row
- **THEN** the system creates one `WarehouseReceipt` per row, increments each SKU's `LotProduct.soLuong` by the received quantity, and returns `{ success: true }` with a Vietnamese message

#### Scenario: Edited quantities are honored
- **WHEN** the user edits a row's quantity before confirming
- **THEN** the created receipt uses the edited quantity, not the original grade weight

#### Scenario: Missing warehouse or lot
- **WHEN** the request omits warehouseId or lotId
- **THEN** the system rejects it with a `ValidationError` and a Vietnamese message, creating no receipts

#### Scenario: Finished product not found
- **WHEN** the referenced finished product / maChien does not exist
- **THEN** the system throws a `NotFoundError` with a Vietnamese message

### Requirement: Finished-product receipt UI (auto-fill, editable, manual location)
The frontend SHALL provide a "Nhập kho" action on the finished-product screen that opens a modal pre-filled with up to 8 grade rows (label + quantity from the finished product), lets the user manually select warehouse and lot, edit or remove quantity rows before confirming, and submits via a TanStack-Query hook that invalidates warehouse, finished-product, and lot-product queries. The modal MUST present loading, error, empty, and success states with Vietnamese text.

#### Scenario: Modal pre-fill
- **WHEN** the user opens the receipt modal for a finished product
- **THEN** the modal shows the nonzero grade rows with quantities pre-filled and warehouse/lot selectors empty

#### Scenario: Manual location selection required
- **WHEN** the user confirms without selecting warehouse and lot
- **THEN** the form shows a Vietnamese validation error and does not submit

#### Scenario: Post-submit cache refresh
- **WHEN** a receipt submission succeeds
- **THEN** warehouse, finished-product, and lot-product queries are invalidated and the success state is shown
