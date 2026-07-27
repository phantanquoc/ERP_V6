## MODIFIED Requirements

### Requirement: Preview, confirm, and reset

Tapping Save SHALL show a Vietnamese preview of the entered output data and SHALL NOT write to the database. "Xac nhan" performs the dirty-only PATCH; "Sua lai" returns to the form keeping the draft. On PATCH, each record's percentage fields SHALL be recomputed (`round((weight/total)*100, 2)`, total 0 -> 0), `tongKhoiLuong` set to the sum of the eight weights, and `nguoiThucHien` set to the chosen name. After a confirmed save, the page SHALL reset to the name-selection screen and clear that date+shift draft.

The preview SHALL be laid out as a **card list by fry-batch code**. Each card header SHALL display the fry-batch code, fry time and commodity name as read-only context. Inside each card, a sub-table SHALL place **machines as rows and the five non-waste quality grades (Hang A, Hang B, Hang B dau, Hang C, Uot) as columns**, so the whole card fits the portrait tablet width without horizontal scrolling.

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
