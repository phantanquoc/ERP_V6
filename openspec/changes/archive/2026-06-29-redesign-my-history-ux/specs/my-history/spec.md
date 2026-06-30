## MODIFIED Requirements

### Requirement: Frontend timeline page and quick action

The system SHALL expose a `/my-history` route on the frontend that renders a redesigned page composed of: (a) a page header with clickable group-count pills, (b) a sticky filter bar containing a debounced search input, a date-range quick picker (7/30/90/365/custom), a role toggle (`both`/`created`/`related`), a "Bộ lọc" expand button revealing per-entity-type sub-chips and a multi-select status chip list, (c) an active-filter chips bar that appears whenever any non-default filter is applied, (d) a summary stats card (Tổng hoạt động / Tuần này / Chờ xử lý), (e) a day-grouped timeline with per-day collapse for days with more than 5 items, and (f) pagination controls.

The default initial load SHALL fetch the last 30 days (not 90), all groups, role `both`, no statuses, and no search. Clicking an item SHALL open a read-only detail modal containing the item's metadata and a button labelled "Mở ở trang gốc" that navigates to the route resolved from `routeHint` (or opens the entity's dedicated list/detail modal when one exists). The `EmployeeDashboard` page SHALL continue to show a quick-action card labelled "Lịch sử của tôi" linking to `/my-history`.

On viewports below 768 px, the inline filter bar SHALL collapse to a single "Bộ lọc" trigger button that opens a bottom-sheet drawer containing all filter controls plus an "Áp dụng" close button.

#### Scenario: User opens history page with default filters

- **WHEN** an authenticated user navigates to `/my-history` with no query string
- **THEN** the page calls `useMyHistory` with `dateFrom` set to today minus 30 days, no `types`, no `statuses`, `roleFilter = 'both'`, `page = 1`, `limit = 20`, and renders the resulting items grouped by day with `DD/MM/YYYY` headers; the URL remains clean (no query parameters)

#### Scenario: User clicks an item

- **WHEN** the authenticated user clicks a row on the timeline
- **THEN** a modal opens showing the item's `title`, `code`, `status`, `createdAt` (full date and time), role badge, and metadata, plus a button "Mở ở trang gốc" (or "Xem trong danh sách" for entity types backed by a list modal) that navigates to `routeHint` or opens the corresponding child modal

#### Scenario: Quick action visible on dashboard

- **WHEN** an authenticated EMPLOYEE opens `EmployeeDashboard`
- **THEN** the dashboard renders a quick-action card titled "Lịch sử của tôi" that navigates to `/my-history` when clicked

#### Scenario: Mobile drawer replaces inline filter bar

- **WHEN** the authenticated user opens `/my-history` on a viewport narrower than 768 px
- **THEN** the page renders a single "Bộ lọc" trigger button instead of the inline filter bar, and tapping it opens a bottom-sheet drawer containing the search input, group sub-chips, status chips, role toggle, and date-range picker

## ADDED Requirements

### Requirement: Per-entity-type sub-category filtering

The system SHALL allow the authenticated user to filter the timeline by individual `entityType` values within each group, in addition to the existing group-level toggle. Each group pill SHALL be expandable to reveal a row of sub-chips covering every entity type that belongs to that group (e.g., the `Yêu cầu` group SHALL expose chips for `quotation-request`, `supply-request`, `purchase-request`, `leave-request`, `repair-request`, and any other entity types the backend maps to that group). Selecting a sub-chip SHALL add only that `entityType` to `params.types`; deselecting it SHALL remove only that value. The selected state of each sub-chip SHALL be derived from `params.types.includes(entityType)`; no separate selection state SHALL be stored.

#### Scenario: User selects a single sub-category chip

- **WHEN** the authenticated user expands the `Yêu cầu` group and clicks the `Yêu cầu báo giá` sub-chip
- **THEN** the URL is updated to include `types=quotation-request`, the timeline re-fetches with `params.types = ['quotation-request']`, and only items with `entityType = 'quotation-request'` are rendered

#### Scenario: Sub-chip pressed state reflects URL

