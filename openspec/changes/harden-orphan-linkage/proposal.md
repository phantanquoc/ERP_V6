# Proposal: Harden Orphan Linkage — Khép kín đứt luồng, guard xóa, dọn dead code

## Why

Audit 156 models phát hiện 3 lỗi CRITICAL chặn chức năng (AI routers không mount, thiếu FK chuỗi kỹ thuật, god schema 72 models), 17 bảng mồ côi 0 relation, ~40 soft-ref String không FK, 10 component + 6 hook chết, và 8 luồng đứt/chưa gọn. Xóa bất kỳ dòng nào khi backend chưa có guard sẽ để lại rác lặng lẽ (không gãy ngay nhưng tích tụ thành lệch tồn/lương/quyền). Cần khép kín có thứ tự — 0 rủi ro DB trước, migration có rủi ro sau.

## What Changes

### Phase 1 — 0 rủi ro DB (code-only, rollback = git revert)

| # | Việc | File chạm |
|---|------|-----------|
| 1A | Mount `chat`/`agent`/`docs` routers trong `ai-service/app.py` + fix `chat/indexer.py` hash-check + fix `chat/routes.py:110` thiếu `req.role` | `ai-service/app.py`, `chat/indexer.py`, `chat/routes.py` |
| 1B | Đưa sinh mã YCKT/YCSC vào trong `$transaction` + fix `codeGenerator.ts` string sort sau 999 | `inspectionRequestController`, `repairRequestController`, `codeGenerator.ts`, `inspectionRequestService`, `repairRequestService` |
| 1C | Guard xóa: `employeeService.deleteEmployee`, `supplyRequestService.deleteSupplyRequest`, `departmentService.deleteDepartment`, `positionService.deletePosition` — check child count → `ConflictError` | 4 services |
| 1D | Face cooldown re-check sau `pg_advisory_xact_lock` + `warehouseReceiptService.void` clamp → throw + notification template mồ côi + file orphan cleanup | `faceAttendanceService`, `warehouseReceiptService`, `employeeEvaluationService`, `repairRequestService`, `upload.ts` |

### Phase 2 — Có migration, cần audit rác trước

| # | Việc | File chạm |
|---|------|-----------|
| 2A | Thêm FK `RepairSupplyLink.supplyRequestId → SupplyRequest` (Cascade) + `AcceptanceHandover.warehouseIssueId → WarehouseIssue` (SetNull) + unique `(repairRequestId, supplyRequestId)` | `common.prisma`, migration SQL `NOT VALID` → `VALIDATE` |
| 2B | Thêm `@@index` cho `Employee.positionId/subDepartmentId/status`, `SubDepartment.departmentId`, `Lot.warehouseId` — `CREATE INDEX CONCURRENTLY` thủ công | `common.prisma`, `business_production.prisma` |
| 2C | Sửa `supplyRequestService.onReplenishmentRequestCancelled` ghi `statusLog` + explicit event | `supplyRequestService.ts` |

### Phase 3 — Chuẩn hóa dữ liệu + tách schema + dọn dead code

| # | Việc | File chạm |
|---|------|-----------|
| 3A | Đổi `trangThai String` → enum cho `SupplyRequest`, `PurchaseRequest`, `ReplenishmentRequest` (sau khi SELECT DISTINCT sạch) | `business_production.prisma` |
| 3B | Tách `common.prisma` 72 models → 4-5 file cùng `@@schema("common")` (no-op migration) | `common_*.prisma` |
| 3C | Xóa 10 dead components + 6 orphan hooks (batch nhỏ) + URL sync 25 lists | `frontend/src/components/*`, `hooks/*` |
| 3D | Xóa enum `CustomerStatus`/`MaterialStandardType`, deprecate `RequestType.KIEM_TRA`, partial index `LotProduct(lotId, maKien) WHERE maKien IS NOT NULL` | `business_orders.prisma`, `common.prisma`, migration |

### Phase 4 — Backlog (không block)

Rename `warehouses` → `Warehouse` + `@@map`, link `SparePart`/`MaterialEvaluationCriteria`/`ProductionReport`, thêm `entityType` vào `Notification`, job cron quét orphan.

## Capabilities

### New Capabilities

- `orphan-guard`: Guard xóa an toàn cho mọi entity có child (hard delete vs cancel/void separation).

### Modified Capabilities

- `face-attendance`: Cooldown re-check sau advisory lock.
- `warehouse-receipt`: Void không clamp tồn về 0.
- `supply-chain`: FK chuỗi YCCC→YCMH→WarehouseReceipt khép kín.
- `ai-service`: RAG/Agent routing hoạt động, re-index đúng.

## Impact

- **Backend:** 8 services thêm guard, 2 controllers đổi vị trí code-gen, 1 util fix sort, 1 middleware cleanup file.
- **DB:** 2 FK mới + 1 unique + 5 indexes (Phase 2), enum type mới (Phase 3) — cần audit rác trước, `NOT VALID` → `VALIDATE`, `CONCURRENTLY`.
- **AI Service:** 3 files, restart container ~10s, không downtime DB.
- **Frontend:** Xóa dead code batch nhỏ, thêm URL sync — không breaking.
- **Risk:** Phase 1 thấp, Phase 2 trung bình-cao (FK fail nếu có rác), Phase 3 cao (enum fail nếu có string rác). Mỗi phase deploy độc lập.

## Pre-flight Audit (chạy trên prod replica trước mọi migration)

```sql
SELECT COUNT(*) FROM "common"."repair_supply_links" l LEFT JOIN "business"."supply_requests" s ON s.id = l."supplyRequestId" WHERE s.id IS NULL;
SELECT COUNT(*) FROM "common"."acceptance_handovers" h LEFT JOIN "business"."warehouse_issues" w ON w.id = h."warehouseIssueId" WHERE h."warehouseIssueId" IS NOT NULL AND w.id IS NULL;
SELECT COUNT(*) FROM "common"."tasks" t LEFT JOIN "common"."employees" e ON e.id = t."nguoiGiaoId" WHERE e.id IS NULL;
SELECT DISTINCT "trangThai" FROM "business"."supply_requests";
SELECT DISTINCT "trangThai" FROM "business"."purchase_requests";
```

## Facts

1. **Supersedes/duplicates:** Không có proposal nào trùng — `fix-maintenance-plan-record-linkage` chỉ xử lý orphan `MaintenanceRecord↔PlanLog`, `reformat-rule-matrix-audit` chỉ xử lý loose FK `Rule.departmentId`, `harden-repair-request-lifecycle` đã archive xử lý `RepairRequest.trangThai` String→enum (khác phạm vi `SupplyRequest`/`PurchaseRequest` ở đây). Grep `orphan|mồ côi|linkage|guard.*xóa` trong `openspec/changes` chỉ ra 3 file trên, không trùng.
2. **Linked from:** `openspec/specs/orphan-guard/spec.md` (new), `openspec/specs/face-attendance/spec.md` (modify), `openspec/specs/warehouse-receipt/spec.md` (modify), `openspec/specs/supply-chain/spec.md` (modify), `openspec/specs/ai-service/spec.md` (modify).
3. **Why new file:** Đây là capability mới `orphan-guard` + 4 phase cross-cutting (AI, supply chain, HR, warehouse) — không thuộc proposal nào hiện có. Sửa proposal cũ sẽ trộn phạm vi và làm mất lịch sử archive.
4. **User instruction verbatim:** "nghiên cứu kĩ và lên kế hoạch đi"
