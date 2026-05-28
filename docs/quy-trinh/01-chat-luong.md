## Cách truy cập

Từ thanh điều hướng bên trái (sidebar):

- **Phòng chất lượng nhân sự**: Nhấn **Bộ phận chất lượng** → chọn **Phòng chất lượng nhân sự**
- **Phòng chất lượng quy trình**: Nhấn **Bộ phận chất lượng** → chọn **Phòng chất lượng quy trình**

## 1. Tổng quan

Bộ phận Chất lượng chịu trách nhiệm quản lý toàn bộ quy trình đảm bảo chất lượng sản phẩm, nhân sự và quy trình sản xuất. Hệ thống chia thành hai phòng chức năng chính:

- **Phòng CL Nhân sự** (`/quality/personnel`): Quản lý nhân viên, vị trí, cấp độ, đánh giá, bảng lương, điểm danh, đơn nghỉ phép và tài khoản user.
- **Phòng CL Quy trình** (`/quality/process`): Quản lý quy trình sản xuất, danh sách đơn hàng và kiểm tra nội bộ.

Dashboard tổng quan Phòng CL Nhân sự hiển thị 3 khối thông tin:


| Khối                | Chỉ số                                                           |
| ------------------- | ---------------------------------------------------------------- |
| Tổng quan nhân viên | Tổng nhân viên · Chính thức · Thử việc · Bán thời gian           |
| Tổng quan đánh giá  | Đã đánh giá · Vượt KPI · Đạt KPI · Chưa đạt (lọc theo tháng/năm) |
| Tổng quan điểm danh | Tổng điểm danh · Đã vào · Đã ra · Chưa điểm danh (lọc theo ngày) |


Dashboard tổng quan Phòng CL Quy trình hiển thị 2 khối:


| Khối                | Chỉ số                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| Tổng quan quy trình | Tổng số quy trình · Sản xuất · Kiểm tra · Đóng gói · Vận chuyển · Khác |
| Tổng quan sản phẩm  | Tổng sản phẩm · NL tươi · NL đông · SP khô · SP đông · Phụ liệu        |


---

## 2. Quyền truy cập


| Chức năng                     | Quản trị viên | Trưởng phòng | Tổ trưởng | Nhân viên    |
| ----------------------------- | ------------- | ------------ | --------- | ------------ |
| Xem danh sách nhân viên       | ✅             | ✅            | ✅         | ✅            |
| Thêm / sửa nhân viên          | ✅             | ✅            | ❌         | ❌            |
| Xóa nhân viên                 | ✅             | ✅            | ❌         | ❌            |
| Quản lý vị trí                | ✅             | ✅            | ❌         | ❌            |
| Quản lý cấp độ & lương        | ✅             | ✅            | ❌         | ❌            |
| Quản lý trách nhiệm           | ✅             | ✅            | ❌         | ❌            |
| Xem đánh giá nhân viên        | ✅             | ✅            | ✅         | ✅            |
| Tạo / sửa đánh giá nhân viên  | ✅             | ✅            | ✅         | ❌            |
| Xem bảng lương                | ✅             | ✅            | ✅         | ✅ (bản thân) |
| Chỉnh sửa bảng lương          | ✅             | ✅            | ❌         | ❌            |
| Quản lý điểm danh             | ✅             | ✅            | ✅         | ❌            |
| Xem / tạo đơn nghỉ phép       | ✅             | ✅            | ✅         | ✅            |
| Duyệt / từ chối đơn nghỉ phép | ✅             | ✅            | ✅         | ❌            |
| Quản lý user hệ thống         | ✅             | ❌            | ❌         | ❌            |
| Tạo / sửa quy trình           | ✅             | ✅            | ✅         | ❌            |
| Xem quy trình                 | ✅             | ✅            | ✅         | ✅            |
| Kiểm tra nội bộ               | ✅             | ✅            | ✅         | ❌            |


---

## 3. Phòng CL Nhân sự

Đường dẫn: `/quality/personnel`

Trang gồm 9 tab (hiển thị theo role):


| Tab                | Tên hiển thị             | Roles được xem              |
| ------------------ | ------------------------ | --------------------------- |
| `employees`        | Danh sách nhân viên      | Tất cả                      |
| `positions`        | Quản lý vị trí           | Quản trị viên, Trưởng phòng |
| `levels`           | Quản lý cấp độ & lương   | Quản trị viên, Trưởng phòng |
| `responsibilities` | Danh sách trách nhiệm    | Quản trị viên, Trưởng phòng |
| `evaluations`      | Đánh giá nhân viên       | Tất cả                      |
| `payroll`          | Bảng tính lương          | Tất cả                      |
| `attendance`       | Bảng điểm danh nhân viên | Tất cả                      |
| `leave-requests`   | Danh sách đơn nghỉ phép  | Tất cả                      |
| `users`            | Quản lý user             | Chỉ Quản trị viên           |


