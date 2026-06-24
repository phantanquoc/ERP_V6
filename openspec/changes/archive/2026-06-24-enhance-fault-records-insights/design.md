## Context

The previous `redesign-fault-records-tab` change (archived 2026-06-23) shipped the technical scaffolding: 4 summary cards, severity sub-counts, status counters, recurrence banner on create, two collapsible top-5 sections, system-scope filtering, and the canCreate/canMutate split. A post-archive UX audit found that while the scaffolding is correct, the experience is shallow:

- **Card sub-counts are misleading**: every card shows the same global `bySeverity` totals, so cards look broken or the numbers feel random.
- **Severity badges collide**: `Nghiêm trọng` and `Nhẹ` both render as the single letter `N`, removing the information the badge is supposed to convey.
- **Insights are hidden**: the two most actionable sections (`Máy hay lỗi nhất`, `Lỗi hay tái phát`) default to collapsed.
- **Banner is dead text**: the recurrence banner lists past records but does not link to them.
- **No time-window context**: there is no way to tell whether the situation is improving or getting worse — no monthly trend, no delta vs last month, no recent feed.
- **No resolution metric**: `FaultRecord` captures `ngayPhatHien` but not `ngayXuLy`, so MTTR is unknowable.
- **Free-text faults have no recurrence signal**: `getRecurrence` requires a `faultTemplateId`. Operators logging an ad-hoc fault get no warning even when an identical free-text fault was logged yesterday.
- **No system-scope when drawer is opened from a machine**: the records tab is reused inside `MachineSystemDetail` drawers via `lockedMachineSystemId`, but `getStats` ignores that scope and always returns global numbers.
- **Delete does not refresh cards**: `useDeleteFaultRecord` invalidates list keys but not the stats key.

The change combines three packages (A: UX corrections, B: trend + charts, C: deep insight) into one OpenSpec change so they ship as a single coherent UX upgrade, with one schema migration and one frontend release.

Stakeholders: production-line operators (read + create), technical mechanical sub-department (full CRUD + insights), ADMIN (full + bypass), all departments (read-only stats).

## Goals / Non-Goals

**Goals:**

- Per-card severity sub-counts that match the card's status (no more identical totals).
- Severity badges that distinguish `Nghiêm`/`TB`/`Nhẹ` at a glance.
- Top-5 insight sections visible immediately on tab open.
- Recurrence banner rows clickable to open the record-view modal.
- Card click and chip click drill-downs that set the status filter.
- Stats automatically scoped to `lockedMachineSystemId` when opened in a drawer context.
- `useDeleteFaultRecord` refreshes the stats cards after a delete.
- Time-window aggregations on the stats response (`last7Days`, `last30Days`, `thisMonth`, `prevMonth`, `monthlyTrend` for 12 months).
- `Tổng` card delta arrow comparing this vs previous month.
- A monthly trend line chart and a recent-feed (Hôm nay / Tuần này) section.
- `lastSeenAt` on each `topRecurring` row so operators see staleness at a glance.
- MTTR (mean resolution days) computed from a new `ngayXuLy` column set on status transition to `Đã xử lý`.
- Heatmap of top-10 systems × top-10 templates by count.
- CTA in the recurrence banner that pre-sets `trangThai = 'Tái phát'` on the create/update form.
- Recurrence-threshold notification: when the third (or later) record for the same `(faultTemplateId, machineSystemDetailId)` pair is created, technical-team subscribers + admins receive a notification.
- Free-text recurrence fallback using Postgres `pg_trgm` similarity on `tenLoi`.

**Non-Goals:**

- No changes to authorization rules. `canCreate` (any authenticated user) and `canMutate` (ADMIN or `SUBDEPT_TECHNICAL_MECHANICAL`) remain as-is.
- No new role or department.
- No new LLM provider or AI tool — the recurrence-threshold notification reuses the existing event-driven `notificationService`.
- No breaking changes to existing `/fault-records` routes. New fields are additive; new endpoints are additive.
- No data backfill of `ngayXuLy` for records resolved before the migration. They remain `null` and are excluded from MTTR.
- No exposure of a generic `PATCH /status` endpoint. The `ngayXuLy` side-effect is set inside `updateFaultRecord` only when `trangThai` is in the payload.
- No replacement of `recharts`. The package is already a frontend dependency (`^3.2.1`), so no `npm install` confirmation is required.

