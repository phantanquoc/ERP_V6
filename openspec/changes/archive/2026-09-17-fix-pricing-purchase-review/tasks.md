## 1. Backend — server-derived approver identity

- [x] 1.1 Update `backend/src/services/purchaseRequestService.ts` — in `updatePurchaseRequest`, when `trangThai` is `Đã duyệt` or `Từ chối`, ignore client `nguoiDuyet`/`ngayDuyet` and derive server-side: `prisma.user.findUnique({where:{id: actorId}})` → `nguoiDuyet = \`${lastName} ${firstName}\`.trim() || email`, `ngayDuyet = new Date()`; mirror `cancelPurchaseRequest` pattern; keep `updateData.trangThai` validation via `ALLOWED_TRANSITIONS`
- [x] 1.2 Ensure `backend/src/controllers/purchaseRequestController.ts` continues to inject `__actorUserId` from `req.user.id` for approve/reject paths (no new field trust) and update tests/mocks that assert old client-supplied `nguoiDuyet` ← (verify: `npx jest src/__tests__/purchaseRequestTransitionGuards.test.ts --runInBand` passes; approval audit shows actor display name, not "Phòng giá thành")

## 2. Frontend — purchase-review table and detail modal

- [x] 2.1 Update `frontend/src/components/general/pricing/PurchaseRequestReviewTab.tsx` — `doApprove`/`doReject` send only `{trangThai: "Đã duyệt"}` / `{trangThai: "Từ chối", ghiChuMuaHang?}` (remove `nguoiDuyet`/`ngayDuyet`); ensure `isPending` uses strict `trangThai` equality
- [x] 2.2 Fix detail modal labels: "Sản phẩm (n)" → "Danh sách hàng hóa (n)", "Tên hàng" → "Tên hàng hóa"
- [x] 2.3 Fix detail modal scroll: remove inner `max-h-64 overflow-hidden overflow-auto` wrapper; keep single outer `overflow-y-auto flex-1` as vertical scroll, inner wrapper uses `overflow-x-auto` only; `thead sticky top-0` adheres to outer scroll ← (verify: modal with 30+ items scrolls fully via single outer container, no trapped inner scroll)
- [x] 2.4 Replace action column text buttons with `lucide-react` icons `Eye`/`Check`/`XCircle` (`p-1.5 rounded-md title + aria-label`, `disabled:opacity-50`); remove `text-xs text-gray-400 px-2` branches (`—` / `{st}`); apply Q1:C/Q2:B/Q4:A rules; ensure `title`/`aria-label` present ← (verify: `cd frontend && npx tsc --noEmit -p tsconfig.app.json` and `npm run lint` pass; visual check for pending/non-pending and no-permission states)

## 3. Verification

- [x] 3.1 Run checks: `cd backend && npx tsc --noEmit`, `cd frontend && npx tsc --noEmit -p tsconfig.app.json`, `npm run lint` (both), and manual QA of approve → list/CSV/notification shows real name
