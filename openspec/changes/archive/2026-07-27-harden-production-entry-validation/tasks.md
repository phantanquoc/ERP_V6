## 1. Backend — schema ngưỡng

- [x] 1.1 Trong `backend/src/schemas/index.ts`: thêm object hằng số ngưỡng tập trung (min/max/integer) theo bảng ở design.md Decision 1, kèm comment chéo tới `frontend/src/utils/numberInput.ts` nêu rõ phải sửa cùng lúc
- [x] 1.2 Siết `createSystemOperationSchema` + `updateSystemOperationSchema`: thêm `.min()/.max()` cho giaiDoan{1..4}NhietDo (0-400), giaiDoan{1..4}ApSuat (0-20), giaiDoan{1..4}ThoiGian (0-2880, int), khoiLuongDauVao (0-200000), tongThoiGianSay (0-11520, int); message tiếng Việt theo mẫu Decision 4
- [x] 1.3 Thêm `createMaterialEvaluationSchema`: nhietDoNuocTruocNgam/nhietDoNuocSauVot (0-200), brixNuocNgam (0-100), thoiGianNgam (0-2880 int), soLanNgam (0-40 int), khoiLuong (0-200000), thoiGianChien (không được ở tương lai), các field chuỗi hiện có; message tiếng Việt
- [x] 1.4 Thêm schema cho FinishedProduct update + upsert-by-batch-machine: các field khối lượng (0-200000), message tiếng Việt ← (verify: mọi ngưỡng khớp bảng design.md, message tiếng Việt, không bỏ sót field nào)

## 2. Backend — áp zodValidate + upsert

- [x] 2.1 `materialEvaluationRoutes.ts`: import `zodValidate` từ `@middlewares/zodValidation` và áp `createMaterialEvaluationSchema` cho endpoint tạo đánh giá (đặt sau middleware auth, theo pattern systemOperationRoutes.ts:134-137)
- [x] 2.2 `finishedProductRoutes.ts`: áp `zodValidate` cho `PATCH /:id` với schema update
- [x] 2.3 `finishedProductService`: thêm method upsert theo `(maChien, machineSystemId)` dùng `prisma.finishedProduct.upsert` (unique constraint đã có tại business_production.prisma:450); business logic ở service, không ở controller
- [x] 2.4 Thêm endpoint `PUT /by-batch-machine` (hoặc tên tương đương) trên `finishedProductRoutes.ts` với auth `deviceOrJwtAuth('DATA_ENTRY')` + zodValidate schema upsert; controller HTTP-only, response shape `{success,message?,data?}`; KHÔNG sửa auth của `POST /` hiện có ← (verify: endpoint gọi được bằng device key kiosk, upsert tạo mới khi chưa có và cập nhật khi đã có, không nới quyền endpoint cũ)

## 3. Frontend — tiện ích số dùng chung

- [x] 3.1 `frontend/src/utils/numberInput.ts`: thêm object hằng số ngưỡng (giá trị giống backend, comment chéo); mở rộng `parseNumberInput` nhận `{ min, max, integer }` — clamp theo min/max, `Math.floor` khi integer, **từ chối `Infinity`/`NaN`** (không trả Infinity ra ngoài)
- [x] 3.2 `frontend/src/components/production/FieldFocusEditor.tsx`: nhận `min`/`max` và áp clamp; hiển thị thông báo tiếng Việt khi giá trị vượt ngưỡng theo mẫu Decision 4
- [x] 3.3 `NumericField`/`NumericInput` ở 3 màn: truyền ngưỡng của từng field xuống, clamp KỂ CẢ khi nhập trực tiếp (đóng lỗ hổng editor floor nhưng direct input không floor) ← (verify: nhập trực tiếp 30.5 vào ô phút ra 30; nhập 9999 bị chặn; nhập 1e999 không ra Infinity)

## 4. Frontend — ProductionDataEntry (bảng sản lượng)

