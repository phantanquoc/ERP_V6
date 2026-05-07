---
department: DEPT_BUSINESS
department_name: "Bộ phận kinh doanh"
roles: [ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE]
access: department_restricted
language: vi
---

# Bộ phận Kinh doanh

## 1. Tổng quan & Sơ đồ quy trình

Bộ phận Kinh doanh trong ERP được chia làm **hai phòng riêng biệt**:

| Phòng | Trang | Đặc điểm |
|---|---|---|
| **Phòng KD Quốc Tế** | `BusinessInternational` | Khách hàng nước ngoài, đơn hàng xuất khẩu, giao dịch bằng USD, có trường Quốc gia / Cảng đến |
| **Phòng KD Nội Địa** | `BusinessDomestic` | Khách hàng trong nước, giao dịch VNĐ, có Tỉnh/Thành phố / Mã số thuế |

### Sơ đồ quy trình kinh doanh

```
Khách hàng yêu cầu
        │
        ▼
[YCBG] Yêu cầu báo giá
  (QuotationRequestManagement)
        │  ← Nhân viên KD tạo YCBG, chọn KH, thêm sản phẩm
        ▼
[BG] Báo giá
  (QuotationManagement)
        │  ← Dựa trên YCBG, tính giá, điền thông tin giao hàng
        ▼
[ĐH] Đơn hàng
  (OrderManagement)
        │  ← Khách hàng xác nhận → tạo đơn hàng, theo dõi SX & thanh toán
        ▼
[Phản hồi KH]
  (CustomerFeedbackManagement)
        │  ← Ghi nhận khiếu nại / góp ý / khen ngợi sau giao hàng
        ▼
      Đóng
```

---

## 2. Quyền truy cập theo vai trò

| Chức năng | EMPLOYEE | TEAM_LEAD | DEPARTMENT_HEAD | ADMIN |
|---|:---:|:---:|:---:|:---:|
| Xem danh sách YCBG | ✅ | ✅ | ✅ | ✅ |
| Tạo YCBG mới | ✅ | ✅ | ✅ | ✅ |
| Chỉnh sửa YCBG | ✅ (của mình) | ✅ | ✅ | ✅ |
| Xóa YCBG | ❌ | ✅ | ✅ | ✅ |
| Xem danh sách Báo giá | ✅ | ✅ | ✅ | ✅ |
| Tạo / cập nhật Báo giá | ✅ | ✅ | ✅ | ✅ |
| Xem Đơn hàng | ✅ | ✅ | ✅ | ✅ |
| Cập nhật trạng thái Đơn hàng | ✅ | ✅ | ✅ | ✅ |
| Quản lý Khách hàng QT / NĐ | ✅ | ✅ | ✅ | ✅ |
| Xóa Khách hàng | ❌ | ❌ | ✅ | ✅ |
| Ghi nhận Phản hồi KH | ✅ | ✅ | ✅ | ✅ |
| Xuất Excel | ✅ | ✅ | ✅ | ✅ |

---

## 3. Phòng KD Quốc Tế (`BusinessInternational`)

Trang gồm **5 tab** chính:

| Tab | ID | Nội dung |
|---|---|---|
| Danh sách yêu cầu BG | `quotationRequests` | Quản lý YCBG từ khách hàng quốc tế |
| Danh sách BG | `quotations` | Quản lý báo giá đã lập |
| Đơn hàng quốc tế | `orders` | Theo dõi đơn hàng xuất khẩu |
| Danh sách khách hàng quốc tế | `customers` | Hồ sơ khách hàng nước ngoài |
| Danh sách phản hồi từ KH | `feedback` | Ghi nhận và xử lý phản hồi |

### 3.1 Tab: Yêu cầu Báo giá — YCBG (`QuotationRequestManagement`, `customerType="Quốc tế"`)

#### Form tạo YCBG mới

