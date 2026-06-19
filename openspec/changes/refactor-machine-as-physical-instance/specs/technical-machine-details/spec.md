## MODIFIED Requirements

### Requirement: QLHTM manages machine system details
The system SHALL allow authorized QLHTM users to create, view, update, deactivate, and delete machine system detail records under one physical machine. Each detail SHALL belong to exactly one physical machine (one `MachineSystem` row that represents a single shop-floor unit), SHALL use one of the supported types `Thiet bi`, `Cum`, `Linh kien`, or `Diem kiem tra`, and SHALL support an optional parent detail for flexible hierarchy within the same physical machine. Detail trees SHALL NOT be shared across physical machines, even when those machines are clones of the same template.

#### Scenario: Create a detail under one physical machine
- **WHEN** an authorized QLHTM user creates a detail for an existing physical machine with a supported type
- **THEN** the system stores the detail as a relational child row linked to that physical machine via `machineSystemId`
- **THEN** the detail appears only in that physical machine's detail list with its type, code or name, active status, and order

#### Scenario: Reject unsupported machine detail type
- **WHEN** an authorized QLHTM user submits a detail type outside `Thiet bi`, `Cum`, `Linh kien`, and `Diem kiem tra`
- **THEN** the system rejects the request with a Vietnamese validation message
- **THEN** no machine system detail row is created

#### Scenario: Maintain hierarchy within one physical machine
- **WHEN** an authorized QLHTM user assigns a parent detail to a machine system detail
- **THEN** the system verifies that the parent detail belongs to the same physical machine
- **THEN** the system rejects parent assignments that cross physical machines

#### Scenario: Edit one cloned machine without affecting siblings
- **WHEN** an authorized QLHTM user edits or deactivates a detail on a cloned physical machine such as `HT-CCK-03`
- **THEN** the change applies only to `HT-CCK-03`'s detail rows
- **THEN** the template `HT-CCK-MAU` and the other seven cloned machines retain their own detail rows unchanged

### Requirement: Machine system detail lists are searchable and operational
The system SHALL provide machine system detail listing APIs and UI tables with filters for physical machine, detail type, active status, and search text, plus clear sort and pagination controls near the table.

#### Scenario: Filter details by physical machine and type
- **WHEN** a QLHTM user filters details by a physical machine and the `Linh kien` type
- **THEN** the list returns only matching detail rows that belong to that physical machine
- **THEN** pagination metadata reflects the filtered result count

#### Scenario: Show empty detail result
- **WHEN** no machine system details match the selected filters
- **THEN** the UI shows concise Vietnamese empty-state copy without decorative placeholder noise

### Requirement: Machine system details protect referenced records
The system SHALL prevent hard deletion of a machine system detail when fault records, fault templates, repair request items, handover items, maintenance plan items, or maintenance records reference it. In that case, the system SHALL allow deactivation instead.

#### Scenario: Delete referenced machine detail
- **WHEN** an authorized QLHTM user attempts to delete a detail referenced by technical workflow records
- **THEN** the system rejects hard deletion with a Vietnamese conflict message
- **THEN** the existing linked records remain unchanged

#### Scenario: Deactivate referenced machine detail
- **WHEN** an authorized QLHTM user deactivates a referenced detail
- **THEN** the system marks the detail inactive
- **THEN** existing linked records continue to display their stored context

## ADDED Requirements

### Requirement: Cloning a physical machine duplicates the entire detail tree
The system SHALL provide a clone operation on physical machines (via `MachineSystemService.clone(sourceId, overrides)`) that copies the source machine's full `MachineSystemDetail` tree under the new machine. The clone SHALL preserve parent/child links by remapping `parentDetailId` to the newly created child rows, copy field values (`loaiChiTiet`, `tenChiTiet`, `viTri`, `moTa`, `thuTu`, `hoatDong`, `trangThai`), and regenerate unique `maChiTiet` codes that follow the destination machine's naming convention. The whole clone operation SHALL run inside one `prisma.$transaction`.

#### Scenario: Clone preserves the hierarchy
- **WHEN** an authorized QLHTM user clones a template machine that has a three-level detail tree
- **THEN** the new physical machine has the same three-level hierarchy with regenerated unique `maChiTiet` codes
- **THEN** every parent/child relationship is preserved using the new ids on the cloned rows

#### Scenario: Clone aborts on detail code collision
- **WHEN** the clone would generate a `maChiTiet` value that already exists on any machine system detail
- **THEN** the system aborts the transaction with a Vietnamese conflict message
- **THEN** no detail rows are inserted on the new machine

#### Scenario: Clone records the template lineage
- **WHEN** the clone succeeds
- **THEN** the system stores `parentSystemId` on the new physical machine pointing to the source template
- **THEN** the lineage is informational only and the cloned detail tree evolves independently from the source afterwards
