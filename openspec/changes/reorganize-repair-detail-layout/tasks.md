# Tasks

## 1. Header A+C+D → 1 dòng sticky + stepper gọn (1C)

- [x] 1.1 Gộp dải mã+badge (A) + grid Ngày/Mã/Ưu tiên (C) + banner Người yêu cầu (D) thành 1 dòng sticky trong body: `maYeuCau | StatusBadge | PRIORITY_TONE | ngày VN | Người yêu cầu: createdByName`, xóa grid 3 cột và banner riêng
- [x] 1.2 Thu gọn stepper: dot 7→6, gap nhỏ hơn trên mobile, giữ `inspectionStepsFor` / `REPAIR_STEPS` và branch label

## 2. Thiết bị lỗi (E) → bảng gọn 1 dòng/thiết bị (2B)

- [x] 2.1 Thay card `border-l-4 + 6 field` bằng `<table>` gọn: header Hệ thống/Chi tiết | Vị trí | Loại lỗi | Nội dung | Lỗi liên quan, mỗi item 1 `<tr>` với `line-clamp-2` + `title`
- [x] 2.2 Giữ read-only `FaultRecordTypeaheadCell` dạng chip trong cell, giữ `locationOf` hint, không đổi `selectSystem`/`selectDetail` ở edit mode

## 3. YCSC 2 cột >=1024px (3B)

- [x] 3.1 Bọc F/G/H/I/J/K/L/M bằng `grid lg:grid-cols-[2fr_1fr] gap-3`; trái: F+G (2 cột con) + I (+ chain PX badge) + M (chi phí phát sinh), phải: H (người) + J (tổng hợp) + K/L (thực tế)
- [x] 3.2 Dưới `lg` tự về 1 cột, thứ tự DOM giữ F→G→I→M→H→J→K/L để mobile vẫn hợp lý

## 4. Lịch sử R+S → 1 accordion 2 tab (4B)

- [x] 4.1 Gộp 2 block thành 1 `rounded-lg border` với state `historyTab: 'handover'|'status'`, tab Nghiệm thu | Trạng thái, mỗi tab giữ list hiện có (`acceptanceHandovers` / `StatusTimeline`)

## 5. Nhịp compact + verify

- [x] 5.1 Nhịp compact: form `space-y-3` → `space-y-2.5`, section `gap-4`→`gap-3`, card `p-3`→`p-2.5`, row `px-2 py-1.5`→`px-2 py-1`; gộp `N ghi chú` thu gọn khi trống, `P file` 1 chip list
- [ ] 5.2 Verify: `npx tsc --noEmit -p tsconfig.app.json` 0 lỗi, `npx tsc --noEmit` backend 0 lỗi; manual YCKT (CHO_XU_LY/DANG_KIEM_TRA/CHO_NGHIEM_THU/HOAN_THANH) và YCSC (CHO_XU_LY/LEN_KE_HOACH/DANG_SUA_CHUA/CHO_NGHIEM_THU/DA_NGHIEM_THU/HOAN_THANH) trên mobile+desktop
