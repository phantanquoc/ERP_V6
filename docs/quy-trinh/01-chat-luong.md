# Quy trình hướng dẫn — Bộ phận Chất lượng

## 1. Quản lý nhân viên (tab Quản lý nhân viên)

### 1.1 Thêm nhân viên mới

> ⚠️ **Quyền:** ADMIN, DEPARTMENT_HEAD

1. Vào **Phòng CL Nhân sự** → tab **Quản lý nhân viên**
2. Nhấn **"Thêm nhân viên"**
3. Điền thông tin cơ bản: Mã NV, Họ tên, Giới tính, Ngày sinh, SĐT, Email, Địa chỉ
4. Chọn thông tin công việc: Bộ phận, Phòng ban, Vị trí, Cấp độ, Mức lương
5. Chọn trạng thái: Thử việc / Chính thức / Bán thời gian
6. Nhấn **"Lưu"** → hệ thống tự động tạo tài khoản user để đăng nhập

### 1.2 Chỉnh sửa / Xóa nhân viên

- **Sửa**: Nhấn icon **Sửa** (bút) trên dòng → chỉnh sửa → **"Cập nhật"**
- **Xóa**: Nhấn icon **Xóa** (thùng rác) → xác nhận → chỉ ADMIN/DEPARTMENT_HEAD

### 1.3 Xem thông tin chi tiết

- Nhấn icon **Mắt** trên dòng → modal hiển thị đầy đủ thông tin

---

## 2. Đánh giá nhân viên (tab Đánh giá)

### 2.1 Tạo đánh giá

> ⚠️ **Quyền:** ADMIN, DEPARTMENT_HEAD, TEAM_LEAD

1. Vào **Phòng CL Nhân sự** → tab **Đánh giá**
2. Nhấn **"Tạo đánh giá"**
3. Chọn chu kỳ: Tháng, Năm
4. Chọn nhân viên cần đánh giá
5. Nhập điểm KPI, nhận xét
6. Nhấn **"Lưu"** → nhân viên nhận thông báo tự đánh giá

### 2.2 Luồng đánh giá

1. **TEAM_LEAD/DEPARTMENT_HEAD/ADMIN** tạo đánh giá
2. **Nhân viên** nhận thông báo → vào tự đánh giá
3. **Cấp trên 1** nhận thông báo → đánh giá cấp 1
4. **Cấp trên 2** nhận thông báo → đánh giá cấp 2
5. **Hoàn thành** — nhân viên xem kết quả

---

## 3. Bảng lương (tab Bảng lương)

### 3.1 Tạo bảng lương

> ⚠️ **Quyền:** ADMIN, DEPARTMENT_HEAD

1. Chọn tháng, năm
2. Nhấn **"Tạo bảng lương"** → hệ thống tính lương dựa trên chấm công, KPI
3. Kiểm tra và điều chỉnh nếu cần
4. Nhấn **"Công bố"** → nhân viên nhận thông báo bảng lương

### 3.2 Xem lương

- Nhân viên: Dashboard → thông báo lương → xem chi tiết
- ADMIN/DEPARTMENT_HEAD: Xem tất cả bảng lương trong phòng

---

## 4. Điểm danh (tab Điểm danh)

> ⚠️ **Quyền:** ADMIN, DEPARTMENT_HEAD

1. Xem danh sách chấm công của tất cả nhân viên
2. Bộ lọc: Ngày bắt đầu, Ngày kết thúc, Tìm kiếm theo mã NV
3. **Thêm mới / Sửa** bản ghi chấm công nếu nhân viên quên


| Trạng thái | Màu           | Ý nghĩa   |
| ---------- | ------------- | --------- |
| `PRESENT`  | 🟢 Xanh lá    | Đúng giờ  |
| `LATE`     | 🟡 Vàng       | Muộn      |
| `ABSENT`   | 🔴 Đỏ         | Vắng mặt  |
| `ON_LEAVE` | 🟣 Tím        | Nghỉ phép |
| `OVERTIME` | 🔵 Xanh dương | Tăng ca   |


---

## 5. Quản lý vị trí, cấp độ, trách nhiệm

> ⚠️ **Quyền:** ADMIN, DEPARTMENT_HEAD

- **Vị trí** (Position): tab **Quản lý vị trí** → Thêm/Sửa/Xóa
- **Cấp độ & Lương** (Level): tab **Quản lý cấp bậc** → Thiết lập mức lương theo cấp độ
- **Trách nhiệm** (Responsibility): tab **Quản lý trách nhiệm** → Gán trách nhiệm cho vị trí

---

## 6. Quản lý quy trình (Phòng CL Quy trình)

### 6.1 Danh sách quy trình

1. Vào **Phòng CL Quy trình** → tab **Danh sách quy trình**
2. **Thêm mới**: Nhấn **"Thêm quy trình"** → điền Mã, Tên, Phân loại → **Lưu**
3. **Xem/Sửa**: Nhấn vào quy trình để xem biểu đồ flowchart

