## Cách truy cập

Từ thanh điều hướng bên trái (sidebar):

- **Phòng giá thành**: Nhấn **Bộ phận tổng hợp** → chọn **Phòng giá thành**
- **Phòng chăm sóc đối tác**: Nhấn **Bộ phận tổng hợp** → chọn **Phòng chăm sóc**

## 1. Tổng quan

Bộ phận tổng hợp gồm hai phòng chức năng chính:


| Phòng                      | Chức năng chính                                             | Đường dẫn           |
| -------------------------- | ----------------------------------------------------------- | ------------------- |
| **Phòng giá thành**        | Quản lý yêu cầu báo giá, báo giá, đơn hàng và chi phí chung | `/general/pricing`  |
| **Phòng chăm sóc đối tác** | Quản lý khách hàng, nhà cung cấp và dịch vụ logistics       | `/general/partners` |


Ngoài ra, bộ phận tổng hợp có quyền truy cập module **Bảng lương** (tab **Bảng lương**) để theo dõi và tính toán lương nhân viên trong phòng.

---

## 2. Quyền truy cập


| Vai trò       | Xem | Tạo mới | Chỉnh sửa | Xóa | Duyệt | Xuất Excel | Gửi thông báo lương |
| ------------- | --- | ------- | --------- | --- | ----- | ---------- | ------------------- |
| Quản trị viên | ✅   | ✅       | ✅         | ✅   | ✅     | ✅          | ✅                   |
| Trưởng phòng  | ✅   | ✅       | ✅         | ✅   | ✅     | ✅          | ✅                   |
| Tổ trưởng     | ✅   | ✅       | ✅         | ❌   | ✅     | ✅          | ❌                   |
| Nhân viên     | ✅   | ✅       | ❌         | ❌   | ❌     | ❌          | ❌                   |


> Quyền truy cập được giới hạn theo phòng ban (`department_restricted`). Nhân viên chỉ thấy dữ liệu thuộc phòng mình.

---

## 3. Phòng giá thành

### 3.1. Tổng quan

Phòng giá thành quản lý toàn bộ quy trình từ tiếp nhận yêu cầu báo giá đến hoàn tất đơn hàng. Trang chủ hiển thị 3 card thống kê:

- **Tổng quan yêu cầu BG** — tổng số YCBG, phân loại Quốc tế / Nội địa
- **Tổng quan báo giá** — tổng số báo giá, phân loại Quốc tế / Nội địa
- **Tổng quan đơn hàng** — tổng số đơn hàng, phân loại Quốc tế / Nội địa

### 3.2. Chi tiết các tab — Phòng giá thành

#### Tab 1: Danh sách YCBG (`requests`)

**Truy cập:** `/general/pricing` → tab **"Danh sách YCBG"**

> **Lưu ý quan trọng:** Phòng giá thành chỉ có quyền **xem** và **tạo báo giá từ YCBG**, không tạo/sửa/xóa YCBG. Việc tạo YCBG là quyền của **Phòng kinh doanh**.

**Cột bảng danh sách:**


| Cột          | Nội dung                                                   |
| ------------ | ---------------------------------------------------------- |
| STT          | Số thứ tự                                                  |
| Ngày yêu cầu | Ngày tạo YCBG                                              |
| Mã YC        | Mã yêu cầu báo giá                                         |
| Nhân viên    | Tên + mã nhân viên tạo                                     |
| Khách hàng   | Tên + mã khách hàng                                        |
| Sản phẩm     | Số lượng sản phẩm + tên sản phẩm đầu tiên                  |
| Số lượng     | Tổng số lượng + đơn vị                                     |
| Hành động    | Nút **"Xem"** (mắt) và **"Tạo báo giá"** (biểu tượng file) |


**Bộ lọc:** Mã YC (văn bản), Nhân viên (văn bản), Khách hàng (văn bản), ô tìm kiếm tổng (placeholder: "Tìm kiếm mã YC, nhân viên, khách hàng...")

**Tạo báo giá từ YCBG:** Nhấn biểu tượng **"Tạo báo giá"** trên dòng YCBG → mở **Bảng tính báo giá** (modal lớn) để lập báo giá chi tiết.

**Dữ liệu phụ thuộc (nếu thiếu, yêu cầu phòng ban tương ứng tạo trước):**


| Dữ liệu cần                  | Phòng ban tạo                   | Ghi chú                                            |
| ---------------------------- | ------------------------------- | -------------------------------------------------- |
| Khách hàng (mã, tên công ty) | Phòng kinh doanh                | Phải có trong danh sách khách hàng quốc tế/nội địa |
| Sản phẩm (mã, tên)           | Phòng kinh doanh                | Phải có trong danh sách sản phẩm quốc tế           |
| Định mức nguyên vật liệu     | Phòng kỹ thuật                  | Cần cho bảng tính báo giá                          |
| Quy trình sản xuất + lưu đồ  | Phòng kỹ thuật / Phòng sản xuất | Cần cho tính chi phí sản xuất                      |
| Chi phí chung                | Phòng giá thành (tự tạo)        | Tab Chi phí → Chi phí chung                        |
| Chi phí xuất khẩu            | Phòng giá thành (tự tạo)        | Tab Chi phí → Chi phí xuất khẩu                    |


---

#### Tab 2: Danh sách báo giá (`quotes`)

**Truy cập:** `/general/pricing` → tab **"Danh sách báo giá"**

**Cột bảng danh sách:**


| Cột           | Nội dung                                |
| ------------- | --------------------------------------- |
| STT           | Số thứ tự                               |
| Ngày BG       | Ngày lập báo giá                        |
| Mã báo giá    | Mã định danh                            |
| Giá báo khách | Giá (VNĐ, có thể kèm USD nếu có tỷ giá) |
| TG giao hàng  | Thời gian giao hàng (số ngày)           |
| Hiệu lực      | Hiệu lực báo giá (số ngày)              |
| Nhân viên     | Người lập báo giá                       |
| Trạng thái    | Badge màu (xem bảng trạng thái)         |
| Ghi chú       | Ghi chú ngắn                            |
| Hành động     | Xem / Sửa / Tạo đơn hàng / Xóa          |


