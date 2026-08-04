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

When unsaved entered data exists, the system SHALL require the worker to save before switching operator, and SHALL NOT carry the unsaved draft over to the next operator. Switching shift SHALL behave the same way. Once the data has been saved, switching operator SHALL proceed normally.

#### Scenario: Name required before entry

- **WHEN** the page loads with a valid session and no name chosen
- **THEN** only the operator-selection screen is shown; shift selection is not available

#### Scenario: Operator name is stamped on save

- **WHEN** the worker selects their name and saves an entry
- **THEN** the saved entry records that worker as the person who entered it

#### Scenario: Switching operator with unsaved data is blocked

- **WHEN** the worker has entered values that are not yet saved and taps the change-operator control
- **THEN** the system requires saving first and does not switch to the operator-selection screen with the draft still pending

#### Scenario: Switching operator after saving

- **WHEN** the worker has saved their entries and taps the change-operator control
- **THEN** the operator-selection screen is shown and the next worker starts without the previous worker's unsaved values

#### Scenario: Switching shift with unsaved data is blocked

- **WHEN** the worker has entered values that are not yet saved and taps the change-shift control
- **THEN** the system requires saving first and does not carry the unsaved draft into another shift

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

For each non-waste tab, the board SHALL show a matrix whose rows are the fry batches for the selected production day (`ngaySanXuat`) and shift, and whose columns are the 8 active fryers. Rows SHALL come from the daily fry-batch schedule for that production day and shift, so a scheduled batch appears whether or not a record exists for it yet. Each row SHALL show STT, ma chien, thoi gian chien and the commodity code (`maSanPham`) as auto-filled read-only values; only per-machine weight is editable. There SHALL be no operator column. If no batch matches, a Vietnamese empty state SHALL be shown.

#### Scenario: Rows match the shift and production day

- **WHEN** the production day and shift are set
- **THEN** only the scheduled batches for that shift and production day appear as rows

#### Scenario: Read-only batch metadata

- **WHEN** a row is shown
- **THEN** thoi gian chien and the commodity code are displayed read-only and cannot be edited

#### Scenario: After-midnight batches appear under the starting day

- **WHEN** the worker selects shift 3 for a production day
- **THEN** the batches running after midnight appear as rows under that production day, not under the next calendar date

#### Scenario: Empty shift/day

- **WHEN** no batch matches the shift and production day
- **THEN** a Vietnamese empty-state message is shown instead of an empty grid

### Requirement: Waste tab shift-total distribution

The "Vun - Phe pham" tab SHALL accept a single total for the whole shift (one input, not a matrix). On save, that total SHALL be split evenly across all cells (number of batches x 8 machines), and each cell's share SHALL be split evenly across the three fields `vunLonKhoiLuong`, `vunNhoKhoiLuong`, `phePhamKhoiLuong` (each = cell share / 3).

The three fields SHALL sum to exactly the cell's share: rounding each independently loses weight, so the remainder SHALL be absorbed rather than dropped. Distributed values SHALL be displayed at the same precision they are persisted, so the figures the worker reviews are the figures saved.

Because the distribution touches every batch x machine cell, it SHALL NOT create per-grade attribution records for the worker who entered the total, and SHALL NOT reassign attribution recorded for grades other workers entered.

#### Scenario: Even distribution

- **WHEN** the worker enters a shift total on the waste tab and there are N batches
- **THEN** each of the N x 8 cells receives total/(N x 8), and each cell's three waste fields each receive that share divided by 3

#### Scenario: Three waste fields sum to the cell share

- **WHEN** a cell's share does not divide evenly into three
- **THEN** the three waste fields still sum to exactly that cell's share

#### Scenario: Preview matches what is persisted

- **WHEN** the worker reviews distributed waste values in the preview and confirms
- **THEN** the values persisted match the values displayed, at the same precision

#### Scenario: Distribution does not reassign attribution

