---
department: DEPT_QUALITY
department_name: "Bộ phận chất lượng"
roles: [ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE]
access: department_restricted
language: vi
---

# Bộ phận Chất lượng

## 1. Tổng quan

Bộ phận Chất lượng chịu trách nhiệm quản lý toàn bộ quy trình đảm bảo chất lượng sản phẩm, nhân sự và quy trình sản xuất. Hệ thống chia thành hai phòng chức năng chính:

- **Phòng CL Nhân sự** (`/quality/personnel`): Quản lý nhân viên, vị trí, cấp độ, đánh giá, bảng lương, điểm danh, đơn nghỉ phép và tài khoản user.
- **Phòng CL Quy trình** (`/quality/process`): Quản lý quy trình sản xuất, đánh giá nguyên vật liệu (đánh giá chiên/ngâm), định mức NVL và kiểm tra nội bộ.

Dashboard tổng quan (`/quality`) hiển thị 4 chỉ số chính:
| Chỉ số | Mô tả |
|--------|-------|
| Nhân viên | Tổng số nhân viên và số đang làm việc |
| Quy trình | Tổng số quy trình đã tạo |
| Đánh giá chất lượng | Tổng số lượt đánh giá NVL |
| Kiểm tra nội bộ | Tổng số lượt kiểm tra nội bộ |

---

## 2. Quyền truy cập

| Chức năng | ADMIN | DEPARTMENT_HEAD | TEAM_LEAD | EMPLOYEE |
|-----------|:-----:|:---------------:|:---------:|:--------:|
| Xem danh sách nhân viên | ✅ | ✅ | ✅ | ✅ |
| Thêm / sửa nhân viên | ✅ | ✅ | ❌ | ❌ |
| Xóa nhân viên | ✅ | ✅ | ❌ | ❌ |
| Quản lý vị trí & cấp độ | ✅ | ✅ | ❌ | ❌ |
| Xem đánh giá nhân viên | ✅ | ✅ | ✅ | ✅ |
| Tạo / sửa đánh giá nhân viên | ✅ | ✅ | ✅ | ❌ |
| Xem bảng lương | ✅ | ✅ | ✅ | ✅ (bản thân) |
| Chỉnh sửa bảng lương | ✅ | ✅ | ❌ | ❌ |
| Quản lý điểm danh | ✅ | ✅ | ✅ | ❌ |
| Xem / tạo đơn nghỉ phép | ✅ | ✅ | ✅ | ✅ |
| Quản lý user hệ thống | ✅ | ❌ | ❌ | ❌ |
| Tạo / sửa quy trình | ✅ | ✅ | ✅ | ❌ |
| Xem quy trình | ✅ | ✅ | ✅ | ✅ |
| Tạo đánh giá NVL (chiên/ngâm) | ✅ | ✅ | ✅ | ✅ |
| Tạo / sửa định mức NVL | ✅ | ✅ | ✅ | ❌ |
| Kiểm tra nội bộ | ✅ | ✅ | ✅ | ❌ |

---

## 3. Phòng CL Nhân sự

Đường dẫn: `/quality/personnel`

Trang gồm 9 tab:

| Tab | Tên hiển thị | Mô tả |
|-----|-------------|-------|
| `employees` | Danh sách nhân viên | CRUD hồ sơ nhân viên |
| `positions` | Quản lý vị trí | Tạo và quản lý chức danh |
| `levels` | Quản lý cấp độ & lương | Gán cấp độ, mức lương theo bậc |
| `responsibilities` | Danh sách trách nhiệm | Quản lý mô tả trách nhiệm từng vị trí |
| `evaluations` | Đánh giá nhân viên | Nhập điểm KPI theo tháng/năm |
| `payroll` | Bảng tính lương | Tính lương, OT, khấu trừ |
| `attendance` | Bảng điểm danh nhân viên | Xem điểm danh theo ngày |
| `leave-requests` | Danh sách đơn nghỉ phép | Xem và duyệt đơn nghỉ phép |
| `users` | Quản lý user | Tạo/khóa tài khoản hệ thống |

### 3.1 Danh sách nhân viên (EmployeeManagement)

#### Form thêm / sửa nhân viên — 27 trường

