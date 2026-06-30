## Context

The ERP_V6 notification subsystem already covers:
- Persistence (`backend/prisma/schema.prisma` — `Notification` model in `business` schema).
- Event dispatch (`backend/src/services/notificationRegistry.ts` + `notificationService.notify`).
- Fan-out: WebSocket (`wsManager.pushNotification`) + Web Push (VAPID).
- Read paths: `GET /api/notifications` (cursor + offset modes), `GET /api/notifications/unread`, `GET /api/notifications/unread/count`, `GET /api/notifications/unread/count-by-type`.
- Mutations: `PATCH /:id/read`, `PATCH /read-all`, `DELETE /:id`.

Two consumer UIs exist: `NotificationBell` (header dropdown) and `AllNotificationsModal` (fullscreen modal). Neither has a permanent URL, filter UI, or stats panel. The `/my-history` page (recently shipped) established a rail-timeline UX with day grouping, multi-select chips, debounced search, stats card, active filter chips, and a mobile bottom-sheet drawer. The current change applies that same UX to notifications and extends the read endpoints with filter + stats modes.

Stakeholders: end users (all employees), admins (who already receive copies of admin-notification events).

Constraints (from `AGENTS.md` / `CLAUDE.md`):
- API envelope `{ success, data, message?, pagination? }`.
- Vietnamese user-facing strings, English code/comments.
- Service → controller → route, no Prisma calls from controller.
- No new LLM provider, no animation library, no schema changes for this work.

## Goals / Non-Goals

**Goals:**
- A permanent URL `/my-notifications` that lists the authenticated employee's notifications with filter, search, pagination, stats, and detail-modal deep-link to the source entity.
- Backward-compatible extension of `GET /api/notifications` so existing callers (NotificationBell with `limit=10`, AllNotificationsModal with `cursor=...&limit=20`) keep working unchanged.
- New `GET /api/notifications/stats` endpoint that powers the summary card and group-chip counts.
- Sidebar entry with live unread badge (reuse existing `useUnreadCount`).
- Accessibility parity with `/my-history` (aria-pressed chips, focus trap modal, ESC close).

**Non-Goals:**
- Modifying the existing notification creation pipeline (registry, event handlers, push fan-out).
- Changing `NotificationBell`, `AllNotificationsModal`, or any other existing consumer of `GET /api/notifications`.
- Schema changes to the `Notification` model.
- Real-time auto-refresh on new pushes (page relies on TanStack staleTime; manual refresh button is sufficient).
- Export/print/PDF.
- A new `/api/notifications/my` path. The extension is on `/api/notifications` itself.

## Decisions

### 1. Extend `GET /api/notifications` with a filter mode rather than introduce a new path
- **Why**: Avoid path duplication; the resource (notifications belonging to the authenticated employee) is the same. Adding parallel `/my` endpoints fragments the surface and increases cache invalidation work.
- **Activation rule**: Filter mode activates when the request contains any of `types`, `isRead`, `dateFrom`, `dateTo`, `search`, `page`, or `sort`. Otherwise:
  - `cursor` present (with/without `limit`) → cursor mode (existing `AllNotificationsModal`).
  - Otherwise (only `limit` and/or `since` or no params) → legacy mode (existing `NotificationBell`).
- **Response shapes**:
  - Filter mode: `{ success: true, data: { items, total, page, totalPages } }`.
  - Cursor mode: `{ success, data: items[], nextCursor, hasMore }` (unchanged).
  - Legacy mode: `{ success, data: items[] }` (unchanged).
- **Alternative considered**: New `/api/notifications/my` path. Rejected because existing endpoints already scope to the authenticated employee, and routing duplication would split caches and audit paths.

### 2. Separate `/stats` endpoint instead of bundling stats into the list response
- **Why**: Stats updates need `byType` and `today` counts that ignore `page`/`limit`/`isRead`/`search` filters but respect `types`/date range. Bundling forces server work even when the client only paginates; separating allows independent TanStack cache keys with different `staleTime`s (30 s list, 60 s stats).
- **Route order**: `GET /stats` must be registered BEFORE `/:notificationId` dynamic routes (same hazard already addressed by `/read-all` and `/push/unsubscribe`).
- **Alternative considered**: Inline stats in list response. Rejected — stats card must remain stable across pagination, and the cost of an extra round-trip is offset by independent caching.

