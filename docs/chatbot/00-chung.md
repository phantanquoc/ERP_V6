---
department: DEPT_ALL
department_name: "Tất cả nhân viên"
roles: [ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE]
access: all
language: vi
---

# Chức năng chung — Tất cả nhân viên

## 1. Tổng quan

Module **Chức năng chung** (`menu **Chức năng chung**`) cung cấp các tính năng áp dụng cho **toàn bộ nhân viên** trong hệ thống ERP, bất kể bộ phận hay vai trò. Nhân viên có thể truy cập từ menu "Chức năng chung" hoặc từ **Dashboard cá nhân** (`trang **Dashboard cá nhân**`).

Các nhóm chức năng bao gồm:
- Yêu cầu sửa chữa / bổ sung vật tư
- Xin nghỉ phép
- Nhiệm vụ & kế hoạch công việc (TEAM_LEAD trở lên)
- Kế hoạch tăng ca
- Góp ý riêng / Nêu khó khăn
- Xem quy trình nội bộ

---

## 2. Quyền truy cập theo vai trò

| Chức năng | EMPLOYEE | TEAM_LEAD | DEPARTMENT_HEAD | ADMIN |
|---|:---:|:---:|:---:|:---:|
| Xem Dashboard cá nhân | ✅ | ✅ | ✅ | ✅ |
| Chấm công vào/ra | ✅ | ✅ | ✅ | ✅ |
| Báo cáo công việc hàng ngày | ✅ | ✅ | ✅ | ✅ |
| Xin nghỉ phép | ✅ | ✅ | ✅ | ✅ |
| Phê duyệt nghỉ phép | ❌ | ❌ | ✅ | ✅ |
| Yêu cầu cung cấp vật tư | ✅ | ✅ | ✅ | ✅ |
| Yêu cầu sửa chữa thiết bị | ✅ | ✅ | ✅ | ✅ |
| Xem quy trình nội bộ | ✅ | ✅ | ✅ | ✅ |
| Tạo Nhiệm vụ (giao cho người khác) | ❌ | ✅ | ✅ | ✅ |
| Tạo Kế hoạch công việc | ❌ | ✅ | ✅ | ✅ |
| Tạo Kế hoạch tăng ca | ❌ | ✅ | ✅ | ✅ |
| Phê duyệt / Từ chối kế hoạch tăng ca | ❌ | ❌ | ✅ | ✅ |
| Góp ý riêng tư (GOP_Y) | ✅ | ✅ | ✅ | ✅ |
| Nêu khó khăn (NEU_KHO_KHAN) | ✅ | ✅ | ✅ | ✅ |

---

## 3. Dashboard cá nhân (`trang **Dashboard cá nhân**`)

### 3.1 Thẻ thống kê cá nhân

| Thẻ | Nội dung | Hành động khi nhấn |
|---|---|---|
| **Nhiệm vụ** | Tổng số nhiệm vụ được giao | Mở popup danh sách nhiệm vụ |
| **Kế hoạch** | Tổng số kế hoạch công việc | Mở popup danh sách kế hoạch |
| **Đánh giá** | Điểm đánh giá tháng gần nhất (hoặc "Chưa có thông tin") | Mở form tự đánh giá |

> Thẻ "Đánh giá" sẽ hiển thị viền đỏ + badge thông báo nếu có chu kỳ đánh giá mới chưa hoàn thành.

### 3.2 Nút hành động nhanh (Quick Actions)

| Nút | Mô tả | Chức năng mở ra |
|---|---|---|
| **Chấm công** | Chấm công vào/ra ca | Form chấm công |
| **Báo cáo công việc** | Gửi báo cáo hàng ngày | Danh sách báo cáo công việc |
| **Xin nghỉ phép** | Đăng ký nghỉ phép | Form xin nghỉ phép |
| **Thông tin cá nhân** | Xem hồ sơ chi tiết | Trang thông tin cá nhân |

### 3.3 Thông tin cá nhân

