---
department: DEPT_BUSINESS
department_name: "Bộ phận kinh doanh"
roles: [ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE]
access: department_restricted
language: vi
---

# Báo cáo kinh doanh — Dashboard tổng quan

> URL: `/business`
> Quyền truy cập: Tất cả nhân viên bộ phận kinh doanh

## 1. Tổng quan

Trang **Báo cáo kinh doanh** là dashboard phân tích tổng hợp, hiển thị số liệu thống kê về đơn hàng, khách hàng và phản hồi khách hàng. Trang này chỉ hiển thị dữ liệu (read-only), không có chức năng nhập liệu hay chỉnh sửa.

Dữ liệu được tải tự động khi mở trang, không có bộ lọc ngày tháng hay tìm kiếm.

---

## 2. Thẻ thống kê (Stat Cards)

Dashboard hiển thị 4 thẻ thống kê ở đầu trang:

| # | Thẻ | Icon | Giá trị chính | Giá trị phụ trái | Giá trị phụ phải | Nhấn vào đi đến |
|---|---|---|---|---|---|---|
| 1 | Đơn hàng | 🛒 (xanh dương) | Tổng số đơn hàng | Số đơn quốc tế | Số đơn nội địa | `/business/management` |
| 2 | Khách hàng quốc tế | ✈️ (xanh lá) | Tổng KH quốc tế | Đang giao dịch | Ngừng giao dịch | `/business/international` |
| 3 | Khách hàng nội địa | 🏢 (tím) | Tổng KH nội địa | Đang giao dịch | Ngừng giao dịch | `/business/domestic` |
| 4 | Phản hồi khách hàng | 💬 (cam) | Tổng phản hồi | Phản hồi quốc tế | Phản hồi nội địa | `/business/domestic` |

### Cách đọc thẻ thống kê

- **Đang giao dịch**: Khách hàng đang hoạt động, có đơn hàng gần đây
- **Ngừng giao dịch**: Khách hàng đã ngừng hợp tác

---

## 3. Biểu đồ tròn (Pie Charts)

Có 2 biểu đồ tròn dạng donut hiển thị cạnh nhau:

### 3.1 Phân bổ đơn hàng theo loại khách

- Hiển thị tỷ lệ đơn hàng **Quốc tế** vs **Nội địa**
- Màu xanh dương: Quốc tế
- Màu xanh lá: Nội địa
- Label hiển thị: `Tên: số lượng (phần trăm%)`

### 3.2 Phân bổ phản hồi theo loại khách

- Hiển thị tỷ lệ phản hồi khách hàng **Quốc tế** vs **Nội địa**
- Cùng bảng màu với biểu đồ đơn hàng

---

## 4. Biểu đồ đường (Line Charts)

Có 2 biểu đồ đường so sánh theo tháng, hiển thị cạnh nhau:

### 4.1 Tổng đơn hàng quốc tế

- Trục X: Tháng 1 → Tháng 12
- Đường hồng: Số đơn năm trước
- Đường tím (indigo): Số đơn năm nay
- So sánh xu hướng đơn hàng quốc tế giữa 2 năm

### 4.2 Tổng đơn hàng nội địa

- Trục X: Tháng 1 → Tháng 12
- Đường hồng: Số đơn năm trước
- Đường tím (indigo): Số đơn năm nay
- So sánh xu hướng đơn hàng nội địa giữa 2 năm

**Lưu ý:** Năm so sánh được tính tự động (năm hiện tại vs năm trước), không thể thay đổi.

---

## 5. Điều hướng từ Dashboard

Từ trang báo cáo, nhấn vào các thẻ thống kê để đi đến:

- **Đơn hàng** → Trang quản lý đơn hàng (`/business/management`)
- **Khách hàng quốc tế** → Danh sách khách hàng quốc tế (`/business/international`)
- **Khách hàng nội địa** → Danh sách khách hàng nội địa (`/business/domestic`)
- **Phản hồi** → Trang phản hồi khách hàng (`/business/domestic`)

---

## 6. FAQ

### Làm sao để xem báo cáo kinh doanh?

Vào menu **Kinh doanh** → trang sẽ tự động hiển thị dashboard với đầy đủ số liệu.

### Tại sao không có bộ lọc ngày?

Dashboard hiển thị toàn bộ dữ liệu tổng hợp. Biểu đồ đường tự động so sánh năm hiện tại với năm trước. Để xem chi tiết từng đơn hàng, nhấn vào thẻ "Đơn hàng" để đi đến trang quản lý.

### Dữ liệu cập nhật khi nào?

Dữ liệu được tải mới mỗi lần mở trang. Để cập nhật, tải lại trang (F5).

### Biểu đồ đường so sánh năm nào?

Luôn so sánh năm hiện tại (ví dụ 2026) với năm trước (2025). Không thể chọn năm khác.