| # | Trường | Bắt buộc | Kiểu dữ liệu / Giá trị |
|---|--------|:--------:|----------------------|
| 1 | Mã nhân viên | ✅ | Text |
| 2 | Họ tên | ✅ | Text (từ tài khoản user) |
| 3 | Email | ✅ | Email (từ tài khoản user) |
| 4 | Vị trí | | Select (từ danh sách vị trí) |
| 5 | Bộ phận | | Text |
| 6 | Cấp độ nhân viên | | Select (từ danh sách cấp độ) |
| 7 | Ngày vào làm | ✅ | Date |
| 8 | Loại hợp đồng | | `PERMANENT` (Chính thức) / `TEMPORARY` (Tạm thời) / `PROBATION` (Thử việc) / `PART_TIME` (Bán thời gian) |
| 9 | Trạng thái | | `ACTIVE` (Đang làm) / `INACTIVE` (Ngừng làm) / `ON_LEAVE` (Nghỉ phép) / `TERMINATED` (Đã nghỉ việc) |
| 10 | Giới tính | | `MALE` / `FEMALE` / `OTHER` |
| 11 | Ngày sinh | | Date |
| 12 | Số điện thoại | | Text |
| 13 | Địa chỉ | | Text |
| 14 | Trình độ học vấn | | `HIGH_SCHOOL` / `ASSOCIATE` / `BACHELOR` / `MASTER` / `DOCTORATE` |
| 15 | Chuyên ngành | | Text |
| 16 | Kỹ năng đặc biệt | | Text |
| 17 | Lương cơ bản | ✅ | Số tiền (VNĐ) |
| 18 | Mức KPI | | Số (hệ số) |
| 19 | Chiều cao (cm) | | Số |
| 20 | Cân nặng (kg) | | Số |
| 21 | Size áo | | Text |
| 22 | Size quần | | Text |
| 23 | Size giày | | Text |
| 24 | Số tài khoản ngân hàng | | Text |
| 25 | Số tủ khóa | | Text |
| 26 | Ghi chú | | Text area |
| 27 | Lương KPI | | Số (tính tự động từ Lương cơ bản × Mức KPI) |

#### Hành động trong bảng nhân viên
- **Xem chi tiết**: Mở modal xem đầy đủ 27 trường.
- **Chỉnh sửa**: Mở form sửa thông tin.
- **Xóa**: Xác nhận trước khi xóa.

### 3.2 Đánh giá nhân viên (EmployeeEvaluationManagement)

- Lọc theo **tháng** (1–12) và **năm**.
- Mỗi đánh giá gắn với một nhân viên, ghi nhận điểm KPI và nhận xét.
- Dashboard tổng quan hiển thị: tổng đánh giá tháng, phân bố đánh giá.

### 3.3 Bảng tính lương (PayrollManagement)

| Trường | Mô tả |
|--------|-------|
| Tháng / Năm | Kỳ tính lương |
| Lương cơ bản | Mức lương hợp đồng |
| Lương KPI | Thưởng theo hiệu suất |
| Phụ cấp chức vụ | Phụ cấp theo vị trí |
| Phụ cấp khác | Phụ cấp bổ sung |
| Tổng thu nhập | Tổng trước khấu trừ |
| BHXH | Bảo hiểm xã hội |
| BHYT | Bảo hiểm y tế |
| BHTN | Bảo hiểm thất nghiệp |
| Thuế TNCN | Thuế thu nhập cá nhân |
| Khấu trừ KPI | Phạt hiệu suất (nếu có) |
| Khấu trừ ngày nghỉ | Trừ lương ngày vắng |
| Tổng khấu trừ | Tổng các khoản trừ |
| Số ngày làm | Thực tế ngày làm việc |
| Số ngày nghỉ | Số ngày vắng |
| Giờ OT | Số giờ làm thêm |
| Tiền OT | Lương làm thêm |
| Số ngày công chuẩn / tháng | Chuẩn ngày công |
| Giá tiền OT (₫/giờ) | Đơn giá OT |

---

## 4. Phòng CL Quy trình

Đường dẫn: `/quality/process`

Trang gồm 3 tab:

| Tab | Tên hiển thị | Mô tả |
|-----|-------------|-------|
| `processList` | Danh sách quy trình | CRUD quy trình sản xuất |
| `orderList` | Danh sách đơn hàng | Xem đơn hàng liên quan |
| `inspection` | Kiểm tra nội bộ | Ghi nhận vi phạm / kiểm tra |

### 4.1 Đánh giá NVL — MaterialEvaluationManagement

Quản lý đánh giá nguyên vật liệu trong quy trình chiên/ngâm.

#### Form tạo đánh giá — 13 trường

