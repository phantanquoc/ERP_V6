# Bộ phận tổng hợp

## Cách truy cập

Từ thanh điều hướng bên trái (sidebar):
- **Phòng giá thành**: Nhấn **Bộ phận tổng hợp** → chọn **Phòng giá thành**
- **Phòng chăm sóc đối tác**: Nhấn **Bộ phận tổng hợp** → chọn **Phòng chăm sóc**

## 1. Tổng quan

Bộ phận tổng hợp gồm hai phòng chức năng chính:

| Phòng | Chức năng chính | Đường dẫn |
|---|---|---|
| **Phòng giá thành** | Quản lý yêu cầu báo giá, báo giá, đơn hàng và chi phí chung | `/general/pricing` |
| **Phòng chăm sóc đối tác** | Quản lý khách hàng, nhà cung cấp và dịch vụ logistics | `/general/partners` |

Ngoài ra, bộ phận tổng hợp có quyền truy cập module **Bảng lương** (tab **Bảng lương**) để theo dõi và tính toán lương nhân viên trong phòng.

---

## 2. Quyền truy cập

| Vai trò | Xem | Tạo mới | Chỉnh sửa | Xóa | Duyệt | Xuất Excel | Gửi thông báo lương |
|---|---|---|---|---|---|---|---|
| ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| DEPARTMENT_HEAD | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| TEAM_LEAD | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| EMPLOYEE | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

> Quyền truy cập được giới hạn theo phòng ban (`department_restricted`). Nhân viên chỉ thấy dữ liệu thuộc phòng mình.

---

## 3. Phòng giá thành

### 3.1. Tổng quan

Phòng giá thành quản lý toàn bộ quy trình từ tiếp nhận yêu cầu báo giá đến hoàn tất đơn hàng. Trang chủ hiển thị 3 card thống kê:

- **Tổng quan yêu cầu BG** — tổng số YCBG, phân loại Quốc tế / Nội địa
- **Tổng quan báo giá** — tổng số báo giá, phân loại Quốc tế / Nội địa
- **Tổng quan đơn hàng** — tổng số đơn hàng, phân loại Quốc tế / Nội địa

### 3.2. Chi tiết các tab — Phòng giá thành

#### Tab 1: Danh sách YCBG (`requests`)

**Truy cập:** `/general/pricing` → tab **"Danh sách YCBG"**

> **Lưu ý quan trọng:** Phòng giá thành chỉ có quyền **xem** và **tạo báo giá từ YCBG**, không tạo/sửa/xóa YCBG. Việc tạo YCBG là quyền của **Phòng kinh doanh**.

**Cột bảng danh sách:**

| Cột | Nội dung |
|---|---|
| STT | Số thứ tự |
| Ngày yêu cầu | Ngày tạo YCBG |
| Mã YC | Mã yêu cầu báo giá |
| Nhân viên | Tên + mã nhân viên tạo |
| Khách hàng | Tên + mã khách hàng |
| Sản phẩm | Số lượng sản phẩm + tên sản phẩm đầu tiên |
| Số lượng | Tổng số lượng + đơn vị |
| Hành động | Nút **"Xem"** (mắt) và **"Tạo báo giá"** (biểu tượng file) |

**Bộ lọc:** Mã YC (văn bản), Nhân viên (văn bản), Khách hàng (văn bản), ô tìm kiếm tổng (placeholder: "Tìm kiếm mã YC, nhân viên, khách hàng...")

**Tạo báo giá từ YCBG:** Nhấn biểu tượng **"Tạo báo giá"** trên dòng YCBG → mở **Bảng tính báo giá** (modal lớn) để lập báo giá chi tiết.

**Dữ liệu phụ thuộc (nếu thiếu, yêu cầu phòng ban tương ứng tạo trước):**

| Dữ liệu cần | Phòng ban tạo | Ghi chú |
|---|---|---|
| Khách hàng (mã, tên công ty) | Phòng kinh doanh | Phải có trong danh sách khách hàng quốc tế/nội địa |
| Sản phẩm (mã, tên) | Phòng kinh doanh | Phải có trong danh sách sản phẩm quốc tế |
| Định mức nguyên vật liệu | Bộ phận sản xuất (Phòng QLSX) | Cần cho bảng tính báo giá |
| Quy trình sản xuất + lưu đồ | Bộ phận chất lượng (Phòng CL Quy trình) / Bộ phận sản xuất (Phòng QLSX) | Cần cho tính chi phí sản xuất |
| Chi phí chung | Phòng giá thành (tự tạo) | Tab Chi phí → Chi phí chung |
| Chi phí xuất khẩu | Phòng giá thành (tự tạo) | Tab Chi phí → Chi phí xuất khẩu |

