# Proposal: YCSC Statistics Dashboard

## Why

The current YCSC (repair request) list page shows only 4 stat cards, a top-5 machine list, a recurring-item list, and a plain text monthly table — no charts, no department breakdown, no cost visibility, and no area-level insight. Managers cannot answer "which department generates the most requests?", "which zone breaks down most?", or "how much did we spend per month?" without exporting to Excel and pivoting manually. A dedicated statistics dashboard with visual charts and cost transparency is needed to support operational decisions.

## What Changes

- **Backend `GET /repair-requests/stats` enriched** with new aggregations (no schema migration):
  - `departmentTrend` — 12-month x department breakdown (Top 5 + "Khác" bucket, resolves `Department.name`)
  - `byArea` — breakdown by `MachineSystem.khuVuc` (normalized, empty bucket merged into "Khác")
  - Expanded `topMachines` from Top 5 to Top 10 with area tooltip data
  - `costByMonth` — 12 months of `{ duKien, thucTe, incidental }` sums (`chiPhiThucTe` + `RepairIncidentalCost.soTien`; null → 0 for chart, shown as "—" in table)
  - `costDetailByMonth` — per-month list of `{ maYeuCau, ngayThang, duKien, thucTe, chenhLech }` for drill-down
  - `mttrByDept` / global `mttrHours` — mean time to resolution (createdAt → HOAN_THANH status log)
  - `khongDatRate` — ratio of KHONG_DAT confirmations over total confirmations
  - `topExpensive` — Top N YCSC by `thucTe + incidental`
- New query params: `year` (YYYY, defaults to current year) and `phongBanId` (department filter); existing `dateFrom/dateTo/machineSystemId/requestType` remain supported
- **Frontend `RepairStatisticsDashboard.tsx` (new)** — renders 6 blocks: (1) LineChart department trend, (2a) BarChart by area, (2b) horizontal BarChart Top 10 machines, (3) stacked BarChart cost by month with planned overlay, (3b) collapsible per-month detail table (click mã → detail modal), (4) KPI row (MTTR, KHONG_DAT rate, top expensive)
- **Frontend `RepairRequestList.tsx`** — extract inline statistics into `RepairStatisticsDashboard`, wire year/department filters
- Shared filter state (year + date range + department) drives a single `useRepairRequestStats` query; all charts/tables react to it
- Uses existing `recharts ^3.2.1` — no new dependency

## Capabilities

### New Capabilities
- `repair-request-statistics`: Aggregated analytics for repair requests — department trends, area/machine breakdowns, monthly cost, MTTR, acceptance failure rate, and expensive-request ranking, with year/department/date filters

### Modified Capabilities
- _None_ — existing list/detail/status flows are untouched

## Impact

- **Backend**: `repairRequestService.getStats()` and `repairRequestController.getStats()` — additive response fields only, no breaking change
- **Frontend**: New component `RepairStatisticsDashboard.tsx`, updated `repairRequestService.ts` types, `useRepairRequests` query keys, `RepairRequestList.tsx`; `recharts` already installed
- **Database**: No migration — reads existing `phongBanId`, `chiPhiDuKien/chiPhiThucTe`, `RepairIncidentalCost`, `MachineSystem.khuVuc`, `RepairRequestStatusLog`
- **Out of scope**: Prisma schema changes, `MachineSystem`/`FaultRecord` edits, YCSC status flow changes
