---
department: ALL
department_name: "Tất cả bộ phận"
roles: [ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE]
access: all
language: vi
---

# Flow đơn hàng — Quy trình từ đầu đến cuối

Tài liệu này mô tả toàn bộ hành trình của một đơn hàng trong hệ thống ERP An Binh Foods, từ khi khách hàng yêu cầu báo giá đến khi hoàn tất thanh toán và ghi nhận phản hồi. Mỗi bước do một phòng ban cụ thể thực hiện.

---

## Sơ đồ tổng quan

```
[Phòng KD] Tạo Yêu cầu báo giá (YCBG)
        │
        ▼
[Phòng giá thành] Tính giá → Tạo Báo giá (BG)
        │
        ▼
[Phòng KD] Chốt khách → Tạo Đơn hàng (ĐH)
        │
        ▼
[Phòng QLSX] Cập nhật tiến độ sản xuất & giao hàng
        │
        ▼
[Phòng KT Thuế] Xử lý báo cáo thuế
        │
        ▼
[Phòng KT Hành chính] Lập hóa đơn & theo dõi thanh toán
        │
        ▼
[Phòng KD] Ghi nhận phản hồi khách hàng
```

---

## Tóm tắt: Sau khi khách hàng đồng ý báo giá — các bước để hoàn tất đơn hàng

Khi khách hàng đã đồng ý với báo giá, quy trình tiếp theo gồm 5 bước chính:

**Bước 3 — Phòng KD tạo Đơn hàng:**
- Vào tab **Danh sách BG** → tìm báo giá → nhấn **Sửa** → đổi trạng thái thành **"Đã đặt hàng"** → **"Lưu thay đổi"**
- Nhấn biểu tượng **"Tạo đơn hàng"** (giỏ hàng) → xác nhận
- Vào tab **Danh sách đơn hàng** → nhấn **Sửa** → điền giá trị đơn hàng, thanh toán đợt 1/2, ngày thanh toán → **"Lưu thay đổi"**

**Bước 4 — Phòng QLSX cập nhật sản xuất & giao hàng:**
- Phòng QLSX vào **Bộ phận sản xuất** → tab **Danh sách đơn hàng** → cập nhật trạng thái sản xuất: Chờ lên kế hoạch → Chờ sản xuất → Đang sản xuất → Chờ giao hàng → Đã lên container → Đang vận chuyển → Đã giao cho khách hàng
- Điền ngày bắt đầu SX, ngày hoàn thành, ngày giao hàng thực tế

**Bước 5 — Phòng KT Thuế xử lý thuế:**
- Bản ghi thuế tự động sinh khi đơn hàng được tạo
- Phòng KT Thuế vào **Bộ phận kế toán** → **Phòng KT Thuế** → tab **Báo cáo thuế** → cập nhật số tiền thuế và trạng thái

**Bước 6 — Phòng KT Hành chính lập hóa đơn:**
- Vào **Phòng KT Hành chính** → tab **Hóa đơn** → nhấn **"Thêm mới"** → điền số hóa đơn, ngày lập, tổng tiền, VAT, phương thức thanh toán
- Theo dõi công nợ tại tab **Công nợ**

**Bước 7 — Phòng KD ghi nhận phản hồi:**
- Sau khi giao hàng, vào tab **Danh sách phản hồi từ KH** → nhấn **"Thêm phản hồi"** → điền loại phản hồi, mức độ, nội dung, biện pháp xử lý

**Lưu ý:** Đơn hàng chỉ thực sự hoàn tất khi cả thuế đã quyết toán VÀ phản hồi khách hàng đã được ghi nhận.

---

## Bước 1 — Phòng Kinh doanh tạo Yêu cầu Báo giá (YCBG)

**Ai thực hiện:** Nhân viên Phòng KD Nội Địa hoặc Phòng KD Quốc Tế

**Truy cập:**
- Nội địa: **Bộ phận kinh doanh** → **Phòng KD Nội Địa** (`/business/domestic`) → tab **Danh sách yêu cầu BG**
- Quốc tế: **Bộ phận kinh doanh** → **Phòng KD Quốc Tế** (`/business/international`) → tab **Danh sách yêu cầu BG**

**Thao tác:** Nhấn **"Thêm yêu cầu báo giá"**

**Điền thông tin:**