### 3.1 Danh sách nhân viên (EmployeeManagement)

#### Form thêm / sửa nhân viên — 27 trường


| #   | Trường                 | Bắt buộc | Kiểu dữ liệu / Giá trị                                                                              |
| --- | ---------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| 1   | Mã nhân viên           | ✅        | Text                                                                                                |
| 2   | Họ tên                 | ✅        | Text (từ tài khoản user)                                                                            |
| 3   | Email                  | ✅        | Email (từ tài khoản user)                                                                           |
| 4   | Vị trí                 |          | Select (từ danh sách vị trí — phải tạo vị trí trước)                                                |
| 5   | Bộ phận                |          | Text                                                                                                |
| 6   | Cấp độ nhân viên       |          | Select (từ danh sách cấp độ — phải tạo cấp độ trước)                                                |
| 7   | Ngày vào làm           | ✅        | Date                                                                                                |
| 8   | Loại hợp đồng          |          | Chính thức (Chính thức) / Tạm thời (Tạm thời) / Thử việc (Thử việc) / Bán thời gian (Bán thời gian) |
| 9   | Trạng thái             |          | Đang làm (Đang làm) / Ngừng làm (Ngừng làm) / Nghỉ phép (Nghỉ phép) / Đã nghỉ việc (Đã nghỉ việc)   |
| 10  | Giới tính              |          | Nam / Nữ / Khác                                                                                     |
| 11  | Ngày sinh              |          | Date                                                                                                |
| 12  | Số điện thoại          |          | Text                                                                                                |
| 13  | Địa chỉ                |          | Text                                                                                                |
| 14  | Trình độ học vấn       |          | Trung học / Cao đẳng / Đại học / Thạc sĩ / Tiến sĩ                                                  |
| 15  | Chuyên ngành           |          | Text                                                                                                |
| 16  | Kỹ năng đặc biệt       |          | Text                                                                                                |
| 17  | Lương cơ bản           | ✅        | Số tiền (VNĐ)                                                                                       |
| 18  | Mức KPI                |          | Số (hệ số)                                                                                          |
| 19  | Chiều cao (cm)         |          | Số                                                                                                  |
| 20  | Cân nặng (kg)          |          | Số                                                                                                  |
| 21  | Size áo                |          | Text                                                                                                |
| 22  | Size quần              |          | Text                                                                                                |
| 23  | Size giày              |          | Text                                                                                                |
| 24  | Số tài khoản ngân hàng |          | Text                                                                                                |
| 25  | Số tủ khóa             |          | Text                                                                                                |
| 26  | Ghi chú                |          | Text area                                                                                           |
| 27  | Lương KPI              |          | Số (tính tự động từ Lương cơ bản × Mức KPI)                                                         |


> **Lưu ý:** Trước khi thêm nhân viên, cần đảm bảo đã tạo **Vị trí** (tab Quản lý vị trí) và **Cấp độ** (tab Quản lý cấp độ & lương) để có thể gán cho nhân viên. Nhân viên cũng cần có tài khoản user (do Quản trị viên tạo trong tab Quản lý user) để lấy Họ tên và Email.

#### Hành động trong bảng nhân viên

- **Xem chi tiết**: Mở modal xem đầy đủ 27 trường.
- **Chỉnh sửa**: Mở form sửa thông tin.
- **Xóa**: Xác nhận trước khi xóa.

### 3.2 Quản lý vị trí (PositionManagement)

**Truy cập:** `/quality/personnel` → tab **"Quản lý vị trí"** (chỉ Quản trị viên, Trưởng phòng)

#### Form tạo / sửa vị trí — 3 trường


| #   | Trường     | Bắt buộc | Ghi chú                               |
| --- | ---------- | -------- | ------------------------------------- |
| 1   | Mã vị trí  | ✅        | Text (mã duy nhất, VD: VT-001)        |
| 2   | Tên vị trí | ✅        | Text (VD: Trưởng phòng, Nhân viên QC) |
| 3   | Mô tả      |          | Text area                             |


#### Cột bảng danh sách

Mã vị trí · Tên vị trí · Mô tả · Hành động (Xem / Sửa / Xóa)

#### Bộ lọc

- Tìm kiếm theo mã hoặc tên vị trí
- Lọc theo tên vị trí

> **Quan trọng:** Vị trí phải được tạo trước khi gán cho nhân viên và trước khi tạo trách nhiệm.

### 3.3 Quản lý cấp độ & lương (PositionLevelManagement)