- **WHEN** the worker responsible for Uot enters the shift waste total and confirms, while other workers had already saved grade weights for those batches
- **THEN** the waste shares are written to every cell, and the attribution recorded for those other grades remains unchanged

### Requirement: Load existing values

When the board or a tab is shown, the system SHALL load existing FinishedProduct values for the shift's batches x machines into the cells so the worker sees and can edit prior input.

#### Scenario: Prior input visible

- **WHEN** a batch x machine already has a saved weight for the tab's field
- **THEN** that value is pre-filled in the cell

### Requirement: Dirty-tracked safe save

On confirm, the system SHALL write only the cells the worker actually changed (differ from the loaded values). Untouched cells MUST NOT be sent. If nothing changed, confirm SHALL write nothing.

When a changed cell has no existing `FinishedProduct` record in the database, the system SHALL create that record and save the entered value. The system MUST NOT skip such cells silently.

When saving multiple records and some writes fail, the system SHALL report the outcome explicitly: how many records saved successfully, how many failed, and which cells failed. The system MUST NOT report success when any write failed. A failed cell SHALL be named by the machine's own identifier, not by an internal record id.

Writes SHALL NOT be issued strictly one after another, and the worker SHALL see that saving is in progress while it runs.

For each grade weight the worker changed, the system SHALL record per-grade attribution identifying the entering worker, the grade, the batch, the machine and the time. Cells that became dirty only through the even waste distribution SHALL NOT produce attribution records.

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

#### Scenario: Failed cell names the machine

- **WHEN** a cell fails to save
- **THEN** the message names that machine by its own identifier, not by an internal record id

#### Scenario: Saving shows progress

- **WHEN** many cells are being saved
- **THEN** the worker sees that saving is in progress until it completes

#### Scenario: Attribution recorded per changed grade

- **WHEN** the worker changes a Hang A weight and a Hang B weight and confirms
- **THEN** attribution records exist for both grades naming that worker

#### Scenario: Waste-only cell produces no attribution

- **WHEN** a cell becomes dirty only through the even waste distribution
- **THEN** no per-grade attribution record is created for that cell

### Requirement: Draft auto-save

Typing SHALL auto-save a draft to localStorage keyed by production date and shift, surviving reload and tab close, and switching tabs SHALL preserve the draft. The draft MUST NOT be written to the database until confirm.

The draft SHALL be saved regardless of whether any `FinishedProduct` record already exists for that production day and shift. A day and shift with no existing records is a valid empty baseline, not an unloaded state, and MUST NOT suppress draft writing.

Draft writing SHALL tolerate storage failure: if the browser rejects the write, the system SHALL NOT crash the screen, and SHALL surface that the draft could not be saved. Draft writing SHALL NOT run synchronously on every keystroke.

A stored draft SHALL be validated against the expected shape before being loaded into the board; a corrupt or outdated draft MUST NOT be cast blindly into board state.

Loading existing values from the database MUST NOT overwrite cells the worker has changed but not yet saved. When a background refresh completes while unsaved changes are present, those changes SHALL be preserved.

#### Scenario: Draft survives reload

- **WHEN** the worker enters values and reloads the page for the same date and shift
- **THEN** the entered values are restored from the draft

#### Scenario: Tab switch keeps draft

- **WHEN** the worker switches between quality tabs
- **THEN** values entered on the previous tab are preserved

#### Scenario: Draft saved on a shift with no existing records

- **WHEN** the worker enters values for a production day and shift that has no `FinishedProduct` records yet, and then reloads
- **THEN** the entered values are restored from the draft

#### Scenario: Storage failure does not crash

- **WHEN** the browser rejects the draft write because storage is full
- **THEN** the screen keeps working and the worker is told the draft could not be saved

#### Scenario: Background refresh preserves unsaved input

- **WHEN** the worker has unsaved changes in the matrix and a background data refresh completes
- **THEN** the worker's unsaved values remain in the cells

### Requirement: Raw-material picker filtered by stock

