## Purpose
<!-- Modified capability: thêm field `mucDich` vào flow tạo phiếu nhập kho -->

## ADDED Requirements

### Requirement: Backend nhận và lưu field `mucDich` khi tạo phiếu nhập kho
Service `warehouseReceiptService.create()` nhận thêm field `mucDich?: string` trong input, và lưu vào DB.

#### Scenario: Tạo phiếu nhập kho với mục đích
- **WHEN** client gọi `POST /api/warehouse-receipts` với body chứa `{ ..., mucDich: "Nhập từ nhà cung cấp A" }`
- **THEN** server tạo `WarehouseReceipt` mới với `mucDich = "Nhập từ nhà cung cấp A"`, trả về `201 Created` với object phiếu vừa tạo (bao gồm field `mucDich`)

#### Scenario: Tạo phiếu nhập kho không có mục đích (optional field)
- **WHEN** client gọi `POST /api/warehouse-receipts` với body không chứa `mucDich` hoặc `mucDich: null`
- **THEN** server tạo `WarehouseReceipt` với `mucDich = null`, không báo lỗi validation

### Requirement: Frontend hiển thị trường "Mục đích nhập" trong form tạo phiếu nhập kho
Modal nhập kho trong `WarehouseManagement.tsx` thêm input text "Mục đích nhập" (optional).

#### Scenario: Người dùng nhập mục đích vào form
- **WHEN** người dùng mở modal nhập kho và điền "Mục đích nhập: Nhập từ thu mua nhanh"
- **THEN** khi submit, request gửi lên server bao gồm `mucDich: "Nhập từ thu mua nhanh"`

#### Scenario: Người dùng bỏ trống mục đích
- **WHEN** người dùng không điền gì vào trường "Mục đích nhập"
- **THEN** request gửi lên không chứa field `mucDich` (hoặc `mucDich: null`), form vẫn submit thành công

### Requirement: Backend cập nhật field `mucDich` khi sửa phiếu nhập kho
Service `warehouseReceiptService.update()` nhận thêm field `mucDich?: string`, cho phép sửa mục đích của phiếu đã tạo.

#### Scenario: Sửa mục đích của phiếu nhập kho
- **WHEN** client gọi `PUT /api/warehouse-receipts/:id` với `{ ..., mucDich: "Sửa thành mục đích mới" }`
- **THEN** server cập nhật `WarehouseReceipt.mucDich = "Sửa thành mục đích mới"`, trả về `200 OK`
