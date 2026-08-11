## MODIFIED Requirements

### Requirement: Transactional Material Evaluation Creation With Auto Stock-Out

When a Material Evaluation is created with a `lotProductId`, the system SHALL execute the following operations atomically inside a single Prisma transaction: (1) validate that the `LotProduct` exists and `soLuong >= khoiLuong`, (2) generate a unique stock-out code via the yearly code generator, (3) create a `WarehouseIssue` header whose `ghiChu` field begins with the literal prefix `"[TỰ ĐỘNG] Xuất nguyên liệu cho mẻ chiên "` followed by the `maChien` and date, together with exactly one `WarehouseIssueItem` line carrying the package, commodity snapshot, unit, quantity, and stock snapshots, (4) decrement `LotProduct.soLuong` by `khoiLuong`, and (5) create the `MaterialEvaluation` row with both foreign keys populated.

The quantity and stock snapshots MUST be written on the line, not on the header. The header MUST carry only the derived quantity total and line count. The `warehouseIssueId` foreign key on `MaterialEvaluation` remains a header reference and remains unique — one evaluation maps to one issue slip.

#### Scenario: Successful create with sufficient stock

- **WHEN** staff submit a Material Evaluation with `lotProductId = L1`, `khoiLuong = 25`, and `LotProduct.soLuong = 100`
- **THEN** the transaction commits, one `WarehouseIssue` header is created with exactly one line whose `soLuongThucTe = 25`, `soLuongTruoc = 100`, and `soLuongSau = 75`, `LotProduct.soLuong` becomes 75, the `MaterialEvaluation.warehouseIssueId` equals the new header's id, and `WarehouseIssue.ghiChu` starts with `"[TỰ ĐỘNG] Xuất nguyên liệu cho mẻ chiên "`.

#### Scenario: Insufficient stock rejected

- **WHEN** staff submit a Material Evaluation requesting more `khoiLuong` than the `LotProduct.soLuong`
- **THEN** the transaction rolls back, no `WarehouseIssue` header or line is created, the `LotProduct` is unchanged, and the API returns a validation error stating the available stock.

#### Scenario: LotProduct not found

- **WHEN** the submitted `lotProductId` does not match any `LotProduct` row
- **THEN** the transaction rolls back and the API returns HTTP 404 with a Vietnamese not-found message.

#### Scenario: Concurrent create from same package

- **WHEN** two clients submit Material Evaluations from the same `lotProductId` at the same time and the combined `khoiLuong` exceeds available stock
- **THEN** at most one transaction commits successfully; the other rolls back with an insufficient-stock error and `LotProduct.soLuong` reflects only the successful issue.

### Requirement: Material Evaluation Deletion Refunds Stock

When a Material Evaluation that has a linked `WarehouseIssue` is deleted, the system SHALL atomically delete the linked `WarehouseIssue` (header and its lines by cascade) and refund the issued quantity back to the source `LotProduct` (if it still exists), in addition to the existing cascade deletion of dependent `SystemOperation`, `FinishedProduct`, and `QualityEvaluation` rows by `maChien`.

The refunded quantity MUST be read from the issue's lines — either the single line's `soLuongThucTe` or the sum across lines — and MUST NOT be read from a header quantity column. Reading a quantity column that no longer exists on the header yields `undefined`, making the refund arithmetic `NaN`, which persists to `LotProduct.soLuong` without raising an error. The system MUST therefore assert that the refund amount is a finite number before writing it.

#### Scenario: Delete refunds source package

- **WHEN** staff delete a Material Evaluation that was created via the new wizard
- **THEN** the linked `WarehouseIssue` header and its lines are removed, the source `LotProduct.soLuong` is incremented by the quantity read from the issue's lines, and all dependent production rows for the same `maChien` are deleted in the same transaction.

#### Scenario: Refund amount is never NaN

- **WHEN** a Material Evaluation with a linked issue is deleted
- **THEN** the refunded quantity is a finite number matching the summed line quantities, and the resulting `LotProduct.soLuong` is a finite number

#### Scenario: Delete when source package no longer exists

- **WHEN** the Material Evaluation's `lotProductId` is `NULL` because the warehouse package was previously deleted
- **THEN** the deletion proceeds successfully, the linked `WarehouseIssue` (if still present) is removed, no refund is attempted, and no error is raised.

#### Scenario: Delete legacy evaluation without warehouse link

- **WHEN** a legacy Material Evaluation with `warehouseIssueId = NULL` is deleted
- **THEN** the deletion behaves exactly as before this change: only dependent production rows are cascaded, no warehouse operations are performed.
