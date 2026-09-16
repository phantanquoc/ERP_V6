## 1. Backend — Purchase price confirmation and submit (A.1, A.2)

- [x] 1.1 Add `assertCanConfirmActualPrice` to `backend/src/services/purchaseRequestService.ts` — pass when actor is `ADMIN` OR actor's department resolves to `DEPT_PURCHASING` (DB lookup like `isPricingApprover`) OR actor is `GENERAL/pricing` via `isPricingApprover`; keep `assertCanApprovePurchase` for the `PUT Đã duyệt/Từ chối` branch
- [x] 1.2 Change `backend/src/routes/purchaseRequestRoutes.ts:225` `POST /:id/confirm-actual-price` from `requireRule('purchase-requests','APPROVE')` to `requireRule('purchase-requests','UPDATE')` and make `confirmActualPrice` call the new helper from 1.1
- [x] 1.3 Change `backend/src/routes/purchaseRequestRoutes.ts:212` `POST /:id/submit-approval` from `requireRule('purchase-requests','APPROVE')` to `requireRule('purchase-requests','UPDATE')` ← (verify: EMPLOYEE in DEPT_PURCHASING can POST submit-approval; EMPLOYEE in unrelated dept gets 403; admin approve still requires pricing approver path)

## 2. Backend — Quotation / export-cost / lookup / overtime approve labels (A.3–A.6)

- [x] 2.1 Fix `backend/src/routes/quotationRequestRoutes.ts` — `cancel`→`UPDATE`, `mark-in-progress`→`UPDATE`, `approve`→`APPROVE` (keep inline `isPricingApprover`), `reject`→`REJECT` (keep inline `isPricingApprover`)
- [x] 2.2 Fix `backend/src/routes/exportCostRoutes.ts` — `POST /` from `EXPORT` to `CREATE`, `PATCH /:id` from `CREATE` to `UPDATE`, `DELETE /:id` from `UPDATE` to `DELETE` (leave 3 GET `EXPORT` as-is)
- [x] 2.3 Fix `backend/src/routes/lookupRoutes.ts:40` — `DELETE /:id` from `requireRule('lookups','CREATE')` to `requireRule('lookups','DELETE')`
- [x] 2.4 Fix `backend/src/routes/overtimePlanRoutes.ts:20` — `PATCH /:id/approve` from `requireRule('overtime-plans','CREATE')` to `requireRule('overtime-plans','APPROVE')` (keep inline `isPricingApprover`) ← (verify: EMPLOYEE cannot POST quotation cancel/approve with wrong role; lookups DELETE requires HEAD; overtime approve requires TEAM_LEAD)

## 3. Backend — Missing gates (B)

- [x] 3.1 Add `requireRule('work-plans','READ')` to `GET /`, `GET /my-work-plans`, `GET /:id` in `backend/src/routes/workPlanRoutes.ts` and `requireRule('work-plans','DELETE')` to `DELETE /:id`
- [x] 3.2 Add `requireRule('overtime-plans','READ')` to `GET /`, `GET /my-plans`, `GET /:id` and `requireRule('overtime-plans','UPDATE')` to `PATCH /:id/accept` and `PATCH /:id/actual-time` in `backend/src/routes/overtimePlanRoutes.ts` ← (verify: no-dept outside Chung cannot GET work-plans/overtime-plans; no-dept participant cannot accept overtime outside own items is still enforced at service layer)

## 4. Backend — Custom-gate audit (C)

- [x] 4.1 Audit `backend/src/routes/projectRoutes.ts` (32 routes, `projectAccess`), `faultRecordRoutes.ts`, `machineSystemRoutes.ts`, `machineSystemDetailRoutes.ts`, `maintenancePlanRoutes.ts`, `maintenanceRecordRoutes.ts`, `maintenanceTemplateRoutes.ts`, `productionReportRoutes.ts`, `sparePartRoutes.ts`, `pricingOverviewRoutes.ts` — report current custom gate vs `requireRule` semantics and supplement missing `requireRule` gates only where custom gate is insufficient; leave `agentRoutes`/`chatRoutes` untouched ← (verify: audit report lists each route's current gate and the chosen fix or keep reason)

## 5. Backend — Enforcement vs preview sync (D)

- [x] 5.1 In `backend/src/middlewares/requireRule.ts`, add `isCommonGrant(resourceCode, action)` check (import from `@utils/permissionResolution`) before `baselineAllow` in the in-dept branch so enforcement matches `resolveOne` preview for `COMMON_GRANTS` (`docs`, `notifications`, `lookups`, etc.)
- [x] 5.2 Replace the literal `CHUNG_NO_DEPT_ALLOW` array at `requireRule.ts:212` with imported `CHUNG_NO_DEPT_ALLOW` from `@utils/permissionResolution`
- [x] 5.3 Extend `delegationScopeMatches` in `backend/src/utils/permissionResolution.ts` to check membership in `subDepartmentIds[]` (secondary sub-departments) rather than single `subDepartmentId`, and update caller `requireRule.ts:165` to pass the array ← (verify: delegation to secondary sub-dept is recognized; Chung/common reads agree between preview and enforcement)

## 6. Frontend — Display sync (E)

- [x] 6.1 In `frontend/src/pages/purchasing/PurchasingMaterials.tsx` and `frontend/src/pages/purchasing/PurchasingEquipment.tsx`, gate `canEditPR` as `isCachedPermissionsLoaded() ? can('purchase-requests','UPDATE', role) : (role===ADMIN||DEPARTMENT_HEAD||TEAM_LEAD)` (pattern from `SupplyRequestManagement`), change submit-for-approval gate to `UPDATE`, and gate the list "Đã mua xong" / confirm-actual-price action by the same permission as the detail modal ← (verify: before `myPermissions` loads, EMPLOYEE does not see Sửa/Gửi duyệt; list action matches detail modal)

## 7. Verification

- [x] 7.1 Run `cd backend && npx tsc --noEmit` and `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — both 0 errors; run `npm run lint` both sides — no new errors; run `gitnexus detect_changes` — only planned files touched
