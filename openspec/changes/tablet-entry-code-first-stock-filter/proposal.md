## Why

Audit toàn bộ ba trang nhập liệu kiosk (`ProductionDataEntry`, `ProductionMaterialEvaluationEntry`, `ProductionSystemOperationEntry`, ~3.800 dòng) xuất phát từ hai quan sát của người vận hành: picker nguyên liệu lấy quá nhiều mục, và định danh nên là mã hàng hóa thay vì tên. Audit xác nhận cả hai, chỉnh lại nguyên nhân của vấn đề thứ nhất, và tìm thêm một nhóm lỗi làm mất dữ liệu worker đã nhập.

**Số liệu DB dev `erp_database` (2026-08-04):** 9 nguyên liệu (`loaiSanPham` LIKE `'Nguyên liệu%'`), trong đó **chỉ 2** có `soLuong > 0` đơn vị Kg — `NLD-001-MDSLB` (8.549 Kg) và `NLD-003-XKDLCS` (400 Kg). 44 `lot_products`, **43 đã có `maKien`**. `material_evaluations` và `finished_products` đều **0 dòng**. 8 máy `SAN_XUAT` trạng thái `HOAT_DONG`.

1. **Picker nguyên liệu có 78% lựa chọn dẫn tới dead-end.** Backend `internationalProductService.ts:509-512` đã filter theo `loaiSanPham`, nên list là 9 mục chứ không phải toàn bộ 61 sản phẩm — độ dài không phải vấn đề. Vấn đề là 7/9 mục không có tồn kho: worker chọn, đi tiếp một bước, rồi mới đụng màn hình "không có lô tồn kho". Công vô ích, xảy ra với phần lớn lựa chọn.

2. **Mã hàng hóa không tồn tại trong dữ liệu nhập liệu.** `MaterialEvaluation.tenHangHoa` (`business_production.prisma:298`) và `FinishedProduct.tenHangHoa` (`:397`) là String denormalized, không lưu `maSanPham`; `materialEvaluationService.ts:298` gán `tenHangHoa = internationalProduct.tenSanPham` và bỏ mã. Đường tới mã qua `lotProductId → LotProduct → InternationalProduct` không tin cậy vì `lotProductId` nullable (`:307`) — record tạo tay mất mã. Vì vậy không thể chỉ sửa tầng hiển thị.

3. **Draft không được lưu đúng vào trường hợp phổ biến nhất.** `ProductionDataEntry.tsx:496-499` reset `baselineLoaded.current = false` khi `fpIndex.size === 0`, và autosave ở `:560` bị chặn bởi đúng cờ đó. Ngày/ca chưa có `FinishedProduct` nào thì draft không bao giờ được ghi — reload là mất sạch. Với `finished_products` đang 0 dòng, đây là trạng thái mặc định của mọi ca mới, tức đúng lúc worker nhập nhiều nhất.

4. **Effect load baseline ghi đè input worker đang gõ.** Effect `:495-556` có dep `fpIndex` và gọi `setBoard` bên trong; `useProductionDataEntry.ts:172` invalidate `['materialEvaluations']` rất rộng nên một lần lưu thông số vận hành làm refetch cả board. Refetch hoàn tất giữa lúc gõ là mất input.

5. **`localStorage.setItem` không try/catch, không debounce** (`ProductionDataEntry.tsx:559-564`) — serialize JSON mỗi keystroke trên board tới 64 ô, và `QuotaExceededError` throw trong effect làm crash trang. `ProductionSystemOperationEntry.tsx:133-135` làm đúng, hai trang không nhất quán.

6. **Lỗi API hiện ra như "không có dữ liệu".** Cả ba trang chỉ destructure `data` + `isLoading`, bỏ `isError`. API lỗi → `data` undefined → màn hình hiện "Không có mã chiên nào cho Ca 2 ngày 04/08" (`ProductionDataEntry.tsx:1055`). Worker kết luận chưa có mẻ và đi tìm admin trong khi thực tế là mạng lỗi.

7. **Toast lỗi hiện CUID thay vì tên máy.** `ProductionDataEntry.tsx:768` truyền `machineSystemId` vào `getMachineLabel()`, mà hàm (`:708-711`) bóc số cuối bằng regex `/(\d+)$/` — ra "Máy 7" sai hoặc nguyên CUID. Worker không biết ô nào lỗi để sửa.

8. **Nhãn kiện là index mảng, không phải mã thật.** `ProductionMaterialEvaluationEntry.tsx:428` hiện `"Kiện ${idx+1}"`; giá trị lưu `soLoKien` là `${tenLo}-${kienId.slice(-4)}` (`:689`) — 4 ký tự cuối CUID, worker không thấy trước khi lưu nên không đối chiếu được. DB đã có `maKien` ở 43/44 dòng nhưng UI không dùng.

9. **Lưu board là N request nối tiếp.** `useProductionDataEntry.ts:147` gọi PUT trong for-loop; 64 ô dirty thành 64 round-trip tuần tự, không progress indicator.

**Why now?** Điểm 3 và 4 làm mất dữ liệu sản xuất và đang ở trạng thái mặc định của mọi ca mới. Điểm 1 và 2 là yêu cầu trực tiếp từ người vận hành. Cả hai bảng nghiệp vụ đang 0 dòng nên đây là thời điểm rẻ nhất để thêm cột và backfill.

## What Changes

