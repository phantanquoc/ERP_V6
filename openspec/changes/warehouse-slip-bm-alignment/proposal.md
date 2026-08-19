## Why

The warehouse-slip-multi-item change moved slips to header+lines but the form still does not match the official paper slips BM01-QT03 (receipt) and BM03-QT03 (issue) that the company filed on 17/05/2026. Every printed or exported slip must be signable and archivable as-is: company header with logo, requester/department/reason, a 13-column detail table with plan/actual splits for lot/package/quantity, condition/packaging columns, flexible row count, and correct signatures (3 for issue, 2 for receipt) plus the BM footer and kien-capacity note. None of those fields exist in the schema today, and the current print view is a generic HTML table.

Beyond the form, eight operational improvements were identified during the audit: threshold warnings for plan-vs-actual deviation, QR per kien, per-kien stock visibility, multi-kien picker, auto-calculated totals, deviation history reporting, lock-after-print, and configurable company/BM header.

## What Changes

- **BREAKING** Add header fields to both slips: `nguoiDeNghi` (requester name), `maNguoiDeNghi` (employee id), `boPhan` (department+subDepartment display), `boPhanId` (optional FK-ish reference). `WarehouseIssue` additionally gets `lyDoXuatKho` (reason for issue, preset+free text). Both get `daIn` (printed flag) and `inLanDauAt` for lock-after-print.
- **BREAKING** Add per-line fields to both line tables: `soLoKeHoach` / `soLoThucTe` (lot names, plan vs actual — different lots), `soKienKeHoach` / `soKienThucTe` (JSON string arrays of maKien codes, plan vs actual — different kien sets, one logical product row may group many kien), `tinhTrang` (condition), `quyCach` (packaging spec). Stock is always subtracted/added by the actual values; the plan values are audit-only. When `soKienThucTe` is present, `soLoThucTe` is derived from the kien's lot (not entered separately).
- Add `tinhTrang` catalog (Binh thuong, Hong, Am moc, Qua han, Dang kiem tra, Tam giu, Khac+free text) and `lyDoXuatKho` presets (reuse shape of `MUC_DICH_PRESETS`), both stored as free-text String with optional catalog validation.
- Repoint `WarehouseReceipt.mucDich` / `WarehouseIssue.lyDoXuatKho` to share the same preset+free-text pattern.
- Add `exceljs`-based xlsx export that reproduces the BM01/BM03 template exactly (landscape, merged plan/actual headers for So lo / So kien / So luong, thin borders, company header with `abf-logo.png`, 13 columns incl. condition/packaging, flexible row count, BM footer, kien note, QR per kien, print area/scale/margins).
- Redesign `WarehouseSlipPrintView` to match the same template for browser print (logo, company header, requester/department/reason/date, 13-column table with plan/actual splits, BM footer, signatures 3/2).
- Introduce `MultiKienPicker` (checklist of `maKien | tenLo | stock | unit` with search + "select all in lot") and wire it into receipt/issue modals. Improve modals with requester combobox (`EmployeeCombobox` + `useEmployeesForAssignment` active non-admin searchable), auto department, threshold warnings, per-kien stock badges, auto-calc totals.
- Add configurable company/BM header (SystemSettings or constants) and lock-after-print toggle.

## Capabilities

### New Capabilities
- `warehouse-slip-bm-fields`: Header fields (requester, department, issue reason, printed flag) and per-line fields (lot plan/actual, kien plan/actual as maKien sets, condition, packaging) with KH/TT semantics and actual-based stock semantics.
- `warehouse-slip-xlsx-export`: Server-side xlsx export reproducing BM01/BM03 exactly via exceljs (landscape, merged headers, borders, logo, QR, print setup, flexible rows).
- `warehouse-slip-bm-print`: Redesigned browser print view matching the BM template (logo, company header, 13 columns, plan/actual splits, signatures 2/3, BM footer).
- `warehouse-slip-condition-catalog`: Condition catalog (7 items) and issue-reason presets, both catalog+free-text.

### Modified Capabilities
- `warehouse-slip-management`: Create/update/delete/list/detail/print flows must handle the new header+line fields, multi-kien grouping (DB is N items/kien, Excel/Print groups by product), plan-vs-actual deviation logic, and lock-after-print.
- `warehouse-slip-multi-item`: The line engine and services from the prior change are extended with the new per-line columns; `soKienThucTe` JSON arrays, derived `soLoThucTe`, and plan/actual deviation are additive to the existing sequential-snapshot and aggregate-validation logic.
- `warehouse-slip-print`: Existing print view is replaced by the BM-faithful layout.

## Impact

**Schema** — `backend/prisma/schema/business_production.prisma`: new columns on `WarehouseReceipt`, `WarehouseIssue`, `WarehouseReceiptItem`, `WarehouseIssueItem`; additive migration.

**Backend** — `warehouseReceiptService.ts`, `warehouseIssueService.ts`, `warehouseStockService.ts`; controllers `warehouseReceiptController.ts`, `warehouseIssueController.ts`; routes `warehouseReceiptRoutes.ts`, `warehouseIssueRoutes.ts`; new `warehouseSlipExportService.ts` (exceljs); schemas `backend/src/schemas/index.ts`; `SystemSettings` or constants for BM/company header; `qrcode` dep for QR.

**Frontend** — `CreateWarehouseReceiptModal.tsx`, `EditWarehouseReceiptModal.tsx`, `EditWarehouseIssueModal.tsx`, `CreateWarehouseIssueModal.tsx`, `WarehouseSlipPrintView.tsx`, `WarehouseReceiptTab.tsx`, `WarehouseIssueTab.tsx`; new `MultiKienPicker.tsx`, hooks `useEmployeesForAssignment` reuse; constants for catalogs/presets; `abf-logo.png` asset wiring for print and xlsx.

**Not affected** — `warehouse-slip-multi-item` prior change remains the base; no changes to `SupplyRequest`/`PurchaseRequest`/`InternationalProduct` master beyond optional `quyCach` display.
