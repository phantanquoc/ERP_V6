## ADDED Requirements

### Requirement: BM-faithful browser print view

`WarehouseSlipPrintView` SHALL be redesigned to match the BM01/BM03 template for browser print (`@media print`). It SHALL render: company header with `abf-logo.png` (`<img src="/abf-logo.png">`), title (`PHIẾU NHẬP KHO` / `PHIẾU XUẤT KHO`), requester (`nguoiDeNghi`), department (`boPhan`), issue reason (`lyDoXuatKho` for issue) / purpose (`mucDich` for receipt), date, the 13-column detail table with plan/actual splits (So lo KH/TT, So kien KH/TT as comma-joined maKien, So luong KH/TT, Tinh trang, Quy cach), BM footer, kien note, QR per kien, and correct signatures (3 for issue, 2 for receipt). Plan vs actual values SHALL be in the correct column pairs; grouped product rows SHALL collapse per-kien DB rows as in the xlsx export.

#### Scenario: Print receipt shows two signatures
- **WHEN** a receipt slip is rendered in `WarehouseSlipPrintView` with type receipt
- **THEN** the footer shows "Người nhập kho" and "Quản lý kho" signature blocks (2), not three

#### Scenario: Print issue shows three signatures
- **WHEN** an issue slip is rendered
- **THEN** the footer shows "Người xuất kho", "Người nhận", "Quản lý kho" (3)

#### Scenario: Plan/actual columns populated
- **WHEN** a slip has `soLoKeHoach`, `soKienKeHoach`, `soKienThucTe`, and condition/packaging
- **THEN** the print table shows them in the correct KH/TT sub-columns and the Tinh trang / Quy cach columns

### Requirement: Print triggers lock flag

Triggering browser print (the "In phiếu" button) SHALL call the backend to set `daIn` on first print, same as the xlsx export.

#### Scenario: First browser print marks printed
- **WHEN** the user clicks "In phiếu" on a slip with `daIn=false`
- **THEN** the frontend calls the mark-printed endpoint and the slip becomes `daIn=true`
