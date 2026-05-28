## Cách truy cập

Từ thanh điều hướng bên trái (sidebar):

- **Dashboard cá nhân**: Nhấn **Dashboard** (mục đầu tiên trên sidebar)
- **Chức năng chung**: Nhấn **Chung** trên sidebar → hiển thị các tính năng dùng chung cho tất cả nhân viên

## 1. Tổng quan

Module **Chung cung cấp các tính năng áp dụng cho toàn bộ nhân viên trong hệ thống ERP, bất kể bộ phận hay vai trò. Nhân viên có thể truy cập từ menu "Chung".**

Các nhóm chức năng bao gồm:

- Yêu cầu sửa chữa / bổ sung vật tư
- Xin nghỉ phép
- Nhiệm vụ & kế hoạch công việc (Tổ trưởng trở lên)
- Kế hoạch tăng ca
- Góp ý riêng / Nêu khó khăn
- Xem quy trình nội bộ

---

## 2. Quyền truy cập theo vai trò


| Chức năng                            | Nhân viên | Tổ trưởng | Trưởng phòng | Quản trị viên |
| ------------------------------------ | --------- | --------- | ------------ | ------------- |
| Xem Dashboard cá nhân                | ✅         | ✅         | ✅            | ✅             |
| Chấm công vào/ra                     | ✅         | ✅         | ✅            | ✅             |
| Báo cáo công việc hàng ngày          | ✅         | ✅         | ✅            | ✅             |
| Xin nghỉ phép                        | ✅         | ✅         | ✅            | ✅             |
| Phê duyệt nghỉ phép                  | ❌         | ❌         | ✅            | ✅             |
| Yêu cầu cung cấp vật tư              | ✅         | ✅         | ✅            | ✅             |
| Yêu cầu sửa chữa thiết bị            | ✅         | ✅         | ✅            | ✅             |
| Xem quy trình nội bộ                 | ✅         | ✅         | ✅            | ✅             |
| Tạo Nhiệm vụ (giao cho người khác)   | ❌         | ✅         | ✅            | ✅             |
| Tạo Kế hoạch công việc               | ❌         | ✅         | ✅            | ✅             |
| Tạo Kế hoạch tăng ca                 | ❌         | ✅         | ✅            | ✅             |
| Phê duyệt / Từ chối kế hoạch tăng ca | ❌         | ❌         | ✅            | ✅             |
| Góp ý riêng tư (GOP_Y)               | ✅         | ✅         | ✅            | ✅             |
| Nêu khó khăn (NEU_KHO_KHAN)          | ✅         | ✅         | ✅            | ✅             |


---

## 3. Dashboard

### 3.1 Thẻ thống kê cá nhân


| Thẻ          | Nội dung                                                | Hành động khi nhấn          |
| ------------ | ------------------------------------------------------- | --------------------------- |
| **Nhiệm vụ** | Tổng số nhiệm vụ được giao                              | Mở popup danh sách nhiệm vụ |
| **Kế hoạch** | Tổng số kế hoạch công việc                              | Mở popup danh sách kế hoạch |
| **Đánh giá** | Điểm đánh giá tháng gần nhất (hoặc "Chưa có thông tin") | Mở form tự đánh giá         |


> Thẻ "Đánh giá" sẽ hiển thị viền đỏ + badge thông báo nếu có chu kỳ đánh giá mới chưa hoàn thành.

### 3.2 Nút hành động nhanh (Quick Actions)


| Nút                    | Mô tả                 | Chức năng mở ra             |
| ---------------------- | --------------------- | --------------------------- |
| **Chấm công (đã tắt)** | Chấm công vào/ra ca   | Form chấm công              |
| **Báo cáo công việc**  | Gửi báo cáo hàng ngày | Danh sách báo cáo công việc |
| **Xin nghỉ phép**      | Đăng ký nghỉ phép     | Form xin nghỉ phép          |
| **Thông tin cá nhân**  | Xem hồ sơ chi tiết    | Trang thông tin cá nhân     |


### 3.3 Thông tin cá nhân

Hiển thị họ tên, bộ phận, vai trò, email và các thông tin hồ sơ. Nhấn nút **"Thông tin cá nhân"** trên Dashboard để xem.

---

## 4. Xin nghỉ phép

**Truy cập:** Dashboard → nút "Xin nghỉ phép" → form **Xin nghỉ phép**

### 4.1 Form tạo đơn nghỉ phép


| Trường          | Bắt buộc | Loại nhập         | Tùy chọn / Ghi chú                      |
| --------------- | -------- | ----------------- | --------------------------------------- |
| Mã đơn          |          | Văn bản (chỉ đọc) | Hệ thống tự sinh                        |
| Loại nghỉ phép  | ✅        | Chọn từ danh sách | Xem bảng loại nghỉ bên dưới             |
| Ngày bắt đầu    | ✅        | Chọn ngày         |                                         |
| Ngày kết thúc   | ✅        | Chọn ngày         | Phải ≥ ngày bắt đầu                     |
| Nghỉ nửa ngày   |          | Checkbox          | Tích nếu chỉ nghỉ buổi sáng hoặc chiều  |
| Lý do nghỉ phép | ✅        | Văn bản dài       |                                         |
| File đính kèm   |          | Tải tệp           | PDF, DOC, DOCX, JPG, PNG (tối đa 100MB) |


### 4.2 Các loại nghỉ phép


| Giá trị (value) | Nhãn hiển thị   |
| --------------- | --------------- |
| Nghỉ phép năm   | Nghỉ phép năm   |
| Nghỉ ốm         | Nghỉ ốm         |
| Nghỉ việc riêng | Nghỉ việc riêng |
| Nghỉ thai sản   | Nghỉ thai sản   |
| Nghỉ khẩn cấp   | Nghỉ khẩn cấp   |
| Nghỉ bù         | Nghỉ bù         |


### 4.3 Trạng thái đơn nghỉ phép


| Trạng thái            | Ý nghĩa                                                 |
| --------------------- | ------------------------------------------------------- |
| Chờ duyệt — Chờ duyệt | Đơn đã nộp, chờ phê duyệt từ Trưởng phòng/Quản trị viên |
| Đã duyệt — Đã duyệt   | Đơn được chấp thuận                                     |
| Từ chối — Từ chối     | Đơn bị từ chối, kèm lý do từ chối                       |


> **Lưu ý:** Phê duyệt / Từ chối chỉ dành cho Trưởng phòng và Quản trị viên. Khi từ chối phải nhập **Lý do từ chối**.

---

## 5. Yêu cầu cung cấp vật tư (mục **Yêu cầu vật tư**)

**Truy cập:** menu **Chức năng chung** → "Tạo yêu cầu bổ sung/cung cấp"

### 5.1 Form tạo yêu cầu vật tư


| Trường               | Bắt buộc | Loại nhập         | Tùy chọn / Ghi chú                       |
| -------------------- | -------- | ----------------- | ---------------------------------------- |
| Danh sách sản phẩm   | ✅        | Nhiều dòng        | Nhấn "+ Thêm sản phẩm" để thêm từng dòng |
| — Phân loại sản phẩm |          | Văn bản           | Placeholder: "Phân loại"                 |
| — Tên gọi sản phẩm   |          | Văn bản           | Placeholder: "Tên gọi"                   |
| — Số lượng           | ✅        | Số                | Phải > 0                                 |
| — Đơn vị tính        | ✅        | Chọn từ danh sách | Kg / Cái / Hệ / Lít / Thùng / Bộ         |
| Mục đích yêu cầu     | ✅        | Văn bản dài       | Mô tả mục đích sử dụng                   |
| Mức độ ưu tiên       | ✅        | Chọn từ danh sách | Cao / Trung bình / Thấp                  |
| Ghi chú              |          | Văn bản dài       | Thông tin bổ sung                        |


