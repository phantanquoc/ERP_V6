## 1. Backend — authorisation split

- [x] 1.1 In `backend/src/routes/faultRecordRoutes.ts`, replace the single `technicalAccess` chain with per-method middleware: `GET /` uses `authenticate` only; `POST /` uses `authenticate` only; `PUT /:id` and `DELETE /:id` keep `authenticate + requireTechnicalAccess(MECHANICAL)`.
- [x] 1.2 Confirm `backend/src/routes/faultTemplateRoutes.ts` remains fully behind `requireTechnicalAccess(MECHANICAL)`. ← (verify: production user receives 403 on every `/api/fault-templates` endpoint, technical user still receives 200)

## 2. Backend — recurrence service + endpoint

- [x] 2.1 Add `faultRecordService.checkRecurrence(faultTemplateId: string, machineSystemDetailId: string)` that runs in parallel: `prisma.faultRecord.count({ where: { faultTemplateId, machineSystemDetailId } })` and `prisma.faultRecord.findMany({ where: { faultTemplateId, machineSystemDetailId }, orderBy: { ngayPhatHien: 'desc' }, take: 5, select: { id, maLoi, ngayPhatHien, trangThai, mucDo, nguoiPhatHien } })`. Returns `{ count, records }`.
- [x] 2.2 Add `faultRecordController.checkRecurrence` that reads `faultTemplateId` and `machineSystemDetailId` from `req.query`, throws `ValidationError` if either is missing, and returns `{ success: true, data }`.
- [x] 2.3 Register `GET /recurrence` on `faultRecordRoutes.ts` BEFORE the `:id` parameterised routes so it isn't shadowed. Middleware: `authenticate` only. ← (verify: `GET /api/fault-records/recurrence?faultTemplateId=X&machineSystemDetailId=Y` returns the payload; missing either id returns 400; route ordering does not collide with `GET /:id`)

## 3. Backend — stats service + endpoint

- [x] 3.1 Add `faultRecordService.getStats()` running five queries inside `Promise.all`: total count; `groupBy({ by: ['mucDo'], _count: { _all: true } })`; `groupBy({ by: ['trangThai'], _count: { _all: true } })`; `groupBy({ by: ['machineSystemId'], where: { machineSystemId: { not: null } }, _count: { _all: true }, orderBy: { _count: { id: 'desc' } }, take: 5 })`; `groupBy({ by: ['faultTemplateId', 'machineSystemDetailId'], where: { faultTemplateId: { not: null }, machineSystemDetailId: { not: null } }, _count: { _all: true }, orderBy: { _count: { id: 'desc' } }, take: 5 })`.
- [x] 3.2 Hydrate `topMachines` by fetching the 5 machines via `findMany({ where: { id: { in: ids } }, select: { id, tenHeThong, maHeThong } })` and merge with counts; preserve order.
- [x] 3.3 Hydrate `topRecurring` by parallel `faultTemplate.findMany` + `machineSystemDetail.findMany` lookups and assemble `{ faultTemplateId, tenMauLoi, machineSystemDetailId, tenChiTiet, count }` preserving order.
- [x] 3.4 Build the response with the three severity keys (`Nghiêm trọng`, `Trung bình`, `Nhẹ`) and three status keys (`Đang theo dõi`, `Đã xử lý`, `Tái phát`) always present, defaulting to 0 when absent from `groupBy` output.
- [x] 3.5 Add `faultRecordController.getStats` returning `{ success: true, data }`. Register `GET /stats` on the route, placed BEFORE the `:id` parameterised routes. Middleware: `authenticate` only. ← (verify: payload matches the spec shape exactly; severity and status maps always contain all keys; empty DB returns zeros and empty arrays; route ordering does not collide with `GET /:id`)

## 4. Frontend — service layer types and API methods

- [x] 4.1 In `frontend/src/services/faultRecordService.ts`, add `FaultRecurrenceResponse` type matching the backend payload (count + records array with `id, maLoi, ngayPhatHien, trangThai, mucDo, nguoiPhatHien`).
- [x] 4.2 Add `FaultStatsResponse` type matching the backend stats payload (total, bySeverity, byStatus, topMachines, topRecurring).
- [x] 4.3 Add `getRecurrence(faultTemplateId, machineSystemDetailId)` and `getStats()` methods on the service module.

## 5. Frontend — hooks

- [x] 5.1 In `frontend/src/hooks/useFaultRecords.ts`, extend the query-key factory with `stats()` and `recurrence(ids)` keys.
- [x] 5.2 Add `useFaultRecordStats()` hook wrapping `useQuery` against `faultRecordService.getStats()`.
- [x] 5.3 Add `useFaultRecurrence({ faultTemplateId, machineSystemDetailId })` hook with `enabled: Boolean(faultTemplateId && machineSystemDetailId)`. Cache key includes both ids.
- [x] 5.4 Ensure `useCreateFaultRecord`'s `onSuccess` also invalidates the stats query key so cards refresh after create. ← (verify: hooks compile, dependent components re-render after create, recurrence call is skipped when either id is empty)

## 6. Frontend — list view redesign

- [x] 6.1 In `frontend/src/components/FaultRecordList.tsx`, replace `canWrite` with `canCreate` (any authenticated user) and `canMutate` (admin OR `isTechnical`). Audit every existing `canWrite` reference and route each one to either `canCreate` or `canMutate` per the spec (Thêm mới → `canCreate`; edit/delete/template tab → `canMutate`).
- [x] 6.2 Render a 4-card summary row above the existing list using `useFaultRecordStats`: Tổng / Đang theo dõi / Đã xử lý / Tái phát. Each card shows the three severity sub-counts inline or beneath the main number. Cards skeleton/render-blank while the query is loading.
- [x] 6.3 Add two collapsible sections below the cards: "Máy hay lỗi nhất" listing up to 5 rows of `tenHeThong (maHeThong) — N lần`, and "Lỗi hay tái phát" listing up to 5 rows of `tenMauLoi @ tenChiTiet — N lần`. Default collapsed; expand on header click.
- [x] 6.4 In the existing create modal (whichever component opens from "Thêm mới"), wire `useFaultRecurrence` to the currently selected `faultTemplateId` and `machineSystemDetailId`. Render a yellow inline banner with "Lỗi này đã xảy ra N lần trước đó" + up to 5 short record links when `count > 0`; render a green confirmation when `count === 0`; render nothing while disabled/loading.
- [x] 6.5 Hide edit and delete buttons on each row when `!canMutate`. Hide the "Mẫu lỗi" tab switcher when `!canMutate`. ← (verify: production user sees Thêm mới but no edit/delete and no template tab; technical user sees everything; recurrence banner only shows after both ids are selected)

## 7. Verification

- [x] 7.1 `cd backend && npx tsc --noEmit` passes.
- [x] 7.2 `cd frontend && npx tsc --noEmit` passes.
- [x] 7.3 `cd backend && npm run lint` passes. ← (verify: all three commands return clean — these are the gating checks for archive)