| # | Trường | Bắt buộc | Ghi chú |
|---|--------|:--------:|---------|
| 1 | Mã chiên | ✅ | Mã định danh lô chiên |
| 2 | Thời gian chiên | | Chọn ngày và giờ (datetime picker) |
| 3 | Tên hàng hóa | ✅ | Tên NVL |
| 4 | Số lô, Kiện | ✅ | Mã lô hàng |
| 5 | Khối lượng (Kg) | ✅ | Trọng lượng NVL |
| 6 | Số lần ngâm | ✅ | Số lần thực hiện ngâm |
| 7 | Nhiệt độ nước trước ngâm (°C) | ✅ | Đo trước khi ngâm |
| 8 | Nhiệt độ nước sau vớt (°C) | ✅ | Đo sau khi vớt |
| 9 | Thời gian ngâm (Phút) | ✅ | Thời lượng ngâm |
| 10 | Brix nước ngâm | ✅ | Độ ngọt nước ngâm |
| 11 | Đánh giá trước ngâm | ✅ | Chất lượng trước xử lý |
| 12 | Đánh giá sau ngâm | ✅ | Chất lượng sau xử lý |
| 13 | Người thực hiện | ✅ | Nhân viên phụ trách |
| +  | File đính kèm | | Ảnh / tài liệu minh chứng |

#### Tiêu chí đánh giá (MaterialEvaluation Criteria)
- Mã số tiêu chí (VD: 1, 2, 3)
- Mô tả tiêu chí (text area tự do)

### 4.2 Định mức NVL — MaterialStandardManagement

Quản lý công thức / tỉ lệ sử dụng nguyên liệu và thành phẩm.

#### Form tạo định mức

| # | Trường | Bắt buộc | Ghi chú |
|---|--------|:--------:|---------|
| 1 | Mã định mức | ✅ | Mã duy nhất |
| 2 | Loại định mức | ✅ | `RAW_MATERIAL` (Nguyên vật liệu) / `EQUIPMENT` (Thiết bị) |
| 3 | Tên định mức | ✅ | Tên mô tả |
| 4 | Tỉ lệ thu hồi thành phẩm (%) K3 | | Tỉ lệ phần trăm thu hồi |
| 5 | Ghi chú | | Ghi chú bổ sung |

#### Chi tiết định mức — bảng nguyên liệu
| Cột | Mô tả |
|-----|-------|
| Tên nguyên liệu | Tìm kiếm nguyên liệu (search box) |
| Tỉ lệ (%) | Phần trăm nguyên liệu trong công thức |

#### Chi tiết định mức — bảng thành phẩm
| Cột | Mô tả |
|-----|-------|
| Tên thành phẩm | Tìm kiếm sản phẩm (search box) |
| Tỉ lệ (%) | Phần trăm thành phẩm thu được |

#### Cột bảng danh sách
Mã định mức · Loại định mức · Tên định mức · Tỉ lệ thu hồi K3 · Ngày tạo · Ngày cập nhật · Ghi chú · Hành động

### 4.3 Quản lý Quy trình — ProcessManagement

Tạo và quản lý quy trình sản xuất có cấu trúc phân đoạn.

#### Form tạo quy trình

| # | Trường | Bắt buộc | Ghi chú |
|---|--------|:--------:|---------|
| 1 | MSNV | ✅ | Mã số nhân viên phụ trách |
| 2 | Tên nhân viên | ✅ | Tên người tạo quy trình |
| 3 | Tên quy trình | ✅ | Tên định danh |
| 4 | Loại quy trình | ✅ | `Sản xuất` / `Kiểm tra chất lượng` / `Đóng gói` / `Vận chuyển` / `Khác` |

#### Phân đoạn (Sections)
Mỗi quy trình có một hoặc nhiều phân đoạn:

| Trường | Ghi chú |
|--------|---------|
| Tên phân đoạn | Placeholder: "Tên phân đoạn" |
| Nội dung công việc | Mô tả chi tiết bước thực hiện |

#### Chi phí trong phân đoạn (Cost Items)
| Trường | Ghi chú |
|--------|---------|
| Loại chi phí | `Nhân công` / `Vật tư` / `Phụ liệu` |
| Tên chi phí | Tên khoản chi |
| Định mức (dvt) | Số lượng định mức |
| Đơn vị tính | `Người` / `Kg` / `Cái` (hoặc nhập tự do) |

#### Cột bảng danh sách quy trình
MSNV · Tên nhân viên · Tên quy trình · Loại quy trình · Ngày tạo · Ngày cập nhật · Hành động (Xem / Sửa / Xóa)

