## Context

ERP An Binh Foods stores 25 different entity types that an employee can create or be involved in: requests (quotation/supply/purchase/leave/repair), tickets (warehouse receipt/issue, quotations, invoices, acceptance handovers, maintenance records), tasks, work plans, projects, daily reports, fault records, evaluations (material/finished-product/quality/production/internal-inspection/customer-feedback), private feedback, tax reports.

Today they are scattered across separate management pages, each of which mixes records from all users. There is no per-user activity feed. Some entities (Group B: 11 models) record the creator only as a free-text Vietnamese name in fields like `nguoiPhatHien`, `nguoiLap`, `nguoiThucHien`, `nguoiBanGiao`, `nhanVienLap`, `inspectedBy`, `nguoiTiepNhan` — useful for display but not for querying. Two more (Group C: `RepairRequest`, `TaxReport`) have no creator reference at all. The remaining 12 (Group A) already have queryable `employeeId`, `nguoiTaoId`, `nguoiGiaoId`, `userId`, or `nguoiNhanIds[]` fields.

Stakeholders:
- **Employees** want one screen to review what they created and what they were assigned.
- **DEPARTMENT_HEAD** wants to inspect a subordinate's activity without granting them blanket read access.
- **ADMIN** needs the same view across any user for audit.

Constraints we must respect (from `CLAUDE.md`/`AGENTS.md`):
- Multi-schema Prisma (`auth`/`business`/`common`); all models must have `@@schema(...)`.
- CUID IDs everywhere except `RepairRequest` which is already `Int @id @default(autoincrement())` — we keep that PK.
- 3-middleware auth chain (`authenticate` → `authorize` → `checkAccess`), ADMIN bypasses ABAC.
- Controllers MUST NOT call Prisma directly; route → controller → service → Prisma.
- API response shape `{ success, message?, data?, pagination? }`.
- Path aliases `@services/*`, `@controllers/*`, `@routes/*`, `@utils/*`.
- Frontend hooks own all `apiClient` calls; components consume hooks only. Use TanStack Query key factory `{ all, lists, list(params), detail(id) }`.
- User-facing strings Vietnamese, code/identifiers English.
- Notification sends wrapped in try/catch — never bubble.

## Goals / Non-Goals

**Goals:**
- One backend service that returns a unified, paginated, sorted history feed for any user.
- One self endpoint (`/api/me/history`) and one others endpoint (`/api/users/:userId/history`) governed by the existing RBAC+ABAC chain.
- Migration that adds `createdById` to 13 models without losing the existing text fields and without breaking running services.
- Best-effort backfill that preserves data fidelity: ambiguous matches are logged and left `NULL`, never overwritten with a guess.
- One Vietnamese-localised timeline page with role badges, day separators, group counts, group/status/role/search/date-range filters, click-through detail modal, and "Mở ở trang gốc" deep-links to existing management pages.
- Future creates for the 13 models always populate `createdById = req.user.id`.

**Non-Goals:**
- Editing existing management pages beyond linking into them.
- Export to PDF/Excel (out of scope for v1).
- Tracking UPDATE/DELETE history; only "who created."
- Real-time WebSocket push; TanStack Query polling/refetch is enough.
- Backfilling `RepairRequest`/`TaxReport`: no source data exists.
- Cross-tenant access (system is single-tenant).
- Replacing per-resource list endpoints with the unified history endpoint.

## Decisions

### Decision 1: Single backend endpoint with 25 parallel Prisma queries (not FE aggregation)

**Choice**: `myHistoryService.getMyHistory()` runs all 25 `findMany` calls inside one `Promise.all`, merges in memory, sorts by `createdAt desc`, paginates, returns.

**Alternatives considered**:
- *FE aggregates from existing per-resource endpoints*: rejected. None of the existing services accept a `createdById`/`employeeId` filter on a per-user basis, and even if added, that's 25 round-trips × N pages and brittle merging in the browser.
- *Materialised audit table populated by triggers/notifications*: heaviest option. Would need backfill and ongoing write-amplification. Defer until v2 if read volume demands it.

**Rationale**: 25 parallel SELECTs with indexed WHERE clauses and a date-range bound (`createdAt >= dateFrom`) are well within Postgres' capacity at our scale (each model is small-to-medium). Server-side sort + paginate keeps the response payload bounded. One round-trip from the client.

### Decision 2: Unified row shape returned by the service

