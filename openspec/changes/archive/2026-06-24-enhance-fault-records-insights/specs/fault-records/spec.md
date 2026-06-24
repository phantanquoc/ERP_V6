## MODIFIED Requirements

### Requirement: System SHALL surface recurrence count when creating a fault from a template

The system SHALL expose an endpoint that, given either a `faultTemplateId` together with a `machineSystemDetailId`, OR a free-text `tenLoi`, returns the count of prior `FaultRecord` rows matching the supplied criteria together with up to 5 most recent matching records. When `faultTemplateId` is supplied, matching is exact on `(faultTemplateId, machineSystemDetailId)`. When `faultTemplateId` is absent and `tenLoi` is supplied, matching uses Postgres `pg_trgm` similarity on `tenLoi` and returns the top 5 records by similarity descending then `ngayPhatHien` descending. The frontend create form SHALL call this endpoint as soon as a template+detail pair is selected OR as soon as a non-empty `tenLoi` is typed (debounced), and SHALL display a warning banner when the count is greater than zero.

#### Scenario: Recurrence endpoint returns count and recent records for template+detail match

- **WHEN** an authenticated user calls `GET /api/fault-records/recurrence?faultTemplateId=X&machineSystemDetailId=Y` and prior records exist
- **THEN** the system returns `{ count: N, records: [...], mode: 'template' }` where `records` contains up to 5 entries ordered by `ngayPhatHien` descending, each entry exposing `id`, `maLoi`, `ngayPhatHien`, `trangThai`, `mucDo`, and `nguoiPhatHien`

#### Scenario: Recurrence endpoint falls back to free-text similarity

- **WHEN** an authenticated user calls `GET /api/fault-records/recurrence?tenLoi=...` without a `faultTemplateId` and similar prior records exist
- **THEN** the system returns `{ count: N, records: [...], mode: 'text' }` where `records` contains up to 5 entries ordered by `pg_trgm` similarity descending then `ngayPhatHien` descending, and `count` is the total number of records with similarity above the configured threshold

#### Scenario: Recurrence endpoint returns zero when no prior matches

- **WHEN** the request is made with valid criteria and no prior `FaultRecord` matches
- **THEN** the system returns `{ count: 0, records: [], mode: 'template' | 'text' }` reflecting which match mode was attempted

#### Scenario: Recurrence endpoint requires at least one identifier

- **WHEN** the request is made without `faultTemplateId` AND without `tenLoi`
- **THEN** the system returns 400 with a validation error stating that one of `faultTemplateId` or `tenLoi` is required

#### Scenario: Recurrence endpoint requires machineSystemDetailId in template mode

- **WHEN** the request is made with `faultTemplateId` but without `machineSystemDetailId`
- **THEN** the system returns 400 with a validation error

#### Scenario: Frontend shows warning when count is positive

- **WHEN** the user selects a template and a machine detail (or types a free-text fault name) in the create modal and the recurrence response has `count > 0`
- **THEN** the modal renders an inline yellow banner reading `Lỗi này đã xảy ra N lần trước đó` followed by a list of up to 5 clickable record entries

#### Scenario: Recurrence banner records are clickable

- **WHEN** the recurrence banner renders any record in its list
- **THEN** each record is rendered as a clickable button that opens the record-view modal (mode `view`) for that record, instead of as plain text

#### Scenario: Recurrence banner exposes a quick "mark as Tái phát" CTA

- **WHEN** the recurrence banner renders with `count > 0`
- **THEN** the banner shows a button labelled `Tự động đánh dấu Tái phát`; clicking it pre-fills `trangThai = 'Tái phát'` in the create/update form before submission, without submitting the form

#### Scenario: Frontend shows new-fault confirmation when count is zero

- **WHEN** the recurrence response has `count === 0`
- **THEN** the modal renders an inline green confirmation reading `Lỗi mới với thiết bị này`

