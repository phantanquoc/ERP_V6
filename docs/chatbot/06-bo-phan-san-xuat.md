---
department: DEPT_PRODUCTION
department_name: "Bộ phận sản xuất"
roles: [ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE]
access: department_restricted
language: vi
---

# Bộ phận Sản xuất

## 1. Tổng quan

Hệ thống quản lý sản xuất được chia thành **3 khu vực chức năng** chính:

| Khu vực | Đường dẫn | Mô tả |
|---|---|---|
| **QLSX** (Quản lý sản xuất) | `/production` → tab Phòng QLSX | Lệnh SX, quy trình, thông số vận hành, thành phẩm |
| **Kho** | `/production` → tab Kho | Quản lý kho, lô hàng, phiếu nhập/xuất kho |
| **Dữ liệu SX** | `/production` → tab Dữ liệu SX | Báo cáo thống kê tổng hợp sản xuất |

---

## 2. Quyền truy cập

| Role | Xem | Tạo mới | Sửa | Xóa |
|---|---|---|---|---|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| DEPARTMENT_HEAD | ✅ | ✅ | ✅ | ✅ |
| TEAM_LEAD | ✅ | ✅ | ✅ | ❌ |
| EMPLOYEE | ✅ | ✅ | ❌ | ❌ |

> Tất cả các chức năng trong bộ phận sản xuất chỉ hiển thị với người dùng thuộc `DEPT_PRODUCTION`.

---

## 3. Phòng QLSX

### 3.1 Lệnh sản xuất (Danh sách đơn hàng)

Quản lý các đơn hàng/lệnh sản xuất với trạng thái:
- **Chờ sản xuất** — đơn hàng mới tạo
- **Đang sản xuất** — đang được thực hiện
- **Vận chuyển** — hàng đang giao
- **Đã giao** — hoàn tất

### 3.2 Quy trình sản xuất

**Form tạo quy trình** (`ProductionProcessManagement`):

| Trường | Ghi chú |
|---|---|
| Chọn quy trình mẫu | Dropdown quy trình có sẵn |
| Tên quy trình sản xuất | Nhập tên quy trình |
| Mã NV | Mã nhân viên phụ trách |
| Tên nhân viên | Tên nhân viên phụ trách |
| Khối lượng (Kg) | Khối lượng nguyên liệu đầu vào |
| Thời gian (Ngày) | Thời gian thực hiện |
| Chọn Định mức NVL | Định mức nguyên vật liệu |
| Chọn sản phẩm đầu ra | Sản phẩm thành phẩm mục tiêu |
| Tổng nguyên liệu cần sản xuất (Kg) | Tự động tính |
| Số giờ làm trong 1 ngày | Số giờ làm việc/ngày |

### 3.3 Thông số vận hành hệ thống

**Form thông số** (`SystemOperationManagement`) — theo dõi 4 giai đoạn chiên/sấy:

| Trường chung | Ghi chú |
|---|---|
| Mã chiên | Mã định danh mẻ chiên (bắt buộc) |
| Tên máy | Tên thiết bị sử dụng (bắt buộc) |
| Thời gian chiên | Thời điểm/thời lượng chiên (bắt buộc) |
| Khối lượng đầu vào (kg) | Khối lượng nguyên liệu đưa vào |
| Trạng thái | Trạng thái hiện tại của mẻ |
| Người thực hiện | Nhân viên vận hành (bắt buộc) |
| File đính kèm | Ảnh/tài liệu đính kèm |
| Ghi chú | Ghi chú bổ sung |

**4 giai đoạn — mỗi giai đoạn ghi nhận 3 thông số:**

| Giai đoạn | Thông số |
|---|---|
| Giai đoạn 1 | Thời gian (phút) · Nhiệt độ (°C) · Áp suất (mmHg) |
| Giai đoạn 2 | Thời gian (phút) · Nhiệt độ (°C) · Áp suất (mmHg) |
| Giai đoạn 3 | Thời gian (phút) · Nhiệt độ (°C) · Áp suất (mmHg) |
| Giai đoạn 4 | Thời gian (phút) · Nhiệt độ (°C) · Áp suất (mmHg) |

Trường tổng hợp: **Tổng thời gian sấy** (tự động tính).

### 3.4 Thành phẩm đầu ra

**Form thành phẩm** (`FinishedProductManagement`) — nhập liệu theo mã chiên:

| Loại thành phẩm | Trường khối lượng | Trường tỉ lệ |
|---|---|---|
| **Loại A** | aKhoiLuong (Kg) | aTiLe (%) |
| **Loại B** | bKhoiLuong (Kg) | bTiLe (%) |
| **B đầu** | bDauKhoiLuong (Kg) | bDauTiLe (%) |
| **Loại C** | cKhoiLuong (Kg) | cTiLe (%) |
| **Vụn lớn** | vunLonKhoiLuong (Kg) | vunLonTiLe (%) |
| **Vụn nhỏ** | vunNhoKhoiLuong (Kg) | vunNhoTiLe (%) |
| **Phế phẩm** | phePhamKhoiLuong (Kg) | phePhamTiLe (%) |
| **Ướt** | uotKhoiLuong (Kg) | uotTiLe (%) |

