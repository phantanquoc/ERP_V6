---
department: DEPT_ACCOUNTING
department_name: "Bộ phận kế toán"
roles: [ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE]
access: department_restricted
language: vi
---

# Bộ phận Kế toán

## Cách truy cập

Từ thanh điều hướng bên trái (sidebar):
- **Phòng KT Hành chính**: Nhấn **Bộ phận kế toán** → chọn **Phòng KT Hành chính**
- **Phòng KT Thuế**: Nhấn **Bộ phận kế toán** → chọn **Phòng KT thuế**

## 1. Tổng quan

Bộ phận Kế toán chịu trách nhiệm quản lý tài chính, hóa đơn, công nợ, đơn hàng và báo cáo thuế. Hệ thống chia thành hai phòng chức năng:

- **Phòng KT Hành chính** (`/accounting/admin`): Quản lý hóa đơn, tài sản/lô hàng, đơn hàng và công nợ nhà cung cấp.
- **Phòng KT Thuế** (`/accounting/tax`): Theo dõi, lập và quản lý trạng thái báo cáo thuế.

Dashboard tổng quan Phòng KT Hành chính hiển thị 2 khối thông tin:
| Khối | Chỉ số |
|------|--------|
| Tổng quan tài sản | Tổng tài sản · Tổng công nợ · Đã thanh toán · Chưa thanh toán |
| Tổng quan doanh thu | Tổng doanh thu · Quốc tế · Nội địa |

Dashboard Phòng KT Thuế hiển thị 6 trạng thái báo cáo: Tổng · Chưa báo cáo · Đang cập nhật · Đủ hồ sơ · Đã báo cáo · Đã quyết toán.

---

## 2. Quyền truy cập

| Chức năng | ADMIN | DEPARTMENT_HEAD | TEAM_LEAD | EMPLOYEE |
|-----------|:-----:|:---------------:|:---------:|:--------:|
| Xem hóa đơn | ✅ | ✅ | ✅ | ✅ |
| Tạo / sửa hóa đơn | ✅ | ✅ | ✅ | ❌ |
| Xóa hóa đơn | ✅ | ✅ | ❌ | ❌ |
| Xem tài sản / lô hàng | ✅ | ✅ | ✅ | ✅ |
| Cập nhật đơn giá tài sản | ✅ | ✅ | ✅ | ❌ |
| Xem đơn hàng | ✅ | ✅ | ✅ | ✅ |
| Cập nhật trạng thái đơn hàng | ✅ | ✅ | ✅ | ❌ |
| Xem công nợ | ✅ | ✅ | ✅ | ✅ |
| Tạo / sửa công nợ | ✅ | ✅ | ✅ | ❌ |
| Xóa công nợ | ✅ | ✅ | ❌ | ❌ |
| Xem báo cáo thuế | ✅ | ✅ | ✅ | ✅ |
| Tạo / cập nhật báo cáo thuế | ✅ | ✅ | ❌ | ❌ |
| Xuất báo cáo thuế | ✅ | ✅ | ✅ | ❌ |

---

## 3. Phòng KT Hành chính

Đường dẫn: `/accounting/admin`

Trang gồm 4 tab:

| Tab | Tên hiển thị | Component |
|-----|-------------|-----------|
| `invoices` | Hóa đơn | InvoiceManagement |
| `assets` | Quản lý tài sản | AssetManagement |
| `debts` | Danh sách công nợ | DebtManagement |
| `orders` | Danh sách đơn hàng | OrderManagement |

### 3.1 Tab Hóa đơn (InvoiceManagement)

Quản lý toàn bộ hóa đơn bán hàng, mua hàng và dịch vụ.

#### Form tạo / sửa hóa đơn — 13 trường

| # | Trường | Bắt buộc | Kiểu dữ liệu / Giá trị |
|---|--------|:--------:|----------------------|
| 1 | Số hóa đơn | ✅ | Text (mã duy nhất) |
| 2 | Ngày lập | | Date picker |
| 3 | Khách hàng | ✅ | Text / Select |
| 4 | Mã số thuế | | Text |
| 5 | Loại hóa đơn | | `Bán hàng` / `Mua hàng` / `Dịch vụ` |
| 6 | Tổng tiền | | Số tiền (VNĐ) |
| 7 | Thuế VAT (%) | | Số phần trăm |
| 8 | Thành tiền | | Tính tự động: Tổng tiền × (1 + VAT%) |
| 9 | Trạng thái | | `Đã thanh toán` / `Chưa thanh toán` / `Đang xử lý` |
| 10 | Phương thức thanh toán | | `Tiền mặt` / `Chuyển khoản` / `Thẻ` |
| 11 | Ngày thanh toán | | Date picker |
| 12 | Nhân viên lập | | Text (tên nhân viên) |
| 13 | Ghi chú | | Text area |

