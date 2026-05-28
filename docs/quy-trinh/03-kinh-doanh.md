## Cách truy cập

Từ thanh điều hướng bên trái (sidebar):

- **Phòng KD Quốc Tế**: Nhấn **Bộ phận kinh doanh** → chọn **Phòng KD Quốc Tế** (dành cho khách hàng nước ngoài, đơn hàng xuất khẩu)
- **Phòng KD Nội Địa**: Nhấn **Bộ phận kinh doanh** → chọn **Phòng KD Nội Địa** (dành cho khách hàng trong nước)

Nếu không biết chọn phòng nào: khách hàng nước ngoài → Quốc Tế, khách hàng trong nước → Nội Địa.

## 1. Tổng quan & Sơ đồ quy trình

Bộ phận Kinh doanh trong ERP được chia làm **hai phòng riêng biệt**:


| Phòng                | Trang                      | Đặc điểm                                                                                     |
| -------------------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| **Phòng KD Quốc Tế** | trang **Phòng KD Quốc Tế** | Khách hàng nước ngoài, đơn hàng xuất khẩu, giao dịch bằng USD, có trường Quốc gia / Cảng đến |
| **Phòng KD Nội Địa** | trang **Phòng KD Nội Địa** | Khách hàng trong nước, giao dịch VNĐ, có Tỉnh/Thành phố / Mã số thuế                         |


### Sơ đồ quy trình kinh doanh

```
Khách hàng yêu cầu
        │
        ▼
[YCBG] Yêu cầu báo giá
  (QuotationRequestManagement)
        │  ← Nhân viên KD tạo YCBG, chọn KH, thêm sản phẩm
        ▼
[BG] Báo giá
  (QuotationManagement)
        │  ← Dựa trên YCBG, tính giá, điền thông tin giao hàng
        ▼
[ĐH] Đơn hàng
  (OrderManagement)
        │  ← Khách hàng xác nhận → tạo đơn hàng, theo dõi SX & thanh toán
        ▼
[Phản hồi KH]
  (CustomerFeedbackManagement)
        │  ← Ghi nhận khiếu nại / góp ý / khen ngợi sau giao hàng
        ▼
      Đóng
```

---

## 2. Quyền truy cập theo vai trò


| Chức năng                    | Nhân viên    | Tổ trưởng | Trưởng phòng | Quản trị viên |
| ---------------------------- | ------------ | --------- | ------------ | ------------- |
| Xem danh sách YCBG           | ✅            | ✅         | ✅            | ✅             |
| Tạo YCBG mới                 | ✅            | ✅         | ✅            | ✅             |
| Chỉnh sửa YCBG               | ✅ (của mình) | ✅         | ✅            | ✅             |
| Xóa YCBG                     | ❌            | ✅         | ✅            | ✅             |
| Xem danh sách Báo giá        | ✅            | ✅         | ✅            | ✅             |
| Tạo / cập nhật Báo giá       | ✅            | ✅         | ✅            | ✅             |
| Xem Đơn hàng                 | ✅            | ✅         | ✅            | ✅             |
| Cập nhật trạng thái Đơn hàng | ✅            | ✅         | ✅            | ✅             |
| Quản lý Khách hàng QT / NĐ   | ✅            | ✅         | ✅            | ✅             |
| Xóa Khách hàng               | ❌            | ❌         | ✅            | ✅             |
| Ghi nhận Phản hồi KH         | ✅            | ✅         | ✅            | ✅             |
| Xuất Excel                   | ✅            | ✅         | ✅            | ✅             |


---

## 3. Phòng KD Quốc Tế (trang **Phòng KD Quốc Tế**)

**Tiêu đề trang:** "Phòng KD Quốc Tế" — phụ đề: "Quản lý khách hàng quốc tế, đơn hàng xuất khẩu và hợp đồng thương mại"

### Dashboard tóm tắt (4 thẻ thống kê đầu trang)


| Thẻ             | Chỉ số hiển thị                                                         |
| --------------- | ----------------------------------------------------------------------- |
| Yêu cầu báo giá | Tổng yêu cầu · Đã báo giá · Chưa báo giá                                |
| Báo giá         | Tổng báo giá · Đã đặt hàng · Chờ phản hồi · Chờ gửi ĐH · Không đặt hàng |
| Đơn hàng        | Tổng đơn hàng · Tháng này · Tháng trước                                 |
| Phản hồi KH     | Số phản hồi · Khẩn cấp · Cao                                            |


### 5 tab chính


| Tab                          | ID                  | Nội dung                           |
| ---------------------------- | ------------------- | ---------------------------------- |
| Danh sách yêu cầu BG         | `quotationRequests` | Quản lý YCBG từ khách hàng quốc tế |
| Danh sách BG                 | `quotations`        | Quản lý báo giá đã lập             |
| Đơn hàng quốc tế             | `orders`            | Theo dõi đơn hàng xuất khẩu        |
| Danh sách khách hàng quốc tế | `customers`         | Hồ sơ khách hàng nước ngoài        |
| Danh sách phản hồi từ KH     | `feedback`          | Ghi nhận và xử lý phản hồi         |


### 3.1 Tab: Yêu cầu Báo giá — YCBG (tab **Danh sách yêu cầu BG**, `customerType="Quốc tế"`)

#### Nút header


| Nút                      | Điều kiện                                   | Hành động                    |
| ------------------------ | ------------------------------------------- | ---------------------------- |
| **Xuất Excel**           | Luôn hiển thị                               | Xuất danh sách ra file Excel |
| **Thêm yêu cầu báo giá** | Chỉ ở Phòng KD (không có ở Phòng giá thành) | Mở form tạo YCBG mới         |


#### Bộ lọc


| Bộ lọc        | Loại    | Placeholder                                |
| ------------- | ------- | ------------------------------------------ |
| Tìm kiếm tổng | Văn bản | "Tìm kiếm mã YC, nhân viên, khách hàng..." |
| Mã YC         | Văn bản | —                                          |
| Nhân viên     | Văn bản | —                                          |
| Khách hàng    | Văn bản | —                                          |


#### Cột bảng danh sách


| Cột          | Nội dung                                                     |
| ------------ | ------------------------------------------------------------ |
| STT          | Số thứ tự                                                    |
| Ngày yêu cầu | Ngày tạo YCBG                                                |
| Mã YC        | Mã yêu cầu báo giá                                           |
| Nhân viên    | Tên nhân viên (đậm) + mã nhân viên (nhỏ xám)                 |
| Khách hàng   | Tên công ty (đậm) + mã khách hàng (nhỏ xám)                  |
| Sản phẩm     | Số lượng SP + tên SP đầu tiên (ví dụ: "+2" nếu có nhiều hơn) |
| Số lượng     | Tổng số lượng + đơn vị                                       |
| Hành động    | Xem / Sửa / Xóa / Tạo báo giá                                |


#### Nút hành động trên mỗi dòng


| Nút            | Tooltip        | Điều kiện             |
| -------------- | -------------- | --------------------- |
| Mắt (xanh)     | "Xem chi tiết" | Luôn hiển thị         |
| Bút (xanh)     | "Chỉnh sửa"    | Chỉ ở Phòng KD        |
| Thùng rác (đỏ) | "Xóa"          | Chỉ Tổ trưởng trở lên |
| File (xanh)    | "Tạo báo giá"  | Chỉ ở Phòng giá thành |


#### Form tạo YCBG mới — "Thêm yêu cầu báo giá mới"

**Trường header:**


| Trường             | Bắt buộc | Loại nhập             | Ghi chú                                                                  |
| ------------------ | -------- | --------------------- | ------------------------------------------------------------------------ |
| Mã yêu cầu báo giá | ✅        | Văn bản (vô hiệu hóa) | Tự động sinh                                                             |
| Khách hàng         | ✅        | Chọn từ danh sách     | Hiển thị: "[maKhachHang] - [tenCongTy]". Lỗi: "Vui lòng chọn khách hàng" |


**Danh sách sản phẩm** (lặp lại, tối thiểu 1 dòng):


