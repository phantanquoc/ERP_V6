## Context

Thiết bị nhập: **Honor Pad X7** — 8.7", 1340×800 px, ~179 ppi. Dùng **màn dọc**: rộng 800 px vật lý → ~500 px CSS (DPR ~1.5), trừ padding `px-4` hai bên còn ~468 px. Màn ngang: 1340 px.

Bảng Sản lượng cần ~990 px (cột cố định 430 px + 8 máy × 70 px; prod có 8 máy `SAN_XUAT`). Bảng hiện KHÔNG có sticky header/cột → cuộn ngang mất ngữ cảnh.

Đã xác minh trong code:
- `ProductionDataEntry.tsx`: vùng chính dùng `max-w-full` (dòng 179, 834) nên **không tràn**; chip tab `min-h-[40px]` (dòng 905); bảng ở dòng 934-988 với `overflow-x-auto`, `min-w-[...]` từng cột; tab Vụn-Phế `max-w-lg` (dòng 994).
- `ProductionMaterialEvaluationEntry.tsx`: `StepProgress` dùng `max-w-3xl` (dòng 175) + nhãn bước `text-xs` (dòng 199); chip "hôm nay đã tạo" `min-h-[36px]` (dòng 863); các `text-xs` khác ở dòng 747, 847, 853, 991, 1054, 1235; các `max-w-2xl`/`max-w-4xl` đi kèm `mx-auto` nên chỉ giới hạn tối đa, **không gây tràn**.
- UI DNA (`openspec/ui-dna.md`): card gom nhóm với nhãn cạnh giá trị; inline content dùng **border + nền nhạt, không shadow**; nhịp 8 px; bảng dày đặc dùng padding chặt; không trang trí cạnh dữ liệu nghiệp vụ.

## Goals / Non-Goals

**Goals:**
- Màn dọc nhập được không cuộn ngang (bố cục thẻ theo mã chiên).
- Màn ngang giữ bảng, thêm sticky để không mất ngữ cảnh.
- Hai bố cục dùng chung state/logic lưu.
- Đưa mọi control lên ngưỡng chạm 44 px; nâng cỡ chữ chỗ cần đọc.

**Non-Goals:**
- KHÔNG đổi logic lưu/validation/`computeDirtyRecords`/`FieldFocusEditor`.
- KHÔNG đổi cấu trúc wizard Đánh giá ngâm, không đụng backend, không đổi màn Thông số vận hành, không thêm nút chuyển bố cục tay, không đổi tab Vụn-Phế.

## Decisions

### Decision 1: Ngưỡng breakpoint = 700 px, phát hiện bằng `matchMedia`
Hook mới `frontend/src/hooks/useIsNarrowScreen.ts`:
- Dùng `window.matchMedia('(max-width: 699px)')`, đăng ký `change` listener, cleanup khi unmount. Trả về `boolean`.
- SSR-safe: `typeof window === 'undefined'` → `false`; `useState` gọi vô điều kiện trước mọi guard (giữ hooks order như `useVirtualKeyboard`).
- Chọn `matchMedia` thay resize listener: không cần debounce, chỉ fire khi vượt ngưỡng, ít re-render.
- Ngưỡng 700 px: màn dọc ~500 px → thẻ; màn ngang 1340 px → bảng. Biên độ rộng, không sát mép nên xoay máy là chuyển dứt khoát.

### Decision 2: Bố cục thẻ — cấu trúc cụ thể
Với mỗi mã chiên trong `filteredBatches`, một thẻ:
- **Đầu thẻ** (chỉ đọc): `maChien` cỡ lớn đậm; dòng phụ `giờ chiên · tên hàng hoá`.
- **Thân thẻ**: danh sách máy — mỗi dòng là một hàng ngang `nhãn máy` (bên trái) + `ô nhập` (bên phải), dùng lại đúng component nhập của bảng (`NumericInput` + `onTap` → `setEditorCell`) với **cùng `cellKey = \`${batch.maChien}|${f.id}\``**.
- **Cuối thẻ**: ô ghi chú, dùng đúng `notes`/`updateNote` với cùng khoá như bảng.
- Style theo DNA: `bg-white border rounded-xl`, không shadow (inline content), padding theo nhịp 8 px, nhãn cạnh giá trị.
- *Alternative loại*: chọn mã chiên → mở màn nhập riêng — tăng thao tác gấp 3 khi nhập nhiều mã liên tiếp trong một ca.

