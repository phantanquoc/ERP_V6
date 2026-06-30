## Context

`/my-history` aggregates ~25 entity types into one timeline. The backend (`backend/src/services/myHistoryService.ts`, ~870 lines) already supports rich filtering via `MyHistoryParams`: `dateFrom/dateTo`, `types[]` (per-entityType), `statuses[]` (multi), `roleFilter`, `search`, `page`, `limit`. The current frontend uses only a fraction of that — single-status `<select>`, group-level toggles that bundle 5–10 entity types each, no URL state, no debounced search, no active-filter feedback, inert count badges, and a default 90-day window that ships ~500 items in the worst case.

Stakeholders: every authenticated EMPLOYEE on the platform (primary), DEPARTMENT_HEAD and ADMIN when viewing reports (secondary via `useUserHistory`). The page is the single landing point for "what did I do recently?" and the only place the spec name `my-history` is exposed end-to-end.

Constraints:
- Backend is frozen for this change — only the frontend changes.
- Tech stack is fixed: React 18, TanStack Query v5, react-router-dom, Tailwind, lucide-react. No new dependencies.
- All user-facing strings remain Vietnamese; code/identifiers remain English.
- Existing `MyHistoryParams` shape must not change; new behavior must compose from current params.
- The UI must work down to ~360 px viewport and read well on dense desktops.

## Goals / Non-Goals

**Goals:**
- Surface every backend filter capability that exists today (per-entity types, multi-status, role) without API changes.
- Replace passive read-only state with an interactive control surface: clickable group pills, removable filter chips, expandable sub-category chip groups.
- Make filter state durable (URL) and shareable.
- Make scanning quick: summary stats, day-group collapse, full date label per item, clearer empty state with recovery paths.
- Reach WCAG 2.1 AA basics for the page: keyboard navigation, `aria-pressed` for toggles, focus trap in the modal, visible focus rings.
- Match the project's UI DNA: cool neutrals, blue primary, moderate radii, compact 8 px rhythm, progressive disclosure.

**Non-Goals:**
- No backend changes (`myHistoryService.ts`, routes, controller, Prisma schema).
- No new data sources or new entity types in history.
- No saved-views / pinned-items / export / print features.
- No animation library; only Tailwind transitions.
- No virtualization or windowing of the timeline list; current page sizes (≤ 100) don't justify it.
- No internationalization beyond Vietnamese.
- No analytics instrumentation for filter usage (out of scope for this redesign).

## Decisions

### 1. URL is the source of truth for filter state

Use `useSearchParams` from `react-router-dom` as the single source of truth for `MyHistoryParams`. A small adapter module (`urlFilterSync` helpers, co-located in `pages/MyHistory.tsx`) converts back and forth between `MyHistoryParams` and `URLSearchParams`. Defaults (`dateFrom=last 30 days`, no `types`, no `statuses`, `roleFilter=both`, `page=1`, `limit=20`) are stripped from the URL so the canonical "no filters" view is a clean URL.

**Alternative considered:** keep local `useState` in `MyHistory.tsx` and add a manual `replaceState` side-effect. Rejected because round-trip parsing has to live somewhere, and `useSearchParams` already gives us reactive reads; centralizing state in the URL also makes browser back/forward Just Work.

**Rationale:** `react-router-dom` is already in the bundle; no extra deps. Avoids a `useState`-vs-URL race after reload.

### 2. Sub-category chips are derived, not stored

The page does not introduce a new "selected sub-types" state field. The existing `params.types: string[]` already lists entity types. Group-level toggle logic stays the same as today (`GROUP_TO_ENTITY_TYPES`). When sub-chips are shown, each chip's pressed state is computed from `params.types.includes(entityType)`.

**Alternative considered:** model selection as `Set<{group, entityType}>` and project to `types[]` on submit. Rejected — it duplicates state and creates synchronization bugs when filters land via URL.

### 3. Group pill state is derived from `types[]`