| Trường                 | Bắt buộc | Loại nhập         | Ghi chú                                                                                 |
| ---------------------- | -------- | ----------------- | --------------------------------------------------------------------------------------- |
| Sản phẩm               | ✅        | Chọn từ danh sách | Hiển thị: "[maSanPham] - [tenSanPham]". Lỗi: "Sản phẩm {n}: Vui lòng chọn sản phẩm"     |
| Yêu cầu sản phẩm       |          | Văn bản           | Placeholder: "VD: kg, tấn, thùng..."                                                    |
| Quy cách đóng gói      |          | Văn bản           |                                                                                         |
| Số lượng               | ✅        | Số                | Lỗi: "Sản phẩm {n}: Vui lòng nhập số lượng hợp lệ"                                      |
| Đơn vị tính            | ✅        | Dropdown          | Kg / MT / Tấn / Thùng / Hộp / Cái / Lít. Lỗi: "Sản phẩm {n}: Vui lòng nhập đơn vị tính" |
| Giá đối thủ bán (VND)  |          | Số                |                                                                                         |
| Giá bán gần nhất (VND) |          | Số                |                                                                                         |


Nút trong phần sản phẩm: **"Thêm sản phẩm"** (xanh lá, biểu tượng +). Biểu tượng thùng rác để xóa dòng (chỉ hiện khi có >1 dòng).

**Trường vận chuyển & thanh toán — KHÁC NHAU theo loại khách hàng:**


| Trường               | Quốc tế                                                                         | Nội địa                                                                                      |
| -------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Hình thức vận chuyển | Dropdown: Đường biển / Đường hàng không / Đường bộ / Đường sắt / Đa phương thức | Dropdown: Giao hàng tận nơi / Khách tự đến lấy / Vận chuyển đường bộ / Vận chuyển đường thủy |
| Hình thức thanh toán | Dropdown: T/T / L/C / D/P / D/A / CAD / Open Account                            | Dropdown: Tiền mặt / Chuyển khoản / Công nợ 15 ngày / Công nợ 30 ngày / Công nợ 45 ngày      |
| Địa điểm giao        | Quốc gia (văn bản) + Cảng đến (văn bản)                                         | Địa chỉ giao hàng (văn bản, placeholder: "Nhập địa chỉ giao hàng...")                        |


**Trường chung:**


| Trường  | Bắt buộc | Loại nhập            |
| ------- | -------- | -------------------- |
| Ghi chú |          | Văn bản dài (3 dòng) |


**Nút:** "Tạo mới" (tạo) / "Cập nhật" (sửa) / "Hủy"

**Thông báo lỗi validation:**

- "Vui lòng chọn khách hàng"
- "Vui lòng thêm ít nhất 1 sản phẩm"
- "Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại."

**Thông báo thành công:** "Tạo yêu cầu báo giá thành công!" / "Cập nhật yêu cầu báo giá thành công!" / "Xóa yêu cầu báo giá thành công!"

#### Modal xem chi tiết — "Chi tiết yêu cầu báo giá"

Hiển thị (chỉ đọc): Mã YCBG · Ngày yêu cầu · Mã/Tên nhân viên · Mã/Tên khách hàng · Danh sách sản phẩm (Mã SP, Tên SP, Số lượng + đơn vị, Yêu cầu SP, Quy cách đóng gói, Giá đối thủ, Giá gần nhất) · Hình thức vận chuyển · Hình thức thanh toán · Quốc gia/Cảng đến (QT) hoặc Địa chỉ giao hàng (NĐ) · Ghi chú

**Nút:** "Đóng"

#### Phân trang

Hiển thị "Hiển thị X–Y / Z mục" · Nút "Trước" / số trang / "Sau" · 10 mục/trang

---

### 3.2 Tab: Báo giá (tab **Danh sách báo giá**)

#### Nút header


| Nút            | Hành động                    |
| -------------- | ---------------------------- |
| **Xuất Excel** | Xuất danh sách ra file Excel |


> Không có nút "Thêm" — báo giá được tạo từ YCBG qua nút "Tạo báo giá" ở tab YCBG.

#### Bộ lọc


| Bộ lọc        | Loại    | Placeholder                                |
| ------------- | ------- | ------------------------------------------ |
| Tìm kiếm tổng | Văn bản | "Tìm kiếm mã BG, khách hàng, nhân viên..." |
| Mã BG         | Văn bản | —                                          |
| Khách hàng    | Văn bản | —                                          |
| Nhân viên     | Văn bản | —                                          |


#### Cột bảng danh sách (10 cột)


| Cột           | Nội dung                                   |
| ------------- | ------------------------------------------ |
| STT           | Số thứ tự                                  |
| Ngày BG       | Ngày lập báo giá                           |
| Mã báo giá    | Mã định danh                               |
| Giá báo khách | Giá (VNĐ/KG), có thể kèm USD nếu có tỷ giá |
| TG giao hàng  | Thời gian giao hàng (hiển thị: "{n} ngày") |
| Hiệu lực      | Hiệu lực báo giá (hiển thị: "{n} ngày")    |
| Nhân viên     | Người lập báo giá                          |
| Trạng thái    | Badge màu                                  |
| Ghi chú       | Ghi chú ngắn                               |
| Hành động     | Xem / Sửa / Tạo đơn hàng / Xóa             |


#### Nút hành động trên mỗi dòng


| Nút            | Tooltip        | Hành động                                                      |
| -------------- | -------------- | -------------------------------------------------------------- |
| Mắt (xanh)     | "Xem chi tiết" | Mở modal xem chi tiết                                          |
| Bút (xanh)     | "Chỉnh sửa"    | Mở form chỉnh sửa                                              |
| Giỏ hàng (tím) | "Tạo đơn hàng" | Xác nhận: "Bạn có chắc chắn muốn tạo đơn hàng từ báo giá này?" |
| Thùng rác (đỏ) | "Xóa"          | Xác nhận: "Bạn có chắc chắn muốn xóa báo giá này?"             |


#### Trạng thái Báo giá (`tinhTrang`) — đầy đủ 9 giá trị


| Giá trị                 | Nhãn hiển thị         | Màu badge  |
| ----------------------- | --------------------- | ---------- |
| Bản nháp                | Nháp                  | Xám        |
| Đang chờ phản hồi       | Đang chờ phản hồi     | Vàng       |
| `DANG_CHO_GUI_DON_HANG` | Đang chờ gửi đơn hàng | Xanh dương |
| Đã đặt hàng             | Đã đặt hàng           | Xanh lá    |
| `KHONG_DAT_HANG`        | Không đặt hàng        | Đỏ         |
| `SENT`                  | Đã gửi                | Xanh dương |
| Đã duyệt                | Đã duyệt              | Xanh lá    |
| Từ chối                 | Từ chối               | Đỏ         |
| `EXPIRED`               | Hết hạn               | Xám        |


#### Form chỉnh sửa báo giá — "Chỉnh Sửa Báo Giá"

**Phần chỉ đọc** (lấy từ YCBG, không sửa được): Mã báo giá · Ngày báo giá · Khách hàng · Sản phẩm

**Phần có thể sửa:**


| Trường                     | Bắt buộc | Loại nhập             | Ghi chú                                                                  |
| -------------------------- | -------- | --------------------- | ------------------------------------------------------------------------ |
| Giá báo khách (VNĐ/KG)     | ✅        | Số (bước 0.01, min 0) | Placeholder: "Nhập giá báo khách"                                        |
| Thời gian giao hàng (ngày) | ✅        | Số (min 1)            | Placeholder: "Nhập thời gian giao hàng"                                  |
| Hiệu lực báo giá (ngày)    | ✅        | Số (min 1)            | Placeholder: "Nhập hiệu lực báo giá"                                     |
| Trạng thái                 | ✅        | Dropdown              | Đang chờ phản hồi / Đang chờ gửi đơn hàng / Đã đặt hàng / Không đặt hàng |
| Ghi chú                    |          | Văn bản dài (4 dòng)  | Placeholder: "Nhập ghi chú (nếu có)"                                     |


**Nút:** "Lưu thay đổi" (vàng) / "Hủy"

#### Modal xem chi tiết — "Chi Tiết Báo Giá"

**Thông tin cơ bản:** Mã báo giá · Ngày báo giá · Khách hàng · Sản phẩm · Khối lượng + đơn vị · Giá báo khách ("{n} VNĐ/KG") · Thời gian giao hàng ("{n} ngày") · Hiệu lực ("{n} ngày") · Nhân viên báo giá · Trạng thái (badge) · Ghi chú

**Thông tin định mức** (chỉ hiển thị nếu có `maDinhMuc`):

- Mã định mức · Tên định mức · Tỉ lệ thu hồi ("{n}%") · Sản phẩm đầu ra

**Thông tin sản xuất:**

