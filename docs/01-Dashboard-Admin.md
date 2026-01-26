# Hướng dẫn sử dụng - Dashboard Admin

## 1. Tổng quan

Dashboard Admin là trang tổng quan dành cho quản trị viên và trưởng bộ phận, hiển thị thống kê tổng hợp của toàn bộ hệ thống ERP.

**Đường dẫn:** `/dashboard`

**Quyền truy cập:** Admin, Trưởng bộ phận

---

## 2. Các thành phần chính

### 2.1. Thống kê theo bộ phận

Dashboard hiển thị thống kê của 7 bộ phận:

| Bộ phận | Thống kê hiển thị |
|---------|-------------------|
| **Bộ phận tổng hợp** | Đơn hàng, Báo giá, Chăm sóc KH, Phàn nàn |
| **Bộ phận chất lượng** | Quy trình, Không phù hợp, Vi phạm, Nhân viên |
| **Bộ phận kinh doanh** | Hợp đồng, Khách hàng, Doanh thu, Mục tiêu |
| **Bộ phận kế toán** | Hóa đơn, Thu chi, Công nợ, Báo cáo |
| **Bộ phận sản xuất** | Đơn hàng SX, Hoàn thành, Đang SX, Hiệu suất |
| **Bộ phận mua hàng** | Đơn mua, Nhà cung cấp, Tồn kho, Tiết kiệm |
| **Bộ phận kỹ thuật** | Thiết bị, Bảo trì, Sự cố, Hoạt động |

### 2.2. Nhiệm vụ được giao

- Hiển thị số lượng nhiệm vụ đang chờ xử lý
- Click để xem danh sách chi tiết nhiệm vụ
- Phân loại theo mức độ ưu tiên: Khẩn cấp, Cao, Trung bình, Thấp

### 2.3. Góp ý / Khó khăn

- Hiển thị số lượng góp ý và báo cáo khó khăn từ nhân viên
- Click để xem chi tiết và phản hồi

### 2.4. Yêu cầu mua hàng

- Hiển thị danh sách yêu cầu mua hàng chờ duyệt
- Trạng thái: Chờ duyệt, Đã duyệt, Từ chối

---

## 3. Hướng dẫn sử dụng

### 3.1. Xem thống kê bộ phận

1. Đăng nhập với tài khoản Admin
2. Trang Dashboard sẽ hiển thị tự động
3. Mỗi card bộ phận hiển thị 4 chỉ số chính
4. Số liệu có xu hướng tăng/giảm so với kỳ trước

### 3.2. Quản lý nhiệm vụ

1. Click vào card "Nhiệm vụ được giao"
2. Modal hiển thị danh sách nhiệm vụ
3. Có thể lọc theo trạng thái, mức độ ưu tiên
4. Click vào nhiệm vụ để xem chi tiết

### 3.3. Xem góp ý từ nhân viên

1. Click vào card "Góp ý / Khó khăn"
2. Xem danh sách góp ý và báo cáo khó khăn
3. Phản hồi trực tiếp cho nhân viên

### 3.4. Duyệt yêu cầu mua hàng

1. Xem danh sách yêu cầu trong bảng
2. Click icon 👁️ để xem chi tiết
3. Click ✓ để duyệt hoặc ✗ để từ chối

---

## 4. Lưu ý

- Dashboard tự động cập nhật dữ liệu khi tải trang
- Số liệu thống kê được tính theo thời gian thực
- Chỉ Admin và Trưởng bộ phận mới thấy Dashboard này
- Nhân viên thường sẽ thấy Dashboard Nhân viên

---

## 5. Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách khắc phục |
|-----|-------------|----------------|
| Không hiển thị dữ liệu | Mất kết nối server | Kiểm tra kết nối mạng, refresh trang |
| Số liệu không cập nhật | Cache trình duyệt | Nhấn Ctrl+F5 để refresh |
| Không thấy Dashboard | Không có quyền | Liên hệ Admin để cấp quyền |

