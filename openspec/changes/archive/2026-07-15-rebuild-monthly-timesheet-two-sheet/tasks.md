## 1. Database schema & migration

- [x] 1.1 Add `Holiday` model to `backend/prisma/schema/common.prisma` (`id` CUID, `name`, `date`, `note?`, timestamps, `@@schema("common")`)
- [x] 1.2 Add `AttendanceCode` model (`id` CUID, `code` unique, `label`, `description?`, `sortOrder` Int, `isActive` Boolean default true, timestamps, `@@schema("common")`)
- [x] 1.3 Add `TimesheetCell` model (`id` CUID, `employeeId`, `date`, `code`, `note?`, `workHours` Float default 0, `overtimeHours` Float default 0, relation to `Employee` cascade, `@@unique([employeeId, date])`, `@@schema("common")`)
- [x] 1.4 Extend `PayrollSettings`: add `mealAllowancePerDay`, `overtimeMealAllowance`, `sundayMealAllowance`, `fuelPricePerKm`, `otRateWeekday`, `otRateWeekdayExtra`, `otRateSunday`, `otRateSundayExtra`, `otRateHoliday` (Float, defaulted); KEEP existing `overtimeRate`
- [x] 1.5 Extend `Employee`: add `kmDistance` Float? and `leaveBalanceCarryOver` Float?
- [x] 1.6 Run `npx prisma migrate dev` (additive migration) and `npx prisma generate` ← (verify: migration applies cleanly, no drops/renames, `payrollService` still compiles against settings)
- [x] 1.7 Seed `AttendanceCode` rows (x, P, P/2, L, BU, TV, TV/2, B, KL, X/2, O, CD, N, TS, NCC, ON, O/2) in the prisma seed ← (verify: seed runs idempotently, all 17 codes present with labels)

## 2. Backend — attendance-code catalog

- [x] 2.1 Create `attendanceCodeService` (list ordered by `sortOrder`, create, update, delete; throw `ConflictError` on duplicate code, `NotFoundError` on missing)
- [x] 2.2 Create `attendanceCodeController` (HTTP only) + `attendanceCodeRoutes` with `authenticate`
- [x] 2.3 Register `/api/attendance-codes` in `ROUTE_MAP` (`backend/src/routes/index.ts`) ← (verify: route appears in server logs, CRUD returns `{success,data}` shape)

## 3. Backend — holiday management

- [x] 3.1 Create `holidayService` (list ordered by date, create, update, delete; validation errors on missing name/date)
- [x] 3.2 Create `holidayController` + `holidayRoutes` with `authenticate`
- [x] 3.3 Register `/api/holidays` in `ROUTE_MAP` ← (verify: route appears in server logs, CRUD works)

## 4. Backend — timesheet grid

- [x] 4.1 Create `timesheetService.getMonthly(month, year, filters)`: fetch active non-admin employees + month `Attendance` + approved `LeaveRequest`, build per-employee-per-day cells, apply persisted `TimesheetCell` override else face-attendance seed (status/leave-type→code map, `isOvertime`→`overtimeHours`)
- [x] 4.2 Implement summary + five-band OT computation module `(cells, codes, holidays, settings, employee) → summary` (payable/official/leave-by-category/probation/late-early/diligence + OT bands; hourly rate = `baseSalary/standardWorkDays/8`)
- [x] 4.3 Implement `timesheetService.upsertCell(employeeId, date, {code, note, workHours, overtimeHours})` via `upsert` on `[employeeId, date]`; validate `code` against active `AttendanceCode`
- [x] 4.4 Create `timesheetController` + `timesheetRoutes` (GET monthly grid, PUT/POST cell) with `authenticate`; validate month 1..12 and numeric year
- [x] 4.5 Register `/api/timesheet` in `ROUTE_MAP` ← (verify: monthly grid returns seeded+persisted cells correctly, cell upsert rejects unknown code, invalid month/year → validation error)

## 5. Backend — two-sheet Excel export

- [x] 5.1 Run `gitnexus_impact` on `exportToExcelCalendar` before editing; extend it to accept `month`/`year` (derive start/end) alongside existing `startDate`/`endDate` + filters
- [x] 5.2 Build `CHẤM CÔNG` worksheet: company header, `BẢNG CHẤM CÔNG THÁNG MM/YYYY` title, day-number row, weekday row (T2..CN), identity columns, day grid of codes, all summary columns, left-hand holiday list (from `Holiday`), code legend below data (from `AttendanceCode`), per-cell `cell.note` from `TimesheetCell.note`
- [x] 5.3 Build `TĂNG CA` worksheet: title, identity columns, prev-month OT, day grid of OT hours, multiplier row (1.5/2/3/2.1/2.7, meal 25000), OT summary columns incl. hourly rate `baseSalary/standardWorkDays/8`
- [x] 5.4 Pre-fill computed columns; leave source-less columns blank ← (verify: generated workbook has exactly two sheets named `CHẤM CÔNG` + `TĂNG CA`, layouts match `CHAM-CONG.xlsx`, day cells show codes not hours, notes present, legend + holiday list present)

## 6. Frontend — services & hooks

- [x] 6.1 Add `attendanceCodeService` + `useAttendanceCodes` hook (query-key factory)
- [x] 6.2 Add `holidayService` + `useHolidays` hook (query-key factory + mutations invalidating lists)
- [x] 6.3 Add `timesheetService` (getMonthly, upsertCell types) + `useMonthlyTimesheet` / `useUpsertTimesheetCell` hooks
- [x] 6.4 Extend payroll-settings service/types + `usePayrollSettings`/`useUpdatePayrollSettings` to include the new parameter fields

## 7. Frontend — UI

- [x] 7.1 Build monthly timesheet grid page/tab (rows=employees, cols=days): each cell a code dropdown (from active `AttendanceCode`) + note popover; month/year picker; save via `useUpsertTimesheetCell`
- [x] 7.2 Render computed summary + OT columns read-only alongside the grid
- [x] 7.3 Build Holiday manager (list + add/edit/delete) using `useHolidays`
- [x] 7.4 Build AttendanceCode manager (list + add/edit/delete/deactivate) using `useAttendanceCodes`
- [x] 7.5 Extend the "Cài đặt Bảng Lương" settings modal in `PayrollManagement.tsx` with the new fields (react-hook-form + zod), keeping existing `standardWorkDays`/`overtimeRate` inputs
- [x] 7.6 Wire the export button (`AttendanceManagement.tsx` / `attendanceService.exportToExcelCalendar`) to pass month/year ← (verify: export downloads the two-sheet workbook for the selected month)

## 8. Verification

- [x] 8.1 `cd backend && npx tsc --noEmit` passes and `npm test` green (incl. `payrollKpiDeduction.test.ts`)
- [x] 8.2 `cd frontend && npx tsc --noEmit` passes and `npm run lint` clean
- [ ] 8.3 Open the exported `.xlsx` and diff both sheets against `/Users/vunam/Downloads/CHAM-CONG.xlsx` (headers, day grid, summary/OT columns, holiday list, legend)
- [ ] 8.4 Run `gitnexus_detect_changes` to confirm only expected symbols/flows changed ← (verify: no unexpected blast radius, ROUTE_MAP updated, `payrollService` netSalary math unchanged)
