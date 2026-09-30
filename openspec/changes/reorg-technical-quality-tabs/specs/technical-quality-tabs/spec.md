## ADDED Requirements

### Requirement: TechnicalQuality exposes seven top-level tabs
The TechnicalQuality page SHALL expose exactly seven top-level tabs with keys `inspections`, `repairs`, `faults`, `machineSystems`, `maintenance`, `spareParts`, `orders` in that order, each rendering a single domain list without nested pill branching for request type.

#### Scenario: User sees seven tabs
- **WHEN** user navigates to `/technical/quality`
- **THEN** the tab bar shows seven tabs labeled "Danh sách yêu cầu kiểm tra", "Danh sách sửa chữa", "Danh sách lỗi", "Danh sách hệ thống máy", "Danh sách bảo dưỡng", "Danh sách linh kiện", "Danh sách đơn hàng" in order

#### Scenario: Each tab renders its domain list
- **WHEN** user clicks tab `inspections`
- **THEN** only the inspection request list is rendered
- **WHEN** user clicks tab `repairs`
- **THEN** only the repair request list (SUA_CHUA) is rendered
- **WHEN** user clicks tab `faults`
- **THEN** only the fault record list is rendered
- **WHEN** user clicks tab `spareParts`
- **THEN** only the spare part list is rendered
- **WHEN** user clicks tab `orders`
- **THEN** the shared OrderManagement component is rendered
- **WHEN** user clicks tab `machineSystems`
- **THEN** MachineSystemList is rendered
- **WHEN** user clicks tab `maintenance`
- **THEN** MaintenanceTab is rendered

### Requirement: URL state uses tab only
The page URL query param for tab selection SHALL be `?tab=<one of the 7 keys>` only. The `sub` and `type`/`requestType` params SHALL NOT be used for tab routing. Old URLs containing `?tab=repairAndFault&sub=...&type=...` or legacy Vietnamese keys (`heThongMay`, `kiemTra`, `suaChua`, `loi`, `baoDuong`, `linhKien`, `donHang`) SHALL fall back to the default tab.

#### Scenario: Tab navigation syncs to URL
- **WHEN** user clicks tab `repairs`
- **THEN** URL becomes `?tab=repairs`
- **WHEN** user reloads with `?tab=faults`
- **THEN** the Danh sách lỗi tab is active

#### Scenario: Legacy repairAndFault URL falls back
- **WHEN** user navigates to `?tab=repairAndFault&sub=repair&type=kiem_tra`
- **THEN** the page falls back to the default tab (`machineSystems`)

### Requirement: Bao duong keeps internal pills
The `maintenance` tab SHALL continue to expose two internal pills (Kế hoạch bảo dưỡng / Biên bản BD/SC) via MaintenanceTab without being split into separate top-level tabs.

#### Scenario: Bao duong internal navigation
- **WHEN** user is on tab `maintenance`
- **THEN** two pills for plans and records are visible and switch content within the same tab

### Requirement: Inspection and repair lists are independent components
InspectionRequestList and RepairRequestList SHALL be independent components with no shared inspection adapter or cross-type branching. RepairRequestList SHALL handle only SUA_CHUA; InspectionRequestList SHALL handle only KIEM_TRA.

#### Scenario: No cross-type adapter
- **WHEN** inspecting RepairRequestList source
- **THEN** it contains no inspection request adapter, no `isKiemTra` branching, and no KIEM_TRA status sets
- **WHEN** inspecting InspectionRequestList source
- **THEN** it queries only inspection requests and does not reference repair request types

### Requirement: Detail deep-links still open modals
Detail deep-link params `repairId`, `inspectionId`/`inspectionRequestId`, `faultId`/`faultRecordId`, `partId` SHALL still open the corresponding detail modal and activate the matching tab.

#### Scenario: Deep-link opens correct tab and modal
- **WHEN** user navigates to `?tab=repairs&repairId=123`
- **THEN** the Danh sách sửa chữa tab is active and the repair detail modal for id 123 is open
- **WHEN** user navigates to `?tab=inspections&inspectionId=456`
- **THEN** the Danh sách yêu cầu kiểm tra tab is active and the inspection detail modal for id 456 is open
