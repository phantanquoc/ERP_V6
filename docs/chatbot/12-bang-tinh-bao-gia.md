---
department: DEPT_GENERAL
department_name: "Bộ phận tổng hợp — Phòng giá thành"
roles: [ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE]
access: department_restricted
language: vi
---

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

| Trường | Bắt buộc | Ghi chú |
|---|:---:|---|
| Loại sản phẩm | ✅ | Chọn từ dropdown — lọc danh sách sản phẩm bên dưới |
| Tên sản phẩm | ✅ | Chọn sản phẩm cần tính giá |
| Khối lượng | | Tự động lấy từ YCBG, có thể sửa (đơn vị: kg) |
| Đơn vị | | Mặc định "kg" |
| Mã định mức NVL | ✅ | Chọn định mức nguyên vật liệu phù hợp với sản phẩm và quy trình |

> **Định mức NVL** là bảng tỉ lệ chuyển đổi từ nguyên liệu đầu vào (nguyên liệu thô) sang thành phẩm đầu ra (sản phẩm hoàn chỉnh). Mỗi định mức có thể cho ra nhiều loại thành phẩm với tỉ lệ khác nhau.

---

### Nhóm 2 — Nguyên liệu, Tồn kho & Sản xuất

**Phần tồn kho (cột trái):**

| Trường | Ghi chú |
|---|---|
| NL đầu vào | Chọn loại nguyên liệu thô được dùng làm đầu vào (lấy từ định mức đã chọn) |
| SP đầu ra | Chọn loại thành phẩm sẽ sản xuất (lấy từ định mức đã chọn) |
| Nút "Kiểm tra tồn kho" | Xem tồn kho hiện tại của NL đầu vào và SP đầu ra đã chọn |

**Bảng tồn kho nguyên liệu** (tự động hiển thị sau khi chọn NL đầu vào):

| Cột | Ý nghĩa |
|---|---|
| Nguyên liệu | Tên nguyên liệu |
| Tồn kho hiện tại | Số lượng đang có trong kho |
| Đơn vị | Đơn vị tính |
| Nguyên liệu cần mua thêm | Tự động tính = Nhu cầu SX − Tồn kho; âm nghĩa là đủ hàng, dương nghĩa là cần mua thêm |

**Phần sản xuất (cột phải):**

| Trường | Ghi chú |
|---|---|
| Tổng nguyên liệu cần sản xuất (KH) | **Nhập tay** — số kg nguyên liệu dự kiến đưa vào sản xuất (kế hoạch) |
| Tổng nguyên liệu cần sản xuất (TT) | **Nhập tay** — số kg nguyên liệu thực tế đã/sẽ dùng |
| Tổng thành phẩm cần SX thêm (KH) | **Nhập tay** — số kg thành phẩm cần làm thêm (nếu còn thiếu) |
| Tổng thành phẩm cần SX thêm (TT) | **Nhập tay** — thực tế đã/sẽ sản xuất thêm |
| Tổng khối lượng thành phẩm (TT) | **Nhập tay** — tổng kg thành phẩm thu được thực tế |
| Ngày bắt đầu sản xuất (KH) | Chọn ngày — kế hoạch bắt đầu |
| Ngày bắt đầu sản xuất (TT) | Chọn ngày — thực tế bắt đầu |
| Số ngày sản xuất hoàn thành (KH) | **Nhập tay** — số ngày kế hoạch để hoàn thành sản xuất |
| Số ngày sản xuất hoàn thành (TT) | **Nhập tay** — số ngày thực tế hoàn thành |
| Ghi chú | Ghi chú thêm về sản xuất |

---

### Nhóm 3 — Lưu đồ quy trình & Chi phí sản xuất

**Chọn quy trình sản xuất:**

- Dropdown **"Chọn quy trình sản xuất"** → chọn quy trình phù hợp với sản phẩm đang tính
- Danh sách lấy từ module **Quy trình sản xuất** (DEPT_PRODUCTION)
- Sau khi chọn, bảng **lưu đồ quy trình** hiện ra với các phân đoạn và chi phí từng phân đoạn

> **Lưu ý:** Nếu quy trình chưa có lưu đồ, hệ thống hiển thị cảnh báo vàng. Cần yêu cầu phòng QLSX tạo lưu đồ trong module Quy trình sản xuất trước.

