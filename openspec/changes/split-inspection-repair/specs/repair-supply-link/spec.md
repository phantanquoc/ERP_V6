# repair-supply-link — Delta Spec

## ADDED Requirements

### Requirement: RepairSupplyLink bridges repair Int to SupplyRequest cuid and traces triggered chain

`RepairSupplyLink` SHALL exist in `@@schema("common")`, `@@map("repair_supply_links")`, `id String @id @default(cuid())`, `repairRequestId Int FK Cascade -> RepairRequest`, `repairRequestItemId String? FK SetNull -> RepairRequestItem`, `supplyRequestId String @db.VarChar(30)` (validated in service via `prisma.supplyRequest.findUnique`, no DB FK cross-type), `supplyRequestItemId String? @db.VarChar(30)`, `soLuong Decimal(12,3)?`, `ghiChu TEXT?`, `createdById String? @db.VarChar(30)`, `@@index([repairRequestId])`, `@@index([repairRequestItemId])`, `@@index([supplyRequestId])`, `@@unique([repairRequestItemId, supplyRequestId])` (when `repairRequestItemId` is non-null; header-level links with `repairRequestItemId = null` are allowed to coexist). Service SHALL reject link when `requestType = KIEM_TRA`; SHALL reject duplicate per unique constraint with `409`; SHALL validate `supplyRequestId` exists.

Rationale (vi): `RepairSupplyLink` chi luu goc YCCC (`supplyRequestId`) de giu single source of truth, khong duplicate FK toi YCBS/YCMH. Chuoi sau kho xu ly YCCC vuot qua `SupplyRequest`: khi `SupplyRequestItem.fulfillmentStatus = "Thieu ton kho"`, kho tao `SupplyRequestDecision { decision = "Chuyen thu mua", triggeredReplenishmentRequestId }` -> `ReplenishmentRequest` (YCBS, `YC-BS-YYYY-NNN`, `trangThai "Cho bao gia" -> "Da chuyen mua hang"`) -> `ReplenishmentRequest.convertedPurchaseRequestId` -> `PurchaseRequest` (YCMH, `sourceType SHORTAGE|REORDER`, `trangThai "Cho duyet"...`) -> `InboundPlan` (`KH-NH-YYYY-NNN`, 1-1 voi YCMH) -> `WarehouseReceipt`/`LotProduct` -> `OutboundPlan` (`KH-XH-YYYY-NNN`) + `WarehouseIssue` hoan tra cho YCCC goc. Toan bo nac sau YCCC duoc truy vet qua FK san co `triggeredReplenishmentRequestId` (SetNull, indexed) va `convertedPurchaseRequestId` (@unique, indexed), khong can them cot tren `RepairSupplyLink`.

#### Scenario: Link supply at header level

- **WHEN** `POST /:id/supply-links` with `{ supplyRequestId: '<SupplyRequest cuid>' }` on `SUA_CHUA` row
- **THEN** `201` with link persisted, `repairRequestItemId = null`, and `GET /:id/supply-links` includes it with `supplyRequest { maYeuCau, trangThai }` hydrated

#### Scenario: Link supply per item

- **WHEN** `POST /:id/supply-links` with `{ supplyRequestId: '<id>', repairRequestItemId: '<itemId>' }`
- **THEN** link is persisted with `repairRequestItemId` set and unique per pair

#### Scenario: Duplicate per-item link rejected

- **WHEN** second `POST` with same `repairRequestItemId` and `supplyRequestId`
- **THEN** `409 ConflictError` and no row created

#### Scenario: Invalid supplyRequestId rejected

- **WHEN** `POST` with `supplyRequestId` that does not exist
- **THEN** `404 NotFoundError` with Vietnamese message

#### Scenario: KIEM_TRA rejects supply link

- **WHEN** `POST /:id/supply-links` on `KIEM_TRA`
- **THEN** `400 ValidationError` and no row created

### Requirement: Supply link list and reverse lookup

`GET /:id/supply-links` SHALL return links ordered by `createdAt DESC` with `supplyRequest` summary (`id, maYeuCau, trangThai, mucDoUuTien`) hydrated when available. `GET /:id/supply-chain` (or extended `GET /:id/supply-links` with `?includeChain=true`) SHALL return each link enriched with `chain: { supplyRequest, replenishmentRequest: ReplenishmentRequest | null, purchaseRequest: PurchaseRequest | null, inboundPlan: InboundPlan | null, warehouseIssue: WarehouseIssue | null }` resolved via `SupplyRequest -> SupplyRequestItem -> SupplyRequestDecision.triggeredReplenishmentRequestId -> ReplenishmentRequest -> ReplenishmentRequest.convertedPurchaseRequestId -> PurchaseRequest` (latest decision per item where `triggeredReplenishmentRequestId != null` ordered by `decidedAt DESC`). `DELETE /:id/supply-links/:linkId` SHALL remove the link (not the SupplyRequest itself nor any triggered YCBS/YCMH) and return `200`. Reverse lookup: when `GET /supply-requests/:id` is queried, if any `RepairSupplyLink.supplyRequestId = :id`, the response meta MAY include `repairLinks: [{ repairRequestId, maYeuCau, trangThai }]` for display chip "Phuc vu SC #YC-SC-...". Additionally, `GET /replenishment-requests/:id/repair-links` and `GET /purchase-requests/:id/repair-links` (or enriched `repairLinks` meta on their detail endpoints) SHALL return reverse links resolved via `ReplenishmentRequest <- SupplyRequestDecision.triggeredReplenishmentRequestId <- SupplyRequestItem.supplyRequestId -> RepairSupplyLink` (and for YCMH via extra hop `ReplenishmentRequest.convertedPurchaseRequestId`), so that Supply / Purchasing / Warehouse tabs all show chip "Phuc vu SC #YC-SC-...".

