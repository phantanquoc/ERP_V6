## Why

Phòng giá thành (GeneralPricing, `/general/pricing`) currently has 4 tabs (YCBG, Báo giá, Đơn hàng, Chi phí) but no way for its own members to approve the three request types that affect costing: quotation requests, overtime plans, and purchase requests. Today those approvals are ADMIN-only (or head of the originating department) — `overtimePlanService.approvePlan` explicitly checks `role !== ADMIN`, quotation requests have no dedicated approve endpoint, and purchase approvals are similarly gated. The business wants 3 separate review tabs inside the pricing room where any active pricing member (GENERAL/pricing, including EMPLOYEE) can approve/reject directly, with tabs always visible and buttons gated by room membership.

## What Changes

- **Frontend**: Add 3 new tabs to `GeneralPricing` — `ycbg-review` (Duyệt YC báo giá), `overtime-review` (Duyệt tăng ca), `purchase-review` (Duyệt mua hàng). Each tab is a separate component under `frontend/src/components/general/pricing/` (or `frontend/src/components/`): compact table with filter/search/pagination, detail view, Duyệt/Từ chối actions. Tabs always visible to anyone who can enter the pricing room; approve buttons gated by `hasSubModuleAccess("general","pricing")` (ADMIN always passes).
- **Backend - QuotationRequest**: Add `POST /:id/approve` (CHO_XU_LY → DANG_BAO_GIA) and `POST /:id/reject` (→ HUY) via `advanceQuotationRequestStatus` + `recordAudit` + notification to request creator. Guard: ADMIN or any GENERAL/pricing member.
- **Backend - OvertimePlan**: Relax `approvePlan` guard from strict `ADMIN` to ADMIN or GENERAL/pricing member (including EMPLOYEE via `hasSubModuleAccess`). Keep `materializeAttendance` in transaction. Update `overtimePlanRoutes` to add `authorize`/`checkAccess` for GENERAL/pricing.
- **Backend - PurchaseRequest**: Relax approve/reject guards similarly to allow GENERAL/pricing members for all purchase types (ChoDuyet → DaDuyet). Update `purchaseRequestRoutes`.
- **Not changed**: Existing 4 tabs, `ExportCostManagement`, status enums, module routing, purchasing/business pages remain untouched.

## Capabilities

### New Capabilities
- `pricing-room-review-quotation`: Review tab for quotation requests inside pricing room — compact list filtered to CHO_XU_LY, approve/reject flows.
- `pricing-room-review-overtime`: Review tab for overtime plans inside pricing room — compact list filtered to CHO_DUYET, approve/reject with attendance fan-out.
- `pricing-room-review-purchase`: Review tab for purchase requests inside pricing room — compact list filtered to ChoDuyet, approve/reject for all types.

### Modified Capabilities
- `pricing-quotation-request`: Add approve/reject transitions CHO_XU_LY→DANG_BAO_GIA / →HUY gated by pricing room membership.
- `overtime-plan-multi-item`: Relax approve guard to include pricing room members.

## Impact

**Frontend**: `frontend/src/pages/general/GeneralPricing.tsx` (VALID_TABS, tabs array, content), 3 new components, `frontend/src/services/quotationRequestService.ts`/`overtimePlanService.ts`/`purchaseRequestService.ts` (approve/reject calls), reuse `hasSubModuleAccess` from `frontend/src/utils/permissions.ts`.

**Backend**: `backend/src/services/quotationRequestService.ts`, `backend/src/services/overtimePlanService.ts`, `backend/src/services/purchaseRequestService.ts`, `backend/src/routes/quotationRequestRoutes.ts`, `backend/src/routes/overtimePlanRoutes.ts`, `backend/src/routes/purchaseRequestRoutes.ts`, `backend/src/utils/statusTransitions.ts` (read-only).

**Verification**: `npx tsc -p backend/tsconfig.json --noEmit`, `npx tsc -p frontend/tsconfig.app.json --noEmit`, `vite build`, backend tests for the 3 approve flows, manual on dev DB with GENERAL/pricing user.

**Not affected**: 4 existing pricing tabs, ExportCostManagement, purchasing module pages, status enums, LLM, auth.
