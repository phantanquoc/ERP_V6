## 0. Safety Preconditions (blocking — do not skip)

- [x] 0.1 Back up the dev database before any migration: `docker compose -f docker-compose.dev.yml exec -T postgres pg_dump -U erp_user -d erp_database --format=custom > /tmp/pre_lookup_$(date +%Y%m%d_%H%M%S).dump`
- [x] 0.2 Verify the backup is readable, not just present: `pg_restore --list <dump-file> | head -5` — if this fails, STOP and do not proceed
- [x] 0.3 Record baseline row counts for every table in the column map, to compare after cascade tests: write the SELECT COUNT(*) output to /tmp/baseline_counts.txt
- [x] 0.4 Confirm no destructive SQL: the generated migration must contain only CREATE TABLE / CREATE INDEX / CREATE TYPE. If it contains DROP, ALTER COLUMN TYPE, or TRUNCATE, STOP and report to the user ← (verify: backup exists and restores-list cleanly, migration SQL is additive only)

## 1. Database Schema and Migration

- [x] 1.1 Create Prisma schema for Lookup table in common schema with fields: id, group, code, label, sortOrder, isActive, createdAt, updatedAt
- [x] 1.2 Add unique constraint @@unique([group, code]) and index @@index([group, isActive, sortOrder])
- [x] 1.3 Create Prisma schema for LookupChangeLog table with fields: id, lookupId, group, action (enum), oldLabel, newLabel, affectedRecords, affectedTables (Json), changedByUserId, createdAt
- [x] 1.4 Create LookupChangeAction enum with values: CREATE, UPDATE_LABEL, CASCADE_RENAME, UPDATE_SORT_ORDER, SOFT_DELETE, REACTIVATE
- [x] 1.5 Add indexes on LookupChangeLog: @@index([lookupId, createdAt(sort: Desc)]) and @@index([group, createdAt(sort: Desc)])
- [x] 1.6 Generate migration file with npx prisma migrate dev --create-only --name create_lookup_tables
- [x] 1.7 Review generated SQL to ensure no existing columns are dropped or modified
- [x] 1.8 Run migration on dev database: npx prisma migrate dev ← (verify: both tables exist, indexes created, no errors, existing table row counts unchanged vs /tmp/baseline_counts.txt)

## 2. Seed Data

- [x] 2.0 BEFORE writing seed values, query the dev database for the actual distinct values of every mapped column and use that output as the source of truth. The per-group counts below are from a prior production audit and are indicative only — if the query disagrees, trust the query and note the difference. Example: `docker compose -f docker-compose.dev.yml exec -T postgres psql -U erp_user -d erp_database -c "SELECT \"loaiChiPhi\", COUNT(*) FROM business.general_costs GROUP BY 1;"`
- [x] 2.1 Create backend/prisma/seed-data/lookups.ts file with seedLookups function
- [x] 2.2 Add DON_VI_TINH group with 19 values (union of constants/units.ts 13 values + ProductFormModal 6 values): Kg, Tấn, Gram, Cái, Bộ, Hộp, Thùng, Bao, Gói, Lít, Mét, Cuộn, Người, Đôi, Can, Miếng, Xô, Bịch, Xe
- [x] 2.3 Add LOAI_CHI_PHI group as the UNION of values across all 6 mapped columns. Note: production `general_costs.loaiChiPhi` holds only 3 rows and all are dirty ("sản suất" typo, "sản xuất", "chi phí sản xuất"); the clean values ("Vật tư", "Nhân công", "Phụ liệu") come from process_flowchart_costs / production_flowchart_costs. Seed every distinct value as-is — do NOT normalize or drop the dirty ones
- [x] 2.4 Add PHAN_LOAI_VAT_TU group with all distinct values across its 4 mapped columns (~9 from prior audit), including case variants ("Văn phòng phẩm" and "văn phòng phẩm") and free-text entries that leaked into the field — seed as-is, admin will merge via cascade rename
- [x] 2.5 Add KHU_VUC group with all distinct non-empty values from business.machine_systems.khuVuc (~17 from prior audit). Production has 3 rows with empty-string khuVuc — do NOT create a lookup entry for the empty value and do NOT modify those 3 rows
- [x] 2.6 Add MUC_DO_LOI group with 3 values from production fault_records.mucDo
- [x] 2.7 Add LOAI_LOI group with 2 values from production repair_request_items.loaiLoi
- [x] 2.8 Add LOAI_SAN_PHAM group with 7 values from production international_products.loaiSanPham
- [x] 2.9 Add LOAI_KHACH_HANG group with 2 values from production customers.loaiKhachHang
- [x] 2.10 Add VAI_TRO_DU_AN group with 1 value from production project_members.vaiTro
- [x] 2.11 Add LOAI_CHI_PHI_XUAT_KHAU group — VERIFIED against prod 2026-08-03: `business.export_costs.loaiChiPhi` holds exactly ONE distinct value ("Chi phí xuất khẩu", 19 rows) on BOTH dev and prod. The earlier "4 values" figure in this spec was wrong. Seed 1 value only; do not invent others
- [x] 2.12 Add DON_VI_TIEN group with 1 value: VND
- [x] 2.13 Use upsert with (group, code) to make seed idempotent
- [x] 2.14 Test seed script: node -e "require('./prisma/seed-data/lookups').seedLookups()" ← (verify: row count per group matches the DB query from task 2.0, re-running the seed creates no duplicates, no existing business data was modified)