**Truy cập:** `/quality/personnel` → tab **"Quản lý cấp độ & lương"** (chỉ Quản trị viên, Trưởng phòng)

Mỗi vị trí có nhiều cấp độ (bậc lương). Chọn vị trí trước, rồi quản lý các cấp độ của vị trí đó.

#### Form tạo / sửa cấp độ — 3 trường


| #   | Trường       | Bắt buộc | Ghi chú                         |
| --- | ------------ | -------- | ------------------------------- |
| 1   | Cấp độ       | ✅        | Text (VD: Junior, Senior, Lead) |
| 2   | Lương cơ bản | ✅        | Số tiền (VNĐ)                   |
| 3   | Lương KPI    | ✅        | Số tiền (VNĐ)                   |


#### Cột bảng danh sách

Cấp độ · Lương cơ bản · Lương KPI · Hành động (Xem / Sửa / Xóa)

> **Quan trọng:** Phải tạo vị trí trước (tab Quản lý vị trí), sau đó mới tạo cấp độ cho vị trí đó.

### 3.4 Danh sách trách nhiệm (ResponsibilityManagement)

**Truy cập:** `/quality/personnel` → tab **"Danh sách trách nhiệm"** (chỉ Quản trị viên, Trưởng phòng)

Mỗi vị trí có nhiều trách nhiệm. Chọn vị trí trước, rồi quản lý trách nhiệm của vị trí đó. Trách nhiệm được dùng làm tiêu chí đánh giá KPI nhân viên.

#### Form tạo / sửa trách nhiệm — 3 trường


| #   | Trường          | Bắt buộc | Ghi chú                                                       |
| --- | --------------- | -------- | ------------------------------------------------------------- |
| 1   | Tên trách nhiệm | ✅        | Text (VD: Kiểm tra chất lượng đầu vào)                        |
| 2   | Mô tả           |          | Text area                                                     |
| 3   | Tỷ trọng (%)    | ✅        | Số (trọng số trong đánh giá KPI, tổng các trách nhiệm = 100%) |


#### Cột bảng danh sách

Tên trách nhiệm · Mô tả · Tỷ trọng (%) · Hành động (Xem / Sửa / Xóa)

> **Quan trọng:** Trách nhiệm phải được tạo cho vị trí trước khi đánh giá KPI nhân viên ở vị trí đó. Nếu chưa có trách nhiệm, đánh giá sẽ không có tiêu chí để chấm điểm.

### 3.5 Đánh giá nhân viên (EmployeeEvaluationManagement)

**Truy cập:** `/quality/personnel` → tab **"Đánh giá nhân viên"**

#### Bộ lọc


| Bộ lọc              | Loại     | Tùy chọn                                              |
| ------------------- | -------- | ----------------------------------------------------- |
| Tháng               | Dropdown | Tháng 1 – 12                                          |
| Năm                 | Dropdown | 5 năm (năm hiện tại ±2)                               |
| Trạng thái đánh giá | Dropdown | "Đã đánh giá" / "Chưa đánh giá"                       |
| Tìm kiếm            | Văn bản  | Placeholder: "Tìm kiếm theo mã hoặc tên nhân viên..." |


#### Nút header


| Nút              | Hành động                                                           |
| ---------------- | ------------------------------------------------------------------- |
| **Tạo đánh giá** | Tạo chu kỳ đánh giá cho tất cả nhân viên ACTIVE trong tháng đã chọn |


#### Cột bảng danh sách


| Cột           | Nội dung                                            |
| ------------- | --------------------------------------------------- |
| MNV           | Mã nhân viên                                        |
| Tên NV        | Họ tên nhân viên                                    |
| Vị trí        | Chức danh                                           |
| % Tự đánh giá | Điểm tự đánh giá (VD: 85.0%)                        |
| % Cấp trên 1  | Điểm từ cấp trên trực tiếp                          |
| % Cấp trên 2  | Điểm từ cấp trên thứ 2                              |
| Hành động     | Nút **Xem** (mắt) — chỉ hiển thị nếu đã có đánh giá |


#### Chi tiết đánh giá (modal xem)

Mỗi dòng trong bảng chi tiết gồm:


| Cột                 | Nội dung                    |
| ------------------- | --------------------------- |
| STT                 | Số thứ tự                   |
| Trách nhiệm         | Tên trách nhiệm + mô tả phụ |
| Tỷ trọng (%)        | Trọng số của trách nhiệm    |
| Cá nhân tự đánh giá | Điểm tự chấm (x.x%)         |
| Cấp trên 1          | Điểm cấp trên 1 chấm        |
| Cấp trên 2          | Điểm cấp trên 2 chấm        |


