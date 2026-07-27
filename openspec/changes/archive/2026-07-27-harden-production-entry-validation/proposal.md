## Why

Audit toàn bộ luồng nhập liệu của 3 màn kiosk sản xuất (`/production/nhap-lieu`, `-danh-gia`, `-van-hanh`) phát hiện nhiều lỗ hổng làm hỏng chất lượng dữ liệu và **một lỗi mất dữ liệu âm thầm**:

- **Mất dữ liệu âm thầm (nghiêm trọng nhất)**: ở bảng sản lượng, ô chưa có bản ghi `FinishedProduct` trong DB bị bỏ qua khi lưu (`if (!fp) continue`). Công nhân nhập số, bấm Lưu, thấy thông báo thành công — nhưng dữ liệu không được ghi.
- **Không có giới hạn trên ở bất kỳ thông số nào**: nhiệt độ 9999°C, brix 500 (thang chỉ 0-100), thời gian ngâm 1.000.000 phút đều được nhận.
- **Bảng sản lượng nhận số âm** → sản lượng âm, tỉ lệ % âm.
- **Backend gần như không validate**: `materialEvaluationRoutes` và `finishedProductRoutes` không áp `zodValidate` nào; schema của SystemOperation có nhưng thiếu `min`/`max` cho nhiệt độ và áp suất.
- **Ghi đè không cảnh báo** ở màn Thông số vận hành, và màn này **không có lưu nháp** nên reload là mất toàn bộ 13 ô đang nhập.

## What Changes

- Chuẩn hóa validation bằng **zod ở cả backend và frontend**, dùng **một bảng ngưỡng min/max dùng chung** cho từng thông số.
- **BREAKING (chặt hơn)**: giá trị ngoài ngưỡng nay bị từ chối kèm thông báo tiếng Việt rõ ràng, cả ở API. Dữ liệu vô lý trước đây gửi được thì nay sẽ bị chặn.
- **Sửa lỗi mất dữ liệu âm thầm**: ô chưa có bản ghi sẽ được **tự tạo rồi lưu**, không bỏ qua nữa; backend hỗ trợ upsert theo `maChien + machineSystemId`.
- Bảng sản lượng: chặn số âm, hỏi xác nhận khi đổi ngày, báo rõ kết quả khi lưu một phần thất bại (bao nhiêu thành công / thất bại, ô nào lỗi).
- Màn Thông số vận hành: thêm **lưu nháp** (không mất khi reload), **hỏi xác nhận trước khi ghi đè** dữ liệu máy đã nhập.
- Màn Đánh giá ngâm: chặn chọn thời gian chiên ở tương lai, giới hạn ảnh đính kèm 20 MB, reset thông số khi đổi sản phẩm.
- Tiện ích số dùng chung: chặn `Infinity`/`NaN`, clamp theo min/max và làm tròn xuống cho ô số nguyên **kể cả khi nhập trực tiếp** (không chỉ trong lớp nhập focus).

## Capabilities

### New Capabilities
- `production-entry-validation`: bộ quy tắc validation nhập liệu sản xuất — ngưỡng min/max theo từng thông số, áp dụng đồng bộ ở frontend và backend, kèm thông báo lỗi tiếng Việt.

### Modified Capabilities
- `production-data-tablet-entry`: sửa hành vi lưu ở bảng sản lượng — không còn bỏ qua ô thiếu bản ghi (tự tạo rồi lưu), báo rõ lưu một phần thất bại, chặn số âm.

## Impact

- **Backend**: `backend/src/schemas/index.ts` (thêm schema MaterialEvaluation + FinishedProduct, siết schema SystemOperation); `materialEvaluationRoutes.ts` + `finishedProductRoutes.ts` (áp `zodValidate`); `finishedProductService`/controller (hỗ trợ upsert theo `maChien + machineSystemId`).
- **Frontend**: `utils/numberInput.ts`; `components/production/FieldFocusEditor.tsx`; 3 màn `ProductionDataEntry.tsx`, `ProductionSystemOperationEntry.tsx`, `ProductionMaterialEvaluationEntry.tsx`.
- **Out of scope**: KHÔNG đổi cấu trúc bảng/wizard/UI layout; KHÔNG đổi cơ chế tính `tongThoiGianSay`; KHÔNG làm optimistic locking đa tablet (chỉ cảnh báo ghi đè, không thêm version field); KHÔNG đụng `generateMaChien`, cascade Lô/Kiện, các công đoạn backend khác.