### 5.2 Bộ lọc danh sách vật tư (quản lý)


| Bộ lọc         | Loại                              |
| -------------- | --------------------------------- |
| Mã yêu cầu     | Văn bản tìm kiếm                  |
| Tên nhân viên  | Văn bản tìm kiếm                  |
| Bộ phận        | Văn bản tìm kiếm                  |
| Trạng thái     | Chọn: Chưa cung cấp / Đã cung cấp |
| Mức độ ưu tiên | Chọn: Cao / Trung bình / Thấp     |


---

## 6. Yêu cầu sửa chữa thiết bị (`RepairRequest`)

**Truy cập:** menu **Chức năng chung** → "Tạo phiếu yêu cầu sửa chữa kiểm tra"

### 6.1 Form tạo yêu cầu sửa chữa


| Trường                  | Bắt buộc | Loại nhập         | Tùy chọn / Ghi chú                                                        |
| ----------------------- | -------- | ----------------- | ------------------------------------------------------------------------- |
| Tên hệ thống / thiết bị | ✅        | Văn bản           | Placeholder: "Nhập tên hệ thống/thiết bị..."                              |
| Khu vực sử dụng         | ✅        | Văn bản           | Placeholder: "Nhập khu vực sử dụng..."                                    |
| Nội dung lỗi            | ✅        | Văn bản dài       | Placeholder: "Mô tả chi tiết lỗi..."                                      |
| Loại lỗi                | ✅        | Chọn từ danh sách | Lỗi mới (`loi_moi`) / Lỗi lặp lại (`loi_lap_lai`) / Khẩn cấp (`khan_cap`) |
| Mức độ ưu tiên          | ✅        | Chọn từ danh sách | Cao (`cao`) / Trung bình (`trung_binh`) / Thấp (`thap`)                   |
| Ghi chú                 |          | Văn bản dài       | Placeholder: "Ghi chú thêm..."                                            |
| Tệp đính kèm            |          | Tải tệp           | PDF, DOC, DOCX, JPG, PNG (tối đa 100MB)                                   |


---

## 7. Nhiệm vụ — Tạo và giao nhiệm vụ (form **Tạo nhiệm vụ**)

> ⚠️ **Chỉ dành cho:** Tổ trưởng, Trưởng phòng, Quản trị viên

**Truy cập:** menu **Chức năng chung** → nhóm "Tạo Nhiệm vụ và kế hoạch công việc" → "Tạo nhiệm vụ"

### 7.1 Form tạo nhiệm vụ


| Trường              | Bắt buộc | Loại nhập         | Tùy chọn / Ghi chú                                 |
| ------------------- | -------- | ----------------- | -------------------------------------------------- |
| Ngày giao           |          | Chọn ngày         | Mặc định hôm nay                                   |
| Lọc theo phòng ban  |          | Chọn từ danh sách | Để lọc người nhận                                  |
| Người nhận nhiệm vụ | ✅        | Chọn từ danh sách | Danh sách nhân viên trong hệ thống                 |
| Nội dung nhiệm vụ   | ✅        | Văn bản dài       | Placeholder: "Mô tả chi tiết nội dung nhiệm vụ..." |
| Thời hạn hoàn thành |          | Chọn ngày         | Placeholder: "Chọn thời hạn hoàn thành"            |
| Mức độ ưu tiên      | ✅        | Chọn từ danh sách | Low / Medium / High                                |
| Ghi chú             |          | Văn bản dài       | Placeholder: "Ghi chú thêm (nếu có)..."            |


---

## 8. Kế hoạch công việc (form **Tạo kế hoạch**)

> ⚠️ **Chỉ dành cho:** Tổ trưởng, Trưởng phòng, Quản trị viên

**Truy cập:** menu **Chức năng chung** → "Tạo kế hoạch công việc"

### 8.1 Form tạo kế hoạch


| Trường            | Bắt buộc | Loại nhập         | Tùy chọn / Ghi chú                                 |
| ----------------- | -------- | ----------------- | -------------------------------------------------- |
| Ngày tạo          |          | Chỉ đọc           | Tự động lấy ngày hiện tại                          |
| Người thực hiện   |          | Chọn từ danh sách | Mặc định là người đang đăng nhập                   |
| Tiêu đề kế hoạch  | ✅        | Văn bản           | Placeholder: "Nhập tiêu đề kế hoạch..."            |
| Nội dung kế hoạch | ✅        | Văn bản dài       | Placeholder: "Mô tả chi tiết nội dung kế hoạch..." |
| Ngày bắt đầu      |          | Chọn ngày         | Placeholder: "Chọn ngày bắt đầu"                   |
| Ngày kết thúc     |          | Chọn ngày         | Placeholder: "Chọn ngày kết thúc"                  |
| Mức độ ưu tiên    | ✅        | Chọn từ danh sách | Low / Medium / High                                |
| Ghi chú           |          | Văn bản dài       | Placeholder: "Ghi chú thêm (nếu có)..."            |


---

## 9. Kế hoạch tăng ca (mục **Kế hoạch tăng ca**)

**Truy cập:** menu **Chức năng chung** → "Danh sách kế hoạch tăng ca"

### 9.1 Tạo kế hoạch tăng ca

> ⚠️ **Tạo:** Tổ trưởng, Trưởng phòng, Quản trị viên | **Phê duyệt:** Trưởng phòng, Quản trị viên


| Trường                     | Bắt buộc | Loại nhập               | Tùy chọn / Ghi chú                                          |
| -------------------------- | -------- | ----------------------- | ----------------------------------------------------------- |
| Ngày tạo                   |          | Chỉ đọc                 | Tự động                                                     |
| Ngày tăng ca               | ✅        | Chọn ngày               | Placeholder: "Chọn ngày tăng ca"                            |
| Lọc theo phòng ban         |          | Chọn từ danh sách       | Để lọc danh sách nhân viên                                  |
| Người tham gia tăng ca     | ✅        | Chọn nhiều từ danh sách | Danh sách nhân viên                                         |
| Nội dung công việc tăng ca | ✅        | Văn bản dài             | Placeholder: "Mô tả chi tiết nội dung công việc tăng ca..." |
| Giờ bắt đầu                | ✅        | Chọn giờ                |                                                             |
| Giờ kết thúc               | ✅        | Chọn giờ                |                                                             |
| Ghi chú                    |          | Văn bản dài             | Placeholder: "Ghi chú thêm (nếu có)..."                     |


### 9.2 Trạng thái kế hoạch tăng ca


| Trạng thái   | Nhãn       | Hành động cho phép                                   |
| ------------ | ---------- | ---------------------------------------------------- |
| `CHO_DUYET`  | Chờ duyệt  | Trưởng phòng/Quản trị viên có thể Duyệt hoặc Từ chối |
| `DA_DUYET`   | Đã duyệt   | —                                                    |
| `TU_CHOI`    | Từ chối    | Kèm lý do từ chối bắt buộc                           |
| `HOAN_THANH` | Hoàn thành | —                                                    |
| `HUY`        | Hủy        | —                                                    |


### 9.3 Từ chối kế hoạch tăng ca


| Trường        | Bắt buộc | Loại nhập                                          |
| ------------- | -------- | -------------------------------------------------- |
| Lý do từ chối | ✅        | Văn bản dài (Placeholder: "Nhập lý do từ chối...") |


---

## 10. Góp ý riêng tư và Nêu khó khăn (form **Góp ý riêng**)

