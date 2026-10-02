# maintenance-single-plan-view Specification

## Purpose
TBD - created by archiving change maintenance-single-plan-per-page. Update Purpose after archive.

## Requirements

### Requirement: Plans sub-view renders one plan per page

The plans sub-view under `?tab=maintenance&mView=plans` SHALL render exactly one `MaintenancePlan` at a time as a single full-width T1–T12 month grid. It SHALL NOT render a paginated list of multiple plan cards.

#### Scenario: Single plan grid visible

- **WHEN** user navigates to `?tab=maintenance&mView=plans` and at least one plan matches the active filters
- **THEN** exactly one plan's grid (one header + one items table with T1–T12 columns) is visible

#### Scenario: No multi-card pagination controls

- **WHEN** user is on the plans sub-view
- **THEN** the 5-card pagination controls (`planPage` Prev/Next page) are not rendered

### Requirement: Plan navigator driven by filtered set

The view SHALL expose a plan navigator that steps through the currently filtered plan set: a searchable dropdown of plan codes (`maKeHoach` + system name) and **Previous / Next** buttons. The navigator order SHALL match the filtered list order returned by the list query. Prev is disabled on the first plan; Next is disabled on the last.

#### Scenario: Navigate via Prev/Next

- **WHEN** user clicks Next (and a next plan exists in the filtered set)
- **THEN** the URL `planId` updates to the next plan's id (replace) and the grid re-renders for that plan

#### Scenario: Navigate via code dropdown

- **WHEN** user selects a code from the dropdown
- **THEN** the URL `planId` updates to the selected plan's id and the grid shows that plan

#### Scenario: Navigator respects active filters

- **WHEN** user changes a filter (search `planQ`, year `nam`, system `machineSystemId`, status `trangThai`)
- **THEN** the navigator options recompute from the filtered set, the selection moves to the first plan in the new set (and URL `planId` updates), or shows empty state if the set is empty

### Requirement: URL planId is source of truth and deep-link is preserved

`planId` in the URL SHALL be the source of truth for the active plan. On load, if `planId` is present and valid, that plan is shown. If absent, the first plan in the filtered set is selected and URL is updated (replace). If `planId` is not in the filtered set after a filter change, selection falls back to first. `planMonth` (1..12) when present SHALL highlight and scroll the month column into view after the plan loads, without requiring a second navigation.

#### Scenario: Deep-link by planId

- **WHEN** user opens `?tab=maintenance&mView=plans&planId=<id>`
- **THEN** the grid for that plan is shown and `planId` remains in the URL

#### Scenario: Deep-link with planMonth highlight

- **WHEN** user opens `?tab=maintenance&mView=plans&planId=<id>&planMonth=5`
- **THEN** column T5 is visually highlighted and scrolled into view (on narrow viewports)

#### Scenario: Missing planId falls back to first filtered

- **WHEN** user opens `?tab=maintenance&mView=plans` with no `planId`
- **THEN** the first plan in the filtered set is selected and URL is updated to include `planId`

### Requirement: Empty and loading states

When the filtered set is empty the view SHALL show an empty state with a message and a "Create plan" CTA. While the list or detail query is loading, a loading skeleton for the single grid SHALL be shown (no empty flash). Errors SHALL show an inline retry.

#### Scenario: No plans for active filters

- **WHEN** active filters match zero plans
- **THEN** an empty message is shown and the grid + navigator show no selected plan; the create CTA is visible

#### Scenario: Loading

- **WHEN** the filtered list or the active plan detail is fetching
- **THEN** a loading indicator/skeleton for the single plan view is visible

### Requirement: Single-modal invariant

At most one modal SHALL be open at a time between the plan form (create/view/edit via `MaintenancePlanForm` + `mode`) and the log modal (`MaintenanceLogModal`). Opening the log modal SHALL auto-close the plan form if open. The log modal SHALL render above with its own backdrop and focus trap. Closing the log modal SHALL NOT auto-reopen the plan form.

#### Scenario: Log modal closes plan form

- **WHEN** the plan detail form is open and user clicks a month cell to open the log modal
- **THEN** the plan form closes and only the log modal is visible

#### Scenario: Only one backdrop active

- **WHEN** the log modal is open
- **THEN** exactly one modal backdrop is interactive and focus is trapped in the log modal

### Requirement: Tick completion via log modal

Toggling completion and editing `nguoiThucHien` / `nguoiPhu` / `ghiChu` for a maintenance occurrence SHALL continue to happen in `MaintenanceLogModal` (one modal per `OccurrenceRow`), with no overlay of the plan form. The month cell click SHALL open the log modal; the tick button inside the modal performs the toggle.

#### Scenario: Tick from log modal

- **WHEN** user opens the log modal for a month and clicks the tick/checkbox with a performer selected
- **THEN** the occurrence is toggled and the grid reflects the new state after query invalidation

### Requirement: Records pill unchanged

The `records` pill (Biên bản BD/SC) SHALL remain unchanged in this change: its list, filters, pagination, and modals keep current behavior.

#### Scenario: Records tab unaffected

- **WHEN** user switches to `mView=records`
- **THEN** `MaintenanceRecordList` renders with its existing filters/pagination and no single-plan navigator is shown
