# Quy trình hướng dẫn — Bộ phận Kinh doanh

## 1. Quản lý khách hàng

### 1.1 Thêm khách hàng mới

1. Vào **Phòng KD Quốc Tế** hoặc **Phòng KD Nội Địa**
2. Tab **Danh sách khách hàng** → nhấn **"Thêm khách hàng"**


| Trường                     | Ghi chú    |
| -------------------------- | ---------- |
| Tên khách hàng             | ✅ Bắt buộc |
| Mã số thuế                 | Nội địa    |
| Quốc gia / Cảng đến        | Quốc tế    |
| Địa chỉ, SĐT, Email        |            |
| Loại KH: Cá nhân / Công ty |            |


### 1.2 Tìm kiếm

- Theo mã KH, tên, SĐT, quốc gia (Quốc tế), tỉnh/thành (Nội địa)

---

## 2. Yêu cầu báo giá (YCBG)

### 2.1 Tạo YCBG

1. Tab **Danh sách yêu cầu BG** → nhấn **"Thêm yêu cầu báo giá"**
2. Chọn khách hàng
3. Thêm sản phẩm: chọn từ danh sách hoặc nhập tay
4. Điền thông tin: Số lượng, Đơn vị tính, Yêu cầu thêm
5. Nhấn **"Tạo"** → YCBG chuyển sang phòng giá thành

### 2.2 Theo dõi

- Xem trạng thái: **Chờ xử lý → Đã xử lý → Đã báo giá → Đã đặt hàng**
- Nhấn vào YCBG để xem chi tiết và báo giá đã tạo

---

## 3. Báo giá (BG)

### 3.1 Xem báo giá

- Tab **Danh sách BG** → xem báo giá do phòng giá thành tạo
- Xem chi tiết bảng tính chi phí, giá đề xuất

### 3.2 Gửi cho khách

1. Nhấn **Xuất Excel** hoặc **In** để lấy báo giá
2. Gửi cho khách hàng qua email
3. Cập nhật tình trạng → **Đã gửi**

### 3.3 Chốt đơn

1. Khách hàng đồng ý → vào **Sửa** báo giá
2. Đổi tình trạng → **Đã đặt hàng**
3. Nhấn icon **"Tạo đơn hàng"** (giỏ hàng) → xác nhận

---

## 4. Đơn hàng

### 4.1 Tạo đơn hàng

- Tự động từ báo giá (mục 3.3) hoặc tạo thủ công từ tab **Danh sách đơn hàng**

### 4.2 Cập nhật đơn hàng

1. Nhấn **Sửa** trên đơn hàng
2. Điền thông tin:
  - Giá trị đơn hàng, thanh toán đợt 1/2
  - Ngày thanh toán từng đợt
  - Ghi chú
3. Nhấn **"Lưu thay đổi"**

### 4.3 Trạng thái giao hàng (phòng SX cập nhật)

- Phòng QLSX cập nhật: Chờ lên kế hoạch → Chờ sản xuất → Đang SX → Chờ giao → Đã lên container → Đang vận chuyển → Đã giao

---

## 5. Phản hồi khách hàng

### 5.1 Thêm phản hồi

1. Tab **Danh sách phản hồi từ KH** → nhấn **"Thêm phản hồi"**
2. Chọn loại: Khiếu nại / Góp ý / Khen ngợi
3. Chọn mức độ: Thấp / Trung bình / Cao
4. Nhập nội dung + biện pháp xử lý
5. Nhấn **"Lưu"**

---

## 6. Dashboard báo cáo kinh doanh (`/business`)

### 6.1 Xem thống kê

- Trang hiển thị 4 thẻ:
  1. **Đơn hàng**: Tổng số, Quốc tế, Nội địa
  2. **Khách hàng quốc tế**: Tổng, Đang GD, Ngừng GD
  3. **Khách hàng nội địa**: Tổng, Đang GD, Ngừng GD
  4. **Phản hồi KH**: Tổng, Quốc tế, Nội địa