**Truy cập:** menu **Chức năng chung** → nhóm "Góp ý riêng" → "Góp ý riêng" **hoặc** "Nêu khó khăn"

> Hai loại dùng chung một modal nhưng **hiển thị các trường khác nhau** dựa theo `type`.

### 10.1 Form Góp ý riêng (`type = GOP_Y`)


| Trường         | Bắt buộc | Loại nhập   | Ghi chú                                                |
| -------------- | -------- | ----------- | ------------------------------------------------------ |
| Ngày tháng     |          | Chỉ đọc     | Tự động lấy ngày hiện tại                              |
| Nội dung góp ý | ✅        | Văn bản dài | Label: "Nội dung góp ý"                                |
| Mục đích góp ý | ✅        | Văn bản     | Placeholder: "Nhập mục đích góp ý..." (chỉ có ở GOP_Y) |
| Ghi chú        |          | Văn bản dài | Placeholder: "Nhập ghi chú (tùy chọn)..."              |
| File kèm theo  |          | Tải tệp     | Tùy chọn                                               |


### 10.2 Form Nêu khó khăn (`type = NEU_KHO_KHAN`)


| Trường            | Bắt buộc | Loại nhập   | Ghi chú                                                          |
| ----------------- | -------- | ----------- | ---------------------------------------------------------------- |
| Ngày tháng        |          | Chỉ đọc     | Tự động lấy ngày hiện tại                                        |
| Nội dung khó khăn | ✅        | Văn bản dài | Label: "Nội dung khó khăn"                                       |
| Giải pháp đề xuất | ✅        | Văn bản dài | Placeholder: "Nhập giải pháp đề xuất..." (chỉ có ở NEU_KHO_KHAN) |
| Ghi chú           |          | Văn bản dài | Placeholder: "Nhập ghi chú (tùy chọn)..."                        |
| File kèm theo     |          | Tải tệp     | Tùy chọn                                                         |


> **Khác biệt chính:** GOP_Y có trường "Mục đích góp ý"; NEU_KHO_KHAN có trường "Giải pháp đề xuất".

---

## 11. Báo cáo công việc hàng ngày (mục **Báo cáo công việc**)

**Truy cập:** Dashboard → nút **"Báo cáo công việc"** → mở mục **Báo cáo công việc**

### 11.1 Tạo báo cáo mới

Nhấn nút **"Tạo báo cáo mới"** (góc trên phải) để mở form.


| Trường                       | Bắt buộc | Loại nhập            | Ghi chú                                                                |
| ---------------------------- | -------- | -------------------- | ---------------------------------------------------------------------- |
| Ngày báo cáo                 | ✅        | Chọn ngày            | Mặc định hôm nay. Lỗi: "Vui lòng chọn ngày báo cáo"                    |
| Số giờ làm việc              |          | Số (bước 0.5, 0–24)  | Mặc định: 8. Placeholder: "8"                                          |
| Mô tả công việc đã làm       | ✅        | Văn bản dài (4 dòng) | Placeholder: "Mô tả chi tiết công việc bạn đã thực hiện trong ngày..." |
| Thành tựu / Kết quả đạt được |          | Văn bản dài (3 dòng) | Placeholder: "Những thành tựu hoặc kết quả tích cực..."                |
| Khó khăn / Vấn đề gặp phải   |          | Văn bản dài (3 dòng) | Placeholder: "Những khó khăn hoặc vấn đề cần hỗ trợ..."                |
| Kế hoạch cho ngày hôm sau    |          | Văn bản dài (3 dòng) | Placeholder: "Kế hoạch công việc cho ngày tiếp theo..."                |
| File đính kèm                |          | Tải nhiều tệp        | PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG                              |


**Nút:** "Gửi báo cáo" (tạo mới) / "Cập nhật" (chỉnh sửa) / "Hủy"

### 11.2 Trạng thái báo cáo


| Trạng thái | Nhãn     | Màu        |
| ---------- | -------- | ---------- |
| Bản nháp   | Bản nháp | Xám        |
| Đã gửi     | Đã gửi   | Xanh dương |
| Đã xem     | Đã xem   | Vàng       |
| Đã duyệt   | Đã duyệt | Xanh lá    |
| Từ chối    | Từ chối  | Đỏ         |


### 11.3 Thao tác trên danh sách


| Nút     | Điều kiện                               | Hành động           |
| ------- | --------------------------------------- | ------------------- |
| **Xem** | Luôn hiển thị                           | Mở chi tiết báo cáo |
| **Sửa** | Chỉ khi trạng thái Bản nháp hoặc Đã gửi | Mở form chỉnh sửa   |
| **Xóa** | Chỉ khi trạng thái Bản nháp hoặc Đã gửi | Xác nhận rồi xóa    |


---

## 12. Xem quy trình nội bộ (danh sách **Quy trình nội bộ**)

**Truy cập:** menu **Chức năng chung** → nhóm "Đã ban hành" → "Danh sách quy trình"

### 12.1 Tìm kiếm quy trình

Nhập từ khóa vào ô tìm kiếm (placeholder: **"Tìm kiếm theo mã, tên quy trình, nhân viên..."**) → nhấn nút **"Tìm kiếm"**.

### 12.2 Cột bảng danh sách


| Cột            | Nội dung                    |
| -------------- | --------------------------- |
| STT            | Số thứ tự                   |
| Mã quy trình   | `maQuyTrinh`                |
| Tên quy trình  | `tenQuyTrinh`               |
| Loại quy trình | `loaiQuyTrinh`              |
| Người tạo      | `tenNhanVien`               |
| Ngày tạo       | Ngày tháng năm              |
| Hành động      | Nút **"Xem"** — mở chi tiết |


### 12.3 Chi tiết quy trình

Nhấn **"Xem"** để mở modal chi tiết, hiển thị:

- Mã quy trình, Loại quy trình, Tên quy trình, Người tạo, Ngày tạo
- **Sơ đồ quy trình** (nếu có): từng phân đoạn gồm tên phân đoạn, nội dung công việc, bảng chi phí (Loại chi phí / Tên chi phí / Đơn vị / Định mức)

**Nút:** "Đóng"

---

## 12b. Lịch sử đăng nhập

**Truy cập:** Menu **Chức năng chung** → mục **Lịch sử đăng nhập** (hoặc xem trong trang cá nhân)

Hiển thị danh sách các lần đăng nhập của bạn vào hệ thống, bao gồm thời gian, thiết bị, và IP.


| Thông tin              | Mô tả                      |
| ---------------------- | -------------------------- |
| Thời gian đăng nhập    | Ngày giờ đăng nhập         |
| Thiết bị / Trình duyệt | Thông tin thiết bị sử dụng |
| Địa chỉ IP             | IP khi đăng nhập           |


> Chỉ xem được lịch sử của chính mình. Quản trị viên có thể xem lịch sử đăng nhập của tất cả nhân viên.

---

Nếu nhân viên cần thực hiện chức năng ngoài quyền hạn của mình:


| Tình huống                          | Liên hệ ai                           | Hành động                                 |
| ----------------------------------- | ------------------------------------ | ----------------------------------------- |
| Cần phê duyệt nghỉ phép             | Trưởng phòng của bộ phận             | Gửi thông báo qua hệ thống hoặc trực tiếp |
| Cần tạo nhiệm vụ nhưng là Nhân viên | Tổ trưởng hoặc Trưởng phòng          | Nhờ cấp trên tạo hộ                       |
| Cần phê duyệt/hủy tăng ca           | Trưởng phòng hoặc Quản trị viên      | Liên hệ trực tiếp                         |
| Cần xem dữ liệu toàn bộ nhân viên   | Quản trị viên                        | Yêu cầu qua bộ phận IT/HR                 |
| Không tìm thấy quy trình cần xem    | Quản trị viên hoặc bộ phận phụ trách | Đề nghị ban hành quy trình mới            |