**Trạng thái báo giá (`tinhTrang`):**


| Giá trị                 | Nhãn hiển thị         | Ý nghĩa                    |
| ----------------------- | --------------------- | -------------------------- |
| Bản nháp                | Nháp                  | Mới tạo, chưa gửi khách    |
| Đang chờ phản hồi       | Đang chờ phản hồi     | Đã gửi khách, chờ phản hồi |
| `DANG_CHO_GUI_DON_HANG` | Đang chờ gửi đơn hàng | Khách đồng ý, chờ tạo đơn  |
| Đã đặt hàng             | Đã đặt hàng           | Đã tạo đơn hàng thành công |
| `KHONG_DAT_HANG`        | Không đặt hàng        | Khách từ chối              |
| `SENT`                  | Đã gửi                | Đã gửi báo giá             |
| Đã duyệt                | Đã duyệt              | Được duyệt nội bộ          |
| Từ chối                 | Từ chối               | Bị từ chối nội bộ          |
| `EXPIRED`               | Hết hạn               | Quá thời hạn hiệu lực      |


**Nút hành động trên mỗi dòng:**


| Nút                     | Hành động                        | Điều kiện                    |
| ----------------------- | -------------------------------- | ---------------------------- |
| Mắt (Xem)               | Mở modal xem chi tiết báo giá    | Tất cả vai trò               |
| Bút (Sửa)               | Mở form chỉnh sửa                | Tổ trưởng trở lên            |
| Giỏ hàng (Tạo đơn hàng) | Xác nhận tạo đơn hàng từ báo giá | Tổ trưởng trở lên            |
| Thùng rác (Xóa)         | Xác nhận xóa báo giá             | Trưởng phòng / Quản trị viên |


**Form chỉnh sửa báo giá — các trường có thể sửa:**


| Trường                     | Bắt buộc | Loại nhập             | Ghi chú                                                                  |
| -------------------------- | -------- | --------------------- | ------------------------------------------------------------------------ |
| Giá báo khách (VNĐ/KG)     | ✅        | Số (bước 0.01, min 0) | Placeholder: "Nhập giá báo khách"                                        |
| Thời gian giao hàng (ngày) | ✅        | Số (min 1)            | Placeholder: "Nhập thời gian giao hàng"                                  |
| Hiệu lực báo giá (ngày)    | ✅        | Số (min 1)            | Placeholder: "Nhập hiệu lực báo giá"                                     |
| Trạng thái                 | ✅        | Dropdown              | Đang chờ phản hồi / Đang chờ gửi đơn hàng / Đã đặt hàng / Không đặt hàng |
| Ghi chú                    |          | Văn bản dài (4 dòng)  | Placeholder: "Nhập ghi chú (nếu có)"                                     |


**Nút:** "Lưu thay đổi" / "Hủy"

---

#### Tab 3: Danh sách đơn hàng (`orders`)

**Truy cập:** `/general/pricing` → tab **"Danh sách đơn hàng"**

**Cột bảng danh sách:**


| Cột           | Nội dung                        |
| ------------- | ------------------------------- |
| STT           | Số thứ tự                       |
| Ngày đặt hàng | Ngày tạo đơn                    |
| Mã đơn hàng   | Mã định danh (chữ xanh đậm)     |
| Mã báo giá    | Mã BG liên kết                  |
| Khách hàng    | Tên khách hàng                  |
| Số lượng SP   | Số sản phẩm trong đơn           |
| Trạng thái SX | Badge trạng thái sản xuất       |
| Trạng thái TT | Badge trạng thái thanh toán     |
| Hành động     | Xem / Xem bảng tính / Sửa / Xóa |


**Trạng thái sản xuất (`trangThaiSanXuat`) — forward-only, không lùi:**


| Giá trị                  | Nhãn hiển thị          | Bước |
| ------------------------ | ---------------------- | ---- |
| `CHO_LEN_KE_HOACH`       | Chờ lên kế hoạch       | 1    |
| `CHO_SAN_XUAT`           | Chờ sản xuất           | 2    |
| `DANG_SAN_XUAT`          | Đang sản xuất          | 3    |
| `CHO_GIAO_HANG`          | Chờ giao hàng          | 4    |
| `DA_LEN_CONTAINER`       | Đã lên container       | 5    |
| `DANG_VAN_CHUYEN`        | Đang vận chuyển        | 6    |
| `DA_GIAO_CHO_KHACH_HANG` | Đã giao cho khách hàng | 7    |


**Trạng thái thanh toán (`trangThaiThanhToan`):**


| Giá trị                | Nhãn hiển thị        |
| ---------------------- | -------------------- |
| `DA_THANH_TOAN_DOT_1`  | Đã thanh toán đợt 1  |
| `CHO_THANH_TOAN_DOT_2` | Chờ thanh toán đợt 2 |
| `DA_THANH_TOAN_DU`     | Đã thanh toán đủ     |


**Form chỉnh sửa đơn hàng — các trường có thể sửa:**


| Nhóm             | Trường                  | Loại nhập                 |
| ---------------- | ----------------------- | ------------------------- |
| Giá trị          | Giá trị đơn hàng (USD)  | Số (bước 0.01)            |
| Giá trị          | Giá trị đơn hàng (VNĐ)  | Số                        |
| Thanh toán đợt 1 | Xuất khẩu (USD)         | Số (bước 0.01)            |
| Thanh toán đợt 1 | Nội địa (VNĐ)           | Số                        |
| Thanh toán đợt 1 | Ngày thanh toán         | Chọn ngày                 |
| Thanh toán đợt 2 | Xuất khẩu (USD)         | Số (bước 0.01)            |
| Thanh toán đợt 2 | Nội địa (VNĐ)           | Số                        |
| Thanh toán đợt 2 | Ngày thanh toán         | Chọn ngày                 |
| Sản xuất         | Ngày bắt đầu SX (KH)    | Chọn ngày                 |
| Sản xuất         | Ngày hoàn thành SX (KH) | Chọn ngày                 |
| Sản xuất         | Ngày hoàn thành thực tế | Chọn ngày                 |
| Sản xuất         | Ngày giao hàng          | Chọn ngày                 |
| Trạng thái       | Trạng thái sản xuất     | Dropdown (7 giá trị trên) |
| Trạng thái       | Trạng thái thanh toán   | Dropdown (3 giá trị trên) |
|                  | Ghi chú                 | Văn bản dài (4 dòng)      |