### Decision 3: Dùng chung state — không nhân bản logic
Cả hai bố cục render từ cùng `board[activeTab][cellKey]`, cùng `updateCell`, `notes`/`updateNote`, và cùng `setEditorCell`. `computeDirtyRecords` và `handleSave`/`handleConfirm` **không được sửa và không được nhân bản** — chỉ có tầng JSX khác nhau (`isNarrow ? <CardsLayout/> : <TableLayout/>`). Đây là điểm verify phải kiểm: grep xác nhận chỉ một chỗ định nghĩa logic lưu.

### Decision 4: Sticky cho bảng
- Hàng tiêu đề: `<thead>` dùng `sticky top-0 z-10` + nền đặc (`bg-gray-100`) để không bị nội dung xuyên qua.
- Cột mã chiên: ô `<th>`/`<td>` cột đó dùng `sticky left-0 z-20` + nền đặc (`bg-white` cho ô thân, `bg-gray-100` cho ô tiêu đề) + giữ `border-r`.
- Ô giao nhau (tiêu đề của cột ghim) cần z-index cao hơn cả hai (`z-30`) để không bị che.
- Cột STT nhỏ (40 px) không ghim để tiết kiệm chỗ; chỉ ghim cột mã chiên vì đó là ngữ cảnh cần thiết.

### Decision 5: Danh sách thay đổi kích thước/cỡ chữ — cụ thể theo dòng
`ProductionDataEntry.tsx`:
- Dòng 905: chip tab `min-h-[40px]` → `min-h-[44px]`.
`ProductionMaterialEvaluationEntry.tsx`:
- Dòng 863: chip "hôm nay đã tạo" `min-h-[36px]` → `min-h-[44px]`.
- Dòng 175: `StepProgress` `max-w-3xl` → thu gọn cho màn dọc (dùng breakpoint: hẹp thì `max-w-full`, rộng giữ `max-w-3xl`).
- Dòng 199: nhãn bước `text-xs` → `text-sm` (nội dung cần đọc để biết đang ở bước nào).
- Dòng 1054 ("Chọn nhanh giờ chiên..."), 1235 (mô tả trong danh sách) : `text-xs` → `text-sm`.
- **Giữ `text-xs`** ở dòng 747 ("hoặc" — nhãn phân cách), 847/853 (nhãn phụ chip list), 991 (thông báo lỗi nhỏ, đã có màu đỏ làm tín hiệu chính) — đây là nhãn phụ, nâng lên sẽ chiếm chỗ vô ích ở màn hẹp.
- Các `max-w-2xl`/`max-w-4xl` khác đi kèm `mx-auto`: **giữ nguyên** vì chỉ giới hạn tối đa, không gây tràn ở màn 468 px.

## Risks / Trade-offs

- **Hai bố cục cùng dữ liệu có thể lệch nếu sau này sửa một bên** → Mitigation: mọi thứ ngoài JSX đều dùng chung; đặt 2 bố cục trong cùng file, cùng scope biến, không tách hook/state riêng.
- **Chuyển bố cục khi xoay máy có thể gây giật/mất focus** → Mitigation: state nằm ngoài tầng hiển thị nên dữ liệu không mất; nếu đang mở `FieldFocusEditor` thì editor là overlay độc lập, không phụ thuộc bố cục.
- **Sticky trong `overflow-x-auto` có thể lệch nền/viền trên một số WebView Android** → Mitigation: dùng nền đặc (không trong suốt) cho ô sticky và z-index phân tầng rõ (10/20/30).
- **Ngưỡng 700 px có thể chưa khớp mọi thiết bị khác** → chấp nhận: biên độ rộng giữa 500 và 1340 px nên an toàn cho Honor Pad X7; thiết bị khác nếu cần chỉ sửa một hằng số.
- **Không test được trên thiết bị thật tự động** → verify chỉ ở mức code + build; cần test tay cả dọc và ngang.

## Migration Plan

Không có thay đổi dữ liệu/API/schema. Thuần frontend (1 hook mới + 2 file màn). Rollback = revert commit.

## Open Questions

- Không còn điểm mờ chặn thực thi. Ngưỡng, cấu trúc thẻ, cách sticky, danh sách dòng cần đổi đều đã chốt ở trên.