Hiển thị họ tên, bộ phận, vai trò, email và các thông tin hồ sơ. Nhấn nút **"Thông tin cá nhân"** trên Dashboard để xem.

---

## 4. Xin nghỉ phép

**Truy cập:** Dashboard → nút "Xin nghỉ phép" → form **Xin nghỉ phép**

### 4.1 Form tạo đơn nghỉ phép

| Trường | Bắt buộc | Loại nhập | Tùy chọn / Ghi chú |
|---|:---:|---|---|
| Mã đơn | | Văn bản (chỉ đọc) | Hệ thống tự sinh |
| Loại nghỉ phép | ✅ | Chọn từ danh sách | Xem bảng loại nghỉ bên dưới |
| Ngày bắt đầu | ✅ | Chọn ngày | |
| Ngày kết thúc | ✅ | Chọn ngày | Phải ≥ ngày bắt đầu |
| Nghỉ nửa ngày | | Checkbox | Tích nếu chỉ nghỉ buổi sáng hoặc chiều |
| Lý do nghỉ phép | ✅ | Văn bản dài | |
| File đính kèm | | Tải tệp | PDF, DOC, DOCX, JPG, PNG (tối đa 100MB) |

### 4.2 Các loại nghỉ phép

| Giá trị (value) | Nhãn hiển thị |
|---|---|
| `ANNUAL` | Nghỉ phép năm |
| `SICK` | Nghỉ ốm |
| `PERSONAL` | Nghỉ việc riêng |
| `MATERNITY` | Nghỉ thai sản |
| `EMERGENCY` | Nghỉ khẩn cấp |
| `COMPENSATORY` | Nghỉ bù |

### 4.3 Trạng thái đơn nghỉ phép

| Trạng thái | Ý nghĩa |
|---|---|
| `PENDING` — Chờ duyệt | Đơn đã nộp, chờ phê duyệt từ DEPARTMENT_HEAD/ADMIN |
| `APPROVED` — Đã duyệt | Đơn được chấp thuận |
| `REJECTED` — Từ chối | Đơn bị từ chối, kèm lý do từ chối |

> **Lưu ý:** Phê duyệt / Từ chối chỉ dành cho `DEPARTMENT_HEAD` và `ADMIN`. Khi từ chối phải nhập **Lý do từ chối**.

---

## 5. Yêu cầu cung cấp vật tư (mục **Yêu cầu vật tư**)

**Truy cập:** menu **Chức năng chung** → "Tạo yêu cầu bổ sung/cung cấp"

### 5.1 Form tạo yêu cầu vật tư

| Trường | Bắt buộc | Loại nhập | Tùy chọn / Ghi chú |
|---|:---:|---|---|
| Danh sách sản phẩm | ✅ | Nhiều dòng | Nhấn "+ Thêm sản phẩm" để thêm từng dòng |
| — Phân loại sản phẩm | | Văn bản | Placeholder: "Phân loại" |
| — Tên gọi sản phẩm | | Văn bản | Placeholder: "Tên gọi" |
| — Số lượng | ✅ | Số | Phải > 0 |
| — Đơn vị tính | ✅ | Chọn từ danh sách | Kg / Cái / Hệ / Lít / Thùng / Bộ |
| Mục đích yêu cầu | ✅ | Văn bản dài | Mô tả mục đích sử dụng |
| Mức độ ưu tiên | ✅ | Chọn từ danh sách | Cao / Trung bình / Thấp |
| Ghi chú | | Văn bản dài | Thông tin bổ sung |

### 5.2 Bộ lọc danh sách vật tư (quản lý)

| Bộ lọc | Loại |
|---|---|
| Mã yêu cầu | Văn bản tìm kiếm |
| Tên nhân viên | Văn bản tìm kiếm |
| Bộ phận | Văn bản tìm kiếm |
| Trạng thái | Chọn: Chưa cung cấp / Đã cung cấp |
| Mức độ ưu tiên | Chọn: Cao / Trung bình / Thấp |

---

## 6. Yêu cầu sửa chữa thiết bị (`RepairRequest`)

