## MODIFIED Requirements

### Requirement: Dirty-tracked safe save

On confirm, the system SHALL write only the cells the worker actually changed (differ from the loaded values). Untouched cells MUST NOT be sent. If nothing changed, confirm SHALL write nothing.

When a changed cell has no existing `FinishedProduct` record in the database, the system SHALL create that record and save the entered value. The system MUST NOT skip such cells silently.

When saving multiple records and some writes fail, the system SHALL report the outcome explicitly: how many records saved successfully, how many failed, and which cells failed. The system MUST NOT report success when any write failed.

#### Scenario: Only changed cells are written

- **WHEN** the worker changes one machine's weight and confirms
- **THEN** only that batch's record is written; other records are not sent and keep their existing values

#### Scenario: No change, no write

- **WHEN** the worker confirms without changing any cell
- **THEN** no write request is made

#### Scenario: Cell without an existing record

- **WHEN** the worker enters a value in a cell that has no `FinishedProduct` record yet and confirms
- **THEN** the system creates the record and saves the value; the value is not lost and no false success message is shown

#### Scenario: Some writes fail

- **WHEN** several cells are saved and at least one write fails
- **THEN** the system shows how many succeeded, how many failed, and which cells failed, in Vietnamese

### Requirement: Minimal validation

The page SHALL block saving when a numeric field is negative, empty, or outside the allowed range defined by the production entry validation thresholds, and SHALL NOT enforce that totals match input weight or any other cross-field total. Validation messages SHALL be shown in Vietnamese.

#### Scenario: Negative or empty value blocks save

- **WHEN** the worker attempts to save a step with a negative or empty numeric field
- **THEN** the system blocks the save and shows a Vietnamese validation message

#### Scenario: Value above the allowed maximum blocks save

- **WHEN** the worker enters a weight above the allowed maximum
- **THEN** the system blocks the value and shows a Vietnamese message stating the allowed range

#### Scenario: Non-matching totals are allowed

- **WHEN** the sum of output weights exceeds the input weight but all fields are non-negative, filled, and within range
- **THEN** the system allows the save

## ADDED Requirements

### Requirement: Confirm before changing production date with unsaved data
When the worker changes the production date while having unsaved entered data, the system SHALL ask for confirmation before switching.

#### Scenario: Change date with unsaved data
- **WHEN** the worker has entered values that are not yet saved and changes the production date
- **THEN** the system asks for confirmation before switching the date

#### Scenario: Change date with no unsaved data
- **WHEN** the worker changes the production date with no unsaved changes
- **THEN** the date switches without a confirmation prompt
