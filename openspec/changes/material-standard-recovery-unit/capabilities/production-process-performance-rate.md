## Purpose
Chi tiết quy trình sản xuất ghi nhận năng suất thực hiện theo phút cho mỗi công đoạn, độc lập với định mức thực hiện đang có, để so sánh năng suất thực tế giữa các công đoạn có đơn vị khác nhau (kg, cái, lít...).

## ADDED Requirements

### Requirement: Nhãn "Định mức lao động" đổi thành "Định mức thực hiện"
Cột và mọi nhãn UI tham chiếu "ĐỊNH MỨC LAO ĐỘNG" trong chi tiết quy trình sản xuất đổi thành "ĐỊNH MỨC THỰC HIỆN". Field DB `dinhMucLaoDong`/`donViDinhMucLaoDong` giữ tên, vì đây là đổi nhãn hiển thị, không đổi ý nghĩa dữ liệu hay công thức.

#### Scenario: Nhãn cột trong bảng flowchart
- **WHEN** người dùng mở chi tiết quy trình sản xuất
- **THEN** tiêu đề cột hiện "ĐỊNH MỨC THỰC HIỆN", không còn "ĐỊNH MỨC LAO ĐỘNG"

### Requirement: Nhãn "Khối lượng nguyên liệu (kg)" đổi thành "Khối lượng cần thực hiện (kg)"
Cột `soLuongNguyenLieu` đổi nhãn hiển thị vì công đoạn không chỉ tiêu thụ nguyên liệu — có thể là số lượng vật tư, số sản phẩm, v.v.

#### Scenario: Nhãn cột số lượng nguyên liệu
- **WHEN** người dùng mở chi tiết quy trình sản xuất
- **THEN** tiêu đề cột hiện "KHỐI LƯỢNG CẦN THỰC HIỆN (Kg)", không còn "SỐ LƯỢNG NGUYÊN LIỆU (Kg)"

### Requirement: Cột năng suất thực hiện theo phút
Mỗi dòng chi phí trong flowchart có thêm hai field nhập liệu: `nangSuatTrenPhut` (Float) và `donViNangSuat` (String, tự do có gợi ý). Cột hiển thị ghép thành "<donViNangSuat>/phút".

#### Scenario: Nhập năng suất cho công đoạn có ĐVT là Người
- **WHEN** người dùng nhập `nangSuatTrenPhut = 2.5`, `donViNangSuat = "kg"` cho một dòng chi phí có `donVi = "Người"`
- **THEN** cột hiển thị "2.5 kg/phút"

#### Scenario: Gợi ý đơn vị năng suất qua danh sách có sẵn
- **WHEN** người dùng focus vào ô "Đơn vị năng suất"
- **THEN** UI gợi ý các giá trị thường dùng: kg, cái, lít — nhưng vẫn nhận giá trị tự do khác

#### Scenario: Bỏ trống năng suất
- **WHEN** người dùng không nhập năng suất cho một dòng chi phí
- **THEN** cột hiển thị "—", không ảnh hưởng tới `soLuongKeHoach` hiện có (công thức không đổi)

### Requirement: Năng suất độc lập với định mức thực hiện hiện có
`nangSuatTrenPhut` không tham gia công thức `soLuongKeHoach = soLuongNguyenLieu / (dinhMucLaoDong * soPhutThucHien)` đang có — đây là field quan sát thêm, không thay số liệu kế hoạch.

#### Scenario: Nhập năng suất không đổi số lượng kế hoạch
- **WHEN** người dùng nhập `nangSuatTrenPhut` cho một dòng đã có `soLuongKeHoach` tính sẵn
- **THEN** `soLuongKeHoach` giữ nguyên giá trị cũ
