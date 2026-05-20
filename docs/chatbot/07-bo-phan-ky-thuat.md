---
department: DEPT_TECHNICAL
department_name: "Bộ phận kỹ thuật"
roles: [ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE]
access: department_restricted
language: vi
---

# Bộ phận Kỹ thuật

## Cách truy cập

Từ thanh điều hướng bên trái (sidebar):
- **Phòng QLHTM**: Nhấn **Bộ phận kỹ thuật** → chọn **Phòng QLHTM**
- **Phòng cơ-điện**: Nhấn **Bộ phận kỹ thuật** → chọn **Phòng cơ- điện** (đang phát triển)

## 1. Tổng quan

Bộ phận kỹ thuật quản lý toàn bộ hệ thống máy móc, báo cáo hoạt động, yêu cầu sửa chữa và nghiệm thu bàn giao thiết bị. Có hai phòng chức năng chính:

| Phòng | Mô tả |
|---|---|
| **Phòng QLHTM** (Quản lý hệ thống máy) | 5 tab: Danh sách hệ thống máy, Báo cáo hoạt động máy, Danh sách đơn hàng, Yêu cầu sửa chữa, Nghiệm thu bàn giao |
| **Phòng cơ-điện** | Đang phát triển |

---

## 2. Quyền truy cập

| Role | Xem | Tạo mới | Sửa | Xóa |
|---|---|---|---|---|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| DEPARTMENT_HEAD | ✅ | ✅ | ✅ | ✅ |
| TEAM_LEAD | ✅ | ✅ | ✅ | ❌ |
| EMPLOYEE | ✅ | ✅ | ❌ | ❌ |

> Truy cập bị giới hạn theo `DEPT_TECHNICAL`. Người dùng ngoài bộ phận không thấy menu kỹ thuật.

---

## 3. Phòng QLHTM

### 3.1 Danh sách hệ thống máy — Tab "Danh sách hệ thống máy" (`machineSystems`)

**Truy cập:** `/technical/quality` → tab **"Danh sách hệ thống máy"**

#### Nút header

| Nút | Hành động |
|---|---|
| **Xuất Excel** | Xuất danh sách ra file `.xlsx` |
| **Thêm mới** | Mở form tạo hệ thống mới |

#### Cột bảng danh sách (13 cột)

| Cột | Nội dung |
|---|---|
| STT | Số thứ tự |
| Khu vực | `khuVuc` |
| Vị trí | `viTri` |
| Mã hệ thống | `maHeThong` (chữ xanh) |
| Tên hệ thống | `tenHeThong` |
| Chức năng | `chucNang` |
| Mã thiết bị | `maThietBi` |
| Tên thiết bị | `tenThietBi` |
| Nhiệm vụ | `nhiemVu` |
| Mã NTH | `maNguoiThucHien` (mã người thực hiện) |
| Người thực hiện | `nguoiThucHien` |
| File | Link "Xem file" nếu có |
| Hoạt động | Nút **Xem** / **Sửa** / **Xóa** |

#### Form thêm / chỉnh sửa hệ thống

| Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|:---:|---|---|
| Khu vực | ✅ | Văn bản | |
| Vị trí | ✅ | Văn bản | |
| Mã hệ thống | ✅ | Văn bản | |
| Tên hệ thống | ✅ | Văn bản | |
| Chức năng | | Văn bản dài (2 dòng) | Chiếm toàn bộ chiều rộng |
| Mã thiết bị | | Văn bản | |
| Tên thiết bị | | Văn bản | |
| Nhiệm vụ | | Văn bản dài (2 dòng) | Chiếm toàn bộ chiều rộng |
| Mã người thực hiện | | Văn bản | |
| Người thực hiện | | Văn bản | |
| File đính kèm | | Tải tệp | PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG |

**Nút:** "Thêm mới" (tạo) / "Cập nhật" (sửa) / "Đóng"

> **Lưu ý:** Tab "Quản lý máy móc" (CRUD máy riêng lẻ) thuộc **Bộ phận sản xuất** (Phòng QLSX), không nằm trong Phòng QLHTM.

### 3.2 Báo cáo hoạt động của máy — Tab "Báo cáo hoạt động của máy" (`machineActivity`)

**8 trường trong form báo cáo:**

| Trường | Mô tả |
|---|---|
| Vị trí (`viTri`) | Vị trí đặt máy/hệ thống |
| Tên hệ thống (`tenHeThong`) | Tên hệ thống máy |
| Tổng số lượng (`tongSoLuong`) | Tổng số thiết bị trong hệ thống |
| Số lượng hoạt động (`soLuongHoatDong`) | Số thiết bị đang vận hành |
| Số lượng ngừng (`soLuongNgung`) | Số thiết bị ngừng hoạt động |
| Nguyên nhân (`nguyenNhan`) | Nguyên nhân ngừng (nếu có) |
| Người báo cáo (`nguoiBaoCao`) | Nhân viên lập báo cáo |
| File đính kèm (`fileDinhKem`) | Ảnh/tài liệu hỗ trợ |

> Trường `ngayTao` được hệ thống tự động ghi nhận khi tạo báo cáo.

### 3.3 Danh sách đơn hàng — Tab "Danh sách đơn hàng" (`orders`)

**Truy cập:** `/technical/quality` → tab **"Danh sách đơn hàng"**

Tab này hiển thị danh sách đơn hàng chung (giống Bộ phận sản xuất và Kinh doanh) để phòng kỹ thuật theo dõi tiến độ sản xuất liên quan đến máy móc.

**Cột bảng:** STT · Ngày đặt hàng · Mã đơn hàng · Mã báo giá · Khách hàng · Số lượng SP · Trạng thái SX · Trạng thái TT · Hành động

