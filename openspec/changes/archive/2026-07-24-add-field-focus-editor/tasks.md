## 1. Component FieldFocusEditor

- [x] 1.1 Tạo `frontend/src/components/production/FieldFocusEditor.tsx` với props: `open`, `label`, `value:number`, `unit?`, `suggestions?:number[]`, `onChange:(v:number)=>void`, `onNext?`, `onClose`, `integer?`
- [x] 1.2 Layout overlay `fixed inset-0 z-50` nền mờ, panel nội dung neo NỬA TRÊN (items-start + padding-top); ô input `text-2xl min-h-[64px]`, `inputMode` numeric/decimal theo `integer`, `autoFocus`
- [x] 1.3 Hàng nút gợi ý nhanh (khi có `suggestions`): mỗi nút set value qua onChange; ẩn hàng nếu không có suggestions
- [x] 1.4 Nút "Tiếp →" (gọi onNext, ẩn nếu onNext undefined) + nút "Xong" (onClose); chạm nền ngoài panel = onClose; dùng `useVirtualKeyboard().keyboardHeight` để chèn padding-bottom = keyboardHeight (đẩy nút trên mép bàn phím) ← (verify: layout không bị bàn phím che, Tiếp/Xong hoạt động, gợi ý set đúng value, ô cuối ẩn Tiếp)

## 2. Tích hợp ProductionSystemOperationEntry

- [x] 2.1 Thêm state chỉ-số "ô đang mở" (field key hiện hành hoặc null); định nghĩa mảng thứ tự field: khoiLuongDauVao → (giaiDoan1 ThoiGian/NhietDo/ApSuat) → giaiDoan2 → giaiDoan3 → giaiDoan4 (bỏ tongThoiGianSay readOnly)
- [x] 2.2 `NumericField` khi chạm (không readOnly, không formLocked) → mở FieldFocusEditor với label/unit/value/suggestions tương ứng; onChange → setField; onNext → mở ô kế trong mảng; onClose → đóng
- [x] 2.3 Gợi ý: khoiLuongDauVao [300,350,400]; ThoiGian sấy [30,60,90,120]; NhietDo sấy [60,70,80,90]; ApSuat [0.5,0.8,1.0]. Giữ nguyên handleSubmit/Lưu; ô readOnly + formLocked KHÔNG mở editor ← (verify: 14 ô mở đúng editor, tongThoiGianSay + formLocked không mở, Lưu không đổi)

## 3. Tích hợp ProductionMaterialEvaluationEntry

- [x] 3.1 Định nghĩa mảng thứ tự field số theo bước: bước 2 [khoiLuong]; bước 4 [soLanNgam, nhietDoNuocTruocNgam, nhietDoNuocSauVot, thoiGianNgam, brixNuocNgam]. "Tiếp" chỉ đi trong ô CÙNG bước
- [x] 3.2 NumericInput/ô số khi chạm → mở FieldFocusEditor; onChange → setWizardData; gợi ý: khoiLuong [300,350,400]; soLanNgam [1,2,3]; nhietDoNuoc* [40,50,60,70,80]; thoiGianNgam [30,45,60,90]; brixNuocNgam [10,15,20,25] ← (verify: ô số bước 2+4 mở editor, Tiếp đi đúng trong bước, lưu qua nút Lưu giữ nguyên)

## 4. Tích hợp ProductionDataEntry

- [x] 4.1 Xác định các ô số trong bảng sản lượng; ô số khi chạm → mở FieldFocusEditor; onChange → state hiện có
- [x] 4.2 "Tiếp" đi theo thứ tự ô trong nhóm/hàng đang thao tác; nếu thứ tự phức tạp → cho phép chỉ có "Xong" (ẩn Tiếp) ở màn này. Giữ nguyên nút Lưu ← (verify: ô số bảng mở editor, không vỡ layout bảng, Lưu giữ nguyên)

## 5. Verification

- [x] 5.1 `cd frontend && npx tsc --noEmit` — PHẢI pass
- [x] 5.2 `cd frontend && npm run lint` — không lỗi mới ở file scope
- [x] 5.3 Rà soát scope: KHÔNG đổi API/luồng lưu/validation 3 màn, KHÔNG đụng backend/wizard chọn/ProtectedLayout/useVirtualKeyboard core/meta viewport; ô readOnly/locked không mở editor ← (verify: build sạch, không rò scope, hành vi lưu 3 màn nguyên vẹn)
- [x] 5.4 GHI CHÚ: phần bàn phím thật + trải nghiệm tablet KHÔNG test tự động được — cần test tay trên tablet Android sau deploy