> **Quy trình đánh giá:**
>
> 1. Tổ trưởng hoặc Trưởng phòng nhấn "Tạo đánh giá" → hệ thống tạo bản ghi cho tất cả nhân viên ACTIVE
> 2. Nhân viên tự đánh giá qua form **Tự đánh giá** từ Dashboard cá nhân
> 3. Cấp trên 1 (Tổ trưởng) chấm điểm
> 4. Cấp trên 2 (Trưởng phòng) chấm điểm cuối cùng
>
> **Điều kiện:** Nhân viên phải có vị trí đã gán trách nhiệm. Nếu vị trí chưa có trách nhiệm → không có tiêu chí đánh giá.

### 3.6 Bảng tính lương (PayrollManagement)

**Truy cập:** `/quality/personnel` → tab **"Bảng tính lương"**

#### Các trường trong bảng lương


| Trường                     | Mô tả                                     |
| -------------------------- | ----------------------------------------- |
| Tháng / Năm                | Kỳ tính lương                             |
| Lương cơ bản               | Mức lương hợp đồng                        |
| Lương KPI                  | Thưởng theo hiệu suất                     |
| Phụ cấp chức vụ            | Phụ cấp theo vị trí                       |
| Phụ cấp khác               | Phụ cấp bổ sung                           |
| Tổng thu nhập              | Tổng trước khấu trừ                       |
| BHXH                       | Bảo hiểm xã hội                           |
| BHYT                       | Bảo hiểm y tế                             |
| BHTN                       | Bảo hiểm thất nghiệp                      |
| Thuế TNCN                  | Thuế thu nhập cá nhân                     |
| Khấu trừ KPI               | Phạt hiệu suất (nếu có)                   |
| Khấu trừ ngày nghỉ         | Trừ lương ngày vắng                       |
| Tổng khấu trừ              | Tổng các khoản trừ                        |
| Số ngày làm                | Thực tế ngày làm việc                     |
| Số ngày nghỉ               | Số ngày vắng                              |
| Giờ OT                     | Số giờ làm thêm                           |
| Tiền OT                    | Lương làm thêm = Giờ OT × Giá tiền OT/giờ |
| Số ngày công chuẩn / tháng | Chuẩn ngày công                           |
| Giá tiền OT (₫/giờ)        | Đơn giá OT (cấu hình thủ công)            |


> **Lưu ý:** Bảng lương lấy dữ liệu từ: lương cơ bản (hồ sơ nhân viên), điểm danh (tab Điểm danh), đánh giá KPI (tab Đánh giá). Trưởng phòng hoặc Quản trị viên xác nhận trước khi chốt lương.

### 3.7 Bảng điểm danh nhân viên (AttendanceManagement)

**Truy cập:** `/quality/personnel` → tab **"Bảng điểm danh nhân viên"**

#### Bộ lọc


| Bộ lọc        | Loại        | Ghi chú                                          |
| ------------- | ----------- | ------------------------------------------------ |
| Ngày bắt đầu  | Date picker | Mặc định: 30 ngày trước                          |
| Ngày kết thúc | Date picker | Mặc định: hôm nay                                |
| Trạng thái    | Dropdown    | Đúng giờ / Muộn / Vắng mặt / Nghỉ phép / Tăng ca |
| Tìm kiếm      | Văn bản     | Tìm theo mã NV hoặc tên NV                       |


#### Nút header


| Nút            | Hành động                                       |
| -------------- | ----------------------------------------------- |
| **Cài đặt ca** | Mở modal cài đặt ca làm việc (giờ vào/ra chuẩn) |
| **Xuất Excel** | Xuất danh sách điểm danh ra file Excel          |
| **Thêm mới**   | Mở form tạo bản ghi điểm danh thủ công          |


#### Trạng thái điểm danh (5 trạng thái)


| Giá trị   | Nhãn hiển thị | Màu        |
| --------- | ------------- | ---------- |
| Đúng giờ  | Đúng giờ      | Xanh lá    |
| Muộn      | Muộn          | Vàng       |
| Vắng mặt  | Vắng mặt      | Đỏ         |
| Nghỉ phép | Nghỉ phép     | Tím        |
| Tăng ca   | Tăng ca       | Xanh dương |


#### Form thêm / sửa điểm danh


| #   | Trường         | Bắt buộc | Ghi chú                                                 |
| --- | -------------- | -------- | ------------------------------------------------------- |
| 1   | Mã nhân viên   | ✅        | Nhập mã NV → hệ thống tự hiển thị tên                   |
| 2   | Ngày điểm danh | ✅        | Date picker (mặc định hôm nay)                          |
| 3   | Giờ vào        |          | Time picker (HH:mm)                                     |
| 4   | Giờ ra         |          | Time picker (HH:mm)                                     |
| 5   | Trạng thái     | ✅        | Dropdown: PRESENT / LATE / ABSENT / ON_LEAVE / OVERTIME |
| 6   | Ghi chú        |          | Text                                                    |


