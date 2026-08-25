## Context

The ERP currently fulfills a supply request (SupplyRequest + SupplyRequestItem) at the warehouse via `partialFulfill` / `batchFulfill`. When a line is short, the service creates a `PurchaseRequest` (`sourceType=SHORTAGE`, `trangThai=Chờ báo giá`) outside the fulfillment transaction, with the warehouse employee set as the PR owner, and then broadcasts `PURCHASE_REQUEST_CREATED` to the whole `DEPT_PURCHASING`. `PurchaseRequest.trangThai` is a free-form string; `PUT /:id` can jump `Chờ báo giá → Đã duyệt` directly, bypassing `submitForApproval`, and any transition to `Hoàn thành` is allowed without prior approval. `LotProduct.soLuong` is updated by writing an absolute value, not an atomic decrement, so concurrent issues can overdraw stock. Supply-request read/create routes still rely on bare `authenticate` (no `requireRule` + no ABAC). The purchasing UI splits NVL vs equipment by fetching 1000 PRs and filtering in memory via `supplier.phanLoaiNCC`.

Stakeholders: warehouse keepers (fulfillment), purchasing sub-teams (materials / equipment), requesters, admins/auditors. The decision is to reuse `PurchaseRequest` SHORTAGE as the "replenishment request" and make it an explicit named stage, not to add a new `ReplenishmentRequest` entity.

## Goals / Non-Goals

**Goals:**
- Make replenishment an explicit routing stage: shortage grouped by `phanLoai` → one `SHORTAGE` PR per group, owner = original requester, atomic with decision log, notified only to the purchasing sub-department that matches the goods class.
- Make the PR lifecycle branchless: `Chờ báo giá → Chờ duyệt → Đã duyệt → Hoàn thành` with a single allowed path per transition, enforced server-side.
- Remove stock races and catalog races: atomic stock decrement, upsert for `InternationalProduct`/`LotProduct`, DB uniqueness/checks where missing.
- Close ABAC/IDOR gaps on supply-request routes and fix the `RESOURCE_TO_MODEL` owner mapping.
- Surface the replenishment stage in the UI by name: a `SHORTAGE` PR in `Chờ báo giá` renders as "Yêu cầu bổ sung", from `Chờ duyệt` onward as "Yêu cầu mua hàng", and add a replenishment-facing view for `Chờ báo giá`.
- Add missing indexes/FK/unique constraints for the touched models without breaking existing migrations.

**Non-Goals:**
- No new top-level `ReplenishmentRequest` table.
- No change to the `maYeuCau` code format (`YC-MH-…`) — only display labels change.
- No rewrite of `Supplier.loaiCungCap` taxonomy (kept as free-text detail; only `phanLoai`/`phanLoaiNCC` are normalized).
- No soft-delete for `SupplyRequest`/`PurchaseRequest` in this change.
- No change to kiosk / face-attendance flow.

## Decisions

### D1. Reuse `PurchaseRequest` (`sourceType=SHORTAGE`, `Chờ báo giá`) as the replenishment request
- **Why:** The schema already links `SupplyRequestItem → SupplyRequestDecision.triggeredPurchaseRequestId → PurchaseRequest { supplyRequestId, sourceType, trangThai }` and the frontend already handles multi-item PR items. Adding a new entity duplicates lifecycle, notifications, RBAC, and reports.
- **Alternatives:** New `ReplenishmentRequest` table with its own status and approval gate — rejected because it would duplicate `PurchaseRequest` lifecycle and double the frontend (picked as future option if cross-SR replenishment pooling is needed).
- **Consequence:** A label helper `labelForPR({ sourceType, trangThai })` maps to "Yêu cầu bổ sung" vs "Yêu cầu mua hàng" in UI + notification titles; `maYeuCau` stays `YC-MH`.

### D2. Group shortage by `phanLoai` inside one transaction
- **Why:** One depleted SR with 5 lines of the same class currently fans out to 5 PRs. Grouping produces one ticket per purchasing sub-team, matching how purchasing is organized.
- **How:** `batchFulfill` and `partialFulfill` collect all `shortage > 0` lines, bucket by normalized `phanLoai` (NVL-family vs equipment vs other — see `PHAN_LOAI_VAT_TU` lookup), and create one `PurchaseRequest` (with many `PurchaseRequestItem`s) per bucket. The `PurchaseRequest` + `PurchaseRequestItem` inserts, `SupplyRequestItem` updates, and `SupplyRequestDecision` inserts share one `prisma.$transaction` (interactive). Shortage grouping is deterministic: `Map<normalizedPhanLoai, shortageItems[]>`.
- **Alternatives:** Keep one PR per line — rejected due to purchasing triage overhead.
- **Trade-off:** A single-item `partialFulfill` still produces one PR; multi-item and batch produce fewer. Clients must handle `triggeredPurchaseRequestId` being one-to-many per decision after grouping → decision stores the PR id of its bucket, and `SupplyRequestDecision` for lines in the same bucket share the same PR id.

