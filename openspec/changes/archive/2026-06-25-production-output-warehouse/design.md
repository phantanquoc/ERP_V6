## Context

ERP An Bình Foods produces dried fruit. A fry batch (`maChien`) bulk-creates one empty `SystemOperation`, `FinishedProduct`, and `QualityEvaluation` per active machine; operators later fill in the 8 weight grades of `FinishedProduct` (A, B, B Dầu, C, vụn lớn, vụn nhỏ, phế phẩm, ướt). These grades never reach inventory. Inventory is modeled as `InternationalProduct` → `LotProduct` (`soLuong` = stock, keyed by `internationalProductId`) → `WarehouseReceipt`. `warehouseReceiptService.create` already does the atomic stock update (read `soLuong` → `soLuongTruoc`, `resolveOrCreateLotProduct` finds/creates the product+lot-product by case-insensitive name, `soLuongSau = soLuongTruoc + soLuongNhap`, `$transaction`), and `batchCreate` loops it. `FinishedProduct` links to a product only via free-text `tenHangHoa`.

Constraints: multi-schema Prisma (`@@schema("business")`), CUID ids, `migrate dev` only, Route→Controller→Service→Prisma (never Prisma in controller), typed errors from `@utils/errors`, response shape `{success, message?, data?, pagination?}`, no generic `PATCH /status`, frontend hooks wrap TanStack Query with a query-key factory, Vietnamese user-facing text, API dates `YYYY-MM-DD` / UI `DD/MM/YYYY`.

## Goals / Non-Goals

**Goals:**
- Let finished output flow into warehouse stock with auto-filled, editable quantities and manual warehouse/lot selection.
- Give each of the 8 grades its own SKU so stock stays grade-separated.
- Provide multi-dimensional output statistics (date × product × grade × machine) distinguishing good output from scrap.
- Add a structured `FinishedProduct → InternationalProduct` link.
- Close the audited gaps (machine-filter mismatch, inactive-machine bypass, missing hooks, PUT/PATCH + dropped field) without changing established semantics.

**Non-Goals:**
- Backfilling `internationalProductId` on existing rows (stays null).
- Auto-dropping the dead `product_batches` table or deleting the duplicate page (surfaced for manual action only).
- Changing the meaning of `tongKhoiLuong` or the warehouse-receipt engine.
- Adding charts now (statistics returns table-ready data; charts are a later UI concern).
- Adding any new LLM provider or touching the AI service.

## Decisions

**D1 — Grade→SKU mapping via fixed `GRADE_LABELS` + base FK, not 8 FK columns or a mapping table.**
`FinishedProduct` gets one nullable `internationalProductId` pointing at the base product (e.g. "Mít sấy"). At receipt time, code derives each grade's SKU name as `"{tenSanPham} - {label}"` from a code-owned `GRADE_LABELS` constant, and `resolveOrCreateLotProduct` auto-creates the SKU by name if absent. *Why:* satisfies the "structured FK" requirement while keeping grade SKUs out of the schema; labels are constants so no typo risk; reuses the existing name-based resolver. *Alternatives:* 8 FK columns (schema bloat, rigid); a `FinishedProductGradeSku` mapping table (more correct long-term but heavier than needed and not requested).

**D2 — Reuse `warehouseReceiptService.batchCreate`; the new service only builds the input array.**
`finishedProductService` adds a builder that reads the 8 grade weights of a `FinishedProduct`/`maChien`, skips grades = 0, and emits up to 8 `CreateReceiptInput` rows (warehouseId/lotId from the caller, tenSanPham = grade SKU name, soLuongNhap = grade weight). *Why:* the atomic stock logic and code generation already exist and are correct; no duplication. *Alternative:* a bespoke transaction — rejected (re-implements solved logic, risk of divergence).

**D3 — Editable auto-fill on the client; server is the source of truth for defaults.**
The endpoint accepts the explicit per-row quantities the user confirmed (after editing), plus warehouseId + lotId. The client fetches the FinishedProduct, pre-fills 8 rows, lets the user edit/remove rows and pick warehouse + lot, then sends the final rows. *Why:* keeps the server stateless about UI edits and avoids a generic mutate-by-id; matches "auto-fill but editable". *Alternative:* server reads weights and ignores client values — rejected (kills editability).

**D4 — `getOutputStatistics(filters)` replaces dead `getTotalWeightByDate`.**
Aggregation groups by date + product + grade + machine; filters = date range (required) + optional product/machine. Good output = A + B + B Dầu + C + vụn lớn + vụn nhỏ; scrap = phế phẩm + ướt — computed in the statistics layer only. *Why:* the dead method has no callers; the new one is the real need. *Alternative:* keep both — rejected (dead code is an audit item to remove).

**D5 — Unify machine eligibility on backend criteria (`loaiHeThong ∈ {SAN_XUAT, DONG_GOI, BAO_QUAN}` + `trangThai = HOAT_DONG`); frontend consumes the same criteria instead of the `^HT-CCK-(\d+)$` regex.**
Investigate `useActiveFryerMachineSystems` consumers (e.g. `SystemOperationManagement.tsx`) before switching so the dropdown set doesn't silently change. *Why:* one source of truth prevents backend creating data for machines the UI hides (and vice-versa). *Alternative:* keep regex on the client — rejected (the mismatch is the bug).

**D6 — Add active-machine validation to `createSystemOperation`.**
Throw `ValidationError` when the target machine is not `HOAT_DONG`. *Why:* the single-create API currently bypasses the bulk path's active filter. Marked BREAKING for callers that relied on the gap.

## Risks / Trade-offs

- **Grade-SKU proliferation** (one base product → up to 8 auto-created SKUs) → acceptable and intended; names are deterministic so re-receipts reuse the same SKU rather than duplicating.
- **`resolveOrCreateLotProduct` name collision** (a grade SKU name coincidentally matching an unrelated existing product) → low risk given the `" - {label}"` suffix convention; documented so future renames keep the suffix.
- **Changing `useActiveFryerMachineSystems` alters an existing dropdown set** → mitigated by auditing consumers first and matching the backend criteria exactly; verify the SystemOperation create flow still lists the expected machines.
- **Active-machine validation breaks existing API callers** → BREAKING is explicit in the proposal; bulk flow already enforces this, so only direct single-create callers are affected.
- **Migration on a high-risk schema file** → nullable FK with `onDelete: SetNull`, no backfill, `migrate dev` (never `db push`); back up before prod migrate per project rules.
- **Dead `product_batches` drop is destructive** → NOT automated; surfaced in tasks for manual confirmation to avoid data loss.

## Migration Plan

1. Edit `business_production.prisma` (FinishedProduct: `internationalProductId String?` + relation `onDelete: SetNull` + `@@index`) and `business_orders.prisma` (InternationalProduct reverse relation field).
2. `npx prisma migrate dev` to create + apply the migration; `npx prisma generate`.
3. Implement backend (service → controller → route → ROUTE_MAP), then frontend (service types → hooks → components).
4. Run `cd backend && npx tsc --noEmit && npm test`; `cd frontend && npx tsc --noEmit`.
5. Rollback: the FK is additive and nullable — reverting the migration drops the column with no data loss (existing rows were null).

## Open Questions

- None blocking. The dead `product_batches` table drop and duplicate-page removal are intentionally deferred to manual user action (surfaced in tasks).
