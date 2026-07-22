# Tasks

## 1. Database (Prisma)

- [ ] 1.1 Add `DataEntryPagePosition` model to the common schema: CUID id, `pageKey` String, `positionId` String, FK relation to `Position`, `@@unique([pageKey, positionId])`, `@@schema("common")`, `createdAt`/`updatedAt`.
- [ ] 1.2 Add reverse relation field on `Position` if required by Prisma.
- [ ] 1.3 Run `npx prisma migrate dev` to create the migration, then `npx prisma generate`. ← (verify: migration is additive, runs clean; Attendance schema untouched; model has @@schema and CUID)

## 2. Backend — page-position config (admin, JWT)

- [ ] 2.1 Service: create `dataEntryPagePositionService` with list-by-page, add-mapping (reject duplicate with ConflictError), remove-mapping. Business logic only, uses Prisma.
- [ ] 2.2 Controller: HTTP-only controller calling the service, standard `{ success, data }` responses, typed errors.
- [ ] 2.3 Route: `authenticate` + `authorize('ADMIN')`, register in ROUTE_MAP (`backend/src/routes/index.ts`). ← (verify: route appears in ROUTE_MAP; non-admin gets 403; duplicate mapping returns conflict)

## 3. Backend — attended operators (kiosk, device-key)

- [ ] 3.1 Service: given `date + shift + pageKey`, query today's Attendance rows (local-day range on `attendanceDate`), derive each check-in's shift via `workShiftService.determineShift`, keep rows matching "Ca N" == shift, filter employees whose `positionId` is mapped to `pageKey`, return `{ id, name, employeeCode, positionName }[]`. Return empty when no positions mapped.
- [ ] 3.2 Helper: parse trailing integer from shift name "Ca N"; exclude non-matching names (e.g. "Hành chính").
- [ ] 3.3 Controller: HTTP-only, standard response shape.
- [ ] 3.4 Route: `deviceOrJwtAuth('DATA_ENTRY')`, register in ROUTE_MAP. ← (verify: attended list only includes attended + correctly-positioned employees; empty when unmapped; genuine 401 still allowed for real device-key failure)

## 4. Frontend — services & hooks

- [ ] 4.1 Service types + method for attended operators (`date, shift, pageKey`).
- [ ] 4.2 Hook `useAttendedOperatorsByShift(date, shift, pageKey)` wrapping TanStack Query with a query key factory; `enabled` gated on shift + pageKey.
- [ ] 4.3 Service + hook for admin page-position config (list/add/remove) with query-key invalidation after mutations.

## 5. Frontend — tablet hub

- [ ] 5.1 Create hub page component: full-screen, self-guard kiosk (`markTab`), large nav cards for Sản lượng chiên and Đánh giá nguyên liệu + a reserved placeholder slot.
- [ ] 5.2 Add public route for the hub in `App.tsx` (outside ProtectedLayout), consistent with existing entry routes. ← (verify: hub renders as kiosk tab, cards navigate to the two entry routes, placeholder visible)

## 6. Frontend — reversed gate on entry pages

- [ ] 6.1 `ShiftSelectionScreen`: remove the "Người thực hiện: {operatorName}" header line; make it the first gate.
- [ ] 6.2 `OperatorSelectionScreen`: accept the attendance-filtered operator list (from the new hook) and add a "Tìm người khác" button that opens the full `useProductionEmployees` list; show Vietnamese empty-state when attended list is empty.
- [ ] 6.3 `ProductionDataEntry.tsx`: reverse the gate to shift-first then operator; flip selection state + sessionStorage persistence order accordingly.
- [ ] 6.4 `ProductionMaterialEvaluationEntry.tsx`: apply the same reversed gate. ← (verify: both pages gate shift→operator; attended list correct; fallback works; nguoiThucHien still stamped on save)

## 7. Frontend — desktop admin config page

- [ ] 7.1 Create desktop admin page to assign positions to each data-entry page, using the config hook; save + reflect in kiosk filtering. Place within the appropriate management area and its routing. ← (verify: admin can map/unmap positions; changes reflected in kiosk operator list)

## 8. Verification

- [ ] 8.1 `cd backend && npx tsc --noEmit` (must pass) && `npm run lint` && `npx jest` (related suites).
- [ ] 8.2 `cd frontend && npx tsc --noEmit` (must pass) && `npm run lint`.
- [ ] 8.3 Run gitnexus impact on `determineShift`, `getEmployeesForAssignment`, and the entry-page gates; report blast radius. ← (verify: no unexpected regressions; all checks green)
