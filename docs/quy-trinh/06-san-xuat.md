## Cách truy cập

Từ thanh điều hướng bên trái (sidebar):

- **Phòng QLSX**: Nhấn **Bộ phận sản xuất** → chọn **Phòng QLSX**
- **Quản lý kho**: Nhấn **Bộ phận sản xuất** → chọn **Quản lý kho**
- **Dữ liệu sản xuất**: Nhấn **Bộ phận sản xuất** → chọn **Dữ liệu sản xuất**

## 1. Tổng quan

Hệ thống quản lý sản xuất được chia thành **3 khu vực chức năng** chính:


| Khu vực        | Đường dẫn                | Mô tả                                                                                                                                                                                                                     |
| -------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Phòng QLSX** | `/production/management` | 10 tab: Quản lý máy móc, Danh sách quy trình, Danh sách quy trình sản xuất, Danh sách đơn hàng, Định mức NVL, Đánh giá nguyên liệu, Thông số vận hành hệ thống, Thành phẩm đầu ra, Đánh giá chất lượng, Báo cáo sản lượng |
| **Kho**        | `/production/warehouse`  | 5 tab: Quản lý kho, Danh sách hàng hóa, Nhập kho, Xuất kho, Yêu cầu cung cấp                                                                                                                                              |
| **Dữ liệu SX** | `/production/data`       | 3 tab: Đánh giá nguyên liệu, Thông số vận hành, Thành phẩm đầu ra                                                                                                                                                         |


---

## 2. Quyền truy cập


| Chức năng                                   | Quản trị viên | Trưởng phòng | Tổ trưởng | Nhân viên |
| ------------------------------------------- | ------------- | ------------ | --------- | --------- |
| Xem tất cả dữ liệu                          | ✅             | ✅            | ✅         | ✅         |
| Tạo máy / quy trình / thông số / thành phẩm | ✅             | ✅            | ✅         | ✅         |
| Sửa máy / quy trình / thông số / thành phẩm | ✅             | ✅            | ✅         | ❌         |
| Xóa máy / quy trình / thông số / thành phẩm | ✅             | ✅            | ❌         | ❌         |
| Tạo / sửa kho, lô, phiếu nhập/xuất          | ✅             | ✅            | ✅         | ❌         |
| Xóa kho / lô                                | ✅             | ✅            | ❌         | ❌         |
| Tạo / sửa YC-CC                             | ✅             | ✅            | ✅         | ❌         |
| Xóa YC-CC                                   | ✅             | ❌            | ❌         | ❌         |
| Xuất Excel                                  | ✅             | ✅            | ✅         | ✅         |


> Tất cả các chức năng trong bộ phận sản xuất chỉ hiển thị với người dùng thuộc `DEPT_PRODUCTION`.

---

## 3. Phòng QLSX

### 3.0 Quản lý máy móc — Tab "Quản lý máy móc" (`machines`)

**Truy cập:** `/production/management` → tab **"Quản lý máy móc"**

#### Cột bảng danh sách


| Cột        | Nội dung                   |
| ---------- | -------------------------- |
| Mã máy     | Mã tự động sinh (chữ xanh) |
| Tên máy    | Tên thiết bị               |
| Mô tả      | Mô tả chức năng            |
| Trạng thái | Badge trạng thái           |
| Ghi chú    | Ghi chú bổ sung            |
| Hoạt động  | Sửa / Xóa                  |


#### Trạng thái máy


| Giá trị           | Nhãn hiển thị   | Màu badge |
| ----------------- | --------------- | --------- |
| Hoạt động         | Hoạt động       | Xanh lá   |
| Bảo trì           | Bảo trì         | Vàng      |
| `NGỪNG_HOẠT_ĐỘNG` | Ngừng hoạt động | Đỏ        |


#### Form tạo/sửa máy — nhấn "Thêm máy mới"


| Trường     | Bắt buộc | Loại nhập            | Ghi chú                                                 |
| ---------- | -------- | -------------------- | ------------------------------------------------------- |
| Mã máy     | —        | Văn bản (tự động)    | Hệ thống tự sinh dạng MAY001, MAY002..., không sửa được |
| Tên máy    | ✅        | Văn bản              | VD: "Máy sấy 1"                                         |
| Trạng thái | ✅        | Dropdown             | Hoạt động / Bảo trì / Ngừng hoạt động                   |
| Mô tả      |          | Văn bản dài (3 dòng) |                                                         |
| Ghi chú    |          | Văn bản              |                                                         |


**Bộ lọc:** Mã máy, Tên máy, Trạng thái (dropdown)

> **Quyền:** Tạo/Sửa máy: Quản trị viên, Trưởng phòng. Xóa máy: chỉ Quản trị viên.

---

### 3.1 Lệnh sản xuất — Tab "Danh sách đơn hàng" (`orderList`)

**Truy cập:** `/production/management` → tab **"Danh sách đơn hàng"**

#### Cột bảng danh sách


| Cột           | Nội dung                        |
| ------------- | ------------------------------- |
| STT           | Số thứ tự                       |
| Ngày đặt hàng | Ngày tạo đơn                    |
| Mã đơn hàng   | Mã định danh (chữ xanh đậm)     |
| Mã báo giá    | Mã BG liên kết                  |
| Khách hàng    | Tên khách hàng                  |
| Số lượng SP   | Số sản phẩm trong đơn           |
| Trạng thái SX | Badge trạng thái sản xuất       |
| Trạng thái TT | Badge trạng thái thanh toán     |
| Hành động     | Xem / Xem bảng tính / Sửa / Xóa |


#### Trạng thái sản xuất


| Giá trị                  | Nhãn hiển thị          |
| ------------------------ | ---------------------- |
| `CHO_LEN_KE_HOACH`       | Chờ lên kế hoạch       |
| `CHO_SAN_XUAT`           | Chờ sản xuất           |
| `DANG_SAN_XUAT`          | Đang sản xuất          |
| `CHO_GIAO_HANG`          | Chờ giao hàng          |
| `DA_LEN_CONTAINER`       | Đã lên container       |
| `DANG_VAN_CHUYEN`        | Đang vận chuyển        |
| `DA_GIAO_CHO_KHACH_HANG` | Đã giao cho khách hàng |


#### Cập nhật trạng thái đơn hàng

Nhấn nút **Sửa** (bút) → form chỉnh sửa gồm: Giá trị đơn hàng (USD/VNĐ), Thanh toán đợt 1 & 2 (USD/VNĐ + ngày), Ngày bắt đầu/hoàn thành SX (kế hoạch + thực tế), Ngày giao hàng, Trạng thái SX, Trạng thái TT, Ghi chú → nhấn **"Lưu thay đổi"**.

