## Why

Overtime attendance rows are written with the *planned* hours at the moment an admin approves the plan — before the overtime day has happened. All 148 existing rows carry a `checkOutTime` that was computed at approval time, not recorded from a clock. Payroll then pays from those rows (`payrollService` lines 143, 220, 753), so the company pays for hours nobody has evidence were worked.

Reconciling the July 2026 plans against the actual clock data shows the gap is not marginal: 289.0 planned hours against 161.5 actual hours across 104 participant-days — 55.9%. Twenty-eight of those participant-days show no overtime at all against the clock, and twenty-four show partial hours. Continuing to pay from planned figures overpays by roughly 44%.

The clock data needed to fix this already exists. Workers clock exactly twice a day and work overtime contiguously with their regular shift, so a single pair of punches bounds both the shift and the overtime attached to it.

## What Changes

- Introduce a calculation module that derives actual overtime hours for a plan participant from their clock-in/clock-out pair, using the plan's own shift as the boundary. Overtime after the shift is the clock-out minus the shift end; overtime before the shift is the shift start minus the clock-in.
- Round every result to the nearest half hour, credit the full planned amount when the shortfall is ten minutes or less, never exceed the planned hours, and floor anything under half an hour to zero.
- Classify each plan item independently as retrospective (its overtime date precedes the plan's creation date) or prospective. Retrospective items keep their planned hours — the author already knew what happened — but still get flagged when the clock disagrees by an hour or more. Prospective items are recomputed from the clock once the date has passed. Four existing plans contain both kinds of item, so the classification is per item, never per plan.
- Refuse to compute, and raise a flagged reason instead, when there is no usable clock pair, when the day's total is under an hour (a double-scan artifact), or when the punches are incompatible with the shift named on the plan. Live data contains all three: a participant whose entire day reads eleven minutes, a participant with no clock-out, and plans naming a shift that contradicts the punches by eight hours.
- Compute at read time rather than storing the result, matching how payroll already derives its figures. No new scheduled job, no new stored column for the hours themselves.
- Add a payroll setting that selects which figure payroll consumes. While it is off — the default — payroll consumes planned hours exactly as today and payslip figures do not move. The actual figures are visible alongside the planned ones so managers can compare before anyone's pay changes.
- Surface both figures side by side, with the flagged reasons, in the attendance grid and the payroll view.

Nothing here changes how the clock records punches. The shift that a punch is attributed to is deliberately left alone even where it is provably wrong: those cases are flagged for a human, not silently corrected.

## Capabilities

### New Capabilities
- `overtime-actual-hours`: Deriving actual overtime hours from a participant's clock pair against the plan's shift — the direction rule, the rounding and tolerance rules, the retrospective-versus-prospective distinction, the conditions under which the system refuses to compute and flags instead, and the read-time contract.
- `overtime-payroll-source-toggle`: The payroll setting that selects planned or actual hours as the payable figure, the guarantee that payroll output is unchanged while it is off, and the parallel display of both figures.

### Modified Capabilities
None. The existing `overtime-attendance-sync` and `overtime-plan-multi-item` requirements continue to hold unchanged: plan approval and plan edits still materialize rows carrying planned hours, and this change reads those rows rather than altering how they are written.

## Impact

**Database**
- `backend/prisma/schema/common.prisma` — `PayrollSettings` gains the source-selection setting; new migration. The stored `Attendance` shape is untouched.

**Backend**
- New calculation module under `backend/src/services/`, taking a plan item, its participants, and their attendance rows, returning actual hours plus any flagged reason.
- `backend/src/services/payrollService.ts` — the three overtime aggregation points read both figures and honour the setting.
- `backend/src/services/attendanceService.ts` — responses carry the actual figure and flags alongside the existing planned figure.
- `backend/src/utils/dateUtils.ts` — reused for timezone handling; the application timezone helper already exists and no new one is written.

**Frontend**
- `frontend/src/components/AttendanceManagement.tsx` — both figures and a flag indicator.
- The payroll view — an actual-hours column beside the planned one.

**Deliberately unchanged**
- `faceAttendanceService` and the kiosk flow, the shift check-in windows, regular-shift pay, and the incorrectly-attributed shift labels themselves.

**Verification anchor**
- Recomputing July 2026 through the new module must reproduce 161.5 actual hours against 289.0 planned across 104 participant-days, with 49 full, 24 partial, 28 zero, and 3 flagged. Payroll output with the setting off must be byte-identical to today's.