#### Cột bảng danh sách


| Cột           | Nội dung                                  |
| ------------- | ----------------------------------------- |
| STT           | Số thứ tự                                 |
| Mã NV         | Mã nhân viên                              |
| Tên nhân viên | Họ tên                                    |
| Vị trí        | Chức danh                                 |
| Ngày          | Ngày điểm danh                            |
| Giờ vào       | Danh sách giờ check-in (có thể nhiều lần) |
| Giờ ra        | Danh sách giờ check-out                   |
| Số giờ làm    | Tổng giờ làm việc                         |
| Trạng thái    | Badge màu                                 |
| Ghi chú       | Ghi chú                                   |
| Hành động     | Sửa / Xóa                                 |


> **Lưu ý:** Điểm danh có thể được ghi nhận tự động qua hệ thống nhận diện khuôn mặt (Face Attendance) hoặc thêm thủ công bởi Tổ trưởng trở lên. Một nhân viên có thể có nhiều lần check-in/check-out trong ngày.

### 3.8 Danh sách đơn nghỉ phép (LeaveRequestManagement)

**Truy cập:** `/quality/personnel` → tab **"Danh sách đơn nghỉ phép"**

#### Loại nghỉ phép (6 loại)


| Giá trị         | Nhãn hiển thị   |
| --------------- | --------------- |
| Nghỉ phép năm   | Nghỉ phép năm   |
| Nghỉ ốm         | Nghỉ ốm         |
| Nghỉ việc riêng | Nghỉ việc riêng |
| Nghỉ thai sản   | Nghỉ thai sản   |
| Nghỉ khẩn cấp   | Nghỉ khẩn cấp   |
| Nghỉ bù         | Nghỉ bù         |


#### Trạng thái đơn nghỉ phép (3 trạng thái)


| Giá trị   | Nhãn hiển thị | Màu badge |
| --------- | ------------- | --------- |
| Chờ duyệt | Chờ duyệt     | Vàng      |
| Đã duyệt  | Đã duyệt      | Xanh lá   |
| Từ chối   | Từ chối       | Đỏ        |


#### Bộ lọc


| Bộ lọc     | Loại     | Tùy chọn                       |
| ---------- | -------- | ------------------------------ |
| Trạng thái | Dropdown | Chờ duyệt / Đã duyệt / Từ chối |
| Loại nghỉ  | Dropdown | 6 loại nghỉ phép               |
| Tìm kiếm   | Văn bản  | Tìm theo mã đơn, tên nhân viên |


#### Nút header


| Nút            | Hành động                                  |
| -------------- | ------------------------------------------ |
| **Xuất Excel** | Xuất danh sách đơn nghỉ phép ra file Excel |


#### Cột bảng danh sách


| Cột        | Nội dung                        |
| ---------- | ------------------------------- |
| Mã đơn     | Mã đơn nghỉ phép (chữ xanh đậm) |
| Nhân viên  | Họ tên + mã NV                  |
| Loại nghỉ  | Loại nghỉ phép                  |
| Thời gian  | Từ ngày – đến ngày              |
| Trạng thái | Badge màu                       |
| Ngày tạo   | Ngày nộp đơn                    |
| Thao tác   | Xem / Duyệt / Từ chối           |


#### Quy trình duyệt đơn nghỉ phép

1. Nhân viên tạo đơn nghỉ phép (từ Dashboard cá nhân hoặc tab này) → trạng thái Chờ duyệt
2. Tổ trưởng / Trưởng phòng / Quản trị viên xem đơn và chọn:
  - **Duyệt**: Đơn chuyển sang Đã duyệt
  - **Từ chối**: Phải nhập lý do từ chối → đơn chuyển sang Từ chối
3. Nhân viên xem kết quả duyệt trong danh sách đơn của mình

> **Lưu ý:** Khi từ chối đơn nghỉ phép, bắt buộc phải nhập lý do. Không thể từ chối mà không có lý do.

### 3.9 Quản lý user (UserManagement)

**Truy cập:** `/quality/personnel` → tab **"Quản lý user"** (chỉ Quản trị viên)

Tạo và quản lý tài khoản đăng nhập hệ thống. Mỗi nhân viên cần có 1 tài khoản user để đăng nhập.

> **Quan trọng:** Tài khoản user phải được tạo TRƯỚC khi tạo hồ sơ nhân viên, vì form nhân viên lấy Họ tên và Email từ user.

---

## 4. Phòng CL Quy trình

Đường dẫn: `/quality/process`

Trang gồm 3 tab:


