# Hướng dẫn sử dụng - Bộ phận Tổng hợp

## 1. Tổng quan

Bộ phận Tổng hợp quản lý các hoạt động tổng hợp của công ty, bao gồm 2 phòng chức năng.

**Đường dẫn chính:** `/general`

**Quyền truy cập:** Nhân viên bộ phận Tổng hợp, Admin

---

## 2. Cấu trúc

### 2.1. Phòng Giá thành (`/general/pricing`)

Quản lý báo giá, đơn hàng và chi phí.

**Các tab chức năng:**

| Tab | Mô tả |
|-----|-------|
| **Yêu cầu báo giá** | Danh sách yêu cầu báo giá từ khách hàng |
| **Bảng báo giá** | Quản lý các bảng báo giá đã lập |
| **Đơn hàng** | Danh sách đơn hàng |
| **Chi phí chung** | Quản lý chi phí chung của công ty |
| **Chi phí xuất khẩu** | Quản lý chi phí xuất khẩu |

**Thống kê hiển thị:**
- Số lượng yêu cầu báo giá (Quốc tế / Nội địa)
- Số lượng bảng báo giá
- Số lượng đơn hàng

### 2.2. Phòng Chăm sóc (`/general/partners`)

Quản lý đối tác và khách hàng.

*(Đang phát triển)*

---

## 3. Hướng dẫn sử dụng Phòng Giá thành

### 3.1. Xem yêu cầu báo giá

1. Vào tab **"Yêu cầu báo giá"**
2. Lọc theo loại khách hàng (Quốc tế / Nội địa)
3. Tìm kiếm theo mã hoặc tên khách hàng
4. Click vào yêu cầu để xem chi tiết

### 3.2. Tạo bảng báo giá

1. Vào tab **"Bảng báo giá"**
2. Click **+ Thêm mới**
3. Chọn yêu cầu báo giá liên quan
4. Nhập thông tin báo giá:
   - Sản phẩm/Dịch vụ
   - Số lượng
   - Đơn giá
   - Chiết khấu (nếu có)
5. Click **Lưu**

### 3.3. Quản lý đơn hàng

1. Vào tab **"Đơn hàng"**
2. Xem danh sách đơn hàng với các trạng thái:
   - Chờ sản xuất
   - Đang sản xuất
   - Đang vận chuyển
   - Đã giao
3. Click đơn hàng để xem chi tiết

### 3.4. Quản lý chi phí

1. Vào tab **"Chi phí chung"** hoặc **"Chi phí xuất khẩu"**
2. Xem danh sách chi phí đã ghi nhận
3. Thêm mới chi phí với đầy đủ thông tin
4. Xuất báo cáo chi phí

---

## 4. Phân quyền

| Vai trò | Quyền hạn |
|---------|-----------|
| Nhân viên giá thành | Xem, tạo báo giá |
| Trưởng phòng | Xem, tạo, duyệt, xóa |
| Admin | Toàn quyền |

---

## 5. Lưu ý

- Báo giá cần được duyệt trước khi gửi khách hàng
- Chi phí phải có chứng từ đính kèm
- Đơn hàng liên kết với bảng báo giá đã duyệt

---

## 6. Xử lý lỗi

| Lỗi | Nguyên nhân | Cách khắc phục |
|-----|-------------|----------------|
| Không tạo được báo giá | Thiếu yêu cầu báo giá | Tạo yêu cầu trước |
| Không xem được chi phí | Không có quyền | Liên hệ Admin |

