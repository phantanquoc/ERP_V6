## 1. Gate the operator stamp in computeDirtyRecords

- [x] 1.1 In `frontend/src/pages/production/ProductionDataEntry.tsx`, while iterating the five grade tabs in `computeDirtyRecords`, record per cell key whether any grade tab contributed a change
- [x] 1.2 Include `nguoiThucHien` in a record's patch only when that cell key had at least one grade-tab change; omit the field entirely otherwise
- [x] 1.3 Leave the waste-tab loop's field writes (`vunLonKhoiLuong`, `vunNhoKhoiLuong`, `phePhamKhoiLuong`) unchanged — only the operator stamp is conditional
- [x] 1.4 Do not alter percentage recomputation, `tongKhoiLuong`, or which cells are considered dirty ← (verify: dirty-cell selection identical to before; only the presence of `nguoiThucHien` in the patch differs)

## 2. Handle the create branch on the backend

- [x] 2.1 In `backend/src/services/finishedProductService.ts`, in `upsertByBatchMachine`, apply `nguoiThucHien` in the update branch only when the client actually sent it
- [x] 2.2 Keep the create branch always stamping the current operator's name, so the required-field constraint is satisfied for a brand-new record
- [x] 2.3 Keep the existing fallback that resolves the name from `userId` when the client did not supply one, without letting it reintroduce a stamp on the update path
- [x] 2.4 Leave the warehouse-receipt code paths and `createdById` untouched ← (verify: a waste-only update keeps the stored name; a waste-only create succeeds without a constraint error)

## 3. Require a save before switching operator or shift

- [x] 3.1 Change `handleChangeOperator` so that when unsaved data exists the switch is refused and the worker is told to save first, in Vietnamese
- [x] 3.2 Ensure no unsaved draft is carried to the next operator; after a completed save the switch proceeds exactly as it does today
- [x] 3.3 Apply the same rule to `handleChangeShift`
- [x] 3.4 Reuse the existing `hasDirtyData` check rather than introducing a second notion of "unsaved"
- [x] 3.5 Leave the draft storage format and `DraftData` type unchanged so existing localStorage drafts still parse ← (verify: switching is blocked while dirty, allowed after save, and no existing draft becomes unreadable)

## 4. Verification

- [x] 4.1 Run `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — zero `TS2304` errors and the total error count does not exceed 609 (count with `| grep -c "error TS"`)
- [x] 4.2 Run `cd frontend && npm run lint`
- [x] 4.3 Run `cd backend && npx tsc --noEmit` — must pass clean
- [x] 4.4 Run `cd backend && npm run lint`
- [x] 4.5 Run `cd backend && npm test` — the six suites already failing before this change (routeAuth, departmentService, faultRecordService, machineIntegration, employeeService, technicalBatchB) are unrelated and out of scope
- [x] 4.6 Run `gitnexus_detect_changes()` and confirm the affected scope is limited to the one frontend page and the one backend service ← (verify: no Prisma schema, migration, other kiosk screen, or warehouse-receipt file appears in the change set)
