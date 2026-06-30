## Why

The `/my-history` page ships every authenticated user's cross-entity timeline, but the current UI/UX makes filtering and scanning painfully slow. Users only get five coarse "group" toggles (Yêu cầu / Nhiệm vụ / ...) even though the backend already accepts ~25 specific `entityType` values; the status filter is single-select even though the API takes `statuses[]`; the group-count badges look clickable but are inert; there is no visible feedback for what's filtered; filter state evaporates on refresh because nothing is persisted in the URL; search requires a form submit; the empty state is a dead end; and the layout doesn't scale to mobile. The redesign turns the page from a passive list into a real search-and-scan tool that surfaces the backend's full capability.

## What Changes

- **Granular entity-type filtering** — each group expands into selectable sub-chips for every entity type it covers; users can target "Yêu cầu báo giá" or "Phiếu xuất kho" specifically instead of toggling 5–10 entity types at once.
- **Clickable group-count pills** — the count badges below the page header become toggles that select/deselect all entity types in a group.
- **Multi-select status filter** — the single-status `<select>` becomes a multi-chip filter that covers both Vietnamese-encoded statuses (`CHO_DUYET`, `DA_DUYET`, `HOAN_THANH`, `DA_HUY`, `DANG_XU_LY`, `MOI_TAO`, `TU_CHOI`) and English (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `APPROVED`, `REJECTED`, `CANCELLED`).
- **Active filter chips bar** — when any non-default filter is applied, a horizontal chip row appears under the page header; each chip removes a single filter dimension and a "Xóa tất cả" button resets everything.
- **URL state synchronization** — filter parameters serialize to/deserialize from the URL query string; default values are omitted; refreshing or sharing the link preserves the view.
- **Debounced search** — the search input fires a query 300 ms after the user stops typing instead of requiring submit; the icon shows a spinner during the debounce window.
- **Sticky filter bar on desktop, bottom-sheet drawer on mobile** — the filter region pins to the top of the viewport on desktop scroll; on screens < 768 px it collapses into a "Bộ lọc" trigger that opens a bottom sheet.
- **Summary stats card** — three quick stats above the timeline (Tổng hoạt động, Tuần này, Chờ xử lý) recalculate as filters change.
- **Improved empty state with CTAs** — instead of a flat "Không có hoạt động", the empty state diagnoses the cause (no data vs. filtered out) and offers "Mở rộng thời gian (1 năm)" and "Xóa bộ lọc" buttons.
- **Default range shortened to 30 days** — initial load defaults to last 30 days (was 90) to reduce server work; the preset detector matches accordingly.
- **Day-group collapse** — any day with more than 5 items shows the top 5 and a "Xem thêm N hoạt động" button that reveals the rest.
- **Accessibility improvements** — all filter chips become `<button>` with `aria-pressed`; the timeline rows gain logical tab order; the detail modal traps focus and returns it to the originating row on close; Escape closes the modal.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities
- `my-history`: Adds new requirements for the redesigned frontend timeline page (sub-category filtering, clickable group pills, multi-select status, active filter chips, URL state sync, debounced search, sticky/drawer layout, summary stats, improved empty state, day-group collapse, accessibility). The existing "Frontend timeline page and quick action" requirement is replaced by a more specific contract; backend requirements (endpoint shape, permission model, partial-failure handling, route hints) are unchanged.

## Impact

Affected code (frontend only):
- `frontend/src/pages/MyHistory.tsx` — page layout, URL state sync, summary stats card, active filter chips bar
- `frontend/src/components/MyHistoryFilters.tsx` — sub-chips, multi-select status, debounced search, sticky behavior, mobile drawer
- `frontend/src/components/MyHistoryTimeline.tsx` — empty-state CTAs, day-group collapse, improved skeleton
- `frontend/src/components/MyHistoryItem.tsx` — full date label, refined role/status badges
- `frontend/src/components/MyHistoryDetailModal.tsx` — focus trap, Escape handling, return focus on close

Unchanged:
- `frontend/src/hooks/useMyHistory.ts`, `frontend/src/services/myHistoryService.ts` — TanStack Query hook and `MyHistoryParams` shape stay as-is; everything new is composed from the same params.
- Backend: `backend/src/routes/myHistoryRoutes.ts`, `backend/src/services/myHistoryService.ts`, controller — no changes. The redesign only surfaces filtering capabilities the API already supports.

Dependencies: no new packages. Uses existing `react-router-dom` for URL state, existing TanStack Query, existing `lucide-react` icons, and Tailwind utilities already in the project. No animation library.