- **WHEN** the authenticated user navigates directly to `/my-history?types=task&types=work-plan`
- **THEN** the `task` and `work-plan` sub-chips render with `aria-pressed="true"`, and all other sub-chips render with `aria-pressed="false"`

#### Scenario: Deselecting a sub-chip from a fully-selected group

- **WHEN** every entity type in the `Nhiệm vụ` group is currently selected in `params.types` and the user clicks one sub-chip to deselect it
- **THEN** only that entity type is removed from `params.types`; the other entity types in the group remain selected; the group pill transitions from "active" to "partial" state

### Requirement: Clickable group-count pills

The five group-count pills (`Yêu cầu`, `Nhiệm vụ`, `Kế hoạch`, `Báo cáo`, `Phiếu`) SHALL be rendered as `<button>` elements with `aria-pressed` reflecting whether every entity type in that group is currently present in `params.types`. Clicking a pill SHALL toggle the entire group: if every entity type in the group is currently selected, the click removes all of them from `params.types`; otherwise the click adds all of the group's entity types to `params.types` (replacing any partial subset). The pill SHALL render a visible "partial" indicator (a small dot) when at least one — but not all — of the group's entity types is present in `params.types`. Pills whose group count is zero SHALL render in a disabled visual state but remain focusable.

#### Scenario: Click pill activates entire group

- **WHEN** the authenticated user clicks the `Nhiệm vụ` group pill while no entity types from that group are in `params.types`
- **THEN** every entity type belonging to `Nhiệm vụ` (per `GROUP_TO_ENTITY_TYPES['Nhiệm vụ']`) is added to `params.types`, the URL updates accordingly, and the pill's `aria-pressed` becomes `"true"`

#### Scenario: Click pill clears entire group

- **WHEN** every entity type in `Kế hoạch` is currently in `params.types` and the user clicks the `Kế hoạch` group pill
- **THEN** all of that group's entity types are removed from `params.types` and the pill's `aria-pressed` becomes `"false"`

#### Scenario: Partial selection indicator

- **WHEN** at least one but not all entity types in `Báo cáo` are in `params.types`
- **THEN** the `Báo cáo` pill renders a partial-state dot indicator and `aria-pressed = "mixed"` (or `"false"` with a visible partial-state class)

### Requirement: Multi-select status filter covering Vietnamese and English codes

The status filter SHALL allow the authenticated user to select zero, one, or many status values simultaneously. The filter SHALL be presented as a wrapped row of toggleable chips inside the "Bộ lọc" panel (or inside the mobile drawer). A label-to-codes mapping SHALL group semantically equivalent statuses so that selecting a single user-facing chip emits every matching backend code into `params.statuses`. The mapping SHALL cover at minimum:

- "Chờ duyệt" → `['CHO_DUYET', 'PENDING']`
- "Đã duyệt" → `['DA_DUYET', 'APPROVED']`
- "Hoàn thành" → `['HOAN_THANH', 'COMPLETED']`
- "Đã hủy" → `['DA_HUY', 'CANCELLED']`
- "Đang xử lý" → `['DANG_XU_LY', 'IN_PROGRESS']`
- "Mới tạo" → `['MOI_TAO']`
- "Từ chối" → `['TU_CHOI', 'REJECTED']`

Raw status codes that do not match any label SHALL still be rendered at the bottom of the status list so they remain selectable.

#### Scenario: Single chip emits multiple raw codes

- **WHEN** the authenticated user selects the "Chờ duyệt" status chip
- **THEN** `params.statuses` becomes `['CHO_DUYET', 'PENDING']` and the URL serializes `statuses=CHO_DUYET&statuses=PENDING`

#### Scenario: Multiple chips combine

- **WHEN** the authenticated user selects both "Chờ duyệt" and "Đã duyệt" chips
- **THEN** `params.statuses` contains `['CHO_DUYET', 'PENDING', 'DA_DUYET', 'APPROVED']` (order-insensitive) and the timeline returns items whose backend `status` matches any of those codes

#### Scenario: Deselecting a chip removes its codes

