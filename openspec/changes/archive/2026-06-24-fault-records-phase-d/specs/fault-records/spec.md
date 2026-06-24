## ADDED Requirements

### Requirement: Typeahead template search in fault record modal
The system SHALL replace the FaultTemplate dropdown in the create/edit fault record modal with a typeahead combobox. The combobox SHALL debounce input by 300ms, search on `tenMauLoi` + `moTa` fields via the existing `GET /api/fault-templates?search=` endpoint, and display match count + severity badge (mucDo) in suggestions. Users SHALL be able to select "Không chọn mẫu" to enter a free-text tenLoi without linking a template.

#### Scenario: User types in template combobox
- **WHEN** user types at least 2 characters in the template combobox
- **THEN** after 300ms debounce, the system queries templates matching the input and displays suggestions with template name, severity badge, and record count

#### Scenario: User selects a template from suggestions
- **WHEN** user clicks a suggestion in the typeahead dropdown
- **THEN** the template is selected, faultTemplateId is set, and if the template has RepairSteps they are displayed read-only

#### Scenario: User clears template selection
- **WHEN** user selects "Không chọn mẫu" or clears the combobox
- **THEN** faultTemplateId is null and the tenLoi field becomes editable as free-text

#### Scenario: No matching templates
- **WHEN** user types a query that matches no templates
- **THEN** the dropdown shows "Không tìm thấy mẫu lỗi" message and allows free-text submission

### Requirement: Auto-create template for canMutate users
The system SHALL automatically create a new FaultTemplate when a `canMutate` user (technical/admin) submits a fault record without selecting an existing template. The FaultTemplate and FaultRecord SHALL be created in the same database transaction. Production users (non-canMutate) SHALL create fault records with free-text tenLoi without auto-creating a template.

#### Scenario: canMutate user submits without template
- **WHEN** a user with `canMutate` permission submits a fault record form with tenLoi but without faultTemplateId
- **THEN** the backend creates a new FaultTemplate (tenMauLoi = tenLoi, moTa = moTa from form) and a FaultRecord linked to it, both in a single transaction

#### Scenario: Production user submits without template
- **WHEN** a user WITHOUT `canMutate` permission submits a fault record form with tenLoi but without faultTemplateId
- **THEN** the backend creates only the FaultRecord with faultTemplateId = null (no template auto-created)

#### Scenario: Auto-created template gets generated code
- **WHEN** auto-create template is triggered
- **THEN** the new FaultTemplate receives a generated maMauLoi code following the existing yearly code pattern (e.g., `ML-2026-XXX`)

### Requirement: FaultTemplate detail summary endpoint
The system SHALL provide `GET /api/fault-templates/:id/summary` that returns: total fault record count for the template, the 5 most recent fault records, a monthly timeline (records grouped by month), the template's repair steps, and basic template fields.

#### Scenario: Summary endpoint for template with records
- **WHEN** client requests `GET /api/fault-templates/:id/summary` for a template with 12 associated records
- **THEN** response includes `{ totalRecords: 12, recentRecords: [...5 most recent], monthlyTimeline: [...grouped counts], repairSteps: [...ordered], template: {...basic fields} }`

#### Scenario: Summary endpoint for template with no records
- **WHEN** client requests `GET /api/fault-templates/:id/summary` for a template with 0 records
- **THEN** response includes `{ totalRecords: 0, recentRecords: [], monthlyTimeline: [], repairSteps: [...if any], template: {...} }`

#### Scenario: Summary endpoint for non-existent template
- **WHEN** client requests `GET /api/fault-templates/:id/summary` with an invalid id
- **THEN** the system returns 404 NotFoundError

### Requirement: FaultTemplate detail drawer in frontend
The system SHALL display a detail drawer/modal when a user clicks on a template in the "Mẫu lỗi" tab. The drawer SHALL show the template summary (occurrence count, recent records, monthly timeline, repair steps).

#### Scenario: User clicks template in list
- **WHEN** user clicks on a FaultTemplate row in the "Mẫu lỗi" tab
- **THEN** a drawer opens showing template detail with summary data fetched from the summary endpoint

#### Scenario: Drawer shows repair steps section
- **WHEN** the template detail drawer opens for a template with repair steps
- **THEN** the drawer displays a "Quy trình sửa" section with ordered repair steps showing stepNumber, moTa, thoiGianUocTinh, and dungCu
