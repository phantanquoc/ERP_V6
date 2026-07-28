## Why

On the shop floor, one tablet is shared and each worker owns one quality grade — one person enters Hàng A, another Hàng B, and the person responsible for Ướt also enters the Vụn-Phế phẩm total. The fry-output board does not model this at all: it stamps whoever is currently selected onto every row it writes, so the recorded operator is wrong by default on every shift.

`FinishedProduct` carries a single `nguoiThucHien` column for all eight grade weights, and a row is one record per (fry batch × machine). `computeDirtyRecords` sets `patchData.nguoiThucHien` to the currently selected operator for **every** dirty row, including grades that operator never touched:

```
Chị An   saves Hàng A for MC-001/Máy01 = 12.5 kg → row.nguoiThucHien = "Chị An"
Anh Bình saves Hàng B for MC-001/Máy01 =  3.0 kg → row.nguoiThucHien = "Anh Bình"  ← overwritten
→ Chị An's 12.5 kg of Hàng A is now attributed to Anh Bình
```

The hand-off path makes it worse. `handleChangeOperator` deliberately keeps the draft when switching operators (its confirmation reads "Đổi người sẽ giữ nguyên draft nhưng phải chọn lại người + ca"), which is exactly what happens when the tablet is passed along mid-entry:

```
Chị An   enters Hàng A → 12.5 kg (NOT saved — sits in the localStorage draft)
         taps "Đổi người" → draft is preserved
Anh Bình enters Hàng B →  3.0 kg, taps Lưu → Xác nhận
         computeDirtyRecords bundles BOTH Hàng A and Hàng B into one patch
→ everything is attributed to Anh Bình
```

`handleChangeShift` carries the draft across in the same way.

This is not an internal bookkeeping detail. `nguoiThucHien` is exported as the "Người thực hiện" column in the Excel report and is searchable, so the wrong name leaves the building.

A second trap sits in the waste tab. It is not a matrix — it has a single `wasteTotal` input, and `applyWasteDistribution` spreads that total across **every** batch × machine cell (10 × 8 = 80 cells) when Save is tapped. Any row it touches becomes dirty, so whoever enters the waste total would paint their name over the entire shift. The fact that the Ướt owner also enters waste does not help: the problem is that even distribution touches every cell, including rows belonging to other grades.

The useful consequence of that structure is that the "typed by hand" versus "distributed by the system" boundary already coincides with the tab boundary: the five grade tabs (A, B, B_DAU, C, UOT) are always hand-typed because `updateCell` is never called with `VUN_PHE`, and `VUN_PHE` is always machine-distributed. No extra tracking state is needed to tell them apart.

## What Changes

- `nguoiThucHien` is written **only** for rows where at least one of the five grade tabs is dirty. A row that is dirty solely because of even waste distribution keeps the name already stored on it.
- Newly created rows still receive the current operator's name. `nguoiThucHien` is a required `String` in Prisma, so a brand-new row that only receives a distributed waste share has no prior name to keep and would violate the constraint. Only the update branch of `upsertByBatchMachine` may skip the field.
- **BREAKING (behavior)**: switching operator now requires saving first. When unsaved data exists, the worker must save before changing operator, and the draft is no longer carried across to the next person. Previously the confirmation dialog allowed proceeding with the draft intact. Changing shift behaves the same way.
- After a save completes, changing operator works exactly as it does today.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `production-data-tablet-entry`: three requirements change — "Dirty-tracked safe save" gains the rule that `nguoiThucHien` is written only for rows with a changed grade weight (create branch excepted); "Waste tab shift-total distribution" states that even distribution must not reassign the operator on existing rows; "Operator selection first" requires saving before an operator switch when unsaved data exists.

## Impact

**Frontend**

- `frontend/src/pages/production/ProductionDataEntry.tsx` — `computeDirtyRecords` decides per row whether to include `nguoiThucHien`; `handleChangeOperator` and `handleChangeShift` block the switch while unsaved data exists instead of carrying the draft.

**Backend**

- `backend/src/services/finishedProductService.ts` — `upsertByBatchMachine` distinguishes the create branch (always stamps the name) from the update branch (stamps only when the client sent it).

**Known limitation (accepted)**

Keeping a single column means `nguoiThucHien` can only mean "the most recent person who entered a grade weight into this row". Per-grade attribution is not recoverable from it. Two alternatives were considered and rejected: eight per-grade name columns (bloats the table, forces every report to choose a column, and makes "who entered this row" meaningless), and a separate entry-history table (needs a new table and a migration). Full per-grade traceability requires the history table and is deliberately deferred.

**Known consequence (no remediation possible)**

Wrong names already stored in the database stay wrong. The information about who entered which grade was never recorded, so there is nothing to reconstruct from. If this data has been used for employee evaluation, it needs a manual review.

**Out of scope**

- No Prisma column additions, no migration, no `schema.prisma` edits.
- No entry-history table.
- No persisting of `operatorId` / employee reference.
- No changes to percentage math, `tongKhoiLuong`, or the even-distribution formula in `applyWasteDistribution`.
- No changes to the entry board layout, the preview screen (`FullGridPreview`, just completed in `optimize-output-preview-portrait`), or `FieldFocusEditor`.
- `ProductionSystemOperationEntry.tsx` and `ProductionMaterialEvaluationEntry.tsx` are untouched — each screen has its own independent `handleChangeOperator`.
- Warehouse-receipt flow, `createdById`, kiosk session handling, and validation thresholds are untouched.

**Follow-up (separate change)**

One change should add both a `ghiChu` column and an employee-reference column to `FinishedProduct`. They belong together: both need a migration, and both are the same structural question — which level does this attribute belong to (fry batch / fry batch × machine / fry batch × machine × grade). `operatorId` is already selected in `OperatorSelectionScreen` but only lives in `sessionStorage` and is never sent to the server; the backend receives only a name string, so duplicate names are indistinguishable. `createdById` in kiosk mode records the activating admin, not the worker.