- **Picker nguyên liệu lọc theo tồn kho.** `getRawMaterials()` trả thêm `tongTonKho` (tổng `soLuong` các `lot_products` đơn vị Kg, tính bằng một `groupBy` chứ không N+1). `RawMaterialPicker` mặc định chỉ render mục `tongTonKho > 0`, hiển thị số tồn bên phải mỗi dòng, và có chip toggle `[Có hàng] [Tất cả]` không persist qua lần mở. Không chặn cứng ở backend: worker phải nhập được khi hàng đã về xưởng mà kho chưa kịp làm phiếu nhập.

- **`maSanPham` thành cột thật.** Thêm `maSanPham String?` + `@@index` vào `MaterialEvaluation` và `FinishedProduct`; backend gán khi tạo ở cả đường qua kho và đường tạo tay; migration backfill từ `lotProductId`. Nullable để không phá record tạo tay.

- **Mã thay tên trên màn hình nhập.** Bảng matrix (cột đổi tiêu đề thành "Mã hàng hóa", bỏ `truncate max-w-[150px]`), card chế độ hẹp, header card preview, nút chọn mẻ chiên: chỉ `maSanPham`. `RawMaterialPicker` giữ mã to đậm + tên nhỏ + tồn kho — đó là nơi worker *chọn* và cần chắc chắn.

- **Nhãn `FieldFocusEditor` thêm mã hàng hóa**: `"Máy 03 · MC-05"` → `"Máy 03 · MC-05 · NLD-001-MDSLB"`. Tương tự heading step chọn máy (`ProductionSystemOperationEntry.tsx:807`, `selectedBatch` đã có sẵn ở `:654`) và dải context cho 14 trường thông số ở step `form`.

- **Tách cờ `baselineLoaded`** thành "baseline đã load" và "được phép autosave"; tập rỗng là baseline hợp lệ. Effect load baseline thêm guard không `setBoard` khi board đang dirty.

- **`localStorage` write** bọc try/catch và debounce; thu hẹp invalidation; thêm `shift` vào query key `useAllFinishedProducts` (`useProductionDataEntry.ts:13-14`) và filter theo ca thay vì lấy cả 3 ca.

- **Error state** cho cả ba trang: hook expose `isError`, màn hình lỗi phân biệt với empty state, có nút thử lại. Thêm empty state khi danh sách máy rỗng (`ProductionDataEntry.tsx:1110` hiện render header 4 cột với body không input).

- **`maKien` thật** làm nhãn picker Kiện và làm `soLoKien`, fallback nhãn index chỉ khi `maKien` null.

- **`Promise.allSettled`** thay for-loop tuần tự, giữ báo cáo partial-failure mà spec yêu cầu, thêm progress indicator. Không mở endpoint batch mới.

- **Sửa `getMachineLabel`** nhận sai kiểu: map `id → maHeThong` qua `fryers` trước khi gọi.

- **Dọn dẹp**: gỡ `FryBatchPicker.tsx` (8.3 KB dead code, không import ở đâu trong `frontend/src`); gỡ `useSystemOperationByBatchAndFryer` (`useProductionDataEntry.ts:179-188`) trùng endpoint với `useSystemOperationsByMaChien` (`:197-203`); `React.memo` + `useCallback` cho `NumericInput`; debounce search operator bằng `useDebounce` có sẵn; sửa waste chia 3 lệch số (`:625` round từng field nên tổng ≠ số nhập) và thống nhất số chữ số thập phân giữa preview và DB.

## Capabilities

### New Capabilities

Không có capability mới.

### Modified Capabilities

- `production-data-tablet-entry` — thay đổi ở mức requirement: định danh nguyên liệu hiển thị chuyển từ tên sang mã hàng hóa; picker nguyên liệu có filter tồn kho; draft phải được lưu kể cả khi ca chưa có `FinishedProduct`; lỗi API phải phân biệt được với trạng thái không có dữ liệu; định danh kiện dùng `maKien` thật.

## Impact

**Prisma schema** (`backend/prisma/schema/business_production.prisma`): `MaterialEvaluation` và `FinishedProduct` thêm `maSanPham String?` + `@@index([maSanPham])`. Nằm trong `High-Risk Areas` — cột nullable, không đổi cột hiện có, backfill idempotent, dev đang 0 dòng. Prod cần backup trước migrate theo `DEPLOY_PROD_PLAYBOOK.md`.

**Backend**: `internationalProductService.getRawMaterials()` (response shape thêm `tongTonKho`), `materialEvaluationService` (`:178`, `:298`, `:307`, `:363`), `finishedProductService` (`:165`), `schemas/index.ts` (`:231`, `:281`).

**Frontend services/types**: `internationalProductService.ts`, `materialEvaluationService.ts`, `finishedProductService.ts`.

**Frontend hooks**: `useRawMaterials`, `useProductionDataEntry` (query key + invalidation + batch save), `useKienByProductAndLot`.

**Frontend components**: `RawMaterialPicker`, `CascadePicker` (chỉ chỗ gọi), `FieldFocusEditor` (chỉ nhãn truyền vào), `ProductionDataEntry`, `ProductionMaterialEvaluationEntry`, `ProductionSystemOperationEntry`, `OperatorSelectionScreen`, `MaterialEvaluationManagement` (dùng chung `useRawMaterials`). Xóa `FryBatchPicker.tsx`.

**API**: `GET /international-products/raw-materials` response thêm field (backward compatible). Không thêm/xóa endpoint. `ROUTE_MAP` không đổi.

**Không ảnh hưởng**: AI service, luồng auth/kiosk session, `advanceStatus`, face attendance.