| Tab           | Tên hiển thị        | Mô tả                                  |
| ------------- | ------------------- | -------------------------------------- |
| `processList` | Danh sách quy trình | Quản lý quy trình sản xuất             |
| `orderList`   | Danh sách đơn hàng  | Xem đơn hàng liên quan đến quy trình   |
| `inspection`  | Kiểm tra nội bộ     | Ghi nhận vi phạm / kiểm tra chất lượng |


### 4.1 Quản lý Quy trình (ProcessManagement)

**Truy cập:** `/quality/process` → tab **"Danh sách quy trình"**

Tạo và quản lý quy trình sản xuất có cấu trúc phân đoạn.

#### Form tạo quy trình


| #   | Trường         | Bắt buộc | Ghi chú                                                      |
| --- | -------------- | -------- | ------------------------------------------------------------ |
| 1   | MSNV           | ✅        | Mã số nhân viên phụ trách                                    |
| 2   | Tên nhân viên  | ✅        | Tên người tạo quy trình                                      |
| 3   | Tên quy trình  | ✅        | Tên định danh                                                |
| 4   | Loại quy trình | ✅        | `Sản xuất` / `Kiểm tra` / `Đóng gói` / `Vận chuyển` / `Khác` |


#### Phân đoạn (Sections)

Mỗi quy trình có một hoặc nhiều phân đoạn. Nhấn **"+ THÊM PHÂN ĐOẠN"** để thêm bước mới.


| Trường             | Ghi chú                               |
| ------------------ | ------------------------------------- |
| Tên phân đoạn      | Tên bước trong quy trình              |
| Nội dung công việc | Mô tả chi tiết thao tác cần thực hiện |


#### Chi phí trong phân đoạn (Cost Items)

Mỗi phân đoạn có thể thêm nhiều khoản chi phí. Nhấn **"+ Thêm chi phí"** để thêm.


| Trường       | Ghi chú                                 |
| ------------ | --------------------------------------- |
| Loại chi phí | `Nhân công` / `Vật tư`                  |
| Tên chi phí  | Tên khoản chi (VD: NV Vận hành máy rửa) |
| DVT          | Định mức (số lượng)                     |
| Đơn vị tính  | `Người` / `Kg` / `Cái` / nhập tự do     |


#### Cột bảng danh sách quy trình

MSNV · Tên nhân viên · Tên quy trình · Loại quy trình · Hiển thị (Ẩn/Hiện) · Ngày tạo · Ngày cập nhật · Hành động (Xem / Sửa / Xóa)

#### Nút hành động form

- **Duyệt quy trình**: Phê duyệt quy trình
- **Chỉnh sửa**: Quay lại chỉnh sửa
- **Tạo quy trình**: Lưu quy trình mới

### 4.2 Danh sách đơn hàng (OrderManagement)

**Truy cập:** `/quality/process` → tab **"Danh sách đơn hàng"**

Hiển thị danh sách đơn hàng liên quan đến quy trình sản xuất. Dùng component OrderManagement chung (giống bộ phận tổng hợp) nhưng ở chế độ chỉ xem, giúp phòng chất lượng theo dõi tiến độ đơn hàng.

---

## 5. Kiểm tra nội bộ (InternalInspectionManagement)

**Truy cập:** `/quality/process` → tab **"Kiểm tra nội bộ"**

### 5.1 Bộ lọc


| Bộ lọc         | Loại     | Tùy chọn                                                           |
| -------------- | -------- | ------------------------------------------------------------------ |
| Tháng          | Dropdown | Tháng 1 – 12                                                       |
| Năm            | Dropdown | 5 năm gần nhất                                                     |
| Mức độ vi phạm | Dropdown | "Quy định" / "Quy phạm quản lý" / "Khác"                           |
| Người kiểm tra | Văn bản  | Placeholder: "Lọc người kiểm tra..."                               |
| Mã vi phạm     | Văn bản  | Placeholder: "Lọc mã vi phạm..."                                   |
| Tìm kiếm tổng  | Văn bản  | Placeholder: "Tìm kiếm mã kiểm tra, mã vi phạm, người kiểm tra..." |


### 5.2 Nút header


| Nút            | Hành động                    |
| -------------- | ---------------------------- |
| **Xuất Excel** | Xuất danh sách ra file Excel |
| **Thêm mới**   | Mở form tạo kiểm tra mới     |


### 5.3 Cột bảng danh sách


| Cột              | Nội dung                                |
| ---------------- | --------------------------------------- |
| STT              | Số thứ tự                               |
| Mã kiểm tra      | Mã định danh                            |
| Ngày kiểm tra    | Ngày thực hiện                          |
| Mã vi phạm       | Mã vi phạm                              |
| Nội dung vi phạm | Tóm tắt nội dung (rút gọn)              |
| Mức độ           | Mức độ vi phạm                          |
| Người kiểm tra   | Tên người thực hiện                     |
| Trạng thái       | Badge màu                               |
| Thao tác         | Nút **Sửa** (bút) + **Xóa** (thùng rác) |


