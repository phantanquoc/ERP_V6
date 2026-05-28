# Quy trình hướng dẫn — Bộ phận Tổng hợp

## 1. Phòng giá thành — Xử lý Yêu cầu Báo giá

### 1.1 Tiếp nhận YCBG

1. Vào **Phòng giá thành** → tab **Danh sách YCBG**
2. Xem danh sách YCBG từ phòng kinh doanh gửi sang
3. Nhấn vào YCBG để xem chi tiết sản phẩm cần báo giá

### 1.2 Tính giá thành (mở bảng tính)

1. Trên dòng YCBG → nhấn icon **"Tạo báo giá"** (biểu tượng file)
2. Bảng tính chi phí mở ra với từng tab sản phẩm
3. Mỗi tab sản phẩm gồm 4 nhóm:

#### Nhóm 1 — Thông tin sản phẩm

- Chọn loại sản phẩm → chọn tên sản phẩm
- Chọn định mức NVL → hệ thống tự động tính nguyên liệu đầu vào/ra
- Nhập tỉ lệ thu hồi, thành phẩm tồn kho, số lượng cần SX thêm

#### Nhóm 2 — Định mức nguyên vật liệu

- Xem bảng định mức NVL tự động từ định mức đã chọn
- Có thể điều chỉnh số lượng thực tế

#### Nhóm 3 — Chi phí sản xuất

- Chọn quy trình sản xuất → xem flowchart
- Chi phí SX kế hoạch và thực tế tự động tính từ quy trình

#### Nhóm 4 — Chi phí chung & xuất khẩu

- **Chi phí chung**: Có thể tạo nhiều bảng (VD: Chi phí QC, Chi phí đóng gói,...)
  - Nhấn **"+ Thêm bảng chi phí chung"** → đặt tên → chọn sản phẩm áp dụng
  - Thêm từng khoản chi phí từ danh sách có sẵn
- **Chi phí xuất khẩu**: Chọn các chi phí XK từ danh sách
  - Nhập giá KH và thực tế (có thể nhập bằng USD + tỉ giá)

### 1.3 Tab tổng hợp

- **Tổng chi phí đơn hàng**: Xem tổng hợp tất cả chi phí
- **Doanh thu & lợi nhuận**: Xem lợi nhuận dự kiến, điều chỉnh thuế/quỹ

### 1.4 Lưu bảng tính

- Nhấn **"Lưu"** trên từng tab sản phẩm — dữ liệu tự động lưu vào DB
- Nhấn **"Lưu bảng tính chi phí"** để lưu toàn bộ

### 1.5 Tạo báo giá chính thức

1. Sau khi tính xong, nhấn tab **Tổng chi phí đơn hàng** hoặc **Doanh thu & lợi nhuận**
2. Nhấn **"Tạo báo giá"** → form tạo báo giá hiện ra
3. Điền thông tin: Hiệu lực báo giá, Tình trạng, Ghi chú
4. Nhấn **"Tạo báo giá"** → báo giá xuất hiện trong tab **Danh sách BG**

---

## 2. Phòng giá thành — Xử lý Báo giá

### 2.1 Danh sách báo giá

- Tab **Danh sách BG** → xem tất cả báo giá đã tạo
- Bộ lọc: Mã BG, Mã YCBG, Ngày tạo, Tình trạng

### 2.2 Cập nhật trạng thái BG

1. Nhấn **Sửa** trên báo giá
2. Thay đổi tình trạng: DANG_CHO_PHAN_HOI / DA_GUI / DA_DAT_HANG / DA_HUY
3. Nhấn **"Lưu thay đổi"**

---

## 3. Phòng giá thành — Quản lý chi phí

### 3.1 Chi phí chung

- Tab **Chi phí chung** → Thêm/Sửa/Xóa các loại chi phí chung (điện, nước, khấu hao,...)

### 3.2 Chi phí xuất khẩu

- Tab **Chi phí xuất khẩu** → Thêm/Sửa/Xóa chi phí XK (cước biển, hải quan, bảo hiểm,...)

---

## 4. Phòng chăm sóc đối tác

### 4.1 Quản lý khách hàng

1. Vào **Phòng chăm sóc** → tab **Khách hàng**
2. **Thêm mới**: Nhấn **"Thêm khách hàng"** → điền thông tin → **Lưu**
3. **Tìm kiếm**: Theo tên, mã KH, SĐT

