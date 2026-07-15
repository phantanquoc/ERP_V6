## Context

`ProductionWarehouse` renders three overview cards and five tabs. Two tabs — `WarehouseReceiptTab` and `WarehouseIssueTab` — list slips and today support only create and view-detail. Slip creation already mutates live stock (`lotProduct.soLuong`) and persists `soLuongTruoc`/`soLuongSau` snapshots plus denormalized `tenKho`/`tenLo`/`tenSanPham`/`donViTinh`. Backend services (`warehouseReceiptService`, `warehouseIssueService`) expose only `create`/`getAll`/`getById`; routes expose only GET/POST. Some issues are auto-created by `MaterialEvaluation` (unique `warehouseIssueId`) and some slips carry a `supplyRequestId`. A refund-on-delete pattern already exists in `materialEvaluationService.ts` (~lines 370–393) and is the reference for reversal logic.

The overview cards misread the API response (`res.data` instead of `res.data.data`) for receipts/issues/supply requests, so those cards are blank/wrong. There is no period filter anywhere on the page.

## Goals / Non-Goals

**Goals:**
- Add transactional edit/delete for both slip types with correct stock reversal and a negative-stock guard.
- Lock slips owned by other workflows (supply-request-linked, material-evaluation-generated) and surface that via `isLocked`.
- Fix the overview card data and add a distinct in-stock item count.
- Add a page-level month/year filter that scopes the count cards and both tab tables, client-side.

**Non-Goals:**
- No server-side pagination for `getAll` (kept returning all rows).
- No Prisma schema change.
- No change to how MaterialEvaluation/SupplyRequest create slips — only lock their edit/delete from the warehouse tabs.
- No cross-unit quantity aggregation.

## Decisions

### Reversal model: reverse-old-then-apply-new inside one transaction
On update, load the existing slip, compute its original impact on its original `lotProduct`, reverse it, then apply the new impact on the target `lotProduct` (looked up fresh). On delete, reverse only. All reads/writes of `lotProduct.soLuong` and the slip happen in a single `prisma.$transaction` so partial failure cannot leave stock inconsistent. Chosen over an event-sourced recompute because the codebase treats `lotProduct.soLuong` as the live running total and already uses the same refund approach in `materialEvaluationService`.

### Snapshots are point-in-time, not retroactive
`soLuongTruoc`/`soLuongSau` on the edited slip are recomputed from current stock at edit time. We do NOT walk forward to fix snapshots on later slips. Rationale: snapshots are historical audit markers of what happened when that operation ran; the live truth is `lotProduct.soLuong`. Retroactive recompute across the whole history is out of scope and error-prone.

### Negative-stock guard via ValidationError
After computing the resulting `lotProduct.soLuong`, if it would be `< 0`, throw `ValidationError` (from `@utils/errors`) so the transaction rolls back. Issues reuse the existing insufficient-stock message style. This is the same failure surface the create path already uses for issues.

### Locking computed server-side, exposed as isLocked
`getAll` computes `isLocked` so the client never re-derives ownership rules. Receipts: `isLocked = !!supplyRequestId`. Issues: include the `materialEvaluation` relation (select `id` only) and `isLocked = !!supplyRequestId || !!materialEvaluation`. Update/delete service methods re-check the lock server-side (defense in depth) and throw `ConflictError` — the UI hiding buttons is convenience, not the security boundary.

### Routes mirror create authorization
`PUT /:id` and `DELETE /:id` use `authorize(ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)`, matching create. Controllers map `ValidationError`→400, not-found→404, `ConflictError`→409, following the existing controller error-mapping pattern.

### Edit reuses the create modal in edit mode
Rather than a second modal, the tab tracks an `editingId` and prefills `formData` from the row. Title and submit label switch to "Cập nhật"; submit calls update instead of create. Keeps UI surface small and consistent. Delete uses `confirm()` then calls delete, re-fetches slips + warehouses, and invalidates `warehouseKeys.lists()` (the create path already invalidates this).

### Period filter lifted to the page, applied client-side
Month/year state lives in `ProductionWarehouse` (default "All"). The page filters its already-loaded receipts/issues for the count cards, and passes `month?`/`year?` as optional props to both tabs, which add a date predicate (`ngayNhap`/`ngayXuat`) to their existing client-side filter chain. Optional props keep the tabs usable if rendered elsewhere. Year options are derived from the loaded data (fallback to recent years). No backend change needed since `getAll` returns everything.

## Risks / Trade-offs

- **Stale denormalized fields after edit** → On update we always rewrite `tenKho`/`tenLo`/`tenSanPham`/`donViTinh` from the resolved target lot/product, so they cannot drift.
- **Concurrent edits racing on the same lot product** → Wrapping in `prisma.$transaction` bounds the window; the negative-stock guard runs on values read inside the transaction. Full advisory locking is out of scope (matches current create-path behavior).
- **Client-side period filter with large datasets** → `getAll` already returns all rows and the tabs already filter fully client-side, so this adds no new scaling risk; if volume grows, server-side filtering is a separate follow-up.
- **Lock bypass if UI check were the only guard** → Mitigated by re-checking the lock inside the service update/delete methods, not just hiding buttons.
- **Snapshots not matching live stock for historically edited slips** → Accepted by design; snapshots are point-in-time markers, `lotProduct.soLuong` is the source of truth.

## Migration Plan

No schema migration. Deploy is backend (services/controllers/routes) + frontend (services/components/page) together so the new endpoints and UI ship in lockstep. Rollback is a code revert; no data migration to undo. Verify new routes appear in `routes/index.ts` ROUTE_MAP and server logs after deploy.

## Open Questions

None — all decisions locked during exploration (edit scope = all fields, lock special slips, filter applies to cards + tables, cards = counts only, roles = same as create).