- **WHEN** "Chờ duyệt" and "Đã duyệt" are both selected and the user clicks "Chờ duyệt" to deselect it
- **THEN** only `['DA_DUYET', 'APPROVED']` remain in `params.statuses`

### Requirement: Active-filter chips bar

When any filter is set to a non-default value, the page SHALL render a horizontal chip row directly below the page header. The chips SHALL be computed at render time from the current `params` (no separate "active chips" state). Each chip SHALL display a human-readable label and a removal button (`aria-label="Xóa bộ lọc: <chip text>"`). Clicking a chip's removal button SHALL remove that single filter dimension from `params` and update the URL. A "Xóa tất cả" button SHALL clear every filter except `limit` and reset `page` to 1. Chips SHALL be generated for: date range (one chip showing "Từ DD/MM/YYYY đến DD/MM/YYYY" or a preset label such as "30 ngày qua"), each group with all its entity types selected (one chip per group), each individual entity type not covered by a fully-selected group (one chip per type), each user-facing status that has at least one of its codes in `params.statuses` (one chip per label), `roleFilter` when it is not `both`, and the `search` term.

#### Scenario: Three filters produce three chips plus reset

- **WHEN** the authenticated user has `params = { dateFrom: '2026-06-01', types: ['task'], roleFilter: 'created' }`
- **THEN** the active-filter chips bar renders three chips ("Từ 01/06/2026", "Nhiệm vụ" or "task" sub-chip, "Tôi tạo") plus a "Xóa tất cả" button

#### Scenario: Remove a single chip

- **WHEN** the authenticated user clicks the removal "x" on the `roleFilter = 'created'` chip
- **THEN** `roleFilter` is removed from `params` (defaults back to `both`), the URL drops the `roleFilter` parameter, and the timeline re-fetches without that filter

#### Scenario: Xóa tất cả resets everything

- **WHEN** the authenticated user clicks "Xóa tất cả"
- **THEN** every filter dimension (`dateFrom`, `dateTo`, `types`, `statuses`, `roleFilter`, `search`) is removed from `params`, `page` resets to 1, `limit` is preserved, and the URL becomes the clean default

### Requirement: URL state synchronization

The page SHALL use `useSearchParams` from `react-router-dom` as the single source of truth for `MyHistoryParams`. Every filter change SHALL update the URL, and every page render SHALL derive `params` from the current URL via `useMemo`. Default values (`dateFrom = today minus 30 days`, no `types`, no `statuses`, `roleFilter = 'both'`, `page = 1`, `limit = 20`) SHALL be stripped from the serialized URL so that the canonical "no filters" view has an empty query string. When every entity type in a group is selected, the URL SHALL serialize the group as `groups=<group name>` rather than enumerating each entity type; the page SHALL expand `groups` back into entity types before calling the API.

#### Scenario: Filter change updates URL

- **WHEN** the authenticated user toggles the `Nhiệm vụ` group pill on
- **THEN** the URL becomes `/my-history?groups=Nhi%E1%BB%87m%20v%E1%BB%A5` (or equivalent serialization) without reloading the page

#### Scenario: Pasting a URL restores filters

- **WHEN** an authenticated user opens `/my-history?dateFrom=2026-01-01&types=task&roleFilter=created`
- **THEN** the page renders with `params = { dateFrom: '2026-01-01', types: ['task'], roleFilter: 'created' }`, the corresponding chips appear in the active-filter bar, and the timeline fetches with those exact parameters

#### Scenario: Default state produces clean URL

- **WHEN** the authenticated user lands on `/my-history` with no query string and applies no filters
- **THEN** the URL remains `/my-history` even though the API request includes `dateFrom` set to today minus 30 days

#### Scenario: Browser back restores prior filter

- **WHEN** the authenticated user applies a filter, navigates away to another route, then clicks Browser Back
- **THEN** the page restores the filter from the URL and the timeline renders the same view

### Requirement: Debounced search

The search input SHALL be a controlled `<input>` that updates `params.search` 300 ms after the user stops typing. A submit button or form-submit code path SHALL NOT exist. While the input value differs from the debounced value, a small spinner SHALL be rendered inside the search field's icon position. Clearing the input SHALL clear `params.search` immediately (no debounce delay).

