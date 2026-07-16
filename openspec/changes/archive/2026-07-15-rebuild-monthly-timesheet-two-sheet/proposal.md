## Why

HR's real monthly timesheet is a two-sheet workbook (`CHẤM CÔNG` ~67 columns + `TĂNG CA` ~50 columns) built around per-day status codes (`x`, `P`, `L`, `B`, `ON`, …), payroll parameters (meal allowance, fuel, five overtime multipliers), a holiday list, and a code legend. The ERP today only produces a single merged worksheet ("Lịch chấm công") where each day cell holds a raw hour number, driven by `attendanceService.exportToExcelCalendar`. There is no way to edit a day cell, attach a per-cell note, manage holidays or attendance codes, or reproduce the payroll columns HR needs. This change rebuilds the monthly timesheet so it matches the real workbook exactly and becomes editable inside the app.

## What Changes

- Add editable **monthly timesheet grid** in the app: rows = employees, columns = days of the month, each cell picks an attendance **code** (dropdown) and carries an optional **note**, persisted to the database. Face-attendance data seeds the default code per cell; users can override.
- **BREAKING (export format)** Rewrite `attendanceService.exportToExcelCalendar` to emit **two worksheets** (`CHẤM CÔNG` and `TĂNG CA`) matching the `CHAM-CONG.xlsx` template — company header, day-number row, weekday row, day grid of codes, full summary columns, holiday list column, code legend, and per-cell Excel notes — instead of the current single hour-grid sheet.
- Add **Holiday** management (CRUD): named holidays with date and note, replacing any hard-coded holiday list; consumed by the export's holiday column and by summary/OT calculations.
- Add **AttendanceCode** catalog (CRUD): the ~17 codes with labels/descriptions, seeded from the workbook legend; drives the grid dropdown and the export legend.
- Extend **PayrollSettings** with timesheet payroll parameters: meal allowance per workday, overtime meal allowance, Sunday meal allowance, fuel price per km, and five overtime multipliers (weekday 1.5, weekday-extra 2.1, Sunday 2, Sunday-extra 2.7, holiday 3). The legacy `overtimeRate` field is **retained** so existing `payrollService` calculations keep working.
- Extend **Employee** with `kmDistance` (commute distance) and `leaveBalanceCarryOver` (opening leave balance). Hourly rate is computed at runtime (`baseSalary / standardWorkDays / 8`), not stored.
- Summary and overtime columns (payable hours, official work time, leave hours by category, probation time, late/early, OT by five bands, diligence, meal totals, fuel) are **computed at runtime** from codes + hours + settings; parameters not derivable from system data are pre-filled from settings and remain manually editable in the grid.

## Capabilities

### New Capabilities
- `monthly-timesheet-grid`: Per-employee-per-day editable timesheet cells (code + note + hours) with face-attendance seeding and override, month/year scoping, and the runtime-computed summary/overtime columns.
- `timesheet-two-sheet-export`: Excel export producing the `CHẤM CÔNG` and `TĂNG CA` worksheets that match the `CHAM-CONG.xlsx` template layout, including holiday column, legend, and per-cell notes.
- `holiday-management`: CRUD for named holidays (date, note) consumed by the timesheet export and calculations.
- `attendance-code-catalog`: CRUD for the attendance code legend (code, label, description, order, active) driving the grid dropdown and export legend.

### Modified Capabilities
<!-- No existing spec's requirements change at the spec level. PayrollSettings and Employee are schema extensions consumed by the new capabilities; payrollService behavior is intentionally unchanged. -->

## Impact

- **Database** (`backend/prisma/schema/common.prisma`): new models `Holiday`, `AttendanceCode`, `TimesheetCell` (unique `[employeeId, date]`, `@@schema("common")`, CUID ids); extend `PayrollSettings` (new nullable/defaulted payroll parameter columns, keep `overtimeRate`); extend `Employee` (`kmDistance`, `leaveBalanceCarryOver`). New Prisma migration via `migrate dev`; `prisma generate` after. Seed `AttendanceCode` rows from the legend.
- **Backend services**: rewrite `attendanceService.exportToExcelCalendar` (two-sheet builder + runtime summary/OT computation); new `timesheetService` (grid read/seed-from-attendance/upsert cells), `holidayService`, `attendanceCodeService`; extend `payrollService`/settings read to expose new parameters without changing `netSalary` math.
- **Backend controllers/routes**: new controllers + routes for timesheet grid, holidays, attendance codes; register all in `ROUTE_MAP` (`backend/src/routes/index.ts`). Existing `GET /attendances/export/excel/calendar` retained (may gain `month`/`year` params).
- **Frontend**: new monthly timesheet grid page/tab (cell code dropdown + note popover), holiday manager, attendance-code manager, extended payroll-settings form (`PayrollManagement.tsx` settings modal). New services + TanStack Query hooks (query-key factory) for timesheet/holiday/attendance-code; `AttendanceManagement.tsx` export wiring updated.
- **Out of scope**: face-attendance/liveness logic (`faceAttendanceService.ts`) unchanged; `payrollService` `netSalary` computation unchanged (only reads new OT parameters); no PDF output; RBAC/ABAC roles unchanged (new routes use `authenticate`).
