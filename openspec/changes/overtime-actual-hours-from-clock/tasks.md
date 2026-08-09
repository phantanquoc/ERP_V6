## 1. Payroll setting and migration

- [ ] 1.1 Add a source-selection setting to `PayrollSettings` in `backend/prisma/schema/common.prisma`, defaulting to planned hours, keeping `@@schema("common")`
- [ ] 1.2 Generate the migration with `npx prisma migrate dev` (never `db push`) and run `npx prisma generate` ← (verify: migration is additive, the default means existing settings rows need no backfill, generated client exposes the setting)

## 2. Actual-hours calculation module

- [ ] 2.1 Create the module under `backend/src/services/`, taking a plan item, its participants, and their regular attendance rows, returning per-participant actual hours plus an optional flag reason
- [ ] 2.2 Read clock times from the participant's regular (`isOvertime = false`) attendance row on the item's date — never from the plan-derived overtime row
- [ ] 2.3 Derive direction from the item's window against the shift named on the plan item: after-shift when overtime start is at or after shift end, before-shift when overtime end is at or before shift start
- [ ] 2.4 Compute after-shift hours as clock-out minus shift end, and before-shift hours as shift start minus clock-in, resolving shift boundaries in the application timezone via the existing helper in `backend/src/utils/dateUtils.ts` — do not write a new timezone utility
- [ ] 2.5 Apply the ten-minute tolerance against the planned figure before rounding, then round to the nearest half hour, cap at the planned figure, and floor results below half an hour to zero ← (verify: 1.00 and 0.99 both credit 1 hour rather than 1 and 0.5; a 2.92 derivation against a 3-hour plan credits 3; a 2.28 derivation against a 2-hour plan credits 2; a 0.22 derivation credits 0; exactly 0.50 credits 0.5)

## 3. Retrospective versus prospective classification

- [ ] 3.1 Classify each plan item by comparing its `ngayTangCa` against its plan's `ngayTao`, per item and never per plan
- [ ] 3.2 For retrospective items, keep the planned hours as the actual figure
- [ ] 3.3 For retrospective items, still compare against the clock and raise a flag when the two disagree by one hour or more
- [ ] 3.4 For prospective items whose date has passed, derive the actual figure from the clock ← (verify: a plan created 26 July spanning 22–29 July splits correctly, with items before 26 July retrospective and the rest prospective — four live plans have this shape)

## 4. Refusal and flagging

- [ ] 4.1 Produce no figure and flag when the participant has no attendance row for the date
- [ ] 4.2 Produce no figure and flag when the row lacks a clock-in or a clock-out
- [ ] 4.3 Produce no figure and flag when the elapsed time between punches is under one hour
- [ ] 4.4 Produce no figure and flag when the punch pair is incompatible with the shift named on the plan item
- [ ] 4.5 Exclude items that overlap the shift or name no shift from derivation, retaining planned hours and flagging them
- [ ] 4.6 Ensure each flag carries a reason distinguishing these cases ← (verify: the eleven-minute day yields a flag rather than 3.25 hours; punches spanning 05:47–17:02 against a plan naming the 14:00–22:00 shift yield a flag rather than 8.2 hours; a participant with no row is flagged rather than silently zeroed)

## 5. Payroll integration behind the setting

- [ ] 5.1 Read both figures at the three overtime aggregation points in `backend/src/services/payrollService.ts` (currently lines 143, 220, 753)
- [ ] 5.2 Honour the setting at all three points, consuming planned hours when it is off and actual hours when it is on
- [ ] 5.3 Treat a flagged participant-day as contributing zero payable hours when actual hours are in use
- [ ] 5.4 Leave regular-shift pay untouched ← (verify: with the setting off, every payroll figure is identical to pre-change output; with it on, July 2026 consumes 161.5 hours instead of 289.0; all three points agree with each other)

## 6. Attendance response

- [ ] 6.1 Include the actual figure and any flag alongside the existing planned figure in `backend/src/services/attendanceService.ts` responses
- [ ] 6.2 Compute at read time without persisting the figure and without adding a scheduled job ← (verify: correcting a clock time changes the returned actual hours on the next read, with no intervening job, and the attendance row's stored hours are unchanged)

## 7. Frontend display

- [ ] 7.1 Show both planned and actual overtime hours in `frontend/src/components/AttendanceManagement.tsx`
- [ ] 7.2 Mark flagged entries and make the reason available to the viewer
- [ ] 7.3 Add an actual-hours column beside the planned-hours column in the payroll view
- [ ] 7.4 State which figure is currently payable so the parallel display cannot be misread ← (verify: both figures appear regardless of the setting; flagged entries are visibly marked with their reason; the payable figure is unambiguous)

## 8. Tests

- [ ] 8.1 Add a test file for the calculation module
- [ ] 8.2 Cover direction: after-shift measured from clock-out, before-shift measured from clock-in
- [ ] 8.3 Cover every rounding rule from task 2.5, including the one-minute-apart pair that motivated nearest-rounding
- [ ] 8.4 Cover classification, including a plan containing both retrospective and prospective items
- [ ] 8.5 Cover all four refusal conditions and the overlapping/shift-less exclusion, asserting the flag reason
- [ ] 8.6 Cover the setting: off reproduces pre-change payroll figures, on consumes actual hours, flagged days contribute zero
- [ ] 8.7 Cover that the plan's shift is used rather than the system-inferred shift label ← (verify: tests fail if the tolerance, the cap, the per-item classification, or any refusal condition is removed)

## 9. Reconciliation against live data

- [ ] 9.1 Run the module over July 2026 and compare against the hand-computed anchor
- [ ] 9.2 Confirm 104 participant-days, 289.0 planned hours, 161.5 actual hours
- [ ] 9.3 Confirm the split: 49 full, 24 partial, 28 zero, 3 flagged ← (verify: any divergence is a defect in the module, not in the data — investigate before proceeding)

## 10. Verification

- [ ] 10.1 `cd backend && npx tsc --noEmit` — must report zero errors
- [ ] 10.2 `cd backend && npm run lint`
- [ ] 10.3 `cd backend && npm test`
- [ ] 10.4 `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — must report zero errors
- [ ] 10.5 Confirm `faceAttendanceService`, the kiosk flow, the shift check-in windows, and regular-shift pay were not modified ← (verify: all four checks pass; no file outside the areas named in design.md was touched)
