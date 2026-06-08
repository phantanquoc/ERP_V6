## ADDED Requirements

### Requirement: Co Dien manages fault templates by machine detail
The system SHALL allow authorized Co Dien users to create, view, update, deactivate, and delete fault templates linked to machine system details. Each template SHALL include a name, description, severity, active status, and machine detail context.

#### Scenario: Create fault template for machine detail
- **WHEN** an authorized Co Dien user creates a fault template for an existing active machine system detail
- **THEN** the system stores the template linked to that machine detail
- **THEN** the template appears in Co Dien fault template lists with machine system and detail context

#### Scenario: Reject template without valid machine detail
- **WHEN** an authorized Co Dien user submits a fault template for a missing or inactive machine detail
- **THEN** the system rejects the request with a Vietnamese validation message
- **THEN** no fault template row is created

### Requirement: Co Dien records real faults with detail context
The system SHALL allow authorized Co Dien users to create and manage real fault records linked to a machine system, optional machine detail, and optional fault template. Fault records SHALL preserve existing compatibility fields such as `maHeThong` while adding relational links for accurate reporting.

#### Scenario: Create fault record from template
- **WHEN** an authorized Co Dien user creates a fault record from a fault template
- **THEN** the system copies the template context into the fault record
- **THEN** the fault record is linked to the template, machine system, and machine detail

#### Scenario: Create fault record without template
- **WHEN** an authorized Co Dien user creates a real fault record for a machine system detail without selecting a template
- **THEN** the system stores the record linked to the selected machine system and detail
- **THEN** the system preserves the entered fault name, description, severity, status, discoverer, discovery date, and attachments

### Requirement: Fault lists support template and real-record workflows
The system SHALL provide separate table views for fault templates and real fault records with compact filters, sorting, pagination, and Vietnamese operational copy.

#### Scenario: Filter real faults by detail and status
- **WHEN** a Co Dien user filters real fault records by a machine detail and status
- **THEN** the system returns only matching real fault records
- **THEN** the UI shows machine system, detail, severity, status, discovery date, and responsible context in a dense ERP table

#### Scenario: Deactivate referenced fault template
- **WHEN** a Co Dien user deactivates a fault template that has related real fault records
- **THEN** the template is no longer available for new fault selection
- **THEN** existing fault records keep their template link and readable context