- Nhấn vào thẻ → chuyển đến trang chi tiết

> Đây là trang read-only, không có chức năng nhập liệu.

---

## 7. Sản phẩm quốc tế

### 7.1 Thêm sản phẩm

1. Tab **Danh sách sản phẩm** → nhấn **"Thêm sản phẩm"**
2. Mã sản phẩm tự động sinh (không cần nhập)
3. Điền: Tên, Phân loại, Đơn vị tính, Mô tả
4. Nhấn **"Lưu"**

### 7.2 Quản lý danh mục

> ⚠️ **Quyền:** ADMIN, DEPARTMENT_HEAD

- Tab **Quản lý danh mục** → Thêm/Sửa/Xóa phân loại sản phẩm

---

## 8. Câu hỏi thường gặp (FAQ)

**Q1: YCBG và Báo giá (BG) khác nhau như thế nào?**

> **YCBG (Yêu cầu báo giá):** Là yêu cầu từ phía khách hàng, nhân viên KD nhập thông tin nhu cầu của khách (sản phẩm, số lượng, điều kiện giao hàng).  
> **BG (Báo giá):** Là đề xuất giá của công ty gửi cho khách, được lập dựa trên YCBG — bao gồm giá báo khách, thời gian giao hàng, hiệu lực báo giá.

**Q2: Tôi tạo YCBG xong nhưng quên thêm sản phẩm — có sửa được không?**

> Có. Nếu YCBG chưa được chuyển thành BG hoặc chưa bị khóa, bạn (hoặc TEAM_LEAD) có thể vào chỉnh sửa. Nhấn vào YCBG trong danh sách → chọn Sửa → thêm sản phẩm → Lưu.

**Q3: Báo giá ở trạng thái "Không đặt hàng" — có thể tái sử dụng không?**

> Không tái sử dụng trực tiếp. Nếu khách hàng quay lại sau, nên tạo **YCBG mới** và BG mới để đảm bảo giá và điều kiện được cập nhật.

**Q4: Khách hàng quốc tế và nội địa có dùng chung danh sách không?**

> Không. Khách hàng quốc tế được quản lý tại tab **Khách hàng quốc tế**, khách hàng nội địa tại tab **Khách hàng nội địa**. Hai danh sách hoàn toàn tách biệt.

**Q5: Tôi muốn theo dõi tiến độ sản xuất của đơn hàng — xem ở đâu?**

> Vào tab **Đơn hàng** (quốc tế hoặc nội địa) → tìm đơn hàng → xem trường **Trạng thái sản xuất**. Các trạng thái từ "Chờ lên kế hoạch" → "Đã giao cho khách hàng" thể hiện toàn bộ vòng đời sản xuất.

**Q6: Phản hồi khách hàng loại "Khẩn cấp" cần xử lý trong bao lâu?**

> Hệ thống không đặt SLA cố định, nhưng phản hồi mức **Khẩn cấp** nên được xử lý trong ngày. Sau khi ghi nhận, cập nhật trạng thái xử lý từ "Chưa xử lý" sang "Đang xử lý" và thông báo cho DEPARTMENT_HEAD.

**Q7: Hình thức thanh toán và vận chuyển được chọn như thế nào?**

> Cả quốc tế và nội địa đều dùng **dropdown** (chọn từ danh sách có sẵn). Quốc tế: vận chuyển (Đường biển / Đường hàng không / Đường bộ / Đường sắt / Đa phương thức), thanh toán (T/T / L/C / D/P / D/A / CAD / Open Account). Nội địa: vận chuyển (Giao hàng tận nơi / Khách tự đến lấy / Vận chuyển đường bộ / Vận chuyển đường thủy), thanh toán (Tiền mặt / Chuyển khoản / Công nợ 15/30/45 ngày).

