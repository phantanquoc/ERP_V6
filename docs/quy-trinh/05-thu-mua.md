# Quy trình hướng dẫn — Bộ phận Thu mua

## 1. Phòng thu mua NVL (`/purchasing/materials`)

### 1.1 Quản lý nhà cung cấp (tab Nhà cung cấp)

#### Thêm nhà cung cấp mới

> ⚠️ **Quyền:** ADMIN, DEPARTMENT_HEAD, TEAM_LEAD

1. Vào **Phòng thu mua NVL** → tab **Nhà cung cấp**
2. Nhấn **"Thêm nhà cung cấp"**


| Trường     | Bắt buộc | Ghi chú        |
| ---------- | -------- | -------------- |
| Mã NCC     | ✅        | Tự động sinh   |
| Tên NCC    | ✅        |                |
| Loại NCC   | ✅        | NVL / Thiết bị |
| SĐT        | ✅        |                |
| Email      |          |                |
| Địa chỉ    |          |                |
| Mã số thuế |          |                |
| Ghi chú    |          |                |


1. Nhấn **"Lưu"**

#### Tìm kiếm / Lọc

- Theo tên, mã NCC, SĐT

---

### 1.2 Xử lý Yêu cầu Mua hàng (tab Danh sách mua hàng)

#### Xem danh sách YC-MH

1. Tab **Danh sách mua hàng**
2. Các trạng thái: Chờ duyệt → Đã duyệt → Từ chối → Hoàn thành

#### Duyệt / Từ chối YC-MH

> ⚠️ Nhấn icon **Sửa** (bút) trên YC-MH để mở modal xử lý

1. **Trường hợp Duyệt:**
  - Đổi trạng thái → **Đã duyệt**
  - Người duyệt: tự động điền tên user hiện tại
  - Ngày duyệt: tự động hôm nay (có thể chỉnh)
  - Chọn nhà cung cấp (nếu biết trước)
  - Nhập giá dự kiến
  - Nhấn **"Lưu thay đổi"**
2. **Trường hợp Từ chối:**
  - Đổi trạng thái → **Từ chối**
  - Nhập lý do vào trường **Ghi chú mua hàng**
  - Nhấn **"Lưu thay đổi"**

#### Đánh dấu Hoàn thành

- Khi đã mua hàng xong → đổi trạng thái → **Hoàn thành**
- Hệ thống tự động thông báo cho kho để nhập kho

> **Lưu ý:** Duyệt YC-MH KHÔNG tự động nhập kho. Kho sẽ chủ động nhập kho riêng.

---

### 1.3 Đơn hàng (tab Danh sách đơn hàng)

#### Thêm đơn hàng

1. Tab **Danh sách đơn hàng** → nhấn **"Thêm đơn hàng"**
2. Chọn nhà cung cấp
3. Thêm sản phẩm: chọn từ danh sách hoặc nhập tay
4. Điền số lượng, đơn giá
5. Nhấn **"Tạo đơn hàng"**

#### Theo dõi đơn hàng

- Trạng thái: Chờ xác nhận → Đang xử lý → Đã giao → Hoàn thành
- Nhấn vào đơn hàng để xem chi tiết

---

### 1.4 Quản lý yêu cầu cung ứng (Order Management)

Tab này quản lý việc mua hàng từ các yêu cầu cung cấp của kho.

#### Các bước

1. Xem danh sách YC-CC được chuyển sang
2. Tạo đơn hàng nhà cung cấp dựa trên YC-CC
3. Theo dõi đến khi hàng về

---

## 2. Phòng mua Thiết bị (`/purchasing/equipment`)

> Cấu trúc tương tự phòng thu mua NVL, chỉ khác:
>
> - Loại hàng hóa: Thiết bị, máy móc
> - Màu giao diện: Tím (purple)
> - Mã code prefix khác

### Quy trình tương tự:

1. Quản lý nhà cung cấp thiết bị
2. Xử lý YC-MH thiết bị
3. Tạo đơn hàng mua thiết bị

---

## 3. Quy trình phối hợp với các bộ phận

### Luồng YC-CC → YC-MH → Nhập kho

```
[Kho] Tạo YC-CC
    → [Thu mua] Nhận YC-CC, tạo YC-MH
    → [Thu mua] Duyệt / Mua hàng
    → [Thu mua] Đánh dấu Hoàn thành → thông báo cho kho
    → [Kho] Nhập kho
```

