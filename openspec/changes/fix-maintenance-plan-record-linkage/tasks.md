# Tasks

## 1. Backend - P0 orphan guard & P3 cycle guard

- [ ] 1.1 `maintenanceRecordService.delete` - if `record.sourceLogId != null` throw `ValidationError("Biên bản tự sinh chỉ được xóa bằng cách bỏ tick trong kế hoạch")` (400) before delete; manual records (`sourceLogId==null`) delete normally
- [ ] 1.2 `maintenancePlanService.toggleMonth` - add cycle guard before log lookup: fetch item first, compute `applicableMonths = getApplicableMonths(tanSuat, thangBatDau)` and `maxLan = FREQUENCY_TIMES[tanSuat] ?? 1`; if `thang` not in applicable months or `lanThu > maxLan` throw `ValidationError`; `KHONG_CO_DINH` (maxLan=0) rejects any tick; reuse existing `getApplicableMonths`
- [ ] 1.3 `maintenanceRecordController.remove` - map P0 ValidationError to 400 JSON (existing error handler should already do this; verify); ensure success path unchanged ← (verify: DELETE auto-record returns 400 with hint, DELETE manual record still 200)

## 2. Backend - P1 duplicate warning & P2 opt-in linkage

- [ ] 2.1 Add helper `findCompletedPlanMatch(tx, { machineSystemId, machineSystemDetailId, noiDung, year })` - normalize `noiDung` (trim, NFC), query plan items with same `machineSystemDetailId` + normalized `noiDung` in plans where `machineSystemId` and `nam==year`, check for any `hoanThanh=true` log; return matched `planId`/`maKeHoach` or null
- [ ] 2.2 `maintenanceRecordService.createWithOptionalPlanLink` (or extend `create`) - transactional: if `linkPlan { planId, itemId, thang, lanThu }` provided, validate `thang`/`lanThu` via same cycle guard, `findUnique` log by `(itemId, thang, lanThu)`; if exists and `hoanThanh==true` throw `ConflictError` 409; else create/update log `hoanThanh=true` and create record with `sourceLogId=log.id` in one `$transaction`; else plain create
- [ ] 2.3 `maintenanceRecordController.create` - after create (or createWithLink), run P1 duplicate check (skip when P2 link was used and already linked); if match found, attach `warning: { code: "DUPLICATE_PLAN_LOG", message, planId, maKeHoach }` to 201 response body alongside `data`; on P2 409 map to 409 ← (verify: manual create matching completed log returns 201 + warning; manual create with valid linkPlan creates log+record atomically and warning is suppressed; duplicate link attempt returns 409)

## 3. Frontend - warnings, opt-in tick, delete guard UX

- [ ] 3.1 `frontend/src/services/maintenanceRecordService.ts` - add `linkPlan?: { planId, itemId, thang, lanThu }` to create payload type; handle `warning` field on 201 response
- [ ] 3.2 `MaintenanceRecordForm` - on `machineSystemId`+`machineSystemDetailId`+`noiDung`+`ngayThucHien` match to exactly one plan item in that year (query plans by `machineSystemId`+`year`), show opt-in row: checkbox "Đồng thời tick hoàn thành cho KHBD-xxx tháng N" where N defaults to `ngayThucHien month` (editable select 1-12 + lanThu if frequency >1/month); when checked, send `linkPlan` with create; on 201 with `warning` and without link, show toast with link to plan (`?tab=maintenance&planId=...`)
- [ ] 3.3 `MaintenanceRecordList` - on delete error 400 with orphan message, show toast with hint "Vui lòng bỏ tick trong kế hoạch" and deep-link to plan; keep manual delete flow unchanged ← (verify: auto-record delete shows 400 toast with navigation hint; manual delete still succeeds; opt-in checkbox only appears for single-match case and sends linkPlan correctly)

## 4. Verification

- [ ] 4.1 Backend manual test: toggleMonth out-of-cycle month and lanThu overflow -> 400; toggleMonth valid -> 200; delete auto-record -> 400; delete manual -> 200; manual create matching completed log -> 201 + warning; manual create with linkPlan valid -> log created + record sourceLogId set; linkPlan on already-completed cell -> 409
- [ ] 4.2 `npx tsc --noEmit` (backend + frontend) and `npm run lint` pass; no new `any`/`console.log` ← (verify: typecheck 0 errors, no regression on existing plan/record flows)
