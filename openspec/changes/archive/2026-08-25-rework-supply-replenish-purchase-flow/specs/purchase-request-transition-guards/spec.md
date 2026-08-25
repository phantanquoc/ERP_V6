## ADDED Requirements

### Requirement: Purchase request status allowlist

The system SHALL enforce a fixed allowlist of purchase-request status transitions: `Chờ báo giá → Chờ duyệt` (only via `POST /:id/submit-approval`), `Chờ duyệt → {Đã duyệt, Từ chối}`, `Đã duyệt → Hoàn thành`. Any `PUT /:id` that attempts a different `trangThai` transition SHALL be rejected with `400 ValidationError` before any write.

#### Scenario: Direct jump from Chờ báo giá to Đã duyệt is rejected
- **WHEN** a caller calls `PUT /api/purchase-requests/:id` setting `trangThai = 'Đã duyệt'` while the stored status is `Chờ báo giá`
- **THEN** the server responds `400` and `trangThai` stays `Chờ báo giá`

#### Scenario: Any status jumping to Hoàn thành without approval is rejected
- **WHEN** a caller attempts `PUT /api/purchase-requests/:id` with `trangThai = 'Hoàn thành'` while the stored status is not `Đã duyệt`
- **THEN** the server responds `400`

#### Scenario: Rejection is an explicit terminal status
- **WHEN** a PR is moved to `Từ chối`
- **THEN** no further `submitForApproval` or status transition is allowed from that row

### Requirement: submitForApproval gates quotation completeness

`POST /api/purchase-requests/:id/submit-approval` SHALL require `trangThai = 'Chờ báo giá'` and every `PurchaseRequestItem` to carry a non-null `nhaCungCapId` (active supplier) and `giaDuKien > 0`. Missing fields SHALL be rejected before the status update.

#### Scenario: Submit without a priced line fails
- **WHEN** a `Chờ báo giá` PR with one unpriced item calls `POST /:id/submit-approval`
- **THEN** the server responds `400` listing the offending items

### Requirement: Locked purchase request items after approval

After a PR reaches `Đã duyệt` or `Hoàn thành`, the system SHALL reject any `PUT` that modifies `items`, `phanLoai`, `tenHangHoa`, `soLuong`, `nhaCungCapId`, or `giaDuKien`.

#### Scenario: Items locked after approval
- **WHEN** a PR in `Đã duyệt` receives a `PUT` with a different `items` array
- **THEN** the server responds `400 ValidationError` and no items are mutated

### Requirement: Purchase request code generation is transactional

`maYeuCau` (`YC-MH-…`) generation SHALL occur inside the creation transaction so two concurrent creates cannot collide on the code.

#### Scenario: Concurrent PR creation does not violate uniqueness
- **WHEN** two callers create PRs concurrently
- **THEN** each receives a distinct `maYeuCau` and neither receives a unique-constraint error