---

#### Tab 2: Danh sách báo giá (`quotes`)

**Truy cập:** `/general/pricing` → tab **"Danh sách báo giá"**

**Cột bảng danh sách:**

| Cột | Nội dung |
|---|---|
| STT | Số thứ tự |
| Ngày BG | Ngày lập báo giá |
| Mã báo giá | Mã định danh |
| Giá báo khách | Giá (VNĐ, có thể kèm USD nếu có tỷ giá) |
| TG giao hàng | Thời gian giao hàng (số ngày) |
| Hiệu lực | Hiệu lực báo giá (số ngày) |
| Nhân viên | Người lập báo giá |
| Trạng thái | Badge màu (xem bảng trạng thái) |
| Ghi chú | Ghi chú ngắn |
| Hành động | Xem / Sửa / Tạo đơn hàng / Xóa |

**Trạng thái báo giá (`tinhTrang`):**

| Giá trị | Nhãn hiển thị | Ý nghĩa |
|---|---|---|
| `DRAFT` | Nháp | Mới tạo, chưa gửi khách |
| `DANG_CHO_PHAN_HOI` | Đang chờ phản hồi | Đã gửi khách, chờ phản hồi |
| `DANG_CHO_GUI_DON_HANG` | Đang chờ gửi đơn hàng | Khách đồng ý, chờ tạo đơn |
| `DA_DAT_HANG` | Đã đặt hàng | Đã tạo đơn hàng thành công |
| `KHONG_DAT_HANG` | Không đặt hàng | Khách từ chối |
| `SENT` | Đã gửi | Đã gửi báo giá |
| `APPROVED` | Đã duyệt | Được duyệt nội bộ |
| `REJECTED` | Từ chối | Bị từ chối nội bộ |
| `EXPIRED` | Hết hạn | Quá thời hạn hiệu lực |

**Nút hành động trên mỗi dòng:**

| Nút | Hành động | Điều kiện |
|---|---|---|
| Mắt (Xem) | Mở modal xem chi tiết báo giá | Tất cả vai trò |
| Bút (Sửa) | Mở form chỉnh sửa | TEAM_LEAD trở lên |
| Giỏ hàng (Tạo đơn hàng) | Xác nhận tạo đơn hàng từ báo giá | TEAM_LEAD trở lên |
| Thùng rác (Xóa) | Xác nhận xóa báo giá | DEPARTMENT_HEAD / ADMIN |

**Form chỉnh sửa báo giá — các trường có thể sửa:**

| Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|:---:|---|---|
| Giá báo khách (VNĐ/KG) | ✅ | Số (bước 0.01, min 0) | Placeholder: "Nhập giá báo khách" |
| Thời gian giao hàng (ngày) | ✅ | Số (min 1) | Placeholder: "Nhập thời gian giao hàng" |
| Hiệu lực báo giá (ngày) | ✅ | Số (min 1) | Placeholder: "Nhập hiệu lực báo giá" |
| Trạng thái | ✅ | Dropdown | Đang chờ phản hồi / Đang chờ gửi đơn hàng / Đã đặt hàng / Không đặt hàng |
| Ghi chú | | Văn bản dài (4 dòng) | Placeholder: "Nhập ghi chú (nếu có)" |

**Nút:** "Lưu thay đổi" / "Hủy"

---

#### Tab 3: Danh sách đơn hàng (`orders`)

**Truy cập:** `/general/pricing` → tab **"Danh sách đơn hàng"**

**Cột bảng danh sách:**

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

**Trạng thái sản xuất (`trangThaiSanXuat`) — forward-only, không lùi:**

| Giá trị | Nhãn hiển thị | Bước |
|---|---|---|
| `CHO_LEN_KE_HOACH` | Chờ lên kế hoạch | 1 |
| `CHO_SAN_XUAT` | Chờ sản xuất | 2 |
| `DANG_SAN_XUAT` | Đang sản xuất | 3 |
| `CHO_GIAO_HANG` | Chờ giao hàng | 4 |
| `DA_LEN_CONTAINER` | Đã lên container | 5 |
| `DANG_VAN_CHUYEN` | Đang vận chuyển | 6 |
| `DA_GIAO_CHO_KHACH_HANG` | Đã giao cho khách hàng | 7 |