**Bảng lưu đồ quy trình** (hiển thị sau khi chọn quy trình):

| Cột | Ý nghĩa |
|---|---|
| Phân đoạn | Tên giai đoạn trong quy trình (ví dụ: Tiếp nhận NL, Sơ chế, Sấy...) |
| Loại chi phí | Phân loại chi phí trong phân đoạn đó |
| Số lượng KH | Số lượng theo kế hoạch (từ lưu đồ, chỉ đọc) |
| Giá thành KH | Đơn giá kế hoạch (từ lưu đồ, chỉ đọc) |
| Số lượng TT | **Nhập tay** — số lượng thực tế sử dụng |
| Giá thực tế | **Nhập tay** — đơn giá thực tế |
| Thành tiền TT | Tự động tính = Số lượng TT × Giá thực tế |

> Chi phí sản xuất tổng = Tổng thành tiền TT của tất cả phân đoạn × Số ngày sản xuất thực tế.

---

### Nhóm 4 — Thành phẩm đầu ra & Giá báo khách

**Bảng thành phẩm đầu ra** (tự động hiển thị khi đã chọn định mức NVL):

| Hàng | Cột Kế hoạch | Cột Thực tế |
|---|---|---|
| Tỉ lệ thu hồi (%) | Từ định mức, chỉ đọc | **Nhập tay** — tỉ lệ thu hồi thực tế của từng thành phẩm |
| Số kg thành phẩm | Tự động tính từ NL × tỉ lệ KH | Tự động tính từ NL TT × tỉ lệ TT |
| Giá hòa vốn (VNĐ/KG) | Tự động tính (xem công thức) | Tự động tính |
| Lợi nhuận cộng thêm (VNĐ/KG) | **Nhập tay** — biên lợi nhuận mong muốn | **Nhập tay** |
| Giá báo khách (VNĐ/KG) | **Tự động** = Giá hòa vốn + Lợi nhuận | Tự động |
| Giá báo khách (USD/KG) | **Tự động** = Giá VNĐ ÷ Tỉ giá | Tự động |
| Tỉ giá USD | **Nhập tay** ở ô nhỏ bên cạnh (ví dụ: 25.000) | (dùng chung) |

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

| Cột | Ý nghĩa |
|---|---|
| Tên chi phí | Chọn từ danh mục chi phí chung đã cấu hình |
| Số lượng KH | Số lượng theo kế hoạch |
| Thực tế | Số tiền thực tế phát sinh (VNĐ) |

> Chi phí chung được **phân bổ theo khối lượng** giữa các sản phẩm được chọn. Nếu chỉ có 1 sản phẩm, toàn bộ chi phí tính cho sản phẩm đó.

---

## Chi phí xuất khẩu

Nằm ở **phần cuối của từng tab sản phẩm**, bên dưới chi phí chung.

| Trường | Ghi chú |
|---|---|
| Tên chi phí | Chọn từ danh mục chi phí xuất khẩu đã cấu hình |
| Số lượng KH (USD) | Số lượng kế hoạch tính bằng USD |
| Tỉ giá (KH) | Tỉ giá USD/VNĐ áp dụng kế hoạch |
| Thành tiền KH (VNĐ) | Tự động tính |
| Số lượng TT (USD) | Số lượng thực tế |
| Tỉ giá (TT) | Tỉ giá thực tế |
| Thành tiền TT (VNĐ) | Tự động tính |

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

| Cột | Ý nghĩa |
|---|---|
| Chi phí | Tên khoản chi phí (từng sản phẩm + chi phí chung + chi phí XK) |
| Kế hoạch (VNĐ) | Tổng chi phí kế hoạch |
| Thực tế (VNĐ) | Tổng chi phí thực tế |

---

## Tab Doanh thu & lợi nhuận

Tổng hợp doanh thu và lợi nhuận sau khi đã tính xong chi phí.

| Mục | Ý nghĩa |
|---|---|
| Lợi nhuận trước thuế | Doanh thu − Tổng chi phí |
| Thuế (%) | **Nhập tay** — % thuế áp dụng |
| Lợi nhuận sau thuế | Tự động tính |
| Quỹ (%) | **Nhập tay** — % trích quỹ doanh nghiệp |
| Lợi nhuận thực nhận | Lợi nhuận sau thuế − Quỹ |

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
