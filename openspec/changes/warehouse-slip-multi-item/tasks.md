## 1. Schema and migration

- [x] 1.1 Add `WarehouseReceiptItem` model in `backend/prisma/schema/business_production.prisma`: `id` (cuid), `receiptId`, `stt`, `lotProductId`, `tenSanPham`, `donViTinh`, `warehouseId`, `tenKho`, `lotId`, `tenLo`, `soLuongYeuCau`, `soLuongThucTe`, `soLuongTruoc`, `soLuongSau`, reserved nullable `donGia`/`thanhTien`, `ghiChu`, timestamps. Relation to header `onDelete: Cascade`, relation to `lotProduct` `onDelete: Restrict`. `@@schema("business")`, `@@map("warehouse_receipt_items")`, index on `receiptId` and `lotProductId`
- [x] 1.2 Add `WarehouseIssueItem` model with the same shape (`issueId` instead of `receiptId`), same cascade/restrict pairing, `@@map("warehouse_issue_items")`
- [x] 1.3 Add derived total columns to both headers: summed actual quantity and line count
- [x] 1.4 Make the ten item-level columns on both headers nullable and annotate each with a `@deprecated` comment pointing at the line table; do NOT drop them
- [x] 1.5 Repoint `LotProduct.warehouseReceipts`/`warehouseIssues` relations to the line models
- [x] 1.6 Generate migration with `npx prisma migrate dev`; verify it is additive (no DROP COLUMN) ← (verify: migration SQL contains no DROP COLUMN; `Restrict` on line→lotProduct and `Cascade` on line→header both present in generated SQL)
- [x] 1.7 Add raw-SQL backfill step: one line per existing slip copying item-level values and both snapshots, `soLuongYeuCau` set equal to `soLuongThucTe`, header totals populated from that single line
- [x] 1.8 Run `npx prisma generate` and confirm the client exposes both line delegates

## 2. Shared line engine

- [x] 2.1 Add a helper that groups incoming lines by `lotProductId` and returns per-package aggregate quantity, used by both slip services
- [x] 2.2 Add a validation helper that checks every package group's aggregate against current balance and throws `ValidationError` naming the package and its balance; it must run to completion across all groups before any caller writes
- [x] 2.3 Add a snapshot helper that walks lines in deterministic order maintaining a running per-package balance, returning `soLuongTruoc`/`soLuongSau` per line ← (verify: two lines on one package produce chained snapshots — line 2 opening equals line 1 closing, not the pre-transaction balance)
- [x] 2.4 Add a diff helper that partitions incoming lines against stored lines into removed, added, and modified sets, flagging modified lines whose `lotProductId` changed
- [x] 2.5 Add a helper that recomputes header totals from a line set

## 3. Warehouse receipt service

- [x] 3.1 Rewrite `create()` in `backend/src/services/warehouseReceiptService.ts` to accept a header plus lines, reject an empty line array, generate exactly one code, and write header + lines + stock updates in one `$transaction` using the snapshot helper
- [x] 3.2 Make `resolveOrCreateLotProduct()` accept the transaction client so per-line package resolution stays inside the slip transaction instead of using the global `prisma`
- [x] 3.3 Rewrite `update()` as a line diff: resolve the diff, run every negative-stock guard across the resolved set, then apply reversals and additions and recompute snapshots sequentially ← (verify: removing a line, adding a line, and repointing a line to a different package each leave correct balances; a guard failure on any line writes nothing)
- [x] 3.4 Rewrite `delete()` to reverse every line against its own package, sequentially for shared packages, with all guards evaluated before any write
- [x] 3.5 Rewrite `getByLotProduct()` to source rows from lines joined to headers, keeping slip-date ascending order
- [x] 3.6 Rewrite `getAll()`/`getById()` to return header totals and `isLocked`, with lines included on detail only
- [x] 3.7 Replace `batchCreate()` — its per-item loop that created N slips is superseded by multi-line `create()`; update or remove its callers

