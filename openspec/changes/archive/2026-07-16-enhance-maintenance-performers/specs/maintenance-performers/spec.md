## ADDED Requirements

### Requirement: Main performer labeling

The system SHALL label the single performer field as "Người thực hiện chính" (main performer) in every maintenance employee picker: the completion log modal (`MaintenanceLogModal`) and the maintenance record form (`MaintenanceRecordForm`).

#### Scenario: Log modal shows main performer label
- **WHEN** a user opens the completion log modal for a maintenance plan item
- **THEN** the single performer field is labeled "Người thực hiện chính"

#### Scenario: Record form shows main performer label
- **WHEN** a user opens the maintenance record create/edit form
- **THEN** the single performer field is labeled "Người thực hiện chính"

### Requirement: Assistant performers on completion logs

The system SHALL allow selecting zero or more assistant performers ("người phụ") on a maintenance completion log, persisted as a `nguoiPhu` string array (employee display names), defaulting to an empty array.

#### Scenario: Save assistants when ticking completion
- **WHEN** a user ticks a month completion with a main performer and one or more assistants selected
- **THEN** the created completion log stores the assistant names in `nguoiPhu`

#### Scenario: Update assistants on an existing log
- **WHEN** a user edits the assistant list of an existing completion log and saves
- **THEN** the log's `nguoiPhu` is updated to the new list

#### Scenario: No assistants selected
- **WHEN** a user completes a log without selecting any assistant
- **THEN** the log's `nguoiPhu` is an empty array (not null)

### Requirement: Assistant performers on maintenance records

The system SHALL allow selecting zero or more assistant performers on a maintenance record, persisted as a `nguoiPhu` string array, defaulting to an empty array.

#### Scenario: Create record with assistants
- **WHEN** a user creates a maintenance record with assistants selected
- **THEN** the record stores the assistant names in `nguoiPhu`

#### Scenario: Edit record assistants
- **WHEN** a user edits a maintenance record's assistant list and saves
- **THEN** the record's `nguoiPhu` reflects the updated list

### Requirement: Name-searchable employee pickers

The system SHALL provide name-search on every employee picker in the Maintenance tab — a single-select searchable combobox for the main performer and a multi-select searchable picker for assistants — filtering the employee list by name, employee code, and department (case-insensitive substring).

#### Scenario: Filter main performer by typed name
- **WHEN** a user types part of an employee's name in the main-performer picker
- **THEN** only matching employees are shown as options

#### Scenario: Filter assistants and add multiple
- **WHEN** a user types in the assistant picker and selects a match
- **THEN** the selected employee is added as a chip and can be removed, and further searches can add more assistants without duplicates

### Requirement: Assistant propagation to auto-generated records

When ticking a completion auto-generates a maintenance record, the system SHALL copy the completion log's assistant list into the generated record's `nguoiPhu`.

#### Scenario: Auto-record inherits assistants
- **WHEN** a completion tick with assistants triggers automatic record creation
- **THEN** the generated maintenance record's `nguoiPhu` equals the log's assistant list

### Requirement: Assistants in record search and export

The system SHALL match assistant names when searching maintenance records and SHALL include assistants in the Excel export.

#### Scenario: Search matches an assistant name
- **WHEN** a user searches maintenance records by a name that appears only in a record's `nguoiPhu`
- **THEN** that record is included in the results

#### Scenario: Export includes assistants column
- **WHEN** a user exports maintenance records to Excel
- **THEN** the sheet contains a "Người phụ" column listing the assistants joined by comma