The raw-material picker on the kiosk material-evaluation screen SHALL default to showing only materials that currently hold stock, and SHALL display each material's available quantity alongside its identifier. The picker SHALL provide a control to reveal every raw material regardless of stock, so a worker can still record an evaluation for material that has physically arrived before the warehouse has issued its receipt. That reveal control SHALL NOT persist across openings of the picker — each opening SHALL start from the stock-only default.

The backend raw-material endpoint SHALL report each material's total available quantity. It SHALL NOT exclude zero-stock materials from the response, because the reveal control depends on them being present.

#### Scenario: Only in-stock materials shown by default

- **WHEN** the worker opens the raw-material picker
- **THEN** only materials with available stock greater than zero are listed, each showing its available quantity

#### Scenario: Reveal all materials

- **WHEN** the worker activates the reveal-all control
- **THEN** every raw material is listed, including those with no stock, and the out-of-stock ones are marked as such

#### Scenario: Reveal state resets on reopen

- **WHEN** the worker reveals all materials, closes the picker, and opens it again
- **THEN** the picker shows only in-stock materials again

#### Scenario: Zero-stock material remains recordable

- **WHEN** material has physically arrived but no warehouse receipt exists yet, and the worker reveals all materials and selects it
- **THEN** the selection is accepted and the flow continues

### Requirement: Commodity code as the displayed identifier

On the kiosk entry screens, the raw material SHALL be identified by its commodity code (`maSanPham`), not by its name. The fry-batch matrix, the narrow-screen batch cards, the preview card headers, and the batch-selection buttons SHALL display the commodity code and SHALL NOT display the material name.

The raw-material picker is exempt: because it is where the worker chooses, it SHALL display the commodity code prominently together with the material name and available quantity.

The focus-editor overlay label SHALL include the commodity code alongside the machine and fry-batch code, so the worker editing a value full-screen can see which material the value belongs to. The operation-parameters machine-selection heading and its parameter-entry step SHALL likewise show the commodity code.

#### Scenario: Matrix shows the code

- **WHEN** the fry-batch matrix is displayed
- **THEN** the material column shows the commodity code and the column heading names it as the commodity code

#### Scenario: Picker shows both code and name

- **WHEN** the raw-material picker lists a material
- **THEN** both its commodity code and its name are shown, with the code as the primary label

#### Scenario: Focus editor names the material

- **WHEN** the worker opens the focus editor for a cell
- **THEN** the overlay label shows the machine, the fry-batch code, and the commodity code

#### Scenario: Parameter entry shows the material

- **WHEN** the worker is entering operation parameters for a fry batch
- **THEN** the commodity code for that batch is visible on the parameter-entry step

### Requirement: Commodity code persisted on entry records

`MaterialEvaluation` and `FinishedProduct` SHALL each store the commodity code of the material they refer to. The system SHALL set it when the record is created, both when the record originates from a warehouse lot and when it is created without one. Child `FinishedProduct` rows seeded for a fry batch SHALL inherit the code from their parent evaluation. Because records may exist without a warehouse link, the stored code MAY be absent, and the display SHALL degrade to showing no code rather than failing.

#### Scenario: Code stored from a warehouse lot

- **WHEN** a material evaluation is created by selecting a warehouse package
- **THEN** the record stores the commodity code of that package's product

#### Scenario: Seeded output rows inherit the code

- **WHEN** a material evaluation is created and its per-machine output rows are seeded
- **THEN** every seeded row carries the same commodity code as the evaluation

#### Scenario: Code stored without a warehouse lot

- **WHEN** a record is created without a warehouse package reference but the material is known
- **THEN** the record stores that material's commodity code

#### Scenario: Missing code degrades gracefully

- **WHEN** a record has no stored commodity code
- **THEN** the screen renders without a code and does not error

### Requirement: Package identified by its real package code

