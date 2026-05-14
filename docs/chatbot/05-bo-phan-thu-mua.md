---
department: DEPT_PURCHASING
department_name: "Bộ phận thu mua"
roles: [ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE]
access: department_restricted
language: vi
---

# Bộ phận thu mua

## 1. Tổng quan

Bộ phận thu mua gồm hai phòng chức năng:

| Phòng | Chức năng chính | Màu nhận diện | Đường dẫn |
|---|---|---|---|
| **Phòng thu mua NVL** | Quản lý nhà cung cấp NVL, đơn hàng và yêu cầu mua nguyên vật liệu | Xanh dương (`blue`) | `/purchasing/materials` |
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

**Bộ lọc & tìm kiếm:** Tìm kiếm theo tên nhà cung cấp (`placeholder: "Tìm kiếm nhà cung cấp..."`).

**Form thêm / sửa nhà cung cấp — 13 trường:**

| STT | Trường | Bắt buộc | Ghi chú |
|---|---|---|---|
| 1 | Mã NCC | Auto | Tự động sinh, prefix loại `NVL` |
| 2 | Tên nhà cung cấp | ✅ | |
| 3 | Loại cung cấp | ✅ | Ví dụ: Thủy sản, Rau củ, Gia vị... |
| 4 | Quốc gia | ✅ | |
| 5 | Website | ❌ | |
| 6 | Người liên hệ | ✅ | |
| 7 | Số điện thoại | ✅ | |
| 8 | Email liên hệ | ✅ | |
| 9 | Địa chỉ | ✅ | |
| 10 | Khả năng cung cấp | ❌ | Mô tả năng lực cung cấp |
| 11 | Loại hình | ✅ | `Sản xuất` / `Thương mại` |
| 12 | Trạng thái | ❌ | `Đang cung cấp` / `Ngừng cung cấp` |
| 13 | Doanh chi (VNĐ) | ❌ | Doanh số chi trả cho NCC |

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

**Bộ lọc & tìm kiếm:** Tìm kiếm theo mã yêu cầu (`placeholder: "Tìm kiếm yêu cầu mua hàng..."`).

**Form tạo / sửa yêu cầu mua hàng — 11 trường:**

| STT | Trường | Loại | Giá trị / Ghi chú |
|---|---|---|---|
| 1 | Mã yêu cầu | Auto | Tự động sinh, hiển thị màu xanh dương |
| 2 | Ngày yêu cầu | Date | |
| 3 | Nhân viên yêu cầu | Text | |
| 4 | Mã nhân viên | Text | |
| 5 | Phân loại | Text | |
| 6 | Mức độ ưu tiên | Select | `Thấp` / `Trung bình` / `Cao` |
| 7 | Danh sách sản phẩm | Table | Tên hàng hóa, số lượng, đơn vị tính, nhà cung cấp, **giá dự kiến (VNĐ)** |
| 8 | Mục đích yêu cầu | Textarea | |
| 9 | Trạng thái | Select | `Chờ duyệt` / `Đã duyệt` / `Từ chối` / `Hoàn thành` |
| 10 | Ghi chú | Textarea | |
| 11 | Người duyệt | Text | `placeholder: "Nhập tên người duyệt"` |
| 12 | Ngày duyệt | Date | |
| 13 | File đính kèm | File | Upload qua component FileUpload |

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

Cấu trúc tương tự phòng NVL, nhưng:
- **Mã NCC** được sinh với loại `Thiết bị`
- **Màu nhận diện:** Tím (`purple-600`)
- **Placeholder loại cung cấp:** `VD: Máy móc, Thiết bị điện...`

**Form thêm / sửa nhà cung cấp — 13 trường** (giống phòng NVL):

| STT | Trường | Bắt buộc |
|---|---|---|
| 1 | Mã NCC | Auto |
| 2 | Tên NCC | ✅ |
| 3 | Loại cung cấp | ✅ |
| 4 | Quốc gia | ✅ |
| 5 | Website | ❌ |
| 6 | Người liên hệ | ✅ |
| 7 | SĐT | ✅ |
| 8 | Email | ✅ |
| 9 | Địa chỉ | ✅ |
| 10 | Khả năng cung cấp | ❌ |
| 11 | Loại hình | ✅ — `Sản xuất` / `Thương mại` |
| 12 | Trạng thái | ❌ — `Đang cung cấp` / `Ngừng cung cấp` |
| 13 | Doanh chi (VNĐ) | ❌ |