- [x] 4.1 Chặn số âm ở mọi ô nhập của bảng (hiện `parseNumberInput` cho phép âm) + áp ngưỡng max 200000
- [x] 4.2 Sửa `computeDirtyRecords`: ô dirty mà không có `fp` → KHÔNG `continue`; đưa vào danh sách cần upsert và gọi endpoint `PUT /by-batch-machine` qua service/hook
- [x] 4.3 Đổi luồng lưu sang thu thập kết quả từng record `{cellKey, ok, error}` thay vì dừng ở lỗi đầu tiên; sau khi chạy hết: tất cả OK → toast thành công như cũ; có lỗi → báo rõ số thành công/thất bại + danh sách ô lỗi (mã chiên + máy) bằng tiếng Việt, GIỮ NGUYÊN board + nháp; baseline chỉ cập nhật cho record lưu thành công
- [x] 4.4 Hỏi xác nhận (`window.confirm`) khi đổi ngày sản xuất nếu đang có dữ liệu chưa lưu ← (verify: ô thiếu record nay lưu được và KHÔNG còn báo thành công giả; partial failure báo đúng số lượng + ô lỗi; đổi ngày có confirm)

## 5. Frontend — ProductionSystemOperationEntry (thông số vận hành)

- [x] 5.1 Thêm nháp localStorage key `sysop-draft|{productionDate}|{shift}|{maChien}|{machineSystemId}`: auto-save khi form dirty, load khi vào form, xoá sau khi lưu thành công; khi có cả dữ liệu DB và nháp → ưu tiên nháp và hiển thị rõ đang dùng nháp
- [x] 5.2 Cảnh báo ghi đè: ở bước chọn máy, nếu `isOperationEntered(op)` → `window.confirm` tiếng Việt nêu rõ máy đã có dữ liệu, chỉ khi xác nhận mới `setStep('form')`
- [x] 5.3 Áp ngưỡng min/max cho 13 ô (nhiệt độ 0-400, áp suất 0-20, thời gian 0-2880 int, khối lượng 0-200000); giữ nguyên `hasAnyValue` guard, `formLocked`, cách tính `tongThoiGianSay` ← (verify: reload không mất dữ liệu; máy đã nhập có confirm; ngưỡng áp đúng; formLocked vẫn chặn thật)

## 6. Frontend — ProductionMaterialEvaluationEntry (đánh giá ngâm)

- [x] 6.1 `DateTimePicker` cho `thoiGianChien`: truyền `maxDateTime` = thời điểm hiện tại (chặn chọn tương lai)
- [x] 6.2 Giới hạn ảnh đính kèm 20MB: kiểm `file.size` khi chọn, vượt thì từ chối + thông báo tiếng Việt
- [x] 6.3 `handleProductChange`: reset các thông số bước 4 (soLanNgam, nhietDoNuocTruocNgam, nhietDoNuocSauVot, thoiGianNgam, brixNuocNgam) và bước 5 (danhGiaTruocNgam, danhGiaSauNgam, file) khi đổi sản phẩm
- [x] 6.4 Áp ngưỡng min/max cho các ô số (nhiệt độ 0-200, brix 0-100, thoiGianNgam 0-2880 int, soLanNgam 0-40 int, khoiLuong 0-200000); giữ nguyên chặn `khoiLuongExceeded` theo tồn kho ← (verify: không chọn được ngày tương lai; ảnh >20MB bị chặn; đổi sản phẩm reset thông số; ngưỡng áp đúng; khoiLuongExceeded vẫn hoạt động)

## 7. Verification

- [x] 7.1 Backend: `cd backend && npx tsc --noEmit` (PHẢI pass), `npm run lint`, `npm test`
- [x] 7.2 Frontend: `cd frontend && npx tsc --noEmit` (PHẢI pass), `npm run lint`
- [x] 7.3 Rà soát scope: KHÔNG đổi cấu trúc bảng/wizard/UI layout, KHÔNG đổi cách tính `tongThoiGianSay`, KHÔNG thêm version field/optimistic locking, KHÔNG đụng `generateMaChien`/cascade Lô/Kiện/công đoạn backend khác, KHÔNG sửa auth `POST /` của finishedProduct ← (verify: build sạch, không rò scope, hành vi lưu 3 màn đúng spec)
- [x] 7.4 GHI CHÚ: test bàn phím/tablet thật KHÔNG tự động được — cần test tay trên tablet Android sau deploy
