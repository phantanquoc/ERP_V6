---
department: DEPT_PRODUCTION
department_name: "Bộ phận sản xuất"
roles: [ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE]
access: department_restricted
language: vi
---

# Bộ phận Sản xuất

## 1. Tổng quan

Hệ thống quản lý sản xuất được chia thành **3 khu vực chức năng** chính:

| Khu vực | Đường dẫn | Mô tả |
|---|---|---|
| **Phòng QLSX** | `/production/management` | 10 tab: Quản lý máy, Quy trình, QTSX, Đơn hàng, Định mức NVL, Đánh giá NL, Thông số VH, Thành phẩm, Đánh giá CL, Báo cáo SL |
| **Kho** | `/production/warehouse` | 5 tab: Quản lý kho, Phiếu nhập, Phiếu xuất, Yêu cầu cung cấp, Sản phẩm |
| **Dữ liệu SX** | `/production/data` | 3 tab: Đánh giá nguyên liệu, Thông số vận hành, Thành phẩm đầu ra |

---

## 2. Quyền truy cập

| Role | Xem | Tạo mới | Sửa | Xóa |
|---|---|---|---|---|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| DEPARTMENT_HEAD | ✅ | ✅ | ✅ | ✅ |
| TEAM_LEAD | ✅ | ✅ | ✅ | ❌ |
| EMPLOYEE | ✅ | ✅ | ❌ | ❌ |

> Tất cả các chức năng trong bộ phận sản xuất chỉ hiển thị với người dùng thuộc `DEPT_PRODUCTION`.

---

## 3. Phòng QLSX

### 3.0 Quản lý máy móc — Tab "Quản lý máy móc" (`machines`)

**Truy cập:** `/production/management` → tab **"Quản lý máy móc"**

#### Cột bảng danh sách

| Cột | Nội dung |
|---|---|
| Mã máy | Mã tự động sinh (chữ xanh) |
| Tên máy | Tên thiết bị |
| Mô tả | Mô tả chức năng |
| Trạng thái | Badge trạng thái |
| Ghi chú | Ghi chú bổ sung |
| Hoạt động | Sửa / Xóa |

#### Trạng thái máy

| Giá trị | Nhãn hiển thị | Màu badge |
|---|---|---|
| `HOAT_DONG` | Hoạt động | Xanh lá |
| `BẢO_TRÌ` | Bảo trì | Vàng |
| `NGỪNG_HOẠT_ĐỘNG` | Ngừng hoạt động | Đỏ |

#### Form tạo/sửa máy — nhấn "Thêm máy mới"

| Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|:---:|---|---|
| Mã máy | — | Văn bản (tự động) | Hệ thống tự sinh, không sửa được |
| Tên máy | ✅ | Văn bản | VD: "Máy sấy 1" |
| Trạng thái | ✅ | Dropdown | Hoạt động / Bảo trì / Ngừng hoạt động |
| Mô tả | | Văn bản dài (3 dòng) | |
| Ghi chú | | Văn bản | |

**Bộ lọc:** Mã máy, Tên máy, Trạng thái (dropdown)

---

### 3.1 Lệnh sản xuất — Tab "Danh sách đơn hàng" (`orderList`)

**Truy cập:** `/production/management` → tab **"Danh sách đơn hàng"**

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

#### Trạng thái sản xuất

| Giá trị | Nhãn hiển thị |
|---|---|
| `CHO_LEN_KE_HOACH` | Chờ lên kế hoạch |
| `CHO_SAN_XUAT` | Chờ sản xuất |
| `DANG_SAN_XUAT` | Đang sản xuất |
| `CHO_GIAO_HANG` | Chờ giao hàng |
| `DA_LEN_CONTAINER` | Đã lên container |
| `DANG_VAN_CHUYEN` | Đang vận chuyển |
| `DA_GIAO_CHO_KHACH_HANG` | Đã giao cho khách hàng |

#### Cập nhật trạng thái đơn hàng