---

## 14. Câu hỏi thường gặp (FAQ)

**Q1: Tôi xin nghỉ phép nhưng không thấy loại "Nghỉ thai sản" trong danh sách?**

> Loại Nghỉ thai sản (Nghỉ thai sản) có trong hệ thống. Nếu không thấy, hãy kiểm tra lại dropdown "Loại nghỉ phép". Nếu vẫn không có, liên hệ bộ phận HR hoặc Quản trị viên.

**Q2: Tôi là Nhân viên, có thể tự tạo nhiệm vụ cho bản thân không?**

> Không. Chức năng tạo nhiệm vụ chỉ dành cho Tổ trưởng trở lên. Để có nhiệm vụ, Tổ trưởng hoặc Trưởng phòng phải giao cho bạn qua form **Tạo nhiệm vụ**. Bạn có thể xem danh sách nhiệm vụ được giao qua thẻ "Nhiệm vụ" trên Dashboard.

**Q3: Góp ý riêng và Nêu khó khăn khác gì nhau?**

> **Góp ý riêng (GOP_Y):** Dùng khi bạn muốn đề xuất cải tiến hoặc gửi ý kiến xây dựng. Bắt buộc điền "Mục đích góp ý".
> **Nêu khó khăn (NEU_KHO_KHAN):** Dùng khi bạn gặp trở ngại trong công việc. Bắt buộc điền "Giải pháp đề xuất" để thể hiện bạn đã suy nghĩ về hướng giải quyết.

**Q4: Kế hoạch tăng ca của tôi đang "Chờ duyệt" — bao lâu thì có kết quả?**

> Thời gian phê duyệt tùy thuộc vào Trưởng phòng hoặc Quản trị viên. Bạn có thể liên hệ trực tiếp với quản lý để đôn đốc. Khi được duyệt hoặc từ chối, trạng thái sẽ cập nhật trong danh sách kế hoạch tăng ca.

**Q5: Tôi muốn đính kèm file khi xin nghỉ ốm — định dạng nào được hỗ trợ?**

> Hệ thống hỗ trợ: **PDF, DOC, DOCX, JPG, PNG**. Kích thước tối đa **100MB** mỗi tệp.

**Q6: Tôi đã nộp yêu cầu vật tư nhưng muốn chỉnh sửa — phải làm sao?**

> Nếu yêu cầu chưa được xử lý (trạng thái "Chưa cung cấp"), bạn có thể nhờ Quản trị viên/Trưởng phòng chỉnh sửa từ màn hình mục **Yêu cầu vật tư**. Yêu cầu đã được cung cấp không thể chỉnh sửa.

**Q7: Mức độ ưu tiên "Cao" trong yêu cầu sửa chữa có nghĩa là sẽ được xử lý ngay không?**

> Mức độ ưu tiên giúp bộ phận phụ trách sắp xếp thứ tự xử lý, nhưng không đảm bảo thời gian cố định. Nếu khẩn cấp, hãy chọn loại lỗi "Khẩn cấp (`khan_cap`)" và liên hệ trực tiếp bộ phận kỹ thuật.

---

# Quản trị hệ thống (Admin)

## Cách truy cập

Từ thanh điều hướng bên trái (sidebar):

- **Cài đặt hệ thống**: Nhấn biểu tượng **Cài đặt** (⚙️) ở cuối sidebar (chỉ hiển thị cho tài khoản Quản trị viên)

## 1. Tổng quan

**Quản trị viên** là role duy nhất có quyền truy cập trang `/system-settings`. Người dùng Quản trị viên bypass toàn bộ RBAC thông thường và có quyền thực hiện mọi thao tác trên hệ thống. Guard kiểm tra `isAdmin(user.department)` — nếu không phải Quản trị viên, hệ thống hiển thị thông báo "Chỉ quản trị viên mới có thể truy cập trang này."

---

## 2. Quyền so sánh


| Chức năng                      | Nhân viên | Tổ trưởng | Trưởng phòng | Quản trị viên |
| ------------------------------ | --------- | --------- | ------------ | ------------- |
| Xem dữ liệu bộ phận            | ✅         | ✅         | ✅            | ✅             |
| Tạo/sửa bản ghi                | ✅         | ✅         | ✅            | ✅             |
| Xóa bản ghi                    | ❌         | ❌         | ✅            | ✅             |
| Quản lý người dùng             | ❌         | ❌         | ❌            | ✅             |
| Cài đặt hệ thống               | ❌         | ❌         | ❌            | ✅             |
| Quản lý chấm công (tất cả)     | ❌         | ❌         | ❌            | ✅             |
| Face Admin (`/diemdanh/admin`) | ❌         | ❌         | ❌            | ✅             |
| Xem tất cả bộ phận             | ❌         | ❌         | ❌            | ✅             |


---

## 3. Cài đặt hệ thống (`/system-settings`)

Quản lý **theme** và **slogan** hiển thị trên toàn hệ thống.

### 3.1 Theme hệ thống

Ba theme có sẵn:


| ID        | Tên            | Mô tả                              | Biểu tượng |
| --------- | -------------- | ---------------------------------- | ---------- |
| `DEFAULT` | Mặc định       | Giao diện xanh dương chuyên nghiệp | ABF        |
| `TET`     | Tết Nguyên Đán | Giao diện đỏ với hoa mai           | 🏮         |
| `APR30`   | 30/4 - 1/5     | Ngày Giải phóng & Quốc tế Lao động | ⭐          |


Chọn theme bằng cách click vào card → theme được chọn có viền xanh và dấu ✔. Thay đổi có hiệu lực toàn hệ thống ngay sau khi lưu.

### 3.2 Slogan hệ thống

- Slogan hiển thị trên **thanh header** cho tất cả người dùng
- Tối đa **500 ký tự** (bộ đếm ký tự hiển thị dạng `n/500`)
- Nhập slogan → nhấn **Lưu thay đổi** để áp dụng

---

## 4. Quản lý người dùng (tab **Quản lý người dùng**)

### 4.1 Danh sách người dùng

Bảng hiển thị các cột: **Tên · Email · Vai trò · Trạng thái · Ngày tạo · Ngày cập nhật · Bộ phận phụ · Vai trò phụ · Phòng ban phụ · Cấp trên 1 · Cấp trên 2**.

### 4.2 Tạo/sửa người dùng

**Form tạo tài khoản:**


| Trường        | Bắt buộc | Giá trị / Ghi chú                                      |
| ------------- | -------- | ------------------------------------------------------ |
| Họ            | ✅        | Họ của nhân viên                                       |
| Tên           | ✅        | Tên của nhân viên                                      |
| Email         | ✅        | Địa chỉ email đăng nhập                                |
| Mật khẩu      | ✅        | Mật khẩu khởi tạo                                      |
| Vai trò       | ✅        | `Nhân viên · Tổ trưởng · Trưởng phòng · Quản trị viên` |
| Bộ phận       | —        | Bộ phận chính                                          |
| Phòng ban     | —        | Phòng ban trong bộ phận                                |
| Bộ phận phụ   | —        | Bộ phận kiêm nhiệm                                     |
| Vai trò phụ   | —        | `Nhân viên · Tổ trưởng · Trưởng phòng`                 |
| Phòng ban phụ | —        | Phòng ban kiêm nhiệm                                   |


### 4.3 Gán role và khóa tài khoản

