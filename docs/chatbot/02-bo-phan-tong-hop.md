---
department: DEPT_GENERAL
department_name: "Bộ phận tổng hợp"
roles: [ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE]
access: department_restricted
language: vi
---

# Bộ phận tổng hợp

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

- **Tổng quan yêu cầu BG** — tổng số YCBG, phân loại theo trạng thái
- **Tổng quan báo giá** — tổng số báo giá đã lập
- **Tổng quan đơn hàng** — tổng số đơn hàng, xu hướng theo tháng

### 3.2. Chi tiết các tab — Phòng giá thành

#### Tab 1: Danh sách YCBG (`requests`)

**Truy cập:** `/general/pricing` → tab **"Danh sách YCBG"**

> **Lưu ý:** Phòng giá thành chỉ có quyền **xem** và **tạo báo giá từ YCBG**, không tạo/sửa/xóa YCBG (đó là quyền của Phòng kinh doanh).

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

**Tạo báo giá từ YCBG:** Nhấn biểu tượng **"Tạo báo giá"** trên dòng YCBG → mở bảng tính báo giá để lập báo giá.

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

| Giá trị | Nhãn hiển thị |
|---|---|
| `DRAFT` | Nháp |
| `DANG_CHO_PHAN_HOI` | Đang chờ phản hồi |
| `DANG_CHO_GUI_DON_HANG` | Đang chờ gửi đơn hàng |
| `DA_DAT_HANG` | Đã đặt hàng |
| `KHONG_DAT_HANG` | Không đặt hàng |
| `SENT` | Đã gửi |
| `APPROVED` | Đã duyệt |
| `REJECTED` | Từ chối |
| `EXPIRED` | Hết hạn |

**Nút hành động trên mỗi dòng:**

| Nút | Hành động |
|---|---|
| Mắt (Xem) | Mở modal xem chi tiết báo giá |
| Bút (Sửa) | Mở form chỉnh sửa |
| Giỏ hàng (Tạo đơn hàng) | Xác nhận: "Bạn có chắc chắn muốn tạo đơn hàng từ báo giá này?" |
| Thùng rác (Xóa) | Xác nhận: "Bạn có chắc chắn muốn xóa báo giá này?" |

**Form chỉnh sửa báo giá** — các trường có thể sửa:

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

**Trạng thái sản xuất (`trangThaiSanXuat`):**

| Giá trị | Nhãn hiển thị |
|---|---|
| `CHO_LEN_KE_HOACH` | Chờ lên kế hoạch |
| `CHO_SAN_XUAT` | Chờ sản xuất |
| `DANG_SAN_XUAT` | Đang sản xuất |
| `CHO_GIAO_HANG` | Chờ giao hàng |
| `DA_LEN_CONTAINER` | Đã lên container |
| `DANG_VAN_CHUYEN` | Đang vận chuyển |
| `DA_GIAO_CHO_KHACH_HANG` | Đã giao cho khách hàng |

**Trạng thái thanh toán (`trangThaiThanhToan`):**

| Giá trị | Nhãn hiển thị |
|---|---|
| `DA_THANH_TOAN_DOT_1` | Đã thanh toán đợt 1 |
| `CHO_THANH_TOAN_DOT_2` | Chờ thanh toán đợt 2 |
| `DA_THANH_TOAN_DU` | Đã thanh toán đủ |

**Form chỉnh sửa đơn hàng** — các trường có thể sửa:

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
| | Ghi chú | Văn bản dài (4 dòng), placeholder: "Nhập ghi chú..." |

**Nút:** "Lưu thay đổi" / "Hủy"

---

#### Tab 4: Chi phí (`costs`)

**Truy cập:** `/general/pricing` → tab **"Chi phí"**

Có 2 loại chi phí, chuyển đổi bằng nút toggle:

| Nút | Loại |
|---|---|
| **Chi phí Xuất khẩu** | Chi phí liên quan xuất khẩu |
| **Chi phí Chung** | Chi phí vận hành chung |

**Cột bảng danh sách:**

| Cột | Nội dung |
|---|---|
| Mã chi phí | `maChiPhi` |
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
| Tên chi phí | ✅ | Văn bản | Lỗi: "Vui lòng nhập đầy đủ thông tin bắt buộc" |
| Loại chi phí | ✅ | Văn bản | Lỗi: "Vui lòng nhập đầy đủ thông tin bắt buộc" |
| Đơn vị tính | | Văn bản | |
| Giá thành/ngày | | Số (bước 0.01) | Placeholder: "Nhập giá thành/ngày" |
| Đơn vị tiền | | Dropdown | VND / USD (mặc định: VND) |
| Ghi chú | | Văn bản dài | |

