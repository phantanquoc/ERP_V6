# Quy trình hướng dẫn — Chức năng chung (Tất cả nhân viên)

## 1. Chấm công vào/ra ca

### Đã chuyển sang chấm công bằng khuôn mặt áp dụng (1-6-2026)

---

## 2. Báo cáo công việc hàng ngày

viết ngắn gọn, các việc đã xử lý trong ngày là được

### Bước 1: Truy cập

- Dashboard → nút **"Báo cáo công việc"**

### Bước 2: Tạo báo cáo mới

- Nhấn **"Tạo báo cáo mới"** (góc trên phải)

### Bước 3: Điền thông tin


| Trường                 | Bắt buộc | Ghi chú                           |
| ---------------------- | -------- | --------------------------------- |
| Ngày báo cáo           | ✅        | Mặc định hôm nay                  |
| Số giờ làm việc        |          | Mặc định 8h, bước nhảy 0.5        |
| Mô tả công việc đã làm | ✅        | Chi tiết công việc trong ngày     |
| Thành tựu / Kết quả    |          | Kết quả tích cực đạt được         |
| Khó khăn / Vấn đề      |          | Vấn đề cần hỗ trợ                 |
| Kế hoạch ngày mai      |          | Dự kiến công việc tiếp theo       |
| File đính kèm          |          | PDF, DOC, JPG, PNG (tối đa 100MB) |


### Bước 4: Gửi

- Nhấn **"Gửi báo cáo"** → trạng thái chuyển thành `SUBMITTED`

### Trạng thái báo cáo


| Trạng thái  | Ý nghĩa            |
| ----------- | ------------------ |
| `DRAFT`     | Bản nháp, chưa gửi |
| `SUBMITTED` | Đã gửi, chờ xem    |
| `REVIEWED`  | Đã được xem        |


---

## 3. Xin nghỉ phép

### Bước 1: Truy cập

- Dashboard → nút **"Xin nghỉ phép"**

### Bước 2: Điền form


| Trường          | Bắt buộc | Ghi chú                                                         |
| --------------- | -------- | --------------------------------------------------------------- |
| Loại nghỉ phép  | ✅        | ANNUAL / SICK / PERSONAL / MATERNITY / EMERGENCY / COMPENSATORY |
| Ngày bắt đầu    | ✅        |                                                                 |
| Ngày kết thúc   | ✅        | Phải ≥ ngày bắt đầu                                             |
| Nghỉ nửa ngày   |          | Tích nếu chỉ nghỉ sáng hoặc chiều                               |
| Lý do nghỉ phép | ✅        |                                                                 |
| File đính kèm   |          | PDF, DOC, JPG, PNG (tối đa 100MB)                               |


### Bước 3: Gửi

- Nhấn **"Gửi đơn"** → đơn chuyển sang `PENDING`, chờ DEPARTMENT_HEAD/ADMIN phê duyệt

### Theo dõi trạng thái


| Trạng thái | Ý nghĩa             |
| ---------- | ------------------- |
| `PENDING`  | Chờ duyệt           |
| `APPROVED` | Đã duyệt            |
| `REJECTED` | Từ chối (kèm lý do) |


---

## 4. Yêu cầu cung cấp vật tư

**Áp dụng cho:** Tất cả nhân viên

### Bước 1: Truy cập

- **Chức năng chung** → "Tạo yêu cầu bổ sung/cung cấp"

### Bước 2: Điền form


| Trường             | Bắt buộc | Ghi chú                             |
| ------------------ | -------- | ----------------------------------- |
| Danh sách sản phẩm | ✅        | Nhấn "+ Thêm sản phẩm" để thêm dòng |
| — Phân loại        |          | Ví dụ: NVL, thiết bị, phụ tùng      |
| — Tên gọi          | ✅        |                                     |
| — Số lượng         | ✅        | Phải > 0                            |
| — Đơn vị tính      | ✅        | Kg / Cái / Hệ / Lít / Thùng / Bộ    |
| Mục đích yêu cầu   | ✅        |                                     |
| Mức độ ưu tiên     | ✅        | Cao / Trung bình / Thấp             |
| Ghi chú            |          |                                     |


### Bước 3: Gửi

- Nhấn **"Gửi yêu cầu"** → kho + admin nhận được thông báo

---

## 5. Yêu cầu sửa chữa thiết bị

**Áp dụng cho:** Tất cả nhân viên

### Bước 1: Truy cập

- **Chức năng chung** → "Tạo phiếu yêu cầu sửa chữa kiểm tra"

### Bước 2: Điền form


