## Context

Audit 3 màn kiosk nhập liệu sản xuất phát hiện: không có giới hạn trên cho mọi thông số, bảng sản lượng nhận số âm, backend gần như không validate (`materialEvaluationRoutes` + `finishedProductRoutes` thiếu `zodValidate`; schema SystemOperation thiếu min/max cho nhiệt độ/áp suất), và một lỗi **mất dữ liệu âm thầm** ở bảng sản lượng (`if (!fp) continue` — ô chưa có bản ghi bị bỏ qua nhưng vẫn báo thành công).

Facts đã xác minh:
- `FinishedProduct` có `@@unique([maChien, machineSystemId])` (business_production.prisma:450) → upsert bằng Prisma là khả thi và sạch.
- `finishedProductRoutes.ts`: `PATCH /:id` dùng `deviceOrJwtAuth('DATA_ENTRY')` (tablet dùng được), nhưng `POST /` dùng `authenticate` (JWT) → **tablet kiosk không gọi được endpoint create hiện tại**.
- Pattern `zodValidate(schema)` đặt sau middleware auth (systemOperationRoutes.ts:134-137, 203-206).

## Goals / Non-Goals

**Goals:**
- Một bảng ngưỡng min/max duy nhất, áp đồng bộ frontend + backend.
- Sửa mất dữ liệu âm thầm: ô thiếu bản ghi → tự tạo rồi lưu.
- Báo rõ partial failure; cảnh báo ghi đè; nháp cho màn vận hành; chặn ngày tương lai; giới hạn ảnh 20MB.

**Non-Goals:**
- KHÔNG đổi cấu trúc bảng/wizard/UI layout, KHÔNG đổi cách tính `tongThoiGianSay`.
- KHÔNG optimistic locking đa tablet (chỉ cảnh báo ghi đè, không thêm version field).
- KHÔNG đụng `generateMaChien`, cascade Lô/Kiện, công đoạn backend khác.

## Decisions

### Decision 1: Ngưỡng — hai nguồn khai báo, một bảng giá trị
Không dùng package dùng chung (monorepo hiện không có shared lib giữa FE/BE). Thay vào đó khai báo **hai hằng số song song, giá trị giống nhau, có comment trỏ lẫn nhau**:
- Backend: hằng số ngưỡng cạnh schema trong `backend/src/schemas/index.ts`.
- Frontend: hằng số ngưỡng trong `frontend/src/utils/numberInput.ts` (hoặc file `productionEntryLimits.ts` cạnh đó), export để 3 màn + FieldFocusEditor dùng.
Bảng giá trị (đã chốt với user, "nới rộng max"):

| Field | Min | Max | Integer |
|---|---|---|---|
| nhietDoNuocTruocNgam, nhietDoNuocSauVot | 0 | 200 | no |
| giaiDoan{1..4}NhietDo | 0 | 400 | no |
| brixNuocNgam | 0 | 100 | no |
| giaiDoan{1..4}ApSuat | 0 | 20 | no |
| thoiGianNgam | 0 | 2880 | yes |
| giaiDoan{1..4}ThoiGian | 0 | 2880 | yes |
| soLanNgam | 0 | 40 | yes |
| khoiLuong, khoiLuongDauVao, ô sản lượng | 0 | 200000 | no |
| tongThoiGianSay (tự tính) | 0 | 11520 | yes |

- *Alternative loại*: tạo shared package — quá tốn cho 1 bảng hằng số; rủi ro build/tooling.

### Decision 2: Upsert FinishedProduct — mở rộng service, thêm endpoint dùng được cho kiosk
Thêm method service upsert theo `(maChien, machineSystemId)` dùng `prisma.finishedProduct.upsert` (an toàn nhờ unique constraint). Expose qua endpoint **`PUT /by-batch-machine`** (hoặc tên tương đương) trên `finishedProductRoutes.ts` với auth `deviceOrJwtAuth('DATA_ENTRY')` để tablet gọi được — KHÔNG sửa auth của `POST /` hiện có (tránh mở rộng quyền ngoài ý muốn).
Frontend bảng sản lượng: khi cell dirty mà không tìm thấy `fp` → gọi endpoint upsert này thay vì `continue`.
- *Alternative loại*: đổi auth `POST /` sang deviceOrJwtAuth — nới quyền cho endpoint create tổng quát, rủi ro hơn.
- *Alternative loại*: tạo sẵn toàn bộ record khi tạo mã chiên — đã có `createBulkSystemOperations` cho SystemOperation nhưng thay đổi luồng tạo mã chiên là ngoài scope.

