## 1. Filter improvements (frontend/src/components/MyHistoryFilters.tsx)

- [x] 1.1 Remove form submit code path; convert search input into a controlled `<input>` driven by a local `useDebouncedValue(search, 300)` helper co-located in the file (~8 lines)
- [x] 1.2 Render a spinner inside the search icon position whenever `input value !== debounced value`; clear the input clears `params.search` synchronously
- [x] 1.3 Replace the single-status `<select>` with a wrapped row of toggleable status chips backed by a label-to-codes map covering CHO_DUYET/PENDING, DA_DUYET/APPROVED, HOAN_THANH/COMPLETED, DA_HUY/CANCELLED, DANG_XU_LY/IN_PROGRESS, MOI_TAO, and TU_CHOI/REJECTED; each chip is a `<button type="button" aria-pressed={...}>` that toggles every code its label covers into `params.statuses`
- [x] 1.4 Render any raw status code not covered by a label as a tail chip at the bottom of the status row so nothing is silently dropped
- [x] 1.5 Add per-group sub-chip rows derived from `GROUP_TO_ENTITY_TYPES`; each group becomes expandable via an "expand" button with `aria-expanded` and `aria-controls`; sub-chip pressed state derives from `params.types.includes(entityType)`
- [x] 1.6 Make the existing group-count pills `<button type="button" aria-pressed={...}>` and wire click to toggle every entity type in the group (all-or-nothing replacement)
- [x] 1.7 Render a "partial" indicator dot on a group pill when at least one — but not all — of the group's entity types is in `params.types` ← (verify: pill states (off/partial/on) match `params.types` exactly across all 5 groups; aria-pressed reflects the same)

## 2. State & URL synchronization (frontend/src/pages/MyHistory.tsx)

- [x] 2.1 Co-locate `urlFilterSync` helpers (parse `URLSearchParams` → `MyHistoryParams` and serialize back, stripping defaults) at the top of `MyHistory.tsx`
- [x] 2.2 Replace `useState<MyHistoryParams>` with `useSearchParams()` + `useMemo(params, [searchParams])`; every filter callback in the page writes via `setSearchParams`
- [x] 2.3 In the serializer, collapse a fully-selected group into `groups=<group name>`; in the parser, expand `groups` back into `params.types` before calling the API
- [x] 2.4 Implement `getDefaultDateFrom()` returning today minus 30 days; apply it inside the parser so the API call always has `dateFrom` even when the URL is clean
- [x] 2.5 Update the preset detector to treat a (30 ± 1) day range as the "30 ngày" preset so the UI reflects the new default
- [x] 2.6 Add an `ActiveFilterChips` block rendered directly under the page header; compute the chip list inside `render` from `params` (date range chip, group chips, sub-type chips, status label chips, role chip, search chip)
- [x] 2.7 Each chip is a `<button>` with `aria-label="Xóa bộ lọc: <chip text>"` whose `onClick` removes that single dimension via `setSearchParams`; a "Xóa tất cả" button clears every dimension and snaps `page` to 1
- [x] 2.8 After applying a filter change, snap `params.page` back to 1 if the current page index would be empty (i.e., `data.total > 0 && data.items.length === 0`) ← (verify: round-trip URL parsing matches exactly across all filter dimensions; back/forward in the browser restores filters; default state produces a clean URL)

## 3. Layout, summary stats, empty state, day collapse

- [x] 3.1 Add sticky behavior to the filter bar on viewports ≥ 768 px (`position: sticky; top: 0; z-index: 10` + backdrop blur); add `scroll-margin-top` equal to the bar height on timeline rows
- [x] 3.2 Below 768 px, collapse the inline filter bar into a single "Bộ lọc" trigger button with a count badge reflecting the number of active non-default filters
- [x] 3.3 Implement a bottom-sheet drawer (`fixed inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl`) that mounts the same filter controls plus an "Áp dụng" close button; close on backdrop click and on swipe-down via a `touchstart/touchend` Y-delta handler attached only to the drawer header
- [x] 3.4 Add a `MyHistorySummaryCard` rendered above the timeline showing "Tổng hoạt động" (`data.total`), "Tuần này" (count of `data.items` with `createdAt >= startOfWeek(today, Monday)`), and "Chờ xử lý" (count of items whose status maps to "Chờ duyệt" / "Đang xử lý" / "Mới tạo"); footer note "trên trang hiện tại"
- [x] 3.5 Update the empty state in `MyHistoryTimeline.tsx` to branch on whether non-default filters are active: "Chưa có hoạt động nào trong 30 ngày qua" + "Mở rộng 1 năm" CTA when no filters; "Không có hoạt động nào khớp bộ lọc" + "Mở rộng thời gian (1 năm)" and "Xóa bộ lọc" CTAs when filters are active
- [x] 3.6 Add day-group collapse logic in `MyHistoryTimeline.tsx`: when a day-group has more than 5 items, render the first 5 plus a "Xem thêm N hoạt động" button; track per-day expansion in a `Set<dayKey>` local state that resets whenever `data.items` reference changes
- [x] 3.7 Update `MyHistoryItem.tsx` to render the full date label (`DD/MM/YYYY HH:mm`) instead of time-only, and refine role/status badges using the project's UI DNA palette ← (verify: stats card numbers add up correctly across edge cases; empty-state branches match the two diagnostic cases; mobile drawer opens/closes via backdrop, button, and swipe)

## 4. Detail modal, accessibility, and verification

- [x] 4.1 Add a `useFocusTrap` hook (~25 lines, co-located in `MyHistoryDetailModal.tsx`) that focuses the close button on open, cycles `Tab` / `Shift+Tab` within the modal, and closes on `Escape`
- [x] 4.2 On modal close, return focus to the originating `MyHistoryItem` button (the page tracks `lastClickedItemRef`)
- [x] 4.3 Audit tab order across the page: skip-to-content → page header → search → preset row → group pills → "Bộ lọc" expand → status chips → role toggle → active-filter chips bar → timeline rows → pagination
- [x] 4.4 Ensure every filter/chip/pill is `<button type="button">` with appropriate `aria-pressed` / `aria-expanded` / `aria-controls` / `aria-label` attributes
- [x] 4.5 Run `cd frontend && npx tsc --noEmit` and resolve every error
- [x] 4.6 Run `cd frontend && npm run lint` and resolve every warning introduced by this change ← (verify: keyboard-only navigation reaches every interactive control in logical order; Escape closes the modal and returns focus to the row; tsc and lint both pass with zero new errors/warnings)