### 3.1b Danh sách quy trình — Tab "Danh sách quy trình" (`processList`)

**Truy cập:** `/production/management` → tab **"Danh sách quy trình"**

Hiển thị danh sách quy trình mẫu (template). Trong Phòng QLSX, tab này ở chế độ **chỉ xem + tạo định mức** (không tạo/sửa/xóa quy trình — việc đó thuộc Bộ phận chất lượng).

#### Cột bảng


| Cột            | Nội dung                                                      |
| -------------- | ------------------------------------------------------------- |
| STT            | Số thứ tự                                                     |
| Mã quy trình   | Mã định danh                                                  |
| MSNV           | Mã nhân viên tạo                                              |
| Tên nhân viên  | Người tạo quy trình                                           |
| Tên quy trình  | Tên quy trình mẫu                                             |
| Loại quy trình | Sản xuất / Kiểm tra chất lượng / Đóng gói / Vận chuyển / Khác |
| Hoạt động      | Xem chi tiết / Tạo định mức                                   |


**Bộ lọc:** Tên quy trình, Loại quy trình (dropdown), Tên nhân viên

**Hành động:** Nhấn biểu tượng **"+"** để tạo định mức lao động cho quy trình đó.

---

### 3.1c Định mức NVL — Tab "Định mức NVL" (`standards`)

**Truy cập:** `/production/management` → tab **"Định mức NVL"**

Quản lý định mức nguyên vật liệu — xác định tỉ lệ nguyên liệu đầu vào và thành phẩm đầu ra.

#### Cột bảng


| Cột               | Nội dung                                                         |
| ----------------- | ---------------------------------------------------------------- |
| Mã định mức       | Mã tự động sinh                                                  |
| Tên định mức      | Tên mô tả                                                        |
| Loại định mức     | Badge: Nguyên liệu - Thành phẩm (xanh) / Vật tư - Thiết bị (tím) |
| Tỉ lệ thu hồi (%) | Phần trăm thu hồi thành phẩm                                     |
| Ngày tạo          | Ngày tạo bản ghi                                                 |
| Hoạt động         | Xem / Sửa / Xóa                                                  |


#### Form tạo/sửa định mức — nhấn "Thêm định mức"


| Trường                          | Bắt buộc | Loại nhập            | Ghi chú                                      |
| ------------------------------- | -------- | -------------------- | -------------------------------------------- |
| Mã định mức                     | ✅        | Văn bản (tự động)    | Tự sinh khi tạo mới, không sửa được          |
| Loại định mức                   | ✅        | Dropdown             | Nguyên liệu - Thành phẩm / Vật tư - Thiết bị |
| Tên định mức                    | ✅        | Văn bản              |                                              |
| Tỉ lệ thu hồi thành phẩm (%) K3 |          | Số (bước 0.01)       |                                              |
| Ghi chú                         |          | Văn bản dài (3 dòng) |                                              |


**Nguyên liệu đầu vào** (thêm nhiều dòng):


| Trường          | Bắt buộc | Ghi chú                                  |
| --------------- | -------- | ---------------------------------------- |
| Tên nguyên liệu |          | Chọn từ danh sách sản phẩm (có tìm kiếm) |
| Tỉ lệ (%)       | ✅        | Phần trăm nguyên liệu                    |


**Thành phẩm đầu ra** (thêm nhiều dòng):


| Trường         | Bắt buộc | Ghi chú                                  |
| -------------- | -------- | ---------------------------------------- |
| Tên thành phẩm |          | Chọn từ danh sách sản phẩm (có tìm kiếm) |
| Tỉ lệ (%)      | ✅        | Phần trăm thành phẩm                     |


**Bộ lọc:** Mã định mức, Tên định mức, Loại định mức (dropdown)

---

### 3.2 Danh sách quy trình sản xuất — Tab "Danh sách quy trình sản xuất" (`productionOrders`)

**Truy cập:** `/production/management` → tab **"Danh sách quy trình sản xuất"**

Đây là tab tạo và quản lý **quy trình sản xuất cụ thể** (khác với "Danh sách quy trình" là template mẫu). Mỗi quy trình sản xuất được tạo từ một quy trình mẫu, gắn với nhân viên, khối lượng và thời gian thực tế.

#### Cột bảng


| Cột                    | Nội dung                         |
| ---------------------- | -------------------------------- |
| STT                    | Số thứ tự                        |
| Mã QTSX                | Mã quy trình sản xuất            |
| Tên quy trình sản xuất | Tên quy trình                    |
| Mã NV                  | Mã nhân viên phụ trách           |
| Tên nhân viên          | Tên nhân viên phụ trách          |
| Định mức NVL           | Định mức nguyên vật liệu áp dụng |
| Sản phẩm đầu ra        | Sản phẩm thành phẩm mục tiêu     |
| Khối lượng (Kg)        | Khối lượng nguyên liệu đầu vào   |
| Thời gian (Ngày)       | Thời gian thực hiện              |
| Hoạt động              | Xem / Sửa / Đồng bộ từ mẫu / Xóa |


**Bộ lọc:** Mã QTSX, Tên QTSX, Mã NV, Tên NV

#### Form tạo quy trình sản xuất — nhấn "Tạo quy trình sản xuất"


| Trường                             | Bắt buộc | Loại nhập      | Ghi chú                           |
| ---------------------------------- | -------- | -------------- | --------------------------------- |
| Chọn quy trình mẫu                 | ✅        | Dropdown       | Không thể thay đổi khi sửa        |
| Tên quy trình sản xuất             |          | Văn bản        |                                   |
| Mã NV                              | —        | Chỉ đọc        | Tự động từ tài khoản đăng nhập    |
| Tên nhân viên                      | —        | Chỉ đọc        | Tự động từ tài khoản đăng nhập    |
| Khối lượng (Kg)                    |          | Số (bước 0.01) |                                   |
| Thời gian (Ngày)                   |          | Số (bước 0.01) |                                   |
| Chọn Định mức NVL                  |          | Dropdown       | Hiển thị mã + tên + tỉ lệ thu hồi |
| Chọn sản phẩm đầu ra               |          | Dropdown       | Chỉ bật sau khi chọn Định mức NVL |
| Tổng nguyên liệu cần sản xuất (Kg) | —        | Chỉ đọc        | Tự động tính                      |
| Số giờ làm trong 1 ngày            |          | Số (bước 0.01) |                                   |


Sau khi chọn quy trình mẫu, bảng **flowchart** hiện ra với các cột có thể nhập:

- **Số lượng nguyên liệu (Kg)**, **Số phút thực hiện**, **Số lượng kế hoạch** (tự tính), **Số lượng thực tế**

