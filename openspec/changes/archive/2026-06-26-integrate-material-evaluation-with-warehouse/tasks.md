## 1. Database Schema

- [x] 1.1 Edit `backend/prisma/schema/business_production.prisma`: add `lotProductId String?` and matching `lotProduct LotProduct? @relation(...)` (onDelete: SetNull) on `MaterialEvaluation`.
- [x] 1.2 In the same file, add `warehouseIssueId String? @unique` and matching `warehouseIssue WarehouseIssue? @relation(...)` (onDelete: SetNull) on `MaterialEvaluation`, plus `@@index([lotProductId])`.
- [x] 1.3 Add reverse relation `materialEvaluations MaterialEvaluation[]` on `LotProduct` in the same file (or the file that owns `LotProduct`).
- [x] 1.4 Add reverse relation `materialEvaluation MaterialEvaluation?` on `WarehouseIssue` in the same file (or the file that owns `WarehouseIssue`).
- [x] 1.5 Run `cd backend && npx prisma migrate dev --name add_lotproduct_warehouseissue_to_material_evaluation` to generate the migration file.
- [x] 1.6 Run `cd backend && npx prisma generate` to refresh the Prisma client. ← (verify: migration applies cleanly, generated client compiles, no breaking changes to existing models)

## 2. Seed Raw Materials

