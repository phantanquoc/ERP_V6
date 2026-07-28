## 1. Phase 1a — Make every maChien code path day-scoped

- [x] 1.1 Audit every occurrence of `maChien` across `backend/src/services/` and `backend/src/controllers/` and list each site that queries, updates or deletes without a production-day qualifier — do not rely only on the known line numbers, the full set is about 113 references across ten files
- [x] 1.2 Scope the three child-row deletions in `systemOperationService.ts` (`qualityEvaluation`, `finishedProduct`, `systemOperation` `deleteMany` inside the delete transaction) by production day
- [x] 1.3 Scope the remaining `deleteMany` and `findFirst` calls in `systemOperationService.ts` that key on `maChien` alone, including the existence checks used before deletion
- [x] 1.4 Scope the `maChien` lookups in `materialEvaluationService.ts`, `finishedProductService.ts`, `qualityEvaluationService.ts`, `machineSystemService.ts` and `myHistoryService.ts` by production day, including the `maChien: { in: [...] }` batch lookups
- [x] 1.5 Update the four controllers so day context reaches the services that now require it ← (verify: no query, update or deletion keyed on `maChien` alone remains anywhere in services or controllers; the three deletion statements are the critical ones — an unqualified delete removes that code across all history)

## 2. Phase 1b — Schema and backfill

- [x] 2.1 Add `ngaySanXuat` (date) to `MaterialEvaluation` in `backend/prisma/schema/business_production.prisma`
- [x] 2.2 Write the backfill that derives `ngaySanXuat` from `thoiGianChien` using the 06:30 production-day boundary — a timestamp before 06:30 maps to the previous calendar date, 06:30 itself maps to that date
- [x] 2.3 Add a unit test for the boundary mapping covering 02:00, exactly 06:30, 12:00 and 23:30 ← (verify: an after-midnight timestamp maps to the previous day; a calendar-date implementation would pass the daytime cases and silently fail these)
- [x] 2.4 Drop `@unique` from `MaterialEvaluation.maChien` and add `@@unique([maChien, ngaySanXuat])`
- [x] 2.5 Extend `FinishedProduct`, `SystemOperation` and `QualityEvaluation` to `@@unique([maChien, ngaySanXuat, machineSystemId])`, adding the column to those models as needed
- [x] 2.6 Generate the migration and run `cd backend && npx prisma generate` ← (verify: with repeating codes, two production days produce independent rows in all three child tables and neither overwrites the other)

## 3. Phase 2a — Daily schedule module

- [x] 3.1 Add a module that returns, for a production day, the sixteen batch codes `MC-01`–`MC-16` with their start times and shift numbers
- [x] 3.2 Implement the cadence: `MC-01` at 06:30, each subsequent batch 90 minutes later, `MC-16` at 05:00 of the following calendar day
- [x] 3.3 Implement the 5/5/6 shift grouping — shift 1 is `MC-01`–`MC-05`, shift 2 is `MC-06`–`MC-10`, shift 3 is `MC-11`–`MC-16`, fixed by position and independent of any roster
- [x] 3.4 Implement mapping a timestamp to its production day, reusing the same 06:30 boundary as the backfill rather than duplicating the rule
- [x] 3.5 Add unit tests asserting all sixteen codes, all sixteen start times, the shift of each code, and that `MC-13`–`MC-16` carry the starting day's `ngaySanXuat` despite their clock times falling on the next date ← (verify: cycle closes exactly at 06:30 next day; after-midnight batches are not assigned to the next production day)
- [x] 3.6 Remove `generateMaChien` from `materialEvaluationService.ts` and the now-unused `MC` usage of `nextStaticCode` / `staticCodeWhere` in `backend/src/utils/codeGenerator.ts`, leaving those helpers intact for other prefixes
- [x] 3.7 Rework the create paths so a record is written for a selected scheduled code and production day, with no code allocation and no retry-on-unique-conflict loop ← (verify: creating the same code on two production days succeeds; no code counter is read or advanced)

