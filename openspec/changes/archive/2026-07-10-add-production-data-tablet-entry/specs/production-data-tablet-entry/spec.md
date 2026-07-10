## ADDED Requirements

### Requirement: Dedicated tablet entry route

The system SHALL expose a full-screen worker data-entry page at a dedicated route that requires authentication but is rendered outside the sidebar `ProtectedLayout` (no navigation chrome).

#### Scenario: Authenticated worker opens the page

- **WHEN** an authenticated user navigates to the tablet entry route
- **THEN** the full-screen entry page renders without the sidebar/layout chrome

#### Scenario: Unauthenticated visitor is redirected

- **WHEN** an unauthenticated visitor navigates to the tablet entry route
- **THEN** the system redirects to the login page

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

### Requirement: Operating-parameters fields

The operating-parameters step SHALL capture `khoiLuongDauVao` (kg), four stages each with time (minutes, integer), temperature (°C, float) and pressure (float), and an optional note. The `nguoiThucHien` field SHALL be auto-filled from the authenticated user (last name + first name).

#### Scenario: Person performing is auto-filled

- **WHEN** the operating-parameters step is saved
- **THEN** `nguoiThucHien` is set to the authenticated user's name without manual entry

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
