## ADDED Requirements

### Requirement: Shift selector

The material-evaluation form SHALL provide a required "Ca" (shift) selector with values 1, 2, and 3, positioned next to the "Thời gian chiên" field. When creating a record, the operator MUST select a shift before saving. On edit, the selector SHALL be pre-filled from the existing record's `ca` value.

#### Scenario: Shift is required on create

- **WHEN** the operator submits the create form without selecting a shift
- **THEN** the form blocks submission and indicates the shift is required

#### Scenario: Shift pre-filled on edit

- **WHEN** the operator opens an existing evaluation that has a shift value
- **THEN** the Ca selector shows that value

#### Scenario: Legacy record without shift

- **WHEN** the operator opens an existing evaluation whose `ca` is null
- **THEN** the Ca selector shows no selection and the operator can set one

### Requirement: Shift-aware quick-time buttons

After a shift is selected, the form SHALL display quick-time buttons for that shift. Tapping a button SHALL fill the full datetime into the existing time picker and keep the picker visible so the operator can confirm or adjust. Manual entry through the time picker SHALL remain available. The shift time sets are:
- Ca 1: 06:30, 08:00, 09:30, 11:00, 12:30, 14:00
- Ca 2: 15:30, 17:00, 18:30, 20:00, 21:30
- Ca 3: 23:00, 00:30, 02:00, 03:30, 05:00

#### Scenario: Quick-time fills the field

- **WHEN** the operator selects Ca 1 and taps the 08:00 button
- **THEN** the time picker shows a datetime with time 08:00 and the operator can still edit it manually

#### Scenario: Buttons match the selected shift

- **WHEN** the operator selects Ca 2
- **THEN** only the Ca 2 time buttons (15:30, 17:00, 18:30, 20:00, 21:30) are shown

### Requirement: Night-shift cross-midnight date resolution

For Ca 3, the form SHALL resolve the date so that after-midnight times fall on the correct calendar day. The base date SHALL be yesterday when the current wall-clock time is between 00:00 and 05:59 inclusive, otherwise today. The 23:00 button SHALL use the base date; the 00:30, 02:00, 03:30, and 05:00 buttons SHALL use the base date plus one day. Ca 1 and Ca 2 buttons SHALL always use today's date. The resulting datetime SHALL be displayed so the operator can adjust the date.

#### Scenario: Evening tap on a night-shift after-midnight time

- **WHEN** the current time is 22:30 on day D and the operator selects Ca 3 and taps 00:30
- **THEN** the resulting datetime is 00:30 on day D+1

#### Scenario: After-midnight tap on a night-shift after-midnight time

- **WHEN** the current time is 01:00 on day D and the operator selects Ca 3 and taps 00:30
- **THEN** the resulting datetime is 00:30 on day D (the base date is D-1, plus one day = D)

#### Scenario: Night-shift start time

- **WHEN** the current time is 22:30 on day D and the operator selects Ca 3 and taps 23:00
- **THEN** the resulting datetime is 23:00 on day D

#### Scenario: Day-shift time uses today

- **WHEN** the operator selects Ca 1 or Ca 2 and taps any of its time buttons
- **THEN** the resulting datetime uses today's date

### Requirement: Persist shift value

The system SHALL persist the selected shift as an integer `ca` on the material evaluation for both create paths (with and without warehouse link) and on update. A null shift SHALL be allowed at the storage layer for backward compatibility.

#### Scenario: Shift saved on create

- **WHEN** an evaluation is created with Ca 2 selected
- **THEN** the stored record has `ca = 2`

#### Scenario: Shift saved on update

- **WHEN** an existing evaluation's shift is changed and saved
- **THEN** the stored record reflects the new `ca` value

### Requirement: Optional frying-parameter and evaluation fields

The frying-parameter fields (số lần ngâm, nhiệt độ nước trước ngâm, nhiệt độ nước sau vớt, thời gian ngâm, brix nước ngâm) and the material-evaluation fields (đánh giá trước ngâm, đánh giá sau ngâm) SHALL NOT be required, so a partial record can be saved and completed later.

#### Scenario: Save with empty frying parameters

- **WHEN** the operator saves an evaluation leaving Section 3 and Section 4 fields empty but with required identity fields filled
- **THEN** the form allows the save
