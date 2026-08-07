## MODIFIED Requirements

### Requirement: Approval materializes attendance per item × user

When the system transitions a plan to `DA_DUYET`, it SHALL iterate every item × every participant of that item and create one `Attendance` row per `(employeeId, item.ngayTangCa)` with `isOvertime = true`, stamping each row with a reference to the originating `OvertimePlan`. The system SHALL skip creation when an attendance row already exists for that triple. The full materialization SHALL run inside a single `prisma.$transaction`.

Materialization SHALL be performed by a single shared routine also used when an approved plan is edited, so both paths derive `checkInTime`, `checkOutTime`, and `workHours` identically: `checkInTime` anchors on the assigned shift's end time when a shift is set and falls back to the item's `gioBatDau` otherwise, overnight ranges are carried into the following day, and Vietnam local time is constructed against a UTC backend clock.

#### Scenario: Multi-day approval fans out
- **GIVEN** a plan with two items: Mon (3 people), Tue (5 people)
- **WHEN** an admin approves the plan
- **THEN** the system creates up to 8 attendance rows (3 + 5), each tied to that participant and that item's date and times

#### Scenario: Idempotent re-approval
- **GIVEN** a plan whose approval already created attendance rows
- **WHEN** the approve action runs again (e.g., retry)
- **THEN** existing `(employeeId, ngayTangCa, isOvertime)` rows are not duplicated

#### Scenario: Approved rows carry their plan reference
- **WHEN** an admin approves a plan
- **THEN** every attendance row the approval creates references that plan

#### Scenario: Approval and edit produce identical rows
- **GIVEN** an item with an assigned shift and an overnight time range
- **WHEN** attendance is materialized for it by approval, and separately by editing an approved plan to the same values
- **THEN** both paths produce the same `checkInTime`, `checkOutTime`, and `workHours`

### Requirement: Admin can edit and delete any plan at any status

The system SHALL allow users with role `ADMIN` to update or delete any `OvertimePlan` regardless of `nguoiTaoId`, but only while the plan's `trangThai` is `CHO_DUYET` or `DA_DUYET`. Updates to plans in `TU_CHOI`, `HOAN_THANH`, or `HUY` SHALL be rejected for every role, because such an edit would silently rewrite payroll figures for a closed period. Non-admin users SHALL retain the existing rule: they may only update or delete plans they created, and only while the plan's `trangThai` is `CHO_DUYET`.

#### Scenario: Admin edits another user's pending plan
- **WHEN** an admin updates a `CHO_DUYET` plan created by user B
- **THEN** the update succeeds

#### Scenario: Admin edits an approved plan
- **WHEN** an admin updates a plan whose `trangThai` is `DA_DUYET`
- **THEN** the update succeeds and the plan's linked attendance rows are resynchronized

#### Scenario: Admin blocked on terminal statuses
- **WHEN** an admin updates a plan whose `trangThai` is `TU_CHOI`, `HOAN_THANH`, or `HUY`
- **THEN** the system rejects the request with a Vietnamese message naming the blocking status

#### Scenario: Non-admin still blocked
- **WHEN** user B (not admin) tries to delete user A's plan
- **THEN** the system rejects the request with a 403

#### Scenario: Non-admin still blocked on approved plan
- **WHEN** the original creator (not admin) tries to edit their own plan after it has been approved
- **THEN** the system rejects the request with a 403
