---
department: DEPT_BUSINESS
department_name: "Bộ phận kinh doanh"
roles: [ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE]
access: department_restricted
language: vi
---

# Bộ phận Kinh doanh

## Cách truy cập

Từ thanh điều hướng bên trái (sidebar):
- **Phòng KD Quốc Tế**: Nhấn **Bộ phận kinh doanh** → chọn **Phòng KD Quốc Tế** (dành cho khách hàng nước ngoài, đơn hàng xuất khẩu)
- **Phòng KD Nội Địa**: Nhấn **Bộ phận kinh doanh** → chọn **Phòng KD Nội Địa** (dành cho khách hàng trong nước)

Nếu không biết chọn phòng nào: khách hàng nước ngoài → Quốc Tế, khách hàng trong nước → Nội Địa.

## 1. Tổng quan & Sơ đồ quy trình

Bộ phận Kinh doanh trong ERP được chia làm **hai phòng riêng biệt**:

| Phòng | Trang | Đặc điểm |
|---|---|---|
| **Phòng KD Quốc Tế** | trang **Phòng KD Quốc Tế** | Khách hàng nước ngoài, đơn hàng xuất khẩu, giao dịch bằng USD, có trường Quốc gia / Cảng đến |
| **Phòng KD Nội Địa** | trang **Phòng KD Nội Địa** | Khách hàng trong nước, giao dịch VNĐ, có Tỉnh/Thành phố / Mã số thuế |

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

| Chức năng | EMPLOYEE | TEAM_LEAD | DEPARTMENT_HEAD | ADMIN |
|---|:---:|:---:|:---:|:---:|
| Xem danh sách YCBG | ✅ | ✅ | ✅ | ✅ |
| Tạo YCBG mới | ✅ | ✅ | ✅ | ✅ |
| Chỉnh sửa YCBG | ✅ (của mình) | ✅ | ✅ | ✅ |
| Xóa YCBG | ❌ | ✅ | ✅ | ✅ |
| Xem danh sách Báo giá | ✅ | ✅ | ✅ | ✅ |
| Tạo / cập nhật Báo giá | ✅ | ✅ | ✅ | ✅ |
| Xem Đơn hàng | ✅ | ✅ | ✅ | ✅ |
| Cập nhật trạng thái Đơn hàng | ✅ | ✅ | ✅ | ✅ |
| Quản lý Khách hàng QT / NĐ | ✅ | ✅ | ✅ | ✅ |
| Xóa Khách hàng | ❌ | ❌ | ✅ | ✅ |
| Ghi nhận Phản hồi KH | ✅ | ✅ | ✅ | ✅ |
| Xuất Excel | ✅ | ✅ | ✅ | ✅ |

---

## 3. Phòng KD Quốc Tế (trang **Phòng KD Quốc Tế**)

**Tiêu đề trang:** "Phòng KD Quốc Tế" — phụ đề: "Quản lý khách hàng quốc tế, đơn hàng xuất khẩu và hợp đồng thương mại"

### Dashboard tóm tắt (4 thẻ thống kê đầu trang)

| Thẻ | Chỉ số hiển thị |
|---|---|
| Yêu cầu báo giá | Tổng yêu cầu · Đã báo giá · Chưa báo giá |
| Báo giá | Tổng báo giá · Đã đặt hàng · Chờ phản hồi · Chờ gửi ĐH · Không đặt hàng |
| Đơn hàng | Tổng đơn hàng · Tháng này · Tháng trước |
| Phản hồi KH | Số phản hồi · Khẩn cấp · Cao |

### 5 tab chính

| Tab | ID | Nội dung |
|---|---|---|
| Danh sách yêu cầu BG | `quotationRequests` | Quản lý YCBG từ khách hàng quốc tế |
| Danh sách BG | `quotations` | Quản lý báo giá đã lập |
| Đơn hàng quốc tế | `orders` | Theo dõi đơn hàng xuất khẩu |
| Danh sách khách hàng quốc tế | `customers` | Hồ sơ khách hàng nước ngoài |
| Danh sách phản hồi từ KH | `feedback` | Ghi nhận và xử lý phản hồi |

