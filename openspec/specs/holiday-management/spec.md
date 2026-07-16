## ADDED Requirements

### Requirement: Holiday CRUD

The system SHALL provide create, read, update, and delete operations for holidays. Each holiday SHALL have a `name`, a `date`, and an optional `note`. Holidays SHALL NOT be hard-coded; the timesheet export and overtime/summary calculations SHALL read holidays from this catalog.

#### Scenario: Create a holiday
- **WHEN** an authenticated user creates a holiday with a name and date
- **THEN** the system persists it and returns it in the holiday list

#### Scenario: List holidays
- **WHEN** an authenticated user lists holidays
- **THEN** the system returns all holidays ordered by date

#### Scenario: Update a holiday
- **WHEN** a user updates an existing holiday's name, date, or note
- **THEN** the system persists the change and reflects it in subsequent reads

#### Scenario: Delete a holiday
- **WHEN** a user deletes a holiday
- **THEN** the system removes it and it no longer appears in the holiday list or export

#### Scenario: Reject missing required fields
- **WHEN** a user creates a holiday without a name or without a valid date
- **THEN** the system responds with a validation error and does not persist anything

### Requirement: Holiday drives day-type classification

The overtime and summary calculations SHALL treat any day matching a `Holiday` date as a holiday for the purpose of overtime band classification and the `L` (Lễ) code interpretation.

#### Scenario: Holiday day classified as holiday overtime
- **WHEN** an employee has overtime on a day that matches a `Holiday` date
- **THEN** those overtime hours are counted in the holiday overtime band
