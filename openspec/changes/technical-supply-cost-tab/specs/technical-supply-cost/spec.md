# Spec Delta: technical-supply-cost

## Purpose

Consolidated Technical supply-request list and repair cost overview tab within the Technical & Quality page.

## ADDED Requirements

### Requirement: Technical supply-cost tab in TechnicalQuality

The frontend SHALL add a new tab `supplyCost` labelled "Vat tu & Chi phi" at the end of `TechnicalQuality.tsx` tabs. The tab SHALL be deep-linked via `?tab=supplyCost` and SHALL participate in `ALL_TECH_PARAMS` cleanup on tab switch. New URL params `year`, `dateFrom`, `dateTo`, `supplyStatus`, `supplyLinked`, `supplyLoai` SHALL be added to `ALL_TECH_PARAMS`.

#### Scenario: Tab navigation and deep-link

- **WHEN** a user clicks the "Vat tu & Chi phi" tab
- **THEN** the URL becomes `?tab=supplyCost`, other tech params are cleared, and `TechnicalSupplyCostTab` is rendered

#### Scenario: Deep-link restores tab

- **WHEN** a user opens `?tab=supplyCost&year=2026&supplyStatus=Chua%20cung%20cap`
- **THEN** the page resolves to the supplyCost tab and restores filter state from URL

#### Scenario: Refresh preserves filters

- **WHEN** the user refreshes on `?tab=supplyCost&year=2026`
- **THEN** the same tab and filter values are restored

### Requirement: Block 1 — YCCC of Technical department

Block 1 SHALL display a paginated table of `SupplyRequest` rows whose creator belongs to the Technical department (`DEPT_TECHNICAL`, primary or secondary department, resolved via DB like `requireTechnical`/`isTechnicalMember`). The table SHALL show: `maYeuCau`, `ngayYeuCau`, `tenNhanVien`, `mucDichYeuCau`, `trangThai`, `loaiYeuCau` (Thuong / Mua nhanh), and linked YCSC chips (`supplyLinks` → `RepairRequest.maYeuCau`/`trangThai`). A toggle SHALL filter "All" vs "Only linked to repairs". A KPI row SHALL show counts by status (`total`, `Chua cung cap`, `Da cap`, `Da huy`, etc.). Pagination SHALL be 10 rows per page with `page`/`limit` synced to URL.

Filters SHALL be: `year` (on `ngayYeuCau` range for that calendar year), `trangThai` (exact match), `loaiYeuCau` (Thuong / Mua nhanh), `linkedToRepair` (boolean toggle), and shared `dateFrom`/`dateTo` if provided. All filters SHALL be URL-synced.

#### Scenario: Technical-only filter via DB

- **WHEN** `GET /supply-requests?technicalOnly=true` is called
- **THEN** only requests whose `employee.user.departmentId` or secondary department includes `DEPT_TECHNICAL` are returned (resolved via DB, not JWT)

#### Scenario: Linked-to-repair toggle

- **WHEN** `GET /supply-requests?linkedToRepair=true` is called
- **THEN** only requests with at least one `RepairSupplyLink` are returned

#### Scenario: Year filter on ngayYeuCau

- **WHEN** `GET /supply-requests?year=2026` is called
- **THEN** only requests with `ngayYeuCau` in 2026-01-01 00:00:00 to 2026-12-31 23:59:59.999 are returned; invalid year (not 4-digit or not 1900-2100) returns 400

#### Scenario: Empty state

- **WHEN** no Technical YCCC exists for the selected year
- **THEN** Block 1 shows "Chua co YCCC cua Ky thuat trong ky" and the KPI row shows zeros

#### Scenario: Loading and error states

- **WHEN** the supply list query is pending or fails
- **THEN** Block 1 shows skeleton placeholders or an inline error with a retry button; Block 2 remains independently usable

### Requirement: Block 2 — Repair cost overview

Block 2 SHALL reuse `GET /repair-requests/stats` fields `costByMonth`, `costDetailByMonth`, `topExpensive`, `mttrHours`, `mttrByDept`, `khongDatRate`, plus KPI/header fields (`total`, `byStatus`, `delta`). It SHALL render a `ComposedChart` with stacked bars (`thucTe` + `incidental`) and a line (`duKien`), Y in VND, an expandable per-month detail table (click `maYeuCau` opens the existing detail modal), and KPI cards for MTTR, KHONG_DAT rate, and Top expensive. Shared filters `year`/`dateFrom`/`dateTo`/`phongBanId` SHALL be URL-synced and refetch stats.

Null `chiPhiThucTe`/`chiPhiDuKien` SHALL render as "—" in detail rows but as 0 in sums (existing `COALESCE` behavior, unchanged).

#### Scenario: Cost chart renders from stats

- **WHEN** `GET /repair-requests/stats?year=2026` returns `costByMonth` with 12 entries
- **THEN** Block 2 renders a 12-month stacked bar + line chart with Y in VND and an expandable monthly detail

#### Scenario: Clicking a cost detail row opens detail

- **WHEN** the user expands a month and clicks a `maYeuCau` in the detail table
- **THEN** `RepairRequestFormModal` opens in view mode for that YCSC

#### Scenario: Shared filter refetches both blocks

- **WHEN** the user changes the year selector
- **THEN** both Block 1 (supply list) and Block 2 (repair stats) refetch with the new year and URL updates accordingly
