## ADDED Requirements

### Requirement: Notifications fire after the primary write commits

Pricing workflow notification triggers SHALL run after the primary database write commits. Each call SHALL be wrapped in `try/catch` so notification failures cannot bubble. Triggers MUST NOT run inside the primary `prisma.$transaction`.

#### Scenario: Notification service throws

- **WHEN** a notification trigger invokes `notificationService.create` and the call throws
- **THEN** the service logs a warning and the primary HTTP response still resolves successfully

#### Scenario: Notification trigger sequencing

- **WHEN** a service runs an entity update inside `prisma.$transaction`
- **THEN** notification triggers fire AFTER the transaction commits, never before

### Requirement: New quotation request notifies department leadership

The system SHALL send notifications to all `DEPARTMENT_HEAD` and `TEAM_LEAD` users in the creator's department when a `QuotationRequest` is created. The title/body SHALL be Vietnamese using the template `"Có YCBG mới: {tenKhachHang} từ {nguoiTao}"`.

#### Scenario: YCBG created by EMPLOYEE

- **WHEN** an `EMPLOYEE` in department `D1` creates a quotation request for customer "ACME"
- **THEN** every `DEPARTMENT_HEAD` and `TEAM_LEAD` whose `departmentId = D1` receives a notification with the rendered Vietnamese template

### Requirement: Quotation win/loss notifies stakeholders

The system SHALL notify the quotation creator when a quotation's `tinhTrang` advances to `DA_DAT_HANG`, and SHALL notify the creator plus every `DEPARTMENT_HEAD` in the creator's department when it advances to `KHONG_DAT_HANG`. Vietnamese templates are `"Báo giá {soBaoGia} đã được khách hàng đặt hàng"` and `"Báo giá {soBaoGia} không đạt đơn hàng"`.

#### Scenario: Quotation marked DA_DAT_HANG

- **WHEN** a quotation transitions into `DA_DAT_HANG`
- **THEN** only the creator receives the win notification

#### Scenario: Quotation marked KHONG_DAT_HANG

- **WHEN** a quotation transitions into `KHONG_DAT_HANG`
- **THEN** the creator plus every `DEPARTMENT_HEAD` in the creator's department receives the loss notification

### Requirement: Order delivery notifies creator

The system SHALL notify the order creator when an `Order`'s production status advances to `DA_GIAO_CHO_KHACH_HANG`. The template SHALL be `"Đơn hàng {soDonHang} đã giao thành công"`.

#### Scenario: Order delivered

- **WHEN** an order transitions into `DA_GIAO_CHO_KHACH_HANG`
- **THEN** the creator receives the delivery notification

### Requirement: ADMIN price unlock notifies stakeholders

The system SHALL notify the quotation creator and every `DEPARTMENT_HEAD` in the creator's department when an `ADMIN` unlocks the price of a locked quotation. The template SHALL be `"ADMIN {tenAdmin} đã mở khóa giá báo giá {soBaoGia}"`.

#### Scenario: ADMIN unlocks price

- **WHEN** an `ADMIN` submits `forceUnlock: true` on a locked quotation and the unlock succeeds
- **THEN** the creator and every department head in the creator's department receive the unlock notification
