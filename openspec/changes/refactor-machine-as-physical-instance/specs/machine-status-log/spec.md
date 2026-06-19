## ADDED Requirements

### Requirement: MachineStatusLog records every status transition per physical machine
The system SHALL store one `MachineStatusLog` row for every status transition of a physical machine. Each log entry SHALL include the physical machine id (`machineSystemId`), the previous status (`trangThaiCu`), the new status (`trangThaiMoi`), a free-text reason (`nguyenNhan`), the user who triggered the transition (`nguoiCapNhat`), an optional note (`ghiChu`), and the transition timestamp (`thoiDiem`).

#### Scenario: Log a status transition
- **WHEN** an authorized QLHTM user changes a physical machine's status via `MachineSystemService.updateStatus`
- **THEN** the system writes the new status to `MachineSystem.trangThai` and inserts a `MachineStatusLog` row inside the same `prisma.$transaction`
- **THEN** the log row records the previous status, new status, reason, user, optional note, and timestamp

#### Scenario: Reject transition without a reason
- **WHEN** the request omits or sends an empty `nguyenNhan`
- **THEN** the system rejects the request with a Vietnamese validation message
- **THEN** the persisted status and the log table are unchanged

#### Scenario: Reject transition that does not change status
- **WHEN** the request sets the new status to the same value as the current `trangThai`
- **THEN** the system rejects the request with a Vietnamese validation message
- **THEN** no log row is written

### Requirement: MachineStatusLog list view replaces the aggregate activity report
The system SHALL replace the legacy `MachineActivityReport` aggregate report with a per-machine status log list view. The QLHTM tab previously labelled "Báo cáo hoạt động" SHALL be renamed "Nhật ký trạng thái máy" and SHALL list status transitions with filters for physical machine, new status, and date range.

#### Scenario: List status logs by physical machine
- **WHEN** an authorized QLHTM user opens the "Nhật ký trạng thái máy" tab and filters by a specific physical machine
- **THEN** the system returns only log rows whose `machineSystemId` matches the selected machine ordered by `thoiDiem` descending
- **THEN** each row shows the previous status, new status, reason, user, optional note, and timestamp in a dense ERP table

#### Scenario: Filter logs by status and date range
- **WHEN** a QLHTM user filters logs by a `trangThaiMoi` value and a date range
- **THEN** the system returns only log rows that match both filters
- **THEN** pagination metadata reflects the filtered result count

#### Scenario: Legacy activity report endpoints are removed
- **WHEN** any client calls `/api/machine-activity-reports` or its sub-routes after the migration
- **THEN** the system responds with HTTP 404 and a Vietnamese error message
- **THEN** the `machine_activity_reports` table is no longer present in the database

### Requirement: AI agent registry exposes machine status log tools
The system SHALL register `list_machine_status_logs` (read) and `update_machine_status` (write, `is_write: True`) in `ai-service/agent/registry.py` and SHALL keep the registry test count in `ai-service/tests/test_registry.py` aligned with the net delta after removing the deprecated machine tools.

#### Scenario: Agent updates a physical machine status
- **WHEN** the AI agent invokes `update_machine_status` with a `machineSystemId`, new status, reason, and user identity
- **THEN** the request is gated as a write action requiring user confirmation before execution
- **THEN** on confirmation, the backend wraps the status write and log insertion in one transaction, matching the rules above

#### Scenario: Agent lists status logs for a physical machine
- **WHEN** the AI agent invokes `list_machine_status_logs` filtered by `machineSystemId`
- **THEN** the registry tool calls the same backend endpoint used by the UI
- **THEN** the response includes the same fields shown in the QLHTM "Nhật ký trạng thái máy" tab
