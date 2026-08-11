## MODIFIED Requirements

### Requirement: Update a warehouse receipt with transactional stock reversal

The system SHALL allow an authorized user to update an existing warehouse receipt's set of lines. All stock mutations MUST occur inside a single `prisma.$transaction`, resolving the update as a line diff per the multi-item capability: removed lines reverse their stock impact, added lines apply theirs, and modified lines reverse-then-apply against their (possibly changed) `lotProduct`. Denormalized fields and each surviving line's `soLuongTruoc`/`soLuongSau` MUST be recomputed from current stock at update time, computed sequentially across lines touching the same package; earlier or later slips MUST NOT be retroactively recalculated. Header-level quantity totals MUST be recomputed from the resulting lines.

#### Scenario: Update receipt quantity on the same lot product
- **WHEN** an authorized user updates a receipt line's `soLuongThucTe` from 10 to 15 on the same `lotProduct`, with no other lines
- **THEN** the system subtracts the original 10 and adds 15, leaving the `lotProduct.soLuong` net +5 compared to before the edit
- **AND** the line's `soLuongTruoc`/`soLuongSau` reflect the recomputed values and the operation commits atomically

#### Scenario: Update receipt to a different lot product
- **WHEN** an authorized user changes a receipt line's warehouse/lot/product to a different `lotProduct`
- **THEN** the system subtracts the original quantity from the old `lotProduct` and adds the new quantity to the new `lotProduct` within one transaction
- **AND** that line's denormalized `tenKho`/`tenLo`/`tenSanPham`/`donViTinh` are updated to match the new target

### Requirement: Delete a warehouse receipt with transactional stock reversal

The system SHALL allow an authorized user to delete an existing warehouse receipt. Within a single `prisma.$transaction`, the system MUST subtract each line's `soLuongThucTe` back from its respective `lotProduct.soLuong`, processed sequentially for lines sharing a package, and then remove the receipt header and its lines by cascade.

#### Scenario: Delete a receipt reverses its stock addition
- **WHEN** an authorized user deletes a single-line receipt that added 20 units
- **THEN** the system subtracts 20 from the `lotProduct.soLuong` and deletes the receipt and its line in one transaction

#### Scenario: Delete a multi-line receipt reverses every line
- **WHEN** an authorized user deletes a receipt with three lines against three different packages
- **THEN** the system subtracts each line's quantity from its own package before removing the header

### Requirement: Update a warehouse issue with transactional stock reversal

The system SHALL allow an authorized user to update an existing warehouse issue's set of lines. Within a single `prisma.$transaction`, the update MUST resolve as a line diff: removed lines add their `soLuongThucTe` back to their `lotProduct`, added lines subtract theirs, and modified lines reverse-then-apply against their (possibly changed) `lotProduct`. Denormalized fields and each surviving line's `soLuongTruoc`/`soLuongSau` MUST be recomputed sequentially from current stock at update time. The aggregate-by-package stock validation (see the multi-item capability) MUST run across the fully-resolved diff before any write. Header-level quantity totals MUST be recomputed from the resulting lines.

#### Scenario: Update issue quantity on the same lot product
- **WHEN** an authorized user updates an issue line's `soLuongThucTe` from 5 to 8 on the same `lotProduct`, with no other lines
- **THEN** the system adds back the original 5 and subtracts 8, leaving `lotProduct.soLuong` net -3 compared to before the edit, committed atomically

### Requirement: Delete a warehouse issue with transactional stock reversal

The system SHALL allow an authorized user to delete an existing warehouse issue. Within a single `prisma.$transaction`, the system MUST add each line's `soLuongThucTe` back to its respective `lotProduct.soLuong`, processed sequentially for lines sharing a package, and then remove the issue header and its lines by cascade.

#### Scenario: Delete an issue refunds its stock deduction
- **WHEN** an authorized user deletes a single-line issue that removed 12 units
- **THEN** the system adds 12 back to the `lotProduct.soLuong` and deletes the issue and its line in one transaction