**Nút:** "Lưu thay đổi" / "Hủy"

---

#### Tab 4: Chi phí (`costs`) — CHỈ CÓ TRONG BỘ PHẬN TỔNG HỢP

**Truy cập:** `/general/pricing` → tab **"Chi phí"**

> **QUAN TRỌNG:** Chức năng tạo/quản lý "Chi phí xuất khẩu" và "Chi phí chung" thuộc **Bộ phận tổng hợp → Phòng giá thành → Tab Chi phí**. KHÔNG phải bộ phận kế toán. Bộ phận kế toán quản lý công nợ và hóa đơn, không quản lý chi phí sản xuất/xuất khẩu.

Có 2 loại chi phí, chuyển đổi bằng nút toggle:


| Nút                   | Loại                        | Mục đích                               |
| --------------------- | --------------------------- | -------------------------------------- |
| **Chi phí Xuất khẩu** | Chi phí liên quan xuất khẩu | Dùng trong bảng tính báo giá xuất khẩu |
| **Chi phí Chung**     | Chi phí vận hành chung      | Phân bổ cho tất cả sản phẩm            |


**Cột bảng danh sách:**


| Cột            | Nội dung                                |
| -------------- | --------------------------------------- |
| Mã chi phí     | `maChiPhi` (tự sinh)                    |
| Tên chi phí    | `tenChiPhi`                             |
| Loại chi phí   | `loaiChiPhi`                            |
| Đơn vị tính    | `donViTinh`                             |
| Giá thành/ngày | Số tiền + đơn vị tiền (VND/USD)         |
| Người tạo      | Tên nhân viên                           |
| Thao tác       | Nút **Sửa** (bút) + **Xóa** (thùng rác) |


**Nút header:** "Xuất Excel" + "Tạo chi phí xuất khẩu" / "Tạo chi phí chung"

**Form tạo/sửa chi phí:**


| Trường         | Bắt buộc | Loại nhập      | Ghi chú                                                  |
| -------------- | -------- | -------------- | -------------------------------------------------------- |
| Tên chi phí    | ✅        | Văn bản        | Lỗi nếu trống: "Vui lòng nhập đầy đủ thông tin bắt buộc" |
| Loại chi phí   | ✅        | Văn bản        | Lỗi nếu trống: "Vui lòng nhập đầy đủ thông tin bắt buộc" |
| Đơn vị tính    |          | Văn bản        | VD: ngày, tháng, chuyến                                  |
| Giá thành/ngày |          | Số (bước 0.01) | Placeholder: "Nhập giá thành/ngày"                       |
| Đơn vị tiền    |          | Dropdown       | VND / USD (mặc định: VND)                                |
| Ghi chú        |          | Văn bản dài    |                                                          |


**Nút:** "Tạo mới" / "Cập nhật" / "Hủy"

---

### 3.3. Bảng tính báo giá (QuotationCalculator)

Bảng tính báo giá là công cụ chính của Phòng giá thành. Mở từ: Tab YCBG → nhấn biểu tượng "Tạo báo giá" trên dòng YCBG.

#### Cấu trúc bảng tính

Bảng tính hiển thị dạng modal lớn với nhiều tab:

- **Tab sản phẩm chính** (1 tab cho mỗi sản phẩm trong YCBG): Sản phẩm 1, Sản phẩm 2...
- **Tab chi phí bổ sung** (tùy chọn): CP bổ sung 1, CP bổ sung 2...

#### Mỗi tab sản phẩm gồm các section:

**Section 1: Thông tin sản phẩm**


| Trường          | Bắt buộc | Nguồn dữ liệu                  | Ghi chú                                         |
| --------------- | -------- | ------------------------------ | ----------------------------------------------- |
| Loại sản phẩm   | ✅        | Dropdown từ danh sách sản phẩm | Lọc sản phẩm theo loại                          |
| Tên sản phẩm    | ✅        | Dropdown (lọc theo loại SP)    | Tự động từ YCBG                                 |
| Khối lượng      |          | Số                             | Từ YCBG hoặc nhập tay                           |
| Đơn vị          |          | Văn bản                        | Kg, MT, Tấn...                                  |
| Mã định mức NVL |          | Dropdown                       | Chọn từ danh sách định mức (Phòng kỹ thuật tạo) |


> **Nếu không có định mức NVL:** Yêu cầu Phòng kỹ thuật tạo định mức nguyên vật liệu cho sản phẩm trước.

**Section 2: Nguyên liệu, Tồn kho & Sản xuất**

Chia 2 cột:

*Cột trái — Nguyên liệu & Tồn kho:*


| Trường           | Ghi chú                                                         |
| ---------------- | --------------------------------------------------------------- |
| NL đầu vào       | Dropdown — chọn nguyên liệu từ định mức                         |
| SP đầu ra        | Dropdown — chọn thành phẩm từ định mức                          |
| Nút "Tồn kho"    | Kiểm tra tồn kho hiện tại của NL/SP đã chọn                     |
| Bảng nguyên liệu | Hiển thị danh sách NL từ định mức với số lượng kế hoạch/thực tế |


*Cột phải — Sản xuất & Thời gian:*