### 3.1 Tab: Yêu cầu Báo giá — YCBG (tab **Danh sách yêu cầu BG**, `customerType="Quốc tế"`)

#### Nút header

| Nút | Điều kiện | Hành động |
|---|---|---|
| **Xuất Excel** | Luôn hiển thị | Xuất danh sách ra file Excel |
| **Thêm yêu cầu báo giá** | Chỉ ở Phòng KD (không có ở Phòng giá thành) | Mở form tạo YCBG mới |

#### Bộ lọc

| Bộ lọc | Loại | Placeholder |
|---|---|---|
| Tìm kiếm tổng | Văn bản | "Tìm kiếm mã YC, nhân viên, khách hàng..." |
| Mã YC | Văn bản | — |
| Nhân viên | Văn bản | — |
| Khách hàng | Văn bản | — |

#### Cột bảng danh sách

| Cột | Nội dung |
|---|---|
| STT | Số thứ tự |
| Ngày yêu cầu | Ngày tạo YCBG |
| Mã YC | Mã yêu cầu báo giá |
| Nhân viên | Tên nhân viên (đậm) + mã nhân viên (nhỏ xám) |
| Khách hàng | Tên công ty (đậm) + mã khách hàng (nhỏ xám) |
| Sản phẩm | Số lượng SP + tên SP đầu tiên (ví dụ: "+2" nếu có nhiều hơn) |
| Số lượng | Tổng số lượng + đơn vị |
| Hành động | Xem / Sửa / Xóa / Tạo báo giá |

#### Nút hành động trên mỗi dòng

| Nút | Tooltip | Điều kiện |
|---|---|---|
| Mắt (xanh) | "Xem chi tiết" | Luôn hiển thị |
| Bút (xanh) | "Chỉnh sửa" | Chỉ ở Phòng KD |
| Thùng rác (đỏ) | "Xóa" | Chỉ TEAM_LEAD trở lên |
| File (xanh) | "Tạo báo giá" | Chỉ ở Phòng giá thành |

#### Form tạo YCBG mới — "Thêm yêu cầu báo giá mới"

**Trường header:**

| Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|:---:|---|---|
| Mã yêu cầu báo giá | ✅ | Văn bản (vô hiệu hóa) | Tự động sinh |
| Khách hàng | ✅ | Chọn từ danh sách | Hiển thị: "[maKhachHang] - [tenCongTy]". Lỗi: "Vui lòng chọn khách hàng" |

**Danh sách sản phẩm** (lặp lại, tối thiểu 1 dòng):

| Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|:---:|---|---|
| Sản phẩm | ✅ | Chọn từ danh sách | Hiển thị: "[maSanPham] - [tenSanPham]". Lỗi: "Sản phẩm {n}: Vui lòng chọn sản phẩm" |
| Yêu cầu sản phẩm | | Văn bản | Placeholder: "VD: kg, tấn, thùng..." |
| Quy cách đóng gói | | Văn bản | |
| Số lượng | ✅ | Số | Lỗi: "Sản phẩm {n}: Vui lòng nhập số lượng hợp lệ" |
| Đơn vị tính | ✅ | Văn bản | Placeholder: "VD: kg, tấn, thùng...". Lỗi: "Sản phẩm {n}: Vui lòng nhập đơn vị tính" |
| Giá đối thủ bán (VND) | | Số | |
| Giá bán gần nhất (VND) | | Số | |

Nút trong phần sản phẩm: **"Thêm sản phẩm"** (xanh lá, biểu tượng +). Biểu tượng thùng rác để xóa dòng (chỉ hiện khi có >1 dòng).

**Trường vận chuyển & thanh toán — KHÁC NHAU theo loại khách hàng:**

| Trường | Quốc tế | Nội địa |
|---|---|---|
| Hình thức vận chuyển | Nhập tay (placeholder: "VD: FOB, CIF, CFR...") | Dropdown: Giao hàng tận nơi / Khách tự đến lấy / Vận chuyển đường bộ / Vận chuyển đường thủy |
| Hình thức thanh toán | Nhập tay (placeholder: "VD: T/T, L/C...") | Dropdown: Tiền mặt / Chuyển khoản / Công nợ 15 ngày / Công nợ 30 ngày / Công nợ 45 ngày |
| Địa điểm giao | Quốc gia (văn bản) + Cảng đến (văn bản) | Địa chỉ giao hàng (văn bản, placeholder: "Nhập địa chỉ giao hàng...") |

