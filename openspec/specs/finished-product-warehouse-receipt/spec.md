# finished-product-warehouse-receipt Specification

## Purpose
TBD - created by archiving change production-output-warehouse. Update Purpose after archive.
## Requirements
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
The frontend SHALL provide a "Nhập kho" action on the finished-product screen for individual rows AND a "Nhập kho toàn bộ" action on the "Tổng các máy" aggregate tab. Both actions open a modal pre-filled with grade rows (label + quantity from one finished product OR sums across selected fry-batches), let the user manually select ONE warehouse and ONE lot, edit or remove quantity rows before confirming, and submit via a TanStack-Query hook that invalidates warehouse, finished-product, and lot-product queries. On the aggregate tab, rows with `daNhapKho = true` MUST appear dimmed and their selection checkbox MUST be disabled. The modal MUST present loading, error, empty, and success states with Vietnamese text.

#### Scenario: Modal pre-fill (single)
- **WHEN** the user opens the receipt modal for a single finished product
- **THEN** the modal shows the nonzero grade rows with quantities pre-filled and warehouse/lot selectors empty

#### Scenario: Modal pre-fill (bulk)
- **WHEN** the user clicks "Nhập kho toàn bộ" with N mẻ ticked on the aggregate tab
- **THEN** the modal shows one section per mẻ with nonzero grade rows pre-filled from the summed cross-machine weights, and a single shared warehouse + lot selector

#### Scenario: Manual location selection required
- **WHEN** the user confirms without selecting warehouse and lot
- **THEN** the form shows a Vietnamese validation error and does not submit

#### Scenario: Already-received rows are not selectable
- **WHEN** a mẻ has `daNhapKho = true` on the aggregate tab
- **THEN** its row is rendered dimmed, its checkbox is disabled, and it is excluded from the default "select all" selection

#### Scenario: Post-submit cache refresh
- **WHEN** a receipt submission (single or bulk) succeeds
- **THEN** warehouse, finished-product, and lot-product queries are invalidated and the success state is shown

### Requirement: Idempotent receipt flag on FinishedProduct

The system SHALL add a non-nullable boolean field `daNhapKho` (default `false`) to `FinishedProduct` to mark whether the finished-product row has already been received into warehouse. The field MUST be set to `true` atomically as part of the successful warehouse-receipt transaction (single or bulk). Once `true`, subsequent receipt attempts on the same row MUST be rejected with `ConflictError` and a Vietnamese message. Migration MUST be additive (no data loss) and existing rows MUST default to `false`.

#### Scenario: Default value after migration
- **WHEN** the migration adding `daNhapKho` is applied
- **THEN** all pre-existing `FinishedProduct` rows have `daNhapKho = false`

#### Scenario: Flag set on successful single receipt
- **WHEN** `confirmFinishedProductWarehouseReceipt` succeeds for a finished product
- **THEN** that finished product's `daNhapKho` becomes `true` inside the same transaction

#### Scenario: Reject already-received row
- **WHEN** a receipt request targets a finished product whose `daNhapKho` is already `true`
- **THEN** the system throws `ConflictError` with a Vietnamese message and creates no receipts

### Requirement: Bulk warehouse receipt across machines by fry-batch

The system SHALL expose an endpoint (Route→Controller→Service→Prisma, registered in ROUTE_MAP, no generic `PATCH /status`) that accepts `{ maChienList: string[], warehouseId: string, lotId: string }` and atomically receives output for ALL `FinishedProduct` rows belonging to the listed fry-batches into a SINGLE warehouse and SINGLE lot. For each `maChien`, the service SHALL sum the 8 grade weights across every machine of that mẻ, build receipt rows using the existing `GRADE_LABELS` convention `"{tenHangHoa} - {label}"` skipping zero-weight grades, generate sequential `maPhieuNhap` codes via `nextYearlyCode(lastCode, 'PN', year)`, delegate to `warehouseReceiptService.batchCreate`, and set `daNhapKho = true` for every affected `FinishedProduct`. The whole operation MUST run in one `prisma.$transaction`. Responses MUST use the standard shape and Vietnamese messages; errors MUST use typed errors from `@utils/errors`.

#### Scenario: Successful bulk receipt
- **WHEN** the user submits `{ maChienList: ["MC001","MC002"], warehouseId, lotId }` and all referenced rows have `daNhapKho = false`
- **THEN** the system creates one `WarehouseReceipt` per nonzero grade per mẻ, increments each SKU's `LotProduct.soLuong`, sets `daNhapKho = true` on every `FinishedProduct` of those mẻ, and returns `{ success: true }` with a Vietnamese message

#### Scenario: Sum across machines per fry-batch
- **WHEN** a `maChien` has 3 machines each with grade A weights 10/20/30
- **THEN** the bulk receipt produces ONE row for grade A with `soLuongNhap = 60` for that mẻ

#### Scenario: Skip zero-weight grades after sum
- **WHEN** the sum of a particular grade across all machines of a mẻ is 0
- **THEN** no row is produced for that grade

#### Scenario: Empty selection
- **WHEN** the request `maChienList` is empty
- **THEN** the system rejects it with a `ValidationError` and creates no receipts

#### Scenario: Missing warehouse or lot
- **WHEN** the request omits `warehouseId` or `lotId`
- **THEN** the system rejects it with a `ValidationError` and a Vietnamese message

#### Scenario: One mẻ already received
- **WHEN** any `FinishedProduct` of any selected `maChien` already has `daNhapKho = true`
- **THEN** the system throws `ConflictError`, the transaction is rolled back, and no receipts are created for any mẻ in the batch

#### Scenario: Unknown maChien
- **WHEN** a `maChien` in `maChienList` has no `FinishedProduct` rows
- **THEN** the system throws `NotFoundError` with a Vietnamese message and creates no receipts

#### Scenario: Sequential receipt codes
- **WHEN** a bulk receipt produces multiple rows in the same calendar year
- **THEN** each `WarehouseReceipt.maPhieuNhap` is generated by `nextYearlyCode` and is unique within the year

