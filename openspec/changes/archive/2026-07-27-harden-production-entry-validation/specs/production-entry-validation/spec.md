## ADDED Requirements

### Requirement: Ngưỡng min/max cho thông số nhập liệu sản xuất
Hệ thống SHALL áp dụng ngưỡng min/max cố định cho từng thông số nhập liệu sản xuất, đồng bộ ở cả frontend và backend:

| Thông số | Min | Max | Kiểu |
|---|---|---|---|
| `nhietDoNuocTruocNgam`, `nhietDoNuocSauVot` | 0 | 200 | thập phân |
| `giaiDoan{1..4}NhietDo` | 0 | 400 | thập phân |
| `brixNuocNgam` | 0 | 100 | thập phân |
| `giaiDoan{1..4}ApSuat` | 0 | 20 | thập phân |
| `thoiGianNgam` | 0 | 2880 | nguyên (phút) |
| `giaiDoan{1..4}ThoiGian` | 0 | 2880 | nguyên (phút) |
| `soLanNgam` | 0 | 40 | nguyên |
| `khoiLuong`, `khoiLuongDauVao`, khối lượng ô sản lượng | 0 | 200000 | thập phân (kg) |

Giá trị ngoài ngưỡng SHALL bị từ chối. Thông báo lỗi SHALL bằng tiếng Việt và nêu rõ khoảng cho phép.

#### Scenario: Nhập giá trị vượt ngưỡng trên
- **WHEN** người dùng nhập nhiệt độ nước ngâm là 9999
- **THEN** hệ thống không nhận giá trị đó và hiển thị thông báo tiếng Việt nêu rõ khoảng cho phép (0 đến 200)

#### Scenario: Nhập giá trị âm
- **WHEN** người dùng nhập một giá trị âm vào bất kỳ ô số nào (kể cả ô sản lượng)
- **THEN** hệ thống không nhận giá trị âm

#### Scenario: Nhập thập phân vào ô số nguyên
- **WHEN** người dùng nhập 30.5 vào ô thời gian (phút) — kể cả khi nhập trực tiếp, không qua lớp nhập focus
- **THEN** giá trị được làm tròn xuống thành số nguyên

#### Scenario: Giá trị không hữu hạn
- **WHEN** giá trị nhập vào cho ra `Infinity` hoặc `NaN` (ví dụ `1e999`)
- **THEN** hệ thống không nhận giá trị đó và không gửi lên máy chủ

### Requirement: Backend từ chối dữ liệu ngoài ngưỡng
Các endpoint nhận dữ liệu nhập liệu sản xuất (đánh giá ngâm, thông số vận hành, sản lượng thành phẩm) SHALL validate payload theo cùng bảng ngưỡng ở trên trước khi ghi vào cơ sở dữ liệu, và trả lỗi khi dữ liệu không hợp lệ.

#### Scenario: Gọi API trực tiếp với giá trị vô lý
- **WHEN** một client gửi payload có nhiệt độ 99999 hoặc giá trị âm tới endpoint nhập liệu sản xuất
- **THEN** máy chủ từ chối request với lỗi validation và KHÔNG ghi dữ liệu

#### Scenario: Payload hợp lệ
- **WHEN** payload có mọi thông số nằm trong ngưỡng
- **THEN** máy chủ xử lý và ghi dữ liệu bình thường

### Requirement: Giới hạn dung lượng ảnh đính kèm
Ảnh đính kèm ở màn Đánh giá ngâm SHALL không vượt quá 20 MB. Vượt quá SHALL bị từ chối kèm thông báo tiếng Việt.

#### Scenario: Ảnh quá lớn
- **WHEN** người dùng chọn ảnh có dung lượng lớn hơn 20 MB
- **THEN** hệ thống từ chối ảnh đó và hiển thị thông báo tiếng Việt về giới hạn dung lượng

### Requirement: Không cho chọn thời gian chiên ở tương lai
Trường thời gian chiên ở màn Đánh giá ngâm SHALL không cho chọn thời điểm sau thời điểm hiện tại.

#### Scenario: Chọn ngày tương lai
- **WHEN** người dùng mở bộ chọn thời gian chiên và thử chọn một thời điểm ở tương lai
- **THEN** hệ thống không cho chọn thời điểm đó

### Requirement: Cảnh báo trước khi ghi đè dữ liệu đã nhập
Ở màn Thông số vận hành, khi người dùng mở một máy đã có dữ liệu đã nhập trước đó, hệ thống SHALL yêu cầu xác nhận trước khi cho ghi đè.

#### Scenario: Mở máy đã nhập
- **WHEN** người dùng chọn một máy được đánh dấu đã nhập
- **THEN** hệ thống hỏi xác nhận việc sẽ ghi đè dữ liệu đã có; chỉ khi xác nhận thì mới vào form

#### Scenario: Máy chưa nhập
- **WHEN** người dùng chọn một máy chưa có dữ liệu
- **THEN** hệ thống vào form ngay, không hỏi xác nhận

### Requirement: Lưu nháp cho màn Thông số vận hành
Màn Thông số vận hành SHALL tự lưu nháp dữ liệu đang nhập vào localStorage, theo khóa gồm mã chiên, máy, ngày và ca; dữ liệu SHALL được phục hồi khi tải lại trang. Nháp SHALL bị xoá sau khi lưu thành công.

#### Scenario: Tải lại trang khi đang nhập
- **WHEN** người dùng nhập một số thông số rồi tải lại trang với cùng mã chiên, máy, ngày, ca
- **THEN** các giá trị đang nhập được phục hồi từ nháp

#### Scenario: Sau khi lưu thành công
- **WHEN** người dùng lưu thành công
- **THEN** nháp tương ứng bị xoá

### Requirement: Reset thông số khi đổi sản phẩm
Ở màn Đánh giá ngâm, khi người dùng đổi sản phẩm nguyên liệu, các thông số đã nhập ở bước Thông số và bước Đánh giá SHALL được reset để tránh gán dữ liệu của sản phẩm cũ cho sản phẩm mới.

#### Scenario: Đổi sản phẩm sau khi đã nhập thông số
- **WHEN** người dùng đã nhập thông số rồi quay lại đổi sang sản phẩm khác
- **THEN** các thông số đã nhập được reset về mặc định