| Trường | Bắt buộc | Loại nhập | Tùy chọn / Ghi chú |
|---|:---:|---|---|
| Mã yêu cầu báo giá | | Văn bản | Tự động hoặc để trống |
| Khách hàng | ✅ | Chọn từ danh sách | Danh sách khách hàng tải từ hệ thống |
| Danh sách sản phẩm | ✅ | Nhiều dòng | Nhấn "+ Thêm sản phẩm" |
| — Sản phẩm | ✅ | Chọn từ danh sách | |
| — Yêu cầu sản phẩm | | Văn bản | |
| — Quy cách đóng gói | | Văn bản | |
| — Số lượng | ✅ | Số | |
| — Đơn vị tính | ✅ | Văn bản | Placeholder: "VD: kg, tấn, thùng..." |
| — Giá đối thủ bán (VND) | | Số | |
| — Giá bán gần nhất (VND) | | Số | |
| Hình thức vận chuyển | | Dropdown + nhập tay | Giao hàng tận nơi / Khách tự đến lấy / Vận chuyển đường bộ / Vận chuyển đường thủy; hoặc nhập: FOB, CIF, CFR... |
| Hình thức thanh toán | | Dropdown + nhập tay | Tiền mặt / Chuyển khoản / Công nợ 15 ngày / Công nợ 30 ngày / Công nợ 45 ngày; hoặc nhập T/T, L/C... |
| Địa chỉ giao hàng | | Văn bản | Placeholder: "Nhập địa chỉ giao hàng..." |
| Quốc gia | | Văn bản | **Chỉ chế độ quốc tế** |
| Cảng đến | | Văn bản | **Chỉ chế độ quốc tế** |
| Ghi chú | | Văn bản dài | |

#### Thông tin chi tiết YCBG (chỉ xem)

| Trường | Ghi chú |
|---|---|
| Mã yêu cầu báo giá | |
| Ngày yêu cầu | |
| Mã nhân viên | |
| Tên nhân viên | |
| Mã khách hàng | |
| Tên khách hàng | |
| Danh sách sản phẩm | Xem từng dòng |
| Hình thức vận chuyển | |
| Hình thức thanh toán | |
| Địa chỉ giao hàng | |
| Quốc gia | |
| Cảng đến | |
| Ghi chú | |

---

### 3.2 Tab: Báo giá (`QuotationManagement`)

#### Form cập nhật Báo giá

| Trường | Bắt buộc | Loại nhập | Tùy chọn / Ghi chú |
|---|:---:|---|---|
| Mã báo giá | | Chỉ đọc | Tự động |
| Ngày báo giá | | Chỉ đọc | |
| Khách hàng | | Chỉ đọc | Lấy từ YCBG |
| Sản phẩm | | Chỉ đọc | Lấy từ YCBG |
| Giá báo khách (VNĐ/KG) | ✅ | Số | Placeholder: "Nhập giá báo khách" |
| Thời gian giao hàng (ngày) | ✅ | Số | Placeholder: "Nhập thời gian giao hàng" |
| Hiệu lực báo giá (ngày) | ✅ | Số | Placeholder: "Nhập hiệu lực báo giá" |
| Trạng thái | ✅ | Chọn từ danh sách | Xem bảng trạng thái bên dưới |
| Ghi chú | | Văn bản dài | Placeholder: "Nhập ghi chú (nếu có)" |

#### Thông tin định mức (chỉ đọc — hiển thị khi xem chi tiết BG)

| Trường | Ghi chú |
|---|---|
| Mã định mức | |
| Tên định mức | |
| Tỉ lệ thu hồi | |
| Sản phẩm đầu ra | |
| Thành phẩm tồn kho | |
| Tổng thành phẩm cần SX thêm | |
| Tổng nguyên liệu cần sản xuất | |
| Nguyên liệu tồn kho | |
| Nguyên liệu cần nhập thêm | |

#### Trạng thái Báo giá

| Giá trị | Nhãn |
|---|---|
| `DANG_CHO_PHAN_HOI` | Đang chờ phản hồi |
| `DANG_CHO_GUI_DON_HANG` | Đang chờ gửi đơn hàng |
| `DA_DAT_HANG` | Đã đặt hàng |
| `KHONG_DAT_HANG` | Không đặt hàng |

