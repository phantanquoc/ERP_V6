## ADDED Requirements

### Requirement: Raw Material Catalog Endpoint

The system SHALL expose a read-only endpoint that returns all `InternationalProduct` rows whose `loaiSanPham` field equals `"Nguyên liệu thô"` (raw material), so the production UI can populate the first level of the cascading dropdown.

#### Scenario: List raw materials

- **WHEN** the client sends `GET /api/international-products/raw-materials`
- **THEN** the response is `{ success: true, data: InternationalProduct[] }` containing only products with `loaiSanPham = "Nguyên liệu thô"`, ordered by `maSanPham` ascending.

#### Scenario: No raw materials seeded

- **WHEN** no `InternationalProduct` row matches the raw-material filter
- **THEN** the response is `{ success: true, data: [] }` with HTTP 200.

### Requirement: Lots-Containing-Product Endpoint

The system SHALL expose a read-only endpoint that returns distinct `Lot` records that currently hold a positive stock (`LotProduct.soLuong > 0`) of a given `InternationalProduct`, so the UI can populate the second level of the cascading dropdown.

#### Scenario: Filter lots by product with stock

- **WHEN** the client sends `GET /api/lot-products/lots?internationalProductId=<id>`
- **THEN** the response is `{ success: true, data: Lot[] }` containing every distinct lot that has at least one `LotProduct` row for the given product with `soLuong > 0`, including the `warehouse` relation.

#### Scenario: Missing required query param

- **WHEN** the client omits `internationalProductId`
- **THEN** the response is HTTP 400 with `{ success: false, message: "internationalProductId là bắt buộc" }` (or equivalent validation error).

#### Scenario: Product exists but no stock

- **WHEN** the product exists but every matching `LotProduct.soLuong` is 0 or negative
- **THEN** the response is `{ success: true, data: [] }` with HTTP 200.

### Requirement: Packages-In-Lot Endpoint

The system SHALL expose a read-only endpoint that returns the `LotProduct` rows (packages, "kiện") inside a given lot for a given product, filtered to rows with positive stock, so the UI can populate the third level of the cascading dropdown.

#### Scenario: Filter packages by lot and product

- **WHEN** the client sends `GET /api/lot-products/kien?internationalProductId=<pid>&lotId=<lid>`
- **THEN** the response is `{ success: true, data: LotProduct[] }` containing each row where `lotId = lid`, `internationalProductId = pid`, and `soLuong > 0`, including `internationalProduct` and `lot.warehouse` relations.

#### Scenario: Missing required query params

- **WHEN** either `internationalProductId` or `lotId` is omitted
- **THEN** the response is HTTP 400 with a validation error message.

### Requirement: Material Evaluation Linked To Warehouse Package

The `MaterialEvaluation` model SHALL carry an optional foreign key `lotProductId` referencing the warehouse package the raw material was drawn from, and an optional unique foreign key `warehouseIssueId` referencing the auto-generated stock-out slip. Both foreign keys SHALL use `ON DELETE SET NULL` so that deletions in the warehouse system do not cascade-delete historical evaluations.

#### Scenario: New evaluation created with warehouse link

- **WHEN** a Material Evaluation is created through the new wizard
- **THEN** the persisted row has non-null `lotProductId` and `warehouseIssueId`, and the snapshot fields `tenHangHoa` and `soLoKien` reflect the chosen product and lot at creation time.

#### Scenario: Legacy evaluation without warehouse link

- **WHEN** a Material Evaluation row predates this change (has `lotProductId = NULL` and `warehouseIssueId = NULL`)
- **THEN** the row is still readable through every existing API and the UI renders it using the snapshot fields `tenHangHoa`, `soLoKien`, and `khoiLuong`.

#### Scenario: Source LotProduct deleted after evaluation

- **WHEN** the `LotProduct` referenced by an existing `MaterialEvaluation.lotProductId` is deleted from the warehouse
- **THEN** the `MaterialEvaluation` row is preserved with `lotProductId` set to `NULL`, and the snapshot fields continue to display the original product name and lot label.

### Requirement: Transactional Material Evaluation Creation With Auto Stock-Out

When a Material Evaluation is created with a `lotProductId`, the system SHALL execute the following operations atomically inside a single Prisma transaction: (1) validate that the `LotProduct` exists and `soLuong >= khoiLuong`, (2) generate a unique stock-out code via the yearly code generator, (3) create a `WarehouseIssue` row whose `ghiChu` field begins with the literal prefix `"[TỰ ĐỘNG] Xuất nguyên liệu cho mẻ chiên "` followed by the `maChien` and date, (4) decrement `LotProduct.soLuong` by `khoiLuong`, and (5) create the `MaterialEvaluation` row with both foreign keys populated.

#### Scenario: Successful create with sufficient stock