## 3. Backend Service Layer

> **Batch A outcome (verified 2026-08-03) — read before starting:**
> - `common.lookups` seeded with **74 rows across 11 groups**. DON_VI_TINH has **23** (not 19): the extra 4 are real production data — `kg`(3 rows), `KG`(1), `Container`(5), `Lô`(3).
> - Prod scan across all 21 unit columns found **21 distinct values in use**; every one has a matching seeded lookup. Zero orphans. `Mét` and `Tấn` are seeded but unused (harmless spares from units.ts).
> - Codes carry a numeric disambiguator where `slugifyToUpperCode` collides: `DON_VI_TINH_KG` / `_KG_2` / `_KG_3` for `Kg` / `kg` / `KG`. **Cascade rename MUST match on `label`, never on `code`.**
> - `LOAI_CHI_PHI` contains a value with a **trailing space** (`'sản xuất '`). Cascade WHERE clauses must match exactly, not trimmed, or that row will be missed.
> - `prisma migrate dev` is UNUSABLE on this repo (shadow-DB failure + pre-existing schema drift that generates unrelated DROP COLUMN statements). Migration `20260803000000_create_lookup_tables` was hand-written and applied via psql. Do NOT run `migrate dev` for any reason.
> - `backend/.env` points at the wrong DB (`erp_db`/`postgres`). Pass `DATABASE_URL="postgresql://erp_user:erp_dev_password@localhost:5432/erp_database"` inline. Do NOT edit `.env`.

- [x] 3.1 Create backend/src/services/lookupService.ts with getAll(group, includeInactive) method
- [x] 3.2 Add getById(id) method that returns lookup with usage count
- [x] 3.3 Add create(group, label) method that auto-generates code using slugifyToUpperCode utility
- [x] 3.4 Define LOOKUP_COLUMN_MAP constant with all 21 columns for DON_VI_TINH group (exact list in specs/lookup-crud/spec.md; verify each against schema)
- [x] 3.5 Define LOOKUP_COLUMN_MAP entries for remaining 10 groups per the exact lists in specs/lookup-crud/spec.md (PHAN_LOAI_VAT_TU 4 cols, LOAI_CHI_PHI 6 cols, MUC_DO_LOI 2, LOAI_LOI 2, DON_VI_TIEN 2, KHU_VUC/LOAI_SAN_PHAM/LOAI_KHACH_HANG/VAI_TRO_DU_AN 1 each); tax_reports.donViTinh is @map("donVi") — raw SQL must use "donVi"
- [x] 3.6 Add getUsageCount(lookupId, group) method that queries all mapped columns and returns total count + breakdown
- [x] 3.7 Add update(id, data) method that handles label, sortOrder, and isActive updates
- [x] 3.8 Implement cascade rename logic: if label changes and usageCount > 0, require confirmCascade flag
- [x] 3.9 Add cascadeRename(lookupId, oldLabel, newLabel, group) method wrapped in prisma.$transaction
- [x] 3.10 In cascadeRename transaction: create LookupChangeLog entry with action=CASCADE_RENAME, update lookup.label, update all mapped columns where value=oldLabel
- [x] 3.11 Add softDelete(id) method that checks usageCount and blocks if > 0, otherwise sets isActive=false
- [x] 3.12 Add getHistory(lookupId or group, pagination) method that queries LookupChangeLog ordered by createdAt DESC ← (verify: service layer complete, all methods use transactions where needed)

