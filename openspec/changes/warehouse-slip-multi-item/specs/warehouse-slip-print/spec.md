## ADDED Requirements

### Requirement: A slip can be printed from the browser

The warehouse receipt and issue tabs MUST provide a Print action per slip that opens a print-oriented view and invokes the browser's print dialog. The view MUST render using CSS print styles with no server-generated PDF and no new frontend dependency for document generation.

#### Scenario: Printing a slip opens the browser print dialog
- **WHEN** a user selects Print on an unlocked or locked slip
- **THEN** the system renders a print view and triggers `window.print()`

### Requirement: Printed layout follows the standard slip form

The printed view MUST render a header section (slip code, date, staff name, purpose/reason) and a detail table of commodity lines with columns for name, unit, requested quantity, and actual quantity, followed by a totals row. Vietnamese text MUST render with correct diacritics.

#### Scenario: Single-warehouse slip prints as one table
- **WHEN** every line of a slip references the same warehouse
- **THEN** the printed view renders one detail table listing all lines

#### Scenario: Diacritics render correctly
- **WHEN** a slip contains Vietnamese commodity names with diacritics
- **THEN** the printed output displays them without character loss, unlike the existing PDFKit-based evaluation export

### Requirement: Multi-warehouse slips group detail rows by warehouse

When a slip's lines reference more than one warehouse, the printed view MUST render one detail table per warehouse, each labelled with that warehouse's name, rather than a single table with a warehouse column.

#### Scenario: Two-warehouse slip prints as two tables
- **WHEN** a slip has lines split across two warehouses
- **THEN** the printed view renders two labelled tables, each containing only that warehouse's lines
