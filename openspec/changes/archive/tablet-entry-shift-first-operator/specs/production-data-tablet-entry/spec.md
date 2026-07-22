## MODIFIED Requirements

### Requirement: Operator selection first

On entry (with a valid kiosk session), after a shift has been chosen, the page SHALL require the worker to select their name from an attendance-filtered list: employees who checked in today into the selected shift AND whose position is mapped to this page. The list SHALL also offer a "Tìm người khác" fallback that opens the full list filtered to the "Nhân viên sản xuất" position. The chosen name SHALL be saved as `nguoiThucHien`, not the activating admin's name.

#### Scenario: Shift required before name

- **WHEN** the page loads with a valid session and no shift chosen
- **THEN** only the shift-selection screen is shown; the operator list is not available

#### Scenario: Attendance-filtered list after shift

- **WHEN** a shift has been chosen
- **THEN** the operator list shows only employees who checked in today into that shift and hold a position mapped to this page

#### Scenario: Fallback to full list

- **WHEN** the worker taps "Tìm người khác"
- **THEN** the full "Nhân viên sản xuất" list is shown so a worker with missing/failed attendance can still be selected

#### Scenario: Operator name is stamped on save

- **WHEN** the worker selects their name and saves an entry
- **THEN** the saved `nguoiThucHien` is the chosen name, not the activating admin's name

### Requirement: Shift selection step

Before operator selection and before the board, the page SHALL present a shift selector with values Ca 1, Ca 2, Ca 3, using the same large-card UI as the name selector. A shift MUST be chosen before the operator list is shown. The shift selector SHALL NOT display an operator name in its header, since no operator has been chosen at that point.

#### Scenario: Pick shift first

- **WHEN** the page loads with a valid session
- **THEN** a shift selector (Ca 1/2/3, large cards) is shown first, and the operator list appears only after a shift is chosen
