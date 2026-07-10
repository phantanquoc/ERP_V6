## Context

The material-evaluation create/edit form (`MaterialEvaluationManagement.tsx`, a modal) uses a `DateTimePicker` (local `YYYY-MM-DDTHH:mm`) for "Thời gian chiên". Fry batches run three fixed shifts with known start times; the night shift (Ca 3) spans midnight. The backend route for material evaluations has no zod validation — the controller passes `req.body` to a service that maps fields explicitly in three places (legacy create, warehouse-linked create, update). The `ca` DB column and Prisma model field (`Int?`) already exist and the client is regenerated, so only field mapping + frontend wiring remain.

## Goals / Non-Goals

**Goals:**
- Fast, shift-driven time entry with quick-time buttons; keep manual entry.
- Correct calendar date for night-shift after-midnight times, whether entered before or after midnight.
- Persist `ca` on create and update.
- Allow saving partial records (Section 3 & 4 optional).

**Non-Goals:**
- No zod validation added (preserve current route pattern).
- No schema/migration work (already done).
- No changes to the tablet entry page, maChien generation, or warehouse logic beyond adding `ca`.

## Decisions

**1. Quick-time buttons live in the form component, not inside DateTimePicker.**
The button set depends on the selected shift, which is form state. Keeping the logic in `MaterialEvaluationManagement.tsx` avoids widening the shared `DateTimePicker` API. The buttons write to the same `formData.thoiGianChien` the picker binds to, so the picker reflects the value immediately. Alternative (add a `quickTimes` prop to DateTimePicker) rejected — couples a reusable primitive to a domain concept.

**2. Base-date rule for Ca 3 keyed off current wall-clock hour.**
`base = (now.hour in 0..5) ? today-1 : today`. 23:00 → base; {00:30, 02:00, 03:30, 05:00} → base+1. This makes both "entered at 22:30" and "entered at 01:00" land on the intended night. Ca 1/Ca 2 → today. The computed datetime is written into the picker (visible), so the operator can override the date. Rationale: operators log during the shift; the 06:00 cutoff cleanly separates "still last night's shift" from "a new day".

**3. `ca` typed as `number | null` end to end.**
Frontend `formData.ca` is `number | null` (null = unset). Payload sends `ca`. Backend parses to int when present, stores null otherwise — matching the nullable column and legacy rows.

**4. Remove HTML `required` only; no new validation layer.**
Section 3 & 4 fields simply drop the `required` attribute. Ca uses `required` on its select to enforce shift-on-create. No zod is introduced, consistent with the existing route.

## Risks / Trade-offs

- [Operator taps a night time but means a different date] → Mitigation: the resulting datetime is always shown in the picker and remains editable; the date is not locked.
- [Timezone drift] → All date math uses local `Date` and the existing local `YYYY-MM-DDTHH:mm` format the picker already uses; no UTC conversion introduced.
- [Partial records flow downstream] → Optional Section 3/4 fields may be empty; downstream (system operations, quality) already tolerate defaults/zero, and completing later is the intended workflow.
- [`ca` null for legacy rows] → Selector shows empty; operator can set it. Acceptable and expected.

## Migration Plan

DB migration already applied (`20260710000000_add_ca_to_material_evaluation`, nullable). Production applies it via `prisma migrate deploy` (does not use the shadow database, so the unrelated pre-existing shadow-DB drift does not block it). No data backfill needed — legacy rows keep `ca = null`. Remaining work is code-only; rollback = revert the code changes (column can stay, it is nullable and harmless).

## Open Questions

None — all behavior locked during exploration.
