## 1. Backend — warehouse receipt service (update/delete + isLocked)

- [x] 1.1 Add `isLocked` to `getAll` in `warehouseReceiptService.ts` (`isLocked = !!supplyRequestId`)
- [x] 1.2 Add `update(id, input)`: load existing, re-check lock (throw `ConflictError` if `supplyRequestId` set), reverse original `soLuongNhap` on original lotProduct, resolve target lotProduct, apply new `soLuongNhap`, recompute `soLuongTruoc`/`soLuongSau` + denormalized `tenKho`/`tenLo`/`tenSanPham`/`donViTinh`, all in one `prisma.$transaction`
- [x] 1.3 Add negative-stock guard in `update`: if any lotProduct would go `< 0` → throw `ValidationError`, transaction rolls back
- [x] 1.4 Add `delete(id)`: re-check lock, subtract `soLuongNhap` back from lotProduct (guard `< 0` → `ValidationError`), delete record, in one transaction ← (verify: reversal math correct, guard rolls back, lock re-checked server-side)

## 2. Backend — warehouse issue service (update/delete + isLocked)

- [x] 2.1 Update `getAll` in `warehouseIssueService.ts` to include `materialEvaluation` relation (select id only) and return `isLocked = !!supplyRequestId || !!materialEvaluation`
- [x] 2.2 Add `update(id, input)`: load existing (with materialEvaluation), re-check lock (throw `ConflictError` for supply-request-linked OR material-evaluation-generated), add back original `soLuongXuat` on original lotProduct, resolve target lotProduct, subtract new `soLuongXuat`, recompute snapshots + denormalized fields, one transaction
- [x] 2.3 Add negative-stock guard in `update`: reuse insufficient-stock message ("Số lượng tồn kho không đủ...") → throw `ValidationError`, rollback
- [x] 2.4 Add `delete(id)`: re-check lock, add `soLuongXuat` back to lotProduct, delete record, one transaction ← (verify: refund math correct, lock blocks material-evaluation issues, guard rolls back)

## 3. Backend — controllers

- [x] 3.1 Add `updateWarehouseReceipt` + `deleteWarehouseReceipt` to `warehouseReceiptController.ts`, return `{success, message, data}`, map `ValidationError`→400 / not-found→404 / `ConflictError`→409
- [x] 3.2 Add `updateWarehouseIssue` + `deleteWarehouseIssue` to `warehouseIssueController.ts`, same shape + error mapping

## 4. Backend — routes

- [x] 4.1 Add `PUT /:id` and `DELETE /:id` to `warehouseReceiptRoutes.ts` with `authorize(ADMIN, DEPARTMENT_HEAD, TEAM_LEAD)`
- [x] 4.2 Add `PUT /:id` and `DELETE /:id` to `warehouseIssueRoutes.ts` with same authorize
- [x] 4.3 Verify new routes are registered in `routes/index.ts` ROUTE_MAP and appear on server start ← (verify: routes present in ROUTE_MAP, auth roles correct)

## 5. Backend — tests

- [x] 5.1 Test receipt update/delete: correct stock reversal on same and different lotProduct, snapshot recompute, negative-stock guard rollback, lock rejection for supplyRequestId
- [x] 5.2 Test issue update/delete: correct refund, negative-stock guard, lock rejection for supplyRequestId AND materialEvaluation ← (verify: all guard + lock + reversal scenarios covered, existing materialEvaluation tests still pass)

## 6. Frontend — services

- [x] 6.1 Add `updateWarehouseReceipt(id, data)` (PUT) + `deleteWarehouseReceipt(id)` (DELETE) to `warehouseReceiptService.ts`; add `isLocked?: boolean` to `WarehouseReceipt` interface
- [x] 6.2 Add `updateWarehouseIssue(id, data)` (PUT) + `deleteWarehouseIssue(id)` (DELETE) to `warehouseIssueService.ts`; add `isLocked?: boolean` to `WarehouseIssue` interface

## 7. Frontend — tab UI (edit/delete + date-filter props)

- [x] 7.1 `WarehouseReceiptTab.tsx`: add Edit (Pencil) + Delete (Trash2) buttons in the action cell, hidden when `receipt.isLocked === true`; Edit opens the create modal in edit mode (track `editingId`, prefill formData, title/submit → "Cập nhật", call update); Delete uses `confirm()` then delete, then re-fetch receipts + warehouses and invalidate `warehouseKeys.lists()`
- [x] 7.2 `WarehouseIssueTab.tsx`: same edit/delete UI + edit-mode modal + delete refresh behavior
- [x] 7.3 Add optional `month?`/`year?` props to both tabs and extend their client-side filter to include a `ngayNhap`/`ngayXuat` period predicate ← (verify: locked slips hide both buttons, edit reverses+applies correctly end to end, delete refreshes, period predicate correct)

## 8. Frontend — ProductionWarehouse page (cards + filter)

- [x] 8.1 Fix response-shape access at the overview fetch: read `receiptRes.data.data || []`, `issueRes.data.data || []`, `supplyRes.data.data || []` (confirm each service's actual shape)
- [x] 8.2 Add distinct in-stock item count (count `lotProduct` with `soLuong > 0` across warehouses→lots→lotProducts) to the stock card; no cross-unit summing
- [x] 8.3 Add Month (1–12 + All) and Year (available years + All) selectors near the cards, page-level state, default "All"; scope receipt/issue count cards by `ngayNhap`/`ngayXuat`; leave stock + in-stock cards on current state
- [x] 8.4 Pass selected `month`/`year` down to `WarehouseReceiptTab` and `WarehouseIssueTab` ← (verify: cards show correct counts, in-stock count correct, period scopes counts + both tables, default All shows everything)

## 9. Verification

- [x] 9.1 `cd backend && npx tsc --noEmit` passes; `cd backend && npm run lint`
- [x] 9.2 `cd backend && npm test` — warehouse tests pass, `materialEvaluationService`/`employeeEvaluationService` no regression
- [x] 9.3 `cd frontend && npx tsc --noEmit` passes; `cd frontend && npm run lint`
- [x] 9.4 Run `gitnexus_detect_changes()` to confirm only expected symbols/flows affected ← (verify: no unexpected blast radius)
