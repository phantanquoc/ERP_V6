# Hướng dẫn sử dụng - Bộ phận Thu mua

## 1. Tổng quan

Bộ phận Thu mua quản lý nhà cung cấp, yêu cầu mua hàng và đơn hàng mua.

**Đường dẫn chính:** `/purchasing`

**Quyền truy cập:** Nhân viên bộ phận Thu mua, Admin

---

## 2. Cấu trúc

### 2.1. Phòng Thu mua NVL (`/purchasing/materials`)

Quản lý mua nguyên vật liệu.

**Các tab chức năng:**

| Tab | Mô tả |
|-----|-------|
| **Nhà cung cấp** | Quản lý danh sách nhà cung cấp |
| **Đơn hàng** | Danh sách đơn hàng mua |
| **Yêu cầu mua hàng** | Xử lý yêu cầu mua hàng từ các bộ phận |

### 2.2. Phòng Mua Thiết bị (`/purchasing/equipment`)

Quản lý mua thiết bị, máy móc.

*(Cấu trúc tương tự Phòng Thu mua NVL)*

---

## 3. Hướng dẫn sử dụng

### 3.1. Quản lý nhà cung cấp

1. Vào tab **"Nhà cung cấp"**
2. Xem danh sách nhà cung cấp:
   - Mã NCC
   - Tên công ty
   - Loại (Quốc tế / Nội địa)
   - Quốc gia
   - Người liên hệ
   - Email, SĐT
   - Đánh giá (sao)
3. **Thêm nhà cung cấp:**
   - Click **+ Thêm mới**
   - Điền thông tin:
     - Tên công ty
     - Loại nhà cung cấp
     - Quốc gia
     - Địa chỉ
     - Người liên hệ
     - Email, SĐT
   - Click **Lưu**

4. **Sửa/Xóa:** Click icon tương ứng

### 3.2. Xử lý yêu cầu mua hàng

1. Vào tab **"Yêu cầu mua hàng"**
2. Xem danh sách yêu cầu với:
   - STT, Mã yêu cầu
   - Ngày yêu cầu
   - Nhân viên yêu cầu
   - Phân loại
   - Tên hàng hóa
   - Số lượng, Đơn vị
   - Mục đích
   - Mức độ ưu tiên
   - Trạng thái
3. **Xử lý yêu cầu:**
   - Click icon 👁️ để xem chi tiết
   - Đánh giá và chọn nhà cung cấp
   - Tạo đơn mua hàng

### 3.3. Quản lý đơn hàng mua

1. Vào tab **"Đơn hàng"**
2. Xem danh sách đơn hàng
3. Theo dõi trạng thái:
   - Chờ gửi
   - Đã gửi NCC
   - Đang vận chuyển
   - Đã nhận
4. Cập nhật tiến độ giao hàng

---

## 4. Quy trình mua hàng

```
Yêu cầu mua hàng → Duyệt yêu cầu → Chọn NCC → Tạo đơn mua
     ↓                                           ↓
  Từ chối ←────────────────────────────→ Theo dõi giao hàng
                                                 ↓
                                           Nhận hàng
```

---

## 5. Phân quyền

| Vai trò | Quyền hạn |
|---------|-----------|
| Nhân viên thu mua | Xem yêu cầu, quản lý NCC |
| Trưởng phòng | Duyệt yêu cầu, tạo đơn mua |
| Admin | Toàn quyền |

---

## 6. Lưu ý

- Yêu cầu mua hàng khẩn cấp cần xử lý trong 24h
- Nhà cung cấp mới cần được đánh giá trước khi đặt hàng
- Đơn hàng lớn cần có ít nhất 3 báo giá từ các NCC khác nhau
- Lưu trữ chứng từ mua hàng đầy đủ

---

## 7. Xử lý lỗi

| Lỗi | Nguyên nhân | Cách khắc phục |
|-----|-------------|----------------|
| Không tạo được NCC | Thiếu thông tin bắt buộc | Điền đầy đủ thông tin |
| Không thấy yêu cầu | Chưa được gửi | Liên hệ người yêu cầu |

