## 1. Backend - access helper

- [x] 1.1 Add `isPricingApprover(user)` helper mirroring `hasSubModuleAccess("general","pricing")` (ADMIN always true; GENERAL DEPARTMENT_HEAD/TEAM_LEAD true; GENERAL/pricing EMPLOYEE true including secondaryDepartments). Unit-test the helper. ← (verify: EMPLOYEE in GENERAL/pricing passes, EMPLOYEE in other subDepartment fails, ADMIN always passes)

## 2. Backend - QuotationRequest approve/reject

- [x] 2.1 Add `approveQuotationRequest(id, actor)` and `rejectQuotationRequest(id, actor)` in `backend/src/services/quotationRequestService.ts`: validate `CHO_XU_LY`, call `advanceQuotationRequestStatus` to `DANG_BAO_GIA` / `HUY`, `recordAudit`, notify creator.
- [x] 2.2 Add routes `POST /:id/approve` and `POST /:id/reject` in `backend/src/routes/quotationRequestRoutes.ts` with `authenticate` + pricing-approver guard (ADMIN or GENERAL/pricing). Map 403/400 correctly. ← (verify: non-approver gets 403, wrong status gets 400)

## 3. Backend - OvertimePlan approve relaxation

- [x] 3.1 Update `overtimePlanService.approvePlan` guard from strict ADMIN to ADMIN or pricing approver via `isPricingApprover`. Keep `prisma.$transaction` with `materializeAttendance` and outside-transaction notification.
- [x] 3.2 Update `backend/src/routes/overtimePlanRoutes.ts` `PATCH /:id/approve` to include pricing-approver `authorize`/`checkAccess`. ← (verify: GENERAL/pricing EMPLOYEE can approve CHO_DUYET, attendance created atomically; non-pricing 403; re-approve rejected)

## 4. Backend - PurchaseRequest approve relaxation

- [x] 4.1 Update `backend/src/services/purchaseRequestService.ts` approve/reject guards to allow GENERAL/pricing members for all types (no type filter).
- [x] 4.2 Update `backend/src/routes/purchaseRequestRoutes.ts` guards to include pricing-approver check. ← (verify: pricing EMPLOYEE can approve pending purchase; non-pricing 403)

## 5. Frontend - GeneralPricing tabs

- [x] 5.1 Update `frontend/src/pages/general/GeneralPricing.tsx`: extend `VALID_TABS` with `ycbg-review`, `overtime-review`, `purchase-review`, add tab entries with icons, content switch rendering the 3 new components. Tabs always visible to pricing room; keep 4 existing tabs untouched. ← (verify: /general/pricing shows 7 tabs and deep-links via ?tab=)

## 6. Frontend - Review tab components

- [x] 6.1 Create `frontend/src/components/general/pricing/QuotationRequestReviewTab.tsx` (or `frontend/src/components/`): compact table filtered to CHO_XU_LY, search/filter, pagination, detail, Duyệt/Từ chối gated by `hasSubModuleAccess("general","pricing")`.
- [x] 6.2 Create `OvertimePlanReviewTab.tsx` similarly filtered to CHO_DUYET with approve/reject.
- [x] 6.3 Create `PurchaseRequestReviewTab.tsx` similarly filtered to pending purchase status. ← (verify: tabs render only pending rows, buttons gated correctly, detail works)

## 7. Frontend - services

- [x] 7.1 Add approve/reject calls to `frontend/src/services/quotationRequestService.ts`, `overtimePlanService`/`overtimePlan` hook, `purchaseRequestService.ts` for the pricing review flows.

## 8. Verification

- [x] 8.1 `npx tsc -p backend/tsconfig.json --noEmit` — zero errors ← (verify: no TS errors)
- [x] 8.2 `npx tsc -p frontend/tsconfig.app.json --noEmit` — zero errors, no TS2304 ← (verify: no TS errors)
- [x] 8.3 `npm --prefix frontend run build` — passes (Vite esbuild) ← (verify: build succeeds)
- [x] 8.4 `npm --prefix backend run test` for the 3 approve flows (or warehouse suite still passes) ← (verify: relevant tests pass)
- [ ] 8.5 Manual on dev DB: login as GENERAL/pricing EMPLOYEE, verify tabs visible, Duyệt/Từ chối works and creates audit/notification; ADMIN still works; non-pricing user gets 403 on direct API call
