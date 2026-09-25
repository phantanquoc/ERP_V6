## 1. Backend — Actor propagation and complete audit

- [ ] 1.1 Update `purchaseRequestController.updatePurchaseRequest` to resolve actor display name (or forward `__actorUserId`) so plan logging does not fall back to `nguoiDuyet`/Hệ thống
- [ ] 1.2 Update `purchaseRequestService.updatePurchaseRequest` to write `InboundPlanLog.nguoiThucHien` as the actor for all plan log branches (date reschedule, warehouse change, transport-note change, draft creation)
- [ ] 1.3 Extend plan audit in the `if (existingPlan)` branch: log warehouse (`warehouseId`) changes and `ghiChuVanChuyen` changes with distinct `hanhDong` entries, not only `ngayDuKien` changes
- [ ] 1.4 Guard terminal plans (`Đã nhập`/`Đã hủy`) — no reschedule and no auto-create when PR is terminal
- [ ] 1.5 In the `else` (no plan) branch, auto-create draft `InboundPlan` (Chờ nhập, `KH-NH`, `ngayDuKien` = `ngayDuKienNhap ?? ngayDuyet ?? now+7d`), log `Tạo kế hoạch từ cập nhật đơn hàng`, notify warehouse+admin, and refresh `purchaseRequest` for the response ← (verify: updating a Đã duyệt PR with no plan and a date/warehouse via PUT creates a plan, writes a log with the actor, notifies warehouse, and the response includes the new plan)

## 2. Frontend — Inbound plan detail modal

- [ ] 2.1 Create `frontend/src/components/warehouse/InboundPlanDetailModal.tsx` — read-only modal: header `maKeHoach` + status badge, linked YCMH (maYeuCau, requester, status), item table (tenHangHoa/soLuong/donViTinh/phanLoai), warehouse/date section, full `PlanLogHistory` + receipts list, close on backdrop/esc ← (verify: opening the modal shows all sections, handles empty receipts/logs, and is keyboard/ARIA accessible)
- [ ] 2.2 Wire `InboundPlanTab` row click to open detail modal (desktop table row and mobile card), without breaking existing row actions (Sửa ngày hẹn, Hủy, Nhập kho) — stopPropagation on action buttons

## 3. Frontend — List audit signal

- [ ] 3.1 In `InboundPlanTab` list, show audit badge (e.g. "đã dời N lần") derived from `logs.length` and tooltip summarizing most recent log (`hanhDong`, `ngayMoi`, `nguoiThucHien`) without extra API calls ← (verify: plans with logs show the badge and tooltip, plans with no logs show no badge)

## 4. Verification

- [ ] 4.1 `cd backend && npx tsc --noEmit` passes with no errors
- [ ] 4.2 `cd frontend && npx tsc --noEmit -p tsconfig.app.json` passes with no errors
- [ ] 4.3 Manual: create a YCMH in Đã duyệt with no plan, use Cập nhật to set date/warehouse/notes, verify a draft plan appears, its log shows the correct `nguoiThucHien`, warehouse receives notification, and the detail modal opened from the list shows complete history ← (verify: end-to-end flow from purchasing update to warehouse detail view and audit)