Every Prisma result is mapped to:
```ts
type HistoryItem = {
  entityType: string;       // 'quotation-request', 'task', 'work-plan', ...
  entityId: string;          // CUID, or stringified Int for RepairRequest
  group: 'Yêu cầu' | 'Nhiệm vụ' | 'Kế hoạch' | 'Báo cáo' | 'Phiếu';
  title: string;             // human-readable line, e.g. "Đề nghị báo giá NCC X"
  code?: string | null;      // optional code (e.g., quotation code), shown as a subline
  status?: string | null;    // raw status enum; FE pretty-prints
  createdAt: Date;
  role: 'creator' | 'related';
  metadata?: Record<string, unknown>; // extra fields for the modal
  routeHint: string;         // e.g., '/quotations/123' for deep-link
};
```

**Rationale**: lets FE render a heterogeneous timeline without 25 conditional branches. `routeHint` is computed on the server next to the data so the rule stays close to the entity definition.

### Decision 3: Roles — creator vs related

For each entity we declare in code which user-id columns count as "creator" and which count as "related". Examples:
- `Task`: `nguoiGiaoId == myEmployeeId` → creator; `myEmployeeId in nguoiNhanIds[]` → related.
- `WorkPlan`: `nguoiTaoId == myEmployeeId` → creator; `myEmployeeId in nguoiThucHienIds[]` → related.
- `AcceptanceHandover`: `createdById == myUserId` (post-migration) → creator; `nguoiNhanId == myEmployeeId` → related.
- Group A entities with only `employeeId`: always creator.
- Group B/C entities post-migration: `createdById == myUserId` → creator; no "related" relationship.

The same physical row may surface as both creator and related (rare — e.g., user assigns a task to themselves). In that case we emit it once with `role: 'creator'` (creator wins).

### Decision 4: Permission model

`GET /api/me/history` → only `authenticate`. Always uses `req.user.id`.

`GET /api/users/:userId/history` → `authenticate` + `checkAccess({ allowedRoles: ['DEPARTMENT_HEAD', 'ADMIN'], checkDepartment: true })`. ADMIN bypasses ABAC by existing middleware behavior. DEPARTMENT_HEAD passes only when the target user's employee record sits in the same `departmentId` as the caller's. EMPLOYEE and TEAM_LEAD get 403.

Rationale: matches the existing rule already used by other "view subordinate" endpoints (e.g., `attendance`). No new permission concept is invented.

### Decision 5: Filters — server vs client

**Server-side filters** (applied in the WHERE clause of each Prisma call, before merging):
- `dateFrom`, `dateTo`: bounds every `findMany` on `createdAt`.
- `types[]` (entityType list): if specified, skip the queries for entities not in the list — this is the biggest performance lever.

**Post-merge filters** (applied in memory after the 25 queries return):
- `statuses[]`: each entity has a different status enum, so we filter by the mapped `status` string after normalisation.
- `roleFilter`: `'created' | 'related' | 'both'` (default `'both'`).
- `search`: case-insensitive substring match on `title` and `code`.

Pagination is also post-merge: slice the sorted array by `(page-1)*limit` to `page*limit`. `total` is the length of the filtered array; `totalPages = ceil(total/limit)`. `groupCounts` is the count per group in the filtered (but pre-paginated) result.