---

### 3.3 Tab: Đơn hàng quốc tế (`OrderManagement`)

#### Thông tin chi tiết Đơn hàng (chỉ đọc)

| Trường | Ghi chú |
|---|---|
| Mã đơn hàng | |
| Ngày đặt hàng | |
| Mã báo giá | |
| Mã YCBG | |
| Mã khách hàng | |
| Tên khách hàng | |
| Nhân viên phụ trách | |
| Giá trị (USD) | |
| Giá trị (VNĐ) | |

#### Form cập nhật Đơn hàng

| Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|:---:|---|---|
| Giá trị đơn hàng (USD) | | Số | Placeholder: "0.00" |
| Giá trị đơn hàng (VNĐ) | | Số | Placeholder: "0.00" |
| Xuất khẩu — Đợt 1 (USD) | | Số | |
| Nội địa — Đợt 1 (VNĐ) | | Số | |
| Ngày thanh toán — Đợt 1 | | Chọn ngày | |
| Xuất khẩu — Đợt 2 (USD) | | Số | |
| Nội địa — Đợt 2 (VNĐ) | | Số | |
| Ngày thanh toán — Đợt 2 | | Chọn ngày | |
| Ngày bắt đầu sản xuất (KH) | | Chọn ngày | |
| Ngày hoàn thành sản xuất (KH) | | Chọn ngày | |
| Ngày hoàn thành thực tế | | Chọn ngày | |
| Ngày giao hàng | | Chọn ngày | |
| Trạng thái sản xuất | | Chọn từ danh sách | Xem bảng trạng thái SX |
| Trạng thái thanh toán | | Chọn từ danh sách | Xem bảng trạng thái TT |
| Ghi chú | | Văn bản dài | Placeholder: "Nhập ghi chú..." |

#### Trạng thái sản xuất

| Giá trị | Nhãn |
|---|---|
| `CHO_LEN_KE_HOACH` | Chờ lên kế hoạch |
| `CHO_SAN_XUAT` | Chờ sản xuất |
| `DANG_SAN_XUAT` | Đang sản xuất |
| `CHO_GIAO_HANG` | Chờ giao hàng |
| `DA_LEN_CONTAINER` | Đã lên container |
| `DANG_VAN_CHUYEN` | Đang vận chuyển |
| `DA_GIAO_CHO_KHACH_HANG` | Đã giao cho khách hàng |

#### Trạng thái thanh toán

| Giá trị | Nhãn |
|---|---|
| `DA_THANH_TOAN_DOT_1` | Đã thanh toán đợt 1 |
| `CHO_THANH_TOAN_DOT_2` | Chờ thanh toán đợt 2 |
| `DA_THANH_TOAN_DU` | Đã thanh toán đủ |

---

### 3.4 Tab: Khách hàng quốc tế (`InternationalCustomerManagement`)

#### Form thêm / chỉnh sửa khách hàng quốc tế

| Trường | Bắt buộc | Loại nhập | Tùy chọn / Ghi chú |
|---|:---:|---|---|
| Tên công ty | ✅ | Văn bản | |
| Người liên hệ | ✅ | Văn bản | |
| Quốc gia | ✅ | Văn bản | |
| Thành phố | | Văn bản | |
| Địa chỉ | | Văn bản | |
| Số điện thoại | | Văn bản | |
| Email | | Văn bản | |
| Website | | Văn bản | |
| Loại khách hàng | ✅ | Chọn từ danh sách | Nhà phân phối / Nhà nhập khẩu / Nhà bán lẻ / Đại lý |
| Trạng thái | | Chọn từ danh sách | Hoạt động / Tạm ngưng / Ngừng hợp tác |
| Ngày hợp tác | | Chọn ngày | Placeholder: "Chọn ngày hợp tác" |
| Doanh thu năm (USD) | | Số | |
| Số lượng đơn hàng | | Số | |
| Sản phẩm chính | | Văn bản | |
| Ghi chú | | Văn bản dài | |

---