#### Cột bảng danh sách hóa đơn
Số hóa đơn · Ngày lập · Khách hàng · Mã số thuế · Loại hóa đơn · Tổng tiền · Thuế VAT (%) · Thành tiền · Trạng thái · Phương thức thanh toán · Ngày thanh toán · Nhân viên lập · Ghi chú · Hành động

#### Lọc / Tìm kiếm
- Lọc theo loại hóa đơn (Bán hàng / Mua hàng / Dịch vụ)
- Lọc theo trạng thái thanh toán
- Tìm theo số hóa đơn hoặc tên khách hàng

### 3.2 Tab Tài sản / Lô hàng (tab **Quản lý tài sản**)

**Truy cập:** `/accounting/admin` → tab **"Quản lý tài sản"**

#### Bộ lọc

| Bộ lọc | Loại | Ghi chú |
|---|---|---|
| Tên lô | Văn bản | Placeholder: "Lọc theo tên lô..." |
| Tìm kiếm | Văn bản | Placeholder: "Tìm kiếm tên, mã sản phẩm..." |

#### Cấu trúc hiển thị

- Các tab kho (tự động tạo theo danh sách kho trong hệ thống)
- Thanh tóm tắt: **Tổng số lô** và **Tổng thành tiền** (VNĐ) của kho đang chọn
- Mỗi lô hiển thị tên lô, số sản phẩm, tổng thành tiền

#### Cột bảng sản phẩm trong lô

| Cột | Nội dung |
|---|---|
| Tên hàng hóa | Tên sản phẩm (phụ: "Mã: {maSanPham}") |
| Số lượng | Số lượng tồn |
| Đơn vị | Đơn vị tính |
| Đơn giá | Giá thành (VNĐ) |
| Thành tiền | Số lượng × Đơn giá (chữ xanh lá) |
| Hành động | Nút **Xem** (mắt) + **Sửa** (bút) |

#### Cập nhật đơn giá — form "Chỉnh sửa giá thành"

Nhấn nút **Sửa** (bút) trên dòng sản phẩm:

| Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|:---:|---|---|
| Sản phẩm | | Chỉ đọc | Tên sản phẩm (không sửa được) |
| Số lượng | | Chỉ đọc | Số lượng + đơn vị (không sửa được) |
| Đơn giá (VND) | ✅ | Số (min 0) | Placeholder: "Nhập đơn giá" |
| Thành tiền | | Tự tính | Cập nhật tự động = Số lượng × Đơn giá |

**Nút:** "Lưu" / "Hủy"

### 3.3 Tab Đơn hàng (OrderManagement)

Xem và cập nhật trạng thái thanh toán / sản xuất của đơn hàng.

#### Trạng thái sản xuất (7 trạng thái)

| Giá trị | Nhãn hiển thị |
|---------|--------------|
| `CHO_LEN_KE_HOACH` | Chờ lên kế hoạch |
| `CHO_SAN_XUAT` | Chờ sản xuất |
| `DANG_SAN_XUAT` | Đang sản xuất |
| `CHO_GIAO_HANG` | Chờ giao hàng |
| `DA_LEN_CONTAINER` | Đã lên container |
| `DANG_VAN_CHUYEN` | Đang vận chuyển |
| `DA_GIAO_CHO_KHACH_HANG` | Đã giao cho khách hàng |

#### Trạng thái thanh toán (3 trạng thái)

| Giá trị | Nhãn hiển thị |
|---------|--------------|
| `DA_THANH_TOAN_DOT_1` | Đã thanh toán đợt 1 |
| `CHO_THANH_TOAN_DOT_2` | Chờ thanh toán đợt 2 |
| `DA_THANH_TOAN_DU` | Đã thanh toán đủ |

#### Thông tin thanh toán 2 đợt (USD + VNĐ)

| Trường | Đơn vị | Mô tả |
|--------|--------|-------|
| `giaTriDonHangUSD` | USD | Giá trị tổng đơn hàng (ngoại tệ) |
| `giaTriDonHangVND` | VNĐ | Giá trị tổng đơn hàng (nội tệ) |
| `xuatKhauDot1USD` | USD | Thanh toán đợt 1 — xuất khẩu |
| `noiDiaDot1VND` | VNĐ | Thanh toán đợt 1 — nội địa |
| `xuatKhauDot2USD` | USD | Thanh toán đợt 2 — xuất khẩu |
| `noiDiaDot2VND` | VNĐ | Thanh toán đợt 2 — nội địa |