## 4. Backend Service Tests

- [x] 4.1 Create backend/src/__tests__/lookupService.test.ts with test database setup
- [x] 4.2 Write test: create lookup with valid data returns new lookup with auto-generated code
- [x] 4.3 Write test: create duplicate code in same group throws 409 error
- [x] 4.4 Write test: getUsageCount returns 0 for unused lookup
- [x] 4.5 Write test: getUsageCount counts correctly across DON_VI_TINH's 21 columns (create 5 test records in different tables)
- [x] 4.6 Write test: update label without cascade when usageCount=0 succeeds
- [x] 4.7 Write test: update label with usageCount>0 without confirmCascade returns 409 with affectedRecords count
- [x] 4.8 Write test: cascadeRename updates lookup and all mapped columns atomically (verify 3+ tables updated)
- [x] 4.9 Write test: cascadeRename creates LookupChangeLog entry with correct affectedTables breakdown
- [x] 4.10 Write test: cascadeRename rollback on failure leaves no partial updates (mock Prisma to throw mid-transaction)
- [x] 4.11 Write test: softDelete blocks when usageCount > 0
- [x] 4.12 Write test: softDelete succeeds when usageCount = 0
- [x] 4.13 Run tests: npx jest src/__tests__/lookupService.test.ts --runInBand ← (verify: all tests pass, cascade operations tested thoroughly)
- [x] 4.14 (added) Write test: export_costs.loaiChiPhi overlap — usage not double-counted, cascade updates each row exactly once
- [x] 4.15 (added) Write test: trailing-space label ('sản xuất ') is found, counted and renamed exactly, without trimming
- [x] 4.16 (added) Write test: tax_reports cascade passes the Prisma FIELD name (donViTinh) so the @map("donVi") column is really updated, not silently skipped

## 5. Backend Controller and Routes

- [x] 5.1 Create backend/src/controllers/lookupController.ts with getAll handler that calls lookupService.getAll
- [x] 5.2 Add getById handler that calls lookupService.getById
- [x] 5.3 Add create handler that validates request body and calls lookupService.create
- [x] 5.4 Add update handler that checks for confirmCascade flag and calls appropriate service method
- [x] 5.5 Add softDelete handler that calls lookupService.softDelete
- [x] 5.6 Add getUsage handler that calls lookupService.getUsageCount
- [x] 5.7 Add getHistory handler that calls lookupService.getHistory with pagination
- [x] 5.8 Create backend/src/routes/lookupRoutes.ts with GET /lookups route (authenticate only)
- [x] 5.9 Add GET /lookups/:id route (authenticate only)
- [x] 5.10 Add POST /lookups route (authorize ADMIN only)
- [x] 5.11 Add PUT /lookups/:id route (authorize ADMIN only)
- [x] 5.12 Add DELETE /lookups/:id route (authorize ADMIN only)
- [x] 5.13 Add GET /lookups/:id/usage route (authenticate only)
- [x] 5.14 Add GET /lookups/history route and GET /lookups/:id/history route (authenticate only)
- [x] 5.15 Register lookupRoutes in backend/src/routes/index.ts ROUTE_MAP under '/lookups' path
- [x] 5.16 Test API manually: curl http://localhost:5000/api/lookups?group=DON_VI_TINH should return 19 entries ← (verify: all endpoints registered, authorization working, responses match API spec)

## 6. Frontend Types and Hooks

