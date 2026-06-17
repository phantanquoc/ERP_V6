## ADDED Requirements

### Requirement: Create task group within a phase
The system SHALL allow users to create a task group within a project phase. A task group has a name (`tenMuc`, required), optional description (`moTa`), and sort order (`thuTu`).

#### Scenario: Successful creation
- **WHEN** user submits a task group with `tenMuc` for an existing phase
- **THEN** system creates the group with auto-assigned `thuTu` (max existing + 1) and returns the created group

#### Scenario: Phase does not exist or belongs to different project
- **WHEN** user submits a task group with an invalid `projectPhaseId`
- **THEN** system returns 404 error "Không tìm thấy giai đoạn"

### Requirement: Update task group
The system SHALL allow users to update a task group's name, description, and sort order.

#### Scenario: Successful update
- **WHEN** user submits updated fields for an existing task group
- **THEN** system updates the group and returns updated data

#### Scenario: Group does not exist
- **WHEN** user submits update for a non-existent group ID
- **THEN** system returns 404 error "Không tìm thấy mục công việc"

### Requirement: Delete task group without deleting tasks
The system SHALL allow users to delete a task group. Tasks belonging to the deleted group SHALL become ungrouped (projectTaskGroupId set to null), NOT deleted.

#### Scenario: Delete group with tasks
- **WHEN** user deletes a group that contains tasks
- **THEN** system sets `projectTaskGroupId` to null on all tasks in that group, then deletes the group

#### Scenario: Delete empty group
- **WHEN** user deletes a group with no tasks
- **THEN** system deletes the group

### Requirement: Reorder task groups within a phase
The system SHALL allow users to reorder task groups within a phase by updating their `thuTu` values.

#### Scenario: Successful reorder
- **WHEN** user submits an array of `{id, thuTu}` pairs for groups in the same phase
- **THEN** system updates all `thuTu` values in a single transaction

### Requirement: Assign task to a group
The system SHALL allow tasks to optionally belong to a task group. The `projectTaskGroupId` field is nullable. When set, the group MUST belong to the same phase as the task.

#### Scenario: Create task with group assignment
- **WHEN** user creates a task with both `projectPhaseId` and `projectTaskGroupId` set, and the group belongs to that phase
- **THEN** system creates the task linked to both phase and group

#### Scenario: Create task without group (ungrouped)
- **WHEN** user creates a task with `projectPhaseId` set but `projectTaskGroupId` null or omitted
- **THEN** system creates the task linked to phase only, ungrouped

#### Scenario: Group does not belong to the specified phase
- **WHEN** user creates/updates a task with a `projectTaskGroupId` that belongs to a different phase than `projectPhaseId`
- **THEN** system returns 400 validation error "Mục công việc không thuộc giai đoạn đã chọn"

#### Scenario: Update task to move to different group
- **WHEN** user updates a task's `projectTaskGroupId` to a different group within the same phase
- **THEN** system updates the FK and the task appears under the new group

#### Scenario: Update task to remove from group
- **WHEN** user updates a task's `projectTaskGroupId` to null
- **THEN** system removes the group assignment and task becomes ungrouped

### Requirement: Fetch project includes task groups in nesting
The system SHALL return task groups nested within phases when fetching a project. Each phase contains its task groups, and each group contains its tasks. Ungrouped tasks (projectTaskGroupId is null) SHALL be returned separately per phase.

#### Scenario: Project with groups and ungrouped tasks
- **WHEN** client fetches a project that has phases with both grouped and ungrouped tasks
- **THEN** response includes `phases[].taskGroups[].tasks[]` for grouped tasks AND `phases[].tasks[]` filtered to ungrouped tasks only (where projectTaskGroupId is null)

### Requirement: UI displays groups as header rows
The system SHALL display task groups as lightweight header rows (gray background) within the task table of each phase. Groups appear in `thuTu` order, with their tasks listed below each header. Ungrouped tasks appear in a separate "Công việc chưa phân mục" section at the bottom of the phase.

#### Scenario: Phase with mixed grouped and ungrouped tasks
- **WHEN** user views a phase that has 2 groups and some ungrouped tasks
- **THEN** UI renders: Group 1 header → Group 1 tasks → Group 2 header → Group 2 tasks → "Công việc chưa phân mục" header → ungrouped tasks

#### Scenario: Phase with no groups
- **WHEN** user views a phase that has no task groups
- **THEN** UI renders tasks directly (no group headers), same as current behavior

### Requirement: Task form includes dependent group selector
The task create/edit form SHALL include a "Mục công việc" dropdown that shows groups belonging to the currently selected phase. The dropdown defaults to "Chưa phân mục" and only appears when the selected phase has at least one group.

#### Scenario: Phase has groups
- **WHEN** user selects a phase that has task groups in the task form
- **THEN** a "Mục công việc" dropdown appears showing all groups in that phase plus "Chưa phân mục" option

#### Scenario: Phase has no groups
- **WHEN** user selects a phase that has no task groups (or selects "Chưa phân giai đoạn")
- **THEN** no "Mục công việc" dropdown is shown

#### Scenario: User changes phase selection
- **WHEN** user changes the phase dropdown to a different phase
- **THEN** the group dropdown resets to "Chưa phân mục" and repopulates with groups from the new phase

### Requirement: Task group CRUD form
The system SHALL provide a form to create and edit task groups. The form contains fields for name (required) and description (optional).

#### Scenario: Create group from phase header
- **WHEN** user clicks "Thêm mục" button in a phase header
- **THEN** a form appears (modal or inline) for entering group name and optional description

#### Scenario: Edit existing group
- **WHEN** user clicks edit button on a group header row
- **THEN** form opens pre-filled with group's current name and description
