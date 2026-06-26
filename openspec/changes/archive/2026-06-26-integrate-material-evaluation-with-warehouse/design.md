## Context

The "Material Evaluation Before Drying" workflow lives inside Production Management (Quản lý SX). It currently stores three free-text fields — `tenHangHoa` (product name), `soLoKien` (lot/package code), and `khoiLuong` (quantity) — entered by hand each time. Meanwhile, the warehouse module already tracks the same physical inventory through a `Warehouse → Lot → LotProduct` hierarchy, with `InternationalProduct` as the catalog. Stock-out slips (`WarehouseIssue`) carry a snapshot of `soLuongTruoc`, `soLuongXuat`, `soLuongSau` and decrement `LotProduct.soLuong` on creation.

The two systems describe the same event (raw material moves from a warehouse package into the soaking/drying line) but are unaware of each other. Warehouse staff must redo the data entry as a manual stock-out slip after a production batch is created, and the typed lot codes do not always match real warehouse records.

Stakeholders: production staff (creators of Material Evaluations), warehouse staff (consumers of stock-out slips), and managers who reconcile both sides. Constraints come from the project conventions in `CLAUDE.md`/`AGENTS.md`: all writes in a Prisma transaction, status forward-only, CUID ids, typed errors, response shape `{ success, message?, data?, pagination? }`, Vietnamese for user-facing strings, English for code.

## Goals / Non-Goals

**Goals:**

- Replace the three free-text inputs with a 3-level cascade matching the warehouse hierarchy exactly.
- Make stock movement automatic: one user action creates both the evaluation and the corresponding `WarehouseIssue` atomically.
- Make stock refund automatic on deletion, so canceling a batch returns inventory to the originating package.
- Preserve historical data: deletions in the warehouse module must never break old evaluations.
- Mark auto-generated stock-out slips so warehouse staff can distinguish them from manual entries.
- Be idempotent at the seed layer so demos and fresh installs always have raw-material data.

**Non-Goals:**

- Refactoring `QualityEvaluation` (UUID id, String `thoiGianChien`) — known inconsistency, separate task.
- Per-basket ("xọt") granularity. A machine receiving 50 kg = two 25 kg baskets is fine at this scope.
- Water absorption coefficient.
- Changing `confirmFinishedProductWarehouseReceipt` (the inbound counterpart) or `createBulkSystemOperations` (which still creates empty children for every active production machine).
- Editing the quantity (`khoiLuong`) of an existing evaluation — staff must delete and recreate.
- Selecting from multiple warehouses simultaneously in one evaluation. One evaluation = one package.

## Decisions

### Foreign keys are nullable with `ON DELETE SET NULL`, not cascade

`MaterialEvaluation.lotProductId` and `MaterialEvaluation.warehouseIssueId` are both `String?` with `onDelete: SetNull`.

- **Why**: Material Evaluations are historical production records and must survive even if the warehouse module is reorganized or rows are pruned. Cascading deletes from the warehouse side would silently destroy production history.
- **Trade-off**: We keep snapshot copies of `tenHangHoa` and `soLoKien` so the UI can still render meaningful labels when the link goes null. The cost is a small denormalization, which the team already accepts elsewhere in this codebase (`WarehouseIssue` already snapshots `tenSanPham`, `tenKho`, `tenLo`).
- **Alternative considered**: Hard FK + cascade. Rejected because historical evaluations would vanish when staff clean up old warehouse data.

### `warehouseIssueId` is `@unique`

The relationship is logically 1-to-1: one auto-generated stock-out slip per evaluation.

- **Why**: Enforces the invariant at the DB layer and lets us model the relation as `MaterialEvaluation?` on `WarehouseIssue` without needing array semantics.
- **Implication**: An update endpoint must never create a second `WarehouseIssue` for the same evaluation. Re-issuing is achieved by delete + create.

### Transactional create vs. two-phase

Both the `WarehouseIssue` and the `LotProduct.soLuong` decrement happen inside the same `prisma.$transaction` as the `MaterialEvaluation` insert.

- **Why**: Prevents partial state — a stock-out slip without an evaluation, or an evaluation without stock movement. Matches the existing pattern used by `WarehouseIssueService.create` (which already wraps slip creation + stock decrement together).
- **Concurrency**: Stock validation (`soLuong >= khoiLuong`) is performed inside the transaction by reading the `LotProduct` row at the start and writing the decremented value at the end. Under contention, the second writer will read a stale `soLuong` and produce an oversell. **Mitigation**: rely on a row-level `SELECT … FOR UPDATE` (Prisma: a fresh `findUnique` inside the transaction immediately followed by `update` with the previous read as a guard) and add an additional pre-write check that throws `ValidationError` if the post-decrement value would go negative. This matches Prisma defaults for serial transactions and is acceptable for the expected concurrency level (≤ 5 concurrent users on this workflow).
- **Alternative considered**: Two-phase (create evaluation first, fire-and-forget stock-out as notification). Rejected — silent stock drift is worse than a transactional rollback.

### Auto-issue is marked by a literal `ghiChu` prefix, not a boolean column