A group is "active" when every entity type in `GROUP_TO_ENTITY_TYPES[group]` is in `params.types`. A group is "partial" when at least one (but not all) of its entity types is in `params.types`. Clicking a group pill toggles between "all of this group present" and "none of this group present" (current behavior in `MyHistoryFilters.tsx`). Partial state is shown with a small dot indicator. This rule covers both the top group-count pills and the expandable group chips inside the filter panel.

### 4. Multi-select status uses a chip list, not a `<select multiple>`

Status options become a wrapped row of toggleable chips inside the filter panel. The full status set is the union of Vietnamese codes (`CHO_DUYET`, `DA_DUYET`, `HOAN_THANH`, `DA_HUY`, `DANG_XU_LY`, `MOI_TAO`, `TU_CHOI`) and English (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `APPROVED`, `REJECTED`, `CANCELLED`). A label-to-codes map groups semantically equivalent statuses (e.g., "Chờ duyệt" → `['CHO_DUYET', 'PENDING']`, "Đã duyệt" → `['DA_DUYET', 'APPROVED']`, "Hoàn thành" → `['HOAN_THANH', 'COMPLETED']`, "Đã hủy" → `['DA_HUY', 'CANCELLED']`, "Đang xử lý" → `['DANG_XU_LY', 'IN_PROGRESS']`, "Mới tạo" → `['MOI_TAO']`, "Từ chối" → `['TU_CHOI', 'REJECTED']`). Selecting one user-facing status emits multiple raw codes into `params.statuses` so it matches whichever convention each entity uses.

**Alternative considered:** Two separate filter columns (Vietnamese vs English). Rejected — users don't care which codes the backend stores, and exposing both would clutter the UI.

### 5. Debounced search is the new default; no submit button

`MyHistoryFilters` exposes search as a controlled `<input>` with a `useDebouncedValue(search, 300)` hook (helper co-located in the component, ~8 lines). When the debounced value changes, the page's URL `search` param updates, which re-triggers the TanStack Query. The form-submit code path is removed.

While the user is mid-type (input value !== debounced value), the search icon shows a small spinner. Clearing the input clears the URL param immediately.

### 6. Active filter chips are computed on render

There is no "list of active chips" state. Each filter dimension is checked and pushed into a chips array at render time:
- `dateFrom`/`dateTo` → one chip "Từ DD/MM/YYYY đến DD/MM/YYYY" (or "30 ngày qua" if preset detected)
- Each group with all entity types selected → one chip per group
- Each sub-category not part of a fully-selected group → one chip per entity type
- Each status code group with at least one selected → one chip per logical status
- `roleFilter=created` → chip "Tôi tạo"; `roleFilter=related` → chip "Liên quan đến tôi"
- `search` → chip with the search term

Each chip's "x" removes the corresponding dimension from `params` and updates the URL. "Xóa tất cả" resets every param except `limit`.

### 7. Sticky filter bar with mobile drawer

Desktop (≥ 768 px): filter bar uses `position: sticky; top: 0; z-index: 10` with a backdrop blur. The expanded panel still drops below the bar; only the search + main controls remain pinned.

Mobile (< 768 px): the inline filter bar collapses to a single "Bộ lọc" button (with a count badge for active filters). Tapping it opens a bottom-sheet drawer (`fixed inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl`). The drawer contains everything currently in the expanded filter panel plus an "Áp dụng" button to close. Close on backdrop click or swipe-down via touch handler (no library — basic `touchstart/touchend` Y-delta).

### 8. Summary stats are computed client-side from the current `data.items`

The stats card shows three numbers:
- **Tổng hoạt động** — `data.total` (already in payload)
- **Tuần này** — count of `data.items` with `createdAt >= startOfWeek(today)` (Monday start)
- **Chờ xử lý** — count of `data.items` with `status` mapping to "Chờ duyệt" or "Mới tạo" or "Đang xử lý" or "Pending" / "In progress"

"Tuần này" and "Chờ xử lý" are window-limited (only the current page of items), and we accept that: the card is a quick-scan signal, not a global aggregate. A footnote in the card clarifies "trên trang hiện tại" for those two metrics.

