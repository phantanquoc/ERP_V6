## ADDED Requirements

### Requirement: Operation-parameters kiosk entry route

The system SHALL expose a full-screen worker data-entry page at `/production/nhap-lieu-van-hanh` for entering `SystemOperation` parameters. The route MUST be under the `/production/nhap-lieu` prefix so kiosk-tab detection (`isKioskTab()`) treats it as a kiosk route. The page SHALL be public (not wrapped in `ProtectedRoute`) and rendered outside the sidebar layout, mirroring the existing tablet entry routes.

#### Scenario: Kiosk tab opens the operation-parameters page

- **WHEN** a kiosk-activated tab navigates to `/production/nhap-lieu-van-hanh`
- **THEN** the full-screen entry page renders without sidebar/layout chrome
- **AND** the tab is marked as a kiosk tab on mount

#### Scenario: Direct visit without activation

- **WHEN** a user opens `/production/nhap-lieu-van-hanh` without an activated kiosk session
- **THEN** a "session not activated" screen is shown instead of the entry form or a login redirect

### Requirement: Operation-parameters entry wizard

The operation-parameters page SHALL guide the worker through a step wizard: select shift, select operator, select a fry batch (`maChien`) for the chosen shift and production date, select a machine, then enter the operation parameters. Shift and operator selection SHALL reuse the shared `ShiftSelectionScreen` and `OperatorSelectionScreen` components. The batch list SHALL be filtered to the selected shift and date (same source as the output page).

#### Scenario: Shift and operator required before parameter entry

- **WHEN** the page loads with a valid kiosk session and no shift or operator selected
- **THEN** the shift-selection screen is shown first, then operator selection, before any batch or parameter entry is available

#### Scenario: Batch list scoped to shift and date

- **WHEN** the worker has selected a shift and the production date is set
- **THEN** only fry batches (`maChien`) matching that shift and date are offered for selection

#### Scenario: Parameters entered per machine

- **WHEN** the worker selects a fry batch and a machine
- **THEN** the wizard presents inputs for stage 1–4 (`NhietDo`, `ApSuat`, `ThoiGian` each), `khoiLuongDauVao`, and `tongThoiGianSay`

### Requirement: Operation-parameters save updates existing row

Saving the operation-parameters form SHALL PATCH the pre-created `SystemOperation` row identified by (`maChien`, machine), not create a new row. The saved `nguoiThucHien` SHALL be the selected operator name.

#### Scenario: Save patches the pre-created row

- **WHEN** the worker fills the parameters and saves for a (`maChien`, machine) pair
- **THEN** the matching pre-created `SystemOperation` row is updated with the entered values
- **AND** no duplicate `SystemOperation` row is created for that pair

#### Scenario: Operator name stamped on save

- **WHEN** the worker saves an operation-parameters entry
- **THEN** the saved `nguoiThucHien` is the selected operator name, not the activating admin's name

### Requirement: Auto-generate production child rows on batch creation

When a `MaterialEvaluation` (fry batch) is created, the system SHALL automatically generate the empty child rows (`SystemOperation`, `FinishedProduct`, `QualityEvaluation`) for every active production machine, on BOTH create paths (warehouse-linked and legacy). This SHALL happen server-side without any manual desktop action. The generation SHALL be a non-fatal side effect: if it fails, the `MaterialEvaluation` creation SHALL still succeed and the error SHALL be logged rather than propagated.

#### Scenario: Child rows exist after batch creation (warehouse-linked)

- **WHEN** a `MaterialEvaluation` is created via the warehouse-linked path with a new `maChien`
- **THEN** empty `SystemOperation`, `FinishedProduct`, and `QualityEvaluation` rows exist for each active production machine tied to that `maChien`

#### Scenario: Child rows exist after batch creation (legacy)

- **WHEN** a `MaterialEvaluation` is created via the legacy path with a new `maChien`
- **THEN** empty `SystemOperation`, `FinishedProduct`, and `QualityEvaluation` rows exist for each active production machine tied to that `maChien`

#### Scenario: Child-row generation failure does not fail batch creation

- **WHEN** the child-row generation fails after the `MaterialEvaluation` is created
- **THEN** the `MaterialEvaluation` creation still returns success
- **AND** the failure is logged, not surfaced as a create error

#### Scenario: No duplicate generation

- **WHEN** child rows already exist for a `maChien`
- **THEN** the auto-generation does not create duplicate rows for that batch

### Requirement: Operation-parameters hub button and entry type

The kiosk hub SHALL present the third entry button as "Thông số vận hành", navigating to the operation-parameters route (replacing the previous placeholder button). The tablet position-config screen SHALL offer `SYSTEM_OPERATION` as an entry type alongside the existing `PRODUCTION_OUTPUT` and `MATERIAL_EVALUATION`.

#### Scenario: Hub navigates to operation-parameters page

- **WHEN** a worker taps the third hub button
- **THEN** the app navigates to `/production/nhap-lieu-van-hanh`

#### Scenario: Position config lists the new entry type

- **WHEN** an admin opens the tablet position-config screen
- **THEN** `SYSTEM_OPERATION` is selectable as an entry type

### Requirement: Evaluation page label renamed to soaking evaluation

The existing material-evaluation kiosk page's display label SHALL read "Đánh giá ngâm" instead of "Đánh giá nguyên liệu". This is a display-text change only; the page's fields, wizard steps, and save logic SHALL remain unchanged.

#### Scenario: Page shows the soaking-evaluation label

- **WHEN** a worker opens the material-evaluation kiosk page
- **THEN** the page header displays "Đánh giá ngâm"
- **AND** all existing fields and save behavior are unchanged