- Thành phẩm tồn kho ("{n} KG") · Tổng thành phẩm cần SX thêm · Tổng nguyên liệu cần SX · Nguyên liệu tồn kho · Nguyên liệu cần nhập thêm

**Nút:** "Đóng"

---

### 3.3 Tab: Đơn hàng quốc tế (tab **Danh sách đơn hàng**)

#### Nút header


| Nút            | Hành động                    |
| -------------- | ---------------------------- |
| **Xuất Excel** | Xuất danh sách ra file Excel |


#### Bộ lọc


| Bộ lọc        | Loại    | Placeholder                            |
| ------------- | ------- | -------------------------------------- |
| Tìm kiếm tổng | Văn bản | "Tìm kiếm mã ĐH, mã BG, khách hàng..." |
| Mã ĐH         | Văn bản | —                                      |
| Mã BG         | Văn bản | —                                      |
| Khách hàng    | Văn bản | —                                      |
| Trạng thái SX | Văn bản | —                                      |


#### Cột bảng danh sách


| Cột           | Nội dung                        |
| ------------- | ------------------------------- |
| STT           | Số thứ tự                       |
| Ngày đặt hàng | Ngày tạo đơn                    |
| Mã đơn hàng   | Mã định danh (chữ xanh đậm)     |
| Mã báo giá    | Mã BG liên kết                  |
| Khách hàng    | Tên khách hàng                  |
| Số lượng SP   | Số sản phẩm trong đơn           |
| Trạng thái SX | Badge trạng thái sản xuất       |
| Trạng thái TT | Badge trạng thái thanh toán     |
| Hành động     | Xem / Xem bảng tính / Sửa / Xóa |


#### Nút hành động trên mỗi dòng


| Nút             | Tooltip         | Hành động                                           |
| --------------- | --------------- | --------------------------------------------------- |
| Mắt (xanh)      | "Xem chi tiết"  | Mở modal xem chi tiết                               |
| Máy tính (xanh) | "Xem bảng tính" | Mở bảng tính báo giá                                |
| Bút (xanh)      | "Chỉnh sửa"     | Mở form chỉnh sửa                                   |
| Thùng rác (đỏ)  | "Xóa"           | Xác nhận: "Bạn có chắc chắn muốn xóa đơn hàng này?" |


#### Trạng thái sản xuất (`trangThaiSanXuat`)


| Giá trị                  | Nhãn hiển thị          |
| ------------------------ | ---------------------- |
| `CHO_LEN_KE_HOACH`       | Chờ lên kế hoạch       |
| `CHO_SAN_XUAT`           | Chờ sản xuất           |
| `DANG_SAN_XUAT`          | Đang sản xuất          |
| `CHO_GIAO_HANG`          | Chờ giao hàng          |
| `DA_LEN_CONTAINER`       | Đã lên container       |
| `DANG_VAN_CHUYEN`        | Đang vận chuyển        |
| `DA_GIAO_CHO_KHACH_HANG` | Đã giao cho khách hàng |


#### Trạng thái thanh toán (`trangThaiThanhToan`)


| Giá trị                | Nhãn hiển thị        |
| ---------------------- | -------------------- |
| `DA_THANH_TOAN_DOT_1`  | Đã thanh toán đợt 1  |
| `CHO_THANH_TOAN_DOT_2` | Chờ thanh toán đợt 2 |
| `DA_THANH_TOAN_DU`     | Đã thanh toán đủ     |


#### Form chỉnh sửa đơn hàng


| Nhóm             | Trường                  | Loại nhập                                            |
| ---------------- | ----------------------- | ---------------------------------------------------- |
| Giá trị          | Giá trị đơn hàng (USD)  | Số (bước 0.01), placeholder "0.00"                   |
| Giá trị          | Giá trị đơn hàng (VNĐ)  | Số, placeholder "0"                                  |
| Thanh toán đợt 1 | Xuất khẩu (USD)         | Số (bước 0.01)                                       |
| Thanh toán đợt 1 | Nội địa (VNĐ)           | Số                                                   |
| Thanh toán đợt 1 | Ngày thanh toán         | Chọn ngày                                            |
| Thanh toán đợt 2 | Xuất khẩu (USD)         | Số (bước 0.01)                                       |
| Thanh toán đợt 2 | Nội địa (VNĐ)           | Số                                                   |
| Thanh toán đợt 2 | Ngày thanh toán         | Chọn ngày                                            |
| Sản xuất         | Ngày bắt đầu SX (KH)    | Chọn ngày                                            |
| Sản xuất         | Ngày hoàn thành SX (KH) | Chọn ngày                                            |
| Sản xuất         | Ngày hoàn thành thực tế | Chọn ngày                                            |
| Sản xuất         | Ngày giao hàng          | Chọn ngày                                            |
| Trạng thái       | Trạng thái sản xuất     | Dropdown (7 giá trị trên)                            |
| Trạng thái       | Trạng thái thanh toán   | Dropdown (3 giá trị trên)                            |
|                  | Ghi chú                 | Văn bản dài (4 dòng), placeholder: "Nhập ghi chú..." |


**Nút:** "Lưu thay đổi" / "Hủy"

#### Modal xem chi tiết — "Chi tiết đơn hàng - [maDonHang]"

Các phần hiển thị: Thông tin cơ bản (Mã ĐH, Ngày đặt, Mã BG, Mã YCBG) · Thông tin KH (Mã KH, Tên KH, Nhân viên phụ trách) · Giá trị ĐH (USD + VNĐ) · Thanh toán đợt 1 & 2 · Thông tin SX (ngày bắt đầu/hoàn thành KH/thực tế/giao hàng) · Trạng thái SX + TT · Danh sách hàng hóa (Mã SP, Tên, Loại, Yêu cầu, Đóng gói, Số lượng, Đơn vị) · Ghi chú

**Nút:** "Đóng" + "Chỉnh sửa"

#### Bảng tính báo giá (QuotationCalculatorModal)

Nhấn nút **"Xem bảng tính"** trên dòng đơn hàng để mở modal bảng tính giá thành chi tiết. Modal này hiển thị toàn bộ cấu trúc tính giá của đơn hàng:

**Cấu trúc tab:** Mỗi sản phẩm trong đơn hàng có 1 tab riêng + có thể thêm "Chi phí bổ sung" (tab phụ).

**Thông tin mỗi tab sản phẩm:**


| Nhóm         | Nội dung                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Định mức     | Mã định mức · Tên định mức · Tỉ lệ thu hồi (%) · Sản phẩm đầu ra · Nguyên liệu đầu vào                                                  |
| Tồn kho & SX | Thành phẩm tồn kho · Tổng thành phẩm cần SX thêm · Tổng nguyên liệu cần SX · Nguyên liệu tồn kho · Nguyên liệu cần nhập thêm            |
| Thực tế      | Tổng khối lượng thành phẩm thực tế · Thành phẩm tồn kho thực tế · Tổng thành phẩm cần SX thêm thực tế · Tổng nguyên liệu cần SX thực tế |
| Thời gian    | Thời gian cho phép tối đa · Ngày bắt đầu SX (KH) · Ngày bắt đầu SX thực tế · Ngày hoàn thành thực tế                                    |
| Chi phí      | Chi phí SX (KH/TT) · Chi phí chung (KH/TT) · Chi phí xuất khẩu (KH/TT)                                                                  |
| Giá          | Giá hòa vốn (tự tính) · Lợi nhuận cộng thêm · Tỉ giá USD                                                                                |


**Chi phí chung & Chi phí xuất khẩu:**

- Lấy từ danh mục chi phí đã thiết lập tại **Bộ phận tổng hợp → Phòng giá thành → Tab Chi phí**
- Mỗi chi phí có giá trị Kế hoạch và Thực tế (VNĐ)
- Chi phí xuất khẩu có thêm giá trị USD và tỉ giá

**Tổng hợp đơn hàng:**

- Phần trăm thuế (%) · Phần trăm quỹ (%)
- Tổng chi phí kế hoạch / thực tế
- Giá báo khách (VNĐ/KG) và giá USD (nếu có tỉ giá)

**Nút:** "Tạo báo giá" (mở form tạo BG từ bảng tính) / "Đóng"

> **Lưu ý:** Bảng tính này là công cụ tính giá thành — dữ liệu chi phí chung và chi phí xuất khẩu phải được thiết lập trước tại Bộ phận tổng hợp. Nếu chưa có chi phí, liên hệ Phòng giá thành để tạo.

---

