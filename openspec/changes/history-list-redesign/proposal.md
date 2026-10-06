# Proposal — history-list-redesign

## Why

My History list hiện 1 cột dài, filter sticky chiếm ~40vh trước khi thấy dòng đầu, chip bar wrap 3 dòng, card thưa (`p-3` + gap lớn) — lướt 20 dòng đã mỏi dù per-entity detail vừa đúng native (YCKT/YCSC/YCCC/YCBS/YCMH đã route). Cần tái bố cục để “đọc nhanh như inbox” mà không thêm tab/KPI/chart hay đổi API.

## What Changes

- **MyHistory.tsx**: grid `260px` filter rail sticky trái | content phải (responsive: rail collapse <1024px); header gọn (search + preset 7/30/90/1 năm/Tất cả 1 hàng); `GroupPills` 1 hàng gọn + count badge; `TECH_PILLS` thành dropdown; `ActiveFilterChips` 1 dòng `overflow-x + "+N" collapse`; `MyHistorySummaryCard` clickable (`Chờ xử lý` → lọc pending) đếm từ BE `pendingCount/weekCount`; `MyHistoryTimeline` card compact `p-2.5` meta 1 dòng badge đúng `STATUS_COLOR` + date rail sticky trái; empty state illustration + 2 CTA theo `hasNonDefaultFilters`.
- **MyHistoryFilters.tsx**: tách `FilterRail` (desktop sticky) + giữ `MobileFilterDrawer` tinh gọn (65vh, search trong header), preset `Tất cả` xóa date thật, sync `customFrom/customTo`.
- **MyHistoryTimeline.tsx + MyHistoryItem.tsx**: nhịp `gap-3→gap-2`, mật độ compact, meta 1 dòng, giữ `GROUP_DOT_COLOR`.
- **Không thêm** tab/KPI/chart hay endpoint mới; không đụng `HistoryEntityDetailModal` (đã xong per-entity).

## Capabilities

### New Capabilities
<!-- pure frontend layout refactor — no new spec capability; skip_specs=true -->

### Modified Capabilities
<!-- improves existing my-history presentation — no requirement change -->

## Impact

- `frontend/src/pages/MyHistory.tsx`
- `frontend/src/components/MyHistoryFilters.tsx` (tách FilterRail)
- `frontend/src/components/MyHistoryTimeline.tsx`, `MyHistoryItem.tsx`
- `frontend/src/components/myHistoryUtils.ts` (nếu cần nhịp/label)
- `openspec/ui-dna.md` (nhịp compact)
- Không đổi Prisma, BE endpoint, ROUTE_MAP, RBAC.

## Out of Scope

- Thêm tab/KPI/chart hay dashboard mới.
- Đổi Prisma schema / migration / endpoint mới.
- Đổi logic RBAC/ABAC của My History.
- Đổi `HistoryEntityDetailModal` per-entity (đã xong ở history-per-entity-detail).

## Risks

- Filter rail đổi touch target/axe — Mitigation: giữ `aria-pressed/mixed`, focus trap cũ, `useFocusTrap` không đổi.
- Card compact làm badge/status mờ — Mitigation: giữ `STATUS_COLOR` central, test contrast WCAG AA trên chip.
