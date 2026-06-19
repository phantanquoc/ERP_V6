## Context

`OvertimePlan` is currently a flat row holding everything about a single overtime slot: which date, which start/end time, who participates (`nguoiThamGiaIds: String[]`), per-user acceptance state (`trangThaiTiepNhan: Json`), and per-user actual-time tracking (`gioThucTe: Json`). Approval materializes attendance records by combining the plan's date and times with each participant.

That shape forces one plan per date and prevents an admin from grouping a multi-day overtime initiative into one document. It also encodes participant identity inside the plan, so admins cannot legitimately edit or delete a plan they didn't create. Approved plans are locked even for admins, creating an awkward chain where the original creator must request corrections.

The work shift catalog (`WorkShift`) already exists and exposes `name`, `startTime` (HH:mm), `endTime` (HH:mm), `isActive`. The team uses these shifts elsewhere in attendance flows, so reusing them as an autofill source for overtime time ranges is consistent with the rest of the system.

The branch is shared with the in-flight `refactor-machine-as-physical-instance` change. The migration timestamp ordering matters: the new migration must follow `20260618000000_refactor_machine_as_physical_instance` so the chain replays correctly.

## Goals / Non-Goals

**Goals:**
- Let one `OvertimePlan` cover multiple distinct date/time/participant combinations through a child `OvertimePlanItem` table.
- Preserve full history during migration: every existing plan retains its date, times, participants, acceptance state, and actual-time map by becoming a single-item plan.
- Allow admins to edit or delete any plan regardless of owner or current `trangThai`, while keeping the existing rule for non-admins.
- Make the form workflow match how operators think: rows of (Date, Shift, People, Start, End, Total) with running totals and per-row management.
- Surface attached files with type-aware icons, friendly names, and image thumbnails so people can recognize files at a glance.
- Maintain the existing approval flow's contract: approving a plan still produces attendance rows for everyone involved, just sliced per item.

**Non-Goals:**
- Notification copy, RBAC roles, the `WorkShift` schema, or the attendance schema. None of these change.
- Cross-plan deduplication of participants or shifts. Each item is independent.
- Bulk import / CSV upload of items. The form is the only entry path in this change.
- A new file storage backend or signed URLs. The existing `/uploads/overtime-plans/` flow is reused; only the rendering changes.
- New AI tools. If `create_overtime_plan` already exists in `agent/registry.py`, its parameters are updated; otherwise nothing is added.

## Decisions

### Decision 1 — Child table over JSON column for items

`OvertimePlanItem` is a real Postgres table with a foreign key to `OvertimePlan` and cascade delete, not a JSON column on the parent.

Rationale: the project's house rule (CLAUDE.md, "Child tables, không dùng JSON columns") explicitly forbids JSON arrays for related items. A real table also lets us index `[ngayTangCa]` for date-range queries (e.g., "all overtime on 2026-07-01") and `[workShiftId]` for shift impact reports, neither of which would be efficient on JSON.

Alternative considered: keeping `nguoiThamGiaIds`/`trangThaiTiepNhan`/`gioThucTe` on the parent and only multiplying the date/time triplet. Rejected because per-day participant lists are part of the requirement — different days will have different rosters.

### Decision 2 — Snapshot `workShiftName` on the item

Each item stores both `workShiftId` (FK with `onDelete: SetNull`) and `workShiftName` (text snapshot at creation time).

Rationale: shift names get edited or shifts get archived. History (e.g., "this overtime slot was on Ca Đêm") must remain readable even if the shift row later becomes inactive or renamed. The `SetNull` deletion behavior also keeps the item alive when an admin deletes a shift.

Alternative considered: relying solely on `workShiftId` and joining at read time. Rejected — would lose the historical name on shift edit/delete.

### Decision 3 — Move `trangThaiTiepNhan` and `gioThucTe` to the item, keyed by the item's userIds

The acceptance map and actual-time map move from `OvertimePlan` to `OvertimePlanItem`. Their JSON shape stays the same (`{ [userId]: state }`).

Rationale: a person can be on Monday's slot but not Tuesday's, so per-plan acceptance is incorrect after the refactor. Per-item also matches the participant list scope. The `acceptPlan` and `updateActualTime` endpoints accept an additional `itemId` argument.

### Decision 4 — Admin override pattern in the service layer

`update(id, data, userId, isAdmin, files)` and `delete(id, userId, isAdmin)` accept a new boolean `isAdmin`. When `isAdmin` is true, both checks (ownership and `CHO_DUYET`-only) are bypassed. Otherwise the existing rules stand.

Rationale: this keeps the policy in the service (single source of truth), avoids creating a parallel admin-only endpoint, and matches the project's convention that "ADMIN bypass tất cả ABAC" lives in `req.user.role === 'ADMIN'` checks at the controller boundary. The controller maps `req.user?.role === 'ADMIN'` into the boolean.

Alternative considered: a separate `/api/overtime-plans/:id/admin-update` endpoint. Rejected — would split the same logic across two paths and invite drift.

### Decision 5 — Migration backfill = one item per existing plan

The migration creates `overtime_plan_items`, then for every existing `overtime_plans` row inserts a single child preserving `ngayTangCa`, `gioBatDau`, `gioKetThuc`, `nguoiThamGiaIds`, `trangThaiTiepNhan`, `gioThucTe`, `workShiftId = NULL`, `workShiftName = NULL`. Only after the backfill commits do we drop the six old columns from the parent.