### D3. Ownership = original requester, decided-by stays on decision
- **Why:** Warehouse should not appear as the PR requester; audit and ABAC filters rely on `PurchaseRequest.employeeId`.
- **Rule:** Replenishment PR `employeeId/maNhanVien/tenNhanVien` = `SupplyRequest.employeeId` snapshot. `SupplyRequestDecision.decidedByEmployeeId` records who decided to route shortage. Non-shortage PR flows (`MANUAL`, `QUICK`) keep their existing caller-supplied owner.

### D4. Sub-department-routed notifications + server-side filter
- **Why:** Broadcasting to whole purchasing wastes attention and defeats the two sub-departments (`MATERIALS` vs `EQUIPMENT`) already seeded.
- **Rule:** `PURCHASE_REQUEST_CREATED` registry entry inspects `metadata.phanLoaiGroup` / `metadata.items` (populated by `purchaseRequestService.createPurchaseRequest`) and resolves to `SUBDEPT_PURCHASING_MATERIALS` (NVL family), `SUBDEPT_PURCHASING_EQUIPMENT` (equipment), else `DEPT_PURCHASING` fallback. `purchaseRequestService.getAllPurchaseRequests` adds an optional `phanLoaiNCC` / `phanLoai` filter (`items.some.phanLoai in …`) used by `PurchasingMaterials` / `PurchasingEquipment`. Purchasing stats use `pagination.total`, not `data.length` after client filter.

### D5. New SR status `Chờ bổ sung`
- **Why:** The SR lifecycle currently jumps `Đang xử lý → Đã duyệt mua → Đã mua hàng → Đã cung cấp` and cannot surface "waiting on purchasing". A distinct status lets warehouse and requesters see that replenishment tickets are open.
- **Placement:** `['Chưa cung cấp', 'Đang xử lý', 'Chờ bổ sung', 'Đã duyệt mua', 'Đã mua hàng', 'Đã cung cấp']`. `advanceStatus` (and bulk recompute in `batchFulfill`) moves to `Chờ bổ sung` as soon as at least one replenishment PR exists for the SR and `fulfilledQty < soLuong` remains. `Đã duyệt mua` still advances only on `PurchaseRequest.trangThai → Đã duyệt`. `Mua nhanh` keeps its own shortcut sequence unchanged.
- **Alternative considered:** Keep the existing 5-state sequence and signal via a flag — rejected because every dashboard already switches on `trangThai` strings.

### D6. Enforced allowlist for `PurchaseRequest.trangThai`
- **Why:** The only legitimate transitions are through `submitForApproval` for `Chờ báo giá → Chờ duyệt`, and via approval for `Chờ duyệt → Đã duyệt`, etc. Direct `PUT` must not short-circuit them.
- **Rule:** `ALLOWED_TRANSITIONS: Record<status, status[]>` enforced at the top of `purchaseRequestService.updatePurchaseRequest` and in `submitForApproval`. Any deviation → `ValidationError`. Deletion and item mutation are blocked once `trangThai ∈ {Đã duyệt, Hoàn thành}` (and optionally `Từ chối`). `generatePurchaseRequestCode` moves inside the creation transaction to remove the outside-tx race.

### D7. Warehouse concurrency — atomic decrement + upsert
- **Why:** Two concurrent issues reading `LotProduct.soLuong = 100` and writing `90` each silently overdraw stock. Two concurrent receipts creating the same new `tenSanPham` create duplicate `InternationalProduct` rows.
- **Fix:**
  - Stock: `tx.lotProduct.update({ where: { id, soLuong: { gte: qty } }, data: { soLuong: { decrement: qty } } })` (and symmetrical `increment` on reversal/delete) with row-count check; on 0 affected rows throw `ValidationError`. Wrapped in the same `prisma.$transaction` that guards `assertLinesFitStock`. If the Prisma client needs it, add a raw `SELECT ... FOR UPDATE` via `$queryRaw` before the update.
  - Catalog: `InternationalProduct` keyed by normalized `tenSanPham` (case-insensitive) uses `upsert` or `findFirst → create` with a catch on `P2002` retry; similarly `LotProduct` upsert on `(lotId, internationalProductId)` where not null — declare `@@unique([lotId, internationalProductId])` where `internationalProductId IS NOT NULL` (partial or app-enforced).