### 3. Group 30+ NotificationType values into 7 display clusters
- **Why**: A flat list of 30 chips is overwhelming and contains many sub-statuses of the same logical concern (e.g., 5 evaluation sub-types). Grouping reduces visual clutter, mirrors mental model.
- **Mapping** (mirrored in `myNotificationsUtils.ts` as `NOTIFICATION_TYPE_GROUPS`):
  - `evaluation`: EVALUATION, EVALUATION_SUPERVISOR1, EVALUATION_SUPERVISOR1_COMPLETED, EVALUATION_SUPERVISOR2, EVALUATION_COMPLETED — label "Đánh giá"
  - `task`: TASK, TASK_ADMIN, WORK_PLAN — label "Nhiệm vụ"
  - `leaveOvertime`: LEAVE_REQUEST, LEAVE_REQUEST_RESPONSE, OVERTIME_PLAN, OVERTIME_PLAN_APPROVAL — label "Nghỉ phép & Tăng ca"
  - `supplyPurchase`: SUPPLY_REQUEST, SUPPLY_REQUEST_PROCESSING, SUPPLY_REQUEST_APPROVED, SUPPLY_REQUEST_FULFILLED, PURCHASE_REQUEST — label "Vật tư & Mua hàng"
  - `report`: DAILY_WORK_REPORT, PRIVATE_FEEDBACK, PRODUCTION_REPORT, FAULT_RECORD — label "Báo cáo"
  - `orderWarehouse`: ORDER, WAREHOUSE, INVOICE, DEBT, PRICING — label "Đơn hàng & Kho"
  - `other`: PAYROLL, ACCEPTANCE_HANDOVER, PASSWORD_RESET, REPAIR_REQUEST, PROJECT_APPROVAL — label "Khác"
- **Selection semantics**: Toggling a group chip toggles every type in that group. The server still receives the flat `types[]` list (the UI expands group → types before serializing). Count badges on chips sum `stats.byType` across the group.
- **Alternative considered**: Flat chip list with collapsible "more". Rejected — collapse hides the most common types and adds extra interaction. Grouping is the same pattern `/my-history` uses successfully.

### 4. URL state sync but hide defaults
- **Why**: A shareable link should encode user intent, not noise. Showing `page=1&sort=newest&isRead=all` clutters the bar.
- **Rule**: Only non-default values appear in the URL. Default state is: page=1, sort=newest, isRead undefined, types=[], no explicit date range (server resolves to last 30 days when both `dateFrom` and `dateTo` are omitted).
- **Alternative considered**: Echo all state into the URL. Rejected — degrades shareability and copy-paste UX.

### 5. Optimistic mark-as-read on item click
- **Why**: Latency-hiding pattern; the read marker is reversible (delete or refetch) and the next refetch authoritative. Matches `NotificationBell` pattern.
- **Implementation**: TanStack `useMutation` with `onMutate` that snapshots cache and mutates the matching list entry's `isRead: true`. Invalidate `stats` on success.

### 6. Day-group collapse threshold = 5
- **Why**: Mirrors `/my-history` (DAY_COLLAPSE_THRESHOLD = 5). Consistency reduces cognitive load.
- **UI**: First 5 items per day visible; "Xem thêm N thông báo" button reveals remainder. Per-day collapse state resets when `items` reference changes (new fetch).