Rationale: zero data loss, zero behavior change for existing rows. Dev seed already produces a small dataset (overtime plans aren't massive), so a single-statement `INSERT ... SELECT` is enough. We sequence column drops AFTER the insert in the same migration file so a partial rollback (failure mid-migration) leaves the source columns intact.

Alternative considered: a two-phase migration (backfill first, drop columns in a follow-up migration after the new code ships). Rejected — the next migration in the chain (or any rebase) would diverge from the codebase, and the dataset is small enough that the single-shot path is safe.

### Decision 6 — Approval still iterates items × users for attendance

`approvePlan` is rewritten so that on `DA_DUYET`, it loops `items × nguoiThamGia` and creates one `Attendance` row per `(employeeId, item.ngayTangCa)` with `checkInTime = item.gioBatDau`, `checkOutTime = item.gioKetThuc`, `isOvertime = true`. Existing dedup (skip if a row already exists for that triple) stays.

Rationale: keeps the contract that "approved plan ⇒ attendance materialized," but at the new granularity. No external system depends on the per-plan vs per-item distinction.

### Decision 7 — FormData JSON serialization for `items`

The frontend serializes `items` as `JSON.stringify(items)` and the controller does `JSON.parse(req.body.items)`. The rest of the FormData (files, top-level scalar fields) is untouched.

Rationale: multipart FormData can't carry typed arrays of objects natively. Parsing the JSON in the controller (before the service runs) keeps the service typed against the real `OvertimePlanItemInput[]` shape and matches how the project handles other multi-item form payloads.

Alternative considered: switching the endpoint to JSON and uploading files separately. Rejected — would force a two-step UX and orphan-file cleanup logic.

### Decision 8 — Selecting a shift autofills time but allows override

In the modal, choosing a `WorkShift` writes its `startTime`/`endTime` into the row's `gioBatDau`/`gioKetThuc`. The user can then edit those fields freely; the link to `workShiftId` is preserved unless they unselect the shift.

Rationale: the most common case is "this overtime falls on shift X's hours" but exceptions exist ("started 30 min late, ended 30 min early"). Autofill speeds the common case; freedom-after-autofill handles exceptions. The snapshot `workShiftName` keeps the audit trail readable regardless of override.

### Decision 9 — File preview is presentational only

The card derives icon, friendly name, and thumbnail purely from the file path string. Icons map by extension (FileImage for jpg/png/gif/webp, FileSpreadsheet for xlsx/xls/csv, FileCode for doc/docx, FileText fallback). The friendly name is `path.split('/').pop()` with a leading `\d+-` timestamp prefix stripped. For images, the thumbnail uses the same `getFileUrl(file)` URL as the link. Click opens in a new tab.

Rationale: no backend changes needed; the existing serving path is fine. Keeps the change reversible — the icon mapping is a single function, easy to extend or replace.

## Risks / Trade-offs

[Backfill loses participant/acceptance data if a plan has malformed JSON in `trangThaiTiepNhan` or `gioThucTe`] → Cast to `JSONB` during the `INSERT ... SELECT` and default to `'{}'::jsonb` when null. Existing rows already use `Json @default("{}")`, so the risk is limited to historical anomalies.

[Approval-time attendance fan-out grows: a 5-day plan with 10 people generates 50 attendance rows in a single transaction] → The skip-if-exists guard prevents duplication on retry. Wrap the loop in `prisma.$transaction` so a single failure rolls back the partial materialization. Existing volumes are well within Postgres's appetite.

[Admin can now silently "fix" history of approved plans, which can mask audit issues] → Out of scope for this change — covered by the role itself; if granular audit is needed later, it lands in a separate change. Document the new behavior in release notes.

[Migration timestamp collisions with the parallel `refactor-machine-as-physical-instance` change on the same branch] → Use `20260619xxxxxx` (today is 2026-06-19) so the new migration sorts strictly after the machine refactor's `20260618...`. Verify the chain on a fresh DB before merging.

[FormData `items` JSON could grow large enough to hit body-size limits] → Express body limit is already configured for the file uploads; the JSON portion is small relative to attachments. If we ever see a real ceiling, items can move to a JSON body in a follow-up.

[`acceptPlan` / `updateActualTime` endpoints break clients that haven't been updated] → No external clients exist (this is internal). The frontend ships the `itemId` change in the same branch as the backend change. Mobile and AI service do not call these endpoints.

[Image thumbnails for very large uploads block the list modal] → Browsers handle img sizing; we constrain thumbnails to 80×80 with `object-fit: cover`. The original full-resolution file is only fetched on click.

## Migration Plan

1. Generate Prisma migration `20260619xxxxxx_overtime_plan_multi_item` with `--create-only`.
2. Hand-edit the SQL so the order is: (a) create `overtime_plan_items` with FKs and indexes, (b) `INSERT INTO overtime_plan_items ... SELECT ... FROM overtime_plans` to backfill one item per plan, (c) drop the six columns from `overtime_plans`. Each step inside the same transaction.
3. Run `npx prisma migrate dev` in the dev DB.
4. Verify: `SELECT COUNT(*) FROM overtime_plan_items` equals the original `SELECT COUNT(*) FROM overtime_plans`, and a spot-check confirms `trangThaiTiepNhan` and `gioThucTe` survived.
5. Re-run dev seed. Confirm the create modal handles both old (single-item) plans and new (multi-item) plans seamlessly.

Rollback: restore the `common` schema from a `pg_dump` taken before the migration. The dataset is small and internal — full restore is acceptable.

## Open Questions

- None as of the current decisions — all four ambiguities (shift source, participant scope per row, footer formula, migration strategy) were resolved upstream and locked in proposal.md.
