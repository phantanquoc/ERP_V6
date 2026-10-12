# Design: YCSC Statistics Dashboard

## Context

Current `GET /repair-requests/stats` returns basic aggregations (total, byStatus, topMachines[5], monthlyTrend[12] via 12 sequential counts, recurringItems, recentlyCreated). Frontend renders them as StatCards + plain lists/tables with no charts and no cost visibility. `recharts ^3.2.1` is already installed and used by `FaultTrendChart.tsx` and `ProjectOverview.tsx`. This change enriches the stats endpoint additively and introduces a dedicated dashboard component.

See `proposal.md` for motivation and capability scope.

## Goals / Non-Goals

**Goals:**
- Enrich stats endpoint without schema migration — read-only aggregations over existing columns
- Deliver 6 dashboard blocks driven by a single query with shared filters (year + date range + department)
- Keep response additive (no breaking change) and frontend backward-compatible when new fields are absent

**Non-Goals:**
- Prisma schema changes, `MachineSystem`/`FaultRecord` edits
- YCSC status flow changes or new status values
- Server-side pagination for stats details (cost detail is bounded by year: max 12 months)
- New charting dependency — reuse `recharts`

## Decisions

**D1. Single enriched `getStats()` vs separate endpoints** — Single endpoint. All dashboard blocks share the same time window and department filter; one round-trip is cheaper than N. The payload grows but stays bounded (12 months + bounded detail lists). Alternative (per-block endpoints) would multiply auth/latency and complicate shared filter sync.

**D2. Department trend shape** — `departmentTrend: Array<{ month: string; departments: Array<{ deptId: string; deptName: string; count: number }> }>` flattened per month, plus `departments: Array<{ id, name }>` for the filter dropdown. Frontend pivots to `LineChart` with one `<Line>` per department. Top 5 by total count in window + "Khác" bucket keeps the chart readable; names resolved via `prisma.department.findMany`.

**D3. Area breakdown source** — `byArea: Array<{ khuVuc: string; count: number }>` derived by joining `RepairRequestItem → MachineSystem.khuVuc`, normalized via `trim() || "Khác"` and `toLowerCase` dedup. Loose string field means no FK — grouping must tolerate `null`/empty and case variants.

**D4. Cost definition** — Chart total per month = `COALESCE(chiPhiThucTe, 0)` + `COALESCE(SUM(RepairIncidentalCost.soTien), 0)`. `chiPhiThucTe` null → 0 for chart, rendered as "—" in tables. Planned overlay = `chiPhiDuKien` sum. Supply/warranty material cost (`SupplyRequestItem * giaThanh`) is excluded from the monthly chart; it remains available via per-request `calcActualCost` drill-down (existing endpoint).

**D5. Query strategy** — Prefer `groupBy` for department/area/cost where Prisma supports it; fall back to `findMany` + in-memory aggregation for joins that Prisma cannot group across relations (e.g., `khuVuc` requires fetching items with `include: { machineSystem }`). Avoid 12 sequential `count` queries if possible — batch via `groupBy` on `createdAt` truncated to month or single `findMany` within window + in-memory bucket.

**D6. MTTR & KHONG_DAT rate** — `MTTR = avg(HOAN_THANH status log createdAt - RepairRequest.createdAt)` (existing pattern in `avgCompletionHours`), plus `mttrByDept` variant when department filter is not restricting to one. `khongDatRate = count(KHONG_DAT confirmations) / count(all confirmations)` over window.

**D7. Frontend chart components** — Reuse `FaultTrendChart` patterns (ResponsiveContainer, CartesianGrid, Tooltip, XAxis tickFormatter). Department trend uses multi-Line, area uses vertical BarChart, Top 10 machines uses horizontal BarChart, cost uses stacked Bar + Line overlay. No custom chart abstraction — keep each chart as a small local component inside the dashboard file.

**D8. Dashboard placement** — New `RepairStatisticsDashboard.tsx` rendered above the table inside `RepairRequestList.tsx` within the existing `CollapsibleSection "Thống kê"`. The old stat cards remain or are folded into the KPI row — `RepairRequestList` delegates all stats rendering to the dashboard.

## Risks / Trade-offs

- **`khuVuc` free-text drift (case/spacing/typos)** → Mitigation: normalize `trim()` + case-insensitive dedup; document that admin should standardize zone names via MachineSystem management
- **`phongBanId` many nulls** → Mitigation: explicit "Chưa phân bổ" bucket, documented in UI legend
- **Heavy aggregation on large windows** → Mitigation: default `year` filter bounds to current year; date range filter further narrows; consider `take` limits on top lists
- **Recharts bundle size already paid** → No new dependency cost
- **Backward compat if frontend is old but backend is new** → Response is additive; old frontend ignores new fields safely

## Migration Plan

- No migration. Backend deploys first (additive API), then frontend. Rollback: revert either side independently — old frontend ignores new fields, old backend returns subset (dashboard shows empty states for missing fields).
