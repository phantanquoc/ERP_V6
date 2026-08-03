# lookup-audit-trail Specification

## Purpose
TBD - created by archiving change shared-lookup-table. Update Purpose after archive.
## Requirements

### Requirement: Record all lookup modifications
The system SHALL create an audit log entry for every create, update, and soft delete operation on lookups.

#### Scenario: Log entry creation
- **WHEN** ADMIN creates a new lookup entry
- **THEN** system creates LookupChangeLog with action='CREATE', lookupId, group, newLabel, changedByUserId, createdAt
- **THEN** oldLabel is null, affectedTables is empty array

#### Scenario: Log label update without cascade
- **WHEN** ADMIN updates lookup label where usageCount=0
- **THEN** system creates LookupChangeLog with action='UPDATE_LABEL', oldLabel, newLabel, affectedRecords=0

#### Scenario: Log cascade rename
- **WHEN** ADMIN performs cascade rename affecting 42 records across 3 tables
- **THEN** system creates LookupChangeLog with action='CASCADE_RENAME', oldLabel, newLabel, affectedRecords=42
- **THEN** affectedTables contains JSON array: [{table: "supply_request_items", column: "donViTinh", count: 20}, {table: "purchase_request_items", column: "donViTinh", count: 15}, {table: "lot_products", column: "donViTinh", count: 7}]

#### Scenario: Log soft delete
- **WHEN** ADMIN soft deletes a lookup (isActive=false)
- **THEN** system creates LookupChangeLog with action='SOFT_DELETE', oldLabel=current label, newLabel=null

#### Scenario: Log reactivation
- **WHEN** ADMIN reactivates a soft-deleted lookup (isActive=true)
- **THEN** system creates LookupChangeLog with action='REACTIVATE'

### Requirement: Audit log written inside transaction
The system SHALL write audit log entries within the same transaction as the data modification.

#### Scenario: Atomic cascade with audit
- **WHEN** cascade rename executes
- **THEN** system begins transaction
- **THEN** system creates LookupChangeLog entry
- **THEN** system updates lookup.label
- **THEN** system updates all mapped columns
- **THEN** system commits transaction

#### Scenario: Audit rolled back on failure
- **WHEN** cascade rename fails during column update
- **THEN** system rolls back transaction
- **THEN** LookupChangeLog entry is not persisted
- **THEN** no partial audit trail exists

### Requirement: Query audit history
The system SHALL provide endpoint to retrieve change history for a lookup or group.

#### Scenario: History for specific lookup
- **WHEN** client requests GET /api/lookups/:id/history
- **THEN** system returns all LookupChangeLog entries for that lookupId ordered by createdAt DESC
- **THEN** each entry includes action, oldLabel, newLabel, affectedRecords, changedByUserId, createdAt

#### Scenario: History for entire group
- **WHEN** client requests GET /api/lookups/history?group=DON_VI_TINH
- **THEN** system returns all LookupChangeLog entries for that group ordered by createdAt DESC

#### Scenario: Paginated history
- **WHEN** client requests history with ?page=1&limit=20
- **THEN** system returns paginated results with pagination metadata

### Requirement: Rollback capability data
The system SHALL store sufficient information in audit log to enable manual rollback.

#### Scenario: Cascade rename rollback data
- **WHEN** cascade rename is logged
- **THEN** audit entry contains oldLabel, newLabel, and complete affectedTables breakdown
- **THEN** admin can construct reverse UPDATE statements from this data

#### Scenario: Rollback query generation
- **WHEN** admin requests GET /api/lookups/history/:logId/rollback-sql
- **THEN** system returns SQL statements that would reverse the change
- **THEN** SQL is returned as text only, not executed automatically

### Requirement: Audit log retention
The system SHALL never delete audit log entries.

#### Scenario: Audit log immutability
- **WHEN** any user attempts to delete or modify a LookupChangeLog entry
- **THEN** system returns 405 Method Not Allowed
- **THEN** no update or delete endpoints exist for audit logs

#### Scenario: Lookup deletion preserves audit
- **WHEN** lookup is soft deleted
- **THEN** all LookupChangeLog entries for that lookup remain in database

### Requirement: Audit log schema
The system SHALL define LookupChangeLog table with required fields.

#### Scenario: Table structure
- **WHEN** migration creates LookupChangeLog table
- **THEN** table has columns: id (cuid), lookupId (nullable for deleted lookups), group (string), action (enum), oldLabel (nullable), newLabel (nullable), affectedRecords (int default 0), affectedTables (JsonB nullable), changedByUserId (nullable), createdAt (timestamp)
- **THEN** table is in common schema with @@map("lookup_change_logs")
- **THEN** indexes exist on (lookupId, createdAt DESC) and (group, createdAt DESC)

#### Scenario: Action enum values
- **WHEN** LookupChangeAction enum is defined
- **THEN** enum contains: CREATE, UPDATE_LABEL, CASCADE_RENAME, UPDATE_SORT_ORDER, SOFT_DELETE, REACTIVATE