**Nút hành động trên từng dòng:**

- **Xem chi tiết** — xem + xuất Excel
- **Chỉnh sửa** — sửa thông tin
- **Đồng bộ từ quy trình mẫu** — cập nhật flowchart theo template mới nhất
- **Xóa** — xóa quy trình sản xuất

### 3.3 Thông số vận hành hệ thống — Tab "Thông số vận hành hệ thống" (`systemOperation`)

**Truy cập:** `/production/management` → tab **"Thông số vận hành hệ thống"**

Giao diện có **thanh tab phụ theo từng máy** — chọn máy để xem thông số của máy đó. Máy đang bảo trì hiển thị "(Bảo trì)", máy ngừng hiển thị "(Ngừng)".

**Bộ lọc:** Mã chiên, Trạng thái (dropdown: Đang hoạt động / Bảo trì / Ngừng hoạt động)

#### Cột bảng


| Cột                     | Nội dung                          |
| ----------------------- | --------------------------------- |
| STT                     | Số thứ tự                         |
| Mã chiên                | Mã định danh mẻ chiên             |
| Tên máy                 | Tên thiết bị                      |
| Thời gian chiên         | Thời điểm chiên                   |
| Khối lượng đầu vào (kg) | Khối lượng nguyên liệu            |
| Tổng thời gian sấy      | Tổng thời gian 4 giai đoạn (phút) |
| Trạng thái              | Badge trạng thái máy              |
| Ghi chú                 | Ghi chú bổ sung                   |
| Người thực hiện         | Nhân viên vận hành                |
| Hoạt động               | Xem / Sửa / Xóa                   |


#### Form tạo/sửa thông số — nhấn "Thêm thông số"

**Thông tin cơ bản:**


| Trường                  | Bắt buộc | Loại nhập            | Ghi chú                                   |
| ----------------------- | -------- | -------------------- | ----------------------------------------- |
| Mã chiên                | —        | Chỉ đọc              | Tự động sinh, không sửa được              |
| Tên máy                 | —        | Chỉ đọc              | Tự động từ tab máy đang chọn              |
| Thời gian chiên         | ✅        | Chọn ngày giờ        |                                           |
| Khối lượng đầu vào (kg) |          | Số (bước 0.01)       |                                           |
| Trạng thái              | —        | Chỉ đọc              | Tự động từ trạng thái máy, không sửa được |
| Người thực hiện         | ✅        | Văn bản              |                                           |
| File đính kèm           |          | Tải file             |                                           |
| Ghi chú                 |          | Văn bản dài (3 dòng) |                                           |


**4 giai đoạn — mỗi giai đoạn ghi nhận 3 thông số:**


| Giai đoạn   | Thông số                                          |
| ----------- | ------------------------------------------------- |
| Giai đoạn 1 | Thời gian (phút) · Nhiệt độ (°C) · Áp suất (mmHg) |
| Giai đoạn 2 | Thời gian (phút) · Nhiệt độ (°C) · Áp suất (mmHg) |
| Giai đoạn 3 | Thời gian (phút) · Nhiệt độ (°C) · Áp suất (mmHg) |
| Giai đoạn 4 | Thời gian (phút) · Nhiệt độ (°C) · Áp suất (mmHg) |


Trường tổng hợp: **Tổng thời gian sấy** (tự động tính).

### 3.4 Thành phẩm đầu ra — Tab "Thành phẩm đầu ra" (`finishedProduct`)

**Truy cập:** `/production/management` → tab **"Thành phẩm đầu ra"**

Giao diện có **thanh tab phụ theo từng máy** + tab đặc biệt **"Tổng các máy"** (tổng hợp tất cả máy, chỉ xem).

**Bộ lọc:** Mã chiên, Tên hàng hóa

#### Cột bảng (tab từng máy)


| Cột             | Nội dung                       |
| --------------- | ------------------------------ |
| STT             | Số thứ tự                      |
| Mã chiên        | Mã định danh mẻ chiên          |
| Thời gian chiên | Thời điểm chiên                |
| Tên hàng hóa    | Tên nguyên liệu/sản phẩm       |
| KL đầu vào (kg) | Khối lượng nguyên liệu đầu vào |
| Người thực hiện | Nhân viên nhập liệu            |
| Trạng thái      | Badge trạng thái máy           |
| Hoạt động       | Xem / Sửa / Xóa                |


#### Tab "Tổng các máy" — chỉ xem, không sửa/xóa


| Cột             | Nội dung                      |
| --------------- | ----------------------------- |
| STT             | Số thứ tự                     |
| Mã chiên        | Mã định danh mẻ chiên         |
| Thời gian chiên | Thời điểm chiên               |
| Tên hàng hóa    | Tên nguyên liệu/sản phẩm      |
| Tổng KL (kg)    | Tổng khối lượng tất cả máy    |
| Người thực hiện | Nhân viên nhập liệu           |
| Số máy          | Badge "X máy"                 |
| Đánh giá        | Máy min/max theo tỉ lệ loại A |
| Hoạt động       | Xem (không có Sửa/Xóa)        |


#### Form tạo/sửa thành phẩm — nhập liệu theo mã chiên


| Loại thành phẩm | Trường khối lượng     | Trường tỉ lệ    |
| --------------- | --------------------- | --------------- |
| **Loại A**      | aKhoiLuong (Kg)       | aTiLe (%)       |
| **Loại B**      | bKhoiLuong (Kg)       | bTiLe (%)       |
| **B đầu**       | bDauKhoiLuong (Kg)    | bDauTiLe (%)    |
| **Loại C**      | cKhoiLuong (Kg)       | cTiLe (%)       |
| **Vụn lớn**     | vunLonKhoiLuong (Kg)  | vunLonTiLe (%)  |
| **Vụn nhỏ**     | vunNhoKhoiLuong (Kg)  | vunNhoTiLe (%)  |
| **Phế phẩm**    | phePhamKhoiLuong (Kg) | phePhamTiLe (%) |
| **Ướt**         | uotKhoiLuong (Kg)     | uotTiLe (%)     |


> Hệ thống tự động tính **Tổng khối lượng thành phẩm** và đánh giá min/max theo từng máy. Người thực hiện tự động từ tài khoản đăng nhập.

### 3.5 Đánh giá nguyên liệu — Tab "Đánh giá nguyên liệu" (`materialEvaluation`)

**Truy cập:** `/production/management` → tab **"Đánh giá nguyên liệu"**

Ghi nhận kết quả đánh giá chất lượng nguyên liệu đầu vào (quá trình ngâm).

#### Cột bảng