- [x] 2.1 In `backend/prisma/seed-business.ts`, add idempotent `upsert` calls for NL-001 (Mít tươi), NL-002 (Chuối tươi), NL-003 (Khoai lang tươi), NL-004 (Xoài tươi), NL-005 (Sầu riêng), NL-006 (Đậu phộng sống), NL-007 (Khoai môn), NL-008 (Dứa tươi). Each row: `loaiSanPham: 'Nguyên liệu thô'`, `donViTinh: 'kg'`.
- [x] 2.2 Run the seed command (per the project's seed setup) and verify the eight rows exist with the expected fields. ← (verify: seed is idempotent on re-run; all eight rows present with correct loaiSanPham)

## 3. Backend Services

- [x] 3.1 In `backend/src/services/internationalProductService.ts`, add `getRawMaterials()` returning `InternationalProduct[]` filtered by `loaiSanPham = 'Nguyên liệu thô'`, ordered by `maSanPham` ascending.
- [x] 3.2 In `backend/src/services/lotProductService.ts`, add `getLotsByProduct(internationalProductId: string)` returning distinct `Lot[]` (with `warehouse` relation) where at least one `LotProduct` row for the product has `soLuong > 0`.
- [x] 3.3 In the same file, add `getKienByProductAndLot(internationalProductId: string, lotId: string)` returning `LotProduct[]` with `internationalProduct` and `lot.warehouse` relations, filtered to `soLuong > 0`.
- [x] 3.4 In `backend/src/services/materialEvaluationService.ts`, rewrite `createMaterialEvaluation`: accept new optional fields `lotProductId`, `warehouseId`, `lotId` plus required `employeeId`/`maNhanVien`/`tenNhanVien` payload. Inside `prisma.$transaction`: read `LotProduct` (with `internationalProduct`, `lot.warehouse`), throw `NotFoundError` if missing, throw `ValidationError` if `soLuong < khoiLuong`, generate `maPhieuXuat` via `warehouseIssueService.generateCode()`, create `WarehouseIssue` with prefix `"[TỰ ĐỘNG] Xuất nguyên liệu cho mẻ chiên {maChien} ngày {dd/mm/yyyy}"` and snapshot fields, decrement `LotProduct.soLuong`, create `MaterialEvaluation` with `lotProductId` + `warehouseIssueId` + snapshots into `tenHangHoa` (from `internationalProduct.tenSanPham`) and `soLoKien` (composed from `lot.tenLo` + last segment of `lotProductId`).
- [x] 3.5 In the same file, rewrite `deleteMaterialEvaluation`: keep existing cascade of `QualityEvaluation`, `FinishedProduct`, `SystemOperation` by `maChien` inside the transaction; additionally, if `warehouseIssueId` is set, look up the `WarehouseIssue`, refund `WarehouseIssue.soLuongXuat` back into `LotProduct.soLuong` only if the `LotProduct` row still exists, then delete the `WarehouseIssue` row; finally delete the `MaterialEvaluation` row.
- [x] 3.6 In the same file, ensure `updateMaterialEvaluation` cannot mutate `khoiLuong`, `lotProductId`, or `warehouseIssueId` — strip these from the incoming payload before the Prisma update. ← (verify: transactional create + delete behave atomically; concurrent oversell rejected; legacy rows without warehouseIssueId still delete cleanly)

## 4. Backend Controllers & Routes

- [x] 4.1 In `backend/src/controllers/internationalProductController.ts`, add `getRawMaterials` handler that calls the service and returns `{ success: true, data }`.
- [x] 4.2 In `backend/src/controllers/lotProductController.ts`, add `getLotsByProduct` and `getKienByProductAndLot` handlers reading query params, validating presence (throw `ValidationError` if missing), and returning the standard response shape.
- [x] 4.3 In `backend/src/routes/internationalProductRoutes.ts`, register `GET /raw-materials` BEFORE any `:id` parameterized route so it is not shadowed.
- [x] 4.4 In `backend/src/routes/lotProductRoutes.ts`, register `GET /lots` and `GET /kien` with query-param contract; ensure both come before any `:id` routes.
- [x] 4.5 Verify `backend/src/routes/index.ts` ROUTE_MAP picks up the new endpoints (no manual entry needed if the existing route files are already mounted — just confirm via server logs). ← (verify: all three endpoints return 200 with seeded data; missing query params return 400 with Vietnamese messages; route ordering does not shadow new endpoints)

## 5. Frontend Service Types

- [x] 5.1 In `frontend/src/services/internationalProductService.ts`, add the TypeScript types for the raw-material response and a `getRawMaterials()` method calling `GET /international-products/raw-materials`.
- [x] 5.2 In `frontend/src/services/lotProductService.ts`, add types and methods `getLotsByProduct(internationalProductId)` and `getKienByProductAndLot(internationalProductId, lotId)` calling the new endpoints with query params.

## 6. Frontend Hooks

- [x] 6.1 Create `frontend/src/hooks/useRawMaterials.ts` wrapping `getRawMaterials` with a query-key factory `{ all, list }` matching the existing convention.
- [x] 6.2 Create `frontend/src/hooks/useLotsByProduct.ts` wrapping `getLotsByProduct`, with `enabled: !!internationalProductId` and a query key including the product id.
- [x] 6.3 Create `frontend/src/hooks/useKienByProductAndLot.ts` wrapping `getKienByProductAndLot`, with `enabled: !!internationalProductId && !!lotId` and a query key including both ids. ← (verify: hooks follow the project's TanStack Query factory pattern; cache keys are stable; `enabled` guards prevent calls with missing params)

## 7. Frontend Component

- [x] 7.1 In `frontend/src/components/MaterialEvaluationManagement.tsx`, replace the three free-text inputs (around lines 664-707) with: Select "Sản phẩm nguyên liệu" (from `useRawMaterials`), Select "Lô" (from `useLotsByProduct(productId)`, disabled when no product), Select "Kiện" (from `useKienByProductAndLot(productId, lotId)`, disabled when no lot, labels show `${tenLo}-${id.slice(-4)} • Tồn: ${soLuong} ${donViTinh}`), and a numeric Input "Khối lượng xuất (kg)" bounded by the chosen package's `soLuong`.
- [x] 7.2 Manage local state `productId`, `lotId`, `lotProductId`. Reset child state when parent changes (changing product clears lot + kien; changing lot clears kien).
- [x] 7.3 Add inline validation displaying `"Vượt quá tồn kho (X kg)"` when entered quantity exceeds `selectedKien.soLuong`; disable submit when validation fails.
- [x] 7.4 On submit, send `lotProductId` plus existing fields. After a successful response, invalidate `materialEvaluationKeys.lists()`, `lotProductKeys.lists()` (or its equivalent), and `warehouseIssueKeys.lists()` so other parts of the UI refresh stock counts.
- [x] 7.5 When editing an existing Material Evaluation (the existing edit modal), hide the quantity input entirely so users cannot attempt to mutate it. Display the original snapshot fields as read-only. ← (verify: full create flow with cascading dropdowns works end-to-end; legacy rows render via snapshot fields; quantity is immutable on edit; stock-out invalidation refreshes other views)

## 8. Verification

- [x] 8.1 Run `cd backend && npx tsc --noEmit` — must pass with zero errors.
- [x] 8.2 Run `cd backend && npm run lint` — fix any new lint issues introduced by this change.
- [x] 8.3 Run `cd backend && npm test` — all existing tests must still pass; no regressions.
- [x] 8.4 Run `cd frontend && npx tsc --noEmit` — must pass with zero errors.
- [x] 8.5 Run `cd frontend && npm run lint` — fix any new lint issues introduced by this change. ← (verify: every check above passes; no out-of-scope errors auto-fixed; pre-existing failures reported but not modified)
