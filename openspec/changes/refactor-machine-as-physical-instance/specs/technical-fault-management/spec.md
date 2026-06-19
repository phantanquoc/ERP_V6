## MODIFIED Requirements

### Requirement: Co Dien manages fault templates by machine detail
The system SHALL allow authorized Co Dien users to create, view, update, deactivate, and delete fault templates that may optionally link to a machine system and a machine system detail. Each template SHALL include a name, description, severity, active status, and may carry free-text detail hints (`tenDetailGoiY`, `loaiDetailGoiY`) so the same template can be reused across physical machines whose detail trees differ.

#### Scenario: Create fault template with optional machine detail link
- **WHEN** an authorized Co Dien user creates a fault template and selects an active machine system detail
- **THEN** the system stores the template linked to that machine system and detail
- **THEN** the template appears in Co Dien fault template lists with machine system and detail context

#### Scenario: Create reusable template without machine detail link
- **WHEN** an authorized Co Dien user creates a fault template without selecting a machine system detail and supplies free-text detail hints
- **THEN** the system stores the template with `machineSystemDetailId = NULL`, `machineSystemId` optional, `tenDetailGoiY`, and `loaiDetailGoiY`
- **THEN** the template is selectable from any physical machine's fault record form regardless of that machine's detail tree

#### Scenario: Reject template with inactive machine detail link
- **WHEN** an authorized Co Dien user submits a fault template that links to an inactive machine detail
- **THEN** the system rejects the request with a Vietnamese validation message
- **THEN** no fault template row is created

### Requirement: Co Dien records real faults with detail context
The system SHALL allow authorized Co Dien users to create and manage real fault records linked to a physical machine (`machineSystemId`), an optional machine detail (`machineSystemDetailId`), and an optional fault template (`faultTemplateId`). Fault records SHALL preserve existing compatibility fields such as `maHeThong` while removing the legacy `machineId` reference. When a template provides only free-text hints, the operator may still select a real machine detail on the new record so analytics retain the link.

#### Scenario: Create fault record from template with free-text hints
- **WHEN** an authorized Co Dien user creates a fault record from a template that has free-text detail hints
- **THEN** the system copies the template's name, description, severity, and hints into the record
- **THEN** the operator may pick a real `machineSystemDetailId` on the same physical machine to attach to the record
- **THEN** the fault record is linked to the template and the physical machine, and to the chosen detail when supplied

#### Scenario: Create fault record without template
- **WHEN** an authorized Co Dien user creates a real fault record for a physical machine and detail without selecting a template
- **THEN** the system stores the record linked to the selected physical machine and detail
- **THEN** the system preserves the entered fault name, description, severity, status, discoverer, discovery date, and attachments

#### Scenario: Reject fault record carrying legacy machineId
- **WHEN** any client submits a fault record payload containing the legacy `machineId` field
- **THEN** the system rejects the request with a Vietnamese validation message
- **THEN** no fault record row is created

### Requirement: Fault lists support template and real-record workflows
The system SHALL provide separate table views for fault templates and real fault records with compact filters, sorting, pagination, and Vietnamese operational copy. Fault template lists SHALL show whether a template is bound to a specific machine detail or carries only free-text hints.

#### Scenario: Filter real faults by physical machine and status
- **WHEN** a Co Dien user filters real fault records by a physical machine and status
- **THEN** the system returns only matching real fault records linked to that `machineSystemId`
- **THEN** the UI shows physical machine, optional detail, severity, status, discovery date, and responsible context in a dense ERP table

#### Scenario: Distinguish bound and free-text templates in the list
- **WHEN** a Co Dien user opens the fault template list
- **THEN** templates with `machineSystemDetailId` show the bound detail
- **THEN** templates without `machineSystemDetailId` show the free-text hint columns instead

#### Scenario: Deactivate referenced fault template
- **WHEN** a Co Dien user deactivates a fault template that has related real fault records
- **THEN** the template is no longer available for new fault selection
- **THEN** existing fault records keep their template link and readable context
