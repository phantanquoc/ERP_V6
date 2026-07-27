## Why

Trên 3 màn kiosk nhập liệu (`/production/nhap-lieu`, `-danh-gia`, `-van-hanh`), khi công nhân chạm ô nhập số, bàn phím ảo của tablet chiếm ~50% màn hình. Form nhiều ô chật chội, ô đang gõ dễ bị che, phải cuộn qua lại nhiều và dễ lạc. Các cải thiện trước (collapse header, ẩn bottom bar, auto-scroll, scroll-margin) đã giảm bớt nhưng chưa giải quyết triệt để trải nghiệm nhập số trên tablet nhà máy.

## What Changes

- Thêm component dùng chung `FieldFocusEditor` — một lớp phủ (overlay) toàn màn hình dồn về NỬA TRÊN (không bị bàn phím che): hiển thị tên ô cỡ lớn, ô nhập cỡ lớn, hàng nút gợi ý nhanh giá trị hay dùng, nút "Tiếp →" (nhảy sang ô kế trong cùng form) và nút "Xong".
- Ở cả 3 màn, các ô nhập SỐ khi được chạm sẽ mở `FieldFocusEditor` thay vì để bàn phím native bung lên form chật.
- Giá trị nhập lưu tạm vào state hiện có (`form`/`wizardData`); nút **Lưu** hiện có mới ghi thật — KHÔNG đổi luồng lưu/API/validation.
- Tái dùng `useVirtualKeyboard` (đã có) để biết chiều cao bàn phím và đặt cụm nút ngay trên mép bàn phím.

## Capabilities

### New Capabilities
- `field-focus-editor`: lớp nhập liệu focus toàn màn cho ô nhập số trên các màn kiosk sản xuất — tối ưu hiển thị khi bàn phím ảo mở, có gợi ý nhanh và điều hướng "Tiếp" giữa các ô.

### Modified Capabilities
<!-- Không đổi requirement của capability hiện có; chỉ thêm lớp UI nhập liệu. Luồng lưu/nghiệp vụ 3 màn giữ nguyên. -->

## Impact

- **Frontend**: component mới `frontend/src/components/production/FieldFocusEditor.tsx`; tích hợp vào `ProductionSystemOperationEntry.tsx`, `ProductionMaterialEvaluationEntry.tsx`, `ProductionDataEntry.tsx` (tầng ô nhập số).
- **Tái dùng**: `useVirtualKeyboard.ts` (không sửa core), meta `interactive-widget=resizes-content` (không đổi).
- **Out of scope**: KHÔNG đổi API/luồng lưu/validation/submit 3 màn; KHÔNG đụng backend; KHÔNG đổi wizard bước chọn (mã chiên/máy/sản phẩm); KHÔNG đụng `ProtectedLayout` + màn desktop khác; ô readOnly/locked (`tongThoiGianSay` tự tính, `formLocked` máy bảo trì) KHÔNG mở editor; KHÔNG đổi logic tính toán; KHÔNG đụng `generateMaChien`, cascade Lô/Kiện, 4 công đoạn thực tế backend.
