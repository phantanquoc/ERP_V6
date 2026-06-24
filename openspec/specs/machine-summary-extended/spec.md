## ADDED Requirements

### Requirement: Backend getSummary returns maintenance plans
The system SHALL return the most recent maintenancePlans for the machine system in the summary response, limited by SummaryLimits.maintenancePlans (default 5).

#### Scenario: Summary includes maintenance plans
- **WHEN** client requests GET /machine-systems/:id/summary
- **THEN** response.data.maintenancePlans SHALL contain up to 5 MaintenancePlan records for that machineSystemId, ordered by nam DESC

### Requirement: Backend getSummary returns finished products
The system SHALL return the most recent finishedProducts for the machine system in the summary response, limited by SummaryLimits.finishedProducts (default 5).

#### Scenario: Summary includes finished products
- **WHEN** client requests GET /machine-systems/:id/summary
- **THEN** response.data.finishedProducts SHALL contain up to 5 FinishedProduct records for that machineSystemId, ordered by createdAt DESC

### Requirement: Backend getSummary returns quality evaluations
The system SHALL return the most recent qualityEvaluations for the machine system in the summary response, limited by SummaryLimits.qualityEvaluations (default 5).

#### Scenario: Summary includes quality evaluations
- **WHEN** client requests GET /machine-systems/:id/summary
- **THEN** response.data.qualityEvaluations SHALL contain up to 5 QualityEvaluation records for that machineSystemId, ordered by createdAt DESC

### Requirement: Backend getSummary returns parent system and clone count
The system SHALL return parentSystem (id, maHeThong, tenHeThong) if the machine has a parentSystemId, and a clonedSystemsCount integer.

#### Scenario: Machine with parent system
- **WHEN** machine has parentSystemId set
- **THEN** response.data.parentSystem SHALL contain { id, maHeThong, tenHeThong } of the parent

#### Scenario: Machine without parent system
- **WHEN** machine has no parentSystemId
- **THEN** response.data.parentSystem SHALL be null

#### Scenario: Clone count
- **WHEN** client requests summary
- **THEN** response.data.clonedSystemsCount SHALL be the integer count of MachineSystem records with parentSystemId equal to this machine's id

### Requirement: SummaryLimits interface extended
The SummaryLimits interface SHALL include optional fields: maintenancePlans, finishedProducts, qualityEvaluations (all number, defaulting to 5).

#### Scenario: Custom limits passed
- **WHEN** caller provides { maintenancePlans: 10 } in limits
- **THEN** up to 10 maintenancePlans SHALL be returned

### Requirement: Frontend MachineSystemSummary type extended
The MachineSystemSummary TypeScript interface SHALL include: maintenancePlans (any[]), finishedProducts (any[]), qualityEvaluations (any[]), parentSystem (object | null), clonedSystemsCount (number).

#### Scenario: Type matches backend response
- **WHEN** frontend receives summary response
- **THEN** all new fields SHALL be typed without TypeScript errors

### Requirement: General tab displays loaiHeThong
The general tab SHALL display the machine's loaiHeThong field with a Vietnamese label map (e.g., SAN_XUAT → "Sản xuất", DONG_GOI → "Đóng gói").

#### Scenario: loaiHeThong shown
- **WHEN** user views general tab
- **THEN** "Loại hệ thống" field SHALL show the Vietnamese label for the machine's loaiHeThong enum value

### Requirement: General tab displays maThietBi and tenThietBi
The general tab SHALL display maThietBi and tenThietBi fields when they are non-null.

#### Scenario: Machine has equipment info
- **WHEN** machine.maThietBi and machine.tenThietBi are set
- **THEN** general tab SHALL show "Mã thiết bị" and "Tên thiết bị" fields

#### Scenario: Machine has no equipment info
- **WHEN** machine.maThietBi is null
- **THEN** the equipment fields SHALL be hidden or show "—"

### Requirement: General tab displays fileDinhKem as download link
The general tab SHALL display fileDinhKem as a clickable download link when present.

#### Scenario: File attached
- **WHEN** machine.fileDinhKem is a non-null string
- **THEN** general tab SHALL render a download link with the filename

#### Scenario: No file
- **WHEN** machine.fileDinhKem is null
- **THEN** no download link SHALL be rendered

### Requirement: General tab displays timestamps
The general tab SHALL display createdAt and updatedAt in DD/MM/YYYY format.

#### Scenario: Timestamps shown
- **WHEN** user views general tab
- **THEN** "Ngày tạo" and "Cập nhật" fields SHALL show formatted dates

### Requirement: General tab displays clone lineage
The general tab SHALL display parent system info (if exists) as a clickable reference, and the count of cloned systems.

#### Scenario: Machine has parent
- **WHEN** parentSystem is not null
- **THEN** general tab SHALL show "Hệ thống gốc: {tenHeThong} ({maHeThong})"

#### Scenario: Machine has clones
- **WHEN** clonedSystemsCount > 0
- **THEN** general tab SHALL show "Số bản sao: {count}"

#### Scenario: No lineage
- **WHEN** parentSystem is null and clonedSystemsCount is 0
- **THEN** lineage section SHALL be hidden

### Requirement: Faults tab displays AcceptanceHandover items
The faults tab SHALL include a "Nghiệm thu sau sửa chữa" section listing handoverItems with key fields.

#### Scenario: Handover items exist
- **WHEN** summary.handoverItems has entries
- **THEN** faults tab SHALL display a section with each item showing: maNghiemThu (from parent AcceptanceHandover), ngayNghiemThu, tinhTrangTruocSuaChua, tinhTrangSauSuaChua

#### Scenario: No handover items
- **WHEN** summary.handoverItems is empty
- **THEN** section SHALL show "Chưa có nghiệm thu" or be hidden

### Requirement: Summary metrics row includes Nghiệm thu count
The summary metrics row SHALL include a 7th metric showing the count of handoverItems.

#### Scenario: Metrics row layout
- **WHEN** drawer is open
- **THEN** metrics row SHALL show 7 items with responsive grid (lg:grid-cols-7)

#### Scenario: Nghiệm thu count
- **WHEN** handoverItems has N entries
- **THEN** "Nghiệm thu" metric SHALL display N