| Trường | Bắt buộc | Ghi chú |
|---|:---:|---|
| Khách hàng | ✅ | Chọn từ danh sách khách hàng đã có |
| Sản phẩm | ✅ | Chọn từ danh sách, nhấn **"Thêm sản phẩm"** để thêm nhiều dòng |
| Số lượng | ✅ | Nhập số lượng cho từng sản phẩm |
| Đơn vị tính | ✅ | Ví dụ: kg, tấn, thùng |
| Yêu cầu sản phẩm | | Đặc tính kỹ thuật, tiêu chuẩn khách yêu cầu |
| Quy cách đóng gói | | Cách đóng gói mong muốn |
| Giá đối thủ bán | | Giá tham khảo từ đối thủ cạnh tranh |
| Giá bán gần nhất | | Giá đã bán cho khách này lần trước |
| Hình thức vận chuyển | | Nội địa: chọn dropdown / Quốc tế: nhập tay (FOB, CIF...) |
| Hình thức thanh toán | | Nội địa: chọn dropdown / Quốc tế: nhập tay (T/T, L/C...) |
| Địa chỉ giao hàng | | Nội địa: nhập địa chỉ / Quốc tế: nhập Quốc gia + Cảng đến |
| Ghi chú | | Thông tin bổ sung |

**Nhấn:** **"Tạo mới"** để lưu

**Kết quả:** YCBG xuất hiện trong danh sách, trạng thái chờ phòng giá thành xử lý.

---

## Bước 2 — Phòng Giá thành tính giá và tạo Báo giá

**Ai thực hiện:** Nhân viên Phòng giá thành (Bộ phận tổng hợp)

**Truy cập:** **Bộ phận tổng hợp** → **Phòng giá thành** (`/general/pricing`) → tab **Danh sách YCBG**

**Thao tác:** Tìm YCBG cần xử lý → nhấn biểu tượng **"Tạo báo giá"** (biểu tượng file) trên dòng đó → mở **bảng tính báo giá**

**Trong bảng tính báo giá:**
- Chọn định mức NVL phù hợp
- Nhập các thông số chi phí (nguyên liệu, nhân công, chi phí xuất khẩu/chung)
- Hệ thống tự tính giá thành và đề xuất giá bán

**Sau khi lưu bảng tính**, hệ thống sinh ra **Báo giá** với các thông tin:

| Trường | Bắt buộc | Ghi chú |
|---|:---:|---|
| Giá báo khách (VNĐ/KG) | ✅ | Giá đề xuất cho khách hàng |
| Thời gian giao hàng (ngày) | ✅ | Số ngày kể từ khi đặt hàng |
| Hiệu lực báo giá (ngày) | ✅ | Thời hạn báo giá còn hiệu lực |
| Trạng thái | ✅ | Mặc định: **Đang chờ phản hồi** |
| Ghi chú | | Điều kiện đặc biệt, lưu ý |

**Nhấn:** **"Lưu thay đổi"**

**Kết quả:** Báo giá được tạo, phòng kinh doanh có thể xem và gửi cho khách.

---

## Bước 3 — Phòng Kinh doanh chốt khách và tạo Đơn hàng

**Ai thực hiện:** Nhân viên Phòng KD (người phụ trách khách hàng)

**Truy cập:** **Phòng KD Nội Địa/Quốc Tế** → tab **Danh sách BG**

**Thao tác khi khách đồng ý:**
1. Tìm báo giá → nhấn nút **Sửa** (bút) → cập nhật trạng thái thành **"Đã đặt hàng"** → **"Lưu thay đổi"**
2. Nhấn biểu tượng **"Tạo đơn hàng"** (giỏ hàng) trên dòng báo giá → xác nhận

**Hệ thống tự tạo Đơn hàng.** Sau đó vào tab **Danh sách đơn hàng** → nhấn **Sửa** để điền thêm:

| Trường | Ghi chú |
|---|---|
| Giá trị đơn hàng (USD) | Tổng giá trị xuất khẩu |
| Giá trị đơn hàng (VNĐ) | Tổng giá trị nội địa |
| Thanh toán đợt 1 — Xuất khẩu (USD) | Số tiền đợt 1 phần xuất khẩu |
| Thanh toán đợt 1 — Nội địa (VNĐ) | Số tiền đợt 1 phần nội địa |
| Ngày thanh toán đợt 1 | Ngày dự kiến nhận tiền đợt 1 |
| Thanh toán đợt 2 — Xuất khẩu (USD) | Số tiền đợt 2 phần xuất khẩu |
| Thanh toán đợt 2 — Nội địa (VNĐ) | Số tiền đợt 2 phần nội địa |
| Ngày thanh toán đợt 2 | Ngày dự kiến nhận tiền đợt 2 |
| Ghi chú | Điều kiện hợp đồng, lưu ý đặc biệt |

**Nhấn:** **"Lưu thay đổi"**

**Kết quả:** Đơn hàng được tạo với trạng thái sản xuất **"Chờ lên kế hoạch"**.

---

