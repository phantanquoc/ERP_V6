# Design — history-list-redesign

## Context

`MyHistory` đã đúng ở layer detail (per-entity native modals: YCKT/YCSC via RepairRequestFormModal, YCCC via SupplyRequestDetailModal, YCBS via ReplenishmentDetailModal, YCMH via PurchaseRequestDetailModal, đã có backend pendingCount/weekCount). Phần còn rối là **list**: 1 cột dài, filter sticky ~40vh trước dòng đầu, chip bar wrap 3 dòng, card thưa, summary không click. Mobile bottom-sheet 85vh.

## Goals / Non-Goals

**Goals:**
- Đọc nhanh như inbox: header gọn, filter rail trái sticky, chips 1 dòng collapse, card compact.
- Summary clickable, đếm từ BE.
- Date rail sticky trái, empty có CTA đúng context.
- Không thêm tab/KPI/chart, không đổi API/Prisma/RBAC, không đụng HistoryEntityDetailModal.

**Non-Goals:**
- Dashboard/KPI/chart mới; endpoint mới; đổi permission; full rebuild design system.

## Decisions

- **Layout:** desktop `grid [260px rail | 1fr content]` với rail `position: sticky top-16 self-start`. <1024px rail collapse thành top bar (giữ Mobile bottom-sheet cho <768px).
- **Header gọn:** 1 hàng `search (flex-1) + preset seg 7/30/90/1 năm/Tất cả + pills 5 nhóm (badge count)`. TECH_PILLS (YCKT/YCSC/YCCC/YCMH/Kho) thành dropdown `⋯ Lọc nhanh`.
- **Chips:** `flex-nowrap overflow-x-auto + "+N"` (đếm phần ẩn) thay vì wrap 3 dòng; click `+N` mở popover chips.
- **Summary:** 3 tiles giữ nguyên nhưng `onClick Chờ xử lý → set statuses = codes của "Chờ xử lý/Đang xử lý/Chờ duyệt/Mới tạo"`, `Tuần này → preset 7 ngày`; đếm từ `data.pendingCount/weekCount`.
- **Timeline:** `MyHistoryTimeline` thêm `date rail` sticky trái (w-24), card `p-2.5 gap-2`, meta 1 dòng `code · status pill · role · time`; giữ `GROUP_DOT_COLOR`.
- **FilterRail:** tách từ `MyHistoryFilters.tsx` → `FilterRail.tsx` (desktop) + `MobileFilterDrawer` tinh gọn 65vh, search nằm trong rail header, `Tất cả` xóa hẳn `dateFrom/dateTo`.
- **Empty:** illustration + heading theo `hasNonDefaultFilters`: “Không có kết quả” + 2 CTA (Mở rộng 1 năm / Xóa lọc) vs “Trống — thử 7/30 ngày?” khi clean.

## Risks / Trade-offs

- Rail 260px chật khi viewport ~1024: Mitigation — rail chỉ hiện ≥1024, còn lại collapse vào header dropdown.
- Chip collapse che filter active: Mitigation — badge `+N` + tooltip liệt kê.

## Migration Plan

1. Tách `FilterRail` + header gọn + pills 1 hàng + dropdown quick.
2. Chips 1 dòng + summary clickable + empty CTA.
3. Timeline compact + date rail; sync mobile drawer.

## Open Questions

- None.
