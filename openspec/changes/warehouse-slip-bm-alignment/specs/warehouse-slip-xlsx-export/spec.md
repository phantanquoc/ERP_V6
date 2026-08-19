## ADDED Requirements

### Requirement: Server xlsx export reproducing BM01/BM03

The system SHALL provide `GET /api/warehouse-receipts/:id/export-xlsx` and `GET /api/warehouse-issues/:id/export-xlsx` (or equivalent) that generate an `.xlsx` file via `exceljs` reproducing the BM01-QT03 (receipt) / BM03-QT03 (issue) template exactly. The workbook SHALL be A4 landscape, `fitToPage`, margins 0, scale ~82, with a defined print area. The sheet SHALL contain: company header rows (CÔNG TY TNHH THỰC PHẨM QUỐC TẾ AN BÌNH + address + phone/fax + embedded `abf-logo.png` via `workbook.addImage`), title row (`PHIẾU NHẬP KHO` / `PHIẾU XUẤT KHO`), requester/department/reason/date rows, a 13-column detail table (`TT | Mã hàng hóa | Loại Kho | Tên hàng hóa | Số lô (KH/TT) | Số kiện (KH/TT) | Tình trạng | Quy cách | Đơn vị | Số lượng (KH/TT) | Ghi chú`) with two header rows (row 8 merged So lo/So kien/So luong, row 9 plan/actual), thin borders, Times New Roman, header fill, flexible row count (no hardcoded 5), BM footer (`BM01-QT03`/`BM03-QT03` Lần 02 Ngày 17/05/2026), kien-capacity note (`1 kiện nguyên liệu 32 bao (1 bao 25kg) / 1 kiện thành phẩm 36 thùng`), QR per kien (small, via `qrcode` → base64 PNG → exceljs image), and signatures (3 for issue: Người xuất/Người nhận/Quản lý kho; 2 for receipt: Người nhập/Quản lý kho). Plan vs actual kien sets and quantities from the slip SHALL be rendered in the correct KH/TT column pairs; grouped product rows SHALL show comma-joined maKien and summed quantities. The export SHALL also set `daIn` on first call.

#### Scenario: Export receipt xlsx
- **WHEN** an authorized user calls `GET /api/warehouse-receipts/:id/export-xlsx` for an existing receipt
- **THEN** the response is `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` with `Content-Disposition: attachment; filename=...xlsx`, the workbook opens in Excel/LibreOffice with the BM01 layout, and the slip's `daIn` is set if first export

#### Scenario: Export issue xlsx has three signatures
- **WHEN** an issue slip is exported
- **THEN** the xlsx footer shows three signature blocks (Người xuất kho / Người nhận / Quản lý kho), while a receipt export shows two (Người nhập kho / Quản lý kho)

#### Scenario: Flexible rows
- **WHEN** a slip has 2 lines or 12 lines
- **THEN** the exported sheet has exactly 2 or 12 data rows respectively (no hardcoded 5-row filler), and pages correctly if exceeding one printed page

### Requirement: Xlsx print-ready

The exported workbook SHALL have print setup configured so that opening the file and pressing Ctrl+P prints correctly without manual adjustment (landscape, fitToWidth=1, correct paperSize, printArea covering the content).

#### Scenario: Print from exported file
- **WHEN** the exported xlsx is opened and printed
- **THEN** the printed output matches the BM layout on A4 landscape with no manual margin or orientation changes needed