### 3.4 Tab: Khách hàng quốc tế (tab **Khách hàng quốc tế**)

#### Nút header


| Nút                 | Hành động                    |
| ------------------- | ---------------------------- |
| **Xuất Excel**      | Xuất danh sách ra file Excel |
| **Thêm khách hàng** | Mở form tạo khách hàng mới   |


#### Bộ lọc


| Bộ lọc        | Loại    | Placeholder                                |
| ------------- | ------- | ------------------------------------------ |
| Tìm kiếm tổng | Văn bản | "Tìm kiếm mã KH, tên công ty, quốc gia..." |
| Mã KH         | Văn bản | —                                          |
| Tên công ty   | Văn bản | —                                          |
| Quốc gia      | Văn bản | —                                          |


#### Cột bảng danh sách


| Cột           | Nội dung                                       |
| ------------- | ---------------------------------------------- |
| Mã KH         | Mã khách hàng                                  |
| Tên công ty   | Tên công ty                                    |
| Người liên hệ | Tên người liên hệ                              |
| Quốc gia      | Tên quốc gia (có biểu tượng ghim bản đồ)       |
| Loại KH       | Loại khách hàng                                |
| Doanh thu năm | Doanh thu (USD, chữ xanh lá, hiển thị: "${n}") |
| Trạng thái    | Badge màu                                      |
| Hoạt động     | Nút Xem / Sửa / Xóa                            |


#### Nút hành động trên mỗi dòng


| Nút            | Tooltip        | Hành động                      |
| -------------- | -------------- | ------------------------------ |
| Mắt (xanh)     | "Xem chi tiết" | Mở modal xem                   |
| Bút (xanh)     | "Chỉnh sửa"    | Mở form sửa                    |
| Thùng rác (đỏ) | "Xóa"          | Chỉ Trưởng phòng/Quản trị viên |


#### Form thêm / chỉnh sửa khách hàng quốc tế


| Trường              | Bắt buộc | Loại nhập            | Ghi chú                                                     |
| ------------------- | -------- | -------------------- | ----------------------------------------------------------- |
| Tên công ty         | ✅        | Văn bản              |                                                             |
| Người liên hệ       | ✅        | Văn bản              |                                                             |
| Quốc gia            | ✅        | Văn bản              |                                                             |
| Thành phố           |          | Văn bản              |                                                             |
| Địa chỉ             |          | Văn bản              |                                                             |
| Số điện thoại       |          | Văn bản              |                                                             |
| Email               |          | Email                |                                                             |
| Website             |          | Văn bản              |                                                             |
| Loại khách hàng     | ✅        | Dropdown             | Nhà phân phối / Nhà nhập khẩu / Nhà bán lẻ / Đại lý         |
| Trạng thái          |          | Dropdown             | Hoạt động / Tạm ngưng / Ngừng hợp tác (mặc định: Hoạt động) |
| Ngày hợp tác        |          | Chọn ngày            | Placeholder: "Chọn ngày hợp tác"                            |
| Doanh thu năm (USD) |          | Số                   | Mặc định: 0                                                 |
| Số lượng đơn hàng   |          | Số                   | Mặc định: 0                                                 |
| Sản phẩm chính      |          | Văn bản              |                                                             |
| Ghi chú             |          | Văn bản dài (3 dòng) |                                                             |


**Nút:** "Thêm mới" / "Cập nhật" / "Hủy"

#### Trạng thái khách hàng


| Giá trị       | Màu badge |
| ------------- | --------- |
| Hoạt động     | Xanh lá   |
| Tạm ngưng     | Vàng      |
| Ngừng hợp tác | Đỏ        |


---

### 3.5 Tab: Phản hồi từ khách hàng (tab **Phản hồi từ KH**)

#### Nút header


| Nút               | Hành động                    |
| ----------------- | ---------------------------- |
| **Xuất Excel**    | Xuất danh sách ra file Excel |
| **Thêm phản hồi** | Mở form tạo phản hồi mới     |


#### Bộ lọc


| Bộ lọc        | Loại     | Tùy chọn                                                  |
| ------------- | -------- | --------------------------------------------------------- |
| Tìm kiếm tổng | Văn bản  | Placeholder: "Tìm kiếm nội dung, sản phẩm, khách hàng..." |
| Trạng thái    | Dropdown | Chưa xử lý / Đang xử lý / Đã xử lý / Đã đóng              |
| Loại phản hồi | Dropdown | Khiếu nại / Góp ý / Khen ngợi / Yêu cầu hỗ trợ / Khác     |
| Mức độ        | Dropdown | Thấp / Trung bình / Cao / Khẩn cấp                        |


#### Cột bảng danh sách


| Cột        | Nội dung                               |
| ---------- | -------------------------------------- |
| Khách hàng | Tên công ty (đậm) + quốc gia (nhỏ xám) |
| Loại       | Loại phản hồi                          |
| Nội dung   | Tóm tắt nội dung (rút gọn)             |
| Mức độ     | Badge màu theo mức độ nghiêm trọng     |
| Trạng thái | Badge màu theo trạng thái xử lý        |
| Ngày       | Ngày ghi nhận                          |
| Hành động  | Nút Xem / Sửa / Xóa                    |


#### Nút hành động trên mỗi dòng


| Nút            | Tooltip        | Hành động        |
| -------------- | -------------- | ---------------- |
| Mắt (xanh)     | "Xem chi tiết" | Mở modal xem     |
| Bút (xanh)     | "Chỉnh sửa"    | Mở form sửa      |
| Thùng rác (đỏ) | "Xóa"          | Xác nhận rồi xóa |


#### Form tạo / cập nhật phản hồi


| Trường              | Bắt buộc | Loại nhập            | Tùy chọn / Ghi chú                                                                   |
| ------------------- | -------- | -------------------- | ------------------------------------------------------------------------------------ |
| Khách hàng          | ✅        | Dropdown             | Hiển thị: "tenCongTy (maKhachHang) - quocGia"                                        |
| Loại phản hồi       | ✅        | Dropdown             | Khiếu nại / Góp ý / Khen ngợi / Yêu cầu hỗ trợ / Khác (mặc định: Góp ý)              |
| Mức độ nghiêm trọng | ✅        | Dropdown             | Thấp / Trung bình / Cao / Khẩn cấp (mặc định: Trung bình)                            |
| Nội dung phản hồi   | ✅        | Văn bản dài (4 dòng) |                                                                                      |
| Sản phẩm liên quan  |          | Văn bản              |                                                                                      |
| Đơn hàng liên quan  |          | Văn bản              |                                                                                      |
| Người tiếp nhận     |          | Văn bản              |                                                                                      |
| Trạng thái xử lý    | ✅        | Dropdown             | Chưa xử lý / Đang xử lý / Đã xử lý / Đã đóng (mặc định: Chưa xử lý)                  |
| Biện pháp xử lý     |          | Văn bản dài (3 dòng) |                                                                                      |
| Kết quả xử lý       |          | Văn bản dài (3 dòng) |                                                                                      |
| Mức độ hài lòng     |          | Dropdown             | (trống) / Rất không hài lòng / Không hài lòng / Trung bình / Hài lòng / Rất hài lòng |
| Ghi chú             |          | Văn bản dài (2 dòng) |                                                                                      |


**Nút:** "Thêm mới" (tạo) / "Cập nhật" (sửa) / "Hủy"

#### Màu badge trạng thái xử lý


| Giá trị    | Màu        | Biểu tượng |
| ---------- | ---------- | ---------- |
| Chưa xử lý | Xanh dương | Đồng hồ    |
| Đang xử lý | Vàng       | Cảnh báo   |
| Đã xử lý   | Xanh lá    | Tích       |
| Đã đóng    | Xám        | X          |


#### Màu badge mức độ nghiêm trọng


| Giá trị    | Màu        |
| ---------- | ---------- |
| Thấp       | Xám        |
| Trung bình | Xanh dương |
| Cao        | Cam        |
| Khẩn cấp   | Đỏ         |


---

## 4. Phòng KD Nội Địa (trang **Phòng KD Nội Địa**)

**Tiêu đề trang:** "Phòng KD Nội Địa" — phụ đề: "Quản lý khách hàng nội địa, đơn hàng trong nước và hợp đồng thương mại"

Trang gồm **5 tab** tương tự Quốc Tế, nhưng dành cho thị trường trong nước:


