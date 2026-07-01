## ADDED Requirements

### Requirement: RepairRequestItem links to FaultRecord

`business.RepairRequestItem` SHALL expose an optional foreign key `faultRecordId: String? @db.VarChar(30)` referencing `business.FaultRecord.id` with `onDelete: SetNull` and `onUpdate: Cascade`. The migration SHALL be purely additive: existing rows SHALL have `faultRecordId = NULL`. The Prisma relation SHALL be named `faultRecord` (singular). No unique constraint SHALL be added — a single FaultRecord MAY be linked from multiple RepairRequestItems (e.g., re-scoped repairs).

#### Scenario: Column defaults to null on existing rows

- **WHEN** the migration is applied on a database with existing `RepairRequestItem` rows
- **THEN** all pre-existing rows have `faultRecordId = NULL` and no data is dropped

#### Scenario: FaultRecord deletion nulls the FK

- **WHEN** a `FaultRecord` referenced by one or more `RepairRequestItem` rows is deleted
- **THEN** each referencing `RepairRequestItem` has `faultRecordId` set to `NULL` but is otherwise unchanged

#### Scenario: Create RepairRequestItem with faultRecordId

- **WHEN** `repairRequestService.createRepairRequest` is called with items containing a valid `faultRecordId`
- **THEN** the created `RepairRequestItem` row has that `faultRecordId` and the parent transaction commits

### Requirement: Auto-complete cascades to linked FaultRecords

When `acceptanceHandoverService.createAcceptanceHandover` or any code path advances `RepairRequest.trangThai` to `HOAN_THANH` via the coverage auto-complete branch, the transaction SHALL — before commit — enumerate every `RepairRequestItem` of that RepairRequest whose `faultRecordId` is non-null. For each linked FaultRecord currently at `DANG_THEO_DOI` or `TAI_PHAT`, the transaction SHALL update `FaultRecord.trangThai` to `DA_XU_LY`, set `ngayXuLy = now()`, and insert a `FaultRecordStatusLog` row with `source = 'auto_from_repair'`, `reason` referencing the RepairRequest's `maYeuCau`, and `actorId` equal to the actor of the repair transition. Each individual FaultRecord update SHALL be wrapped in a try/catch: a single failure SHALL log an error and continue to the next linked record, but SHALL NOT roll back the RepairRequest transaction.

#### Scenario: One linked FaultRecord auto-closes on repair completion

- **WHEN** a RepairRequest with one item linked to `FaultRecord` F1 (currently `DANG_THEO_DOI`) reaches full handover coverage
- **THEN** the RepairRequest row's `trangThai` is `HOAN_THANH`, F1's `trangThai` is `DA_XU_LY`, F1's `ngayXuLy` equals the transition time, and a `fault_record_status_logs` row exists for F1 with `source = 'auto_from_repair'`

#### Scenario: Non-linked items do not trigger cascade

- **WHEN** a RepairRequest with items whose `faultRecordId` is all `NULL` auto-completes
- **THEN** the RepairRequest transitions to `HOAN_THANH` and no `fault_record_status_logs` rows are inserted for that transition

#### Scenario: Linked FaultRecord already at DA_XU_LY is skipped

- **WHEN** a RepairRequest auto-completes and one linked FaultRecord is already at `DA_XU_LY`
- **THEN** the RepairRequest transitions to `HOAN_THANH`, no new log row is created for that FaultRecord, and its `ngayXuLy` is unchanged
