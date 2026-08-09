## ADDED Requirements

### Requirement: A payroll setting selects which overtime figure is payable

The system SHALL provide a setting on payroll configuration that selects whether payroll consumes planned overtime hours or actual overtime hours. The setting SHALL default to planned hours, so that deploying this change alters no payslip.

While the setting selects planned hours, every payroll figure SHALL be identical to what the system produced before this change, at all three points where payroll aggregates overtime.

While the setting selects actual hours, payroll SHALL consume the derived actual figure, and a flagged participant-day SHALL contribute zero.

#### Scenario: Default deployment changes no pay
- **GIVEN** the setting has never been touched after deployment
- **WHEN** payroll is computed for a month containing overtime
- **THEN** every figure matches what the system produced before this change

#### Scenario: Switching to actual hours changes the payable figure
- **GIVEN** a month whose planned overtime totals 289 hours and whose actual overtime totals 161.5 hours
- **WHEN** the setting is switched to actual hours
- **THEN** payroll consumes 161.5 hours

#### Scenario: Flagged days contribute nothing when actual hours are in use
- **GIVEN** the setting selects actual hours and a participant-day is flagged as unusable
- **THEN** that day contributes zero payable overtime

#### Scenario: All three aggregation points honour the setting
- **WHEN** the setting is changed
- **THEN** the payroll list, the payroll detail, and the individual payslip all reflect the same choice

### Requirement: Both figures are displayed side by side with flag indicators

The system SHALL display the planned and actual overtime figures together, in both the attendance grid and the payroll view, regardless of which figure the setting makes payable. Participant-days carrying a flag SHALL be marked, and the flag's reason SHALL be available to the viewer.

This parallel display exists so managers can compare the two figures over a period before any pay is affected.

#### Scenario: Attendance grid shows both figures
- **WHEN** a manager opens the attendance grid for a month containing overtime
- **THEN** each overtime entry shows both the planned and the actual hours

#### Scenario: Payroll view shows both figures
- **WHEN** a manager opens the payroll view
- **THEN** an actual-hours column appears beside the planned-hours column

#### Scenario: Flagged entries are marked with a reason
- **GIVEN** a participant-day flagged for a missing clock-out
- **WHEN** a manager views it
- **THEN** the entry is visibly marked and the reason is available

#### Scenario: Both figures show even when planned hours are payable
- **GIVEN** the setting selects planned hours
- **THEN** the actual figure is still displayed for comparison
