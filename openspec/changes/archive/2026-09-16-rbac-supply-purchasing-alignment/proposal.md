# Proposal: rbac-supply-purchasing-alignment

## Why

Backend RBAC has three drift classes that break the intended rule "every in-department EMPLOYEE can do daily operations (CREATE/READ/UPDATE), only DELETE and real approvals are gated": some operational actions are mis-labeled `APPROVE` (so EMPLOYEE is blocked — e.g. `tranthidiemtrinh` cannot confirm actual price), some resources use the wrong action entirely (e.g. `DELETE /lookups` gated as `CREATE`), and several routes have no gate at all. Fix now before permission hardening locks in the wrong semantics.

## What Changes

- Re-label ~10 route actions to their true semantics (`confirm-actual-price` APPROVE→UPDATE, `submit-approval` APPROVE→UPDATE, `quotation-requests` 4 endpoints CREATE→UPDATE/APPROVE/REJECT, `export-costs` 3 endpoints, `lookups DELETE`, `overtime approve` CREATE→APPROVE).
- Add missing `requireRule` gates to `workPlanRoutes` (4 endpoints) and `overtimePlanRoutes` (5 endpoints).
- Audit custom-gate group (`project`, `faultRecord`, `machineSystem*`, `maintenance*`, `productionReport`, `sparePart`, `pricingOverview`) and supplement with `requireRule` where the custom gate is insufficient.
- Add `isCommonGrant` check before `baselineAllow` in `requireRule` so enforcement matches `resolveOne` preview.
- De-duplicate `CHUNG_NO_DEPT_ALLOW` and fix `delegationScopeMatches` to handle secondary sub-departments.
- Introduce `assertCanConfirmActualPrice` (allows `DEPT_PURCHASING` any role + `GENERAL/pricing`) replacing the pricing-only check for `confirmActualPrice`.
- Frontend: apply `isCachedPermissionsLoaded()` guard pattern in `PurchasingMaterials/Equipment` and gate the "Đã mua xong" list action.

## Capabilities

### New Capabilities
- (none — this is a hardening/alignment change, not a new user-facing capability)

### Modified Capabilities
- `supply-request-workflow`: RBAC gates for supply/purchasing actions change (confirm price + submit approval).
- `pricing-export-cost`: export-cost and quotation approval gates change to correct actions.
- `no-dept-self-service`: enforcement now matches documented Chung/common behavior.
- `work-plan-lifecycle` / `overtime-plan-multi-item`: previously un-gated endpoints become gated.

## Impact

- **Backend routes**: `purchaseRequestRoutes`, `quotationRequestRoutes`, `exportCostRoutes`, `lookupRoutes`, `workPlanRoutes`, `overtimePlanRoutes`, and (after audit) `projectRoutes`/`faultRecordRoutes`/`machineSystemRoutes` etc.
- **Backend middleware/utils**: `requireRule`, `permissionResolution`, `isPricingApprover`, `purchaseRequestService`.
- **Frontend**: `PurchasingMaterials`, `PurchasingEquipment`, `ProtectedSubRoute` (optional).
- **No schema migration**, no new seed rules. Rule overrides remain admin-managed via `/rules`.
- **Security-sensitive**: mis-labeling would either over-grant or block daily operations; verify step is mandatory.