---

## 4. FAQ

**Q1: Làm thế nào để thêm nhà cung cấp NVL mới?**

> Vào **Phòng thu mua NVL** → tab **Nhà cung cấp NVL** → nhấn **Thêm nhà cung cấp**. Điền đầy đủ các trường bắt buộc (có dấu `*`). Mã NCC sẽ được tự động sinh với prefix `NVL`. Nhấn **Lưu** để hoàn tất.

**Q2: Tôi muốn tạo yêu cầu mua hàng cho thiết bị, làm thế nào?**

> Vào **Phòng mua Thiết bị** → tab **Danh sách mua hàng** → nhấn **Tạo yêu cầu** (nếu có nút). Hoặc yêu cầu mua hàng thường được tạo tự động từ **Bộ phận sản xuất → Kho** qua luồng Yêu cầu cung cấp (YC-CC → YC-MH). Sau đó, bộ phận thu mua sẽ xử lý (duyệt, chọn NCC, nhập giá) trên tab **Danh sách mua hàng**.

**Q3: Mức độ ưu tiên của yêu cầu mua hàng có các giá trị nào?**

> Ba mức: **Thấp** (xanh lá), **Trung bình** (vàng), **Cao** (đỏ). Mức ưu tiên ảnh hưởng đến thứ tự xử lý của người duyệt.

**Q4: Trạng thái yêu cầu mua hàng thay đổi như thế nào?**

> Luồng xử lý: `Chờ duyệt` → `Đã duyệt` hoặc `Từ chối` → `Hoàn thành`. Người có quyền TEAM_LEAD trở lên mới được thay đổi trạng thái.
>
> Hệ thống tự động gửi thông báo tới người liên quan khi trạng thái thay đổi:
>
> - **Đã duyệt** → người tạo yêu cầu nhận thông báo "Yêu cầu mua hàng được duyệt".
> - **Từ chối** → người tạo yêu cầu nhận thông báo kèm lý do (nếu có trong ghi chú mua hàng).
> - **Hoàn thành** → người tạo yêu cầu **và** nhân viên kho (`SUBDEPT_PRODUCTION_WAREHOUSE`) đều nhận thông báo để chuẩn bị nhập hàng.
>
> Xem chi tiết tại **Mục 5 — Luồng thông báo**.

**Q5: Màu sắc hiển thị mã nhà cung cấp có ý nghĩa gì?**

> Mã NCC của cả hai phòng đều hiển thị màu **xanh dương**. Phân biệt phòng qua màu giao diện tổng thể: **Phòng NVL** dùng màu **xanh lá (green)**, **Phòng Thiết bị** dùng màu **tím (purple)**.

**Q6: Tôi có thể xuất danh sách nhà cung cấp ra Excel không?**

> Có. Vào tab **Nhà cung cấp** của phòng tương ứng, nhấn nút **Xuất Excel**. Yêu cầu quyền TEAM_LEAD trở lên. File Excel sẽ chứa tất cả thông tin nhà cung cấp (mã, tên, loại cung cấp, quốc gia, liên hệ, loại hình, trạng thái, doanh chi, nhân viên tạo).

**Q7: Phòng thu mua NVL và Phòng mua Thiết bị có chia sẻ danh sách nhà cung cấp không?**

> Không. Mỗi phòng có danh sách nhà cung cấp độc lập, được phân loại theo tham số `phanLoaiNCC`: `NVL` cho phòng NVL và `Thiết bị` cho phòng Thiết bị. Khi tạo nhà cung cấp, mã NCC sẽ tự động sinh với prefix tương ứng.

**Q8: Nút "Đã mua xong" dùng khi nào?**

> Khi yêu cầu mua hàng đã được duyệt (trạng thái = "Đã duyệt") và hàng đã mua xong, nhấn nút **"Đã mua xong"** (hiển thị màu emerald). Hệ thống sẽ chuyển trạng thái sang "Hoàn thành" và tự động thông báo cho kho chuẩn bị nhập hàng.

**Q9: Tại sao tôi không thấy nút "Đã mua xong"?**

> Nút chỉ hiển thị khi yêu cầu mua hàng có trạng thái **"Đã duyệt"**. Nếu trạng thái là "Chờ duyệt" hoặc "Từ chối", cần duyệt trước. Nếu đã "Hoàn thành", nút sẽ hiển thị dạng xám "Đã hoàn thành" (disabled).

