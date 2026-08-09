## Context

Overtime attendance rows are materialized at approval time carrying planned hours (`overtimePlanService.materializeAttendance`, established by the archived `sync-overtime-attendance-on-plan-update` change). Every one of the 148 live rows has a `checkOutTime` computed from the plan, not recorded from a clock. `payrollService` aggregates those rows at lines 143, 220, and 753 by filtering `status === 'OVERTIME'` and summing `workHours`, so planned hours are what gets paid.

The clock data needed to correct this is already present, in a different row. Workers punch exactly twice a day; overtime is worked contiguously with the regular shift, before it or after it. The regular (`isOvertime = false`) attendance row therefore bounds both the shift and its attached overtime with a single pair of punches. No new capture mechanism is required — the two overtime punch endpoints that exist (`POST /attendances/overtime-check-in`, `/overtime-check-out`) have no caller and have produced zero rows, and `faceAttendanceService` deliberately filters `isOvertime: false` so kiosk scans never create overtime rows.

Reconciling July 2026 by hand gives the anchor this change must reproduce: 104 participant-days, 289.0 planned hours against 161.5 actual (55.9%), split 49 full / 24 partial / 28 zero / 3 flagged.

Three failure modes were found in live data and drive most of the design:

1. **Inferred shift labels are wrong for early arrivals.** `workShiftService.determineShift` matches a punch against per-shift check-in windows. Participants NV0031 and NV0035 punched at 06:27 local and were labelled "Ca 1" (window 05:30–06:30) while their plan item names the Hành chính shift. The inferred label cannot be trusted as a boundary source.
2. **The shift named on the plan is itself sometimes wrong.** On 27 July, three participants carry plan items naming Ca 2 (11:00–14:00) while their punches span 05:47–17:02, which is Ca 1. Applying the before-shift formula naively yields 8.2 hours against a 3-hour plan.
3. **Clock data is sometimes an artefact.** NV0038 on 25 July shows a punch pair eleven minutes apart. The before-shift formula reads only the clock-in and happily returns 3.25 hours for someone who was present for eleven minutes.

## Goals / Non-Goals

**Goals:**
- Derive overtime hours from evidence rather than intent
- Make the derivation legible and auditable — a manager can see both figures and why they differ
- Change no payslip on deployment; let the organisation compare before it commits
- Fail loudly on bad data rather than emitting a plausible wrong number

**Non-Goals:**
- Capturing new punches — the existing two-punch pattern is sufficient and is not being changed
- Correcting the mis-attributed shift labels, in the attendance rows or in the plans; both are flagged for humans
- Changing regular-shift pay, the check-in windows, or the kiosk and face-recognition flows
- Building a manager workflow to review and clear flags — flags are visible, not actionable, in this change
- Persisting the derived figure or introducing a scheduled job

## Decisions

### D1: Read the clock from the regular attendance row, not the overtime row

The overtime row's timestamps are plan-derived and carry no evidential value. The regular row for the same employee and date holds the real punches. The calculation therefore joins plan item → participant → regular attendance row on the item's date.

*Alternative rejected — use the overtime row's own timestamps:* they are exactly the planned figures this change exists to replace; reading them would be circular.

*Alternative rejected — use the unused overtime punch endpoints:* they have no caller and zero rows. Wiring them up means a new kiosk flow and a behaviour change for every worker, which is a far larger change and unnecessary given the two-punch pattern already bounds the overtime.

### D2: Take the shift boundary from the plan item, and treat contradiction as a flag

The boundary between regular work and overtime is the shift's start or end time. Two candidate sources exist and both are unreliable, but in different ways: the inferred label is wrong systematically for early arrivals (failure mode 1), whereas the plan's shift is wrong occasionally through data entry (failure mode 2).

The plan's shift is used, because its errors are detectable: if the punches cannot be reconciled with the named shift, that is a flag rather than a computation. The inferred label's errors are not detectable this way — an early arrival relabelled "Ca 1" looks perfectly self-consistent.

Compatibility is judged by whether the punch pair plausibly brackets the named shift. Where it does not, no figure is produced.

*Alternative rejected — infer the shift from the punches:* reintroduces failure mode 1 and discards the plan, which is the only statement of intent available.

*Alternative rejected — silently prefer whichever source yields a plausible number:* hides data-entry errors that a human should fix.

### D3: Direction is derived from the item's window against the shift, not stored

An item is after-shift when its overtime start is at or after the shift end, and before-shift when its overtime end is at or before the shift start. Live data holds 26 after-shift items (95 participant-days) and 12 before-shift (37). Seven items overlap the shift and one names no shift; neither can yield a meaningful boundary, so both are excluded from derivation and flagged.

*Alternative rejected — store a direction column:* derivable from data already present, and a stored copy can drift from the times it describes.

### D4: Rounding — nearest half hour, ten-minute tolerance, capped at planned, floored at half an hour

Four rules, each answering a specific pattern in the data.

