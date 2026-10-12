# Proposal: fix-purchase-attachments

## Why

YCCC already supports 4-file append-only attachments renamed to `YC-CC-YYYY-NNN-k.ext`; YCMH/Y CBS still cap at a single `fileKemTheo` string that is overwritten on update, not renamed, and not visible when viewing the chain from any entry point. Purchasing users lose invoices when replacing a file, filenames are random, and the warehouse cannot see YCMH invoices from the YCCC view — the opposite of the requested "every ticket in the YCCC→YCBS→YCMH→warehouse chain shows the union of all files."

## What Changes

- **Prisma schema**: Add `PurchaseRequest.tepDinhKem String[] @default([]) @map("tep_dinh_kem")` (keep `fileKemTheo String?` as legacy alias for old rows). Optionally add the same column to `ReplenishmentRequest` for symmetry. No destructive migration; backfill is app-level.
- **YCMH/Y CBS upload**: Replace `createSingleUploadMiddleware('purchase-requests')` with `createUploadMiddleware('purchase-requests', 4).array('files',4)` (and matching YCBS folder). Controller maps `req.files[]` → URL array; service merges via `renameAttachmentsByCode('purchase-requests', maYeuCau, incoming, kept.length+1)`.
- **Append-only merge, max 4, code-based rename**: New `mergePurchaseAttachments` / `mergeReplenishmentAttachments` mirroring `supplyRequestService.mergeAttachments` — keep stored files, rename incoming to `YC-MH-YYYY-NNN-k.ext` (or `YC-BS-...`), cap total at 4 (`ValidationError` if exceeded). `deleteUploadedFile` unused URLs on replace; `complete`/`Hoàn thành` still respects the cap.
- **Hoàn thành guard relaxed for attachments**: `updatePurchaseRequest` while `trangThai === 'Hoàn thành'` now allows `tepDinhKem` append and selective delete (remove by URL) but still blocks `items`/`nhaCungCapId`/`giaDuKien`/`soLuong`/`phanLoai`/`tenHangHoa`/`ngayDuKienNhap`/`warehouseId`/`ghiChuVanChuyen`. Same for `Đã hủy` (no file mutation).
- **Aggregated chain view (B2)**: `GET /api/purchase-requests/:id` and `GET /api/purchase-requests` enrich each PR with `aggregatedAttachments: { own: string[], ybs: string[]|null, yccc: string[], all: string[] }` resolved via `ReplenishmentRequest.convertedPurchaseRequestId → SupplyRequestDecision → SupplyRequestItem.supplyRequestId → SupplyRequest.tepDinhKem` and `PurchaseRequest.supplyRequestId`. List/detail for YCCC and YCBS similarly include the full chain so any tab shows the union without frontend fan-out.
- **Frontend**: `PurchaseRequestAttachmentModal` becomes multi-file (up to 4, shows kept + incoming, delete per-file), `FileUpload` wiring switches from `.single('file')` to `.array('files')`. `purchaseRequestService.updatePurchaseRequest` sends `FormData` with `files` array; detail modals render `aggregatedAttachments.all` (or `collectAttachments(pr, ybs, yccc)` as fallback) via `AttachmentList`.

## Capabilities

### New Capabilities
- `purchase-request-attachments`: Multi-file attachment lifecycle for YCMH/Y CBS — code-based rename, append-only merge, max 4, per-file delete, and aggregated chain visibility.

### Modified Capabilities
- `purchase-request-multi-item`: Requirement "items locked after approval" is narrowed — attachment files remain mutable (append/delete) even at `Hoàn thành`; all other item/pricing/schedule locks stay.
- `supply-replenishment-routing`: Chain visibility — every PR/Y CBS/YCCC read surface SHALL expose the aggregated attachment union across YCCC→YCBS→YCMH, not just the local row.

## Impact

- **Backend**: `business_production.prisma`, `purchaseRequestService.ts`, `replenishmentRequestService.ts`, `purchaseRequestController.ts`, `replenishmentRequestController.ts`, `purchaseRequestRoutes.ts` / `replenishmentRequestRoutes.ts`, `middlewares/upload.ts` (no change, reused), `prisma/migrations/*`.
- **Frontend**: `types/purchaseRequest.ts`, `services/purchaseRequestService.ts`, `components/purchasing/PurchaseRequestAttachmentModal.tsx`, `components/purchasing/PurchaseRequestDetailModal.tsx`, `components/ReplenishmentDetailModal.tsx`, `components/SupplyRequestManagement.tsx`, `components/common/AttachmentList.tsx` (minor helper).
- **DB**: Additive columns only; legacy `fileKemTheo` retained and surfaced via `collectAttachments` fallback until backfilled.
