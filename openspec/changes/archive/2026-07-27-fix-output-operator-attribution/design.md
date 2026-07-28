## Context

The fry-output kiosk board writes `FinishedProduct` records, one per (fry batch × machine). Each record holds eight grade weights but only one `nguoiThucHien` column. The board presents those grades as six tabs: five grade tabs backed by a batch × machine matrix, and a waste tab holding a single shift total.

On the shop floor a single tablet is shared and each worker owns one grade; the Ướt owner also enters the waste total. Nothing in the save path models that. `computeDirtyRecords` builds one patch per dirty cell key and unconditionally attaches `nguoiThucHien` — the currently selected operator — so any row it writes is reassigned regardless of which grade actually changed.

Two mechanics amplify it. `handleChangeOperator` and `handleChangeShift` intentionally preserve the localStorage draft across a switch, so unsaved values from the previous worker are still on the board when the next worker confirms. And `applyWasteDistribution`, invoked from `handleSave` whenever `wasteTotal > 0`, writes a share into every batch × machine cell, marking all of them dirty at once.

The wrong name is externally visible: `nguoiThucHien` is exported as the "Người thực hiện" column in the Excel report and is a searchable field.

One structural fact makes the fix cheap. `updateCell` is never called with the `VUN_PHE` tab — the waste tab has a single input, and the entire `board.VUN_PHE` map is produced by `applyWasteDistribution`. So "hand-typed by a worker" and "distributed by the system" are already perfectly separated by tab identity, with no additional state to track.

## Goals / Non-Goals

**Goals:**

- Stop attributing a grade weight to a worker who did not enter it.
- Keep even waste distribution from reassigning operators across the whole shift.
- Prevent one worker's unsaved draft from being confirmed under another worker's name.
- Do all of the above without a schema change or migration.

**Non-Goals:**

- Per-grade attribution. A single column cannot express it; that needs the deferred history table.
- Persisting `operatorId` or any employee reference (requires a new column).
- Changing percentage math, `tongKhoiLuong`, or the even-distribution formula.
- Touching the entry board layout, the preview screen, or `FieldFocusEditor`.
- Repairing wrong names already stored in the database.

## Decisions

### Gate the operator stamp on grade-tab dirtiness

`computeDirtyRecords` already iterates the five grade tabs separately from the waste tab. The fix is to record, per cell key, whether any grade tab contributed a change, and to include `nguoiThucHien` in that record's patch only when it did.

Alternatives considered:

- **Stamp per field alongside each weight.** Would be exact, but there is only one name column — there is nowhere to put a second name.
- **Track a "hand-typed" flag in board state.** Works, but adds mutable state to express something the tab split already encodes. `updateCell` is never called for `VUN_PHE`, so tab identity is a reliable proxy for authorship.
- **Gate on grade-tab dirtiness (chosen).** No new state, and the boundary is structural rather than conventional — a future change that made the waste tab a real matrix would have to revisit this deliberately.

### Skip the field on update, always stamp on create

`nguoiThucHien` is a required `String` in Prisma. A record that does not exist yet and receives only a distributed waste share has no prior name to preserve, so omitting the field would violate the constraint at creation time.

`upsertByBatchMachine` therefore treats its two branches differently: the update branch applies `nguoiThucHien` only when the client sent it, while the create branch always stamps the current operator. The frontend expresses intent by including or omitting the field; the backend does not infer authorship on its own.

Alternatives considered:

- **Make the column nullable.** Requires a migration and leaves the report column empty for waste-only rows.
- **Always stamp on the backend when absent.** Defeats the purpose — the update path would reassign the operator again.
- **Omit on update, stamp on create (chosen).** The constraint is satisfied, and a waste-only row that already has an owner keeps it.

### Require a save before switching operator or shift

The draft-preserving switch exists so a worker can hand the tablet over without losing work in progress. In practice it means the receiving worker confirms someone else's numbers under their own name. Requiring a save first removes the ambiguity entirely: whatever is on the board when Xác nhận is tapped belongs to the person currently selected.

Alternatives considered:

- **Keep the draft but stamp each cell with the operator active when it was typed.** Would need per-cell operator state in the draft and a draft-format migration for existing localStorage entries.
- **Discard the draft silently on switch.** Loses the worker's entries — worse than the bug.
- **Require saving first (chosen).** No data is lost, no draft format change, and it matches how the tablet is actually used: each worker finishes their grade, saves, then hands over.

This is a behavior change from today's confirmation dialog, which allows proceeding with the draft intact. It is called out as breaking in the proposal.

## Risks / Trade-offs

- **`nguoiThucHien` still cannot answer "who entered Hàng A"** → Accepted and documented. It now answers "who last entered a grade weight on this row", which is at least true, where before it was often false. Full traceability is the deferred history-table change.
- **Requiring a save before switching adds a step for workers** → Small cost, and it matches the real hand-off sequence. The alternative designs either lose data or need a draft-format migration.
- **A waste-only new row is attributed to the waste enterer** → Unavoidable while the column is non-nullable, and it is the least wrong option: that worker is the only one who has touched the row.
- **Frontend intent is carried by field presence rather than an explicit flag** → The backend contract stays unchanged (no new request field), but the omission is meaningful and easy to break accidentally. The update/create split is documented at the call site.
- **Existing wrong data stays wrong** → No remediation is possible; the source information was never recorded. Flagged in the proposal for manual review if the data fed employee evaluation.

## Migration Plan

No data migration, no schema change, no API contract change. The request body simply omits `nguoiThucHien` for waste-only records. Existing localStorage drafts remain readable — the draft format is unchanged; only the conditions under which a switch is permitted change. Rollback is a plain revert.

## Open Questions

None. Per-grade attribution and the employee reference are deliberately deferred to the follow-up change recorded in the proposal.
