# Proposal

## Why

Chi tiết phiếu YCKT/YCSC (`RepairRequestFormModal.tsx` ~2500 dòng) render 14 block dọc
liên tiếp với nhịp `space-y-3 + p-3` đồng đều, lặp thông tin (mã/budge/ưu tiên hiện 2 lần),
và tách các khối liên quan (Kế hoạch vs Chi phí dự kiến, Người vs Thực tế) ra xa nhau.
Kết quả: modal dài, nhiều khoảng trắng, mắt phải quét dọc nhiều để trả lời 3 câu
cốt lõi “phiếu gì → hỏng ở đâu → xử lý thế nào”.

## What Changes

- Gộp header A+C+D thành 1 dòng sticky trong body: `maYeuCau` + badge trạng thái + ưu tiên + `ngayThang`/`createdAt` + `createdByName`, stepper thu gọn.
- Thiết bị lỗi (E): từ card 6 field/thiết bị sang bảng gọn 1 dòng/thiết bị (hệ thống/chi tiết, vị trí, loại lỗi, nội dung, lỗi liên quan).
- YCSC 2 cột trên `>=1024px` (trái: Kế hoạch+Chi phí dự kiến + YCCC+PX + Chi phí phát sinh, phải: Người phụ trách + Tổng hợp chi phí + Thông tin thực tế), 1 cột trên mobile.
- Gộp Lịch sử nghiệm thu (R) + Lịch sử trạng thái (S) thành 1 accordion 2 tab.
- Nhịp compact: section gap-4 → gap-3, card p-3 → p-2.5, row py-1.5 → py-1; giữ nguyên mọi logic, validation, transition, WS, chỉ đổi bố cục.

## Capabilities

### New Capabilities
<!-- pure layout refactor — no spec-level behavior change -->

### Modified Capabilities
<!-- pure layout refactor — no spec-level behavior change -->

## Impact

- `frontend/src/components/RepairRequestFormModal.tsx` (chính, ~2500 dòng)
- `openspec/ui-dna.md` (nhịp compact, grouped cards, progressive disclosure)
- Không đổi API, Prisma, ROUTE_MAP, RBAC, `repairRequestService`, `useRepairRequests`, WS.
