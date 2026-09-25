## ADDED Requirements

### Requirement: Inbound plan detail modal
The system SHALL provide a read-only detail modal for an inbound plan that warehouse users can open by clicking a plan row in the list (both desktop table row and mobile card). The modal SHALL display plan identity, linked purchase request, item list, warehouse and dates, full audit history, and linked receipts, without exposing edit actions.

#### Scenario: Open detail from desktop row
- **WHEN** a warehouse user clicks an inbound plan row in the desktop table
- **THEN** the system opens the inbound plan detail modal showing that plan's data

#### Scenario: Open detail from mobile card
- **WHEN** a warehouse user taps an inbound plan card on mobile
- **THEN** the system opens the same detail modal with the same content

#### Scenario: Detail shows linked YCMH, items, warehouse and dates
- **WHEN** the detail modal is open
- **THEN** the system displays the plan's `maKeHoach` and status badge, the linked YCMH (`maYeuCau`, requester, YCMH status), the YCMH item table (tenHangHoa, soLuong, donViTinh, phanLoai), and the warehouse/date fields (kho đích, ngayDuKien, trangThai)

#### Scenario: Detail shows full audit history
- **WHEN** the detail modal is open and the plan has logs
- **THEN** the system renders the full `PlanLogHistory` (all entries) including hanhDong, ngayCu/ngayMoi, lyDo, nguoiThucHien, and createdAt

#### Scenario: Detail shows linked receipts when present
- **WHEN** the detail modal is open and the plan has receipts
- **THEN** the system lists the receipts (maPhieuNhap, ngayNhap, quantities) or an empty state when none exist

#### Scenario: Detail is read-only
- **WHEN** the detail modal is open
- **THEN** the system does not show edit/cancel/receive actions inside the modal; those remain on the list row actions
