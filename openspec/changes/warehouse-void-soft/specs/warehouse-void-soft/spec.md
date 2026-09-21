## ADDED Requirements

### Requirement: Soft-void receipt

The system SHALL allow an authorized user to void a `WarehouseReceipt` via `POST /warehouse-receipts/:id/void` with a required non-empty `voidReason`. The operation SHALL set `isVoided=true`, `voidReason`, `voidedAt=now()`, `voidedBy=userId`, and reverse stock by decrementing `lot_products.soLuong` per `SUM(soLuongThucTe)` per `lotProductId` inside the same transaction, guarded by `WHERE soLuong >= qty` (reject with 400 if insufficient stock). `YCCC/YCMH/plan` status SHALL NOT change. The slip SHALL remain readable for audit.

#### Scenario: Void active receipt with sufficient stock
- **WHEN** client POSTs `/warehouse-receipts/:id/void` with `{"voidReason":"nhập trùng YCCC PN-46"}` and the caller has `warehouse-receipts:DELETE` and the receipt is not already voided and every `lotProduct.soLuong >= requiredQty`
- **THEN** system responds 200 with the updated receipt (`isVoided=true`, `voidReason`, `voidedAt`, `voidedBy` populated) and each affected `lotProduct.soLuong` is decremented by the receipt's per-package sum

#### Scenario: Void rejected when stock insufficient
- **WHEN** client voids a receipt whose `SUM soLuongThucTe` for a `lotProductId` exceeds current `lotProduct.soLuong`
- **THEN** system responds 400 with a message naming the package and `cần N còn M`

#### Scenario: Void requires reason and permission
- **WHEN** client POSTs void without `voidReason` or without `warehouse-receipts:DELETE`
- **THEN** system responds 400 (validation) or 403/401 respectively, and no stock change occurs

#### Scenario: Void idempotency
- **WHEN** client voids an already-voided receipt
- **THEN** system responds 409 `Already voided` with no additional stock change

### Requirement: Soft-void issue

The system SHALL allow an authorized user to void a `WarehouseIssue` via `POST /warehouse-issues/:id/void` with required `voidReason`, setting `isVoided/voidReason/voidedAt/voidedBy` and reversing stock by incrementing `lot_products.soLuong` per package sum inside the same transaction (no `gte` guard needed for increment, but load and sum remain).

#### Scenario: Void active issue
- **WHEN** client POSTs `/warehouse-issues/:id/void` with valid `voidReason` and `warehouse-issues:DELETE` permission
- **THEN** system responds 200 with updated issue and each `lotProduct.soLuong` incremented by the issue's per-package sum

#### Scenario: Void issue requires reason
- **WHEN** client POSTs void without `voidReason`
- **THEN** system responds 400 and no stock change occurs

### Requirement: Unvoid with guard

The system SHALL allow `POST /:id/unvoid` for both receipt and issue to restore a voided slip. Unvoid SHALL set `isVoided=false` and clear `voidReason/voidedAt/voidedBy`, and reverse the void's stock effect in the same transaction, guarded by `WHERE soLuong >= qty` when the reversal is a decrement (receipt unvoid increments stock — no guard; issue unvoid decrements stock — guard). Already-active slip SHALL return 409.

#### Scenario: Unvoid receipt restores stock
- **WHEN** client POSTs `/warehouse-receipts/:id/unvoid` for a voided receipt
- **THEN** system increments each `lotProduct.soLuong` by the receipt's per-package sum and clears void fields

#### Scenario: Unvoid issue blocked when stock insufficient
- **WHEN** client unvoids an issue whose decrement would make `lotProduct.soLuong` negative
- **THEN** system responds 400 `cần N còn M` and leaves the slip voided

### Requirement: List and detail hide voided by default

`GET /warehouse-receipts` and `GET /warehouse-issues` SHALL exclude `isVoided=true` slips by default. `GET ...?includeVoided=true` SHALL include them. `GET /:id` SHALL return a voided slip with `isVoided` fields visible (and when `includeVoided` is supported, the tab pass it for audit). Counts, pagination, and inventory/stock aggregations SHALL exclude voided slips unless explicitly including voided.

#### Scenario: Default list hides voided
- **WHEN** client GETs `/warehouse-receipts?page=1&limit=10` without `includeVoided`
- **THEN** response contains no slip with `isVoided=true` and `pagination.total` excludes voided

#### Scenario: Audit list includes voided
- **WHEN** client GETs `/warehouse-receipts?includeVoided=true`
- **THEN** response includes both active and voided slips, each voided slip has `isVoided`, `voidReason`, `voidedAt`, `voidedBy`

### Requirement: Inventory excludes voided slips

Stock figures derived from receipts/issues (inventory overview, lot product balances used for guards) SHALL exclude slips where `isVoided=true`.

#### Scenario: Inventory after void
- **WHEN** a receipt contributing 10 units to `lotProduct X` is voided
- **THEN** subsequent inventory queries for `X` reflect 10 fewer units than before the void

### Requirement: Authorization and validation for void

Void/unvoid endpoints SHALL require `requireRule('warehouse-receipts','DELETE')` and `requireRule('warehouse-issues','DELETE')` respectively, and SHALL validate `voidReason` via `voidReceiptSchema`/`voidIssueSchema` (non-empty trimmed string, max 500 chars).

#### Scenario: Unauthorized void
- **WHEN** a user without `warehouse-*:DELETE` calls void/unvoid
- **THEN** system responds 403

### Requirement: Frontend void interaction and audit display

`WarehouseReceiptTab` and `WarehouseIssueTab` SHALL offer a `Vô hiệu hóa` action (via `CancelWithReasonModal`) for any slip (including `isLocked`), show a dimmed row with `Đã vô hiệu` badge when `isVoided`, provide a filter for `Đã vô hiệu` (`includeVoided` toggle), and keep detail/print views showing void metadata and a `ĐÃ VÔ HIỆU` watermark in `WarehouseSlipPrintView`. Frontend services SHALL expose `voidWarehouseReceipt/Issue(id, {voidReason})` and `unvoid` counterparts.

#### Scenario: User voids from tab
- **WHEN** user clicks `Vô hiệu hóa` on a slip, enters a reason, and confirms
- **THEN** the slip becomes dimmed with badge, disappears from default list unless `includeVoided` is on, and a subsequent `GET /:id` shows `isVoided` metadata

#### Scenario: Print watermark
- **WHEN** user prints a voided slip via `WarehouseSlipPrintView`
- **THEN** the print overlay shows a `ĐÃ VÔ HIỆU` watermark