### Requirement: Negative-stock guard on edit and delete

The system MUST reject any update or delete that would drive any touched `lotProduct.soLuong` below zero, evaluated across the fully-resolved set of lines per the aggregate stock-validation rule. On violation, the system MUST throw `ValidationError` and the transaction MUST roll back so no stock or slip changes persist, for any line. For warehouse issues, the rejection message MUST convey insufficient stock (e.g. "Số lượng tồn kho không đủ...").

#### Scenario: Editing an issue upward beyond available stock is rejected
- **WHEN** an authorized user edits an issue line so its new `soLuongThucTe` exceeds what the target `lotProduct` can supply after reversing the original deduction
- **THEN** the system throws `ValidationError`, rolls back the transaction, and leaves stock and every line of the issue unchanged

#### Scenario: Deleting a receipt whose stock was already issued out is rejected
- **WHEN** an authorized user deletes a receipt but reversing any of its lines' additions would make that line's `lotProduct.soLuong` negative
- **THEN** the system throws `ValidationError`, rolls back, and leaves stock and the receipt unchanged

#### Scenario: One line's guard failure blocks the whole multi-line edit
- **WHEN** an edit's resolved line diff would drive any single package's balance below zero, even if other packages in the same edit are fine
- **THEN** the system throws `ValidationError` and no line in the edit is written

### Requirement: Lock special slips from edit and delete

The system MUST prevent editing or deleting slips that are managed by another workflow. Locking is evaluated at the header, independent of line count: a receipt or issue linked to a supply request (`supplyRequestId != null`) MUST be locked. A warehouse issue that is auto-generated by a `MaterialEvaluation` (has a linked `materialEvaluation`) MUST be locked. Attempting to update or delete a locked slip MUST throw `ConflictError` with a message identifying the reason (supply-request-linked, or material-evaluation-generated). Stock and records MUST remain unchanged. Locking MUST NOT be evaluated per line; a slip with any locked trigger is locked in its entirety.

#### Scenario: Editing a supply-request-linked receipt is blocked
- **WHEN** an authorized user attempts to update or delete a receipt with a non-null `supplyRequestId`, regardless of how many lines it has
- **THEN** the system throws `ConflictError` ("Không thể sửa/xóa phiếu gắn với yêu cầu cung cấp") and makes no changes

#### Scenario: Editing a material-evaluation-generated issue is blocked
- **WHEN** an authorized user attempts to update or delete an issue that has a linked `materialEvaluation`
- **THEN** the system throws `ConflictError` ("Không thể sửa/xóa phiếu xuất do đánh giá nguyên liệu tạo") and makes no changes

### Requirement: getAll exposes an isLocked flag

The list endpoints for receipts and issues MUST return an `isLocked` boolean per record, at the header level, alongside header-level quantity totals. For receipts, `isLocked = (supplyRequestId != null)`. For issues, `isLocked = (supplyRequestId != null) OR (linked materialEvaluation exists)`; the issue query MUST include the `materialEvaluation` relation (selecting only its id) to compute this.

The list response MUST also include every commodity line of each slip, ordered by `stt` ascending. Lines are part of the list contract, not an optional detail: the list table renders one row per commodity line, and the deprecated flat header columns mirror only the first line, so a list response without lines silently hides every line after the first.

#### Scenario: List marks locked slips
- **WHEN** a client fetches all receipts or issues
- **THEN** each record includes `isLocked`, true for supply-request-linked slips and for material-evaluation-generated issues, false otherwise
- **AND** each record includes its header-level quantity total and line count

#### Scenario: List response carries every line
- **GIVEN** a slip stored with two commodity lines
- **WHEN** a client fetches all receipts or issues
- **THEN** that record's `items` array contains both lines, ordered by `stt` ascending
- **AND** no line is represented only by the deprecated flat header columns