**Truy cập:** menu **Chức năng chung** → "Tạo phiếu yêu cầu sửa chữa kiểm tra"

### 6.1 Form tạo yêu cầu sửa chữa

| Trường | Bắt buộc | Loại nhập | Tùy chọn / Ghi chú |
|---|:---:|---|---|
| Tên hệ thống / thiết bị | ✅ | Văn bản | Placeholder: "Nhập tên hệ thống/thiết bị..." |
| Khu vực sử dụng | ✅ | Văn bản | Placeholder: "Nhập khu vực sử dụng..." |
| Nội dung lỗi | ✅ | Văn bản dài | Placeholder: "Mô tả chi tiết lỗi..." |
| Loại lỗi | ✅ | Chọn từ danh sách | Lỗi mới (`loi_moi`) / Lỗi lặp lại (`loi_lap_lai`) / Khẩn cấp (`khan_cap`) |
| Mức độ ưu tiên | ✅ | Chọn từ danh sách | Cao (`cao`) / Trung bình (`trung_binh`) / Thấp (`thap`) |
| Ghi chú | | Văn bản dài | Placeholder: "Ghi chú thêm..." |
| Tệp đính kèm | | Tải tệp | PDF, DOC, DOCX, JPG, PNG (tối đa 100MB) |

---

## 7. Nhiệm vụ — Tạo và giao nhiệm vụ (form **Tạo nhiệm vụ**)

> ⚠️ **Chỉ dành cho:** `TEAM_LEAD`, `DEPARTMENT_HEAD`, `ADMIN`

**Truy cập:** menu **Chức năng chung** → nhóm "Tạo Nhiệm vụ và kế hoạch công việc" → "Tạo nhiệm vụ"

### 7.1 Form tạo nhiệm vụ

| Trường | Bắt buộc | Loại nhập | Tùy chọn / Ghi chú |
|---|:---:|---|---|
| Ngày giao | | Chọn ngày | Mặc định hôm nay |
| Lọc theo phòng ban | | Chọn từ danh sách | Để lọc người nhận |
| Người nhận nhiệm vụ | ✅ | Chọn từ danh sách | Danh sách nhân viên trong hệ thống |
| Nội dung nhiệm vụ | ✅ | Văn bản dài | Placeholder: "Mô tả chi tiết nội dung nhiệm vụ..." |
| Thời hạn hoàn thành | | Chọn ngày | Placeholder: "Chọn thời hạn hoàn thành" |
| Mức độ ưu tiên | ✅ | Chọn từ danh sách | Low / Medium / High |
| Ghi chú | | Văn bản dài | Placeholder: "Ghi chú thêm (nếu có)..." |

---

## 8. Kế hoạch công việc (form **Tạo kế hoạch**)

> ⚠️ **Chỉ dành cho:** `TEAM_LEAD`, `DEPARTMENT_HEAD`, `ADMIN`

**Truy cập:** menu **Chức năng chung** → "Tạo kế hoạch công việc"

### 8.1 Form tạo kế hoạch

| Trường | Bắt buộc | Loại nhập | Tùy chọn / Ghi chú |
|---|:---:|---|---|
| Ngày tạo | | Chỉ đọc | Tự động lấy ngày hiện tại |
| Người thực hiện | | Chọn từ danh sách | Mặc định là người đang đăng nhập |
| Tiêu đề kế hoạch | ✅ | Văn bản | Placeholder: "Nhập tiêu đề kế hoạch..." |
| Nội dung kế hoạch | ✅ | Văn bản dài | Placeholder: "Mô tả chi tiết nội dung kế hoạch..." |
| Ngày bắt đầu | | Chọn ngày | Placeholder: "Chọn ngày bắt đầu" |
| Ngày kết thúc | | Chọn ngày | Placeholder: "Chọn ngày kết thúc" |
| Mức độ ưu tiên | ✅ | Chọn từ danh sách | Low / Medium / High |
| Ghi chú | | Văn bản dài | Placeholder: "Ghi chú thêm (nếu có)..." |

