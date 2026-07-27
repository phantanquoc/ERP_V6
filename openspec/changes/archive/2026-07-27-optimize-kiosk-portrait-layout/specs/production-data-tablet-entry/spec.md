## ADDED Requirements

### Requirement: Bố cục thích ứng theo chiều rộng màn cho bảng nhập sản lượng
Màn nhập Sản lượng chiên SHALL có hai bố cục và **tự động chuyển theo chiều rộng khung nhìn** tại ngưỡng 700 px, KHÔNG có nút chuyển bố cục thủ công:
- Chiều rộng **dưới 700 px** (tablet dọc): hiển thị dạng **danh sách thẻ theo mã chiên**, cuộn dọc, KHÔNG cuộn ngang.
- Chiều rộng **từ 700 px trở lên** (tablet ngang): hiển thị dạng **bảng** như hiện tại.

Hai bố cục SHALL dùng chung state và luồng lưu; chuyển bố cục SHALL không làm mất dữ liệu đang nhập.

#### Scenario: Màn dọc hiển thị thẻ
- **WHEN** chiều rộng khung nhìn nhỏ hơn 700 px
- **THEN** màn hiển thị danh sách thẻ theo mã chiên và không yêu cầu cuộn ngang để nhập

#### Scenario: Màn ngang hiển thị bảng
- **WHEN** chiều rộng khung nhìn từ 700 px trở lên
- **THEN** màn hiển thị dạng bảng ma trận mã chiên × máy

#### Scenario: Xoay màn khi đang nhập
- **WHEN** người dùng đã nhập một số giá trị rồi xoay thiết bị làm đổi bố cục
- **THEN** các giá trị đang nhập vẫn còn nguyên ở bố cục mới

### Requirement: Cấu trúc thẻ nhập theo mã chiên
Ở bố cục thẻ, mỗi thẻ SHALL đại diện một mã chiên và hiển thị theo thứ tự: mã chiên, giờ chiên và tên nguyên liệu ở phần đầu thẻ (chỉ đọc); tiếp theo là danh sách từng máy kèm nhãn máy và ô nhập khối lượng; cuối thẻ là ô ghi chú. Ô nhập trong thẻ SHALL mở lớp nhập focus như ở bố cục bảng.

#### Scenario: Nhập lần lượt các máy trong một thẻ
- **WHEN** người dùng mở một thẻ mã chiên và chạm ô nhập của một máy
- **THEN** lớp nhập focus mở ra cho đúng máy và mã chiên đó, và giá trị nhập được ghi vào cùng ô dữ liệu như ở bố cục bảng

#### Scenario: Không có mã chiên nào
- **WHEN** không có mã chiên nào khớp ca và ngày đã chọn
- **THEN** hiển thị thông báo rỗng bằng tiếng Việt, không hiển thị danh sách thẻ trống

### Requirement: Giữ ngữ cảnh khi cuộn ngang bảng
Ở bố cục bảng, hàng tiêu đề SHALL được ghim khi cuộn dọc và cột mã chiên SHALL được ghim khi cuộn ngang, để người dùng luôn thấy đang nhập máy nào của mã chiên nào.

#### Scenario: Cuộn ngang bảng nhiều máy
- **WHEN** người dùng cuộn ngang bảng để tới các cột máy ở xa
- **THEN** cột mã chiên vẫn hiển thị và hàng tiêu đề cột máy vẫn nhận biết được

## MODIFIED Requirements

### Requirement: Touch-optimized numeric input

All numeric inputs SHALL use a numeric on-screen keyboard (`inputMode="decimal"`), large touch targets of at least 44px, and the shared `parseNumberInput` helper for change handling. Save and navigation controls SHALL be positioned in the upper half of the screen so the tablet keyboard does not obscure them.

**All interactive controls on the kiosk entry screens — including tabs, chips, and list buttons — SHALL have a touch target of at least 44px.** Text that the worker must read to complete the task SHALL be large enough to remain legible on a small tablet screen in a factory environment.

#### Scenario: Numeric keyboard opens on a tablet

- **WHEN** the worker taps a numeric input on a tablet
- **THEN** the numeric on-screen keyboard is shown rather than the alphabetic keyboard

#### Scenario: Save control stays reachable with keyboard open

- **WHEN** the on-screen keyboard covers the lower portion of the screen
- **THEN** the Save and navigation controls remain visible in the upper half

#### Scenario: Tabs and chips meet the touch target

- **WHEN** the worker taps a quality tab or a batch chip on the kiosk screens
- **THEN** the control has a touch target of at least 44px