The package (kiện) picker SHALL label each package by its stored package code (`maKien`), not by its position in the returned list. The value persisted as the package reference on the evaluation record SHALL be that same package code, so the label the worker saw matches the value stored. When a package has no stored code, the picker MAY fall back to a positional label, and the persisted value SHALL then identify the package unambiguously by other means.

#### Scenario: Package code shown and stored

- **WHEN** the worker selects a package that has a stored package code
- **THEN** the picker showed that code as the label, and the saved record stores the same code

#### Scenario: Package without a code

- **WHEN** a package has no stored package code
- **THEN** the picker shows a positional label and the saved record still identifies the package unambiguously

### Requirement: Data-loading failure distinguished from empty data

When loading fry batches, machines, finished products, operations, or evaluation criteria fails, the kiosk screens SHALL show that loading failed and offer a retry, and SHALL NOT present the failure as an absence of data. An empty result SHALL keep showing the existing empty-state message.

When the active-machine list is empty, the screen SHALL show an empty state rather than a matrix with no editable cells.

#### Scenario: Load failure is reported as a failure

- **WHEN** the fry-batch request fails
- **THEN** the screen states that loading failed and offers a retry, rather than saying no fry batches exist

#### Scenario: Genuine empty result keeps its message

- **WHEN** the fry-batch request succeeds and returns nothing
- **THEN** the existing Vietnamese empty-state message for that shift and production day is shown

#### Scenario: No active machines

- **WHEN** the active-machine list is empty
- **THEN** an empty state is shown instead of a matrix with no editable cells

### Requirement: Preview, confirm, and reset

Tapping Save SHALL show a Vietnamese preview of the entered output data and SHALL NOT write to the database. "Xac nhan" performs the dirty-only PATCH; "Sua lai" returns to the form keeping the draft. On PATCH, each record's percentage fields SHALL be recomputed (`round((weight/total)*100, 2)`, total 0 -> 0), `tongKhoiLuong` set to the sum of the eight weights, and `nguoiThucHien` set to the chosen name. After a confirmed save, the page SHALL reset to the name-selection screen and clear that date+shift draft.

The preview SHALL be laid out as a **card list by fry-batch code**. Each card header SHALL display the fry-batch code, fry time and commodity code as read-only context. Inside each card, a sub-table SHALL place **machines as rows and the five non-waste quality grades (Hang A, Hang B, Hang B dau, Hang C, Uot) as columns**, so the whole card fits the portrait tablet width without horizontal scrolling.

By default the preview SHALL show **only cells that were entered or changed** — a cell qualifies when its value is non-zero or differs from the loaded database baseline. Quality-grade columns in which no cell of that card qualifies SHALL be hidden, and cards in which no cell qualifies SHALL be hidden entirely. The preview SHALL provide a control to reveal every fry-batch x machine x grade cell so the worker can fill in cells that were missed.

The preview SHALL display the production date and the shift alongside the operator name.

Preview cells SHALL be edited through the shared focus-editor overlay rather than an inline numeric input. The preview's focus editor SHALL NOT offer a "next field" control.

The "Sua lai" and "Xac nhan" controls, together with the operator name, production date, and shift, SHALL be pinned (sticky) at the top of the preview screen so they remain visible when the worker scrolls through the card list. This pinned zone SHALL also remain visible while the virtual keyboard is open.

#### Scenario: Preview before persist

- **WHEN** the worker taps Save
- **THEN** a preview of the entered cells is shown and nothing is persisted yet

#### Scenario: Confirm persists dirty cells and resets

- **WHEN** the worker taps "Xac nhan"
- **THEN** dirty records are PATCHed with recomputed percentages, total and operator name, then the page returns to name selection and the draft is cleared

#### Scenario: Edit again keeps draft

- **WHEN** the worker taps "Sua lai" on the preview
- **THEN** the form returns with entered values intact and nothing is persisted

#### Scenario: Preview fits portrait width

- **WHEN** the preview is shown on a portrait tablet with about 501 px of usable width and eight active machines
- **THEN** each fry-batch card displays machines as rows and quality grades as columns, and no horizontal scrolling is required to read the values

