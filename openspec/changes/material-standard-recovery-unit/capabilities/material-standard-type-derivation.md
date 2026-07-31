## Purpose
Loại định mức được sinh tự động từ loại hàng hóa (InternationalProduct.loaiSanPham) của nguyên liệu đầu vào và thành phẩm đầu ra, thay cho việc người dùng chọn tay từ danh sách cứng RAW_MATERIAL/EQUIPMENT.

## ADDED Requirements

### Requirement: Item nguyên liệu/thành phẩm liên kết tới InternationalProduct
`MaterialStandardInputItem` và `MaterialStandardItem` có thêm `internationalProductId` (nullable FK, `onDelete: SetNull`). Form đã cho chọn sản phẩm từ danh mục qua dropdown tìm kiếm — nay dropdown lưu lại `id` của sản phẩm chọn, không chỉ copy tên.

#### Scenario: Chọn nguyên liệu từ danh mục sản phẩm có sẵn
- **WHEN** người dùng chọn một `InternationalProduct` từ dropdown tìm kiếm cho ô nguyên liệu đầu vào
- **THEN** `tenNguyenLieu` được điền tên sản phẩm, và `internationalProductId` được gán id của sản phẩm đó

#### Scenario: Gõ tên tự do không khớp sản phẩm nào
- **WHEN** người dùng gõ tên nguyên liệu không chọn từ dropdown
- **THEN** `tenNguyenLieu` lưu theo text đã gõ, `internationalProductId` là `NULL`

#### Scenario: Migration backfill theo tên khớp
- **WHEN** migration chạy trên item có `internationalProductId = NULL` và `tenNguyenLieu`/`tenThanhPham` khớp chính xác (không phân biệt hoa thường) với một `InternationalProduct.tenSanPham`
- **THEN** `internationalProductId` được gán id của sản phẩm khớp

#### Scenario: Migration không backfill khi không khớp hoặc khớp nhiều
- **WHEN** tên không khớp sản phẩm nào, hoặc khớp nhiều hơn một sản phẩm
- **THEN** `internationalProductId` giữ `NULL`

### Requirement: Loại định mức sinh tự động từ loại hàng hóa đầu vào và đầu ra
Backend tính `loaiDinhMuc` (String) mỗi khi đọc hoặc ghi định mức, dựa trên `loaiSanPham` của các item liên kết. Cột `loaiDinhMuc` trong DB là cache để filter/sort, không phải nguồn sự thật.

#### Scenario: Một loại đầu vào, một loại đầu ra
- **WHEN** tất cả input item có `loaiSanPham = "Nguyên liệu"` và tất cả output item có `loaiSanPham = "Thành phẩm"`
- **THEN** `loaiDinhMuc = "Nguyên liệu → Thành phẩm"`

#### Scenario: Nhiều đầu ra khác loại — lấy loại có tỉ lệ cao nhất, ghép nếu còn khác biệt
- **WHEN** output item có nhiều `loaiSanPham` khác nhau
- **THEN** loại đầu ra hiển thị là loại của item có `tiLe` cao nhất; nếu sau khi loại trùng vẫn còn hơn một loại phân biệt, ghép chúng bằng " + " theo thứ tự `tiLe` giảm dần

#### Scenario: Item không link được sản phẩm
- **WHEN** một phía (đầu vào hoặc đầu ra) có tất cả item đều `internationalProductId = NULL`
- **THEN** phía đó hiển thị "Chưa xác định" trong nhãn loại định mức, ví dụ "Chưa xác định → Thành phẩm"

#### Scenario: Định mức không có item nào
- **WHEN** định mức chưa có input item hoặc output item nào
- **THEN** `loaiDinhMuc = NULL`, danh sách hiển thị "—"

### Requirement: Danh sách định mức lọc và hiển thị theo loại định mức đã sinh
Bộ lọc "Loại định mức" trên danh sách đổi từ dropdown 2 giá trị cứng sang lọc theo text chứa (đã sinh tự động), khớp với các nhãn thực tế trong dữ liệu.

#### Scenario: Lọc theo loại định mức
- **WHEN** người dùng lọc "Nguyên liệu → Thành phẩm"
- **THEN** danh sách chỉ hiện định mức có `loaiDinhMuc` chứa cụm đó (so khớp không phân biệt hoa thường)
