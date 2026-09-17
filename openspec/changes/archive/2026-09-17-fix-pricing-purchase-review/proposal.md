## Why

The Pricing Room purchase-review tab (`PurchaseRequestReviewTab`) approves purchase requests by trusting client-supplied `nguoiDuyet`/`ngayDuyet` via generic `PUT /purchase-requests/:id`. Frontend falls back to the hardcoded string "Phòng giá thành", so every approval — including by ADMIN — records the same value, breaking audit, list display, CSV export, and notifications. The detail modal also uses non-standard labels ("Sản phẩm"/"Tên hàng"), a nested `max-h-64` scroll that traps wheel events, and an action column that redundantly re-renders status.

## What Changes

- **Backend approval source-of-truth:** `PUT /purchase-requests/:id` when `trangThai` is `Đã duyệt` or `Từ chối` ignores client `nguoiDuyet`/`ngayDuyet` and derives them server-side from `prisma.user.findUnique(actorId)` → `${lastName} ${firstName}`.trim() || email, `ngayDuyet = now()` (same pattern as `cancelPurchaseRequest`). Keeps `nguoiDuyet String?` — no migration.
- **Frontend approval calls:** `PurchaseRequestReviewTab.doApprove`/`doReject` send only `{trangThai}`; no `nguoiDuyet`/`ngayDuyet` from client.
- **Detail modal labels:** "Sản phẩm (n)" → "Danh sách hàng hóa (n)", "Tên hàng" → "Tên hàng hóa" (aligns with `CreatePurchaseRequestModal`/`SupplyRequestManagement`).
- **Detail modal scrolling:** Remove nested `max-h-64 overflow-hidden overflow-auto` inner scroll; keep single outer `overflow-y-auto flex-1` as the only vertical scroll, wrapper table uses `overflow-x-auto` only; `thead sticky` adheres to outer scroll.
- **Action column:** Replace text buttons with `lucide-react` icons `Eye` (detail, blue), `Check` (approve, green), `XCircle` (reject, red) — `p-1.5 rounded-md title + aria-label`; remove `text-xs text-gray-400 px-2` branches (`—` / `{st}`); when `!isPending` show only `Eye`; when `isPending && !canApprove` show `Eye` + disabled muted icons with tooltip. Decisions Q1:C, Q2:B, Q4:A.
- **Table polish:** `isPending` via strict `trangThai` equality (not `includes`), badge tones aligned to system; no new FK `nguoiDuyetId` in this change.

## Capabilities

### New Capabilities
- (none — bug fix and UI alignment within existing capability)

### Modified Capabilities
- `pricing-room-review-tabs`: approval audit correctness, detail modal labels/scroll, action column iconography

## Impact

- **Backend:** `backend/src/services/purchaseRequestService.ts` (`updatePurchaseRequest`), `backend/src/controllers/purchaseRequestController.ts` (actor injection — already present), optionally `backend/src/routes/purchaseRequestRoutes.ts` if a dedicated `POST /:id/approve` is introduced (kept optional; tightening `PUT` suffices).
- **Frontend:** `frontend/src/components/general/pricing/PurchaseRequestReviewTab.tsx` (approval calls, labels, scroll, action icons); `frontend/src/index.css` only if wrapper rounding needs adjustment.
- **No migration**, no new dependencies (`lucide-react` already used). Out of scope: adding `nguoiDuyetId` FK, changes to other tabs.
