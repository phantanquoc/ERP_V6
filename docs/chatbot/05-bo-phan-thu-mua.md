---
department: DEPT_PURCHASING
department_name: "Bộ phận thu mua"
roles: [ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE]
access: department_restricted
language: vi
---

# Bộ phận thu mua

## Cách truy cập

Từ thanh điều hướng bên trái (sidebar):
- **Phòng thu mua NVL**: Nhấn **Bộ phận Thu mua** → chọn **Phòng thu mua NVL**
- **Phòng mua Thiết bị**: Nhấn **Bộ phận Thu mua** → chọn **Phòng mua Thiết bị**

## 1. Tổng quan

Bộ phận thu mua gồm hai phòng chức năng:

| Phòng | Chức năng chính | Màu nhận diện | Đường dẫn |
|---|---|---|---|
| **Phòng thu mua NVL** | Quản lý nhà cung cấp NVL, đơn hàng và yêu cầu mua nguyên vật liệu | Xanh lá (`green`) | `/purchasing/materials` |
| **Phòng mua Thiết bị** | Quản lý nhà cung cấp thiết bị, đơn hàng mua, hợp đồng và đầu tư thiết bị máy móc | Tím (`purple`) | `/purchasing/equipment` |

Cả hai phòng dùng chung cấu trúc 3 tab và logic xử lý tương tự nhau, chỉ khác về loại hàng hóa, màu giao diện và mã code prefix.

---

## 2. Quyền truy cập

| Chức năng | ADMIN | DEPARTMENT_HEAD | TEAM_LEAD | EMPLOYEE |
|---|---|---|---|---|
| Xem danh sách nhà cung cấp | ✅ | ✅ | ✅ | ✅ |
| Thêm nhà cung cấp | ✅ | ✅ | ✅ | ❌ |
| Sửa nhà cung cấp | ✅ | ✅ | ✅ | ❌ |
| Xóa nhà cung cấp | ✅ | ✅ | ❌ | ❌ |
| Xem danh sách đơn hàng | ✅ | ✅ | ✅ | ✅ |
| Tạo đơn hàng | ✅ | ✅ | ✅ | ✅ |
| Xem yêu cầu mua hàng | ✅ | ✅ | ✅ | ✅ |
| Tạo yêu cầu mua hàng | ✅ | ✅ | ✅ | ✅ |
| Duyệt yêu cầu mua hàng | ✅ | ✅ | ✅ | ❌ |
| Xuất Excel nhà cung cấp | ✅ | ✅ | ✅ | ❌ |

---

## 3. Phòng thu mua NVL

### 3.1. Tổng quan

Phòng thu mua NVL quản lý toàn bộ chu trình thu mua nguyên vật liệu: từ danh sách nhà cung cấp, đơn hàng đến yêu cầu mua hàng cụ thể.

### 3.2. Các tab chức năng

| Tab | ID | Mô tả |
|---|---|---|
| Nhà cung cấp NVL | `suppliers` | Quản lý danh sách nhà cung cấp nguyên vật liệu |
| Danh sách đơn hàng | `orderList` | Quản lý đơn hàng mua NVL (dùng component OrderManagement) |
| Danh sách mua hàng | `purchaseRequestList` | Quản lý yêu cầu mua hàng NVL |

### 3.3. Tab Nhà cung cấp NVL

**Nút header:** "Xuất Excel" + "Thêm nhà cung cấp"

**Bộ lọc & tìm kiếm:** Tìm kiếm theo tên nhà cung cấp (`placeholder: "Tìm kiếm nhà cung cấp..."`). Nhấn nút **Tìm kiếm** để thực hiện tìm kiếm.

#### Cột bảng danh sách nhà cung cấp (11 cột)

| Cột | Nội dung |
|---|---|
| STT | Số thứ tự (tính từ 1 trên mỗi trang) |
| Mã NCC | Mã nhà cung cấp (chữ xanh dương, có thể click để xem chi tiết) |
| Tên NCC | Tên nhà cung cấp (truncate nếu quá dài, hover để xem đầy đủ) |
| Loại cung cấp | Phân loại hàng hóa cung cấp (VD: Thủy sản, Rau củ, Gia vị) |
| Quốc gia | Quốc gia NCC (có icon cờ) |
| Liên hệ | Người liên hệ (tên đậm) + SĐT (dòng dưới, có icon điện thoại) |
| Loại hình | Badge: `Sản xuất` (xanh dương) / `Thương mại` (tím) |
| Trạng thái | Badge: `Đang cung cấp` (xanh lá) / `Ngừng cung cấp` (đỏ) |
| Doanh chi | Doanh số chi trả (hiển thị dạng "XM" triệu VNĐ, VD: "50M" = 50 triệu VNĐ, "-" nếu không có) |
| NV tạo | Tên nhân viên tạo NCC (Họ + Tên, "-" nếu không có) |
| Hoạt động | 3 nút: Xem (mắt) / Sửa (bút) / Xóa (thùng rác) |

#### Nút hành động trên mỗi dòng