Nhấn nút **Sửa** (bút) → form chỉnh sửa gồm: Giá trị đơn hàng (USD/VNĐ), Thanh toán đợt 1 & 2 (USD/VNĐ + ngày), Ngày bắt đầu/hoàn thành SX (kế hoạch + thực tế), Ngày giao hàng, Trạng thái SX, Trạng thái TT, Ghi chú → nhấn **"Lưu thay đổi"**.

### 3.1b Danh sách quy trình — Tab "Danh sách quy trình" (`processList`)

**Truy cập:** `/production/management` → tab **"Danh sách quy trình"**

Hiển thị danh sách quy trình mẫu (template). Trong Phòng QLSX, tab này ở chế độ **chỉ xem + tạo định mức** (không tạo/sửa/xóa quy trình — việc đó thuộc Bộ phận chất lượng).

#### Cột bảng

| Cột | Nội dung |
|---|---|
| STT | Số thứ tự |
| Mã quy trình | Mã định danh |
| MSNV | Mã nhân viên tạo |
| Tên nhân viên | Người tạo quy trình |
| Tên quy trình | Tên quy trình mẫu |
| Loại quy trình | Sản xuất / Kiểm tra chất lượng / Đóng gói / Vận chuyển / Khác |
| Hoạt động | Xem chi tiết / Tạo định mức |

**Bộ lọc:** Tên quy trình, Loại quy trình (dropdown), Tên nhân viên

**Hành động:** Nhấn biểu tượng **"+"** để tạo định mức lao động cho quy trình đó.

---

### 3.1c Định mức NVL — Tab "Định mức NVL" (`standards`)

**Truy cập:** `/production/management` → tab **"Định mức NVL"**

Quản lý định mức nguyên vật liệu — xác định tỉ lệ nguyên liệu đầu vào và thành phẩm đầu ra.

#### Cột bảng

| Cột | Nội dung |
|---|---|
| Mã định mức | Mã tự động sinh |
| Tên định mức | Tên mô tả |
| Loại định mức | Badge: Nguyên liệu - Thành phẩm (xanh) / Vật tư - Thiết bị (tím) |
| Tỉ lệ thu hồi (%) | Phần trăm thu hồi thành phẩm |
| Ngày tạo | Ngày tạo bản ghi |
| Hoạt động | Xem / Sửa / Xóa |

#### Form tạo/sửa định mức — nhấn "Thêm định mức"

| Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|:---:|---|---|
| Mã định mức | ✅ | Văn bản (tự động) | Tự sinh khi tạo mới, không sửa được |
| Loại định mức | ✅ | Dropdown | Nguyên liệu - Thành phẩm / Vật tư - Thiết bị |
| Tên định mức | ✅ | Văn bản | |
| Tỉ lệ thu hồi thành phẩm (%) K3 | | Số (bước 0.01) | |
| Ghi chú | | Văn bản dài (3 dòng) | |

**Nguyên liệu đầu vào** (thêm nhiều dòng):

| Trường | Bắt buộc | Ghi chú |
|---|:---:|---|
| Tên nguyên liệu | | Chọn từ danh sách sản phẩm (có tìm kiếm) |
| Tỉ lệ (%) | ✅ | Phần trăm nguyên liệu |

**Thành phẩm đầu ra** (thêm nhiều dòng):

| Trường | Bắt buộc | Ghi chú |
|---|:---:|---|
| Tên thành phẩm | | Chọn từ danh sách sản phẩm (có tìm kiếm) |
| Tỉ lệ (%) | ✅ | Phần trăm thành phẩm |

**Bộ lọc:** Mã định mức, Tên định mức, Loại định mức (dropdown)

---

### 3.2 Quy trình sản xuất

**Form tạo quy trình** (tab **Quy trình sản xuất**):

| Trường | Ghi chú |
|---|---|
| Chọn quy trình mẫu | Dropdown quy trình có sẵn |
| Tên quy trình sản xuất | Nhập tên quy trình |
| Mã NV | Mã nhân viên phụ trách |
| Tên nhân viên | Tên nhân viên phụ trách |
| Khối lượng (Kg) | Khối lượng nguyên liệu đầu vào |
| Thời gian (Ngày) | Thời gian thực hiện |
| Chọn Định mức NVL | Định mức nguyên vật liệu |
| Chọn sản phẩm đầu ra | Sản phẩm thành phẩm mục tiêu |
| Tổng nguyên liệu cần sản xuất (Kg) | Tự động tính |
| Số giờ làm trong 1 ngày | Số giờ làm việc/ngày |

