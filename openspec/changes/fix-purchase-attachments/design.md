# Design: fix-purchase-attachments

## Context

Current state (see proposal.md — Why):
- YCCC (`business.SupplyRequest.tepDinhKem String[]`) is 4-file append-only with `renameAttachmentsByCode(...)+mergeAttachments` and `createUploadMiddleware('supply-requests',4).array('files',4)`.
- YCMH (`business.PurchaseRequest.fileKemTheo String?`) and YCBS (`business.ReplenishmentRequest.fileKemTheo String?`) are single-file, `createSingleUploadMiddleware().single('file')`, overwritten on update, never renamed to `{maYeuCau}-k.ext`.
- Reads: `getAllPurchaseRequests`/`getPurchaseRequestById` include `supplyRequest` but frontend `collectAttachments(pr, pr.supplyRequest)` misses the YCBS hop (`ReplenishmentRequest.convertedPurchaseRequestId → SupplyRequestDecision → SupplyRequestItem`), so YCCC view never shows YCMH invoices. The fallback `fileKemTheo` is a single URL, not an array.
- Guard: `updatePurchaseRequest` while `Hoàn thành` allows only `fileKemTheo` + header scalars; `Đã hủy` blocks files too — must be widened for append/delete semantics.

## Goals / Non-Goals

**Goals:**
- YCMH/Y CBS parity with YCCC: 4 files, code-based names, append/delete, no silent overwrite.
- Any detail/list in the chain (YCCC, YCBS, YCMH, warehouse receipt/inbound) renders the union without frontend fan-out.
- One migration, no data loss; legacy `fileKemTheo` rows remain readable.

**Non-Goals:**
- New storage backend or virus scan.
- Retrofitting `PurchaseRequestItem`-level attachments.
- Automatic backfill renaming of already-stored legacy files (they keep current URLs; new files follow the new pattern).

## Decisions

### 1. Schema — additive `tepDinhKem` on PurchaseRequest (+ optional on ReplenishmentRequest)
- **Choice:** `business_production.prisma`: `PurchaseRequest { tepDinhKem String[] @default([]) @map("tep_dinh_kem") }` keep `fileKemTheo String?` unchanged. `ReplenishmentRequest` gets the same column for symmetry; if product prefers single-file there, keep `fileKemTheo` as sole column and normalize it to `aggregatedAttachments` only — decision recorded here: **add it too** (cost is one column, unifies helpers).
- **Alt:** keep single string and fold multi-file via split — rejected (brittle, breaks `collectAttachments`).
- **Migration:** manual `prisma migrate dev --name add_tep_dinh_kem_to_purchase_and_replenishment`; `prisma generate`.

### 2. Upload — array field `files`
- **Choice:** `purchaseRequestRoutes.ts` / `replenishmentRequestRoutes.ts`: `createUploadMiddleware('purchase-requests', 4).array('files',4)` (and `'replenishment-requests'`). Controller reads `req.files` (array) and also accepts `req.file` (singular) as `[req.file]` for compat. `getFileUrl` mapping unchanged; `renameAttachmentsByCode` reused.
- **Alt:** keep `.single('file')` + multiple round-trips — rejected (races numbering).

### 3. Service merge — `mergePurchaseAttachments` / `mergeReplenishmentAttachments`
- **Choice:** Mirror `supplyRequestService.mergeAttachments(id, maYeuCau, incoming): Promise<string[]>`:
  1. Read current `tepDinhKem` (and coerce `fileKemTheo` → `[fileKemTheo]` if `tepDinhKem` empty for legacy rows).
  2. Support selective delete: caller may send `keptUrls?: string[]` or `removeUrls?: string[]`; merge = `kept (dedup, preserve order)` then `renameAttachmentsByCode(..., incoming, kept.length+1)`.
  3. Cap `kept.length+incoming.length ≤ 4` → `ValidationError`.
  4. `deleteUploadedFile` for every evicted URL under `uploads/purchase-requests/` (or `replenishment-requests/`).
