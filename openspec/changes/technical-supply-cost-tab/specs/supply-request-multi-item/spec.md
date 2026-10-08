# Spec Delta: supply-request-multi-item

## ADDED Requirements

### Requirement: Technical-only, repair-linked, and year filters on supply request list

`GET /api/supply-requests` SHALL support three additive query params:

- `technicalOnly=true` — when present and truthy, restrict to requests whose creator belongs to the Technical department (`DEPT_TECHNICAL`), resolved via DB: `User.departmentId` or secondary department includes `DEPT_TECHNICAL` (same resolution as `isTechnicalMember`/`requireTechnical`), not via JWT or `boPhan` string. When absent or falsy, no technical restriction is applied.
- `linkedToRepair=true|false` — when `true`, only requests with at least one `RepairSupplyLink.supplyRequestId` match; when `false`, only requests with zero links; when absent, no link restriction.
- `year=YYYY` — when present, restrict to `ngayYeuCau` in that calendar year (Jan 1 00:00:00 to Dec 31 23:59:59.999). Invalid year (not 4-digit or not 1900–2100) SHALL return 400. When `year` is absent, no year restriction.

All three SHALL be composable with existing filters (`search`, `phanLoai`, `maYeuCau`, `tenNhanVien`, `boPhan`, `trangThai`, `mucDoUuTien`) and data-permission filters (`departmentIds`/`subDepartmentIds`). All filters SHALL be AND-ed. Pagination `page`/`limit` SHALL apply after filtering; `pagination.total` reflects the filtered count.

Each returned row SHALL include an additive field `supplyLinks: Array<{ repairRequestId: number; maYeuCau: string; trangThai: string }>` — distinct `RepairSupplyLink` targets for that `supplyRequestId` (empty array when none). Existing callers ignoring the field SHALL continue to function.

#### Scenario: Technical-only returns only Technical creators

- **WHEN** `GET /api/supply-requests?technicalOnly=true` is called with supply requests from multiple departments
- **THEN** the response contains only requests whose creator `User` belongs to `DEPT_TECHNICAL` (primary or secondary)

#### Scenario: Linked-to-repair true returns only linked requests

- **WHEN** `GET /api/supply-requests?linkedToRepair=true` is called
- **THEN** every returned request has at least one `RepairSupplyLink`; unlinked requests are excluded

#### Scenario: Year filter narrows to calendar year

- **WHEN** `GET /api/supply-requests?year=2026` is called
- **THEN** only requests with `ngayYeuCau` in 2026 are returned

#### Scenario: Invalid year returns 400

- **WHEN** `GET /api/supply-requests?year=abc` is called
- **THEN** the system returns 400 with a validation error

#### Scenario: SupplyLinks enriched on each row

- **WHEN** `GET /api/supply-requests` returns a request that has two `RepairSupplyLink` rows pointing to `YC-SC-2026-001` and `YC-SC-2026-002`
- **THEN** its `supplyLinks` array contains two entries with `maYeuCau` and `trangThai` of each target

#### Scenario: Combined filters AND-ed

- **WHEN** `GET /api/supply-requests?technicalOnly=true&linkedToRepair=true&year=2026&trangThai=Chua%20cung%20cap` is called
- **THEN** the response contains only Technical requests linked to repairs in 2026 with that `trangThai`
