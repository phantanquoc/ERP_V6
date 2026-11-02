# Proposal

## Why

Repair requests (YCSC) look like they support file attachments — the form renders a multi-file picker — but the files are silently discarded: the backend accepts only one file, the `file` state is never set, and `RepairRequest` has no multi-file column. Meanwhile, material shortages discovered *during* repair have no path to a supply request (YCCC): all YCCC creation flows run only at YCSC creation time, so technicians must leave the repair slip to raise a YCCC by hand, and YCCCs raised inside the repair form are created without attachments unlike hand-made ones.

## What Changes

- **Multi-file attachments for YCSC (max 4)** — add `RepairRequest.tepDinhKem String[]` (additive migration, legacy `fileDinhKem` kept), switch `POST/PUT /api/repair-requests` to a 4-file upload middleware, merge+cap new files into existing ones on update (mirrors `InspectionRequest`), and wire the already-present frontend picker (create/edit/view) so files actually persist.
- **"Vật tư phát sinh" block inside the Chi phí phát sinh panel** — an embedded YCCC-style goods editor (device row + catalog product picker + qty + unit + up to 4 attachments) available in YCSC view mode; on save it creates a YCCC (purpose `Phát sinh cho <maYeuCau>`), links it via `RepairSupplyLink`, records `RepairMaterialNeed` rows against the chosen device items, refreshes cost/supply queries, and opens the new YCCC in the existing inline `SupplyRequestDetailModal`.
- **"Tạo YCCC ngay" shortcut** on the existing "Chưa tạo YCCC" warning that opens the new block.
- **Attachments for YCCCs created from the repair form** — the create-time YCCC section gains a ≤4-file picker passed to `createSupplyRequest(data, files)`, so auto-created YCCCs carry attachments like hand-made ones.

## Capabilities

### New Capabilities
- `repair-request-attachments`: multi-file attachments (max 4) on repair requests — schema, upload API, append-on-update merge with cap, and create/edit/view wiring.
- `repair-context-yccc-creation`: creating supply requests from inside the repair slip — create-time YCCC with attachments, execution-time "phát sinh" YCCC (validation, creation order, RBAC gating, status guard, link + material-need recording, query refresh, inline detail open).

### Modified Capabilities
<!-- none — no existing spec requirement changes -->

## Impact

- **Schema**: `backend/prisma/schema/common.prisma` (`RepairRequest.tepDinhKem`) — additive migration on the `common` god schema, then `prisma generate`.
- **Backend**: `backend/src/routes/repairRequestRoutes.ts` (single → 4-file multer), `backend/src/controllers/repairRequestController.ts` (map `req.files` on create/update), `backend/src/services/repairRequestService.ts` (cap/merge `tepDinhKem`).
- **Frontend**: `frontend/src/services/repairRequestService.ts` (`files?: File[]` instead of `file`), `frontend/src/hooks/useRepairRequests.ts` (mutation contract `file` → `files` follow-through on create/update), `frontend/src/components/RepairRequestFormModal.tsx` (remove dead `selectedFile`, pass `selectedFiles`, YCCC-section file picker, extract shared goods editor + requester resolver, new phát-sinh block + shortcut + invalidations).
- **API contract**: `POST/PUT /api/repair-requests` now accept `files[]` (≤4); response shape unchanged.
- **Not affected**: cost math (`cost-summary`), YCCC lifecycle/status rules, `SupplyRequestDetailModal` (already renders attachments), acceptance handover uploads.