> **Batch C outcome (verified 2026-08-03) — read before starting:**
> - API live at `/api/lookups` (ROUTE_MAP key `lookup`); startup log went 74 → **75 registered routes**.
> - `GET /api/lookups?group=DON_VI_TINH` returns **23** entries (task 5.16 / spec's "19" is stale — Batch A seeded 23).
> - Route order is load-bearing: `/history` is declared BEFORE `/:id` in `lookupRoutes.ts`. Do not reorder.
> - 409 cascade contract: `PUT /:id` with a label change on an in-use lookup returns HTTP 409 with
>   `{success:false, message, oldLabel, newLabel, affectedRecords, requiresConfirmation:true}` — detail is
>   flattened at the TOP LEVEL of the body, not nested under `data`. Retry with `confirmCascade:true`.
> - Blocked delete returns **400** (not 409); `DELETE` is soft only (`isActive=false`), row is never removed.
> - Query params: `all=true` for inactive, `includeValue=<label>` to retain a hidden value in an edit form (design.md Q2).
> - The dev container had a STALE Prisma client (no Lookup models) and nodemon crash-looped until
>   `docker compose -f docker-compose.dev.yml exec backend npx prisma generate` + `restart backend`. If the
>   backend 500s/crashes on lookup routes, regenerate in the CONTAINER — host `npx prisma generate` is not enough.

- [x] 6.1 Create frontend/src/types/lookup.ts with LookupGroup enum containing all 11 group names
- [x] 6.2 Add Lookup interface with id, group, code, label, sortOrder, isActive, createdAt, updatedAt
- [x] 6.3 Add LookupUsage interface with usageCount, breakdown array
- [x] 6.4 Add LookupChangeLog interface matching backend schema
- [x] 6.5 Create frontend/src/hooks/useLookups.ts with useQuery hook for fetching lookups by group
- [x] 6.6 Add useLookupsAll hook that includes inactive entries (all=true param)
- [x] 6.7 Add useLookupUsage(id) hook for fetching usage count
- [x] 6.8 Add useCreateLookup mutation hook with query invalidation
- [x] 6.9 Add useUpdateLookup mutation hook with cascade confirmation handling
- [x] 6.10 Add useDeleteLookup mutation hook
- [x] 6.11 Add useLookupHistory hook for fetching change history ← (verify: all hooks use TanStack Query, mutations invalidate cache correctly)

## 7. Frontend Admin UI - LookupManager Component

- [x] 7.1 Create frontend/src/components/LookupManager.tsx with group selector dropdown (11 groups)
- [x] 7.2 Add table with columns: Label, Code, Sort Order, Usage Count, Status, Actions
- [x] 7.3 Fetch lookups for selected group using useLookups hook
- [x] 7.4 Fetch usage count for each row using useLookupUsage hook (parallel requests)
- [x] 7.5 Add "Show hidden entries" toggle that switches to useLookupsAll hook
- [x] 7.6 Add "Add new" button that opens modal with label input field
- [x] 7.7 Implement create modal submit handler that calls useCreateLookup mutation
- [x] 7.8 Add edit icon per row that opens modal with current values
- [x] 7.9 Implement edit modal with label, sortOrder, isActive fields
- [x] 7.10 Add cascade confirmation dialog that appears when API returns 409 with requiresConfirmation=true
- [x] 7.11 Display confirmation message: "Renaming 'X' to 'Y' will update N records. Continue?"
- [x] 7.12 On user confirmation, resubmit update with confirmCascade=true flag
- [x] 7.13 Show loading spinner during cascade operation
- [x] 7.14 Add delete icon per row with confirmation dialog
- [x] 7.15 Handle 400 error from delete API (usageCount > 0) with error message "Cannot delete — used by N records. Hide instead."
- [x] 7.16 Add toggle for isActive status (show/hide) that calls update mutation
- [x] 7.17 Display usage count badge per row with click handler to show breakdown popover
- [x] 7.18 Add loading skeleton while fetching lookups
- [x] 7.19 Add error banner with retry button for API failures ← (verify: all CRUD operations work, cascade confirmation flow works end-to-end)

## 8. Frontend Integration - Settings Page

- [x] 8.1 Open frontend/src/components/CategoryManagementSection.tsx (or equivalent settings page)
- [x] 8.2 Add new tab or section titled "Danh mục dùng chung" (Shared Classifications)
- [x] 8.3 Import and render LookupManager component in new tab
- [x] 8.4 Test navigation: open http://localhost:5173/settings and verify new tab appears
- [x] 8.5 Test tab switching: click "Danh mục dùng chung" and verify LookupManager loads ← (verify: admin UI accessible from settings page)

## 9. Frontend Migration - UnitSelect Component

- [x] 9.1 Open frontend/src/components/common/UnitSelect.tsx
- [x] 9.2 Replace import of DON_VI_TINH_OPTIONS from constants/units.ts with useLookups('DON_VI_TINH') hook
- [x] 9.3 Update dropdown options mapping: units.map(u => <option key={u.code} value={u.label}>{u.label}</option>)
- [x] 9.4 Update value prop to use u.label instead of hardcoded string
- [x] 9.5 Add loading state while useLookups is fetching
- [x] 9.6 Add error state if useLookups fails (fallback to empty array with warning message) ← (verify: UnitSelect now pulls from API, dropdown shows all 19 units)

## 10. Frontend Migration - Dependent Components

- [x] 10.1 Open frontend/src/components/WarehouseManagement.tsx and verify UnitSelect usage still works
- [x] 10.2 Update validate logic: replace DON_VI_TINH_OPTIONS.includes() with units.some(u => u.label === value)
- [x] 10.3 Open frontend/src/components/CreatePurchaseRequestModal.tsx and verify UnitSelect
- [x] 10.4 Open frontend/src/components/CreateWarehouseReceiptModal.tsx and update validate logic for units
- [x] 10.5 Open frontend/src/components/SupplyRequestManagement.tsx and verify UnitSelect
- [x] 10.6 Open frontend/src/components/WarehouseReceiptTab.tsx and update validate logic for units
- [x] 10.7 Open frontend/src/components/SparePartList.tsx and verify UnitSelect
- [x] 10.8 Open frontend/src/components/QuotationRequestManagement.tsx and verify UnitSelect
- [x] 10.9 Open frontend/src/components/ProcessManagement.tsx and verify UnitSelect
- [x] 10.10 Open frontend/src/components/SupplyRequestModal.tsx and verify UnitSelect
- [x] 10.11 Open frontend/src/components/ExportCostManagement.tsx and verify UnitSelect
- [x] 10.12 Open frontend/src/pages/purchasing/PurchasingEquipment.tsx and verify UnitSelect ← (verify: all 11 components updated, validation logic uses API data)

## 11. Deprecate Old Constants

- [x] 11.1 Open frontend/src/constants/units.ts
- [x] 11.2 Add JSDoc comment: @deprecated Use useLookups('DON_VI_TINH') hook instead. This constant is kept for backward compatibility only.
- [x] 11.3 Keep file in place (do not delete) for any legacy code that might still reference it

## 12. Type Checking and Linting

- [x] 12.1 Run backend type check: cd backend && npx tsc --noEmit
- [x] 12.2 Run backend linting: cd backend && npm run lint
- [x] 12.3 Run frontend type check: cd frontend && npx tsc --noEmit -p tsconfig.app.json
- [x] 12.4 Verify frontend error count has not increased from baseline (~610 errors)
- [x] 12.5 Run frontend linting: cd frontend && npm run lint ← (verify: no new type errors, no lint errors)

## 13. Integration Testing

- [x] 13.1 Start backend dev server (satisfied via docker-compose.dev backend container, 75 routes registered, host :5003)
- [x] 13.2 Start frontend dev server (satisfied via docker-compose.dev frontend container, host :5173)
- [x] 13.3 Test API endpoint: curl http://localhost:5000/api/lookups?group=DON_VI_TINH | jq '.data | length' should return 19
- [x] 13.4 Open http://localhost:5173/settings and navigate to "Danh mục dùng chung" tab
- [x] 13.5 Select "Đơn vị tính" group and verify 19 entries appear in table
- [x] 13.6 Click "Add new" and create test entry "Test Unit" - verify it appears in table
- [x] 13.7 Edit a test entry label and verify no confirmation dialog (usageCount=0)
- [ ] 13.8 NOT DONE AS WRITTEN — no supply_request_item was created. Equivalent coverage: 409 confirmation contract proven against the real in-use LOAI_CHI_PHI value 'sản xuất ' (business.general_costs), trailing space echoed intact; plus unit tests 4.7/4.15
- [ ] 13.9 NOT DONE AS WRITTEN — cascade WAS confirmed and verified (200, affectedRecords=1) on 'sản xuất ' rather than a supply_request_item; then reverted
- [ ] 13.10 NOT DONE AS WRITTEN — DB row update verified on business.general_costs instead of supply_request_items
- [x] 13.11 Try to delete the in-use test unit - verify error message blocks deletion
- [x] 13.12 Soft delete the test unit (hide it) - verify it disappears from default view
- [x] 13.13 Toggle "Show hidden entries" - verify soft-deleted entry appears grayed out
- [x] 13.14 Open warehouse form, click product dropdown - verify unit auto-fills correctly for products with Đôi, Can, Xe, etc.
- [x] 13.15 Check LookupChangeLog table in database - verify all operations created audit entries ← (verify: end-to-end flow works, cascade is atomic, audit trail recorded)

## 14. Full Test Suite

- [x] 14.1 Run all backend tests: cd backend && npm test
- [x] 14.2 Verify lookupService.test.ts passes with all cascade tests
- [x] 14.3 Verify no existing tests broken by new code ← (verify: all tests pass, no regressions)