| Nút | Hành động |
|---|---|
| Mắt (Xem) | Mở modal xem chi tiết nhà cung cấp (read-only) |
| Bút (Sửa) | Mở modal chỉnh sửa thông tin nhà cung cấp |
| Thùng rác (Xóa) | Xác nhận xóa: "Bạn có chắc chắn muốn xóa nhà cung cấp này?" |

**Form thêm / sửa nhà cung cấp — 13 trường:**

| STT | Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|---|---|---|---|
| 1 | Mã NCC | Auto | Text (readOnly) | Tự động sinh, prefix loại `NVL` |
| 2 | Tên nhà cung cấp | ✅ | Text | |
| 3 | Loại cung cấp | ✅ | Text | Ví dụ: Thủy sản, Rau củ, Gia vị... |
| 4 | Quốc gia | ✅ | Text | Mặc định: "Việt Nam" |
| 5 | Website | ❌ | Text | URL nhà cung cấp |
| 6 | Người liên hệ | ✅ | Text | |
| 7 | Số điện thoại | ✅ | Text | |
| 8 | Email liên hệ | ✅ | Email | |
| 9 | Địa chỉ | ✅ | Text | |
| 10 | Khả năng cung cấp | ❌ | Text | Mô tả năng lực cung cấp |
| 11 | Loại hình | ✅ | Dropdown | `Sản xuất` / `Thương mại` |
| 12 | Trạng thái | ❌ | Dropdown | `Đang cung cấp` / `Ngừng cung cấp` (mặc định: "Đang cung cấp") |
| 13 | Doanh chi (VNĐ) | ❌ | Số | Doanh số chi trả cho NCC (mặc định: 0) |

**Nút:** "Lưu" / "Hủy"

#### Pagination

Hiển thị khi có nhiều hơn 1 trang (10 nhà cung cấp/trang):
- Nút "Trước" (disabled nếu ở trang 1)
- Hiển thị "Trang X / Y"
- Nút "Sau" (disabled nếu ở trang cuối)

### 3.4. Tab Danh sách đơn hàng (NVL)

**Truy cập:** `/purchasing/materials` → tab **"Danh sách đơn hàng"**

#### Bộ lọc

| Bộ lọc | Loại | Placeholder |
|---|---|---|
| Mã ĐH | Văn bản | — |
| Mã BG | Văn bản | — |
| Khách hàng | Văn bản | — |
| Trạng thái SX | Văn bản | — |
| Tìm kiếm tổng | Văn bản | "Tìm kiếm mã ĐH, mã BG, khách hàng..." |

#### Nút header

| Nút | Hành động |
|---|---|
| **Xuất Excel** | Xuất danh sách ra file Excel |

#### Cột bảng danh sách

| Cột | Nội dung |
|---|---|
| STT | Số thứ tự |
| Ngày đặt hàng | Ngày tạo đơn |
| Mã đơn hàng | Mã định danh (chữ xanh đậm) |
| Mã báo giá | Mã BG liên kết |
| Khách hàng | Tên khách hàng |
| Số lượng SP | Số sản phẩm trong đơn |
| Trạng thái SX | Badge trạng thái sản xuất |
| Trạng thái TT | Badge trạng thái thanh toán |
| Hành động | Xem / Xem bảng tính / Sửa / Xóa |

#### Nút hành động trên mỗi dòng

| Nút | Hành động |
|---|---|
| Mắt (Xem) | Mở modal xem chi tiết đơn hàng |
| Máy tính (Xem bảng tính) | Mở bảng tính báo giá |
| Bút (Sửa) | Mở form chỉnh sửa |
| Thùng rác (Xóa) | Xác nhận: "Bạn có chắc chắn muốn xóa đơn hàng này?" |

#### Trạng thái sản xuất (`trangThaiSanXuat`)

| Giá trị | Nhãn hiển thị |
|---|---|
| `CHO_LEN_KE_HOACH` | Chờ lên kế hoạch |
| `CHO_SAN_XUAT` | Chờ sản xuất |
| `DANG_SAN_XUAT` | Đang sản xuất |
| `CHO_GIAO_HANG` | Chờ giao hàng |
| `DA_LEN_CONTAINER` | Đã lên container |
| `DANG_VAN_CHUYEN` | Đang vận chuyển |
| `DA_GIAO_CHO_KHACH_HANG` | Đã giao cho khách hàng |

#### Trạng thái thanh toán (`trangThaiThanhToan`)

| Giá trị | Nhãn hiển thị |
|---|---|
| `DA_THANH_TOAN_DOT_1` | Đã thanh toán đợt 1 |
| `CHO_THANH_TOAN_DOT_2` | Chờ thanh toán đợt 2 |
| `DA_THANH_TOAN_DU` | Đã thanh toán đủ |

#### Form chỉnh sửa đơn hàng