## Bước 4 — Phòng QLSX cập nhật tiến độ sản xuất và giao hàng

**Ai thực hiện:** Nhân viên Phòng QLSX (Bộ phận sản xuất)

**Truy cập:** **Bộ phận sản xuất** → **Phòng QLSX** (`/production`) → tab **Danh sách đơn hàng**

**Thao tác:** Tìm đơn hàng → nhấn **Sửa** → cập nhật theo tiến độ thực tế:

| Trường | Ghi chú |
|---|---|
| Ngày bắt đầu sản xuất (kế hoạch) | Ngày dự kiến bắt đầu sản xuất |
| Ngày hoàn thành sản xuất (kế hoạch) | Ngày dự kiến hoàn thành |
| Ngày hoàn thành thực tế | Ngày thực tế hoàn thành sản xuất |
| Ngày giao hàng | Ngày thực tế giao hàng cho khách |
| Trạng thái sản xuất | Cập nhật theo từng giai đoạn (xem bảng dưới) |
| Trạng thái thanh toán | Cập nhật khi nhận được tiền (xem bảng dưới) |

**Trạng thái sản xuất — cập nhật theo thứ tự:**

| Trạng thái | Ý nghĩa |
|---|---|
| **Chờ lên kế hoạch** | Đơn hàng mới tạo, chưa lên lịch SX |
| **Chờ sản xuất** | Đã lên kế hoạch, chờ bắt đầu |
| **Đang sản xuất** | Đang trong quá trình sản xuất |
| **Chờ giao hàng** | Sản xuất xong, chờ xuất hàng |
| **Đã lên container** | Hàng đã đóng container |
| **Đang vận chuyển** | Hàng đang trên đường vận chuyển |
| **Đã giao cho khách hàng** | Khách đã nhận hàng |

**Trạng thái thanh toán:**

| Trạng thái | Ý nghĩa |
|---|---|
| **Đã thanh toán đợt 1** | Nhận được tiền đợt 1 |
| **Chờ thanh toán đợt 2** | Đang chờ khách thanh toán đợt 2 |
| **Đã thanh toán đủ** | Nhận đủ tiền, hoàn tất thanh toán |

**Nhấn:** **"Lưu thay đổi"** sau mỗi lần cập nhật

---

## Bước 5 — Phòng KT Thuế xử lý báo cáo thuế

**Ai thực hiện:** Nhân viên Phòng KT Thuế (Bộ phận kế toán)

**Truy cập:** **Bộ phận kế toán** → **Phòng KT Thuế** (`/accounting/tax`) → tab **Báo cáo thuế**

> Khi đơn hàng được tạo, hệ thống **tự động sinh một bản ghi báo cáo thuế** tương ứng. Kế toán thuế không cần tạo thủ công, chỉ cần cập nhật trạng thái.

**Thao tác:** Tìm bản ghi thuế của đơn hàng → nhấn **Sửa** → điền:

| Trường | Ghi chú |
|---|---|
| Số tiền đóng thuế | Số tiền thuế phải nộp |
| Trạng thái | Cập nhật theo quy trình (xem bảng dưới) |
| Ghi chú | Ghi chú về hồ sơ, chứng từ |
| File đính kèm (URL) | Link file hồ sơ thuế đã upload |

**Trạng thái báo cáo thuế — cập nhật theo thứ tự:**

| Trạng thái | Ý nghĩa |
|---|---|
| **Chưa báo cáo** | Mặc định khi đơn hàng mới tạo |
| **Đang cập nhật hồ sơ** | Đang thu thập chứng từ, hóa đơn |
| **Đã đầy đủ hồ sơ** | Đủ điều kiện nộp báo cáo |
| **Đã báo cáo** | Đã nộp lên cơ quan thuế |
| **Đã quyết toán** | Hoàn tất quyết toán thuế |

**Nhấn:** **"Lưu thay đổi"**

---

## Bước 6 — Phòng KT Hành chính lập hóa đơn và theo dõi thanh toán

**Ai thực hiện:** Nhân viên Phòng KT Hành chính (Bộ phận kế toán)

**Truy cập:** **Bộ phận kế toán** → **Phòng KT Hành chính** (`/accounting/admin`)

### 6a. Tạo hóa đơn

Vào tab **Hóa đơn** → nhấn **"Thêm mới"**