**Trạng thái thanh toán (`trangThaiThanhToan`):**

| Giá trị | Nhãn hiển thị |
|---|---|
| `DA_THANH_TOAN_DOT_1` | Đã thanh toán đợt 1 |
| `CHO_THANH_TOAN_DOT_2` | Chờ thanh toán đợt 2 |
| `DA_THANH_TOAN_DU` | Đã thanh toán đủ |

**Form chỉnh sửa đơn hàng — các trường có thể sửa:**

| Nhóm | Trường | Loại nhập |
|---|---|---|
| Giá trị | Giá trị đơn hàng (USD) | Số (bước 0.01) |
| Giá trị | Giá trị đơn hàng (VNĐ) | Số |
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
| | Ghi chú | Văn bản dài (4 dòng) |

**Nút:** "Lưu thay đổi" / "Hủy"

---

#### Tab 4: Chi phí (`costs`) — CHỈ CÓ TRONG BỘ PHẬN TỔNG HỢP

**Truy cập:** `/general/pricing` → tab **"Chi phí"**

> **QUAN TRỌNG:** Chức năng tạo/quản lý "Chi phí xuất khẩu" và "Chi phí chung" thuộc **Bộ phận tổng hợp → Phòng giá thành → Tab Chi phí**. KHÔNG phải bộ phận kế toán. Bộ phận kế toán quản lý công nợ và hóa đơn, không quản lý chi phí sản xuất/xuất khẩu.

Có 2 loại chi phí, chuyển đổi bằng nút toggle:

| Nút | Loại | Mục đích |
|---|---|---|
| **Chi phí Xuất khẩu** | Chi phí liên quan xuất khẩu | Dùng trong bảng tính báo giá xuất khẩu |
| **Chi phí Chung** | Chi phí vận hành chung | Phân bổ cho tất cả sản phẩm |

**Cột bảng danh sách:**

| Cột | Nội dung |
|---|---|
| Mã chi phí | `maChiPhi` (tự sinh) |
| Tên chi phí | `tenChiPhi` |
| Loại chi phí | `loaiChiPhi` |
| Đơn vị tính | `donViTinh` |
| Giá thành/ngày | Số tiền + đơn vị tiền (VND/USD) |
| Người tạo | Tên nhân viên |
| Thao tác | Nút **Sửa** (bút) + **Xóa** (thùng rác) |

**Nút header:** "Xuất Excel" + "Tạo chi phí xuất khẩu" / "Tạo chi phí chung"

**Form tạo/sửa chi phí:**

| Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|:---:|---|---|
| Tên chi phí | ✅ | Văn bản | Lỗi nếu trống: "Vui lòng nhập đầy đủ thông tin bắt buộc" |
| Loại chi phí | ✅ | Văn bản | Lỗi nếu trống: "Vui lòng nhập đầy đủ thông tin bắt buộc" |
| Đơn vị tính | | Văn bản | VD: ngày, tháng, chuyến |
| Giá thành/ngày | | Số (bước 0.01) | Placeholder: "Nhập giá thành/ngày" |
| Đơn vị tiền | | Dropdown | VND / USD (mặc định: VND) |
| Ghi chú | | Văn bản dài | |

**Nút:** "Tạo mới" / "Cập nhật" / "Hủy"

---

### 3.3. Bảng tính báo giá (QuotationCalculator)

Bảng tính báo giá là công cụ chính của Phòng giá thành. Mở từ: Tab YCBG → nhấn biểu tượng "Tạo báo giá" trên dòng YCBG.

#### Cấu trúc bảng tính

Bảng tính hiển thị dạng modal lớn với nhiều tab:
- **Tab sản phẩm chính** (1 tab cho mỗi sản phẩm trong YCBG): Sản phẩm 1, Sản phẩm 2...
- **Tab chi phí bổ sung** (tùy chọn): CP bổ sung 1, CP bổ sung 2...

#### Mỗi tab sản phẩm gồm các section:

**Section 1: Thông tin sản phẩm**

