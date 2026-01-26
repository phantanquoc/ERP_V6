# Hướng dẫn sử dụng - Bộ phận Kinh doanh

## 1. Tổng quan

Bộ phận Kinh doanh quản lý khách hàng, báo giá, đơn hàng và phản hồi khách hàng.

**Đường dẫn chính:** `/business`

**Quyền truy cập:** Nhân viên bộ phận Kinh doanh, Admin

---

## 2. Cấu trúc

### 2.1. Phòng KD Quốc tế (`/business/international`)

Quản lý khách hàng và đơn hàng quốc tế.

**Các tab chức năng:**

| Tab | Mô tả |
|-----|-------|
| **Yêu cầu báo giá** | Quản lý yêu cầu báo giá từ khách hàng quốc tế |
| **Bảng báo giá** | Danh sách báo giá đã lập |
| **Đơn hàng** | Theo dõi đơn hàng quốc tế |
| **Khách hàng** | Quản lý thông tin khách hàng |
| **Phản hồi** | Phản hồi và khiếu nại từ khách hàng |

### 2.2. Phòng KD Nội địa (`/business/domestic`)

Quản lý khách hàng và đơn hàng trong nước.

*(Cấu trúc tương tự Phòng KD Quốc tế)*

---

## 3. Hướng dẫn sử dụng

### 3.1. Quản lý yêu cầu báo giá

1. Vào tab **"Yêu cầu báo giá"**
2. Xem danh sách với trạng thái:
   - **Đã báo giá**: Đã lập bảng báo giá
   - **Chưa báo giá**: Cần xử lý
3. Thống kê hiển thị tổng số yêu cầu
4. Tìm kiếm theo mã, tên khách hàng

### 3.2. Tạo và quản lý báo giá

1. Vào tab **"Bảng báo giá"**
2. Xem trạng thái các báo giá:
   - Đã đặt hàng
   - Đang chờ phản hồi
   - Đang chờ gửi đơn hàng
   - Không đặt hàng
3. **Tạo báo giá mới:**
   - Click **+ Thêm mới**
   - Chọn khách hàng
   - Nhập sản phẩm, số lượng, đơn giá
   - Áp dụng chiết khấu (nếu có)
   - Lưu và gửi khách hàng

### 3.3. Theo dõi đơn hàng

1. Vào tab **"Đơn hàng"**
2. Xem thống kê:
   - Tổng đơn hàng
   - Đơn hàng tháng này
   - Đơn hàng tháng trước
3. Theo dõi trạng thái đơn hàng
4. Cập nhật tiến độ giao hàng

### 3.4. Quản lý khách hàng

1. Vào tab **"Khách hàng"**
2. Xem danh sách khách hàng với:
   - Mã khách hàng
   - Tên công ty
   - Quốc gia
   - Người liên hệ
   - Email, SĐT
3. **Thêm khách hàng mới:**
   - Click **+ Thêm mới**
   - Điền đầy đủ thông tin
   - Lưu

### 3.5. Xử lý phản hồi khách hàng

1. Vào tab **"Phản hồi"**
2. Xem danh sách phản hồi theo mức độ:
   - **Khẩn cấp**: Cần xử lý ngay
   - **Cao**: Ưu tiên xử lý
   - **Trung bình/Thấp**: Xử lý theo thứ tự
3. Phản hồi khách hàng và cập nhật trạng thái

---

## 4. Thống kê tổng quan

Dashboard hiển thị các chỉ số:
- Số yêu cầu báo giá (Đã/Chưa báo giá)
- Số báo giá theo trạng thái
- Số đơn hàng (Tháng này/Tháng trước)
- Số phản hồi cần xử lý

---

## 5. Phân quyền

| Vai trò | Quyền hạn |
|---------|-----------|
| Nhân viên KD | Xem, tạo báo giá, quản lý khách hàng |
| Trưởng phòng | Duyệt báo giá, xem báo cáo |
| Admin | Toàn quyền |

---

## 6. Xử lý lỗi

| Lỗi | Nguyên nhân | Cách khắc phục |
|-----|-------------|----------------|
| Không tạo được đơn hàng | Báo giá chưa được duyệt | Chờ duyệt báo giá |
| Không thấy khách hàng | Chưa được tạo | Tạo khách hàng mới |