#### Lọc đơn hàng
- Lọc theo `trangThaiSanXuat` (text search)
- Xem chi tiết từng đơn hàng trong modal

### 3.4 Tab Công nợ (DebtManagement)

Quản lý công nợ nhà cung cấp và các khoản phải trả.

#### Form tạo / sửa công nợ — 14 trường

| # | Trường | Bắt buộc | Kiểu dữ liệu / Giá trị |
|---|--------|:--------:|----------------------|
| 1 | Ngày phát sinh | | Date picker |
| 2 | Loại chi phí | | `Đơn hàng` / `Sửa chữa` / `Đầu tư` / `Văn phòng phẩm` / `Khác` |
| 3 | Mã nhà cung cấp | ✅ | Text (VD: NCC-001) |
| 4 | Tên nhà cung cấp | ✅ | Text (VD: CTY TNHH ABC) |
| 5 | Loại cung cấp | | `Bao bì` / `Nguyên vật liệu` / `Dịch vụ` / `Khác` |
| 6 | Cung cấp | | Text (mô tả hàng hóa / dịch vụ, VD: Thùng carton) |
| 7 | Nội dung chi cho | | Text |
| 8 | Loại hình | | `Tổ chức` / `Hộ gia đình` / `Cá nhân` |
| 9 | Số tiền phải trả | | Số tiền (VNĐ) |
| 10 | Số tiền đã thanh toán | | Số tiền (VNĐ) |
| 11 | Ngày hoạch toán | | Date picker |
| 12 | Ngày đến hạn | | Date picker |
| 13 | Số tài khoản | | Text (tài khoản ngân hàng nhà cung cấp) |
| 14 | Ghi chú | | Text area |
| +  | File đính kèm | | Tài liệu hóa đơn / hợp đồng |

#### Cột bảng danh sách công nợ
Ngày phát sinh · Loại chi phí · Mã NCC · Tên NCC · Loại cung cấp · Cung cấp · Nội dung chi cho · Loại hình · Số tiền phải trả · Đã thanh toán · **Còn nợ** (tính tự động) · Ngày hoạch toán · Ngày đến hạn · Số tài khoản · Ghi chú · Hành động

> **Còn nợ** = Số tiền phải trả − Số tiền đã thanh toán (tính tự động, chỉ hiển thị).

---

## 4. Phòng KT Thuế

Đường dẫn: `/accounting/tax`

### 4.1 TaxReportTab — Quản lý Báo cáo Thuế

#### Trạng thái báo cáo thuế (5 trạng thái)

| Giá trị | Nhãn hiển thị | Mô tả |
|---------|--------------|-------|
| `CHUA_BAO_CAO` | Chưa báo cáo | Chưa nộp báo cáo kỳ này |
| `DANG_CAP_NHAT_HO_SO` | Đang cập nhật hồ sơ | Đang thu thập chứng từ |
| `DA_DAY_DU_HO_SO` | Đã đầy đủ hồ sơ để báo cáo | Đủ điều kiện nộp |
| `DA_BAO_CAO` | Đã báo cáo | Đã nộp lên cơ quan thuế |
| `DA_QUYET_TOAN` | Đã quyết toán | Hoàn tất quyết toán thuế |

#### Chức năng TaxReportTab

**Nút header:** "Xuất Excel"

#### Cột bảng danh sách

| Cột | Nội dung |
|---|---|
| STT | Số thứ tự |
| Ngày đặt hàng | Ngày của đơn hàng gốc |
| Mã Đơn Hàng | Mã đơn hàng (chữ xanh đậm) |
| Tên hàng hoá | Tên sản phẩm |
| Số lượng | Số lượng |
| Đơn vị | Đơn vị tính |
| Giá trị đơn hàng | Tổng giá trị (VNĐ) |
| Số tiền đóng thuế | Số tiền thuế (VNĐ), hiển thị "-" nếu chưa nhập |
| Trạng thái | Badge màu |
| Ghi chú | Ghi chú ngắn, hiển thị "-" nếu trống |
| File đính kèm | Link "Xem file" nếu có, "-" nếu không |
| Hoạt động | Nút **Sửa** (bút) + **Xóa** (thùng rác) |

#### Form chỉnh sửa báo cáo thuế

Nhấn nút **Sửa** để mở modal "Chỉnh sửa báo cáo thuế":

**Phần chỉ đọc** (lấy từ đơn hàng, không sửa được):
- Mã đơn hàng, Ngày đặt hàng, Tên hàng hóa, Số lượng + đơn vị, Giá trị đơn hàng

**Phần có thể sửa:**

| Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|:---:|---|---|
| Số tiền đóng thuế | | Số | Placeholder: "Nhập số tiền đóng thuế" |
| Trạng thái | | Dropdown | Xem bảng trạng thái bên dưới |
| Ghi chú | | Văn bản dài (3 dòng) | Placeholder: "Nhập ghi chú" |
| File đính kèm (URL) | | Văn bản | Placeholder: "Nhập URL file đính kèm" |

**Nút:** "Lưu thay đổi" / "Hủy"

#### Dashboard tổng quan (trang **Phòng KT Thuế**)
| Chỉ số | Mô tả |
|--------|-------|
| Tổng số báo cáo | Tổng tất cả kỳ |
| Chưa báo cáo | Số kỳ chưa xử lý |
| Đang cập nhật | Đang thu thập chứng từ |
| Đủ hồ sơ | Sẵn sàng nộp |
| Đã báo cáo | Đã nộp cơ quan thuế |
| Đã quyết toán | Hoàn tất |

---

## 5. Bảng leo thang (Escalation)

| Tình huống | Cấp xử lý | Thời hạn |
|-----------|-----------|----------|
| Hóa đơn chưa thanh toán quá 30 ngày | TEAM_LEAD → DEPARTMENT_HEAD | 2 ngày làm việc |
| Công nợ đến hạn chưa thanh toán | DEPARTMENT_HEAD | Ngay khi đến hạn |
| Chênh lệch số liệu doanh thu > 5% | DEPARTMENT_HEAD → ADMIN | 1 ngày làm việc |
| Báo cáo thuế trạng thái `CHUA_BAO_CAO` gần kỳ hạn | DEPARTMENT_HEAD | 3 ngày trước hạn |
| Đơn hàng xuất khẩu chưa có thanh toán đợt 2 | TEAM_LEAD → DEPARTMENT_HEAD | Theo hợp đồng |
| Lô hàng chưa cập nhật đơn giá | TEAM_LEAD | 1 ngày làm việc |
| Tài sản ghi nhận âm / sai lệch lớn | DEPARTMENT_HEAD → ADMIN | Ngay lập tức |

---

## 6. FAQ

**Q1: Làm thế nào để tạo hóa đơn mới?**
Vào tab **Hóa đơn** → nhấn **Thêm mới** → điền 13 trường (Số hóa đơn và Khách hàng là bắt buộc) → chọn Loại hóa đơn và Phương thức thanh toán → nhấn **Lưu**.

**Q2: Sự khác nhau giữa Tổng tiền và Thành tiền trong hóa đơn?**
- **Tổng tiền**: Giá trị hàng hóa / dịch vụ trước thuế.
- **Thành tiền**: Tổng tiền cộng thêm thuế VAT. Thành tiền = Tổng tiền × (1 + VAT%/100).

**Q3: Tôi có thể thay đổi trạng thái đơn hàng từ "Đang sản xuất" sang "Đã giao" không?**
Có. Vào tab **Danh sách đơn hàng** → tìm đơn hàng → nhấn Sửa → chọn trạng thái mới trong dropdown **Trạng thái SX**. Lưu ý: chỉ role TEAM_LEAD trở lên mới có quyền sửa.

**Q4: Trường "Còn nợ" trong công nợ được tính như thế nào?**
Còn nợ = **Số tiền phải trả** − **Số tiền đã thanh toán**. Đây là trường chỉ đọc, tính tự động và hiển thị trong bảng danh sách công nợ.

**Q5: Thanh toán 2 đợt (USD và VNĐ) trong đơn hàng dùng để làm gì?**
Đơn hàng xuất khẩu thường có 2 đợt thanh toán. Mỗi đợt ghi nhận riêng phần xuất khẩu bằng USD (`xuatKhauDotX_USD`) và phần nội địa bằng VNĐ (`noiDiaDotX_VND`), giúp kế toán theo dõi từng dòng tiền riêng biệt.

**Q6: Quy trình cập nhật trạng thái báo cáo thuế như thế nào?**
Trạng thái nên được chuyển theo thứ tự: `CHUA_BAO_CAO` → `DANG_CAP_NHAT_HO_SO` → `DA_DAY_DU_HO_SO` → `DA_BAO_CAO` → `DA_QUYET_TOAN`. Chỉ DEPARTMENT_HEAD hoặc ADMIN mới có quyền tạo và cập nhật báo cáo thuế.

**Q7: Làm sao tìm kiếm hóa đơn theo khoảng thời gian?**
Dùng bộ lọc **Ngày lập** trên tab Hóa đơn: chọn ngày bắt đầu và ngày kết thúc bằng date picker để lọc danh sách hóa đơn trong khoảng thời gian mong muốn.
