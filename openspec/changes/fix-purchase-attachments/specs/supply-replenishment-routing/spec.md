# Spec Delta

## MODIFIED Requirements

### Requirement: Shortage grouping produces one replenishment purchase request per goods class
When warehouse fulfillment records a shortage for one or more `SupplyRequestItem` rows (single-line or batch path), the system SHALL group shortage lines by normalized `phanLoai` into buckets (`NVL`-family, equipment, other) and create exactly one `PurchaseRequest` per non-empty bucket instead of one per line. The created PR SHALL have `sourceType = 'SHORTAGE'`, `trangThai = 'Chờ báo giá'`, `isQuickPurchase = false`, `supplyRequestId` set to the parent SR, one `PurchaseRequestItem` per shortage line, and a `mucDichYeuCau` naming the SR code. The PR creation, the `SupplyRequestItem.fulfilledQty/fulfillmentStatus` updates, and all `SupplyRequestDecision` inserts SHALL commit inside one Prisma transaction; no shortage PR or decision SHALL persist if any part fails.

#### Scenario: Batch with two material lines and one equipment line creates two PRs
- **WHEN** a warehouse keeper batch-fulfills three shortage lines — two with `phanLoai` "Nguyên liệu" and one with "Thiết bị"
- **THEN** the system creates exactly two `PurchaseRequest` rows: one with two items (materials) and one with one item (equipment), both `sourceType = 'SHORTAGE'`, `trangThai = 'Chờ báo giá'`, linked to the same `supplyRequestId`

#### Scenario: Single-line shortage creates one PR
- **WHEN** `partialFulfill` records a shortage on one line
- **THEN** exactly one `PurchaseRequest` containing that line is created

#### Scenario: No shortage creates no PR
- **WHEN** fulfillment covers the full requested quantity for every line
- **THEN** no `PurchaseRequest` is created and decisions read "Cấp đủ"

#### Scenario: Transaction rollback on failure
- **WHEN** PR creation throws inside the fulfillment transaction
- **THEN** no `SupplyRequestDecision` rows and no `fulfilledQty` updates persist

### Requirement: Sub-department-scoped replenishment routing and notification
When a replenishment PR is created, the `PURCHASE_REQUEST_CREATED` notification SHALL resolve recipients by goods class: material buckets SHALL notify `SUBDEPT_PURCHASING_MATERIALS`, equipment buckets SHALL notify `SUBDEPT_PURCHASING_EQUIPMENT`, and unmapped buckets SHALL fall back to all of `DEPT_PURCHASING`. Quick/manual PRs keep existing recipient rules.

#### Scenario: Material shortage notifies the materials sub-department
- **WHEN** a shortage PR in the "Nguyên liệu" bucket is created
- **THEN** only employees of `SUBDEPT_PURCHASING_MATERIALS` (plus direct targets) receive the notification

#### Scenario: Unmapped class falls back to the whole department
- **WHEN** a shortage PR carries a `phanLoai` outside the mapped taxonomy
- **THEN** recipients resolve to all active employees of `DEPT_PURCHASING`

### Requirement: Server-side purchase request filtering by goods class
`GET /api/purchase-requests` SHALL accept an optional `phanLoai` query parameter that filters to requests whose items match the class, so the purchasing UI does not fetch and filter client-side.

#### Scenario: Materials tab asks only for material-class requests
- **WHEN** the materials purchasing tab calls `GET /api/purchase-requests?phanLoai=Nguyên vật liệu`
- **THEN** the response contains only PRs having at least one item in that class, and `pagination.total` reflects the filtered count

### Requirement: Replenishment PR ownership and decided-by attribution
A replenishment `PurchaseRequest` SHALL carry `employeeId`, `maNhanVien`, `tenNhanVien` copied from the linked `SupplyRequest` (the original requester). `SupplyRequestDecision.decidedByEmployeeId` SHALL record the warehouse employee who routed the shortage. `SupplyRequestDecision.triggeredPurchaseRequestId` SHALL reference the replenishment PR and be persisted as a real foreign key (`onDelete: SetNull`) with an index.

#### Scenario: Ownership reflects the requester
- **WHEN** warehouse keeper B routes a shortage from supply request created by employee A
- **THEN** the resulting PR has `employeeId = A` and the decision row has `decidedByEmployeeId = B`

## ADDED Requirements

### Requirement: Chain attachments are aggregated on every replenishment and purchase read
Every read of a `ReplenishmentRequest` or `PurchaseRequest` (list and detail) SHALL return `aggregatedAttachments: { own: string[], ybs: string[]|null, yccc: string[], all: string[] }` resolved from the chain `YCCC (SupplyRequest.tepDinhKem/fileKemTheo) → YCBS (ReplenishmentRequest.tepDinhKem/fileKemTheo) → YCMH (PurchaseRequest.tepDinhKem/fileKemTheo)` via `ReplenishmentRequest.convertedPurchaseRequestId` and `SupplyRequestDecision` links. `all` is deduplicated, ordered `yccc → ybs → own`, and is the set the UI SHALL render by default; sub-arrays are for audit. Warehouse receipt/inbound views for the same ticket SHALL reuse the same `all` set.

#### Scenario: YCBS detail carries YCCC files in aggregated view
- **WHEN** a YCBS linked to a YCCC with 2 files is fetched
- **THEN** `aggregatedAttachments.all` contains those 2 YCCC files plus any YCBS `own` files, and the YCBS detail renders the full count

#### Scenario: YCMH created from YCBS aggregates YCCC+Y CBS
- **WHEN** a YCMH converted from a YCBS is fetched
- **THEN** `aggregatedAttachments` contains `yccc` (from the parent SR), `ybs` (from the YCBS row), and `own` (from the YCMH row) and `all` is their union
