## ADDED Requirements

### Requirement: List lookups by group
The system SHALL return all active lookup entries for a specified group, ordered by sortOrder ascending.

#### Scenario: Retrieve active units of measure
- **WHEN** client requests GET /api/lookups?group=DON_VI_TINH
- **THEN** system returns all lookups where group='DON_VI_TINH' and isActive=true, sorted by sortOrder

#### Scenario: Retrieve all lookups including inactive
- **WHEN** client requests GET /api/lookups?group=DON_VI_TINH&all=true
- **THEN** system returns all lookups where group='DON_VI_TINH' regardless of isActive status

#### Scenario: Empty result for unknown group
- **WHEN** client requests GET /api/lookups?group=UNKNOWN_GROUP
- **THEN** system returns empty array with 200 status

### Requirement: Get single lookup detail
The system SHALL return full details of a lookup entry by ID.

#### Scenario: Retrieve existing lookup
- **WHEN** client requests GET /api/lookups/:id with valid lookup ID
- **THEN** system returns lookup object with all fields

#### Scenario: Lookup not found
- **WHEN** client requests GET /api/lookups/:id with non-existent ID
- **THEN** system returns 404 with error message

### Requirement: Create new lookup entry
The system SHALL allow ADMIN users to create new lookup entries with auto-generated code from label.

#### Scenario: Successful creation
- **WHEN** ADMIN posts to /api/lookups with {group: "DON_VI_TINH", label: "Chai"}
- **THEN** system creates lookup with code="CHAI" (auto-generated via slugifyToUpperCode), sortOrder=0, isActive=true
- **THEN** system returns 201 with created lookup object

#### Scenario: Duplicate code within group
- **WHEN** ADMIN creates lookup with label that generates existing code in same group
- **THEN** system returns 409 with error "Lookup code already exists in this group"

#### Scenario: Non-admin user attempts creation
- **WHEN** non-ADMIN user posts to /api/lookups
- **THEN** system returns 403 Forbidden

### Requirement: Update lookup entry
The system SHALL allow ADMIN users to update lookup label, sortOrder, or isActive status.

#### Scenario: Update label without cascade
- **WHEN** ADMIN updates lookup label and usageCount=0
- **THEN** system updates lookup.label and returns updated object
- **THEN** no cascade update occurs

#### Scenario: Update label with cascade confirmation
- **WHEN** ADMIN updates lookup label where usageCount>0 without confirmCascade flag
- **THEN** system returns 409 with {oldLabel, newLabel, affectedRecords: N, requiresConfirmation: true}

#### Scenario: Cascade rename across tables
- **WHEN** ADMIN updates lookup label with confirmCascade=true and usageCount>0
- **THEN** system starts transaction
- **THEN** system creates LookupChangeLog entry with oldLabel, newLabel, affectedTables array
- **THEN** system updates lookup.label
- **THEN** system updates all columns mapped to this group (per LOOKUP_COLUMN_MAP) where value=oldLabel to newLabel
- **THEN** system commits transaction and returns updated lookup with usageCount

> **COVERAGE GAP (carried forward):** live **multi-table** cascade was only unit-tested, never exercised end-to-end. The end-to-end run covered a single-table cascade against the real in-use `LOAI_CHI_PHI` value `'sản xuất '` (trailing space intact, `affectedRecords=1`, then reverted). The `business.tax_reports.donVi` `@map` cascade path is likewise **unit-test-only**.

#### Scenario: Cascade rollback on failure
- **WHEN** cascade update fails on any table update
- **THEN** system rolls back entire transaction
- **THEN** lookup.label remains unchanged
- **THEN** LookupChangeLog entry is not created
- **THEN** system returns 500 with error details

> **COVERAGE GAP (carried forward):** this scenario is verified by a **mocked unit test only** (Prisma made to throw mid-transaction). Rollback has not been exercised against a live multi-table failure.