| Nhóm | Trường | Loại nhập |
|---|---|---|
| Giá trị | Giá trị đơn hàng (USD) | Số (bước 0.01) |
| Giá trị | Giá trị đơn hàng (VNĐ) | Số |
| Thanh toán đợt 1 | Xuất khẩu (USD) | Số (bước 0.01) |
| Thanh toán đợt 1 | Nội địa (VNĐ) | Số |
| Thanh toán đợt 1 | Ngày thanh toán | Chọn ngày |
| Thanh toán đợt 2 | Xuất khẩu (USD) | Số (bước 0.01) |
| Thanh toán đợt 2 | Nội địa (VNĐ) | Số |
| Thanh toán đợt 2 | Ngày thanh toán | Chọn ngày |
| Sản xuất | Ngày bắt đầu SX (KH) | Chọn ngày |
| Sản xuất | Ngày hoàn thành SX (KH) | Chọn ngày |
| Sản xuất | Ngày hoàn thành thực tế | Chọn ngày |
| Sản xuất | Ngày giao hàng | Chọn ngày |
| Trạng thái | Trạng thái sản xuất | Dropdown (7 giá trị trên) |
| Trạng thái | Trạng thái thanh toán | Dropdown (3 giá trị trên) |
| | Ghi chú | Văn bản dài (4 dòng), placeholder: "Nhập ghi chú..." |

**Nút:** "Lưu thay đổi" / "Hủy"

> **Lưu ý file đính kèm:** Tích hợp component `FileUpload` — hỗ trợ PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG.

### 3.5. Tab Danh sách mua hàng (NVL)

**Nút header:** "Xuất Excel"

**Bộ lọc & tìm kiếm:** Tìm kiếm theo mã yêu cầu (`placeholder: "Tìm kiếm yêu cầu mua hàng..."`). Nhấn nút **Tìm kiếm** để thực hiện tìm kiếm.

#### Cột bảng danh sách yêu cầu mua hàng (8 cột)

| Cột | Nội dung |
|---|---|
| STT | Số thứ tự (tính từ 1 trên mỗi trang) |
| Mã yêu cầu | Mã YC (chữ xanh dương, có thể click để xem chi tiết) |
| Ngày yêu cầu | Ngày tạo yêu cầu (định dạng DD/MM/YYYY) |
| Nhân viên | Tên nhân viên yêu cầu |
| Sản phẩm | Danh sách hàng hóa (tên × số lượng ĐVT + giá dự kiến nếu có, mỗi item trên 1 dòng) |
| Mức độ ưu tiên | Badge: `Cao` (đỏ) / `Trung bình` (vàng) / `Thấp` (xanh lá) |
| Trạng thái | Badge: `Chờ duyệt` (vàng) / `Đã duyệt` (xanh lá) / `Từ chối` (đỏ) / `Hoàn thành` (emerald) |
| Hành động | Xem (mắt) / Sửa (bút) / Xóa (thùng rác) + nút đặc biệt (xem bên dưới) |

#### Nút hành động trên mỗi dòng

| Điều kiện | Nút | Hành động |
|---|---|---|
| Luôn có | Mắt (Xem) | Mở modal xem chi tiết yêu cầu mua hàng (read-only) |
| Luôn có | Bút (Sửa) | Mở modal "Xử lý yêu cầu mua hàng" |
| Luôn có | Thùng rác (Xóa) | Xác nhận: "Bạn có chắc muốn xóa yêu cầu mua hàng này?" |
| Trạng thái = `Đã duyệt` | "Đã mua xong" (emerald) | Chuyển trạng thái → `Hoàn thành`, gửi thông báo cho kho chuẩn bị nhập hàng |
| Trạng thái = `Hoàn thành` | "Đã hoàn thành" (xám, disabled) | Chỉ hiển thị, không click được |

#### Modal "Xem chi tiết yêu cầu mua hàng"

Nhấn nút **Xem** (mắt) mở modal gồm các thông tin (read-only):

**Phần 1 — Thông tin yêu cầu:**
- Mã yêu cầu (chữ xanh dương)
- Ngày yêu cầu (DD/MM/YYYY)
- Nhân viên yêu cầu + Mã nhân viên
- Phân loại
- Mức độ ưu tiên (badge màu)
- **Danh sách sản phẩm** (bảng con):
  - Cột: STT · Phân loại · Tên hàng hoá · Số lượng · ĐVT · Nhà cung cấp · Giá dự kiến · Thành tiền
  - Dòng cuối: Tổng cộng (tính tự động)
- Mục đích yêu cầu
- Trạng thái (badge)
- Ghi chú (nếu có)
- Người duyệt (nếu có)
- Ngày duyệt (nếu có, DD/MM/YYYY)
- File đính kèm (link hoặc "-" nếu không có)

**Nút:** "Đóng"

#### Modal "Xử lý yêu cầu mua hàng"

Nhấn nút **Sửa** (bút) mở modal gồm 2 phần:

**Phần 1 — Thông tin yêu cầu (chỉ đọc, nền xám):**
- Người yêu cầu + mã NV
- Ngày yêu cầu
- Mức độ ưu tiên
- Phân loại
- Danh sách hàng hóa (hiển thị dạng chip/tag, mỗi item: tên × số lượng ĐVT · phân loại · giá dự kiến)
- Mục đích yêu cầu
- Ghi chú YC
- NCC đã chọn (nếu có)
- Giá dự kiến (nếu có)
- Ghi chú MH (nếu có)
- File đính kèm (nếu có)

**Phần 2 — Xử lý thu mua (có thể sửa):**

