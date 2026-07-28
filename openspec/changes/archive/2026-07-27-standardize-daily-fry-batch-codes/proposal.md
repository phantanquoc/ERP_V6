## Why

Fry-batch codes are currently created one at a time by the worker. `generateMaChien()` reads the highest `MC` code in the whole table and adds one, padded to three digits, producing an unbounded sequence `MC-001`, `MC-002`, … The factory actually runs a fixed daily cycle: sixteen batches, the first starting at 06:30, each lasting 90 minutes, the last finishing at 06:30 the next morning. The codes should therefore repeat identically every day as `MC-01` … `MC-16`, grouped into three shifts so a worker who picks a shift sees only that shift's batches.

Making the code repeat daily breaks four things in the current data model, all verified in the code:

1. **Creation stops working on day two.** `MaterialEvaluation.maChien` is declared `String @unique`. The second day's `MC-01` collides and no record can be created at all.

2. **Child tables overwrite each other.** `FinishedProduct`, `SystemOperation` and `QualityEvaluation` each declare `@@unique([maChien, machineSystemId])`. Once `MC-01` recurs, that pair repeats every day, so a new day's output silently overwrites the previous day's. This is data loss, not a display bug.

3. **Deletion becomes catastrophic.** `systemOperationService` deletes child rows with `deleteMany({ where: { maChien } })` — three such statements, plus further `deleteMany` and `findFirst` calls keyed on `maChien` alone. Today `maChien` is globally unique, so deleting `MC-047` affects a single batch. Once `MC-01` recurs daily, **deleting `MC-01` deletes `MC-01` for every day in history** — one tap wipes months of records.

4. **Lookups become ambiguous.** `maChien` appears 113 times across ten service and controller files, mostly as `where: { maChien }` with no date, so each of those queries would start matching many records instead of one.

Two further gaps surfaced while mapping the work and are fixed here because this change already carries a migration: `MaterialEvaluation` has no `ghiChu` column even though "Ghi chú" is one of the required table columns, and `FinishedProduct` still cannot attribute a grade weight to the worker who entered it.

## What Changes

**Fry-batch identity**

- Add `ngaySanXuat` (date) to `MaterialEvaluation` as the primary grouping axis. A production day is the 06:30-to-06:30 cycle, not the calendar day, so `MC-13` … `MC-16` (which run at 00:30, 02:00, 03:30 and 05:00) keep the `ngaySanXuat` of the day their shift started.
- **BREAKING**: drop `@unique` from `maChien`, replace with `@@unique([maChien, ngaySanXuat])`.
- **BREAKING**: change the three child tables to `@@unique([maChien, ngaySanXuat, machineSystemId])`.
- Backfill `ngaySanXuat` for existing rows from `thoiGianChien` using the 06:30 boundary — a row timed before 06:30 belongs to the **previous** day.
- Replace `generateMaChien()` with a daily-schedule module that derives the sixteen codes, their start times and their shift for any given production day. Codes are computed, never sequence-allocated.

**Daily schedule**

```
Ca 1 (5)  MC-01 06:30  MC-02 08:00  MC-03 09:30  MC-04 11:00  MC-05 12:30
Ca 2 (5)  MC-06 14:00  MC-07 15:30  MC-08 17:00  MC-09 18:30  MC-10 20:00
Ca 3 (6)  MC-11 21:30  MC-12 23:00  MC-13 00:30  MC-14 02:00  MC-15 03:30  MC-16 05:00
```

Shift boundaries are fixed by batch count (5/5/6), not by the hours a worker clocks in. `6:30 + 16 × 90 min = 6:30 + 24 h`, so the cycle closes exactly.

- No records are pre-created. The sixteen codes are a computed schedule; a `MaterialEvaluation` row is written only when a worker actually enters data for that batch.

**Material-evaluation entry**

