## ADDED Requirements

### Requirement: Condition catalog

The system SHALL define a condition catalog `TINH_TRANG_OPTIONS` with 7 entries: `BINH_THUONG` (Bình thường), `HONG` (Hỏng), `AM_MOC` (Ẩm mốc), `QUA_HAN` (Quá hạn), `DANG_KIEM_TRA` (Đang kiểm tra), `TAM_GIU` (Tạm giữ), `KHAC` (Khác — free text). The `tinhTrang` column on line tables SHALL be String? and accept any non-empty string; the UI SHALL offer the 7-item catalog as a select/datalist with a free-text fallback when `KHAC` is chosen or any custom value is typed. Validation SHALL accept any non-empty string (catalog or custom).

#### Scenario: Select catalog condition
- **WHEN** a user picks "Hỏng" from the condition dropdown on a line
- **THEN** `tinhTrang` is saved as "Hỏng"

#### Scenario: Custom condition via Khac
- **WHEN** a user selects "Khác" and types "Nhiễm dầu"
- **THEN** `tinhTrang` is saved as "Nhiễm dầu" (custom free text)

### Requirement: Issue reason presets

`LY_DO_XUAT_KHO_PRESETS` SHALL mirror the shape of `MUC_DICH_PRESETS` (e.g. "Xuất cho sản xuất", "Xuất bán", "Xuất hủy", "Xuất điều chuyển", "Kiểm kê điều chỉnh") stored as free-text String? in `lyDoXuatKho`. The UI SHALL offer presets via a datalist with free-text fallback. `WarehouseReceipt.mucDich` continues to use `MUC_DICH_PRESETS` similarly.

#### Scenario: Select reason preset
- **WHEN** a user creates an issue and picks "Xuất cho sản xuất" from the reason datalist
- **THEN** `lyDoXuatKho` is saved as "Xuất cho sản xuất"

#### Scenario: Custom reason
- **WHEN** a user types a custom reason not in the preset list
- **THEN** it is saved as-is in `lyDoXuatKho`