| Trường | Loại | Ghi chú |
|---|---|---|
| Trạng thái | Dropdown | `Chờ duyệt` / `Đã duyệt` / `Từ chối` / `Hoàn thành` |
| Người duyệt | Text (readOnly) | **Tự động điền** tên người đăng nhập khi chọn "Đã duyệt" |
| Ngày duyệt | Date picker | **Tự động điền** ngày hiện tại khi chọn "Đã duyệt", có thể chỉnh sửa |
| Nhà cung cấp | Dropdown | Chọn từ danh sách NCC của phòng (mặc định: "— Chưa chọn nhà cung cấp —") |
| Giá dự kiến (VNĐ) | Số | Placeholder: "Nhập giá dự kiến..." |
| Ghi chú mua hàng | Textarea (3 dòng) | Ghi chú nội bộ phòng thu mua (dùng làm lý do từ chối) |
| File đính kèm | FileUpload | PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG |

> **Lưu ý:** Khi chọn trạng thái "Đã duyệt", hệ thống tự động điền Người duyệt (tên người đăng nhập) và Ngày duyệt (ngày hiện tại). Khi từ chối, nên ghi lý do vào "Ghi chú mua hàng" — nội dung này sẽ được gửi kèm thông báo cho người tạo yêu cầu.

**Nút:** "Lưu cập nhật" / "Hủy"

**Thông báo lỗi:** Nếu có lỗi API, hiển thị banner đỏ ở đầu modal với nội dung lỗi.

#### Pagination

Hiển thị khi có nhiều hơn 1 trang (10 yêu cầu/trang):
- Nút "Trước" (disabled nếu ở trang 1)
- Hiển thị "Trang X / Y"
- Nút "Sau" (disabled nếu ở trang cuối)

---

## 4. Phòng mua Thiết bị

### 4.1. Tổng quan

Phòng mua Thiết bị quản lý nhà cung cấp máy móc, thiết bị điện, đơn hàng và yêu cầu mua thiết bị. Giao diện dùng màu **tím (purple)** để phân biệt với phòng NVL.

### 4.2. Các tab chức năng

| Tab | ID | Mô tả |
|---|---|---|
| Nhà cung cấp Thiết bị | `suppliers` | Quản lý danh sách nhà cung cấp thiết bị, máy móc |
| Danh sách đơn hàng | `orderList` | Quản lý đơn hàng mua thiết bị (dùng component OrderManagement) |
| Danh sách mua hàng | `purchaseRequestList` | Quản lý yêu cầu mua hàng thiết bị |

### 4.3. Tab Nhà cung cấp Thiết bị

**Nút header:** "Xuất Excel" + "Thêm nhà cung cấp"

**Bộ lọc & tìm kiếm:** Tìm kiếm theo tên nhà cung cấp (`placeholder: "Tìm kiếm nhà cung cấp..."`). Nhấn nút **Tìm kiếm** để thực hiện tìm kiếm.

Cấu trúc tương tự phòng NVL (xem mục 3.3), nhưng:
- **Mã NCC** được sinh với loại `Thiết bị`
- **Màu nhận diện:** Tím (`purple-600`)
- **Placeholder loại cung cấp:** `VD: Máy móc, Thiết bị điện...`
- **Nút tìm kiếm và thêm:** Màu tím thay vì xanh

#### Cột bảng danh sách nhà cung cấp (11 cột)
Giống phòng NVL (xem mục 3.3): STT · Mã NCC · Tên NCC · Loại cung cấp · Quốc gia · Liên hệ · Loại hình · Trạng thái · Doanh chi · NV tạo · Hoạt động

**Form thêm / sửa nhà cung cấp — 13 trường** (giống phòng NVL):

| STT | Trường | Bắt buộc | Loại nhập |
|---|---|---|---|
| 1 | Mã NCC | Auto | Text (readOnly) |
| 2 | Tên NCC | ✅ | Text |
| 3 | Loại cung cấp | ✅ | Text |
| 4 | Quốc gia | ✅ | Text |
| 5 | Website | ❌ | Text |
| 6 | Người liên hệ | ✅ | Text |
| 7 | SĐT | ✅ | Text |
| 8 | Email | ✅ | Email |
| 9 | Địa chỉ | ✅ | Text |
| 10 | Khả năng cung cấp | ❌ | Text |
| 11 | Loại hình | ✅ | Dropdown — `Sản xuất` / `Thương mại` |
| 12 | Trạng thái | ❌ | Dropdown — `Đang cung cấp` / `Ngừng cung cấp` |
| 13 | Doanh chi (VNĐ) | ❌ | Số |

**Nút:** "Lưu" / "Hủy"

#### Pagination

Hiển thị khi có nhiều hơn 1 trang (10 nhà cung cấp/trang):
- Nút "Trước" (disabled nếu ở trang 1)
- Hiển thị "Trang X / Y"
- Nút "Sau" (disabled nếu ở trang cuối)

### 4.4. Tab Danh sách đơn hàng (Thiết bị)

Dùng cùng component **OrderManagement** và cấu trúc giống hệt phòng NVL (xem mục 3.4 ở trên). Chỉ khác về loại hàng hóa (thiết bị, máy móc) và màu giao diện tím (`purple`). Tích hợp **FileUpload** cho file đính kèm hợp đồng, biên bản.

