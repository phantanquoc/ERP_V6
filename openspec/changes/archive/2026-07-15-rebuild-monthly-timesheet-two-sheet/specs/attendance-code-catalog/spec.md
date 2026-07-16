## ADDED Requirements

### Requirement: Attendance code CRUD

The system SHALL provide create, read, update, and delete operations for attendance codes. Each code SHALL have a unique `code` string, a `label`, an optional `description`, a `sortOrder`, and an `isActive` flag. This catalog SHALL drive the timesheet grid dropdown and the export legend.

#### Scenario: List active codes for the grid
- **WHEN** an authenticated user lists attendance codes
- **THEN** the system returns codes ordered by `sortOrder`, and the grid dropdown offers each active code

#### Scenario: Create a code
- **WHEN** a user creates a code with a unique `code` and a `label`
- **THEN** the system persists it and includes it in subsequent lists

#### Scenario: Reject duplicate code
- **WHEN** a user creates a code whose `code` string already exists
- **THEN** the system responds with a conflict error and does not persist a duplicate

#### Scenario: Update and deactivate a code
- **WHEN** a user updates a code's label or sets `isActive` to false
- **THEN** the system persists the change; deactivated codes stay in the catalog but are not offered in the grid dropdown

#### Scenario: Delete a code
- **WHEN** a user deletes a code
- **THEN** the system removes it from the catalog

### Requirement: Seeded default codes

The system SHALL seed the attendance-code catalog with the standard set from the workbook legend: `x` (Đi làm), `P` (Nghỉ phép năm), `P/2` (Nghỉ phép năm 1/2 ngày), `L` (Lễ), `BU` (Nghỉ bù), `TV` (Thử việc), `TV/2` (Thử việc nửa ngày), `B` (Nghỉ bệnh), `KL` (Nghỉ phép không lương), `X/2` (Nghỉ không lương 1/2 ngày có phép), `O` (Chưa đi làm), `CD` (Nghỉ chế độ), `N` (Làm nửa ngày), `TS` (Nghỉ thai sản), `NCC` (Nghỉ không lương hưởng chuyên cần), `ON` (làm Online), `O/2` (Nghỉ nửa ngày không lương hưởng chuyên cần).

#### Scenario: Seed populates the catalog
- **WHEN** the attendance-code seed runs on an empty catalog
- **THEN** all standard codes are present with their labels

#### Scenario: Legend reflects catalog
- **WHEN** the `CHẤM CÔNG` sheet legend is generated
- **THEN** it lists each seeded code with its label