#### Scenario: Unlink preserves SupplyRequest and triggered chain

- **WHEN** `DELETE /:id/supply-links/:linkId` on an existing link whose YCCC has already triggered YCBS/YCMH
- **THEN** link row is deleted, `SupplyRequest`, `ReplenishmentRequest`, and `PurchaseRequest` rows are unchanged, and subsequent `GET /:id/supply-chain` no longer includes that chain

#### Scenario: Reverse lookup from SupplyRequest

- **WHEN** `GET /supply-requests/:id` where a `RepairSupplyLink.supplyRequestId = :id` exists
- **THEN** response includes `repairLinks: [{ repairRequestId, maYeuCau, trangThai }]` (at least one entry)

### Requirement: Supply chain traceability

`GET /repair-requests/:id/supply-chain` SHALL return the full chain for each `RepairSupplyLink` of the repair request. Each chain entry SHALL contain `supplyRequest { id, maYeuCau, trangThai, createdAt }`, `replenishmentRequest: { id, maYeuCau, trangThai, phanLoaiGroup, createdAt } | null`, `purchaseRequest: { id, maYeuCau, trangThai, sourceType, createdAt } | null`, `inboundPlan: { id, maKeHoach, trangThai } | null`, `warehouseIssue: { id, maPhieu, trangThai } | null`, and `decisionsMeta: { shortageQty, reason, decidedAt } | null`. YCBS/YCMH/InboundPlan/WarehouseIssue are nullable when that tier has not been triggered yet. The service SHALL resolve chains in batch (`WHERE supplyRequestId IN (...)`) using existing indexes on `triggeredReplenishmentRequestId`, `convertedPurchaseRequestId`, and `supplyRequestId` to avoid N+1. `GET /repair-requests/:id` detail MAY embed the same `supplyChain` array alongside `supplyLinks` for single-call hydration. Unlink/delete semantics: deleting a `RepairSupplyLink` SHALL NOT cascade to YCBS/YCMH/InboundPlan/WarehouseReceipt/WarehouseIssue.

#### Scenario: Chain with only YCCC (no shortage)

- **WHEN** `GET /:id/supply-chain` for a repair whose linked YCCC has `SupplyRequestItem.fulfillmentStatus != "Thieu ton kho"` and no `SupplyRequestDecision` with `triggeredReplenishmentRequestId`
- **THEN** response returns one chain entry with `supplyRequest` populated and `replenishmentRequest = null`, `purchaseRequest = null`, `inboundPlan = null`, `warehouseIssue = null`

#### Scenario: Chain YCCC -> YCBS (awaiting purchase conversion)

- **WHEN** `GET /:id/supply-chain` where warehouse decided `decision = "Chuyen thu mua"`, `triggeredReplenishmentRequestId` points to a `ReplenishmentRequest` with `trangThai = "Cho bao gia"` and `convertedPurchaseRequestId = null`
- **THEN** response returns `replenishmentRequest` populated (`maYeuCau` like `YC-BS-YYYY-NNN`, `trangThai = "Cho bao gia"`) and `purchaseRequest = null`, `decisionsMeta` includes `shortageQty` and `reason`

#### Scenario: Full chain YCCC -> YCBS -> YCMH -> WarehouseIssue

- **WHEN** `GET /:id/supply-chain` where YCBS has `trangThai = "Da chuyen mua hang"`, `convertedPurchaseRequestId` points to a `PurchaseRequest` (`trangThai = "Da duyet"` or later), an `InboundPlan` exists (`purchaseRequestId = PurchaseRequest.id`), and a `WarehouseIssue` has been issued for the original `SupplyRequest`
- **THEN** response returns all tiers populated: `supplyRequest`, `replenishmentRequest` (`"Da chuyen mua hang"`), `purchaseRequest` (`maYeuCau` like `YC-MH-...`, `sourceType`, `trangThai`), `inboundPlan` (`maKeHoach` like `KH-NH-...`), `warehouseIssue` (`maPhieu`), each with `maYeuCau`/`trangThai`/`createdAt`, and FE can render timeline `YCCC -> YCBS -> YCMH -> Nhap kho -> Xuat kho`

#### Scenario: Reverse lookup from YCMH traces back to RepairRequest

- **WHEN** `GET /purchase-requests/:id/repair-links` (or `GET /purchase-requests/:id` with `repairLinks` meta) where `:id` is a `PurchaseRequest` created via `ReplenishmentRequest.convertedPurchaseRequestId` from a YCBS that was triggered by a `SupplyRequest` linked to a `RepairRequest`
- **THEN** response returns `repairLinks: [{ repairRequestId, maYeuCau, trangThai }]` identifying the originating repair request, enabling chip "Phuc vu SC #YC-SC-..." on the Purchasing tab; same holds for `GET /replenishment-requests/:id/repair-links`

#### Scenario: Reverse lookup from YCBS traces back to RepairRequest

- **WHEN** `GET /replenishment-requests/:id/repair-links` where `:id` is a `ReplenishmentRequest` whose `id` appears as `SupplyRequestDecision.triggeredReplenishmentRequestId` for a `SupplyRequest` linked via `RepairSupplyLink`
- **THEN** response returns `repairLinks` with the originating repair request(s)