**Hành động:** Xem chi tiết, Xem bảng tính, Chỉnh sửa, Xóa, Xuất Excel

> **Lưu ý:** Tab "Thông số vận hành hệ thống" thuộc **Bộ phận sản xuất** (Phòng QLSX), không thuộc Bộ phận kỹ thuật.

---

## 4. Phòng cơ-điện

> Trang **Phòng cơ-điện** (`/technical/mechanical`) hiện đang trong giai đoạn phát triển. Chưa có chức năng hoạt động.

> **Lưu ý:** Yêu cầu sửa chữa và Nghiệm thu bàn giao hiện nằm trong **Phòng QLHTM** (xem mục 3.4 và 3.5 ở trên).

### 3.4 Yêu cầu sửa chữa — Tab "Danh sách yêu cầu sửa chữa" (`repairRequests`)

**10 trường trong form:**

| Trường | Bắt buộc | Ghi chú / Giá trị |
|---|---|---|
| Ngày tháng | ✅ | Ngày phát hiện sự cố |
| Mã yêu cầu sửa chữa | ✅ | VD: YC-001 |
| Tên hệ thống/thiết bị | ✅ | VD: Nồi chiên VF-003 |
| Tình trạng thiết bị | ✅ | VD: Hỏng, Hoạt động không ổn định |
| Loại lỗi | ✅ | VD: Lỗi cơ khí, Lỗi điện |
| Mức độ ưu tiên | ✅ | **Thấp · Trung bình · Cao · Khẩn cấp** |
| Trạng thái | ✅ | **Chờ xử lý · Đang sửa chữa · Hoàn thành** |
| Nội dung lỗi | ✅ | Mô tả chi tiết lỗi |
| Ghi chú | — | Ghi chú thêm (nếu có) |
| File đính kèm | — | Ảnh/video lỗi |

**Bảng danh sách hiển thị các cột:** Ngày tháng · Mã yêu cầu · Tên hệ thống/thiết bị · Trạng thái · Thao tác.

### 3.5 Nghiệm thu bàn giao — Tab "Danh sách nghiệm thu bàn giao" (`acceptance`)

Sau khi sửa chữa hoàn thành, kỹ thuật viên tạo biên bản nghiệm thu bàn giao với **10 trường**:

| Trường | Mô tả |
|---|---|
| Mã nghiệm thu | Mã định danh biên bản |
| Ngày nghiệm thu | Ngày ký nghiệm thu |
| Mã yêu cầu sửa chữa | Liên kết với yêu cầu sửa chữa gốc |
| Tên hệ thống/thiết bị | Thiết bị được nghiệm thu |
| Tình trạng trước khi sửa chữa | Mô tả lỗi ban đầu |
| Tình trạng sau khi sửa chữa | Kết quả sau sửa chữa |
| Người bàn giao | Kỹ thuật viên bàn giao |
| Người nhận | Người tiếp nhận thiết bị |
| File đính kèm | Ảnh/tài liệu nghiệm thu |
| Ghi chú | Ghi chú bổ sung |

---

## 5. Escalation

| Tình huống | Hành động |
|---|---|
| Không thấy menu kỹ thuật | Kiểm tra tài khoản thuộc `DEPT_TECHNICAL` |
| Không tạo được yêu cầu sửa chữa | Điền đủ 8 trường bắt buộc (✅) |
| Yêu cầu sửa chữa bị kẹt ở "Chờ xử lý" | Liên hệ TEAM_LEAD hoặc DEPARTMENT_HEAD để phân công |
| Không xuất được Excel báo cáo hoạt động | Kiểm tra kết nối mạng và quyền tài khoản |
| Cần hỗ trợ | Liên hệ ADMIN hoặc DEPARTMENT_HEAD kỹ thuật |

---

## 6. FAQ

**Q1: Làm thế nào để tạo yêu cầu sửa chữa?**
Vào tab **Phòng cơ-điện** → **Danh sách yêu cầu sửa chữa** → nhấn **Thêm mới** → điền đủ 8 trường bắt buộc → Lưu.

**Q2: Mức độ ưu tiên nào được xử lý trước?**
Thứ tự ưu tiên từ cao đến thấp: **Khẩn cấp → Cao → Trung bình → Thấp**.

**Q3: Ai tạo biên bản nghiệm thu bàn giao?**
Kỹ thuật viên sửa chữa (EMPLOYEE hoặc TEAM_LEAD) tạo sau khi hoàn thành sửa chữa.

**Q4: Báo cáo hoạt động máy khác với thông số vận hành như thế nào?**
**Báo cáo hoạt động** ghi nhận số lượng máy hoạt động/ngừng theo vị trí. **Thông số vận hành** ghi chi tiết nhiệt độ, áp suất, thời gian theo từng giai đoạn chiên/sấy.

**Q5: Có thể lọc yêu cầu sửa chữa theo trạng thái không?**
Có. Danh sách hỗ trợ tìm kiếm theo mã yêu cầu, tên thiết bị và lọc theo trạng thái.

**Q6: Xuất danh sách nghiệm thu bàn giao sang Excel được không?**
Có. Nhấn nút **Xuất Excel** trên tab Danh sách nghiệm thu bàn giao.

**Q7: Trạng thái máy "BẢO_TRÌ" ảnh hưởng thế nào đến sản xuất?**
Máy có trạng thái BẢO_TRÌ được tách khỏi tính toán thành phẩm (chỉ tính máy HOAT_DONG). Cần thông báo cho bộ phận sản xuất biết để điều chỉnh kế hoạch.
