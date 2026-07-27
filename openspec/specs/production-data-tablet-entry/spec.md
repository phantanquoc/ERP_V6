# production-data-tablet-entry Specification

## Purpose

Full-screen tablet/kiosk data-entry pages for production workers to record fry-batch outputs, material evaluations, and operation parameters without desktop navigation chrome. Access is gated by a kiosk session token (per-tab), not standard user auth.
## Requirements
### Requirement: Dedicated tablet entry route

The system SHALL expose a full-screen worker data-entry page at `/production/nhap-lieu` that is public (not wrapped in `ProtectedRoute`) and rendered outside the sidebar `ProtectedLayout` (no navigation chrome). Access is gated by a kiosk session token, not by standard auth routing.

#### Scenario: Kiosk tab opens the page

- **WHEN** a kiosk-activated tab navigates to the tablet entry route
- **THEN** the full-screen entry page renders without the sidebar/layout chrome

#### Scenario: Direct visit without activation

- **WHEN** a user opens `/production/nhap-lieu` without an activated kiosk session
- **THEN** a "session not activated — ask admin to reopen from ERP" screen is shown instead of the entry form or a login redirect

### Requirement: Operator selection first

On entry (with a valid kiosk session), the page SHALL first require the worker to select their name from a list filtered to the "Nhan vien san xuat" position. The chosen name SHALL be saved as `nguoiThucHien`, not the activating admin's name.

#### Scenario: Name required before entry

- **WHEN** the page loads with a valid session and no name chosen
- **THEN** only the operator-selection screen is shown; shift selection is not available

#### Scenario: Operator name is stamped on save

- **WHEN** the worker selects their name and saves an entry
- **THEN** the saved `nguoiThucHien` is the chosen name, not the activating admin's name

### Requirement: Shift selection step

After operator selection and before the board, the page SHALL present a shift selector with values Ca 1, Ca 2, Ca 3, using the same large-card UI as the name selector. A shift MUST be chosen before the board is shown.

#### Scenario: Pick shift after name

- **WHEN** the operator has chosen their name
- **THEN** a shift selector (Ca 1/2/3, large cards) is shown, and the board appears only after a shift is chosen

### Requirement: Output-products board only

This page SHALL show only the "San pham dau ra" board; the "Thong so van hanh" (operating parameters) UI SHALL NOT be shown here. The operating-parameters service code MUST remain in the codebase.

#### Scenario: No operating-parameters UI

- **WHEN** the board is shown
- **THEN** there is no operating-parameters entry UI on this page

### Requirement: Production date with quick-today

The board SHALL provide a "Ngay san xuat" field that defaults to today and offers a "Hom nay" quick button to reset to today.

#### Scenario: Default and reset to today

- **WHEN** the board loads
- **THEN** the production date defaults to today; tapping "Hom nay" sets it back to today

### Requirement: Six quality tabs

The board SHALL present six quality tabs: Hang A, Hang B, Hang B dau, Hang C, Uot, Vun - Phe pham. The five non-waste tabs map to FinishedProduct weight fields: Hang A->aKhoiLuong, Hang B->bKhoiLuong, Hang B dau->bDauKhoiLuong, Hang C->cKhoiLuong, Uot->uotKhoiLuong.

#### Scenario: Switching tabs changes the edited field

- **WHEN** the worker selects the "Hang B" tab
- **THEN** the matrix cells edit the `bKhoiLuong` field for each batch x machine

### Requirement: Fry-batch matrix filtered by date and shift

For each non-waste tab, the board SHALL show a matrix whose rows are the real fry-batches filtered by the selected shift (`ca`) and the local date of `thoiGianChien` equal to the production date, and whose columns are the 8 active fryers. Each row SHALL show STT, ma chien, thoi gian chien and ten hang hoa as auto-filled read-only values; only per-machine weight and a Ghi chu text field are editable. There SHALL be no operator column. If no fry-batch matches, a Vietnamese empty state SHALL be shown.

#### Scenario: Rows match the shift and date

- **WHEN** the production date and shift are set
- **THEN** only fry-batches with that `ca` and that local `thoiGianChien` date appear as rows

#### Scenario: Read-only batch metadata

- **WHEN** a row is shown
- **THEN** thoi gian chien and ten hang hoa are displayed read-only and cannot be edited

#### Scenario: Empty shift/date

- **WHEN** no fry-batch matches the shift and date
- **THEN** a Vietnamese empty-state message is shown instead of an empty grid

### Requirement: Waste tab shift-total distribution

