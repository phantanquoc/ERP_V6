## Why

Every warehouse slip currently holds exactly one commodity. `WarehouseReceipt` and `WarehouseIssue` carry flat item-level columns (`lotProductId`, `tenSanPham`, `soLuongNhap`/`soLuongXuat`, `soLuongTruoc`, `soLuongSau`, `donViTinh`, `lotId`, `tenLo`, `warehouseId`, `tenKho`) with no child table. Receiving three commodities means three slips, three `PN` codes, three audit trails for what the warehouse staff experienced as one event.

The UI already pretends otherwise. `CreateWarehouseReceiptModal.tsx:190-216` lets the user pick many rows, then loops — one `generateReceiptCode()` call plus one POST per row. That produces N slips, N+1 requests, and a code-collision race when two users submit concurrently. The closing alert reads `Đã tạo 5 phiếu nhập kho thành công`.

Three automated flows scatter slips the same way: `finishedProductService.ts:703-795` emits up to 8 receipts for a single fry batch (one per grade); `supplyRequestService.ts:356-404` emits one issue per fulfilled line; `materialEvaluationService.ts:272-290` emits one issue per evaluation.

Slips are also unprintable today — there is no print path anywhere (`window.print`, `jspdf`, `html2canvas`, `react-to-print` all absent from `frontend/package.json`), so a warehouse keeper has nothing to sign. Vietnamese accounting practice (Mẫu 01-VT / 02-VT under TT 200 and TT 133) and mainstream ERP (SAP MKPF/MSEG, Odoo picking/move) both settle on the same shape: one header, many detail lines, and two quantity columns — requested versus actual.

## What Changes

- **BREAKING** `WarehouseReceipt` and `WarehouseIssue` become headers with child line tables `WarehouseReceiptItem` / `WarehouseIssueItem`. Item-level columns move to the lines. Header keeps the flat columns as nullable with `@deprecated`, following the `SupplyRequestItem` / `PurchaseRequestItem` precedent in this repo.
- Warehouse and lot live **on each line**, so one slip may span multiple warehouses and multiple lots.
- Each line splits quantity into requested (`soLuongYeuCau`) and actual (`soLuongThucTe`), which is how partial issue is expressed without a separate mechanism.
- Stock snapshots (`soLuongTruoc` / `soLuongSau`) move to the line. Two lines touching the same `lotProduct` compute **sequentially** — the second line's opening balance is the first line's closing balance.
- Issue stock validation aggregates by `lotProductId` and checks the **total before writing any line**. Today `warehouseIssueService.ts:75-77` checks one item in isolation; looping that logic would let two 60-unit lines both pass against a 100-unit balance and drive stock negative.
- Slip update becomes a line diff (lines removed, added, or repointed to a different `lotProduct`), replacing the single reverse-then-apply pair at `warehouseReceiptService.ts:129-185`.
- The three automated flows each emit **one** multi-line slip instead of N single-line slips. Supply-request fulfillment gains a new endpoint so a warehouse keeper can decide several lines at once; deciding a single line still yields a one-line slip.
- Slips print from the browser via CSS print styles, grouping detail rows by warehouse into separate tables. No backend PDF — the existing PDFKit path at `employeeEvaluationController.ts:523` uses `Helvetica` and strips Vietnamese diacritics (`BANG DIEM DANH GIA`), which is unacceptable on a document that gets signed.
- Zod validation is introduced for both endpoints; `backend/src/schemas/index.ts` currently has none for warehouse.
- Frontend gains a hook layer with a query-key factory. Components call services directly today, and three files invalidate with the raw string `['warehouseIssues']`.

Explicitly **not** in this change: slip approval workflow, append-only inventory ledger, cancel-plus-reversal in place of edit, Excel export, and unit-price/line-total UI (schema reserves the columns, no UI is built).

## Capabilities

### New Capabilities
- `warehouse-slip-multi-item`: One slip carries many commodity lines across warehouses and lots — line schema, sequential per-line stock snapshots, aggregate-before-write stock validation, and the line-diff update algorithm.
- `warehouse-slip-print`: Browser-based printable slip laid out after Mẫu 01-VT / 02-VT, with detail rows grouped into one table per warehouse.
- `supply-request-batch-fulfill`: A warehouse keeper decides several supply-request lines in one action, producing a single multi-line issue slip.