| Tab                          | ID                  | Nội dung                          |
| ---------------------------- | ------------------- | --------------------------------- |
| Danh sách yêu cầu BG         | `quotationRequests` | YCBG với `customerType="Nội địa"` |
| Danh sách BG                 | `quotations`        | Báo giá nội địa                   |
| Đơn hàng nội địa             | `orders`            | Theo dõi đơn hàng trong nước      |
| Danh sách khách hàng nội địa | `customers`         | Hồ sơ khách hàng Việt Nam         |
| Danh sách phản hồi từ KH     | `feedback`          | Phản hồi khách hàng nội địa       |


> **Lưu ý:** Các tab YCBG, BG, Đơn hàng, Phản hồi KH dùng chung component với Quốc Tế nhưng lọc `customerType="Nội địa"`. Trường **Quốc gia** và **Cảng đến** không xuất hiện trong YCBG nội địa — thay bằng **Địa chỉ giao hàng**. Cả hai phòng đều dùng dropdown cho hình thức vận chuyển và thanh toán, nhưng danh sách tùy chọn khác nhau (xem bảng so sánh ở mục 3.1).

### 4.1 Khách hàng Nội Địa (tab **Khách hàng nội địa**)

#### Nút header


| Nút                 | Hành động                    |
| ------------------- | ---------------------------- |
| **Xuất Excel**      | Xuất danh sách ra file Excel |
| **Thêm khách hàng** | Mở form tạo khách hàng mới   |


#### Bộ lọc


| Bộ lọc        | Loại    | Placeholder                                  |
| ------------- | ------- | -------------------------------------------- |
| Tìm kiếm tổng | Văn bản | "Tìm kiếm mã KH, tên công ty, tỉnh/thành..." |
| Mã KH         | Văn bản | —                                            |
| Tên công ty   | Văn bản | —                                            |
| Tỉnh/Thành    | Văn bản | —                                            |


#### Cột bảng danh sách


| Cột           | Nội dung            |
| ------------- | ------------------- |
| Mã KH         | Mã khách hàng       |
| Tên công ty   | Tên công ty         |
| Người liên hệ | Tên người liên hệ   |
| Tỉnh/Thành    | Tỉnh/Thành phố      |
| Quận/Huyện    | Quận/Huyện          |
| Loại KH       | Loại khách hàng     |
| Trạng thái    | Badge màu           |
| Hoạt động     | Nút Xem / Sửa / Xóa |


#### Form thêm / chỉnh sửa khách hàng nội địa


| Trường          | Bắt buộc | Loại nhập            | Ghi chú                                                     |
| --------------- | -------- | -------------------- | ----------------------------------------------------------- |
| Tên công ty     | ✅        | Văn bản              |                                                             |
| Người liên hệ   | ✅        | Văn bản              |                                                             |
| Tỉnh/Thành phố  | ✅        | Văn bản              |                                                             |
| Quận/Huyện      |          | Văn bản              |                                                             |
| Địa chỉ         |          | Văn bản              |                                                             |
| Số điện thoại   |          | Văn bản              |                                                             |
| Email           |          | Email                |                                                             |
| Website         |          | Văn bản              |                                                             |
| Mã số thuế      |          | Văn bản              | **Chỉ có ở khách hàng nội địa**                             |
| Loại khách hàng | ✅        | Dropdown             | Nhà phân phối / Nhà nhập khẩu / Nhà bán lẻ / Đại lý         |
| Trạng thái      |          | Dropdown             | Hoạt động / Tạm ngưng / Ngừng hợp tác (mặc định: Hoạt động) |
| Ghi chú         |          | Văn bản dài (3 dòng) |                                                             |


**Nút:** "Thêm mới" / "Cập nhật" / "Hủy"

**Thông báo lỗi validation:** "Vui lòng điền đầy đủ các trường bắt buộc: Tên công ty, Người liên hệ, Loại khách hàng, Tỉnh/Thành phố"

> **So sánh QT vs NĐ:** Khách hàng quốc tế có thêm **Quốc gia, Thành phố, Ngày hợp tác, Doanh thu năm (USD), Số lượng đơn hàng, Sản phẩm chính**. Khách hàng nội địa có thêm **Quận/Huyện** và **Mã số thuế**.

---

## 5. Quản lý Sản phẩm Quốc tế

Sản phẩm dùng trong YCBG và BG được tải từ danh mục sản phẩm quốc tế của hệ thống. Khi tạo YCBG, nhân viên chọn sản phẩm từ dropdown (danh sách tải sẵn), sau đó nhập thêm:

- Yêu cầu sản phẩm (đặc tính, tiêu chuẩn kỹ thuật)
- Quy cách đóng gói
- Số lượng và đơn vị tính
- Giá đối thủ / giá bán gần nhất (nếu có)

---

## 6. Trang Tổng quan Kinh doanh (BusinessReport)

**Truy cập:** Nhấn **Bộ phận kinh doanh** → chọn **Tổng quan** (hoặc trang mặc định khi vào bộ phận)

Trang hiển thị báo cáo tổng hợp hoạt động kinh doanh:

### 4 thẻ thống kê đầu trang


| Thẻ                | Chỉ số             |
| ------------------ | ------------------ |
| Đơn hàng           | Tổng số đơn hàng   |
| Khách hàng quốc tế | Tổng số KH quốc tế |
| Khách hàng nội địa | Tổng số KH nội địa |
| Phản hồi KH        | Tổng số phản hồi   |


### Biểu đồ


| Biểu đồ                          | Loại         | Nội dung                                                |
| -------------------------------- | ------------ | ------------------------------------------------------- |
| Phân bổ đơn hàng theo loại khách | Tròn (Pie)   | Tỷ lệ đơn hàng quốc tế vs nội địa                       |
| Phân bổ phản hồi theo loại khách | Tròn (Pie)   | Tỷ lệ phản hồi quốc tế vs nội địa                       |
| Đơn hàng quốc tế theo năm        | Đường (Line) | So sánh số đơn hàng QT năm nay vs năm trước, theo tháng |
| Đơn hàng nội địa theo năm        | Đường (Line) | So sánh số đơn hàng NĐ năm nay vs năm trước, theo tháng |


> **Lưu ý:** Trạng thái khách hàng trên trang này hiển thị "Đang giao dịch" / "Ngừng giao dịch" (khác với "Hoạt động" / "Tạm ngưng" / "Ngừng hợp tác" trong form quản lý KH).

---

## 7. Phụ thuộc liên bộ phận

Bộ phận Kinh doanh phụ thuộc dữ liệu từ các bộ phận khác. Nếu thiếu dữ liệu, hướng dẫn nhân viên liên hệ đúng bộ phận:


| Dữ liệu cần                                       | Nguồn                                                   | Nếu thiếu                                                |
| ------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------- |
| Danh mục sản phẩm (dropdown khi tạo YCBG)         | **Bộ phận tổng hợp** → Phòng hàng hóa QT → Tab Sản phẩm | Liên hệ Phòng hàng hóa QT để thêm sản phẩm mới           |
| Danh sách khách hàng (dropdown khi tạo YCBG)      | Tab **Khách hàng** trong cùng phòng KD                  | Tạo khách hàng mới tại tab Khách hàng trước khi tạo YCBG |
| Chi phí chung / Chi phí xuất khẩu (bảng tính giá) | **Bộ phận tổng hợp** → Phòng giá thành → Tab Chi phí    | Liên hệ Phòng giá thành để thiết lập chi phí             |
| Định mức nguyên vật liệu (bảng tính giá)          | **Bộ phận tổng hợp** → Phòng giá thành → Tab Định mức   | Liên hệ Phòng giá thành để tạo định mức                  |
| Quy trình sản xuất (bảng tính giá)                | **Bộ phận tổng hợp** → Phòng giá thành → Tab Quy trình  | Liên hệ Phòng giá thành để thiết lập quy trình           |
| Tồn kho (kiểm tra khi tính giá)                   | **Bộ phận tổng hợp** → Phòng hàng hóa QT → Tab Kho      | Liên hệ Phòng kho để cập nhật tồn kho                    |


> **Thứ tự thiết lập:** Trước khi Phòng KD có thể tạo YCBG đầy đủ, cần: (1) Sản phẩm đã được tạo, (2) Khách hàng đã được tạo. Trước khi tính giá thành: (3) Định mức + Quy trình đã thiết lập, (4) Chi phí chung/xuất khẩu đã tạo.

---

## 8. Khi không có quyền — Escalation