## 4. Phase 2b — Material evaluation becomes selection

- [x] 4.1 Expose the daily schedule to the frontend so both entry surfaces can list codes for a production day and shift
- [x] 4.2 Change `frontend/src/pages/production/ProductionMaterialEvaluationEntry.tsx` from creating a code to selecting one from the chosen shift's scheduled codes
- [x] 4.3 Change `frontend/src/components/MaterialEvaluationManagement.tsx` so the batch code is selected from the schedule and cannot be typed as an arbitrary new code
- [x] 4.4 When a selected code already has a record for that production day, load its values for editing instead of creating a duplicate
- [x] 4.5 After code selection, let the worker pick a warehouse package and fill `tenHangHoa` and `khoiLuong` from it, preserving the existing warehouse linkage on save ← (verify: commodity and weight are no longer typed by hand; the saved record keeps its package and issue links)

## 5. Phase 3a — Notes and entry history

- [x] 5.1 Add `ghiChu` to `MaterialEvaluation` and persist it through the create and update paths
- [x] 5.2 Add `ghiChu` to `FinishedProduct`
- [x] 5.3 Add the entry-history model as a child of `FinishedProduct` recording batch, production day, machine, grade, entering employee and timestamp, with the employee held as a soft reference carrying no foreign-key constraint
- [x] 5.4 Write entry-history rows from `computeDirtyRecords` in `frontend/src/pages/production/ProductionDataEntry.tsx` for each changed grade weight, reusing the existing grade-tab-versus-waste distinction
- [x] 5.5 Ensure cells dirty only through the even waste distribution produce no entry-history rows
- [x] 5.6 Accept and persist entry-history rows in `upsertByBatchMachine` in `finishedProductService.ts`
- [x] 5.7 Surface per-grade attribution in the output export, rendering without error for pre-cut-over records that have no history rows ← (verify: two workers entering different grades on the same batch and machine both appear; entering the waste total does not claim other workers' grades)

## 6. Phase 3b — Table columns and day filter

- [x] 6.1 Render the material-evaluation table with the fourteen defined columns in order: STT, Mã chiên, Thời gian chiên, Tên hàng hóa, Số lô kiện, Khối lượng (Kg/tua), Số lần ngâm, Nhiệt độ nước trước khi ngâm, Nhiệt độ nước sau vớt, Thời gian ngâm (Phút), Brix nước ngâm, Đánh giá nguyên liệu trước khi ngâm, Đánh giá nguyên liệu sau khi ngâm, Ghi chú
- [x] 6.2 Keep lot and package as a single combined column backed by the existing stored field — do not split it
- [x] 6.3 Add a production-day filter to `frontend/src/pages/production/ProductionData.tsx` defaulting to the current production day, applied across all its tabs
- [x] 6.4 Make the default production day respect the 06:30 boundary so opening the page at 02:00 defaults to the previous calendar date ← (verify: default is the current production day, not the calendar date; changing the day rescopes every tab)

## 7. Verification

- [x] 7.1 Run `cd backend && npx prisma generate`
- [x] 7.2 Run `cd backend && npx tsc --noEmit` — must pass clean
- [x] 7.3 Run `cd backend && npm run lint`
- [x] 7.4 Run `cd backend && npm test` — the six suites already failing before this change (routeAuth, departmentService, faultRecordService, machineIntegration, employeeService, technicalBatchB) are unrelated and out of scope; the new schedule and backfill tests must pass
- [x] 7.5 Run `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — zero `TS2304` errors and the total error count does not exceed 609 (count with `| grep -c "error TS"`)
- [x] 7.6 Run `cd frontend && npm run lint`
- [ ] 7.7 Run `gitnexus_detect_changes()` and confirm the change set contains no unrelated files ← (verify: legacy `MC-001` codes are untouched, `soLoKien` is not split, no scheduled job was added, and the output preview screen and `FieldFocusEditor` are unchanged)
