# Design

## Context

`RepairRequestFormModal` là modal duy nhất cho cả YCKT và YCSC (`maxWidth="5xl"`,
`form className="space-y-3"`). Trong `isView` nó render ~14 block `rounded-lg border p-3`
nối nhau (A..S trong proposal). Vấn đề: nhịp đều, lặp header, card thiết bị thưa,
6 block YCSC liên tiếp 1 cột, 2 lịch sử tách rời. UI DNA yêu cầu *compact 8px rhythm,
dense table, grouped cards, progressive disclosure*.

## Goals / Non-Goals

**Goals:**
- Giảm chiều cao modal ~30-40% trên desktop mà không mất thông tin.
- Đưa 3 câu hỏi cốt lõi lên gần: phiếu gì → hỏng ở đâu → xử lý thế nào → bằng chứng/lịch sử.
- Giữ 1 cột trên mobile (DNA: wide tables scroll horizontally inside modal).

**Non-Goals:**
- Không đổi logic, validation, `save`/`doCreate`, transition, WS, RBAC.
- Không tách file / tạo component mới ngoài trích nhỏ inline nếu cần.
- Không đổi API/Prisma/ROUTE_MAP.

## Decisions

- **1C gộp header:** 1 dòng sticky trong body (mã + StatusBadge + PRIORITY_TONE + ngày VN + người yêu cầu) thay vì A (dải) + C (3 ô grid) + D (banner xanh). Ngày dùng `formatDateVN(ngayThang || createdAt)`. Sticky chỉ trong body scroll, không che footer.
- **1C stepper gọn:** vòng 7→6 trên desktop, dot nhỏ hơn trên mobile, giữ `inspectionStepsFor` / `REPAIR_STEPS`.
- **2B bảng gọn:** header `Hệ thống / Chi tiết | Vị trí | Loại lỗi | Nội dung | Lỗi liên quan`, mỗi thiết bị 1 `<tr>`, click mở chi tiết nếu cần. Giữ `border-l` semantic qua dot màu thay vì border-l dày.
- **3B 2 cột >=1024px:** `grid lg:grid-cols-[2fr_1fr] gap-3` bọc F/G/H/I/J/K/L/M; trái: F+G (grid 2 con), I (+ chain PX), M; phải: H, J, K/L. Dưới `lg` tự về 1 cột. Không dùng JS layout.
- **4B accordion lịch sử:** 1 `rounded-lg border` với tab `Nghiệm thu | Trạng thái`, dùng state `historyTab: 'handover'|'status'`. Mỗi tab giữ `StatusTimeline` / handover list hiện có.
- **Nhịp compact:** form `space-y-3` → `space-y-2.5`, section `gap-4` → `gap-3`, card `p-3` → `p-2.5`, row `px-2 py-1.5` → `px-2 py-1`; giữ `border` và `shadow` theo DNA.

## Risks / Trade-offs

- Bảng gọn 1 dòng có thể cắt nội dung dài → Mitigation: `line-clamp-2` + `title` tooltip, giữ `FaultRecordTypeaheadCell` read-only chip.
- 2 cột làm lệch thứ tự đọc trên mobile → Mitigation: thứ tự DOM vẫn là F→G→I→M→H→J→K/L nhưng CSS grid reorder chỉ trên lg.

## Migration Plan

1. Patch `RepairRequestFormModal.tsx` theo 4 nhóm trên, giữ logic guard `isView`/`effectiveIsKiemTra`/`viewStatus`.
2. `npx tsc --noEmit -p tsconfig.app.json` + `npx tsc --noEmit` (backend) phải 0 lỗi.
3. Manual: mở YCKT ở CHO_XU_LY / DANG_KIEM_TRA / CHO_NGHIEM_THU / HOAN_THANH và YCSC ở CHO_XU_LY / LEN_KE_HOACH / DANG_SUA_CHUA / CHO_NGHIEM_THU / DA_NGHIEM_THU / HOAN_THANH, check mobile + desktop, stepper, bảng thiết bị, 2 cột, accordion lịch sử, file block.
