# Hướng dẫn sử dụng - Bộ phận Kế toán

## 1. Tổng quan

Bộ phận Kế toán quản lý hóa đơn, tài sản, công nợ và báo cáo thuế.

**Đường dẫn chính:** `/accounting`

**Quyền truy cập:** Nhân viên bộ phận Kế toán, Admin

---

## 2. Cấu trúc

### 2.1. Phòng KT Hành chính (`/accounting/admin`)

Quản lý hóa đơn, tài sản và công nợ.

**Các tab chức năng:**

| Tab | Mô tả |
|-----|-------|
| **Hóa đơn** | Quản lý hóa đơn mua/bán |
| **Tài sản** | Quản lý tài sản cố định |
| **Đơn hàng** | Danh sách đơn hàng |
| **Công nợ** | Theo dõi công nợ phải thu/phải trả |

### 2.2. Phòng KT Thuế (`/accounting/tax`)

Quản lý báo cáo thuế.

*(Đang phát triển)*

---

## 3. Hướng dẫn sử dụng

### 3.1. Quản lý hóa đơn

1. Vào tab **"Hóa đơn"**
2. Xem danh sách hóa đơn với thông tin:
   - Số hóa đơn
   - Ngày phát hành
   - Khách hàng/Nhà cung cấp
   - Tổng tiền
   - Trạng thái
3. **Thêm hóa đơn mới:**
   - Click **+ Thêm mới**
   - Chọn loại hóa đơn (Mua/Bán)
   - Nhập thông tin chi tiết
   - Đính kèm file hóa đơn
   - Lưu

### 3.2. Quản lý tài sản

1. Vào tab **"Tài sản"**
2. Xem danh sách tài sản cố định:
   - Mã tài sản
   - Tên tài sản
   - Nguyên giá
   - Khấu hao
   - Giá trị còn lại
3. Thêm mới, sửa, khấu hao tài sản

### 3.3. Theo dõi công nợ

1. Vào tab **"Công nợ"**
2. Xem tổng quan:
   - Tổng tài sản
   - Tổng công nợ
   - Đã thanh toán
   - Chưa thanh toán
3. Lọc theo loại công nợ:
   - Phải thu (từ khách hàng)
   - Phải trả (cho nhà cung cấp)
4. Cập nhật trạng thái thanh toán

### 3.4. Xem doanh thu

Dashboard hiển thị:
- Tổng doanh thu
- Doanh thu Quốc tế
- Doanh thu Nội địa
- Biểu đồ theo thời gian

---

## 4. Thống kê tổng quan

| Chỉ số | Mô tả |
|--------|-------|
| Tổng tài sản | Giá trị tài sản cố định |
| Tổng công nợ | Công nợ phải thu + phải trả |
| Đã thanh toán | Công nợ đã thu/trả |
| Chưa thanh toán | Công nợ còn tồn đọng |
| Tổng doanh thu | Doanh thu từ đơn hàng |

---

## 5. Phân quyền

| Vai trò | Quyền hạn |
|---------|-----------|
| Nhân viên KT | Xem, nhập liệu hóa đơn |
| Kế toán trưởng | Duyệt, sửa, xóa, xuất báo cáo |
| Admin | Toàn quyền |

---

## 6. Lưu ý quan trọng

- Hóa đơn phải có số hóa đơn hợp lệ
- Tài sản cần nhập đúng nguyên giá và tỷ lệ khấu hao
- Công nợ quá hạn sẽ được highlight màu đỏ
- Xuất báo cáo định kỳ hàng tháng/quý

---

## 7. Xử lý lỗi

| Lỗi | Nguyên nhân | Cách khắc phục |
|-----|-------------|----------------|
| Không lưu được hóa đơn | Trùng số hóa đơn | Kiểm tra lại số hóa đơn |
| Công nợ không cập nhật | Chưa refresh | Tải lại trang |

