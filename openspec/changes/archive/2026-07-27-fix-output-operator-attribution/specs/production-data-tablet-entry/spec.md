## MODIFIED Requirements

### Requirement: Dirty-tracked safe save

On confirm, the system SHALL write only the cells the worker actually changed (differ from the loaded values). Untouched cells MUST NOT be sent. If nothing changed, confirm SHALL write nothing.

When a changed cell has no existing `FinishedProduct` record in the database, the system SHALL create that record and save the entered value. The system MUST NOT skip such cells silently.

When saving multiple records and some writes fail, the system SHALL report the outcome explicitly: how many records saved successfully, how many failed, and which cells failed. The system MUST NOT report success when any write failed.

`nguoiThucHien` SHALL be written only for records in which at least one of the five grade weights (Hang A, Hang B, Hang B dau, Hang C, Uot) changed. A record that is dirty only because of the even waste distribution SHALL keep the operator name already stored on it. Because `nguoiThucHien` is a required field, a record being created for the first time SHALL still receive the current operator's name even when only a distributed waste share was entered.

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

#### Scenario: Operator stamped only on grades they entered

- **WHEN** one worker saves a Hang A weight for a batch and machine, and later a different worker saves a Hang B weight for the same batch and machine
- **THEN** the record's `nguoiThucHien` is the second worker, because that worker changed a grade weight on that record

#### Scenario: Waste-only record keeps its operator

- **WHEN** an existing record receives only a distributed waste share and no grade weight changed on it
- **THEN** the record keeps the operator name it already had and is not reassigned to the worker who entered the waste total

#### Scenario: New record created by waste distribution alone

- **WHEN** a record that does not yet exist in the database receives only a distributed waste share
- **THEN** the record is created with the current operator's name, satisfying the required field

### Requirement: Waste tab shift-total distribution

The "Vun - Phe pham" tab SHALL accept a single total for the whole shift (one input, not a matrix). On save, that total SHALL be split evenly across all cells (number of batches x 8 machines), and each cell's share SHALL be split evenly across the three fields `vunLonKhoiLuong`, `vunNhoKhoiLuong`, `phePhamKhoiLuong` (each = cell share / 3).

Because the distribution touches every batch x machine cell, it SHALL NOT reassign `nguoiThucHien` on records that already exist. Entering the shift waste total MUST NOT overwrite the operator recorded for grade weights entered by other workers.

#### Scenario: Even distribution

- **WHEN** the worker enters a shift total on the waste tab and there are N batches
- **THEN** each of the N x 8 cells receives total/(N x 8), and each cell's three waste fields each receive that share divided by 3

#### Scenario: Distribution does not reassign operators

- **WHEN** the worker responsible for Uot enters the shift waste total and confirms, while other workers had already saved grade weights for those batches
- **THEN** the waste shares are written to every cell, and the operator names recorded for those other grades remain unchanged

### Requirement: Operator selection first

On entry (with a valid kiosk session), the page SHALL first require the worker to select their name from a list filtered to the "Nhan vien san xuat" position. The chosen name SHALL be saved as `nguoiThucHien`, not the activating admin's name.

When unsaved entered data exists, the system SHALL require the worker to save before switching operator, and SHALL NOT carry the unsaved draft over to the next operator. Switching shift SHALL behave the same way. Once the data has been saved, switching operator SHALL proceed normally.

#### Scenario: Name required before entry

- **WHEN** the page loads with a valid session and no name chosen
- **THEN** only the operator-selection screen is shown; shift selection is not available

#### Scenario: Operator name is stamped on save

- **WHEN** the worker selects their name and saves an entry
- **THEN** the saved `nguoiThucHien` is the chosen name, not the activating admin's name

#### Scenario: Switching operator with unsaved data is blocked

- **WHEN** the worker has entered values that are not yet saved and taps the change-operator control
- **THEN** the system requires saving first and does not switch to the operator-selection screen with the draft still pending

#### Scenario: Switching operator after saving

- **WHEN** the worker has saved their entries and taps the change-operator control
- **THEN** the operator-selection screen is shown and the next worker starts without the previous worker's unsaved values

#### Scenario: Switching shift with unsaved data is blocked

- **WHEN** the worker has entered values that are not yet saved and taps the change-shift control
- **THEN** the system requires saving first and does not carry the unsaved draft into another shift
