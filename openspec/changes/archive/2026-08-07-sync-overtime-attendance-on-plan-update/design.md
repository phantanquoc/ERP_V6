## Context

Overtime attendance is materialized once, at approval time, by an inline block inside `approvePlan()` (`backend/src/services/overtimePlanService.ts:389-437`). `update()` rewrites plan items but never touches `Attendance`, so an edit to an already-approved plan leaves stale hours in the attendance table. Payroll reads overtime dynamically (`payrollService` filters `status === 'OVERTIME'` at lines 143, 220, 753), so stale rows translate directly into wrong pay without any visible error.

Three locks make this unrecoverable in the current code: `update()` has no attendance logic; `approvePlan()` refuses non-`CHO_DUYET` plans (line 354); and its skip-if-exists guard (lines 418-421) would preserve the stale row even if it did run.

Production state as measured on the dev database: 10 plans, all `DA_DUYET`; 46 items; 148 overtime attendance rows, all plan-derived, none entered manually. Two facts from that data drive the design. First, `notes`-based provenance is provably unusable — two plans carry byte-identical `noiDung` ("Hỗ trợ bộ phận kỹ thuật theo đề suất từ…") and two more differ only in letter case, so counting rows by `notes` yields 150 against an actual 148. Second, one row is genuinely ambiguous: employee NV0050 on 2026-07-25 is a participant in two different plans that day, and only one attendance row exists for the pair (the second approval hit the skip-if-exists guard).

A second, independent producer of overtime attendance exists: `attendanceService.overtimeCheckIn()` writes rows when an employee scans at the kiosk. The dev database currently holds zero such rows, but the sync mechanism must exclude them by construction rather than by luck.

## Goals / Non-Goals

**Goals:**
- Editing an approved plan brings its attendance rows back in step, automatically and atomically
- Attendance provenance is explicit and reliable, resolvable to exactly one plan
- Rows produced outside the plan flow are structurally immune to sync deletion
- Participant-supplied state (acceptance, self-reported actual time) survives edits that do not concern them
- The 10 existing plans become syncable, not permanently frozen

**Non-Goals:**
- Changing how overtime hours are computed — the shift-anchored, overnight-aware, UTC+7 arithmetic is carried over verbatim
- Touching `payrollService` — it recomputes from attendance on every read
- Touching face attendance or kiosk flows
- Allowing an approved plan to be re-approved
- Handling one employee holding multiple distinct overtime sessions on one date across different plans (the data shows this is an edge case; the current single-row-per-day shape is retained)

## Decisions

### D1: Real foreign key for provenance, not `notes` matching

`Attendance` gains a nullable `overtimePlanId` with an index; `OvertimePlan` gains the inverse relation. Both stay in the `common` Prisma schema per the project's multi-schema rule.

*Alternative rejected — parse `notes`:* measurably wrong on live data (150 vs 148), and it silently cross-attributes rows between plans that share a `noiDung`.

*Alternative rejected — match on `(employeeId, attendanceDate, isOvertime)`:* the NV0050 case proves this deletes rows belonging to a different plan, and it cannot distinguish kiosk rows from plan rows at all.

The column is nullable because legacy rows and kiosk rows both legitimately have no plan. Nullability also keeps the migration non-destructive: no existing row is invalidated when the column appears.

### D2: `onDelete: SetNull`, not `Cascade`

Deleting a plan must not erase the historical fact that an employee worked those hours — that is payroll data. The reference is nulled and the attendance row survives as an unattributed overtime record. This also means `delete()` needs no change: the FK constraint handles it.

*Alternative rejected — `Cascade`:* deleting a plan would silently reduce past payroll.

### D3: Sync inside `update()`, plan stays `DA_DUYET`

Deletion and regeneration of the plan's attendance rows happen in the same `prisma.$transaction` that updates the plan and its items. A regeneration failure rolls the plan edit back with it, so the two can never disagree.

*Alternative rejected — demote to `CHO_DUYET` and require re-approval:* violates the project's forward-only status rule, and forces every participant to re-accept over an unrelated edit.

*Alternative rejected — a separate sync call after update:* leaves a window where the plan and attendance disagree, and a crash between the two leaves them permanently inconsistent.

### D4: One shared materialization routine

The inline block in `approvePlan()` is extracted into a private helper accepting a transaction client, the plan, and its items. Both approval and update call it. The extraction is behavior-preserving: shift-end anchoring, the `durationMin <= 0 → +24h` overnight rule, and `buildVNTime` with `VN_OFFSET_HOURS = 7` all move across unchanged.

Deliberately, the helper does **not** carry over the skip-if-exists guard as a general rule. On the update path, rows for the plan are deleted first, so the guard would be dead code; on the approval path it is retained to keep re-approval idempotent. The distinction is a parameter, not a duplicated implementation.

