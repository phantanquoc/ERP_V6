# Tasks

## 1. Schema & migration

- [ ] 1.1 Add `PurchaseRequest.tepDinhKem String[] @default([]) @map("tep_dinh_kem")` (keep `fileKemTheo`) and optional `ReplenishmentRequest.tepDinhKem String[] @default([])` in `backend/prisma/schema/business_production.prisma` and verify `backend && npx tsc --noEmit` still passes (types widen, no break)
- [ ] 1.2 Generate migration `npx prisma migrate dev --name add_tep_dinh_kem_to_purchase_and_replenishment` and run `npx prisma generate` and verify migration file creates `tep_dinh_kem text[] DEFAULT '{}'` columns ← (verify: `prisma migrate status` shows applied, `prisma generate` succeeds, `SELECT column_name FROM information_schema.columns` shows new columns)

## 2. Backend upload & append-only merge

- [ ] 2.1 Switch YCMH routes to multi-file upload: replace `createSingleUploadMiddleware('purchase-requests')` with `createUploadMiddleware('purchase-requests', 4).array('files', 4)` in `backend/src/routes/purchaseRequestRoutes.ts` and mirror for `replenishmentRequestRoutes.ts`, controller maps `req.files[]` (and compat `req.file`) to URLs via `getFileUrl`
- [ ] 2.2 Add `mergePurchaseAttachments`/`mergeReplenishmentAttachments` helpers mirroring `supplyRequestService.mergeAttachments` (read current `tepDinhKem` coalescing legacy `fileKemTheo`, cap `kept+incoming ≤ 4` → `ValidationError "tối đa 4 tệp"`, `renameAttachmentsByCode(folder, maYeuCau, incoming, kept.length+1)`, `deleteUploadedFile` for evicted URLs) and wire into `createPurchaseRequest` (post-maYeuCau rename) and `updatePurchaseRequest` (both item-transaction and header-only branches)
- [ ] 2.3 Relax `Hoàn thành` guard in `purchaseRequestService.updatePurchaseRequest` to allow `tepDinhKem` append and per-URL delete while still blocking `items`/`nhaCungCapId`/`giaDuKien`/`phanLoai`/`tenHangHoa`/`soLuong`/`ngayDuKienNhap`/`warehouseId`/`ghiChuVanChuyen`; keep `Đã hủy` fully file-locked, and verify with a unit test: `Hoàn thành` + new file → 200, `Hoàn thành` + new items → 400 ← (verify: existing `npm test` + new `src/__tests__/purchaseAttachments.test.ts` covering create/append/cap/legacy/hoàn thành guard all pass)

## 3. Aggregated chain attachments on reads

- [x] 3.1 Implement `resolvePurchaseChainAttachments` helper (own = `normalizeAttachments(pr)`, ybs via `ReplenishmentRequest.findFirst({ convertedPurchaseRequestId })`, yccc via direct `supplyRequestId` or `SupplyRequestDecision` hop, dedup order `yccc→ybs→own`) and batch variant for list; add shared `normalizeAttachments`/`collectAttachments` util
- [x] 3.2 Enrich `GET /api/purchase-requests` and `GET /api/purchase-requests/:id` (and YCBS/YCCC list/detail) responses with `aggregatedAttachments: { own, ybs, yccc, all }` and verify `GET /:id` for a chained ticket returns `all.length === yccc(2)+ybs(1)+own(1) == 4` and list rows carry the same envelope without N+1 (batch loads) ← (verify: integration test calling the three endpoints with a seeded chain asserts `aggregatedAttachments.all` contents and order)

## 4. Frontend multi-file & aggregated render

- [x] 4.1 Update `frontend/src/types/purchaseRequest.ts` and `frontend/src/services/purchaseRequestService.ts` to carry `tepDinhKem?: string[]` and send `FormData` with `files` array (keep `file` compat fallback)
- [x] 4.2 Rework `frontend/src/components/purchasing/PurchaseRequestAttachmentModal.tsx` to multi-file: show kept files with per-file delete, accept up to `4 - kept.length` new files, call `onSubmit(id, files[], keptUrls, removeUrls)` and cap at 4 with inline error
- [x] 4.3 Update detail/list renderers (`PurchaseRequestDetailModal.tsx`, `ReplenishmentDetailModal.tsx`, `SupplyRequestManagement.tsx`, `PurchaseRequestSubTabs.tsx`, `ReplenishmentList.tsx`) to render `aggregatedAttachments.all` (fallback `collectAttachments(pr, ybs, yccc)`) via `AttachmentList` and verify `frontend && npx tsc --noEmit -p tsconfig.app.json` passes and manual UI shows union count across chain ← (verify: `frontend tsc` 0 errors, manual check YCCC detail shows YCMH invoices and purchasing list chip shows aggregated count)

## 5. Tests, docs & verification

- [ ] 5.1 Add backend tests for YCBS attachments mirroring YCMH plus legacy `fileKemTheo` coalescing and `Đã hủy` lock, and run `cd backend && npm test -- --runInBand` green
- [ ] 5.2 Run full verification: `cd backend && npx tsc --noEmit`, `cd frontend && npx tsc --noEmit -p tsconfig.app.json`, `openspec validate --strict` (no spec length violations), and update `openspec/changes/fix-purchase-attachments/tasks.md` checkboxes ← (verify: all three commands pass, validate reports 0 errors)