**Trường chung:**

| Trường | Bắt buộc | Loại nhập |
|---|:---:|---|
| Ghi chú | | Văn bản dài (3 dòng) |

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

| Nút | Hành động |
|---|---|
| **Xuất Excel** | Xuất danh sách ra file Excel |

> Không có nút "Thêm" — báo giá được tạo từ YCBG qua nút "Tạo báo giá" ở tab YCBG.

#### Bộ lọc

| Bộ lọc | Loại | Placeholder |
|---|---|---|
| Tìm kiếm tổng | Văn bản | "Tìm kiếm mã BG, khách hàng, nhân viên..." |
| Mã BG | Văn bản | — |
| Khách hàng | Văn bản | — |
| Nhân viên | Văn bản | — |

#### Cột bảng danh sách (10 cột)

| Cột | Nội dung |
|---|---|
| STT | Số thứ tự |
| Ngày BG | Ngày lập báo giá |
| Mã báo giá | Mã định danh |
| Giá báo khách | Giá (VNĐ/KG), có thể kèm USD nếu có tỷ giá |
| TG giao hàng | Thời gian giao hàng (hiển thị: "{n} ngày") |
| Hiệu lực | Hiệu lực báo giá (hiển thị: "{n} ngày") |
| Nhân viên | Người lập báo giá |
| Trạng thái | Badge màu |
| Ghi chú | Ghi chú ngắn |
| Hành động | Xem / Sửa / Tạo đơn hàng / Xóa |

#### Nút hành động trên mỗi dòng

| Nút | Tooltip | Hành động |
|---|---|---|
| Mắt (xanh) | "Xem chi tiết" | Mở modal xem chi tiết |
| Bút (xanh) | "Chỉnh sửa" | Mở form chỉnh sửa |
| Giỏ hàng (tím) | "Tạo đơn hàng" | Xác nhận: "Bạn có chắc chắn muốn tạo đơn hàng từ báo giá này?" |
| Thùng rác (đỏ) | "Xóa" | Xác nhận: "Bạn có chắc chắn muốn xóa báo giá này?" |

#### Trạng thái Báo giá (`tinhTrang`) — đầy đủ 9 giá trị

| Giá trị | Nhãn hiển thị | Màu badge |
|---|---|---|
| `DRAFT` | Nháp | Xám |
| `DANG_CHO_PHAN_HOI` | Đang chờ phản hồi | Vàng |
| `DANG_CHO_GUI_DON_HANG` | Đang chờ gửi đơn hàng | Xanh dương |
| `DA_DAT_HANG` | Đã đặt hàng | Xanh lá |
| `KHONG_DAT_HANG` | Không đặt hàng | Đỏ |
| `SENT` | Đã gửi | Xanh dương |
| `APPROVED` | Đã duyệt | Xanh lá |
| `REJECTED` | Từ chối | Đỏ |
| `EXPIRED` | Hết hạn | Xám |

#### Form chỉnh sửa báo giá — "Chỉnh Sửa Báo Giá"

**Phần chỉ đọc** (lấy từ YCBG, không sửa được): Mã báo giá · Ngày báo giá · Khách hàng · Sản phẩm

**Phần có thể sửa:**

| Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|:---:|---|---|
| Giá báo khách (VNĐ/KG) | ✅ | Số (bước 0.01, min 0) | Placeholder: "Nhập giá báo khách" |
| Thời gian giao hàng (ngày) | ✅ | Số (min 1) | Placeholder: "Nhập thời gian giao hàng" |
| Hiệu lực báo giá (ngày) | ✅ | Số (min 1) | Placeholder: "Nhập hiệu lực báo giá" |
| Trạng thái | ✅ | Dropdown | Đang chờ phản hồi / Đang chờ gửi đơn hàng / Đã đặt hàng / Không đặt hàng |
| Ghi chú | | Văn bản dài (4 dòng) | Placeholder: "Nhập ghi chú (nếu có)" |

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