| Trường             | Loại nhập        | Ghi chú                                                                              |
| ------------------ | ---------------- | ------------------------------------------------------------------------------------ |
| Quy trình sản xuất | Dropdown         | Chọn từ danh sách quy trình (Phòng kỹ thuật tạo)                                     |
| Lưu đồ quy trình   | Hiển thị tự động | Nếu chưa có lưu đồ → thông báo "Vui lòng tạo lưu đồ trong module Quy trình sản xuất" |
| Số ngày SX (KH)    | Số               | Kế hoạch                                                                             |
| Số ngày SX (TT)    | Số               | Thực tế                                                                              |
| Số công nhân       | Số               |                                                                                      |
| Tiền OT/ngày       | Số               | VNĐ                                                                                  |


> **Nếu không có quy trình sản xuất:** Yêu cầu Phòng kỹ thuật hoặc Phòng sản xuất tạo quy trình và lưu đồ trước.

**Section 3: Tổng hợp chi phí (mỗi sản phẩm)**

Bảng tổng hợp tự động tính:


| Mục                     | Công thức                     | Ghi chú                    |
| ----------------------- | ----------------------------- | -------------------------- |
| Chi phí nguyên liệu     | Tổng (NL × đơn giá)           | Từ định mức + giá NL       |
| Chi phí nhân công       | Số công nhân × ngày × đơn giá |                            |
| Chi phí OT              | Tiền OT × số ngày             |                            |
| Chi phí chung (phân bổ) | Từ bảng chi phí chung         | Phân bổ theo khối lượng SP |
| Chi phí xuất khẩu       | Từ bảng chi phí XK            | Chỉ cho đơn quốc tế        |
| **Giá vốn/kg**          | Tổng chi phí ÷ khối lượng     | Tự động                    |
| Lợi nhuận cộng thêm     | Nhập tay (VNĐ/kg)             |                            |
| **Giá bán/kg**          | Giá vốn + Lợi nhuận           | Tự động                    |


#### Bảng chi phí chung (áp dụng cho nhiều sản phẩm)

Nằm bên dưới các tab sản phẩm, gồm:

- Tên bảng chi phí (VD: "Chi phí chung 1")
- Chọn chi phí từ danh sách chi phí chung đã tạo ở Tab 4
- Mỗi chi phí có: Kế hoạch (VNĐ) + Thực tế (VNĐ)
- Chọn sản phẩm được phân bổ (nếu không chọn → phân bổ cho tất cả)
- Nút "Thêm bảng chi phí chung" để tạo nhiều bảng

#### Bảng chi phí xuất khẩu

- Chọn chi phí từ danh sách chi phí xuất khẩu đã tạo ở Tab 4
- Mỗi chi phí có: Kế hoạch USD + Thực tế USD + Tỉ giá kế hoạch + Tỉ giá thực tế
- Tự động quy đổi sang VNĐ

#### Tổng hợp toàn đơn hàng (sidebar phải)


| Mục                     | Công thức                                      |
| ----------------------- | ---------------------------------------------- |
| Phần trăm thuế (%)      | Nhập tay                                       |
| Lợi nhuận trước thuế    | Tổng (lợi nhuận × kg chính phẩm) của tất cả SP |
| Lợi nhuận sau thuế      | Lợi nhuận trước thuế - (trước thuế × % thuế)   |
| Phần trăm quỹ (%)       | Nhập tay                                       |
| Trích các quỹ           | Lợi nhuận sau thuế × % quỹ                     |
| **Lợi nhuận thực nhận** | Lợi nhuận sau thuế - Trích các quỹ             |


Mỗi mục đều hiển thị 2 dòng: **Kế hoạch** (màu xanh dương) và **Thực tế** (màu xanh lá).

#### Lưu và tạo báo giá

- **Nút "Lưu"**: Lưu bảng tính vào database, có thể mở lại chỉnh sửa sau
- **Nút "Tạo báo giá"**: Tạo báo giá chính thức từ bảng tính → yêu cầu nhập thêm: Hiệu lực báo giá (ngày), Trạng thái, Ghi chú

---

### 3.4. Bảng lương (PayrollManagement)

Module bảng lương cho phép quản lý và tính toán lương nhân viên theo tháng/năm.

#### Thu nhập


| Trường            | Ghi chú                                                             |
| ----------------- | ------------------------------------------------------------------- |
| Lương cơ bản      | Nhập tay hoặc lấy từ hợp đồng                                       |
| Lương KPI         | Thưởng theo KPI đạt được                                            |
| Phụ cấp chức vụ   | Phụ cấp theo vị trí                                                 |
| Phụ cấp khác      | Các phụ cấp phát sinh                                               |
| **Tổng thu nhập** | Tự động = Lương cơ bản + Lương KPI + Phụ cấp chức vụ + Phụ cấp khác |


#### Khấu trừ


| Trường             | Ghi chú                           |
| ------------------ | --------------------------------- |
| BHXH               | Bảo hiểm xã hội                   |
| BHYT               | Bảo hiểm y tế                     |
| BHTN               | Bảo hiểm thất nghiệp              |
| Thuế TNCN          | Thuế thu nhập cá nhân             |
| Khấu trừ KPI       | Trừ khi không đạt KPI             |
| Khấu trừ ngày nghỉ | Tự động tính theo số ngày nghỉ    |
| **Tổng khấu trừ**  | Tự động = tổng các khoản khấu trừ |


#### Ngày công


| Trường       | Ghi chú                              |
| ------------ | ------------------------------------ |
| Số ngày làm  | Số ngày thực tế làm việc trong tháng |
| Số ngày nghỉ | Số ngày nghỉ không lương             |
| Giờ OT       | Số giờ làm thêm                      |
| Tiền OT      | Tự động tính theo công thức          |


#### Công thức tính


| Tham số                    | Công thức                                         |
| -------------------------- | ------------------------------------------------- |
| Số ngày công chuẩn / tháng | Cấu hình tại mục cài đặt (ví dụ: 26 ngày)         |
| Khấu trừ ngày nghỉ         | `= Lương cơ bản ÷ Ngày công chuẩn × Số ngày nghỉ` |
| Giá tiền OT (₫/giờ)        | Cấu hình tại mục cài đặt                          |
| Tiền OT                    | `= Giá OT × Số giờ OT`                            |


