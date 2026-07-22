## Why

Trên tablet nhập liệu sản xuất, người dùng hiện phải tự tìm tên mình trong danh sách toàn bộ nhân viên sản xuất rồi mới chọn ca. Danh sách dài, dễ chọn nhầm người, và không phản ánh ai thực sự đang làm ca đó. Đảo luồng thành "chọn ca trước → hệ thống hiện đúng người đã điểm danh ca đó, đúng vị trí công việc của trang" giúp chọn nhanh, đúng người, giảm sai dữ liệu ngay từ bước đầu.

## What Changes

- Thêm **màn hình hub tablet** (điều hướng) liệt kê các loại nhập liệu (2 hiện có: Sản lượng chiên, Đánh giá nguyên liệu), chừa chỗ cho loại thứ ba sau này.
- **BREAKING (UX)**: Đảo thứ tự chọn trên mỗi trang nhập liệu tablet từ "chọn người → chọn ca" thành "chọn ca → chọn người".
- Sau khi chọn ca, danh sách người hiển thị = nhân viên **đã điểm danh** ngày hiện tại với giờ check-in khớp ca đã chọn, **và** giữ vị trí thuộc nhóm vị trí mà admin đã gán cho trang đó.
- Thêm nút **"Tìm người khác"** làm fallback: mở danh sách đầy đủ nhân viên sản xuất (luồng cũ) cho người quên điểm danh hoặc máy nhận diện lỗi — đảm bảo không ai bị kẹt.
- Thêm **model DB** ánh xạ trang nhập liệu (pageKey) ↔ danh sách vị trí (Position).
- Thêm **endpoint kiosk** (device-key auth) trả danh sách người theo `date + shift + pageKey`.
- Thêm **endpoint admin** (JWT) và **trang cấu hình desktop** để admin gán vị trí cho từng trang.

## Capabilities

### New Capabilities
- `tablet-shift-operator-selection`: Luồng chọn ca-trước-người-sau trên tablet, lọc người theo điểm danh + ca + vị trí, có fallback "Tìm người khác", và hub điều hướng loại nhập liệu.
- `data-entry-page-position-config`: Model + endpoint admin + trang cấu hình desktop ánh xạ trang nhập liệu ↔ nhóm vị trí; endpoint kiosk đọc cấu hình này để lọc người.

### Modified Capabilities
- `production-data-tablet-entry`: Thứ tự cổng chọn (gate) đổi từ người-trước-ca-sau thành ca-trước-người-sau; nguồn danh sách người đổi từ "toàn bộ NV sản xuất" thành "người đã điểm danh ca đó + đúng vị trí", kèm fallback.

## Impact

- **Backend**: Prisma schema (model map pageKey↔position, common schema, migration); `employeeService`/service mới cho danh sách người-đã-điểm-danh; tái dùng `workShiftService.determineShift`; controller + route kiosk mới (`deviceOrJwtAuth('DATA_ENTRY')`); controller + route admin CRUD (JWT); đăng ký ROUTE_MAP.
- **Frontend**: Trang hub tablet mới; hook + service cho danh sách người-đã-điểm-danh; sửa `OperatorSelectionScreen` + `ShiftSelectionScreen`; đảo gate trong `ProductionDataEntry.tsx` và `ProductionMaterialEvaluationEntry.tsx`; trang cấu hình desktop cho admin.
- **Không đụng**: schema `Attendance` (không thêm cột ca); cơ chế điểm danh khuôn mặt; không tạo Position mới; không tạo trang nhập liệu thứ ba.