| Tình huống                                            | Liên hệ ai                          | Hành động                                   |
| ----------------------------------------------------- | ----------------------------------- | ------------------------------------------- |
| Cần xóa YCBG / BG đã tạo                              | Tổ trưởng hoặc Trưởng phòng         | Báo cáo trực tiếp để được hỗ trợ            |
| Cần xóa khách hàng                                    | Trưởng phòng hoặc Quản trị viên     | Yêu cầu bằng văn bản nội bộ                 |
| Không thấy khách hàng trong dropdown                  | Quản trị viên hoặc người quản lý KD | Nhờ thêm mới khách hàng vào hệ thống        |
| Muốn xem đơn hàng của nhân viên khác                  | Quản trị viên                       | Chỉ Quản trị viên mới có quyền xem tất cả   |
| Cần thay đổi trạng thái đơn hàng sang giai đoạn trước | Quản trị viên                       | Trạng thái SX/TT không thể rollback tự động |


---

## 9. Câu hỏi thường gặp (FAQ)

**Q1: YCBG và Báo giá (BG) khác nhau như thế nào?**

> **YCBG (Yêu cầu báo giá):** Là yêu cầu từ phía khách hàng, nhân viên KD nhập thông tin nhu cầu của khách (sản phẩm, số lượng, điều kiện giao hàng).
> **BG (Báo giá):** Là đề xuất giá của công ty gửi cho khách, được lập dựa trên YCBG — bao gồm giá báo khách, thời gian giao hàng, hiệu lực báo giá.

**Q2: Tôi tạo YCBG xong nhưng quên thêm sản phẩm — có sửa được không?**

> Có. Nếu YCBG chưa được chuyển thành BG hoặc chưa bị khóa, bạn (hoặc Tổ trưởng) có thể vào chỉnh sửa. Nhấn vào YCBG trong danh sách → chọn Sửa → thêm sản phẩm → Lưu.

**Q3: Báo giá ở trạng thái "Không đặt hàng" — có thể tái sử dụng không?**

> Không tái sử dụng trực tiếp. Nếu khách hàng quay lại sau, nên tạo **YCBG mới** và BG mới để đảm bảo giá và điều kiện được cập nhật.

**Q4: Khách hàng quốc tế và nội địa có dùng chung danh sách không?**

> Không. Khách hàng quốc tế được quản lý tại tab **Khách hàng quốc tế**, khách hàng nội địa tại tab **Khách hàng nội địa**. Hai danh sách hoàn toàn tách biệt.

**Q5: Tôi muốn theo dõi tiến độ sản xuất của đơn hàng — xem ở đâu?**

> Vào tab **Đơn hàng** (quốc tế hoặc nội địa) → tìm đơn hàng → xem trường **Trạng thái sản xuất**. Các trạng thái từ "Chờ lên kế hoạch" → "Đã giao cho khách hàng" thể hiện toàn bộ vòng đời sản xuất.

**Q6: Phản hồi khách hàng loại "Khẩn cấp" cần xử lý trong bao lâu?**

> Hệ thống không đặt SLA cố định, nhưng phản hồi mức **Khẩn cấp** nên được xử lý trong ngày. Sau khi ghi nhận, cập nhật trạng thái xử lý từ "Chưa xử lý" sang "Đang xử lý" và thông báo cho Trưởng phòng.

**Q7: Hình thức thanh toán và vận chuyển được chọn như thế nào?**

> Cả quốc tế và nội địa đều dùng **dropdown** (chọn từ danh sách có sẵn). Quốc tế: vận chuyển (Đường biển / Đường hàng không / Đường bộ / Đường sắt / Đa phương thức), thanh toán (T/T / L/C / D/P / D/A / CAD / Open Account). Nội địa: vận chuyển (Giao hàng tận nơi / Khách tự đến lấy / Vận chuyển đường bộ / Vận chuyển đường thủy), thanh toán (Tiền mặt / Chuyển khoản / Công nợ 15/30/45 ngày).

---

## department: ALL
department_name: "Tất cả bộ phận"
roles: [Quản trị viên, Trưởng phòng, Tổ trưởng, Nhân viên]
access: all
language: vi

# Flow đơn hàng — Quy trình từ đầu đến cuối

Tài liệu này mô tả toàn bộ hành trình của một đơn hàng trong hệ thống ERP An Binh Foods, từ khi khách hàng yêu cầu báo giá đến khi hoàn tất thanh toán và ghi nhận phản hồi. Mỗi bước do một phòng ban cụ thể thực hiện.

---

## Sơ đồ tổng quan

```
[Phòng KD] Tạo Yêu cầu báo giá (YCBG)
        │
        ▼
[Phòng giá thành] Tính giá → Tạo Báo giá (BG)
        │
        ▼
[Phòng KD] Chốt khách → Tạo Đơn hàng (ĐH)
        │
        ▼
[Phòng QLSX] Cập nhật tiến độ sản xuất & giao hàng
        │
        ▼
[Phòng KT Thuế] Xử lý báo cáo thuế
        │
        ▼
[Phòng KT Hành chính] Lập hóa đơn & theo dõi thanh toán
        │
        ▼
[Phòng KD] Ghi nhận phản hồi khách hàng
```

---

## Tóm tắt: Sau khi khách hàng đồng ý báo giá — các bước để hoàn tất đơn hàng

Khi khách hàng đã đồng ý với báo giá, quy trình tiếp theo gồm 5 bước chính:

**Bước 3 — Phòng KD tạo Đơn hàng:**

- Vào tab **Danh sách BG** → tìm báo giá → nhấn **Sửa** → đổi trạng thái thành **"Đã đặt hàng"** → **"Lưu thay đổi"**
- Nhấn biểu tượng **"Tạo đơn hàng"** (giỏ hàng) → xác nhận
- Vào tab **Danh sách đơn hàng** → nhấn **Sửa** → điền giá trị đơn hàng, thanh toán đợt 1/2, ngày thanh toán → **"Lưu thay đổi"**

**Bước 4 — Phòng QLSX cập nhật sản xuất & giao hàng:**

- Phòng QLSX vào **Bộ phận sản xuất** → tab **Danh sách đơn hàng** → cập nhật trạng thái sản xuất: Chờ lên kế hoạch → Chờ sản xuất → Đang sản xuất → Chờ giao hàng → Đã lên container → Đang vận chuyển → Đã giao cho khách hàng
- Điền ngày bắt đầu SX, ngày hoàn thành, ngày giao hàng thực tế

**Bước 5 — Phòng KT Thuế xử lý thuế:**

- Bản ghi thuế tự động sinh khi đơn hàng được tạo
- Phòng KT Thuế vào **Bộ phận kế toán** → **Phòng KT Thuế** → tab **Báo cáo thuế** → cập nhật số tiền thuế và trạng thái

**Bước 6 — Phòng KT Hành chính lập hóa đơn:**

- Vào **Phòng KT Hành chính** → tab **Hóa đơn** → nhấn **"Thêm mới"** → điền số hóa đơn, ngày lập, tổng tiền, VAT, phương thức thanh toán
- Theo dõi công nợ tại tab **Công nợ**

**Bước 7 — Phòng KD ghi nhận phản hồi:**

- Sau khi giao hàng, vào tab **Danh sách phản hồi từ KH** → nhấn **"Thêm phản hồi"** → điền loại phản hồi, mức độ, nội dung, biện pháp xử lý

**Lưu ý:** Đơn hàng chỉ thực sự hoàn tất khi cả thuế đã quyết toán VÀ phản hồi khách hàng đã được ghi nhận.

---

## Bước 1 — Phòng Kinh doanh tạo Yêu cầu Báo giá (YCBG)

**Ai thực hiện:** Nhân viên Phòng KD Nội Địa hoặc Phòng KD Quốc Tế

**Truy cập:**

- Nội địa: **Bộ phận kinh doanh** → **Phòng KD Nội Địa** (`/business/domestic`) → tab **Danh sách yêu cầu BG**
- Quốc tế: **Bộ phận kinh doanh** → **Phòng KD Quốc Tế** (`/business/international`) → tab **Danh sách yêu cầu BG**

**Thao tác:** Nhấn **"Thêm yêu cầu báo giá"**

**Điền thông tin:**


