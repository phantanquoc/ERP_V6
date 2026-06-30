# my-notifications Specification

## Purpose
Provides each authenticated user a dedicated notifications page at `/my-notifications` with a day-grouped timeline, type-group chips, read-state radio filter, debounced search, date-range presets, summary stats card, active-filter chip bar, optimistic mark-as-read and delete actions, deep-link resolution, and full keyboard/screen-reader accessibility. Backed by a filter-mode extension to `GET /api/notifications` and a new `GET /api/notifications/stats` endpoint, while preserving backward compatibility for existing legacy and cursor callers.

## Requirements

### Requirement: Personal Notifications Page Route

The system SHALL expose a permanent URL `/my-notifications` ("Thông báo của tôi") for the authenticated employee to view, filter, search, paginate, mark-read, and delete their own notifications, with aggregate stats and deep-links to source entities.

#### Scenario: Authenticated employee opens the page

- **WHEN** an authenticated employee navigates to `/my-notifications`
- **THEN** the page renders the rail-timeline list scoped to that employee's notifications, a summary stats card (Tổng / Chưa đọc / Hôm nay), a filter panel, and an active-filter chip bar
- **AND** the default state is page=1, sort=newest, isRead=undefined (all), types=[], and a server-resolved last-30-days date range

#### Scenario: Unauthenticated visitor opens the page

- **WHEN** an unauthenticated visitor requests `/my-notifications`
- **THEN** the route guard redirects to the login page, matching the redirect behavior of other authenticated routes

### Requirement: Sidebar Entry With Unread Badge

The system SHALL expose a sidebar entry adjacent to `/my-history` that navigates to `/my-notifications`, displays the label "Thông báo của tôi", uses the lucide `Bell` icon, and renders an unread count badge sourced from the existing unread-count hook.

#### Scenario: User has unread notifications

- **WHEN** the authenticated user has one or more unread notifications
- **THEN** the sidebar entry shows a numeric badge with the unread count
- **AND** clicking the entry navigates to `/my-notifications`

#### Scenario: User has no unread notifications

- **WHEN** the authenticated user has zero unread notifications
- **THEN** the sidebar entry renders without a badge
- **AND** the active state visual matches the `/my-history` pattern when the current route is `/my-notifications`

### Requirement: Filtered Notifications Endpoint

The system SHALL extend `GET /api/notifications` with a filter mode activated when the request contains any of `types`, `isRead`, `dateFrom`, `dateTo`, `search`, `page`, or `sort`. In filter mode the endpoint MUST return a paginated, filterable list scoped to the authenticated employee, using the response envelope `{ success: true, data: { items, total, page, totalPages } }`.

#### Scenario: Filter mode by type and read state

- **WHEN** the client calls `GET /api/notifications?types=TASK&types=EVALUATION&isRead=false&page=1&limit=20`
- **THEN** the server returns notifications belonging to the authenticated employee whose `type` is in `{ TASK, EVALUATION }` and `isRead` is false
- **AND** the response shape is `{ success: true, data: { items, total, page: 1, totalPages } }`
- **AND** results are ordered by `createdAt DESC, id DESC` and pagination respects `skip = (page-1)*limit, take = clamp(limit, 1, 100)`

#### Scenario: Filter mode with implicit default date range

- **WHEN** the client calls `GET /api/notifications?search=đánh giá` with no `dateFrom` and no `dateTo`
- **THEN** the server applies a default date range of the last 30 days before executing the query
- **AND** the search predicate matches `title` or `message` using case-insensitive `contains` against the `search` term

#### Scenario: Filter mode sorting oldest

- **WHEN** the client calls `GET /api/notifications?sort=oldest&types=PAYROLL`
- **THEN** results are ordered by `createdAt ASC, id ASC`
- **AND** the response envelope uses filter-mode shape

#### Scenario: Limit clamping

- **WHEN** the client calls `GET /api/notifications?page=1&limit=500`
- **THEN** the server clamps `limit` to the maximum allowed value (100) before querying
- **AND** the returned `totalPages` reflects the clamped page size

### Requirement: Backward-Compatible Legacy And Cursor Modes