## Decisions

### D1. Resolution time capture: add `ngayXuLy` column (C1a) rather than mine an audit log (C1b)

We add a nullable `ngayXuLy: DateTime?` column to `business.FaultRecord` and have `faultRecordService.updateFaultRecord` set it when the status moves into `Đã xử lý` and clear it when the status leaves `Đã xử lý`.

Alternatives considered:
- Mining an audit log for the status transition timestamp. Rejected because the project has no guaranteed audit-log table for `FaultRecord` mutations, and adding one would expand scope far beyond fault records.
- Storing a separate `FaultRecordStatusHistory` table. Rejected as overkill — only one timestamp is needed; a single nullable column is reversible and small.

The trade-off is that the column duplicates information that *could* be derived from history, but the simplicity wins, and MTTR is the only consumer.

### D2. Recurrence threshold = 3 for notification trigger

The recurrence-threshold notification fires when `create` finishes and the recurrence count for the same `(faultTemplateId, machineSystemDetailId)` pair is `>= 3` *including the just-created record*. Threshold 3 is chosen because it matches the threshold operators already use to call something "chronic" in the existing banner copy (`Lỗi này đã xảy ra N lần trước đó` becomes alarming at N=2 prior + 1 new). The constant lives in `faultRecordService` as `RECURRENCE_NOTIFICATION_THRESHOLD = 3` for easy adjustment.

### D3. Recurrence notification event reuses the existing `notify` registry pattern

We add `NotificationType.FAULT_RECORD` and `NotificationEvent.FAULT_RECURRENCE_THRESHOLD` to `backend/src/types/notification.types.ts`, then register a handler in `notificationRegistry.ts` that resolves recipients via `getEmployeeIdsByDeptCode('DEPT_TECHNICAL') ∪ getAdminEmployeeIds(ctx.actorUserId)` (same pattern as `REPAIR_REQUEST_CREATED`). The send is wrapped in `try/catch` in the service so notification failure never bubbles into the create flow.

Alternatives considered:
- Writing a one-off email/WebSocket dispatch in the service. Rejected because it bypasses the registry and would not appear in users' notification feeds.

### D4. Free-text recurrence via Postgres `pg_trgm` similarity (`%` operator)

When `faultTemplateId` is missing, `getRecurrence` falls back to similarity matching on `tenLoi` using the `pg_trgm` extension. The endpoint signature accepts either `faultTemplateId` or `tenLoi` (one is required). Result set is capped at 5 records, ordered by similarity descending then `ngayPhatHien` descending.

Alternatives considered:
- Levenshtein distance via `fuzzystrmatch`. Rejected because it is character-level, slower at scale, and harder to index than `pg_trgm` GIN indexes (we can add a GIN index on `tenLoi` if recurrence latency becomes an issue; not in initial scope).
- Server-side regex / `ILIKE` matching. Rejected because it does not capture typos or word reorderings.

The Prisma migration enables the extension with `CREATE EXTENSION IF NOT EXISTS pg_trgm` so it works on fresh databases. The similarity query is executed via `prisma.$queryRaw` because Prisma has no first-class operator for `%`.

### D5. Heatmap is a separate endpoint, not a stats field

`GET /api/fault-records/heatmap` returns a flat array of `{ machineSystemId, tenHeThong, faultTemplateId, tenMauLoi, count }` rows representing the cartesian intersection of top-10 systems × top-10 templates. Keeping it separate from `getStats` avoids inflating the stats payload (which is fetched on every page load) and lets the frontend lazy-load the heatmap only when its collapsible is expanded.

### D6. Stats query is bounded and indexed

- `monthlyTrend`: 12 buckets keyed by `YYYY-MM`, computed in SQL with `date_trunc('month', "ngayPhatHien")`. Bounded.
- `recent.today` and `recent.thisWeek`: each capped at 5 rows ordered by `ngayPhatHien` desc. Bounded.
- `topMachines`, `topRecurring`: already capped at 5 in the existing impl. `topRecurring.lastSeenAt` is computed in the same `groupBy` by adding `_max: { ngayPhatHien: true }`.
- `bySeverityByStatus`: single `groupBy(['trangThai', 'mucDo'])` query, then projected into the matrix.
- `mttrDays`: AVG of `EXTRACT(EPOCH FROM (ngayXuLy - ngayPhatHien)) / 86400` over rows where `ngayXuLy IS NOT NULL`. Single query.
- `machineSystemId` filter: pushed into the `where` of every sub-query when present, so a scoped stats call does the same work as global but with an indexed filter.