---

## 5. Danh sách quy trình nội bộ (ProcessList)

Bảng theo dõi các bước quy trình sản xuất mẫu:

| Cột | Mô tả |
|-----|-------|
| STT | Số thứ tự |
| Lưu đồ | Tên bước / lưu đồ công việc |
| Nội dung công việc | Mô tả chi tiết thao tác |
| Loại chi phí | Nhân công hoặc Vật tư |
| Tên chi phí | Tên nguồn lực |
| ĐVT | Đơn vị tính |
| Hành động | Xem · Sửa · Xóa |

Ví dụ quy trình mẫu:
1. **Tập nhân nguyên liệu** — Nhân viên vào kho lấy nguyên liệu, thực hiện chặn nguyên liệu / Nhân công / NV Vận hành máy rửa / Người
2. **Chuẩn bị kho ngăn** — NV chuẩn bị kho ngăn, phân công + mách nhân / Nhân công / Mách nhân / Kỹ
3. **Tập kỹ năng lâu kho vật dụng** — NV tập kỹ năng, chuẩn bị vật dụng / Nhân công / NV Vận hành máy rửa / Người

---

## 6. Bảng leo thang (Escalation)

| Tình huống | Cấp xử lý | Thời hạn |
|-----------|-----------|----------|
| Nhân viên không đạt KPI 2 tháng liên tiếp | TEAM_LEAD → DEPARTMENT_HEAD | 3 ngày làm việc |
| Lỗi đánh giá NVL vượt ngưỡng cho phép | TEAM_LEAD → DEPARTMENT_HEAD | Ngay lập tức |
| Quy trình không có người phụ trách | DEPARTMENT_HEAD | 1 ngày làm việc |
| Hồ sơ nhân viên thiếu thông tin bắt buộc | TEAM_LEAD | 2 ngày làm việc |
| Xung đột lịch nghỉ phép ảnh hưởng sản xuất | DEPARTMENT_HEAD → ADMIN | 1 ngày làm việc |
| Định mức NVL sai lệch > 10% thực tế | DEPARTMENT_HEAD | 2 ngày làm việc |
| Kiểm tra nội bộ phát hiện vi phạm nghiêm trọng | DEPARTMENT_HEAD → ADMIN | Ngay lập tức |

---

## 7. FAQ

**Q1: Làm thế nào để thêm nhân viên mới?**
Vào tab **Danh sách nhân viên** → nhấn nút **Thêm mới** → điền đủ 27 trường (Mã nhân viên, Họ tên, Email, Vị trí, Ngày vào làm, Lương cơ bản là bắt buộc) → nhấn **Lưu**.

**Q2: Tôi không tìm thấy nhân viên trong dropdown khi tạo đánh giá?**
Nhân viên phải có trạng thái `ACTIVE` và đã được tạo hồ sơ đầy đủ trong tab **Danh sách nhân viên** trước khi có thể được chọn trong form đánh giá.

**Q3: Sự khác biệt giữa Định mức NVL loại RAW_MATERIAL và EQUIPMENT?**
- `RAW_MATERIAL`: Áp dụng cho nguyên vật liệu đầu vào (bao bì, nguyên liệu thô).
- `EQUIPMENT`: Áp dụng cho thiết bị / máy móc sử dụng trong quy trình.

**Q4: Làm sao tạo quy trình có nhiều bước?**
Trong form tạo quy trình, nhấn **Thêm phân đoạn** để thêm bước mới. Mỗi phân đoạn có thể thêm nhiều khoản chi phí (Nhân công / Vật tư / Phụ liệu).

**Q5: Brix nước ngâm trong đánh giá NVL là gì?**
Brix là đơn vị đo độ ngọt / nồng độ chất hòa tan trong nước ngâm, ảnh hưởng trực tiếp đến chất lượng sản phẩm sau chế biến.

**Q6: Tôi không thấy tab Quản lý user, tại sao?**
Tab **Quản lý user** chỉ hiển thị với role `ADMIN`. Nếu bạn là `DEPARTMENT_HEAD`, `TEAM_LEAD` hoặc `EMPLOYEE`, tab này bị ẩn.

**Q7: Giá tiền OT được tính như thế nào?**
Giá tiền OT (₫/giờ) được cấu hình thủ công trong bảng lương. Tổng tiền OT = Giờ OT × Giá tiền OT/giờ. Phần này do DEPARTMENT_HEAD hoặc HR xác nhận trước khi chốt lương.