### Modified Capabilities
- `warehouse-slip-management`: Update, delete, negative-stock guard, and `isLocked` requirements are all written against a single flat item. They must be restated for headers with lines — the guard now runs across every line before any write, and update becomes a diff. Lock semantics stay at header level and keep their current triggers.
- `material-evaluation-warehouse-integration`: The refund path reads `warehouseIssue.soLuongXuat` off the header at `materialEvaluationService.ts:471`. Once that column moves to the line, the expression evaluates to `soLuong + undefined` — `NaN` stock, thrown silently. Refund must read or sum from lines. Creation moves to header-plus-one-line.
- `finished-product-warehouse-receipt`: Bulk receipt across grades emits one slip per grade today, with codes generated by a local `lastCode` counter inside the transaction (`finishedProductService.ts:654,707`). It becomes one slip whose lines are the grades.
- `lookup-crud`: Cascade rename of `donViTinh` maps by Prisma model name at `lookupService.ts:125-126`. Moving the column to line tables without updating those entries makes the rename update zero rows and raise nothing — precisely the failure the comment at `lookupService.ts:136-141` documents for `taxReport`.

## Impact

**Schema** — `backend/prisma/schema/business_production.prisma`: two new line models; `onDelete: Cascade` line→header, `onDelete: Restrict` line→`lotProduct` (the audit fence currently at `:255` and `:283` must follow the FK down, or deleting a package would silently erase slip history). `MaterialEvaluation.warehouseIssueId @unique` at `:316` stays valid because the relation is header-level.

**Backend services** — `warehouseReceiptService.ts` and `warehouseIssueService.ts` (create, update, delete, `getByLotProduct`, `batchCreate`); three external writers `finishedProductService.ts:640-800`, `supplyRequestService.ts:356-404`, `materialEvaluationService.ts:272-290` and `:455-479`; two incidental readers `lookupService.ts:125-126` and `myHistoryService.ts:456-490` (list titles like `Phiếu nhập kho: ${r.tenSanPham}` need a multi-line form).

**Backend HTTP** — `warehouseReceiptController.ts`, `warehouseIssueController.ts`, `warehouseReceiptRoutes.ts`, `warehouseIssueRoutes.ts` (issue routes have no `/batch` today), a batch-fulfill route on `supplyRequestRoutes.ts`, and new zod schemas.

**Frontend** — `warehouseReceiptService.ts`, `warehouseIssueService.ts`, `warehouseService.ts` types; new `useWarehouseReceipts` / `useWarehouseIssues` hooks with a key factory; `WarehouseReceiptTab.tsx` and `WarehouseIssueTab.tsx` (each assumes one row per slip in table render, filter config, filter logic, detail modal, and form); `CreateWarehouseReceiptModal.tsx`, `CreateWarehouseIssueModal.tsx`, `FinishedProductWarehouseReceiptModal.tsx`; supply-request fulfillment UI; a new print view.

**AI service** — `agent/registry.py:514-545` declares `list_warehouse_receipts` and `list_warehouse_issues` as path-only pass-throughs with no field mapping, so the tool count stays at 72 and `test_registry.py` is untouched. Header-level quantity totals are worth adding so the LLM need not sum nested lines.

**Tests** — `warehouseReceiptService.test.ts` and `warehouseIssueService.test.ts:137-182` (mocks the 1-1 `materialEvaluation` shape), `maSanPhamPersistence.test.ts`. New coverage required for: aggregate-before-write stock validation, sequential snapshots on repeated `lotProduct`, the update diff, and `donViTinh` cascade rename reaching line tables.

**Not affected** — no report, dashboard, `groupBy`, `aggregate`, or raw SQL reads these tables, so no analytics depend on the flat shape.

**Data migration** — dev backups show 0-8 rows across `warehouse_receipts`, `warehouse_issues`, and `material_evaluations`; production volume is unverified and must be counted on the VPS before migrating. Backfill maps each existing slip to a header plus one line.

**Overlapping change** — `openspec/changes/warehouse-receipt-history` reports 0 of 28 tasks done, yet its deliverables (`mucDich`, the receipt-history endpoint, `useReceiptHistory`) already exist in code. It must be reconciled or archived; its `getByLotProduct` shape is rewritten here.
