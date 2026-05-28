# Quy trình hướng dẫn — Bộ phận Kỹ thuật

## 1. Phòng QLHTM (`/technical/quality`)

### 1.1 Danh sách hệ thống máy (tab DS Hệ thống máy)

#### Xem danh sách

1. Vào **Phòng QLHTM** → tab **Danh sách hệ thống máy**
2. Danh sách hệ thống máy theo khu vực

#### Thêm hệ thống máy mới

1. Nhấn **"Thêm hệ thống máy"**


| Trường               | Bắt buộc | Ghi chú |
| -------------------- | -------- | ------- |
| Tên hệ thống         | ✅        |         |
| Mã hệ thống          | ✅        |         |
| Khu vực              | ✅        |         |
| Vị trí               | ✅        |         |
| Thông số kỹ thuật    |          |         |
| Ngày bảo trì định kỳ |          |         |


1. Nhấn **"Lưu"**

#### Sửa / Xóa

- **Sửa**: Nhấn icon Sửa
- **Xóa**: Nhấn icon Xóa → xác nhận (chỉ ADMIN/DEPARTMENT_HEAD)

---

### 1.2 Báo cáo hoạt động máy (tab Báo cáo HĐ máy)

#### Tạo báo cáo

1. Nhấn **"Thêm báo cáo"**


| Trường            | Bắt buộc | Ghi chú           |
| ----------------- | -------- | ----------------- |
| Ngày              | ✅        |                   |
| Hệ thống máy      | ✅        | Chọn từ danh sách |
| Số giờ hoạt động  | ✅        |                   |
| Số giờ ngưng      | ✅        |                   |
| Nguyên nhân ngưng |          | Nếu có ngưng máy  |
| Ghi chú           |          |                   |


1. Nhấn **"Lưu"** → admin + kỹ thuật nhận thông báo nếu có máy ngưng

---

### 1.3 Yêu cầu sửa chữa (tab Yêu cầu sửa chữa)

#### Xem danh sách YC-SC

- Danh sách yêu cầu sửa chữa từ các bộ phận
- Các trạng thái: Chờ tiếp nhận → Đang xử lý → Hoàn thành → Từ chối

#### Tiếp nhận YC-SC

1. Nhấn **"Tiếp nhận"** trên YC-SC
2. Phân công kỹ thuật viên
3. Cập nhật trạng thái → **Đang xử lý**

#### Xử lý và hoàn thành

1. Kỹ thuật viên sửa chữa xong
2. Nhấn **"Hoàn thành"**
3. Nhập kết quả, thời gian thực hiện, vật tư đã dùng
4. Nhấn **"Lưu"**

> **Lưu ý:** Mọi cập nhật trạng thái YC-SC đều gửi thông báo đến bộ phận kỹ thuật + admin.

---

### 1.4 Nghiệm thu bàn giao (tab Nghiệm thu bàn giao)

#### Tạo phiếu nghiệm thu

1. Nhấn **"Thêm nghiệm thu"**


| Trường              | Bắt buộc | Ghi chú            |
| ------------------- | -------- | ------------------ |
| Mã nghiệm thu       | ✅        | Tự động sinh       |
| Thiết bị / Hệ thống | ✅        | Chọn từ danh sách  |
| Người bàn giao      | ✅        |                    |
| Người nhận          | ✅        |                    |
| Ngày bàn giao       | ✅        |                    |
| Kết quả             | ✅        | Đạt / Không đạt    |
| Ghi chú             |          |                    |
| File đính kèm       |          | Hình ảnh, tài liệu |


1. Nhấn **"Lưu"** → người nhận nhận thông báo

#### Xem chi tiết

- Nhấn icon Mắt trên dòng → modal chi tiết nghiệm thu

---

## 2. Phòng cơ-điện

> ⚠️ **Đang phát triển** — chức năng sẽ được cập nhật sau.

---

## 3. Quy trình phối hợp

### 3.1 Luồng Yêu cầu sửa chữa

```
[Nhân viên] Tạo YC-SC (qua Chức năng chung)
    → [Kỹ thuật] Nhận thông báo
    → [Kỹ thuật] Tiếp nhận, phân công
    → [Kỹ thuật] Xử lý
    → [Kỹ thuật] Hoàn thành, cập nhật trạng thái
    → [Nhân viên] Nhận thông báo hoàn thành
```

### 3.2 Luồng báo cáo hoạt động máy

```
[Kỹ thuật] Ghi nhận hoạt động máy hàng ngày
    → Nếu có máy ngưng → thông báo đến kỹ thuật + admin
    → [Kỹ thuật] Xử lý sự cố
    → Cập nhật trạng thái máy
```

### 3.3 Bảo trì định kỳ

1. Theo dõi lịch bảo trì trong tab **DS Hệ thống máy**
2. Tạo phiếu bảo trì khi đến hạn
3. Ghi nhận kết quả bảo trì
4. Cập nhật trạng thái thiết bị

---

## 4. FAQ