### D7. Frontend chart and heatmap live in new files; everything else extends `FaultRecordList.tsx`

`FaultTrendChart.tsx` and `FaultHeatmap.tsx` are new components co-located in `frontend/src/components/`. `FaultRecordList.tsx` imports them. All other UI changes (A1–A8, B2, C3) are in-place edits to `FaultRecordList.tsx` since they are part of the same composition.

### D8. `ngayXuLy` side-effect lives in `updateFaultRecord`, not a new endpoint

There is no `PATCH /status` endpoint and there will not be one. The status transition that drives `ngayXuLy` is `data.trangThai`-aware logic inside `updateFaultRecord`:

```
if (data.trangThai === 'Đã xử lý' && existing.trangThai !== 'Đã xử lý') {
  ngayXuLy = now()
} else if (data.trangThai && data.trangThai !== 'Đã xử lý' && existing.trangThai === 'Đã xử lý') {
  ngayXuLy = null
}
```

This keeps the rule co-located with the only place status changes.

## Risks / Trade-offs

- **`pg_trgm` extension permission** → mitigation: `CREATE EXTENSION IF NOT EXISTS pg_trgm` runs as the migration owner. If the prod DB owner cannot create extensions, the migration must be applied as a privileged role first. Documented in the migration's SQL comment.
- **MTTR computed from partial data** → records resolved before the migration have `ngayXuLy IS NULL` and are excluded from the average. We do not backfill, so MTTR will look unrealistically low for the first few weeks. Documented as expected behavior; the card sub-metric reads "Trung bình ngày xử lý" with a tooltip noting it counts only resolutions after this release.
- **Monthly trend uses server timezone** → `date_trunc` runs in the database's `TIMEZONE` setting. This matches how `ngayPhatHien` is stored, so trends are consistent with the existing list view. If the server TZ changes, both trend and list shift together — no inconsistency.
- **Notification spam if threshold is wrong** → threshold 3 was chosen conservatively. If technical-team feedback shows it is noisy, we adjust `RECURRENCE_NOTIFICATION_THRESHOLD` in one place.
- **Stats payload grows** → `bySeverityByStatus` is 3×3 = 9 entries, `monthlyTrend` is 12 entries, `recent` is up to 10 rows, `topRecurring.lastSeenAt` adds one timestamp per row. Total payload growth is small (~2KB JSON) and well within budget.
- **Heatmap data sparsity** → top-10 systems × top-10 templates does not mean 100 cells; only the actual `(system, template)` combinations are returned. The frontend renders missing cells as zeros. This is correct but means the table can look sparse if the data is concentrated; that is the truth of the data.
- **`recharts` bundle size** → already a dependency, already paid for. No regression.

## Migration Plan

1. **Schema change**: add `ngayXuLy DateTime?` to `business.FaultRecord` in `backend/prisma/schema.prisma`.
2. **Prisma migration**: `npx prisma migrate dev --name fault_record_ngayxuly_pg_trgm`. The generated SQL includes both the `ALTER TABLE` and a `CREATE EXTENSION IF NOT EXISTS pg_trgm` line (added by editing the SQL file before commit).
3. **Backend deploy**: ship service, controller, route changes together. The new endpoint (`/heatmap`) and new stats fields are additive — old frontend clients keep working.
4. **Frontend deploy**: ship `FaultRecordList.tsx` edits + new components. The frontend tolerates absent new fields by defaulting to empty arrays / `null`.
5. **Rollback**: if the frontend release needs to be rolled back, the backend can stay deployed (additive). If the backend needs to be rolled back, the migration is reversed with `DROP COLUMN ngayXuLy` (column is nullable; no data loss other than the resolved-at timestamps captured since release). The `pg_trgm` extension stays installed — harmless.

## Open Questions

- None. The proposal, the audit findings, and the prior `redesign-fault-records-tab` archive provide enough context to implement without further user input.
