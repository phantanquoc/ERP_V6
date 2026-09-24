## Context

Purchasing confirms actual price via `POST /purchase-requests/:id/confirm-actual-price` on `Đã duyệt` requests, updating `PurchaseRequestItem.giaThucTe` and repricing `InternationalProduct.giaThanh` as a weighted average. Quantity is never confirmed at that boundary: `PurchaseRequestItem` has only `soLuong` (the planned quantity), while `soLuongThucTe` exists only on `WarehouseReceiptItem`/`WarehouseIssueItem`. The warehouse must re-enter quantity and supply a mandatory `lyDoChenhLech` when it differs from plan, but purchasing has no upstream quantity confirmation or discrepancy record. This change adds quantity confirmation at the "Đã mua xong" (Đã duyệt → Hoàn thành) boundary, with `SL KH/TT` (default TT=KH for fast confirmation) and a mandatory header discrepancy note when they differ, then propagates the confirmed quantities into receipt creation and plan reconciliation.

Related code: `backend/prisma/schema/business_production.prisma` (PurchaseRequest, PurchaseRequestItem, WarehouseReceiptItem, InboundPlan), `backend/src/services/purchaseRequestService.ts` (confirmActualPrice, updatePurchaseRequest, ALLOWED_TRANSITIONS), `backend/src/services/warehouseReceiptService.ts` (assertMatchesPurchaseRequest, applyPurchaseUnitCost), `backend/src/services/inboundPlanService.ts` (onReceiptCreated), `frontend/src/components/ConfirmActualPriceModal.tsx`, `PurchaseRequestDetailModal.tsx`, `PurchaseRequestSubTabs.tsx`, `CreateWarehouseReceiptModal.tsx`.

## Goals / Non-Goals

**Goals:**
- Confirm both actual quantity and actual price in one purchasing action with minimal friction (TT defaults to KH).
- Make `lyDoChenhLech` mandatory at the purchasing boundary when TT differs from KH, with full propagation to warehouse receipt and inbound plan and visible audit trail.
- Reconcile warehouse receipts against the confirmed TT (when present), not the original KH.

**Non-Goals:**
- Introducing `internationalProductId` FK on PurchaseRequestItem (text-match reconciliation stays, FK migration is a separate change).
- Changing the SupplyRequest/YCBS workflow or outbound plan flows.
- Repricing already-voided or already-received stock on re-confirm.

## Decisions

### D1: One new column on the item, one on the header
Add `PurchaseRequestItem.soLuongThucTe Float?` (nullable) and `PurchaseRequest.lyDoChenhLech String?`. `soLuong` remains the KH to avoid migrating all existing rows; `soLuongThucTe = null` means "not yet confirmed". Alternative considered: adding `soLuongKeHoach` and keeping `soLuong` as TT — rejected because it would require backfilling every row and risks confusion with existing queries.

### D2: Single confirm endpoint carries both price and quantity
Extend `confirmActualPrice` to `items: {id, giaThucTe?, soLuongThucTe?}[]` plus `lyDoChenhLech?: string`. Keep the existing partial-payload rule (omitted item keeps prior confirmed values). Validate each chosen `soLuongThucTe` and `giaThucTe` as `>0` finite. If any `soLuongThucTe != soLuong`, require `lyDoChenhLech.trim()`. Do not auto-change `trangThai` inside this call; `Hoàn thành` stays a separate `PUT` but is gated (D3). Alternative: separate `confirm-actual-qty` endpoint — rejected as two round-trips for one business event.

### D3: Gate Hoàn thành on confirmed price+qty+reason
`updatePurchaseRequest` transitioning `Đã duyệt → Hoàn thành` SHALL reject with 400 if any item lacks `giaThucTe>0` or `soLuongThucTe>0`, or if quantity differs and `lyDoChenhLech` is empty. The FE `thenComplete` flow SHOULD call `confirmActualPrice` then `PUT Hoàn thành` sequentially; the BE gate is the source of truth so direct API bypass is blocked. Alternative: BE auto-completes inside confirm — rejected per existing comment "Hoàn thành stays separate".

### D4: Preserve TT across item rewrites
Same pattern as existing `giaThucTe` carry in `updatePurchaseRequest` delete+createMany: key by incoming `id` then fallback `tenHangHoa` lowercased, keeping prior `soLuongThucTe` when the rewrite omits it. Prevents wiping confirmed quantity on a header edit after `Đã duyệt`.

### D5: Receipt reconciliation uses TT when confirmed
`assertMatchesPurchaseRequest` builds `purchased` quantities from `soLuongThucTe ?? soLuong`; same for `applyPurchaseUnitCost` quantity-weighted unit cost and `inboundPlanService.onReceiptCreated/recomputeAfterVoid` planned quantity. This makes the confirmed TT the source of truth for quantity checks. Backwards-compatible: `null` falls back to `soLuong`.

### D6: Prefill and inherit, not duplicate entry
`CreateWarehouseReceiptModal` when linked to a PR SHALL prefill `soLuongYeuCau = prItem.soLuong` and `soLuongThucTe = prItem.soLuongThucTe ?? prItem.soLuong`, and prefill `lyDoChenhLech` from `pr.lyDoChenhLech` (editable). `ConfirmActualPriceModal` SHALL default `SL TT = SL KH` and show a mandatory textarea when any diff exists. `PurchaseRequestDetailModal` SHALL show a diff badge. Alternative: keep receipt entry independent — rejected because it reintroduces double-entry and drift.

## Risks / Trade-offs

- **Re-confirm repricing double-count** → Mitigation: when re-confirming, compute `giaThanh` delta from the previously confirmed quantity; or forbid re-confirm after any receipt exists (simpler, chosen). Documented as D2 note; enforce by checking existing non-voided receipts for the PR and rejecting re-confirm with a clear message.
- **Concurrent confirm+complete race** → Mitigation: keep existing `updateMany where trangThai='Đã duyệt'` TOCTOU pattern; confirm touches `updatedAt` only, complete checks the gate inside the same `updateMany` WHERE.
- **Partial payload + new required lyDoChenhLech** → Mitigation: validate `hasDiff` over the *effective* post-confirm quantities (submitted merged with stored), not just the submitted subset.
- **Migration with nulls** → No backfill needed; existing rows stay `null` and are treated as "not yet confirmed" (Hoàn thành gate only applies after the change; already-Hoàn thành rows are not retroactively blocked).

## Migration Plan

1. Prisma migration adds `PurchaseRequestItem.soLuongThucTe` and `PurchaseRequest.lyDoChenhLech`.
2. Deploy BE first (new fields nullable, old clients still work).
3. Deploy FE (new modal columns, prefill).
4. No data backfill; optional maintenance script to set `soLuongThucTe = soLuong` for already-Hoàn thành rows if desired (out of scope).
5. Rollback: drop columns if needed; old BE/FE continue to work because new fields are read-only additions.

## Open Questions

- Should `giaThucTe` also be gated by `lyDoChenhLech` when price differs, or is price variance note kept separate? (Assumed no — only quantity drives the mandatory note for this change.)
