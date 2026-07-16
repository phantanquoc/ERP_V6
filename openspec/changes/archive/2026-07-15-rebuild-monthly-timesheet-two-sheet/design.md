## Context

The ERP records attendance in the `common.Attendance` model (per employee, per day, with `status`, `workHours`, `isOvertime`, `notes`) fed by face-attendance scans. `attendanceService.exportToExcelCalendar` (`backend/src/services/attendanceService.ts:531-884`) builds a single "Lịch chấm công" worksheet where each day cell holds a raw hour number, plus a color legend. HR's real workbook (`CHAM-CONG.xlsx`) is a two-sheet document (`CHẤM CÔNG` ~67 cols, `TĂNG CA` ~50 cols) driven by per-day **codes** and payroll parameters that the ERP does not currently store: meal allowances, fuel price, commute km, opening leave balance, and five overtime multipliers. `PayrollSettings` today only has `standardWorkDays` and `overtimeRate`; `payrollService` reads `settings.overtimeRate` in several places and must keep working. There is no `Holiday` model and no attendance-code catalog.

Stack: Express 5 + Prisma (multi-schema: `auth`/`business`/`common`) + PostgreSQL; React 18 + Vite + TanStack Query; ExcelJS is already a backend dependency. Project conventions in `AGENTS.md`: schema→service→controller→route→ROUTE_MAP→frontend; typed errors from `@utils/errors`; response shape `{ success, data, ... }`; Vietnamese user-facing text, English code.

## Goals / Non-Goals

**Goals:**
- Persist an editable per-employee-per-day timesheet cell (code + note + hours), seeded from face-attendance and overridable.
- Manage holidays and attendance codes as data (CRUD), not hard-coded lists.
- Extend `PayrollSettings` and `Employee` with the payroll parameters the workbook needs, without breaking existing `payrollService` math.
- Rewrite the export to emit the two `CHẤM CÔNG` + `TĂNG CA` worksheets matching the template, with computed columns pre-filled and source-less columns blank.

**Non-Goals:**
- Changing face-attendance/liveness capture logic.
- Changing `payrollService.netSalary` computation (it only gains read access to new OT parameters).
- PDF output.
- Reworking RBAC/ABAC (new routes use `authenticate`; management routes gate to HR/ADMIN roles via `authorize`).

## Decisions

### D1: New `TimesheetCell` model as the editable source of truth
One row per `[employeeId, date]` with `code`, `note`, `workHours`, `overtimeHours`. `@@unique([employeeId, date])`, `@@schema("common")`, CUID id. **Why:** the "each cell editable + note" requirement needs durable per-cell storage independent of raw `Attendance` scans. Editing uses `upsert` on the composite key (not delete-then-recreate, since a cell is a single row, not a parent+children set). Face-attendance remains the *seed* when no cell exists; a persisted cell always wins.
- *Alternative considered:* storing edits back onto `Attendance.notes`/status — rejected: conflates machine-captured data with HR overrides and can't hold a distinct code + note + manual hours.

### D2: Seeding is read-time, not a bulk write
When the grid is requested, days lacking a `TimesheetCell` derive a default `{code, workHours, overtimeHours}` from that day's `Attendance` rows (+ approved `LeaveRequest` for leave-type→code mapping). Seeds are returned but not written until the user saves a cell. **Why:** avoids mass-writing rows for every employee×day up front, keeps face-attendance authoritative until HR intervenes, and makes re-seeding automatic when scans change.
- Leave-type→code map: `ANNUAL→P`, `SICK→B`, `MATERNITY→TS`, `COMPENSATORY→BU`, `PERSONAL→KL`, `EMERGENCY→KL`, fallback `P`. Status map: `PRESENT|LATE→x`, `ABSENT→O`, `ON_LEAVE→(leave map)`. `isOvertime` rows accumulate into `overtimeHours`.

### D3: Extend `PayrollSettings`, keep `overtimeRate`
Add nullable/defaulted columns: `mealAllowancePerDay`, `overtimeMealAllowance`, `sundayMealAllowance`, `fuelPricePerKm`, `otRateWeekday` (1.5), `otRateWeekdayExtra` (2.1), `otRateSunday` (2), `otRateSundayExtra` (2.7), `otRateHoliday` (3). **Why keep `overtimeRate`:** `payrollService` reads it in multiple places; dropping it is a breaking change out of scope. New fields default so existing single-row settings upgrade cleanly.
- *Alternative:* a separate `TimesheetSettings` model — rejected: HR conceptually manages one "Cài đặt Bảng Lương" screen; the existing `PayrollManagement` settings modal is the natural home.