| Nút | Hành động |
|---|---|
| **Xuất Excel** | Xuất danh sách ra file Excel |

#### Bộ lọc

| Bộ lọc | Loại | Placeholder |
|---|---|---|
| Tìm kiếm tổng | Văn bản | "Tìm kiếm mã ĐH, mã BG, khách hàng..." |
| Mã ĐH | Văn bản | — |
| Mã BG | Văn bản | — |
| Khách hàng | Văn bản | — |
| Trạng thái SX | Văn bản | — |

#### Cột bảng danh sách

| Cột | Nội dung |
|---|---|
| STT | Số thứ tự |
| Ngày đặt hàng | Ngày tạo đơn |
| Mã đơn hàng | Mã định danh (chữ xanh đậm) |
| Mã báo giá | Mã BG liên kết |
| Khách hàng | Tên khách hàng |
| Số lượng SP | Số sản phẩm trong đơn |
| Trạng thái SX | Badge trạng thái sản xuất |
| Trạng thái TT | Badge trạng thái thanh toán |
| Hành động | Xem / Xem bảng tính / Sửa / Xóa |

#### Nút hành động trên mỗi dòng

| Nút | Tooltip | Hành động |
|---|---|---|
| Mắt (xanh) | "Xem chi tiết" | Mở modal xem chi tiết |
| Máy tính (xanh) | "Xem bảng tính" | Mở bảng tính báo giá |
| Bút (xanh) | "Chỉnh sửa" | Mở form chỉnh sửa |
| Thùng rác (đỏ) | "Xóa" | Xác nhận: "Bạn có chắc chắn muốn xóa đơn hàng này?" |

#### Trạng thái sản xuất (`trangThaiSanXuat`)

| Giá trị | Nhãn hiển thị |
|---|---|
| `CHO_LEN_KE_HOACH` | Chờ lên kế hoạch |
| `CHO_SAN_XUAT` | Chờ sản xuất |
| `DANG_SAN_XUAT` | Đang sản xuất |
| `CHO_GIAO_HANG` | Chờ giao hàng |
| `DA_LEN_CONTAINER` | Đã lên container |
| `DANG_VAN_CHUYEN` | Đang vận chuyển |
| `DA_GIAO_CHO_KHACH_HANG` | Đã giao cho khách hàng |

#### Trạng thái thanh toán (`trangThaiThanhToan`)

| Giá trị | Nhãn hiển thị |
|---|---|
| `DA_THANH_TOAN_DOT_1` | Đã thanh toán đợt 1 |
| `CHO_THANH_TOAN_DOT_2` | Chờ thanh toán đợt 2 |
| `DA_THANH_TOAN_DU` | Đã thanh toán đủ |

#### Form chỉnh sửa đơn hàng

| Nhóm | Trường | Loại nhập |
|---|---|---|
| Giá trị | Giá trị đơn hàng (USD) | Số (bước 0.01), placeholder "0.00" |
| Giá trị | Giá trị đơn hàng (VNĐ) | Số, placeholder "0" |
| Thanh toán đợt 1 | Xuất khẩu (USD) | Số (bước 0.01) |
| Thanh toán đợt 1 | Nội địa (VNĐ) | Số |
| Thanh toán đợt 1 | Ngày thanh toán | Chọn ngày |
| Thanh toán đợt 2 | Xuất khẩu (USD) | Số (bước 0.01) |
| Thanh toán đợt 2 | Nội địa (VNĐ) | Số |
| Thanh toán đợt 2 | Ngày thanh toán | Chọn ngày |
| Sản xuất | Ngày bắt đầu SX (KH) | Chọn ngày |
| Sản xuất | Ngày hoàn thành SX (KH) | Chọn ngày |
| Sản xuất | Ngày hoàn thành thực tế | Chọn ngày |
| Sản xuất | Ngày giao hàng | Chọn ngày |
| Trạng thái | Trạng thái sản xuất | Dropdown (7 giá trị trên) |
| Trạng thái | Trạng thái thanh toán | Dropdown (3 giá trị trên) |
| | Ghi chú | Văn bản dài (4 dòng), placeholder: "Nhập ghi chú..." |