The "Vun - Phe pham" tab SHALL accept a single total for the whole shift (one input, not a matrix). On save, that total SHALL be split evenly across all cells (number of batches x 8 machines), and each cell's share SHALL be split evenly across the three fields `vunLonKhoiLuong`, `vunNhoKhoiLuong`, `phePhamKhoiLuong` (each = cell share / 3).

#### Scenario: Even distribution

- **WHEN** the worker enters a shift total on the waste tab and there are N batches
- **THEN** each of the N x 8 cells receives total/(N x 8), and each cell's three waste fields each receive that share divided by 3

### Requirement: Load existing values

When the board or a tab is shown, the system SHALL load existing FinishedProduct values for the shift's batches x machines into the cells so the worker sees and can edit prior input.

#### Scenario: Prior input visible

- **WHEN** a batch x machine already has a saved weight for the tab's field
- **THEN** that value is pre-filled in the cell

### Requirement: Dirty-tracked safe save

On confirm, the system SHALL write only the cells the worker actually changed (differ from the loaded values). Untouched cells MUST NOT be sent. If nothing changed, confirm SHALL write nothing.

When a changed cell has no existing `FinishedProduct` record in the database, the system SHALL create that record and save the entered value. The system MUST NOT skip such cells silently.

When saving multiple records and some writes fail, the system SHALL report the outcome explicitly: how many records saved successfully, how many failed, and which cells failed. The system MUST NOT report success when any write failed.

#### Scenario: Only changed cells are written

- **WHEN** the worker changes one machine's weight and confirms
- **THEN** only that batch's record is written; other records are not sent and keep their existing values

#### Scenario: No change, no write

- **WHEN** the worker confirms without changing any cell
- **THEN** no write request is made

#### Scenario: Cell without an existing record

- **WHEN** the worker enters a value in a cell that has no `FinishedProduct` record yet and confirms
- **THEN** the system creates the record and saves the value; the value is not lost and no false success message is shown

#### Scenario: Some writes fail

- **WHEN** several cells are saved and at least one write fails
- **THEN** the system shows how many succeeded, how many failed, and which cells failed, in Vietnamese

### Requirement: Draft auto-save

Typing SHALL auto-save a draft to localStorage keyed by production date and shift, surviving reload and tab close, and switching tabs SHALL preserve the draft. The draft MUST NOT be written to the database until confirm.

#### Scenario: Draft survives reload

- **WHEN** the worker enters values and reloads the page for the same date and shift
- **THEN** the entered values are restored from the draft

#### Scenario: Tab switch keeps draft

- **WHEN** the worker switches between quality tabs
- **THEN** values entered on the previous tab are preserved

### Requirement: Preview, confirm, and reset

Tapping Save SHALL show a Vietnamese preview of all six quality categories (only changed/entered cells), and SHALL NOT write to the database. "Xac nhan" performs the dirty-only PATCH; "Sua lai" returns to the form keeping the draft. On PATCH, each record's percentage fields SHALL be recomputed (`round((weight/total)*100, 2)`, total 0 -> 0), `tongKhoiLuong` set to the sum of the eight weights, `nguoiThucHien` set to the chosen name, and `ghiChu` set when entered. After a confirmed save, the page SHALL reset to the name-selection screen and clear that date+shift draft.

#### Scenario: Preview before persist

- **WHEN** the worker taps Save
- **THEN** a preview of all six categories' changed cells is shown and nothing is persisted yet

#### Scenario: Confirm persists dirty cells and resets

- **WHEN** the worker taps "Xac nhan"
- **THEN** dirty records are PATCHed with recomputed percentages, total, operator name and notes, then the page returns to name selection and the draft is cleared

#### Scenario: Edit again keeps draft

- **WHEN** the worker taps "Sua lai" on the preview
- **THEN** the form returns with entered values intact and nothing is persisted

### Requirement: Output-product weights with auto-computed percentages

The output-products step SHALL capture eight output weights in kg (aKhoiLuong, bKhoiLuong, bDauKhoiLuong, cKhoiLuong, vunLonKhoiLuong, vunNhoKhoiLuong, phePhamKhoiLuong, uotKhoiLuong). The system SHALL compute each corresponding percentage as `round((weight / totalWeight) * 100, 2)` where `totalWeight` is the sum of the eight weights, and SHALL persist both the total weight and the computed percentages. The worker SHALL NOT manually enter percentages.

#### Scenario: Percentages are auto-computed on save

- **WHEN** the worker enters output weights and saves the output step
- **THEN** the system computes and persists each percentage from the weights and the total weight, without the worker entering percentages

#### Scenario: Zero total weight does not error

