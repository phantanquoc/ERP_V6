## ADDED Requirements

### Requirement: Multi-kien grouping extends the line engine

The sequential-snapshot and aggregate-validation engine from `warehouse-slip-multi-item` SHALL be extended to handle the BM kien-set semantics. When `soKienThucTe` is present, stock mutations and validation SHALL use the actual kien set's `lotProductId`s and their `soLuongThucTe` values; plan kien sets SHALL NOT participate in stock math. Grouped product rows (many kien per logical product) SHALL be expanded to per-kien `Warehouse*Item` rows before entering the existing engine; collapsing for export/print is a presentation concern only.

#### Scenario: Grouped row enters engine as per-kien rows
- **WHEN** a grouped entry with `soKienThucTe='["K1.1","K1.2"]'` and quantities `[30, 20]` is submitted
- **THEN** the engine receives two per-kien items and computes sequential snapshots for each kien separately

#### Scenario: Plan kien does not affect stock
- **WHEN** `soKienKeHoach='["K1.1","K1.2"]'` differs from `soKienThucTe='["K1.3"]'`
- **THEN** only `K1.3` is validated and mutated; `K1.1`/`K1.2` are ignored for stock

### Requirement: Plan-vs-actual deviation on lines

Each line's plan vs actual deviation SHALL be computable as `|actual - plan| / plan` for quantity, and as set-equality for lot/kien sets. The API SHALL return both plan and actual values; the UI SHALL highlight lines where quantity deviation exceeds 10% (configurable) and require a `ghiChu` explanation.

#### Scenario: Deviation highlight
- **WHEN** a line has `soLuongYeuCau=100` and `soLuongThucTe=80` (20% deviation)
- **THEN** the frontend highlights the row and requires `ghiChu` before submit

### Requirement: Deviation history reporting

The system SHALL provide a deviation summary (count of slips/lines where plan != actual, average deviation) aggregatable by month and department, derived from the stored KH/TT fields without a new table.

#### Scenario: Deviation report
- **WHEN** a report is requested for a given month
- **THEN** it returns per-slip and aggregate deviation metrics computed from `soLoKeHoach` vs `soLoThucTe`, `soKienKeHoach` vs `soKienThucTe`, and `soLuongYeuCau` vs `soLuongThucTe`