**Nút:** "Lưu thay đổi" / "Hủy"

#### Modal xem chi tiết — "Chi tiết đơn hàng - [maDonHang]"

Các phần hiển thị: Thông tin cơ bản (Mã ĐH, Ngày đặt, Mã BG, Mã YCBG) · Thông tin KH (Mã KH, Tên KH, Nhân viên phụ trách) · Giá trị ĐH (USD + VNĐ) · Thanh toán đợt 1 & 2 · Thông tin SX (ngày bắt đầu/hoàn thành KH/thực tế/giao hàng) · Trạng thái SX + TT · Danh sách hàng hóa (Mã SP, Tên, Loại, Yêu cầu, Đóng gói, Số lượng, Đơn vị) · Ghi chú

**Nút:** "Đóng" + "Chỉnh sửa"

---

### 3.4 Tab: Khách hàng quốc tế (tab **Khách hàng quốc tế**)

#### Nút header

| Nút | Hành động |
|---|---|
| **Xuất Excel** | Xuất danh sách ra file Excel |
| **Thêm khách hàng** | Mở form tạo khách hàng mới |

#### Bộ lọc

| Bộ lọc | Loại | Placeholder |
|---|---|---|
| Tìm kiếm tổng | Văn bản | "Tìm kiếm mã KH, tên công ty, quốc gia..." |
| Mã KH | Văn bản | — |
| Tên công ty | Văn bản | — |
| Quốc gia | Văn bản | — |

#### Cột bảng danh sách

| Cột | Nội dung |
|---|---|
| Mã KH | Mã khách hàng |
| Tên công ty | Tên công ty |
| Người liên hệ | Tên người liên hệ |
| Quốc gia | Tên quốc gia (có biểu tượng ghim bản đồ) |
| Loại KH | Loại khách hàng |
| Doanh thu năm | Doanh thu (USD, chữ xanh lá, hiển thị: "${n}") |
| Trạng thái | Badge màu |
| Hoạt động | Nút Xem / Sửa / Xóa |

#### Nút hành động trên mỗi dòng

| Nút | Tooltip | Hành động |
|---|---|---|
| Mắt (xanh) | "Xem chi tiết" | Mở modal xem |
| Bút (xanh) | "Chỉnh sửa" | Mở form sửa |
| Thùng rác (đỏ) | "Xóa" | Chỉ DEPARTMENT_HEAD/ADMIN |

#### Form thêm / chỉnh sửa khách hàng quốc tế

| Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|:---:|---|---|
| Tên công ty | ✅ | Văn bản | |
| Người liên hệ | ✅ | Văn bản | |
| Quốc gia | ✅ | Văn bản | |
| Thành phố | | Văn bản | |
| Địa chỉ | | Văn bản | |
| Số điện thoại | | Văn bản | |
| Email | | Email | |
| Website | | Văn bản | |
| Loại khách hàng | ✅ | Dropdown | Nhà phân phối / Nhà nhập khẩu / Nhà bán lẻ / Đại lý |
| Trạng thái | | Dropdown | Hoạt động / Tạm ngưng / Ngừng hợp tác (mặc định: Hoạt động) |
| Ngày hợp tác | | Chọn ngày | Placeholder: "Chọn ngày hợp tác" |
| Doanh thu năm (USD) | | Số | Mặc định: 0 |
| Số lượng đơn hàng | | Số | Mặc định: 0 |
| Sản phẩm chính | | Văn bản | |
| Ghi chú | | Văn bản dài (3 dòng) | |

**Nút:** "Thêm mới" / "Cập nhật" / "Hủy"

#### Trạng thái khách hàng

| Giá trị | Màu badge |
|---|---|
| Hoạt động | Xanh lá |
| Tạm ngưng | Vàng |
| Ngừng hợp tác | Đỏ |

---

### 3.5 Tab: Phản hồi từ khách hàng (tab **Phản hồi từ KH**)

#### Nút header

| Nút | Hành động |
|---|---|
| **Xuất Excel** | Xuất danh sách ra file Excel |
| **Thêm phản hồi** | Mở form tạo phản hồi mới |

#### Bộ lọc

