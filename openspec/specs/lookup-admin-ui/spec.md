# lookup-admin-ui Specification

## Purpose
TBD - created by archiving change shared-lookup-table. Update Purpose after archive.
## Requirements

### Requirement: Display classification groups
The system SHALL display a tabbed or dropdown interface for selecting between 11 classification groups.

#### Scenario: Group selection
- **WHEN** admin opens "Shared Classifications" section in settings page
- **THEN** system displays selector with options: Đơn vị tính, Loại chi phí, Phân loại vật tư, Khu vực, Mức độ lỗi, Loại lỗi, Loại sản phẩm, Loại khách hàng, Vai trò dự án, Loại chi phí xuất khẩu, Đơn vị tiền
- **THEN** system loads and displays entries for selected group

#### Scenario: Empty group
- **WHEN** admin selects a group with no entries
- **THEN** system displays empty state with "Add first entry" button

### Requirement: List lookup entries for selected group
The system SHALL display all lookup entries in a table with columns: Label, Code, Sort Order, Usage Count, Status, Actions.

#### Scenario: Display active entries with usage
- **WHEN** admin views DON_VI_TINH group
- **THEN** system fetches GET /api/lookups?group=DON_VI_TINH
- **THEN** system displays table with 23 rows sorted by sortOrder
- **THEN** each row shows badge with usage count (fetched from /api/lookups/:id/usage)

#### Scenario: Show hidden entries toggle
- **WHEN** admin toggles "Show hidden entries"
- **THEN** system refetches GET /api/lookups?group=DON_VI_TINH&all=true
- **THEN** inactive entries appear with visual indicator (grayed out or strikethrough)

### Requirement: Create new lookup entry
The system SHALL allow admin to add new classification values via modal dialog.

#### Scenario: Add new unit of measure
- **WHEN** admin clicks "Add new" button in DON_VI_TINH group
- **THEN** system displays modal with fields: Label (required), Sort Order (default 0)
- **THEN** admin enters label "Lọ" and submits
- **THEN** system posts {group: "DON_VI_TINH", label: "Lọ"} to /api/lookups
- **THEN** system displays success message and refreshes table
- **THEN** new entry appears with auto-generated code "LO"

#### Scenario: Validation error on duplicate
- **WHEN** admin submits label that generates existing code
- **THEN** system displays error "This value already exists in this group"

### Requirement: Edit lookup entry
The system SHALL allow admin to edit label, sort order, or toggle active status.

#### Scenario: Update sort order
- **WHEN** admin clicks edit icon on a lookup row
- **THEN** system displays edit modal with current values
- **THEN** admin changes sortOrder from 0 to 5 and submits
- **THEN** system puts {sortOrder: 5} to /api/lookups/:id
- **THEN** table refreshes with new sort order

#### Scenario: Toggle active status
- **WHEN** admin clicks hide/show toggle on unused entry
- **THEN** system puts {isActive: false} or {isActive: true} to /api/lookups/:id
- **THEN** entry visual state updates immediately

#### Scenario: Rename with cascade confirmation
- **WHEN** admin edits label "Kg" to "kg" on entry with usage count 42
- **THEN** system puts {label: "kg"} to /api/lookups/:id
- **THEN** backend returns 409 with {requiresConfirmation: true, affectedRecords: 42}
- **THEN** system displays confirmation dialog: "Renaming 'Kg' to 'kg' will update 42 records. Continue?"
- **THEN** if admin confirms, system puts {label: "kg", confirmCascade: true}
- **THEN** system displays loading spinner during cascade operation
- **THEN** on success, system displays "Updated 42 records" and refreshes table

#### Scenario: Cascade operation failure
- **WHEN** cascade rename fails (500 error)
- **THEN** system displays error "Rename failed: [error message]. No data was changed."
- **THEN** lookup label remains unchanged in table

### Requirement: Delete lookup entry
The system SHALL prevent deletion of in-use entries and only allow soft delete of unused entries.

#### Scenario: Soft delete unused entry
- **WHEN** admin clicks delete icon on entry with usageCount=0
- **THEN** system displays confirmation "Hide this classification value?"
- **THEN** if admin confirms, system sends DELETE /api/lookups/:id
- **THEN** entry sets isActive=false and disappears from default view

#### Scenario: Block deletion of in-use entry
- **WHEN** admin clicks delete on entry with usageCount>0
- **THEN** system displays error modal "Cannot delete — used by 15 records. You can hide it instead."
- **THEN** delete operation does not proceed

### Requirement: Display usage count badge
The system SHALL show how many records reference each lookup value.

#### Scenario: Fetch usage count on load
- **WHEN** table loads with lookup entries
- **THEN** for each entry, system fetches GET /api/lookups/:id/usage in parallel
- **THEN** system displays count as badge (e.g., "42 records")

#### Scenario: Zero usage indicator
- **WHEN** lookup has usageCount=0
- **THEN** system displays badge "Not in use" or empty state

#### Scenario: Click usage badge for details
- **WHEN** admin clicks on usage count badge
- **THEN** system expands row or shows popover with breakdown: [{table, column, count}]
- **THEN** admin can see which tables reference this value

### Requirement: Loading and error states
The system SHALL display appropriate feedback during async operations.

#### Scenario: Loading state during fetch
- **WHEN** admin switches to different group
- **THEN** system displays skeleton loader or spinner in table
- **THEN** system disables interaction until data loads

#### Scenario: API error handling
- **WHEN** API request fails with network error
- **THEN** system displays error banner "Failed to load classifications. Retry?"
- **THEN** admin can click retry button to refetch

#### Scenario: Cascade operation progress
- **WHEN** cascade rename is in progress
- **THEN** system displays modal with spinner and message "Updating 42 records..."
- **THEN** modal cannot be dismissed until operation completes or fails

### Requirement: Responsive layout
The system SHALL display table appropriately on desktop and mobile viewports.

#### Scenario: Desktop view
- **WHEN** viewport width >= 768px
- **THEN** system displays full table with all columns visible

#### Scenario: Mobile view
- **WHEN** viewport width < 768px
- **THEN** system displays condensed card layout with primary info (label, usage) and expand for actions

> **AS-BUILT DEVIATION (gap carried forward):** the implementation uses **progressive column hiding**, not the card layout described above. This scenario is NOT satisfied as written. Revisit if mobile admin use becomes a real workflow.

### Requirement: Retain hidden values in edit mode
The system SHALL never silently blank a stored classification value that has since been hidden.

#### Scenario: Editing a record whose value is now inactive
- **WHEN** an edit form loads an existing record whose stored label belongs to an `isActive=false` lookup
- **THEN** the dropdown additionally includes that value via `useLookups(group, { includeValue })`, rendered with an "(đã ẩn)" suffix
- **THEN** saving the record preserves the stored value rather than blanking it

#### Scenario: Create mode excludes inactive values
- **WHEN** a create/new-record form loads a classification dropdown
- **THEN** only `isActive=true` entries are listed; the appended inactive value is not selectable for other records