**Rationale**: status enums are not unified across models (we'd have to issue 25 different WHEREs for one logical "approved" filter), and search is over Vietnamese text fields with varying column names. Doing both in memory after the date-bounded queries keeps the SQL simple. Date + entity-type are the two filters that actually cut the working set, and they're at the SQL layer.

### Decision 6: Default date range = 90 days, `limit` = 20, max `limit` = 100

A default 90-day window covers most "what did I do recently?" use cases and bounds query cost. `limit=20` matches existing list pages.

### Decision 7: Migration is additive-only; backfill is best-effort + dry-run-first

Step 1 — `prisma migrate dev --name add-created-by-tracking` adds nullable `createdById String?` + `@@index([createdById])` to 13 models. Zero risk: nullable column, no constraint, no default value rewrite.

Step 2 — `npx ts-node backend/prisma/scripts/backfillCreatedById.ts --dry-run` builds a `Map<fullName, userId>` from the `User` table, then for each Group-B model loads rows where the text field is non-empty AND `createdById IS NULL`, looks up the name, and reports the proposed write. Anything that isn't an exact unique match is logged with the row id + reason ("ambiguous: 2 users named 'Nguyễn Văn A'") and skipped.

Step 3 — re-run without `--dry-run` to commit the matched updates.

We never modify the existing text fields. They remain the source of truth for display where users can have name collisions; `createdById` is the new queryable handle.

### Decision 8: Service create-paths set `createdById`

The 13 services (`faultRecordService`, `maintenancePlanService`, `maintenanceRecordService`, `materialEvaluationService`, `finishedProductService`, `qualityEvaluationService`, `productionReportService`, `internalInspectionService`, `customerFeedbackService`, `invoiceService`, `acceptanceHandoverService`, `repairRequestService`, `taxReportService`) gain a `userId` parameter on their `create` signatures. Controllers pass `req.user.id`. Existing text fields remain populated by whatever the form sends — we are not unifying display names with users in this change.

### Decision 9: Frontend route, layout, deep-link map

- New route `/my-history` (lazy-loaded) registered in the existing router config.
- New quick action card on `EmployeeDashboard.tsx` ("Lịch sử của tôi") linking to `/my-history`.
- Page layout: filter bar at top (sticky), timeline below grouped by day (`DD/MM/YYYY` header rows), pagination at bottom.
- A central `entityTypeToRoute` map on the frontend converts `routeHint` (the canonical path the backend emits) into the actual app route for the modal's "Mở ở trang gốc" button. Backend already emits the canonical path, so the map is a passthrough except where the FE route differs.

### Decision 10: TanStack Query key factory

```ts
export const myHistoryKeys = {
  all: ['my-history'] as const,
  lists: () => [...myHistoryKeys.all, 'list'] as const,
  list: (params: MyHistoryQuery) => [...myHistoryKeys.lists(), params] as const,
};
```
No mutations from this page, so no `invalidateQueries` calls inside the feature. Other features that create entities may invalidate `myHistoryKeys.lists()` if/when they care, but that's not required for v1.

## Risks / Trade-offs

- **25 parallel Prisma queries per request** → If volume grows, this could become a hot path. Mitigation: date-range default of 90 days + indexed columns + `types[]` filter that lets the FE narrow to the groups it actually wants. If load demands it later, switch to a materialised view or a single UNION ALL.
- **Group B backfill ambiguity** → Two users with the same `fullName` produces a "no write" result. Mitigation: dry-run report makes ambiguity visible before commit; ops can manually disambiguate the highest-traffic rows; the system continues to display the original text field unchanged.
- **Existing rows with `createdById = NULL`** → They will NOT appear in any history (since no user owns them). Mitigation: this is intended — we don't fabricate ownership. Backfill covers the easy cases; the rest remain in the management pages where they always were.
- **`RepairRequest` PK is `Int`** → `entityId` in the unified shape is `string`; we stringify on the server. FE deep-link uses the stringified value. Mitigation: documented in the shape's comment.
- **Vietnamese full-name collisions** → Same as above; handled by best-effort + log.
- **Tasks/WorkPlans use `String[]` for assignees** → `where: { nguoiNhanIds: { has: myEmployeeId } }` requires Postgres array contains. Already used elsewhere in the codebase; no new dependency.
- **`Promise.all` rejects on first failure** → One broken query would 500 the whole feed. Mitigation: wrap each branch in `.catch(err => { log; return []; })` so a single-entity failure degrades gracefully to "empty for that type" rather than blanking the page.

## Migration Plan

1. Land Prisma schema diff + `add-created-by-tracking` migration in a normal release. Reversible by `DROP COLUMN createdById` on the 13 tables (no data loss for pre-existing rows because the column was nullable and not yet read).
2. Deploy backend with services that **write** `createdById` on create but the new endpoints are not yet exposed. The unified service is dead code at this point.
3. Run `backfillCreatedById.ts --dry-run` against prod replica. Review the log.
4. Run the script without `--dry-run` against prod. Output the final mismatch count.
5. Deploy the frontend route `/my-history`. Endpoints become reachable.
6. **Rollback**: revert the frontend release (hides the page). Backend route stays — it's already authenticated and ABAC-gated, so leaving it active is safe even if no UI calls it. If the migration itself must roll back, drop the column on the 13 tables; the service-side `createdById` writes silently no-op once the column is gone (Prisma would error — so any rollback must redeploy the prior backend image first).

## Open Questions

- None blocking. Items intentionally deferred:
  - PDF/Excel export — v2.
  - "Liên quan tôi" extension for entities where a current text field could plausibly represent a non-creator (e.g., `nguoiNhanId` on `AcceptanceHandover`) is included; further "related" semantics for Group-B entities are not in this change because no machine-readable receiver field exists.
