## Why

Purchase price confirmation (`confirm-actual-price`) only records `giaThucTe` but never the actual delivered quantity. The warehouse receipt is the only place holding `soLuongThucTe`, so purchasing can mark a request as Hoàn thành without ever reconciling planned vs actual quantity, and the discrepancy reason (`lyDoChenhLech`) required on every warehouse slip has no upstream counterpart. This creates orphan data, double-entry, and no audit trail for quantity differences at the purchasing boundary.

## What Changes

- Add `PurchaseRequestItem.soLuongThucTe: Float?` (nullable; `null` = not yet confirmed, default on confirm = `soLuong`) and `PurchaseRequest.lyDoChenhLech: String?` to the Prisma schema with migration.
- Extend `POST /api/purchase-requests/:id/confirm-actual-price` to accept per-item `soLuongThucTe` plus header `lyDoChenhLech`; require `lyDoChenhLech` when any `soLuongThucTe != soLuong`; validate `>0` finite; make re-confirm preserve and allow partial payloads.
- Preserve `soLuongThucTe` across `PUT /api/purchase-requests/:id` item rewrites (delete+createMany) keyed by item `id` fallback name, same as existing `giaThucTe` carry.
- Gate `Đã duyệt → Hoàn thành` to require every item has `giaThucTe >0` and `soLuongThucTe >0`; when quantity differs, require `lyDoChenhLech`.
- Update `warehouseReceiptService.assertMatchesPurchaseRequest` and `applyPurchaseUnitCost` and `inboundPlanService.onReceiptCreated/recomputeAfterVoid` to compare/reconcile against `soLuongThucTe ?? soLuong` when confirmed.
- Propagate `lyDoChenhLech` from the confirmed PR into `WarehouseReceipt`/`InboundPlan` prefill (inherited, editable).
- Frontend: `ConfirmActualPriceModal` adds `SL KH` (disabled) + `SL TT` (editable, default = KH) columns plus mandatory `Lý do chênh lệch` textarea; totals use `TT * giaThucTe`; `thenComplete` flow confirms price+qty then completes atomically. `PurchaseRequestDetailModal` shows KH/TT + discrepancy badge. `PurchaseRequestSubTabs` list shows `xKH→TT` inline when confirmed. `CreateWarehouseReceiptModal` prefills `soLuongYeuCau/soLuongThucTe` and inherited `lyDoChenhLech` from the linked PR.
- Ensure orphan/mismatch detection (supplier/quota/stock) and display of the discrepancy reason on receipt print/detail remain intact.

## Capabilities

### New Capabilities
- `purch-actual-qty-confirm`: Confirming actual quantity + discrepancy reason together with actual price at purchasing completion, and its propagation to warehouse receipt/inbound plan.

### Modified Capabilities
- `purchase-request-multi-item`: PurchaseRequestItem gains `soLuongThucTe`; list/detail include it; confirm endpoint gains quantity + reason; completion gated.
- `purchase-request-transition-guards`: `Đã duyệt → Hoàn thành` gains quantity/price/reason guards.
- `warehouse-slip-management`: Receipt reconciliation and plan auto-close use confirmed TT when present; prefill inherits PR quantities and reason.

## Impact

- DB migration on `business.PurchaseRequest` and `business.PurchaseRequestItem`.
- APIs: `POST /purchase-requests/:id/confirm-actual-price` (breaking: new required field when quantity differs, new response fields), `GET /purchase-requests` and `GET /purchase-requests/:id` (new fields), `PUT /purchase-requests/:id` (carry logic), `POST /purchase-requests/:id/cancel` unaffected, warehouse receipt/inbound plan reconciliation behavior.
- Frontend: 4 components + 2 services.
- No new external dependencies.
