## 1. Chuẩn bị

- [x] 1.1 Đọc `openspec/ui-dna.md` trước khi đổi visual — bám: card gom nhóm nhãn cạnh giá trị, inline content dùng border + nền nhạt (KHÔNG shadow), nhịp 8px, không trang trí cạnh dữ liệu nghiệp vụ
- [x] 1.2 Đọc `frontend/src/hooks/useVirtualKeyboard.ts` để bám pattern hook (hooks order an toàn, SSR guard, cleanup listener)

## 2. Hook phát hiện màn hẹp

- [x] 2.1 Tạo `frontend/src/hooks/useIsNarrowScreen.ts`: dùng `window.matchMedia('(max-width: 699px)')`, đăng ký `change` listener + cleanup khi unmount, trả về `boolean`; SSR-safe (`typeof window === 'undefined'` → false); `useState` gọi vô điều kiện trước mọi guard ← (verify: hooks order an toàn, cleanup listener, ngưỡng 699px đúng design)

## 3. ProductionDataEntry — bố cục thẻ (màn dọc)

- [x] 3.1 Dùng `useIsNarrowScreen()` trong `ProductionDataEntry.tsx`; render `isNarrow ? <bố cục thẻ> : <bố cục bảng hiện tại>` cho các tab không phải VUN_PHE. Tab VUN_PHE giữ nguyên không đổi
- [x] 3.2 Bố cục thẻ: với mỗi mã chiên trong `filteredBatches` render 1 thẻ — đầu thẻ `maChien` cỡ lớn đậm + dòng phụ `giờ chiên · tên hàng hoá` (chỉ đọc); thân thẻ liệt kê từng máy dạng hàng ngang `nhãn máy` + `ô nhập`; cuối thẻ ô ghi chú. Style `bg-white border rounded-xl`, KHÔNG shadow, padding nhịp 8px
- [x] 3.3 Thẻ dùng CHUNG state/logic với bảng: cùng `cellKey = \`${batch.maChien}|${f.id}\``, cùng `board[activeTab]`, `updateCell`, `notes`/`updateNote`, và `setEditorCell` (mở FieldFocusEditor). TUYỆT ĐỐI KHÔNG nhân bản `computeDirtyRecords`/`handleSave`/`handleConfirm` — chỉ khác tầng JSX
- [x] 3.4 Giữ thông báo rỗng tiếng Việt khi `filteredBatches` rỗng (áp cho cả 2 bố cục) ← (verify: thẻ và bảng ghi vào CÙNG ô dữ liệu; chỉ MỘT chỗ định nghĩa logic lưu; xoay màn không mất dữ liệu đang nhập)

## 4. ProductionDataEntry — sticky cho bảng (màn ngang)

- [x] 4.1 `<thead>` thêm `sticky top-0 z-10` + nền đặc `bg-gray-100` (không trong suốt)
- [x] 4.2 Cột Mã chiên: ô `<td>` dùng `sticky left-0 z-20` + `bg-white`; ô `<th>` tương ứng dùng `sticky left-0 z-30` + `bg-gray-100`; giữ `border-r`. Cột STT KHÔNG ghim (tiết kiệm chỗ)
- [x] 4.3 Nâng chip tab dòng ~905 `min-h-[40px]` → `min-h-[44px]` ← (verify: cuộn ngang vẫn thấy cột mã chiên + hàng tiêu đề; nền sticky đặc không bị nội dung xuyên qua; z-index phân tầng đúng 10/20/30)

## 5. ProductionMaterialEvaluationEntry — kích thước & cỡ chữ

- [x] 5.1 Chip "hôm nay đã tạo" dòng ~863: `min-h-[36px]` → `min-h-[44px]`
- [x] 5.2 `StepProgress` dòng ~175: `max-w-3xl` → dùng breakpoint (màn hẹp `max-w-full`, màn rộng giữ `max-w-3xl`); nhãn bước dòng ~199 `text-xs` → `text-sm`
- [x] 5.3 Nâng `text-xs` → `text-sm` tại dòng ~1054 ("Chọn nhanh giờ chiên...") và ~1235 (mô tả trong danh sách)
- [x] 5.4 GIỮ `text-xs` tại dòng ~747 ("hoặc"), ~847/~853 (nhãn phụ chip list), ~991 (thông báo lỗi đã có màu đỏ làm tín hiệu). GIỮ NGUYÊN các `max-w-2xl`/`max-w-4xl` khác (đi kèm `mx-auto`, chỉ giới hạn tối đa, không gây tràn) ← (verify: mọi control tương tác ≥44px; không đổi cấu trúc wizard; không nâng cỡ chữ tràn lan)

## 6. Verification

- [x] 6.1 `cd frontend && npx tsc --noEmit` — PHẢI pass
- [x] 6.2 `cd frontend && npm run lint` — không lỗi mới ở file scope
- [x] 6.3 Rà soát scope: KHÔNG đổi logic lưu/validation/`computeDirtyRecords`/`FieldFocusEditor`; KHÔNG đụng backend; KHÔNG đổi màn Thông số vận hành; KHÔNG thêm nút chuyển bố cục tay; KHÔNG đổi tab Vụn-Phế ← (verify: build sạch, không rò scope, logic lưu nguyên vẹn)
- [x] 6.4 GHI CHÚ: test trên Honor Pad X7 thật KHÔNG tự động được — cần test tay cả hướng DỌC (thẻ) và NGANG (bảng + sticky)
