## ADDED Requirements

### Requirement: QLHTM manages machine system details
The system SHALL allow authorized QLHTM users to create, view, update, deactivate, and delete machine system detail records under a machine system. Each detail SHALL belong to one machine system, SHALL use one of the supported types `Thiet bi`, `Cum`, `Linh kien`, or `Diem kiem tra`, and SHALL support an optional parent detail for flexible hierarchy.

#### Scenario: Create a machine system detail
- **WHEN** an authorized QLHTM user creates a detail for an existing machine system with a supported type
- **THEN** the system stores the detail as a relational child row linked to that machine system
- **THEN** the detail appears in the machine system detail list with its type, code or name, active status, and order

#### Scenario: Reject unsupported machine detail type
- **WHEN** an authorized QLHTM user submits a detail type outside `Thiet bi`, `Cum`, `Linh kien`, and `Diem kiem tra`
- **THEN** the system rejects the request with a Vietnamese validation message
- **THEN** no machine system detail row is created

#### Scenario: Maintain hierarchy within one machine system
- **WHEN** an authorized QLHTM user assigns a parent detail to a machine system detail
- **THEN** the system verifies that the parent detail belongs to the same machine system
- **THEN** the system rejects parent assignments that cross machine systems

### Requirement: Machine system detail lists are searchable and operational
The system SHALL provide machine system detail listing APIs and UI tables with filters for machine system, detail type, active status, and search text, plus clear sort and pagination controls near the table.

#### Scenario: Filter details by machine system and type
- **WHEN** a QLHTM user filters details by a machine system and the `Linh kien` type
- **THEN** the list returns only matching detail rows
- **THEN** pagination metadata reflects the filtered result count

#### Scenario: Show empty detail result
- **WHEN** no machine system details match the selected filters
- **THEN** the UI shows concise Vietnamese empty-state copy without decorative placeholder noise

### Requirement: Machine system details protect referenced records
The system SHALL prevent hard deletion of a machine system detail when fault records, fault templates, repair request items, or handover items reference it. In that case, the system SHALL allow deactivation instead.

#### Scenario: Delete referenced machine detail
- **WHEN** an authorized QLHTM user attempts to delete a detail referenced by technical workflow records
- **THEN** the system rejects hard deletion with a Vietnamese conflict message
- **THEN** the existing linked records remain unchanged

#### Scenario: Deactivate referenced machine detail
- **WHEN** an authorized QLHTM user deactivates a referenced detail
- **THEN** the system marks the detail inactive
- **THEN** existing linked records continue to display their stored context