**Alternative considered:** Compute over all pages. Rejected — would require either a separate aggregate endpoint (out of scope) or fetching all pages (defeats pagination).

### 9. Empty state distinguishes "no data" vs "filtered out"

If `data.total === 0` and no filters are active beyond the default date → message "Chưa có hoạt động nào trong 30 ngày qua". CTA: "Mở rộng 1 năm" (sets `dateFrom=365 days ago`).

If `data.total === 0` but filters are active → message "Không có hoạt động nào khớp bộ lọc". CTAs: "Mở rộng thời gian (1 năm)" and "Xóa bộ lọc".

If `data.total > 0` but the current `page` is out of range (rare, but happens after a filter narrows the result set) → don't show empty state; instead snap `page` back to 1.

### 10. Day-group collapse threshold = 5

Each day's group with > 5 items shows the first 5 and a "Xem thêm N hoạt động" button. Clicking expands inline (per-day local state with a `Set<dayKey>` in the timeline component). Collapsed state resets when items/filters change.

### 11. Default date range: 30 days

`getDefaultDateFrom()` returns today minus 30 days. The preset detector in `MyHistoryFilters` treats a (30 ± 1) day range as the "30 ngày" preset. Initial URL is clean (defaults stripped); but on first paint we set `params.dateFrom` so the API call uses 30 days.

### 12. Accessibility

- Every filter chip becomes `<button type="button" aria-pressed={active}>`. Group expansion toggles use `aria-expanded` and link to the sub-chip container via `aria-controls`.
- Active filter chips' "x" buttons get `aria-label="Xóa bộ lọc: <chip text>"`.
- Tab order: skip-to-content (existing nav) → page header → search → preset row → group pills → "Bộ lọc" expand → status chips → role toggle → active filter chips bar → timeline rows → pagination.
- Detail modal: focus moves to the close button on open; Tab/Shift+Tab cycles within the modal; Escape closes; on close, focus returns to the originating `MyHistoryItem` button. Implemented with a tiny `useFocusTrap` hook (~25 lines, no library).
- Mobile drawer: same focus trap; "Đóng" button receives initial focus.

## Risks / Trade-offs

- **URL serialization length** → many `types[]` entries make the URL long. Mitigation: when every entity type in a group is selected, serialize as `groups=Nhiệm vụ` instead of listing each entity type. The page expands `groups` back to entity types on parse before calling the API.
- **"Tuần này" / "Chờ xử lý" stats are page-scoped** → users may misread them as global. Mitigation: card footer explicitly says "trên trang hiện tại". Acceptable for a quick-scan stat.
- **Status code duplication (VN + EN)** → a single user-facing status maps to multiple backend codes. Mitigation: the mapping table is the single source of truth; statuses that don't fit any known label (e.g., uncommon `trangThai` strings from one entity) still appear under their raw code at the bottom of the status list, so nothing is silently dropped.
- **Sticky bar overlaying focus rings** → the sticky filter bar must not cover the focused row at the top of the timeline. Mitigation: add `scroll-margin-top` to timeline rows equal to the filter bar height; on focus, the browser scrolls correctly.
- **Mobile drawer touch handling** → naive swipe close can interfere with the inner scroll. Mitigation: only attach the swipe-down handler to the drawer header, not the body.
- **State reconciliation between URL and `useState` defaults** → first render must read URL params; default `dateFrom` only applies when URL has none. Mitigation: derive params on every render via `useMemo(params, [searchParams])`; never store a separate copy in `useState`.

## Migration Plan

No data migration. Code-only change:

1. Ship the new components/page in one PR.
2. Existing route `/my-history` continues to work; bookmarks to the old (parameter-less) URL still load the default view.
3. Old bookmarks containing `params` (none expected — nothing was URL-serialized before) are ignored gracefully because parse is permissive.

No backwards-compat shims required.

Rollback: revert the PR. Backend untouched, so no DB state change.

## Open Questions

None. All decisions above are made.