#### Thao tác

- **Lọc bảng lương:** Chọn **Tháng** và **Năm** để xem bảng lương tương ứng.
- **Chỉnh sửa:** Click vào dòng nhân viên để mở form chỉnh sửa chi tiết.
- **Gửi bảng lương:** Gửi thông báo bảng lương đến tất cả nhân viên (yêu cầu quyền Quản trị viên hoặc Trưởng phòng).

---

## 4. Phòng chăm sóc đối tác

### 4.1. Tổng quan

Phòng chăm sóc đối tác chịu trách nhiệm quản lý quan hệ với khách hàng, nhà cung cấp và đối tác logistics.

> **Lưu ý:** Tính năng đang trong quá trình phát triển.

### 4.2. Các tính năng đang xây dựng

- Quản lý thông tin khách hàng
- Quản lý thông tin nhà cung cấp
- Quản lý đối tác vận chuyển / logistics
- Theo dõi dịch vụ và hợp đồng

### 4.3. Dịch vụ hiện có

Nhân viên phòng chăm sóc đối tác hiện có thể:

- Tra cứu danh sách đối tác trong hệ thống
- Phối hợp với Phòng giá thành để xử lý báo giá và đơn hàng liên quan đối tác

---

---

## 6. Phụ thuộc dữ liệu giữa các phòng ban


| Phòng giá thành cần                  | Phòng ban cung cấp        | Cách kiểm tra                              |
| ------------------------------------ | ------------------------- | ------------------------------------------ |
| Danh sách khách hàng                 | Phòng kinh doanh          | Dropdown khách hàng trong form YCBG        |
| Danh sách sản phẩm                   | Phòng kinh doanh          | Dropdown sản phẩm trong form YCBG          |
| Định mức nguyên vật liệu             | Phòng kỹ thuật            | Dropdown "Mã định mức NVL" trong bảng tính |
| Quy trình sản xuất + lưu đồ          | Phòng kỹ thuật / Sản xuất | Dropdown quy trình trong bảng tính         |
| Tồn kho nguyên liệu                  | Kho (module kho)          | Nút "Tồn kho" trong bảng tính              |
| Thông tin nhân viên (cho bảng lương) | Phòng nhân sự / Admin     | Danh sách NV trong module bảng lương       |


**Khi dữ liệu phụ thuộc chưa có:**

- Dropdown sẽ trống hoặc không có lựa chọn phù hợp
- Thông báo lỗi: "Vui lòng tạo lưu đồ trong module Quy trình sản xuất trước khi sử dụng"
- Giải pháp: Liên hệ phòng ban tương ứng để tạo dữ liệu trước

---

## 7. Escalation (Leo thang xử lý)

Khi gặp sự cố hoặc vượt thẩm quyền, thực hiện theo trình tự:

1. **Nhân viên (Nhân viên):** Liên hệ Tổ trưởng của phòng để được hỗ trợ.
2. **Tổ trưởng:** Báo cáo lên Trưởng phòng nếu không tự xử lý được.
3. **Trưởng phòng:** Liên hệ Quản trị viên hệ thống hoặc bộ phận IT nếu vấn đề liên quan kỹ thuật.
4. **Vấn đề bảng lương sai số liệu:** Kiểm tra lại công thức cài đặt (ngày công chuẩn, giá OT) trước khi báo cáo.
5. **Vấn đề phân quyền:** Liên hệ Quản trị viên để cấp lại quyền truy cập.
6. **Thiếu dữ liệu phụ thuộc:** Liên hệ phòng ban tương ứng (xem bảng mục 6).

---

## 8. FAQ

**Q1: Làm thế nào để tạo một yêu cầu báo giá (YCBG)?**

> Phòng giá thành **không tạo YCBG** — đó là quyền của Phòng kinh doanh. Phòng giá thành chỉ xem YCBG và tạo báo giá từ đó. Vào tab **"Danh sách YCBG"** → tìm YCBG cần xử lý → nhấn biểu tượng **"Tạo báo giá"** (file) → điền bảng tính → nhấn **"Tạo báo giá"**.

**Q2: Bảng tính báo giá yêu cầu "Mã định mức NVL" nhưng dropdown trống?**

> Định mức nguyên vật liệu do **Phòng kỹ thuật** tạo. Liên hệ Phòng kỹ thuật để tạo định mức cho sản phẩm cần báo giá.

**Q3: Bảng tính báo giá báo "Vui lòng tạo lưu đồ trong module Quy trình sản xuất"?**

> Quy trình sản xuất và lưu đồ do **Phòng kỹ thuật** hoặc **Phòng sản xuất** tạo. Liên hệ để tạo quy trình trước khi tính chi phí sản xuất.

**Q4: Bảng lương tháng hiển thị sai, tôi cần làm gì?**

> Kiểm tra lại các thông số cài đặt: **Số ngày công chuẩn / tháng** và **Giá tiền OT**. Nếu đã đúng, kiểm tra lại số ngày nghỉ và giờ OT của nhân viên đó rồi lưu lại.

**Q5: Tại sao cột "Tổng thu nhập" và "Tổng khấu trừ" không thể nhập tay?**

> Đây là các trường tính tự động dựa trên các khoản thu nhập và khấu trừ đã nhập. Hệ thống tự cộng để tránh sai sót.

**Q6: Làm sao gửi thông báo bảng lương cho toàn bộ nhân viên?**

> Vào module **Bảng lương**, chọn đúng **Tháng** và **Năm**, sau đó nhấn nút **Gửi bảng lương**. Thao tác này yêu cầu quyền Quản trị viên hoặc Trưởng phòng.

**Q7: Phòng chăm sóc đối tác có quản lý hợp đồng không?**

> Tính năng quản lý hợp đồng đối tác đang trong quá trình phát triển. Hiện tại có thể tra cứu thông tin đối tác cơ bản và phối hợp với phòng giá thành.

**Q8: Khấu trừ ngày nghỉ được tính như thế nào?**

