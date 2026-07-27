## Why

The fry-output review screen (`FullGridPreview`) was skipped when commit `51a350f` optimized the main entry board for portrait tablets. On the shop-floor device (Honor Pad X7, 8.7", 800×1340 physical, DPR ~1.5 → ~533×893 px CSS, ~501 px usable width and ~800 px usable height after the Chrome URL bar), the review screen is effectively unusable in portrait:

1. Five quality tables (Hàng A / B / B dầu / C / Ướt) are stacked vertically with no tabs → ~3,400 px of content in a ~800 px viewport = ~4.3 screens of scrolling.
2. Each table needs 100 px (mã chiên) + 8 machines × 70 px = 660 px, exceeding the ~501 px available → 1.3× horizontal scrolling per table.
3. No sticky header or sticky mã chiên column → scrolling horizontally loses the "which machine, which batch" context, risking review against the wrong machine.
4. The Sửa lại / Xác nhận buttons sit at the bottom with `keyboardOpen ? 'translate-y-full' : ''`, so opening the virtual keyboard pushes them off-screen — violating the existing requirement that save and navigation controls stay in the upper half of the screen.
5. Cells use a raw `<input type="number">` instead of the shared focus editor, so the keyboard covers the cell being edited and no clamp warning is shown.
6. All `filteredBatches × fryers` cells render for all five tabs (10 batches × 8 machines = 400 cells, mostly empty), contradicting the existing requirement that the preview shows only changed/entered cells.

Two input defects and one silent data-loss hole are in the same flow and are fixed here:

- **Select-all defect**: `FieldFocusEditor` has `value` in its `useEffect` dependency array. `value` is a parent prop that changes on every keystroke, so typing "1" triggers `onChange(1)` → parent re-render → effect re-runs → `setLocalValue("1")` and, 50 ms later, `select()` on the whole field. The next keystroke replaces the selection, so typing "1" then "2" yields "2" instead of "12". Two derived defects: typing `12.` yields `Number("12.") === 12`, the effect overwrites `localValue` with `"12"` and the decimal point is lost; and `value === 0 ? ''` forces the field empty whenever the value returns to 0. The dependency exists to re-sync when the "Tiếp" button jumps fields, but `label` alone is sufficient because each field's label is unique.
- **Note data loss**: `notes` is captured in the UI and persisted to the localStorage draft, but `computeDirtyRecords` never reads it and `patchData` has no `ghiChu`, so notes are lost on confirm. The `FinishedProduct` model has no `ghiChu` column at all, yet `upsertByBatchMachine` spreads `ghiChu` into the Prisma call — if the frontend ever sent the field, Prisma would throw `Unknown argument 'ghiChu'` and return 500. The parameter is typed `any`, so `tsc` cannot catch it.

## What Changes

- Rebuild the review screen as a **card list by fry-batch code** with the sub-table axes transposed: machines as rows, the five quality grades as columns (~60 px + 5 × 80 px ≈ 470 px, fitting the ~501 px width with no horizontal scrolling). Each card header shows mã chiên · giờ chiên · tên nguyên liệu, so one batch is reviewed in one card without switching tabs.
- The review screen shows **only cells that were entered or changed** by default: a cell qualifies when its value is non-zero or differs from the loaded database baseline. Columns where every cell in the card is empty are hidden, and cards with no qualifying cell are hidden entirely.
- Add a **"Hiện tất cả ô để điền bù"** control that reveals every batch × machine × grade cell, preserving the fill-in-the-gaps capability the current full grid provides.
- Move the **Sửa lại / Xác nhận buttons to the top of the review screen**, removing `sticky bottom-0` and the `translate-y-full` keyboard shift, so they remain visible while the virtual keyboard is open.
- Show the **production date and shift** on the review screen alongside the operator name, since the draft is keyed by date + shift.
- Review-screen cells open the shared **`FieldFocusEditor`** overlay instead of a raw numeric input. The review screen gets no "Tiếp" button — only isolated corrections happen there, and the transposed axes would give a different traversal order than the entry board.
- Fix `FieldFocusEditor` to sync on **field identity (`open` + `label`)** rather than on `value`, so multi-digit and decimal entry work and the field content is only reset when the overlay opens or switches fields.
- Add a **"Tiếp" button to the entry board's focus editor**, advancing across machines within a batch (MC-001/Máy 01 → Máy 02 → … → Máy 08 → MC-002/Máy 01 → …), sequentially and without skipping filled cells. Traversal is confined to the active quality tab; at the last cell the button is hidden rather than jumping to the next tab. The Vụn - Phế phẩm tab has a single input and gets no "Tiếp" button.
- Remove the **note input** from the fry-output entry board in both layout branches, and remove the `ghiChu` spread from `upsertByBatchMachine` so the 500 trap is gone. `notes` stays in the `DraftData` type so existing localStorage drafts keep parsing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `production-data-tablet-entry`: three requirements change — "Preview, confirm, and reset" gains the card layout with transposed machine × grade axes, the entered-cells-only default, the reveal-all control, top-positioned action buttons that survive the keyboard, the date + shift display, and focus-editor cell editing; "Adaptive layout by viewport width for output board" extends its scope to cover the review screen; "Touch-optimized numeric input" gains the "Tiếp" traversal rule for the matrix board and the requirement that the focus editor must not reselect or overwrite content while the worker is typing.

## Impact

**Frontend**

- `frontend/src/components/production/FieldFocusEditor.tsx` — effect sync keyed on field identity instead of value. Shared by all three kiosk screens, so the "Tiếp" flows in `ProductionSystemOperationEntry` and `ProductionMaterialEvaluationEntry` must keep re-syncing correctly.
- `frontend/src/pages/production/ProductionDataEntry.tsx` — `FullGridPreview` rebuilt; focus-editor overlay gains "Tiếp" wiring; note input removed from both the card and table layout branches.

**Backend**

- `backend/src/services/finishedProductService.ts` — drop the `ghiChu` spread in `upsertByBatchMachine`.

**Out of scope**

- `computeDirtyRecords`, percentage math, `tongKhoiLuong`, waste distribution.
- The main entry board layout (already optimized in `51a350f`) — only the note input is removed, nothing else changes.
- The Thông số vận hành and Đánh giá ngâm screens — they benefit passively from the `FieldFocusEditor` fix but are not otherwise modified.
- Prisma schema, migrations, and the `ghiChu` column.
- The warehouse-receipt flow, whose own `ghiChu` usages in the same backend service belong to a different model.
- Kiosk session handling, validation thresholds, `parseNumberInput`.
- No manual layout-toggle control is added.

**Follow-up (separate change)**

Adding a real `ghiChu` column to `FinishedProduct` requires deciding whether a note belongs to a fry batch or to an individual machine row, which affects reporting; it needs its own change with a migration and a database backup.
