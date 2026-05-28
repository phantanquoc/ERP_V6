# Quy trình hướng dẫn — Bộ phận Sản xuất

## 1. Phòng QLSX (`/production/management`)

### 1.1 Quản lý máy móc (tab Máy móc)

#### Xem danh sách máy

1. Vào **Phòng QLSX** → tab **Máy móc**
2. Hiển thị danh sách máy với trạng thái: Hoạt động / Bảo trì / Ngưng

#### Thêm máy mới

> ⚠️ **Quyền:** ADMIN, DEPARTMENT_HEAD, TEAM_LEAD

1. Nhấn **"Thêm máy"**
2. Nhập: Tên máy, Mã máy, Khu vực, Thông số kỹ thuật
3. Nhấn **"Lưu"**

#### Cập nhật trạng thái

- Nhấn Sửa → đổi trạng thái → Lưu

---

### 1.2 Danh sách quy trình (tab DS Quy trình)

1. Xem danh sách quy trình sản xuất
2. **Thêm**: Nhấn **"Thêm quy trình"** → điền Mã, Tên, Mô tả
3. **Xem flowchart**: Nhấn vào quy trình → xem sơ đồ

---

### 1.3 Định mức NVL (tab Định mức NVL)

#### Thêm định mức

1. Nhấn **"Thêm định mức"**
2. Chọn sản phẩm đầu ra
3. Thêm nguyên liệu đầu vào: Tên, Số lượng, Đơn vị
4. Nhập tỉ lệ thu hồi cho từng thành phẩm
5. Nhấn **"Lưu"**

---

### 1.4 Đơn hàng (tab DS Đơn hàng)

#### Xem đơn hàng

- Danh sách đơn hàng từ phòng KD gửi sang
- Cập nhật trạng thái sản xuất và giao hàng

#### Cập nhật tiến độ SX

1. Nhấn **Sửa** trên đơn hàng
2. Cập nhật trạng thái:


| Trạng thái       | Ý nghĩa                       |
| ---------------- | ----------------------------- |
| Chờ lên kế hoạch | Đơn mới, chưa lên kế hoạch SX |
| Chờ sản xuất     | Đã có kế hoạch, chờ sản xuất  |
| Đang sản xuất    | Đang sản xuất                 |
| Chờ giao hàng    | SX xong, chờ giao             |
| Đã lên container | Đã đóng container (XK)        |
| Đang vận chuyển  | Đang trên đường giao          |
| Đã giao cho KH   | Hoàn thành                    |


1. Điền ngày bắt đầu SX, ngày hoàn thành, ngày giao hàng thực tế
2. Nhấn **"Lưu thay đổi"**

---

### 1.5 Đánh giá nguyên liệu (tab Đánh giá NVL)

1. Nhấn **"Thêm đánh giá"**
2. Chọn nguyên liệu, nhập điểm chất lượng, nhận xét
3. Nhấn **"Lưu"**

---

### 1.6 Đánh giá chất lượng (tab Đánh giá CL)

- Đánh giá chất lượng sản phẩm đầu ra
- Nhập điểm, nhận xét, đề xuất cải tiến

---

### 1.7 Báo cáo sản lượng (tab Báo cáo sản lượng)

1. Nhấn **"Thêm báo cáo"**
2. Chọn ngày, máy, sản phẩm
3. Nhập sản lượng thực tế, thời gian hoạt động
4. Nhấn **"Lưu"**

---

## 2. Quản lý kho (`/production/warehouse`)

### 2.1 Quản lý kho (tab Quản lý kho)

#### Thêm kho mới

1. Nhấn **"Thêm kho"**
2. Nhập tên kho, mã kho, địa điểm
3. Nhấn **"Lưu"**

#### Tạo lô hàng

1. Chọn kho → nhấn **"Thêm lô"**
2. Nhập tên lô, ngày sản xuất, hạn dùng
3. Nhấn **"Lưu"**

---

### 2.2 Danh sách hàng hóa (tab DS Hàng hóa)

- Xem tồn kho theo từng kho/lô
- Tìm kiếm theo tên hàng, mã hàng

---

### 2.3 Nhập kho (tab Nhập kho)

#### Tạo phiếu nhập

1. Nhấn **"Thêm phiếu nhập"**