## 4. Warehouse issue service

- [x] 4.1 Rewrite `create()` in `backend/src/services/warehouseIssueService.ts` to accept header plus lines, running aggregate-by-package stock validation before any write ← (verify: two lines of 60 against one package holding 100 are rejected as an aggregate of 120; two lines of 40 are accepted and leave 20)
- [x] 4.2 Rewrite `update()` as a line diff with aggregate validation across the resolved set
- [x] 4.3 Rewrite `delete()` to refund every line against its own package
- [x] 4.4 Rewrite `getAll()`/`getById()` for header totals plus `isLocked`, keeping the `materialEvaluation` include that computes the lock
- [x] 4.5 Fire `reorderRuleService.checkAndNotify()` once per distinct product across the slip's lines, keeping it fire-and-forget and error-swallowing

## 5. Lookup cascade registry

- [x] 5.1 Repoint the two `donViTinh` entries in `backend/src/services/lookupService.ts:125-126` from `warehouseReceipt`/`warehouseIssue` to the line models and their tables ← (verify: renaming a unit label updates rows in `warehouse_receipt_items` and `warehouse_issue_items` and reports a nonzero count; a stale mapping would update zero rows and raise nothing)
- [x] 5.2 Add a test mirroring the existing `taxReport` silent-no-op test, asserting the cascade reaches both line tables

## 6. Material evaluation adaptation

- [x] 6.1 Update `createWithWarehouseLink()` in `backend/src/services/materialEvaluationService.ts` to create an issue header plus exactly one line, keeping the `[TỰ ĐỘNG]` note prefix and the `warehouseIssueId` header link
- [x] 6.2 Fix the refund path at `materialEvaluationService.ts:455-479` to read the quantity from the issue's lines, and assert the refund amount is finite before writing ← (verify: deleting an evaluation refunds a finite number equal to the summed line quantities; the previous header read would have yielded `NaN` silently)
- [x] 6.3 Reuse `warehouseIssueService.generateCode()` instead of the duplicated code-generation block at `materialEvaluationService.ts:129-137`

## 7. Finished product bulk receipt

- [x] 7.1 Rewrite the bulk receipt in `backend/src/services/finishedProductService.ts:640-800` to emit one header per `maChien` whose lines are that batch's nonzero grades
- [x] 7.2 Remove the local `lastCode` sequential counter at `finishedProductService.ts:654,707`; one code per header instead ← (verify: a three-batch bulk receipt generates exactly three `PN` codes, and a five-grade batch yields one slip with five lines)
- [x] 7.3 Ensure grades resolving to the same `LotProduct` chain their snapshots via the shared helper
- [x] 7.4 Update the single-FP path at `finishedProductService.ts:534-561` that built `receiptInputs[]` for `batchCreate`

## 8. Supply request batch fulfillment

- [x] 8.1 Add a batch-fulfill service method accepting several line decisions, recording a `SupplyRequestDecision` per line and updating `fulfilledQty`/`fulfillmentStatus`
- [x] 8.2 Emit one multi-line issue slip for all lines with `fulfilledQty > 0`, validating aggregate stock first so a shortfall aborts the whole batch including its decisions ← (verify: one insufficient package aborts every decision in the batch and creates no slip)
- [x] 8.3 Update the single-line auto-issue path at `supplyRequestService.ts:356-404` to write header plus one line
- [x] 8.4 Recompute parent supply-request status after a batch via the existing forward-only `advanceStatus`, and make the notification body enumerate the delivered lines now that one notification replaces N

## 9. Incidental backend readers

- [x] 9.1 Update `myHistoryService.ts:456-490` titles — `Phiếu nhập kho: ${r.tenSanPham}` must render a multi-line form using the header's line count or total
- [x] 9.2 Grep for any remaining reads of item-level fields off the two headers and repoint them to lines ← (verify: no non-migration code reads `soLuongNhap`, `soLuongXuat`, `tenSanPham`, or `lotProductId` from a slip header)