| Cột                   | Nội dung                                |
| --------------------- | --------------------------------------- |
| STT                   | Số thứ tự                               |
| Mã chiên              | Mã định danh mẻ chiên                   |
| Thời gian chiên       | Thời điểm chiên                         |
| Tên hàng hóa          | Tên nguyên liệu                         |
| Khối lượng (Kg)       | Khối lượng nguyên liệu                  |
| Thời gian ngâm (Phút) | Thời gian ngâm thực tế                  |
| Hoạt động             | Xem / Sửa / Xóa / Tạo thông số vận hành |


#### Form tạo/sửa — nhấn "Thêm đánh giá"


| Trường                        | Bắt buộc | Loại nhập         | Ghi chú                                                 |
| ----------------------------- | -------- | ----------------- | ------------------------------------------------------- |
| Mã chiên                      | ✅        | Văn bản (tự động) | Hệ thống tự sinh                                        |
| Thời gian chiên               | ✅        | Chọn ngày giờ     |                                                         |
| Tên hàng hóa                  | ✅        | Văn bản           |                                                         |
| Số lô, Kiện                   | ✅        | Văn bản           |                                                         |
| Khối lượng (Kg)               | ✅        | Số (bước 0.01)    |                                                         |
| Số lần ngâm                   | ✅        | Số                |                                                         |
| Nhiệt độ nước trước ngâm (°C) | ✅        | Số (bước 0.1)     |                                                         |
| Nhiệt độ nước sau vớt (°C)    | ✅        | Số (bước 0.1)     |                                                         |
| Thời gian ngâm (Phút)         | ✅        | Số                |                                                         |
| Brix nước ngâm                | ✅        | Số (bước 0.1)     |                                                         |
| Đánh giá trước ngâm           | ✅        | Văn bản           | Nhập mã tiêu chí, cách nhau bằng dấu phẩy (VD: "1,2,3") |
| Đánh giá sau ngâm             | ✅        | Văn bản           | Tương tự trên                                           |
| Người thực hiện               | ✅        | Văn bản           |                                                         |
| File đính kèm                 |          | Tải file          |                                                         |


**Nút đặc biệt:** Biểu tượng **bánh răng** (tím) → **Tạo thông số vận hành** — tự động tạo bản ghi thông số vận hành cho tất cả máy và chuyển sang tab Thông số vận hành.

**Cài đặt tiêu chí đánh giá:** Nhấn **"Cài đặt đánh giá"** → quản lý danh sách tiêu chí (mã số + mô tả).

**Bộ lọc:** Mã chiên, Tên hàng hóa

---

### 3.6 Đánh giá chất lượng — Tab "Đánh giá chất lượng" (`qualityEvaluation`)

**Truy cập:** `/production/management` → tab **"Đánh giá chất lượng"**

Đánh giá chất lượng thành phẩm đầu ra theo từng máy.

**Giao diện:** Có thanh tab phụ hiển thị danh sách máy — chọn máy để xem đánh giá của máy đó.

**Bộ lọc:** Mã chiên, Tên hàng hóa

#### Cột bảng


| Cột             | Nội dung           |
| --------------- | ------------------ |
| STT             | Số thứ tự          |
| Mã chiên        | Mã mẻ chiên        |
| Thời gian chiên | Thời điểm chiên    |
| Tên hàng hóa    | Tên sản phẩm       |
| Màu sắc         | Đánh giá màu sắc   |
| Mùi hương       | Đánh giá mùi hương |
| Vị              | Đánh giá vị        |
| Độ ngọt         | Đánh giá độ ngọt   |
| Độ giòn         | Đánh giá độ giòn   |
| Người thực hiện | Nhân viên đánh giá |
| Hoạt động       | Xem / Sửa / Xóa    |


#### Form tạo/sửa

**Thông tin cơ bản (tự động lấy từ Đánh giá nguyên liệu, không sửa được):**

- Mã chiên, Thời gian chiên, Tên hàng hóa

**Tỉ lệ thành phẩm đầu ra (%) — chỉ đọc:**

- A (%), B (%), B Dầu (%), C (%), Vụn lớn (%), Vụn nhỏ (%), Phế phẩm (%), Ướt (%)

**Đánh giá chất lượng (nhập liệu):**


| Trường                      | Bắt buộc | Loại nhập                      |
| --------------------------- | -------- | ------------------------------ |
| Màu sắc                     |          | Văn bản                        |
| Mùi hương                   |          | Văn bản                        |
| Hương vị (Vị)               |          | Văn bản                        |
| Độ ngọt                     |          | Văn bản                        |
| Độ giòn                     |          | Văn bản                        |
| Đánh giá tổng quan          |          | Văn bản dài (4 dòng)           |
| Đề xuất điều chỉnh cải tiến |          | Văn bản dài (4 dòng)           |
| File đính kèm               |          | Tải file                       |
| Người thực hiện             | —        | Tự động từ tài khoản đăng nhập |


**Nút:** Xuất Excel (header)

---

### 3.7 Báo cáo sản lượng — Tab "Báo cáo sản lượng" (`productionReport`)

**Truy cập:** `/production/management` → tab **"Báo cáo sản lượng"**

Báo cáo sản lượng hàng ngày, so sánh kế hoạch vs thực tế.

#### Cột bảng


| Cột                | Nội dung                           |
| ------------------ | ---------------------------------- |
| Ngày tháng         | Ngày báo cáo (dd/mm/yyyy)          |
| Tổng số tua SX     | Số tua sản xuất trong ngày         |
| Số mẻ thực tế      | Số mẻ thực tế đã chạy              |
| Mã định mức        | Mã định mức NVL sử dụng (chữ xanh) |
| Chênh lệch KL (kg) | Xanh nếu >= 0, đỏ nếu < 0          |
| Người thực hiện    | Nhân viên báo cáo                  |
| Hoạt động          | Xem / Sửa / Xóa                    |


#### Form tạo/sửa — nhấn "Tạo báo cáo"