- **Indexes/checks:** Add `CHECK (soLuong >= 0)` at DB level (or at minimum a Prisma `@@map` comment + `warehouseSlipLines` guard), `@@unique([receiptId, stt])` / `@@unique([issueId, stt])`, supplier `phanLoaiNCC CHECK`.

## Risks / Trade-offs

- **Decision → PR is now one-to-many per bucket** → `triggeredPurchaseRequestId` no longer uniquely identifies the shortage source per line if lines share a bucket. Mitigation: lines in the same `phanLoai` bucket share the same PR id; decision history groups by `triggeredPurchaseRequestId` and callers handle the shared id. Alternative was a join table — heavier, deferred unless cross-SR pooling is requested.
- **Status string change (`Chờ bổ sung`)** touches every `switch(trangThai)` and dashboard funnel. Mitigation: keep the string Vietnamese as existing statuses, add a constant `SR_STATUS.CHO_BO_SUNG`, and update `SupplyRequestManagement` + `ProductionWarehouse` funnels in this change.
- **Atomic decrement requires `soLuong: { gte }` where clause** not uniformly supported on `Float`; fallback is `SELECT FOR UPDATE` via `$queryRaw`. Mitigation: try `decrement` with optimistic check first, fall back to `FOR UPDATE` if the adapter rejects it.
- **Grouping heuristic for `phanLoai`** (NVL vs equipment) depends on lookup values (`Nguyên liệu`, `Bao bì`, `Thiết bị`, `Thiet bi` variants). Mitigation: normalize through `Lookup` group `PHAN_LOAI_VAT_TU` + fallback `other → DEPT_PURCHASING`.
- **FK backfill for `triggeredPurchaseRequestId`** may hit orphans if old PRs were deleted. Mitigation: add the FK as `SetNull` after cleaning orphans; do not cascade.

## Migration Plan

1. **Schema migration (backward-compatible):**
   - Add missing `@@index` on `SupplyRequestItem.supplyRequestId`, `PurchaseRequest.{employeeId,supplyRequestId,nhaCungCapId,trangThai,sourceType}`, `PurchaseRequestItem.{purchaseRequestId,nhaCungCapId}`, `Supplier.{phanLoaiNCC,trangThai}`, `LotProduct.{lotId,internationalProductId}`, `WarehouseReceipt/Issue.{supplyRequestId}`, `SupplyRequestDecision.triggeredPurchaseRequestId`.
   - `SupplyRequestDecision.triggeredPurchaseRequestId`: orphan cleanup (`DELETE/SET NULL where not exists PurchaseRequest`) → add FK `onDelete: SetNull` + `@@index`.
   - `LotProduct`: add `@@unique([lotId, internationalProductId])` where not null (partial via raw SQL if needed), `CHECK (soLuong >= 0)` via raw SQL, fix `warehouses.updatedAt @updatedAt` + `warehouses.id` helper.
   - `Supplier.phanLoaiNCC`: add `CHECK (phanLoaiNCC IN ('NVL','Thiết bị'))` + normalize dirty rows (`'nvl'→'NVL'`, trim).
   - `WarehouseReceiptItem`/`WarehouseIssueItem`: add `@@unique([receiptId,stt])` / `@@unique([issueId,stt])`.
2. **Code release:** deploy services with new status `Chờ bổ sung`, atomic stock, transition guards, and routing fixes in one release; `supply-request-status-workflow` delta is additive, old statuses still valid.
3. **Data fix:** no forced backfill for existing PRs; new grouping applies only to new shortages. `isNewProduct`/`phanLoai` normalization is future-facing.
4. **Rollback:** if the new transaction grouping fails, `batchFulfill` can be reverted to per-item PRs without schema rollback (grouping is app logic); status `Chờ bổ sung` is forward-only, so rollback keeps it as a valid status.

## Open Questions

- None blocking. If a `phanLoai` value does not map cleanly to NVL vs equipment, the fallback is `DEPT_PURCHASING` (broadcast) — acceptable until the taxonomy is tightened via `Lookup` sync.
