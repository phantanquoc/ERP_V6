## Context

`warehouse-slip-multi-item` moved `WarehouseReceipt`/`WarehouseIssue` from flat single-commodity headers to header+lines (`WarehouseReceiptItem`/`WarehouseIssueItem`) with sequential per-line snapshots and aggregate-before-write validation. Services, controllers, routes, and frontend modals/tabs/print were rewritten around that shape, but the form still carries only the generic fields (`tenSanPham`, `soLuongYeuCau/ThucTe`, `donViTinh`, `ghiChu`, `mucDich`). The official paper slips BM01-QT03 and BM03-QT03 filed 17/05/2026 require a richer form: company header with logo, requester/department/reason, and a 13-column detail table where lot, package, and quantity each split into plan (ke hoach) vs actual (thuc te). Package identity is `LotProduct.maKien` (e.g. K1.1), and one logical product row may group many kien — the Excel groups by product while the DB remains one row per kien.

Current state:
- `WarehouseReceipt`/`WarehouseIssue` headers: `maPhieu*`, `ngay*`, `employeeId`/`maNhanVien`/`tenNhanVien`, `mucDich`/`ghiChu`, `supplyRequestId`, `tongSoLuongThucTe`, `soDongHang`, plus deprecated flat item columns.
- Line tables: `stt`, `lotProductId`, `maKien`, `tenSanPham`, `donViTinh`, `warehouseId`/`tenKho`, `lotId`/`tenLo`, `soLuongYeuCau`/`ThucTe`, `soLuongTruoc`/`Sau`, `donGia`/`thanhTien`, `ghiChu`.
- Frontend: `CreateWarehouseReceiptModal`, `EditWarehouseReceiptModal`, `EditWarehouseIssueModal`, `WarehouseReceiptTab`, `WarehouseUnifiedView`, `WarehouseSlipPrintView` (generic 8-column HTML print), `useEmployeesForAssignment` + `EmployeeCombobox` (active, non-admin, searchable) already exists. Backend uses `exceljs@4.4.0` for other exports; `abf-logo.png` exists at `frontend/public/abf-logo.png`.
- Stock: `LotProduct.soLuong` + sequential snapshots; `receiveSplit`/`issueFifo` operate per kien.

Constraints: additive migrations only (deprecated header columns stay), one code per slip, transaction-scoped stock writes, Vietnamese text preserved, reuse existing patterns (`SupplyRequestItem`, `MUC_DICH_PRESETS`, `EmployeeCombobox`).

## Goals / Non-Goals

**Goals:**
- Make every slip storable and printable/exportable exactly as BM01/BM03 (header fields, 13 columns with KH/TT splits, signatures, BM footer, logo, kien note, flexible rows).
- Correct KH/TT semantics: So lo plan/actual = different lot names; So kien plan/actual = different maKien sets; one Excel row groups many kien; actual values drive stock.
- Multi-kien selection UX, per-kien stock visibility, threshold warnings, auto-calc totals, QR per kien.
- Server xlsx export reproducing the template (landscape, merged headers, borders, print setup) and a matching browser print view.
- Condition catalog (7 items, catalog+free-text) and issue-reason presets.
- Deviation history and lock-after-print.

**Non-Goals:**
- Changing the header+lines base from `warehouse-slip-multi-item` (this change is additive).
- Approval workflow, ledger, or pricing UI beyond reserving `donGia`/`thanhTien`.
- Altering `warehouse-slip-multi-item`'s sequential-snapshot / aggregate-validation engine — only extending its inputs.
- Client-side xlsx generation (server `exceljs` is the path, matching all other exports).

## Decisions

**1. Header fields: nullable String, auto-filled from SupplyRequest when linked.**
`nguoiDeNghi`/`maNguoiDeNghi`/`boPhan`/`boPhanId` on both headers; `lyDoXuatKho` on issue only; `daIn` Boolean default false + `inLanDauAt` DateTime?. When `supplyRequestId` is present and header requester/department are blank, fill from `SupplyRequest.tenNhanVien`/`boPhan`. Department display is `department + subDepartment` resolved via `EmployeeCombobox` selection (which already surfaces `department`); `boPhanId` is stored if needed for filtering. Alternative (FK to Employee) rejected — slips must retain the name even if the employee is later renamed/deactivated, so denormalized text is kept like `tenNhanVien`.

**2. Per-line KH/TT: two String columns for lot, two JSON String[] for kien, plus condition/packaging.**
`soLoKeHoach` String?, `soLoThucTe` String? (lot name, not FK — lots can be renamed), `soKienKeHoach` String? (JSON array of maKien), `soKienThucTe` String? (JSON array), `tinhTrang` String?, `quyCach` String?. JSON arrays store maKien sets; stock operations use the actual set only. `soLoThucTe` is derived from the actual kien's `LotProduct.lot.tenLo` when `soKienThucTe` is present — not entered separately — to avoid inconsistency (one kien belongs to one lot). Plan lot/kien are audit-only and never touch `LotProduct.soLuong`. Alternative (normalized join table per kien per line) rejected — the existing line-per-kien shape already represents the physical truth; the grouping is a presentation concern (Excel groups by product, DB stays one row per kien).

