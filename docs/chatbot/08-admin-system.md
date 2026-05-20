---
department: ADMIN
department_name: "Quản trị hệ thống"
roles: [ADMIN]
access: admin_only
language: vi
---

# Quản trị hệ thống (Admin)

## Cách truy cập

Từ thanh điều hướng bên trái (sidebar):
- **Cài đặt hệ thống**: Nhấn biểu tượng **Cài đặt** (⚙️) ở cuối sidebar (chỉ hiển thị cho tài khoản ADMIN)

## 1. Tổng quan

**ADMIN** là role duy nhất có quyền truy cập trang `/system-settings`. Người dùng ADMIN bypass toàn bộ RBAC thông thường và có quyền thực hiện mọi thao tác trên hệ thống. Guard kiểm tra `isAdmin(user.department)` — nếu không phải ADMIN, hệ thống hiển thị thông báo "Chỉ quản trị viên mới có thể truy cập trang này."

---

## 2. Quyền so sánh

| Chức năng | EMPLOYEE | TEAM_LEAD | DEPARTMENT_HEAD | ADMIN |
|---|---|---|---|---|
| Xem dữ liệu bộ phận | ✅ | ✅ | ✅ | ✅ |
| Tạo/sửa bản ghi | ✅ | ✅ | ✅ | ✅ |
| Xóa bản ghi | ❌ | ❌ | ✅ | ✅ |
| Quản lý người dùng | ❌ | ❌ | ❌ | ✅ |
| Cài đặt hệ thống | ❌ | ❌ | ❌ | ✅ |
| Quản lý chấm công (tất cả) | ❌ | ❌ | ❌ | ✅ |
| Face Admin (`/diemdanh/admin`) | ❌ | ❌ | ❌ | ✅ |
| Xem tất cả bộ phận | ❌ | ❌ | ❌ | ✅ |

---

## 3. Cài đặt hệ thống (`/system-settings`)

Quản lý **theme** và **slogan** hiển thị trên toàn hệ thống.

### 3.1 Theme hệ thống

Ba theme có sẵn:

| ID | Tên | Mô tả | Biểu tượng |
|---|---|---|---|
| `DEFAULT` | Mặc định | Giao diện xanh dương chuyên nghiệp | ABF |
| `TET` | Tết Nguyên Đán | Giao diện đỏ với hoa mai | 🏮 |
| `APR30` | 30/4 - 1/5 | Ngày Giải phóng & Quốc tế Lao động | ⭐ |

Chọn theme bằng cách click vào card → theme được chọn có viền xanh và dấu ✔. Thay đổi có hiệu lực toàn hệ thống ngay sau khi lưu.

### 3.2 Slogan hệ thống

- Slogan hiển thị trên **thanh header** cho tất cả người dùng
- Tối đa **500 ký tự** (bộ đếm ký tự hiển thị dạng `n/500`)
- Nhập slogan → nhấn **Lưu thay đổi** để áp dụng

---

## 4. Quản lý người dùng (tab **Quản lý người dùng**)

### 4.1 Danh sách người dùng

Bảng hiển thị các cột: **Tên · Email · Vai trò · Trạng thái · Ngày tạo · Ngày cập nhật · Bộ phận phụ · Vai trò phụ · Phòng ban phụ · Cấp trên 1 · Cấp trên 2**.

### 4.2 Tạo/sửa người dùng

**Form tạo tài khoản:**

| Trường | Bắt buộc | Giá trị / Ghi chú |
|---|---|---|
| Họ | ✅ | Họ của nhân viên |
| Tên | ✅ | Tên của nhân viên |
| Email | ✅ | Địa chỉ email đăng nhập |
| Mật khẩu | ✅ | Mật khẩu khởi tạo |
| Vai trò | ✅ | `EMPLOYEE · TEAM_LEAD · DEPARTMENT_HEAD · ADMIN` |
| Bộ phận | — | Bộ phận chính |
| Phòng ban | — | Phòng ban trong bộ phận |
| Bộ phận phụ | — | Bộ phận kiêm nhiệm |
| Vai trò phụ | — | `EMPLOYEE · TEAM_LEAD · DEPARTMENT_HEAD` |
| Phòng ban phụ | — | Phòng ban kiêm nhiệm |

### 4.3 Gán role và khóa tài khoản

- **Gán role**: chọn từ dropdown **Vai trò** khi tạo hoặc sửa tài khoản (`EMPLOYEE · TEAM_LEAD · DEPARTMENT_HEAD · ADMIN`)
- **Khóa tài khoản**: cột **Trạng thái** trong bảng danh sách người dùng — nhấn nút **toggle** (công tắc) để chuyển đổi:

| Trạng thái | Mô tả |
|---|---|
| **Hoạt động** | Tài khoản đang sử dụng bình thường |
| **Khóa** | Tài khoản bị vô hiệu hóa, không đăng nhập được |

> Để khóa: tìm người dùng trong bảng → nhấn toggle ở cột Trạng thái → xác nhận. Để mở khóa: thực hiện lại thao tác tương tự.

---

## 5. Quản lý chấm công (tab **Điểm danh**)

### 5.1 Chức năng

- **Xem** toàn bộ bản ghi chấm công của tất cả nhân viên
- **Thêm mới** bản ghi chấm công
- **Sửa** bản ghi hiện có

### 5.2 Form chấm công