### 3.3 Thông số vận hành hệ thống

**Form thông số** (tab **Thông số vận hành**) — theo dõi 4 giai đoạn chiên/sấy:

| Trường chung | Ghi chú |
|---|---|
| Mã chiên | Mã định danh mẻ chiên (bắt buộc) |
| Tên máy | Tên thiết bị sử dụng (bắt buộc) |
| Thời gian chiên | Thời điểm/thời lượng chiên (bắt buộc) |
| Khối lượng đầu vào (kg) | Khối lượng nguyên liệu đưa vào |
| Trạng thái | Trạng thái hiện tại của mẻ |
| Người thực hiện | Nhân viên vận hành (bắt buộc) |
| File đính kèm | Ảnh/tài liệu đính kèm |
| Ghi chú | Ghi chú bổ sung |

**4 giai đoạn — mỗi giai đoạn ghi nhận 3 thông số:**

| Giai đoạn | Thông số |
|---|---|
| Giai đoạn 1 | Thời gian (phút) · Nhiệt độ (°C) · Áp suất (mmHg) |
| Giai đoạn 2 | Thời gian (phút) · Nhiệt độ (°C) · Áp suất (mmHg) |
| Giai đoạn 3 | Thời gian (phút) · Nhiệt độ (°C) · Áp suất (mmHg) |
| Giai đoạn 4 | Thời gian (phút) · Nhiệt độ (°C) · Áp suất (mmHg) |

Trường tổng hợp: **Tổng thời gian sấy** (tự động tính).

### 3.4 Thành phẩm đầu ra

**Form thành phẩm** (tab **Thành phẩm đầu ra**) — nhập liệu theo mã chiên:

| Loại thành phẩm | Trường khối lượng | Trường tỉ lệ |
|---|---|---|
| **Loại A** | aKhoiLuong (Kg) | aTiLe (%) |
| **Loại B** | bKhoiLuong (Kg) | bTiLe (%) |
| **B đầu** | bDauKhoiLuong (Kg) | bDauTiLe (%) |
| **Loại C** | cKhoiLuong (Kg) | cTiLe (%) |
| **Vụn lớn** | vunLonKhoiLuong (Kg) | vunLonTiLe (%) |
| **Vụn nhỏ** | vunNhoKhoiLuong (Kg) | vunNhoTiLe (%) |
| **Phế phẩm** | phePhamKhoiLuong (Kg) | phePhamTiLe (%) |
| **Ướt** | uotKhoiLuong (Kg) | uotTiLe (%) |

> Hệ thống tự động tính **Tổng khối lượng thành phẩm** và đánh giá min/max theo từng máy.

### 3.5 Đánh giá nguyên liệu — Tab "Đánh giá nguyên liệu" (`materialEvaluation`)

**Truy cập:** `/production/management` → tab **"Đánh giá nguyên liệu"**

Ghi nhận kết quả đánh giá chất lượng nguyên liệu đầu vào (quá trình ngâm).

#### Cột bảng

| Cột | Nội dung |
|---|---|
| STT | Số thứ tự |
| Mã chiên | Mã định danh mẻ chiên |
| Thời gian chiên | Thời điểm chiên |
| Tên hàng hóa | Tên nguyên liệu |
| Khối lượng (Kg) | Khối lượng nguyên liệu |
| Thời gian ngâm (Phút) | Thời gian ngâm thực tế |
| Hoạt động | Xem / Sửa / Xóa / Tạo thông số vận hành |

#### Form tạo/sửa — nhấn "Thêm đánh giá"

| Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|:---:|---|---|
| Mã chiên | ✅ | Văn bản (tự động) | Hệ thống tự sinh |
| Thời gian chiên | ✅ | Chọn ngày giờ | |
| Tên hàng hóa | ✅ | Văn bản | |
| Số lô, Kiện | ✅ | Văn bản | |
| Khối lượng (Kg) | ✅ | Số (bước 0.01) | |
| Số lần ngâm | ✅ | Số | |
| Nhiệt độ nước trước ngâm (°C) | ✅ | Số (bước 0.1) | |
| Nhiệt độ nước sau vớt (°C) | ✅ | Số (bước 0.1) | |
| Thời gian ngâm (Phút) | ✅ | Số | |
| Brix nước ngâm | ✅ | Số (bước 0.1) | |
| Đánh giá trước ngâm | ✅ | Văn bản | Nhập mã tiêu chí, cách nhau bằng dấu phẩy (VD: "1,2,3") |
| Đánh giá sau ngâm | ✅ | Văn bản | Tương tự trên |
| Người thực hiện | ✅ | Văn bản | |
| File đính kèm | | Tải file | |

**Nút đặc biệt:** Biểu tượng **bánh răng** (tím) → **Tạo thông số vận hành** — tự động tạo bản ghi thông số vận hành cho tất cả máy và chuyển sang tab Thông số vận hành.

**Cài đặt tiêu chí đánh giá:** Nhấn **"Cài đặt đánh giá"** → quản lý danh sách tiêu chí (mã số + mô tả).

---

### 3.6 Đánh giá chất lượng — Tab "Đánh giá chất lượng" (`qualityEvaluation`)

**Truy cập:** `/production/management` → tab **"Đánh giá chất lượng"**

Đánh giá chất lượng thành phẩm đầu ra theo từng máy.

**Giao diện:** Có thanh tab phụ hiển thị danh sách máy — chọn máy để xem đánh giá của máy đó.

#### Cột bảng

| Cột | Nội dung |
|---|---|
| STT | Số thứ tự |
| Mã chiên | Mã mẻ chiên |
| Thời gian chiên | Thời điểm chiên |
| Tên hàng hóa | Tên sản phẩm |
| Màu sắc | Đánh giá màu sắc |
| Mùi hương | Đánh giá mùi hương |
| Vị | Đánh giá vị |
| Độ ngọt | Đánh giá độ ngọt |
| Độ giòn | Đánh giá độ giòn |
| Người thực hiện | Nhân viên đánh giá |
| Hoạt động | Xem / Sửa / Xóa |

#### Form tạo/sửa

**Thông tin cơ bản (tự động lấy từ Đánh giá nguyên liệu, không sửa được):**
- Mã chiên, Thời gian chiên, Tên hàng hóa

**Tỉ lệ thành phẩm đầu ra (%) — chỉ đọc:**
- A (%), B (%), B Dầu (%), C (%), Vụn lớn (%), Vụn nhỏ (%), Phế phẩm (%), Ướt (%)

**Đánh giá chất lượng (nhập liệu):**

| Trường | Bắt buộc | Loại nhập |
|---|:---:|---|
| Màu sắc | | Văn bản |
| Mùi hương | | Văn bản |
| Vị | | Văn bản |
| Độ ngọt | | Văn bản |
| Độ giòn | | Văn bản |
| Đánh giá tổng quan | | Văn bản dài (4 dòng) |
| Đề xuất điều chỉnh cải tiến | | Văn bản dài (4 dòng) |
| File đính kèm | | Văn bản (URL) |
| Người thực hiện | — | Tự động từ tài khoản đăng nhập |

**Nút:** Xuất Excel (header)

---

### 3.7 Báo cáo sản lượng — Tab "Báo cáo sản lượng" (`productionReport`)

**Truy cập:** `/production/management` → tab **"Báo cáo sản lượng"**

Báo cáo sản lượng hàng ngày, so sánh kế hoạch vs thực tế.

#### Cột bảng

