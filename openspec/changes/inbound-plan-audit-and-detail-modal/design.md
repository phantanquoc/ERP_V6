## Context

`InboundPlan` (KH-NH) is created today when a `PurchaseRequest` transitions to `Hoàn thành` and is rescheduled when `ngayDuKienNhap`/`warehouseId` change on an existing plan. A draft still at `Đã duyệt` with a schedule (the new "Cập nhật" flow) had no plan until completion, so schedule edits were invisible and warehouse was not notified. Existing audit (`InboundPlanLog`) only covered date changes, used `nguoiDuyet`/fallback as actor, and was only visible inside the date-edit dialog. `InboundPlanTab` has no row-click detail view.

Stakeholders: Purchasing (thu mua) edits schedule, Warehouse (kho) consumes the plan, Admin audits changes.

Constraints: No DB migration — `InboundPlanLog` already exists with `hanhDong/ngayCu/ngayMoi/lyDo/nguoiThucHien`. Reuse `SUPPLY_REQUEST_PURCHASED` for notifications (no new event type). `PUT /purchase-requests/:id` contract stays the same.

## Goals / Non-Goals

**Goals:**
- Every schedule edit from purchasing that affects the inbound plan leaves an audit log with the real actor.
- When `Đã duyệt` gains a schedule for the first time, a draft `Chờ nhập` plan appears immediately so warehouse can act.
- Warehouse can open a read-only detail view for any plan row (desktop and mobile) and see full history + receipts.
- List shows at-a-glance audit signal (how many times rescheduled + latest change).

**Non-Goals:**
- New notification event types or delivery channels.
- Changing the `Hoàn thành` → create-plan flow (it remains idempotent).
- Allowing reschedule of terminal plans (`Đã nhập`/`Đã hủy`).
- Editing items/price/status through the quick-update path.

## Decisions

**Decision 1 — Actor attribution via `__actorUserId` through the existing purchase-request update path**
- Why: `cancelPurchaseRequest` already resolves display name from `actorUserId` via `prisma.user`. Reuse same pattern: `purchaseRequestController.updatePurchaseRequest` resolves `req.user.id` → name and passes it (or keeps `__actorUserId`) so `purchaseRequestService` can write `InboundPlanLog.nguoiThucHien` as the actor instead of `nguoiDuyet`/System.
- Alternative: add `X-Actor` header or read `req.user` directly in service — rejected; service should not depend on Express request shape.
- Trade-off: requires threading one extra field through the service method signature or reusing the existing `__actorUserId` convention.

**Decision 2 — Extend audit to warehouse and transport-note changes, not only date**
- Why: Warehouse destination and transport notes affect receiving. Today only `ngayDuKien` changes log; warehouse-only changes are silent.
- How: In the `if (existingPlan)` reschedule branch, compare `normalizedWarehouseId` and `ghiChuVanChuyen` against prior values; emit distinct `hanhDong` entries ("Đổi kho đích", "Đổi ghi chú vận chuyển") with `lyDo`/`nguoiThucHien`. Guard terminal plans first.
- Alternative: single combined log entry — rejected; granular entries are easier to audit and to badge-count per type.

**Decision 3 — Auto-create draft plan on first schedule signal at `Đã duyệt`**
- Why: Without it, schedule edits before `Hoàn thành` never materialize as a plan and never notify warehouse.
- How: In the `else` (no existing plan) branch, when PR is not terminal and at least one of `ngayDuKienNhap`/`warehouseId` is present, create `InboundPlan` `Chờ nhập` with `ngayDuKien` resolved as `ngayDuKienNhap ?? ngayDuyet ?? now+7d`, generate `maKeHoach` (`KH-NH`), write `InboundPlanLog` "Tạo kế hoạch từ cập nhật đơn hàng", notify warehouse+admin, and refresh `purchaseRequest` for the response.
- Alternative: require explicit "create plan" button — rejected; schedule presence is the natural trigger and matches completion path.

**Decision 4 — Read-only `InboundPlanDetailModal`**
- Why: Warehouse needs to verify YCMH, items, warehouse, dates, and history before receiving. Existing `PurchaseRequestDetailModal` is for purchasing; this is warehouse-scoped and shows plan-specific fields + receipts.
- Content: header `maKeHoach` + status badge, YCMH link (maYeuCau, requester, status), item table (tenHangHoa/soLuong/donViTinh/phanLoai), warehouse+dates, full `PlanLogHistory` (all entries, not capped to 5), receipts list if any. No edit actions inside — actions remain on the list row (Sửa ngày hẹn, Hủy, Nhập kho).
- Opens on row click (desktop table row and mobile card), same as warehouse receipt detail pattern.

**Decision 5 — List audit badge**
- Why: Without opening every row, warehouse/admin cannot see which plans were rescheduled or when.
- How: Derive count from `logs.length` (or filtered to reschedule kinds) and show "đã dời N lần" badge next to status; tooltip shows latest `hanhDong` + `ngayMoi` + `nguoiThucHien`. No extra API call — `GET /inbound-plans` already returns `logs`.

## Risks / Trade-offs

- [Risk] Actor name resolution may be stale if user renamed → Mitigation: resolve at write time from `prisma.user` (same as cancel path).
- [Risk] Creating a draft plan on any schedule signal could create many plans from partial edits → Mitigation: only when `ngayDuKienNhap` or `warehouseId` present and PR not terminal; warehouseId alone is a valid signal (destination matters even without date).
- [Risk] Double-notify if reschedule and create paths both fire → Mitigation: branches are exclusive (`if (existingPlan)` vs `else`); completion path already notifies via its own block.
- [Risk] PlanLogHistory in detail modal may be long → Mitigation: reuse existing component's expand/modal pattern; cap initial view but allow full view.

## Migration Plan

- No migration. Code-only change.
- Rollback: revert the service/controller/frontend files; existing `InboundPlanLog` rows remain harmless.
- Deploy: rebuild backend container; frontend rebuild via Vite.

## Open Questions

- None blocking. If warehouse wants filtering by "rescheduled" vs "never rescheduled", it can be added later as a client-side filter on `logs.length`.
