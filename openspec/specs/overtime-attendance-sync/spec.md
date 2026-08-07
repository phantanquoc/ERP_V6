## ADDED Requirements

### Requirement: Attendance rows record their originating overtime plan

Every `Attendance` row materialized from an overtime plan SHALL carry a nullable reference to the `OvertimePlan` that produced it. Attendance rows created by any other path — notably kiosk overtime check-in via `attendanceService.overtimeCheckIn` — SHALL leave this reference null. The reference SHALL be a real foreign key with an index, not inferred from the `notes` text.

Plan deletion SHALL NOT cascade-delete linked attendance rows; the reference SHALL be nulled instead, preserving the historical attendance record.

#### Scenario: Plan approval stamps the originating plan
- **WHEN** an admin approves an overtime plan and the system materializes attendance rows
- **THEN** every created row references that plan

#### Scenario: Kiosk overtime check-in leaves the reference null
- **WHEN** an employee records overtime by scanning at the kiosk
- **THEN** the created attendance row has a null plan reference

#### Scenario: Text notes are not used for provenance
- **GIVEN** two distinct plans whose `noiDung` values are identical
- **WHEN** the system determines which attendance rows belong to a plan
- **THEN** it resolves them by the foreign key, and each row belongs to exactly one plan

#### Scenario: Deleting a plan preserves its attendance rows
- **GIVEN** an approved plan with linked attendance rows
- **WHEN** the plan is deleted
- **THEN** the attendance rows remain and their plan reference becomes null

### Requirement: Editing an approved plan resynchronizes its attendance rows

When a plan whose `trangThai` is `DA_DUYET` is updated with a new item set, the system SHALL delete every attendance row linked to that plan and regenerate rows from the new items, within the same `prisma.$transaction` as the plan update. Regeneration SHALL use the same materialization logic as approval, producing identical `checkInTime`, `checkOutTime`, and `workHours` for equivalent input. The plan SHALL remain `DA_DUYET`; no re-approval is required.

If regeneration fails, the transaction SHALL roll back so the plan update is not committed either.

Attendance rows with a null plan reference, or referencing a different plan, SHALL NOT be deleted.

#### Scenario: Changing hours updates recorded overtime
- **GIVEN** an approved plan whose item runs 18:00–21:00 with attendance recorded at 3 hours
- **WHEN** an admin edits that item to run 18:00–22:00
- **THEN** the participant's attendance row reflects 4 hours

#### Scenario: Removing a participant removes their attendance
- **GIVEN** an approved plan item with participants A and B, each holding an attendance row
- **WHEN** an admin edits the item to list only participant A
- **THEN** participant A retains an attendance row and participant B's row for that plan is gone

#### Scenario: Adding a participant creates their attendance
- **WHEN** an admin edits an approved plan item to add participant C
- **THEN** participant C gains an attendance row matching that item's date and hours

#### Scenario: Changing the date moves the attendance
- **WHEN** an admin edits an approved plan item from Monday to Tuesday
- **THEN** no attendance row remains on Monday for that plan and a row exists on Tuesday

#### Scenario: Regeneration matches approval output exactly
- **GIVEN** an approved plan whose items are edited and then re-saved to their original values
- **THEN** the regenerated attendance rows carry the same `checkInTime`, `checkOutTime`, and `workHours` the original approval produced

#### Scenario: Kiosk rows survive a plan edit
- **GIVEN** an employee has both a plan-linked overtime row and a kiosk overtime row on the same date
- **WHEN** an admin edits the plan
- **THEN** the kiosk row is untouched

#### Scenario: Failed regeneration rolls back the plan edit
- **WHEN** attendance regeneration throws during an approved-plan update
- **THEN** neither the attendance changes nor the plan changes are committed

#### Scenario: Pending plan edits skip attendance entirely
- **GIVEN** a plan whose `trangThai` is `CHO_DUYET`
- **WHEN** it is updated
- **THEN** no attendance row is created, deleted, or modified

### Requirement: Unchanged plan items retain participant acceptance and actual time

