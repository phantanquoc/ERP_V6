## ADDED Requirements

### Requirement: Per-machine adjustment of original grade weights on aggregate tab

The system SHALL allow a manager viewing the "Tổng các máy" aggregate tab to adjust the ORIGINAL 8 grade weights of a fry-batch (`maChien`) by opening an "Expand and edit per machine" modal that lists every `FinishedProduct` row of that mẻ (one row per machine) and lets the user edit each row's 8 grade weights independently. Submission MUST call the existing single-row `updateFinishedProduct` endpoint per machine (no new endpoint), which already recalculates `tongKhoiLuong` + 8 percentages and syncs `QualityEvaluation`. The system MUST NOT auto-distribute or guess ratios between machines. Adjustment MUST be disabled when ANY `FinishedProduct` of the mẻ has `daNhapKho = true`.

#### Scenario: Open per-machine editor
- **WHEN** the user clicks "Điều chỉnh" on an aggregate row representing a `maChien` with 3 machines
- **THEN** the modal shows 3 sections (one per machine), each with editable inputs for the 8 grade weights pre-filled from current values

#### Scenario: Per-machine save calls existing endpoint
- **WHEN** the user submits edits across 3 machines
- **THEN** the frontend dispatches 3 `updateFinishedProduct` calls (one per machine), each recalculates `tongKhoiLuong` and percentages server-side, and the aggregate view reflects the new sums after invalidation

#### Scenario: No auto-ratio
- **WHEN** the user changes the total weight of a single grade for the mẻ
- **THEN** the system DOES NOT auto-distribute the delta across machines; the user MUST edit each machine explicitly

#### Scenario: Adjustment blocked when received
- **WHEN** the aggregate row has any `FinishedProduct` with `daNhapKho = true`
- **THEN** the "Điều chỉnh" action is disabled and the row is rendered dimmed

### Requirement: Multi-select fry-batches on aggregate tab

The aggregate tab SHALL render a checkbox column for selecting multiple fry-batches and a "select all" checkbox in the header. By default the "select all" checkbox MUST tick all rows whose `daNhapKho` is `false` and skip rows whose `daNhapKho` is `true`. The bulk-receipt button "Nhập kho toàn bộ" MUST be enabled only when at least one not-yet-received row is selected.

#### Scenario: Default select-all behavior
- **WHEN** the user opens the "Tổng các máy" tab and clicks the header "select all" checkbox
- **THEN** every row with `daNhapKho = false` becomes selected and every row with `daNhapKho = true` remains unselected (and stays disabled)

#### Scenario: Bulk button enablement
- **WHEN** no row is selected
- **THEN** the "Nhập kho toàn bộ" button is disabled

#### Scenario: Bulk button activation
- **WHEN** at least one not-yet-received row is selected
- **THEN** the "Nhập kho toàn bộ" button is enabled and opens the bulk-receipt modal on click

### Requirement: Received-state display on aggregate rows

The aggregate tab SHALL visually indicate which fry-batches have already been received into the warehouse by rendering rows whose every `FinishedProduct` has `daNhapKho = true` in a dimmed style, with the selection checkbox disabled and the "Điều chỉnh" action disabled.

#### Scenario: Mixed status rendering
- **WHEN** the data set contains 5 mẻ where 2 have all rows `daNhapKho = true` and 3 are not received
- **THEN** the 2 received mẻ render dimmed with disabled checkbox and disabled "Điều chỉnh"; the 3 others render normally with both controls enabled