#### Scenario: Only entered cells are shown by default

- **WHEN** the worker entered values for two machines of one fry batch and left the rest untouched
- **THEN** the preview shows only those entered cells, hides quality-grade columns with no qualifying cell in that card, and hides fry-batch cards with no qualifying cell

#### Scenario: Reveal all cells to fill gaps

- **WHEN** the worker activates the reveal-all control on the preview
- **THEN** every fry-batch x machine x grade cell is shown, including empty ones, so missing values can be entered

#### Scenario: Preview shows date and shift

- **WHEN** the preview is shown
- **THEN** the production date and the shift are displayed together with the operator name

#### Scenario: Editing a preview cell uses the focus editor

- **WHEN** the worker taps a cell in the preview
- **THEN** the focus-editor overlay opens for that machine, fry batch and quality grade, and no "next field" control is offered

#### Scenario: Action buttons survive the keyboard

- **WHEN** the virtual keyboard is open while the worker edits a preview cell
- **THEN** the "Sua lai" and "Xac nhan" controls remain visible on screen

#### Scenario: Action buttons visible when scrolling

- **WHEN** the worker scrolls down to the last fry-batch card in the preview
- **THEN** the "Sua lai" and "Xac nhan" controls, along with the operator name, date, and shift, remain pinned at the top of the viewport

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

**All interactive controls on the kiosk entry screens — including tabs, chips, and list buttons — SHALL have a touch target of at least 44px.** Text that the worker must read to complete the task SHALL be large enough to remain legible on a small tablet screen in a factory environment.

The focus-editor overlay SHALL synchronize its content from the underlying value only when it opens or when it switches to a different field. While the worker is typing, the overlay MUST NOT reselect or overwrite the text being entered, so multi-digit and decimal values can be typed normally.

The output board's focus editor SHALL offer a "next field" control that advances **across machines within the current fry batch, then to the first machine of the next fry batch**, in order and without skipping cells that already hold a value. Traversal SHALL be confined to the active quality tab: at the last cell of that tab the control SHALL be hidden rather than advancing to another tab. The waste tab has a single input and SHALL NOT offer the control.

#### Scenario: Numeric keyboard opens on a tablet

- **WHEN** the worker taps a numeric input on a tablet
- **THEN** the numeric on-screen keyboard is shown rather than the alphabetic keyboard

#### Scenario: Save control stays reachable with keyboard open

- **WHEN** the on-screen keyboard covers the lower portion of the screen
- **THEN** the Save and navigation controls remain visible in the upper half

#### Scenario: Tabs and chips meet the touch target

- **WHEN** the worker taps a quality tab or a batch chip on the kiosk screens
- **THEN** the control has a touch target of at least 44px

#### Scenario: Typing a multi-digit value

- **WHEN** the worker types "1" then "2" into the focus editor
- **THEN** the field contains "12", not "2"

#### Scenario: Typing a decimal value

- **WHEN** the worker types "12.5" into the focus editor
- **THEN** the field retains "12.5" and the decimal point is not dropped

#### Scenario: Clearing the field to retype

- **WHEN** the worker clears the focus-editor field and starts typing a new number
- **THEN** the typed characters are kept and the field is not forced back to empty

#### Scenario: Advancing across machines then batches

- **WHEN** the worker taps the "next field" control on the last machine of a fry batch on the output board
- **THEN** the editor moves to the first machine of the next fry batch within the same quality tab

#### Scenario: Next control hidden at the end of a tab

- **WHEN** the worker is editing the final cell of the active quality tab
- **THEN** the "next field" control is not shown and only the close control remains

#### Scenario: Waste tab has no next control

- **WHEN** the worker edits the shift total on the waste tab
- **THEN** no "next field" control is shown

#### Scenario: Next control keeps working on the other kiosk screens

- **WHEN** the worker taps "next field" on the operation-parameters or soaking-evaluation screen
- **THEN** the editor switches to the next field and shows that field's current value

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

