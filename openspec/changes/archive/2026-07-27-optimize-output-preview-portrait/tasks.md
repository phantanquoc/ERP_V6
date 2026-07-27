## 1. Fix the shared focus editor

- [x] 1.1 In `frontend/src/components/production/FieldFocusEditor.tsx`, change the sync effect dependency array from `[open, value, label]` to the field-identity pair `[open, label]` so the local text state is seeded only when the overlay opens or switches fields
- [x] 1.2 Verify the effect still seeds `localValue`, clears `warning`, focuses and selects on open/field-switch, and that `clampAndNotify` + `onChange` behavior is unchanged
- [x] 1.3 Confirm typing "1" then "2" yields "12", typing "12.5" retains the decimal point, and clearing the field then retyping is not forced back to empty ← (verify: matches the three typing scenarios in the spec; no reselect while typing)
- [x] 1.4 Confirm the `onNext` field-jump flows on `ProductionSystemOperationEntry` and `ProductionMaterialEvaluationEntry` still re-sync and show the next field's current value ← (verify: shared component — both other kiosk screens must be exercised, not just the output board)

## 2. Rebuild the output preview for portrait

- [x] 2.1 In `frontend/src/pages/production/ProductionDataEntry.tsx`, replace `FullGridPreview`'s five stacked grade tables with a card list keyed by fry-batch code
- [x] 2.2 Render each card header with the fry-batch code, fry time and commodity name as read-only context (pass through whatever `filteredBatches` already provides)
- [x] 2.3 Inside each card, render a sub-table with machines as rows and the five non-waste grades (Hàng A, Hàng B, Hàng B dầu, Hàng C, Ướt) as columns, sized so the card fits about 501 px of usable width with no horizontal scrolling ← (verify: measure against 8 machines × 5 grades; no `overflow-x` scroll needed at portrait width)
- [x] 2.4 Add a qualifying-cell test: a cell qualifies when its value is non-zero or differs from the `baseline` value for the same tab and cell key
- [x] 2.5 Hide grade columns in which no cell of that card qualifies, and hide cards in which no cell qualifies
- [x] 2.6 Add a reveal-all control ("Hiện tất cả ô để điền bù") that renders every fry-batch × machine × grade cell including empty ones, and keep its touch target at least 44 px
- [x] 2.7 Display the production date and the shift alongside the operator name in the preview header
- [x] 2.8 Keep the existing waste summary block behavior unchanged
- [x] 2.9 Preserve the Vietnamese empty state when no fry batch matches the shift and date ← (verify: preview with zero qualifying cards does not render a blank card list)

## 3. Reposition the preview action buttons

- [x] 3.1 Move the "Sửa lại" and "Xác nhận" controls to the top of the preview screen
- [x] 3.2 Remove `sticky bottom-0` and the `keyboardOpen ? 'translate-y-full' : ''` shift from the action row, and drop the now-unused `keyboardOpen` prop from `FullGridPreview` if nothing else in the component uses it
- [x] 3.3 Keep both controls at a minimum 44 px touch target and preserve the pending/disabled state on "Xác nhận" ← (verify: buttons stay visible with the virtual keyboard open; confirm is still disabled while the mutation is pending)

## 4. Route preview cell editing through the focus editor

- [x] 4.1 Replace the raw `<input type="number">` in preview cells with a tap target that opens the shared focus-editor overlay for that fry batch, machine and quality grade
- [x] 4.2 Wire the overlay's `onChange` to the existing `updateCell` for the correct tab and cell key, keeping the `PRODUCTION_LIMITS.sanLuong` min/max clamp
- [x] 4.3 Ensure the preview's focus editor receives no `onNext`, so no "next field" control appears there
- [x] 4.4 Keep the visual dirty indicator (entered/changed cells distinguishable from untouched ones) in the new cell rendering ← (verify: editing a preview cell writes to the same data cell as the entry board; no inline keyboard opens over the table)

## 5. Add field advance to the output board

- [x] 5.1 Build the traversal order for the active quality tab: all machines of the current fry batch in order, then the first machine of the next fry batch, sequential and without skipping cells that already hold a value
- [x] 5.2 Pass an `onNext` handler to the entry board's focus editor that moves the editor cell to the next position in that order and updates the overlay label accordingly
- [x] 5.3 Hide the next control at the last cell of the active tab instead of advancing into another quality tab
- [x] 5.4 Do not offer the next control on the Vụn - Phế phẩm tab (single input)
- [x] 5.5 Remove the stale `no "Tiep" for DataEntry (complex table navigation)` comment now that traversal order is defined ← (verify: advance from the last machine of a batch lands on the first machine of the next batch; control absent at tab end and on the waste tab)

## 6. Close the note data-loss hole

- [x] 6.1 Remove the note input from the fry-output entry board's card layout branch
- [x] 6.2 Remove the note input from the fry-output entry board's table layout branch, including its table column header if one becomes empty
- [x] 6.3 Keep `notes` in the `DraftData` type and keep the draft reader tolerant of the key so existing localStorage drafts still parse
- [x] 6.4 Remove any now-unused note state or handler flagged by lint/type check, without touching `computeDirtyRecords`
- [x] 6.5 In `backend/src/services/finishedProductService.ts`, remove the `ghiChu` spread from `upsertByBatchMachine` ← (verify: only that one spread is removed; the warehouse-receipt `ghiChu` usages elsewhere in the same file are untouched)

## 7. Verification

- [x] 7.1 Run `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — no `TS2304` errors, and the total error count does not exceed the existing 610 baseline (count with `| grep -c "error TS"`)
- [x] 7.2 Run `cd frontend && npm run lint`
- [x] 7.3 Run `cd backend && npx tsc --noEmit` — must pass clean
- [x] 7.4 Run `cd backend && npm run lint`
- [x] 7.5 Run `cd backend && npm test`
- [x] 7.6 Run `gitnexus_detect_changes()` and confirm the affected scope is limited to the two frontend files and the one backend service ← (verify: no Prisma schema, migration, or warehouse-receipt files appear in the change set)