Independently of that parameter, the helper writes at most one row per `(employeeId, attendanceDate)` per run: when a participant appears on several items sharing a date within one plan, only the first item in `ngayTangCa asc, gioBatDau asc, gioKetThuc asc` order produces attendance. The secondary and tertiary sort keys are load-bearing, not decoration. The two paths hand the helper differently-ordered input — approval reads items back under Postgres `ORDER BY ngayTangCa ASC`, which leaves same-date ties in an undefined order, while update receives them in whatever order the form serialized them. Sorting on the date alone is therefore stable *within* each path but not *between* them: two same-day items of unequal length would let approval and update each pick a different winner and record different `workHours` for the same day. Sorting on start time then end time makes the winner a property of the data rather than of the caller, so both paths always select the same item. (`gioBatDau`/`gioKetThuc` are `"HH:mm"` strings, so lexicographic comparison is chronological.)

The one-row-per-day collapse itself is not new behavior — approval has always collapsed such rows via its skip-if-exists guard, and live plan `cmrcvuajt006nqn079wcptf9i` (four items on 2026-07-09, one user on two of them) holds exactly one row today. The update path must reproduce it, because `payrollService` sums `workHours` across rows: without the dedupe, merely editing a plan would multiply that user's rows and silently raise their overtime pay. Known limitation, pre-dating this change and knowingly retained: a person genuinely working several separate stints in one day is under-recorded. Widening to one row per stint is a payroll-affecting change to all historical data and belongs in its own change.

*Alternative rejected — duplicate the logic in `update()`:* guarantees the two paths drift apart on the next timezone or shift fix.

### D5: Item identity for state preservation is `(ngayTangCa, gioBatDau, gioKetThuc)`

Items are recreated on every update (the project's established delete-then-recreate convention for child rows), so identity must be reconstructed by value. A prior item and an incoming item are the same item when all three match. On a match, `trangThaiTiepNhan` and `gioThucTe` are carried over, filtered to the incoming participant set so a removed participant leaves no orphan entry. On no match, both maps reset.

Consequence, accepted: editing an item's hours resets its acceptance. That is correct — participants agreed to different hours than the ones now on the plan.

*Alternative rejected — match by array index:* inserting or removing a row shifts every later item and silently transplants one participant's acceptance onto another item's hours.

*Alternative rejected — add stable item IDs to the update payload:* a cleaner long-term model, but it changes the frontend contract and the `OvertimePlanItemInput` type; out of proportion to this fix.

### D6: Terminal statuses become non-editable

`TU_CHOI`, `HOAN_THANH`, and `HUY` reject updates for all roles including `ADMIN`, with a Vietnamese message naming the status. The frontend hides the edit button for the same set.

This reverses the existing "Admin can edit and delete any plan at any status" requirement, hence the delta spec. The rationale is that with D3 in place, editing a `HOAN_THANH` plan would silently rewrite payroll for a period already closed — the previous rule was safe only because edits had no downstream effect.

Note that `delete()` is unchanged and still permits admin deletion at any status; combined with D2 that is non-destructive to payroll.

### D7: Backfill matches on employee + date, disambiguated by `notes`

The one-time script resolves each legacy row by finding plans having an item whose `ngayTangCa` equals the row's `attendanceDate` and whose `nguoiThamGiaIds` contains the row's employee. Where that yields several candidates, the row's `notes` (which embeds the plan `noiDung`) narrows it. Where ambiguity survives — the known NV0050 case — the earliest-approved plan wins and a warning is logged identifying the row.

`notes` is untrustworthy as a *primary* key (D1) but is perfectly serviceable as a *tiebreaker* on top of an employee-and-date match, which is why it appears here and nowhere else.

The script is idempotent (rows already linked are skipped), supports `--dry-run` following the convention of the existing scripts in `backend/prisma/scripts/`, and never creates, deletes, or modifies rows other than setting the reference. Row count before and after must both be 148.

## Risks / Trade-offs

- **A large edit rewrites many attendance rows at once** → the whole operation is one transaction, so it either fully lands or fully rolls back; there is no partial state to reconcile.
- **Deleting rows by plan reference could catch a row a human corrected by hand** → accepted. Sync's contract is that the plan is the source of truth for plan-derived rows. Hand corrections belong on kiosk rows (unlinked, untouched) or should be made via the plan.
- **Editing hours resets acceptance for that item** → intended per D5; participants must re-acknowledge hours they did not agree to.
- **The ambiguous NV0050 row may be attributed to the wrong plan** → both candidate plans cover the same employee, date, and near-identical work; either attribution yields the same hours. The warning log lets a human correct it if it matters.
- **Terminal-status plans can no longer be corrected through the UI** → deliberate. Correcting a closed period should be a conscious, manual act, not a side effect of an edit.
- **Legacy rows left unlinked if backfill is skipped** → they simply never sync, which is today's behavior; no regression, but the plans stay frozen. The backfill is therefore part of the change, not an optional follow-up.

## Migration Plan

1. Add the FK and inverse relation to `common.prisma`; run `npx prisma migrate dev` (never `db push`, per project rules) and `npx prisma generate`.
2. Deploy the service and frontend changes. New approvals stamp the reference from this point on; sync is live for any plan that has one.
3. Run the backfill with `--dry-run` first, review the ambiguity warnings, then run it for real. Confirm the overtime row count is still 148.

Rollback: the column is nullable and additive, so reverting the application code leaves the schema harmless — the column is simply ignored. No data is destroyed by rolling back.

## Open Questions

None. All decisions above are settled; the ambiguous-row policy (earliest-approved plan, logged) is the only judgement call and it is resolved.