The system SHALL preserve the existing legacy and cursor modes of `GET /api/notifications` for callers that do not pass any filter parameters, so existing consumers (`NotificationBell`, `AllNotificationsModal`) continue to operate unchanged.

#### Scenario: Legacy mode with limit only

- **WHEN** the client calls `GET /api/notifications?limit=10` (no filter params, no cursor)
- **THEN** the server returns the existing legacy response `{ success: true, data: items[] }` ordered by `createdAt DESC` and limited to `limit`
- **AND** filter-mode pagination metadata is not included

#### Scenario: Cursor mode

- **WHEN** the client calls `GET /api/notifications?cursor=<opaque>&limit=20`
- **THEN** the server returns the existing cursor response `{ success: true, data: items[], nextCursor, hasMore }`
- **AND** the response does NOT include `total` / `page` / `totalPages`

#### Scenario: Since parameter without filter params

- **WHEN** the client calls `GET /api/notifications?since=<iso-date>&limit=10`
- **THEN** the server returns notifications created at or after `since`, in legacy response shape

### Requirement: Notifications Stats Endpoint

The system SHALL expose `GET /api/notifications/stats` returning aggregate counts scoped to the authenticated employee. The endpoint MUST accept optional `types[]`, `dateFrom`, `dateTo` query params (matching the list filter scope) and MUST NOT accept `isRead`, `search`, `page`, or `limit`. The response envelope MUST be `{ success: true, data: { total, unread, today, byType } }`.

#### Scenario: Default stats request