### 3.5 Tab: Phản hồi từ khách hàng (`CustomerFeedbackManagement`)

#### Form tạo / cập nhật phản hồi

| Trường | Bắt buộc | Loại nhập | Tùy chọn / Ghi chú |
|---|:---:|---|---|
| Khách hàng | ✅ | Chọn từ danh sách | |
| Loại phản hồi | ✅ | Chọn từ danh sách | Khiếu nại / Góp ý / Khen ngợi / Yêu cầu hỗ trợ / Khác |
| Mức độ nghiêm trọng | ✅ | Chọn từ danh sách | Thấp / Trung bình / Cao / Khẩn cấp |
| Nội dung phản hồi | ✅ | Văn bản dài | |
| Sản phẩm liên quan | | Chọn từ danh sách | |
| Đơn hàng liên quan | | Chọn từ danh sách | |
| Người tiếp nhận | | Văn bản | Tự động điền người đăng nhập |
| Trạng thái xử lý | ✅ | Chọn từ danh sách | Chưa xử lý / Đang xử lý / Đã xử lý / Đã đóng |
| Biện pháp xử lý | | Văn bản dài | |
| Kết quả xử lý | | Văn bản dài | |
| Mức độ hài lòng | | Chọn từ danh sách | Rất không hài lòng / Không hài lòng / Trung bình / Hài lòng / Rất hài lòng |
| Ghi chú | | Văn bản dài | |

---

## 4. Phòng KD Nội Địa (`BusinessDomestic`)

Trang gồm **5 tab** tương tự Quốc Tế, nhưng dành cho thị trường trong nước:

| Tab | ID | Nội dung |
|---|---|---|
| Danh sách yêu cầu BG | `quotationRequests` | YCBG với `customerType="Nội địa"` |
| Danh sách BG | `quotations` | Báo giá nội địa |
| Đơn hàng nội địa | `orders` | Theo dõi đơn hàng trong nước |
| Danh sách khách hàng nội địa | `customers` | Hồ sơ khách hàng Việt Nam |
| Danh sách phản hồi từ KH | `feedback` | Phản hồi khách hàng nội địa |

> **Lưu ý:** Các tab YCBG, BG, Đơn hàng, Phản hồi KH dùng chung component với Quốc Tế nhưng lọc `customerType="Nội địa"`. Các trường **Quốc gia** và **Cảng đến** không xuất hiện trong YCBG nội địa.

### 4.1 Khách hàng Nội Địa (`DomesticCustomerManagement`)

#### Form thêm / chỉnh sửa khách hàng nội địa

| Trường | Bắt buộc | Loại nhập | Tùy chọn / Ghi chú |
|---|:---:|---|---|
| Tên công ty | ✅ | Văn bản | |
| Người liên hệ | ✅ | Văn bản | |
| Tỉnh/Thành phố | ✅ | Văn bản | |
| Quận/Huyện | | Văn bản | |
| Địa chỉ | | Văn bản | |
| Số điện thoại | | Văn bản | |
| Email | | Văn bản | |
| Website | | Văn bản | |
| Mã số thuế | | Văn bản | **Chỉ có ở khách hàng nội địa** |
| Loại khách hàng | ✅ | Chọn từ danh sách | Nhà phân phối / Nhà nhập khẩu / Nhà bán lẻ / Đại lý |
| Trạng thái | | Chọn từ danh sách | Hoạt động / Tạm ngưng / Ngừng hợp tác |
| Ghi chú | | Văn bản dài | |

> **So sánh QT vs NĐ:** Khách hàng quốc tế có thêm **Quốc gia, Thành phố, Ngày hợp tác, Doanh thu năm (USD), Số lượng đơn hàng, Sản phẩm chính**. Khách hàng nội địa có thêm **Quận/Huyện** và **Mã số thuế**.

---

## 5. Quản lý Sản phẩm Quốc tế

