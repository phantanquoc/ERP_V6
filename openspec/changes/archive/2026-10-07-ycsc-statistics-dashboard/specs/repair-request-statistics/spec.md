# repair-request-statistics Specification

## Purpose

Aggregated analytics for repair requests (YCSC) — department trends, area/machine breakdowns, monthly cost, MTTR, acceptance failure rate, and expensive-request ranking — with shared year/department/date filters.

## Requirements

### Requirement: Enriched stats endpoint with additive fields

The system SHALL extend `GET /api/repair-requests/stats` to return additional aggregations alongside the existing fields. Existing fields (`total`, `byStatus`, `byRequestType`, `avgCompletionHours`, `delta`, `topMachines`, `recurringItems`, `monthlyTrend`, `recentlyCreated`) SHALL continue to be returned with unchanged shapes.

New fields SHALL be:

- `departmentTrend: Array<{ month: string; departments: Array<{ deptId: string | null; deptName: string; count: number }> }>` — 12 months (YYYY-MM), Top 5 `phongBanId` by total count in window + "Khác" bucket aggregating all remaining (including null as "Chưa phân bổ" mapped to display "Khác" when chart needs ≤6 lines; the raw dept data keeps distinct names so the bucket can be labelled correctly)
- `departments: Array<{ id: string; name: string }>` — distinct departments referenced in window, for the filter dropdown
- `byArea: Array<{ khuVuc: string; count: number }>` — derived from `RepairRequestItem → MachineSystem.khuVuc`, normalized via `trim()` (empty/null → "Khác"), case-insensitive dedup
- `topMachines` expanded to Top 10 (from 5) with `khuVuc` included per entry for tooltip
- `costByMonth: Array<{ month: string; duKien: number; thucTe: number; incidental: number }>` — 12 months; `duKien = SUM(chiPhiDuKien)`, `thucTe = SUM(COALESCE(chiPhiThucTe, 0))`, `incidental = SUM(RepairIncidentalCost.soTien)` grouped by month of `RepairRequest.createdAt` (or `ngayThang` — documented choice). Null cost → 0 in sums.
- `costDetailByMonth: Record<string, Array<{ id: number; maYeuCau: string; ngayThang: string; duKien: number | null; thucTe: number | null; chenhLech: number | null }>>` — per-request breakdown; null `duKien`/`thucTe` rendered as "—" in UI, `chenhLech = thucTe - duKien` when both non-null
- `mttrHours: number | null` — global mean time to resolution: average of (`HOAN_THANH` status log `createdAt` − `RepairRequest.createdAt`) in hours over window
- `mttrByDept: Array<{ deptId: string | null; deptName: string; mttrHours: number | null }>` — same MTTR split by `phongBanId`
- `khongDatRate: { totalConfirmations: number; khongDat: number; rate: number | null }` — confirmations counted from status logs where `reason` starts with `acceptance_` or `newStatus` in `{DA_NGHIEM_THU, DANG_SUA_CHUA}` after `CHO_NGHIEM_THU`; rate = `khongDat / totalConfirmations` (null when denominator 0)
- `topExpensive: Array<{ id: number; maYeuCau: string; thucTe: number; incidental: number; total: number }>` — Top 10 by `thucTe + incidental` in window

All new fields SHALL be additive and backward-compatible: an old frontend ignoring them SHALL still function.

#### Scenario: Stats returns new fields with populated window

- **WHEN** an authenticated user calls `GET /api/repair-requests/stats?year=2026` and YCSCs exist in 2026
- **THEN** the response `data` contains `departmentTrend` with 12 entries, `byArea`, `costByMonth` with 12 entries, `mttrHours`, `khongDatRate`, and `topExpensive`, alongside the legacy fields

#### Scenario: Null phongBanId grouped as Khác

- **WHEN** YCSCs with `phongBanId = null` exist in the window
- **THEN** `departmentTrend` aggregates them under a bucket with `deptId = null` and `deptName = "Chưa phân bổ"` (frontend maps it into the "Khác" line when Top5+Khác is rendered)

#### Scenario: Cost null handled as 0 in sums

