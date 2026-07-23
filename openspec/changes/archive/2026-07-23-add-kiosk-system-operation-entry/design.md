## Context

The fry-batch (`maChien`) production data spans four `business`-schema models: `MaterialEvaluation` (soaking parameters, owns `maChien` generation), `SystemOperation` (operation parameters, per machine), `FinishedProduct` (output grades, per machine), and `QualityEvaluation` (per machine). `SystemOperation`, `FinishedProduct`, and `QualityEvaluation` rows are created together, pre-filled with zeros, by `SystemOperationService.createBulkSystemOperations(maChien, thoiGianChien)` inside a single Prisma transaction. That function is currently triggered manually from the desktop (`MaterialEvaluationManagement.tsx`).

The kiosk already ships two entry pages (`/production/nhap-lieu` for output, `/production/nhap-lieu-danh-gia` for soaking evaluation) plus a hub with a dead third button. Kiosk-tab detection is route-aware: `isKioskTab()` only returns true when `window.location.pathname` starts with `/production/nhap-lieu`. Shift and operator selection are already extracted into reusable `ShiftSelectionScreen` and `OperatorSelectionScreen` components.

## Goals / Non-Goals

**Goals:**
- Add a kiosk page that lets a worker fill `SystemOperation` parameters by PATCHing the pre-created row for a (`maChien`, machine) pair.
- Make batch creation self-sufficient on the kiosk: creating a `MaterialEvaluation` auto-generates the child rows so the output and parameter pages have something to edit — no desktop step.
- Keep the output page and desktop screens working exactly as before.

**Non-Goals:**
- No schema changes; `createBulkSystemOperations` internals stay as-is.
- No kiosk page for `QualityEvaluation`.
- No criteria-based automation of the soaking evaluation itself.
- No change to the soaking-evaluation page beyond its display label.

## Decisions

### Decision 1: Auto-generate child rows as a non-fatal post-create side effect

After `createMaterialEvaluation` persists the batch (both the warehouse-linked transactional path and the legacy path), call `createBulkSystemOperations(maChien, thoiGianChien)` **outside** the create transaction, wrapped in `try/catch`. On failure, log and swallow — the batch create still returns success.

- **Why**: AGENTS.md mandates that side effects (notifications and similar) never bubble errors that fail the primary operation. A worker who successfully created a batch must not see a failure because machine-row seeding hiccupped; the rows can be regenerated. Placing the call outside the material-evaluation transaction keeps the two concerns independent and avoids nesting `createBulkSystemOperations`' own `$transaction` inside the warehouse transaction.
- **Alternative considered — inside the same transaction**: guarantees all-or-nothing consistency, but couples batch creation to machine-config state and would roll back a valid stock issue if seeding failed. Rejected: seeding is recoverable, stock issue is not worth losing. The trade-off (a batch could briefly exist without child rows) is acceptable and documented in Risks.
- **Alternative considered — leave the manual desktop trigger**: rejected because it breaks the kiosk-only flow the change exists to enable.

### Decision 2: Idempotent generation via the existing guard

`createBulkSystemOperations` already throws a `ValidationError` when a `SystemOperation` for the `maChien` exists. The auto-call runs only right after a brand-new `maChien` is created, so no duplication occurs in the normal path. The `try/catch` also absorbs the guard error harmlessly if the function is ever reached for an already-seeded batch, satisfying the "no duplicate generation" scenario.

- **Why**: reuse the existing guarantee instead of adding a second existence check.

### Decision 3: New page mirrors the output page's kiosk shell, PATCHes existing rows

`ProductionSystemOperationEntry.tsx` follows the same session-guard + wizard structure as the existing entry pages: `markTab()` on mount, shift gate, operator gate, then batch/machine selection and the parameter form. Saving uses the existing `useUpdateSystemOperationEntry` hook (PATCH by id); the row id is resolved via `useSystemOperationByBatchAndFryer` (already present in `useProductionDataEntry.ts`).

- **Why**: consistency with the two shipped kiosk pages and reuse of existing hooks/services minimizes new surface area. No new backend endpoint is required — the `SystemOperation` update route already exists.
- **Alternative considered — grid like the output page**: the output page edits many (`maChien` × machine) cells at once. Operation parameters are richer per cell (12 numeric fields + 2 scalars), so a step wizard (pick batch → pick machine → form) was chosen per the locked requirement.

### Decision 4: Route under the kiosk prefix + admin preview

New route `/production/nhap-lieu-van-hanh` sits under `/production/nhap-lieu` so `isKioskTab()` recognizes it. An admin preview route is added following the existing `/production/tablet-hub-preview` pattern (wrapped in `AdminRoute`).

- **Why**: kiosk detection is prefix-based; a route outside the prefix would silently disable kiosk auth/marking.

## Risks / Trade-offs

- **A batch can briefly exist without child rows if seeding fails** → Mitigation: failure is logged; the desktop "create operation" action still exists to regenerate; the parameter/output pages simply show no rows for that batch until reseeded. Low likelihood (seeding only reads active machines + writes rows).
- **No active production machine at creation time** → `createBulkSystemOperations` throws `NotFoundError`; caught and logged, batch still created. Same recovery path as above.
- **Double-trigger from desktop + auto-call** → the existing `maChien`-exists guard prevents duplicates; the second call is caught. No duplicate rows.
- **Label rename touches a shared page** → mitigated by restricting the change to display text; wizard fields and save logic are untouched (asserted by a spec scenario).

## Migration Plan

No data migration. Deploy is code-only. Existing batches created before this change are unaffected (their rows were already seeded manually or can be seeded from desktop). Rollback is a straight revert — no schema or data changes to undo. Existing kiosk pages and desktop screens keep working throughout.

## Open Questions

None — all decisions resolved during exploration (zero-fog).
