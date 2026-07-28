## Context

The production subsystem identifies a fry batch by `maChien` alone. `MaterialEvaluation.maChien` is `String @unique`, and the three child tables (`SystemOperation`, `FinishedProduct`, `QualityEvaluation`) each declare `@@unique([maChien, machineSystemId])`. Codes are allocated by `generateMaChien()`, which reads the highest `MC` code in the table and increments it, padded to three digits.

That model assumes codes never repeat. The factory reality is a fixed daily cycle: sixteen batches, first at 06:30, 90 minutes each, closing at 06:30 the next morning, grouped into three shifts. Codes should read `MC-01` … `MC-16` and repeat every day.

Making the code repeat therefore invalidates the identity assumption everywhere it is relied on. `maChien` appears 113 times across ten service and controller files, predominantly as `where: { maChien }` with no date qualifier. Three of those are `deleteMany` statements in `systemOperationService`, which today remove one batch's child rows and after the change would remove that code's rows for every day in history.

Two adjacent gaps are folded in because this change already carries a migration: `MaterialEvaluation` has no `ghiChu` column although the required table includes a note field, and `FinishedProduct` cannot attribute a grade weight to the worker who entered it. The latter reverses a decision taken earlier the same day in `fix-output-operator-attribution`, where a single `nguoiThucHien` column was retained and per-grade attribution was accepted as unreachable.

## Goals / Non-Goals

**Goals:**

- Make (`maChien`, `ngaySanXuat`) the batch identity, with the production day defined as the 06:30-to-06:30 cycle.
- Replace code allocation with a computed sixteen-batch daily schedule, grouped 5/5/6 into shifts.
- Eliminate every unqualified `maChien` query, update and deletion — especially the three `deleteMany` statements.
- Turn both material-evaluation surfaces from code creation into code selection, with warehouse-driven auto-fill.
- Record per-grade attribution for output entry.
- Reach all of the above without any window in which codes repeat while code paths are still unqualified.

**Non-Goals:**

- Rewriting or renumbering legacy `MC-001`-style codes.
- Splitting `soLoKien` into separate lot and package fields.
- Any scheduled job or pre-creation of records.
- Changing percentage math, `tongKhoiLuong`, or the waste-distribution formula.
- Changing the output preview screen, `FieldFocusEditor`, or the operation-parameters screen beyond batch-source selection.
- Changing kiosk session handling, validation thresholds, or `parseNumberInput`.

## Decisions

### Store the production day as its own column

`ngaySanXuat` (date) is added to `MaterialEvaluation` and becomes the grouping axis for the batch and its child rows.

Alternatives considered:

- **Embed the date in the code** (`MC-01-20260727`), keeping `@unique` intact. Cheapest structurally, but the stored code stops matching what the worker reads on the floor, and every display path needs to strip a suffix. Rejected.
- **Derive the day from `thoiGianChien` at query time.** No new column, but every date-scoped query must reimplement the 06:30 boundary in SQL, and the after-midnight batches make that arithmetic easy to get wrong in exactly the cases that matter. It also prevents a clean composite unique constraint.
- **Dedicated `ngaySanXuat` column (chosen).** The 06:30 rule is applied once at write time and stored, so the composite unique constraint is expressible, day-scoped queries are trivial, and the Dữ liệu sản xuất day filter is a plain equality.

### Compute the schedule instead of allocating codes

A schedule module maps a production day to the sixteen codes with their start times and shifts. Nothing reads or advances a counter.

This follows directly from the codes being identical every day: there is no state to keep. It also removes the concurrency hazard `generateMaChien` carried — two tablets creating batches simultaneously previously relied on a retry-on-unique-conflict loop, which disappears when codes are derived rather than claimed.

The 90-minute cadence closes the cycle exactly: `6:30 + 16 × 90 min = 6:30 + 24 h`.

### Group shifts by batch count, not by clock hours

Shift 1 is `MC-01`–`MC-05`, shift 2 is `MC-06`–`MC-10`, shift 3 is `MC-11`–`MC-16`.

Sixteen does not divide into three, so any grouping is uneven. Grouping by count makes the mapping from code to shift a pure function of the code's position, independent of any work roster. The consequence, accepted deliberately: shifts 1 and 2 span 7.5 hours of batch time while shift 3 spans 9 hours, so a worker arriving on an 8-hour roster boundary may see a batch that started slightly before their arrival. Grouping by clock hours would fit rosters better but would make shift membership depend on roster configuration, and would split shift 3 awkwardly around midnight.

### Do not pre-create records

The sixteen codes exist only as a computed schedule; records appear when a worker enters data.

`seedProductionChildRows` generates child rows for every active machine when a batch is created. Pre-creating sixteen batches per day would therefore produce 16 × 8 = 128 empty rows per day in each of three child tables — over 46,000 empty rows per table per year. A scheduled job would also add an operational failure mode (a missed run means a day with no codes) for no benefit, since the schedule is derivable on demand. Creating on first screen open was also rejected: it makes a read action mutate the database.