### 4.5. Tab Danh sách mua hàng (Thiết bị)

Cấu trúc bảng và form xử lý giống phòng NVL (xem mục 3.5), nhưng:
- **Mã yêu cầu** hiển thị màu **tím (`purple-600`)**
- **Nút tìm kiếm:** Màu tím thay vì xanh
- **Nút "Đã mua xong":** Màu emerald (giống NVL)
- Mức độ ưu tiên: `Thấp` / `Trung bình` / `Cao`
- Trạng thái: `Chờ duyệt` / `Đã duyệt` / `Từ chối` / `Hoàn thành`
- Nút "Đã mua xong" hoạt động tương tự phòng NVL

#### Cột bảng danh sách yêu cầu mua hàng (8 cột)
Giống phòng NVL (xem mục 3.5): STT · Mã yêu cầu · Ngày yêu cầu · Nhân viên · Sản phẩm · Mức độ ưu tiên · Trạng thái · Hành động

#### Nút hành động
Giống phòng NVL (xem mục 3.5): Xem / Sửa / Xóa + "Đã mua xong" (khi trạng thái = "Đã duyệt")

#### Modal "Xem chi tiết" và "Xử lý yêu cầu mua hàng"
Giống phòng NVL (xem mục 3.5), chỉ khác về màu sắc (tím thay vì xanh)

---

## 5. Luồng thông báo — Yêu cầu mua hàng

Hệ thống tự động gửi thông báo real-time (chuông thông báo + Web Push) khi trạng thái yêu cầu mua hàng thay đổi. Áp dụng cho cả phòng NVL lẫn phòng Thiết bị.

### 5.1. Bảng tổng hợp thông báo

| Sự kiện | Người nhận | Tiêu đề thông báo | Nội dung |
|---|---|---|---|
| Trạng thái → **Đã duyệt** | Người tạo yêu cầu | "Yêu cầu mua hàng được duyệt" | "Yêu cầu mua hàng [mã] của bạn đã được phê duyệt bởi [người duyệt]." |
| Trạng thái → **Từ chối** | Người tạo yêu cầu | "Yêu cầu mua hàng bị từ chối" | "Yêu cầu mua hàng [mã] của bạn đã bị từ chối[: lý do nếu có]." |
| Trạng thái → **Hoàn thành** | Người tạo yêu cầu | "Yêu cầu mua hàng hoàn thành" | "Yêu cầu mua hàng [mã] đã được hoàn thành — hàng đã được mua và sẵn sàng nhập kho." |
| Trạng thái → **Hoàn thành** | Nhân viên kho sản xuất (`SUBDEPT_PRODUCTION_WAREHOUSE`) | "Yêu cầu cung cấp đã duyệt" | "Yêu cầu cung cấp [mã YC-CC liên kết] đã được phê duyệt." |

> **Lưu ý:** Thông báo tới kho chỉ được gửi khi yêu cầu mua hàng **có liên kết với một yêu cầu cung cấp** (tức là được tạo từ màn hình kho qua luồng YC-CC → YC-MH). Nếu tạo trực tiếp từ bộ phận thu mua mà không có YC-CC, kho vẫn nhận thông báo (chứa mã YC-MH nhưng không có mã YC-CC).

### 5.2. Lý do từ chối

Khi từ chối yêu cầu, thu mua điền lý do vào trường **Ghi chú mua hàng** (`ghiChuMuaHang`). Nội dung này sẽ được đính kèm vào thông báo gửi cho người tạo yêu cầu, giúp họ hiểu nguyên nhân và tạo lại nếu cần.

### 5.3. Ai gửi thông báo?

Thông báo được hệ thống backend tự động gửi sau khi lưu thành công. Không cần thao tác thêm từ người dùng. Người duyệt không cần nhớ thông báo thủ công.

---

## 6. Escalation (Leo thang xử lý)

| Tình huống | Cấp xử lý | Thời hạn | Ghi chú |
|-----------|-----------|----------|---------|
| Nhân viên không thể tạo yêu cầu mua hàng | EMPLOYEE → TEAM_LEAD | Ngay lập tức | Kiểm tra quyền truy cập, hỗ trợ tạo yêu cầu |
| Yêu cầu mua hàng chưa được duyệt quá 2 ngày | TEAM_LEAD → DEPARTMENT_HEAD | 1 ngày làm việc | Nhắc nhở duyệt, kiểm tra ưu tiên |
| Nhà cung cấp không đủ điều kiện hoặc không phản hồi | TEAM_LEAD → DEPARTMENT_HEAD | 1 ngày làm việc | Tìm NCC thay thế, cập nhật trạng thái |
| Đơn hàng vượt hạn mức chi tiêu | DEPARTMENT_HEAD → ADMIN | 2 ngày làm việc | Xin phê duyệt bổ sung, cập nhật hạn mức |
| Lỗi sinh mã NCC hoặc lỗi phân quyền | DEPARTMENT_HEAD → ADMIN | Ngay lập tức | Kiểm tra cấu hình hệ thống, reset dữ liệu nếu cần |
| Không xuất được Excel | TEAM_LEAD → DEPARTMENT_HEAD → ADMIN | 1 ngày làm việc | Kiểm tra quyền, dung lượng server, định dạng dữ liệu |
| Yêu cầu mua hàng bị từ chối | EMPLOYEE → Người duyệt | Ngay lập tức | Xem lý do trong ghi chú mua hàng, tạo lại nếu cần |
| Upload file thất bại | EMPLOYEE → TEAM_LEAD | Ngay lập tức | Kiểm tra định dạng file, kích thước, kết nối mạng |
| Thông báo không được gửi | TEAM_LEAD → DEPARTMENT_HEAD → ADMIN | 1 ngày làm việc | Kiểm tra cấu hình thông báo, log hệ thống |
| Sự cố kỹ thuật (load dữ liệu chậm, crash) | Báo ngay cho ADMIN | Ngay lập tức | Kèm ảnh chụp màn hình lỗi, thời gian xảy ra |

