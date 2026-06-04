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
- **Phòng cơ-điện**: Nhấn **Bộ phận kỹ thuật** → chọn **Phòng cơ-điện** (đang phát triển)

## 1. Tổng quan

Bộ phận kỹ thuật quản lý toàn bộ hệ thống máy móc, báo cáo hoạt động, yêu cầu sửa chữa và nghiệm thu bàn giao thiết bị. Có hai phòng chức năng chính:

| Phòng | Đường dẫn | Mô tả |
|---|---|---|
| **Phòng QLHTM** (Quản lý hệ thống máy) | `/technical/quality` | 5 tab: Danh sách hệ thống máy, Báo cáo hoạt động máy, Danh sách đơn hàng, Yêu cầu sửa chữa, Nghiệm thu bàn giao |
| **Phòng cơ-điện** | `/technical/mechanical` | Đang phát triển |

Các tab trong Phòng QLHTM:

| Tab key | Tên hiển thị | Component |
|---|---|---|
| `machineSystems` | Danh sách hệ thống máy | MachineSystemList |
| `machineActivity` | Báo cáo hoạt động của máy | MachineActivityReport |
| `orders` | Danh sách đơn hàng | OrderManagement (dùng chung) |
| `repairRequests` | Danh sách yêu cầu sửa chữa | RepairRequestList |
| `acceptance` | Danh sách nghiệm thu bàn giao | Inline table + AcceptanceHandoverViewModal |

---

## 2. Quyền truy cập

### Danh sách hệ thống máy (`/api/machine-systems`)

| Role | Xem (GET) | Tạo (POST) | Sửa (PUT) | Xóa (DELETE) |
|---|---|---|---|---|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| DEPARTMENT_HEAD | ✅ | ✅ | ✅ | ✅ |
| TEAM_LEAD | ✅ | ❌ | ❌ | ❌ |
| EMPLOYEE | ✅ | ❌ | ❌ | ❌ |

### Báo cáo hoạt động máy (`/api/machine-activity-reports`)

| Role | Xem (GET) | Tạo (POST) | Sửa (PUT) | Xóa (DELETE) |
|---|---|---|---|---|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| DEPARTMENT_HEAD | ✅ | ✅ | ✅ | ✅ |
| TEAM_LEAD | ✅ | ✅ | ✅ | ❌ |
| EMPLOYEE | ✅ | ❌ | ❌ | ❌ |

### Yêu cầu sửa chữa (`/api/repair-requests`)

| Role | Xem (GET) | Tạo (POST) | Sửa (PUT) | Xóa (DELETE) |
|---|---|---|---|---|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| DEPARTMENT_HEAD | ✅ | ✅ | ✅ | ✅ |
| TEAM_LEAD | ✅ | ✅ | ✅ | ❌ |
| EMPLOYEE | ✅ | ✅ | ❌ | ❌ |

### Nghiệm thu bàn giao (`/api/acceptance-handovers`)

| Role | Xem (GET) | Tạo (POST) | Sửa (PUT) | Xóa (DELETE) |
|---|---|---|---|---|
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| DEPARTMENT_HEAD | ✅ | ✅ | ✅ | ✅ |
| TEAM_LEAD | ✅ | ✅ | ✅ | ❌ |
| EMPLOYEE | ✅ | ❌ | ❌ | ❌ |

> Tất cả endpoint đều yêu cầu đăng nhập (`authenticate`). Truy cập menu bị giới hạn theo `DEPT_TECHNICAL`.

---

## 3. Phòng QLHTM

### 3.1 Danh sách hệ thống máy — Tab "Danh sách hệ thống máy" (`machineSystems`)

**Truy cập:** `/technical/quality` → tab **"Danh sách hệ thống máy"**

#### Nút header

| Nút | Hành động |
|---|---|
| **Xuất Excel** | Xuất danh sách ra file `.xlsx` |
| **Thêm mới** | Mở form tạo hệ thống mới |

#### Cột bảng danh sách (14 cột)

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
| Ngày tạo | `createdAt` (DD/MM/YYYY) |
| Hoạt động | Nút **Xem** / **Sửa** / **Xóa** |