| Trường               | Bắt buộc | Ghi chú                                                        |
| -------------------- | -------- | -------------------------------------------------------------- |
| Khách hàng           | ✅        | Chọn từ danh sách khách hàng đã có                             |
| Sản phẩm             | ✅        | Chọn từ danh sách, nhấn **"Thêm sản phẩm"** để thêm nhiều dòng |
| Số lượng             | ✅        | Nhập số lượng cho từng sản phẩm                                |
| Đơn vị tính          | ✅        | Ví dụ: kg, tấn, thùng                                          |
| Yêu cầu sản phẩm     |          | Đặc tính kỹ thuật, tiêu chuẩn khách yêu cầu                    |
| Quy cách đóng gói    |          | Cách đóng gói mong muốn                                        |
| Giá đối thủ bán      |          | Giá tham khảo từ đối thủ cạnh tranh                            |
| Giá bán gần nhất     |          | Giá đã bán cho khách này lần trước                             |
| Hình thức vận chuyển |          | Nội địa: chọn dropdown / Quốc tế: nhập tay (FOB, CIF...)       |
| Hình thức thanh toán |          | Nội địa: chọn dropdown / Quốc tế: nhập tay (T/T, L/C...)       |
| Địa chỉ giao hàng    |          | Nội địa: nhập địa chỉ / Quốc tế: nhập Quốc gia + Cảng đến      |
| Ghi chú              |          | Thông tin bổ sung                                              |


**Nhấn:** **"Tạo mới"** để lưu

**Kết quả:** YCBG xuất hiện trong danh sách, trạng thái chờ phòng giá thành xử lý.

---

## Bước 2 — Phòng Giá thành tính giá và tạo Báo giá

**Ai thực hiện:** Nhân viên Phòng giá thành (Bộ phận tổng hợp)

**Truy cập:** **Bộ phận tổng hợp** → **Phòng giá thành** (`/general/pricing`) → tab **Danh sách YCBG**

**Thao tác:** Tìm YCBG cần xử lý → nhấn biểu tượng **"Tạo báo giá"** (biểu tượng file) trên dòng đó → mở **bảng tính báo giá**

**Trong bảng tính báo giá:**

- Chọn định mức NVL phù hợp
- Nhập các thông số chi phí (nguyên liệu, nhân công, chi phí xuất khẩu/chung)
- Hệ thống tự tính giá thành và đề xuất giá bán

**Sau khi lưu bảng tính**, hệ thống sinh ra **Báo giá** với các thông tin:


| Trường                     | Bắt buộc | Ghi chú                         |
| -------------------------- | -------- | ------------------------------- |
| Giá báo khách (VNĐ/KG)     | ✅        | Giá đề xuất cho khách hàng      |
| Thời gian giao hàng (ngày) | ✅        | Số ngày kể từ khi đặt hàng      |
| Hiệu lực báo giá (ngày)    | ✅        | Thời hạn báo giá còn hiệu lực   |
| Trạng thái                 | ✅        | Mặc định: **Đang chờ phản hồi** |
| Ghi chú                    |          | Điều kiện đặc biệt, lưu ý       |


**Nhấn:** **"Lưu thay đổi"**

**Kết quả:** Báo giá được tạo, phòng kinh doanh có thể xem và gửi cho khách.

---

## Bước 3 — Phòng Kinh doanh chốt khách và tạo Đơn hàng

**Ai thực hiện:** Nhân viên Phòng KD (người phụ trách khách hàng)

**Truy cập:** **Phòng KD Nội Địa/Quốc Tế** → tab **Danh sách BG**

**Thao tác khi khách đồng ý:**

1. Tìm báo giá → nhấn nút **Sửa** (bút) → cập nhật trạng thái thành **"Đã đặt hàng"** → **"Lưu thay đổi"**
2. Nhấn biểu tượng **"Tạo đơn hàng"** (giỏ hàng) trên dòng báo giá → xác nhận

**Hệ thống tự tạo Đơn hàng.** Sau đó vào tab **Danh sách đơn hàng** → nhấn **Sửa** để điền thêm:


| Trường                             | Ghi chú                            |
| ---------------------------------- | ---------------------------------- |
| Giá trị đơn hàng (USD)             | Tổng giá trị xuất khẩu             |
| Giá trị đơn hàng (VNĐ)             | Tổng giá trị nội địa               |
| Thanh toán đợt 1 — Xuất khẩu (USD) | Số tiền đợt 1 phần xuất khẩu       |
| Thanh toán đợt 1 — Nội địa (VNĐ)   | Số tiền đợt 1 phần nội địa         |
| Ngày thanh toán đợt 1              | Ngày dự kiến nhận tiền đợt 1       |
| Thanh toán đợt 2 — Xuất khẩu (USD) | Số tiền đợt 2 phần xuất khẩu       |
| Thanh toán đợt 2 — Nội địa (VNĐ)   | Số tiền đợt 2 phần nội địa         |
| Ngày thanh toán đợt 2              | Ngày dự kiến nhận tiền đợt 2       |
| Ghi chú                            | Điều kiện hợp đồng, lưu ý đặc biệt |


**Nhấn:** **"Lưu thay đổi"**

**Kết quả:** Đơn hàng được tạo với trạng thái sản xuất **"Chờ lên kế hoạch"**.

---

## Bước 4 — Phòng QLSX cập nhật tiến độ sản xuất và giao hàng

**Ai thực hiện:** Nhân viên Phòng QLSX (Bộ phận sản xuất)

**Truy cập:** **Bộ phận sản xuất** → **Phòng QLSX** (`/production`) → tab **Danh sách đơn hàng**

**Thao tác:** Tìm đơn hàng → nhấn **Sửa** → cập nhật theo tiến độ thực tế:


| Trường                              | Ghi chú                                      |
| ----------------------------------- | -------------------------------------------- |
| Ngày bắt đầu sản xuất (kế hoạch)    | Ngày dự kiến bắt đầu sản xuất                |
| Ngày hoàn thành sản xuất (kế hoạch) | Ngày dự kiến hoàn thành                      |
| Ngày hoàn thành thực tế             | Ngày thực tế hoàn thành sản xuất             |
| Ngày giao hàng                      | Ngày thực tế giao hàng cho khách             |
| Trạng thái sản xuất                 | Cập nhật theo từng giai đoạn (xem bảng dưới) |
| Trạng thái thanh toán               | Cập nhật khi nhận được tiền (xem bảng dưới)  |


**Trạng thái sản xuất — cập nhật theo thứ tự:**


| Trạng thái                 | Ý nghĩa                            |
| -------------------------- | ---------------------------------- |
| **Chờ lên kế hoạch**       | Đơn hàng mới tạo, chưa lên lịch SX |
| **Chờ sản xuất**           | Đã lên kế hoạch, chờ bắt đầu       |
| **Đang sản xuất**          | Đang trong quá trình sản xuất      |
| **Chờ giao hàng**          | Sản xuất xong, chờ xuất hàng       |
| **Đã lên container**       | Hàng đã đóng container             |
| **Đang vận chuyển**        | Hàng đang trên đường vận chuyển    |
| **Đã giao cho khách hàng** | Khách đã nhận hàng                 |


**Trạng thái thanh toán:**


| Trạng thái               | Ý nghĩa                           |
| ------------------------ | --------------------------------- |
| **Đã thanh toán đợt 1**  | Nhận được tiền đợt 1              |
| **Chờ thanh toán đợt 2** | Đang chờ khách thanh toán đợt 2   |
| **Đã thanh toán đủ**     | Nhận đủ tiền, hoàn tất thanh toán |


**Nhấn:** **"Lưu thay đổi"** sau mỗi lần cập nhật

---

## Bước 5 — Phòng KT Thuế xử lý báo cáo thuế

**Ai thực hiện:** Nhân viên Phòng KT Thuế (Bộ phận kế toán)

**Truy cập:** **Bộ phận kế toán** → **Phòng KT Thuế** (`/accounting/tax`) → tab **Báo cáo thuế**

> Khi đơn hàng được tạo, hệ thống **tự động sinh một bản ghi báo cáo thuế** tương ứng. Kế toán thuế không cần tạo thủ công, chỉ cần cập nhật trạng thái.

**Thao tác:** Tìm bản ghi thuế của đơn hàng → nhấn **Sửa** → điền:


| Trường              | Ghi chú                                 |
| ------------------- | --------------------------------------- |
| Số tiền đóng thuế   | Số tiền thuế phải nộp                   |
| Trạng thái          | Cập nhật theo quy trình (xem bảng dưới) |
| Ghi chú             | Ghi chú về hồ sơ, chứng từ              |
| File đính kèm (URL) | Link file hồ sơ thuế đã upload          |


**Trạng thái báo cáo thuế — cập nhật theo thứ tự:**