| Bộ lọc | Loại | Tùy chọn |
|---|---|---|
| Tìm kiếm tổng | Văn bản | Placeholder: "Tìm kiếm nội dung, sản phẩm, khách hàng..." |
| Trạng thái | Dropdown | Chưa xử lý / Đang xử lý / Đã xử lý / Đã đóng |
| Loại phản hồi | Dropdown | Khiếu nại / Góp ý / Khen ngợi / Yêu cầu hỗ trợ / Khác |
| Mức độ | Dropdown | Thấp / Trung bình / Cao / Khẩn cấp |

#### Cột bảng danh sách

| Cột | Nội dung |
|---|---|
| Khách hàng | Tên công ty (đậm) + quốc gia (nhỏ xám) |
| Loại | Loại phản hồi |
| Nội dung | Tóm tắt nội dung (rút gọn) |
| Mức độ | Badge màu theo mức độ nghiêm trọng |
| Trạng thái | Badge màu theo trạng thái xử lý |
| Ngày | Ngày ghi nhận |
| Hành động | Nút Xem / Sửa / Xóa |

#### Nút hành động trên mỗi dòng

| Nút | Tooltip | Hành động |
|---|---|---|
| Mắt (xanh) | "Xem chi tiết" | Mở modal xem |
| Bút (xanh) | "Chỉnh sửa" | Mở form sửa |
| Thùng rác (đỏ) | "Xóa" | Xác nhận rồi xóa |

#### Form tạo / cập nhật phản hồi

| Trường | Bắt buộc | Loại nhập | Tùy chọn / Ghi chú |
|---|:---:|---|---|
| Khách hàng | ✅ | Dropdown | Hiển thị: "tenCongTy (maKhachHang) - quocGia" |
| Loại phản hồi | ✅ | Dropdown | Khiếu nại / Góp ý / Khen ngợi / Yêu cầu hỗ trợ / Khác (mặc định: Góp ý) |
| Mức độ nghiêm trọng | ✅ | Dropdown | Thấp / Trung bình / Cao / Khẩn cấp (mặc định: Trung bình) |
| Nội dung phản hồi | ✅ | Văn bản dài (4 dòng) | |
| Sản phẩm liên quan | | Văn bản | |
| Đơn hàng liên quan | | Văn bản | |
| Người tiếp nhận | | Văn bản | |
| Trạng thái xử lý | ✅ | Dropdown | Chưa xử lý / Đang xử lý / Đã xử lý / Đã đóng (mặc định: Chưa xử lý) |
| Biện pháp xử lý | | Văn bản dài (3 dòng) | |
| Kết quả xử lý | | Văn bản dài (3 dòng) | |
| Mức độ hài lòng | | Dropdown | (trống) / Rất không hài lòng / Không hài lòng / Trung bình / Hài lòng / Rất hài lòng |
| Ghi chú | | Văn bản dài (2 dòng) | |

**Nút:** "Thêm mới" (tạo) / "Cập nhật" (sửa) / "Hủy"

#### Màu badge trạng thái xử lý

| Giá trị | Màu | Biểu tượng |
|---|---|---|
| Chưa xử lý | Xanh dương | Đồng hồ |
| Đang xử lý | Vàng | Cảnh báo |
| Đã xử lý | Xanh lá | Tích |
| Đã đóng | Xám | X |

#### Màu badge mức độ nghiêm trọng

| Giá trị | Màu |
|---|---|
| Thấp | Xám |
| Trung bình | Xanh dương |
| Cao | Cam |
| Khẩn cấp | Đỏ |

---

## 4. Phòng KD Nội Địa (trang **Phòng KD Nội Địa**)

**Tiêu đề trang:** "Phòng KD Nội Địa" — phụ đề: "Quản lý khách hàng nội địa, đơn hàng trong nước và hợp đồng thương mại"

Trang gồm **5 tab** tương tự Quốc Tế, nhưng dành cho thị trường trong nước:

| Tab | ID | Nội dung |
|---|---|---|
| Danh sách yêu cầu BG | `quotationRequests` | YCBG với `customerType="Nội địa"` |
| Danh sách BG | `quotations` | Báo giá nội địa |
| Đơn hàng nội địa | `orders` | Theo dõi đơn hàng trong nước |
| Danh sách khách hàng nội địa | `customers` | Hồ sơ khách hàng Việt Nam |
| Danh sách phản hồi từ KH | `feedback` | Phản hồi khách hàng nội địa |