---

## 7. FAQ

**Q1: Làm thế nào để thêm nhà cung cấp NVL mới?**
> Vào **Phòng thu mua NVL** → tab **Nhà cung cấp NVL** → nhấn **Thêm nhà cung cấp**. Điền đầy đủ các trường bắt buộc (có dấu `*`). Mã NCC sẽ được tự động sinh với prefix `NVL`. Nhấn **Lưu** để hoàn tất.

**Q2: Tôi muốn tạo yêu cầu mua hàng cho thiết bị, làm thế nào?**
> Vào **Phòng mua Thiết bị** → tab **Danh sách mua hàng** → nhấn **Tạo yêu cầu** (nếu có nút). Hoặc yêu cầu mua hàng thường được tạo tự động từ **Bộ phận sản xuất → Kho** qua luồng Yêu cầu cung cấp (YC-CC → YC-MH). Sau đó, bộ phận thu mua sẽ xử lý (duyệt, chọn NCC, nhập giá) trên tab **Danh sách mua hàng**.

**Q3: Mức độ ưu tiên của yêu cầu mua hàng có các giá trị nào?**
> Ba mức: **Thấp** (xanh lá), **Trung bình** (vàng), **Cao** (đỏ). Mức ưu tiên ảnh hưởng đến thứ tự xử lý của người duyệt.

**Q4: Trạng thái yêu cầu mua hàng thay đổi như thế nào?**
> Luồng xử lý: `Chờ duyệt` → `Đã duyệt` hoặc `Từ chối` → `Hoàn thành`. Người có quyền TEAM_LEAD trở lên mới được thay đổi trạng thái.
>
> Hệ thống tự động gửi thông báo tới người liên quan khi trạng thái thay đổi:
> - **Đã duyệt** → người tạo yêu cầu nhận thông báo "Yêu cầu mua hàng được duyệt".
> - **Từ chối** → người tạo yêu cầu nhận thông báo kèm lý do (nếu có trong ghi chú mua hàng).
> - **Hoàn thành** → người tạo yêu cầu **và** nhân viên kho (`SUBDEPT_PRODUCTION_WAREHOUSE`) đều nhận thông báo để chuẩn bị nhập hàng.
>
> Xem chi tiết tại **Mục 5 — Luồng thông báo**.

**Q5: Màu sắc hiển thị mã nhà cung cấp có ý nghĩa gì?**
> Mã NCC của cả hai phòng đều hiển thị màu **xanh dương**. Phân biệt phòng qua màu giao diện tổng thể: **Phòng NVL** dùng màu **xanh lá (green)**, **Phòng Thiết bị** dùng màu **tím (purple)**.

**Q6: Tôi có thể xuất danh sách nhà cung cấp ra Excel không?**
> Có. Vào tab **Nhà cung cấp** của phòng tương ứng, nhấn nút **Xuất Excel**. Yêu cầu quyền TEAM_LEAD trở lên. File Excel sẽ chứa tất cả thông tin nhà cung cấp (mã, tên, loại cung cấp, quốc gia, liên hệ, loại hình, trạng thái, doanh chi, nhân viên tạo).

**Q7: Phòng thu mua NVL và Phòng mua Thiết bị có chia sẻ danh sách nhà cung cấp không?**
> Không. Mỗi phòng có danh sách nhà cung cấp độc lập, được phân loại theo tham số `phanLoaiNCC`: `NVL` cho phòng NVL và `Thiết bị` cho phòng Thiết bị. Khi tạo nhà cung cấp, mã NCC sẽ tự động sinh với prefix tương ứng.

**Q8: Nút "Đã mua xong" dùng khi nào?**
> Khi yêu cầu mua hàng đã được duyệt (trạng thái = "Đã duyệt") và hàng đã mua xong, nhấn nút **"Đã mua xong"** (hiển thị màu emerald). Hệ thống sẽ chuyển trạng thái sang "Hoàn thành" và tự động thông báo cho kho chuẩn bị nhập hàng.

**Q9: Tại sao tôi không thấy nút "Đã mua xong"?**
> Nút chỉ hiển thị khi yêu cầu mua hàng có trạng thái **"Đã duyệt"**. Nếu trạng thái là "Chờ duyệt" hoặc "Từ chối", cần duyệt trước. Nếu đã "Hoàn thành", nút sẽ hiển thị dạng xám "Đã hoàn thành" (disabled).