- Both entry screens change from "create a new code" to "pick a code from the current shift": the desktop `MaterialEvaluationManagement` and the tablet kiosk `ProductionMaterialEvaluationEntry`.
- The evaluation table presents fourteen columns: STT, Mã chiên, Thời gian chiên, Tên hàng hóa, Số lô kiện, Khối lượng (Kg/tua), Số lần ngâm, Nhiệt độ nước trước khi ngâm, Nhiệt độ nước sau vớt, Thời gian ngâm (Phút), Brix nước ngâm, Đánh giá nguyên liệu trước khi ngâm, Đánh giá nguyên liệu sau khi ngâm, Ghi chú.
- After picking a batch code the worker picks a warehouse package, and `tenHangHoa` plus `khoiLuong` are filled from it instead of being typed by hand, reusing the existing `lotProductId` / `warehouseIssueId` linkage.
- Add `ghiChu` to `MaterialEvaluation`.

**Output operator traceability**

- Add an entry-history child table for `FinishedProduct` recording which worker entered which grade at what time, replacing the single-column approximation. This supersedes the mechanism introduced earlier today in `fix-output-operator-attribution`, where a single `nguoiThucHien` column was kept and per-grade attribution was explicitly accepted as unreachable.
- The employee reference is a soft reference without a foreign-key constraint, matching the existing repo pattern for cross-schema links (`Employee` lives in the `common` schema, `FinishedProduct` in `business`).
- Add `ghiChu` to `FinishedProduct`.
- The Excel export surfaces per-grade attribution.

**Production data page**

- The Dữ liệu sản xuất page filters by production day, defaulting to today.

## Capabilities

### New Capabilities

- `daily-fry-batch-schedule`: the fixed sixteen-batch daily cycle — code set, start times, shift grouping, the 06:30 production-day boundary, and the rule that codes are computed rather than allocated.
- `output-entry-attribution`: per-grade record of which worker entered which output weight and when, and how that attribution is reported.

### Modified Capabilities

- `production-data-tablet-entry`: fry-batch codes are no longer generated per entry but selected from the daily schedule; batch identity becomes (code, production day) rather than code alone; child-row generation and deletion are scoped by production day; the material-evaluation entry flow gains warehouse-package-driven auto-fill and the fourteen-column table; output save switches from stamping a single operator column to writing entry-history rows.

## Impact

**Prisma**

- `backend/prisma/schema/business_production.prisma` — `MaterialEvaluation` gains `ngaySanXuat` and `ghiChu`, loses `@unique` on `maChien`, gains `@@unique([maChien, ngaySanXuat])`; `FinishedProduct` gains `ghiChu` and a new composite unique; `SystemOperation` and `QualityEvaluation` gain the new composite unique; a new entry-history model is added.
- A migration plus a backfill script for `ngaySanXuat`.

**Backend**

- `materialEvaluationService.ts` — remove `generateMaChien`, rework `getMaterialEvaluationByMaChien` and both create paths.
- `systemOperationService.ts` — the three `deleteMany` statements and the surrounding `deleteMany` / `findFirst` calls must all be scoped by production day. This is the highest-risk edit in the change.
- `finishedProductService.ts` — day-scoped lookups, `upsertByBatchMachine`, and the Excel export.
- `qualityEvaluationService.ts`, `machineSystemService.ts`, `myHistoryService.ts` and the four matching controllers.
- New module: the daily fry-batch schedule.
- `utils/codeGenerator.ts` — `nextStaticCode` / `staticCodeWhere` are no longer used for `MC`.

**Frontend**

- `components/MaterialEvaluationManagement.tsx` — fourteen-column table, batch selection, warehouse-package auto-fill.
- `pages/production/ProductionMaterialEvaluationEntry.tsx` — kiosk batch selection within the chosen shift.
- `pages/production/ProductionData.tsx` — production-day filter defaulting to today.
- `pages/production/ProductionDataEntry.tsx` — `computeDirtyRecords` writes entry-history rows.

**Out of scope**

- Existing `MC-001`-style data is left untouched; the new rule applies from the deployment cut-over. Reports spanning the cut-over will show both formats.
- `soLoKien` is not split into separate columns.
- No scheduled job and no pre-created records.
- The output preview screen (`FullGridPreview`), `FieldFocusEditor`, and the operation-parameters screen are unchanged.
- Percentage math, `tongKhoiLuong`, and waste distribution are unchanged.
- Kiosk session handling, validation thresholds, and `parseNumberInput` are unchanged.

**Known consequence**

Two code formats coexist after the cut-over. Any report crossing that boundary shows both `MC-001` and `MC-01`, and the old codes carry no meaningful daily grouping.