#### Scenario: Frontend skips recurrence call when no identifier is available

- **WHEN** `faultTemplateId` is empty AND `tenLoi` is empty in the create form
- **THEN** the frontend does NOT call the recurrence endpoint and does NOT render any banner

### Requirement: System SHALL provide aggregate fault statistics

The system SHALL expose a read-only stats endpoint that returns totals, severity buckets, status buckets, severity-by-status matrix, time-window aggregations, monthly trend (last 12 months), recent feed (today + this week), top 5 machines by fault count, top 5 recurring template+device combinations with last-seen timestamp, and mean time to resolve (MTTR) in days. The endpoint SHALL accept an optional `machineSystemId` query parameter that scopes every aggregation to records whose `machineSystemId` matches. Authenticated users from any department SHALL be able to read this endpoint.

#### Scenario: Stats endpoint returns the full payload shape

- **WHEN** an authenticated user calls `GET /api/fault-records/stats`
- **THEN** the system returns `{ total, bySeverity, byStatus, bySeverityByStatus, last7Days, last30Days, thisMonth, prevMonth, monthlyTrend, recent: { today, thisWeek }, topMachines, topRecurring, mttrDays }`

#### Scenario: bySeverity and byStatus always contain all canonical keys

- **WHEN** the stats response is built
- **THEN** `bySeverity` contains keys `Nghiêm trọng`, `Trung bình`, `Nhẹ` (each mapped to a non-negative integer) and `byStatus` contains keys `Đang theo dõi`, `Đã xử lý`, `Tái phát` (each mapped to a non-negative integer)

#### Scenario: bySeverityByStatus is a 3x3 matrix keyed by status then severity

- **WHEN** the stats response is built
- **THEN** `bySeverityByStatus` is shaped as `Record<status, Record<severity, number>>` with all status keys (`Đang theo dõi`, `Đã xử lý`, `Tái phát`) and all severity keys (`Nghiêm trọng`, `Trung bình`, `Nhẹ`) present, each value being a non-negative integer

#### Scenario: Time-window aggregations cover the requested ranges

- **WHEN** the stats response is built
- **THEN** `last7Days` is the count of records with `ngayPhatHien` within the last 7 days, `last30Days` within the last 30 days, `thisMonth` within the current calendar month, and `prevMonth` within the previous calendar month

#### Scenario: Monthly trend covers the last 12 months

- **WHEN** the stats response is built
- **THEN** `monthlyTrend` is an array of exactly 12 entries `{ month: 'YYYY-MM', count: number }`, ordered chronologically ascending, covering the last 12 months including the current month, with months that have no records appearing with `count: 0`

#### Scenario: Recent feed returns up to 5 records per bucket

- **WHEN** the stats response is built
- **THEN** `recent.today` and `recent.thisWeek` are each arrays of up to 5 `FaultRecord` summaries ordered by `ngayPhatHien` descending; `today` contains records from the current calendar day, `thisWeek` contains records from the current ISO week

#### Scenario: Top recurring rows expose lastSeenAt

- **WHEN** the stats response is built
- **THEN** each entry in `topRecurring` exposes `faultTemplateId`, `tenMauLoi`, `machineSystemDetailId`, `tenChiTiet`, `count`, and `lastSeenAt` (ISO timestamp of the most recent `ngayPhatHien` in the group), ordered by `count` descending

#### Scenario: MTTR is computed only over resolved records with ngayXuLy

- **WHEN** the stats response is built and at least one `FaultRecord` has both `ngayXuLy IS NOT NULL` and `trangThai = 'Đã xử lý'`
- **THEN** `mttrDays` is the arithmetic mean of `(ngayXuLy - ngayPhatHien)` expressed in days (rounded to 1 decimal) across those records

#### Scenario: MTTR is null when no resolved records have ngayXuLy

- **WHEN** the stats response is built and no `FaultRecord` has `ngayXuLy IS NOT NULL`
- **THEN** `mttrDays` is `null`

