## ADDED Requirements

### Requirement: ExportCost CRUD records audit entries

ExportCost create, update, and delete operations SHALL invoke `recordAudit` via `@utils/auditLog` after the primary write commits, with `entityType = 'ExportCost'` and the matching action. Audit failure SHALL NOT bubble. No additional ExportCost endpoints beyond the existing CRUD set are introduced in this phase.

#### Scenario: ExportCost create audit

- **WHEN** a user creates a new export cost record
- **THEN** an audit row is recorded with `action = 'CREATE'`, `entityType = 'ExportCost'`, `before = null`, and `after` containing the created snapshot

#### Scenario: ExportCost delete audit

- **WHEN** a user deletes an export cost record
- **THEN** an audit row is recorded with `action = 'DELETE'`, `entityType = 'ExportCost'`, `before` containing the deleted snapshot, and `after = null`

#### Scenario: Audit failure does not fail the primary write

- **WHEN** `recordAudit` throws while persisting the audit row for an ExportCost update
- **THEN** the ExportCost update HTTP response still resolves successfully
