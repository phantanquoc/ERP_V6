## 1. Schema and migration

- [ ] 1.1 Add header fields to `WarehouseReceipt` and `WarehouseIssue` in `backend/prisma/schema/business_production.prisma`: `nguoiDeNghi` String?, `maNguoiDeNghi` String?, `boPhan` String?, `boPhanId` String?, `lyDoXuatKho` String? (issue only), `daIn` Boolean @default(false), `inLanDauAt` DateTime?
- [ ] 1.2 Add per-line fields to `WarehouseReceiptItem` and `WarehouseIssueItem`: `soLoKeHoach` String?, `soLoThucTe` String?, `soKienKeHoach` String? (JSON array of maKien), `soKienThucTe` String? (JSON array), `tinhTrang` String?, `quyCach` String?
- [ ] 1.3 Generate additive migration with `npx prisma migrate dev` and verify no DROP COLUMN; run `npx prisma generate` ← (verify: migration SQL is additive, new columns are nullable/defaulted, client exposes new delegates)

## 2. Backend — constants and utilities

- [ ] 2.1 Create `frontend/src/constants/warehouseCatalogs.ts` and `backend/src/constants/warehouseCatalogs.ts` (or shared) with `TINH_TRANG_OPTIONS` (7 items), `LY_DO_XUAT_KHO_PRESETS`, and helpers for catalog+free-text validation
- [ ] 2.2 Add deviation helpers in `backend/src/utils/warehouseSlipLines.ts` or new `warehouseDeviation.ts`: quantity deviation `|actual-plan|/plan`, kien/lot set-equality, threshold check (10% default configurable), and grouping helper for collapsing per-kien rows by product for export/print
- [ ] 2.3 Add configurable company/BM header constants (or `SystemSettings` keys) for company name/address/phone/fax, BM codes (`BM01-QT03`/`BM03-QT03`), and kien note

## 3. Backend — services

- [ ] 3.1 Extend `warehouseReceiptService.ts` and `warehouseIssueService.ts` line inputs with `soLoKeHoach`/`ThucTe`, `soKienKeHoach`/`ThucTe` (accept `string[]` in API, store as JSON string), `tinhTrang`, `quyCach`; handle grouped payload expansion (one entry with `soKienThucTe` array → N per-kien items) before the sequential-snapshot path; derive `soLoThucTe` from actual kien's lot when present
- [ ] 3.2 Auto-fill `nguoiDeNghi`/`boPhan` from `SupplyRequest` when `supplyRequestId` is present and those fields are blank; persist `lyDoXuatKho` on issue header
- [ ] 3.3 Update `getAll()`/`getById()` to return new header and per-line BM fields plus `daIn`/`inLanDauAt`; extend `isLocked` to include strict-print-lock when enabled
- [ ] 3.4 Add `markPrinted(id)` service method that sets `daIn=true`+`inLanDauAt` atomically on first call (idempotent)
- [ ] 3.5 Add deviation summary helper aggregating plan-vs-actual across KH/TT fields without a new table
- [ ] 3.6 Update `myHistoryService.ts` titles to include BM-aware multi-line form if needed ← (verify: stock still driven only by actual values, plan fields never affect LotProduct.soLuong)

## 4. Backend — xlsx export

- [ ] 4.1 Create `backend/src/services/warehouseSlipExportService.ts` using `exceljs` reproducing BM01/BM03 exactly: A4 landscape, fitToPage, margins 0, scale ~82, print area, 13 columns with widths matching original, two header rows (merged So lo/So kien/So luong + plan/actual sub-row), thin borders, Times New Roman, company header with embedded `abf-logo.png`, header fill, flexible rows, BM footer, kien note, QR per kien (via `qrcode` dep), signatures (3 for issue / 2 for receipt) ← (verify: exported file opens in Excel/LibreOffice and prints correctly on A4 landscape)
- [ ] 4.2 Add `qrcode` dependency if not present and wire QR generation (base64 PNG → exceljs image)
- [ ] 4.3 Handle grouped product rows: collapse per-kien DB rows into one Excel row with comma-joined maKien and summed quantities; plan vs actual in correct KH/TT column pairs

## 5. Backend — HTTP layer