**Q10: Khi duyệt yêu cầu mua hàng, người duyệt và ngày duyệt có cần nhập thủ công không?**
> Không. Khi chọn trạng thái "Đã duyệt", hệ thống tự động điền tên người đang đăng nhập làm người duyệt (readOnly) và ngày hiện tại làm ngày duyệt. Chỉ ngày duyệt có thể chỉnh sửa nếu cần.

**Q11: Làm thế nào để tìm kiếm yêu cầu mua hàng?**
> Vào tab **Danh sách mua hàng** → nhập mã yêu cầu vào ô tìm kiếm (`placeholder: "Tìm kiếm yêu cầu mua hàng..."`) → nhấn nút **Tìm kiếm**. Hệ thống sẽ lọc theo mã yêu cầu.

**Q12: Tôi có thể xuất danh sách yêu cầu mua hàng ra Excel không?**
> Có. Vào tab **Danh sách mua hàng** của phòng tương ứng, nhấn nút **Xuất Excel**. File Excel sẽ chứa tất cả yêu cầu mua hàng (mã, ngày, nhân viên, sản phẩm, mức độ ưu tiên, trạng thái).

**Q13: Khi từ chối yêu cầu mua hàng, người tạo yêu cầu sẽ biết lý do không?**
> Có. Khi từ chối, bộ phận thu mua nên ghi lý do vào trường **Ghi chú mua hàng** trong modal "Xử lý yêu cầu mua hàng". Nội dung này sẽ được đính kèm vào thông báo gửi cho người tạo yêu cầu, giúp họ hiểu nguyên nhân và tạo lại nếu cần.

**Q14: Tôi có thể xóa nhà cung cấp không?**
> Có, nhưng chỉ người có quyền DEPARTMENT_HEAD trở lên mới được xóa. Vào tab **Nhà cung cấp** → nhấn nút **Xóa** (thùng rác) trên dòng nhà cung cấp → xác nhận "Bạn có chắc chắn muốn xóa nhà cung cấp này?". Lưu ý: nếu nhà cung cấp đã được sử dụng trong yêu cầu mua hàng, hệ thống có thể không cho phép xóa.

**Q15: Làm thế nào để chỉnh sửa thông tin nhà cung cấp?**
> Vào tab **Nhà cung cấp** → nhấn nút **Sửa** (bút) trên dòng nhà cung cấp → chỉnh sửa các trường cần thiết → nhấn **Lưu**. Mã NCC không thể chỉnh sửa (readOnly).

**Q16: Tôi có thể xem chi tiết nhà cung cấp không?**
> Có. Vào tab **Nhà cung cấp** → nhấn nút **Xem** (mắt) trên dòng nhà cung cấp → modal sẽ hiển thị tất cả thông tin (read-only). Nhấn **Đóng** để thoát.

**Q17: Khi tạo yêu cầu mua hàng, tôi có thể chọn nhiều sản phẩm không?**
> Có. Yêu cầu mua hàng hỗ trợ danh sách sản phẩm (items). Khi xem chi tiết hoặc xử lý yêu cầu, bạn sẽ thấy bảng con liệt kê tất cả sản phẩm với thông tin: tên, số lượng, đơn vị tính, phân loại, giá dự kiến, và thành tiền (tính tự động).

**Q18: File đính kèm hỗ trợ những định dạng nào?**
> Hỗ trợ: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG. Kích thước file không được vượt quá giới hạn hệ thống (thường 10-50MB tùy cấu hình).

**Q19: Tôi có thể sửa yêu cầu mua hàng sau khi tạo không?**
> Có, nhưng chỉ khi trạng thái là "Chờ duyệt". Khi trạng thái đã chuyển sang "Đã duyệt", "Từ chối", hoặc "Hoàn thành", bạn chỉ có thể xem chi tiết, không thể sửa. Để sửa, cần tạo yêu cầu mới.

**Q20: Phân loại trong yêu cầu mua hàng là gì?**
> Phân loại là trường tùy chọn để phân loại yêu cầu theo danh mục (VD: "Nguyên vật liệu", "Bao bì", "Dịch vụ", v.v.). Nó giúp tổ chức và lọc yêu cầu dễ dàng hơn.

---

## 8. Phụ thuộc liên phòng ban

| Dữ liệu cần | Nguồn | Ghi chú |
|---|---|---|
| Yêu cầu mua hàng (từ kho) | Bộ phận sản xuất → Kho | Luồng YC-CC → YC-MH, tự động tạo yêu cầu mua hàng |
| Đơn hàng (tab Đơn hàng) | Bộ phận kinh doanh | Dùng chung component OrderManagement |
| Thông báo nhập kho | Bộ phận sản xuất → Kho | Khi hoàn thành YC-MH, kho nhận thông báo chuẩn bị nhập hàng |

> **Luồng liên phòng:** Kho tạo Yêu cầu cung cấp (YC-CC) → hệ thống tạo Yêu cầu mua hàng (YC-MH) cho thu mua → thu mua duyệt + mua hàng → nhấn "Đã mua xong" → kho nhận thông báo nhập hàng.

---

## 9. Tính năng nâng cao

### 9.1. Tìm kiếm và lọc

