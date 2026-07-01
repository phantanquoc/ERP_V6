## ADDED Requirements

### Requirement: RepairRequest stats endpoint returns dashboard aggregates

The backend SHALL expose `GET /api/repair-requests/stats?dateFrom=<ISO>&dateTo=<ISO>&machineSystemId=<id>` returning `{ success: true, data: { total, byStatus, avgCompletionHours, delta, topMachines, recurringItems, monthlyTrend, recentlyCreated } }`. All computation SHALL live in `repairRequestService.getStats(filters)`; the controller SHALL only parse query params. When `dateFrom`/`dateTo` are omitted, the range defaults to the last 90 days (backend computes `dateFrom = now - 90d`, `dateTo = now`). The shape SHALL be:

- `total: number` — RepairRequest rows in `[dateFrom, dateTo]` (filtered by `machineSystemId` when supplied via joined items).
- `byStatus: { CHO_XU_LY, DANG_SUA_CHUA, HOAN_THANH, DA_HUY }` — counts per enum value in the same window.
- `avgCompletionHours: number | null` — mean of `(completedAt - createdAt)` in hours over `HOAN_THANH` rows in the window (`null` when no completed rows).
- `delta: { total, byStatus, avgCompletionHours }` — same shape as above but computed for the immediately preceding window of equal length; each field is `current - previous` (or `null` for `avgCompletionHours` when either side has no data).
- `topMachines: [{ machineSystemId, tenHeThong, count }]` — top 5 machines by RepairRequest count in the window.
- `recurringItems: [{ machineSystemDetailId, tenChiTiet, count, latestMaYeuCau }]` — RepairRequestItems whose `machineSystemDetailId` appears in more than 2 distinct RepairRequests within the window's expanded 180-day trailing edge (window end minus 180 days), ordered by count descending, top 10.
- `monthlyTrend: [{ month: 'YYYY-MM', total, hoanThanh }]` — 12 monthly buckets ending at the window end, oldest-first.
- `recentlyCreated: [{ id, maYeuCau, tenHeThongThietBi, trangThai, createdAt, itemCount }]` — 10 most recent RepairRequests whose `trangThai IN (CHO_XU_LY, DANG_SUA_CHUA)`.

The endpoint SHALL be accessible to any authenticated user (same policy as `GET /api/repair-requests`).

#### Scenario: Default 90-day window with no filters

- **WHEN** an authenticated user calls `GET /api/repair-requests/stats` with no query params
- **THEN** the response returns aggregates computed over `[now-90d, now]` with `delta` computed against `[now-180d, now-90d]`

#### Scenario: Explicit date range narrows aggregation

- **WHEN** an authenticated user calls `GET /api/repair-requests/stats?dateFrom=2026-01-01&dateTo=2026-03-31`
- **THEN** `total`, `byStatus`, `avgCompletionHours`, and `topMachines` all reflect only rows whose `createdAt` is within `[2026-01-01, 2026-03-31]`, and `delta` is computed over `[2025-10-03, 2025-12-31]` (a 90-day window ending the day before `dateFrom`)

#### Scenario: MachineSystem filter narrows top machines

- **WHEN** an authenticated user calls `GET /api/repair-requests/stats?machineSystemId=M1`
- **THEN** all aggregates include only RepairRequests that have at least one `RepairRequestItem` whose `machineSystemId = M1`, and `topMachines` contains exactly one entry for M1 (or is empty if none)

#### Scenario: Avg completion hours is null when no completed rows

- **WHEN** the stats endpoint is called on a window with zero `HOAN_THANH` rows
- **THEN** `avgCompletionHours` is `null` and `delta.avgCompletionHours` is `null`

#### Scenario: Recurring items require > 2 distinct RepairRequests

- **WHEN** the same `machineSystemDetailId` appears in exactly 2 RepairRequests within the 180-day trailing window
- **THEN** it is NOT included in `recurringItems`

#### Scenario: Monthly trend returns 12 buckets ending at window end

- **WHEN** the stats endpoint is called with `dateTo = 2026-06-15`
- **THEN** `monthlyTrend` contains 12 entries from `2025-07` to `2026-06` (oldest-first), each with `total` and `hoanThanh` counts

### Requirement: RepairRequest dashboard renders on RepairRequestList

The frontend `RepairRequestList.tsx` SHALL render, above the existing list, a dashboard section wired to `useRepairRequestStats(filters)`. The dashboard SHALL contain:

1. Four `StatCard` primitives displaying `total`, `byStatus.CHO_XU_LY`, `byStatus.DANG_SUA_CHUA`, `byStatus.HOAN_THANH`, each with a delta arrow driven by the corresponding `delta` field (up-arrow for positive, down-arrow for negative, dash for zero/null).
2. Four `CollapsibleSection` primitives (default open on desktop, collapsed on mobile), each rendering one of: "Máy hay yêu cầu sửa chữa nhất" (from `topMachines`), "Yêu cầu tái phát" (from `recurringItems`), "Xu hướng theo tháng" (from `monthlyTrend`, rendered as a compact bar list or table), "Mới phát sinh" (from `recentlyCreated`, each row clickable to open detail).

The dashboard SHALL show a skeleton placeholder while the query is loading and a compact error banner if the query fails. Dashboard filters SHALL default to the last 90 days and SHALL be adjustable via a shared date-range control at the top of the section.

#### Scenario: Dashboard mounts above the list

- **WHEN** an authenticated user navigates to `/technical/quality?tab=repairRequests`
- **THEN** the page renders 4 stat cards followed by 4 collapsible sections, then the existing search + table

#### Scenario: Stat card click filters the list

- **WHEN** the user clicks the `Chờ xử lý` stat card
- **THEN** the list below applies `trangThai = CHO_XU_LY` filter and scrolls to the list

#### Scenario: Recently created row navigates to detail

- **WHEN** the user clicks a row in "Mới phát sinh"
- **THEN** the RepairRequest detail modal opens with that request's data

#### Scenario: Dashboard skeleton while loading

- **WHEN** the stats query is fetching for the first time
- **THEN** each stat card and section shows a skeleton placeholder and no error is displayed

### Requirement: useRepairRequestStats hook

The frontend `hooks/useRepairRequests.ts` SHALL export `useRepairRequestStats(filters?: { dateFrom?, dateTo?, machineSystemId? })` returning a TanStack Query result whose data matches the `getStats` response shape. The query key SHALL follow the factory pattern: `repairRequestKeys.stats(filters)`. The hook SHALL keep default `staleTime = 60_000` and refetch on mount when the filters change.

#### Scenario: Query key includes filters

- **WHEN** two components mount `useRepairRequestStats({ dateFrom: '2026-01-01' })` and `useRepairRequestStats({ dateFrom: '2026-02-01' })`
- **THEN** TanStack Query maintains two separate cache entries keyed by the different filter objects