### 5.4 Form tạo / chỉnh sửa kiểm tra


| Trường               | Bắt buộc | Loại nhập            | Ghi chú                                                 |
| -------------------- | -------- | -------------------- | ------------------------------------------------------- |
| Ngày kiểm tra        |          | Chọn ngày            | Mặc định hôm nay                                        |
| Mã kế hoạch kiểm tra |          | Văn bản              |                                                         |
| Mã vi phạm           |          | Văn bản              |                                                         |
| Mức độ vi phạm       |          | Dropdown             | "-- Chọn --" / "Quy định" / "Quy phạm quản lý" / "Khác" |
| Loại vi phạm         |          | Văn bản              |                                                         |
| Người kiểm tra       |          | Văn bản              |                                                         |
| Nội dung vi phạm     |          | Văn bản dài (2 dòng) | Chiếm toàn bộ chiều rộng                                |
| Mô tả chi tiết       |          | Văn bản dài (2 dòng) | Chiếm toàn bộ chiều rộng                                |
| Trạng thái           |          | Dropdown             | "Chờ xử lý" / "Đã xác nhận" / "Đã đóng"                 |


**Nút:** "Lưu" / "Hủy"

### 5.5 Trạng thái kiểm tra


| Giá trị     | Nhãn        | Màu badge  |
| ----------- | ----------- | ---------- |
| Chờ duyệt   | Chờ xử lý   | Vàng       |
| Đã xác nhận | Đã xác nhận | Xanh dương |
| Đã đóng     | Đã đóng     | Xanh lá    |


---

## 6. Phụ thuộc liên phòng ban (Cross-department Dependencies)


| Dữ liệu cần                                           | Nguồn                                        | Cách lấy                                        |
| ----------------------------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| Tài khoản user (để tạo nhân viên)                     | Quản trị viên tạo trong tab Quản lý user     | Phải tạo user trước → mới tạo được nhân viên    |
| Vị trí (để gán cho nhân viên)                         | Tab Quản lý vị trí (Quản trị viên/DEPT_HEAD) | Tạo vị trí trước → gán cho nhân viên            |
| Cấp độ (để gán cho nhân viên)                         | Tab Quản lý cấp độ & lương                   | Tạo cấp độ cho vị trí trước → gán cho nhân viên |
| Trách nhiệm (để đánh giá KPI)                         | Tab Danh sách trách nhiệm                    | Tạo trách nhiệm cho vị trí → mới đánh giá được  |
| Sản phẩm quốc tế (hiển thị trong dashboard quy trình) | Bộ phận thu mua tạo sản phẩm                 | Dữ liệu tự động lấy từ DB                       |
| Đơn hàng (tab Danh sách đơn hàng)                     | Bộ phận tổng hợp tạo đơn hàng                | Dữ liệu tự động lấy từ DB                       |


**Thứ tự thiết lập ban đầu (bắt buộc):**

1. Quản trị viên tạo tài khoản user
2. Tạo vị trí (tab Quản lý vị trí)
3. Tạo cấp độ cho vị trí (tab Quản lý cấp độ & lương)
4. Tạo trách nhiệm cho vị trí (tab Danh sách trách nhiệm)
5. Tạo hồ sơ nhân viên (tab Danh sách nhân viên) — gán user, vị trí, cấp độ
6. Giờ mới có thể: đánh giá KPI, tính lương, điểm danh

---

## 7. Bảng leo thang (Escalation)


| Tình huống                                     | Cấp xử lý                    | Thời hạn           |
| ---------------------------------------------- | ---------------------------- | ------------------ |
| Nhân viên không đạt KPI 2 tháng liên tiếp      | Tổ trưởng → Trưởng phòng     | 3 ngày làm việc    |
| Kiểm tra nội bộ phát hiện vi phạm nghiêm trọng | Trưởng phòng → Quản trị viên | Ngay lập tức       |
| Quy trình không có người phụ trách             | Trưởng phòng                 | 1 ngày làm việc    |
| Hồ sơ nhân viên thiếu thông tin bắt buộc       | Tổ trưởng                    | 2 ngày làm việc    |
| Xung đột lịch nghỉ phép ảnh hưởng sản xuất     | Trưởng phòng → Quản trị viên | 1 ngày làm việc    |
| Điểm danh bất thường (vắng không phép)         | Tổ trưởng → Trưởng phòng     | 1 ngày làm việc    |
| Đơn nghỉ phép chờ duyệt quá 3 ngày             | Trưởng phòng                 | Ngay khi phát hiện |


