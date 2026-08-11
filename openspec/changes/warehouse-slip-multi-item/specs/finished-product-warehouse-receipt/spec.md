## MODIFIED Requirements

### Requirement: Bulk warehouse receipt across machines by fry-batch

The system SHALL expose an endpoint (Route→Controller→Service→Prisma, registered in ROUTE_MAP, no generic `PATCH /status`) that accepts `{ maChienList: string[], warehouseId: string, lotId: string }` and atomically receives output for ALL `FinishedProduct` rows belonging to the listed fry-batches into a SINGLE warehouse and SINGLE lot. For each `maChien`, the service SHALL sum the 8 grade weights across every machine of that mẻ, build receipt LINES using the existing `GRADE_LABELS` convention `"{tenHangHoa} - {label}"` skipping zero-weight grades, and create ONE `WarehouseReceipt` header per `maChien` whose lines are that mẻ's nonzero grades. Each header SHALL receive exactly one `maPhieuNhap` from the yearly code generator; codes MUST NOT be generated per grade. The service SHALL set `daNhapKho = true` for every affected `FinishedProduct`. The whole operation MUST run in one `prisma.$transaction`. Responses MUST use the standard shape and Vietnamese messages; errors MUST use typed errors from `@utils/errors`.

Because several grades of one mẻ may resolve to the same `LotProduct`, per-line stock snapshots MUST be computed sequentially so each line's opening balance is the previous line's closing balance for that package.

#### Scenario: Successful bulk receipt
- **WHEN** the user submits `{ maChienList: ["MC001","MC002"], warehouseId, lotId }` and all referenced rows have `daNhapKho = false`
- **THEN** the system creates one `WarehouseReceipt` header per mẻ, each with one line per nonzero grade, increments each SKU's `LotProduct.soLuong`, sets `daNhapKho = true` on every `FinishedProduct` of those mẻ, and returns `{ success: true }` with a Vietnamese message

#### Scenario: One slip per fry-batch, not one per grade
- **WHEN** a single `maChien` has five nonzero grades
- **THEN** the system creates exactly ONE `WarehouseReceipt` header with five lines and exactly one `maPhieuNhap`

#### Scenario: Sum across machines per fry-batch
- **WHEN** a `maChien` has 3 machines each with grade A weights 10/20/30
- **THEN** the bulk receipt produces ONE line for grade A with `soLuongThucTe = 60` for that mẻ

#### Scenario: Skip zero-weight grades after sum
- **WHEN** the sum of a particular grade across all machines of a mẻ is 0
- **THEN** no line is produced for that grade

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

#### Scenario: One code per header
- **WHEN** a bulk receipt spans three mẻ in the same calendar year
- **THEN** exactly three `maPhieuNhap` codes are generated, one per header, each produced by the yearly code generator and unique within the year

#### Scenario: Two lines on the same package chain their snapshots
- **WHEN** two grades of one mẻ resolve to the same `LotProduct`
- **THEN** the second line's `soLuongTruoc` equals the first line's `soLuongSau` and the package balance reflects both additions