Sản phẩm dùng trong YCBG và BG được tải từ danh mục sản phẩm quốc tế của hệ thống. Khi tạo YCBG, nhân viên chọn sản phẩm từ dropdown (danh sách tải sẵn), sau đó nhập thêm:
- Yêu cầu sản phẩm (đặc tính, tiêu chuẩn kỹ thuật)
- Quy cách đóng gói
- Số lượng và đơn vị tính
- Giá đối thủ / giá bán gần nhất (nếu có)

---

## 6. Khi không có quyền — Escalation

| Tình huống | Liên hệ ai | Hành động |
|---|---|---|
| Cần xóa YCBG / BG đã tạo | `TEAM_LEAD` hoặc `DEPARTMENT_HEAD` | Báo cáo trực tiếp để được hỗ trợ |
| Cần xóa khách hàng | `DEPARTMENT_HEAD` hoặc `ADMIN` | Yêu cầu bằng văn bản nội bộ |
| Không thấy khách hàng trong dropdown | `ADMIN` hoặc người quản lý KD | Nhờ thêm mới khách hàng vào hệ thống |
| Muốn xem đơn hàng của nhân viên khác | `ADMIN` | Chỉ ADMIN mới có quyền xem tất cả |
| Cần thay đổi trạng thái đơn hàng sang giai đoạn trước | `ADMIN` | Trạng thái SX/TT không thể rollback tự động |

---

## 7. Câu hỏi thường gặp (FAQ)

**Q1: YCBG và Báo giá (BG) khác nhau như thế nào?**
> **YCBG (Yêu cầu báo giá):** Là yêu cầu từ phía khách hàng, nhân viên KD nhập thông tin nhu cầu của khách (sản phẩm, số lượng, điều kiện giao hàng).
> **BG (Báo giá):** Là đề xuất giá của công ty gửi cho khách, được lập dựa trên YCBG — bao gồm giá báo khách, thời gian giao hàng, hiệu lực báo giá.

**Q2: Tôi tạo YCBG xong nhưng quên thêm sản phẩm — có sửa được không?**
> Có. Nếu YCBG chưa được chuyển thành BG hoặc chưa bị khóa, bạn (hoặc TEAM_LEAD) có thể vào chỉnh sửa. Nhấn vào YCBG trong danh sách → chọn Sửa → thêm sản phẩm → Lưu.

**Q3: Báo giá ở trạng thái "Không đặt hàng" — có thể tái sử dụng không?**
> Không tái sử dụng trực tiếp. Nếu khách hàng quay lại sau, nên tạo **YCBG mới** và BG mới để đảm bảo giá và điều kiện được cập nhật.

**Q4: Khách hàng quốc tế và nội địa có dùng chung danh sách không?**
> Không. Khách hàng quốc tế được quản lý tại `InternationalCustomerManagement`, khách hàng nội địa tại `DomesticCustomerManagement`. Hai danh sách hoàn toàn tách biệt.

**Q5: Tôi muốn theo dõi tiến độ sản xuất của đơn hàng — xem ở đâu?**
> Vào tab **Đơn hàng** (quốc tế hoặc nội địa) → tìm đơn hàng → xem trường **Trạng thái sản xuất**. Các trạng thái từ "Chờ lên kế hoạch" → "Đã giao cho khách hàng" thể hiện toàn bộ vòng đời sản xuất.

**Q6: Phản hồi khách hàng loại "Khẩn cấp" cần xử lý trong bao lâu?**
> Hệ thống không đặt SLA cố định, nhưng phản hồi mức **Khẩn cấp** nên được xử lý trong ngày. Sau khi ghi nhận, cập nhật trạng thái xử lý từ "Chưa xử lý" sang "Đang xử lý" và thông báo cho DEPARTMENT_HEAD.

**Q7: Hình thức thanh toán "Công nợ" có nghĩa là gì?**
> Công nợ 15/30/45 ngày có nghĩa là khách hàng được phép thanh toán **sau khi nhận hàng** trong vòng 15, 30 hoặc 45 ngày. Đây là điều kiện thường dùng trong giao dịch B2B. Nếu điều kiện không có sẵn trong dropdown, nhân viên có thể nhập tay (VD: T/T 60 days, L/C at sight).