| Trường | Ghi chú |
|---|---|
| Mã nhân viên | Mã định danh nhân viên |
| Tên nhân viên | Tên nhân viên |
| Giờ vào | Thời gian vào ca |
| Giờ ra | Thời gian ra ca |
| Trạng thái | Xem bảng bên dưới |
| Ghi chú | Ghi chú bổ sung |

### 5.3 Năm trạng thái chấm công và màu hiển thị

| Giá trị | Nhãn | Màu |
|---|---|---|
| `PRESENT` | Đúng giờ | 🟢 Xanh lá (`text-green-700`) |
| `LATE` | Muộn | 🟡 Vàng (`text-yellow-700`) |
| `ABSENT` | Vắng mặt | 🔴 Đỏ (`text-red-700`) |
| `ON_LEAVE` | Nghỉ phép | 🟣 Tím (`text-purple-700`) |
| `OVERTIME` | Tăng ca | 🔵 Xanh dương (`text-blue-700`) |

### 5.4 Bộ lọc ngày

- **Ngày bắt đầu** — chọn ngày bắt đầu khoảng lọc
- **Ngày kết thúc** — chọn ngày kết thúc khoảng lọc
- Tìm kiếm nhanh theo **mã nhân viên**

---

## 6. Face Admin (`/diemdanh/admin`)

Trang quản lý dữ liệu khuôn mặt nhân viên phục vụ điểm danh tự động bằng nhận diện khuôn mặt.

### 6.1 Sáu tư thế chụp

| # | Tư thế | Hướng dẫn |
|---|---|---|
| 1 | 😐 **Chính diện** | Nhìn thẳng vào camera |
| 2 | ⬅️ **Xoay trái** | Xoay mặt sang trái nhẹ (~30°) |
| 3 | ➡️ **Xoay phải** | Xoay mặt sang phải nhẹ (~30°) |
| 4 | ⬆️ **Ngẩng lên** | Ngẩng đầu lên nhẹ (~20°) |
| 5 | ⬇️ **Cúi xuống** | Cúi đầu xuống nhẹ (~20°) |
| 6 | 😊 **Mỉm cười** | Nhìn thẳng và mỉm cười tự nhiên |

### 6.2 Trạng thái oval

Khung oval trên camera chuyển màu theo trạng thái nhận diện:
- `waiting` — chờ khuôn mặt xuất hiện
- `detecting` — đang phát hiện khuôn mặt
- `wrong-pose` — sai tư thế, cần điều chỉnh
- `stable` — tư thế đúng, đang giữ ổn định
- `flash` — vừa chụp ảnh thành công

### 6.3 Gallery ảnh

- Tìm kiếm nhân viên theo tên hoặc mã NV (placeholder: *Tìm theo tên / mã NV...*)
- Nhấn **Xem gallery** để mở popup ảnh khuôn mặt đã đăng ký của nhân viên
- Dữ liệu gallery được tải on-demand khi mở popup

---

## 7. Thông tin cá nhân (`PersonalInfoModal`)

> Chức năng này dùng được bởi **mọi nhân viên** từ Dashboard — không chỉ riêng ADMIN.

### Ba tab chức năng

| Tab | Nội dung |
|---|---|
| **Cơ bản** | Họ · Tên · Email · Giới tính (MALE/FEMALE/OTHER) · Số điện thoại · Tài khoản ngân hàng · Số tủ cá nhân |
| **Vật lý** | Cân nặng (kg) · Chiều cao (cm) · Size áo (XS/S/M/L/XL/XXL/XXXL) · Size quần (số) · Size giày/dép (số) |
| **Công việc** | Thông tin vai trò, bộ phận, cấp trên — chỉ xem, không chỉnh sửa |

### Lưu ý

- Tab **Cơ bản** và **Vật lý** cho phép chỉnh sửa khi nhấn nút **Sửa**
- Tab **Công việc** chỉ hiển thị thông tin, không chỉnh sửa trực tiếp (do ADMIN quản lý)
- Thay đổi có hiệu lực ngay sau khi nhấn **Lưu**

---

## 8. FAQ

**Q1: Tôi không thể vào `/system-settings`, phải làm gì?**
Trang này chỉ dành cho ADMIN. Kiểm tra role tài khoản — nếu chưa có quyền ADMIN, liên hệ quản trị viên hệ thống.

**Q2: Thay đổi theme có ảnh hưởng tất cả người dùng không?**
Có. Theme và slogan được áp dụng toàn hệ thống ngay khi ADMIN lưu thay đổi.

**Q3: Làm thế nào để khóa một tài khoản nhân viên?**
Vào **Quản lý người dùng** → tìm tài khoản → thay đổi cột **Trạng thái** sang Khóa/Vô hiệu hóa.

**Q4: Có thể gán một nhân viên thuộc nhiều bộ phận không?**
Có. Sử dụng các trường **Bộ phận phụ**, **Vai trò phụ**, **Phòng ban phụ** khi tạo/sửa tài khoản.

**Q5: Dữ liệu Face Admin được dùng ở đâu?**
Khuôn mặt đăng ký tại `/diemdanh/admin` được dùng để nhận diện tự động khi nhân viên điểm danh tại `/diemdanh`.

**Q6: Nhân viên có thể tự cập nhật thông tin cá nhân không?**
Có. Mọi nhân viên đều có thể sửa tab **Cơ bản** và **Vật lý** từ modal Thông tin cá nhân trên Dashboard. Tab **Công việc** chỉ ADMIN mới sửa được.

**Q7: Slogan tối đa bao nhiêu ký tự?**
Tối đa **500 ký tự**. Bộ đếm ký tự hiển thị realtime góc dưới phải của ô nhập slogan.
