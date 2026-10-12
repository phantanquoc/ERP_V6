# Tasks

## 1. Backend — Enriched stats aggregations

- [x] 1.1 Add query param handling for `year` and `phongBanId` in `repairRequestController.getStats` (parse/validate year 1900–2100, forward to service; dateFrom/dateTo precedence over year) and verify 400 on invalid year
- [x] 1.2 Extend `repairRequestService.getStats` window logic to support `year` and `phongBanId` filters (year → Jan 1–Dec 31 of that year; phongBanId → filter all aggregations; dateFrom/dateTo overrides year)
- [x] 1.3 Implement `departmentTrend` + `departments` aggregations (12 months, Top 5 + "Khác" bucket, resolve `Department.name`, null → "Chưa phân bổ") and verify correct bucket counts
- [x] 1.4 Implement `byArea` aggregation (join via `RepairRequestItem → MachineSystem.khuVuc`, normalize trim/case, empty → "Khác") and verify empty/null grouping
- [x] 1.5 Expand `topMachines` to Top 10 with `khuVuc` per entry and verify response shape includes area
- [x] 1.6 Implement `costByMonth` + `costDetailByMonth` (12 months; `duKien = SUM(chiPhiDuKien)`, `thucTe = SUM(COALESCE(chiPhiThucTe,0))`, `incidental = SUM(RepairIncidentalCost.soTien)`; null → 0 in sums, null preserved in detail) and verify month buckets sum correctly
- [x] 1.7 Implement `mttrHours`/`mttrByDept`, `khongDatRate`, and `topExpensive` (Top 10 by thucTe+incidental) and verify null handling when no completions/confirmations ← (verify: new stats fields match spec shapes, filters narrow all aggregations, 400 on invalid year, `npx tsc --noEmit` in backend passes)

## 2. Frontend — Types and data layer

- [x] 2.1 Extend `repairRequestService.ts` types (`RepairRequestStatsResponse`, `RepairRequestStatsFilters` with `year`/`phongBanId`, new interfaces for departmentTrend/byArea/costByMonth/etc.) and `repairRequestService.getStats` to forward new params
- [x] 2.2 Extend `useRepairRequests` query keys and `useRepairRequestStats` to include `year`/`phongBanId` and verify URL param forwarding ← (verify: `npx tsc --noEmit -p tsconfig.app.json` passes, stats query includes new params in key)

## 3. Frontend — Dashboard component

- [x] 3.1 Create `RepairStatisticsDashboard.tsx` with shared filter bar (year selector defaulting to current year + date range + department dropdown populated from `departments`), URL-synced via `useSearchParams`, and error/loading/empty states per block
- [x] 3.2 Implement LineChart department trend (12 months × Top5+Khác, `recharts` LineChart, legend toggle, tooltip counts) and verify Top5+Khác bucket renders correctly
- [x] 3.3 Implement BarChart by area (vertical, sorted desc) and horizontal BarChart Top 10 machines (with khuVuc tooltip)
- [x] 3.4 Implement stacked BarChart cost by month (thucTe+incidental stacked, duKien line overlay, VND formatting) and collapsible per-month detail table (click maYeuCau → detail modal) ← (verify: all 6 blocks render, filters refetch and update charts, click opens detail modal, empty/error/loading states, `npx tsc --noEmit -p tsconfig.app.json` passes)

## 4. Frontend — Integration and KPI

- [x] 4.1 Integrate `RepairStatisticsDashboard` into `RepairRequestList.tsx` (replace/encapsulate inline statistics section, wire year/department filters, preserve existing list/pagination behavior)
- [x] 4.2 Implement KPI row (global MTTR + per-dept tooltip, KHÔNG ĐẠT rate, top expensive list) and verify values match backend fields
- [x] 4.3 Final verification: `cd backend && npx tsc --noEmit` (0 errors), `cd frontend && npx tsc --noEmit -p tsconfig.app.json` (0 errors), manual smoke — open YCSC list, switch year, filter by department, expand month detail, click maYeuCau ← (verify: typecheck clean on both sides, dashboard smoke with year/department filters, no regression on list/detail flows)
