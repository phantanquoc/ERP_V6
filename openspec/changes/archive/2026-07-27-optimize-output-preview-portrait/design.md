## Context

The fry-output kiosk flow has two screens: the entry board (`ProductionDataEntry`, main render path) and the review screen (`FullGridPreview`, rendered when `showPreview` is true). Commit `51a350f` made the entry board adaptive for portrait tablets — card layout below 700 px, sticky matrix table above — but left `FullGridPreview` untouched. The review screen therefore still renders five stacked full-width tables with raw numeric inputs and bottom-anchored action buttons.

Target device: Honor Pad X7, 8.7", 800×1340 physical, DPR ~1.5 → ~533×893 px CSS. After the Chrome URL bar and page padding, roughly **501 px usable width** and **800 px usable height**. Portrait orientation is the confirmed deployment posture.

Measured against that budget, the current review screen needs ~3,400 px of vertical scroll and 660 px of width per table. It also has three functional defects in the same flow: the focus editor reselects text while the worker types, the entry board has no field-advance control, and the note input writes to a column that does not exist.

`FieldFocusEditor` is shared by all three kiosk screens (`ProductionDataEntry`, `ProductionSystemOperationEntry`, `ProductionMaterialEvaluationEntry`). The latter two already use its `onNext` prop, so any change to its synchronization logic must preserve their field-jump behavior.

Existing state and save logic (`board`, `baseline`, `updateCell`, `computeDirtyRecords`, `handleConfirm`) is correct and stays untouched; this change is confined to the presentation layer plus one defensive backend deletion.

## Goals / Non-Goals

**Goals:**

- Make the review screen readable and correctable on a ~501 px portrait viewport with no horizontal scrolling.
- Cut review scroll length from ~4.3 screens to roughly one screen for a typical shift.
- Keep the action buttons reachable while the virtual keyboard is open.
- Make multi-digit and decimal entry work correctly in the focus editor across all three kiosk screens.
- Let the worker traverse the output matrix with a field-advance control instead of tapping each of ~80 cells open and closed.
- Close the note data-loss hole and remove the latent 500 trap it would trigger.

**Non-Goals:**

- Changing dirty tracking, percentage math, `tongKhoiLuong`, or waste distribution.
- Changing the entry board's layout (only the note input is removed).
- Restructuring the operation-parameters or soaking-evaluation screens.
- Adding a `ghiChu` column, a Prisma migration, or note persistence of any kind.
- Touching the warehouse-receipt flow, kiosk session handling, validation thresholds, or `parseNumberInput`.
- Adding a manual layout-toggle control.

## Decisions

### Transpose the review sub-table to machines × grades

The review card places machines on rows and the five quality grades on columns, budgeting ~60 px for the machine label and ~80 px per grade column, totaling ~470 px.

Alternatives considered:

- **Reuse the entry board's pattern (quality tabs + batch cards).** Fits the width, but the worker would have to cycle five tabs to review one shift, which defeats the purpose of a review pass.
- **Keep batch × machine tables and add sticky columns.** Sticky context fixes disorientation but not the 660 px width; the worker still scrolls horizontally on every table.
- **Transposed machine × grade card (chosen).** Eight machines and five grades fit within the width budget, and a single card holds everything about one fry batch, which matches how a review is actually performed. The axis flip is safe because the underlying cell key is `${maChien}|${machineSystemId}` per quality tab — rendering order is independent of storage.

### Filter to entered/changed cells, with an explicit reveal-all escape hatch

A cell qualifies when its value is non-zero or differs from `baseline`. Empty grade columns are dropped per card, and cards with no qualifying cell are dropped. This aligns the implementation with the pre-existing spec wording ("only changed/entered cells") and is what collapses the ~3,400 px of scroll.

The current full-grid rendering is not purely accidental — it lets a worker notice and fill a cell they skipped. Rather than removing that capability, a reveal-all control restores the exhaustive view on demand. Default-hidden with an escape hatch keeps the common path short without losing the recovery path.

### Sync the focus editor on field identity, not on value

Replace the effect dependency `[open, value, label]` with the field-identity pair `[open, label]`, so the local text state is seeded when the overlay opens or switches fields and is otherwise left alone while the worker types.

