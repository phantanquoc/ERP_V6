## ADDED Requirements

### Requirement: Kiosk session activation

Activating the kiosk from ERP SHALL copy the current access and refresh tokens into dedicated keys (`pdeAccessToken`, `pdeRefreshToken`) before opening the tablet tab. The "Mở trang nhập liệu (Tablet)" button SHALL perform this activation, then open `/production/nhap-lieu` in a new tab.

#### Scenario: Admin activates the kiosk

- **WHEN** the admin taps "Mở trang nhập liệu (Tablet)" while logged in
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

### Requirement: Public route with session check

The `/production/nhap-lieu` route SHALL be public (not wrapped in `ProtectedRoute`) and full-screen (outside the sidebar layout). On load, if no kiosk token is present, it SHALL show a "session not activated — ask admin to reopen from ERP" screen.

#### Scenario: Direct visit without activation

- **WHEN** a user opens `/production/nhap-lieu` without an activated kiosk session
- **THEN** a "session not activated" screen is shown instead of the entry form or a login redirect

### Requirement: Operator selection first

On entry (with a valid session), the page SHALL first require the worker to select their name from a list filtered to the "Nhân viên sản xuất" position. Batch and fryer selection SHALL NOT be available until a name is chosen. The chosen name SHALL be saved as `nguoiThucHien`, not the admin account.

#### Scenario: Name required before entry

- **WHEN** the page loads with a valid session and no name chosen
- **THEN** only the operator-selection screen is shown; batch/fryer selection is not available

#### Scenario: Operator name is stamped on save

- **WHEN** the worker selects their name and saves an entry
- **THEN** the saved `nguoiThucHien` is the chosen name, not the activating admin's name

### Requirement: Preview and confirm on save

Tapping Save on either tab SHALL first show a readable Vietnamese preview of the just-entered values and SHALL NOT PATCH immediately. Only "Xác nhận" performs the PATCH; a "Sửa lại" option returns to the form. Each tab confirms independently.

#### Scenario: Preview before persisting

- **WHEN** the worker taps Save on a tab
- **THEN** a preview of the entered values is shown and no data is persisted yet

#### Scenario: Confirm persists

- **WHEN** the worker taps "Xác nhận" on the preview
- **THEN** the data is PATCHed for that tab

#### Scenario: Edit again cancels the save

- **WHEN** the worker taps "Sửa lại" on the preview
- **THEN** the form returns with the entered values intact and nothing is persisted

### Requirement: Return to operator selection after save

After a confirmed save, the page SHALL reset the chosen name, batch, fryer, and active tab, returning to the operator-selection screen for the next shift's operator.

#### Scenario: Reset after confirmed save

- **WHEN** a save is confirmed
- **THEN** the page returns to the operator-selection screen with name, batch, fryer, and tab cleared
