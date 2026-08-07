## ADDED Requirements

### Requirement: Plan owns one or more items

The system SHALL model an `OvertimePlan` as a parent row with one or more child `OvertimePlanItem` rows. Each item SHALL hold its own `ngayTangCa` (date), `gioBatDau` (start time, HH:mm), `gioKetThuc` (end time, HH:mm), optional `workShiftId` plus snapshot `workShiftName`, `nguoiThamGiaIds: String[]`, optional `ghiChuItem`, `trangThaiTiepNhan: Json` (default `{}`), `gioThucTe: Json` (default `{}`), `createdAt`, `updatedAt`. The parent SHALL retain only cross-cutting fields: `noiDung`, `mucDoUuTien`, `ghiChu`, `files`, `trangThai`, ownership/audit. Deleting a plan SHALL cascade to its items.

#### Scenario: Plan with multiple distinct days
- **WHEN** a creator submits one plan with three items spanning Mon, Tue, Wed each with different participant lists and time ranges
- **THEN** the system stores one `OvertimePlan` row and three `OvertimePlanItem` rows linked to it

#### Scenario: Cascade delete
- **WHEN** an admin deletes the parent plan
- **THEN** every `OvertimePlanItem` belonging to that plan is removed in the same transaction

### Requirement: Item-level shift link with name snapshot

The system SHALL let an item link to a `WorkShift` via `workShiftId` with `onDelete: SetNull`, and SHALL persist `workShiftName` as a text snapshot at the moment the item is created or updated. When the linked shift is later renamed or deleted, the item's stored `workShiftName` SHALL remain unchanged.

#### Scenario: Snapshot on create
- **WHEN** an item is created referencing shift `Ca Đêm`
- **THEN** the item row stores `workShiftId` pointing to that shift and `workShiftName = "Ca Đêm"`

#### Scenario: Shift renamed after item exists
- **GIVEN** an existing item with `workShiftName = "Ca Đêm"`
- **WHEN** an admin renames the underlying `WorkShift` to `"Ca Đêm Mới"`
- **THEN** the item's `workShiftName` still reads `"Ca Đêm"`

#### Scenario: Shift deleted after item exists
- **GIVEN** an existing item with `workShiftId = shift_123`
- **WHEN** the underlying shift is deleted
- **THEN** the item's `workShiftId` becomes `NULL` while `workShiftName` retains the original value

### Requirement: Selecting a shift autofills item time but allows override

The create/edit form SHALL, when the user selects a `WorkShift` for an item row, set that row's `gioBatDau` and `gioKetThuc` to the shift's `startTime` and `endTime`. The user SHALL be allowed to edit those fields after selection without losing the `workShiftId` link.

#### Scenario: Autofill on selection
- **WHEN** the user picks shift `Ca Chiều` (16:00–22:00) on a row
- **THEN** that row's start becomes `16:00` and end becomes `22:00`

#### Scenario: Override after autofill
- **GIVEN** a row with shift `Ca Chiều` and times `16:00–22:00`
- **WHEN** the user changes end to `21:30`
- **THEN** the row keeps `workShiftId = ca_chieu` and end becomes `21:30`

### Requirement: Multi-row create/edit form with running totals

The create and edit modals SHALL render a table with columns Ngày, Ca làm việc, Nhân sự, Giờ bắt đầu, Giờ kết thúc, Tổng giờ, and a per-row delete control. The form SHALL provide a "Thêm dòng" action that appends a new row with defaults: today's date, no shift, empty participant list, start `17:00`, end `19:00`. The footer SHALL display two running totals: total slot hours (Σ per-row total hours) and total man-hours (Σ per-row total hours × per-row participant count). The form SHALL reject submission unless every row has a date, both times with `gioKetThuc > gioBatDau`, and at least one participant, AND there is at least one row.

#### Scenario: Add row with defaults
- **WHEN** the user clicks "Thêm dòng"
- **THEN** a new row appears with today's date, empty shift, empty participants, start `17:00`, end `19:00`

#### Scenario: Footer recomputes on edit
- **GIVEN** two rows: row 1 (2 hrs × 5 people = 10 man-hours), row 2 (3 hrs × 4 people = 12 man-hours)
- **WHEN** the user changes row 2 end time to add one more hour
- **THEN** footer shows total slot hours `2 + 4 = 6` and total man-hours `10 + 16 = 26`

#### Scenario: Submit blocked when row is incomplete
- **WHEN** the user tries to submit a plan whose first row has no participants
- **THEN** the form blocks submission and surfaces a validation error pointing at that row

#### Scenario: Submit blocked when end time is before start time
- **WHEN** any row has `gioKetThuc <= gioBatDau`
- **THEN** the form blocks submission and surfaces a validation error on that row

### Requirement: Item-level participant acceptance and actual-time tracking

The `acceptPlan` and `updateActualTime` endpoints SHALL accept an `itemId` parameter and SHALL operate on that specific item's `trangThaiTiepNhan` and `gioThucTe` JSON maps respectively. The maps SHALL remain keyed by `userId` with the existing per-user state shape.

#### Scenario: Per-item acceptance
- **GIVEN** a plan with two items, the user is a participant on both
- **WHEN** the user accepts only the first item
- **THEN** the first item's `trangThaiTiepNhan[userId]` reflects acceptance and the second item's map is unchanged

#### Scenario: Per-item actual time
- **WHEN** the user submits actual-time for the second item
- **THEN** only that item's `gioThucTe[userId]` updates

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

