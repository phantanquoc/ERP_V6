## ADDED Requirements

### Requirement: Complete audit trail for inbound plan schedule changes
The system SHALL record an audit log entry for every inbound plan schedule change initiated from the purchasing update flow, including date changes, warehouse (destination) changes, and transport-note changes, with the real actor as `nguoiThucHien`. The system SHALL guard terminal plans and SHALL create a draft plan when the first schedule signal arrives at Đã duyệt.

#### Scenario: Warehouse change produces an audit log with actor
- **WHEN** purchasing updates `warehouseId` for a purchase request that already has an inbound plan in Chờ nhập
- **THEN** the system writes an `InboundPlanLog` with `hanhDong` indicating warehouse change, the new `warehouseId` reflected on the plan, and `nguoiThucHien` equal to the actor's display name (resolved from the authenticated user)

#### Scenario: Transport-note change produces an audit log with actor
- **WHEN** purchasing updates `ghiChuVanChuyen` for a purchase request that already has an inbound plan
- **THEN** the system writes an `InboundPlanLog` for the transport-note change with `lyDo` as the note content and `nguoiThucHien` as the actor

#### Scenario: Actor attribution does not fall back to nguoiDuyet
- **WHEN** the update is performed by a purchasing user who is not the approver
- **THEN** `nguoiThucHien` on the created log entry is the updater's name, not the prior `nguoiDuyet` and not "Hệ thống"

#### Scenario: First schedule signal at Đã duyệt creates a draft plan
- **WHEN** purchasing sets `ngayDuKienNhap` or `warehouseId` on a purchase request in Đã duyệt that has no inbound plan yet and the request is not terminal (not Hoàn thành/Đã hủy)
- **THEN** the system creates a draft `InboundPlan` with `trangThai` Chờ nhập, `ngayDuKien` resolved as `ngayDuKienNhap ?? ngayDuyet ?? now+7d`, writes a `Tạo kế hoạch từ cập nhật đơn hàng` log, notifies warehouse and admin, and returns the purchase request with the new plan included

#### Scenario: Terminal plan is not rescheduled
- **WHEN** purchasing updates schedule fields for a purchase request whose inbound plan is in Đã nhập or Đã hủy
- **THEN** the system does not reschedule the plan and does not create a replacement plan

#### Scenario: List shows reschedule count and latest change
- **WHEN** the inbound plan list is rendered and a plan has logs
- **THEN** the system shows a badge indicating how many times the plan was changed and a tooltip summarizing the most recent log entry (hanhDong, ngayMoi, nguoiThucHien)

### Requirement: Actor is propagated from controller to plan logging
The system SHALL propagate the authenticated actor identity from the purchase request update endpoint into the inbound plan logging path so warehouse audit is attributable.

#### Scenario: Controller forwards actor
- **WHEN** `PUT /purchase-requests/:id` is called with an authenticated user
- **THEN** the controller resolves the actor's display name (or forwards `actorUserId`) so the service can write it as `nguoiThucHien` without falling back to "Hệ thống"

#### Scenario: Backend type checks pass
- **WHEN** `npx tsc --noEmit` runs in both backend and frontend
- **THEN** the change compiles with zero errors