### Decision 3: Clamp ở tầng tiện ích, không chỉ ở editor
`parseNumberInput` nhận thêm tham số `{ min, max, integer }`; trả về giá trị đã clamp và **từ chối `Infinity`/`NaN`** (trả về min hoặc giá trị cũ). `FieldFocusEditor` và `NumericField`/`NumericInput` ở 3 màn đều truyền ngưỡng của field xuống → clamp áp dụng cả khi nhập trực tiếp, đóng lỗ hổng "editor floor nhưng direct input không floor".

### Decision 4: Thông báo lỗi tiếng Việt — format cố định
Mẫu: `"{Tên thông số} phải từ {min} đến {max}{đơn vị}"` (ví dụ `"Nhiệt độ nước ngâm phải từ 0 đến 200°C"`). Với ảnh: `"Ảnh vượt quá 20MB, vui lòng chọn ảnh nhỏ hơn"`. Backend trả message tiếng Việt qua zod `message` để client hiển thị trực tiếp.

### Decision 5: Key nháp màn vận hành
`sysop-draft|{productionDate}|{shift}|{maChien}|{machineSystemId}` — theo pattern màn 1 (`material-eval-draft|...`) và màn 3 (`prod-output-draft|...`), nhưng thêm mã chiên + máy vì dữ liệu form thuộc một cặp (mã chiên, máy) cụ thể. Auto-save khi form dirty; load khi vào form; xoá sau khi lưu thành công. Nếu có cả `existingOperation` từ DB và nháp → **ưu tiên nháp** (là việc công nhân đang làm dở), nhưng hiển thị rõ đang dùng nháp.

### Decision 6: Partial failure — thu thập kết quả từng record
Đổi vòng lặp lưu tuần tự sang thu thập kết quả `{ cellKey, ok, error }` cho từng record thay vì throw ở record đầu tiên lỗi. Sau khi chạy hết: nếu tất cả OK → toast thành công như hiện tại; nếu có lỗi → toast/dialog nêu số thành công, số thất bại, danh sách ô lỗi (mã chiên + máy), và **giữ nguyên board + nháp** để công nhân thử lại. Baseline chỉ cập nhật cho record đã lưu thành công (tránh gửi lại record đã thành công ở lần thử tiếp theo).

### Decision 7: Cảnh báo ghi đè
Ở bước chọn máy, nếu `isOperationEntered(op)` → `window.confirm` (pattern đã dùng ở `handleChangeShift`) nội dung tiếng Việt nêu rõ máy đã có dữ liệu, tiếp tục sẽ ghi đè. Chỉ khi xác nhận mới `setStep('form')`.

## Risks / Trade-offs

- **Hai nguồn khai báo ngưỡng có thể lệch nhau khi sửa** → Mitigation: comment chéo giữa 2 file nêu rõ "phải sửa cùng lúc"; giá trị đặt trong một object hằng số tập trung mỗi bên.
- **Siết validation là breaking với dữ liệu/luồng cũ** → dữ liệu vô lý trước đây gửi được nay bị chặn. Chấp nhận (đó là mục tiêu). Rủi ro: nếu ngưỡng quá chặt sẽ chặn oan → đã nới max ×2 theo yêu cầu user; brix giữ 0-100 vì là thang cố định.
- **Ưu tiên nháp hơn dữ liệu DB ở màn vận hành** có thể gây nhầm nếu công nhân khác đã lưu giá trị mới → Mitigation: chỉ áp trong cùng khóa (ngày+ca+mã chiên+máy) và hiển thị rõ đang dùng nháp.
- **Endpoint upsert mới có auth kiosk** → Mitigation: chỉ nhận payload đã qua zodValidate; phạm vi hẹp theo `(maChien, machineSystemId)`; không cho tạo tuỳ ý ngoài cặp này.
- **Không test được bàn phím/tablet thật** → verify chỉ ở mức code + build; cần test tay trên tablet sau deploy.

## Migration Plan

Không có thay đổi schema DB, không migration. Thuần code (backend schema/routes/service + frontend util/component/3 màn). Rollback = revert commit.

## Open Questions

- Không còn điểm mờ chặn thực thi. Ngưỡng, cách upsert, format thông báo, key nháp, cách báo partial failure đều đã chốt ở trên.
