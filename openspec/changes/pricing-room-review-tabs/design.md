## Context

GeneralPricing (`frontend/src/pages/general/GeneralPricing.tsx`) is the pricing room entry point gated by `ProtectedSubRoute(department="general", subModule="pricing")` which via `hasSubModuleAccess` allows ADMIN, GENERAL DEPARTMENT_HEAD/TEAM_LEAD, or GENERAL/pricing EMPLOYEE. It currently renders 4 tabs: requests (YCBG), quotes, orders, costs (ExportCostManagement). Quotation requests, overtime plans, and purchase requests each have their own services and status machines, but approvals are ADMIN-gated: `overtimePlanService.approvePlan` throws 403 unless `role === ADMIN`, quotation requests have no approve endpoint (only cancel/mark-in-progress), and purchase approve is similarly ADMIN/DEPARTMENT_HEAD.

The business wants 3 separate review tabs inside this same page — each a compact (rút gọn) table — where any active pricing member can approve/reject directly, without leaving the pricing room. Tabs must always be visible to pricing members; approve buttons are gated by the same room check (so EMPLOYEE in GENERAL/pricing can approve).

Frontend uses React + Vite + TanStack Query; backend uses Express + Prisma with `authorize`/`checkAccess` middleware and `advanceQuotationRequestStatus` + `recordAudit` + `notificationService`.

## Goals / Non-Goals

**Goals:**
- Let any GENERAL/pricing member (including EMPLOYEE) approve/reject the 3 request types from within the pricing room, with tabs always visible and buttons gated.
- Keep behavior auditable (audit log) and notifiable (notify creator).
- Preserve existing 4 tabs and ExportCostManagement untouched; additive only.
- Enforce access via existing `hasSubModuleAccess` pattern, not ad-hoc role checks.

**Non-Goals:**
- Change status enums or introduce new statuses.
- Move or alter the original purchasing/business/overtime management pages.
- Change pricing calculations or ExportCostManagement.
- Add new dependencies.

## Decisions

**1. Reuse `hasSubModuleAccess("general","pricing")` as the approval gate.**
Why: It already captures ADMIN + GENERAL DEPARTMENT_HEAD/TEAM_LEAD + GENERAL/pricing EMPLOYEE, and is the same check that gates entry to the page. No new permission table. Backend needs an equivalent helper (e.g., `isPricingMember(req.user)`) that mirrors the frontend logic using `user.department/subDepartment/secondaryDepartments/role`.
Rejected alternative: Hard-code `role === DEPARTMENT_HEAD` — would exclude EMPLOYEE, contradicting the requirement.

**2. Frontend: 3 new compact components.**
Why: `frontend/src/components/general/pricing/QuotationRequestReviewTab.tsx`, `OvertimePlanReviewTab.tsx`, `PurchaseRequestReviewTab.tsx` (fallback `frontend/src/components/*` if folder missing). Each fetches its list filtered to the pending status (CHO_XU_LY / CHO_DUYET / ChoDuyet), renders a small table with search/filter/pagination, detail view, and Duyệt/Từ chối. Calls the new/relaxed backend endpoints. Reuses existing service methods where possible.
Rejected: Embedding full `QuotationRequestManagement` etc. — too heavy for a tab and duplicates heavy forms.

**3. QuotationRequest: new service methods + routes.**
`approveQuotationRequest(id, actor)` calls `advanceQuotationRequestStatus(current, "DANG_BAO_GIA", { bypass: isPricingApprover })`, `rejectQuotationRequest` goes to `HUY`, then `recordAudit` + `notificationService.notify`. Routes: `POST /quotation-requests/:id/approve` and `POST /:id/reject` with `authorize(USER_ROLE.ADMIN, DEPARTMENT_HEAD, TEAM_LEAD, EMPLOYEE)` + `checkAccess` or custom pricing-member check.
Rejected: Reusing `cancel` — semantically wrong and already gated differently.

**4. OvertimePlan: relax guard, keep transaction.**
Change `approvePlan` guard from `role !== ADMIN` to `!isPricingApprover && role !== ADMIN` where `isPricingApprover = hasSubModuleAccess("general","pricing", user)`. Keep `prisma.$transaction` with `materializeAttendance` and outside-transaction notification. Update `overtimePlanRoutes` PATCH `/:id/approve` to include `authorize`/`checkAccess` for GENERAL/pricing.

**5. PurchaseRequest: relax guard similarly.**
`approve`/`reject` currently ADMIN/DEPARTMENT_HEAD; extend to allow GENERAL/pricing members for all types (no type filter per decision 6-A). Update route guards.

**6. Tabs always visible, buttons gated.**
Why: Matches decision 7-A (tab visible, button gated). Implementation: add to `VALID_TABS` unconditionally; inside each tab, compute `canApprove = hasSubModuleAccess(...)` and conditionally render Duyệt/Từ chối.

## Risks / Trade-offs

- **Permission drift between frontend and backend** → Mitigation: Share the same `GENERAL/pricing` check name and mirror logic in a backend helper `isPricingMember(user)`; tests assert both sides.
- **Approving the wrong request type** → Mitigation: Each tab filters strictly to its pending status; backend re-validates status before transition and throws `ValidationError` if already processed.
- **Attendance fan-out failure after approval** → Mitigation: Keep it inside the same transaction as status update; notification remains outside transaction.

## Migration Plan

- No schema migration.
- Deploy backend first (new/relaxed guards are additive, old ADMIN still passes), then frontend.
- Rollback: revert the 3 new tab entries and route guards; no data migration to undo.

## Open Questions

- None — scope, 4-B rút gọn, and guards are decided.