| Trường                           | Bắt buộc | Loại nhập            | Ghi chú                                                    |
| -------------------------------- | -------- | -------------------- | ---------------------------------------------------------- |
| Ngày tháng                       | ✅        | Chọn ngày            | Tự động lấy KL thành phẩm thực tế từ tab Thành phẩm đầu ra |
| Chọn Định mức NVL                |          | Dropdown             | Danh sách định mức + tỉ lệ thu hồi                         |
| Tổng số tua SX/ngày              |          | Số                   | Thay đổi → tự tính Tổng số mẻ kế hoạch                     |
| Số mẻ/tua                        |          | Số                   |                                                            |
| Tổng số mẻ kế hoạch              |          | Số (tự tính)         | = Tổng số tua × Số mẻ/tua                                  |
| Số mẻ thực tế                    |          | Số                   | Thay đổi → tự tính Tổng KL nguyên liệu                     |
| Tổng KL nguyên liệu (kg)         | —        | Số (chỉ đọc)         | = Số mẻ thực tế × 50                                       |
| Tổng KL thành phẩm định mức (kg) | —        | Số (chỉ đọc)         | = Tổng KL NL × (Tỉ lệ thu hồi / 100)                       |
| KL thành phẩm thực tế (kg)       |          | Số                   | Tự động lấy từ Thành phẩm đầu ra theo ngày                 |
| Đánh giá chênh lệch              | —        | Chỉ đọc              | = KL thực tế − KL định mức (xanh/đỏ)                       |
| Nguyên nhân chênh lệch           |          | Văn bản dài (3 dòng) |                                                            |
| Đề xuất điều chỉnh, cải tiến     |          | Văn bản dài (3 dòng) |                                                            |
| Người thực hiện                  |          | Văn bản              | Tự động từ tài khoản đăng nhập                             |


**Bộ lọc:** Mã định mức, Người thực hiện

---

## 4. Quản lý kho

### 4.1 Quản lý kho và lô hàng (tab **Quản lý kho**)

**Truy cập:** Từ thanh điều hướng bên trái → nhấn **Bộ phận sản xuất** → chọn **Quản lý kho** → vào tab **Quản lý kho**.

#### Tạo kho mới

1. Từ thanh điều hướng bên trái, nhấn **Bộ phận sản xuất** → chọn **Quản lý kho**.
2. Vào tab **Quản lý kho**.
3. Nhấn nút **"+ Thêm kho"** (nằm ở cuối thanh tab ngang danh sách kho).
4. Nhập **Tên kho** ✅ (bắt buộc) — ví dụ: "Kho nguyên liệu", "Kho thành phẩm".
5. Nhấn **"Tạo mới"** để lưu. Hệ thống tự động sinh mã kho (KHO001, KHO002...).

> Lưu ý: Không có trường "Địa chỉ kho", "Người quản lý" hay "Sức chứa" trong form tạo kho — chỉ cần nhập Tên kho.

#### Tạo lô hàng trong kho

1. Chọn kho vừa tạo (tab kho xuất hiện trong thanh tab ngang).
2. Nhấn **"Thêm lô"** trong kho đó.
3. Nhập **Tên lô** ✅ → nhấn **"Tạo mới"**.

#### Thêm sản phẩm vào lô

1. Trong lô, nhấn **"Thêm sản phẩm"**.
2. Chọn **Loại sản phẩm** (dropdown), tìm theo mã/tên sản phẩm.
3. Chọn **Sản phẩm** ✅, nhập **Số lượng** ✅ và **Đơn vị tính** ✅.
4. Nhấn **"Thêm"** để lưu.

#### Di chuyển sản phẩm giữa các lô

1. Trong bảng sản phẩm của lô, nhấn icon **Di chuyển** (mũi tên sang phải).
2. Chọn **Kho đích** ✅ và **Lô đích** ✅.
3. Nhấn **"Di chuyển"**. Nếu sản phẩm đã có ở lô đích, hệ thống tự động gộp số lượng.

#### Xóa kho / lô

- Xóa kho: nhấn **"Xóa kho"** trong tab kho đó (xóa toàn bộ lô và sản phẩm bên trong).
- Xóa lô: nhấn **"Xóa lô"** trong lô đó.

### 4.2 Nhập kho (tab **Nhập kho**)

**Bộ lọc danh sách:**


| Cột                 | Nội dung                |
| ------------------- | ----------------------- |
| Ngày nhập           | Ngày thực hiện nhập kho |
| Nhân viên thực hiện | Người lập phiếu         |
| Kho                 | Kho nhận hàng           |
| Lô hàng             | Lô chứa hàng            |
| Sản phẩm            | Tên hàng hóa            |
| Số lượng nhập       | Số lượng nhập kho       |
| Ghi chú             | Ghi chú thêm            |


**Form tạo phiếu nhập:**


| Trường                 | Bắt buộc | Ghi chú                        |
| ---------------------- | -------- | ------------------------------ |
| Tên nhân viên          | —        | Tự động từ tài khoản đăng nhập |
| Mã nhân viên           | —        | Tự động từ tài khoản đăng nhập |
| Chọn kho               | ✅        | Dropdown danh sách kho         |
| Chọn số lô             | ✅        | Dropdown lô trong kho đã chọn  |
| Chọn hàng hóa nhập kho | ✅        | Dropdown danh sách hàng hóa    |
| Số lượng nhập kho      | ✅        | Nhập số lượng                  |
| Ghi chú                | —        | Nhập ghi chú (nếu có)          |


### 4.3 Xuất kho (tab **Xuất kho**)

**Bộ lọc danh sách:**


| Cột                 | Nội dung                |
| ------------------- | ----------------------- |
| Ngày xuất           | Ngày thực hiện xuất kho |
| Nhân viên thực hiện | Người lập phiếu         |
| Kho                 | Kho xuất hàng           |
| Lô hàng             | Lô chứa hàng            |
| Sản phẩm            | Tên hàng hóa            |
| Số lượng xuất       | Số lượng xuất kho       |
| Ghi chú             | Ghi chú thêm            |


**Form tạo phiếu xuất:**


| Trường                 | Bắt buộc | Ghi chú                        |
| ---------------------- | -------- | ------------------------------ |
| Tên nhân viên          | —        | Tự động từ tài khoản đăng nhập |
| Mã nhân viên           | —        | Tự động từ tài khoản đăng nhập |
| Chọn kho               | ✅        | Dropdown danh sách kho         |
| Chọn số lô             | ✅        | Dropdown lô trong kho đã chọn  |
| Chọn hàng hóa xuất kho | ✅        | Hàng hóa cần xuất              |
| Số lượng xuất kho      | ✅        | Nhập số lượng                  |
| Ghi chú                | —        | Nhập ghi chú (nếu có)          |


### 4.4 Yêu cầu cung cấp — Tab "Yêu cầu cung cấp" (`supplyRequest`)

**Truy cập:** `/production/warehouse` → tab **"Yêu cầu cung cấp"**

Quản lý yêu cầu cung cấp vật tư từ kho cho sản xuất. Đây là điểm khởi đầu của luồng mua hàng nội bộ: kho tạo yêu cầu → thu mua xử lý mua → kho nhận hàng và nhập kho.

#### Dashboard thống kê