| Trường      | Bắt buộc | Ghi chú                 |
| ----------- | -------- | ----------------------- |
| Kho nhập    | ✅        | Chọn kho                |
| Lô          | ✅        | Chọn lô hoặc tạo lô mới |
| Sản phẩm    | ✅        |                         |
| Số lượng    | ✅        |                         |
| Giá nhập    | ✅        |                         |
| Đơn vị tính | ✅        |                         |
| Ghi chú     |          |                         |


1. Nhấn **"Lưu"** → tồn kho tự động cập nhật

---

### 2.4 Xuất kho (tab Xuất kho)

#### Tạo phiếu xuất

1. Nhấn **"Thêm phiếu xuất"**
2. Chọn kho xuất, lô
3. Chọn sản phẩm, số lượng
4. Nhập mục đích xuất: Sản xuất / Hủy / Trả hàng
5. Nhấn **"Lưu"**

---

### 2.5 Yêu cầu cung cấp (tab YC cung cấp)

#### Xem danh sách YC-CC

- Danh sách yêu cầu cung cấp từ các bộ phận
- Tab có badge đếm số YC-CC đang chờ nhập kho (trạng thái **Đã mua hàng**)

#### Xử lý YC-CC

1. Xem chi tiết YC-CC
2. Cập nhật trạng thái:


| Trạng thái    | Ai thực hiện                      |
| ------------- | --------------------------------- |
| Chưa cung cấp | Kho mới tạo                       |
| Đang xử lý    | Kho đang xử lý                    |
| Đã duyệt mua  | Thu mua duyệt                     |
| Đã mua hàng   | Thu mua báo đã mua (chờ nhập kho) |
| Đã cung cấp   | Kho nhập kho xong                 |


1. Khi nhập kho xong → đổi trạng thái → **Đã cung cấp**

> **Highlight:** Dòng có trạng thái "Đã mua hàng" được tô màu vàng cam để dễ nhận biết cần nhập kho.

---

## 3. Dữ liệu SX (`/production/data`)

### 3.1 Đánh giá nguyên liệu

- Lưu trữ lịch sử đánh giá nguyên liệu đầu vào

### 3.2 Thông số vận hành

- Ghi nhận thông số máy móc trong quá trình SX

### 3.3 Thành phẩm đầu ra

- Theo dõi sản lượng và chất lượng thành phẩm

---

## 4. FAQ

**Q1: Làm thế nào để tạo phiếu nhập kho?**  
Vào **Quản lý kho** → chọn tab **Nhập kho** → nhấn **Thêm mới** → chọn kho, lô hàng, hàng hóa, nhập số lượng → Lưu.

**Q2: Tôi có thể di chuyển sản phẩm giữa các lô không?**  
Có. Vào **Quản lý kho** → chọn sản phẩm trong lô → nhấn icon **Di chuyển sang lô khác** → chọn lô đích.

**Q3: Các loại thành phẩm đầu ra gồm những loại nào?**  
Hệ thống phân loại 8 loại: **A, B, B đầu, C, Vụn lớn, Vụn nhỏ, Phế phẩm, Ướt**. Mỗi loại ghi nhận khối lượng (Kg) và tỉ lệ (%).

**Q4: Thông số vận hành có bao nhiêu giai đoạn?**  
Có **4 giai đoạn**, mỗi giai đoạn ghi nhận Thời gian (phút), Nhiệt độ (°C), Áp suất (mmHg).

**Q5: Quy trình sản xuất khác gì với quy trình mẫu?**  
**Quy trình mẫu** là template có sẵn. **Quy trình sản xuất** là bản cụ thể tạo từ quy trình mẫu, gắn với nhân viên, khối lượng và thời gian thực tế.

**Q6: Ai có thể xóa phiếu nhập/xuất kho?**  
Chỉ **ADMIN** và **DEPARTMENT_HEAD** có quyền xóa.

**Q7: Dữ liệu sản xuất cập nhật theo thời gian thực không?**  
Trang tổng quan tự động tải lại khi vào trang. Có thể nhấn nút **Làm mới** để cập nhật thủ công.

**Q8: Làm thế nào để xuất báo cáo thành phẩm?**  
Vào tab **Dữ liệu SX** → chọn mục **Thành phẩm đầu ra** → sử dụng chức năng xuất Excel nếu có, hoặc xem bảng tổng hợp trực tiếp trên màn hình.

**Q9: Làm thế nào để thêm máy mới vào hệ thống?**  
Vào tab **Quản lý máy móc** → nhấn **"Thêm máy mới"** → điền Tên máy (bắt buộc), chọn Trạng thái → Lưu. Mã máy tự động sinh.