**Q10: Khi duyệt yêu cầu mua hàng, người duyệt và ngày duyệt có cần nhập thủ công không?**

> Không. Khi chọn trạng thái "Đã duyệt", hệ thống tự động điền tên người đang đăng nhập làm người duyệt (readOnly) và ngày hiện tại làm ngày duyệt. Chỉ ngày duyệt có thể chỉnh sửa nếu cần.

**Q11: Làm thế nào để tìm kiếm yêu cầu mua hàng?**

> Vào tab **Danh sách mua hàng** → nhập mã yêu cầu vào ô tìm kiếm (`placeholder: "Tìm kiếm yêu cầu mua hàng..."`) → nhấn nút **Tìm kiếm**. Hệ thống sẽ lọc theo mã yêu cầu.

**Q12: Tôi có thể xuất danh sách yêu cầu mua hàng ra Excel không?**

> Có. Vào tab **Danh sách mua hàng** của phòng tương ứng, nhấn nút **Xuất Excel**. File Excel sẽ chứa tất cả yêu cầu mua hàng (mã, ngày, nhân viên, sản phẩm, mức độ ưu tiên, trạng thái).

**Q13: Khi từ chối yêu cầu mua hàng, người tạo yêu cầu sẽ biết lý do không?**

> Có. Khi từ chối, bộ phận thu mua nên ghi lý do vào trường **Ghi chú mua hàng** trong modal "Xử lý yêu cầu mua hàng". Nội dung này sẽ được đính kèm vào thông báo gửi cho người tạo yêu cầu, giúp họ hiểu nguyên nhân và tạo lại nếu cần.

**Q14: Tôi có thể xóa nhà cung cấp không?**

> Có, nhưng chỉ người có quyền DEPARTMENT_HEAD trở lên mới được xóa. Vào tab **Nhà cung cấp** → nhấn nút **Xóa** (thùng rác) trên dòng nhà cung cấp → xác nhận "Bạn có chắc chắn muốn xóa nhà cung cấp này?". Lưu ý: nếu nhà cung cấp đã được sử dụng trong yêu cầu mua hàng, hệ thống có thể không cho phép xóa.

**Q15: Làm thế nào để chỉnh sửa thông tin nhà cung cấp?**

> Vào tab **Nhà cung cấp** → nhấn nút **Sửa** (bút) trên dòng nhà cung cấp → chỉnh sửa các trường cần thiết → nhấn **Lưu**. Mã NCC không thể chỉnh sửa (readOnly).

**Q16: Tôi có thể xem chi tiết nhà cung cấp không?**

> Có. Vào tab **Nhà cung cấp** → nhấn nút **Xem** (mắt) trên dòng nhà cung cấp → modal sẽ hiển thị tất cả thông tin (read-only). Nhấn **Đóng** để thoát.

**Q17: Khi tạo yêu cầu mua hàng, tôi có thể chọn nhiều sản phẩm không?**

> Có. Yêu cầu mua hàng hỗ trợ danh sách sản phẩm (items). Khi xem chi tiết hoặc xử lý yêu cầu, bạn sẽ thấy bảng con liệt kê tất cả sản phẩm với thông tin: tên, số lượng, đơn vị tính, phân loại, giá dự kiến, và thành tiền (tính tự động).

**Q18: File đính kèm hỗ trợ những định dạng nào?**

> Hỗ trợ: PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG. Kích thước file không được vượt quá giới hạn hệ thống (thường 10-50MB tùy cấu hình).

**Q19: Tôi có thể sửa yêu cầu mua hàng sau khi tạo không?**

> Có, nhưng chỉ khi trạng thái là "Chờ duyệt". Khi trạng thái đã chuyển sang "Đã duyệt", "Từ chối", hoặc "Hoàn thành", bạn chỉ có thể xem chi tiết, không thể sửa. Để sửa, cần tạo yêu cầu mới.

**Q20: Phân loại trong yêu cầu mua hàng là gì?**

> Phân loại là trường tùy chọn để phân loại yêu cầu theo danh mục (VD: "Nguyên vật liệu", "Bao bì", "Dịch vụ", v.v.). Nó giúp tổ chức và lọc yêu cầu dễ dàng hơn.

