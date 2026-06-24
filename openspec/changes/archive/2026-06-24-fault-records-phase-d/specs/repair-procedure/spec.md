## ADDED Requirements

### Requirement: RepairStep data model
The system SHALL store repair procedure steps as a `RepairStep` child table of `FaultTemplate` in the `business` schema. Each step SHALL have: id (CUID), faultTemplateId (FK), stepNumber (Int, 1-based), moTa (String, required), thoiGianUocTinh (Int?, estimated minutes), dungCu (String?, tools needed), ghiChu (String?, notes). Deleting a FaultTemplate SHALL cascade-delete all its RepairSteps.

#### Scenario: RepairStep model exists in database
- **WHEN** Prisma migration `add-repair-step-model` is applied
- **THEN** a `RepairStep` table exists in the `business` schema with columns: id, faultTemplateId, stepNumber, moTa, thoiGianUocTinh, dungCu, ghiChu, createdAt, updatedAt

#### Scenario: Cascade delete removes repair steps
- **WHEN** a FaultTemplate is deleted
- **THEN** all associated RepairStep records are deleted automatically

### Requirement: Display repair steps read-only in fault record modal
The system SHALL display repair steps as a read-only ordered list when a user selects a template that has repair steps, in both the create/edit and view fault record modals.

#### Scenario: Template with repair steps selected in create modal
- **WHEN** user selects a FaultTemplate that has RepairSteps in the create/edit fault record modal
- **THEN** the system displays the repair steps as a numbered read-only list showing stepNumber, moTa, thoiGianUocTinh (if set), and dungCu (if set)

#### Scenario: Template without repair steps selected
- **WHEN** user selects a FaultTemplate that has no RepairSteps
- **THEN** no repair procedure section is displayed

#### Scenario: View fault record with linked template having repair steps
- **WHEN** user views a fault record whose linked FaultTemplate has RepairSteps
- **THEN** the system displays the repair steps as a read-only ordered list

### Requirement: Input repair steps during auto-create template
The system SHALL allow `canMutate` users to input repair steps when auto-creating a new template (submitting a fault record without selecting an existing template). The repair steps form SHALL be a dynamic list with add/remove capabilities.

#### Scenario: canMutate user creates fault record without template
- **WHEN** a `canMutate` user submits a fault record without selecting faultTemplateId AND provides tenLoi
- **THEN** the system displays a dynamic RepairSteps form allowing the user to add ordered steps with moTa (required), thoiGianUocTinh (optional), dungCu (optional), ghiChu (optional)

#### Scenario: Repair steps saved with auto-created template
- **WHEN** a `canMutate` user submits a fault record with repair steps and no existing template
- **THEN** the auto-created FaultTemplate includes all provided RepairSteps with correct stepNumber ordering

### Requirement: CRUD repair steps in template form
The system SHALL include a RepairSteps section in the FaultTemplate create and edit forms. Users SHALL be able to add, remove, and reorder steps using up/down buttons.

#### Scenario: Add repair step in template form
- **WHEN** user clicks "Thêm bước" in the template create/edit form
- **THEN** a new empty step row is appended with auto-incremented stepNumber and focus on moTa field

#### Scenario: Remove repair step
- **WHEN** user clicks remove on a repair step row
- **THEN** the step is removed and remaining steps are re-numbered sequentially

#### Scenario: Reorder repair steps up
- **WHEN** user clicks the up button on step N (where N > 1)
- **THEN** step N swaps position with step N-1 and stepNumbers are recalculated

#### Scenario: Reorder repair steps down
- **WHEN** user clicks the down button on step N (where N < total steps)
- **THEN** step N swaps position with step N+1 and stepNumbers are recalculated

#### Scenario: Update repair steps uses delete-then-recreate
- **WHEN** a template's repair steps are updated via the edit form
- **THEN** the backend deletes all existing RepairSteps for that template and creates new ones from the submitted array in a single transaction

### Requirement: Include repair steps in template summary endpoint
The `GET /api/fault-templates/:id/summary` endpoint SHALL include the template's repair steps in its response, ordered by stepNumber ascending.

#### Scenario: Summary endpoint returns repair steps
- **WHEN** client requests `GET /api/fault-templates/:id/summary` for a template with 3 repair steps
- **THEN** the response includes a `repairSteps` array with 3 items ordered by stepNumber
