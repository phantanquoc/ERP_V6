## ADDED Requirements

### Requirement: Overview cards read the correct response shape

The ProductionWarehouse overview cards MUST derive their counts from the correct level of the API response. The receipts, issues, and supply-request datasets are wrapped as `{ success, data }` by the controller and again by the HTTP client, so the page MUST read the array from `response.data.data` (falling back to an empty array), consistent with how the warehouse dataset is already read.

#### Scenario: Cards show correct counts
- **WHEN** the ProductionWarehouse page loads receipts, issues, and supply requests
- **THEN** each card reflects the true number of items, not `undefined`/blank caused by reading one level too shallow

### Requirement: Stock card shows distinct in-stock item count

The stock overview card MUST display the number of distinct in-stock items, computed as the count of `lotProduct` rows with `soLuong > 0` across all warehouses → lots → lot products. The system MUST NOT sum quantities across different units of measure.

#### Scenario: In-stock item count ignores empty lot products
- **WHEN** the page aggregates stock across warehouses
- **THEN** the card counts only `lotProduct` rows whose `soLuong > 0`, and does not add together quantities that use different units

### Requirement: Month/year period filter scopes counts and tables

The page MUST provide a Month selector (1–12 plus "All") and a Year selector (available years plus "All") near the overview cards, defaulting to "All". Filtering MUST be performed client-side on already-loaded data. The selected period MUST scope the receipt-count and issue-count cards by `ngayNhap`/`ngayXuat`, and MUST be passed to the receipt and issue tabs so their tables filter by the same period in addition to their existing text filters. The stock card and the in-stock item count reflect current stock state and are not scoped by the period.

#### Scenario: Selecting a period scopes receipt and issue counts
- **WHEN** the user selects a specific month and year
- **THEN** the receipt-count and issue-count cards count only slips whose `ngayNhap`/`ngayXuat` fall within that period

#### Scenario: Period is applied to the tab tables
- **WHEN** a period is selected at the page level
- **THEN** the receipt and issue tab tables show only slips within that period, combined with any active text filters

#### Scenario: Default period shows everything
- **WHEN** the page first loads with the default "All" period
- **THEN** no slips are hidden by the period filter and all cards count across all time
