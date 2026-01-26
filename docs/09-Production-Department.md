# Hướng dẫn sử dụng - Bộ phận Sản xuất

## 1. Tổng quan

Bộ phận Sản xuất quản lý máy móc, quy trình sản xuất, đơn hàng và kho.

**Đường dẫn chính:** `/production`

**Quyền truy cập:** Nhân viên bộ phận Sản xuất, Admin

---

## 2. Cấu trúc

### 2.1. Phòng QLSX (`/production/management`)

Quản lý sản xuất chính.

**Các tab chức năng:**

| Tab | Mô tả |
|-----|-------|
| **Danh sách máy** | Quản lý máy móc, thiết bị |
| **Quy trình** | Quản lý quy trình sản xuất |
| **Lệnh sản xuất** | Theo dõi lệnh sản xuất |
| **Đơn hàng** | Danh sách đơn hàng cần sản xuất |
| **Định mức NVL** | Định mức nguyên vật liệu |
| **Đánh giá NVL** | Đánh giá chất lượng NVL |
| **Vận hành hệ thống** | Theo dõi vận hành |
| **Thành phẩm** | Quản lý sản phẩm hoàn thành |
| **Đánh giá chất lượng** | Đánh giá chất lượng sản phẩm |
| **Báo cáo SX** | Báo cáo sản xuất |

### 2.2. Quản lý kho (`/production/warehouse`)

Quản lý kho nguyên vật liệu và thành phẩm.

---

## 3. Hướng dẫn sử dụng

### 3.1. Quản lý máy móc

1. Vào tab **"Danh sách máy"**
2. Xem thống kê:
   - Tổng số máy
   - Đang hoạt động
   - Đang bảo trì
   - Ngừng hoạt động
3. Thao tác với máy:
   - Xem thông tin chi tiết
   - Cập nhật trạng thái
   - Lên lịch bảo trì

### 3.2. Quản lý quy trình sản xuất

1. Vào tab **"Quy trình"** hoặc **"Lệnh sản xuất"**
2. Xem danh sách quy trình
3. Tạo quy trình mới với các bước:
   - Định nghĩa công đoạn
   - Gán máy móc
   - Thiết lập thời gian
4. Theo dõi tiến độ thực hiện

### 3.3. Xử lý đơn hàng sản xuất

1. Vào tab **"Đơn hàng"**
2. Xem thống kê đơn hàng:
   - Chờ sản xuất
   - Đang sản xuất
   - Đang vận chuyển
   - Đã giao
3. Phân công sản xuất cho đơn hàng
4. Cập nhật tiến độ

### 3.4. Quản lý thành phẩm

1. Vào tab **"Thành phẩm"**
2. Nhập thành phẩm hoàn thành
3. Thông tin cần nhập:
   - Mã sản phẩm
   - Tên sản phẩm
   - Số lượng
   - Ngày hoàn thành
   - Lô sản xuất
4. Chuyển kho thành phẩm

### 3.5. Đánh giá chất lượng

1. Vào tab **"Đánh giá chất lượng"**
2. Chọn sản phẩm cần đánh giá
3. Nhập các chỉ tiêu:
   - Ngoại quan
   - Kích thước
   - Độ bền
   - Chức năng
4. Kết luận: Đạt / Không đạt

### 3.6. Báo cáo sản xuất

1. Vào tab **"Báo cáo SX"**
2. Xem báo cáo theo ngày/tuần/tháng
3. Các chỉ số:
   - Sản lượng
   - Tỷ lệ hoàn thành
   - Tỷ lệ lỗi
   - Hiệu suất máy

---

## 4. Phân quyền

| Vai trò | Quyền hạn |
|---------|-----------|
| Công nhân | Xem, cập nhật tiến độ |
| Quản đốc | Phân công, giám sát |
| Trưởng phòng | Lập kế hoạch, báo cáo |
| Admin | Toàn quyền |

---

## 5. Xử lý lỗi

| Lỗi | Nguyên nhân | Cách khắc phục |
|-----|-------------|----------------|
| Máy không cập nhật trạng thái | Mất kết nối | Kiểm tra mạng |
| Không tạo được lệnh SX | Thiếu NVL | Tạo yêu cầu mua hàng |

