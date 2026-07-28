## MODIFIED Requirements

### Requirement: Fry-batch matrix filtered by date and shift

For each non-waste tab, the board SHALL show a matrix whose rows are the fry batches for the selected production day (`ngaySanXuat`) and shift, and whose columns are the 8 active fryers. Rows SHALL come from the daily fry-batch schedule for that production day and shift, so a scheduled batch appears whether or not a record exists for it yet. Each row SHALL show STT, ma chien, thoi gian chien and ten hang hoa as auto-filled read-only values; only per-machine weight is editable. There SHALL be no operator column. If no batch matches, a Vietnamese empty state SHALL be shown.

#### Scenario: Rows match the shift and production day

- **WHEN** the production day and shift are set
- **THEN** only the scheduled batches for that shift and production day appear as rows

#### Scenario: Read-only batch metadata

- **WHEN** a row is shown
- **THEN** thoi gian chien and ten hang hoa are displayed read-only and cannot be edited

#### Scenario: After-midnight batches appear under the starting day

- **WHEN** the worker selects shift 3 for a production day
- **THEN** the batches running after midnight appear as rows under that production day, not under the next calendar date

#### Scenario: Empty shift/day

- **WHEN** no batch matches the shift and production day
- **THEN** a Vietnamese empty-state message is shown instead of an empty grid

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

### Requirement: Dirty-tracked safe save

On confirm, the system SHALL write only the cells the worker actually changed (differ from the loaded values). Untouched cells MUST NOT be sent. If nothing changed, confirm SHALL write nothing.

When a changed cell has no existing `FinishedProduct` record in the database, the system SHALL create that record and save the entered value. The system MUST NOT skip such cells silently.

When saving multiple records and some writes fail, the system SHALL report the outcome explicitly: how many records saved successfully, how many failed, and which cells failed. The system MUST NOT report success when any write failed.

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

#### Scenario: Attribution recorded per changed grade

- **WHEN** the worker changes a Hang A weight and a Hang B weight and confirms
- **THEN** attribution records exist for both grades naming that worker

#### Scenario: Waste-only cell produces no attribution

- **WHEN** a cell becomes dirty only through the even waste distribution
- **THEN** no per-grade attribution record is created for that cell

### Requirement: Waste tab shift-total distribution

The "Vun - Phe pham" tab SHALL accept a single total for the whole shift (one input, not a matrix). On save, that total SHALL be split evenly across all cells (number of batches x 8 machines), and each cell's share SHALL be split evenly across the three fields `vunLonKhoiLuong`, `vunNhoKhoiLuong`, `phePhamKhoiLuong` (each = cell share / 3).

Because the distribution touches every batch x machine cell, it SHALL NOT create per-grade attribution records for the worker who entered the total, and SHALL NOT reassign attribution recorded for grades other workers entered.

#### Scenario: Even distribution

- **WHEN** the worker enters a shift total on the waste tab and there are N batches
- **THEN** each of the N x 8 cells receives total/(N x 8), and each cell's three waste fields each receive that share divided by 3

#### Scenario: Distribution does not reassign attribution

- **WHEN** the worker responsible for Uot enters the shift waste total and confirms, while other workers had already saved grade weights for those batches
- **THEN** the waste shares are written to every cell, and the attribution recorded for those other grades remains unchanged

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

## ADDED Requirements

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