#### Bộ lọc

| Bộ lọc | Loại | Ghi chú |
|---|---|---|
| Khu vực | Dropdown | Khu A · Khu B · Khu C · Khu sản xuất · Khu kho · Khu văn phòng · Khu xử lý · Khác |
| Tìm kiếm | Văn bản | Tìm theo tên hệ thống, mã hệ thống, tên thiết bị |

#### Form thêm / chỉnh sửa hệ thống — 11 trường

| # | Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|---|:---:|---|---|
| 1 | Khu vực | ✅ | Dropdown | Khu A · Khu B · Khu C · Khu sản xuất · Khu kho · Khu văn phòng · Khu xử lý · Khác |
| 2 | Vị trí | ✅ | Văn bản | Vị trí cụ thể trong khu vực |
| 3 | Mã hệ thống | ✅ | Văn bản | VD: HT-001 |
| 4 | Tên hệ thống | ✅ | Văn bản | VD: Hệ thống chiên chân không |
| 5 | Chức năng | | Văn bản dài (2 dòng) | Chiếm toàn bộ chiều rộng |
| 6 | Thiết bị | | Dropdown | Chọn từ danh sách máy (hiển thị mã máy + tên máy); tự động điền cả Mã thiết bị và Tên thiết bị |
| 7 | Nhiệm vụ | | Văn bản dài (2 dòng) | Chiếm toàn bộ chiều rộng |
| 8 | Người thực hiện | | Dropdown | Chọn từ danh sách nhân viên (hiển thị mã + tên) |
| 9 | Mã người thực hiện | | Tự động | **Tự động điền** khi chọn người thực hiện (readOnly) |
| 10 | Trạng thái hoạt động | | Toggle | Bật = "Đang hoạt động" (xanh lá) · Tắt = "Dừng hoạt động" (xám) |
| 11 | File đính kèm | | Tải tệp | PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG |

**Nút:** "Thêm mới" (tạo) / "Cập nhật" (sửa) / "Đóng"

> **Lưu ý:** Tab "Quản lý máy móc" (CRUD máy riêng lẻ) thuộc **Bộ phận sản xuất** (Phòng QLSX), không nằm trong Phòng QLHTM.

### 3.2 Báo cáo hoạt động của máy — Tab "Báo cáo hoạt động của máy" (`machineActivity`)

**Truy cập:** `/technical/quality` → tab **"Báo cáo hoạt động của máy"**

**Nút header:** "Xuất Excel" + "Thêm báo cáo"

#### Cột bảng danh sách (10 cột)

| Cột | Nội dung |
|---|---|
| STT | Số thứ tự |
| Vị trí | `viTri` — vị trí đặt máy/hệ thống |
| Tên hệ thống/thiết bị | `tenHeThong` |
| Tổng số lượng | `tongSoLuong` — tổng số thiết bị |
| SL hoạt động | `soLuongHoatDong` (chữ xanh lá) |
| SL ngưng | `soLuongNgung` (chữ đỏ) |
| Nguyên nhân | `nguyenNhan` — lý do ngừng hoạt động |
| Người báo cáo | `nguoiBaoCao` |
| Ngày tạo | `createdAt` (DD/MM/YYYY) |
| Hoạt động | Nút **Xem** / **Sửa** / **Xóa** |

#### Form thêm / chỉnh sửa báo cáo — 7 trường

| # | Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|---|:---:|---|---|
| 1 | Vị trí | ✅ | Văn bản | **Tự động điền** khi chọn hệ thống (có thể sửa) |
| 2 | Tên hệ thống/thiết bị | ✅ | Dropdown | Chọn từ danh sách hệ thống máy đã tạo (tab 3.1) |
| 3 | Tổng số lượng | ✅ | Số (min 0) | Tổng thiết bị trong hệ thống |
| 4 | Số lượng máy hoạt động | ✅ | Số (min 0) | Số thiết bị đang vận hành |
| 5 | Số lượng máy ngưng hoạt động | ✅ | Số (min 0) | Số thiết bị ngừng |
| 6 | Nguyên nhân | ✅ | Văn bản dài (3 dòng) | Nguyên nhân ngừng hoạt động |
| 7 | Người báo cáo | | Văn bản | **Tự động điền** tên người đăng nhập (readOnly) |
| + | File đính kèm | | Tải tệp | PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG |

> **Lưu ý:** Khi chọn "Tên hệ thống/thiết bị" từ dropdown, trường "Vị trí" sẽ tự động điền theo vị trí đã khai báo trong danh sách hệ thống máy. Trường `createdAt` được hệ thống tự động ghi nhận.

### 3.3 Danh sách đơn hàng — Tab "Danh sách đơn hàng" (`orders`)

**Truy cập:** `/technical/quality` → tab **"Danh sách đơn hàng"**

Tab này hiển thị danh sách đơn hàng chung (giống Bộ phận sản xuất và Kinh doanh) để phòng kỹ thuật theo dõi tiến độ sản xuất liên quan đến máy móc.

**Cột bảng:** STT · Ngày đặt hàng · Mã đơn hàng · Mã báo giá · Khách hàng · Số lượng SP · Trạng thái SX · Trạng thái TT · Hành động

**Hành động:** Xem chi tiết, Xem bảng tính, Chỉnh sửa, Xóa, Xuất Excel

> **Lưu ý:** Tab "Thông số vận hành hệ thống" thuộc **Bộ phận sản xuất** (Phòng QLSX), không thuộc Bộ phận kỹ thuật.

### 3.4 Yêu cầu sửa chữa — Tab "Danh sách yêu cầu sửa chữa" (`repairRequests`)

**Truy cập:** `/technical/quality` → tab **"Danh sách yêu cầu sửa chữa"**

**Nút header:** "Xuất Excel"

#### Cột bảng danh sách (7 cột)

| Cột | Nội dung |
|---|---|
| STT | Số thứ tự |
| Ngày tháng | `ngayThang` (DD/MM/YYYY) |
| Mã yêu cầu | `maYeuCau` (chữ xanh đậm) |
| Tên hệ thống/thiết bị | `tenHeThong` |
| Mức độ ưu tiên | Badge màu theo mức độ |
| Trạng thái | Badge màu theo trạng thái |
| Hoạt động | Nút **Xem** / **Sửa** / **Nghiệm thu** / **Xóa** |

#### Mức độ ưu tiên (4 mức)

| Giá trị | Màu badge |
|---|---|
| Thấp | Xanh lá |
| Trung bình | Vàng |
| Cao | Cam |
| Khẩn cấp | Đỏ |

#### Trạng thái yêu cầu (3 trạng thái)

| Giá trị | Màu badge | Mô tả |
|---|---|---|
| Chờ xử lý | Xám | Mới tạo, chưa phân công |
| Đang sửa chữa | Xanh dương | Đang được xử lý |
| Hoàn thành | Xanh lá | Đã sửa xong |

#### Loại lỗi (2 loại)

`Lỗi mới` · `Lỗi lặp lại`

#### Form thêm / chỉnh sửa yêu cầu — trường header + bảng thiết bị

**Trường header (5 trường):**

| # | Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|---|:---:|---|---|
| 1 | Ngày tháng | ✅ | Date picker | Mặc định: ngày hiện tại |
| 2 | Mã yêu cầu sửa chữa | ✅ | Văn bản | **Tự động sinh** khi tạo mới (VD: YC-001) |
| 3 | Mức độ ưu tiên | ✅ | Dropdown | Thấp · Trung bình · Cao · Khẩn cấp |
| 4 | Trạng thái | ✅ | Dropdown | Chờ xử lý · Đang sửa chữa · Hoàn thành |
| 5 | Ghi chú | | Văn bản dài (2 dòng) | Ghi chú thêm (nếu có) |
| + | File đính kèm | | Tải tệp | PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG |

**Bảng "Danh sách thiết bị lỗi" (nhiều dòng, bắt buộc ít nhất 1 dòng):**

| Cột | Loại nhập | Ghi chú |
|---|---|---|
| Hệ thống/Thiết bị | Dropdown | Chọn từ danh sách hệ thống máy (tab 3.1) |
| Khu vực sử dụng | Văn bản | VD: Xưởng sản xuất, Kho nguyên liệu |
| Loại lỗi | Dropdown | Lỗi mới · Lỗi lặp lại |
| Nội dung lỗi | Văn bản | Mô tả triệu chứng lỗi |