| Cột | Nội dung |
|---|---|
| Ngày tháng | Ngày báo cáo (dd/mm/yyyy) |
| Tổng số tua SX | Số tua sản xuất trong ngày |
| Số mẻ thực tế | Số mẻ thực tế đã chạy |
| Mã định mức | Mã định mức NVL sử dụng (chữ xanh) |
| Chênh lệch KL (kg) | Xanh nếu >= 0, đỏ nếu < 0 |
| Người thực hiện | Nhân viên báo cáo |
| Hoạt động | Xem / Sửa / Xóa |

#### Form tạo/sửa — nhấn "Tạo báo cáo"

| Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|:---:|---|---|
| Ngày tháng | ✅ | Chọn ngày | Tự động lấy KL thành phẩm thực tế từ tab Thành phẩm đầu ra |
| Chọn Định mức NVL | | Dropdown | Danh sách định mức + tỉ lệ thu hồi |
| Tổng số tua SX/ngày | | Số | Thay đổi → tự tính Tổng số mẻ kế hoạch |
| Số mẻ/tua | | Số | |
| Tổng số mẻ kế hoạch | | Số (tự tính) | = Tổng số tua × Số mẻ/tua |
| Số mẻ thực tế | | Số | Thay đổi → tự tính Tổng KL nguyên liệu |
| Tổng KL nguyên liệu (kg) | — | Số (chỉ đọc) | = Số mẻ thực tế × 50 |
| Tổng KL thành phẩm định mức (kg) | — | Số (chỉ đọc) | = Tổng KL NL × (Tỉ lệ thu hồi / 100) |
| KL thành phẩm thực tế (kg) | | Số | Tự động lấy từ Thành phẩm đầu ra theo ngày |
| Đánh giá chênh lệch | — | Chỉ đọc | = KL thực tế − KL định mức (xanh/đỏ) |
| Nguyên nhân chênh lệch | | Văn bản dài (3 dòng) | |
| Đề xuất điều chỉnh, cải tiến | | Văn bản dài (3 dòng) | |
| Người thực hiện | | Văn bản | Tự động từ tài khoản đăng nhập |

**Bộ lọc:** Mã định mức, Người thực hiện

---

## 4. Quản lý kho

### 4.1 Quản lý kho và lô hàng (tab **Quản lý kho**)

- Tạo/xóa **kho** (nhập tên kho)
- Tạo/xóa **lô hàng** trong kho (nhập tên lô)
- Thêm/xóa sản phẩm trong lô
- **Di chuyển sản phẩm** sang lô khác

### 4.2 Phiếu nhập kho (tab **Phiếu nhập kho**)

**Bộ lọc danh sách:**

| Cột | Nội dung |
|---|---|
| Ngày nhập | Ngày thực hiện nhập kho |
| Nhân viên thực hiện | Người lập phiếu |
| Kho | Kho nhận hàng |
| Lô hàng | Lô chứa hàng |
| Sản phẩm | Tên hàng hóa |
| Số lượng nhập | Số lượng nhập kho |
| Ghi chú | Ghi chú thêm |

**Form tạo phiếu nhập:**

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Tên nhân viên | — | Tự động từ tài khoản đăng nhập |
| Mã nhân viên | — | Tự động từ tài khoản đăng nhập |
| Chọn kho | ✅ | Dropdown danh sách kho |
| Chọn số lô | ✅ | Dropdown lô trong kho đã chọn |
| Chọn hàng hóa nhập kho | ✅ | Dropdown danh sách hàng hóa |
| Số lượng nhập kho | ✅ | Nhập số lượng |
| Ghi chú | — | Nhập ghi chú (nếu có) |

### 4.3 Phiếu xuất kho (tab **Phiếu xuất kho**)

**Bộ lọc danh sách:**

| Cột | Nội dung |
|---|---|
| Ngày xuất | Ngày thực hiện xuất kho |
| Nhân viên thực hiện | Người lập phiếu |
| Kho | Kho xuất hàng |
| Lô hàng | Lô chứa hàng |
| Sản phẩm | Tên hàng hóa |
| Số lượng xuất | Số lượng xuất kho |
| Ghi chú | Ghi chú thêm |