### Requirement: List view summarizes items, detail view enumerates them

The list modal SHALL render the "Ngày tăng ca" column as `1 ngày DD/MM` when `items.length === 1`, otherwise as `N ngày (DD/MM – DD/MM)` using the earliest and latest `ngayTangCa` of the plan's items. The detail modal SHALL render an items sub-table with columns Ngày, Ca, Nhân sự, Giờ bắt đầu, Giờ kết thúc, Tổng giờ, one row per item, in `ngayTangCa` ascending order.

#### Scenario: Single-item plan
- **GIVEN** a plan with one item dated `2026-07-01`
- **WHEN** the list renders the row
- **THEN** the column shows `1 ngày 01/07`

#### Scenario: Multi-item plan
- **GIVEN** a plan with three items dated `2026-07-01`, `2026-07-03`, `2026-07-05`
- **WHEN** the list renders the row
- **THEN** the column shows `3 ngày (01/07 – 05/07)`

#### Scenario: Detail enumeration
- **WHEN** the user opens a multi-item plan's detail
- **THEN** the modal displays one sub-table row per item with that item's date, shift name, participant list, time range, and total hours

### Requirement: Admin actions surface on every plan row

The list modal SHALL render a Pencil (edit) and a Trash (delete) action in the row's action column for users whose role is `ADMIN`, regardless of the plan's owner or `trangThai`. The Trash action SHALL show a confirmation dialog before invoking the delete. The Pencil action SHALL open the create/edit modal preloaded with the plan's items, files, and metadata. Non-admin users SHALL NOT see these two actions on plans they did not create.

#### Scenario: Admin sees actions on every row
- **WHEN** an admin opens the list
- **THEN** every row exposes Pencil and Trash icons

#### Scenario: Admin deletes after confirm
- **GIVEN** an admin clicks Trash on a `DA_DUYET` plan
- **WHEN** the admin confirms in the dialog
- **THEN** the plan and all its items are deleted and the list refreshes

#### Scenario: Non-admin restricted
- **WHEN** a non-admin user opens the list
- **THEN** Pencil and Trash do not appear on plans they did not create

### Requirement: File preview card with type-aware icon, friendly name, and image thumbnail

The detail modal SHALL render every attached file as a card containing an icon chosen by extension (FileImage for `jpg|jpeg|png|gif|webp`, FileSpreadsheet for `xlsx|xls|csv`, FileCode for `doc|docx`, FileText for any other type), a friendly file name (basename of the path with a leading `\d+-` timestamp prefix stripped), and, when the extension matches an image type, an 80×80 thumbnail rendered before the icon. The card SHALL link to the file URL with `target="_blank"`.

#### Scenario: PDF file
- **GIVEN** an attachment path `/uploads/overtime-plans/1718712345-policy.pdf`
- **WHEN** the detail card renders
- **THEN** it shows a FileText icon, the name `policy.pdf`, no thumbnail, and links to the URL in a new tab

#### Scenario: Image file thumbnail
- **GIVEN** an attachment path `/uploads/overtime-plans/1718712999-rota.png`
- **WHEN** the detail card renders
- **THEN** it shows the FileImage icon, the name `rota.png`, an 80×80 thumbnail of the image, and links to the URL in a new tab

#### Scenario: Spreadsheet file
- **GIVEN** an attachment path `/uploads/overtime-plans/9999-budget.xlsx`
- **WHEN** the detail card renders
- **THEN** it shows the FileSpreadsheet icon, the name `budget.xlsx`, no thumbnail

### Requirement: Migration backfills one item per existing plan

The Prisma migration SHALL, in a single transaction: (1) create `overtime_plan_items` with the new schema, FKs, and indexes; (2) for every row in `overtime_plans`, insert one `overtime_plan_items` row preserving `ngayTangCa`, `gioBatDau`, `gioKetThuc`, `nguoiThamGiaIds`, `trangThaiTiepNhan`, `gioThucTe`, with `workShiftId = NULL` and `workShiftName = NULL`; (3) drop the six migrated columns from `overtime_plans`. The migration timestamp SHALL sort strictly after `20260618000000_refactor_machine_as_physical_instance`.

#### Scenario: Backfill row count
- **GIVEN** the dev DB has 17 `overtime_plans` rows before migration
- **WHEN** the migration runs
- **THEN** the post-migration `overtime_plan_items` row count is 17

#### Scenario: JSON maps preserved
- **GIVEN** a plan whose `trangThaiTiepNhan = { "user_1": "DONG_Y" }` and `gioThucTe = { "user_1": { "checkIn": "17:05" } }`
- **WHEN** the migration runs
- **THEN** the new item row reflects the same `trangThaiTiepNhan` and `gioThucTe` content

#### Scenario: Source columns dropped after backfill
- **WHEN** the migration completes successfully
- **THEN** `overtime_plans` no longer has columns `ngayTangCa`, `gioBatDau`, `gioKetThuc`, `nguoiThamGiaIds`, `trangThaiTiepNhan`, `gioThucTe`

### Requirement: FormData JSON serialization for items

The frontend SHALL submit the `items` array as a single FormData field encoded with `JSON.stringify`. The backend controller SHALL `JSON.parse(req.body.items)` before passing the result to the service. Top-level scalar fields and uploaded `files` SHALL continue to be serialized as plain FormData fields.

#### Scenario: Round-trip
- **WHEN** the form submits three items along with two files
- **THEN** the controller parses `req.body.items` into a 3-element array and forwards it to the service while `req.files` carries both files
