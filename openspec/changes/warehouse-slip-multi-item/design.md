## Context

`WarehouseReceipt` and `WarehouseIssue` (`backend/prisma/schema/business_production.prisma:234-290`) are flat tables: one slip holds one commodity. Ten item-level columns sit on the header — `lotProductId`, `tenSanPham`, `soLuongTruoc`, `soLuongNhap`/`soLuongXuat`, `soLuongSau`, `donViTinh`, `lotId`, `tenLo`, `warehouseId`, `tenKho`.

Twenty-one read/write sites touch these two models across six backend services, eight frontend components, two AI tools, and four test files. Four facts shape this design:

The repo has already solved this exact 1→N problem twice — `SupplyRequestItem` and `PurchaseRequestItem`. Worth noting: `supply-request-multi-item-workflow/design.md` decision D5 called for dropping the old header columns, but the shipped schema kept them nullable with `@deprecated` comments (`business_production.prisma:22-29`). The implementation diverged from its own design, and the divergence is the safer choice. This design follows what shipped, not what that document said.

No report, dashboard, `groupBy`, `aggregate`, or raw SQL reads either table. The only name-addressed access is `lookupService`. Nothing in analytics depends on the flat shape.

There is no print or export path for slips anywhere in the frontend — nothing to rewrite, and nothing currently signable.

Dev backups hold 0-8 rows in these tables. Production volume is unmeasured.

## Goals / Non-Goals

**Goals:**
- One slip carries many commodity lines, spanning multiple warehouses and multiple lots
- Requested and actual quantity are separate columns per line, expressing partial issue without a dedicated mechanism
- Stock never goes negative, including when several lines target the same package
- Per-line stock snapshots remain a truthful audit record of the balance at slip time
- The three automated flows each emit one multi-line slip instead of N single-line slips
- A warehouse keeper can print a slip that follows Mẫu 01-VT / 02-VT closely enough to sign
- Existing lock semantics (supply-request-linked, material-evaluation-generated) survive unchanged

**Non-Goals:**
- Slip approval workflow (draft/confirmed states)
- Append-only inventory ledger as source of truth for stock
- Cancel-plus-reversal replacing in-place edit
- Unit price and line total in the UI (columns are reserved; no UI is built)
- Excel export
- Multiple raw-material packages per material evaluation — that is a separate change, designed alongside this one (see D9)
- Traceability from finished product back to source package

## Decisions

### D1: Child line tables, header keeps deprecated flat columns

Add `WarehouseReceiptItem` and `WarehouseIssueItem` as relational child rows. Move the ten item-level columns to the line. On the header, keep those columns nullable with `@deprecated` comments rather than dropping them.

Keeping them costs a little schema noise and buys three things: the migration never destroys data, backfill is reversible, and consumers can be migrated flow by flow instead of in one atomic sweep. This is what `SupplyRequest` actually shipped.

