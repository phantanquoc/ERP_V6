# Hướng dẫn sử dụng - Bộ phận Chất lượng

## 1. Tổng quan

Bộ phận Chất lượng quản lý nhân sự, quy trình và đảm bảo chất lượng của công ty.

**Đường dẫn chính:** `/quality`

**Quyền truy cập:** Nhân viên bộ phận Chất lượng, HR, Admin

---

## 2. Cấu trúc

### 2.1. Phòng Chất lượng Nhân sự (`/quality/personnel`)

Quản lý toàn bộ thông tin nhân sự.

**Các tab chức năng:**

| Tab | Mô tả |
|-----|-------|
| **Nhân viên** | Quản lý hồ sơ nhân viên |
| **Chức vụ** | Quản lý danh mục chức vụ |
| **Trách nhiệm** | Phân công trách nhiệm |
| **Cấp bậc** | Quản lý cấp bậc lương |
| **Đánh giá** | Đánh giá nhân viên định kỳ |
| **Bảng lương** | Quản lý lương và phúc lợi |
| **Chấm công** | Theo dõi chấm công |
| **Nghỉ phép** | Quản lý đơn xin nghỉ |
| **Tài khoản** | Quản lý tài khoản người dùng |

### 2.2. Phòng Chất lượng Quy trình (`/quality/process`)

Quản lý quy trình làm việc.

*(Đang phát triển)*

---

## 3. Hướng dẫn sử dụng

### 3.1. Quản lý nhân viên

1. Vào tab **"Nhân viên"**
2. Xem danh sách nhân viên với các thông tin:
   - Mã nhân viên, Họ tên
   - Phòng ban, Chức vụ
   - Loại hợp đồng
   - Trạng thái
3. **Thêm mới:** Click **+ Thêm nhân viên**
4. **Sửa:** Click icon ✏️
5. **Xem chi tiết:** Click icon 👁️

### 3.2. Quản lý chức vụ

1. Vào tab **"Chức vụ"**
2. Xem danh sách chức vụ theo phòng ban
3. Thêm mới chức vụ với:
   - Tên chức vụ
   - Mô tả
   - Phòng ban

### 3.3. Đánh giá nhân viên

1. Vào tab **"Đánh giá"**
2. Chọn tháng/năm đánh giá
3. Xem danh sách nhân viên cần đánh giá
4. Click **Đánh giá** để nhập điểm
5. Các tiêu chí đánh giá:
   - Hoàn thành công việc
   - Chất lượng công việc
   - Thái độ làm việc
   - Tuân thủ nội quy

### 3.4. Quản lý bảng lương

1. Vào tab **"Bảng lương"**
2. Chọn kỳ lương (tháng/năm)
3. Xem bảng lương với các cột:
   - Lương cơ bản
   - Phụ cấp
   - Khấu trừ
   - Thực nhận
4. Xuất file Excel để báo cáo

### 3.5. Theo dõi chấm công

1. Vào tab **"Chấm công"**
2. Chọn ngày để xem
3. Danh sách hiển thị:
   - Nhân viên
   - Giờ vào/ra
   - Trạng thái (Đúng giờ, Đi muộn, Vắng)
4. Xuất báo cáo chấm công

### 3.6. Duyệt nghỉ phép

1. Vào tab **"Nghỉ phép"**
2. Xem danh sách đơn chờ duyệt
3. Kiểm tra thông tin:
   - Nhân viên
   - Loại nghỉ
   - Ngày nghỉ
   - Lý do
4. Click ✓ để duyệt hoặc ✗ để từ chối

### 3.7. Quản lý tài khoản

1. Vào tab **"Tài khoản"**
2. Xem danh sách tài khoản người dùng
3. Thao tác:
   - Reset mật khẩu
   - Khóa/Mở khóa tài khoản
   - Phân quyền

---

## 4. Phân quyền

| Vai trò | Quyền hạn |
|---------|-----------|
| Nhân viên HR | Xem, thêm, sửa nhân viên |
| Trưởng phòng | Duyệt nghỉ phép, đánh giá |
| Admin | Toàn quyền, quản lý tài khoản |

---

## 5. Xử lý lỗi

| Lỗi | Nguyên nhân | Cách khắc phục |
|-----|-------------|----------------|
| Không tạo được tài khoản | Email đã tồn tại | Dùng email khác |
| Không đánh giá được | Chưa đến kỳ đánh giá | Chờ đến ngày mở |

