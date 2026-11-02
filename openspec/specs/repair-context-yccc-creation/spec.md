# repair-context-yccc-creation Specification

## Purpose
Supply requests (YCCC) can be raised from inside a repair slip — once when the slip is created, and again mid-repair for newly discovered materials — carrying attachments, linking into the repair's supply chain, and opening inline without leaving the slip.

## Requirements

### Requirement: Create-time YCCC carries user-selected attachments
When a YCSC is created with goods rows, the auto-created YCCC SHALL include the files selected in the form's YCCC section (max 4, same allowlist as the standalone YCCC form). The goods rows, purpose, and priority SHALL be unchanged from today's behavior.

#### Scenario: attachments flow into the auto-created YCCC
- **WHEN** a user creates a YCSC with 1 goods row and 2 files selected in the YCCC section
- **THEN** the auto-created YCCC stores both file URLs in its `tepDinhKem` and the YCSC→YCCC link is created as before

#### Scenario: no files keeps current behavior
- **WHEN** a YCSC is created with goods rows but no files in the YCCC section
- **THEN** the YCCC is created with an empty attachment list

### Requirement: Phat-sinh YCCC form gating
The "Vật tư phát sinh" block SHALL be shown only when all of: the slip is open in view mode, the viewer is not read-only, the viewer holds `supply-requests:CREATE`, and the slip's status is not `DA_HUY`. In every other case the block SHALL be absent — no placeholder, no disabled inputs.

#### Scenario: technician on an active slip sees the block
- **WHEN** a user with `supply-requests:CREATE` opens a YCSC in view mode with status `DANG_SUA_CHUA`
- **THEN** the "Vật tư phát sinh" block and its "Tạo YCCC" action are visible

#### Scenario: canceled slip hides the block
- **WHEN** any user opens a YCSC with status `DA_HUY`
- **THEN** the block is not rendered

#### Scenario: missing permission hides the block
- **WHEN** a user without `supply-requests:CREATE` opens an active YCSC
- **THEN** the block is not rendered, while the money-row chi phí phát sinh table remains unaffected

### Requirement: Phat-sinh YCCC creation validates everything before writing
Before any write, the form SHALL verify: every row has a non-blank product name, a quantity greater than 0, a valid device item selection (the slip must have repair items), and the current user resolves to an employee record. If any check fails, an error toast explains the problem and NO YCCC, link, or material-need row is created.

#### Scenario: invalid row blocks creation
- **WHEN** the user submits with one row whose quantity is 0
- **THEN** an error toast names the problem and no YCCC exists afterwards

#### Scenario: unlinked employee blocks creation
- **WHEN** the current user has no matching employee record
- **THEN** an error toast explains the missing employee link and nothing is created

### Requirement: Phat-sinh YCCC creation order and partial-failure behavior
After validation passes the system SHALL: (1) create the YCCC with purpose `Phát sinh cho <maYeuCau>` and the form's files, (2) link it to the slip, (3) record one `RepairMaterialNeed` per row against its selected device item. A failure at step 1 aborts with an error toast and leaves steps 2–3 untouched. A failure at step 2 leaves the YCCC in place and shows a warning toast. A failure at step 3 shows a warning naming the rows that were not recorded.

#### Scenario: happy path completes all three steps
- **WHEN** the user submits 2 valid rows with 1 file
- **THEN** a YCCC exists with those 2 goods lines and the file, a `RepairSupplyLink` joins it to the slip, 2 `RepairMaterialNeed` rows exist, and success toasts confirm creation

#### Scenario: link failure keeps the YCCC
- **WHEN** YCCC creation succeeds but the link call fails
- **THEN** the YCCC remains, a warning toast reports the missing link, and the slip shows no chain row for it

### Requirement: After creation the slip refreshes and opens the new YCCC inline
On success the slip's detail, supply-chain, cost-summary, material-needs queries and the YCCC list SHALL be invalidated, and the new YCCC SHALL open in the inline `SupplyRequestDetailModal` overlaying the repair modal — without any route navigation that would unmount the repair slip.

#### Scenario: cost summary reflects the new YCCC
- **WHEN** the phat-sinh YCCC is created successfully
- **THEN** "Thực tế (YCCC + phát sinh)" increases by the new goods lines' price×qty without a page reload

#### Scenario: inline detail opens, slip stays mounted
- **WHEN** creation succeeds
- **THEN** the YCCC detail overlay opens on top of the still-open repair modal, and closing it returns to the slip with the new chain row listed

### Requirement: Chua-tao-YCCC warning offers a one-click shortcut
When the slip has material needs but no linked YCCC, the amber "Chưa tạo YCCC" warning SHALL include a "Tạo YCCC ngay" action that reveals/focuses the phat-sinh form (same gating rules apply). The warning text and its position are otherwise unchanged.

#### Scenario: shortcut reveals the form
- **WHEN** a gated user views a slip that has material needs but no YCCC link
- **THEN** activating "Tạo YCCC ngay" opens the "Vật tư phát sinh" block ready for input

### Requirement: Double-submit protection
While a phat-sinh creation is in flight, the submit action SHALL be disabled so repeated clicks cannot create duplicate YCCCs; re-enabling occurs after success or failure.

#### Scenario: rapid double click creates one YCCC
- **WHEN** the user clicks "Tạo YCCC" twice quickly
- **THEN** exactly one YCCC is created and the second click has no effect
