## Why

Overtime attendance rows are materialized exactly once — when an admin approves the plan (`approvePlan`). Editing an already-approved plan rewrites the plan items but never touches the `Attendance` table, so the employee's recorded overtime keeps the stale hours, dates, and participant set forever. Because payroll derives overtime pay dynamically from `attendances` (filtering `status === 'OVERTIME'`), the stale rows silently produce wrong pay.

Three independent locks make the drift unrecoverable today: `update()` has no attendance logic, `approvePlan()` refuses to run on a non-`CHO_DUYET` plan, and its skip-if-exists guard would ignore the stale row even if it did run. All 10 plans in production are already `DA_DUYET`, so today every plan is in the un-syncable state.

## What Changes

- Add a real foreign key from `Attendance` to `OvertimePlan` recording which plan materialized each row. Rows created by kiosk overtime check-in (`attendanceService.overtimeCheckIn`) carry no link and are therefore never touched by sync.
- Extract the attendance materialization logic (currently inline in `approvePlan`) into a shared helper so approval and update produce byte-identical rows — same shift-anchored `checkInTime`, same overnight handling, same Vietnam timezone offset.
- Editing a `DA_DUYET` plan now deletes every attendance row linked to that plan and regenerates them from the new items, inside the same transaction as the plan update. A failure in regeneration rolls back the plan edit too.
- Editing a `CHO_DUYET` plan continues to leave attendance untouched — nothing has been materialized yet.
- **BREAKING**: Admins can no longer edit plans in `TU_CHOI`, `HOAN_THANH`, or `HUY`. This reverses the existing "any status" rule, which would otherwise let an edit silently rewrite payroll figures for a closed period. Both the API and the UI edit button enforce this.
- Item-level participant state survives edits: items whose `ngayTangCa`, `gioBatDau`, and `gioKetThuc` are unchanged carry their `trangThaiTiepNhan` and `gioThucTe` maps over to the rebuilt item. Only genuinely modified items reset.
- A one-time backfill script links the 148 existing overtime attendance rows to their originating plan, so the 10 existing plans become syncable rather than permanently stale.

## Capabilities

### New Capabilities
- `overtime-attendance-sync`: Provenance link from attendance rows to the overtime plan that created them, and the rules for keeping attendance in step when an approved plan is edited — including which rows are in scope, what survives an edit, and how legacy rows are adopted.

### Modified Capabilities
- `overtime-plan-multi-item`: Two requirements change. "Approval materializes attendance per item × user" now also stamps the originating plan on each row and defers to the shared materialization helper. "Admin can edit and delete any plan at any status" narrows to editable statuses only (`CHO_DUYET` and `DA_DUYET`), replacing the scenario that asserted edits succeed at any status.

## Impact

**Database**
- `backend/prisma/schema/common.prisma` — `Attendance` gains a nullable plan link plus index; `OvertimePlan` gains the inverse relation. Both stay in the `common` schema.
- New Prisma migration via `migrate dev`. The column is nullable, so no existing row is invalidated at migration time.
- One-time backfill script under `backend/prisma/scripts/`. 147 of 148 rows match a single plan unambiguously; the one ambiguous row (employee NV0050 on 2026-07-25, claimed by two plans with near-identical `noiDung`) is assigned to the earlier-approved plan and logged as a warning.

**Backend**
- `backend/src/services/overtimePlanService.ts` — `update()` gains status gating and attendance sync; `approvePlan()` delegates to the extracted helper; new shared materialization helper.

**Frontend**
- `frontend/src/components/OvertimePlanListModal.tsx` — edit button hidden for non-editable statuses.

**Downstream, unmodified**
- `payrollService` reads overtime hours dynamically and requires no change; corrected attendance rows flow through automatically.
- Face attendance and kiosk flows are untouched; their rows lack the plan link and are excluded from sync by construction.
