## ADDED Requirements

### Requirement: Notification on supply request created
When a new supply request is created, the system SHALL send a notification of type `SUPPLY_REQUEST` to all employees whose `subDepartment.department.code` equals `DEPT_PURCHASING`. This is the existing behavior, formalized here as a spec requirement.

#### Scenario: New supply request notifies purchasing department
- **WHEN** a supply request is successfully created
- **THEN** one notification is inserted for each employee in the purchasing department with type "SUPPLY_REQUEST" and a message summarizing the requester name, department, and item list

### Requirement: Notification on transition to "Đang xử lý"
The system SHALL send a notification of type `SUPPLY_REQUEST_PROCESSING` to the employee who created the supply request (identified by `employeeId` on the SupplyRequest) when the status transitions to "Đang xử lý".

#### Scenario: Requester notified when processing starts
- **WHEN** a SupplyRequest status changes to "Đang xử lý"
- **THEN** one notification is inserted for the original requester with type "SUPPLY_REQUEST_PROCESSING" and a message indicating their request is being processed

### Requirement: Notification on transition to "Đã duyệt mua"
The system SHALL send notifications of type `SUPPLY_REQUEST_APPROVED` to: (a) the employee who created the supply request, and (b) all employees whose `subDepartment.department.code` equals `DEPT_WAREHOUSE`, when the status transitions to "Đã duyệt mua".

#### Scenario: Requester and warehouse notified when purchase approved
- **WHEN** a SupplyRequest status changes to "Đã duyệt mua"
- **THEN** one notification is inserted for the original requester and one for each warehouse department employee, all with type "SUPPLY_REQUEST_APPROVED"

### Requirement: Notification on transition to "Đã cung cấp"
The system SHALL send a notification of type `SUPPLY_REQUEST_FULFILLED` to the employee who created the supply request when the status transitions to "Đã cung cấp".

#### Scenario: Requester notified when fulfilled
- **WHEN** a SupplyRequest status changes to "Đã cung cấp"
- **THEN** one notification is inserted for the original requester with type "SUPPLY_REQUEST_FULFILLED" and a message indicating their request has been fulfilled

### Requirement: Notification failure is non-fatal
If sending notifications fails for any reason, the system SHALL log the error but SHALL NOT roll back the status transition or the triggering operation.

#### Scenario: Notification error does not abort status update
- **WHEN** a status transition succeeds but the notification insert throws an error
- **THEN** the status transition is committed, the error is logged, and the API response reflects success

### Requirement: New notification type constants
The `NotificationType` constants object in `notification.types.ts` SHALL include `SUPPLY_REQUEST_PROCESSING`, `SUPPLY_REQUEST_APPROVED`, and `SUPPLY_REQUEST_FULFILLED` in addition to the existing `SUPPLY_REQUEST`.

#### Scenario: New constants accessible
- **WHEN** backend service code imports `NotificationType`
- **THEN** `NotificationType.SUPPLY_REQUEST_PROCESSING`, `NotificationType.SUPPLY_REQUEST_APPROVED`, and `NotificationType.SUPPLY_REQUEST_FULFILLED` are valid values