| Trường                  | Bắt buộc | Ghi chú                           |
| ----------------------- | -------- | --------------------------------- |
| Tên hệ thống / thiết bị | ✅        |                                   |
| Khu vực sử dụng         | ✅        |                                   |
| Nội dung lỗi            | ✅        | Mô tả chi tiết lỗi                |
| Loại lỗi                | ✅        | Lỗi mới / Lỗi lặp lại / Khẩn cấp  |
| Mức độ ưu tiên          | ✅        | Cao / Trung bình / Thấp           |
| Ghi chú                 |          |                                   |
| Tệp đính kèm            |          | PDF, DOC, JPG, PNG (tối đa 100MB) |


### Bước 3: Gửi

- Nhấn **"Gửi yêu cầu"** → bộ phận kỹ thuật + admin nhận thông báo

---

## 6. Nhiệm vụ (TEAM_LEAD trở lên)

> ⚠️ **Chỉ:** `TEAM_LEAD`, `DEPARTMENT_HEAD`, `ADMIN`

### Bước 1: Truy cập

- **Chức năng chung** → "Tạo nhiệm vụ"

### Bước 2: Điền form


| Trường              | Bắt buộc | Ghi chú             |
| ------------------- | -------- | ------------------- |
| Ngày giao           |          | Mặc định hôm nay    |
| Lọc theo phòng ban  |          | Để lọc người nhận   |
| Người nhận nhiệm vụ | ✅        | Chọn từ danh sách   |
| Nội dung nhiệm vụ   | ✅        |                     |
| Thời hạn hoàn thành |          | Chọn ngày           |
| Mức độ ưu tiên      | ✅        | Low / Medium / High |
| Ghi chú             |          |                     |


### Bước 3: Gửi

- Nhấn **"Tạo nhiệm vụ"** → người nhận nhận thông báo + admin nhận bản sao

---

## 7. Kế hoạch công việc (TEAM_LEAD trở lên)

> ⚠️ **Chỉ:** `TEAM_LEAD`, `DEPARTMENT_HEAD`, `ADMIN`

### Bước 1: Truy cập

- **Chức năng chung** → "Tạo kế hoạch công việc"

### Bước 2: Điền form


| Trường            | Bắt buộc | Ghi chú                          |
| ----------------- | -------- | -------------------------------- |
| Người thực hiện   |          | Mặc định là người đang đăng nhập |
| Tiêu đề kế hoạch  | ✅        |                                  |
| Nội dung kế hoạch | ✅        |                                  |
| Ngày bắt đầu      |          |                                  |
| Ngày kết thúc     |          |                                  |
| Mức độ ưu tiên    | ✅        | Low / Medium / High              |
| Ghi chú           |          |                                  |


### Bước 3: Gửi

- Nhấn **"Tạo kế hoạch"** → người được giao nhận thông báo

---

## 8. Kế hoạch tăng ca

### Tạo kế hoạch

> ⚠️ **Tạo:** `TEAM_LEAD` trở lên

- **Chức năng chung** → "Danh sách kế hoạch tăng ca" → **"Thêm mới"**


| Trường             | Bắt buộc | Ghi chú             |
| ------------------ | -------- | ------------------- |
| Ngày tăng ca       | ✅        |                     |
| Lọc theo phòng ban |          | Để lọc danh sách NV |
| Người tham gia     | ✅        | Chọn nhiều          |
| Nội dung công việc | ✅        |                     |
| Giờ bắt đầu        | ✅        |                     |
| Giờ kết thúc       | ✅        |                     |
| Ghi chú            |          |                     |


### Phê duyệt

> ⚠️ **Duyệt:** `DEPARTMENT_HEAD`, `ADMIN`

- Vào danh sách → tìm KH chờ duyệt → nhấn **Duyệt** hoặc **Từ chối** (kèm lý do)

---

## 9. Góp ý riêng / Nêu khó khăn

### Bước 1: Truy cập

- **Chức năng chung** → "Góp ý riêng" hoặc "Nêu khó khăn"

### Bước 2: Góp ý riêng (`GOP_Y`)


| Trường         | Bắt buộc | Ghi chú |
| -------------- | -------- | ------- |
| Nội dung góp ý | ✅        |         |
| Mục đích góp ý | ✅        |         |
| Ghi chú        |          |         |
| File kèm theo  |          |         |


### Nêu khó khăn (`NEU_KHO_KHAN`)


| Trường            | Bắt buộc | Ghi chú |
| ----------------- | -------- | ------- |
| Nội dung khó khăn | ✅        |         |
| Giải pháp đề xuất | ✅        |         |
| Ghi chú           |          |         |
| File kèm theo     |          |         |


> **Khác biệt:** `GOP_Y` có "Mục đích góp ý"; `NEU_KHO_KHAN` có "Giải pháp đề xuất"

---