| Trường | Bắt buộc | Nguồn dữ liệu | Ghi chú |
|---|:---:|---|---|
| Loại sản phẩm | ✅ | Dropdown từ danh sách sản phẩm | Lọc sản phẩm theo loại |
| Tên sản phẩm | ✅ | Dropdown (lọc theo loại SP) | Tự động từ YCBG |
| Khối lượng | | Số | Từ YCBG hoặc nhập tay |
| Đơn vị | | Văn bản | Kg, MT, Tấn... |
| Mã định mức NVL | | Dropdown | Chọn từ danh sách định mức (Bộ phận sản xuất — Phòng QLSX tạo) |

> **Nếu không có định mức NVL:** Yêu cầu Bộ phận sản xuất (Phòng QLSX) tạo định mức nguyên vật liệu cho sản phẩm trước.

**Section 2: Nguyên liệu, Tồn kho & Sản xuất**

Chia 2 cột:

*Cột trái — Nguyên liệu & Tồn kho:*

| Trường | Ghi chú |
|---|---|
| NL đầu vào | Dropdown — chọn nguyên liệu từ định mức |
| SP đầu ra | Dropdown — chọn thành phẩm từ định mức |
| Nút "Tồn kho" | Kiểm tra tồn kho hiện tại của NL/SP đã chọn |
| Bảng nguyên liệu | Hiển thị danh sách NL từ định mức với số lượng kế hoạch/thực tế |

*Cột phải — Sản xuất & Thời gian:*

| Trường | Loại nhập | Ghi chú |
|---|---|---|
| Quy trình sản xuất | Dropdown | Chọn từ danh sách quy trình (Bộ phận chất lượng — Phòng CL Quy trình tạo) |
| Lưu đồ quy trình | Hiển thị tự động | Nếu chưa có lưu đồ → thông báo "Vui lòng tạo lưu đồ trong module Quy trình sản xuất" |
| Số ngày SX (KH) | Số | Kế hoạch |
| Số ngày SX (TT) | Số | Thực tế |
| Số công nhân | Số | |
| Tiền OT/ngày | Số | VNĐ |

> **Nếu không có quy trình sản xuất:** Yêu cầu Bộ phận chất lượng (Phòng CL Quy trình) tạo quy trình và Bộ phận sản xuất (Phòng QLSX) tạo lưu đồ trước.

**Section 3: Tổng hợp chi phí (mỗi sản phẩm)**

Bảng tổng hợp tự động tính:

| Mục | Công thức | Ghi chú |
|---|---|---|
| Chi phí nguyên liệu | Tổng (NL × đơn giá) | Từ định mức + giá NL |
| Chi phí nhân công | Số công nhân × ngày × đơn giá | |
| Chi phí OT | Tiền OT × số ngày | |
| Chi phí chung (phân bổ) | Từ bảng chi phí chung | Phân bổ theo khối lượng SP |
| Chi phí xuất khẩu | Từ bảng chi phí XK | Chỉ cho đơn quốc tế |
| **Giá vốn/kg** | Tổng chi phí ÷ khối lượng | Tự động |
| Lợi nhuận cộng thêm | Nhập tay (VNĐ/kg) | |
| **Giá bán/kg** | Giá vốn + Lợi nhuận | Tự động |

#### Bảng chi phí chung (áp dụng cho nhiều sản phẩm)

Nằm bên dưới các tab sản phẩm, gồm:
- Tên bảng chi phí (VD: "Chi phí chung 1")
- Chọn chi phí từ danh sách chi phí chung đã tạo ở Tab 4
- Mỗi chi phí có: Kế hoạch (VNĐ) + Thực tế (VNĐ)
- Chọn sản phẩm được phân bổ (nếu không chọn → phân bổ cho tất cả)
- Nút "Thêm bảng chi phí chung" để tạo nhiều bảng

#### Bảng chi phí xuất khẩu

- Chọn chi phí từ danh sách chi phí xuất khẩu đã tạo ở Tab 4
- Mỗi chi phí có: Kế hoạch USD + Thực tế USD + Tỉ giá kế hoạch + Tỉ giá thực tế
- Tự động quy đổi sang VNĐ

#### Tổng hợp toàn đơn hàng (sidebar phải)

| Mục | Công thức |
|---|---|
| Phần trăm thuế (%) | Nhập tay |
| Lợi nhuận trước thuế | Tổng (lợi nhuận × kg chính phẩm) của tất cả SP |
| Lợi nhuận sau thuế | Lợi nhuận trước thuế - (trước thuế × % thuế) |
| Phần trăm quỹ (%) | Nhập tay |
| Trích các quỹ | Lợi nhuận sau thuế × % quỹ |
| **Lợi nhuận thực nhận** | Lợi nhuận sau thuế - Trích các quỹ |