- **WHEN** the total of the eight weights is zero and the step is saved
- **THEN** the system persists the record without a division error (percentages default to 0)

### Requirement: Touch-optimized numeric input

All numeric inputs SHALL use a numeric on-screen keyboard (`inputMode="decimal"`), large touch targets of at least 44px, and the shared `parseNumberInput` helper for change handling. Save and navigation controls SHALL be positioned in the upper half of the screen so the tablet keyboard does not obscure them.

#### Scenario: Numeric keyboard opens on a tablet

- **WHEN** the worker taps a numeric input on a tablet
- **THEN** the numeric on-screen keyboard is shown rather than the alphabetic keyboard

#### Scenario: Save control stays reachable with keyboard open

- **WHEN** the on-screen keyboard covers the lower portion of the screen
- **THEN** the Save and navigation controls remain visible in the upper half

### Requirement: Minimal validation

The page SHALL block saving when a numeric field is negative, empty, or outside the allowed range defined by the production entry validation thresholds, and SHALL NOT enforce that totals match input weight or any other cross-field total. Validation messages SHALL be shown in Vietnamese.

#### Scenario: Negative or empty value blocks save

- **WHEN** the worker attempts to save a step with a negative or empty numeric field
- **THEN** the system blocks the save and shows a Vietnamese validation message

#### Scenario: Value above the allowed maximum blocks save

- **WHEN** the worker enters a weight above the allowed maximum
- **THEN** the system blocks the value and shows a Vietnamese message stating the allowed range

#### Scenario: Non-matching totals are allowed

- **WHEN** the sum of output weights exceeds the input weight but all fields are non-negative, filled, and within range
- **THEN** the system allows the save

### Requirement: Kiosk session activation

Activating the kiosk from ERP SHALL copy the current access and refresh tokens into dedicated keys (`pdeAccessToken`, `pdeRefreshToken`) before opening the tablet tab. The "Mo trang nhap lieu (Tablet)" button SHALL perform this activation, then open `/production/nhap-lieu` in a new tab.

#### Scenario: Admin activates the kiosk

- **WHEN** the admin taps "Mo trang nhap lieu (Tablet)" while logged in
- **THEN** the current tokens are copied to `pdeAccessToken`/`pdeRefreshToken` and the tablet page opens in a new tab

### Requirement: Per-tab kiosk mode

The tablet page SHALL mark its own tab as kiosk mode using `sessionStorage` (`pdeKioskMode`), which is per-tab and MUST NOT affect other tabs of the same origin. `apiClient` SHALL use the `pde*` tokens only when the current tab is in kiosk mode, and SHALL use the main tokens otherwise.

#### Scenario: Kiosk tab uses dedicated tokens

- **WHEN** an API call is made from the kiosk tab
- **THEN** the request uses the `pdeAccessToken` for authorization

#### Scenario: ERP tab is unaffected

- **WHEN** an API call is made from a normal ERP tab (not kiosk mode)
- **THEN** the request uses the main `accessToken`, unchanged from current behavior

### Requirement: Survives admin logout

The kiosk session SHALL continue to function after the admin logs out or closes the ERP tab. Admin logout SHALL clear only the main tokens (`accessToken`, `refreshToken`, `user`) and MUST NOT clear the `pde*` keys.

#### Scenario: Admin logs out, kiosk keeps working

- **WHEN** the admin logs out in the ERP tab while the kiosk tab is open
- **THEN** the kiosk tab can still load and save data using its dedicated tokens

### Requirement: Kiosk token refresh and expiry

When a kiosk request returns 401, the system SHALL refresh using `pdeRefreshToken` and update `pdeAccessToken`. If the refresh fails, the kiosk SHALL show a "session expired — ask admin to reopen" screen and MUST NOT redirect to `/login`.

#### Scenario: Kiosk access token refreshed

- **WHEN** a kiosk request gets 401 and the dedicated refresh token is still valid
- **THEN** the token is refreshed and the request retried without leaving the page

#### Scenario: Kiosk refresh token expired

- **WHEN** a kiosk request gets 401 and the dedicated refresh token is no longer valid
- **THEN** the kiosk shows a session-expired screen and does not redirect to login

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

### Requirement: Confirm before changing production date with unsaved data

When the worker changes the production date while having unsaved entered data, the system SHALL ask for confirmation before switching.

#### Scenario: Change date with unsaved data

- **WHEN** the worker has entered values that are not yet saved and changes the production date
- **THEN** the system asks for confirmation before switching the date

#### Scenario: Change date with no unsaved data

- **WHEN** the worker changes the production date with no unsaved changes
- **THEN** the date switches without a confirmation prompt