Alternatives considered:

- **Drop the `select()` call only.** Fixes the digit-replacement symptom but not the decimal-point loss or the forced-empty behavior, since the effect would still overwrite `localValue` mid-typing.
- **Guard with a "user is typing" ref.** Works, but adds mutable state to track something the dependency array can express directly.
- **Key on `label` (chosen).** Each field's label is unique within a screen (`GĐ1 - Nhiệt độ`, `Máy 01 · MC-001`, `Vụn - Phế phẩm (tổng ca)`), which is exactly the re-sync trigger the `onNext` flow needs. The two screens that already use `onNext` change the label on every jump, so their behavior is preserved.

Because the overlay is shared, this fix must be validated on all three kiosk screens, not just the output board.

### Advance across machines within a batch, then to the next batch

The output board's focus editor gains an `onNext` handler that walks the active tab's cells in row-major order over (fry batch × machine): all machines of the current batch, then the first machine of the next batch. Traversal is sequential and does not skip cells that already hold a value.

Alternatives considered:

- **Advance down batches within a machine.** Suits a workflow where the worker weighs machine by machine; not the confirmed order.
- **Skip cells that already hold a value.** Fewer taps, but it silently jumps over cells, making it harder to notice a wrong prior entry.
- **Machines-then-batches, sequential (chosen).** Matches the card grouping already used on the entry board, where one card is one fry batch containing its machines. Predictable position is worth more than tap count on a shop floor.

Traversal stops at the tab boundary: switching quality grade is a deliberate decision by the worker, so the control is hidden at the last cell rather than crossing into another tab. The waste tab holds a single input and gets no control.

### Suppress the note input rather than persisting notes

`FinishedProduct` has no `ghiChu` column, so notes cannot be persisted without a schema migration. Meanwhile `upsertByBatchMachine` spreads `ghiChu` into Prisma, which would throw `Unknown argument 'ghiChu'` and return 500 the moment the frontend sends it — the parameter is typed `any`, so the compiler cannot warn.

Alternatives considered:

- **Add the column now.** Requires deciding whether a note belongs to a fry batch or to one machine row (the UI binds every note to the first machine, while the table stores one row per batch × machine). That decision affects reporting and needs a production migration with a backup — too much for a presentation-layer change.
- **Leave the input in place.** Workers keep typing into a field that is discarded on confirm. Unacceptable: silent data loss.
- **Remove the input and the backend spread (chosen).** Stops the loss immediately and removes the latent 500. The `notes` field stays in the `DraftData` type so existing localStorage drafts continue to parse; the reader tolerates the key even though nothing writes it any more.

## Risks / Trade-offs

- **Transposed axes could confuse workers used to the batch × machine grid** → The card header repeats the fry-batch code, fry time and commodity name, and machine labels are on every row, so the reading context is explicit rather than inferred from scroll position.
- **Filtering cells by default could hide a value the worker expects to see** → Filtering keys on the same non-zero-or-differs-from-baseline test that dirty tracking uses, so any cell that will be written is shown. The reveal-all control exposes the rest.
- **Changing `FieldFocusEditor` affects two screens outside this change's focus** → Keying on `label` preserves the exact re-sync trigger their `onNext` flows rely on; verification must exercise the field-jump path on both.
- **Removing the note input is a visible feature loss for workers who use it** → The field never persisted anything, so nothing that previously reached the database is lost. The follow-up change can reinstate it properly.
- **Row-major traversal on a sparse matrix means passing through many irrelevant cells** → Accepted deliberately: the alternative (skipping filled cells) makes position unpredictable and hides prior mistakes.
- **Dropping the backend `ghiChu` spread could break an unknown caller** → The field is absent from the Prisma model, so any caller sending it is already receiving a 500; removing the spread cannot regress a working path.

## Migration Plan

No data migration, no schema change, no API contract change. Frontend presentation plus one backend line deletion; deploy is a normal build. Rollback is a revert of the change — existing localStorage drafts stay compatible in both directions because the `notes` key is retained in the draft type.

## Open Questions

None. The note-column ownership question (fry batch versus machine row) is deliberately deferred to the follow-up change recorded in the proposal.
