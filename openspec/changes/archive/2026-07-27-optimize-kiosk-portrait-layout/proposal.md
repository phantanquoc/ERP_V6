## Why

Thiết bị nhập liệu tại nhà máy là **Honor Pad X7** (8.7", 1340×800 px, ~179 ppi) và kế hoạch dùng ở **màn dọc**. Ở hướng dọc, chiều rộng khả dụng chỉ khoảng **500 px CSS** (Android DPR ~1.5), trừ padding còn ~468 px.

Bảng nhập Sản lượng chiên cần khoảng **990 px** để hiển thị đủ: cột cố định 430 px (STT 40 + Mã chiên 100 + Giờ chiên 70 + Nguyên liệu 120 + Ghi chú 100) cộng 8 cột máy × 70 px — prod hiện có **8 máy sản xuất**. Nghĩa là ở màn dọc công nhân phải cuộn ngang gần gấp đôi chiều rộng màn hình, và bảng **không có sticky hàng tiêu đề / sticky cột mã chiên** nên khi cuộn ngang sẽ mất ngữ cảnh "đang nhập máy nào, mã chiên nào" — rủi ro nhập sai máy. Ở hướng dọc, bảng này về cơ bản không dùng được.

Ngoài ra 2 màn gần như chưa responsive (Đánh giá ngâm chỉ 4 chỗ dùng breakpoint, Sản lượng 2 chỗ), còn vài nút/chữ dưới ngưỡng chạm và cỡ chữ khó đọc trong môi trường nhà máy.

## What Changes

- Màn Sản lượng chiên có **hai bố cục, tự động chuyển theo chiều rộng màn** (ngưỡng 700 px), không có nút chuyển tay:
  - **Màn hẹp (dọc)**: danh sách **thẻ theo mã chiên** — đầu thẻ hiển thị mã chiên, giờ chiên, nguyên liệu; bên trong liệt kê từng máy kèm ô nhập; cuối thẻ là ô ghi chú. Cuộn dọc, không cuộn ngang.
  - **Màn rộng (ngang)**: giữ bảng hiện tại, **thêm sticky hàng tiêu đề và sticky cột mã chiên** để cuộn ngang không mất ngữ cảnh.
- Hai bố cục **dùng chung toàn bộ state và logic lưu** (`board`, `updateCell`, `notes`, `updateNote`, `computeDirtyRecords`, `handleSave`/`handleConfirm`, `FieldFocusEditor`) — chỉ khác tầng hiển thị.
- Thêm hook nhỏ dùng chung để phát hiện màn hẹp.
- Nâng các nút/chip dưới ngưỡng chạm 44 px lên 44 px; nâng cỡ chữ ở nội dung công nhân cần đọc; thu gọn bề rộng tối đa của thanh tiến trình bước cho vừa màn dọc.

## Capabilities

### Modified Capabilities
- `production-data-tablet-entry`: bổ sung yêu cầu về bố cục thích ứng theo hướng màn cho bảng nhập sản lượng (thẻ khi hẹp, bảng + sticky khi rộng) và ngưỡng chạm tối thiểu.

## Impact

- **Frontend**:
  - `frontend/src/pages/production/ProductionDataEntry.tsx` — thêm bố cục thẻ, sticky cho bảng, nâng chip tab 40 px → 44 px.
  - `frontend/src/pages/production/ProductionMaterialEvaluationEntry.tsx` — nâng chip 36 px → 44 px, nâng cỡ chữ ở nội dung cần đọc, thu gọn bề rộng thanh tiến trình bước.
  - Hook mới cạnh `frontend/src/hooks/useVirtualKeyboard.ts` để phát hiện màn hẹp (2 màn dùng chung).
- **Out of scope**: KHÔNG đổi logic lưu/validation/`computeDirtyRecords`/`FieldFocusEditor`; KHÔNG đổi cấu trúc wizard màn Đánh giá ngâm; KHÔNG đụng backend; KHÔNG đổi màn Thông số vận hành (đã phù hợp màn dọc); KHÔNG thêm nút chuyển bố cục tay; KHÔNG đổi tab Vụn-Phế.
