## Context

`WarehouseReceipt.delete` blocks when `supplyRequestId != null` (`isLocked`) and removes rows permanently, losing audit. Duplicate slips (PN-46/47) must be neutralized without deleting history. `isOver` highlighting and `hasDiff` banners depend on `items[].soLuongYeuCau`/`soLuongThucTe`; void must not break them. Stock guard for void reuses the existing `delete` pattern (`SUM per lotProductId` + `updateMany gte`).

## Goals / Non-Goals

**Goals:**
- Generic soft-void for all receipts and issues (not just PN-46/47), usable going forward.
- Stock reversal in same transaction with guard (receipt decrement, issue increment; reject if insufficient stock).
- Default hide voided slips; `?includeVoided=true` for audit, dimmed + badge + filter + print watermark.
- Permission `warehouse-receipts:DELETE` / `warehouse-issues:DELETE` (ADMIN + WAREHOUSE_MANAGER), `voidReason` required.

**Non-Goals:**
- Reverting YCCC/YCMH/plan status (3.A).
- Allowing void to create negative stock (2.B).
- Hard delete for locked slips.

## Decisions

- **Columns:** `isVoided Boolean @default(false)`, `voidReason String?`, `voidedAt DateTime? @db.Timestamptz(6)`, `voidedBy String?` on both `WarehouseReceipt` and `WarehouseIssue`. Chosen over `trangThai` enum to keep boolean filter simple and match `daIn` pattern.
- **Endpoints:** `POST /:id/void {voidReason}` and `POST /:id/unvoid` per resource, `zodValidate(voidSchema)` before controller, `requireRule(..., 'DELETE')`. Alternatives considered: `PATCH /:id {isVoided}` and `DELETE ?soft=true` — rejected for explicit intent and audit clarity.
- **Stock reversal:** Inside `$transaction` with `SELECT ... FOR UPDATE` on header, load `items`, `sumByPackage`, `loadBalances`, then `lotProduct.updateMany where soLuong gte qty` for receipt/issue void, opposite for unvoid. Uses existing `assertSufficientStock` / `assertLinesFitStock` helpers.
- **Queries:** `getAll(params.includeVoided?: boolean)` adds `where isVoided: false` when falsy; `getById` returns voided when `includeVoided` true else 404 or with `isVoided` flag. Inventory/stock aggregations add same filter. Default hide avoids breaking existing UI that assumes active-only.
- **Frontend:** `voidWarehouseReceipt/Issue(id, {voidReason})` + `unvoid`, `WarehouseReceiptTab`/`WarehouseIssueTab` add `includeVoided` filter, dimmed row `opacity-60`, badge `Đã vô hiệu`, `CancelWithReasonModal` for void, `WarehouseSlipPrintView` overlay watermark when `isVoided`.
- **Concurrency:** Row lock via `$queryRaw SELECT ... FOR UPDATE` as in `update`/`delete`; idempotent: void on already-voided → 409, unvoid on active → 409.

## Risks / Trade-offs

- **Insufficient stock on void (receipt):** → 400 with `cần N còn M` per package; caller must adjust stock or unvoid after correcting. Mitigation: clear error with package name.
- **Unvoid insufficient stock (issue):** symmetric guard (issue void adds stock, unvoid removes it again).
- **Filter default change:** existing clients calling `GET /warehouse-receipts` without `includeVoided` will no longer see voided slips — intentional for 5.B. Mitigation: document `includeVoided` for audit.
- **Index:** `@@index([isVoided])` optional; low cardinality boolean alone is poor, but combined with `maPhieu`/`ngay` filters may help. Add only if `EXPLAIN` shows benefit.
- **Migration:** `ADD COLUMN` with default false is safe, no data loss; deploy via `prisma migrate deploy` then `prisma generate`.

## Migration Plan

1. `prisma migrate dev --name add_void_to_warehouse_slips` (dev) / `migrate deploy` (prod) — adds 4 columns per table.
2. `prisma generate`, rebuild backend image, `up -d --no-deps backend`.
3. Verify `GET /warehouse-receipts?includeVoided=true` returns voided with badge; `lot_products.soLuong` reverted.
4. Rollback: `ALTER TABLE ... DROP COLUMN isVoided, voidReason, voidedAt, voidedBy` + `DELETE FROM _prisma_migrations WHERE migration_name='...add_void...'`.

## Open Questions

- None; decisions locked as 1.C 2.B 3.A 4.B 5.B generic B.
