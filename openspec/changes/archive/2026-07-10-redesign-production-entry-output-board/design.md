## Context

`ProductionDataEntry.tsx` currently runs: kiosk guard → operator name → pick one fry-batch (FryBatchPicker) → pick one fryer → two tabs (operating params / finished product) with preview+confirm PATCH. The kiosk session and operator-selection steps are stable and stay. `MaterialEvaluation` carries `maChien`, `ca` (Int?, 1/2/3), `thoiGianChien`, `tenHangHoa`; `getAllMaterialEvaluations` has no server-side ca/date filter. Creating a fry-batch auto-generates 8 empty `FinishedProduct` rows (one per active SAN_XUAT fryer). `updateFinishedProduct(id, partial)` and `getAllFinishedProducts(page, limit, machineSystemId)` exist. The paper form is a per-shift board (one quality category, batches as rows, 8 machines as columns), which this redesign mirrors.

## Goals / Non-Goals

**Goals:**
- Match the paper board: shift → date → quality tab → batch×machine matrix.
- Safe save on a shared tablet: load existing values + only write changed cells.
- No data loss while entering: draft auto-save across tabs and reloads.
- Frontend-only; keep kiosk session and operator selection intact.

**Non-Goals:**
- No backend/service/schema/permission/kiosk-session changes.
- No operating-parameters entry here (kept in code, removed from this UI).
- No server-side ca/date filtering (done client-side).

## Decisions

**1. Client-side filtering of fry-batches by ca + local date.**
`getAllMaterialEvaluations` returns all; filter in the hook by `ca === selectedShift` and local-date(`thoiGianChien`) === production date. Local date is computed from the Date's local Y/M/D (not `toISOString`, which is UTC) to avoid off-by-one at day boundaries. Alternative (add a backend filter) rejected — out of scope, dataset is small.

**2. Matrix model keyed by (maChien, machineSystemId).**
Rows come from the filtered batches; columns from `useActiveFryerMachineSystems` (8 fryers). Existing `FinishedProduct` records are fetched and indexed by `(maChien, machineSystemId)` to prefill cells. This mirrors the auto-created-record model and the DB unique key.

**3. Dirty tracking is the safety mechanism.**
The loaded value for each cell is remembered; on confirm we compare current vs loaded and PATCH only records with at least one changed field. Untouched records are never sent, so a blank/partial board can never zero out another worker's data. This is the core correctness requirement, driven by the shared-tablet reality.

**4. Waste tab: shift total → even split → thirds.**
The waste tab is a single number for the shift, not a matrix, because the operator weighs scrap in bulk. Distribution: `perCell = total / (batchCount * 8)`, then each of `vunLon/vunNho/phePham = perCell / 3`. Applying it marks every affected cell dirty (those records will be PATCHed). Rounding follows the existing 2-decimal convention. This is a deliberate approximation the user chose over per-machine waste entry.

**5. Draft in localStorage keyed by date+shift.**
Auto-save writes the whole board draft (all tabs) under a `date|shift` key so reload/tab-close/tab-switch never lose input. Draft is purely local; DB is written only on confirm. Cleared after a confirmed save. Keeps entry resilient without backend involvement.

**6. Preview shows only changed cells, all six categories.**
Preview aggregates dirty cells across all tabs into a readable Vietnamese summary so the operator reviews the whole shift at once before the single confirm. Confirm recomputes `tiLe` + `tongKhoiLuong` per record, stamps `nguoiThucHien` (chosen name) and `ghiChu`.

**7. Reuse and isolate.**
Reuse `NumericInput`; optionally extract `ShiftSelection` and `ProductionOutputBoard` to keep `ProductionDataEntry` readable. Keep `FryBatchPicker` and `kioskSession` untouched.

## Risks / Trade-offs

- [Overwrite on shared tablet] → Mitigation: dirty tracking + load-existing; untouched cells never PATCHed. Primary correctness guard — must be verified.
- [Timezone off-by-one on date filter] → Mitigation: compare local Y/M/D, never `toISOString`.
- [Waste rounding drift] → Even split + thirds can leave rounding remainder; accepted as an approximation per the chosen model; each field rounded to 2 decimals.
- [Draft staleness vs DB] → On load we prefer existing DB values into cells, then a draft (if present for that date+shift) overlays unsaved edits; document the precedence so a stale draft does not hide newer DB data unexpectedly. Reasonable for a single-tablet workflow.
- [Percentage recompute uses only this record's 8 weights] → matches existing FinishedProduct semantics (per-record total), not a cross-batch total.

## Migration Plan

Pure additive/replacement frontend change on one page + its hook. No data migration. Rollback = revert the frontend files; leftover localStorage drafts are inert. Deploy with the standard frontend build.

## Open Questions

None — all behavior locked during exploration (auto-save=draft, waste=shift-total split into thirds, load-existing + dirty-only save, preview all six).
