# Spec Delta

## MODIFIED Requirements

### Requirement: Locked purchase request items after approval
After a PR reaches `Đã duyệt` or `Hoàn thành`, the system SHALL reject any `PUT` that modifies `items`, `phanLoai`, `tenHangHoa`, `soLuong`, `nhaCungCapId`, or `giaDuKien`. When `trangThai === "Hoàn thành"` the system SHALL still allow `tepDinhKem` append and per-URL removal (up to 4 total) while rejecting all other item/pricing/schedule fields (`ngayDuKienNhap`, `warehouseId`, `ghiChuVanChuyen` included). When `trangThai === "Đã hủy"` no file mutation SHALL be allowed.

#### Scenario: Items locked after approval
- **WHEN** a PR in `Đã duyệt` receives a `PUT` with a different `items` array
- **THEN** the server responds `400 ValidationError` and no items are mutated

#### Scenario: Attachments remain mutable after completion
- **WHEN** a PR in `Hoàn thành` with 2 files is updated with one additional invoice file
- **THEN** the system appends it as `{maYeuCau}-3.ext` and returns `200` while leaving pricing/schedule untouched

#### Scenario: Attachment removal after completion
- **WHEN** a PR in `Hoàn thành` with 2 files is updated to keep only the first file URL
- **THEN** the DB array shrinks to 1 and the orphaned file is deleted from disk

#### Scenario: Files locked after cancellation
- **WHEN** a PR in `Đã hủy` receives a `PUT` with `tepDinhKem` or file upload
- **THEN** the system returns `400 ValidationError` and makes no file changes
