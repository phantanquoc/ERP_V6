## Context

3 màn kiosk nhập liệu (`ProductionDataEntry`, `ProductionMaterialEvaluationEntry`, `ProductionSystemOperationEntry`) nằm ngoài `ProtectedLayout` (App.tsx 109-112), thiết kế toàn màn cho tablet. UI hiện tại đã tốt (wizard, card to, grid responsive) — vấn đề chỉ ở tầng ô nhập số khi bàn phím ảo mở (~50% màn). Đã có `useVirtualKeyboard` (detect ngưỡng 150px, auto-scroll, expose `keyboardHeight`) và meta `interactive-widget=resizes-content`.

## Goals / Non-Goals

**Goals:**
- Component dùng chung `FieldFocusEditor` cho ô nhập số, giải quyết bàn phím che + tối ưu nhập tablet.
- Gợi ý nhanh + điều hướng "Tiếp" giữa các ô. Áp cho cả 3 màn.

**Non-Goals:**
- KHÔNG đổi API/luồng lưu/validation/submit, backend, wizard bước chọn, ProtectedLayout, màn desktop khác, logic tính toán, generateMaChien, cascade Lô/Kiện.
- KHÔNG sửa core `useVirtualKeyboard`/meta viewport (chỉ tái dùng).

## Decisions

### Decision 1: Props FieldFocusEditor
`{ open: boolean; label: string; value: number; unit?: string; suggestions?: number[]; onChange: (v: number) => void; onNext?: () => void; onClose: () => void; integer?: boolean }`. Editor thuần UI, không gọi API. `onNext` undefined ⇒ ẩn nút Tiếp (ô cuối), chỉ còn "Xong".

### Decision 2: Layout chừa chỗ bàn phím
Overlay `fixed inset-0 z-50 bg-black/30`, panel nội dung neo TRÊN (`items-start`, padding-top), nền trắng bo góc. Ô input `text-2xl min-h-[64px] w-full`, `inputMode` = `numeric` (integer) / `decimal`, `autoFocus`. Hàng gợi ý: nút lớn `min-h-[48px]`. Cụm "Tiếp →"/"Xong" đặt dưới input; dùng `keyboardHeight` từ useVirtualKeyboard để chèn padding-bottom = keyboardHeight (đẩy nút lên trên mép bàn phím). Chạm nền tối ngoài panel = Xong.

### Decision 3: Mở editor cho cả touch + desktop
Vì là màn kiosk, mở editor cho MỌI tương tác (click/focus) để nhất quán — không phân biệt touch/desktop. Đơn giản, tránh phân nhánh khó test. Desktop vẫn gõ được trong editor bình thường.

### Decision 4: Danh sách gợi ý nhanh theo loại ô (có thể chỉnh)
- Khối lượng ngâm: [300, 350, 400]
- Nhiệt độ nước (trước/sau ngâm): [40, 50, 60, 70, 80]
- Thời gian ngâm (phút): [30, 45, 60, 90]
- Brix: [10, 15, 20, 25]
- Số lần ngâm: [1, 2, 3]
- Khối lượng đầu vào (sấy): [300, 350, 400]
- Thời gian sấy giai đoạn (phút): [30, 60, 90, 120]
- Nhiệt độ sấy (°C): [60, 70, 80, 90]
- Áp suất (bar): [0.5, 0.8, 1.0]
Ô không có trong danh sách ⇒ không có gợi ý (vẫn nhập tay). Đây là mốc hợp lý ban đầu, dễ chỉnh sau.

### Decision 5: Thứ tự "Tiếp" mỗi màn
Mỗi màn định nghĩa một mảng field theo thứ tự hiển thị:
- **SystemOperation** (step form): khoiLuongDauVao → (giaiDoan1: ThoiGian, NhietDo, ApSuat) → giaiDoan2 (…) → giaiDoan3 → giaiDoan4. Bỏ qua `tongThoiGianSay` (readOnly). Khi `formLocked` không mở editor.
- **MaterialEvaluation**: theo bước wizard hiện tại — bước 2: khoiLuong; bước 4: soLanNgam → nhietDoNuocTruocNgam → nhietDoNuocSauVot → thoiGianNgam → brixNuocNgam. "Tiếp" chỉ đi trong các ô số CÙNG bước.
- **DataEntry** (bảng sản lượng): "Tiếp" đi theo thứ tự ô trong cùng hàng/khối nhập; nếu phức tạp thì phạm vi "Tiếp" giới hạn trong nhóm ô đang mở (chấp nhận). Ô cuối ⇒ ẩn Tiếp.

### Decision 6: State — dùng cơ chế hiện có
`onChange` gọi thẳng `setField`/`setWizardData` hiện có. Không thêm state trung gian ngoài chỉ-số "ô nào đang mở". Đóng editor không tự lưu; nút Lưu của màn giữ nguyên.

## Risks / Trade-offs

- **Thứ tự "Tiếp" ở bảng sản lượng (DataEntry) phức tạp** → Mitigation: giới hạn "Tiếp" trong nhóm ô của khối đang thao tác; nếu khó xác định thứ tự, cho phép chỉ có "Xong" (không Tiếp) ở màn này — vẫn đạt mục tiêu chính (không bị bàn phím che).
- **Editor phủ cả desktop có thể lạ với người quen gõ nhanh** → chấp nhận vì đây là màn kiosk; nếu cần sau này thêm cờ tắt cho desktop.
- **Gợi ý nhanh sai mốc thực tế** → design ghi rõ là mốc ban đầu, chỉnh dễ (mảng số).
- **Không test được bàn phím thật tự động** → verify chỉ ở mức code + build; cần test tay trên tablet sau deploy (ghi rõ trong tasks).

## Migration Plan

Không có DB/migration. Thuần frontend: thêm 1 component + tích hợp 3 màn. Rollback = revert commit.

## Open Questions

- Không còn điểm mờ chặn thực thi. Mốc gợi ý nhanh + thứ tự "Tiếp" ở DataEntry là điểm dễ chỉnh sau khi công nhân dùng thực tế.
