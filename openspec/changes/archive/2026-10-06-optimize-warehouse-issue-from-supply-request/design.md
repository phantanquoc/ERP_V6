# Design

## Context

`CreateWarehouseIssueModal` (`frontend/src/components/CreateWarehouseIssueModal.tsx`) is the sole entry for creating a warehouse issue from a supply request detail. Today each `SupplyRequestItem` becomes an `IssueRow` with empty `warehouseId/lotId/lotProductId`; the user picks all three per row via two selects + `LotProductCombobox`. Stock data is already in-memory (`warehouses[].lots[].lotProducts[]` from `GET /warehouses`), and matching helpers `productMatches`/`normalizeName` already filter candidates. `supplyRequestService.batchFulfill` aggregates per-item `fulfilledQty`, creates a `WarehouseIssue` with N `WarehouseIssueItem` rows, and (when `routeShortageToPurchase !== false`) auto-creates `ReplenishmentRequest` rows per `phanLoai` bucket and bridges `SupplyRequest.trangThai` to `Chờ bổ sung`. See `proposal.md` for motivation; see `specs/**` for behavioral contracts.

## Goals / Non-Goals

**Goals:**
- Cut the picks-per-request from O(lines × 3) to near-zero via ranked auto-suggestion and one-click bulk fill.
- Support one YCCC line → N issue rows when stock is fragmented, without changing the `WarehouseIssue`/`WarehouseIssueItem` schema or the `batchFulfill` contract (frontend aggregation).
- Remove the incorrect shortage→purchasing path for this flow.
- Let the confirmation step fix quantity/package inline so users do not round-trip to the main form.

**Non-Goals:**
- New backend search/ranking API; new slip type; changes to `warehouseIssueService` core or Prisma schema.
- Automatic FIFO splitting across lots without user confirmation.
- Standalone (non-YCCC) issue flow changes beyond reusing the same confirm editability.

## Decisions

**1. Frontend-only ranking, reuse `productMatches`.** Rank candidates with `sufficient-stock first → largest stock → maKien asc`. Reuses existing diacritic-insensitive substring match and avoids a new endpoint. Alternative — server-side ranking via `POST /lot-products/stock-check` — rejected as unnecessary while `GET /warehouses` already ships all packages.

**2. Disable shortage→YCBS via `routeShortageToPurchase: false`.** The modal always sends `false`; backend gates `ReplenishmentRequest` creation and the `Chờ bổ sung` bridge on this flag. Alternative — remove the backend code entirely — rejected to keep the generic `partialFulfill` path intact.

**3. Split handling by frontend aggregation.** Splitting duplicates the `IssueRow` (same `supplyRequestItemId`, next-best unused package). On submit, rows sharing an `itemId` are summed into one `BatchFulfillLine.fulfilledQty`; the issue slip is still created with N `WarehouseIssueItem` rows (one per package) in the same `prisma.$transaction`. Alternative — allow `batchFulfill` to accept multiple lines per `itemId` — deferred until splitting proves common.

**4. Editable confirm table with derived stock.** `LotProductCombobox` per confirm row sources from the already-loaded `warehouses`; live validation checks `0 < qty ≤ package.soLuong` per row and `lyDoChenhLech` when `KH ≠ TT`. Confirm is a derived view over `rows` state, not a second source of truth.

## Risks / Trade-offs

- **Stale stock (optimistic UI):** Loaded warehouses may be stale; backend `assertLinesFitStock` is the source of truth — submit may fail with `ValidationError` → Mitigation: show `getApiErrorMessage` and keep modal open so user can re-pick; no silent retry.
- **Name-match false positives/negatives:** `productMatches` is substring-based; ambiguous `tenGoi` may suggest the wrong product → Mitigation: suggestions are editable and show `tenSanPham` + `maKien` + stock so the user can spot mismatches; never auto-submit.
- **Split bookkeeping drift:** Split rows share `supplyRequestItemId`; naive sum may double-count if a split row is deleted → Mitigation: sum from current `rows` state at submit time, not from cached totals.
- **Bulk fill overwriting manual picks:** Auto-fill could clobber a deliberate manual choice → Mitigation: "Auto-fill all" only fills empty/unmodified rows or is explicit opt-in; "Clear suggestions" is reversible because candidates are recomputed.

## Migration Plan

No data migration. Deploy frontend + backend together. Rollback: frontend revert restores manual picks; backend with `false`-flagged requests remains correct (no YCBS created).

## Open Questions

None — defer server-side ranking until `warehouses` payload exceeds ~2–3k packages.
