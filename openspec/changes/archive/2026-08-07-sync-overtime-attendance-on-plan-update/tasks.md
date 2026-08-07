## 1. Schema and migration

- [x] 1.1 Add nullable `overtimePlanId` to the `Attendance` model in `backend/prisma/schema/common.prisma`, with the relation to `OvertimePlan` using `onDelete: SetNull`, keeping `@@schema("common")`
- [x] 1.2 Add the inverse `attendances` relation field to the `OvertimePlan` model
- [x] 1.3 Add an index covering `overtimePlanId` so plan-scoped lookups and deletes do not table-scan
- [x] 1.4 Generate the migration with `npx prisma migrate dev` (never `db push`) and run `npx prisma generate` ← (verify: migration applies cleanly against the dev database, generated client exposes the new field, no existing attendance row was altered or dropped) ← (verify: migration applies cleanly against the dev database, generated client exposes the new field, no existing attendance row was altered or dropped)

## 2. Shared attendance materialization

- [x] 2.1 Extract the inline materialization block from `approvePlan()` (`backend/src/services/overtimePlanService.ts:389-437`) into a private helper that accepts a transaction client, the plan, and its items
- [x] 2.2 Carry the time arithmetic across verbatim: shift-end anchoring with fallback to `gioBatDau`, the `durationMin <= 0 → +24h` overnight rule, and `buildVNTime` with `VN_OFFSET_HOURS = 7`
- [x] 2.3 Stamp `overtimePlanId` on every row the helper creates
- [x] 2.4 Make skip-if-exists a parameter of the helper: enabled on the approval path to keep re-approval idempotent, disabled on the update path where rows are deleted first
- [x] 2.5 Rewire `approvePlan()` to call the helper, preserving its existing transaction boundary and its notification block outside that transaction ← (verify: approving a plan still produces the same rows as before this change — same checkInTime, checkOutTime, workHours — now additionally carrying the plan reference; re-approval still does not duplicate)

## 3. Status gating on update

- [x] 3.1 Reject updates to plans in `TU_CHOI`, `HOAN_THANH`, or `HUY` in `update()`, for every role including ADMIN, with a Vietnamese message naming the blocking status
- [x] 3.2 Preserve the existing non-admin rule unchanged: creator-only, and only while `CHO_DUYET`
- [x] 3.3 Leave `delete()` untouched — admin deletion remains allowed at any status, and `onDelete: SetNull` keeps it non-destructive to attendance ← (verify: admin edit succeeds on CHO_DUYET and DA_DUYET, is rejected on all three terminal statuses; non-admin behavior matches the pre-change rules exactly)

## 4. Item state preservation

- [x] 4.1 Before deleting existing items in `update()`, capture each one's `ngayTangCa`, `gioBatDau`, `gioKetThuc`, `trangThaiTiepNhan`, and `gioThucTe`
- [x] 4.2 Match each incoming item against the captured set on all three of `ngayTangCa`, `gioBatDau`, `gioKetThuc`
- [x] 4.3 On a match, carry over `trangThaiTiepNhan` and `gioThucTe`, filtered to the incoming participant set so removed participants leave no orphan entries; default any newly added participant to `CHUA_TIEP_NHAN`
- [x] 4.4 On no match, reset `trangThaiTiepNhan` to `CHUA_TIEP_NHAN` for all participants and clear `gioThucTe` ← (verify: editing one item's hours leaves a sibling item's acceptance and actual times intact; editing only `ghiChuItem` preserves state; adding a participant to an otherwise unchanged item does not disturb existing participants)

## 5. Attendance sync on update

- [x] 5.1 Inside the existing `update()` transaction, when the plan is `DA_DUYET`, delete attendance rows scoped by `overtimePlanId` for that plan
- [x] 5.2 Regenerate rows from the new items by calling the shared helper with skip-if-exists disabled, in the same transaction as the plan and item writes
- [x] 5.3 Leave attendance completely untouched when the plan is `CHO_DUYET`
- [x] 5.4 Confirm rows with a null `overtimePlanId` (kiosk check-ins) and rows belonging to other plans are never in the delete scope ← (verify: changing hours updates recorded overtime; removing a participant removes only their row for that plan; changing the date moves the row; a kiosk row on the same employee and date survives; a thrown error during regeneration rolls back the plan edit as well)

## 6. Frontend edit affordance

- [x] 6.1 Hide the edit button in `frontend/src/components/OvertimePlanListModal.tsx` (currently lines 368-375) when the plan's `trangThai` is `TU_CHOI`, `HOAN_THANH`, or `HUY`
- [x] 6.2 Keep the button available for `CHO_DUYET` and `DA_DUYET` ← (verify: the button appears only for the two editable statuses and the backend rejection can no longer be triggered through normal UI use)

## 7. Backfill of legacy rows

- [x] 7.1 Create the one-time script in `backend/prisma/scripts/`, following the header-comment and `--dry-run` conventions of the existing scripts there
- [x] 7.2 Resolve each unlinked overtime row by matching its employee against `nguoiThamGiaIds` and its `attendanceDate` against `ngayTangCa` across plan items
- [x] 7.3 Disambiguate multi-candidate matches using the plan `noiDung` embedded in the row's `notes`
- [x] 7.4 Where ambiguity survives, link to the earliest-approved candidate and log a warning identifying the row, the employee, the date, and the competing plans
- [x] 7.5 Skip rows that already carry a reference so the script is safe to re-run; never create, delete, or otherwise modify rows
- [x] 7.6 Run with `--dry-run`, review the warnings, then run for real ← (verify: overtime row count is 148 both before and after; exactly one ambiguity warning appears, for employee NV0050 on 2026-07-25; every other row resolves to exactly one plan; a second run reports no further changes)

## 8. Tests

- [x] 8.1 Add `backend/src/__tests__/overtimePlanService.test.ts` — no test file exists for this service today
- [x] 8.2 Cover attendance sync on approved-plan edit: hours change, participant removed, participant added, date moved
- [x] 8.3 Cover sync scope: kiosk rows (null reference) and other plans' rows are never deleted
- [x] 8.4 Cover transaction atomicity: a failure during regeneration leaves neither the plan nor attendance changed
- [x] 8.5 Cover item state preservation: unchanged item keeps acceptance and actual time, changed item resets, removed participant leaves no orphan entry
- [x] 8.6 Cover status gating: all three terminal statuses rejected, both editable statuses accepted, non-admin rules unchanged
- [x] 8.7 Cover approval-versus-edit parity: both paths produce identical checkInTime, checkOutTime, and workHours for the same item, including an overnight range with an assigned shift ← (verify: tests fail if the sync logic or the shared helper is reverted)

## 9. Verification

- [x] 9.1 `cd backend && npx tsc --noEmit` — must report zero errors
- [x] 9.2 `cd backend && npm run lint`
- [x] 9.3 `cd backend && npm test`
- [x] 9.4 `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — must report zero errors
- [x] 9.5 Confirm `payrollService` was not modified and overtime figures now follow the corrected attendance rows ← (verify: all four checks pass; no file outside the areas named in design.md was touched)