- [ ] 5.1 Extend zod schemas in `backend/src/schemas/` for new header fields (`nguoiDeNghi`, `boPhan`, `lyDoXuatKho`, `daIn`) and per-line BM fields (`soLoKeHoach`/`ThucTe`, `soKienKeHoach`/`ThucTe` as string arrays, `tinhTrang`, `quyCach`)
- [ ] 5.2 Wire new fields through `warehouseReceiptController.ts` and `warehouseIssueController.ts` (create/update accept and return them)
- [ ] 5.3 Add `GET /api/warehouse-receipts/:id/export-xlsx` and `GET /api/warehouse-issues/:id/export-xlsx` plus `POST /:id/mark-printed` (or combine export with mark-printed) with role guard and error mapping
- [ ] 5.4 Verify all new/changed routes appear in `ROUTE_MAP` (`backend/src/routes/index.ts`) ← (verify: every endpoint returns `{ success, message, data }` and maps ValidationError/not-found/ConflictError to 400/404/409)

## 6. Frontend — data layer

- [ ] 6.1 Update `frontend/src/services/warehouseReceiptService.ts` and `warehouseIssueService.ts` types to include new header/per-line BM fields and export/mark-printed methods
- [ ] 6.2 Wire `EmployeeCombobox` + `useEmployeesForAssignment` for `nguoiDeNghi` (active non-admin searchable, auto-fills `boPhan` as department+subDepartment)

## 7. Frontend — shared components

- [ ] 7.1 Create `frontend/src/components/common/MultiKienPicker.tsx`: checklist of `maKien | tenLo | stock | unit` with search, "select all in lot" bulk toggle, emitting `string[]` of selected `lotProductId`
- [ ] 7.2 Add per-kien stock badges and threshold warning UI (deviation >10% highlight + require ghiChu) reusable across modals

## 8. Frontend — modals

- [ ] 8.1 Update `CreateWarehouseReceiptModal.tsx` and `EditWarehouseReceiptModal.tsx`: requester combobox + auto department, `mucDich` presets, condition select (7+free text), packaging free text, So lo KH/TT, multi-kien picker (So kien KH/TT), quantity KH/TT with auto-calc from selected kien, ghiChu placeholder, deviation warning
- [ ] 8.2 Update `EditWarehouseIssueModal.tsx` and `CreateWarehouseIssueModal.tsx` similarly with `lyDoXuatKho` presets instead of `mucDich`, plus the same per-line BM fields
- [ ] 8.3 Wire grouped payload: when a product row has multiple kien selected, send as one grouped entry or as N per-kien items consistently with the backend expansion contract

## 9. Frontend — tabs and print

- [ ] 9.1 Update `WarehouseReceiptTab.tsx` and `WarehouseIssueTab.tsx` (or unified view): new columns (Tinh trang, Quy cach, KH/TT indicators), filter by `tinhTrang`, "Đã in" badge, print and "Xuất Excel" actions per row
- [ ] 9.2 Redesign `WarehouseSlipPrintView.tsx` to BM-faithful layout: company header with logo, requester/department/reason/date, 13-column table with plan/actual splits, BM footer, kien note, QR per kien, signatures 3/2, `@media print` styles; trigger `mark-printed` on first print ← (verify: Vietnamese diacritics intact, 13 columns with correct KH/TT pairs, signatures 2 vs 3, logo visible, QR rendered)
- [ ] 9.3 Wire "Xuất Excel" button to call the xlsx endpoint and download the file; wire "In phiếu" to call mark-printed

## 10. Tests

- [ ] 10.1 Update `warehouseReceiptService.test.ts` and `warehouseIssueService.test.ts` for new header/per-line fields, grouped payload expansion, and derived `soLoThucTe`
- [ ] 10.2 Add test: create with `soKienKeHoach` != `soKienThucTe` — only actual kien set is validated/mutated
- [ ] 10.3 Add test: update/delete still uses actual quantities only for stock math
- [ ] 10.4 Add test: `markPrinted` idempotency and `daIn` flag on export/print
- [ ] 10.5 Add test: deviation helpers (quantity threshold, set equality)
- [ ] 10.6 Add test: export service produces a workbook with expected sheet structure (headers, merged ranges, column count) ← (verify: plan values never affect stock; grouped rows expand correctly; daIn is set exactly once)

## 11. Verification

- [ ] 11.1 `cd backend && npx tsc --noEmit` — zero errors
- [ ] 11.2 `cd backend && npm run lint`
- [ ] 11.3 `cd backend && npm test` — warehouse tests pass
- [ ] 11.4 `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — zero errors, no TS2304
- [ ] 11.5 `cd frontend && npm run lint`
- [ ] 11.6 Manual: create/edit/print/export both slip types; verify xlsx opens and prints on A4 landscape, QR visible, 13 columns, flexible rows
