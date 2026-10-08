# Proposal: Technical Supply-Cost Tab

## Why

The Technical & Quality page (`TechnicalQuality.tsx`) has no consolidated view for (1) supply requests (YCCC) created by the Technical department and (2) repair-request cost analytics. Managers must jump between the supply module and repair stats to answer "what did Technical request and what did repairs cost this year?"

## What Changes

- Add a new `supplyCost` tab at the end of `TechnicalQuality.tsx` tabs. Deep-link via `?tab=supplyCost` with URL-synced filters (`year`, `supplyStatus`, `supplyLinked`, `supplyLoai`).
- **Block 1 — YCCC of Technical**: Paginated table of `SupplyRequest` rows whose creator belongs to the Technical department (`DEPT_TECHNICAL`, primary or secondary department, resolved via DB like `requireTechnical`). Enriched with `supplyLinks` (RepairSupplyLink → RepairRequest `maYeuCau`/`trangThai`). Toggle "All / Only linked to repairs". Filters: `year` (on `ngayYeuCau`), `trangThai`, `loaiYeuCau`. KPI row by status.
- **Block 2 — Repair cost**: Reuse `GET /repair-requests/stats` (`costByMonth`, `costDetailByMonth`, `topExpensive`, `mttrHours`, `khongDatRate`) as a stacked bar + expandable monthly detail + KPI cards. Shared `year`/`dateFrom`/`dateTo`/`phongBanId` filters via URL. No `vatTuThucTe` aggregation in v1.
- **Backend**: Extend `GET /supply-requests` with query params `technicalOnly`, `linkedToRepair`, `year` and enrich each row with `supplyLinks` (distinct `RepairSupplyLink.supplyRequestId → RepairRequest`).
- No new endpoint, no RBAC change beyond filter, no warehouse/purchase mutation.

## Capabilities

### New Capabilities
- `technical-supply-cost`: Consolidated Technical supply-request list + repair cost overview tab (filters, KPIs, tables, charts, deep-link).

### Modified Capabilities
- `supply-request-multi-item`: Extend list query contract to support department-scoped and repair-linked filtering plus year filter.

## Impact

- Affected code: `frontend/src/pages/technical/TechnicalQuality.tsx`, new `frontend/src/components/TechnicalSupplyCostTab.tsx`, `frontend/src/hooks/useSupplyRequests.ts`, `frontend/src/services/supplyRequestService.ts`, `backend/src/services/supplyRequestService.ts`, `backend/src/controllers/supplyRequestController.ts`.
- APIs: `GET /supply-requests` gains 3 additive query params (backward-compatible; old callers ignore them). `GET /repair-requests/stats` unchanged.
- Dependencies: none new (reuses `recharts`, TanStack Query, `RepairRequestFormModal` view mode).