**Form tạo phiếu xuất:**

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Tên nhân viên | — | Tự động từ tài khoản đăng nhập |
| Mã nhân viên | — | Tự động từ tài khoản đăng nhập |
| Chọn kho | ✅ | Dropdown danh sách kho |
| Chọn số lô | ✅ | Dropdown lô trong kho đã chọn |
| Chọn hàng hóa nhập kho | ✅ | Hàng hóa cần xuất |
| Số lượng xuất kho | ✅ | Nhập số lượng |
| Ghi chú | — | Nhập ghi chú (nếu có) |

### 4.4 Yêu cầu cung cấp — Tab "Yêu cầu cung cấp" (`supplyRequest`)

**Truy cập:** `/production/warehouse` → tab **"Yêu cầu cung cấp"**

Quản lý yêu cầu cung cấp vật tư từ kho cho sản xuất.

**Trạng thái:** Đã cung cấp / Chưa cung cấp

**Dashboard thống kê:** Tổng yêu cầu, Đã cung cấp, Chưa cung cấp

### 4.5 Sản phẩm — Tab "Sản phẩm" (`products`)

**Truy cập:** `/production/warehouse` → tab **"Sản phẩm"**

Quản lý danh mục sản phẩm quốc tế (dùng chung với Bộ phận kinh doanh).

---

## 5. Dữ liệu sản xuất (`ProductionData`)

Trang tổng hợp báo cáo thống kê gồm 3 mục:

| Mục | Nội dung |
|---|---|
| Đánh giá nguyên liệu | Thống kê chất lượng nguyên vật liệu đầu vào |
| Thông số vận hành hệ thống | Tổng hợp các thông số chiên/sấy theo mã chiên |
| Thành phẩm đầu ra | Báo cáo sản lượng và tỉ lệ các loại thành phẩm |

Dashboard tổng quan hiển thị biểu đồ tròn (PieChart) theo trạng thái máy và đơn hàng, thống kê kho (tổng kho, kho trống, lô trống), phiếu nhập/xuất.

---

## 6. Escalation

| Tình huống | Hành động |
|---|---|
| Không truy cập được trang sản xuất | Kiểm tra role thuộc `DEPT_PRODUCTION` |
| Không tạo được phiếu nhập/xuất kho | Kiểm tra kho và lô đã được tạo chưa |
| Thông số vận hành không lưu được | Kiểm tra Mã chiên, Tên máy, Thời gian chiên, Người thực hiện đã điền đủ |
| Dữ liệu thành phẩm không hiển thị | Kiểm tra mã chiên tồn tại trong hệ thống |
| Cần hỗ trợ kỹ thuật | Liên hệ ADMIN hoặc DEPARTMENT_HEAD |

---

## 7. FAQ

**Q1: Làm thế nào để tạo phiếu nhập kho?**
Vào tab **Kho** → chọn **Phiếu nhập kho** → nhấn **Thêm mới** → chọn kho, lô hàng, hàng hóa, nhập số lượng → Lưu.

**Q2: Tôi có thể di chuyển sản phẩm giữa các lô không?**
Có. Vào **Quản lý kho** → chọn sản phẩm trong lô → nhấn icon **Di chuyển sang lô khác** → chọn lô đích.

**Q3: Các loại thành phẩm đầu ra gồm những loại nào?**
Hệ thống phân loại 8 loại: **A, B, B đầu, C, Vụn lớn, Vụn nhỏ, Phế phẩm, Ướt**. Mỗi loại ghi nhận khối lượng (Kg) và tỉ lệ (%).

**Q4: Thông số vận hành có bao nhiêu giai đoạn?**
Có **4 giai đoạn**, mỗi giai đoạn ghi nhận Thời gian (phút), Nhiệt độ (°C), Áp suất (mmHg).

**Q5: Quy trình sản xuất khác gì với quy trình mẫu?**
**Quy trình mẫu** là template có sẵn. **Quy trình sản xuất** là bản cụ thể tạo từ quy trình mẫu, gắn với nhân viên, khối lượng và thời gian thực tế.

**Q6: Ai có thể xóa phiếu nhập/xuất kho?**
Chỉ **ADMIN** và **DEPARTMENT_HEAD** có quyền xóa.

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
