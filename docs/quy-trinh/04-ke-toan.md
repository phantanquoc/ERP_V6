# Quy trình hướng dẫn — Bộ phận Kế toán

## 1. Phòng KT Hành chính

### 1.1 Quản lý hóa đơn (tab Hóa đơn)

#### Thêm hóa đơn mới

1. Vào **Phòng KT Hành chính** → tab **Hóa đơn**
2. Nhấn **"Thêm mới"**


| Trường                 | Bắt buộc | Ghi chú                 |
| ---------------------- | -------- | ----------------------- |
| Số hóa đơn             | ✅        |                         |
| Ngày lập               | ✅        |                         |
| Mã đơn hàng            |          | Liên kết với đơn hàng   |
| Tổng tiền              | ✅        |                         |
| VAT (%)                |          |                         |
| Phương thức thanh toán | ✅        | Chuyển khoản / Tiền mặt |
| Ghi chú                |          |                         |


1. Nhấn **"Lưu"** → hóa đơn được tạo

#### Tìm kiếm / Lọc

- Theo số hóa đơn, khách hàng, ngày tháng

#### Sửa / Xóa

- **Sửa**: Nhấn icon Sửa → chỉnh sửa thông tin
- **Xóa**: Nhấn icon Xóa → xác nhận (chỉ ADMIN/DEPARTMENT_HEAD)

---

### 1.2 Quản lý công nợ (tab Công nợ)

#### Xem công nợ

- Danh sách công nợ theo nhà cung cấp
- Hiển thị: Tên NCC, Số tiền phải trả, Đã thanh toán, Còn lại
- Trạng thái: Chưa thanh toán / Đã thanh toán / Quá hạn

#### Thêm công nợ mới

1. Nhấn **"Thêm mới"**
2. Chọn nhà cung cấp
3. Nhập số tiền, hạn thanh toán
4. Nhấn **"Lưu"**

#### Thanh toán công nợ

1. Nhấn **"Thanh toán"** trên dòng công nợ
2. Nhập số tiền thanh toán, ngày thanh toán
3. Nhấn **"Xác nhận"**

---

### 1.3 Quản lý tài sản / Lô hàng (tab Tài sản)

1. Tab **Tài sản / Lô hàng** → xem danh sách tài sản
2. **Thêm mới**: Nhập thông tin tài sản, giá trị, ngày mua
3. Theo dõi khấu hao, tình trạng

---

### 1.4 Đơn hàng (tab Đơn hàng)

- Xem danh sách đơn hàng (read-only từ phòng KD/SX)
- Theo dõi trạng thái thanh toán của từng đơn

---

## 2. Phòng KT Thuế

### 2.1 Báo cáo thuế (tab Báo cáo thuế)

#### Xem danh sách

- Danh sách báo cáo thuế theo tháng
- Bản ghi tự động sinh khi có đơn hàng mới

#### Cập nhật trạng thái

1. Nhấn vào báo cáo
2. Điền số tiền thuế
3. Cập nhật trạng thái xử lý:


| Trạng thái    | Ý nghĩa             |
| ------------- | ------------------- |
| Chưa báo cáo  | Mới tạo, chưa xử lý |
| Đang cập nhật | Đang bổ sung hồ sơ  |
| Đủ hồ sơ      | Đã đủ giấy tờ       |
| Đã báo cáo    | Đã nộp báo cáo thuế |
| Đã quyết toán | Hoàn tất            |


1. Nhấn **"Lưu"**

---

## 3. Quy trình phối hợp

### 3.1 Luồng hóa đơn - công nợ

1. **Phòng KD** chốt đơn hàng
2. **Phòng KT Thuế** xử lý báo cáo thuế
3. **Phòng KT Hành chính** lập hóa đơn (tab **Hóa đơn**)
4. **Phòng KT Hành chính** theo dõi công nợ (tab **Công nợ**)
5. **Phòng KT Hành chính** ghi nhận thanh toán

### 3.2 Dashboard tổng quan

- **Phòng KT Hành chính**: Tổng tài sản, Tổng công nợ, Đã thanh toán, Chưa thanh toán
- **Phòng KT Thuế**: Tổng số báo cáo theo trạng thái

---

## 4. FAQ

**Q1: Làm thế nào để tạo hóa đơn mới?**  
Vào tab **Hóa đơn** → nhấn **Thêm mới** → chọn **Khách hàng** từ dropdown (hệ thống tự động sinh Số hóa đơn, điền Mã số thuế và Nhân viên lập) → chọn Loại hóa đơn, nhập Tổng tiền và VAT → nhấn **Lưu**.