---

## 9. Kế hoạch tăng ca (mục **Kế hoạch tăng ca**)

**Truy cập:** menu **Chức năng chung** → "Danh sách kế hoạch tăng ca"

### 9.1 Tạo kế hoạch tăng ca

> ⚠️ **Tạo:** `TEAM_LEAD`, `DEPARTMENT_HEAD`, `ADMIN` | **Phê duyệt:** `DEPARTMENT_HEAD`, `ADMIN`

| Trường | Bắt buộc | Loại nhập | Tùy chọn / Ghi chú |
|---|:---:|---|---|
| Ngày tạo | | Chỉ đọc | Tự động |
| Ngày tăng ca | ✅ | Chọn ngày | Placeholder: "Chọn ngày tăng ca" |
| Lọc theo phòng ban | | Chọn từ danh sách | Để lọc danh sách nhân viên |
| Người tham gia tăng ca | ✅ | Chọn nhiều từ danh sách | Danh sách nhân viên |
| Nội dung công việc tăng ca | ✅ | Văn bản dài | Placeholder: "Mô tả chi tiết nội dung công việc tăng ca..." |
| Giờ bắt đầu | ✅ | Chọn giờ | |
| Giờ kết thúc | ✅ | Chọn giờ | |
| Ghi chú | | Văn bản dài | Placeholder: "Ghi chú thêm (nếu có)..." |

### 9.2 Trạng thái kế hoạch tăng ca

| Trạng thái | Nhãn | Hành động cho phép |
|---|---|---|
| `CHO_DUYET` | Chờ duyệt | DEPARTMENT_HEAD/ADMIN có thể Duyệt hoặc Từ chối |
| `DA_DUYET` | Đã duyệt | — |
| `TU_CHOI` | Từ chối | Kèm lý do từ chối bắt buộc |
| `HOAN_THANH` | Hoàn thành | — |
| `HUY` | Hủy | — |

### 9.3 Từ chối kế hoạch tăng ca

| Trường | Bắt buộc | Loại nhập |
|---|:---:|---|
| Lý do từ chối | ✅ | Văn bản dài (Placeholder: "Nhập lý do từ chối...") |

---

## 10. Góp ý riêng tư và Nêu khó khăn (form **Góp ý riêng**)

**Truy cập:** menu **Chức năng chung** → nhóm "Góp ý riêng" → "Góp ý riêng" **hoặc** "Nêu khó khăn"

> Hai loại dùng chung một modal nhưng **hiển thị các trường khác nhau** dựa theo `type`.

### 10.1 Form Góp ý riêng (`type = GOP_Y`)

| Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|:---:|---|---|
| Ngày tháng | | Chỉ đọc | Tự động lấy ngày hiện tại |
| Nội dung góp ý | ✅ | Văn bản dài | Label: "Nội dung góp ý" |
| Mục đích góp ý | ✅ | Văn bản | Placeholder: "Nhập mục đích góp ý..." (chỉ có ở GOP_Y) |
| Ghi chú | | Văn bản dài | Placeholder: "Nhập ghi chú (tùy chọn)..." |
| File kèm theo | | Tải tệp | Tùy chọn |

### 10.2 Form Nêu khó khăn (`type = NEU_KHO_KHAN`)

| Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|:---:|---|---|
| Ngày tháng | | Chỉ đọc | Tự động lấy ngày hiện tại |
| Nội dung khó khăn | ✅ | Văn bản dài | Label: "Nội dung khó khăn" |
| Giải pháp đề xuất | ✅ | Văn bản dài | Placeholder: "Nhập giải pháp đề xuất..." (chỉ có ở NEU_KHO_KHAN) |
| Ghi chú | | Văn bản dài | Placeholder: "Nhập ghi chú (tùy chọn)..." |
| File kèm theo | | Tải tệp | Tùy chọn |

> **Khác biệt chính:** GOP_Y có trường "Mục đích góp ý"; NEU_KHO_KHAN có trường "Giải pháp đề xuất".

