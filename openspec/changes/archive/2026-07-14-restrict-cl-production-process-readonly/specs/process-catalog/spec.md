## MODIFIED Requirements

### Requirement: Frontend Dropdowns Source From The Active Catalog

The system SHALL replace the previous hardcoded 5-value `loaiQuyTrinh` dropdowns in `ProcessManagement` with options sourced from `useProcessTypes({kichHoat: true})`. This applies to BOTH the filter dropdown in the table header AND the `<select name="loaiQuyTrinh">` inside the Create/Edit form. Legacy `Process` rows whose `loaiQuyTrinh` value does not appear in the active catalog SHALL still be displayed in the table but are shown verbatim (no attempt to remap). When editing such a row, the form dropdown SHALL preserve the current value by rendering an additional option labeled `${value} (không còn kích hoạt)` so that saving the form does not silently drop the value.

#### Scenario: Filter dropdown lists active types only
- **WHEN** the ProcessManagement component mounts
- **THEN** the "Loại quy trình" filter dropdown lists all `ProcessType` rows with `kichHoat=true` ordered by `thuTu`
- **AND** the previous hardcoded values ("Đóng gói", "Vận chuyển", "Kiểm tra chất lượng", "Sản xuất", "Khác") are not present unless they exist as ProcessType rows

#### Scenario: Form dropdown lists active types only for new Process
- **WHEN** a user opens the Create Process modal
- **THEN** the form's "Loại quy trình" select lists all `ProcessType` rows with `kichHoat=true` ordered by `thuTu`
- **AND** none of the pre-catalog hardcoded values are hardcoded into the select

#### Scenario: Form dropdown preserves legacy value on Edit
- **GIVEN** an existing Process row with `loaiQuyTrinh = "Đóng gói"` and no ProcessType row named "Đóng gói"
- **WHEN** a user opens the Edit modal for that Process
- **THEN** the "Loại quy trình" select shows the current value "Đóng gói (không còn kích hoạt)" as the selected option
- **AND** the active catalog options are also listed
- **AND** saving without changing the field preserves `loaiQuyTrinh = "Đóng gói"` in the database

#### Scenario: Form dropdown shows loading state while catalog is fetching
- **WHEN** a user opens the Create Process modal before `useProcessTypes` resolves
- **THEN** the "Loại quy trình" select shows a disabled placeholder option indicating loading
- **AND** the form cannot be submitted with an empty `loaiQuyTrinh` value

#### Scenario: Legacy loaiQuyTrinh values remain visible in table rows
- **GIVEN** a Process row has `loaiQuyTrinh = "Đóng gói"` and no active ProcessType has that name
- **WHEN** the ProcessManagement table renders
- **THEN** the row still appears with `loaiQuyTrinh` shown as "Đóng gói"

### Requirement: Settings Page At `/quality/process-types`

The system SHALL provide a settings page at `/quality/process-types` that lists all `ProcessType` rows in a table with columns: STT, Tên, Mã, Thứ tự (editable inline), Kích hoạt (toggle), Actions. Rows with `macDinhHeThong=true` SHALL display a lock indicator, have the name input disabled, and hide the Delete button. Rows with `macDinhHeThong=false` SHALL expose Edit (opens name-edit modal) and Delete (confirmation dialog) actions. The page SHALL be reachable via a **"Cài đặt"** button rendered inside the `ProcessManagement` component's toolbar, positioned adjacent to the "Xuất Excel" button. The button SHALL render only when the parent component passes an `onOpenTypeSettings` callback prop; `QualityProcess` passes this callback (gated on the user being ADMIN or a Quality DEPARTMENT_HEAD), while `ProductionDepartment` does NOT pass it, so the button naturally disappears there. The button label MUST be short — "Cài đặt" — accompanied by a Settings icon; the previous long label "Cài đặt loại quy trình" and the header-level placement are removed.

#### Scenario: Button is not rendered when caller does not pass callback
- **WHEN** the `ProductionDepartment` page mounts the `ProcessManagement` component without an `onOpenTypeSettings` prop
- **THEN** the "Cài đặt" button is not rendered in the toolbar

#### Scenario: Button hidden for unauthorized Quality user
- **WHEN** a user with `role === 'EMPLOYEE'` opens `/quality/process` and views the "Danh sách quy trình" tab
- **THEN** the "Cài đặt" button is not rendered
- **AND** this is because QualityProcess withholds the `onOpenTypeSettings` prop when the user is not ADMIN or Quality DEPARTMENT_HEAD

#### Scenario: Button rendered for Quality department head next to Xuất Excel
- **WHEN** a `DEPARTMENT_HEAD` in `DEPT_QUALITY` opens `/quality/process` and views the "Danh sách quy trình" tab
- **THEN** the "Cài đặt" button is rendered in the same toolbar row as the "Xuất Excel" button
- **AND** clicking it navigates to `/quality/process-types`

#### Scenario: Button is only visible on the processList tab
- **WHEN** the user switches from "Danh sách quy trình" to "Quy trình sản xuất", "Danh sách đơn hàng", or "Kiểm tra nội bộ"
- **THEN** the "Cài đặt" button is not visible (it lives inside ProcessManagement which only mounts on `processList`)

#### Scenario: Settings page renders lock on system-default rows
- **WHEN** an ADMIN opens `/quality/process-types`
- **THEN** the four system-default rows show a lock icon
- **AND** their name inputs are disabled
- **AND** their Delete buttons are hidden
- **AND** their kichHoat toggle and thuTu input are enabled

#### Scenario: Custom row Delete asks for confirmation
- **WHEN** an authorized user clicks Delete on a custom row
- **THEN** a confirmation dialog appears before the DELETE request is issued