**Q1: Làm thế nào để tạo yêu cầu sửa chữa?**  
Vào **Phòng QLHTM** → tab **"Danh sách yêu cầu sửa chữa"** → nhấn **Thêm mới** (hệ thống tự sinh mã yêu cầu) → chọn Tên hệ thống/thiết bị từ dropdown → điền Loại lỗi, Mức độ ưu tiên, Nội dung lỗi → nhấn **Thêm mới**.

**Q2: Mức độ ưu tiên nào được xử lý trước?**  
Thứ tự ưu tiên từ cao đến thấp: **Khẩn cấp → Cao → Trung bình → Thấp**. Yêu cầu "Khẩn cấp" cần xử lý ngay lập tức.

**Q3: Ai tạo biên bản nghiệm thu bàn giao?**  
TEAM_LEAD hoặc DEPARTMENT_HEAD tạo sau khi sửa chữa hoàn thành. EMPLOYEE chỉ có quyền xem, không tạo được nghiệm thu.

**Q4: Báo cáo hoạt động máy khác với thông số vận hành như thế nào?**

- **Báo cáo hoạt động** (Bộ phận kỹ thuật): Ghi nhận số lượng máy hoạt động/ngừng theo vị trí, nguyên nhân ngừng.
- **Thông số vận hành** (Bộ phận sản xuất): Ghi chi tiết nhiệt độ, áp suất, thời gian theo từng giai đoạn chiên/sấy.

**Q5: Có thể lọc yêu cầu sửa chữa theo trạng thái không?**  
Hiện tại bảng hiển thị badge trạng thái nhưng chưa có bộ lọc riêng. Có thể tìm kiếm theo mã yêu cầu hoặc tên thiết bị.

**Q6: Xuất danh sách nghiệm thu bàn giao sang Excel được không?**  
Có. Nhấn nút **Xuất Excel** trên tab "Danh sách nghiệm thu bàn giao".

**Q7: Trạng thái máy "BẢO_TRÌ" ảnh hưởng thế nào đến sản xuất?**  
Máy có trạng thái BẢO_TRÌ được tách khỏi tính toán thành phẩm (chỉ tính máy HOAT_DONG). Cần thông báo cho bộ phận sản xuất biết để điều chỉnh kế hoạch.

**Q8: Tại sao không thấy hệ thống/thiết bị trong dropdown khi tạo yêu cầu sửa chữa?**  
Hệ thống/thiết bị phải được tạo trước tại tab **"Danh sách hệ thống máy"** (tab 3.1). Chỉ ADMIN hoặc DEPARTMENT_HEAD mới có quyền tạo hệ thống mới.

**Q9: Làm thế nào để tạo nghiệm thu bàn giao?**  
Cách nhanh nhất: Vào tab **"Danh sách yêu cầu sửa chữa"** → nhấn nút **Nghiệm thu** (biểu tượng ✓ tím) trên dòng yêu cầu đã sửa xong → chọn **Người nhận** → nhập **Tình trạng sau khi sửa chữa** → nhấn **Tạo nghiệm thu**.

**Q10: Phòng cơ-điện có chức năng gì?**  
Phòng cơ-điện (`/technical/mechanical`) hiện đang trong giai đoạn phát triển, chưa có chức năng hoạt động.

---

## 5. Phụ thuộc liên phòng ban


| Dữ liệu cần                                           | Nguồn                       | Ghi chú                                           |
| ----------------------------------------------------- | --------------------------- | ------------------------------------------------- |
| Danh sách nhân viên (cho Người thực hiện, Người nhận) | Hệ thống quản lý nhân sự    | Dùng chung endpoint `/employees/for-assignment`   |
| Đơn hàng (tab Danh sách đơn hàng)                     | Bộ phận kinh doanh          | Component OrderManagement dùng chung              |
| Thông tin máy móc (cho Bộ phận sản xuất)              | Bộ phận kỹ thuật → Sản xuất | Sản xuất tham chiếu hệ thống máy khi lập kế hoạch |


### Luồng dữ liệu sửa chữa

```
1. Phát hiện lỗi → Tạo Yêu cầu sửa chữa (trạng thái: Chờ xử lý)
2. Phân công kỹ thuật viên → Cập nhật trạng thái: Đang sửa chữa
3. Sửa xong → Cập nhật trạng thái: Hoàn thành
4. Tạo Nghiệm thu bàn giao → Bàn giao thiết bị cho người nhận
```

---

## 6. Lưu ý quan trọng

- **Hệ thống máy là dữ liệu gốc**: Tất cả Báo cáo hoạt động và Yêu cầu sửa chữa đều tham chiếu đến danh sách hệ thống máy. Cần tạo hệ thống máy trước khi sử dụng các tab khác.
- **Phân biệt với Bộ phận sản xuất**: Tab "Quản lý máy móc" (CRUD máy riêng lẻ) và "Thông số vận hành hệ thống" thuộc **Bộ phận sản xuất** (Phòng QLSX), KHÔNG thuộc Bộ phận kỹ thuật.
- **File đính kèm**: Tất cả form đều hỗ trợ upload file (PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG). Form nghiệm thu còn hỗ trợ thêm ZIP, RAR.
- **Xuất Excel**: Tất cả các tab (trừ Đơn hàng) đều có nút "Xuất Excel" để xuất dữ liệu ra file `.xlsx`.

