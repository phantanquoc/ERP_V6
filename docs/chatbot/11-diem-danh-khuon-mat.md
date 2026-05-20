---
department: ALL
department_name: "Tất cả bộ phận"
roles: [ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE]
access: all
language: vi
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

| Kết quả | Ý nghĩa | Màu hiển thị |
|---|---|---|
| ✅ Check-in thành công | Ghi nhận giờ vào | Xanh lá |
| 👋 Check-out thành công | Ghi nhận giờ ra | Xanh lá |
| ℹ️ Đã điểm danh hôm nay | Đã check-in và check-out rồi | Xanh dương |
| ❌ Vui lòng thử lại | Không nhận diện được | Đỏ |
| ⏳ Vui lòng chờ | Điểm danh quá nhanh (cooldown) | Vàng |

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

> URL: `/face-attendance` (trang quản trị)

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

## 7. Quản lý thiết bị Kiosk (Dành cho Admin)

### 7.1 Đăng ký thiết bị mới

1. Vào **Quản lý điểm danh** → tab **Thiết bị**
2. Nhấn **Thêm thiết bị**
3. Điền thông tin:
   - **Tên thiết bị** ✅ (bắt buộc): Ví dụ "Kiosk Tầng 1"
   - **Vị trí** ✅ (bắt buộc): Ví dụ "Sảnh chính"
4. Hệ thống tạo **Device Key** — lưu lại để cấu hình cho thiết bị kiosk

### 7.2 Cấu hình thiết bị

Trên thiết bị kiosk, cần cấu hình 2 biến môi trường:
- `VITE_FACE_DEVICE_KEY`: Device Key được tạo ở bước trên
- `VITE_FACE_DEVICE_ID`: ID thiết bị (tùy chọn)

### 7.3 Bật/Tắt thiết bị

- **Tắt thiết bị**: Kiosk ngừng hoạt động, không nhận điểm danh
- **Bật thiết bị**: Kích hoạt lại

---

## 8. Xem lịch sử điểm danh (Dành cho Admin)

1. Vào **Quản lý điểm danh** → tab **Lịch sử**
2. Xem danh sách điểm danh với thông tin:
   - Tên nhân viên, mã nhân viên
   - Thời gian check-in / check-out
   - Trạng thái (đúng giờ / đi muộn)
   - Thiết bị sử dụng

---

## 9. FAQ

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