#### Scenario: Stats endpoint scopes every aggregation to a system when machineSystemId is provided

- **WHEN** an authenticated user calls `GET /api/fault-records/stats?machineSystemId=Z`
- **THEN** every aggregation (`total`, `bySeverity`, `byStatus`, `bySeverityByStatus`, time windows, `monthlyTrend`, `recent`, `topMachines`, `topRecurring`, `mttrDays`) is computed only over records whose `machineSystemId = Z`

#### Scenario: Empty database returns zeroed payload

- **WHEN** the stats endpoint is called and no `FaultRecord` rows exist
- **THEN** the system returns `total: 0`, both bucket maps with all canonical keys present and value 0, `bySeverityByStatus` with all canonical keys and value 0, time windows all 0, `monthlyTrend` of length 12 with all `count: 0`, `recent.today` and `recent.thisWeek` empty, `topMachines` and `topRecurring` empty, and `mttrDays: null`

### Requirement: System SHALL provide a heatmap of machines by fault templates

The system SHALL expose `GET /api/fault-records/heatmap` returning an array of `{ machineSystemId, tenHeThong, faultTemplateId, tenMauLoi, count }` rows covering the cartesian intersection of the top-10 `machineSystemId` and top-10 `faultTemplateId` (each ranked by total fault count). Only `(system, template)` pairs with at least one matching `FaultRecord` are returned. Authenticated users from any department SHALL be able to read this endpoint, with the same access policy as `/stats`.

#### Scenario: Heatmap returns hydrated rows for top machines and top templates

- **WHEN** an authenticated user calls `GET /api/fault-records/heatmap` and matching records exist
- **THEN** the system returns up to 100 rows, each with `machineSystemId`, `tenHeThong`, `faultTemplateId`, `tenMauLoi`, and `count`, where every `machineSystemId` belongs to the top-10 systems by total count and every `faultTemplateId` belongs to the top-10 templates by total count

#### Scenario: Heatmap excludes records with null template or null system

- **WHEN** the heatmap is computed
- **THEN** records with `faultTemplateId IS NULL` or `machineSystemId IS NULL` are excluded from the count

#### Scenario: Heatmap returns empty array when no matching records exist

- **WHEN** an authenticated user calls `GET /api/fault-records/heatmap` and no records have both a non-null `machineSystemId` and a non-null `faultTemplateId`
- **THEN** the system returns an empty array

### Requirement: System SHALL capture resolution timestamp on status transition to Đã xử lý

The system SHALL store `ngayXuLy: DateTime?` on `business.FaultRecord`. When `faultRecordService.updateFaultRecord` receives a payload that transitions `trangThai` from a non-`Đã xử lý` value to `Đã xử lý`, the service SHALL set `ngayXuLy = now()`. When the payload transitions `trangThai` away from `Đã xử lý` to any other status, the service SHALL clear `ngayXuLy = null`. The system SHALL NOT expose a generic `PATCH /status` endpoint.

#### Scenario: Service sets ngayXuLy on transition into Đã xử lý

- **WHEN** an authorized user updates a `FaultRecord` whose current `trangThai` is `Đang theo dõi` or `Tái phát` with payload `{ trangThai: 'Đã xử lý' }`
- **THEN** the service writes `ngayXuLy = now()` together with the new `trangThai`

#### Scenario: Service clears ngayXuLy on transition out of Đã xử lý

- **WHEN** an authorized user updates a `FaultRecord` whose current `trangThai` is `Đã xử lý` with payload `{ trangThai: 'Đang theo dõi' }` or `{ trangThai: 'Tái phát' }`
- **THEN** the service writes `ngayXuLy = null` together with the new `trangThai`

#### Scenario: Service leaves ngayXuLy untouched when status does not change

- **WHEN** an authorized user updates a `FaultRecord` without supplying `trangThai` in the payload, or with a `trangThai` value equal to the existing one
- **THEN** the service does not write to `ngayXuLy`

