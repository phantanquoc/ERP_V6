## ADDED Requirements

### Requirement: Multi-dimensional output statistics
The system SHALL provide `getOutputStatistics(filters)` that aggregates finished-product output across date, base product, the 8 grades, and machine (`machineSystemId`). Filters MUST support a required date range and optional product and machine. The endpoint follows Route→Controller→Service→Prisma, is registered in ROUTE_MAP, uses the standard response shape, and accepts dates as `YYYY-MM-DD`.

#### Scenario: Date-range aggregation
- **WHEN** a user requests statistics for a date range
- **THEN** the system returns output grouped by date, product, grade, and machine within that range

#### Scenario: Filter by machine
- **WHEN** a user requests statistics filtered to one machine
- **THEN** only that machine's output is included in the result

#### Scenario: Empty range
- **WHEN** a date range contains no finished-product data
- **THEN** the system returns an empty result set with `{ success: true }`, not an error

### Requirement: Good output vs scrap distinction
Statistics SHALL distinguish good output (A + B + B Dầu + C + vụn lớn + vụn nhỏ) from scrap (phế phẩm + ướt) without altering `FinishedProduct.tongKhoiLuong` semantics or warehouse-receipt behavior.

#### Scenario: Good vs scrap split
- **WHEN** a finished product has both good grades and scrap grades
- **THEN** the statistics result reports good-output and scrap totals separately

#### Scenario: tongKhoiLuong unchanged
- **WHEN** statistics are computed
- **THEN** the stored `tongKhoiLuong` value and the warehouse-receipt flow are unaffected

### Requirement: Dead aggregation removed
The system SHALL remove the unused `getTotalWeightByDate` method, which has no UI consumer, replacing it with `getOutputStatistics`.

#### Scenario: Replacement in place
- **WHEN** the change is implemented
- **THEN** `getTotalWeightByDate` no longer exists and no code references it; `getOutputStatistics` provides date-based aggregation

### Requirement: Output statistics UI
The frontend SHALL provide a statistics view backed by a TanStack-Query hook that renders the aggregated output in a table with date-range and optional product/machine filters. It MUST present loading, error, empty, and success states with Vietnamese text and display dates as `DD/MM/YYYY`.

#### Scenario: Table render
- **WHEN** statistics data loads successfully
- **THEN** the table shows rows broken down by date, product, grade, and machine with dates formatted `DD/MM/YYYY`

#### Scenario: Empty state
- **WHEN** the selected filters return no data
- **THEN** the view shows a Vietnamese empty-state message instead of an empty table or error
