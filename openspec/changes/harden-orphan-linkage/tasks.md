# Tasks — Harden Orphan Linkage

> Thứ tự: Phase 1 (code-only) → Phase 2 (migration FK/index) → Phase 3 (chuẩn hóa + dọn) → Phase 4 (backlog). Mỗi phase deploy độc lập. Xem `design.md` cho quyết định kỹ thuật.

**Facts (GateGuard):**
1. **Callers:** Không có file nào auto-load `tasks.md` — đây là checklist thủ công cho implementer và `openspec apply` runner. `proposal.md` và `design.md` cùng thư mục reference `tasks.md` như task tracker.
2. **No duplicate:** Grep `harden-orphan.*tasks` 0 hit; `ls openspec/changes/harden-orphan-linkage/` chỉ có `proposal.md`, `design.md`, `specs/` — chưa có `tasks.md`. Các `tasks.md` khác (`fix-maintenance-plan-record-linkage/tasks.md`, `add-multi-file-section-attachments/tasks.md`) khác scope.
3. **Data fields (synthetic):** Không đọc/ghi data file runtime. Checklist chạm các field: `RepairSupplyLink { repairRequestId, supplyRequestId @db.VarChar(30) }`, `AcceptanceHandover { warehouseIssueId String? }`, `SupplyRequest { trangThai String }` → enum, `Employee { positionId, subDepartmentId, status }` → index. Ví dụ mã: `YC-KT-2026-001` (synthetic). Date: `YYYY-MM-DD`.
4. **User instruction:** "nghiên cứu kĩ và lên kế hoạch đi"

## Phase 1 — 0 rủi ro DB (code-only, rollback = git revert)

### 1A. AI Service routing

- [ ] 1A.1 Mount `chat`/`agent`/`docs` routers trong `ai-service/app.py` (thêm 3 `app.include_router`)
- [ ] 1A.2 Fix `ai-service/chat/indexer.py:188-232` — check `stored_hash == current_hash` trước `delete_collection`, xóa block delete/create trùng
- [ ] 1A.3 Fix `ai-service/chat/routes.py:110` — thêm `req.role` vào `build_retrieval` (như dòng 43)
- [ ] 1A.4 Verify: `curl /chat`, `/agent/stream`, `/docs/upload` hết 404; restart 2 lần không đổi docs → `chroma.count` giữ nguyên

### 1B. Code-gen trong transaction

- [ ] 1B.1 Sửa `backend/src/utils/codeGenerator.ts:15` — string sort → numeric `Math.max` (theo mẫu `acceptanceHandoverService.nextHandoverCode:96`)
- [ ] 1B.2 Đưa `generateInspectionRequestCode()` vào trong `prisma.$transaction` trong `inspectionRequestService.createInspectionRequest:386` (truyền `tx`)
- [ ] 1B.3 Tương tự `repairRequestService.createRepairRequest:538`
- [ ] 1B.4 Xóa `generate*Code()` khỏi `inspectionRequestController:69` và `repairRequestController:96`
- [ ] 1B.5 Verify: 2 request song song tạo YCKT → mã khác nhau

### 1C. Guard xóa

- [ ] 1C.1 `backend/src/services/employeeService.ts:417` — check `Task`/`WorkPlan`/`OvertimePlan` count trước `delete` → `ConflictError`
- [ ] 1C.2 `backend/src/services/supplyRequestService.ts:1388` — `deleteSupplyRequest` check `PurchaseRequest`/`WarehouseReceipt` downstream → `ConflictError`
- [ ] 1C.3 `backend/src/services/departmentService.ts` — check `SubDepartment` + `Employee` + `Rule` trước `delete`
- [ ] 1C.4 `backend/src/services/positionService.ts` — tái dùng `getPositionUsage:116` làm guard trước `delete`
- [ ] 1C.5 Verify: xóa employee còn task → 409; xóa YCCC đã sinh YCMH → 409

### 1D. Face cooldown + void + notification + file orphan

- [ ] 1D.1 `backend/src/services/faceAttendanceService.ts:1131` — re-check `isCoolingDown` sau `pg_advisory_xact_lock` trong tx
- [ ] 1D.2 `backend/src/services/warehouseReceiptService.ts:1688` — clamp `soLuong:0` → `throw ValidationError`
- [ ] 1D.3 `backend/src/services/employeeEvaluationService.ts:1225,1292` — bắn `EVALUATION_APPEAL_SUBMITTED/REPLIED` riêng
- [ ] 1D.4 `backend/src/services/repairRequestService.ts:735,902,1035` — tách `REPAIR_REQUEST_REJECTED/CANCELLED`, gộp duplicate
- [ ] 1D.5 `backend/src/middlewares/upload.ts` + controllers — cleanup file trên disk khi service throw sau khi multer đã ghi

