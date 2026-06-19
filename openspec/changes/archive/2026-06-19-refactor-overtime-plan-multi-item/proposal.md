## Why

Today an `OvertimePlan` represents one overtime slot on a single date with a single set of participants and a single time range. Operators routinely need to plan overtime that spans multiple days and shifts in one approval flow (e.g., "Mon evening shift A — 5 people; Tue night shift B — 3 people"), and the current shape forces them to file one plan per day. This balloons admin overhead, fragments approval, and makes total-hours reporting impossible. Editing or deleting a teammate's plan is also impossible for admins, so corrections require asking the original creator. Finally, attached files render as raw paths with no preview affordances, hurting usability.

## What Changes

- **BREAKING** Each `OvertimePlan` now owns one or more `OvertimePlanItem` rows. Per-day fields move out of the parent into the child: `ngayTangCa`, `gioBatDau`, `gioKetThuc`, `nguoiThamGiaIds`, `trangThaiTiepNhan`, `gioThucTe`. Parent keeps cross-cutting fields only (`noiDung`, `mucDoUuTien`, `ghiChu`, `files`, `trangThai`, ownership/audit).
- **BREAKING** Items can reference a `WorkShift` via `workShiftId` and snapshot `workShiftName` so subsequent shift renames don't rewrite history. Item-level participant lists, optional `ghiChuItem`, per-item acceptance, and per-item actual-time tracking move with the date/time fields.
- **BREAKING** `acceptPlan` and `updateActualTime` endpoints now require an `itemId` so participants accept/log time per item, not per plan.
- Admins (`role === 'ADMIN'`) can now edit and delete any overtime plan regardless of owner or current `trangThai`. Non-admins keep the existing rule (own plans only, only while `CHO_DUYET`).
- `approvePlan` continues to materialize attendance records on `DA_DUYET`, but now iterates items × users to create one `Attendance` row per `(employeeId, item.ngayTangCa)` with `checkInTime`/`checkOutTime` from that item.
- Create/edit modal becomes a multi-row table (Date | Work Shift | Personnel | Start | End | Total hours | row delete). Selecting a shift autofills start/end while still allowing override. Footer shows running totals: total slot hours and total man-hours (slot hours × participant count).
- List modal shows "N ngày (DD/MM – DD/MM)" or "1 ngày DD/MM" depending on item count, exposes Pencil/Trash actions for admins on every status, renders the detail view as a per-item table, and replaces the raw file link with a card that picks an icon by extension, displays a friendly file name (timestamp prefix stripped), and shows a thumbnail when the file is an image.
- AI agent registry: if `create_overtime_plan` exists, its parameters change to accept `items: OvertimePlanItemInput[]` instead of flat date/time/participant fields. Tool count in `tests/test_registry.py` is adjusted only if the net delta is non-zero.

## Capabilities

### New Capabilities
- `overtime-plan-multi-item`: Multi-day overtime planning where one plan owns N `OvertimePlanItem` rows, each with its own date, work-shift link + snapshot, time range, participant list, acceptance state, and actual-time tracking. Includes the create/edit table UX, list/detail rendering, admin edit/delete on any status, file preview affordances, and the per-item attendance materialization on approval.

### Modified Capabilities
<!-- No existing spec under openspec/specs/ covers OvertimePlan today; this is a brand-new capability. -->

## Impact

- **Database**: `backend/prisma/schema/common.prisma` adds `OvertimePlanItem`, drops six fields from `OvertimePlan`. New migration `20260619xxxxxx_overtime_plan_multi_item` creates the table, backfills one item per existing plan from the dropped fields (preserving `trangThaiTiepNhan` and `gioThucTe` JSON maps), then drops the old columns. Migration timestamp must be after `20260618000000_refactor_machine_as_physical_instance`.
- **Backend**: `types/overtimePlan.types.ts`, `services/overtimePlanService.ts` (`create`, `update`, `delete`, `approvePlan`, `acceptPlan`, `updateActualTime`, `populateWithUsers`, `batchPopulateWithUsers`), `controllers/overtimePlanController.ts` (FormData JSON parsing for `items`, `isAdmin` propagation), `routes/overtimePlanRoutes.ts` (no path changes).
- **Frontend**: New `hooks/useWorkShifts.ts`. Updated `services/overtimePlanService.ts` (types + `buildFormData`), `hooks/useOvertimePlans.ts` (add `useUpdateOvertimePlan`), full rewrite of `components/CreateOvertimePlanModal.tsx`, list/detail/file-preview updates in `components/OvertimePlanListModal.tsx`.
- **AI service**: `agent/registry.py` (only if `create_overtime_plan` exists), `tests/test_registry.py` (count only if delta).
- **Tests**: `backend/src/__tests__/payrollKpiDeduction.test.ts` if its fixtures touch overtime attendance shape.
- **Out of scope**: Notification copy/template, RBAC role hierarchy, `WorkShift` schema, attendance schema, files endpoint, machine refactor work in flight on the same branch.