| Thẻ           | Nội dung                                          |
| ------------- | ------------------------------------------------- |
| Tổng yêu cầu  | Tổng số YC-CC trong hệ thống                      |
| Đã cung cấp   | Số YC-CC ở trạng thái `Đã cung cấp`               |
| Chưa cung cấp | Số YC-CC chưa hoàn thành (tất cả trạng thái khác) |


> Tab **"Yêu cầu cung cấp"** có **badge đỏ** hiển thị số lượng YC-CC đang ở trạng thái `Đã mua hàng` — tức là hàng đã được mua và đang chờ kho nhập. Khi badge > 0, kho cần ưu tiên xử lý nhập kho.

#### Luồng trạng thái YC-CC

```
Chưa cung cấp → Đang xử lý → Đã duyệt mua → Đã mua hàng → Đã cung cấp
```


| Trạng thái      | Ý nghĩa                                      | Ai thay đổi                               |
| --------------- | -------------------------------------------- | ----------------------------------------- |
| `Chưa cung cấp` | Mới tạo, chờ thu mua xử lý                   | Tự động khi tạo YC-CC                     |
| `Đang xử lý`    | Thu mua đã tạo YC-MH từ YC-CC này            | Tự động khi thu mua tạo YC-MH             |
| `Đã duyệt mua`  | YC-MH đã được duyệt                          | Tự động khi thu mua duyệt YC-MH           |
| `Đã mua hàng`   | YC-MH hoàn thành — hàng đã mua, chờ nhập kho | Tự động khi thu mua đánh dấu "Hoàn thành" |
| `Đã cung cấp`   | Kho đã nhập hàng xong                        | Kho thao tác thủ công                     |


> Dòng `Đã mua hàng` được **highlight màu vàng cam** trong bảng để kho dễ nhận biết hàng nào đang chờ nhập.

#### Bảng danh sách YC-CC


| Cột            | Nội dung                                             |
| -------------- | ---------------------------------------------------- |
| Mã YC          | Mã tự động sinh (dạng YC-CC-YYYY-XXX)                |
| Người yêu cầu  | Tên nhân viên tạo yêu cầu                            |
| Hàng hóa       | Tên / danh sách hàng hóa cần cung cấp                |
| Số lượng       | Số lượng yêu cầu                                     |
| Mức độ ưu tiên | `Thấp` / `Trung bình` / `Cao` (màu xanh / vàng / đỏ) |
| Trạng thái     | Badge trạng thái theo luồng trên                     |
| Ngày tạo       | Ngày tạo yêu cầu                                     |
| Hành động      | Xem chi tiết / Tạo YC-MH / Đánh dấu hoàn thành       |


**Bộ lọc:** Tìm theo mã yêu cầu, trạng thái (dropdown đầy đủ 5 trạng thái).

#### Form tạo YC-CC — nhấn "Tạo yêu cầu cung cấp"


| Trường             | Bắt buộc | Ghi chú                                                       |
| ------------------ | -------- | ------------------------------------------------------------- |
| Nhân viên yêu cầu  | —        | Tự động từ tài khoản đăng nhập                                |
| Mức độ ưu tiên     | ✅        | `Thấp` / `Trung bình` / `Cao`                                 |
| Mục đích yêu cầu   | ❌        | Mô tả lý do cần vật tư                                        |
| Ghi chú            | ❌        |                                                               |
| Danh sách hàng hóa | ✅        | Nhiều dòng: Phân loại · Tên hàng hóa · Số lượng · Đơn vị tính |


#### Tạo Yêu cầu mua hàng (YC-MH) từ YC-CC

Khi kho cần mua hàng từ nhà cung cấp bên ngoài, nhấn nút **"Tạo YC mua hàng"** trên dòng YC-CC tương ứng. Hệ thống tự động:

- Tạo một YC-MH mới trong bộ phận thu mua (phòng thu mua NVL hoặc Thiết bị tùy loại hàng)
- Sao chép danh sách hàng hóa, số lượng, đơn vị tính từ YC-CC sang
- Liên kết YC-MH với YC-CC (qua trường `supplyRequestId`)
- Chuyển trạng thái YC-CC sang `Đang xử lý`

> Sau khi tạo, kho không cần làm gì thêm — thu mua sẽ xử lý YC-MH và cập nhật trạng thái. Kho nhận thông báo khi hàng đã được mua xong.

#### Thông báo nhận từ bộ phận thu mua

Khi thu mua đánh dấu YC-MH là **"Hoàn thành"**, hệ thống tự động gửi thông báo real-time tới tất cả nhân viên kho (`SUBDEPT_PRODUCTION_WAREHOUSE`):


| Tiêu đề                     | Nội dung                                         |
| --------------------------- | ------------------------------------------------ |
| "Yêu cầu cung cấp đã duyệt" | "Yêu cầu cung cấp [mã YC-CC] đã được phê duyệt." |


Đồng thời, trạng thái YC-CC tương ứng tự động chuyển sang `Đã mua hàng` và dòng đó được highlight vàng cam trong bảng — kho tiến hành tạo phiếu nhập kho (tab **Nhập kho**) cho lô hàng này.

#### Hoàn thành YC-CC — Đánh dấu "Đã cung cấp"

Sau khi kho đã nhập hàng vào kho, nhấn nút **"Đánh dấu hoàn thành"** (hoặc cập nhật trạng thái thủ công) trên dòng YC-CC để chuyển sang `Đã cung cấp`. Thao tác này đóng vòng đời của yêu cầu.

### 4.5 Danh sách hàng hóa — Tab "Danh sách hàng hóa" (`products`)

**Truy cập:** `/production/warehouse` → tab **"Danh sách hàng hóa"**

Quản lý danh mục sản phẩm quốc tế — dùng chung với Bộ phận kinh doanh và là **nguồn dữ liệu cho dropdown nguyên liệu/thành phẩm** trong Phòng QLSX (tab Định mức NVL, Đánh giá nguyên liệu, v.v.).

> Nếu một sản phẩm chưa có trong danh sách này, nó sẽ **không xuất hiện trong dropdown** ở các tab trong Phòng QLSX. Cần thêm sản phẩm vào đây trước khi tạo Định mức NVL hoặc Đánh giá nguyên liệu.

#### Quyền truy cập Danh sách hàng hóa


| Chức năng                       | Quản trị viên | Trưởng phòng | Tổ trưởng | Nhân viên |
| ------------------------------- | ------------- | ------------ | --------- | --------- |
| Xem danh sách                   | ✅             | ✅            | ✅         | ✅         |
| Thêm hàng hóa mới               | ✅             | ✅            | ✅         | ❌         |
| Sửa hàng hóa                    | ✅             | ✅            | ✅         | ❌         |
| Xóa hàng hóa                    | ✅             | ❌            | ❌         | ❌         |
| Quản lý loại hàng hóa (Cài đặt) | ✅             | ✅            | ❌         | ❌         |
| Xuất Excel                      | ✅             | ✅            | ✅         | ✅         |