When an approved or pending plan is updated, the system SHALL treat an incoming item as unchanged if its `ngayTangCa`, `gioBatDau`, and `gioKetThuc` all match an existing item of that plan. For unchanged items, the system SHALL carry over the existing `trangThaiTiepNhan` and `gioThucTe` maps to the rebuilt item, restricted to the item's current participant set. For items that do not match, the system SHALL reset `trangThaiTiepNhan` to `CHUA_TIEP_NHAN` for every participant and clear `gioThucTe`.

#### Scenario: Editing one item leaves the other item's acceptance intact
- **GIVEN** a plan with two items, both with participants who have accepted and logged actual time
- **WHEN** an admin edits only the second item's hours
- **THEN** the first item retains its acceptance states and actual times, and the second item is reset

#### Scenario: Newly added participant starts unaccepted
- **GIVEN** an unchanged item whose participants have accepted
- **WHEN** an admin adds a new participant to that item without changing its date or hours
- **THEN** existing participants keep their acceptance and the new participant is `CHUA_TIEP_NHAN`

#### Scenario: Removed participant drops out of the carried-over maps
- **GIVEN** an unchanged item where participants A and B have both logged actual time
- **WHEN** an admin removes participant B from that item
- **THEN** the rebuilt item retains A's acceptance and actual time and holds no entry for B

#### Scenario: Editing the note alone preserves state
- **WHEN** an admin changes only an item's `ghiChuItem`, leaving date and hours untouched
- **THEN** that item's acceptance states and actual times are preserved

### Requirement: Plans in terminal statuses cannot be edited

The system SHALL reject updates to plans whose `trangThai` is `TU_CHOI`, `HOAN_THANH`, or `HUY`, for every role including `ADMIN`, with a Vietnamese error message naming the blocking status. The frontend SHALL hide the edit affordance for plans in those statuses.

#### Scenario: API rejects editing a completed plan
- **WHEN** an admin submits an update for a plan whose `trangThai` is `HOAN_THANH`
- **THEN** the request is rejected with a Vietnamese message explaining the plan can no longer be edited

#### Scenario: API rejects editing a rejected or cancelled plan
- **WHEN** an admin submits an update for a plan whose `trangThai` is `TU_CHOI` or `HUY`
- **THEN** the request is rejected

#### Scenario: UI hides the edit button in terminal statuses
- **WHEN** an admin views a plan whose `trangThai` is `TU_CHOI`, `HOAN_THANH`, or `HUY`
- **THEN** the edit button is not offered

#### Scenario: Editable statuses still work
- **WHEN** an admin edits a plan whose `trangThai` is `CHO_DUYET` or `DA_DUYET`
- **THEN** the update succeeds

### Requirement: Legacy attendance rows are adopted by their originating plan

A one-time backfill SHALL populate the plan reference on pre-existing overtime attendance rows by matching each row's employee and date against the participants and dates of each plan's items, further disambiguated by the plan's `noiDung` recorded in the row's `notes`. Where a row matches exactly one plan, it SHALL be linked to that plan. Where a row matches more than one plan, it SHALL be linked to the earliest-approved matching plan and the ambiguity SHALL be logged with enough detail to identify the row. The backfill SHALL NOT create, delete, or otherwise modify attendance rows.

#### Scenario: Unambiguous legacy rows are linked
- **GIVEN** an overtime attendance row matching exactly one plan by employee, date, and plan content
- **WHEN** the backfill runs
- **THEN** the row references that plan

#### Scenario: Ambiguous row resolves to the earlier plan and is reported
- **GIVEN** employee NV0050's overtime row on 2026-07-25, claimed by two plans with near-identical content
- **WHEN** the backfill runs
- **THEN** the row is linked to the earlier-approved of the two plans and the ambiguity is logged

#### Scenario: Row count is unchanged
- **GIVEN** 148 overtime attendance rows before the backfill
- **WHEN** the backfill completes
- **THEN** 148 overtime attendance rows still exist

#### Scenario: Backfill is safe to re-run
- **WHEN** the backfill runs a second time
- **THEN** already-linked rows keep their existing plan reference and no rows are duplicated or removed