**Nút:** "Tạo mới" / "Cập nhật" / "Hủy"

### 3.3. Bảng lương (PayrollManagement)

Module bảng lương cho phép quản lý và tính toán lương nhân viên theo tháng/năm.

#### Thu nhập

| Trường | Ghi chú |
|---|---|
| Lương cơ bản | Nhập tay hoặc lấy từ hợp đồng |
| Lương KPI | Thưởng theo KPI đạt được |
| Phụ cấp chức vụ | Phụ cấp theo vị trí |
| Phụ cấp khác | Các phụ cấp phát sinh |
| **Tổng thu nhập** | Tự động tính = Lương cơ bản + Lương KPI + Phụ cấp chức vụ + Phụ cấp khác |

#### Khấu trừ

| Trường | Ghi chú |
|---|---|
| BHXH | Bảo hiểm xã hội |
| BHYT | Bảo hiểm y tế |
| BHTN | Bảo hiểm thất nghiệp |
| Thuế TNCN | Thuế thu nhập cá nhân |
| Khấu trừ KPI | Trừ khi không đạt KPI |
| Khấu trừ ngày nghỉ | Tự động tính theo số ngày nghỉ |
| **Tổng khấu trừ** | Tự động tính = tổng các khoản khấu trừ |

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

> **Lưu ý:** Một số tính năng đang trong quá trình phát triển.

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

## 5. Escalation (Leo thang xử lý)

Khi gặp sự cố hoặc vượt thẩm quyền, thực hiện theo trình tự:

1. **Nhân viên (EMPLOYEE):** Liên hệ TEAM_LEAD của phòng để được hỗ trợ.
2. **TEAM_LEAD:** Báo cáo lên DEPARTMENT_HEAD nếu không tự xử lý được.
3. **DEPARTMENT_HEAD:** Liên hệ ADMIN hệ thống hoặc bộ phận IT nếu vấn đề liên quan kỹ thuật.
4. **Vấn đề bảng lương sai số liệu:** Kiểm tra lại công thức cài đặt (ngày công chuẩn, giá OT) trước khi báo cáo.
5. **Vấn đề phân quyền:** Liên hệ ADMIN để cấp lại quyền truy cập.

---

## 6. FAQ

**Q1: Làm thế nào để tạo một yêu cầu báo giá (YCBG)?**
> Phòng giá thành **không tạo YCBG** — đó là quyền của Phòng kinh doanh. Phòng giá thành chỉ xem YCBG và tạo báo giá từ đó. Vào tab **"Danh sách YCBG"** → tìm YCBG cần xử lý → nhấn biểu tượng **"Tạo báo giá"** (file) trên dòng đó → điền các trường: Giá báo khách (VNĐ/KG), Thời gian giao hàng (ngày), Hiệu lực báo giá (ngày), Trạng thái, Ghi chú → nhấn **"Tạo mới"**.

**Q2: Bảng lương tháng hiển thị sai, tôi cần làm gì?**
> Kiểm tra lại các thông số cài đặt: **Số ngày công chuẩn / tháng** và **Giá tiền OT**. Nếu đã đúng, kiểm tra lại số ngày nghỉ và giờ OT của nhân viên đó rồi lưu lại.

**Q3: Tại sao cột "Tổng thu nhập" và "Tổng khấu trừ" không thể nhập tay?**
> Đây là các trường tính tự động dựa trên các khoản thu nhập và khấu trừ đã nhập. Hệ thống tự cộng để tránh sai sót.

**Q4: Làm sao gửi thông báo bảng lương cho toàn bộ nhân viên?**
> Vào module **Bảng lương**, chọn đúng **Tháng** và **Năm**, sau đó nhấn nút **Gửi bảng lương**. Thao tác này yêu cầu quyền ADMIN hoặc DEPARTMENT_HEAD.

**Q5: Phòng chăm sóc đối tác có quản lý hợp đồng không?**
> Tính năng quản lý hợp đồng đối tác đang trong quá trình phát triển. Hiện tại có thể tra cứu thông tin đối tác cơ bản và phối hợp với phòng giá thành.

**Q6: Tôi có thể xem báo giá từ tab nào?**
> Vào **Phòng giá thành** → tab **Danh sách báo giá** hoặc truy cập trực tiếp `/general/pricing?tab=quotes`.

**Q7: Khấu trừ ngày nghỉ được tính như thế nào?**
> Công thức: `Khấu trừ ngày nghỉ = Lương cơ bản ÷ Số ngày công chuẩn × Số ngày nghỉ`. Số ngày công chuẩn được cấu hình trong phần cài đặt bảng lương.