#### Form thêm / sửa hàng hóa


| Trường        | Bắt buộc | Ghi chú                                      |
| ------------- | -------- | -------------------------------------------- |
| Mã hàng hóa   | ✅        | Tự động sinh (SP001, SP002...), có thể chỉnh |
| Tên hàng hóa  | ✅        |                                              |
| Loại hàng hóa | ❌        | Chọn từ danh sách loại đã cài đặt            |
| Đơn vị tính   | ❌        | Ví dụ: Kg, Cái, Lít                          |
| Mô tả         | ❌        |                                              |


---

## 5. Dữ liệu sản xuất (`ProductionData`)

Trang tổng hợp báo cáo thống kê gồm 3 tab:


| Tab                        | Nội dung                                                                                                             |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Đánh giá nguyên liệu       | Thống kê chất lượng nguyên vật liệu đầu vào — cùng component với tab trong Phòng QLSX                                |
| Thông số vận hành hệ thống | Tổng hợp các thông số chiên/sấy theo mã chiên — cùng component với tab trong Phòng QLSX                              |
| Thành phẩm đầu ra          | Báo cáo sản lượng và tỉ lệ các loại thành phẩm — cùng component với tab trong Phòng QLSX, bao gồm tab "Tổng các máy" |


> Dữ liệu sản xuất là **trang xem tổng hợp** — dùng cùng component với Phòng QLSX nhưng truy cập từ menu riêng (`/production/data`). Không có chức năng riêng biệt nào khác.

---

## 6. Escalation


| Tình huống                         | Hành động                                                               |
| ---------------------------------- | ----------------------------------------------------------------------- |
| Không truy cập được trang sản xuất | Kiểm tra role thuộc `DEPT_PRODUCTION`                                   |
| Không tạo được phiếu nhập/xuất kho | Kiểm tra kho và lô đã được tạo chưa                                     |
| Thông số vận hành không lưu được   | Kiểm tra Mã chiên, Tên máy, Thời gian chiên, Người thực hiện đã điền đủ |
| Dữ liệu thành phẩm không hiển thị  | Kiểm tra mã chiên tồn tại trong hệ thống                                |
| Cần hỗ trợ kỹ thuật                | Liên hệ Quản trị viên hoặc Trưởng phòng                                 |


---

## 7. FAQ

**Q1: Làm thế nào để tạo phiếu nhập kho?**
Vào **Quản lý kho** → chọn tab **Nhập kho** → nhấn **Thêm mới** → chọn kho, lô hàng, hàng hóa, nhập số lượng → Lưu.

**Q2: Tôi có thể di chuyển sản phẩm giữa các lô không?**
Có. Vào **Quản lý kho** → chọn sản phẩm trong lô → nhấn icon **Di chuyển sang lô khác** → chọn lô đích.

**Q3: Các loại thành phẩm đầu ra gồm những loại nào?**
Hệ thống phân loại 8 loại: **A, B, B đầu, C, Vụn lớn, Vụn nhỏ, Phế phẩm, Ướt**. Mỗi loại ghi nhận khối lượng (Kg) và tỉ lệ (%).

**Q4: Thông số vận hành có bao nhiêu giai đoạn?**
Có **4 giai đoạn**, mỗi giai đoạn ghi nhận Thời gian (phút), Nhiệt độ (°C), Áp suất (mmHg).

**Q5: Quy trình sản xuất khác gì với quy trình mẫu?**
**Quy trình mẫu** là template có sẵn. **Quy trình sản xuất** là bản cụ thể tạo từ quy trình mẫu, gắn với nhân viên, khối lượng và thời gian thực tế.

**Q6: Ai có thể xóa phiếu nhập/xuất kho?**
Chỉ **Quản trị viên** và **Trưởng phòng** có quyền xóa.

**Q7: Dữ liệu sản xuất cập nhật theo thời gian thực không?**
Trang tổng quan tự động tải lại khi vào trang. Có thể nhấn nút **Làm mới** để cập nhật thủ công.

**Q8: Làm thế nào để xuất báo cáo thành phẩm?**
Vào tab **Dữ liệu SX** → chọn mục **Thành phẩm đầu ra** → sử dụng chức năng xuất Excel nếu có, hoặc xem bảng tổng hợp trực tiếp trên màn hình.

**Q9: Làm thế nào để thêm máy mới vào hệ thống?**
Vào tab **Quản lý máy móc** → nhấn **"Thêm máy mới"** → điền Tên máy (bắt buộc), chọn Trạng thái → Lưu. Mã máy tự động sinh.

**Q10: Định mức NVL dùng để làm gì?**
Định mức NVL xác định tỉ lệ nguyên liệu đầu vào và thành phẩm đầu ra. Khi tạo Quy trình sản xuất hoặc Báo cáo sản lượng, hệ thống dùng tỉ lệ thu hồi từ định mức để tự động tính khối lượng thành phẩm kỳ vọng.

**Q11: Báo cáo sản lượng tính chênh lệch như thế nào?**
Chênh lệch = KL thành phẩm thực tế − KL thành phẩm định mức. Nếu dương (xanh) = vượt kế hoạch. Nếu âm (đỏ) = chưa đạt kế hoạch. KL định mức = Tổng KL nguyên liệu × (Tỉ lệ thu hồi / 100).

**Q12: Phòng QLSX có bao nhiêu tab?**
Có **10 tab**: Quản lý máy móc, Danh sách quy trình, Danh sách quy trình sản xuất, Danh sách đơn hàng, Định mức NVL, Đánh giá nguyên liệu, Thông số vận hành hệ thống, Thành phẩm đầu ra, Đánh giá chất lượng, Báo cáo sản lượng.

**Q13: Làm thế nào để tạo kho mới?**
Từ thanh điều hướng bên trái → nhấn **Bộ phận sản xuất** → chọn **Quản lý kho** → vào tab **Quản lý kho** → nhấn **"+ Thêm kho"** → nhập **Tên kho** → nhấn **"Tạo mới"**. Mã kho tự động sinh (KHO001, KHO002...). Không có trường địa chỉ hay người quản lý trong form này.

**Q14: Sau khi tạo kho, làm thế nào để thêm lô hàng?**
Chọn kho vừa tạo trong thanh tab → nhấn **"Thêm lô"** → nhập **Tên lô** → nhấn **"Tạo mới"**. Sau đó có thể thêm sản phẩm vào lô bằng nút **"Thêm sản phẩm"**.