- Called from both create path (post-`maYeuCau` generation, before return) and `updatePurchaseRequest` (inside item-transaction when items present, else header-only branch; same shape as `updateSupplyRequest` file branch).
- **Alt:** persist raw names and rename lazily on read — rejected (N concurrent renames).

### 4. Hoàn thành / Đã hủy guard
- **Choice:** `updatePurchaseRequest`:
  - `Hoàn thành`: inspect payload; if it touches `items`/`nhaCungCapId`/`giaDuKien`/`phanLoai`/`tenHangHoa`/`soLuong`/`ngayDuKienNhap`/`warehouseId`/`ghiChuVanChuyen` → 400. If it touches only `tepDinhKem`/`fileKemTheo` (legacy) — allow via merge. Also allow `ghiChu`-class scalars as before.
  - `Đã hủy`: no file mutation (kept as-is) — `ValidationError` if `tepDinhKem`/`files` present.
  - `Đã hủy` guard currently already blocks files; widen `Hoàn thành` branch to allow `tepDinhKem` but not inside the "touches* → 400" check.

### 5. Aggregated chain — single helper, reused by all reads
- **Choice:** New helper `resolvePurchaseChainAttachments(purchaseRequestId| Row): Promise<{ own: string[], ybs: string[]|null, yccc: string[], all: string[] }>`:
  - Given a PR: own = `normalizeAttachments(pr)` (`tepDinhKem ?? ([fileKemTheo] ?? [])`), ybs = via `replenishmentRequest.findFirst({ convertedPurchaseRequestId: pr.id })` → `normalizeAttachments(ybs)`, yccc = `pr.supplyRequestId` direct else via `SupplyRequestDecision` hop (`findMany { triggeredPurchaseRequestId|triggeredReplenishmentRequestId } → SupplyRequestItem → SupplyRequest`) → `normalizeAttachments(sr)`. De-dup preserving yccc→ybs→own order.
  - Phases: PR list/detail includes `aggregatedAttachments`; YCCC/Y CBS list/detail include symmetric helper (YCCC: own+ybs?+ymch; YCBS: own+yccc[+ymch if converted]).
  - List path: batch-load — one `findMany` for YCBS links + one for SR attachments to avoid N+1.
- **Alt:** store denormalized union on write — rejected (update fan-out, stale).
- **Reuse:** `AttachmentList` helper `collectAttachments` gains explicit `all` pass-through; `normalizeAttachments` extracted to `common/attachmentUtils.ts`.

## Risks / Trade-offs

- **Orphan files on disk when legacy `fileKemTheo` rows are later appended to:** old file stays at random name (no rename). Mitigation: document as non-goal; optional offline script can rename later.
- **Batch list must not N+1 Prisma:** → batch helpers above; add test counting Prisma calls if possible.
- **Backward compat:** controllers accept both `file` and `files`; service treats `fileKemTheo` string payload as one-element array when `tepDinhKem` absent.
- **`typecheck` strictness:** keep `fileKemTheo` on `PurchaseRequest` type (deprecated) so existing `pr.fileKemTheo` refs still compile; new code prefers `tepDinhKem`.

## Migration Plan

1. `prisma/migrate dev` adds `tep_dinh_kem text[]` columns (default `[]`).
2. `prisma generate`.
3. Deploy; no backfill required. Reads coalesce `tepDinhKem || [fileKemTheo]`.
4. Rollback: drop columns (`migrate dev` revert) — no data loss beyond newly added array URLs (they live on disk; DB rows remain readable via `fileKemTheo` fallback if needed).

## Open Questions

- Confirm YCBS should also become 4-file (proposal says yes for symmetry). If team wants YCBS to stay single-file, drop the YCBS `tepDinhKem` column and only aggregate `fileKemTheo` there — design holds either way.