> Công thức: `Khấu trừ ngày nghỉ = Lương cơ bản ÷ Số ngày công chuẩn × Số ngày nghỉ`. Số ngày công chuẩn được cấu hình trong phần cài đặt bảng lương.

**Q9: Chi phí chung và chi phí xuất khẩu khác nhau thế nào?**

> **Chi phí chung** là chi phí vận hành (điện, nước, nhân sự gián tiếp...) — phân bổ cho tất cả sản phẩm theo khối lượng. **Chi phí xuất khẩu** là chi phí riêng cho đơn hàng quốc tế (vận chuyển biển, bảo hiểm, thủ tục hải quan...) — tính bằng USD với tỉ giá.

**Q10: Làm sao thêm chi phí bổ sung vào bảng tính?**

> Trong bảng tính báo giá, nhấn nút **"Thêm chi phí bổ sung"** → tạo tab mới → chọn loại sản phẩm, tên sản phẩm, khối lượng, định mức → nhập chi phí tương tự tab sản phẩm chính.

**Q11: Tôi muốn xem lại bảng tính của báo giá đã tạo?**

> Vào tab **"Danh sách đơn hàng"** → nhấn nút **"Xem bảng tính"** trên dòng đơn hàng tương ứng. Hoặc vào tab **"Danh sách báo giá"** → nhấn **"Xem"** để xem chi tiết.

**Q12: Trạng thái sản xuất có thể lùi lại không?**

> Không. Trạng thái sản xuất chỉ tiến theo thứ tự: Chờ lên kế hoạch → Chờ SX → Đang SX → Chờ giao hàng → Đã lên container → Đang vận chuyển → Đã giao. Không thể lùi hoặc nhảy cóc.

---

## department: DEPT_GENERAL

department_name: "Bộ phận tổng hợp — Phòng giá thành"
roles: [Quản trị viên, Trưởng phòng, Tổ trưởng, Nhân viên]
access: department_restricted
language: vi

# Bảng tính chi phí báo giá — Hướng dẫn nhập liệu

Tài liệu này hướng dẫn chi tiết cách điền bảng tính chi phí (QuotationCalculator) trong Phòng giá thành. Bảng tính được dùng để tính giá thành sản phẩm và đề xuất giá báo khách trước khi phát hành Báo giá chính thức.

---

## Cách mở bảng tính

**Bộ phận tổng hợp** → **Phòng giá thành** → tab **Danh sách YCBG** → tìm YCBG cần xử lý → nhấn biểu tượng **"Tạo báo giá"** (biểu tượng file) trên dòng đó → bảng tính mở ra.

> Mỗi sản phẩm trong YCBG tương ứng một **tab sản phẩm** riêng. Ngoài ra có thể thêm **Tab Chi phí bổ sung** và xem **Tab Tổng chi phí đơn hàng** / **Tab Doanh thu & lợi nhuận**.

---

## Cấu trúc bảng tính

```
[Tab SP 1] [Tab SP 2] ... [+ Chi phí bổ sung] [Tổng chi phí đơn hàng] [Doanh thu & lợi nhuận]
```

Mỗi tab sản phẩm gồm **4 nhóm thông tin** chính (xem hướng dẫn bên dưới).

---

## Tab sản phẩm chính

### Nhóm 1 — Thông tin sản phẩm


| Trường          | Bắt buộc | Ghi chú                                                         |
| --------------- | -------- | --------------------------------------------------------------- |
| Loại sản phẩm   | ✅        | Chọn từ dropdown — lọc danh sách sản phẩm bên dưới              |
| Tên sản phẩm    | ✅        | Chọn sản phẩm cần tính giá                                      |
| Khối lượng      |          | Tự động lấy từ YCBG, có thể sửa (đơn vị: kg)                    |
| Đơn vị          |          | Mặc định "kg"                                                   |
| Mã định mức NVL | ✅        | Chọn định mức nguyên vật liệu phù hợp với sản phẩm và quy trình |


> **Định mức NVL** là bảng tỉ lệ chuyển đổi từ nguyên liệu đầu vào (nguyên liệu thô) sang thành phẩm đầu ra (sản phẩm hoàn chỉnh). Mỗi định mức có thể cho ra nhiều loại thành phẩm với tỉ lệ khác nhau.

---

### Nhóm 2 — Nguyên liệu, Tồn kho & Sản xuất

**Phần tồn kho (cột trái):**


| Trường                 | Ghi chú                                                                   |
| ---------------------- | ------------------------------------------------------------------------- |
| NL đầu vào             | Chọn loại nguyên liệu thô được dùng làm đầu vào (lấy từ định mức đã chọn) |
| SP đầu ra              | Chọn loại thành phẩm sẽ sản xuất (lấy từ định mức đã chọn)                |
| Nút "Kiểm tra tồn kho" | Xem tồn kho hiện tại của NL đầu vào và SP đầu ra đã chọn                  |


**Bảng tồn kho nguyên liệu** (tự động hiển thị sau khi chọn NL đầu vào):


| Cột                      | Ý nghĩa                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------- |
| Nguyên liệu              | Tên nguyên liệu                                                                       |
| Tồn kho hiện tại         | Số lượng đang có trong kho                                                            |
| Đơn vị                   | Đơn vị tính                                                                           |
| Nguyên liệu cần mua thêm | Tự động tính = Nhu cầu SX − Tồn kho; âm nghĩa là đủ hàng, dương nghĩa là cần mua thêm |


**Phần sản xuất (cột phải):**