---

## 11. Báo cáo công việc hàng ngày (mục **Báo cáo công việc**)

**Truy cập:** Dashboard → nút **"Báo cáo công việc"** → mở mục **Báo cáo công việc**

### 11.1 Tạo báo cáo mới

Nhấn nút **"Tạo báo cáo mới"** (góc trên phải) để mở form.

| Trường | Bắt buộc | Loại nhập | Ghi chú |
|---|:---:|---|---|
| Ngày báo cáo | ✅ | Chọn ngày | Mặc định hôm nay. Lỗi: "Vui lòng chọn ngày báo cáo" |
| Số giờ làm việc | | Số (bước 0.5, 0–24) | Mặc định: 8. Placeholder: "8" |
| Mô tả công việc đã làm | ✅ | Văn bản dài (4 dòng) | Placeholder: "Mô tả chi tiết công việc bạn đã thực hiện trong ngày..." |
| Thành tựu / Kết quả đạt được | | Văn bản dài (3 dòng) | Placeholder: "Những thành tựu hoặc kết quả tích cực..." |
| Khó khăn / Vấn đề gặp phải | | Văn bản dài (3 dòng) | Placeholder: "Những khó khăn hoặc vấn đề cần hỗ trợ..." |
| Kế hoạch cho ngày hôm sau | | Văn bản dài (3 dòng) | Placeholder: "Kế hoạch công việc cho ngày tiếp theo..." |
| File đính kèm | | Tải nhiều tệp | PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG |

**Nút:** "Gửi báo cáo" (tạo mới) / "Cập nhật" (chỉnh sửa) / "Hủy"

### 11.2 Trạng thái báo cáo

| Trạng thái | Nhãn | Màu |
|---|---|---|
| `DRAFT` | Bản nháp | Xám |
| `SUBMITTED` | Đã gửi | Xanh dương |
| `REVIEWED` | Đã xem | Vàng |
| `APPROVED` | Đã duyệt | Xanh lá |
| `REJECTED` | Từ chối | Đỏ |

### 11.3 Thao tác trên danh sách

| Nút | Điều kiện | Hành động |
|---|---|---|
| **Xem** | Luôn hiển thị | Mở chi tiết báo cáo |
| **Sửa** | Chỉ khi trạng thái `DRAFT` hoặc `SUBMITTED` | Mở form chỉnh sửa |
| **Xóa** | Chỉ khi trạng thái `DRAFT` hoặc `SUBMITTED` | Xác nhận rồi xóa |

---

## 12. Xem quy trình nội bộ (danh sách **Quy trình nội bộ**)

**Truy cập:** menu **Chức năng chung** → nhóm "Đã ban hành" → "Danh sách quy trình"

### 12.1 Tìm kiếm quy trình

Nhập từ khóa vào ô tìm kiếm (placeholder: **"Tìm kiếm theo mã, tên quy trình, nhân viên..."**) → nhấn nút **"Tìm kiếm"**.

### 12.2 Cột bảng danh sách

| Cột | Nội dung |
|---|---|
| STT | Số thứ tự |
| Mã quy trình | `maQuyTrinh` |
| Tên quy trình | `tenQuyTrinh` |
| Loại quy trình | `loaiQuyTrinh` |
| Người tạo | `tenNhanVien` |
| Ngày tạo | Ngày tháng năm |
| Hành động | Nút **"Xem"** — mở chi tiết |

### 12.3 Chi tiết quy trình

Nhấn **"Xem"** để mở modal chi tiết, hiển thị:
- Mã quy trình, Loại quy trình, Tên quy trình, Người tạo, Ngày tạo
- **Sơ đồ quy trình** (nếu có): từng phân đoạn gồm tên phân đoạn, nội dung công việc, bảng chi phí (Loại chi phí / Tên chi phí / Đơn vị / Định mức)

**Nút:** "Đóng"

---

## 13. Khi không có quyền — Escalation

Nếu nhân viên cần thực hiện chức năng ngoài quyền hạn của mình:

