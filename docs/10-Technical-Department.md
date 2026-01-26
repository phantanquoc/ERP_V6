# Hướng dẫn sử dụng - Bộ phận Kỹ thuật

## 1. Tổng quan

Bộ phận Kỹ thuật quản lý hệ thống máy, bảo trì, sửa chữa và nghiệm thu bàn giao.

**Đường dẫn chính:** `/technical`

**Quyền truy cập:** Nhân viên bộ phận Kỹ thuật, Admin

---

## 2. Cấu trúc

### 2.1. Phòng QLHTM (`/technical/quality`)

Quản lý hệ thống máy và chất lượng kỹ thuật.

**Các tab chức năng:**

| Tab | Mô tả |
|-----|-------|
| **Danh sách hệ thống máy** | Quản lý các hệ thống máy móc |
| **Báo cáo hoạt động máy** | Theo dõi hoạt động của máy |
| **Đơn hàng** | Danh sách đơn hàng |
| **Yêu cầu sửa chữa** | Xử lý yêu cầu sửa chữa |
| **Nghiệm thu bàn giao** | Quản lý nghiệm thu thiết bị |

### 2.2. Phòng Cơ-Điện (`/technical/mechanical`)

Quản lý hệ thống cơ điện.

*(Đang phát triển)*

---

## 3. Hướng dẫn sử dụng

### 3.1. Quản lý hệ thống máy

1. Vào tab **"Danh sách hệ thống máy"**
2. Xem danh sách các hệ thống:
   - Mã hệ thống
   - Tên hệ thống
   - Vị trí
   - Trạng thái
   - Ngày bảo trì gần nhất
3. **Thêm hệ thống mới:**
   - Click **+ Thêm mới**
   - Nhập thông tin chi tiết
   - Đính kèm tài liệu kỹ thuật
   - Lưu

### 3.2. Báo cáo hoạt động máy

1. Vào tab **"Báo cáo hoạt động máy"**
2. Chọn máy cần xem báo cáo
3. Xem các thông số:
   - Thời gian hoạt động
   - Thời gian dừng
   - Hiệu suất
   - Sự cố ghi nhận
4. Xuất báo cáo PDF/Excel

### 3.3. Xử lý yêu cầu sửa chữa

1. Vào tab **"Yêu cầu sửa chữa"**
2. Xem danh sách yêu cầu:
   - Mã yêu cầu
   - Nhân viên yêu cầu
   - Hệ thống/Máy
   - Mô tả lỗi
   - Mức độ ưu tiên
   - Trạng thái
3. **Xử lý yêu cầu:**
   - Click vào yêu cầu
   - Phân công kỹ thuật viên
   - Cập nhật tiến độ
   - Ghi nhận kết quả sửa chữa
4. **Trạng thái yêu cầu:**
   - Chờ xử lý
   - Đang xử lý
   - Hoàn thành
   - Hủy

### 3.4. Nghiệm thu bàn giao

1. Vào tab **"Nghiệm thu bàn giao"**
2. Xem danh sách nghiệm thu:
   - Mã nghiệm thu
   - Thiết bị
   - Ngày nghiệm thu
   - Người nghiệm thu
   - Kết quả
3. **Tạo biên bản nghiệm thu:**
   - Click **+ Thêm mới**
   - Chọn thiết bị/hệ thống
   - Điền các hạng mục kiểm tra
   - Kết luận: Đạt/Không đạt
   - Ký xác nhận
   - Lưu

---

## 4. Quy trình sửa chữa

```
Yêu cầu sửa chữa → Tiếp nhận → Phân công → Thực hiện → Nghiệm thu
       ↓              ↓           ↓           ↓           ↓
    Từ chối    Đánh giá độ   Kỹ thuật   Ghi nhận    Bàn giao
               ưu tiên       viên       kết quả
```

---

## 5. Phân quyền

| Vai trò | Quyền hạn |
|---------|-----------|
| Kỹ thuật viên | Xem, xử lý yêu cầu được giao |
| Trưởng nhóm | Phân công, giám sát |
| Trưởng phòng | Duyệt, báo cáo |
| Admin | Toàn quyền |

---

## 6. Lưu ý

- Yêu cầu khẩn cấp cần xử lý trong 4 giờ
- Bảo trì định kỳ theo lịch đã lập
- Ghi nhận đầy đủ lịch sử sửa chữa
- Nghiệm thu cần có chữ ký 2 bên

---

## 7. Xử lý lỗi

| Lỗi | Nguyên nhân | Cách khắc phục |
|-----|-------------|----------------|
| Không tạo được yêu cầu | Thiếu thông tin máy | Cập nhật danh sách máy |
| Không phân công được | Không có KTV rảnh | Điều chỉnh lịch công việc |

