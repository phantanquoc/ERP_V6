## ADDED Requirements

### Requirement: Monthly timesheet grid retrieval

The system SHALL provide a monthly timesheet for a given month and year, returning one row per active non-admin employee and one column per calendar day of that month. Each day cell SHALL carry an attendance `code`, an optional `note`, `workHours`, and `overtimeHours`.

#### Scenario: Load timesheet for a month
- **WHEN** an authenticated user requests the timesheet for month `M` and year `Y`
- **THEN** the system returns every active employee (ADMIN excluded) with a cell for each day 1..N of month `M`
- **AND** each cell reflects the persisted `TimesheetCell` when one exists, otherwise the value seeded from face-attendance

#### Scenario: Invalid month or year
- **WHEN** a user requests the timesheet with a month outside 1..12 or a non-numeric year
- **THEN** the system responds with a validation error and does not return data

### Requirement: Face-attendance seeding of cells

When no persisted `TimesheetCell` exists for an employee-day, the system SHALL derive the default cell value from that day's `Attendance` records: `PRESENT` or `LATE` maps to code `x`; `ABSENT` maps to code `O`; `ON_LEAVE` maps by the matching approved `LeaveRequest` `LeaveType` (`ANNUAL`→`P`, `SICK`→`B`, `MATERNITY`→`TS`, `COMPENSATORY`→`BU`, `PERSONAL`/`EMERGENCY`→`KL`), defaulting to `P` when no leave type matches; overtime attendance (`isOvertime = true`) SHALL contribute to `overtimeHours` for that day.

#### Scenario: Present day seeds code x
- **WHEN** an employee has a non-overtime `Attendance` with status `PRESENT` on a day and no persisted cell
- **THEN** the seeded cell has code `x` and `workHours` equal to that attendance's work hours

#### Scenario: Leave day seeds by leave type
- **WHEN** an employee has an `ON_LEAVE` attendance on a day with an approved `SICK` leave request covering that day and no persisted cell
- **THEN** the seeded cell has code `B`

#### Scenario: Overtime hours seed the overtime field
- **WHEN** an employee has an `Attendance` with `isOvertime = true` on a day
- **THEN** the seeded cell's `overtimeHours` includes that attendance's work hours

#### Scenario: Persisted cell overrides seed
- **WHEN** a persisted `TimesheetCell` exists for an employee-day
- **THEN** the returned cell uses the persisted `code`, `note`, `workHours`, and `overtimeHours`, ignoring the face-attendance seed

### Requirement: Editing a timesheet cell

The system SHALL allow an authenticated user to set a cell's `code`, `note`, `workHours`, and `overtimeHours` for an employee-day, persisting it via upsert keyed by `[employeeId, date]`. The submitted `code` MUST reference an existing active `AttendanceCode`.

#### Scenario: Save a new cell
- **WHEN** a user submits a cell for an employee-day that has no persisted cell
- **THEN** the system creates a `TimesheetCell` with the submitted values and returns it

#### Scenario: Overwrite an existing cell
- **WHEN** a user submits a cell for an employee-day that already has a persisted cell
- **THEN** the system updates the existing `TimesheetCell` rather than creating a duplicate

#### Scenario: Reject unknown code
- **WHEN** a user submits a cell whose `code` does not match any active `AttendanceCode`
- **THEN** the system responds with a validation error and does not persist the cell

### Requirement: Runtime summary and overtime columns

The system SHALL compute, per employee and month, the summary columns (payable hours, total official work time, leave hours split into payable/holiday-regime/unpaid, probation time, late-early hours, diligence flag) and the overtime breakdown across five bands (weekday, weekday-extra, Sunday, Sunday-extra, holiday) from the cells, codes, holidays, and `PayrollSettings`. These values SHALL be derived at request time and MUST NOT be stored.

#### Scenario: Summary reflects codes
- **WHEN** the timesheet is requested for an employee whose month contains a mix of `x`, `P`, and `KL` coded days
- **THEN** the payable-hours and leave-hours columns reflect those codes according to the configured rules

#### Scenario: Overtime split by day type
- **WHEN** an employee has overtime hours on a weekday, a Sunday, and a configured holiday
- **THEN** those hours are reported in the weekday, Sunday, and holiday overtime bands respectively