### 6.2 Kiểm tra nội bộ

- Tab **Kiểm tra nội bộ** → tạo phiếu kiểm tra, gán người kiểm tra, theo dõi kết quả

---

## 7. FAQ

**Q1: Làm thế nào để thêm nhân viên mới?**  
Trước tiên cần có tài khoản user (ADMIN tạo trong tab Quản lý user). Sau đó vào tab **Danh sách nhân viên** → nhấn **Thêm mới** → điền các trường bắt buộc (Mã NV, Họ tên, Email, Ngày vào làm, Lương cơ bản) → gán Vị trí và Cấp độ (nếu đã tạo) → nhấn **Lưu**.

**Q2: Tôi không tìm thấy nhân viên trong dropdown khi tạo đánh giá?**  
Nhân viên phải có trạng thái `ACTIVE` và đã được tạo hồ sơ đầy đủ. Ngoài ra, vị trí của nhân viên phải có trách nhiệm đã gán (tab Danh sách trách nhiệm) để có tiêu chí đánh giá.

**Q3: Tại sao không thể tạo đánh giá KPI?**  
Kiểm tra: (1) Nhân viên có trạng thái ACTIVE không? (2) Nhân viên đã được gán vị trí chưa? (3) Vị trí đó đã có trách nhiệm chưa? Nếu thiếu bất kỳ điều kiện nào, cần bổ sung trước.

**Q4: Làm sao tạo quy trình có nhiều bước?**  
Trong form tạo quy trình, nhấn **"+ THÊM PHÂN ĐOẠN"** để thêm bước mới. Mỗi phân đoạn có thể thêm nhiều khoản chi phí (Nhân công / Vật tư) bằng nút **"+ Thêm chi phí"**.

**Q5: Tôi không thấy tab Quản lý user / Quản lý vị trí, tại sao?**

- Tab **Quản lý user** chỉ hiển thị với role `ADMIN`.
- Tab **Quản lý vị trí**, **Quản lý cấp độ & lương**, **Danh sách trách nhiệm** chỉ hiển thị với `ADMIN` hoặc `DEPARTMENT_HEAD`.
- Nếu bạn là `TEAM_LEAD` hoặc `EMPLOYEE`, các tab này bị ẩn.

**Q6: Giá tiền OT được tính như thế nào?**  
Giá tiền OT (₫/giờ) được cấu hình thủ công trong bảng lương. Tổng tiền OT = Giờ OT × Giá tiền OT/giờ. DEPARTMENT_HEAD hoặc ADMIN xác nhận trước khi chốt lương.

**Q7: Làm sao duyệt đơn nghỉ phép?**  
Vào tab **Danh sách đơn nghỉ phép** → tìm đơn có trạng thái "Chờ duyệt" → nhấn nút **Duyệt** (tick xanh) để phê duyệt, hoặc nhấn **Từ chối** (X đỏ) → nhập lý do từ chối → xác nhận. Chỉ TEAM_LEAD trở lên mới có quyền duyệt.

**Q8: Điểm danh tự động hoạt động như thế nào?**  
Hệ thống nhận diện khuôn mặt (Face Attendance) tự động ghi nhận giờ vào/ra khi nhân viên quét mặt. Ngoài ra, TEAM_LEAD trở lên có thể thêm/sửa điểm danh thủ công trong tab Bảng điểm danh.

**Q9: Thứ tự thiết lập hệ thống nhân sự ban đầu là gì?**

1. ADMIN tạo tài khoản user → 2. Tạo vị trí → 3. Tạo cấp độ cho vị trí → 4. Tạo trách nhiệm cho vị trí → 5. Tạo hồ sơ nhân viên (gán user + vị trí + cấp độ) → 6. Sau đó mới đánh giá KPI, tính lương, điểm danh được.

**Q10: Loại quy trình có những giá trị nào?**  
5 loại: Sản xuất, Kiểm tra, Đóng gói, Vận chuyển, Khác. Dashboard Phòng CL Quy trình hiển thị số lượng quy trình theo từng loại.

**Q11: Khi nào cần dùng "Cài đặt ca" trong điểm danh?**  
Nút "Cài đặt ca" dùng để thiết lập giờ vào/ra chuẩn cho ca làm việc. Hệ thống dựa vào cài đặt này để xác định nhân viên đi muộn (LATE) hay đúng giờ (PRESENT).

**Q12: Tôi là EMPLOYEE, tôi có thể làm gì trong bộ phận chất lượng?**  
Bạn có thể: xem danh sách nhân viên, xem đánh giá (và tự đánh giá từ Dashboard), xem bảng lương của mình, xem điểm danh, tạo và xem đơn nghỉ phép, xem quy trình. Bạn không thể: thêm/sửa/xóa nhân viên, quản lý vị trí/cấp độ/trách nhiệm, chấm điểm đánh giá cho người khác, thêm điểm danh, duyệt đơn nghỉ phép, kiểm tra nội bộ.