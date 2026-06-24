## Context

The Fault Records tab in the Cơ điện section currently runs entirely under `requireTechnicalAccess(MECHANICAL)` middleware. Three operational gaps follow from this:

1. Production line operators who actually witness defects cannot self-report — they must wait for a technical staff member to log on their behalf, which loses observation context and discourages reporting.
2. When creating a fault from a `FaultTemplate`, the form gives no signal that the same template has previously fired against the same `MachineSystemDetail`. Recurrence is the strongest signal for status escalation (Đang theo dõi → Tái phát) and for opening a maintenance plan, but today it is buried in a flat list.
3. The list view has no aggregate visibility — no answer to "which machines fail most?" or "which template+device combos recur?" without exporting and pivoting in Excel.

Existing infrastructure that constrains the design:
- `FaultRecord` already carries `faultTemplateId` and `machineSystemDetailId` (both indexed). These two columns together identify a recurrence pivot.
- `requireTechnicalAccess` is a department-scope middleware; the project already has `authenticate` for plain JWT validation.
- Frontend `FaultRecordList.tsx` derives `canWrite` from `user.role === 'admin' || isTechnical`. The component is shared between record CRUD and template CRUD views.
- TanStack Query hook pattern (e.g. `useMaintenancePlans.ts`) defines the conventions for query key factories and cache invalidation.
- ADMIN role bypasses ABAC at the middleware layer.

Stakeholders: production operators (new write users), technical/mechanical staff (existing CRUD owners), maintenance planners (consumers of recurrence + stats signals).

## Goals / Non-Goals

**Goals:**
- Production operators can create fault records without technical-team involvement, while edit/delete remains technical-only.
- Recurrence count for `(faultTemplateId, machineSystemDetailId)` is surfaced inline at creation time, with links to up to 5 most recent matching records.
- A single read-only stats endpoint returns totals, severity breakdown, status breakdown, top 5 machines by fault count, and top 5 recurring template+device combos.
- The list view exposes summary cards and two collapsible top-5 sections without introducing a separate stats tab.
- Zero schema migration. All new behaviour pivots on existing columns and indexes.

**Non-Goals:**
- No changes to `FaultTemplate` CRUD authorisation — templates remain technical-only.
- No new role, permission, or department code. Production access is granted by relaxing department scope on specific HTTP methods only.
- No automatic status escalation on recurrence — the warning is informational; status changes stay manual.
- No persistence of stats snapshots. The endpoint computes on demand.
- No separate stats page or tab in the UI.

## Decisions

### D1. Split middleware per HTTP method instead of introducing a new role

Routes use two stacks:
- `authenticate` only for `GET /api/fault-records` and `POST /api/fault-records` (and the new recurrence + stats endpoints).
- `authenticate + requireTechnicalAccess(MECHANICAL)` for `PUT` / `DELETE`.

Rationale: keeps the existing role and department model unchanged. ADMIN bypass still works because `requireTechnicalAccess` already short-circuits for ADMIN. No new RBAC concept enters the codebase. Alternatives considered:
- New role `PRODUCTION_FAULT_REPORTER`: rejected — adds permanent surface area for a single capability.
- A `requireFaultWriteAccess` middleware that allows multiple departments: rejected — same outcome but more code; per-method splitting is the standard pattern in this codebase.

### D2. Recurrence pivot on `(faultTemplateId, machineSystemDetailId)` using existing indexes

Service exposes `checkRecurrence(faultTemplateId, machineSystemDetailId)` which runs:
- `count` of `FaultRecord` matching both ids
- `findMany` limited to 5 ordered by `ngayPhatHien desc`, returning `id, maLoi, ngayPhatHien, trangThai, mucDo, nguoiPhatHien`

Both fields are already indexed (`@@index([faultTemplateId])`, `@@index([machineSystemDetailId])`). Both must be present for the check to fire — if the user picks a template but no detail (or vice versa), the frontend skips the call.