#### Scenario: Update sortOrder
- **WHEN** ADMIN updates {sortOrder: 10}
- **THEN** system updates lookup.sortOrder and returns updated object

#### Scenario: Toggle active status
- **WHEN** ADMIN updates {isActive: false}
- **THEN** system sets lookup.isActive=false (soft delete)
- **THEN** lookup no longer appears in default list queries

### Requirement: Delete lookup entry
The system SHALL prevent hard deletion and only allow soft deletion (isActive=false) if lookup is not in use.

#### Scenario: Soft delete unused lookup
- **WHEN** ADMIN deletes lookup with usageCount=0
- **THEN** system sets isActive=false and returns 200

#### Scenario: Block deletion of in-use lookup
- **WHEN** ADMIN attempts to delete lookup with usageCount>0
- **THEN** system returns 400 with error "Cannot delete — used by N records. Hide instead."

#### Scenario: Hard delete never allowed
- **WHEN** any user attempts to permanently delete a lookup record
- **THEN** system returns 405 Method Not Allowed

### Requirement: Get usage count
The system SHALL count how many records across mapped tables reference a lookup label.

#### Scenario: Count usage for unit of measure
- **WHEN** client requests GET /api/lookups/:id/usage for DON_VI_TINH group
- **THEN** system queries all 21 columns mapped to DON_VI_TINH group
- **THEN** system returns {usageCount: N, breakdown: [{table, column, count}]}

#### Scenario: Zero usage
- **WHEN** lookup label exists in Lookup table but no records reference it
- **THEN** system returns {usageCount: 0, breakdown: []}

### Requirement: Seed initial lookup data
The system SHALL provide seed function to populate 11 groups with 74 values from production audit.

#### Scenario: Seed DON_VI_TINH group
- **WHEN** seed script runs for DON_VI_TINH
- **THEN** system creates 23 lookup entries
- **THEN** entries include: Kg, Tấn, Gram, Cái, Bộ, Hộp, Thùng, Bao, Gói, Lít, Mét, Cuộn, Người, Đôi, Can, Miếng, Xô, Bịch, Xe
- **THEN** entries additionally include the 4 production values the original audit missed: `kg`, `KG`, `Container`, `Lô`
- **THEN** colliding codes are disambiguated numerically (`DON_VI_TINH_KG` / `_KG_2` / `_KG_3` for `Kg` / `kg` / `KG`), so cascade rename MUST match on `label`, never on `code`

#### Scenario: Seed LOAI_CHI_PHI_XUAT_KHAU group
- **WHEN** seed script runs for LOAI_CHI_PHI_XUAT_KHAU
- **THEN** system creates exactly 1 entry ("Chi phí xuất khẩu") — verified identical on dev and prod; the earlier "4 values" figure was wrong

#### Scenario: Idempotent seed
- **WHEN** seed script runs multiple times
- **THEN** system skips existing (group, code) pairs due to unique constraint
- **THEN** no duplicate entries are created

### Requirement: Column mapping for cascade operations
The system SHALL maintain hard-coded mapping of lookup groups to database columns for cascade updates.

Column mappings below are extracted from `backend/prisma/schema/*.prisma` and MUST be verified against the schema during implementation. Any column not present in the schema MUST NOT be included.

#### Scenario: DON_VI_TINH maps to 21 unit columns
- **WHEN** system performs cascade for DON_VI_TINH group
- **THEN** system updates exactly these columns:
  - `business.international_products.donViTinh`
  - `business.quotation_request_items.donViTinh`
  - `business.quotations.donViTinh`
  - `business.general_costs.donViTinh`
  - `business.export_costs.donViTinh`
  - `business.quotation_calculator_products.donViTinh`
  - `business.quotation_calculator_general_costs.donViTinh`
  - `business.quotation_calculator_export_costs.donViTinh`
  - `business.supply_requests.donViTinh`
  - `business.supply_request_items.donViTinh`
  - `business.purchase_requests.donViTinh`
  - `business.purchase_request_items.donViTinh`
  - `business.lot_products.donViTinh`
  - `business.warehouse_receipts.donViTinh`
  - `business.warehouse_issues.donViTinh`
  - `business.order_items.donVi`
  - `business.spare_parts.donVi`
  - `business.project_costs.donVi`
  - `common.process_flowchart_costs.donVi`
  - `common.production_flowchart_costs.donVi`
  - `business.tax_reports.donViTinh` — Prisma field `donViTinh` is `@map("donVi")`; raw SQL MUST target the real column `"donVi"`