Mỗi mục đều hiển thị 2 dòng: **Kế hoạch** (màu xanh dương) và **Thực tế** (màu xanh lá).

#### Lưu và tạo báo giá

- **Nút "Lưu"**: Lưu bảng tính vào database, có thể mở lại chỉnh sửa sau
- **Nút "Tạo báo giá"**: Tạo báo giá chính thức từ bảng tính → yêu cầu nhập thêm: Hiệu lực báo giá (ngày), Trạng thái, Ghi chú

---

### 3.4. Bảng lương (PayrollManagement)

Module bảng lương cho phép quản lý và tính toán lương nhân viên theo tháng/năm.

#### Thu nhập

| Trường | Ghi chú |
|---|---|
| Lương cơ bản | Nhập tay hoặc lấy từ hợp đồng |
| Lương KPI | Thưởng theo KPI đạt được |
| Phụ cấp chức vụ | Phụ cấp theo vị trí |
| Phụ cấp khác | Các phụ cấp phát sinh |
| **Tổng thu nhập** | Tự động = Lương cơ bản + Lương KPI + Phụ cấp chức vụ + Phụ cấp khác |

#### Khấu trừ

| Trường | Ghi chú |
|---|---|
| BHXH | Bảo hiểm xã hội |
| BHYT | Bảo hiểm y tế |
| BHTN | Bảo hiểm thất nghiệp |
| Thuế TNCN | Thuế thu nhập cá nhân |
| Khấu trừ KPI | Trừ khi không đạt KPI |
| Khấu trừ ngày nghỉ | Tự động tính theo số ngày nghỉ |
| **Tổng khấu trừ** | Tự động = tổng các khoản khấu trừ |

#### Ngày công

| Trường | Ghi chú |
|---|---|
| Số ngày làm | Số ngày thực tế làm việc trong tháng |
| Số ngày nghỉ | Số ngày nghỉ không lương |
| Giờ OT | Số giờ làm thêm |
| Tiền OT | Tự động tính theo công thức |

#### Công thức tính

| Tham số | Công thức |
|---|---|
| Số ngày công chuẩn / tháng | Cấu hình tại mục cài đặt (ví dụ: 26 ngày) |
| Khấu trừ ngày nghỉ | `= Lương cơ bản ÷ Ngày công chuẩn × Số ngày nghỉ` |
| Giá tiền OT (₫/giờ) | Cấu hình tại mục cài đặt |
| Tiền OT | `= Giá OT × Số giờ OT` |

#### Thao tác

- **Lọc bảng lương:** Chọn **Tháng** và **Năm** để xem bảng lương tương ứng.
- **Chỉnh sửa:** Click vào dòng nhân viên để mở form chỉnh sửa chi tiết.
- **Gửi bảng lương:** Gửi thông báo bảng lương đến tất cả nhân viên (yêu cầu quyền ADMIN hoặc DEPARTMENT_HEAD).

---

## 4. Phòng chăm sóc đối tác

### 4.1. Tổng quan

Phòng chăm sóc đối tác chịu trách nhiệm quản lý quan hệ với khách hàng, nhà cung cấp và đối tác logistics.

> **Lưu ý:** Tính năng đang trong quá trình phát triển.

### 4.2. Các tính năng đang xây dựng

- Quản lý thông tin khách hàng
- Quản lý thông tin nhà cung cấp
- Quản lý đối tác vận chuyển / logistics
- Theo dõi dịch vụ và hợp đồng

### 4.3. Dịch vụ hiện có

Nhân viên phòng chăm sóc đối tác hiện có thể:
- Tra cứu danh sách đối tác trong hệ thống
- Phối hợp với Phòng giá thành để xử lý báo giá và đơn hàng liên quan đối tác

---

<!-- ## 5. Luồng công việc chính (Workflow)

### 5.1. Luồng từ YCBG đến Đơn hàng

Phòng kinh doanh tạo YCBG
  → Phòng giá thành xem YCBG (Tab 1)
  → Nhấn "Tạo báo giá" → Mở bảng tính
  → Nhập chi phí, tính giá vốn, giá bán
  → Lưu bảng tính → Tạo báo giá (Tab 2)
  → Gửi khách → Chờ phản hồi
  → Khách đồng ý → Tạo đơn hàng (Tab 3)
  → Theo dõi trạng thái SX + thanh toán