> **Lưu ý:** Các tab YCBG, BG, Đơn hàng, Phản hồi KH dùng chung component với Quốc Tế nhưng lọc `customerType="Nội địa"`. Trường **Quốc gia** và **Cảng đến** không xuất hiện trong YCBG nội địa — thay bằng **Địa chỉ giao hàng**. Hình thức vận chuyển và thanh toán dùng dropdown thay vì nhập tay.

### 4.1 Khách hàng Nội Địa (tab **Khách hàng nội địa**)

#### Nút header

| Nút | Hành động |
|---|---|
| **Xuất Excel** | Xuất danh sách ra file Excel |
| **Thêm khách hàng** | Mở form tạo khách hàng mới |

#### Bộ lọc

| Bộ lọc | Loại | Placeholder |
|---|---|---|
| Tìm kiếm tổng | Văn bản | "Tìm kiếm mã KH, tên công ty, tỉnh/thành..." |
| Mã KH | Văn bản | — |
| Tên công ty | Văn bản | — |
| Tỉnh/Thành | Văn bản | — |

#### Cột bảng danh sách

| Cột | Nội dung |
|---|---|
| Mã KH | Mã khách hàng |
| Tên công ty | Tên công ty |
| Người liên hệ | Tên người liên hệ |
| Tỉnh/Thành | Tỉnh/Thành phố |
| Quận/Huyện | Quận/Huyện |
| Loại KH | Loại khách hàng |
| Trạng thái | Badge màu |
| Hoạt động | Nút Xem / Sửa / Xóa |

#### Form thêm / chỉnh sửa khách hàng nội địa

| Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|:---:|---|---|
| Tên công ty | ✅ | Văn bản | |
| Người liên hệ | ✅ | Văn bản | |
| Tỉnh/Thành phố | ✅ | Văn bản | |
| Quận/Huyện | | Văn bản | |
| Địa chỉ | | Văn bản | |
| Số điện thoại | | Văn bản | |
| Email | | Email | |
| Website | | Văn bản | |
| Mã số thuế | | Văn bản | **Chỉ có ở khách hàng nội địa** |
| Loại khách hàng | ✅ | Dropdown | Nhà phân phối / Nhà nhập khẩu / Nhà bán lẻ / Đại lý |
| Trạng thái | | Dropdown | Hoạt động / Tạm ngưng / Ngừng hợp tác (mặc định: Hoạt động) |
| Ghi chú | | Văn bản dài (3 dòng) | |

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

## 6. Khi không có quyền — Escalation

| Tình huống | Liên hệ ai | Hành động |
|---|---|---|
| Cần xóa YCBG / BG đã tạo | `TEAM_LEAD` hoặc `DEPARTMENT_HEAD` | Báo cáo trực tiếp để được hỗ trợ |
| Cần xóa khách hàng | `DEPARTMENT_HEAD` hoặc `ADMIN` | Yêu cầu bằng văn bản nội bộ |
| Không thấy khách hàng trong dropdown | `ADMIN` hoặc người quản lý KD | Nhờ thêm mới khách hàng vào hệ thống |
| Muốn xem đơn hàng của nhân viên khác | `ADMIN` | Chỉ ADMIN mới có quyền xem tất cả |
| Cần thay đổi trạng thái đơn hàng sang giai đoạn trước | `ADMIN` | Trạng thái SX/TT không thể rollback tự động |

---

## 7. Câu hỏi thường gặp (FAQ)

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

**Q7: Hình thức thanh toán "Công nợ" có nghĩa là gì?**
> Công nợ 15/30/45 ngày có nghĩa là khách hàng được phép thanh toán **sau khi nhận hàng** trong vòng 15, 30 hoặc 45 ngày. Đây là điều kiện thường dùng trong giao dịch B2B. Nếu điều kiện không có sẵn trong dropdown, nhân viên có thể nhập tay (VD: T/T 60 days, L/C at sight).
