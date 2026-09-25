## Why

Purchasing updates order info (expected arrival date, destination warehouse, transport notes, purchase notes, attachments) while YCMH is in "Đã duyệt" via the new "Cập nhật" quick-update flow. When no InboundPlan existed yet, the update silently wrote only purchaseRequest fields — no plan was created, no warehouse notification was sent, and plan-level changes were invisible. Even when a plan existed, only date changes produced an audit log; warehouse or note changes were untracked, and `nguoiThucHien` defaulted to the approver name or "Hệ thống" instead of the actor. On the warehouse side, the inbound plan list had no detail view — clicking a plan row did nothing and history was only visible inside the date-edit dialog.

## What Changes

- Backend: `PUT /purchase-requests/:id` propagates actor identity (`__actorUserId`) through to `InboundPlanLog.nguoiThucHien` so audit shows who updated.
- Backend: `purchaseRequestService.updatePurchaseRequest` records audit logs for warehouse changes and transport-note changes (not only date changes), guards terminal plans (Đã nhập/Đã hủy) from reschedule, and when no plan exists yet, auto-creates a draft `InboundPlan` (Chờ nhập) with `Tạo kế hoạch từ cập nhật đơn hàng` log so warehouse sees it immediately.
- Backend: `purchaseRequestService` notifies `SUBDEPT_PRODUCTION_WAREHOUSE` + `ADMIN` on both reschedule and new-plan-creation paths, and refreshes the purchaseRequest response to include the freshly created plan.
- Frontend: New `InboundPlanDetailModal` (read-only) — header with `maKeHoach` + status badge, linked YCMH info, item table, warehouse/date section, full `PlanLogHistory` + linked receipts; clicking a plan row (desktop table and mobile card) opens it.
- Frontend: `InboundPlanTab` list shows an audit badge ("đã dời N lần" / change count) with tooltip summarizing the most recent log entry.

## Capabilities

### New Capabilities
- `inbound-plan-detail`: Read-only detail view for an inbound plan that warehouse can open from the list, showing linked YCMH, items, warehouse, dates, full audit history, and receipts.
- `inbound-plan-audit`: Complete audit trail for plan schedule changes — date, warehouse, and transport notes — with actor attribution and warehouse notifications.

### Modified Capabilities
- None — existing specs describe supply/inbound flows at a higher level; this narrows audit behavior within them without changing their requirements.

## Impact

- Affected code: `backend/src/controllers/purchaseRequestController.ts`, `backend/src/services/purchaseRequestService.ts`, `frontend/src/components/warehouse/InboundPlanDetailModal.tsx` (new), `frontend/src/components/warehouse/InboundPlanTab.tsx`, `frontend/src/components/warehouse/PlanLogHistory.tsx`.
- APIs: `PUT /purchase-requests/:id` (behavior extended, same contract), `GET /inbound-plans` already returns `logs`.
- No DB migration — `InboundPlanLog` and `InboundPlan` tables already exist.
- No new notification types — reuses `SUPPLY_REQUEST_PURCHASED`.
