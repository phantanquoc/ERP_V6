# warehouse-issue-auto-suggest Specification

## Purpose
Speeds up creating warehouse issue slips from a supply request by auto-suggesting the best warehouse/lot/package per line, supporting package splitting, and allowing inline edits in the confirmation step.

## Requirements

### Requirement: Auto-suggest best package for each supply request line

When `CreateWarehouseIssueModal` is opened with a supply request, the system SHALL auto-suggest a `warehouseId`/`lotId`/`lotProductId` for each pending line by scanning all loaded `warehouses[].lots[].lotProducts[]` and filtering with the existing `productMatches(tenGoi, lotProduct)` diacritic-insensitive logic. Candidates SHALL be ranked: packages with `soLuong >= remaining` first, then by largest `soLuong` descending, then by `maKien` ascending (FIFO). The top-ranked candidate SHALL be pre-filled into the row if one exists.

#### Scenario: Line with sufficient stock is auto-filled

- **WHEN** the modal opens for a supply request that has a line with `remaining = 10` and there exists a matching package with `soLuong = 20`
- **THEN** that row is pre-filled with the package's `warehouseId`/`lotId`/`lotProductId`

#### Scenario: Line with no sufficient package picks largest available

- **WHEN** the modal opens and no matching package has `soLuong >= remaining` but two packages have `soLuong = 8` and `soLuong = 5`
- **THEN** the row is pre-filled with the package that has `soLuong = 8` (largest)

#### Scenario: No matching package leaves row unfilled

- **WHEN** no `LotProduct` matches the line's `tenGoi` via `productMatches`
- **THEN** the row remains with empty `warehouseId`/`lotId`/`lotProductId` and a warning badge is shown

### Requirement: Bulk auto-fill and clear actions

The modal header SHALL expose two actions: "Auto-fill all" and "Clear suggestions". "Auto-fill all" SHALL apply the ranking logic to every row that has a `supplyRequestItemId` and is currently unfilled or stale; "Clear suggestions" SHALL reset `warehouseId`/`lotId`/`lotProductId` for all rows that were auto-filled.

#### Scenario: Bulk auto-fill fills all rows

- **WHEN** the user clicks "Auto-fill all"
- **THEN** every eligible row is filled with its top-ranked package

### Requirement: Per-row and aggregate stock indicators

Each row SHALL display the selected package's current stock (`soLuong` + `donViTinh`) and, when insufficient, a warning that remaining exceeds stock. The header SHALL display an aggregate summary such as count of auto-filled rows and, when available, total stock per item name.

#### Scenario: Insufficient stock shows warning

- **WHEN** a row's `remaining` is `100` and the selected package has `soLuong = 40`
- **THEN** the row shows an insufficient-stock warning indicating the shortfall

### Requirement: Split a line across multiple packages

When a single supply-request line's `remaining` exceeds the stock of its suggested package, the row SHALL expose a "Split package" action. Activating it SHALL duplicate the row with the same `supplyRequestItemId`, keeping the original row's allocation and creating a new row whose suggested package is the next-best unused candidate for that item. The user MAY repeat splitting to cover the full remaining quantity across N packages.

#### Scenario: Splitting creates a second row for the same item

- **WHEN** a line has `remaining = 100` and the best package has `soLuong = 40`, and the user clicks "Split package"
- **THEN** a second row appears with the same `supplyRequestItemId` and is auto-filled with the next-best package

#### Scenario: Submit aggregates split rows per item

- **WHEN** the user submits the modal with two rows sharing the same `supplyRequestItemId` and quantities `40` and `60`
- **THEN** the frontend sends a single `BatchFulfillLine` for that `itemId` with `fulfilledQty = 60` (sum) while the backend creates a `WarehouseIssue` with two `WarehouseIssueItem` rows (one per package) in one transaction

### Requirement: Confirm step is editable with live validation

The confirmation overlay SHALL render an editable table where `soLuongThucTe` (SL TT) is a number input and package (Kiện) is a `LotProductCombobox` per row. Edits SHALL validate live: quantity MUST be `> 0` and `≤` the selected package's `soLuong`; a mismatch between planned (`soLuongYeuCau`) and actual (`soLuongThucTe`) SHALL require `lyDoChenhLech` when in planned mode. The Confirm action SHALL be disabled while any row exceeds stock or the required reason is missing.

#### Scenario: Over-stock disables confirm

- **WHEN** the user edits a confirm row's quantity to exceed the selected package's stock
- **THEN** the row shows an over-stock error and the Confirm button is disabled

#### Scenario: Plan/actual mismatch requires reason

- **WHEN** at least one row has `soLuongYeuCau ≠ soLuongThucTe` and `lyDoChenhLech` is empty
- **THEN** the Confirm button is disabled and a validation message is shown