- **WHEN** staff submit a Material Evaluation with `lotProductId = L1`, `khoiLuong = 25`, and `LotProduct.soLuong = 100`
- **THEN** the transaction commits, the new `WarehouseIssue.soLuongXuat = 25`, `WarehouseIssue.soLuongTruoc = 100`, `WarehouseIssue.soLuongSau = 75`, `LotProduct.soLuong` becomes 75, the `MaterialEvaluation.warehouseIssueId` equals the new issue's id, and `WarehouseIssue.ghiChu` starts with `"[TỰ ĐỘNG] Xuất nguyên liệu cho mẻ chiên "`.

#### Scenario: Insufficient stock rejected

- **WHEN** staff submit a Material Evaluation requesting more `khoiLuong` than the `LotProduct.soLuong`
- **THEN** the transaction rolls back, no `WarehouseIssue` is created, the `LotProduct` is unchanged, and the API returns a validation error stating the available stock.

#### Scenario: LotProduct not found

- **WHEN** the submitted `lotProductId` does not match any `LotProduct` row
- **THEN** the transaction rolls back and the API returns HTTP 404 with a Vietnamese not-found message.

#### Scenario: Concurrent create from same package

- **WHEN** two clients submit Material Evaluations from the same `lotProductId` at the same time and the combined `khoiLuong` exceeds available stock
- **THEN** at most one transaction commits successfully; the other rolls back with an insufficient-stock error and `LotProduct.soLuong` reflects only the successful issue.

### Requirement: Material Evaluation Deletion Refunds Stock

When a Material Evaluation that has a linked `WarehouseIssue` is deleted, the system SHALL atomically delete the linked `WarehouseIssue` and refund the issued quantity back to the source `LotProduct` (if it still exists), in addition to the existing cascade deletion of dependent `SystemOperation`, `FinishedProduct`, and `QualityEvaluation` rows by `maChien`.

#### Scenario: Delete refunds source package

- **WHEN** staff delete a Material Evaluation that was created via the new wizard
- **THEN** the linked `WarehouseIssue` is removed, the source `LotProduct.soLuong` is incremented by the issued quantity, and all dependent production rows for the same `maChien` are deleted in the same transaction.

#### Scenario: Delete when source package no longer exists

- **WHEN** the Material Evaluation's `lotProductId` is `NULL` because the warehouse package was previously deleted
- **THEN** the deletion proceeds successfully, the linked `WarehouseIssue` (if still present) is removed, no refund is attempted, and no error is raised.

#### Scenario: Delete legacy evaluation without warehouse link

- **WHEN** a legacy Material Evaluation with `warehouseIssueId = NULL` is deleted
- **THEN** the deletion behaves exactly as before this change: only dependent production rows are cascaded, no warehouse operations are performed.

### Requirement: Immutable Quantity After Creation

The `khoiLuong` field of a `MaterialEvaluation` row SHALL NOT be modifiable through the update endpoint once the row has been persisted. To correct the quantity, staff must delete the row (which refunds stock) and create a new one.

#### Scenario: Update attempt ignores quantity

- **WHEN** an update request includes a different `khoiLuong` value
- **THEN** the update either rejects the request with a validation error or silently ignores the `khoiLuong` field, leaving the persisted value and the linked `WarehouseIssue.soLuongXuat` unchanged.

### Requirement: Seeded Raw Material Catalog

The business seed script SHALL upsert at least eight raw-material rows (`NL-001` through `NL-008`) with `loaiSanPham = "Nguyên liệu thô"` and `donViTinh = "kg"`, so a fresh database has data available for the new dropdown.

#### Scenario: Idempotent seed run

- **WHEN** the seed script runs against a database that already contains some of these rows
- **THEN** existing rows are updated in place (by `maSanPham`) and missing rows are inserted, with no duplicate-key errors and no other data lost.

#### Scenario: Initial seed run

- **WHEN** the seed script runs against an empty database
- **THEN** at least eight raw-material rows are present afterwards, each with `loaiSanPham = "Nguyên liệu thô"`.

### Requirement: Cascading Dropdown Wizard

The Material Evaluation creation UI SHALL present three cascading selects (Product → Lot → Package) wired to the new endpoints, plus a numeric quantity input bounded by the chosen package's current stock. Selecting a parent value SHALL reset the dependent child selects.

#### Scenario: Cascade resets on parent change

- **WHEN** the user changes the selected Product after having already chosen a Lot and Package
- **THEN** the Lot and Package selects clear their current values and become disabled until a new Lot is chosen.

#### Scenario: Quantity bounded by stock

- **WHEN** the user enters a quantity greater than the chosen package's `soLuong`
- **THEN** an inline validation error is shown and the form cannot be submitted until the value is reduced.

#### Scenario: Disabled children before parent selected

- **WHEN** no Product is chosen
- **THEN** the Lot and Package selects are disabled and show no options.
