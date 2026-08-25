## ADDED Requirements

### Requirement: Warehouse stock updates are atomic

`LotProduct.soLuong` updates driven by warehouse issues and receipts SHALL use an atomic `decrement`/`increment` (or `SELECT ... FOR UPDATE` via `$queryRaw`) inside the same transaction that validates the entire slip, so two concurrent operations on the same `LotProduct` cannot interleave a read-modify-write and overdraw stock. A stock-underflow that would produce a negative `soLuong` SHALL be rejected.

#### Scenario: Concurrent issues on one pallet do not overdraw
- **WHEN** two warehouse issues targeting the same `LotProduct` run concurrently
- **THEN** at least one is rejected or the final `soLuong` equals `initial − sum(qty)`, never below zero

### Requirement: Catalog entities use idempotent upsert

Creating an `InternationalProduct` by `tenSanPham` and a `LotProduct` by `(lotId, internationalProductId)` inside warehouse receipt helpers SHALL use idempotent upsert/unique-guarded insertion, so concurrent receipts carrying the same new product name do not create duplicate catalog rows.

#### Scenario: Concurrent receipts with the same new product name create one catalog row
- **WHEN** two receipts with the same new `tenSanPham` are processed concurrently
- **THEN** a single `InternationalProduct` is persisted and both receipts link to it

### Requirement: Schema uniqueness and checks for warehouse artifacts

The database schema SHALL enforce `@@unique([receiptId, stt])`, `@@unique([issueId, stt])`, supplier `phanLoaiNCC CHECK ('NVL','Thiết bị')`, and `CHECK (soLuong >= 0)` for `LotProduct` (or an equivalent app-enforced guard that a verifier can observe via the API).

#### Scenario: Duplicate line number is rejected
- **WHEN** a receipt is created with two lines carrying the same `stt` on the same `receiptId`
- **THEN** the write is rejected before any stock mutation