Nhấn **"+ Thêm thiết bị"** để thêm dòng mới; nhấn biểu tượng thùng rác để xóa dòng (phải có ít nhất 1 dòng).

> **Lưu ý quan trọng:** Mã yêu cầu được tự động sinh từ API (`/repair-requests/generate-code`) khi nhấn "Thêm mới". Cột "Hệ thống/Thiết bị" lấy từ danh sách hệ thống máy đã khai báo ở tab 3.1 — nếu chưa có hệ thống nào, cần tạo trước.

#### Nút "Nghiệm thu" trên mỗi dòng

Nhấn nút **Nghiệm thu** (biểu tượng ✓ tím) trên dòng yêu cầu sửa chữa sẽ mở form **Nghiệm thu bàn giao** (xem mục 3.5) với thông tin yêu cầu đã được điền sẵn.

### 3.5 Nghiệm thu bàn giao — Tab "Danh sách nghiệm thu bàn giao" (`acceptance`)

**Truy cập:** `/technical/quality` → tab **"Danh sách nghiệm thu bàn giao"**

Sau khi sửa chữa hoàn thành, kỹ thuật viên tạo biên bản nghiệm thu bàn giao. Có 2 cách tạo:
1. Từ tab **Yêu cầu sửa chữa** → nhấn nút **Nghiệm thu** trên dòng yêu cầu (thông tin tự động điền)
2. Từ tab **Nghiệm thu bàn giao** → nhấn **Thêm mới**

**Nút header:** "Xuất Excel" + "Thêm mới"

#### Cột bảng danh sách (10 cột)

| Cột | Nội dung |
|---|---|
| STT | Số thứ tự |
| Mã nghiệm thu | `maNghiemThu` |
| Ngày nghiệm thu | `ngayNghiemThu` (DD/MM/YYYY) |
| Mã YC sửa chữa | `maYeuCauSuaChua` |
| Tên hệ thống/thiết bị | `tenHeThongThietBi` |
| Tình trạng trước SC | `tinhTrangTruocSuaChua` |
| Tình trạng sau SC | `tinhTrangSauSuaChua` |
| Người bàn giao | `nguoiBanGiao` |
| Người nhận | `nguoiNhan` |
| Hoạt động | Nút **Xem** / **Xóa** |

#### Form tạo nghiệm thu bàn giao — 8 trường

| # | Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|---|:---:|---|---|
| 1 | Mã yêu cầu sửa chữa | ✅ | Văn bản | **Tự động điền** từ yêu cầu sửa chữa (readOnly) |
| 2 | Tên hệ thống/thiết bị | ✅ | Văn bản | **Tự động điền** từ yêu cầu sửa chữa (readOnly) |
| 3 | Người bàn giao | ✅ | Văn bản | **Tự động điền** tên người đăng nhập (readOnly) |
| 4 | Phòng ban | | Dropdown | Lọc danh sách người nhận theo phòng ban |
| 5 | Người nhận | ✅ | Dropdown | Chọn từ danh sách nhân viên (hiển thị tên + mã NV) |
| 6 | Tình trạng trước khi sửa chữa | ✅ | Văn bản dài (3 dòng) | **Tự động điền** từ yêu cầu (có thể sửa) |
| 7 | Tình trạng sau khi sửa chữa | ✅ | Văn bản dài (3 dòng) | Mô tả kết quả sau sửa chữa |
| 8 | Ghi chú | | Văn bản dài (2 dòng) | Ghi chú bổ sung |
| + | File đính kèm | | Tải tệp | PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG, ZIP, RAR (tối đa 100MB) |

> **Lưu ý quan trọng:** Khi tạo nghiệm thu từ nút "Nghiệm thu" trên tab Yêu cầu sửa chữa, các trường Mã yêu cầu, Tên hệ thống/thiết bị, Người bàn giao và Tình trạng trước sửa chữa được tự động điền. Chỉ cần chọn **Người nhận** và nhập **Tình trạng sau khi sửa chữa**.