Alternatives: JSON column (no referential integrity, no `Restrict` fence on `lotProduct`, violates the project's stated child-table convention); dropping the flat columns immediately (matches the letter of the earlier design doc but makes rollback lossy).

### D2: Warehouse and lot live on the line

Both columns move down, so one slip may span warehouses and lots. This follows SAP, which puts `WERKS` and `LGORT` on `MSEG` and keeps only document-level fields on `MKPF`.

The cost lands on the printed slip: Mẫu 02-VT has exactly one `Xuất tại kho` line in its header. D7 handles that.

Alternative considered and rejected: warehouse on the header with lot on the line. Simpler and matches the printed form directly, but a receipt splitting one delivery across two warehouses would need two slips — reintroducing the scattering this change exists to remove.

### D3: Two quantity columns per line

Each line carries `soLuongYeuCau` (requested) and `soLuongThucTe` (actual). Stock moves on `soLuongThucTe`. When a line is fully served the two are equal; a short issue records the gap in place.

Both Mẫu 02-VT (`Yêu cầu` / `Thực xuất`) and Odoo (`Demand` / `Quantity`) arrive at this independently. It also means partial fulfillment needs no separate status field.

### D4: Stock validation aggregates by package, before any write

Group the incoming lines by `lotProductId`, sum `soLuongThucTe` per group, and compare each group's total against the current balance. Every group must pass before the first line is written.

This is the single most important decision in the change. Today `warehouseIssueService.ts:75-77` validates one item against one balance. Looping that check per line would let two lines of 60 each pass independently against a balance of 100, then write 120 out and leave stock at -20. The check must be aggregate and it must precede all writes — a per-line check inside the write loop fails the same way, just later.

### D5: Per-line snapshots computed sequentially

`soLuongTruoc` and `soLuongSau` move to the line. Lines are processed in a deterministic order, and each line's opening balance is read from a running in-transaction tally rather than from the database row.

When two lines touch the same package, the second line's `soLuongTruoc` must equal the first line's `soLuongSau`. Reading `lotProduct.soLuong` fresh for each line produces two lines claiming the same opening balance — snapshots that contradict each other and misrepresent the audit trail even when the final balance happens to be right.

The current code never faces this case, so it has no handling for it.

Alternative: drop snapshots and derive history from an inventory ledger. That is the pattern mainstream ERP uses (Kardex), and it is out of scope here — the snapshots are what existing screens read.

### D6: Update is a line diff

Slip update partitions incoming lines against stored lines into removed, added, and modified sets. Every removed line reverses its stock effect, every added line applies its own, and modified lines reverse-then-apply — potentially against a different package if `lotProductId` changed. All negative-stock guards run across the fully-resolved set before any write, then snapshots recompute sequentially per D5.

This replaces the single reverse-then-apply pair at `warehouseReceiptService.ts:129-185` and `warehouseIssueService.ts:136-191`. It is the most bug-prone surface in the change; the existing tests only cover the one-line case.

### D7: Print groups detail rows by warehouse

The printed slip renders from the browser using CSS print styles. Because warehouse sits on the line (D2), the header cannot carry a single `Xuất tại kho` value. Instead the detail rows group by warehouse, one table per warehouse, each labelled with its warehouse name. A single-warehouse slip — the common case — renders as one table and reads like the standard form.

No backend PDF. The existing PDFKit path at `employeeEvaluationController.ts:523` registers `Helvetica`, which has no Vietnamese glyphs, so its output reads `BANG DIEM DANH GIA`. Browser printing uses system fonts and renders diacritics correctly with no new dependency. The trade-off is no server-side file to archive or email.

### D8: One code per slip, generated once

`generateCode` is called once per slip instead of once per commodity. This removes the N+1 request pattern and the code-collision race at `CreateWarehouseReceiptModal.tsx:192`, where each loop iteration independently asked for the next code.

`finishedProductService.ts:654,707` maintains a local `lastCode` counter to sequence codes inside its transaction. With one slip per fry batch, that counter disappears.

### D9: Material evaluation adapts to the new shape here; multi-package is a separate change

This change updates `materialEvaluationService` to write a header plus exactly one line, and fixes the refund path. It does not give an evaluation multiple packages.

The reason to design them together: `MaterialEvaluation.warehouseIssueId @unique` (`business_production.prisma:316`) is the hinge. Because a slip can now hold many lines, one issue slip can serve a multi-package evaluation later — so the 1-1 relation stays valid and the follow-up change needs only its own line table, not an FK reversal. Choosing the FK direction without knowing that would mean redoing it.

The refund fix is not cosmetic. `materialEvaluationService.ts:471` computes `lotProduct.soLuong + warehouseIssue.soLuongXuat`. Once `soLuongXuat` leaves the header that term is `undefined`, the sum is `NaN`, and `NaN` writes to stock without throwing. It fails silently and corrupts the balance.

### D10: Cascade-rename registry follows the column down

`lookupService.ts:125-126` maps `donViTinh` cascade rename by Prisma model name. Both entries must repoint to the line models and tables.

Miss this and renaming a unit of measure updates zero rows and raises nothing. The comment at `lookupService.ts:136-141` documents this exact failure mode for `taxReport`, where the Prisma field name and Postgres column had drifted. That case earned a dedicated test; so should this one.

### D11: Batch fulfillment is a new endpoint, not a change to the existing one

`supplyRequestService.partialFulfill()` decides one line per call — a warehouse keeper may decide line 1 in the morning and line 2 that afternoon, and there is no endpoint to decide several at once. Rather than reshape `partialFulfill`, add a batch endpoint that accepts several line decisions and emits one multi-line issue slip.

Deciding a single line keeps working exactly as it does and yields a one-line slip. Slips stay immutable after creation — no appending lines to an already-printed document.

Alternative rejected: one open issue slip per supply request, appending a line on each decision. Fewest slips, but a slip already printed and signed could later grow another line, which destroys its value as a document.

### D12: Header carries quantity totals

Store aggregate totals on the header. Two consumers need them: `myHistoryService.ts:456-490` builds titles like `Phiếu nhập kho: ${r.tenSanPham}` from header fields, and the AI tools at `agent/registry.py:514-545` pass backend JSON straight to the LLM with no field mapping. Totals spare the LLM from summing nested arrays, and spare list screens from loading every line.

Totals are derived, so they must be recomputed inside the same transaction as any line mutation.

## Risks / Trade-offs

- [Negative stock from per-line validation] The single highest risk. Looping the existing per-item check across N lines silently permits overdraw → Mitigation: D4 aggregates by `lotProductId` and validates before any write; dedicated test with two lines on one package exceeding the balance in total but not individually
- [Contradictory snapshots on repeated packages] Two lines on the same package both reading the pre-transaction balance produce snapshots that disagree → Mitigation: D5 sequential tally from an in-transaction running balance; dedicated test asserting line 2's `soLuongTruoc` equals line 1's `soLuongSau`
- [Silent NaN in material evaluation refund] `soLuong + undefined` neither throws nor type-errors if the value passes through `any` → Mitigation: D9 fixes the read; test asserts refunded balance is a finite number matching the summed lines
- [Silent no-op unit rename] Cascade rename resolving to a model that no longer holds the column updates zero rows without error → Mitigation: D10; test asserts rename reaches line tables, mirroring the existing `taxReport` test
- [Lost audit fence on package delete] `onDelete: Restrict` currently lives on the header→`lotProduct` FK. If lines get `Cascade` toward the header and the `Restrict` toward `lotProduct` is forgotten, deleting a package silently erases slip history → Mitigation: line→header is `Cascade`, line→`lotProduct` is `Restrict`; test asserts deleting a referenced package is rejected
- [Update diff complexity] The diff has three line classes and an optional package repoint; wrong ordering of reverse and apply corrupts stock → Mitigation: resolve the full diff and run every guard before any write; test each class plus the repoint case
- [Breaking API shape] Response and request bodies gain a nested `items` array; the three raw `['warehouseIssues']` invalidations and all frontend types break → Mitigation: introduce the hook layer with a key factory in the same change; header keeps deprecated flat fields so a stale reader degrades rather than crashing
- [Notification volume drops] `supplyRequestService.onWarehouseDocumentCreated()` fires once per slip today; one slip per fulfillment means N notifications become 1 → Mitigation: intended, but confirm the requester still learns what was delivered — the notification body must enumerate lines
- [Unmeasured production volume] Dev backups show 0-8 rows; production is unknown → Mitigation: count rows on the VPS before migrating, take the triple backup the deploy playbook requires
- [Print fidelity] Grouping detail rows by warehouse departs from Mẫu 02-VT, which has one warehouse in its header → Mitigation: single-warehouse slips (the common case) render as one table and match the form; accounting should review a printed sample before this reaches daily use
- [Unverified legal field list] The 01-VT and 02-VT field lists come from secondary sources; the source regulations could not be retrieved → Mitigation: treat print layout as provisional and confirm against the regulation text or the company accountant before relying on it as a signed document

## Migration Plan

1. Add the two line tables. Add header total columns. Make the ten item-level header columns nullable and mark them `@deprecated`. `onDelete: Cascade` line→header, `onDelete: Restrict` line→`lotProduct`.
2. Backfill: one line per existing slip, copying the header's item-level values including both snapshots. Set `soLuongYeuCau` equal to `soLuongThucTe` for backfilled rows — historical slips have no separate requested figure. Populate header totals from the single line.
3. Repoint the two `lookupService` cascade-rename entries to the line models (D10).
4. Migrate services: the two core services first, then `materialEvaluationService` (including the refund fix), `finishedProductService`, `supplyRequestService`.
5. Deploy backend, then frontend.

Rollback: the flat header columns are never dropped, so reverting the application code restores working behavior — with the caveat that any slip created after the migration carries its data only in lines, and reverted code would read `null` from the header. A pre-migration snapshot is required, and rollback beyond the first multi-line slip means data loss on those slips.

Column removal is deliberately deferred to a later cleanup change, once every consumer reads lines.

## Open Questions

- Should a slip be allowed to hold two lines pointing at the same package? Nothing requires it, and forbidding it would remove the sequential-snapshot hazard entirely. Decision taken: allow it and handle it correctly per D5, because the automated flows may legitimately emit repeats and a validation error there would be opaque to the user. Revisit if it proves confusing in practice.
- Do unit price and line total belong on the line now, columns reserved but unused, or should they wait? Decision taken: reserve the columns in this migration so adding the UI later needs no schema change; leave them out of the API contract and UI.
- What should list screens show in the commodity column for a multi-line slip? A count, the first line plus a count, or a concatenation? Decision taken: leave to the frontend task with a count-based default, since it carries no data-integrity consequence.
- Production row counts for the three affected tables remain unmeasured. Must be answered before step 2 runs against production, not before implementation starts.