| Trạng thái              | Ý nghĩa                         |
| ----------------------- | ------------------------------- |
| **Chưa báo cáo**        | Mặc định khi đơn hàng mới tạo   |
| **Đang cập nhật hồ sơ** | Đang thu thập chứng từ, hóa đơn |
| **Đã đầy đủ hồ sơ**     | Đủ điều kiện nộp báo cáo        |
| **Đã báo cáo**          | Đã nộp lên cơ quan thuế         |
| **Đã quyết toán**       | Hoàn tất quyết toán thuế        |


**Nhấn:** **"Lưu thay đổi"**

---

## Bước 6 — Phòng KT Hành chính lập hóa đơn và theo dõi thanh toán

**Ai thực hiện:** Nhân viên Phòng KT Hành chính (Bộ phận kế toán)

**Truy cập:** **Bộ phận kế toán** → **Phòng KT Hành chính** (`/accounting/admin`)

### 6a. Tạo hóa đơn

Vào tab **Hóa đơn** → nhấn **"Thêm mới"**


| Trường                 | Bắt buộc | Ghi chú                                      |
| ---------------------- | -------- | -------------------------------------------- |
| Số hóa đơn             | ✅        | Mã hóa đơn theo quy định                     |
| Ngày lập               | ✅        | Ngày xuất hóa đơn                            |
| Khách hàng             | ✅        | Chọn từ danh sách                            |
| Mã số thuế             |          | Mã số thuế của khách hàng                    |
| Loại hóa đơn           | ✅        | Bán hàng / Mua hàng / Dịch vụ                |
| Tổng tiền              | ✅        | Tổng giá trị trước thuế                      |
| Thuế VAT (%)           |          | Phần trăm thuế VAT                           |
| Phương thức thanh toán | ✅        | Tiền mặt / Chuyển khoản / Thẻ                |
| Trạng thái thanh toán  | ✅        | Đã thanh toán / Chưa thanh toán / Đang xử lý |
| Ngày thanh toán        |          | Ngày thực tế nhận tiền                       |
| Ghi chú                |          | Ghi chú thêm                                 |


**Nhấn:** **"Lưu"**

### 6b. Theo dõi công nợ

Vào tab **Công nợ** để theo dõi các khoản chưa thanh toán, cập nhật khi nhận tiền.

### 6c. Cập nhật trạng thái thanh toán đơn hàng

Vào tab **Danh sách đơn hàng** → tìm đơn hàng → nhấn **Sửa** → cập nhật **Trạng thái thanh toán** khi nhận được tiền.

---

## Bước 7 — Phòng Kinh doanh ghi nhận phản hồi khách hàng

**Ai thực hiện:** Nhân viên Phòng KD phụ trách khách hàng

**Truy cập:** **Phòng KD Nội Địa/Quốc Tế** → tab **Danh sách phản hồi từ KH**

**Thao tác:** Nhấn **"Thêm phản hồi"**


| Trường              | Bắt buộc | Ghi chú                                               |
| ------------------- | -------- | ----------------------------------------------------- |
| Khách hàng          | ✅        | Chọn từ danh sách                                     |
| Loại phản hồi       | ✅        | Khiếu nại / Góp ý / Khen ngợi / Yêu cầu hỗ trợ / Khác |
| Mức độ nghiêm trọng | ✅        | Thấp / Trung bình / Cao / Khẩn cấp                    |
| Nội dung phản hồi   | ✅        | Mô tả chi tiết phản hồi của khách                     |
| Sản phẩm liên quan  |          | Sản phẩm khách phản hồi về                            |
| Đơn hàng liên quan  |          | Mã đơn hàng liên quan                                 |
| Trạng thái xử lý    | ✅        | Chưa xử lý / Đang xử lý / Đã xử lý / Đã đóng          |
| Biện pháp xử lý     |          | Mô tả cách xử lý vấn đề                               |
| Kết quả xử lý       |          | Kết quả sau khi xử lý                                 |
| Mức độ hài lòng     |          | Đánh giá mức độ hài lòng của khách sau xử lý          |


**Nhấn:** **"Thêm mới"**

---

## Câu hỏi thường gặp về flow đơn hàng

**Q: Ai tạo đơn hàng — phòng kinh doanh hay phòng giá thành?**

> Phòng kinh doanh tạo đơn hàng từ báo giá đã được phòng giá thành lập. Phòng giá thành chỉ tạo báo giá, không tạo đơn hàng.

**Q: Phòng giá thành có thể tạo YCBG không?**

> Không. Phòng giá thành chỉ xem YCBG và tạo báo giá từ đó. Chỉ phòng kinh doanh mới tạo YCBG.

**Q: Đơn hàng đã tạo rồi, ai được cập nhật trạng thái sản xuất?**

> Phòng QLSX (Bộ phận sản xuất) cập nhật trạng thái sản xuất và ngày giao hàng. Phòng kinh doanh và kế toán cập nhật trạng thái thanh toán.

**Q: Bản ghi báo cáo thuế được tạo khi nào?**

> Tự động khi đơn hàng được tạo. Phòng KT Thuế không cần tạo thủ công, chỉ cần cập nhật trạng thái và điền số tiền thuế.

**Q: Hóa đơn có tự động tạo không?**

> Không. Phòng KT Hành chính phải tạo hóa đơn thủ công tại tab **Hóa đơn** sau khi đơn hàng hoàn thành.

**Q: Tôi muốn biết đơn hàng đang ở bước nào trong flow?**

> Xem trường **Trạng thái sản xuất** và **Trạng thái thanh toán** trong tab **Danh sách đơn hàng** của phòng kinh doanh hoặc phòng QLSX.

**Q: Khách hàng chưa thanh toán đợt 2, tôi cần làm gì?**

> Vào **Phòng KT Hành chính** → tab **Công nợ** để theo dõi và đôn đốc. Đồng thời cập nhật trạng thái thanh toán đơn hàng thành **"Chờ thanh toán đợt 2"**.

**Q: Sau khi giao hàng xong, flow kết thúc chưa?**

> Chưa. Còn 2 bước: (1) Phòng KT Thuế hoàn tất quyết toán thuế, (2) Phòng KD ghi nhận phản hồi khách hàng. Chỉ khi cả 2 bước hoàn thành thì đơn hàng mới thực sự kết thúc.

---

## department: DEPT_BUSINESS
department_name: "Bộ phận kinh doanh"
roles: [Quản trị viên, Trưởng phòng, Tổ trưởng, Nhân viên]
access: department_restricted
language: vi

# Báo cáo kinh doanh — Dashboard tổng quan

> URL: `/business`
> Quyền truy cập: Tất cả nhân viên bộ phận kinh doanh

## Cách truy cập

Từ thanh điều hướng bên trái (sidebar): Nhấn **Bộ phận kinh doanh** → trang dashboard tổng quan hiển thị ngay khi vào (trước khi chọn phòng cụ thể).

## 1. Tổng quan

Trang **Báo cáo kinh doanh** là dashboard phân tích tổng hợp, hiển thị số liệu thống kê về đơn hàng, khách hàng và phản hồi khách hàng. Trang này chỉ hiển thị dữ liệu (read-only), không có chức năng nhập liệu hay chỉnh sửa.

Dữ liệu được tải tự động khi mở trang, không có bộ lọc ngày tháng hay tìm kiếm.

---

## 2. Thẻ thống kê (Stat Cards)

Dashboard hiển thị 4 thẻ thống kê ở đầu trang:


| #   | Thẻ                 | Icon            | Giá trị chính    | Giá trị phụ trái | Giá trị phụ phải | Nhấn vào đi đến           |
| --- | ------------------- | --------------- | ---------------- | ---------------- | ---------------- | ------------------------- |
| 1   | Đơn hàng            | 🛒 (xanh dương) | Tổng số đơn hàng | Số đơn quốc tế   | Số đơn nội địa   | `/business/management`    |
| 2   | Khách hàng quốc tế  | ✈️ (xanh lá)    | Tổng KH quốc tế  | Đang giao dịch   | Ngừng giao dịch  | `/business/international` |
| 3   | Khách hàng nội địa  | 🏢 (tím)        | Tổng KH nội địa  | Đang giao dịch   | Ngừng giao dịch  | `/business/domestic`      |
| 4   | Phản hồi khách hàng | 💬 (cam)        | Tổng phản hồi    | Phản hồi quốc tế | Phản hồi nội địa | `/business/domestic`      |


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