The operation-parameters page SHALL guide the worker through a step wizard: select shift, select operator, select a fry batch (`maChien`) for the chosen shift and production day, select a machine, then enter the operation parameters. Shift and operator selection SHALL reuse the shared `ShiftSelectionScreen` and `OperatorSelectionScreen` components. The batch list SHALL come from the daily fry-batch schedule for the selected shift and production day (same source as the output page).

#### Scenario: Shift and operator required before parameter entry

- **WHEN** the page loads with a valid kiosk session and no shift or operator selected
- **THEN** the shift-selection screen is shown first, then operator selection, before any batch or parameter entry is available

#### Scenario: Batch list scoped to shift and production day

- **WHEN** the worker has selected a shift and the production day is set
- **THEN** only the scheduled batch codes for that shift and production day are offered for selection

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

Child rows SHALL be keyed by (`maChien`, `ngaySanXuat`, machine) so that the same batch code on different production days produces independent rows. Generation SHALL only occur when a worker actually enters data for a batch; scheduled codes with no entry SHALL NOT be pre-populated.

#### Scenario: Child rows exist after batch creation (warehouse-linked)

- **WHEN** a `MaterialEvaluation` is created via the warehouse-linked path for a scheduled code and production day
- **THEN** empty `SystemOperation`, `FinishedProduct`, and `QualityEvaluation` rows exist for each active production machine tied to that code and production day

#### Scenario: Child rows exist after batch creation (legacy)

- **WHEN** a `MaterialEvaluation` is created via the legacy path for a scheduled code and production day
- **THEN** empty `SystemOperation`, `FinishedProduct`, and `QualityEvaluation` rows exist for each active production machine tied to that code and production day

#### Scenario: Same code on a later production day generates its own rows

- **WHEN** a batch with the same code is created on a later production day
- **THEN** a separate set of child rows is generated and the earlier day's rows are neither reused nor overwritten

#### Scenario: Child-row generation failure does not fail batch creation

- **WHEN** the child-row generation fails after the `MaterialEvaluation` is created
- **THEN** the `MaterialEvaluation` creation still returns success
- **AND** the failure is logged, not surfaced as a create error

#### Scenario: No duplicate generation

- **WHEN** child rows already exist for a code on that production day
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

### Requirement: Adaptive layout by viewport width for output board

The output-products entry screen SHALL have two layouts and **automatically switch by viewport width** at a 700 px threshold, with NO manual layout toggle button:
- Width **below 700 px** (portrait tablet): display as a **card list by fry-batch code**, scrolling vertically, with NO horizontal scrolling required.
- Width **700 px or above** (landscape tablet): display as the **matrix table** (existing layout).

Both layouts SHALL share state and save flow; switching layouts SHALL NOT lose data currently being entered.

The output-products **preview screen** SHALL likewise avoid requiring horizontal scrolling at portrait tablet width, using the card layout defined in the preview requirement.

#### Scenario: Portrait displays cards

- **WHEN** viewport width is below 700 px
- **THEN** the screen displays a card list by fry-batch code and does not require horizontal scrolling to enter data

#### Scenario: Landscape displays table

- **WHEN** viewport width is 700 px or above
- **THEN** the screen displays the matrix table of fry-batch code x machines

#### Scenario: Rotating device while entering data

- **WHEN** the worker has entered some values then rotates the device causing a layout change
- **THEN** the entered values remain intact in the new layout

#### Scenario: Preview avoids horizontal scrolling in portrait

- **WHEN** the worker opens the preview at portrait tablet width
- **THEN** the preview content fits the available width and does not require horizontal scrolling

### Requirement: Card structure by fry-batch code

In the card layout, each card SHALL represent one fry-batch code and display in order: the fry-batch code, fry time and commodity name in the card header (read-only); followed by a list of each machine with its label and a weight input; and a notes field at the end of the card. Inputs in cards SHALL open the focus editor layer as in the table layout.

