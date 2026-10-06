# Proposal: Optimize Warehouse Issue from Supply Request

## Why

Creating a warehouse issue slip from a supply request detail (YCCC) currently requires manual selection of Warehouse → Lot → Package (Kiện) for every line. For multi-item requests where goods are spread across multiple warehouses/lots/packages, this is slow and error-prone. Additionally, the "shortage → auto-create replenishment request (YCBS) to purchasing" path is incorrect for this flow — goods have already been procured/received, so a shortage is an internal stock issue, not a purchasing need. The confirmation modal is read-only, forcing users to close and re-edit the main form to fix quantities.

## What Changes

- Remove the "route shortage to purchasing" mechanism for the `CreateWarehouseIssueModal` supply-request path: all `BatchFulfillLine` entries send `routeShortageToPurchase: false`; backend `batchFulfill` skips `ReplenishmentRequest` creation and the `Chờ bổ sung` status bridge when this flag is false.
- Auto-suggest the best matching package (LotProduct) for each YCCC line on modal open, reusing existing `productMatches`/`normalizeName` logic. Candidates are ranked: sufficient stock for remaining quantity first → largest stock → FIFO (`maKien` order). Pre-fill `warehouseId`/`lotId`/`lotProductId` for each row; add header actions "Auto-fill all" / "Clear suggestions" and per-row stock badges plus an aggregate stock summary.
- Allow splitting a single YCCC line into multiple issue rows when one package is insufficient: a "Split package" action duplicates the row with the same `supplyRequestItemId`, auto-suggesting the next-best package for the new row. On submit, quantities for the same `itemId` are summed into one `BatchFulfillLine.fulfilledQty` while the warehouse issue slip is created with N `WarehouseIssueItem` rows (one per package).
- Make the confirmation modal editable: quantity (`SL TT`) becomes a number input and package (`Kiện`) becomes a `LotProductCombobox` inline in the table, with live validation (quantity ≤ package stock) and disabled confirm when over-stock or when `lyDoChenhLech` is required but missing (`KH ≠ TT`).

## Capabilities

### New Capabilities
- `warehouse-issue-auto-suggest`: Auto-suggestion and package-splitting UX for creating warehouse issues from supply requests (ranking, pre-fill, bulk actions, split, inline confirmation editing).

### Modified Capabilities
- `supply-request-multi-item`: Batch fulfillment behavior when invoked from warehouse issue creation — shortage is no longer routed to purchasing for this path.
- `warehouse-slip-management`: Confirmation step for warehouse issues allows inline editing of quantity and package before creation.

## Impact

- **Frontend**: `frontend/src/components/CreateWarehouseIssueModal.tsx` (main change), `frontend/src/services/supplyRequestService.ts` (type/documentation for `routeShortageToPurchase`).
- **Backend**: `backend/src/services/supplyRequestService.ts` — `batchFulfill` respects `routeShortageToPurchase=false` to skip replenishment creation and status transition; no schema or route changes.
- **No impact**: Prisma schema (`business_production.prisma`), `warehouseIssueService` core, `ROUTE_MAP`, other slip types (receipts, standalone issues).