**Q2: Sự khác nhau giữa Tổng tiền và Thành tiền trong hóa đơn?**

- **Tổng tiền**: Giá trị hàng hóa / dịch vụ trước thuế.
- **Thành tiền**: Tổng tiền cộng thêm thuế VAT. Thành tiền = Tổng tiền × (1 + VAT%/100).

**Q3: Tôi có thể thay đổi trạng thái đơn hàng từ "Đang sản xuất" sang "Đã giao" không?**  
Có. Vào tab **Danh sách đơn hàng** → tìm đơn hàng → nhấn Sửa → chọn trạng thái mới trong dropdown **Trạng thái SX**. Lưu ý: chỉ role TEAM_LEAD trở lên mới có quyền sửa.

**Q4: Trường "Còn nợ" trong công nợ được tính như thế nào?**  
Còn nợ = **Số tiền phải trả** − **Số tiền đã thanh toán**. Đây là trường chỉ đọc, tính tự động và hiển thị trong bảng danh sách công nợ.

**Q5: Thanh toán 2 đợt (USD và VNĐ) trong đơn hàng dùng để làm gì?**  
Đơn hàng xuất khẩu thường có 2 đợt thanh toán. Mỗi đợt ghi nhận riêng phần xuất khẩu bằng USD (`xuatKhauDotX_USD`) và phần nội địa bằng VNĐ (`noiDiaDotX_VND`), giúp kế toán theo dõi từng dòng tiền riêng biệt.

**Q6: Quy trình cập nhật trạng thái báo cáo thuế như thế nào?**  
Trạng thái nên được chuyển theo thứ tự: `CHUA_BAO_CAO` → `DANG_CAP_NHAT_HO_SO` → `DA_DAY_DU_HO_SO` → `DA_BAO_CAO` → `DA_QUYET_TOAN`. Chỉ DEPARTMENT_HEAD hoặc ADMIN mới có quyền tạo và cập nhật báo cáo thuế.

**Q7: Làm sao tìm kiếm hóa đơn?**  
Dùng ô **Tìm kiếm** trên tab Hóa đơn để tìm theo số hóa đơn hoặc tên khách hàng. Kết hợp với bộ lọc **Loại hóa đơn** và **Trạng thái** để thu hẹp kết quả.

**Q8: Làm thế nào để tạo công nợ mới?**  
Vào tab **Danh sách công nợ** → nhấn **Thêm mới** → chọn **Ngày phát sinh** (bắt buộc) → chọn **Tên nhà cung cấp** từ dropdown (hệ thống tự động điền Mã NCC) → nhập số tiền và các thông tin khác → nhấn **Lưu**.

**Q9: Tại sao không tìm thấy nhà cung cấp trong dropdown khi tạo công nợ?**  
Nhà cung cấp phải được tạo trước tại **Bộ phận tổng hợp → Phòng thu mua → Tab Nhà cung cấp**. Liên hệ bộ phận tổng hợp để thêm nhà cung cấp mới.

**Q10: Tại sao không tìm thấy khách hàng trong dropdown khi tạo hóa đơn?**  
Khách hàng phải được tạo trước tại **Bộ phận kinh doanh → Phòng kinh doanh quốc tế** (khách QT) hoặc **Phòng kinh doanh nội địa** (khách NĐ) → Tab **Khách hàng**. Liên hệ bộ phận kinh doanh để thêm khách hàng mới.

---

## 5. Phụ thuộc liên phòng ban


| Dữ liệu cần                                | Nguồn                       | Đường dẫn tạo                             |
| ------------------------------------------ | --------------------------- | ----------------------------------------- |
| Danh sách khách hàng (cho hóa đơn)         | Bộ phận kinh doanh          | Phòng KD quốc tế/nội địa → Tab Khách hàng |
| Danh sách nhà cung cấp (cho công nợ)       | Bộ phận tổng hợp            | Phòng thu mua → Tab Nhà cung cấp          |
| Đơn hàng (cho tab Đơn hàng + Báo cáo thuế) | Bộ phận kinh doanh          | Phòng KD quốc tế/nội địa → Tab Đơn hàng   |
| Lô hàng + sản phẩm (cho tab Tài sản)       | Bộ phận sản xuất / tổng hợp | Phòng sản xuất → Quản lý lô               |


