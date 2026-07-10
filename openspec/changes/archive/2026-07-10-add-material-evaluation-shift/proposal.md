## Why

Fry batches run on three fixed daily shifts (Ca 1/2/3), each with a known set of start times. Today the material-evaluation form makes the operator hand-pick date and time from a calendar, which is slow and error-prone on the floor — especially for the night shift (Ca 3) whose times cross midnight into the next day. The form also forces every frying parameter and material-evaluation field to be filled before saving, but in practice those numbers are often measured later, so operators cannot save a partial record.

## What Changes

- Add a required **Ca** (shift) selector — values 1, 2, 3 — next to the "Thời gian chiên" field in the material-evaluation form.
- After a shift is chosen, show **quick-time buttons** for that shift; tapping one fills the full datetime into the existing DateTimePicker, which stays visible so the operator can confirm/adjust. Manual entry still works.
  - Ca 1: 06:30, 08:00, 09:30, 11:00, 12:30, 14:00
  - Ca 2: 15:30, 17:00, 18:30, 20:00, 21:30
  - Ca 3: 23:00, 00:30, 02:00, 03:30, 05:00
- **Ca 3 date logic (crosses midnight)**: base date = yesterday if the current wall-clock time is 00:00–05:59, otherwise today. 23:00 uses the base date; 00:30/02:00/03:30/05:00 use base date + 1 day. Ca 1 and Ca 2 always use today. The resulting datetime is shown so the operator can adjust the date if needed.
- Persist **`ca`** on the material evaluation (create + update). The DB column and Prisma model already exist (nullable) — only the service field mapping and frontend wiring are added.
- **Remove the `required` attribute** from all Section 3 (Thông số chiên) and Section 4 (Đánh giá nguyên liệu) fields, so a partial record can be saved and completed later.

## Capabilities

### New Capabilities
- `material-evaluation-shift`: Shift (Ca) selection with shift-aware quick-time buttons for the material-evaluation form, including night-shift cross-midnight date resolution, plus relaxed (optional) frying-parameter and evaluation fields.

### Modified Capabilities
<!-- None — no existing spec's requirements change. -->

## Impact

- **Backend**: `backend/src/services/materialEvaluationService.ts` — map `ca` in `createMaterialEvaluation` (legacy), `createWithWarehouseLink`, and `updateMaterialEvaluation` (parse int, allow null). No zod change (route has none). No route/controller change.
- **Frontend**: `frontend/src/services/materialEvaluationService.ts` — add `ca?: number | null` to the `MaterialEvaluation` interface (and to the outgoing payload). `frontend/src/components/MaterialEvaluationManagement.tsx` — add Ca selector, quick-time buttons + Ca-3 date logic, populate `ca` on edit, remove `required` from Sections 3 & 4.
- **Already done (DB)**: migration `20260710000000_add_ca_to_material_evaluation` (nullable `ca INTEGER`) applied; Prisma model `MaterialEvaluation.ca Int?` present; client regenerated.
- **Not touched**: tablet entry page (`ProductionDataEntry`, `FryBatchPicker`), maChien generation, warehouse logic beyond adding `ca` to create.