## 10. HTTP layer

- [x] 10.1 Add zod schemas in `backend/src/schemas/` for receipt and issue create/update, validating the nested line array — non-empty, `lotProductId` present per line, `soLuongThucTe` positive
- [x] 10.2 Rewrite `warehouseReceiptController.ts` to accept the nested body, wire the zod schema, and update notification metadata that currently reads `soLuongNhap`/`tenSanPham` from the flat body
- [x] 10.3 Rewrite `warehouseIssueController.ts` the same way
- [x] 10.4 Add a batch-fulfill route on `supplyRequestRoutes.ts` with the same role restrictions as single-line fulfillment
- [x] 10.5 Verify all routes appear in `ROUTE_MAP` (`backend/src/routes/index.ts`) and in server startup logs ← (verify: every new and changed endpoint returns the standard `{ success, message, data }` shape and maps `ValidationError`/not-found/`ConflictError` to 400/404/409)

## 11. Frontend data layer

- [x] 11.1 Update `frontend/src/services/warehouseReceiptService.ts` and `warehouseIssueService.ts` types to header-plus-lines, with a single create call replacing the loop
- [x] 11.2 Update `warehouseService.ts` receipt-history type for the line-sourced shape
- [x] 11.3 Add `useWarehouseReceipts` and `useWarehouseIssues` hooks with structured query-key factories (`all`, `lists`, `list`, `detail`)
- [x] 11.4 Replace the three raw `['warehouseIssues']` invalidations in `MaterialEvaluationManagement.tsx:513,554` and `ProductionMaterialEvaluationEntry.tsx:819` with factory keys

## 12. Frontend components

- [x] 12.1 Update `WarehouseReceiptTab.tsx`: table row rendering, filter config, filter logic so search matches when any line matches, detail modal showing lines as a table, and the form
- [x] 12.2 Update `WarehouseIssueTab.tsx` for the same five concerns
- [x] 12.3 Rewrite the submit path in `CreateWarehouseReceiptModal.tsx:190-216` from the N-iteration loop to one POST, removing the per-iteration `generateReceiptCode()` race ← (verify: creating five commodities issues exactly one request and one code; the success message names one slip with five lines, not five slips)
- [x] 12.4 Add multi-line support to `CreateWarehouseIssueModal.tsx`, which has no concept of rows today
- [x] 12.5 Update `FinishedProductWarehouseReceiptModal.tsx` for the one-slip-per-batch response
- [x] 12.6 Add multi-line selection to the supply-request fulfillment UI so a keeper can decide several lines in one submit

## 13. Print view

- [x] 13.1 Create a print view component rendering slip header fields plus a detail table with name, unit, requested and actual quantity, and a totals row
- [x] 13.2 Group detail rows into one labelled table per warehouse when a slip spans warehouses; single-warehouse slips render as one table
- [x] 13.3 Add CSS print styles (`@media print`) hiding app chrome, and wire a Print action into both tabs ← (verify: Vietnamese diacritics render intact in print preview — unlike the PDFKit path at `employeeEvaluationController.ts:523` which strips them — and a two-warehouse slip prints two labelled tables)

## 14. AI service

- [x] 14.1 Confirm `list_warehouse_receipts` and `list_warehouse_issues` in `ai-service/agent/registry.py:514-545` need no change (path-only pass-throughs, no field mapping), leaving the tool count at 72 and `test_registry.py` untouched

## 15. Tests

