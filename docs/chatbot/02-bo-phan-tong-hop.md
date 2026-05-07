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

Ngoài ra, bộ phận tổng hợp có quyền truy cập module **Bảng lương** (`PayrollManagement`) để theo dõi và tính toán lương nhân viên trong phòng.

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

### 3.2. Các tab chức năng

| Tab | ID | Mô tả |
|---|---|---|
| Danh sách YCBG | `requests` | Quản lý yêu cầu báo giá từ khách hàng |
| Danh sách báo giá | `quotes` | Lập và theo dõi báo giá |
| Danh sách đơn hàng | `orders` | Quản lý đơn hàng liên quan chi phí |
| Chi phí chung | `costs` | Theo dõi và phân bổ chi phí chung |

**Truy cập trực tiếp theo tab:** `/general/pricing?tab=<id>`

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
> Vào **Phòng giá thành** → tab **Danh sách YCBG** → nhấn nút **Tạo mới**. Điền đầy đủ thông tin và lưu.

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