| Trường                             | Ghi chú                                                              |
| ---------------------------------- | -------------------------------------------------------------------- |
| Tổng nguyên liệu cần sản xuất (KH) | **Nhập tay** — số kg nguyên liệu dự kiến đưa vào sản xuất (kế hoạch) |
| Tổng nguyên liệu cần sản xuất (TT) | **Nhập tay** — số kg nguyên liệu thực tế đã/sẽ dùng                  |
| Tổng thành phẩm cần SX thêm (KH)   | **Nhập tay** — số kg thành phẩm cần làm thêm (nếu còn thiếu)         |
| Tổng thành phẩm cần SX thêm (TT)   | **Nhập tay** — thực tế đã/sẽ sản xuất thêm                           |
| Tổng khối lượng thành phẩm (TT)    | **Nhập tay** — tổng kg thành phẩm thu được thực tế                   |
| Ngày bắt đầu sản xuất (KH)         | Chọn ngày — kế hoạch bắt đầu                                         |
| Ngày bắt đầu sản xuất (TT)         | Chọn ngày — thực tế bắt đầu                                          |
| Số ngày sản xuất hoàn thành (KH)   | **Nhập tay** — số ngày kế hoạch để hoàn thành sản xuất               |
| Số ngày sản xuất hoàn thành (TT)   | **Nhập tay** — số ngày thực tế hoàn thành                            |
| Ghi chú                            | Ghi chú thêm về sản xuất                                             |


---

### Nhóm 3 — Lưu đồ quy trình & Chi phí sản xuất

**Chọn quy trình sản xuất:**

- Dropdown **"Chọn quy trình sản xuất"** → chọn quy trình phù hợp với sản phẩm đang tính
- Danh sách lấy từ module **Quy trình sản xuất** (DEPT_PRODUCTION)
- Sau khi chọn, bảng **lưu đồ quy trình** hiện ra với các phân đoạn và chi phí từng phân đoạn

> **Lưu ý:** Nếu quy trình chưa có lưu đồ, hệ thống hiển thị cảnh báo vàng. Cần yêu cầu phòng QLSX tạo lưu đồ trong module Quy trình sản xuất trước.

**Bảng lưu đồ quy trình** (hiển thị sau khi chọn quy trình):


| Cột           | Ý nghĩa                                                             |
| ------------- | ------------------------------------------------------------------- |
| Phân đoạn     | Tên giai đoạn trong quy trình (ví dụ: Tiếp nhận NL, Sơ chế, Sấy...) |
| Loại chi phí  | Phân loại chi phí trong phân đoạn đó                                |
| Số lượng KH   | Số lượng theo kế hoạch (từ lưu đồ, chỉ đọc)                         |
| Giá thành KH  | Đơn giá kế hoạch (từ lưu đồ, chỉ đọc)                               |
| Số lượng TT   | **Nhập tay** — số lượng thực tế sử dụng                             |
| Giá thực tế   | **Nhập tay** — đơn giá thực tế                                      |
| Thành tiền TT | Tự động tính = Số lượng TT × Giá thực tế                            |


> Chi phí sản xuất tổng = Tổng thành tiền TT của tất cả phân đoạn × Số ngày sản xuất thực tế.

---

### Nhóm 4 — Thành phẩm đầu ra & Giá báo khách

**Bảng thành phẩm đầu ra** (tự động hiển thị khi đã chọn định mức NVL):


| Hàng                         | Cột Kế hoạch                                  | Cột Thực tế                                              |
| ---------------------------- | --------------------------------------------- | -------------------------------------------------------- |
| Tỉ lệ thu hồi (%)            | Từ định mức, chỉ đọc                          | **Nhập tay** — tỉ lệ thu hồi thực tế của từng thành phẩm |
| Số kg thành phẩm             | Tự động tính từ NL × tỉ lệ KH                 | Tự động tính từ NL TT × tỉ lệ TT                         |
| Giá hòa vốn (VNĐ/KG)         | Tự động tính (xem công thức)                  | Tự động tính                                             |
| Lợi nhuận cộng thêm (VNĐ/KG) | **Nhập tay** — biên lợi nhuận mong muốn       | **Nhập tay**                                             |
| Giá báo khách (VNĐ/KG)       | **Tự động** = Giá hòa vốn + Lợi nhuận         | Tự động                                                  |
| Giá báo khách (USD/KG)       | **Tự động** = Giá VNĐ ÷ Tỉ giá                | Tự động                                                  |
| Tỉ giá USD                   | **Nhập tay** ở ô nhỏ bên cạnh (ví dụ: 25.000) | (dùng chung)                                             |


> **Giá hòa vốn** = (Chi phí nguyên liệu + Chi phí sản xuất + Chi phí chung + Chi phí xuất khẩu) ÷ Số kg thành phẩm. Đây là mức giá tối thiểu để không lỗ.

> Chỉ cột của **SP đầu ra đã chọn** (highlight xanh) mới được nhập lợi nhuận. Các thành phẩm phụ (cột xám) điền **Giá hòa vốn** thủ công nếu cần.

---

## Chi phí chung (dùng chung cho toàn đơn hàng)

Nằm ở **phần giữa của từng tab sản phẩm**, bên dưới bảng nguyên liệu.

**Cách thêm bảng chi phí chung:**

- Nhấn **"+ Thêm bảng chi phí chung"** → một bảng mới xuất hiện
- Đặt tên bảng (ví dụ: "Chi phí nhân công văn phòng")
- Chọn sản phẩm áp dụng (nhấn **"Chọn SP"** → tick sản phẩm muốn phân bổ chi phí này, mặc định "Tất cả")
- Thêm từng khoản: chọn **Tên chi phí** từ danh mục → điền **Số lượng KH** và **Thực tế**


| Cột         | Ý nghĩa                                    |
| ----------- | ------------------------------------------ |
| Tên chi phí | Chọn từ danh mục chi phí chung đã cấu hình |
| Số lượng KH | Số lượng theo kế hoạch                     |
| Thực tế     | Số tiền thực tế phát sinh (VNĐ)            |


> Chi phí chung được **phân bổ theo khối lượng** giữa các sản phẩm được chọn. Nếu chỉ có 1 sản phẩm, toàn bộ chi phí tính cho sản phẩm đó.

---

## Chi phí xuất khẩu

Nằm ở **phần cuối của từng tab sản phẩm**, bên dưới chi phí chung.