**Q10: Định mức NVL dùng để làm gì?**  
Định mức NVL xác định tỉ lệ nguyên liệu đầu vào và thành phẩm đầu ra. Khi tạo Quy trình sản xuất hoặc Báo cáo sản lượng, hệ thống dùng tỉ lệ thu hồi từ định mức để tự động tính khối lượng thành phẩm kỳ vọng.

**Q11: Báo cáo sản lượng tính chênh lệch như thế nào?**  
Chênh lệch = KL thành phẩm thực tế − KL thành phẩm định mức. Nếu dương (xanh) = vượt kế hoạch. Nếu âm (đỏ) = chưa đạt kế hoạch. KL định mức = Tổng KL nguyên liệu × (Tỉ lệ thu hồi / 100).

**Q12: Phòng QLSX có bao nhiêu tab?**  
Có **10 tab**: Quản lý máy móc, Danh sách quy trình, Danh sách quy trình sản xuất, Danh sách đơn hàng, Định mức NVL, Đánh giá nguyên liệu, Thông số vận hành hệ thống, Thành phẩm đầu ra, Đánh giá chất lượng, Báo cáo sản lượng.

**Q13: Làm thế nào để tạo kho mới?**  
Từ thanh điều hướng bên trái → nhấn **Bộ phận sản xuất** → chọn **Quản lý kho** → vào tab **Quản lý kho** → nhấn **"+ Thêm kho"** → nhập **Tên kho** → nhấn **"Tạo mới"**. Mã kho tự động sinh (KHO001, KHO002...). Không có trường địa chỉ hay người quản lý trong form này.

**Q14: Sau khi tạo kho, làm thế nào để thêm lô hàng?**  
Chọn kho vừa tạo trong thanh tab → nhấn **"Thêm lô"** → nhập **Tên lô** → nhấn **"Tạo mới"**. Sau đó có thể thêm sản phẩm vào lô bằng nút **"Thêm sản phẩm"**.

**Q15: Tạo kho mới nằm ở đâu trong hệ thống? Có phải trong Bộ phận kế toán không?**  
Không. Tạo kho nằm trong **Bộ phận sản xuất** → **Quản lý kho** → tab **Quản lý kho**. Không có chức năng tạo kho trong Bộ phận kế toán hay bất kỳ bộ phận nào khác.

**Q16: Tôi muốn tạo phiếu nhập kho nhưng chưa có kho nào, phải làm gì?**  
Cần tạo kho và lô trước: vào tab **Quản lý kho** → nhấn **"+ Thêm kho"** → tạo kho → nhấn **"Thêm lô"** → tạo lô. Sau đó mới vào tab **Nhập kho** để tạo phiếu nhập.

**Q17: Yêu cầu cung cấp (YC-CC) có bao nhiêu trạng thái?**  
Có 5 trạng thái theo thứ tự: `Chưa cung cấp` → `Đang xử lý` → `Đã duyệt mua` → `Đã mua hàng` → `Đã cung cấp`. Các trạng thái từ "Đang xử lý" trở đi được cập nhật tự động theo tiến trình xử lý từ bộ phận thu mua.

**Q18: Badge đỏ trên tab "Yêu cầu cung cấp" có nghĩa là gì?**  
Badge đỏ hiển thị số lượng YC-CC đang ở trạng thái `Đã mua hàng` — tức là thu mua đã mua xong hàng và đang chờ kho nhập. Khi badge > 0, kho cần vào tab Nhập kho để tạo phiếu nhập cho các lô hàng đó.

**Q19: Kho có nhận thông báo khi thu mua mua xong hàng không?**  
Có. Khi bộ phận thu mua đánh dấu YC-MH là "Hoàn thành", hệ thống tự động gửi thông báo real-time tới tất cả nhân viên kho với nội dung "Yêu cầu cung cấp [mã] đã được phê duyệt". Đồng thời dòng YC-CC tương ứng sẽ highlight vàng cam trong bảng.

**Q20: Kho tạo YC-CC xong thì có cần làm gì thêm không?**  
Không. Sau khi tạo YC-CC và nhấn "Tạo YC mua hàng" để chuyển sang thu mua, kho chỉ cần chờ thông báo. Khi nhận được thông báo "hàng đã mua xong", kho vào tab **Nhập kho** tạo phiếu nhập, sau đó quay lại tab **Yêu cầu cung cấp** đánh dấu `Đã cung cấp`.