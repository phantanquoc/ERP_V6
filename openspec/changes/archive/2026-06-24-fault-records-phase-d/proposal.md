## Why

The fault record system (Phase A/B/C) provides basic CRUD, recurrence detection, stats, and heatmap. However, the template selection UX is a plain dropdown that becomes unwieldy as the template library grows. Additionally, there is no structured way to capture or display repair procedures, which means technicians must rely on tribal knowledge or external documents. Phase D addresses template discoverability, automatic template creation for technical users, and a structured repair procedure workflow tied to each fault template.

## What Changes

- Replace the FaultTemplate dropdown in the create/edit modal with a typeahead combobox (debounce 300ms, searches on `tenLoi` + `moTa`)
- Add auto-create-template logic: when a technical/admin user submits a fault record without selecting an existing template, the system creates a new FaultTemplate in the same transaction and links it
- Introduce `RepairStep` model as a child table of `FaultTemplate` to store ordered repair procedure steps
- Display repair steps read-only in the fault record view/create modal when a template is selected
- Allow technical users to input repair steps when auto-creating a new template
- Add a template detail summary endpoint (`GET /api/fault-templates/:id/summary`) with occurrence count, recent records, monthly timeline, and repair steps
- Add a template detail drawer/modal in the frontend "Mẫu lỗi" tab
- Update the template creation/edit form to include a dynamic RepairSteps section (add/remove/reorder with up/down buttons)

## Capabilities

### New Capabilities
- `repair-procedure`: Structured repair steps (RepairStep model) attached to fault templates, with CRUD, display in fault record modals, and inclusion in template detail summary

### Modified Capabilities
- `fault-records`: Add typeahead template search in create/edit modal, auto-create template for technical users, display repair steps read-only when template selected, template detail summary endpoint and drawer

## Impact

- **Database**: New `RepairStep` model in `business` schema with migration
- **Backend services**: `faultTemplateService` (summary endpoint, include repairSteps), `faultRecordService` (auto-create template in transaction)
- **Backend routes**: New `GET /api/fault-templates/:id/summary`
- **Frontend hooks**: New typeahead search hook, template summary hook
- **Frontend components**: Modified `FaultRecordList.tsx` (typeahead combobox, repair steps display), new `FaultTemplateDetail.tsx`, new `RepairStepForm.tsx`
- **APIs affected**: `POST /api/fault-records` (auto-create behavior), `GET /api/fault-templates/:id/summary` (new)
