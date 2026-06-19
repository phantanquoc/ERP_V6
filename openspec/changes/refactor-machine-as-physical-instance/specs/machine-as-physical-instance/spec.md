## ADDED Requirements

### Requirement: One MachineSystem record represents one physical machine
The system SHALL treat each `MachineSystem` row as a single physical machine on the shop floor. The QLHTM "Hệ thống máy" tab SHALL list one row per physical unit (for example eight vacuum fryer rows for eight fryers), and downstream technical and production records SHALL reference a physical machine through `machineSystemId` only.

#### Scenario: Operator creates one row per physical machine
- **WHEN** an authorized QLHTM user adds eight vacuum fryers from scratch
- **THEN** the system stores eight independent `MachineSystem` rows with unique `maHeThong` values such as `HT-CCK-01` through `HT-CCK-08`
- **THEN** each row owns its own detail tree, fault records, repair items, operations, and maintenance plans without sharing them with the other seven rows

#### Scenario: Downstream records resolve to a single physical machine
- **WHEN** a fault record, repair request item, acceptance handover item, system operation, finished product, or quality evaluation is created against a machine
- **THEN** the system stores `machineSystemId` referencing the physical machine row
- **THEN** the system rejects payloads that still send the legacy `machineId` field with a Vietnamese validation message

### Requirement: MachineSystem carries an operational status field with denormalised value
The system SHALL add a `trangThai` column to `MachineSystem` typed as the `MachineStatus` enum (`HOAT_DONG` / `BAO_TRI` / `NGUNG_HOAT_DONG`) defaulting to `HOAT_DONG`. The status field SHALL be writable only through `MachineSystemService.updateStatus` and SHALL never be accepted in create or generic update payloads.

#### Scenario: Default status on creation
- **WHEN** an authorized QLHTM user creates a new physical machine without specifying a status
- **THEN** the system stores `trangThai = HOAT_DONG`
- **THEN** the status field is returned by GET endpoints alongside the rest of the machine row

#### Scenario: Reject status field on generic update
- **WHEN** any client calls `PUT /api/machine-systems/:id` with `trangThai` in the payload
- **THEN** the system ignores the `trangThai` field or rejects the request with a Vietnamese validation message
- **THEN** the persisted status is unchanged

### Requirement: MachineSystem supports clone-from-template and create-from-scratch
The system SHALL allow authorized QLHTM users to either create a new physical machine from scratch with an empty detail tree or clone an existing template machine. Cloning SHALL copy the entire `MachineSystemDetail` tree, preserve parent/child relationships, regenerate unique `maChiTiet` codes, and store the source machine's id in `parentSystemId` on the new row.

#### Scenario: Clone a template machine
- **WHEN** an authorized QLHTM user clones template machine `HT-CCK-MAU` while supplying overrides for `maHeThong` and `tenHeThong`
- **THEN** the system creates a new `MachineSystem` row with the supplied overrides and `parentSystemId` set to the template id
- **THEN** the system copies every detail under the template (including parent/child links, `loaiChiTiet`, `tenChiTiet`, `viTri`, `moTa`, `thuTu`, `hoatDong`, `trangThai`) into the new machine with regenerated unique `maChiTiet` codes that do not collide with existing rows
- **THEN** all writes happen inside a single `prisma.$transaction`

#### Scenario: Create a physical machine from scratch
- **WHEN** an authorized QLHTM user creates a new physical machine without choosing a template
- **THEN** the system stores the new `MachineSystem` row with `parentSystemId = NULL`
- **THEN** the new machine starts with no detail rows and operators add details manually afterwards

#### Scenario: Reject clone with collision-free maChiTiet conflicts
- **WHEN** a clone would produce a `maChiTiet` value that already exists for any machine system detail
- **THEN** the system aborts the transaction with a Vietnamese conflict message
- **THEN** no partial detail rows are created on the new machine

### Requirement: Physical machine summary view aggregates technical activity per machine
The system SHALL expose `MachineSystemService.getSummary(systemId)` returning, for the requested physical machine: the most recent fault records, repair request items, acceptance handover items, system operations, maintenance records, and status log entries, each capped to a configurable limit. Each summary section SHALL include only rows that belong to the same `machineSystemId`.

#### Scenario: Open the machine drawer
- **WHEN** an authorized QLHTM user opens the summary drawer for a physical machine
- **THEN** the system returns the machine row with its detail tree plus the recent activity sections in one response
- **THEN** none of the returned activity rows belong to a different physical machine

#### Scenario: Empty activity sections render concise empty states
- **WHEN** a newly created physical machine has no faults, repairs, operations, maintenance, or status entries yet
- **THEN** each activity section returns an empty array
- **THEN** the UI shows concise Vietnamese empty-state copy without decorative placeholder noise

### Requirement: Production module uses physical machine references only
The system SHALL drop the `machineId` column from `SystemOperation`, `FinishedProduct`, and `QualityEvaluation` and rely on `machineSystemId` for the physical machine relationship. The unique constraints `[maChien, machineId]` on `finished_products` and `quality_evaluations` SHALL be replaced with `[maChien, machineSystemId]`.

#### Scenario: Create production records linked to physical machines
- **WHEN** an operator records a system operation, finished product, or quality evaluation for a physical machine
- **THEN** the system stores `machineSystemId` and resolves the machine name via the `MachineSystem` row
- **THEN** the system rejects payloads that supply the legacy `machineId` field

#### Scenario: Enforce uniqueness per fry batch and physical machine
- **WHEN** a finished product or quality evaluation is created with a `(maChien, machineSystemId)` pair that already exists
- **THEN** the system rejects the request with a Vietnamese conflict message referencing the duplicate batch
- **THEN** no duplicate row is stored

### Requirement: QLSX no longer exposes a separate machine management tab
The system SHALL remove the "Quản lý máy móc" tab and the `/api/machines` route family from the production department surface. Production users SHALL select machines through the same `MachineSystem` listing used by QLHTM.

#### Scenario: Production forms select physical machines from the unified list
- **WHEN** an authorized QLSX user opens the SystemOperation, FinishedProduct, or QualityEvaluation form
- **THEN** the machine selector is populated from `/api/machine-systems` with optional filters for `loaiHeThong`, `khuVuc`, and `trangThai`
- **THEN** the form does not call any `/api/machines` endpoint

#### Scenario: Legacy machine routes return 404
- **WHEN** any client calls `/api/machines` or its sub-routes after the migration
- **THEN** the system responds with HTTP 404 and a Vietnamese error message
- **THEN** server logs do not register any registered route under that prefix
