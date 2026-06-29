## Why

Employees create dozens of different records each day — quotation requests, supply requests, leave requests, daily reports, tasks, plans, warehouse slips, maintenance records, etc. — but there is no single place to review their own creation history. To check what they submitted last week or look up an old report, users must visit each management page separately, scroll through lists that mix everyone's data, and manually filter. This is slow, error-prone, and discourages employees from auditing their own work.

A single personal-history timeline aggregating every entity an employee created or is involved in solves this in one screen and lets managers (DEPARTMENT_HEAD) review the activity of their subordinates without granting them read-all access.

## What Changes

- Add `createdById` (nullable, indexed) to **13 models** that currently only store the creator as a free-text name or have no creator field at all: `FaultRecord`, `MaintenancePlan`, `MaintenanceRecord`, `AcceptanceHandover`, `MaterialEvaluation`, `FinishedProduct`, `QualityEvaluation`, `ProductionReport`, `InternalInspection`, `CustomerFeedback`, `Invoice`, `RepairRequest`, `TaxReport`.
- Migration `add-created-by-tracking` plus a best-effort backfill script that maps existing free-text names to users by `User.fullName` while preserving the original text fields.
- Update the create-paths of the 13 services above so future records always set `createdById = req.user.id`.
- New backend service `myHistoryService.getMyHistory(params)` runs 25 Prisma `findMany` queries in parallel (`Promise.all`), maps each row to a unified shape `{ entityType, entityId, group, title, code?, status?, createdAt, role: 'creator'|'related', metadata, routeHint }`, then merges → filters → sorts by `createdAt desc` → paginates server-side, and returns `groupCounts` per category.
- Two endpoints: `GET /api/me/history` (self, authenticate only) and `GET /api/users/:userId/history` (others, gated by `checkAccess` — ADMIN bypass, DEPARTMENT_HEAD only same-department, anyone else 403).
- New frontend page `/my-history` with a timeline feed (single feed grouped by day, no tabs) and a filter bar: date-range quick picker (30/90/365/all/custom), group checkboxes (Yêu cầu/Nhiệm vụ/Kế hoạch/Báo cáo/Phiếu), status select, role toggle (Tôi tạo / Liên quan tôi / cả hai), search text.
- Click a row → read-only detail modal with a "Mở ở trang gốc" deep-link button pointing to the source management page.
- Add a "Lịch sử của tôi" quick action on `EmployeeDashboard`.

## Capabilities

### New Capabilities
- `my-history`: Unified personal-history timeline aggregating 25 entity types per user, with role distinction (creator vs related), filtering, search, server-side pagination, and ABAC permissions for managers viewing subordinates.
- `created-by-tracking`: Stable `createdById` field on the 13 models that previously had no machine-readable creator reference, plus the migration and best-effort backfill that preserves existing text fields.

### Modified Capabilities
<!-- None. No existing spec's REQUIREMENTS are changing — the 13 service create-paths are extended to populate the new field, but their public behavior contracts are unaffected. -->

## Impact

- **Database**: Adds one nullable column + one index to 13 tables. Safe on prod (zero data loss). Backfill is run after migration with `--dry-run` first; unmatched/ambiguous rows are logged and left `NULL`.
- **Backend**:
  - New files: `services/myHistoryService.ts`, `controllers/myHistoryController.ts`, `routes/myHistoryRoutes.ts`, `prisma/scripts/backfillCreatedById.ts`.
  - Modified files: 13 services (set `createdById` on create), `routes/index.ts` (register routes), `prisma/schema/*.prisma` (13 model definitions).
  - New endpoints: `GET /api/me/history`, `GET /api/users/:userId/history`.
- **Frontend**:
  - New files: `pages/MyHistory.tsx`, `services/myHistoryService.ts`, `hooks/useMyHistory.ts`, `components/MyHistoryFilters.tsx`, `components/MyHistoryTimeline.tsx`, `components/MyHistoryItem.tsx`, `components/MyHistoryDetailModal.tsx`.
  - Modified files: `pages/EmployeeDashboard.tsx` (add quick action), router config (register `/my-history`).
- **Performance**: 25 parallel Prisma queries per request, all bounded by date-range + indexed `createdById`/`employeeId`/array-contains filters. Default range is 90 days. No N+1; each entity is fetched once with the minimum fields needed for the unified row shape.
- **Out of scope**: no edits to existing management pages, no PDF/Excel export, no UPDATE/DELETE history (creates only), no realtime push (TanStack Query pull), no backfill for `RepairRequest`/`TaxReport` (no source data exists).