> Mã nghiệm thu (`maNghiemThu`) và Ngày nghiệm thu (`ngayNghiemThu`) được hệ thống tự động sinh khi lưu.

---

## 4. Phòng cơ-điện

Đường dẫn: `/technical/mechanical`

> Trang **Phòng cơ-điện** hiện đang trong giai đoạn phát triển. Giao diện hiển thị thông báo: "Nội dung quản lý cơ điện sẽ được hiển thị ở đây". Chưa có chức năng hoạt động.

---

## 5. Bảng leo thang (Escalation)

| Tình huống | Cấp xử lý | Thời hạn |
|---|---|---|
| Yêu cầu sửa chữa mức "Khẩn cấp" chưa được xử lý | TEAM_LEAD → DEPARTMENT_HEAD | Ngay lập tức |
| Yêu cầu sửa chữa mức "Cao" kẹt ở "Chờ xử lý" | TEAM_LEAD | 4 giờ làm việc |
| Máy ngừng hoạt động ảnh hưởng sản xuất | DEPARTMENT_HEAD → ADMIN | Ngay lập tức |
| Nghiệm thu bàn giao chưa hoàn tất sau sửa chữa | TEAM_LEAD | 1 ngày làm việc |
| Không thấy menu kỹ thuật | Kiểm tra tài khoản thuộc `DEPT_TECHNICAL` | — |
| Không xuất được Excel | Kiểm tra kết nối mạng và quyền tài khoản | — |

---

## 6. FAQ

**Q1: Làm thế nào để tạo yêu cầu sửa chữa?**
Vào **Phòng QLHTM** → tab **"Danh sách yêu cầu sửa chữa"** → nhấn **Thêm mới** (hệ thống tự sinh mã yêu cầu) → chọn Mức độ ưu tiên và Trạng thái → trong bảng "Danh sách thiết bị lỗi" chọn Hệ thống/Thiết bị, nhập Khu vực sử dụng, chọn Loại lỗi (Lỗi mới/Lỗi lặp lại), nhập Nội dung lỗi → nhấn **Thêm mới**.

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

## 7. Phụ thuộc liên phòng ban

| Dữ liệu cần | Nguồn | Ghi chú |
|---|---|---|
| Danh sách nhân viên (cho Người thực hiện, Người nhận) | Hệ thống quản lý nhân sự | Dùng chung endpoint `/employees/for-assignment` |
| Đơn hàng (tab Danh sách đơn hàng) | Bộ phận kinh doanh | Component OrderManagement dùng chung |
| Thông tin máy móc (cho Bộ phận sản xuất) | Bộ phận kỹ thuật → Sản xuất | Sản xuất tham chiếu hệ thống máy khi lập kế hoạch |

### Luồng dữ liệu sửa chữa

```
1. Phát hiện lỗi → Tạo Yêu cầu sửa chữa (trạng thái: Chờ xử lý)
2. Phân công kỹ thuật viên → Cập nhật trạng thái: Đang sửa chữa
3. Sửa xong → Cập nhật trạng thái: Hoàn thành
4. Tạo Nghiệm thu bàn giao → Bàn giao thiết bị cho người nhận
```

---

## 8. Lưu ý quan trọng

- **Hệ thống máy là dữ liệu gốc**: Tất cả Báo cáo hoạt động và Yêu cầu sửa chữa đều tham chiếu đến danh sách hệ thống máy. Cần tạo hệ thống máy trước khi sử dụng các tab khác.
- **Phân biệt với Bộ phận sản xuất**: Tab "Quản lý máy móc" (CRUD máy riêng lẻ) và "Thông số vận hành hệ thống" thuộc **Bộ phận sản xuất** (Phòng QLSX), KHÔNG thuộc Bộ phận kỹ thuật.
- **File đính kèm**: Tất cả form đều hỗ trợ upload file (PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG). Form nghiệm thu còn hỗ trợ thêm ZIP, RAR.
- **Xuất Excel**: Tất cả các tab (trừ Đơn hàng) đều có nút "Xuất Excel" để xuất dữ liệu ra file `.xlsx`.