### Requirement: System SHALL notify technical subscribers when recurrence threshold is reached

When `faultRecordService.createFaultRecord` finishes successfully and the resulting record has both `faultTemplateId` and `machineSystemDetailId` non-null, and the count of `FaultRecord` rows matching the same `(faultTemplateId, machineSystemDetailId)` pair (including the just-created record) is `>= 3`, the service SHALL dispatch a `FAULT_RECURRENCE_THRESHOLD` notification to recipients consisting of all employees whose department code is `DEPT_TECHNICAL` together with all admins. The dispatch SHALL be wrapped in `try/catch` so that notification failure never bubbles into the create flow.

#### Scenario: Notification fires on third occurrence

- **WHEN** a `FaultRecord` is created with both `faultTemplateId` and `machineSystemDetailId` set, and the resulting recurrence count is exactly 3
- **THEN** the system dispatches a `FAULT_RECURRENCE_THRESHOLD` notification to all `DEPT_TECHNICAL` employees and all admins

#### Scenario: Notification fires on every occurrence above threshold

- **WHEN** a `FaultRecord` is created with both ids set and the resulting recurrence count is `>= 3`
- **THEN** the system dispatches the notification regardless of how many prior occurrences have already triggered it

#### Scenario: Notification does not fire below threshold

- **WHEN** a `FaultRecord` is created with both ids set and the resulting recurrence count is `< 3`
- **THEN** the system does not dispatch a notification

#### Scenario: Notification does not fire for free-text faults

- **WHEN** a `FaultRecord` is created without `faultTemplateId` or without `machineSystemDetailId`
- **THEN** the system does not dispatch a recurrence-threshold notification

#### Scenario: Notification failure does not fail the create flow

- **WHEN** the underlying notification dispatch throws or rejects for any reason
- **THEN** the `createFaultRecord` operation still returns the newly-created record successfully, and the error is logged but not surfaced

### Requirement: Fault records list view SHALL render summary cards and three default-open collapsible insight sections

The frontend `FaultRecordList.tsx` SHALL render, above the existing list, a row of 4 summary cards (Tổng / Đang theo dõi / Đã xử lý / Tái phát) with severity sub-counts that match each card's status, and SHALL render below the cards three collapsible sections labelled "Máy hay lỗi nhất", "Lỗi hay tái phát", and "Xu hướng theo tháng". The first two collapsibles SHALL default to open. The "Xu hướng theo tháng" collapsible SHALL also default to open and contain a `recharts` line chart driven by `monthlyTrend`. A fourth collapsible "Mới phát sinh" SHALL render a Hôm nay / Tuần này tab switcher driven by `recent`. A fifth collapsible "Bản đồ nhiệt máy × loại lỗi" SHALL render the heatmap (lazy-loaded via `useFaultHeatmap` only when expanded).

#### Scenario: Summary cards render counts from stats with per-card severity sub-counts

- **WHEN** the records view loads with stats data available
- **THEN** the page shows 4 cards displaying `total` and the three status counts; each card's severity sub-counts are read from `bySeverityByStatus[<status>]` for the three status cards and from `bySeverity` for the Tổng card; counts are not identical across cards unless the underlying data is identical

#### Scenario: Severity badges use distinguishable short labels

- **WHEN** any severity sub-count is rendered
- **THEN** the badge uses the short label `Nghiêm` for `Nghiêm trọng`, `TB` for `Trung bình`, and `Nhẹ` for `Nhẹ`, accompanied by a colored dot, so that no two severities share the same visible label

#### Scenario: Tổng card shows month-over-month delta arrow

- **WHEN** stats data is available and `prevMonth > 0`
- **THEN** the Tổng card shows a delta arrow (↑ or ↓) with a percentage between `thisMonth` and `prevMonth`, colored green for a decrease and red for an increase

