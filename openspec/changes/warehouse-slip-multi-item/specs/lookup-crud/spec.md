## MODIFIED Requirements

### Requirement: Column mapping for cascade operations
The system SHALL maintain hard-coded mapping of lookup groups to database columns for cascade updates.

Column mappings below are extracted from `backend/prisma/schema/*.prisma` and MUST be verified against the schema during implementation. Any column not present in the schema MUST NOT be included.

When a mapped column moves to a different table, its mapping entry MUST move with it. A mapping entry pointing at a table or model that no longer holds the column updates zero rows and raises no error — a silent no-op indistinguishable from success.

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
  - `business.warehouse_receipt_items.donViTinh` — moved from `warehouse_receipts` when slips gained line tables
  - `business.warehouse_issue_items.donViTinh` — moved from `warehouse_issues` when slips gained line tables
  - `business.order_items.donVi`
  - `business.spare_parts.donVi`
  - `business.project_costs.donVi`
  - `common.process_flowchart_costs.donVi`
  - `common.production_flowchart_costs.donVi`
  - `business.tax_reports.donViTinh` — Prisma field `donViTinh` is `@map("donVi")`; raw SQL MUST target the real column `"donVi"`

#### Scenario: Cascade reaches slip line tables
- **WHEN** a DON_VI_TINH label is renamed and slip lines use that unit
- **THEN** the affected `warehouse_receipt_items` and `warehouse_issue_items` rows are updated and counted in the cascade result
- **AND** the deprecated header columns on `warehouse_receipts` and `warehouse_issues` are not targeted

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
