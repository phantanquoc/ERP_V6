## ADDED Requirements

### Requirement: Danh sách định mức đổi bộ cột hiển thị
Bảng danh sách định mức hiển thị 5 cột nội dung theo đúng thứ tự yêu cầu, cộng 2 cột sẵn có (Ngày tạo, Hoạt động) giữ nguyên ở cuối.

#### Scenario: Bộ cột và nhãn tiêu đề
- **WHEN** người dùng mở danh sách định mức
- **THEN** thứ tự cột là: `Mã định mức` · `Tên thành phẩm đầu ra` · `Tên nguyên liệu đầu vào` · `Khối lượng thu hồi (kg NL → 1kg TP)` · `Loại định mức` · `Ngày tạo` · `Hoạt động`
- **THEN** tiêu đề cột thứ hai là "Tên thành phẩm đầu ra", không còn "Tên định mức"

#### Scenario: Cột tên nguyên liệu đầu vào với một nguyên liệu
- **WHEN** định mức có đúng một input item
- **THEN** cột "Tên nguyên liệu đầu vào" hiện `tenNguyenLieu` của item đó

#### Scenario: Cột tên nguyên liệu đầu vào với nhiều nguyên liệu
- **WHEN** định mức có nhiều input item
- **THEN** cột hiện tên của item có `tiLe` cao nhất, kèm hậu tố `+N` với N là số item còn lại

#### Scenario: Định mức chưa có nguyên liệu đầu vào
- **WHEN** định mức không có input item nào
- **THEN** cột "Tên nguyên liệu đầu vào" hiện `—`

#### Scenario: Cột khối lượng thu hồi
- **WHEN** `kgNguyenLieuTren1KgThanhPham = 4.5`
- **THEN** cột hiện `4.5`, không có ký hiệu `%`

### Requirement: Ô tìm kiếm và bộ lọc khớp với bộ cột mới
Bộ lọc cột của danh sách đổi theo nhãn mới; ô tìm kiếm chung quét cả tên nguyên liệu đầu vào.

#### Scenario: Nhãn bộ lọc theo tên mới
- **WHEN** người dùng mở bộ lọc cột
- **THEN** trường lọc `tenDinhMuc` có nhãn "Tên thành phẩm đầu ra"

#### Scenario: Tìm kiếm theo tên nguyên liệu đầu vào
- **WHEN** người dùng gõ tên một nguyên liệu vào ô tìm kiếm chung
- **THEN** định mức có input item khớp tên đó xuất hiện trong kết quả