`WarehouseIssue.ghiChu` begins with `[TỰ ĐỘNG] Xuất nguyên liệu cho mẻ chiên {maChien} ngày {dd/mm/yyyy}` for auto-generated slips.

- **Why**: No schema change required for `WarehouseIssue`, the marker is visible to humans in any list view, and the prefix is queryable with a `startsWith` filter if needed later.
- **Trade-off**: Less type-safe than a boolean column. Acceptable because the marker is for human eyes and the canonical link is `MaterialEvaluation.warehouseIssueId`.

### Delete refunds via lookup, not via stored `soLuongXuat`

The delete path reads `WarehouseIssue.soLuongXuat` and adds that back to `LotProduct.soLuong`.

- **Why**: The slip is the source of truth for "how much was issued". Reading from `MaterialEvaluation.khoiLuong` would diverge if those fields ever go out of sync.
- **Edge case**: If the `LotProduct` has been deleted (its `materialEvaluations.lotProductId` is now `NULL`), refund is skipped silently and only the slip is removed. The user will not be surprised because the warehouse row no longer exists.

### `khoiLuong` is immutable after creation

The update endpoint either rejects or silently drops `khoiLuong` updates.

- **Why**: Changing the quantity post-hoc would require either rebalancing the source `LotProduct` (complex, error-prone) or leaving the warehouse row and the evaluation out of sync. Both are worse than the existing UX of "delete and create again", which is one extra click.
- **Mitigation**: The UI will hide the quantity input when editing.

### Seed contains eight rows, no more

Seeds NL-001..NL-008 cover Mít, Chuối, Khoai lang, Xoài, Sầu riêng, Đậu phộng, Khoai môn, Dứa.

- **Why**: The user requested "seed các loại sản phẩm để hồi tôi tự chỉnh sửa sau" — eight is enough to populate the dropdown on a fresh install and lets the user tune the list later. We do not need every possible fruit at seed time.
- **Idempotent**: `upsert` on `maSanPham`.

### Cascade UI uses three separate hooks, not one composite query

`useRawMaterials`, `useLotsByProduct(productId)`, `useKienByProductAndLot(productId, lotId)`.

- **Why**: Each level cache-invalidates independently (e.g. a new lot doesn't invalidate the product list). Matches the existing TanStack Query factory pattern in `frontend/src/hooks`.
- **Alternative considered**: One `useWarehouseTree` returning the full hierarchy. Rejected — overfetches and is harder to keep fresh after warehouse mutations.

## Risks / Trade-offs

- **Concurrent oversell on a low-stock package** → Mitigation: pre-write check inside the transaction with explicit `ValidationError` and Vietnamese message; row read happens inside the transaction.
- **Orphaned `WarehouseIssue` if a parallel session deletes `MaterialEvaluation` directly via Prisma** → Mitigation: `warehouseIssueId @unique` plus the application-level delete path that removes both atomically; direct DB deletes outside the service layer are explicitly disallowed by the project's "never call Prisma from controllers" rule.
- **Snapshot drift**: `tenHangHoa` and `soLoKien` snapshots are written at create time and not refreshed. → Trade-off accepted: snapshots reflect the truth at the moment of evaluation, which is desirable for historical records.
- **Legacy rows in the wild** without `lotProductId` cannot be retro-linked. → Trade-off accepted: leave them untouched, render from snapshots, no migration script needed.
- **Decimal vs. integer for `khoiLuong`** — the warehouse uses `Float` (e.g. 25.5 kg). The validation must use float comparison, not integer.
- **Generated `maPhieuXuat` collision** under heavy parallelism — already handled by the existing `nextYearlyCode` helper which queries `findFirst({ orderBy: maPhieuXuat desc })` inside the same call site. Acceptable as-is.

## Migration Plan

1. Add fields to `MaterialEvaluation` and reverse relations on `LotProduct` and `WarehouseIssue`. Generate migration via `npx prisma migrate dev --name add_lotproduct_warehouseissue_to_material_evaluation`. Run `npx prisma generate`.
2. Update seed script and run `npx prisma db seed` (or the project's seed command) — idempotent so safe to re-run.
3. Deploy backend changes (services, controllers, routes). New endpoints are additive; existing endpoints are backward-compatible (new fields are nullable).
4. Deploy frontend. The redesigned modal is the only user-visible change; the list view still renders legacy rows via snapshot fields.
5. No data backfill required. Existing rows remain valid.

**Rollback**: Revert frontend first (UI reverts to free-text inputs, but new endpoints continue to exist without harm). Then revert backend and run a `prisma migrate resolve` rollback. Existing rows with non-null `lotProductId`/`warehouseIssueId` continue to function as long as the columns still exist; dropping the columns is only safe if no production rows have used the new flow yet.

## Open Questions

- Should the auto-generated `WarehouseIssue` carry an `employeeId` derived from the logged-in user, or from a system account? **Decision for this change**: use `data.nguoiThucHien` and `employeeId` from the incoming Material Evaluation payload, treating the production staff as the issuer. Revisit if warehouse audit requires a distinct system account.