Rationale: zero migration, leverages existing indexes, deterministic. Alternatives:
- Adding a `recurrenceCount` materialised column on `FaultRecord`: rejected — needs migration, needs trigger or app-level recompute, no incremental win when the live query is already cheap on indexed columns.
- Recurrence by `tenLoi` text similarity: rejected — fragile, language-sensitive.

### D3. Single `/stats` endpoint with parallel `Promise.all` aggregations

`faultRecordService.getStats()` runs five queries in parallel:
1. `count` total
2. `groupBy(mucDo)` for severity buckets
3. `groupBy(trangThai)` for status buckets
4. `groupBy(machineSystemId)` ordered by count desc, take 5, with a follow-up `findMany` to hydrate machine names
5. `groupBy([faultTemplateId, machineSystemDetailId])` ordered by count desc, take 5, with hydration for template name + detail name

Returns one structured payload. The endpoint is read-only and goes through `authenticate` only (no department gate) — same surface as GET list.

Rationale: matches the project's service shape (single payload per endpoint), keeps the controller thin, parallel queries amortise round-trips. Alternative — five separate endpoints — was rejected for chattier frontend code and worse cache locality.

### D4. Summary cards + collapsibles inside the existing list view

UI changes are layered on `FaultRecordList.tsx`:
- Top: 4 summary cards (Tổng / Đang theo dõi / Đã xử lý / Tái phát) with severity stacked inside each card or below.
- Below cards: two collapsibles ("Máy hay lỗi nhất", "Lỗi hay tái phát"), default collapsed.
- The existing list and filters render below the collapsibles.

`canWrite` becomes:
- `canCreate = isAuthenticated` (any logged-in user)
- `canMutate = isAdmin || isTechnical` (gate for edit/delete buttons + template tab)
- Template tab visibility unchanged — still gated on `canMutate`.

Rationale: keeps users in flow (no tab-hopping for stats), uses the same component already loaded, scope-creeps the file by one summary block + two sections rather than adding a new route. Alternative — a dedicated `/fault-records/stats` page — was rejected as overkill for a 4-card + 2-list summary.

### D5. Recurrence warning surfaces only after both ids resolve

Hook `useFaultRecurrence({ faultTemplateId, machineSystemDetailId })` is enabled only when both ids are non-empty. The create modal:
- Renders nothing while disabled or loading.
- Renders a yellow inline banner when count > 0: "Lỗi này đã xảy ra N lần trước đó" with a list of up to 5 short links (mã lỗi + ngày).
- Renders a green confirmation when count === 0 ("Lỗi mới với thiết bị này").

Rationale: avoids flicker, no spurious warnings, deterministic UX. The banner is informational — it does not block submit and does not auto-set `trangThai`.

## Risks / Trade-offs

- **Authorisation widening on POST** → Mitigation: `authenticate` still mandatory; only the department-scope check is dropped from GET/POST. PUT/DELETE remain gated. Stats and recurrence endpoints are read-only and expose only what GET list already exposes.
- **Stats query cost on large datasets** → Mitigation: all `groupBy` queries hit indexed columns (`mucDo`, `trangThai`, `machineSystemId`, `faultTemplateId`, `machineSystemDetailId`). Top-5 caps prevent unbounded payload. If table grows past ~100k rows the endpoint is still cheap, but a future optimisation could add a materialised view — not part of this change.
- **Recurrence false-negatives when template/detail not chosen** → Accepted: the warning fires only when both ids are present. Free-text faults (no template) get no recurrence signal — that is consistent with decision D2.
- **Production users may now create low-quality records** → Accepted as intentional. The product trade-off is "more reporting, even if noisy" over "no reporting at all". Edit/delete stays technical-only so cleanup remains controlled.
- **Frontend `canWrite` semantic split** → Mitigation: replace the single `canWrite` boolean with `canCreate` and `canMutate` to make the intent explicit at every call site, and audit the component for every existing `canWrite` usage to map it to the correct successor.