#### Scenario: Typing triggers query after delay

- **WHEN** the authenticated user types the characters `NCC` into the search input and stops typing
- **THEN** 300 ms after the last keystroke, the URL updates to include `search=NCC`, the timeline re-fetches with `params.search = 'NCC'`, and the spinner disappears

#### Scenario: Spinner visible during debounce

- **WHEN** the authenticated user is actively typing in the search input and the typed value has not yet been committed to `params.search`
- **THEN** the search icon area renders a spinner indicating the upcoming query

#### Scenario: Clear search clears immediately

- **WHEN** the authenticated user clears the search input (sets it to the empty string)
- **THEN** `params.search` is cleared synchronously, the URL drops the `search` parameter on the same tick, and the timeline re-fetches without a search filter

### Requirement: Sticky filter bar and mobile bottom-sheet drawer

On viewports at or above 768 px the filter bar SHALL apply `position: sticky; top: 0` with a backdrop blur and a `z-index` sufficient to overlay timeline rows; only the search input, group pills, and primary controls SHALL stay pinned (the expanded "Bộ lọc" panel drops below). On viewports below 768 px the inline filter bar SHALL be replaced with a single "Bộ lọc" button bearing an active-filter count badge; tapping it SHALL open a bottom-sheet drawer (`fixed inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl`) containing the search, sub-chips, status chips, role toggle, date picker, and an "Áp dụng" button that closes the drawer. The drawer SHALL close on backdrop click and on a downward swipe gesture on the drawer header (no animation library required).

#### Scenario: Sticky behavior on desktop scroll

- **WHEN** the authenticated user on a 1280 px viewport scrolls 500 px down the timeline
- **THEN** the filter bar remains pinned at the top of the viewport and the timeline content scrolls beneath it without overlapping any focus rings

#### Scenario: Drawer opens on mobile

- **WHEN** the authenticated user on a 375 px viewport taps the "Bộ lọc" button
- **THEN** a bottom-sheet drawer slides up containing the same filter controls, with focus moved to the drawer's close button on open

#### Scenario: Active filter count badge

- **WHEN** the authenticated user has two filters applied on a 375 px viewport
- **THEN** the "Bộ lọc" mobile trigger renders a "2" count badge

### Requirement: Summary stats card

The page SHALL render a stats card above the timeline containing three numeric tiles: "Tổng hoạt động" (the value of `data.total` from the current response), "Tuần này" (the count of items in `data.items` whose `createdAt` is on or after the most recent Monday 00:00 local time), and "Chờ xử lý" (the count of items in `data.items` whose `status` maps to "Chờ duyệt", "Đang xử lý", or "Mới tạo"). A footnote on the card SHALL clarify that "Tuần này" and "Chờ xử lý" are computed from the items on the current page only.

#### Scenario: Stats reflect current response

- **WHEN** the API returns `data.total = 42` and `data.items` contains 5 items dated within the current week, 2 of which have a pending status
- **THEN** the card renders 42 / 5 / 2 in the three tiles, with the "trên trang hiện tại" footnote visible

#### Scenario: Stats update when filters change

- **WHEN** the authenticated user changes a filter that narrows the result to 0 items
- **THEN** the card renders 0 / 0 / 0 with no errors

### Requirement: Empty state with recovery CTAs

When the API returns `data.total === 0`, the timeline SHALL render an empty-state block instead of pagination controls. The block SHALL contain an icon, a heading, and a diagnostic message that differs based on whether any non-default filter is currently active. When no non-default filters are active (only the default 30-day window), the message SHALL read "Chưa có hoạt động nào trong 30 ngày qua" and a single CTA button labelled "Mở rộng 1 năm" SHALL set `dateFrom` to today minus 365 days. When at least one non-default filter is active, the message SHALL read "Không có hoạt động nào khớp bộ lọc" and two CTA buttons SHALL be rendered: "Mở rộng thời gian (1 năm)" (sets `dateFrom` to today minus 365 days) and "Xóa bộ lọc" (clears every filter dimension). If `data.total > 0` but the current page index has no items (because filters narrowed the result after a prior page-change), the page SHALL snap `params.page` back to 1 instead of rendering the empty state.

