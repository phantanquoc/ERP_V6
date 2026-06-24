## Why

The previous redesign (`redesign-fault-records-tab`, archived 2026-06-23) shipped the technical scaffolding (cards, severity badges, top-5 collapsibles, recurrence banner, scoped-by-system filtering), but a post-archive UX audit found the experience shallow: severity sub-counts on every card show identical global totals, mức-độ badges collide visually (`Nghiêm`/`Nhẹ` both render as `N`), the most valuable insights are hidden behind closed collapsibles, the recurrence banner is read-only, no time-window context exists, free-text faults have no recurrence signal at all, and resolution time (MTTR) is unknowable because no resolved-at timestamp is captured. Operators cannot answer "is the situation getting worse?" or "how fast do we close faults?" — the tab reports state but does not surface trends or drive action.

## What Changes

### Package A — UX corrections (no schema change)

- **A1**: Replace single-letter severity badges (`N`/`T`/`N`) with full short labels `Nghiêm`/`TB`/`Nhẹ` plus a colored dot, so `Nghiêm trọng` and `Nhẹ` are distinguishable at a glance.
- **A2**: Card severity sub-counts must reflect that card's status — backend `getStats` returns a new `bySeverityByStatus: Record<status, Record<severity, number>>` field; frontend renders per-card sub-counts from this matrix instead of the global `bySeverity`.
- **A3**: Default-open the "Máy hay lỗi nhất" and "Lỗi hay tái phát" collapsibles so the most actionable signals are visible immediately on tab open.
- **A4**: Render each record in the recurrence banner as a clickable button that opens the existing record-view modal (mode `view`) instead of plain `<li>` text.
- **A5**: When the page is opened inside a `lockedMachineSystemId` drawer context, stats must be scoped to that system. Backend `getStats` accepts an optional `machineSystemId` query parameter; frontend hook + component forward `lockedMachineSystemId` into the request and the stats query key.
- **A6**: Add a quick-filter chip row directly under the summary cards: `Tất cả` / `Đang theo dõi` / `Đã xử lý` / `Tái phát`. Clicking a chip sets `filters.trangThai` and resets the page to 1.
- **A7**: Make the three status cards (`Đang theo dõi`, `Đã xử lý`, `Tái phát`) clickable — clicking a card sets `filters.trangThai` to that status; clicking `Tổng` clears the status filter.
- **A8**: `useDeleteFaultRecord` must invalidate `faultRecordKeys.stats(...)` in addition to the list keys, so the cards refresh after a delete.

### Package B — Trend & charts (no schema change)

- **B1**: Extend `getStats` response with time-window aggregations: `last7Days`, `last30Days`, `thisMonth`, `prevMonth`, and `monthlyTrend: Array<{ month: 'YYYY-MM', count: number }>` covering the last 12 months.
- **B2**: The "Tổng" card displays a delta arrow comparing `thisMonth` vs `prevMonth` (↑/↓ with %, green/red); arrow is hidden when `prevMonth === 0`.
- **B3**: Add a third collapsible section "Xu hướng theo tháng" containing a `recharts` line chart driven by `monthlyTrend`. The chart lives in a new component `FaultTrendChart.tsx`.
- **B4**: Extend `getStats` with `recent: { today: FaultRecord[]; thisWeek: FaultRecord[] }` (each capped at 5 records, ordered by `ngayPhatHien` desc). Frontend adds a "Mới phát sinh" collapsible with a Hôm nay / Tuần này tab switcher; clicking a row opens the record-view modal.
- **B5**: Each `topRecurring` item gains a `lastSeenAt` field (max `ngayPhatHien` in the group) and the frontend shows "Lần cuối: X ngày trước" beneath each item.

### Package C — Deep insight (schema change + new endpoint)