- **WHEN** the client calls `GET /api/notifications/stats` with no query params
- **THEN** the server resolves the date range to the last 30 days
- **AND** the response includes `total` (count of notifications in range), `unread` (count where `isRead=false` in range), `today` (count where `createdAt >= start-of-today server local in `Asia/Ho_Chi_Minh`), and `byType` (record of notification type to non-zero count within the same range)
- **AND** `byType` strips zero counts before returning

#### Scenario: Stats with type filter

- **WHEN** the client calls `GET /api/notifications/stats?types=TASK&types=EVALUATION`
- **THEN** all returned counts (`total`, `unread`, `today`, `byType`) are scoped to the requested types
- **AND** `byType` keys are a subset of the requested types

#### Scenario: Route ordering safety

- **WHEN** the route module registers `/stats` and `/:notificationId`
- **THEN** `/stats` is registered BEFORE any dynamic `/:notificationId` route so the static path is not shadowed

### Requirement: Notification Type Group Filter Chips

The system SHALL group the 30+ `NotificationType` values into seven display clusters and expose them as multi-select chips. Toggling a group chip MUST toggle every type in that group, and the UI MUST serialize selections as the flattened `types[]` query parameter before calling the API. Each chip MUST display a numeric count summed from `stats.byType` across the types in that group.

#### Scenario: Defined group mapping

- **WHEN** the UI renders the type chips
- **THEN** the available groups are exactly:
  - `evaluation` → EVALUATION, EVALUATION_SUPERVISOR1, EVALUATION_SUPERVISOR1_COMPLETED, EVALUATION_SUPERVISOR2, EVALUATION_COMPLETED ("Đánh giá")
  - `task` → TASK, TASK_ADMIN, WORK_PLAN ("Nhiệm vụ")
  - `leaveOvertime` → LEAVE_REQUEST, LEAVE_REQUEST_RESPONSE, OVERTIME_PLAN, OVERTIME_PLAN_APPROVAL ("Nghỉ phép & Tăng ca")
  - `supplyPurchase` → SUPPLY_REQUEST, SUPPLY_REQUEST_PROCESSING, SUPPLY_REQUEST_APPROVED, SUPPLY_REQUEST_FULFILLED, PURCHASE_REQUEST ("Vật tư & Mua hàng")
  - `report` → DAILY_WORK_REPORT, PRIVATE_FEEDBACK, PRODUCTION_REPORT, FAULT_RECORD ("Báo cáo")
  - `orderWarehouse` → ORDER, WAREHOUSE, INVOICE, DEBT, PRICING ("Đơn hàng & Kho")
  - `other` → PAYROLL, ACCEPTANCE_HANDOVER, PASSWORD_RESET, REPAIR_REQUEST, PROJECT_APPROVAL ("Khác")

#### Scenario: Toggle group chip selects all member types

- **WHEN** the user clicks the "Đánh giá" group chip while no member types are selected
- **THEN** the UI selects all five evaluation types and sends them in `types[]` on the next request
- **AND** the chip enters the active state with `aria-pressed="true"`

#### Scenario: Toggle group chip deselects when all members selected

- **WHEN** the user clicks the "Đánh giá" group chip while all five member types are already selected
- **THEN** the UI removes those types from the selection
- **AND** the chip returns to the inactive state with `aria-pressed="false"`

#### Scenario: Group chip count display

- **WHEN** stats return `byType: { EVALUATION: 4, EVALUATION_SUPERVISOR1: 2, TASK: 7 }`
- **THEN** the "Đánh giá" chip label shows "Đánh giá (6)" (sum across that group's types)
- **AND** the "Nhiệm vụ" chip label shows "Nhiệm vụ (7)"
- **AND** groups with sum=0 omit the parenthesized count

### Requirement: Read State Radio Filter

The system SHALL provide a read-state radio filter with three exclusive options: "Tất cả" (default; sends `isRead` undefined), "Chưa đọc" (sends `isRead=false`), and "Đã đọc" (sends `isRead=true`).

#### Scenario: Selecting Chưa đọc

- **WHEN** the user selects the "Chưa đọc" radio
- **THEN** the next API request sends `isRead=false`
- **AND** the active filter chip bar displays a "Chưa đọc" chip with an `x` to clear

#### Scenario: Default selection

- **WHEN** the page first loads with no URL query for read state
- **THEN** the "Tất cả" radio is selected
- **AND** no `isRead` parameter is sent
- **AND** the active filter chip bar shows no read-state chip

### Requirement: Debounced Full-Text Search

The system SHALL provide a search input that debounces user typing by 300 milliseconds before triggering a request. The server-side filter MUST match `title` or `message` using a case-insensitive `contains` predicate.

#### Scenario: User types in search box

- **WHEN** the user types "đánh giá" in the search field
- **THEN** the UI waits 300 ms after the last keystroke before sending the request
- **AND** the request sends `search=đánh giá`
- **AND** the active filter chip bar displays a chip showing the search term with an `x` to clear

#### Scenario: Server-side match

- **WHEN** the server receives `search=báo cáo`
- **THEN** it returns notifications where `title ILIKE '%báo cáo%'` OR `message ILIKE '%báo cáo%'`

### Requirement: Date Range Filter With Presets

The system SHALL provide a date range filter with presets ("Hôm nay", "7 ngày", "30 ngày", "Tháng này") and a custom range picker. The default range (when neither end is set by the user) is the last 30 days, resolved server-side.

#### Scenario: Selecting a preset

- **WHEN** the user clicks the "7 ngày" preset
- **THEN** `dateFrom` is set to 7 days ago at 00:00 server-local and `dateTo` is set to today at 23:59 server-local
- **AND** the active filter chip bar displays a "7 ngày qua" chip with an `x` to clear

#### Scenario: Custom range

- **WHEN** the user picks a custom `dateFrom` and `dateTo`
- **THEN** the request includes those exact bounds in ISO format
- **AND** the active filter chip bar shows the formatted range with an `x` to clear

#### Scenario: Default range hidden from URL

- **WHEN** the resolved range is the implicit last-30-days default
- **THEN** the URL does NOT include `dateFrom` or `dateTo`
- **AND** the server applies the last-30-days default itself

### Requirement: URL State Sync

The system SHALL synchronize filter state with the URL via `useSearchParams`, encoding only non-default values to keep shareable links concise.

#### Scenario: Default state hidden

- **WHEN** the page is in its default state (page=1, sort=newest, isRead undefined, types=[], no explicit date range)
- **THEN** the URL contains no query string for those values

#### Scenario: Non-default state encoded

- **WHEN** the user selects types `[TASK, EVALUATION]`, sets `isRead=false`, and navigates to page 3
- **THEN** the URL reflects `types=TASK&types=EVALUATION&isRead=false&page=3`

#### Scenario: Restoring state from URL

- **WHEN** a user opens a shared URL containing `?types=PAYROLL&isRead=true&page=2`
- **THEN** the page initializes with those filters applied and fetches the corresponding data

### Requirement: Summary Stats Card

The system SHALL render a summary stats card with three metrics — Tổng, Chưa đọc, Hôm nay — sourced from `GET /api/notifications/stats`. The card MUST update whenever the `types` or date-range filters change but MUST remain stable across pagination, sort, and read-state changes.

#### Scenario: Filter change invalidates stats

- **WHEN** the user changes the type-group selection or the date range
- **THEN** the UI refetches `/stats` with the same `types` and date range
- **AND** the card displays the new `total`, `unread`, `today` values

#### Scenario: Pagination does not refetch stats

- **WHEN** the user moves from page 1 to page 2 of the list
- **THEN** the `/stats` query is NOT refetched
- **AND** the card values remain unchanged

#### Scenario: Mobile responsive layout

- **WHEN** the viewport width is below 768 px
- **THEN** the card stacks the three metrics vertically
- **AND** above 768 px the metrics render in a horizontal row

### Requirement: Active Filter Chips Bar

The system SHALL render an active filter chip bar above the timeline that displays each applied filter (selected groups, date range, search term, read state) and includes a "Xóa tất cả" button to reset all filters to defaults.

#### Scenario: Removing a single chip

- **WHEN** the user clicks the `x` on an active "Đánh giá" group chip
- **THEN** the UI removes all evaluation types from `types[]` and refetches
- **AND** the chip disappears from the bar

#### Scenario: Clearing all filters

- **WHEN** the user clicks "Xóa tất cả"
- **THEN** all filters reset to defaults (page=1, sort=newest, isRead=undefined, types=[], no date range)
- **AND** the URL clears the non-default query parameters

### Requirement: Day-Grouped Timeline With Collapse

The system SHALL render the notification list grouped by day with a sticky day header. When a day contains more than five items, only the first five are visible and a "Xem thêm N thông báo" button reveals the remainder. The per-day expansion state MUST reset when the underlying items reference changes (new fetch).

#### Scenario: Day with five or fewer items

- **WHEN** a day group contains 1–5 items
- **THEN** all items are rendered without a collapse button

#### Scenario: Day with more than five items collapsed

- **WHEN** a day group contains 8 items and the day is not expanded
- **THEN** the timeline renders the first 5 items
- **AND** a button labeled "Xem thêm 3 thông báo" is shown
- **AND** clicking the button reveals the remaining 3 items and switches the label to "Thu gọn"

#### Scenario: Expansion resets after refetch

- **WHEN** the user expands a day, then changes a filter triggering a new fetch
- **THEN** the new render starts with all days collapsed again

### Requirement: Notification Item Visuals

The system SHALL render each notification row with: an outline icon chosen by notification type, the title (single-line truncate) above the message (two-line clamp), a small unread indicator dot for unread items, a relative timestamp ("5 phút trước", "Hôm qua", or absolute date), and a click affordance.

#### Scenario: Unread vs read appearance

- **WHEN** an item has `isRead=false`
- **THEN** the row shows a colored dot adjacent to the title and applies an emphasized weight to the title
- **AND** items with `isRead=true` omit the dot and use the default weight

#### Scenario: Type icon mapping

- **WHEN** a row renders a notification of type `TASK`, `EVALUATION`, or `PAYROLL`
- **THEN** the icon resolves to the type-specific outline icon (e.g., `ClipboardList`, `Star`, `Wallet`) via a shared mapping helper

### Requirement: Notification Detail Modal With Deep Link

The system SHALL open a notification detail modal when an item is clicked. The modal MUST display the title, full message, formatted createdAt, a human-readable type label (Vietnamese), and a "Mở chi tiết" button when a deep-link is resolvable. The modal MUST support focus trap and Esc-to-close.

#### Scenario: Resolvable deep-link

- **WHEN** the user clicks a `TASK` notification with `entityId=abc123`
- **THEN** the modal opens with details
- **AND** the "Mở chi tiết" button is shown
- **AND** clicking the button navigates to `/tasks?id=abc123` and closes the modal

#### Scenario: Unresolvable deep-link

- **WHEN** the notification has no resolvable target (e.g., `PASSWORD_RESET` or missing `entityId` for a type that requires one)
- **THEN** the "Mở chi tiết" button is hidden
- **AND** the rest of the modal renders normally

#### Scenario: Keyboard accessibility

- **WHEN** the modal is open
- **THEN** focus is trapped within the modal
- **AND** pressing `Esc` closes the modal and returns focus to the originating row

### Requirement: Deep-Link Resolution Helper

The system SHALL centralize notification-type to route mapping in a single helper `resolveDeepLink(notification)` consumed by the detail modal. The mapping covers:

- `TASK`, `TASK_ADMIN`, `WORK_PLAN` → `/tasks?id=<entityId>`
- `EVALUATION` and all `EVALUATION_*` types → `/evaluations/<entityId>` (or evaluation list if `entityId` missing)
- `LEAVE_REQUEST`, `LEAVE_REQUEST_RESPONSE` → `/leave-requests?id=<entityId>`
- `OVERTIME_PLAN`, `OVERTIME_PLAN_APPROVAL` → `/overtime-plans?id=<entityId>`
- `SUPPLY_REQUEST`, `SUPPLY_REQUEST_PROCESSING`, `SUPPLY_REQUEST_APPROVED`, `SUPPLY_REQUEST_FULFILLED`, `PURCHASE_REQUEST` → `/supply-requests?id=<entityId>`
- `PAYROLL` → `/payroll?period=<period>`
- `ACCEPTANCE_HANDOVER` → `/acceptance-handovers?id=<entityId>`
- `REPAIR_REQUEST` → `/repair-requests?id=<entityId>`
- `ORDER` → `/orders?id=<entityId>`
- `WAREHOUSE` → `/warehouse?id=<entityId>`
- `INVOICE` → `/invoices?id=<entityId>`
- `DEBT` → `/debts?id=<entityId>`
- `PRODUCTION_REPORT` → `/production-reports?id=<entityId>`
- `FAULT_RECORD` → `/fault-records?id=<entityId>`
- `PRIVATE_FEEDBACK`, `DAILY_WORK_REPORT` → `/my-history`
- `PROJECT_APPROVAL` → `/project-approvals?id=<entityId>`
- `PRICING` → `/pricing?id=<entityId>`
- `PASSWORD_RESET` → null (deep-link unavailable)

#### Scenario: Known type with entityId returns route

- **WHEN** `resolveDeepLink({ type: 'ORDER', entityId: 'o1' })` is called
- **THEN** it returns `/orders?id=o1`

#### Scenario: Known type without entityId

- **WHEN** `resolveDeepLink({ type: 'EVALUATION' })` is called with no `entityId`
- **THEN** it returns `/evaluations` (list fallback)
- **AND** the detail modal still shows the "Mở chi tiết" button when the fallback exists

#### Scenario: Unknown or unsupported type

- **WHEN** `resolveDeepLink({ type: 'PASSWORD_RESET' })` is called
- **THEN** it returns `null`
- **AND** the detail modal hides the "Mở chi tiết" button

### Requirement: Optimistic Mark-As-Read On Item Click

The system SHALL optimistically mark a notification as read when its row is clicked, by updating the local query cache to `isRead: true` before the server confirms. On server success the system MUST invalidate the stats query. On server failure the system MUST roll back the cache.

#### Scenario: Optimistic update succeeds

- **WHEN** the user clicks an unread row
- **THEN** the UI immediately removes the unread dot and de-emphasizes the title
- **AND** the request `PATCH /api/notifications/:id/read` is sent
- **AND** on success the `stats` cache key is invalidated so the "Chưa đọc" count refreshes

#### Scenario: Optimistic update fails

- **WHEN** the server returns an error for the `PATCH` call
- **THEN** the UI rolls back the row to its prior unread visual
- **AND** displays an error toast

### Requirement: Mark All As Read Action

The system SHALL provide a "Đánh dấu tất cả đã đọc" button in the page header that calls `PATCH /api/notifications/read-all` and invalidates both the list and stats queries on success.

#### Scenario: Successful mark-all

- **WHEN** the user clicks "Đánh dấu tất cả đã đọc"
- **THEN** the request is sent to `PATCH /api/notifications/read-all`
- **AND** on success the list and stats queries are invalidated
- **AND** the unread badge (sidebar + header bell) updates to zero via the existing unread-count query invalidation

### Requirement: Delete Notification Action

The system SHALL provide a delete affordance on each notification row (desktop: hover-revealed trash icon; mobile: action button in the detail modal). Deletion MUST call `DELETE /api/notifications/:id` with optimistic removal of the row and rollback on error.

#### Scenario: Optimistic delete

- **WHEN** the user clicks the trash icon on a row
- **THEN** the row disappears from the visible list immediately
- **AND** `DELETE /api/notifications/:id` is sent
- **AND** on success the list and stats queries are invalidated
- **AND** on error the row is restored and an error toast is shown

### Requirement: Improved Empty States

The system SHALL render distinct empty states for two cases:
- "No data, no filters" — heading "Chưa có thông báo nào trong 30 ngày qua", a single CTA "Mở rộng 1 năm".
- "Filtered to zero" — heading "Không có thông báo nào khớp bộ lọc", CTAs "Mở rộng thời gian (1 năm)" and "Xóa bộ lọc".

#### Scenario: No data, no filters

- **WHEN** the list query returns `total=0` and no user-applied filters are active
- **THEN** the timeline renders the no-data empty state with the "Mở rộng 1 năm" CTA
- **AND** clicking the CTA sets the date range to the last 365 days

#### Scenario: Filtered to zero

- **WHEN** the list returns `total=0` and at least one filter is active
- **THEN** the timeline renders the filtered-to-zero empty state with both CTAs
- **AND** clicking "Xóa bộ lọc" resets all filters to defaults

### Requirement: Mobile Filter Drawer

The system SHALL present filters in a sticky panel on desktop and in a bottom-sheet drawer on mobile (viewport width < 768 px). The drawer MUST be openable from a filter trigger button, closeable via a close button and Esc key, and MUST trap focus while open.

#### Scenario: Desktop sticky panel

- **WHEN** the viewport width is at least 768 px
- **THEN** the filter panel is rendered inline as a sticky sidebar within the page layout

#### Scenario: Mobile drawer open

- **WHEN** the viewport width is below 768 px and the user taps the filter trigger
- **THEN** the bottom-sheet drawer slides up containing the filter controls
- **AND** focus moves into the drawer and is trapped until close

### Requirement: TanStack Query Cache Strategy

The system SHALL use a TanStack Query key factory `myNotificationsKeys = { all: ['my-notifications'], list: (params) => [...all, 'list', params], stats: (params) => [...all, 'stats', params] }` with `keepPreviousData: true`, list `staleTime` of 30 seconds, and stats `staleTime` of 60 seconds. Mutations MUST invalidate `myNotificationsKeys.all` and the existing notifications unread-count query.

#### Scenario: Pagination uses placeholder previous data

- **WHEN** the user changes from page 1 to page 2
- **THEN** the UI continues to show page-1 data until page-2 data resolves
- **AND** no layout shift occurs

#### Scenario: Mutation invalidation

- **WHEN** any of mark-as-read, mark-all-as-read, or delete completes successfully
- **THEN** the system invalidates `myNotificationsKeys.all` and the existing notifications unread-count query so the header bell badge stays in sync

### Requirement: Accessibility Requirements

The system SHALL meet the following accessibility requirements on the page and its components:
- Filter chips expose `aria-pressed` reflecting active state.
- The detail modal traps focus and closes on `Esc`, returning focus to the originating control.
- Keyboard tab order is: search → date controls → presets → group chips → read radio → timeline items.
- Stats values include `aria-live="polite"` so screen readers announce updates.
- All icon-only buttons (delete, close, expand) include `aria-label`.

#### Scenario: Chip aria-pressed

- **WHEN** a group chip toggles to active
- **THEN** its DOM exposes `aria-pressed="true"`
- **AND** when inactive it exposes `aria-pressed="false"`

#### Scenario: Modal focus trap

- **WHEN** the detail modal opens
- **THEN** keyboard focus moves to the first focusable control inside the modal
- **AND** Tab/Shift+Tab cycles only within the modal until it is closed
- **AND** pressing Esc closes the modal and restores focus to the originating row

#### Scenario: Stats live region

- **WHEN** stats values change because filters changed
- **THEN** assistive technology announces the new values via the live region
