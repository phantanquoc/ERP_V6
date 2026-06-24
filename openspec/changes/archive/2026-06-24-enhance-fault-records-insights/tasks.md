## 1. Schema & Migration

- [x] 1.1 Add `ngayXuLy DateTime?` column to `business.FaultRecord` in `backend/prisma/schema.prisma`
- [x] 1.2 Generate Prisma migration via `npx prisma migrate dev --name fault_record_ngayxuly_pg_trgm`
- [x] 1.3 Edit the generated SQL to prepend `CREATE EXTENSION IF NOT EXISTS pg_trgm;` so fresh databases install the extension automatically
- [x] 1.4 Run `npx prisma generate` so the Prisma client picks up the new field ← (verify: migration runs cleanly on a fresh DB, `ngayXuLy` is queryable, `SELECT 'abc' % 'abd'` returns true)

## 2. Notification Types & Registry

- [x] 2.1 Add `FAULT_RECORD` to `NotificationType` enum in `backend/src/types/notification.types.ts`
- [x] 2.2 Add `FAULT_RECURRENCE_THRESHOLD` to `NotificationEvent` enum with payload typing `{ faultRecordId, faultTemplateId, machineSystemDetailId, tenLoi, count }`
- [x] 2.3 Register a handler in `backend/src/services/notificationRegistry.ts` resolving recipients to `getEmployeeIdsByDeptCode('DEPT_TECHNICAL') ∪ getAdminEmployeeIds(ctx.actorUserId)` with Vietnamese title/body templates mirroring `REPAIR_REQUEST_CREATED` ← (verify: handler exported in registry export map; sample dispatch resolves to deduped recipient set)

## 3. Backend Service — getStats Extension

- [x] 3.1 Add `RECURRENCE_NOTIFICATION_THRESHOLD = 3` constant and `bySeverity`/`byStatus` canonical key lists to `backend/src/services/faultRecordService.ts`
- [x] 3.2 Make `getStats` accept optional `{ machineSystemId?: string }` and apply it to every sub-query via a shared `where` builder
- [x] 3.3 Return `bySeverityByStatus` from a single `groupBy(['trangThai', 'mucDo'])` projected into a `Record<status, Record<severity, number>>` matrix with all canonical keys present (value 0 when missing)
- [x] 3.4 Compute `last7Days`, `last30Days`, `thisMonth`, `prevMonth` as `count` calls with date `gte/lt` filters against `ngayPhatHien`
- [x] 3.5 Compute `monthlyTrend` via `$queryRaw` using `date_trunc('month', "ngayPhatHien")`, then fill missing months client-side so the returned array is exactly 12 entries `{ month: 'YYYY-MM', count }` ordered ascending
- [x] 3.6 Compute `recent.today` and `recent.thisWeek` via `findMany` (orderBy `ngayPhatHien` desc, take 5) scoped to current day / current ISO week
- [x] 3.7 Extend `topRecurring` groupBy with `_max: { ngayPhatHien: true }` and surface it as `lastSeenAt` on each row
- [x] 3.8 Compute `mttrDays` via `$queryRaw` averaging `EXTRACT(EPOCH FROM ("ngayXuLy" - "ngayPhatHien")) / 86400` over rows with non-null `ngayXuLy`; return `null` when no qualifying rows exist; round to 1 decimal ← (verify: empty DB returns zeroed shape with all canonical keys present and `mttrDays: null`; scoped call with `machineSystemId` returns only matching aggregations)

## 4. Backend Service — checkRecurrence Free-text Fallback

- [x] 4.1 Change `checkRecurrence` signature to `({ faultTemplateId?, machineSystemDetailId?, tenLoi? })` and throw `ValidationError` when both `faultTemplateId` and `tenLoi` are absent
- [x] 4.2 Keep existing exact-match branch when `faultTemplateId` and `machineSystemDetailId` are both present; include `mode: 'template'` in the response
- [x] 4.3 Add a `tenLoi`-only branch using `prisma.$queryRaw` with `WHERE similarity("tenLoi", ${tenLoi}) > 0.3 ORDER BY similarity DESC, "ngayPhatHien" DESC LIMIT 5`; total `count` from a separate raw count query at the same threshold; response includes `mode: 'text'` ← (verify: similarity threshold tuned so common typos still match; both spec scenarios for template + text modes pass; 400 returned when neither id provided)

## 5. Backend Service — updateFaultRecord ngayXuLy Side-effect

