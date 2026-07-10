## ADDED Requirements

### Requirement: Shift selection step

After operator selection and before the board, the page SHALL present a shift selector with values Ca 1, Ca 2, Ca 3, using the same large-card UI as the name selector. A shift MUST be chosen before the board is shown.

#### Scenario: Pick shift after name

- **WHEN** the operator has chosen their name
- **THEN** a shift selector (Ca 1/2/3, large cards) is shown, and the board appears only after a shift is chosen

### Requirement: Output-products board only

This page SHALL show only the "Sản phẩm đầu ra" board; the "Thông số vận hành" (operating parameters) UI SHALL NOT be shown here. The operating-parameters service code MUST remain in the codebase.

#### Scenario: No operating-parameters UI

- **WHEN** the board is shown
- **THEN** there is no operating-parameters entry UI on this page

### Requirement: Production date with quick-today

The board SHALL provide a "Ngày sản xuất" field that defaults to today and offers a "Hôm nay" quick button to reset to today.

#### Scenario: Default and reset to today

- **WHEN** the board loads
- **THEN** the production date defaults to today; tapping "Hôm nay" sets it back to today

### Requirement: Six quality tabs

The board SHALL present six quality tabs: Hàng A, Hàng B, Hàng B dầu, Hàng C, Ướt, Vụn - Phế phẩm. The five non-waste tabs map to FinishedProduct weight fields: Hàng A→aKhoiLuong, Hàng B→bKhoiLuong, Hàng B dầu→bDauKhoiLuong, Hàng C→cKhoiLuong, Ướt→uotKhoiLuong.

#### Scenario: Switching tabs changes the edited field

- **WHEN** the worker selects the "Hàng B" tab
- **THEN** the matrix cells edit the `bKhoiLuong` field for each batch × machine

### Requirement: Fry-batch matrix filtered by date and shift

For each non-waste tab, the board SHALL show a matrix whose rows are the real fry-batches filtered by the selected shift (`ca`) and the local date of `thoiGianChien` equal to the production date, and whose columns are the 8 active fryers. Each row SHALL show STT, mã chiên, thời gian chiên and tên hàng hoá as auto-filled read-only values; only per-machine weight and a Ghi chú text field are editable. There SHALL be no operator column. If no fry-batch matches, a Vietnamese empty state SHALL be shown.

#### Scenario: Rows match the shift and date

- **WHEN** the production date and shift are set
- **THEN** only fry-batches with that `ca` and that local `thoiGianChien` date appear as rows

#### Scenario: Read-only batch metadata

- **WHEN** a row is shown
- **THEN** thời gian chiên and tên hàng hoá are displayed read-only and cannot be edited

#### Scenario: Empty shift/date

- **WHEN** no fry-batch matches the shift and date
- **THEN** a Vietnamese empty-state message is shown instead of an empty grid

### Requirement: Waste tab shift-total distribution

The "Vụn - Phế phẩm" tab SHALL accept a single total for the whole shift (one input, not a matrix). On save, that total SHALL be split evenly across all cells (number of batches × 8 machines), and each cell's share SHALL be split evenly across the three fields `vunLonKhoiLuong`, `vunNhoKhoiLuong`, `phePhamKhoiLuong` (each = cell share / 3).

#### Scenario: Even distribution

- **WHEN** the worker enters a shift total on the waste tab and there are N batches
- **THEN** each of the N×8 cells receives total/(N×8), and each cell's three waste fields each receive that share divided by 3

### Requirement: Load existing values

When the board or a tab is shown, the system SHALL load existing FinishedProduct values for the shift's batches × machines into the cells so the worker sees and can edit prior input.

#### Scenario: Prior input visible

- **WHEN** a batch × machine already has a saved weight for the tab's field
- **THEN** that value is pre-filled in the cell

### Requirement: Dirty-tracked safe save

On confirm, the system SHALL PATCH only the FinishedProduct records whose cells the worker actually changed (differ from the loaded values). Untouched cells MUST NOT be sent. If nothing changed, confirm SHALL PATCH nothing.

#### Scenario: Only changed cells are written

- **WHEN** the worker changes one machine's weight and confirms
- **THEN** only that batch's record is PATCHed; other records are not sent and keep their existing values

#### Scenario: No change, no write

- **WHEN** the worker confirms without changing any cell
- **THEN** no PATCH request is made

### Requirement: Draft auto-save

Typing SHALL auto-save a draft to localStorage keyed by production date and shift, surviving reload and tab close, and switching tabs SHALL preserve the draft. The draft MUST NOT be written to the database until confirm.

#### Scenario: Draft survives reload

- **WHEN** the worker enters values and reloads the page for the same date and shift
- **THEN** the entered values are restored from the draft

#### Scenario: Tab switch keeps draft

- **WHEN** the worker switches between quality tabs
- **THEN** values entered on the previous tab are preserved

### Requirement: Preview, confirm, and reset

Tapping Save SHALL show a Vietnamese preview of all six quality categories (only changed/entered cells), and SHALL NOT write to the database. "Xác nhận" performs the dirty-only PATCH; "Sửa lại" returns to the form keeping the draft. On PATCH, each record's percentage fields SHALL be recomputed (`round((weight/total)*100, 2)`, total 0 → 0), `tongKhoiLuong` set to the sum of the eight weights, `nguoiThucHien` set to the chosen name, and `ghiChu` set when entered. After a confirmed save, the page SHALL reset to the name-selection screen and clear that date+shift draft.

#### Scenario: Preview before persist

- **WHEN** the worker taps Save
- **THEN** a preview of all six categories' changed cells is shown and nothing is persisted yet

#### Scenario: Confirm persists dirty cells and resets

- **WHEN** the worker taps "Xác nhận"
- **THEN** dirty records are PATCHed with recomputed percentages, total, operator name and notes, then the page returns to name selection and the draft is cleared

#### Scenario: Edit again keeps draft

- **WHEN** the worker taps "Sửa lại" on the preview
- **THEN** the form returns with entered values intact and nothing is persisted
