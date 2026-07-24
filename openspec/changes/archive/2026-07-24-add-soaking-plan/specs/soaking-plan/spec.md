## ADDED Requirements

### Requirement: QLSX tạo kế hoạch ngâm từ đơn hàng
Hệ thống SHALL cho phép nhân viên phòng Quản lý sản xuất (QLSX) và ADMIN tạo một kế hoạch ngâm (`SoakingPlan`) gắn với một đơn hàng, một mục đơn hàng (`OrderItem`) và sản phẩm nguyên liệu (`InternationalProduct`) của mục đó. Kế hoạch lưu các thông số ngâm mục tiêu: `soLanNgam`, `nhietDoNuocTruocNgam`, `nhietDoNuocSauVot`, `thoiGianNgam`, `brixNuocNgam`, `khoiLuong`. Chỉ đơn hàng có `trangThaiSanXuat = CHO_LEN_KE_HOACH` MỚI được chọn làm nguồn tạo kế hoạch.

#### Scenario: Tạo kế hoạch ngâm thành công
- **WHEN** nhân viên QLSX chọn một đơn hàng đang ở trạng thái `CHO_LEN_KE_HOACH`, chọn một mục sản phẩm trong đơn, nhập đủ thông số ngâm mục tiêu và lưu
- **THEN** hệ thống tạo bản ghi `SoakingPlan` với `trangThai = HIEU_LUC`, gắn đúng `orderId`, `orderItemId`, `productId` (kèm `maSanPham`, `tenSanPham` denormalized), và trả về theo response shape chuẩn `{ success: true, data }`

#### Scenario: Từ chối tạo kế hoạch cho đơn không ở trạng thái chờ lên kế hoạch
- **WHEN** yêu cầu tạo kế hoạch tham chiếu đơn hàng KHÔNG ở trạng thái `CHO_LEN_KE_HOACH`
- **THEN** hệ thống từ chối bằng lỗi `ValidationError` với thông điệp tiếng Việt và KHÔNG tạo bản ghi

#### Scenario: Từ chối khi thiếu thông số bắt buộc
- **WHEN** yêu cầu tạo kế hoạch thiếu một trong các thông số ngâm mục tiêu bắt buộc
- **THEN** hệ thống trả về `ValidationError` và KHÔNG tạo bản ghi

### Requirement: QLSX sửa và huỷ kế hoạch ngâm
Hệ thống SHALL cho phép QLSX/ADMIN cập nhật thông số của một kế hoạch ngâm và chuyển trạng thái kế hoạch sang `HUY`. Kế hoạch ở trạng thái `HUY` SHALL không còn được coi là hiệu lực.

#### Scenario: Cập nhật thông số kế hoạch
- **WHEN** QLSX sửa thông số ngâm của một kế hoạch đang `HIEU_LUC` và lưu
- **THEN** hệ thống cập nhật các thông số và giữ nguyên các liên kết `orderId`/`orderItemId`/`productId`

#### Scenario: Huỷ kế hoạch
- **WHEN** QLSX huỷ một kế hoạch
- **THEN** hệ thống đặt `trangThai = HUY` và kế hoạch đó không còn xuất hiện trong danh sách kế hoạch hiệu lực theo sản phẩm

### Requirement: Truy vấn kế hoạch hiệu lực theo sản phẩm
Hệ thống SHALL cung cấp endpoint trả về danh sách kế hoạch ngâm có `trangThai = HIEU_LUC` khớp một `productId` cho trước, dùng cho màn Đánh giá ngâm.

#### Scenario: Có đúng một kế hoạch hiệu lực
- **WHEN** màn Đánh giá ngâm yêu cầu kế hoạch hiệu lực cho một `productId` chỉ có một kế hoạch `HIEU_LUC`
- **THEN** hệ thống trả về danh sách gồm đúng kế hoạch đó

#### Scenario: Có nhiều kế hoạch hiệu lực cho cùng sản phẩm
- **WHEN** một `productId` có nhiều hơn một kế hoạch `HIEU_LUC` (thuộc nhiều đơn khác nhau)
- **THEN** hệ thống trả về tất cả các kế hoạch hiệu lực để công nhân chọn nhanh

#### Scenario: Không có kế hoạch hiệu lực
- **WHEN** một `productId` không có kế hoạch `HIEU_LUC` nào
- **THEN** hệ thống trả về danh sách rỗng

### Requirement: Màn Đánh giá ngâm hiển thị chia đôi kế hoạch/thực tế
Màn Đánh giá ngâm (`ProductionMaterialEvaluationEntry`) tại bước Thông số SHALL hiển thị hai cột: cột kế hoạch (thông số mục tiêu từ `SoakingPlan` khớp theo `productId` mà công nhân đã chọn ở bước Nguyên liệu) và cột thực tế (ô nhập hiện có). Việc lưu đánh giá SHALL không phụ thuộc vào sự tồn tại của kế hoạch.

#### Scenario: Sản phẩm có kế hoạch hiệu lực
- **WHEN** công nhân đã chọn một sản phẩm nguyên liệu có đúng một kế hoạch `HIEU_LUC`
- **THEN** cột kế hoạch hiển thị các thông số mục tiêu của kế hoạch đó bên cạnh ô nhập thực tế tương ứng

#### Scenario: Sản phẩm có nhiều kế hoạch hiệu lực
- **WHEN** sản phẩm đã chọn có nhiều kế hoạch `HIEU_LUC`
- **THEN** công nhân chọn nhanh một kế hoạch trong danh sách, và cột kế hoạch hiển thị theo kế hoạch được chọn

#### Scenario: Sản phẩm không có kế hoạch
- **WHEN** sản phẩm đã chọn không có kế hoạch `HIEU_LUC`, hoặc công nhân chưa chọn sản phẩm
- **THEN** cột kế hoạch được ẩn/để trống và công nhân vẫn nhập và lưu đánh giá bình thường như trước
