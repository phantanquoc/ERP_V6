## ADDED Requirements

### Requirement: Dedicated tablet entry route

The system SHALL expose a full-screen worker data-entry page at `/production/nhap-lieu` that is public (not wrapped in `ProtectedRoute`) and rendered outside the sidebar `ProtectedLayout` (no navigation chrome). Access is gated by a kiosk session token, not by standard auth routing.

#### Scenario: Kiosk tab opens the page

- **WHEN** a kiosk-activated tab navigates to the tablet entry route
- **THEN** the full-screen entry page renders without the sidebar/layout chrome

#### Scenario: Direct visit without activation

- **WHEN** a user opens `/production/nhap-lieu` without an activated kiosk session
- **THEN** a "session not activated — ask admin to reopen from ERP" screen is shown instead of the entry form or a login redirect

### Requirement: Fry-batch and fryer selection

The page SHALL let the worker select a fry-batch code (`mã chiên`) from manager-created material evaluations, then select one fryer from the active `SAN_XUAT` machine list, before showing the entry form. The worker MUST select the fryer on each entry session (no pinning). The worker SHALL NOT be able to create a new fry-batch code from this page.

#### Scenario: Selecting batch then fryer reveals the form

- **WHEN** the worker selects a fry-batch code and then a fryer
- **THEN** the two-step entry form is shown for that batch + fryer

#### Scenario: Only manager-created batches are listed

- **WHEN** the worker opens the fry-batch selector
- **THEN** only existing fry-batch codes from material evaluations are listed, with no option to create a new one

#### Scenario: Only active fryers are listed

- **WHEN** the worker opens the fryer selector
- **THEN** only active `SAN_XUAT` fryer machines are listed

### Requirement: Load existing records for editing

For the selected fry-batch and fryer, the page SHALL load the existing SystemOperation and FinishedProduct records and pre-fill the form fields with their current values so the worker sees and can edit prior input.

#### Scenario: Existing values are pre-filled

- **WHEN** the form is shown for a batch + fryer that already has records
- **THEN** the current field values of those records are displayed in the inputs

### Requirement: Two independent entry steps

The page SHALL present a single screen with two steps/tabs — "Thông số vận hành" (SystemOperation) and "Thành phẩm đầu ra" (FinishedProduct) — each with its own Save button that persists only that step. Saving one step SHALL NOT require the other step to be filled.

#### Scenario: Saving operating parameters independently

- **WHEN** the worker fills the operating-parameters step and taps its Save button
- **THEN** the system updates the SystemOperation record for that batch + fryer via PATCH and does not require the output step to be filled

#### Scenario: Saving output products independently

- **WHEN** the worker fills the output-products step and taps its Save button
- **THEN** the system updates the FinishedProduct record for that batch + fryer via PATCH and does not require the operating-parameters step to be filled

### Requirement: Operator selection first

On entry (with a valid kiosk session), the page SHALL first require the worker to select their name from a list filtered to the "Nhan vien san xuat" position. Batch and fryer selection SHALL NOT be available until a name is chosen. The chosen name SHALL be saved as `nguoiThucHien`, not the activating admin's name.

#### Scenario: Name required before entry

- **WHEN** the page loads with a valid session and no name chosen
- **THEN** only the operator-selection screen is shown; batch/fryer selection is not available

#### Scenario: Operator name is stamped on save

- **WHEN** the worker selects their name and saves an entry
- **THEN** the saved `nguoiThucHien` is the chosen name, not the activating admin's name

### Requirement: Operating-parameters fields

The operating-parameters step SHALL capture `khoiLuongDauVao` (kg), four stages each with time (minutes, integer), temperature (°C, float) and pressure (float), and an optional note. The `nguoiThucHien` field SHALL be set to the operator selected at the beginning of the session.

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

The page SHALL block saving only when a numeric field is negative or empty, and SHALL NOT enforce that totals match input weight or any other cross-field total. Validation messages SHALL be shown in Vietnamese.

#### Scenario: Negative or empty value blocks save

- **WHEN** the worker attempts to save a step with a negative or empty numeric field
- **THEN** the system blocks the save and shows a Vietnamese validation message

#### Scenario: Non-matching totals are allowed

- **WHEN** the sum of output weights exceeds the input weight but all fields are non-negative and filled
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

### Requirement: Preview and confirm on save

Tapping Save on either tab SHALL first show a readable Vietnamese preview of the just-entered values and SHALL NOT PATCH immediately. Only "Xac nhan" performs the PATCH; a "Sua lai" option returns to the form. Each tab confirms independently.

#### Scenario: Preview before persisting

- **WHEN** the worker taps Save on a tab
- **THEN** a preview of the entered values is shown and no data is persisted yet

#### Scenario: Confirm persists

- **WHEN** the worker taps "Xac nhan" on the preview
- **THEN** the data is PATCHed for that tab

#### Scenario: Edit again cancels the save

- **WHEN** the worker taps "Sua lai" on the preview
- **THEN** the form returns with the entered values intact and nothing is persisted

### Requirement: Return to operator selection after save

After a confirmed save, the page SHALL reset the chosen name, batch, fryer, and active tab, returning to the operator-selection screen for the next shift's operator.

#### Scenario: Reset after confirmed save

- **WHEN** a save is confirmed
- **THEN** the page returns to the operator-selection screen with name, batch, fryer, and tab cleared