*Nearest, not downward:* NV0031 and NV0035 punched out one minute apart (17:59 and 18:00) on the same plan item. Rounding down pays them 0.5 and 1.0 hours — double for one minute. Nearest pays both one hour.

*Ten-minute tolerance:* punching out a few minutes early is normal and the user was explicit that it should not cost anything. A shortfall within ten minutes credits the full planned amount.

*Capped at planned:* protects against failure modes 2 and 3, where a bad shift or a bad punch yields an inflated figure, and matches the principle that the plan authorises the work.

*Floored at half an hour:* the step is half an hour, so anything rounding below that is zero. Queueing at the scanner for a few minutes must not become overtime.

Order matters: tolerance is checked against the planned figure before rounding, so a 2.92-hour derivation against a 3-hour plan credits 3 rather than rounding to 3 coincidentally.

### D5: Retrospective versus prospective is decided per item

An item whose overtime date precedes its plan's creation date was written after the fact; the author knew what happened, so the planned figure is the actual figure. 17 of 46 items (55 participant-days) are retrospective, by 1 to 4 days.

Four plans contain both kinds — plan `cms1wenyf00qlrq07koz6sujn`, created 26 July, spans 22 to 29 July. Classification is therefore per item. A plan-level rule would misclassify roughly half the items in those four plans.

Retrospective items are still compared against the clock, and a disagreement of an hour or more raises a flag. This catches transcription errors without blocking the entry, which is what the user asked for.

*Alternative rejected — classify per plan:* provably wrong on four live plans.

*Alternative rejected — recompute retrospective items too:* discards the author's first-hand knowledge in favour of a clock reading the author already saw and chose to override.

### D6: Refuse rather than approximate

Four conditions produce a flag and no figure: no attendance row, an incomplete punch pair, a day totalling under an hour, or punches incompatible with the named shift. The under-an-hour test is what stops failure mode 3 — the eleven-minute day — since the before-shift formula never looks at the clock-out and cannot otherwise notice.

A flagged day contributes zero payable hours but stays visible with its reason. Zeroing silently would make an absent worker and a scanner fault indistinguishable.

### D7: Compute at read time

Payroll already recomputes overtime on every read rather than trusting the stored `overtimeHours` column, so a derived-on-read figure is consistent with the established pattern and inherits its property that corrections take effect immediately. No new column for the hours, no scheduled job.

The setting from D8 is stored, since it is configuration rather than derived data.

### D8: A setting selects the payable figure; default is planned

`PayrollSettings` gains a source-selection setting defaulting to planned hours. While it is off, payroll behaviour is bit-for-bit what it is today at all three aggregation points. Both figures display regardless, so managers can compare over real months before anything moves.

This is the safety property that makes the change deployable: a 44% reduction in overtime pay is not something to discover in production. If the derivation is wrong somewhere, it surfaces as a visible discrepancy rather than a wrong payslip.

*Alternative rejected — switch immediately:* the reconciliation shows 28 participant-days dropping to zero. Some are genuine absences, some may be scanner faults; the organisation should see which before pay changes.

*Alternative rejected — a per-month or per-employee setting:* more surface area than the situation calls for, and it invites inconsistent months.

## Risks / Trade-offs

- **The 44% reduction may partly reflect process gaps rather than genuine absence** → the parallel-display period exists precisely to find out; nothing is payable until the setting is switched.
- **A worker who legitimately worked but whose scan failed loses the hours** → flagged, visible, and a manager can correct the clock time, which takes effect immediately under D7.
- **The shift-compatibility test may reject a legitimate but unusual pattern** → conservative by design; a rejection is a flag a human resolves, never a silent wrong number.
- **Read-time computation adds work to attendance and payroll reads** → bounded by the number of overtime plan items in the period, which is small (46 items across the full dataset), and matches what payroll already does per read.
- **Both figures on screen may confuse users about which one is being paid** → the display must state which is payable; this is a UI clarity requirement, not an optional nicety.
- **Overlapping and shift-less items (8 of 46) yield no actual figure at all** → they retain planned hours and are flagged. Handling them properly needs a rule the data does not currently support.

## Migration Plan

1. Add the setting to `PayrollSettings`; run `npx prisma migrate dev` and `npx prisma generate`. The setting is additive with a default, so existing rows need no backfill.
2. Deploy. The setting defaults to planned hours, so no payslip moves. Both figures become visible.
3. Reconcile: run the module over July 2026 and confirm it reproduces 161.5 / 289.0 hours with 3 flags. Any divergence is a defect in the module, not in the data.
4. Let managers compare over at least one full payroll period, and resolve flagged days.
5. Switch the setting when the organisation is satisfied. Reverting is a single setting change.

Rollback: the setting is additive and defaults to today's behaviour, so reverting the application code leaves the schema harmless.

## Open Questions

None blocking. Two items are knowingly deferred: a manager workflow for clearing flags, and a rule for overtime items that overlap the shift or name no shift. Both are visible-and-flagged in this change and warrant their own change if they prove to matter.