### 4.4. Tab Danh sách đơn hàng (Thiết bị)

Dùng cùng component **OrderManagement** và cấu trúc giống hệt phòng NVL (xem mục 3.4 ở trên). Chỉ khác về loại hàng hóa (thiết bị, máy móc) và màu giao diện tím (`purple`). Tích hợp **FileUpload** cho file đính kèm hợp đồng, biên bản.

### 4.5. Tab Danh sách mua hàng (Thiết bị)

Cấu trúc form giống phòng NVL (13 trường), nhưng:
- **Mã yêu cầu** và **Mã NCC** hiển thị màu **tím (`purple-600`)**
- Mức độ ưu tiên: `Thấp` / `Trung bình` / `Cao`
- Trạng thái: `Chờ duyệt` / `Đã duyệt` / `Từ chối` / `Hoàn thành`

---

## 5. Escalation (Leo thang xử lý)

1. **Nhân viên (EMPLOYEE):** Liên hệ TEAM_LEAD khi cần duyệt yêu cầu mua hàng hoặc gặp lỗi không tạo được phiếu.
2. **TEAM_LEAD:** Báo lên DEPARTMENT_HEAD nếu nhà cung cấp không đủ điều kiện hoặc đơn hàng vượt hạn mức.
3. **DEPARTMENT_HEAD:** Liên hệ ADMIN hệ thống nếu có lỗi sinh mã NCC, lỗi phân quyền hoặc không xuất được Excel.
4. **Yêu cầu mua hàng bị từ chối:** EMPLOYEE liên hệ người duyệt để được giải thích lý do và tạo lại yêu cầu mới.
5. **Sự cố kỹ thuật (upload file, load dữ liệu):** Báo ngay cho bộ phận IT/ADMIN kèm ảnh chụp màn hình lỗi.

---

## 6. FAQ

**Q1: Làm thế nào để thêm nhà cung cấp NVL mới?**
> Vào **Phòng thu mua NVL** → tab **Nhà cung cấp NVL** → nhấn **Thêm NCC**. Điền đầy đủ 13 trường thông tin, các trường có dấu `*` là bắt buộc. Mã NCC sẽ được tự động sinh.

**Q2: Tôi muốn tạo yêu cầu mua hàng cho thiết bị, làm thế nào?**
> Vào **Phòng mua Thiết bị** → tab **Danh sách mua hàng** → nhấn **Tạo yêu cầu**. Điền các trường bắt buộc, chọn mức độ ưu tiên và danh sách sản phẩm cần mua.

**Q3: Mức độ ưu tiên của yêu cầu mua hàng có các giá trị nào?**
> Ba mức: **Thấp**, **Trung bình**, **Cao**. Mức ưu tiên ảnh hưởng đến thứ tự xử lý của người duyệt.

**Q4: Trạng thái yêu cầu mua hàng thay đổi như thế nào?**
> Luồng xử lý: `Chờ duyệt` → `Đã duyệt` hoặc `Từ chối` → `Hoàn thành`. Người có quyền TEAM_LEAD trở lên mới được thay đổi trạng thái. Ngoài ra, có nút **"Đã mua xong"** — khi nhấn, hệ thống đổi trạng thái thành "Hoàn thành" và **thông báo cho kho chuẩn bị nhập hàng**.

**Q5: Màu sắc hiển thị mã nhà cung cấp có ý nghĩa gì?**
> Mã NCC của **Phòng thu mua NVL** hiển thị màu **xanh dương**, của **Phòng mua Thiết bị** hiển thị màu **tím**. Đây là cách phân biệt nhanh trên giao diện.

**Q6: Tôi có thể xuất danh sách nhà cung cấp ra Excel không?**
> Có. Vào tab **Nhà cung cấp** của phòng tương ứng, nhấn nút **Xuất Excel**. Yêu cầu quyền TEAM_LEAD trở lên.

**Q7: Phòng thu mua NVL và Phòng mua Thiết bị có chia sẻ danh sách nhà cung cấp không?**
> Không. Mỗi phòng có danh sách nhà cung cấp độc lập, được phân loại theo tham số `phanLoaiNCC`: `NVL` cho phòng NVL và `Thiết bị` cho phòng Thiết bị.