### 7. Deep-link resolution via `resolveDeepLink(notification)` helper
- Centralizes the type → route mapping. Initial mapping (extend as new types ship):
  - `TASK`, `TASK_ADMIN`, `WORK_PLAN` → `/tasks?id=<entityId>`
  - `EVALUATION*` → `/evaluations/<entityId>` (or evaluation list if id missing)
  - `LEAVE_REQUEST*` → `/leave-requests?id=<entityId>`
  - `OVERTIME_PLAN*` → `/overtime-plans?id=<entityId>`
  - `SUPPLY_REQUEST*`, `PURCHASE_REQUEST` → `/supply-requests?id=<entityId>`
  - `PAYROLL` → `/payroll?period=<period>`
  - `ACCEPTANCE_HANDOVER` → `/acceptance-handovers?id=<entityId>`
  - `REPAIR_REQUEST` → `/repair-requests?id=<entityId>`
  - `ORDER` → `/orders?id=<entityId>`
  - `WAREHOUSE` → `/warehouse?id=<entityId>` (receipt vs. issue resolved via metadata)
  - `INVOICE` → `/invoices?id=<entityId>`
  - `DEBT` → `/debts?id=<entityId>`
  - `PRODUCTION_REPORT` → `/production-reports?id=<entityId>`
  - `FAULT_RECORD` → `/fault-records?id=<entityId>`
  - `PRIVATE_FEEDBACK`, `DAILY_WORK_REPORT` → `/my-history` (no per-entity page)
  - `PROJECT_APPROVAL` → `/project-approvals?id=<entityId>`
  - `PRICING` → `/pricing?id=<entityId>`
  - `PASSWORD_RESET` → no deep-link (button hidden)
- Unknown / missing entityId → button hidden in the detail modal.

### 8. TanStack Query key factory and invalidation
- `myNotificationsKeys = { all: ['my-notifications'], list: (params) => [...all, 'list', params], stats: (params) => [...all, 'stats', params] }`.
- `keepPreviousData: true` for list; `staleTime: 30 s` (list) / `60 s` (stats).
- Mutations invalidate `myNotificationsKeys.all` plus the existing `notifications.unreadCount` query so the header badge stays in sync.

### 9. Backend filter Prisma builder
- A single `buildNotificationFilterWhere(employeeId, filters)` helper composes the `where` object: `employeeId`, optional `type: { in: types }`, optional `isRead`, optional `createdAt: { gte, lte }`, optional `OR: [{ title: { contains, mode: 'insensitive' } }, { message: { contains, mode: 'insensitive' } }]`.
- Date defaults: when filter mode active and both `dateFrom`/`dateTo` absent, default last 30 days. When stats called without dates, default last 30 days too (mirrors UI default and prevents heavy scans).
- Sort: `[{ createdAt: sort === 'oldest' ? 'asc' : 'desc' }, { id: sort === 'oldest' ? 'asc' : 'desc' }]` (stable tiebreaker).
- Pagination: `skip = (page - 1) * limit`, `take = clamp(limit, 1, 100)`.

### 10. Stats query
- Three counts (`prisma.notification.count`) for total/unread/today plus `prisma.notification.groupBy({ by: ['type'] })` for `byType`. All run in `Promise.all` for parallelism.
- `today` window uses `new Date()` truncated to start-of-day server-local (Asia/Ho_Chi_Minh per docker config).
- `byType` strips zero counts before returning.

## Risks / Trade-offs

- **Risk: Filter mode introduces a new request shape that consumers must distinguish from the legacy/cursor responses.** → Mitigation: keep activation rule explicit (`hasFilterParams` predicate), document in the spec, and only call from the new `useMyNotifications` hook. Existing call sites are untouched and never set the trigger params.
- **Risk: `byType` counts on a noisy account could become large.** → Mitigation: scope to the authenticated employee (every count is `where: { employeeId }`); zero counts dropped client-side; bounded by ~30 notification types.
- **Risk: Search `contains` without an index can degrade on large datasets.** → Mitigation: dataset is per-employee (small per user); acceptable for v1. If load grows, add a trigram index later (out of scope).
- **Risk: Route ordering bug — `GET /stats` shadowed by `/:notificationId`.** → Mitigation: register `/stats` immediately after `/unread/count-by-type` and before any dynamic `/:notificationId` patterns; smoke-test in server logs.
- **Risk: Optimistic mark-as-read can diverge from server (rare race).** → Mitigation: refetch on focus + invalidate stats; failure rollback in `onError`.
- **Trade-off: Server defaults dateRange to last 30 days when client omits both bounds.** Slight surprise factor but mirrors UI default and prevents accidental full-table scans; the design explicitly documents this.
- **Trade-off: No realtime listener on the page** — we rely on TanStack cache + manual refresh. Adding WebSocket invalidation would be future work.

## Migration Plan

- Zero-downtime additive change. No DB migration. No removal of existing query modes.
- Deploy order: backend → frontend.
- Rollback: revert frontend route registration; backend changes are additive and harmless if frontend rolls back independently.