- **Gán role**: chọn từ dropdown **Vai trò** khi tạo hoặc sửa tài khoản (`Nhân viên · Tổ trưởng · Trưởng phòng · Quản trị viên`)
- **Khóa tài khoản**: cột **Trạng thái** trong bảng danh sách người dùng — nhấn nút **toggle** (công tắc) để chuyển đổi:


| Trạng thái    | Mô tả                                          |
| ------------- | ---------------------------------------------- |
| **Hoạt động** | Tài khoản đang sử dụng bình thường             |
| **Khóa**      | Tài khoản bị vô hiệu hóa, không đăng nhập được |


> Để khóa: tìm người dùng trong bảng → nhấn toggle ở cột Trạng thái → xác nhận. Để mở khóa: thực hiện lại thao tác tương tự.

---

## 5. Quản lý chấm công (tab **Điểm danh**)

### 5.1 Chức năng

- **Xem** toàn bộ bản ghi chấm công của tất cả nhân viên
- **Thêm mới** bản ghi chấm công
- **Sửa** bản ghi hiện có

### 5.2 Form chấm công


| Trường        | Ghi chú                |
| ------------- | ---------------------- |
| Mã nhân viên  | Mã định danh nhân viên |
| Tên nhân viên | Tên nhân viên          |
| Giờ vào       | Thời gian vào ca       |
| Giờ ra        | Thời gian ra ca        |
| Trạng thái    | Xem bảng bên dưới      |
| Ghi chú       | Ghi chú bổ sung        |


### 5.3 Năm trạng thái chấm công và màu hiển thị


| Giá trị   | Nhãn      | Màu                             |
| --------- | --------- | ------------------------------- |
| Đúng giờ  | Đúng giờ  | 🟢 Xanh lá (`text-green-700`)   |
| Muộn      | Muộn      | 🟡 Vàng (`text-yellow-700`)     |
| Vắng mặt  | Vắng mặt  | 🔴 Đỏ (`text-red-700`)          |
| Nghỉ phép | Nghỉ phép | 🟣 Tím (`text-purple-700`)      |
| Tăng ca   | Tăng ca   | 🔵 Xanh dương (`text-blue-700`) |


### 5.4 Bộ lọc ngày

- **Ngày bắt đầu** — chọn ngày bắt đầu khoảng lọc
- **Ngày kết thúc** — chọn ngày kết thúc khoảng lọc
- Tìm kiếm nhanh theo **mã nhân viên**

---

## 6. Face Admin (`/diemdanh/admin`)

Trang quản lý dữ liệu khuôn mặt nhân viên phục vụ điểm danh tự động bằng nhận diện khuôn mặt.

### 6.1 Sáu tư thế chụp


| #   | Tư thế            | Hướng dẫn                       |
| --- | ----------------- | ------------------------------- |
| 1   | 😐 **Chính diện** | Nhìn thẳng vào camera           |
| 2   | ⬅️ **Xoay trái**  | Xoay mặt sang trái nhẹ (~30°)   |
| 3   | ➡️ **Xoay phải**  | Xoay mặt sang phải nhẹ (~30°)   |
| 4   | ⬆️ **Ngẩng lên**  | Ngẩng đầu lên nhẹ (~20°)        |
| 5   | ⬇️ **Cúi xuống**  | Cúi đầu xuống nhẹ (~20°)        |
| 6   | 😊 **Mỉm cười**   | Nhìn thẳng và mỉm cười tự nhiên |


### 6.2 Trạng thái oval

Khung oval trên camera chuyển màu theo trạng thái nhận diện:

- `waiting` — chờ khuôn mặt xuất hiện
- `detecting` — đang phát hiện khuôn mặt
- `wrong-pose` — sai tư thế, cần điều chỉnh
- `stable` — tư thế đúng, đang giữ ổn định
- `flash` — vừa chụp ảnh thành công

### 6.3 Gallery ảnh

- Tìm kiếm nhân viên theo tên hoặc mã NV (placeholder: *Tìm theo tên / mã NV...*)
- Nhấn **Xem gallery** để mở popup ảnh khuôn mặt đã đăng ký của nhân viên
- Dữ liệu gallery được tải on-demand khi mở popup

---

## 7. Thông tin cá nhân (`PersonalInfoModal`)

> Chức năng này dùng được bởi **mọi nhân viên** từ Dashboard — không chỉ riêng Quản trị viên.

### Ba tab chức năng


| Tab           | Nội dung                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| **Cơ bản**    | Họ · Tên · Email · Giới tính (MALE/FEMALE/OTHER) · Số điện thoại · Tài khoản ngân hàng · Số tủ cá nhân |
| **Vật lý**    | Cân nặng (kg) · Chiều cao (cm) · Size áo (XS/S/M/L/XL/XXL/XXXL) · Size quần (số) · Size giày/dép (số)  |
| **Công việc** | Thông tin vai trò, bộ phận, cấp trên — chỉ xem, không chỉnh sửa                                        |


### Lưu ý

- Tab **Cơ bản** và **Vật lý** cho phép chỉnh sửa khi nhấn nút **Sửa**
- Tab **Công việc** chỉ hiển thị thông tin, không chỉnh sửa trực tiếp (do Quản trị viên quản lý)
- Thay đổi có hiệu lực ngay sau khi nhấn **Lưu**

---

## 8. FAQ

**Q1: Tôi không thể vào `/system-settings`, phải làm gì?**
Trang này chỉ dành cho Quản trị viên. Kiểm tra role tài khoản — nếu chưa có quyền Quản trị viên, liên hệ quản trị viên hệ thống.

**Q2: Thay đổi theme có ảnh hưởng tất cả người dùng không?**
Có. Theme và slogan được áp dụng toàn hệ thống ngay khi Quản trị viên lưu thay đổi.

**Q3: Làm thế nào để khóa một tài khoản nhân viên?**
Vào **Quản lý người dùng** → tìm tài khoản → thay đổi cột **Trạng thái** sang Khóa/Vô hiệu hóa.

**Q4: Có thể gán một nhân viên thuộc nhiều bộ phận không?**
Có. Sử dụng các trường **Bộ phận phụ**, **Vai trò phụ**, **Phòng ban phụ** khi tạo/sửa tài khoản.

**Q5: Dữ liệu Face Admin được dùng ở đâu?**
Khuôn mặt đăng ký tại `/diemdanh/admin` được dùng để nhận diện tự động khi nhân viên điểm danh tại `/diemdanh`.

**Q6: Nhân viên có thể tự cập nhật thông tin cá nhân không?**
Có. Mọi nhân viên đều có thể sửa tab **Cơ bản** và **Vật lý** từ modal Thông tin cá nhân trên Dashboard. Tab **Công việc** chỉ Quản trị viên mới sửa được.

**Q7: Slogan tối đa bao nhiêu ký tự?**
Tối đa **500 ký tự**. Bộ đếm ký tự hiển thị realtime góc dưới phải của ô nhập slogan.

---

# Điểm danh khuôn mặt — Kiosk nhân viên

> URL: `/diemdanh/nhanvien`
> Quyền truy cập: Tất cả nhân viên (thiết bị kiosk công cộng)

## Cách truy cập

Điểm danh khuôn mặt sử dụng thiết bị kiosk riêng (máy tính bảng/màn hình tại cổng công ty). Nhân viên không cần truy cập từ sidebar — chỉ cần đứng trước camera kiosk.

## 1. Tổng quan

Trang **Kiosk điểm danh** cho phép nhân viên check-in/check-out bằng khuôn mặt thông qua camera. Hệ thống sử dụng nhận diện khuôn mặt kết hợp kiểm tra liveness (chống giả mạo) để đảm bảo an toàn.