#### Scenario: No data, no filters

- **WHEN** the authenticated user has no filters applied and the API returns `data.total === 0`
- **THEN** the empty-state block renders "Chưa có hoạt động nào trong 30 ngày qua" with a single "Mở rộng 1 năm" CTA

#### Scenario: Filtered to zero

- **WHEN** the authenticated user has `params.types = ['task']` and `params.search = 'XYZ123'` and the API returns `data.total === 0`
- **THEN** the empty-state block renders "Không có hoạt động nào khớp bộ lọc" with both "Mở rộng thời gian (1 năm)" and "Xóa bộ lọc" CTAs

#### Scenario: Out-of-range page snaps back

- **WHEN** the authenticated user is on `page = 5` and changes a filter that reduces `totalPages` to 2
- **THEN** the page sets `params.page = 1` and re-fetches; the empty-state block is not rendered

### Requirement: Day-group collapse for long days

Each day-group whose item count exceeds 5 SHALL render only the first 5 items and a button labelled "Xem thêm N hoạt động" (where N is the count of remaining items in that day). Clicking the button SHALL expand the day inline to show every item; the expanded state SHALL be tracked per-day in a local `Set<dayKey>` within the timeline component and SHALL reset whenever the underlying items collection changes (e.g., after a filter change or page change).

#### Scenario: Long day collapses by default

- **WHEN** a day-group contains 12 items
- **THEN** the timeline renders the first 5 items followed by a "Xem thêm 7 hoạt động" button

#### Scenario: Expand reveals remaining items

- **WHEN** the authenticated user clicks "Xem thêm 7 hoạt động" on a day with 12 items
- **THEN** all 12 items render and the button is replaced with "Thu gọn" or hidden

#### Scenario: Filter change resets expansion

- **WHEN** the authenticated user has expanded several days and then changes any filter
- **THEN** the expansion `Set` is cleared and every day-group with more than 5 items renders in collapsed form on the next render

### Requirement: Accessibility and keyboard navigation

Every interactive filter chip, group pill, and active-filter chip SHALL be a `<button type="button">` element with appropriate ARIA attributes: toggle chips SHALL set `aria-pressed`, expandable group containers SHALL set `aria-expanded` and `aria-controls` referencing the sub-chip container's `id`, and active-filter removal buttons SHALL set `aria-label="Xóa bộ lọc: <chip text>"`. The detail modal SHALL trap keyboard focus while open: focus SHALL move to the modal's close button on open, `Tab` and `Shift+Tab` SHALL cycle through interactive elements inside the modal only, `Escape` SHALL close the modal, and on close focus SHALL return to the `MyHistoryItem` button that opened it. Timeline rows SHALL be focusable and SHALL declare `scroll-margin-top` equal to the sticky filter bar height so the browser scrolls focused rows out from behind the sticky bar.

#### Scenario: Keyboard activates a group pill

- **WHEN** the authenticated user tabs focus onto the `Nhiệm vụ` group pill and presses `Enter` or `Space`
- **THEN** the pill toggles its selection state, updates `aria-pressed`, and the URL/timeline reflect the change

#### Scenario: Escape closes the modal

- **WHEN** the detail modal is open and the authenticated user presses `Escape`
- **THEN** the modal closes and focus returns to the `MyHistoryItem` button that opened it

#### Scenario: Focus trap inside modal

- **WHEN** the detail modal is open and the authenticated user presses `Tab` repeatedly past the last interactive element
- **THEN** focus wraps to the first interactive element inside the modal (not to elements outside the modal)

#### Scenario: Sticky bar does not hide focused row

- **WHEN** the authenticated user navigates the timeline with `Tab` and a focused row would otherwise be hidden behind the sticky filter bar
- **THEN** the browser scrolls the focused row downward by at least the filter bar's height so the row is fully visible
