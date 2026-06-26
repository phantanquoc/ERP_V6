## 1. Prisma schema + migration

- [x] 1.1 Add `internationalProductId String?` to `FinishedProduct` in `business_production.prisma` with relation to `InternationalProduct` (`onDelete: SetNull`), following the existing `machineSystem`/`materialEvaluation` relation pattern
- [x] 1.2 Add `@@index([internationalProductId])` on `FinishedProduct`
- [x] 1.3 Add the reverse relation field on `InternationalProduct` in `business_orders.prisma` (e.g. `finishedProducts FinishedProduct[]`)
- [x] 1.4 Run `npx prisma migrate dev` to create + apply the migration, then `npx prisma generate` ← (verify: migration runs cleanly, FK is nullable, existing rows null, prisma client regenerated)

## 2. Backend — finished-product warehouse receipt

- [x] 2.1 Define a code-owned `GRADE_LABELS` constant mapping each of the 8 grade fields (aKhoiLuong→"Loại A", bKhoiLuong→"Loại B", bDauKhoiLuong→"Loại B Dầu", cKhoiLuong→"Loại C", vunLonKhoiLuong→"Vụn lớn", vunNhoKhoiLuong→"Vụn nhỏ", phePhamKhoiLuong→"Phế phẩm", uotKhoiLuong→"Ướt")
- [x] 2.2 In `finishedProductService`, add a builder that loads a `FinishedProduct` (by id/maChien), reads its 8 grade weights, skips grades = 0, and returns up to 8 `CreateReceiptInput` rows with `tenSanPham = "{base tenHangHoa} - {label}"` and `soLuongNhap = grade weight` (throw `NotFoundError` if the finished product is missing)
- [x] 2.3 Add a service method that accepts warehouseId, lotId, employee context, and the user-confirmed rows (with possibly edited quantities), validates warehouse/lot/rows present (throw `ValidationError` otherwise), generates a receipt code, and delegates to `warehouseReceiptService.batchCreate`
- [x] 2.4 Add controller (HTTP only, no Prisma) returning the standard `{success, message?, data?}` shape with Vietnamese messages
- [x] 2.5 Add route and register it in ROUTE_MAP (`backend/src/routes/index.ts`); confirm it is NOT a generic `PATCH /status` ← (verify: route appears in ROUTE_MAP, controller has no Prisma calls, batchCreate increments LotProduct.soLuong atomically)

## 3. Backend — output statistics

- [x] 3.1 Implement `getOutputStatistics(filters)` in `finishedProductService` aggregating by date + product + 8 grades + machine, with required date range and optional product/machine filters
- [x] 3.2 Compute good output (A + B + B Dầu + C + vụn lớn + vụn nhỏ) vs scrap (phế phẩm + ướt) in the statistics layer only; do NOT change `tongKhoiLuong` or receipt behavior
- [x] 3.3 Remove the dead `getTotalWeightByDate` method and confirm no remaining references
- [x] 3.4 Add controller + route + ROUTE_MAP registration for the statistics endpoint (dates accepted as `YYYY-MM-DD`) ← (verify: getTotalWeightByDate fully removed, statistics groups match spec dimensions, empty range returns success with empty data)

## 4. Backend — audit fixes

- [x] 4.1 Add active-machine validation to `createSystemOperation` (`systemOperationService`): throw `ValidationError` when the target machine `trangThai !== HOAT_DONG` ← (verify: single-create rejects stopped machines, bulk path behavior unchanged)
- [x] 4.2 Unify machine-eligibility criteria as a single source of truth on backend (`loaiHeThong ∈ {SAN_XUAT, DONG_GOI, BAO_QUAN}` + `trangThai = HOAT_DONG`); expose what the frontend needs so it stops relying on the `^HT-CCK-(\d+)$` regex
- [x] 4.3 Trace the PUT/PATCH inconsistency on production update endpoints and the dropped `danhGiaTongQuan` field; fix so updates preserve `danhGiaTongQuan` (QualityEvaluation/MaterialEvaluation flow) ← (verify: update round-trip preserves danhGiaTongQuan, verb usage consistent)

## 5. Frontend — finished-product receipt UI

- [x] 5.1 Add finished-product receipt types to the relevant service module (no direct apiClient in components)
- [x] 5.2 Add a TanStack-Query hook for finished-product receipt that, on success, invalidates warehouse + finished-product + lot-product queries (query-key factory pattern)
- [x] 5.3 Build the receipt modal: pre-fill nonzero grade rows (label + quantity), manual warehouse + lot selectors (reuse `useWarehouses` / pattern from `CreateWarehouseReceiptModal.tsx`), editable/removable quantity rows, react-hook-form + zod validation, Vietnamese text, loading/error/empty/success states
- [x] 5.4 Add the "Nhập kho" button on `FinishedProductManagement.tsx` wiring the modal to a finished product ← (verify: modal pre-fills correctly, confirm without warehouse/lot blocks submit, success invalidates caches)

## 6. Frontend — output statistics UI

- [x] 6.1 Add output-statistics types + a TanStack-Query hook (query-key factory; dates sent as `YYYY-MM-DD`)
- [x] 6.2 Build the statistics table component with date-range + optional product/machine filters, dates displayed `DD/MM/YYYY`, Vietnamese text, loading/error/empty/success states ← (verify: table breaks down by date/product/grade/machine, empty filters show empty state not error)

## 7. Frontend — audit fixes

- [x] 7.1 Update `useActiveFryerMachineSystems` (`useMachineSystemDetails.ts`) to use the unified backend criteria instead of the hardcoded regex; audit consumers (e.g. `SystemOperationManagement.tsx`) first so the machine set does not silently change ← (verify: SystemOperation create flow still lists the expected active machines)
- [x] 7.2 Add TanStack-Query hooks (query-key factory) for the 5 production entities currently called directly: SystemOperation, FinishedProduct, QualityEvaluation, MaterialEvaluation, ProductionReport

## 8. Manual follow-up (surface only — do NOT auto-execute)

- [x] 8.1 Surface to the user: the dead `product_batches` table drop is destructive — list it for manual confirmation; do NOT drop it in any automated migration
- [x] 8.2 Surface to the user: the duplicate production-data page (`ProductionData.tsx` /production/data vs `ProductionDepartment.tsx` /production/management) — confirm no remaining route/link references before any manual removal

## 9. Verification

- [x] 9.1 `cd backend && npx tsc --noEmit` (MUST pass) and `npm test`
- [x] 9.2 `cd frontend && npx tsc --noEmit` (MUST pass)
- [x] 9.3 Confirm new routes appear in server logs / ROUTE_MAP and the receipt + statistics endpoints respond with the standard shape ← (verify: full backend+frontend type-check clean, tests green, endpoints registered)