The board and pickers therefore render from the schedule, not from existing records, so a scheduled batch is always offered whether or not it has data.

### Sequence the work so codes never repeat before the code paths are safe

The migration and the code audit are ordered deliberately:

1. Scope every `maChien` query, update and deletion by production day; add `ngaySanXuat` and backfill it; move the four unique constraints to their composite forms.
2. Only then remove `generateMaChien` and switch to the schedule, and change the entry screens to selection.
3. Then add the entry-history table, the two `ghiChu` columns, the fourteen-column table, warehouse auto-fill, and the day filter.

The ordering matters because the danger is not the migration itself but the interval between "codes can repeat" and "code paths are day-scoped". Phase 1 closes that interval before it opens. Within phase 1, the three `deleteMany` statements are the single highest-risk edit in the change and are treated as such.

### Backfill the production day using the 06:30 boundary

Legacy rows carry only `thoiGianChien`. The backfill maps a timestamp before 06:30 to the **previous** calendar date; 06:30 itself belongs to that date.

Using the calendar date instead would misassign every historical record that ran after midnight — precisely the rows the new grouping is meant to fix. This is called out as a high risk because the error is silent: the data looks populated and is simply wrong by one day.

### Entry history as a child table with a soft employee reference

Per-grade attribution needs one row per (batch, day, machine, grade, worker, time), which a single column on `FinishedProduct` cannot express. A child table is the only shape that fits.

`Employee` lives in the `common` schema and `FinishedProduct` in `business`. The repo already links across schemas with soft references carrying no foreign-key constraint (`createdById // soft ref to auth.User.id — no FK constraint` appears on several models), so the entry-history employee reference follows that established pattern. Production history must not be blocked or cascaded by employee-record lifecycle changes.

This supersedes rather than breaks the mechanism added earlier today: `computeDirtyRecords` already distinguishes grade-tab dirtiness from waste-only dirtiness, and that same distinction now decides which cells produce attribution rows. The waste distribution touches every cell by design and must not generate attribution.

## Risks / Trade-offs

- **Data loss through the three `deleteMany` statements** → The highest risk in the change. Deleting a code currently removes one batch; if any of these is left unqualified after codes start repeating, one deletion removes that code across all history. Mitigated by ordering (phase 1 before code changes) and by treating those lines as a dedicated verify point. A database backup before the production migration is required.
- **Data loss through the child-table unique constraints** → With the old two-column constraint and repeating codes, a new day's output silently overwrites the previous day's. Mitigated by moving all three constraints to include `ngaySanXuat` in the same phase as the code repetition.
- **Silent backfill error at the 06:30 boundary** → A calendar-date backfill would misdate every after-midnight historical row without any visible failure. Mitigated by a dedicated unit test for the boundary mapping, including 02:00 and exactly 06:30.
- **A missed occurrence among the 113 `maChien` references** → An unqualified read returns multiple rows where one is expected, which may surface as a wrong value rather than an error. Mitigated by auditing the full set rather than only the known list, and by type-level checks after the schema change.
- **Two code formats coexist** → Reports spanning the cut-over show both `MC-001` and `MC-01`, and legacy codes carry no meaningful daily grouping beyond the backfilled day. Accepted: rewriting historical codes would be a larger and riskier data operation.
- **Reversing a same-day decision** → The entry-history table replaces the single-column attribution shipped hours earlier. The earlier work is not wasted (the grade-versus-waste distinction it introduced is reused), but reviewers should expect that code to change again.
- **Scope concentration** → Schema change, a dangerous deletion audit, a new schedule module, two rewritten screens and a new child table land together, with a single production migration. Mitigated by the phase ordering and by verify points at the end of each phase.

## Migration Plan

Schema changes: add `ngaySanXuat` and `ghiChu` to `MaterialEvaluation`; add `ghiChu` to `FinishedProduct`; drop `@unique` on `maChien` and add `@@unique([maChien, ngaySanXuat])`; extend the three child-table constraints with `ngaySanXuat`; add the entry-history model.

Order of operations for deployment:

1. Back up the database. This is not optional — the change alters deletion semantics and unique constraints on live production data.
2. Apply the additive part of the migration (new columns, new table) and run the backfill for `ngaySanXuat`.
3. Verify the backfill on after-midnight rows before proceeding.
4. Apply the constraint changes.
5. Deploy the day-scoped code together with the schedule module.

Rollback: the additive columns and table are harmless if left in place, so a code revert restores previous behaviour as long as the constraint change is reverted with it. Reverting after new-format records exist requires deciding what to do with duplicate codes, so the constraint step is the point of no easy return.

## Open Questions

None. The 06:30 boundary, the 5/5/6 shift split, the fourteen-column layout, the single combined lot/package column, and the decision to leave legacy codes untouched are all settled.