> Hệ thống tự động tính **Tổng khối lượng thành phẩm** và đánh giá min/max theo từng máy.

---

## 4. Quản lý kho

### 4.1 Quản lý kho và lô hàng (`WarehouseManagement`)

- Tạo/xóa **kho** (nhập tên kho)
- Tạo/xóa **lô hàng** trong kho (nhập tên lô)
- Thêm/xóa sản phẩm trong lô
- **Di chuyển sản phẩm** sang lô khác

### 4.2 Phiếu nhập kho (`WarehouseReceiptTab`)

**Bộ lọc danh sách:**

| Cột | Nội dung |
|---|---|
| Ngày nhập | Ngày thực hiện nhập kho |
| Nhân viên thực hiện | Người lập phiếu |
| Kho | Kho nhận hàng |
| Lô hàng | Lô chứa hàng |
| Sản phẩm | Tên hàng hóa |
| Số lượng nhập | Số lượng nhập kho |
| Ghi chú | Ghi chú thêm |

**Form tạo phiếu nhập:**

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Tên nhân viên | — | Tự động từ tài khoản đăng nhập |
| Mã nhân viên | — | Tự động từ tài khoản đăng nhập |
| Chọn kho | ✅ | Dropdown danh sách kho |
| Chọn số lô | ✅ | Dropdown lô trong kho đã chọn |
| Chọn hàng hóa nhập kho | ✅ | Dropdown danh sách hàng hóa |
| Số lượng nhập kho | ✅ | Nhập số lượng |
| Ghi chú | — | Nhập ghi chú (nếu có) |

### 4.3 Phiếu xuất kho (`WarehouseIssueTab`)

**Bộ lọc danh sách:**

| Cột | Nội dung |
|---|---|
| Ngày xuất | Ngày thực hiện xuất kho |
| Nhân viên thực hiện | Người lập phiếu |
| Kho | Kho xuất hàng |
| Lô hàng | Lô chứa hàng |
| Sản phẩm | Tên hàng hóa |
| Số lượng xuất | Số lượng xuất kho |
| Ghi chú | Ghi chú thêm |

**Form tạo phiếu xuất:**

| Trường | Bắt buộc | Ghi chú |
|---|---|---|
| Tên nhân viên | — | Tự động từ tài khoản đăng nhập |
| Mã nhân viên | — | Tự động từ tài khoản đăng nhập |
| Chọn kho | ✅ | Dropdown danh sách kho |
| Chọn số lô | ✅ | Dropdown lô trong kho đã chọn |
| Chọn hàng hóa nhập kho | ✅ | Hàng hóa cần xuất |
| Số lượng xuất kho | ✅ | Nhập số lượng |
| Ghi chú | — | Nhập ghi chú (nếu có) |

---

## 5. Dữ liệu sản xuất (`ProductionData`)

Trang tổng hợp báo cáo thống kê gồm 3 mục:

| Mục | Nội dung |
|---|---|
| Đánh giá nguyên liệu | Thống kê chất lượng nguyên vật liệu đầu vào |
| Thông số vận hành hệ thống | Tổng hợp các thông số chiên/sấy theo mã chiên |
| Thành phẩm đầu ra | Báo cáo sản lượng và tỉ lệ các loại thành phẩm |

Dashboard tổng quan hiển thị biểu đồ tròn (PieChart) theo trạng thái máy và đơn hàng, thống kê kho (tổng kho, kho trống, lô trống), phiếu nhập/xuất.

---

## 6. Escalation

| Tình huống | Hành động |
|---|---|
| Không truy cập được trang sản xuất | Kiểm tra role thuộc `DEPT_PRODUCTION` |
| Không tạo được phiếu nhập/xuất kho | Kiểm tra kho và lô đã được tạo chưa |
| Thông số vận hành không lưu được | Kiểm tra Mã chiên, Tên máy, Thời gian chiên, Người thực hiện đã điền đủ |
| Dữ liệu thành phẩm không hiển thị | Kiểm tra mã chiên tồn tại trong hệ thống |
| Cần hỗ trợ kỹ thuật | Liên hệ ADMIN hoặc DEPARTMENT_HEAD |

---

## 7. FAQ

**Q1: Làm thế nào để tạo phiếu nhập kho?**
Vào tab **Kho** → chọn **Phiếu nhập kho** → nhấn **Thêm mới** → chọn kho, lô hàng, hàng hóa, nhập số lượng → Lưu.

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