### 5.2. Luồng tạo chi phí

Phòng giá thành vào Tab Chi phí (Tab 4)
  → Chọn loại: Chi phí xuất khẩu / Chi phí chung
  → Nhấn "Tạo chi phí..."
  → Nhập: Tên, Loại, Đơn vị tính, Giá thành/ngày, Đơn vị tiền
  → Lưu → Chi phí xuất hiện trong bảng tính báo giá

### 5.3. Luồng bảng lương

Chọn Tháng + Năm
  → Hệ thống hiển thị danh sách nhân viên
  → Click vào nhân viên → Nhập thu nhập, khấu trừ, ngày công
  → Hệ thống tự tính tổng
  → DEPARTMENT_HEAD/ADMIN nhấn "Gửi bảng lương" → Thông báo đến NV
-->

---

## 6. Phụ thuộc dữ liệu giữa các phòng ban

| Phòng giá thành cần | Phòng ban cung cấp | Cách kiểm tra |
|---|---|---|
| Danh sách khách hàng | Phòng kinh doanh | Dropdown khách hàng trong form YCBG |
| Danh sách sản phẩm | Phòng kinh doanh | Dropdown sản phẩm trong form YCBG |
| Định mức nguyên vật liệu | Bộ phận sản xuất (Phòng QLSX) | Dropdown "Mã định mức NVL" trong bảng tính |
| Quy trình sản xuất + lưu đồ | Bộ phận chất lượng (Phòng CL Quy trình) / Bộ phận sản xuất (Phòng QLSX) | Dropdown quy trình trong bảng tính |
| Tồn kho nguyên liệu | Kho (module kho) | Nút "Tồn kho" trong bảng tính |
| Thông tin nhân viên (cho bảng lương) | Phòng nhân sự / Admin | Danh sách NV trong module bảng lương |

**Khi dữ liệu phụ thuộc chưa có:**
- Dropdown sẽ trống hoặc không có lựa chọn phù hợp
- Thông báo lỗi: "Vui lòng tạo lưu đồ trong module Quy trình sản xuất trước khi sử dụng"
- Giải pháp: Liên hệ phòng ban tương ứng để tạo dữ liệu trước

---

## 7. Escalation (Leo thang xử lý)

Khi gặp sự cố hoặc vượt thẩm quyền, thực hiện theo trình tự:

1. **Nhân viên (EMPLOYEE):** Liên hệ TEAM_LEAD của phòng để được hỗ trợ.
2. **TEAM_LEAD:** Báo cáo lên DEPARTMENT_HEAD nếu không tự xử lý được.
3. **DEPARTMENT_HEAD:** Liên hệ ADMIN hệ thống hoặc bộ phận IT nếu vấn đề liên quan kỹ thuật.
4. **Vấn đề bảng lương sai số liệu:** Kiểm tra lại công thức cài đặt (ngày công chuẩn, giá OT) trước khi báo cáo.
5. **Vấn đề phân quyền:** Liên hệ ADMIN để cấp lại quyền truy cập.
6. **Thiếu dữ liệu phụ thuộc:** Liên hệ phòng ban tương ứng (xem bảng mục 6).

---

## 8. FAQ

**Q1: Làm thế nào để tạo một yêu cầu báo giá (YCBG)?**
> Phòng giá thành **không tạo YCBG** — đó là quyền của Phòng kinh doanh. Phòng giá thành chỉ xem YCBG và tạo báo giá từ đó. Vào tab **"Danh sách YCBG"** → tìm YCBG cần xử lý → nhấn biểu tượng **"Tạo báo giá"** (file) → điền bảng tính → nhấn **"Tạo báo giá"**.

**Q2: Bảng tính báo giá yêu cầu "Mã định mức NVL" nhưng dropdown trống?**
> Định mức nguyên vật liệu do **Bộ phận sản xuất (Phòng QLSX)** tạo. Liên hệ Phòng QLSX để tạo định mức cho sản phẩm cần báo giá.

**Q3: Bảng tính báo giá báo "Vui lòng tạo lưu đồ trong module Quy trình sản xuất"?**
> Quy trình sản xuất do **Bộ phận chất lượng (Phòng CL Quy trình)** tạo. Lưu đồ do **Bộ phận sản xuất (Phòng QLSX)** tạo. Liên hệ các phòng ban tương ứng trước khi tính chi phí sản xuất.

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
