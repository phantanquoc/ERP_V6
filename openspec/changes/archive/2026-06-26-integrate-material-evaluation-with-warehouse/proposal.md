## Why

In the Production Management workflow, staff must manually type the lot/package code (`soLoKien`), product name (`tenHangHoa`), and quantity (`khoiLuong`) when creating a Material Evaluation. This is error-prone, disconnected from the warehouse system, and forces the warehouse team to manually issue a separate stock-out slip afterwards. The two systems are tracking the same physical reality but require duplicate, manually-reconciled data entry.

## What Changes

- Replace the three free-text inputs (raw material name, lot/package code, quantity) with a cascading 3-level dropdown wired to warehouse data: Product → Lot → Package.
- Automatically generate a `WarehouseIssue` (stock-out slip) and decrement `LotProduct.soLuong` in the same transaction as Material Evaluation creation.
- Automatically delete the auto-generated `WarehouseIssue` and refund stock to the original `LotProduct` when the Material Evaluation is deleted.
- Mark auto-generated warehouse issues with a `[TỰ ĐỘNG]` (auto-generated) prefix in the note field, so warehouse staff can distinguish them from manual issues.
- Seed eight raw-material products (NL-001..NL-008) with `loaiSanPham = "Nguyên liệu thô"` so the new dropdown has data to work with.
- Add three new read endpoints: list raw materials, list lots containing a raw material, list packages in a lot for a raw material.
- Snapshot the chosen product name and lot label into the Material Evaluation row so historical records survive even if the source `LotProduct` is later deleted.
- **BREAKING**: Quantity (`khoiLuong`) is now immutable after creation — to correct it, staff must delete the Material Evaluation (which refunds stock) and create a new one.

## Capabilities

### New Capabilities
- `material-evaluation-warehouse-integration`: Cascading raw-material selection from warehouse stock, transactional auto-issue on create, and auto-refund on delete for the "Material Evaluation Before Drying" workflow in Production Management.

### Modified Capabilities
<!-- No existing capabilities require requirement-level changes. The finished-product-warehouse-receipt capability is the inbound counterpart and is untouched. -->

## Impact

- **Database schema**: New nullable FKs on `MaterialEvaluation` to `LotProduct` (SetNull) and `WarehouseIssue` (SetNull, unique). New Prisma migration required.
- **Backend services**: `materialEvaluationService` (create/delete rewritten), `internationalProductService` (new `getRawMaterials`), `lotProductService` (new `getLotsByProduct`, `getKienByProductAndLot`).
- **Backend API**: Three new GET endpoints under `/api/international-products` and `/api/lot-products`.
- **Frontend**: New TanStack Query hooks (`useRawMaterials`, `useLotsByProduct`, `useKienByProductAndLot`). `MaterialEvaluationManagement.tsx` wizard rewritten to use cascading selects.
- **Seed data**: Eight new raw-material rows in `seed-business.ts`.
- **No impact on**: `QualityEvaluation`, `FinishedProduct`, `SystemOperation`, bulk system-operation creation, finished-product warehouse receipt flow, basket-level granularity (`xọt`).
- **Backward compatibility**: Existing Material Evaluation rows (with `lotProductId = NULL`) continue to render via snapshot fields without breakage.