---

## 8. FAQ

**Q1: Làm thế nào để thêm nhân viên mới?**
Trước tiên cần có tài khoản user (Quản trị viên tạo trong tab Quản lý user). Sau đó vào tab **Danh sách nhân viên** → nhấn **Thêm mới** → điền các trường bắt buộc (Mã NV, Họ tên, Email, Ngày vào làm, Lương cơ bản) → gán Vị trí và Cấp độ (nếu đã tạo) → nhấn **Lưu**.

**Q2: Tôi không tìm thấy nhân viên trong dropdown khi tạo đánh giá?**
Nhân viên phải có trạng thái Đang làm và đã được tạo hồ sơ đầy đủ. Ngoài ra, vị trí của nhân viên phải có trách nhiệm đã gán (tab Danh sách trách nhiệm) để có tiêu chí đánh giá.

**Q3: Tại sao không thể tạo đánh giá KPI?**
Kiểm tra: (1) Nhân viên có trạng thái ACTIVE không? (2) Nhân viên đã được gán vị trí chưa? (3) Vị trí đó đã có trách nhiệm chưa? Nếu thiếu bất kỳ điều kiện nào, cần bổ sung trước.

**Q4: Làm sao tạo quy trình có nhiều bước?**
Trong form tạo quy trình, nhấn **"+ THÊM PHÂN ĐOẠN"** để thêm bước mới. Mỗi phân đoạn có thể thêm nhiều khoản chi phí (Nhân công / Vật tư) bằng nút **"+ Thêm chi phí"**.

**Q5: Tôi không thấy tab Quản lý user / Quản lý vị trí, tại sao?**

- Tab **Quản lý user** chỉ hiển thị với role Quản trị viên.
- Tab **Quản lý vị trí**, **Quản lý cấp độ & lương**, **Danh sách trách nhiệm** chỉ hiển thị với Quản trị viên hoặc Trưởng phòng.
- Nếu bạn là Tổ trưởng hoặc Nhân viên, các tab này bị ẩn.

**Q6: Giá tiền OT được tính như thế nào?**
Giá tiền OT (₫/giờ) được cấu hình thủ công trong bảng lương. Tổng tiền OT = Giờ OT × Giá tiền OT/giờ. Trưởng phòng hoặc Quản trị viên xác nhận trước khi chốt lương.

**Q7: Làm sao duyệt đơn nghỉ phép?**
Vào tab **Danh sách đơn nghỉ phép** → tìm đơn có trạng thái "Chờ duyệt" → nhấn nút **Duyệt** (tick xanh) để phê duyệt, hoặc nhấn **Từ chối** (X đỏ) → nhập lý do từ chối → xác nhận. Chỉ Tổ trưởng trở lên mới có quyền duyệt.

**Q8: Điểm danh tự động hoạt động như thế nào?**
Hệ thống nhận diện khuôn mặt (Face Attendance) tự động ghi nhận giờ vào/ra khi nhân viên quét mặt. Ngoài ra, Tổ trưởng trở lên có thể thêm/sửa điểm danh thủ công trong tab Bảng điểm danh.

**Q9: Thứ tự thiết lập hệ thống nhân sự ban đầu là gì?**

1. Quản trị viên tạo tài khoản user → 2. Tạo vị trí → 3. Tạo cấp độ cho vị trí → 4. Tạo trách nhiệm cho vị trí → 5. Tạo hồ sơ nhân viên (gán user + vị trí + cấp độ) → 6. Sau đó mới đánh giá KPI, tính lương, điểm danh được.

**Q10: Loại quy trình có những giá trị nào?**
5 loại: Sản xuất, Kiểm tra, Đóng gói, Vận chuyển, Khác. Dashboard Phòng CL Quy trình hiển thị số lượng quy trình theo từng loại.

**Q11: Khi nào cần dùng "Cài đặt ca" trong điểm danh?**
Nút "Cài đặt ca" dùng để thiết lập giờ vào/ra chuẩn cho ca làm việc. Hệ thống dựa vào cài đặt này để xác định nhân viên đi muộn (LATE) hay đúng giờ (PRESENT).

**Q12: Tôi là Nhân viên, tôi có thể làm gì trong bộ phận chất lượng?**
Bạn có thể: xem danh sách nhân viên, xem đánh giá (và tự đánh giá từ Dashboard), xem bảng lương của mình, xem điểm danh, tạo và xem đơn nghỉ phép, xem quy trình. Bạn không thể: thêm/sửa/xóa nhân viên, quản lý vị trí/cấp độ/trách nhiệm, chấm điểm đánh giá cho người khác, thêm điểm danh, duyệt đơn nghỉ phép, kiểm tra nội bộ.