#### Scenario: Columns excluded from DON_VI_TINH cascade
- **WHEN** system builds the DON_VI_TINH column map
- **THEN** `donViTien` columns (`general_costs`, `export_costs`) are excluded — they belong to group DON_VI_TIEN
- **THEN** `donViDinhMucLaoDong` and `donViNangSuat` columns are excluded — production audit shows these hold compound units (`kg/phút`, `người/hệ`) and case variants (`cái` vs `Cái`), which are out of scope for this change

#### Scenario: PHAN_LOAI_VAT_TU maps to 4 columns
- **WHEN** system performs cascade for PHAN_LOAI_VAT_TU group
- **THEN** system updates exactly: `business.supply_requests.phanLoai`, `business.supply_request_items.phanLoai`, `business.purchase_requests.phanLoai`, `business.purchase_request_items.phanLoai`

#### Scenario: LOAI_CHI_PHI maps to 6 columns
- **WHEN** system performs cascade for LOAI_CHI_PHI group
- **THEN** system updates exactly: `business.project_costs.loaiChiPhi`, `business.general_costs.loaiChiPhi`, `business.export_costs.loaiChiPhi`, `business.debts.loaiChiPhi`, `common.process_flowchart_costs.loaiChiPhi`, `common.production_flowchart_costs.loaiChiPhi`

#### Scenario: Remaining groups and their columns
- **WHEN** system performs cascade for the remaining groups
- **THEN** the column map is exactly:
  - `KHU_VUC` → `business.machine_systems.khuVuc`
  - `MUC_DO_LOI` → `business.fault_templates.mucDo`, `business.fault_records.mucDo`
  - `LOAI_LOI` → `common.repair_requests.loaiLoi`, `common.repair_request_items.loaiLoi`
  - `LOAI_SAN_PHAM` → `business.international_products.loaiSanPham`
  - `LOAI_KHACH_HANG` → `business.customers.loaiKhachHang`
  - `VAI_TRO_DU_AN` → `business.project_members.vaiTro`
  - `DON_VI_TIEN` → `business.general_costs.donViTien`, `business.export_costs.donViTien`
  - `LOAI_CHI_PHI_XUAT_KHAU` → shares `business.export_costs.loaiChiPhi` with LOAI_CHI_PHI

#### Scenario: Overlapping column between two groups
- **WHEN** a column is mapped by more than one group (e.g. `export_costs.loaiChiPhi` in both LOAI_CHI_PHI and LOAI_CHI_PHI_XUAT_KHAU)
- **THEN** usage count for a label MUST NOT double-count the same row
- **THEN** cascade rename MUST update the row exactly once

### Requirement: Zero data loss guarantee
The system SHALL never delete or lose existing data during any operation.

#### Scenario: Migration preserves all data
- **WHEN** Lookup table migration runs
- **THEN** no existing columns are dropped
- **THEN** no existing column types are changed
- **THEN** seed operation only adds new rows

#### Scenario: Cascade preserves referential semantics
- **WHEN** cascade rename updates "Kg" to "kg" across 21 columns
- **THEN** all foreign semantics are preserved
- **THEN** no rows are deleted
- **THEN** update count matches expected affected records

#### Scenario: Soft delete preserves history
- **WHEN** lookup is soft deleted (isActive=false)
- **THEN** lookup row remains in database
- **THEN** historical records referencing this label remain intact
- **THEN** lookup can be reactivated by setting isActive=true
