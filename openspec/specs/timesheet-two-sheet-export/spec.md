## ADDED Requirements

### Requirement: Two-worksheet Excel export

The system SHALL export the monthly timesheet as a single `.xlsx` workbook containing exactly two worksheets named `CHẤM CÔNG` and `TĂNG CA`, matching the layout of the `CHAM-CONG.xlsx` template. The export SHALL accept the month/year (or start/end date range) plus the existing optional filters (search, department, position).

#### Scenario: Export produces two sheets
- **WHEN** an authenticated user exports the timesheet for a month
- **THEN** the downloaded workbook contains a `CHẤM CÔNG` worksheet and a `TĂNG CA` worksheet

#### Scenario: Export respects filters
- **WHEN** a user exports with a department filter
- **THEN** only employees in that department appear as data rows in both worksheets

### Requirement: CHẤM CÔNG worksheet layout

The `CHẤM CÔNG` worksheet SHALL contain the company header block, the `BẢNG CHẤM CÔNG THÁNG MM/YYYY` title, a day-number row, a weekday row (`T2`..`CN`), employee identity columns (MSNV, Họ và Tên, Chức vụ, Bộ Phận, Ngày vào làm), the day grid rendered as attendance **codes**, and the summary columns (payable hours, official work time, leave hours by category, probation time, late/early, meal allowance, five overtime bands, km, fuel, overtime meal, opening/current leave balance, notes, diligence, meal flag, unpaid-diligence hours, advance recovery, comp leave, Sunday meal, resignation date). A holiday list SHALL be rendered in the left-hand columns from the `Holiday` catalog, and the attendance-code legend SHALL be rendered below the data from the `AttendanceCode` catalog.

#### Scenario: Day cells show codes
- **WHEN** the `CHẤM CÔNG` sheet is generated for an employee with coded days
- **THEN** each day cell displays the attendance code (e.g. `x`, `P`, `B`), not a raw hour number

#### Scenario: Holiday list and legend present
- **WHEN** the `CHẤM CÔNG` sheet is generated
- **THEN** the left-hand holiday columns list the holidays from the `Holiday` catalog
- **AND** a legend mapping each code to its label appears below the data rows from the `AttendanceCode` catalog

#### Scenario: Per-cell note becomes an Excel note
- **WHEN** a `TimesheetCell` has a non-empty `note`
- **THEN** the corresponding day cell in the `CHẤM CÔNG` sheet carries that text as an Excel cell note

### Requirement: TĂNG CA worksheet layout

The `TĂNG CA` worksheet SHALL contain the overtime title, the identity columns (Mã NV, Họ và Tên, Chức vụ, Bộ phận, Tăng ca tháng trước), the day grid of overtime hours, the overtime multiplier row (weekday 1.5, Sunday 2, holiday 3, weekday-extra 2.1, night/rest-day 2.7, overtime meal 25000), and the overtime summary columns (weekday OT hours, Sunday OT, holiday OT, weekday-extra OT, rest-day-extra OT, overtime pay, hourly rate, total overtime income, overtime workdays, total overtime meal).

#### Scenario: Overtime hours per day
- **WHEN** an employee has overtime hours recorded on specific days
- **THEN** those hours appear in the matching day columns of the `TĂNG CA` sheet

#### Scenario: Hourly rate column
- **WHEN** the `TĂNG CA` sheet is generated for an employee
- **THEN** the hourly-rate column shows `baseSalary / standardWorkDays / 8` for that employee

### Requirement: Pre-fill computed, leave source-less blank

Cells the system can compute or source from settings SHALL be pre-filled; columns with no system data source SHALL be left blank for HR to complete manually.

#### Scenario: Computed columns filled
- **WHEN** the export runs
- **THEN** payable hours, overtime hours by band, meal totals, fuel, and hourly rate are pre-filled from cells and settings

#### Scenario: Source-less columns blank
- **WHEN** a column has no corresponding system data (e.g. a signature column)
- **THEN** that column is left empty in the exported sheet