### 4.2 Quản lý nhà cung cấp

1. Tab **Nhà cung cấp** → xem danh sách NCC
2. Thêm/Sửa thông tin NCC

### 4.3 Dịch vụ logistics

- Tab **Logistics** → quản lý vận chuyển, cảng, container

---

## 5. FAQ

**Q1: Làm thế nào để tạo một yêu cầu báo giá (YCBG)?**

> Phòng giá thành **không tạo YCBG** — đó là quyền của Phòng kinh doanh. Phòng giá thành chỉ xem YCBG và tạo báo giá từ đó. Vào tab **"Danh sách YCBG"** → tìm YCBG cần xử lý → nhấn biểu tượng **"Tạo báo giá"** (file) → điền bảng tính → nhấn **"Tạo báo giá"**.

**Q2: Bảng tính báo giá yêu cầu "Mã định mức NVL" nhưng dropdown trống?**

> Định mức nguyên vật liệu do **Phòng kỹ thuật** tạo. Liên hệ Phòng kỹ thuật để tạo định mức cho sản phẩm cần báo giá.

**Q3: Bảng tính báo giá báo "Vui lòng tạo lưu đồ trong module Quy trình sản xuất"?**

> Quy trình sản xuất và lưu đồ do **Phòng kỹ thuật** hoặc **Phòng sản xuất** tạo. Liên hệ để tạo quy trình trước khi tính chi phí sản xuất.

**Q4: Bảng lương tháng hiển thị sai, tôi cần làm gì?**

> Kiểm tra lại các thông số cài đặt: **Số ngày công chuẩn / tháng** và **Giá tiền OT**. Nếu đã đúng, kiểm tra lại số ngày nghỉ và giờ OT của nhân viên đó rồi lưu lại.

**Q5: Tại sao cột "Tổng thu nhập" và "Tổng khấu trừ" không thể nhập tay?**

> Đây là các trường tính tự động dựa trên các khoản thu nhập và khấu trừ đã nhập. Hệ thống tự cộng để tránh sai sót.

**Q6: Làm sao gửi thông báo bảng lương cho toàn bộ nhân viên?**

> Vào module **Bảng lương**, chọn đúng **Tháng** và **Năm**, sau đó nhấn nút **Gửi bảng lương**. Thao tác này yêu cầu quyền ADMIN hoặc DEPARTMENT_HEAD.

**Q7: Phòng chăm sóc đối tác có quản lý hợp đồng không?**

> Tính năng quản lý hợp đồng đối tác đang trong quá trình phát triển. Hiện tại có thể tra cứu thông tin đối tác cơ bản và phối hợp với phòng giá thành.

**Q8: Khấu trừ ngày nghỉ được tính như thế nào?**

> Công thức: `Khấu trừ ngày nghỉ = Lương cơ bản ÷ Số ngày công chuẩn × Số ngày nghỉ`. Số ngày công chuẩn được cấu hình trong phần cài đặt bảng lương.

**Q9: Chi phí chung và chi phí xuất khẩu khác nhau thế nào?**

> **Chi phí chung** là chi phí vận hành (điện, nước, nhân sự gián tiếp...) — phân bổ cho tất cả sản phẩm theo khối lượng. **Chi phí xuất khẩu** là chi phí riêng cho đơn hàng quốc tế (vận chuyển biển, bảo hiểm, thủ tục hải quan...) — tính bằng USD với tỉ giá.

**Q10: Làm sao thêm chi phí bổ sung vào bảng tính?**

> Trong bảng tính báo giá, nhấn nút **"Thêm chi phí bổ sung"** → tạo tab mới → chọn loại sản phẩm, tên sản phẩm, khối lượng, định mức → nhập chi phí tương tự tab sản phẩm chính.

**Q11: Tôi muốn xem lại bảng tính của báo giá đã tạo?**

> Vào tab **"Danh sách đơn hàng"** → nhấn nút **"Xem bảng tính"** trên dòng đơn hàng tương ứng. Hoặc vào tab **"Danh sách báo giá"** → nhấn **"Xem"** để xem chi tiết.

**Q12: Trạng thái sản xuất có thể lùi lại không?**

> Không. Trạng thái sản xuất chỉ tiến theo thứ tự: Chờ lên kế hoạch → Chờ SX → Đang SX → Chờ giao hàng → Đã lên container → Đang vận chuyển → Đã giao. Không thể lùi hoặc nhảy cóc.

