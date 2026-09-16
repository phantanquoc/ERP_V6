## Context

Current RBAC is DB-driven via `requireRule(resourceCode, action)` with fallback `baselineAllow` (REQ-RBAC-006: DELETE→HEAD+, APPROVE/REJECT→TEAM_LEAD+, others→any in-dept) plus Chung/common bypasses and owner-scope for UPDATE/DELETE. `resolveOne` (preview) and `requireRule` (enforcement) should be identical but diverge on `COMMON_GRANTS` and on duplicated `CHUNG_NO_DEPT_ALLOW`. A second layer `isPricingApprover` (only `DEPT_GENERAL/pricing`) double-gates some purchasing routes. Seed rules (`seed-rules.ts`) generate Rule baselines per department group; `permissionResolution.ts` resolves the best matching Rule. Frontend caches `myPermissions` and exposes `can()` with baseline fallback.

Recent audit found: ~10 routes with wrong action labels, ~9 routes with no gate, frontend `PurchasingMaterials/Equipment` leaking buttons before permissions load.

## Goals / Non-Goals

**Goals:**
- Make operational actions reachable by in-department EMPLOYEE while keeping real approvals gated.
- Make enforcement match preview so Rule Matrix UI reflects reality.
- Close unauthenticated-within-app gaps without breaking no-dept self-service (Chung/common).

**Non-Goals:**
- Changing `baselineAllow` tiers.
- Adding new Prisma models or seed rules.
- Replacing custom project/technical gates where they are already sufficient (audit first).
- Introducing a new `CANCEL` action (reuse `UPDATE` as established for YCCB/YCBS/YCMH cancel).

## Decisions

**D1: `confirm-actual-price` → UPDATE + `assertCanConfirmActualPrice` (new helper).**
- Why: Confirming actual price is not an approval — it records what was paid. Keeping `APPROVE` blocks purchasing EMPLOYEE daily work. New helper allows `ADMIN` OR `DEPT_PURCHASING` (any role, resolved via `prisma.department` like `isPricingApprover` does) OR `GENERAL/pricing` (backward-compat for pricing room). Keeps real purchase approval (`PUT Đã duyệt/Từ chối`) on `assertCanApprovePurchase`.
- Alternative: keep `APPROVE` and add EMPLOYEE Rule for `purchase-requests/APPROVE` in `DEPT_PURCHASING` — rejected because it would also open other `APPROVE` semantics on the same resource unintentionally.
- Considered and rejected: keep `APPROVE` and create a patient Rule migration — slower, not needed for correctness.

**D2: `submit-approval` → UPDATE.**
- Why: Submitting for approval is an operational step (hand-off to approver), not the approval itself. EMPLOYEE should be able to submit.

**D3: Fix `quotation-requests` / `export-costs` / `lookups` / `overtime approve` labels in place.**
- No new abstractions; one-line `requireRule` swaps. Keep inline `isPricingApprover` for quotation approve/reject.

**D4: Add missing gates instead of widening `authenticate`-only routes.**
- `work-plans` and `overtime-plans` were accidentally left as `authenticate` only during earlier scaffolding.

**D5: Audit custom-gate group before bulk-adding `requireRule`.**
- `projectAccess` and technical gates may already check department/role sufficiently. Bulk-adding `requireRule` on top could double-deny. Audit first, supplement only where gaps exist.

**D6: Sync enforcement with preview via `isCommonGrant` import.**
- Add `isCommonGrant` before `baselineAllow` in `requireRule` so in-dept users see `docs`/`notifications`/`lookups` consistently between matrix preview and enforcement.

**D7: Fix `delegationScopeMatches` to accept secondary sub-departments.**
- `matchRule` already checks `subDepartmentIds[]`; delegation should too. Caller `requireRule.ts:165` currently passes single `subDepartmentId` — broaden to array or overload.

## Risks / Trade-offs

- **Over-grant if helper is too permissive** → Mitigation: `assertCanConfirmActualPrice` checks `DEPT_PURCHASING` code explicitly (DB lookup, not hard-coded ID), not "any department". Verify step must check EMPLOYEE in PURCHASING can confirm price but EMPLOYEE in unrelated dept cannot.
- **Under-grant if work-plan/overtime gates are too strict** → Mitigation: `work-plans` and `overtime-plans` are in `purchasing`/`production` groups per `DEPARTMENT_GROUP_MAP`; verify no-dept users who legitimately need `READ` are covered by Chung/common bypass before adding `READ` gate.
- **Double-deny from stacking `requireRule` on custom-gated routes** → Mitigation: audit C reports current custom gate logic before patching.
- **Frontend flicker before permissions load** → Mitigation: apply `isCachedPermissionsLoaded()` guard pattern already proven in `SupplyRequestManagement`.