## Phase 2 — Có migration, cần audit rác trước

> Pre-flight: chạy audit SQL trên prod replica (xem `proposal.md`), dọn rác trước khi migrate.

- [ ] 2A.1 Dọn rác: `UPDATE`/`DELETE` link chết `repair_supply_links` + `acceptance_handovers`
- [ ] 2A.2 Migration `NOT VALID`: FK `RepairSupplyLink.supplyRequestId → SupplyRequest` (Cascade) + unique `(repairRequestId, supplyRequestId)`
- [ ] 2A.3 Migration `NOT VALID`: FK `AcceptanceHandover.warehouseIssueId → WarehouseIssue` (SetNull)
- [ ] 2A.4 Deploy sau: `VALIDATE CONSTRAINT` cho 2 FK trên
- [ ] 2A.5 Thêm `@@relation` + `@@index` + `@@unique` vào `common.prisma`, `npx prisma validate && generate`
- [ ] 2B.1 `CREATE INDEX CONCURRENTLY` cho `Employee.positionId/subDepartmentId/status`, `SubDepartment.departmentId`, `Lot.warehouseId` (thủ công, ngoài giờ hành chính)
- [ ] 2B.2 Thêm `@@index` vào schema ở migration sau (no-op)
- [ ] 2C.1 `backend/src/services/supplyRequestService.ts:1635` — ghi `SupplyRequestStatusLog` khi kéo lùi `Chờ bổ sung→Đang xử lý`

## Phase 3 — Chuẩn hóa dữ liệu + tách schema + dọn dead code

- [ ] 3A.1 Audit `SELECT DISTINCT "trangThai"` cho `SupplyRequest`/`PurchaseRequest`/`ReplenishmentRequest`, chuẩn hóa sai chính tả
- [ ] 3A.2 Tạo enum `SupplyRequestStatus`/`PurchaseRequestStatus`, migration `USING "trangThai"::enum`
- [ ] 3B.1 Tách `common.prisma` 72 models → `common_hr.prisma`, `common_technical.prisma`, `common_process.prisma`, `common_timesheet.prisma`, `common_system.prisma` (no-op, nhánh riêng)
- [ ] 3B.2 Verify: `npx prisma validate && npx prisma generate && npx tsc --noEmit` 0 lỗi
- [ ] 3C.1 Xóa 10 dead components batch 5 files/lần (grep dynamic import + `tsc` sau mỗi batch)
- [ ] 3C.2 Xóa 6 orphan hooks + re-export trong `hooks/index.ts`
- [ ] 3C.3 Thêm URL sync (`useUrlFilters`) cho 25 lists (theo mẫu `TechnicalSupplyCostTab`)
- [ ] 3D.1 Xóa enum `CustomerStatus`/`MaterialStandardType` (`DROP TYPE`), deprecate `RequestType.KIEM_TRA`
- [ ] 3D.2 Thêm partial index `LotProduct(lotId, maKien) WHERE maKien IS NOT NULL`

## Phase 4 — Backlog (không block)

- [ ] 4.1 Rename `warehouses` → `Warehouse` + `@@map("warehouses")` (đổi `prisma.warehouses` ở 5 services)
- [ ] 4.2 Link `SparePart` → `MachineSystemDetail`, `MaterialEvaluationCriteria` → `MaterialEvaluation`, `ProductionReport` → `ProductionProcess`
- [ ] 4.3 Thêm `entityType`/`entityId` vào `Notification`
- [ ] 4.4 Job cron quét orphan soft-ref định kỳ

## Verification (mỗi phase)

- [ ] `cd backend && npx tsc --noEmit` → 0 lỗi
- [ ] `cd frontend && npx tsc --noEmit -p tsconfig.app.json` → 0 lỗi
- [ ] `cd backend && npx jest --runInBand` → pass
- [ ] `cd ai-service && python -m pytest tests/ -x -q` → pass (Phase 1)
- [ ] `npx prisma validate && npx prisma generate` → pass (Phase 2, 3)
