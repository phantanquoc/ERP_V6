## Why

Warehouse staff sometimes creates duplicate receipts/issues (e.g., PN-46 and PN-47 double-entered the same YCCC). Hard delete would lose audit trail and violate the `isLocked` constraint on supply-request-linked slips. A soft-void keeps the record for audit while reversing stock, with no change to YCCC/YCMH status.

## What Changes

- Add `isVoided`, `voidReason`, `voidedAt`, `voidedBy` to `WarehouseReceipt` and `WarehouseIssue` (new migration).
- Service: `void(id, {reason, user})` / `unvoid(id)` in a transaction with stock reversal (`receipt: decrement`, `issue: increment`) guarded by `updateMany gte` (reject if insufficient stock). `YCCC/YCMH/plan` not reverted.
- Controller/Route: `POST /:id/void` and `POST /:id/unvoid` guarded by `warehouse-receipts:DELETE` / `warehouse-issues:DELETE` (ADMIN + WAREHOUSE_MANAGER), `voidReason` required.
- Validation: `voidReceiptSchema` / `voidIssueSchema` requiring non-empty `voidReason`.
- Queries: `getAll`/`getById` filter `where isVoided=false` by default; `?includeVoided=true` returns all for audit. Stock/inventory aggregations exclude voided slips.
- Frontend: service `voidWarehouseReceipt/Issue`, `WarehouseReceiptTab`/`WarehouseIssueTab` — dimmed row + `Đã vô hiệu` badge + `isVoided` filter, `CancelWithReasonModal` for void, `WarehouseSlipPrintView` watermark `ĐÃ VÔ HIỆU`.

## Capabilities

### New Capabilities
- `warehouse-void-soft`: Soft-void lifecycle for warehouse receipts and issues with stock reversal, audit retention, permission and filter semantics.

### Modified Capabilities
- (none — additive; no existing spec requirement is changed)

## Impact

- DB: new columns + index on `isVoided` (if beneficial) for both slip tables.
- APIs: two new endpoints per slip type; list/detail filtering changes (breaking for clients that assumed `GET /warehouse-receipts` returns all — mitigated by `includeVoided` opt-in).
- Frontend: two tabs + print view + services.
- Tests: stock guard and void/unvoid flows.
