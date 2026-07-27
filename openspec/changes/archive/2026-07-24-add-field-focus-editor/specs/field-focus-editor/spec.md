## ADDED Requirements

### Requirement: Mở lớp nhập focus khi chạm ô số
Trên các màn kiosk nhập liệu sản xuất, khi người dùng chạm/kích hoạt một ô nhập SỐ có thể chỉnh sửa, hệ thống SHALL mở lớp phủ `FieldFocusEditor` toàn màn thay vì để bàn phím ảo bung trực tiếp lên form. Ô nhập ở trạng thái chỉ-đọc hoặc bị khóa (ví dụ tổng thời gian tự tính, hoặc máy đang bảo trì/ngưng) SHALL KHÔNG mở lớp phủ.

#### Scenario: Chạm ô số chỉnh sửa được
- **WHEN** người dùng chạm một ô nhập số đang cho phép chỉnh sửa
- **THEN** `FieldFocusEditor` mở, hiển thị tên ô và giá trị hiện tại, con trỏ sẵn sàng nhập

#### Scenario: Ô chỉ-đọc hoặc bị khóa
- **WHEN** ô là chỉ-đọc (giá trị tự tính) hoặc form bị khóa (máy bảo trì/ngưng)
- **THEN** lớp phủ KHÔNG mở và giá trị không đổi

### Requirement: Bố cục không bị bàn phím che
`FieldFocusEditor` SHALL bố trí nội dung nhập (tên ô, ô nhập, nút thao tác) ở phần trên màn hình để không bị bàn phím ảo che. Lớp phủ SHALL dùng thông tin chiều cao bàn phím hiện có để đặt cụm nút phía trên mép bàn phím.

#### Scenario: Bàn phím mở
- **WHEN** bàn phím ảo hiện lên trong khi editor đang mở
- **THEN** ô nhập và các nút "Tiếp"/"Xong" vẫn nằm trong vùng nhìn thấy, không bị bàn phím che

### Requirement: Gợi ý nhập nhanh
`FieldFocusEditor` SHALL hiển thị hàng nút gợi ý giá trị hay dùng khi ô có danh sách gợi ý. Chạm một nút gợi ý SHALL đặt giá trị đó cho ô.

#### Scenario: Chọn giá trị gợi ý
- **WHEN** người dùng chạm một nút gợi ý (ví dụ khối lượng 350)
- **THEN** giá trị ô được đặt bằng giá trị gợi ý đó

#### Scenario: Ô không có gợi ý
- **WHEN** ô không được cấu hình danh sách gợi ý
- **THEN** hàng nút gợi ý không hiển thị, người dùng vẫn nhập tay bình thường

### Requirement: Điều hướng "Tiếp" giữa các ô
`FieldFocusEditor` SHALL cung cấp nút "Tiếp" để chuyển sang ô nhập kế tiếp theo thứ tự đã định của form, mà không cần đóng lớp phủ. Ở ô cuối cùng, nút "Tiếp" SHALL không còn (hoặc thay bằng "Xong").

#### Scenario: Bấm Tiếp ở ô giữa form
- **WHEN** người dùng đang ở một ô không phải cuối và bấm "Tiếp"
- **THEN** editor chuyển sang ô kế tiếp theo thứ tự, giữ lớp phủ mở

#### Scenario: Ô cuối cùng
- **WHEN** người dùng đang ở ô cuối cùng của form
- **THEN** không có hành động "Tiếp" nữa; người dùng dùng "Xong" để đóng lớp phủ

### Requirement: Lưu tạm, không tự ghi
Giá trị nhập trong `FieldFocusEditor` SHALL được cập nhật vào state tạm của form (không thay đổi cơ chế state hiện có). Việc ghi dữ liệu thật (gọi API lưu) SHALL chỉ xảy ra khi người dùng bấm nút Lưu hiện có của màn — đóng editor KHÔNG tự ghi.

#### Scenario: Đóng editor sau khi nhập
- **WHEN** người dùng nhập giá trị rồi bấm "Xong"
- **THEN** giá trị hiển thị trên form nhưng chưa được ghi; dữ liệu chỉ ghi khi bấm Lưu

#### Scenario: Bấm Lưu
- **WHEN** người dùng bấm nút Lưu của màn
- **THEN** toàn bộ giá trị đã nhập được ghi theo đúng luồng lưu/validation hiện có, không thay đổi