| Trường              | Ghi chú                                        |
| ------------------- | ---------------------------------------------- |
| Tên chi phí         | Chọn từ danh mục chi phí xuất khẩu đã cấu hình |
| Số lượng KH (USD)   | Số lượng kế hoạch tính bằng USD                |
| Tỉ giá (KH)         | Tỉ giá USD/VNĐ áp dụng kế hoạch                |
| Thành tiền KH (VNĐ) | Tự động tính                                   |
| Số lượng TT (USD)   | Số lượng thực tế                               |
| Tỉ giá (TT)         | Tỉ giá thực tế                                 |
| Thành tiền TT (VNĐ) | Tự động tính                                   |


> Chi phí xuất khẩu được **phân bổ theo tổng thành phẩm** (`tongThanhPhamCanSxThem`). Nếu chỉ có 1 sản phẩm, toàn bộ tính cho sản phẩm đó.

---

## Tab Chi phí bổ sung

Dùng khi một đơn hàng có sản phẩm **không có trong YCBG gốc** nhưng cần tính chi phí riêng (ví dụ: phụ phẩm, sản phẩm phát sinh).

**Cách thêm:** Nhấn nút **"+ Chi phí bổ sung"** trên thanh tab → nhập tên → xác nhận.

Cấu trúc giống tab sản phẩm chính, nhưng cần chọn thêm:

- **Loại sản phẩm** và **Tên sản phẩm** thủ công
- **Mã định mức NVL** phù hợp

---

## Tab Tổng chi phí đơn hàng

Tổng hợp tự động từ tất cả tab. Không cần nhập tay. Dùng để kiểm tra tổng chi phí toàn đơn.


| Cột            | Ý nghĩa                                                        |
| -------------- | -------------------------------------------------------------- |
| Chi phí        | Tên khoản chi phí (từng sản phẩm + chi phí chung + chi phí XK) |
| Kế hoạch (VNĐ) | Tổng chi phí kế hoạch                                          |
| Thực tế (VNĐ)  | Tổng chi phí thực tế                                           |


---

## Tab Doanh thu & lợi nhuận

Tổng hợp doanh thu và lợi nhuận sau khi đã tính xong chi phí.


| Mục                  | Ý nghĩa                                 |
| -------------------- | --------------------------------------- |
| Lợi nhuận trước thuế | Doanh thu − Tổng chi phí                |
| Thuế (%)             | **Nhập tay** — % thuế áp dụng           |
| Lợi nhuận sau thuế   | Tự động tính                            |
| Quỹ (%)              | **Nhập tay** — % trích quỹ doanh nghiệp |
| Lợi nhuận thực nhận  | Lợi nhuận sau thuế − Quỹ                |


---

## Lưu và tạo báo giá

Sau khi điền đầy đủ → nhấn **"Lưu bảng tính"** (hoặc **"Cập nhật"** nếu đã có).

Hệ thống lưu toàn bộ bảng tính và tạo **Báo giá** với giá báo khách đã tính.

Phòng kinh doanh sau đó có thể xem báo giá ở tab **Danh sách báo giá** và gửi cho khách.

---

## Quy trình nhập liệu theo thứ tự đề xuất

1. Chọn **Loại sản phẩm** → **Tên sản phẩm**
2. Chọn **Mã định mức NVL**
3. Chọn **NL đầu vào** và **SP đầu ra**
4. Nhập **Tổng nguyên liệu cần sản xuất** (KH và TT)
5. Nhập **Số ngày sản xuất** (KH và TT)
6. Chọn **Quy trình sản xuất** → điền **Số lượng TT** và **Giá thực tế** trong lưu đồ
7. Thêm **Chi phí chung** và **Chi phí xuất khẩu** nếu có
8. Điền **Tỉ lệ thu hồi thực tế** và **Tỉ giá USD**
9. Điền **Lợi nhuận cộng thêm**
10. Kiểm tra **Giá báo khách** → nhấn **Lưu**

---

## Câu hỏi thường gặp

**Q: Tôi không thấy quy trình sản xuất nào trong dropdown?**

> Kiểm tra module **Quy trình sản xuất** (Bộ phận sản xuất → QLSX). Nếu chưa có quy trình, cần phối hợp với phòng QLSX để tạo.

**Q: Quy trình đã chọn nhưng không hiện bảng lưu đồ — chỉ có cảnh báo vàng?**

> Quy trình chưa có lưu đồ (flowchart). Yêu cầu phòng QLSX vào module **Quy trình sản xuất** → mở quy trình → tạo lưu đồ với các phân đoạn và chi phí.

**Q: Định mức NVL là gì, tìm ở đâu?**

> Định mức NVL quy định tỉ lệ chuyển đổi từ nguyên liệu thô sang thành phẩm. Ví dụ: 10 kg mít tươi → 3.5 kg mít sấy dẻo + 1.2 kg mít sấy giòn. Danh mục định mức được quản lý ở module **Định mức NVL**.

**Q: Tại sao giá hòa vốn hiển thị 0?**

> Giá hòa vốn cần đủ dữ liệu: định mức NVL đã chọn, số lượng nguyên liệu cần SX, chi phí sản xuất (lưu đồ), và chi phí chung/xuất khẩu. Kiểm tra từng bước đã nhập chưa.

**Q: Giá báo khách (VNĐ/KG) bị khóa không sửa được?**

> Đúng — đây là trường **tự động tính** = Giá hòa vốn + Lợi nhuận cộng thêm. Muốn thay đổi, điều chỉnh ô **Lợi nhuận cộng thêm**.

**Q: Chi phí chung áp dụng cho tất cả sản phẩm hay từng sản phẩm?**

> Có thể chọn. Mỗi bảng chi phí chung có nút **"Chọn SP"** để chỉ định áp dụng cho sản phẩm nào. Nếu không chọn (mặc định "Tất cả"), chi phí được phân bổ đều theo khối lượng cho tất cả sản phẩm trong đơn.

**Q: Có thể xem bảng tính sau khi đã lưu không?**

> Có. Vào tab **Danh sách đơn hàng** → tìm đơn hàng liên kết → nhấn nút **"Xem bảng tính"** (biểu tượng calculator).