| Trường | Bắt buộc | Ghi chú |
|---|:---:|---|
| Số hóa đơn | ✅ | Mã hóa đơn theo quy định |
| Ngày lập | ✅ | Ngày xuất hóa đơn |
| Khách hàng | ✅ | Chọn từ danh sách |
| Mã số thuế | | Mã số thuế của khách hàng |
| Loại hóa đơn | ✅ | Bán hàng / Mua hàng / Dịch vụ |
| Tổng tiền | ✅ | Tổng giá trị trước thuế |
| Thuế VAT (%) | | Phần trăm thuế VAT |
| Phương thức thanh toán | ✅ | Tiền mặt / Chuyển khoản / Thẻ |
| Trạng thái thanh toán | ✅ | Đã thanh toán / Chưa thanh toán / Đang xử lý |
| Ngày thanh toán | | Ngày thực tế nhận tiền |
| Ghi chú | | Ghi chú thêm |

**Nhấn:** **"Lưu"**

### 6b. Theo dõi công nợ

Vào tab **Công nợ** để theo dõi các khoản chưa thanh toán, cập nhật khi nhận tiền.

### 6c. Cập nhật trạng thái thanh toán đơn hàng

Vào tab **Danh sách đơn hàng** → tìm đơn hàng → nhấn **Sửa** → cập nhật **Trạng thái thanh toán** khi nhận được tiền.

---

## Bước 7 — Phòng Kinh doanh ghi nhận phản hồi khách hàng

**Ai thực hiện:** Nhân viên Phòng KD phụ trách khách hàng

**Truy cập:** **Phòng KD Nội Địa/Quốc Tế** → tab **Danh sách phản hồi từ KH**

**Thao tác:** Nhấn **"Thêm phản hồi"**

| Trường | Bắt buộc | Ghi chú |
|---|:---:|---|
| Khách hàng | ✅ | Chọn từ danh sách |
| Loại phản hồi | ✅ | Khiếu nại / Góp ý / Khen ngợi / Yêu cầu hỗ trợ / Khác |
| Mức độ nghiêm trọng | ✅ | Thấp / Trung bình / Cao / Khẩn cấp |
| Nội dung phản hồi | ✅ | Mô tả chi tiết phản hồi của khách |
| Sản phẩm liên quan | | Sản phẩm khách phản hồi về |
| Đơn hàng liên quan | | Mã đơn hàng liên quan |
| Trạng thái xử lý | ✅ | Chưa xử lý / Đang xử lý / Đã xử lý / Đã đóng |
| Biện pháp xử lý | | Mô tả cách xử lý vấn đề |
| Kết quả xử lý | | Kết quả sau khi xử lý |
| Mức độ hài lòng | | Đánh giá mức độ hài lòng của khách sau xử lý |

**Nhấn:** **"Thêm mới"**

---

## Câu hỏi thường gặp về flow đơn hàng

**Q: Ai tạo đơn hàng — phòng kinh doanh hay phòng giá thành?**
> Phòng kinh doanh tạo đơn hàng từ báo giá đã được phòng giá thành lập. Phòng giá thành chỉ tạo báo giá, không tạo đơn hàng.

**Q: Phòng giá thành có thể tạo YCBG không?**
> Không. Phòng giá thành chỉ xem YCBG và tạo báo giá từ đó. Chỉ phòng kinh doanh mới tạo YCBG.

**Q: Đơn hàng đã tạo rồi, ai được cập nhật trạng thái sản xuất?**
> Phòng QLSX (Bộ phận sản xuất) cập nhật trạng thái sản xuất và ngày giao hàng. Phòng kinh doanh và kế toán cập nhật trạng thái thanh toán.

**Q: Bản ghi báo cáo thuế được tạo khi nào?**
> Tự động khi đơn hàng được tạo. Phòng KT Thuế không cần tạo thủ công, chỉ cần cập nhật trạng thái và điền số tiền thuế.

**Q: Hóa đơn có tự động tạo không?**
> Không. Phòng KT Hành chính phải tạo hóa đơn thủ công tại tab **Hóa đơn** sau khi đơn hàng hoàn thành.

**Q: Tôi muốn biết đơn hàng đang ở bước nào trong flow?**
> Xem trường **Trạng thái sản xuất** và **Trạng thái thanh toán** trong tab **Danh sách đơn hàng** của phòng kinh doanh hoặc phòng QLSX.

**Q: Khách hàng chưa thanh toán đợt 2, tôi cần làm gì?**
> Vào **Phòng KT Hành chính** → tab **Công nợ** để theo dõi và đôn đốc. Đồng thời cập nhật trạng thái thanh toán đơn hàng thành **"Chờ thanh toán đợt 2"**.

**Q: Sau khi giao hàng xong, flow kết thúc chưa?**
> Chưa. Còn 2 bước: (1) Phòng KT Thuế hoàn tất quyết toán thuế, (2) Phòng KD ghi nhận phản hồi khách hàng. Chỉ khi cả 2 bước hoàn thành thì đơn hàng mới thực sự kết thúc.