**Yêu cầu thiết bị:**

- Camera (webcam hoặc camera tích hợp)
- Trình duyệt hỗ trợ WebRTC (Chrome, Edge, Firefox)
- Đủ ánh sáng để camera nhận diện rõ khuôn mặt

---

## 2. Quy trình điểm danh

### Bước 1: Đứng trước camera

- Đứng đối diện camera, khoảng cách 40–80 cm
- Giữ khuôn mặt ở giữa khung hình, nhìn thẳng vào camera
- Đảm bảo chỉ có **1 người** trong khung hình

### Bước 2: Chờ hệ thống nhận diện

- Hệ thống tự động phát hiện khuôn mặt (khung xanh bao quanh mặt)
- Cần giữ yên khoảng 2–3 giây để hệ thống thu thập đủ khung hình chất lượng
- Yêu cầu: mặt thẳng, không nghiêng quá nhiều, khuôn mặt đủ lớn trong khung

### Bước 3: Thực hiện thử thách liveness (chống giả mạo)

Sau khi nhận diện đủ khung hình, hệ thống yêu cầu **nháy mắt**:

- Màn hình hiển thị: **"Vui lòng nháy mắt"**
- Nháy mắt 1 lần rõ ràng (nhắm rồi mở mắt)
- Thời gian thực hiện: tối đa **8 giây**
- Nếu hết thời gian → hệ thống reset, bắt đầu lại từ bước 1

### Bước 4: Xem kết quả

Sau khi nháy mắt thành công, hệ thống gửi ảnh lên server để nhận diện. Kết quả hiển thị trong 4 giây:


| Kết quả                 | Ý nghĩa                        | Màu hiển thị |
| ----------------------- | ------------------------------ | ------------ |
| ✅ Check-in thành công   | Ghi nhận giờ vào               | Xanh lá      |
| 👋 Check-out thành công | Ghi nhận giờ ra                | Xanh lá      |
| ℹ️ Đã điểm danh hôm nay | Đã check-in và check-out rồi   | Xanh dương   |
| ❌ Vui lòng thử lại      | Không nhận diện được           | Đỏ           |
| ⏳ Vui lòng chờ          | Điểm danh quá nhanh (cooldown) | Vàng         |


**Nếu đi muộn:** Hệ thống hiển thị thêm dòng "Đi muộn X phút" bên dưới kết quả.

---

## 3. Chống giả mạo (Anti-Spoofing)

Hệ thống có 2 lớp bảo vệ:

### 3.1 Phát hiện màn hình

- Nếu dùng ảnh hoặc video trên điện thoại/máy tính để giả mạo → hệ thống phát hiện và từ chối
- Thông báo: **"Phát hiện màn hình"**

### 3.2 Thử thách nháy mắt

- Yêu cầu hành động thực (nháy mắt) mà ảnh tĩnh không thể thực hiện
- Đảm bảo người thật đang đứng trước camera

---

## 4. Chế độ chờ (Standby)

- Sau **30 giây** không phát hiện khuôn mặt: hệ thống giảm tốc độ quét để tiết kiệm tài nguyên
- Sau **60 giây**: màn hình chuyển sang chế độ chờ (hiển thị đồng hồ, màn hình tối)
- Khi có người đứng trước camera → tự động kích hoạt lại

---

## 5. Xử lý lỗi thường gặp

### Camera không hoạt động

- Kiểm tra trình duyệt đã cấp quyền camera chưa (biểu tượng camera trên thanh địa chỉ)
- Đảm bảo không có ứng dụng khác đang dùng camera
- Thử tải lại trang (F5)

### Không nhận diện được khuôn mặt

- Đảm bảo đủ ánh sáng (không quá tối, không ngược sáng)
- Bỏ khẩu trang, kính râm nếu có
- Đứng đúng khoảng cách (40–80 cm)
- Nhìn thẳng vào camera

### Nhiều người trong khung hình

- Hệ thống yêu cầu chỉ **1 người** trong khung hình
- Nếu phát hiện nhiều khuôn mặt → hiển thị cảnh báo, không xử lý
- Đợi người khác ra khỏi khung hình rồi thử lại

### Nháy mắt không được nhận

- Nháy mắt rõ ràng hơn (nhắm hẳn rồi mở)
- Đảm bảo mắt nằm trong vùng camera nhận diện được
- Không đeo kính râm

### Kết quả "Vui lòng thử lại"

- Khuôn mặt chưa được đăng ký trong hệ thống → liên hệ quản trị viên để đăng ký
- Hoặc chất lượng ảnh không đủ tốt → thử lại với ánh sáng tốt hơn

---

## 6. Quản lý hồ sơ khuôn mặt (Dành cho Admin)

### 6.1 Đăng ký khuôn mặt nhân viên

1. Vào **Quản lý điểm danh** → tab **Hồ sơ khuôn mặt**
2. Tìm nhân viên cần đăng ký
3. Nhấn **Đăng ký** → chụp nhiều ảnh khuôn mặt từ các góc khác nhau
4. Hệ thống tạo embedding và lưu vào database

### 6.2 Thêm ảnh biến thể

- Nếu nhân viên thay đổi ngoại hình (đổi kiểu tóc, đeo kính...) → thêm ảnh biến thể
- Nhấn **Thêm biến thể** trên hồ sơ nhân viên → chụp thêm ảnh mới

### 6.3 Bật/Tắt hồ sơ

- **Tắt hồ sơ**: Nhân viên tạm thời không thể điểm danh bằng khuôn mặt
- **Bật hồ sơ**: Kích hoạt lại khả năng điểm danh

### 6.4 Xóa hồ sơ

- Xóa toàn bộ dữ liệu khuôn mặt của nhân viên
- Nhân viên sẽ không thể điểm danh cho đến khi đăng ký lại

---

## 7. Xem lịch sử điểm danh (Dành cho Admin)

1. Vào **Quản lý điểm danh** → tab **Lịch sử**
2. Xem danh sách điểm danh với thông tin:
  - Tên nhân viên, mã nhân viên
  - Thời gian check-in / check-out
  - Trạng thái (đúng giờ / đi muộn)
  - Thiết bị sử dụng

---

## 8. FAQ

### Tôi điểm danh như thế nào?

Đứng trước camera kiosk → chờ hệ thống nhận diện → nháy mắt khi được yêu cầu → xem kết quả.

### Tôi chưa đăng ký khuôn mặt, phải làm sao?

Liên hệ quản trị viên (Admin) hoặc trưởng bộ phận để được đăng ký khuôn mặt vào hệ thống.

### Tại sao hệ thống yêu cầu nháy mắt?

Đây là biện pháp chống giả mạo (liveness detection), đảm bảo người thật đang đứng trước camera chứ không phải ảnh hay video.

### Tôi đeo kính có điểm danh được không?

Kính trong (kính cận) thường không ảnh hưởng. Kính râm có thể gây lỗi nhận diện nháy mắt — nên bỏ kính râm khi điểm danh.

### Check-in và check-out hoạt động thế nào?

- Lần điểm danh đầu tiên trong ngày = **Check-in**
- Lần điểm danh tiếp theo = **Check-out**
- Sau khi đã check-out → hiển thị "Đã điểm danh hôm nay"

### "Đi muộn X phút" nghĩa là gì?

Hệ thống so sánh giờ check-in với giờ bắt đầu ca làm việc. Nếu check-in sau giờ quy định → hiển thị số phút đi muộn.

---

# Hệ thống thông báo (Notification System)

## 1. Tổng quan

Hệ thống thông báo gửi thông báo real-time đến nhân viên khi có sự kiện liên quan xảy ra. Mỗi thông báo có:

- **Icon** — phân biệt loại thông báo bằng màu sắc và biểu tượng
- **Title + Message** — mô tả ngắn gọn sự kiện
- **Click hành xử** — nhấn vào sẽ mở modal hoặc chuyển trang chi tiết

### Cách nhận thông báo


| Phương thức                               | Mô tả                                                          |
| ----------------------------------------- | -------------------------------------------------------------- |
| **Chuông thông báo** 🔔 (góc trên header) | Hiển thị số thông báo chưa đọc. Nhấn để xem danh sách dropdown |
| **WebSocket real-time**                   | Thông báo xuất hiện ngay lập tức không cần refresh trang       |
| **Web Push (VAPID)**                      | Thông báo hiển thị ngoài trình duyệt (khi tab đang background) |


---

## 2. Danh sách thông báo theo bộ phận

### 2.1 Bộ phận chất lượng (DEPT_QUALITY)


| Sự kiện                                                      | Gửi cho                                                                                           | Nhấn vào                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------- |
| Nhân viên gửi đơn nghỉ phép mới (`LEAVE_REQUEST_SUBMITTED`)  | Phòng CL Nhân sự (`SUBDEPT_QUALITY_PERSONNEL`) + admin + user có **secondary** sub-department này | Mở modal chi tiết nghỉ phép |
| Đơn nghỉ phép được duyệt/từ chối (`LEAVE_REQUEST_RESPONDED`) | Người gửi đơn                                                                                     | Mở modal chi tiết nghỉ phép |
| Đánh giá mới được tạo cho bạn (`EVALUATION_CREATED`)         | Nhân viên được đánh giá                                                                           | Mở modal đánh giá           |
| Đánh giá cần duyệt cấp 1 (`EVALUATION_SUPERVISOR1_PENDING`)  | Cấp trên 1                                                                                        | Mở modal đánh giá           |
| Đánh giá cần duyệt cấp 2 (`EVALUATION_SUPERVISOR2_PENDING`)  | Cấp trên 2                                                                                        | Mở modal đánh giá           |
| Đánh giá hoàn thành (`EVALUATION_COMPLETED`)                 | Nhân viên được đánh giá                                                                           | Mở modal đánh giá           |
| Bảng lương tháng mới (`PAYROLL_PUBLISHED`)                   | Nhân viên có bảng lương                                                                           | Mở modal chi tiết lương     |


### 2.2 Bộ phận tổng hợp (DEPT_GENERAL)


| Sự kiện                                                            | Gửi cho | Nhấn vào |
| ------------------------------------------------------------------ | ------- | -------- |
| Báo giá được tạo/từ chối (không có noti riêng — theo dõi qua YCBG) | —       | —        |


### 2.3 Bộ phận kinh doanh (DEPT_BUSINESS)


| Sự kiện                                               | Gửi cho                                                                         | Nhấn vào                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------- |
| Đơn hàng mới (`ORDER_CREATED`)                        | Bộ phận sản xuất (`DEPT_PRODUCTION`) + admin + user có **secondary** production | Vào `/business/international` |
| Cập nhật trạng thái đơn hàng (`ORDER_STATUS_UPDATED`) | Admin                                                                           | Vào `/business/international` |


### 2.4 Bộ phận kế toán (DEPT_ACCOUNTING)


| Sự kiện                                          | Gửi cho | Nhấn vào                             |
| ------------------------------------------------ | ------- | ------------------------------------ |
| Hóa đơn mới (`INVOICE_CREATED`)                  | Admin   | Vào `/accounting/admin?tab=invoices` |
| Công nợ mới (`DEBT_CREATED`)                     | Admin   | Vào `/accounting/admin?tab=debts`    |
| Phiếu nhập kho mới (`WAREHOUSE_RECEIPT_CREATED`) | Admin   | Vào `/production/warehouse`          |
| Phiếu xuất kho mới (`WAREHOUSE_ISSUE_CREATED`)   | Admin   | Vào `/production/warehouse`          |


### 2.5 Bộ phận thu mua (DEPT_PURCHASING)


| Sự kiện                                         | Gửi cho       | Nhấn vào                                         |
| ----------------------------------------------- | ------------- | ------------------------------------------------ |
| YC-MH được duyệt (`PURCHASE_REQUEST_APPROVED`)  | Người yêu cầu | Vào `/purchasing/materials?purchaseRequestId=ID` |
| YC-MH bị từ chối (`PURCHASE_REQUEST_REJECTED`)  | Người yêu cầu | Vào `/purchasing/materials?purchaseRequestId=ID` |
| YC-MH hoàn thành (`PURCHASE_REQUEST_COMPLETED`) | Người yêu cầu | Vào `/purchasing/materials?purchaseRequestId=ID` |


### 2.6 Bộ phận sản xuất (DEPT_PRODUCTION)


| Sự kiện                                             | Gửi cho                                                                                 | Nhấn vào                                          |
| --------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------- |
| YC-CC mới (`SUPPLY_REQUEST_CREATED`)                | Kho (`SUBDEPT_PRODUCTION_WAREHOUSE`) + admin + user có **secondary** sub-department này | Vào `/production/warehouse`                       |
| YC-CC đang xử lý (`SUPPLY_REQUEST_PROCESSING`)      | Người yêu cầu                                                                           | Vào `/production/warehouse`                       |
| YC-CC đã duyệt (`SUPPLY_REQUEST_APPROVED`)          | Người yêu cầu                                                                           | Vào `/production/warehouse`                       |
| YC-CC hoàn thành (`SUPPLY_REQUEST_FULFILLED`)       | Người yêu cầu                                                                           | Vào `/production/warehouse`                       |
| Báo cáo sản lượng mới (`PRODUCTION_REPORT_CREATED`) | Admin                                                                                   | Vào `/production/management?tab=productionReport` |


> **Lưu ý**: `SUPPLY_REQUEST` (không phải `SUPPLY_REQUEST_PROCESSING`) khi tạo sẽ gửi đến kho + admin. Các sự kiện `PROCESSING`, Đã duyệt, `FULFILLED` gửi đến người yêu cầu.

### 2.7 Bộ phận kỹ thuật (DEPT_TECHNICAL)


| Sự kiện                                              | Gửi cho                                                               | Nhấn vào                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| Yêu cầu sửa chữa mới (`REPAIR_REQUEST_CREATED`)      | Kỹ thuật (`DEPT_TECHNICAL`) + admin + user có **secondary** technical | Vào `/technical/quality?tab=repairRequests`       |
| Yêu cầu sửa chữa cập nhật (`REPAIR_REQUEST_UPDATED`) | Kỹ thuật + admin + user có **secondary** technical                    | Vào `/technical/quality?tab=repairRequests`       |
| Báo cáo hoạt động máy (`MACHINE_ACTIVITY_REPORTED`)  | Kỹ thuật + admin + user có **secondary** technical                    | Vào `/production/management?tab=productionReport` |


### 2.8 Tất cả nhân viên (chức năng chung)