- **WHEN** a YCSC has `chiPhiThucTe = null` and no incidental costs in a month
- **THEN** `costByMonth` for that month reports `thucTe = 0` and `incidental = 0` (not null), while `costDetailByMonth` for that request shows `thucTe = null` so the UI can render "—"

### Requirement: Query filters (year, department, date range)

`GET /api/repair-requests/stats` SHALL support additive query params:

- `year` — `YYYY` (e.g., `2026`), constrains window to Jan 1 00:00:00 → Dec 31 23:59:59.999 of that year; when absent and `dateFrom/dateTo` absent, defaults to current year
- `phongBanId` — department id string; when present, all aggregations (including `byArea`, `costByMonth`, `topMachines`, etc.) SHALL be filtered to `RepairRequest.phongBanId = :phongBanId`
- Existing `dateFrom`, `dateTo`, `machineSystemId`, `requestType` remain supported; when `year` and `dateFrom/dateTo` are both provided, `dateFrom/dateTo` takes precedence for the window (year is ignored)

Invalid `year` (not 4-digit or not 1900–2100) SHALL return 400.

#### Scenario: Filter by year narrows to that year

- **WHEN** `GET /api/repair-requests/stats?year=2025` is called
- **THEN** all counts and sums reflect only YCSCs with `createdAt` in 2025

#### Scenario: Filter by department narrows all aggregations

- **WHEN** `GET /api/repair-requests/stats?year=2026&phongBanId=dept-1` is called
- **THEN** every array in the response reflects only YCSCs with that `phongBanId`

#### Scenario: Invalid year returns 400

- **WHEN** `GET /api/repair-requests/stats?year=abc` is called
- **THEN** the system returns 400 with a validation error

### Requirement: Dashboard UI — 6 blocks with shared filters

The frontend SHALL render a new `RepairStatisticsDashboard` component on the YCSC list page (`RepairRequestList`) inside the existing "Thống kê" collapsible section, with:

1. **Shared filters**: year selector (defaults to current year) + date range (`Từ`/`Đến`) + department dropdown (populated from `departments` in stats response)
2. **LineChart — Department trend**: 12 months on X, one line per department (Top 5 + "Khác"), legend toggleable, tooltip shows counts per month
3. **BarChart — By area**: vertical bars, X = `khuVuc`, Y = count, sorted descending
4. **BarChart — Top 10 machines**: horizontal bars, Y = `tenHeThong`, X = count, tooltip includes `khuVuc`
5. **Stacked BarChart — Cost by month**: X = month, stacked `thucTe` + `incidental`, line overlay for `duKien`; Y in VND, formatted with locale
6. **Collapsible per-month detail table**: each month row expandable to list `{ maYeuCau, ngayThang, duKien, thucTe, chenhLech }`; clicking `maYeuCau` opens the existing detail modal (`RepairRequestFormModal` in view mode)
7. **KPI row**: `MTTR` (global + per-dept tooltip), `KHÔNG ĐẠT rate`, `Top expensive` list

Component states:

- **Loading**: skeleton placeholders per chart/table
- **Error**: inline error with retry button
- **Empty** (no YCSCs in window): "Chưa có dữ liệu" per block
- **Success**: charts/tables as described

All filters SHALL be URL-synced via `useSearchParams` (year, dateFrom, dateTo, phongBanId) so refresh/share preserves the view.

#### Scenario: Dashboard renders with default year

- **WHEN** a user opens the YCSC list page
- **THEN** the dashboard fetches `GET /api/repair-requests/stats?year=<currentYear>` and renders all 6 blocks; if YCSCs exist, charts show data, otherwise empty states

#### Scenario: Filter change refetches and updates all blocks

- **WHEN** the user changes the year selector to 2025
- **THEN** the dashboard refetches with `year=2025` and all charts/tables re-render with 2025 data; URL updates to include `year=2025`

#### Scenario: Clicking a cost detail row opens the detail modal

- **WHEN** the user expands a month and clicks a `maYeuCau` in the detail table
- **THEN** the existing `RepairRequestFormModal` opens in view mode for that YCSC

#### Scenario: Error state with retry

- **WHEN** the stats request fails (network or 500)
- **THEN** the dashboard shows an inline error message with a retry button that re-triggers the query