- **Tìm kiếm nhà cung cấp:** Theo tên NCC (không phân biệt hoa/thường)
- **Tìm kiếm yêu cầu mua hàng:** Theo mã yêu cầu
- **Tìm kiếm đơn hàng:** Theo mã ĐH, mã BG, tên khách hàng, trạng thái SX (xem OrderManagement)
- **Pagination:** 10 bản ghi/trang, có nút Trước/Sau

### 9.2. Export Excel

- **Nhà cung cấp:** Xuất tất cả cột (STT, Mã NCC, Tên NCC, Loại cung cấp, Quốc gia, Liên hệ, Loại hình, Trạng thái, Doanh chi, NV tạo)
- **Yêu cầu mua hàng:** Xuất tất cả cột (STT, Mã yêu cầu, Ngày yêu cầu, Nhân viên, Sản phẩm, Mức độ ưu tiên, Trạng thái)
- **Đơn hàng:** Xuất tất cả cột (xem OrderManagement)
- **Định dạng:** XLSX (Excel 2007+), tên file: `[Phòng]_[Loại dữ liệu]_[Ngày].xlsx`

### 9.3. Thông báo real-time

- **Kênh:** Chuông thông báo trong ứng dụng + Web Push (nếu được bật)
- **Sự kiện:** Yêu cầu mua hàng được duyệt, từ chối, hoàn thành
- **Người nhận:** Người tạo yêu cầu, người duyệt, nhân viên kho (nếu có YC-CC liên kết)
- **Nội dung:** Mã yêu cầu, trạng thái mới, lý do (nếu từ chối)

### 9.4. Quyền truy cập chi tiết

| Chức năng | ADMIN | DEPARTMENT_HEAD | TEAM_LEAD | EMPLOYEE |
|-----------|:-----:|:---------------:|:---------:|:--------:|
| Xem danh sách nhà cung cấp | ✅ | ✅ | ✅ | ✅ |
| Thêm nhà cung cấp | ✅ | ✅ | ✅ | ❌ |
| Sửa nhà cung cấp | ✅ | ✅ | ✅ | ❌ |
| Xóa nhà cung cấp | ✅ | ✅ | ❌ | ❌ |
| Xuất Excel nhà cung cấp | ✅ | ✅ | ✅ | ❌ |
| Xem danh sách đơn hàng | ✅ | ✅ | ✅ | ✅ |
| Tạo đơn hàng | ✅ | ✅ | ✅ | ✅ |
| Sửa đơn hàng | ✅ | ✅ | ✅ | ✅ |
| Xóa đơn hàng | ✅ | ✅ | ❌ | ❌ |
| Xuất Excel đơn hàng | ✅ | ✅ | ✅ | ❌ |
| Xem yêu cầu mua hàng | ✅ | ✅ | ✅ | ✅ |
| Tạo yêu cầu mua hàng | ✅ | ✅ | ✅ | ✅ |
| Duyệt yêu cầu mua hàng | ✅ | ✅ | ✅ | ❌ |
| Sửa yêu cầu mua hàng (khi Chờ duyệt) | ✅ | ✅ | ✅ | ✅ |
| Xóa yêu cầu mua hàng | ✅ | ✅ | ✅ | ✅ |
| Xuất Excel yêu cầu mua hàng | ✅ | ✅ | ✅ | ❌ |

---

## 10. Lưu ý quan trọng

1. **Mã NCC tự động sinh:** Không thể chỉnh sửa sau khi tạo. Prefix phụ thuộc vào loại phòng (NVL hoặc Thiết bị).
2. **Yêu cầu mua hàng từ kho:** Thường được tạo tự động từ luồng YC-CC → YC-MH. Bộ phận thu mua chỉ cần xử lý (duyệt, chọn NCC, nhập giá).
3. **Thông báo tự động:** Hệ thống gửi thông báo mà không cần thao tác thủ công. Người duyệt không cần nhớ thông báo.
4. **File đính kèm:** Hỗ trợ PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG. Kích thước tối đa phụ thuộc cấu hình server.
5. **Trạng thái forward-only:** Trạng thái yêu cầu mua hàng chỉ tiến theo luồng: Chờ duyệt → Đã duyệt/Từ chối → Hoàn thành. Không thể lùi lại.
6. **Danh sách sản phẩm:** Yêu cầu mua hàng hỗ trợ nhiều sản phẩm (items). Mỗi item có tên, số lượng, đơn vị tính, phân loại, giá dự kiến.
7. **Giá dự kiến:** Là giá ước tính khi tạo yêu cầu. Giá thực tế có thể khác, được cập nhật khi duyệt.
8. **Ghi chú mua hàng:** Dùng để ghi lý do từ chối hoặc ghi chú nội bộ. Nội dung sẽ được gửi kèm thông báo cho người tạo yêu cầu.
9. **Nút "Đã mua xong":** Chỉ hiển thị khi trạng thái = "Đã duyệt". Nhấn nút này sẽ chuyển trạng thái sang "Hoàn thành" và thông báo cho kho.
10. **Phân biệt phòng:** Phòng NVL dùng màu xanh lá (green), Phòng Thiết bị dùng màu tím (purple). Mã NCC cả hai phòng đều xanh dương.