| Sự kiện                                                         | Gửi cho             | Nhấn vào                     |
| --------------------------------------------------------------- | ------------------- | ---------------------------- |
| Nhiệm vụ mới (`TASK_ASSIGNED`)                                  | Người được giao     | Mở popup danh sách nhiệm vụ  |
| Nhiệm vụ mới (bản sao admin) (`TASK_ADMIN_COPY`)                | Admin               | Mở popup danh sách nhiệm vụ  |
| Kế hoạch tăng ca cần duyệt (`OVERTIME_PLAN_SUBMITTED`)          | Admin               | Mở popup chi tiết            |
| Kế hoạch tăng ca được duyệt/từ chối (`OVERTIME_PLAN_RESPONDED`) | Người tạo           | Mở popup chi tiết            |
| Kế hoạch tăng ca được duyệt (nhân viên tham gia)                | Người tham gia      | Mở popup chi tiết            |
| Góp ý mới (`PRIVATE_FEEDBACK_SUBMITTED`)                        | Admin               | Mở popup danh sách góp ý     |
| Báo cáo công việc mới (`DAILY_WORK_REPORT_SUBMITTED`)           | Admin               | Mở popup danh sách báo cáo   |
| Kế hoạch công việc mới (`WORK_PLAN_ASSIGNED`)                   | Người được giao     | Mở popup danh sách kế hoạch  |
| Yêu cầu đặt lại mật khẩu (`PASSWORD_RESET_REQUESTED`)           | Admin               | Mở popup chi tiết            |
| Nghiệm thu bàn giao mới (`ACCEPTANCE_HANDOVER_CREATED`)         | Người được chỉ định | Mở modal nghiệm thu bàn giao |


> **Tất cả sự kiện "admin"** đều chỉ gửi đến user có `role: Quản trị viên` (primary), không bao gồm secondary role Quản trị viên.

---

## 3. Chi tiết kỹ thuật

### 3.1 Luồng gửi thông báo

```
Sự kiện business (ví dụ: duyệt YC-MH)
        │
        ▼
notify(event, context)                            # notificationService.ts
        │
        ├─ registry.get(event) → định nghĩa        # notificationRegistry.ts
        ├─ resolveRecipients(ctx) → [employeeIds]  # resolver
        ├─ buildMessage(ctx) → { title, message }
        │
        ├─ prisma.notification.createMany(...)      # Lưu DB (per employeeId)
        │
        └─ Promise.allSettled([
             pushNotification(employeeId, payload), # WebSocket real-time
             sendPushToEmployee(employeeId, ...),   # Web Push (VAPID)
           ])
```

### 3.2 Resolver: Ai nhận được thông báo?


| Resolver                              | Cách hoạt động                                                                                     | Secondary department?         |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------- |
| `resolveDirectRecipients(ctx)`        | Dùng `targetEmployeeIds` tường minh từ context                                                     | ✅ Không liên quan (ID cụ thể) |
| `getEmployeeIdsBySubDeptCode(code)`   | Tìm employee theo `subDepartment.code` + user có `UserSecondaryDepartment.subDepartmentId`         | ✅ **Đã bao gồm** secondary    |
| `getEmployeeIdsByDeptCode(code)`      | Tìm employee theo `subDepartment.department.code` + user có `UserSecondaryDepartment.departmentId` | ✅ **Đã bao gồm** secondary    |
| `getAdminEmployeeIds(excludeUserId?)` | Chỉ user có `role: Quản trị viên` (primary)                                                        | ❌ Chỉ primary Quản trị viên   |


**Giải thích "secondary department":**

- Một user có thể được gán nhiều phòng ban phụ qua **Bộ phận phụ / Phòng ban phụ** trong form tạo/sửa người dùng (admin system)
- Dữ liệu này lưu trong bảng `UserSecondaryDepartment`
- User chỉ có **1 employee record** duy nhất — tất cả thông báo đều gửi đến employee ID đó
- Resolver `getEmployeeIdsBySubDeptCode` và `getEmployeeIdsByDeptCode` đã được cập nhật để query cả `UserSecondaryDepartment`, nên user có phòng ban phụ vẫn nhận được thông báo đúng

### 3.3 Nhấn vào thông báo — điều hướng


| Loại (type)                                                                                                                                                          | Hành vi                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `EVALUATION`*, `TASK`*, `PAYROLL`, `LEAVE_REQUEST*`, `OVERTIME_PLAN*`, `PRIVATE_FEEDBACK`, `DAILY_WORK_REPORT`, `WORK_PLAN`, `ACCEPTANCE_HANDOVER`, `PASSWORD_RESET` | Mở popup/modal tương ứng                                                       |
| `SUPPLY_REQUEST*`                                                                                                                                                    | Chuyển trang → `/production/warehouse`                                         |
| `REPAIR_REQUEST`                                                                                                                                                     | Chuyển trang → `/technical/quality?tab=repairRequests`                         |
| `PURCHASE_REQUEST`                                                                                                                                                   | Chuyển trang → `/purchasing/materials?purchaseRequestId=ID` (mở đúng chi tiết) |
| `ORDER`, `ORDER_STATUS_UPDATED`                                                                                                                                      | Chuyển trang → `/business/international`                                       |
| `WAREHOUSE`                                                                                                                                                          | Chuyển trang → `/production/warehouse`                                         |
| `INVOICE`                                                                                                                                                            | Chuyển trang → `/accounting/admin?tab=invoices`                                |
| `DEBT`                                                                                                                                                               | Chuyển trang → `/accounting/admin?tab=debts`                                   |
| `PRODUCTION_REPORT`                                                                                                                                                  | Chuyển trang → `/production/management?tab=productionReport`                   |


> Các thông báo có chứa `purchaseRequestId` trong metadata sẽ tự động mở modal chi tiết YC-MH khi nhấn.

### 3.4 WebSocket real-time

- User kết nối WebSocket qua `/ws?token=JWT_TOKEN` khi đăng nhập
- Server resolve `userId → employeeId` và route thông báo theo employeeId
- Mỗi user có thể có nhiều tab trình duyệt — tất cả đều nhận được thông báo real-time

---

## 4. FAQ

**Q1: Tôi có thấy thông báo không nếu tôi đang ở tab khác?**
Có. Nếu trình duyệt hỗ trợ Web Push (VAPID), thông báo sẽ hiện ngay cả khi tab đang background.

**Q2: Tôi được gán phòng ban phụ nhưng không thấy thông báo?**
Kiểm tra:

- Tài khoản đang `isActive: true`
- Phòng ban phụ được gán đúng qua `UserSecondaryDepartment` (kiểm tra trong Admin → Quản lý người dùng)
- Thông báo thuộc loại department-based (xem bảng ở mục 2) — nếu là `resolveDirectRecipients` thì chỉ gửi theo ID cụ thể

**Q3: Admin có thấy tất cả thông báo không?**
Admin nhận được:

- Tất cả thông báo từ `getAdminEmployeeIds()` (password reset, feedback, daily report, overtime approval, order status, warehouse, invoice, debt, production report)
- Thông báo department-based nếu admin thuộc department đó (primary)
- Thông báo được gửi trực tiếp đến employeeId của admin

**Q4: Tôi nhấn vào thông báo "YC-MH được duyệt" nhưng không thấy chi tiết?**
Thông báo `PURCHASE_REQUEST` có chứa `purchaseRequestId` trong metadata. Khi nhấn:

1. Chuyển đến `/purchasing/materials?purchaseRequestId=ID`
2. Trang tự động chuyển sang tab "Danh sách mua hàng"
3. Tự động fetch và mở modal chi tiết YC-MH

**Q5: Tại sao tôi không thấy icon cho một số thông báo?**
Tất cả 27 loại thông báo đều có icon riêng trong hệ thống. Nếu thấy icon mặc định (hình tròn xám), vui lòng báo admin.

**Q6: Làm sao để xóa thông báo?**
Nhấn nút **X** (hoặc swipe) trên từng thông báo trong dropdown.

**Q7: Thông báo cũ có tự động biến mất không?**
Danh sách dropdown chỉ hiển thị 20 thông báo gần nhất. Thông báo cũ vẫn còn trong database nhưng không hiện trên dropdown — có thể xem qua API nếu cần.