#### Scenario: Tổng card hides delta arrow when prevMonth is zero

- **WHEN** stats data is available and `prevMonth === 0`
- **THEN** the Tổng card does not show a delta arrow

#### Scenario: Đã xử lý card surfaces MTTR as a sub-metric

- **WHEN** stats data is available and `mttrDays` is non-null
- **THEN** the Đã xử lý card displays `mttrDays` as a sub-metric labelled `Trung bình ngày xử lý`; when `mttrDays` is `null` the sub-metric is hidden

#### Scenario: Status cards are clickable and drill-down

- **WHEN** the user clicks one of the three status cards
- **THEN** the list filter `trangThai` is set to that status and the page is reset to 1; clicking the Tổng card clears the `trangThai` filter

#### Scenario: Quick-filter chip row drives status filter

- **WHEN** the records view renders
- **THEN** a chip row sits directly under the summary cards with chips `Tất cả`, `Đang theo dõi`, `Đã xử lý`, `Tái phát`; clicking a chip sets `filters.trangThai` to that status (or clears it for `Tất cả`) and resets the page to 1

#### Scenario: Insight collapsibles default to open

- **WHEN** the records view first renders
- **THEN** "Máy hay lỗi nhất", "Lỗi hay tái phát", and "Xu hướng theo tháng" are open; "Mới phát sinh" and "Bản đồ nhiệt máy × loại lỗi" may be closed by default

#### Scenario: Top-5 sections render hydrated entries with last-seen-at

- **WHEN** "Lỗi hay tái phát" is expanded
- **THEN** up to 5 rows render with the hydrated names, counts, and a "Lần cuối: X ngày trước" line beneath each item, derived from `lastSeenAt`

#### Scenario: Trend chart renders monthly counts

- **WHEN** "Xu hướng theo tháng" is expanded
- **THEN** a `recharts` line chart renders with X-axis = `month` and Y-axis = `count`, driven by `monthlyTrend`

#### Scenario: Recent feed renders today and this-week tabs

- **WHEN** "Mới phát sinh" is expanded
- **THEN** the section shows two tabs (`Hôm nay`, `Tuần này`); each tab lists the records from `recent.today` or `recent.thisWeek` respectively, and clicking a row opens the record-view modal

#### Scenario: Heatmap is lazy-loaded on first expand

- **WHEN** "Bản đồ nhiệt máy × loại lỗi" is expanded for the first time
- **THEN** the frontend calls `GET /api/fault-records/heatmap` (via `useFaultHeatmap`) and renders a color-graded table where each cell shows the `count` for `(system, template)`, with intensity scaled across the visible cells

### Requirement: Stats and heatmap requests SHALL forward the lockedMachineSystemId scope

When `FaultRecordList` is opened inside a drawer with `lockedMachineSystemId` set, every read of stats and heatmap SHALL forward that id so the displayed insights reflect only the locked system. The TanStack Query key factory SHALL include the locked id so cache entries do not collide between scoped and global views.

#### Scenario: Stats hook forwards lockedMachineSystemId

- **WHEN** `FaultRecordList` is rendered with a non-empty `lockedMachineSystemId`
- **THEN** `useFaultRecordStats(lockedMachineSystemId)` calls `GET /api/fault-records/stats?machineSystemId=<id>` and the query key includes that id

#### Scenario: Heatmap hook is system-scoped or hidden in drawer context

- **WHEN** `FaultRecordList` is rendered with a non-empty `lockedMachineSystemId`
- **THEN** the heatmap section either forwards the id (if backend supports filtering) or is hidden, but does not display unscoped global data

#### Scenario: Delete invalidates both list and stats query keys

- **WHEN** a fault record is deleted via `useDeleteFaultRecord`
- **THEN** the mutation's `onSuccess` invalidates both `faultRecordKeys.lists()` and `faultRecordKeys.stats(...)` so the summary cards reflect the new totals