#### Scenario: Entering values for machines within a card

- **WHEN** the worker opens a fry-batch card and taps a machine's input
- **THEN** the focus editor opens for that machine and fry-batch, and the entered value is written to the same data cell as in the table layout

#### Scenario: No fry-batch codes available

- **WHEN** there are no fry-batch codes matching the selected shift and date
- **THEN** a Vietnamese empty-state message is shown; no blank card list is displayed

### Requirement: Sticky context when scrolling the table horizontally

In the table layout, the header row SHALL be sticky when scrolling vertically and the fry-batch code column SHALL be sticky when scrolling horizontally, so the worker always sees which machine and fry-batch code they are entering data for.

#### Scenario: Horizontal scroll with many machines

- **WHEN** the worker scrolls the table horizontally to reach distant machine columns
- **THEN** the fry-batch code column remains visible and the machine header row remains identifiable

### Requirement: Material evaluation selects a scheduled batch

Both material-evaluation entry surfaces — the desktop management screen and the tablet kiosk screen — SHALL require the worker to select a batch code from the daily schedule for the chosen production day and shift. Neither surface SHALL generate or accept a freely typed new batch code.

#### Scenario: Kiosk offers scheduled codes for the shift

- **WHEN** the worker has selected a shift on the kiosk evaluation screen
- **THEN** only that shift's scheduled batch codes for the production day are offered

#### Scenario: Desktop offers scheduled codes

- **WHEN** an admin creates a material evaluation on the desktop screen
- **THEN** the batch code is chosen from the daily schedule and cannot be typed as a new arbitrary code

#### Scenario: Selecting a code that already has data

- **WHEN** the worker selects a scheduled code that already has an evaluation record for that production day
- **THEN** the existing values are loaded for editing rather than a duplicate record being created

### Requirement: Warehouse package drives commodity and weight

After selecting a batch code, the material-evaluation flow SHALL let the worker select a warehouse package, and SHALL fill `tenHangHoa` and `khoiLuong` from that package instead of requiring manual entry. The existing warehouse linkage SHALL be preserved on the saved record.

#### Scenario: Auto-fill from the selected package

- **WHEN** the worker selects a warehouse package for a batch
- **THEN** the commodity name and weight are filled from that package and are not typed by hand

#### Scenario: Warehouse linkage preserved

- **WHEN** the evaluation is saved after selecting a package
- **THEN** the record retains its link to that warehouse package and issue

### Requirement: Material evaluation table columns

The material-evaluation table SHALL present these columns in order: STT, Ma chien, Thoi gian chien, Ten hang hoa, So lo kien, Khoi luong (Kg/tua), So lan ngam, Nhiet do nuoc truoc khi ngam, Nhiet do nuoc sau vot, Thoi gian ngam (Phut), Brix nuoc ngam, Danh gia nguyen lieu truoc khi ngam, Danh gia nguyen lieu sau khi ngam, Ghi chu.

Lot and package SHALL remain a single combined column backed by the existing single stored field. A `ghiChu` field SHALL be stored on the evaluation record so the Ghi chu column persists.

#### Scenario: Table renders the defined columns

- **WHEN** the material-evaluation table is displayed
- **THEN** the fourteen listed columns are present in the listed order

#### Scenario: Note persists

- **WHEN** the worker enters a note on an evaluation and saves
- **THEN** the note is stored on the record and appears in the Ghi chu column after reload

### Requirement: Production data page filters by production day

The Dữ liệu sản xuất page SHALL filter its data by production day and SHALL default to the current production day on load.

#### Scenario: Defaults to today

- **WHEN** the page is opened
- **THEN** the data shown is scoped to the current production day without the user setting a filter

#### Scenario: Changing the production day

- **WHEN** the user selects a different production day
- **THEN** all tabs on the page show data for that production day

#### Scenario: Current production day before 06:30

- **WHEN** the page is opened at 02:00
- **THEN** the default production day is the previous calendar date, matching the 06:30 cycle

