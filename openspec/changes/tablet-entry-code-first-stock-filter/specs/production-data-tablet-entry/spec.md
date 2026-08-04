# production-data-tablet-entry Specification (delta)

## MODIFIED Requirements

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

`MaterialEvaluation` and `FinishedProduct` SHALL each store the commodity code of the material they refer to. The system SHALL set it when the record is created, both when the record originates from a warehouse lot and when it is created without one. Because records may exist without a warehouse link, the stored code MAY be absent, and the display SHALL degrade to showing no code rather than failing.

#### Scenario: Code stored from a warehouse lot

- **WHEN** a material evaluation is created by selecting a warehouse package
- **THEN** the record stores the commodity code of that package's product

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

### Requirement: Draft auto-save

Typing SHALL auto-save a draft to localStorage keyed by production date and shift, surviving reload and tab close, and switching tabs SHALL preserve the draft. The draft MUST NOT be written to the database until confirm.

The draft SHALL be saved regardless of whether any `FinishedProduct` record already exists for that production day and shift. A day and shift with no existing records is a valid empty baseline, not an unloaded state, and MUST NOT suppress draft writing.

Draft writing SHALL tolerate storage failure: if the browser rejects the write, the system SHALL NOT crash the screen, and SHALL surface that the draft could not be saved. Draft writing SHALL NOT run synchronously on every keystroke.

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

### Requirement: Data-loading failure distinguished from empty data

When loading fry batches, machines, finished products, or operations fails, the kiosk screens SHALL show that loading failed and offer a retry, and SHALL NOT present the failure as an absence of data. An empty result SHALL keep showing the existing empty-state message.

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

- **WHEN** the worker changes a Hàng A weight and a Hàng B weight and confirms
- **THEN** attribution records exist for both grades naming that worker

#### Scenario: Waste-only cell produces no attribution

- **WHEN** a cell becomes dirty only through the even waste distribution
- **THEN** no per-grade attribution record is created for that cell

### Requirement: Waste tab shift-total distribution

The "Vụn - Phế phẩm" tab SHALL accept a single total for the whole shift (one input, not a matrix). On save, that total SHALL be split evenly across all cells (number of batches × 8 machines), and each cell's share SHALL be split evenly across the three fields `vunLonKhoiLuong`, `vunNhoKhoiLuong`, `phePhamKhoiLuong` (each = cell share / 3).

The distributed values SHALL be rounded at the same precision the preview displays, so the figures the worker reviews are the figures persisted.

Because the distribution touches every batch × machine cell, it SHALL NOT create per-grade attribution records for the worker who entered the total, and SHALL NOT reassign attribution recorded for grades other workers entered.

#### Scenario: Even distribution

- **WHEN** the worker enters a shift total on the waste tab and there are N batches
- **THEN** each of the N × 8 cells receives total/(N × 8), and each cell's three waste fields each receive that share divided by 3

#### Scenario: Preview matches what is persisted

- **WHEN** the worker reviews distributed waste values in the preview and confirms
- **THEN** the values persisted match the values displayed, at the same precision

#### Scenario: Distribution does not reassign attribution

- **WHEN** the worker responsible for Ướt enters the shift waste total and confirms, while other workers had already saved grade weights for those batches
- **THEN** the waste shares are written to every cell, and the attribution recorded for those other grades remains unchanged