| Tình huống | Liên hệ ai | Hành động |
|---|---|---|
| Cần phê duyệt nghỉ phép | `DEPARTMENT_HEAD` của bộ phận | Gửi thông báo qua hệ thống hoặc trực tiếp |
| Cần tạo nhiệm vụ nhưng là EMPLOYEE | `TEAM_LEAD` hoặc `DEPARTMENT_HEAD` | Nhờ cấp trên tạo hộ |
| Cần phê duyệt/hủy tăng ca | `DEPARTMENT_HEAD` hoặc `ADMIN` | Liên hệ trực tiếp |
| Cần xem dữ liệu toàn bộ nhân viên | `ADMIN` | Yêu cầu qua bộ phận IT/HR |
| Không tìm thấy quy trình cần xem | `ADMIN` hoặc bộ phận phụ trách | Đề nghị ban hành quy trình mới |

---

## 14. Câu hỏi thường gặp (FAQ)

**Q1: Tôi xin nghỉ phép nhưng không thấy loại "Nghỉ thai sản" trong danh sách?**
> Loại `MATERNITY` (Nghỉ thai sản) có trong hệ thống. Nếu không thấy, hãy kiểm tra lại dropdown "Loại nghỉ phép". Nếu vẫn không có, liên hệ bộ phận HR hoặc ADMIN.

**Q2: Tôi là EMPLOYEE, có thể tự tạo nhiệm vụ cho bản thân không?**
> Không. Chức năng tạo nhiệm vụ chỉ dành cho TEAM_LEAD trở lên. Để có nhiệm vụ, TEAM_LEAD hoặc DEPARTMENT_HEAD phải giao cho bạn qua form **Tạo nhiệm vụ**. Bạn có thể xem danh sách nhiệm vụ được giao qua thẻ "Nhiệm vụ" trên Dashboard.

**Q3: Góp ý riêng và Nêu khó khăn khác gì nhau?**
> **Góp ý riêng (GOP_Y):** Dùng khi bạn muốn đề xuất cải tiến hoặc gửi ý kiến xây dựng. Bắt buộc điền "Mục đích góp ý".
> **Nêu khó khăn (NEU_KHO_KHAN):** Dùng khi bạn gặp trở ngại trong công việc. Bắt buộc điền "Giải pháp đề xuất" để thể hiện bạn đã suy nghĩ về hướng giải quyết.

**Q4: Kế hoạch tăng ca của tôi đang "Chờ duyệt" — bao lâu thì có kết quả?**
> Thời gian phê duyệt tùy thuộc vào DEPARTMENT_HEAD hoặc ADMIN. Bạn có thể liên hệ trực tiếp với quản lý để đôn đốc. Khi được duyệt hoặc từ chối, trạng thái sẽ cập nhật trong danh sách kế hoạch tăng ca.

**Q5: Tôi muốn đính kèm file khi xin nghỉ ốm — định dạng nào được hỗ trợ?**
> Hệ thống hỗ trợ: **PDF, DOC, DOCX, JPG, PNG**. Kích thước tối đa **100MB** mỗi tệp.

**Q6: Tôi đã nộp yêu cầu vật tư nhưng muốn chỉnh sửa — phải làm sao?**
> Nếu yêu cầu chưa được xử lý (trạng thái "Chưa cung cấp"), bạn có thể nhờ ADMIN/DEPARTMENT_HEAD chỉnh sửa từ màn hình mục **Yêu cầu vật tư**. Yêu cầu đã được cung cấp không thể chỉnh sửa.

**Q7: Mức độ ưu tiên "Cao" trong yêu cầu sửa chữa có nghĩa là sẽ được xử lý ngay không?**
> Mức độ ưu tiên giúp bộ phận phụ trách sắp xếp thứ tự xử lý, nhưng không đảm bảo thời gian cố định. Nếu khẩn cấp, hãy chọn loại lỗi "Khẩn cấp (`khan_cap`)" và liên hệ trực tiếp bộ phận kỹ thuật.
