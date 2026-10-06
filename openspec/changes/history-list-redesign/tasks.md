# Tasks — history-list-redesign

## 1. Header + rail scaffold (1C)

- [x] 1.1 Grid `260px rail | 1fr` trong `MyHistory.tsx` (rail sticky, collapse <1024px); header gọn 1 hàng search + preset 7/30/90/1 năm/Tất cả (TatCa xóa hẳn dateFrom/dateTo)
- [x] 1.2 Tách `MyHistoryFilters.tsx` → `FilterRail` (desktop sticky) + gọn `MobileFilterDrawer` (65vh, search trong header) ← (verify: preset Tât cả không để lại dateTo/dateFrom rò, sync custom inputs)
- [x] 1.3 `GroupPills` 1 hàng + badge + `TECH_PILLS` dropdown `⋯ Lọc nhanh` (YCKT/YCSC/YCCC/YCMH/Kho)

## 2. Chips + summary + empty (1C)

- [x] 2.1 `ActiveFilterChips` 1 dòng `overflow-x + "+N" collapse` (click +N mở popover, không wrap 3 dòng)
- [x] 2.2 `MyHistorySummaryCard` clickable: `Chờ xử lý` → set pending statuses, `Tuần này` → preset 7 ngày; đếm từ `data.pendingCount/weekCount` (fallback computeStats)
- [x] 2.3 Empty state: illustration + heading/CTA theo `hasNonDefaultFilters` (có filter → “Mở rộng 1 năm / Xóa lọc”; trống thật → “Thử 7/30 ngày?”)

## 3. Timeline compact (1C) + verify (1B)

- [x] 3.1 `MyHistoryTimeline` + `MyHistoryItem` nhịp `p-2.5 gap-2`, meta 1 dòng `code · status · role · time` + badge `STATUS_COLOR`, giữ dot `GROUP_DOT_COLOR`; date rail sticky trái (w-24)
- [x] 3.2 Verify: `frontend tsc -p tsconfig.app.json` 0 lỗi, `backend tsc` 0 lỗi; manual: tìm kiếm, lọc nhóm/sub-type/status/role/date, share URL, back/refresh giữ filter, mobile drawer, click card → native modal YCKT/YCSC/YCCC/YCBS/YCMH/kho ← (verify: 6 entity types mở đúng native view, filter + URL round-trip, chips collapse, empty CTAs)