**3. Grouping: DB stays one row per kien, Excel/Print groups by product.**
A logical product row with 3 kien is 3 `Warehouse*Item` rows sharing `tenSanPham` and a `productGroupKey` (or simply grouped by `tenSanPham`+`donViTinh` in the export). The export collapses them into one Excel row with `So kien KH/TT` as comma-joined maKien, `So luong KH/TT` as summed quantities, and `So lo KH/TT` as joined lot names. Services accept either shape: a single grouped payload is expanded server-side into per-kien items before the existing sequential-snapshot path. Alternative (one DB row with embedded kien array) would diverge from `receiveSplit`/`issueFifo` and the sequential-snapshot engine.

**4. Xlsx export: new `warehouseSlipExportService` using `exceljs`, server-generated.**
Follows every other export in the repo (`employeeController`, `projectController`, etc.): controller sets `Content-Disposition` and `workbook.xlsx.write(res)`. Template: A4 landscape, `fitToPage`, margins 0, scale ~82, print area, 13 columns with widths matching the original, two header rows (row 8 merged So lo/So kien/So luong, row 9 plan/actual), thin borders, Times New Roman, company header rows with embedded `abf-logo.png` (exceljs `workbook.addImage`), blue/orange header fill, BM footer (`BM03-QT03`/`BM01-QT03` Lần 02 Ngày 17/05/2026), kien note, QR per kien (via `qrcode` → base64 PNG → exceljs image), signatures (3 for issue, 2 for receipt), flexible rows (no hardcoded 5). Reuses `warehouseSlipLines` helpers for totals.

**5. Print view: redesign `WarehouseSlipPrintView` to the same template.**
Same data path as xlsx but rendered as HTML+CSS print (`@media print`). Logo via `<img src="/abf-logo.png">`, same 13 columns and merged headers, same footer/signatures. No PDF backend — prior PDF path stripped diacritics.

**6. MultiKienPicker: checklist with search + "select all in lot".**
New `frontend/src/components/common/MultiKienPicker.tsx` fed by `warehouse.lots[].lotProducts` (already hydrated in modals). Shows `maKien | tenLo | stock | unit`, filters, and a bulk toggle. Emits `string[]` of selected `lotProductId`; the modal maps to per-kien items. Existing `ProductCombobox`/`LotProductCombobox` remain for single-kien cases.

**7. Condition catalog & reason presets: constants + String column, catalog+free-text.**
`frontend/src/constants/warehouseCatalogs.ts` exports `TINH_TRANG_OPTIONS` (7 items) and `LY_DO_XUAT_KHO_PRESETS`. Stored as `String` in `tinhTrang`/`lyDoXuatKho`; validation accepts any non-empty string but the UI offers the catalog as a datalist/select with a free-text fallback (same pattern as `MUC_DICH_PRESETS`). No lookup table needed now; can be promoted to `common` lookups later.

**8. Threshold & deviation: computed, not stored.**
Deviation `|actual - plan| / plan` per line; highlight red and require `ghiChu` when exceeding 10% (configurable). Deviation history is a read model aggregating `soLoKeHoach` vs `soLoThucTe` / `soKienKeHoach` vs `soKienThucTe` / `soLuongYeuCau` vs `soLuongThucTe` — no new table, just a query/service helper and a dashboard widget. Lock-after-print sets `daIn=true` on first successful print/xlsx; subsequent edits require ADMIN or explicit unlock.

## Risks / Trade-offs

- **JSON arrays for kien sets** → Simpler than a join table but not queryable via Prisma filters. Mitigation: keep per-kien rows as the source of truth; JSON arrays are derived/display copies only, not used for stock math.
- **Derived `soLoThucTe`** → If kien are spread across lots, the single `soLoThucTe` string must join multiple lot names. Mitigation: export joins distinct `tenLo` from the actual kien set; UI shows the joined value read-only.
- **Grouping ambiguity** → Grouping by `tenSanPham` alone could merge unrelated lines with the same name. Mitigation: group by `(tenSanPham, donViTinh, warehouseId)` or an explicit `productGroupId` if the caller supplies one; default is strict product+unit+warehouse.
- **Excel fidelity** → Pixel-perfect reproduction is brittle across Excel versions. Mitigation: match the original's column widths, merged ranges, borders, and print setup exactly; verify by opening the exported file in Excel/LibreOffice and printing.
- **QR size** → Too large breaks layout. Mitigation: small (60x60px) QR per kien, or one QR per product row encoding the joined kien list.
- **Migration on large prod** → Additive but touches two line tables. Mitigation: nullable columns, no backfill required for JSON arrays (default null), deploy with `migrate deploy` and verify row counts.

## Migration Plan

1. Add nullable columns to `WarehouseReceipt`, `WarehouseIssue`, `WarehouseReceiptItem`, `WarehouseIssueItem` in `business_production.prisma`; generate additive migration (`npx prisma migrate dev`); `npx prisma generate`.
2. No data backfill needed — existing slips get null for new fields; display falls back to existing columns (`tenLo`→`soLoThucTe`, `maKien`→`soKienThucTe` single, `soLuongThucTe` unchanged).
3. Deploy backend with new columns before frontend (reads tolerate null).
4. Rollback: drop added columns (or keep nullable — safe to leave).

## Open Questions

- None — KH/TT semantics (Q1-A, Q2-A), multi-kien grouping (DB per-kien, Excel grouped, lot derived, total auto-calc), catalog, and 8 improvements are all decided.
