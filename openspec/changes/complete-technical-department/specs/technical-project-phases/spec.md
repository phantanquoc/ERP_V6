## ADDED Requirements

### Requirement: Projects support flexible phases
The system SHALL allow authorized technical Projects users to add, view, edit, delete, and reorder phases under a project. Each phase SHALL include a title, optional description, owner or person in charge, progress, status, order, start date, and optional end date.

#### Scenario: Create project phase
- **WHEN** an authorized Projects user creates a phase under an existing project
- **THEN** the system stores the phase as a relational child row linked to the project
- **THEN** the phase appears in project detail views according to its order

#### Scenario: Reorder project phases
- **WHEN** an authorized Projects user reorders phases within a project
- **THEN** the system updates phase order values in one transaction
- **THEN** the project detail view displays phases in the new order without duplicate order positions

#### Scenario: Delete project phase with child tasks
- **WHEN** an authorized Projects user deletes a phase that has child tasks
- **THEN** the system requires a valid handling path for those tasks, such as cascade delete by explicit confirmation or moving tasks out of the phase
- **THEN** the system does not silently orphan task records

### Requirement: Project phases contain child tasks
The system SHALL allow project tasks to belong to a project phase while preserving existing project-task behavior for records that are not yet assigned to a phase. Phase task lists SHALL include task title, description, person in charge, deadline, status, order, and progress or completion context when available.

#### Scenario: Add task to phase
- **WHEN** an authorized Projects user creates a task inside a phase
- **THEN** the task is linked to the project and the selected phase
- **THEN** the task appears under that phase in order

#### Scenario: Display existing unphased task
- **WHEN** an existing project task has no phase assignment after migration
- **THEN** the UI still displays the task in the project detail view
- **THEN** the user can assign it to a phase later

### Requirement: Project progress and statuses reflect phase/task context
The system SHALL expose phase progress and status in project APIs and UI. The system SHALL validate progress values to stay within 0 through 100 and SHALL use consistent status values for phases and tasks.

#### Scenario: Reject invalid phase progress
- **WHEN** an authorized Projects user submits a phase progress value below 0 or above 100
- **THEN** the system rejects the request with a Vietnamese validation message
- **THEN** the phase is not changed

#### Scenario: Show phase status summary
- **WHEN** a Projects user opens a project detail page
- **THEN** the UI shows each phase with its status, progress, owner, date range, and child task summary in a compact operational layout
