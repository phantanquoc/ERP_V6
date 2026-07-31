## Purpose
Cho phép người quản lý kho xem lịch sử chi tiết các lần nhập kho tạo thành số lượng tồn hiện tại của một sản phẩm trong lô — ai nhập, khi nào, mục đích gì, bao nhiêu.

## ADDED Requirements

### Requirement: API trả về lịch sử phiếu nhập kho theo sản phẩm trong lô
Backend cung cấp endpoint để query danh sách phiếu nhập kho của một `lotProductId` cụ thể, sắp xếp theo thời gian từ cũ đến mới.

#### Scenario: Lấy lịch sử nhập kho của sản phẩm trong lô
- **WHEN** client gọi `GET /api/lot-products/:lotProductId/receipt-history`
- **THEN** server trả về `200 OK` với mảng `WarehouseReceipt[]`, mỗi item gồm: `{ id, maPhieuNhap, ngayNhap, maNhanVien, tenNhanVien, mucDich, soLuongNhap, soLuongTruoc, soLuongSau, donViTinh, ghiChu }`, sắp xếp `ORDER BY ngayNhap ASC`

#### Scenario: LotProduct không tồn tại
- **WHEN** client gọi với `lotProductId` không có trong DB
- **THEN** server trả về `404 Not Found` với message "Không tìm thấy sản phẩm trong lô"

#### Scenario: LotProduct chưa có lần nhập nào
- **WHEN** `lotProductId` tồn tại nhưng không có `WarehouseReceipt` nào link tới (chỉ xảy ra khi sản phẩm mới tạo chưa nhập)
- **THEN** server trả về `200 OK` với mảng rỗng `[]`

### Requirement: Frontend hiển thị lịch sử nhập kho dạng modal drill-down
Khi người dùng click vào số lượng tồn (`soLuong`) của một sản phẩm trong lô, UI mở modal hiển thị bảng lịch sử các lần nhập.

#### Scenario: Người dùng click vào số tồn để xem lịch sử
- **WHEN** người dùng click vào ô `soLuong` của một `LotProduct` trong danh sách warehouse management
- **THEN** UI mở modal "Lịch sử nhập kho — {tenSanPham}" chứa bảng các cột: "Mã phiếu", "Ngày nhập", "Người nhập", "Mục đích", "Số lượng nhập", "Tồn trước", "Tồn sau", "Ghi chú"

#### Scenario: Modal hiển thị đúng dữ liệu từ API
- **WHEN** modal mở và gọi `GET /api/lot-products/:id/receipt-history`
- **THEN** mỗi dòng trong bảng hiển thị đúng: `maPhieuNhap`, `ngayNhap` format `DD/MM/YYYY HH:mm`, `tenNhanVien`, `mucDich` (hiển thị "—" nếu null), `soLuongNhap`, `soLuongTruoc`, `soLuongSau`, `ghiChu` (hiển thị "—" nếu null)

#### Scenario: Modal loading và error states
- **WHEN** API đang fetch, UI hiển thị spinner trong modal
- **WHEN** API trả về lỗi, UI hiển thị "Không thể tải lịch sử" và nút "Thử lại"
- **WHEN** API trả về mảng rỗng, UI hiển thị "Chưa có lần nhập kho nào"