- **C1**: **BREAKING (schema)** — Add nullable column `ngayXuLy DateTime?` to `business.FaultRecord` via Prisma migration. The service sets `ngayXuLy = now()` when transitioning `trangThai` to `Đã xử lý` (and clears it back to `null` if the status leaves `Đã xử lý`). `getStats` returns `mttrDays: number | null` (mean of `ngayXuLy − ngayPhatHien` across resolved records, days, 1 decimal). The "Đã xử lý" card shows MTTR as a sub-metric.
- **C2**: New endpoint `GET /api/fault-records/heatmap` returns a matrix `Array<{ machineSystemId, tenHeThong, faultTemplateId, tenMauLoi, count }>` covering the top-10 machine systems × top-10 fault templates by count. Frontend adds a "Bản đồ nhiệt máy × loại lỗi" collapsible rendering a color-graded table (new component `FaultHeatmap.tsx`).
- **C3**: The recurrence banner gains a "Tự động đánh dấu Tái phát" button. Clicking it pre-fills `trangThai = 'Tái phát'` in the create/update form before the user submits.
- **C4**: When `faultRecordService.create` finishes and the recurrence count for the same `(faultTemplateId, machineSystemDetailId)` pair is `>= 3`, send a notification to technical-team subscribers. Wrapped in `try/catch` so notification failure never bubbles into the create flow.
- **C5**: Extend `getRecurrence` so when `faultTemplateId` is missing, it falls back to a free-text similarity match on `tenLoi` (Postgres `pg_trgm` `%` operator) and returns up to 5 matches. The endpoint signature accepts either `faultTemplateId` or `tenLoi` (one is required).

## Capabilities

### New Capabilities

None — every change extends the existing `fault-records` capability.

### Modified Capabilities

- `fault-records`: Statistics endpoint expands to include severity-by-status matrix, time-window aggregations, monthly trend, recent feed, last-seen-at on recurring items, and MTTR; statistics accepts optional system scope. Recurrence endpoint accepts free-text fallback. New heatmap endpoint added. Resolved-at timestamp is captured on status transition. Recurrence threshold (≥3) triggers a technical-team notification.

## Impact

### Schema & migration
- `backend/prisma/schema.prisma`: add `ngayXuLy DateTime?` to `FaultRecord`.
- New Prisma migration generated via `npx prisma migrate dev`.
- Postgres extension `pg_trgm` must be enabled on the database (added in the same migration via `CREATE EXTENSION IF NOT EXISTS pg_trgm;`).

### Backend
- `backend/src/services/faultRecordService.ts` (largest change): expand `getStats` (severity-by-status, time windows, monthly trend, recent feed, top-recurring lastSeenAt, MTTR, system scope), expand `getRecurrence` (free-text fallback), set `ngayXuLy` on status transition to `Đã xử lý`, trigger recurrence-threshold notification in `create`, add `getHeatmap`.
- `backend/src/controllers/faultRecordController.ts`: stats accepts `machineSystemId` query, recurrence accepts `tenLoi` query, new heatmap controller.
- `backend/src/routes/faultRecordRoutes.ts`: add `GET /heatmap` (auth + same access as `/stats`).
- Notification dispatch: reuses existing `notificationService` (no new provider).

### Frontend
- `frontend/src/services/faultRecordService.ts`: extend `FaultStatsResponse` (bySeverityByStatus, time windows, monthlyTrend, recent, mttrDays, topRecurring.lastSeenAt), `getStats(machineSystemId?)`, `getRecurrence({ faultTemplateId?, tenLoi? })`, new `getHeatmap()` and `FaultHeatmapResponse` type.
- `frontend/src/hooks/useFaultRecords.ts`: `useFaultRecordStats(machineSystemId?)`, new `useFaultHeatmap()`, `useDeleteFaultRecord` invalidates stats key, factory adds `stats(machineSystemId?)` and `heatmap()`.
- `frontend/src/components/FaultRecordList.tsx`: A1–A8, B2, B4, C1 sub-metric, C3 banner button, banner records as clickable buttons, default-open collapsibles, new sections wired to new components.
- `frontend/src/components/FaultTrendChart.tsx` (NEW): recharts line chart for monthly trend.
- `frontend/src/components/FaultHeatmap.tsx` (NEW): heatmap table with color gradient.

### Dependencies
- `recharts` added to `frontend/package.json` (line chart). Confirm with the user before running `npm install` if not already present.

### Performance
- New stats aggregations are bounded (12 months, top 10×10 heatmap, 5+5 recent feed) and run on indexed columns (`ngayPhatHien`, `machineSystemId`, `trangThai`, `mucDo`).
- pg_trgm similarity query bounded to 5 results.

### Permissions
- All new endpoints inherit existing fault-records access policy: GET (production users + technical), mutations (admin OR isTechnical). ADMIN bypasses ABAC. No new role required.