**Q15: Tạo kho mới nằm ở đâu trong hệ thống? Có phải trong Bộ phận kế toán không?**
Không. Tạo kho nằm trong **Bộ phận sản xuất** → **Quản lý kho** → tab **Quản lý kho**. Không có chức năng tạo kho trong Bộ phận kế toán hay bất kỳ bộ phận nào khác.

**Q16: Tôi muốn tạo phiếu nhập kho nhưng chưa có kho nào, phải làm gì?**
Cần tạo kho và lô trước: vào tab **Quản lý kho** → nhấn **"+ Thêm kho"** → tạo kho → nhấn **"Thêm lô"** → tạo lô. Sau đó mới vào tab **Nhập kho** để tạo phiếu nhập.

**Q17: Yêu cầu cung cấp (YC-CC) có bao nhiêu trạng thái?**
Có 5 trạng thái theo thứ tự: `Chưa cung cấp` → `Đang xử lý` → `Đã duyệt mua` → `Đã mua hàng` → `Đã cung cấp`. Các trạng thái từ "Đang xử lý" trở đi được cập nhật tự động theo tiến trình xử lý từ bộ phận thu mua.

**Q18: Badge đỏ trên tab "Yêu cầu cung cấp" có nghĩa là gì?**
Badge đỏ hiển thị số lượng YC-CC đang ở trạng thái `Đã mua hàng` — tức là thu mua đã mua xong hàng và đang chờ kho nhập. Khi badge > 0, kho cần vào tab Nhập kho để tạo phiếu nhập cho các lô hàng đó.

**Q19: Kho có nhận thông báo khi thu mua mua xong hàng không?**
Có. Khi bộ phận thu mua đánh dấu YC-MH là "Hoàn thành", hệ thống tự động gửi thông báo real-time tới tất cả nhân viên kho với nội dung "Yêu cầu cung cấp [mã] đã được phê duyệt". Đồng thời dòng YC-CC tương ứng sẽ highlight vàng cam trong bảng.

**Q20: Kho tạo YC-CC xong thì có cần làm gì thêm không?**
Không. Sau khi tạo YC-CC và nhấn "Tạo YC mua hàng" để chuyển sang thu mua, kho chỉ cần chờ thông báo. Khi nhận được thông báo "hàng đã mua xong", kho vào tab **Nhập kho** tạo phiếu nhập, sau đó quay lại tab **Yêu cầu cung cấp** đánh dấu `Đã cung cấp`.

---

## 8. Phụ thuộc liên phòng ban


| Dữ liệu cần                                        | Nguồn                         | Đường dẫn tạo                                     |
| -------------------------------------------------- | ----------------------------- | ------------------------------------------------- |
| Danh sách đơn hàng (cho tab Đơn hàng)              | Bộ phận kinh doanh            | Phòng KD quốc tế/nội địa → Tab Đơn hàng           |
| Danh sách hàng hóa (cho Định mức NVL, Đánh giá NL) | Bộ phận sản xuất (tự quản lý) | Quản lý kho → Tab Danh sách hàng hóa              |
| Quy trình mẫu (cho Quy trình sản xuất)             | Bộ phận chất lượng            | Phòng chất lượng → Tab Quy trình                  |
| Yêu cầu mua hàng (từ YC-CC)                        | Bộ phận thu mua               | Phòng thu mua NVL/Thiết bị → Tab Yêu cầu mua hàng |
| Nhà cung cấp (cho YC-MH)                           | Bộ phận thu mua               | Phòng thu mua → Tab Nhà cung cấp                  |


> **Thứ tự setup:** Trước khi bộ phận sản xuất hoạt động đầy đủ, cần đảm bảo: (1) Hàng hóa đã được tạo trong tab Danh sách hàng hóa, (2) Quy trình mẫu đã được tạo bởi bộ phận chất lượng, (3) Đơn hàng đã được tạo bởi bộ phận kinh doanh, (4) Kho và lô đã được tạo trước khi nhập/xuất kho.

---

## 9. Luồng dữ liệu sản xuất

```
Đánh giá nguyên liệu (nhập mã chiên, thông tin ngâm)
    ↓ Nhấn "Tạo thông số vận hành" (icon bánh răng)
Thông số vận hành hệ thống (4 giai đoạn chiên/sấy cho từng máy)
    ↓ Sau khi sấy xong
Thành phẩm đầu ra (ghi nhận KL 8 loại thành phẩm theo mã chiên)
    ↓ Dữ liệu tổng hợp
Đánh giá chất lượng (đánh giá cảm quan: màu, mùi, vị, giòn)
    ↓ Cuối ngày
Báo cáo sản lượng (so sánh KL thực tế vs định mức, phân tích chênh lệch)
```

> **Mã chiên** là khóa liên kết xuyên suốt: từ Đánh giá nguyên liệu → Thông số vận hành → Thành phẩm đầu ra → Đánh giá chất lượng. Tất cả đều dùng cùng mã chiên để truy vết nguồn gốc.

---

## 10. Lưu ý quan trọng

1. **Mã chiên tự động sinh** — không cần nhập thủ công, hệ thống tự tạo khi thêm Đánh giá nguyên liệu mới.
2. **Trạng thái máy ảnh hưởng Thông số vận hành** — khi tạo thông số vận hành, trạng thái tự động lấy từ trạng thái máy hiện tại (không sửa được).
3. **Tổng thời gian sấy tự tính** — bằng tổng thời gian 4 giai đoạn.
4. **Tỉ lệ thành phẩm tự tính** — khi nhập khối lượng từng loại, hệ thống tự tính tỉ lệ % dựa trên tổng khối lượng.
5. **Người thực hiện tự động** — nhiều form tự động điền tên người đăng nhập hiện tại.
6. **Tab "Tổng các máy"** trong Thành phẩm đầu ra — chỉ xem, không sửa/xóa, tổng hợp dữ liệu từ tất cả máy.
7. **Quy trình sản xuất có thể đồng bộ** — nhấn nút "Đồng bộ từ quy trình mẫu" để cập nhật flowchart theo template mới nhất từ bộ phận chất lượng.
8. **Kho phải tạo trước lô, lô phải tạo trước khi nhập hàng** — không thể tạo phiếu nhập/xuất nếu chưa có kho và lô.
9. **YC-CC liên kết với YC-MH** — khi tạo YC mua hàng từ YC-CC, hai bản ghi được liên kết qua `supplyRequestId`. Trạng thái YC-CC tự động cập nhật theo tiến trình xử lý của thu mua.
10. **File đính kèm** — hỗ trợ upload file cho: Đánh giá nguyên liệu, Thông số vận hành, Thành phẩm đầu ra, Đánh giá chất lượng, Báo cáo sản lượng.

