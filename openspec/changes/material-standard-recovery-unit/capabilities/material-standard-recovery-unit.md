## Purpose
Khối lượng thu hồi của định mức NVL được lưu và hiển thị bằng số kg nguyên liệu cần để tạo ra 1 kg thành phẩm, thay cho đơn vị phần trăm — đúng cách người vận hành sản xuất diễn đạt định mức.

## ADDED Requirements

### Requirement: Cột lưu khối lượng thu hồi đổi sang kg nguyên liệu trên 1kg thành phẩm
`MaterialStandard.tiLeThuHoi` (Float, đơn vị %) được thay bằng `kgNguyenLieuTren1KgThanhPham` (Float, đơn vị kg NL/1kg TP). Migration chuyển đổi dữ liệu sẵn có theo công thức nghịch đảo.

#### Scenario: Migration chuyển đổi định mức có tỷ lệ hợp lệ
- **WHEN** migration chạy trên bản ghi có `tiLeThuHoi = 22.2`
- **THEN** `kgNguyenLieuTren1KgThanhPham` bằng `100.0 / 22.2` = `4.504504504504505`

#### Scenario: Migration bỏ qua bản ghi không tính được
- **WHEN** migration chạy trên bản ghi có `tiLeThuHoi` là `NULL` hoặc `0`
- **THEN** `kgNguyenLieuTren1KgThanhPham` là `NULL`, migration không đổ vì chia cho 0

#### Scenario: Migration giữ nguyên tiLeThuHoi của báo giá
- **WHEN** migration chạy
- **THEN** `business.quotation_requests.tiLeThuHoi`, `business.quotations.tiLeThuHoi`, và `business.quotation_calculator_by_products.tiLe` không bị thay đổi — đó là snapshot % của báo giá, không phải định mức

### Requirement: Form định mức nhập trực tiếp kg nguyên liệu cho 1kg thành phẩm
Ô nhập nhận số kg nguyên liệu. Ô "Tỉ lệ thu hồi (%)" readonly hiện tại bị bỏ, vì nó tính theo chiều ngược lại.

#### Scenario: Người dùng nhập khối lượng thu hồi
- **WHEN** người dùng nhập `4.5` vào ô "Khối lượng thu hồi (kg NL → 1kg TP)" và lưu
- **THEN** request gửi `kgNguyenLieuTren1KgThanhPham: 4.5`, DB lưu `4.5`

#### Scenario: Giá trị nhỏ hơn 1 là bất thường
- **WHEN** người dùng nhập giá trị `< 1` (nghĩa là 1kg nguyên liệu ra hơn 1kg thành phẩm)
- **THEN** UI hiện cảnh báo "Cần dưới 1 kg nguyên liệu cho 1 kg thành phẩm là bất thường. Vui lòng kiểm tra lại." nhưng vẫn cho lưu

#### Scenario: Bỏ trống khối lượng thu hồi
- **WHEN** người dùng để trống ô khối lượng thu hồi và lưu
- **THEN** DB lưu `NULL`, không báo lỗi validation

### Requirement: Chi tiết định mức hiển thị khối lượng thu hồi theo đơn vị mới
Modal chi tiết định mức hiển thị giá trị kèm diễn giải chiều biến đổi.

#### Scenario: Xem chi tiết định mức có khối lượng thu hồi
- **WHEN** người dùng mở chi tiết định mức có `kgNguyenLieuTren1KgThanhPham = 4.5`
- **THEN** hiển thị `4.5 kg nguyên liệu → 1 kg thành phẩm`

#### Scenario: Xem chi tiết định mức chưa có khối lượng thu hồi
- **WHEN** `kgNguyenLieuTren1KgThanhPham` là `NULL`
- **THEN** hiển thị `—`