- [x] 5.1 In `updateFaultRecord`, load existing record's `trangThai` before applying the update
- [x] 5.2 If `data.trangThai === 'Đã xử lý'` and existing `trangThai !== 'Đã xử lý'`, set `ngayXuLy = new Date()` in the update payload
- [x] 5.3 If `data.trangThai` is provided, not `'Đã xử lý'`, and existing `trangThai === 'Đã xử lý'`, set `ngayXuLy = null`
- [x] 5.4 Otherwise do not write to `ngayXuLy` (omit from update payload entirely so unchanged-status updates don't touch it) ← (verify: all three spec scenarios match exactly — transition in writes timestamp, transition out clears, no-status update untouched)

## 6. Backend Service — createFaultRecord Recurrence Notification

- [x] 6.1 After successful create, when both `faultTemplateId` and `machineSystemDetailId` are non-null, count `FaultRecord` rows matching the pair (inclusive of the just-created row)
- [x] 6.2 If count `>= RECURRENCE_NOTIFICATION_THRESHOLD` (3), dispatch `NotificationEvent.FAULT_RECURRENCE_THRESHOLD` via `notificationService.notify(event, ctx)` with payload `{ faultRecordId, faultTemplateId, machineSystemDetailId, tenLoi, count }`
- [x] 6.3 Wrap the dispatch in `try/catch`, logging the failure but never re-throwing, so notification errors do not bubble into the create flow ← (verify: notification fires on 3rd and beyond, does not fire below threshold or when either id is null, notification failure logged but create returns successfully)

## 7. Backend Service — getHeatmap Method

- [x] 7.1 Add `getHeatmap({ machineSystemId? }?)` that computes top-10 `machineSystemId` and top-10 `faultTemplateId` (each ranked by `count` desc) using two `groupBy` queries against `FaultRecord` with `WHERE machineSystemId IS NOT NULL AND faultTemplateId IS NOT NULL`
- [x] 7.2 Run a third `groupBy(['machineSystemId', 'faultTemplateId'])` filtered to those top-10 sets and hydrate names from `MachineSystem` and `FaultTemplate`
- [x] 7.3 Return `Array<{ machineSystemId, tenHeThong, faultTemplateId, tenMauLoi, count }>`; return `[]` when no qualifying rows exist
- [x] 7.4 Forward `machineSystemId` filter into every sub-query when provided so drawer-scoped heatmap stays consistent with stats

## 8. Backend Controller + Route

- [x] 8.1 In `backend/src/controllers/faultRecordController.ts`, update `getStats` controller to read `req.query.machineSystemId` (string) and forward to service
- [x] 8.2 Update `getRecurrence` controller to accept either `faultTemplateId` + `machineSystemDetailId` OR `tenLoi`, returning 400 via `ValidationError` when neither is present
- [x] 8.3 Add `getHeatmap` controller wired to `faultRecordService.getHeatmap(req.query.machineSystemId)`
- [x] 8.4 In `backend/src/routes/faultRecordRoutes.ts`, register `GET /heatmap` with the same auth + access policy as `/stats` (authenticated read for all departments)
- [x] 8.5 Verify the new route is exported via `backend/src/routes/index.ts` `ROUTE_MAP` (no entry missing) ← (verify: `npm run dev` server logs list `GET /api/fault-records/heatmap`; auth gates match `/stats`)

## 9. Frontend Service Types & Methods

- [x] 9.1 In `frontend/src/services/faultRecordService.ts`, extend `FaultStatsResponse` with `bySeverityByStatus`, `last7Days`, `last30Days`, `thisMonth`, `prevMonth`, `monthlyTrend: Array<{ month: string; count: number }>`, `recent: { today: FaultRecord[]; thisWeek: FaultRecord[] }`, `mttrDays: number | null`, and add `lastSeenAt: string` to `FaultStatsRecurring`
- [x] 9.2 Extend `FaultRecurrenceResponse` with `mode: 'template' | 'text'`
- [x] 9.3 Add `FaultHeatmapCell` type and `FaultHeatmapResponse = FaultHeatmapCell[]`
- [x] 9.4 Change `getStats` signature to `getStats(machineSystemId?: string)` and forward as query param when set
- [x] 9.5 Change `getRecurrence` signature to `getRecurrence(params: { faultTemplateId?: string; machineSystemDetailId?: string; tenLoi?: string })` and forward only the non-empty fields
- [x] 9.6 Add `getHeatmap(machineSystemId?: string)` method calling `GET /fault-records/heatmap`

## 10. Frontend Hooks

- [x] 10.1 In `frontend/src/hooks/useFaultRecords.ts`, extend the query key factory with `stats: (machineSystemId?: string) => [...faultRecordKeys.all, 'stats', machineSystemId ?? null]` and `heatmap: (machineSystemId?: string) => [...faultRecordKeys.all, 'heatmap', machineSystemId ?? null]`
- [x] 10.2 Update `useFaultRecordStats` to accept optional `machineSystemId` and forward it to both the service call and the query key
- [x] 10.3 Add `useFaultHeatmap(machineSystemId?: string, options?: { enabled?: boolean })` so callers can lazy-load by toggling `enabled`
- [x] 10.4 In `useDeleteFaultRecord`, on success invalidate both `faultRecordKeys.lists()` and `faultRecordKeys.stats()` (use prefix invalidation so all scoped variants flush) ← (verify: deleting a record refreshes the four summary cards without page reload)

## 11. Frontend FaultRecordList Edits

- [x] 11.1 (A1) Replace single-letter severity badges with short labels `Nghiêm` / `TB` / `Nhẹ` plus a colored dot so `Nghiêm trọng` and `Nhẹ` are visually distinct
- [x] 11.2 (A2) Render each card's severity sub-counts from `bySeverityByStatus[<status>]` for the three status cards and from `bySeverity` for the Tổng card
- [x] 11.3 (A3) Default-open the three insight collapsibles `Máy hay lỗi nhất`, `Lỗi hay tái phát`, and `Xu hướng theo tháng`; keep `Mới phát sinh` and `Bản đồ nhiệt máy × loại lỗi` closed by default
- [x] 11.4 (A4) Render each recurrence-banner record as a clickable button that opens the existing record-view modal (mode `view`)
- [x] 11.5 (A5) Forward `lockedMachineSystemId` into `useFaultRecordStats` and `useFaultHeatmap`; when `lockedMachineSystemId` is set, hide the heatmap section if backend does not yet support filtering OR forward the id so scoped data is shown
- [x] 11.6 (A6) Add a chip row directly under the summary cards: `Tất cả`, `Đang theo dõi`, `Đã xử lý`, `Tái phát`. Clicking a chip sets `filters.trangThai` (or clears it for Tất cả) and resets page to 1
- [x] 11.7 (A7) Wire the three status cards as clickable buttons that set `filters.trangThai` to the card's status and reset page to 1; clicking Tổng clears the status filter
- [x] 11.8 (B2) On the Tổng card render a delta arrow (`↑`/`↓` with percentage) comparing `thisMonth` vs `prevMonth`, green for decrease and red for increase; hide the arrow when `prevMonth === 0`
- [x] 11.9 (B4) Add a `Mới phát sinh` collapsible containing two tabs `Hôm nay` / `Tuần này` driven by `recent.today` and `recent.thisWeek`; clicking a row opens the record-view modal
- [x] 11.10 (B5) Render `Lần cuối: X ngày trước` under each `topRecurring` row using `lastSeenAt`
- [x] 11.11 (C1) Render `mttrDays` as a sub-metric labelled `Trung bình ngày xử lý` on the `Đã xử lý` card; hide when `mttrDays` is `null`
- [x] 11.12 (C3) Inside `RecurrenceBanner`, add a `Tự động đánh dấu Tái phát` button (visible when `count > 0`) that pre-fills `trangThai = 'Tái phát'` in the create/update form without submitting ← (verify: A1 fixes badge collision visually, A2 numbers differ across cards when data differs, A7 + A6 stay in sync with the existing list filter state)

## 12. New Frontend Components

- [x] 12.1 Create `frontend/src/components/FaultTrendChart.tsx` rendering a `recharts` `LineChart` driven by `monthlyTrend` with X-axis `month` and Y-axis `count`
- [x] 12.2 Create `frontend/src/components/FaultHeatmap.tsx` rendering a color-graded table where each cell shows the `count` for `(machineSystem, faultTemplate)` with intensity scaled across visible cells; lazy-load data via `useFaultHeatmap` only when the collapsible expands
- [x] 12.3 Wire both new components into `FaultRecordList.tsx` inside their respective collapsibles

## 13. Verification

- [x] 13.1 Run `cd backend && npx tsc --noEmit`
- [x] 13.2 Run `cd backend && npm run lint`
- [x] 13.3 Run `cd backend && npm test`
- [x] 13.4 Run `cd frontend && npx tsc --noEmit`
- [x] 13.5 Run `cd frontend && npm run lint` ← (verify: every check passes with zero errors before declaring the change implemented)
