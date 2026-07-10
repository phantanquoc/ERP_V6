## 1. Backend — persist `ca`

- [x] 1.1 In `materialEvaluationService.ts` `createMaterialEvaluation` (legacy branch), map `ca` into `prisma.materialEvaluation.create` (parse to int when present, else null)
- [x] 1.2 In `createWithWarehouseLink`, map `ca` into `tx.materialEvaluation.create`
- [x] 1.3 In `updateMaterialEvaluation`, map `ca` into the update payload (allow changing/clearing) ← (verify: all 3 paths persist `ca`; null allowed; no other field mapping altered)

## 2. Frontend service types

- [x] 2.1 Add `ca?: number | null` to the `MaterialEvaluation` interface in `frontend/src/services/materialEvaluationService.ts`
- [x] 2.2 Ensure `ca` is included in the create/update payload (and `buildFormData` if used) ← (verify: `ca` reaches the backend on both create and update)

## 3. Frontend form — shift selector

- [x] 3.1 Add `ca` to `formData` state (`number | null`, default null)
- [x] 3.2 Add a required Ca `<select>` (1/2/3) next to the "Thời gian chiên" field in Section 1
- [x] 3.3 Populate `ca` from the record when opening the edit modal
- [x] 3.4 Enforce shift-selected-on-create (required select) ← (verify: create blocked without Ca; edit pre-fills Ca; legacy null shows empty)

## 4. Frontend form — quick-time buttons

- [x] 4.1 Define the shift → time-list map (Ca1/Ca2/Ca3 as specified)
- [x] 4.2 Render quick-time buttons for the selected shift near the time picker
- [x] 4.3 On tap, compute the datetime and write it into `formData.thoiGianChien` (local `YYYY-MM-DDTHH:mm`); keep picker visible/editable
- [x] 4.4 Implement Ca 3 date rule: base = yesterday if now.hour in 0..5 else today; 23:00 → base; {00:30,02:00,03:30,05:00} → base+1; Ca1/Ca2 → today ← (verify: 22:30 tap 00:30 → D+1; 01:00 tap 00:30 → D; 22:30 tap 23:00 → D; Ca1/Ca2 → today)

## 5. Frontend form — relax required fields

- [x] 5.1 Remove `required` from Section 3 fields (soLanNgam, nhietDoNuocTruocNgam, nhietDoNuocSauVot, thoiGianNgam, brixNuocNgam)
- [x] 5.2 Remove `required` from Section 4 fields (danhGiaTruocNgam, danhGiaSauNgam) ← (verify: form saves with Sections 3 & 4 empty; identity fields still required)

## 6. Verification

- [x] 6.1 `cd backend && npx tsc --noEmit` — must pass
- [x] 6.2 `cd frontend && npx tsc --noEmit` — must pass
- [x] 6.3 `cd frontend && npm run lint`
- [ ] 6.4 Manually confirm create/edit round-trip: select Ca, tap quick-time, save, reopen → `ca` and datetime persist ← (verify: end-to-end create + edit with shift and quick-time)