- [x] 15.1 Update `backend/src/__tests__/warehouseReceiptService.test.ts` for header-plus-lines; existing cases cover only the single-line path
- [x] 15.2 Update `warehouseIssueService.test.ts:137-182` mocks for the `materialEvaluation` lock shape
- [ ] 15.3 Update `maSanPhamPersistence.test.ts` assertions that read item-level fields off the issue header
- [ ] 15.4 Add test: aggregate-by-package validation rejects two lines that individually fit but jointly exceed the balance
- [ ] 15.5 Add test: sequential snapshots chain across two lines sharing a package, for both receipt and issue
- [ ] 15.6 Add test: update diff covering removed, added, modified, and repointed lines, plus rollback on guard failure
- [ ] 15.7 Add test: material evaluation delete refunds a finite amount summed from lines
- [ ] 15.8 Add test: `donViTinh` cascade rename reaches both line tables ← (verify: all four silent-failure modes from design.md now have a failing-without-fix test — aggregate overdraw, contradictory snapshots, NaN refund, no-op rename)

## 16. Verification

- [x] 16.1 `cd backend && npx tsc --noEmit` — must report zero errors
- [x] 16.2 `cd backend && npm run lint`
- [x] 16.3 `cd backend && npm test` — warehouse-related tests pass (6 pre-existing failures in unrelated suites)
- [x] 16.4 `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — must report zero errors, with no `TS2304`
- [x] 16.5 `cd frontend && npm run lint`
- [ ] 16.6 Run `gitnexus_detect_changes()` and confirm only expected symbols and flows are affected ← (verify: no unexpected service or flow appears in the impact report)

## 17. Follow-ups to record, not to implement here

- [x] 17.1 Reconcile `openspec/changes/warehouse-receipt-history` — it reports 0 of 28 tasks yet its deliverables (`mucDich`, receipt-history endpoint, `useReceiptHistory`) already exist and its `getByLotProduct` shape is rewritten here; archive it or mark its tasks done
- [x] 17.2 Record that production row counts for `warehouse_receipts`, `warehouse_issues`, and `material_evaluations` must be measured on the VPS before the backfill runs against production, with the triple backup the deploy playbook requires
- [x] 17.3 Record the follow-up change for multiple raw-material packages per material evaluation, which this design deliberately leaves out and which depends on the line shape landing first
- [x] 17.4 Record that a printed slip sample should be reviewed against the source regulation text or by the company accountant before it is relied on as a signed document

## 18. Bugfix batch — multi-line slips displayed and edited wrongly (found in user testing)

- [x] 18.1 `getAll()` of both slip services include `items: { orderBy: { stt: 'asc' } }` — without lines the list table fell back to the deprecated header mirror and silently hid every line after the first
- [x] 18.2 List tables render one row per commodity line with `rowSpan`-merged slip columns; cross-unit quantity summing removed (1 Cái + 1 Cuộn no longer prints as "2 Cái"); pagination still counts slips
- [x] 18.3 Multi-line edit modals (`EditWarehouseIssueModal`, `EditWarehouseReceiptModal`) replace the single-line inline edit forms; update payloads carry each stored line's `id` so `diffLines` classifies retained lines as modified instead of removed + added
- [x] 18.4 Search and column filters match when ANY line matches, for commodity name, warehouse, and lot, with the header retained only as the legacy no-lines fallback
- [x] 18.5 `WarehouseSlipPrintView` totals broken out per unit of measure instead of one cross-unit sum
- [x] 18.6 Spec updated: list response MUST include lines; new requirements for row-per-line rendering, id-carrying update payloads, and any-line search
- [x] 18.7 Tests added for `getAll()` including lines in both slip services
- [x] 18.8 Detail-modal totals row in both tabs broken out per unit of measure; `totalsByUnit`/`formatActualTotalByUnit` extracted to `frontend/src/utils/warehouseSlipTotals.ts` so the print view and both modals share one implementation. `header.tongSoLuongThucTe` is no longer read for display — it is itself a cross-unit sum ← (verify: a slip of 1 Cái + 1 Cuộn shows "1 Cái, 1 Cuộn" in the detail modal, never a bare "2")
- [x] 18.9 Spec: cross-unit requirement extended to cover the detail modal and to forbid rendering the header's derived total column