### D4: `Employee` gains `kmDistance` + `leaveBalanceCarryOver`; hourly rate computed
Hourly rate = `baseSalary / standardWorkDays / 8`, computed at runtime, never stored (avoids staleness when `baseSalary` or `standardWorkDays` change). `kmDistance` and `leaveBalanceCarryOver` are per-employee inputs the workbook needs. Both nullable to not disturb existing employee creation flows.

### D5: Summary/OT columns computed at request time
A pure computation module maps `(cells, codes, holidays, settings, employee)` → summary + five OT bands. **Why:** the numbers must always reflect current cells/settings; storing them invites drift. Day-type for OT banding: weekday vs Sunday (JS `getDay()===0`) vs holiday (date ∈ `Holiday`); the "extra/ngoài giờ" bands are reserved for OT hours beyond the standard OT window (kept as a documented rule so the verifier can check it).

### D6: Export rewrite is additive on the endpoint
Keep `GET /attendances/export/excel/calendar`; accept `month`/`year` (derive start/end when given) in addition to the existing `startDate`/`endDate` + filters so the frontend caller (`attendanceService.ts:222`) keeps working. The builder produces a `Workbook` with two `addWorksheet` calls; column layout mirrors the template letter-for-letter (identity cols → day grid → summary cols on sheet 1; identity → day grid → OT summary on sheet 2). Per-cell notes via ExcelJS `cell.note`. Holiday column and legend read from their catalogs.

### D7: Layering & routes
Three new services (`timesheetService`, `holidayService`, `attendanceCodeService`) hold business logic; thin controllers; routes registered in `ROUTE_MAP` (`backend/src/routes/index.ts`). Export logic stays in `attendanceService` (extends existing method). Frontend: one service+hook per resource (query-key factory `{all, lists, list, detail}`), grid component with code dropdown + note popover, plus catalog managers and an extended payroll-settings form. Components never call `apiClient` directly.

## Risks / Trade-offs

- **Prisma migration on `common.prisma` (high-risk file, migration conflicts)** → additive-only (new models + nullable/defaulted columns); no drops/renames; run `migrate dev` then `prisma generate`; back up before prod.
- **Breaking `payrollService` by touching settings** → retain `overtimeRate`; only add fields; run `npm test` (incl. `payrollKpiDeduction.test.ts`) to confirm no regression.
- **Export column drift from the template** → verification step opens the generated file and compares both sheets against `CHAM-CONG.xlsx`; column headers encoded as an explicit ordered list in the builder.
- **Read-time seeding performance for large months** → single batched query of `Attendance` + `LeaveRequest` for the month, indexed by `[employeeId, attendanceDate]` (existing index), then in-memory grouping; acceptable for company-scale employee counts.
- **Ambiguous "extra/ngoài giờ" OT bands** → documented rule in D5; if the real split rule differs, it is isolated to the computation module and adjustable without schema change.

## Migration Plan

1. Add models `Holiday`, `AttendanceCode`, `TimesheetCell` and new columns on `PayrollSettings`/`Employee` to `common.prisma`; `npx prisma migrate dev` (additive) + `npx prisma generate`.
2. Add `AttendanceCode` seed rows (extend existing seed); optionally seed known holidays as data (not code).
3. Ship backend services/controllers/routes; register in ROUTE_MAP; verify routes in server logs.
4. Ship frontend services/hooks/components.
5. Rewrite export; open generated workbook and diff both sheets against the template.
- **Rollback:** the migration is additive, so rollback = revert the migration (drops new tables/columns) and restore the previous `attendanceService.exportToExcelCalendar`; no existing data is mutated.

## Open Questions

- Exact numeric rule for the "ngoài giờ" (extra) overtime bands vs base bands — implemented per D5 as a documented default, adjustable in the computation module if HR clarifies.
- Which roles beyond ADMIN may edit the grid/settings — default to HR-capable roles via `authorize`; refine if the department mapping requires ABAC.
