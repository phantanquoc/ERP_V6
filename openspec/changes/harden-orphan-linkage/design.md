# Design: Harden Orphan Linkage

## Context

Audit toàn codebase (156 models, 85 routes, 72 AI tools, 168 components) phát hiện:
- Rác lặng lẽ là rủi ro chính: 17 bảng 0 FK + ~40 soft-ref String cross-schema + thiếu `onDelete` → xóa 1 dòng để lại nhiều bảng mồ côi, không gãy ngay nhưng tích tụ thành lệch tồn/lương/quyền.
- 3 lỗi CRITICAL chặn chức năng (AI routers không mount, thiếu FK chuỗi kỹ thuật, god schema).
- Thiếu guard xóa: `deleteEmployee`/`deleteSupplyRequest`/`deleteDepartment`/`deletePosition` đều không check child trước khi xóa.
- Code-gen race: sinh mã YCKT/YCSC ngoài `$transaction` + string sort sai sau 999.

Tài liệu này mô tả quyết định kỹ thuật cho 4 phases. Mỗi phase deploy độc lập.

**Facts (GateGuard):**
1. **Callers:** `openspec/changes/harden-orphan-linkage/tasks.md` (dòng 1-5 ref "See design.md"), `openspec/changes/harden-orphan-linkage/specs/orphan-guard/spec.md` (ref Section 1C/2A). Không có file runtime nào import design.md — đây là tài liệu tham chiếu cho implementer.
2. **No duplicate:** Grep `orphan.*guard|harden-orphan` trong `openspec --include=*.md` chỉ ra `proposal.md` vừa tạo, không có `design.md` nào khác cùng phạm vi. `fix-maintenance-plan-record-linkage/design.md` chỉ cover MaintenanceRecord↔PlanLog, khác scope.
3. **Data fields (synthetic):** `RepairSupplyLink { repairRequestId String, supplyRequestId String @db.VarChar(30) }` → thêm `@relation + @@unique([repairRequestId, supplyRequestId])`; `AcceptanceHandover { warehouseIssueId String? @db.VarChar(30) }` → thêm `@relation`; `SupplyRequest { trangThai String @default("Chưa cung cấp") }` → enum. Date: `YYYY-MM-DD` API, `DD/MM/YYYY` UI, ISO-8601 DB. Ví dụ mã: `YC-KT-2026-001`, `PN-2026-001` (synthetic).
4. **User instruction:** "nghiên cứu kĩ và lên kế hoạch đi"

---

## 1. Phase 1 — Code-only (0 rủi ro DB)

### 1A. AI Service routing

**Quyết định:** Mount thiếu 3 routers trong `ai-service/app.py`.

- `app.py` hiện chỉ `app.include_router(face_router)`. Thêm:
  ```python
  from chat.routes import router as chat_router
  from agent.routes import router as agent_router
  from docs.routes import router as docs_router
  app.include_router(chat_router)
  app.include_router(agent_router)
  app.include_router(docs_router)
  ```
- Prefix đã đúng (`/chat`, `/agent`, `/docs`) — khớp `backend/src/services/chatService.ts` (`AI_URL/chat`) và `agentController.ts` (`/agent/stream`, `/docs/upload`). Đối chiếu trước khi sửa.
- `chat/routes.py:110` thiếu `req.role`: `build_retrieval(rewritten, req.message, req.department)` → thêm `req.role` như dòng 43.

**Fix ChromaDB re-index (`chat/indexer.py:188-232`):**
- Hiện tại: `delete_collection` → `create_collection` rỗng → build BM25 → check `stored_hash == current_hash` → early return với collection rỗng nhưng `rag_ready=true`.
- Đổi thành: check `stored_hash == current_hash` **trước** `delete_collection`. Chỉ `delete+create+embed` khi hash khác. Xóa block delete/create trùng lặp dòng 224-232.

### 1B. Code-gen trong transaction

**Quyết định:** Đưa `generate*Code()` vào trong `prisma.$transaction`, fix string sort.

- Mẫu đúng: `supplyRequestService:452` sinh mã bên trong tx + `acceptanceHandoverService.nextHandoverCode:96` dùng `Math.max(...parseSuffix)` thay vì `orderBy string desc`.
- Áp dụng cho `inspectionRequestService.createInspectionRequest:386` và `repairRequestService.createRepairRequest:538`:
  ```typescript
  await prisma.$transaction(async (tx) => {
    const maYeuCau = await generateInspectionRequestCode(tx);
    await tx.inspectionRequest.create({ data: { maYeuCau, ... } });
  });
  ```
- `codeGenerator.ts:15` đổi `findFirst orderBy maYeuCau desc` → `findMany` rồi `Math.max` numeric suffix.

### 1C. Guard xóa

**Quyết định:** Thêm `count` child trước `delete`, throw `ConflictError` tiếng Việt. Không dùng hard-delete cho business documents đã phát sinh downstream.

```typescript
async deleteEmployee(id: string) {
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) throw new NotFoundError('Không tìm thấy nhân viên');
  const [taskCount, workPlanCount] = await Promise.all([
    prisma.task.count({ where: { nguoiGiaoId: id } }),
    prisma.workPlan.count({ where: { nguoiTaoId: id } }),
  ]);
  if (taskCount > 0 || workPlanCount > 0)
    throw new ConflictError('Còn công việc/kế hoạch liên quan, không thể xóa');
  await prisma.employee.delete({ where: { id } });
}
```

Áp dụng cho: `employeeService`, `supplyRequestService` (delete vs cancel phân biệt), `departmentService` (check SubDepartment + Employee + Rule), `positionService` (tái dùng `getPositionUsage:116`).

`supplyRequestService.deleteSupplyRequest` nếu đã có `PurchaseRequest`/`WarehouseReceipt` downstream → `ConflictError('Phiếu đã phát sinh nghiệp vụ, vui lòng dùng Hủy thay vì Xóa')`.

### 1D. Face cooldown + void + notification + file orphan

- **Face:** Sau `pg_advisory_xact_lock(hashtext(employeeId))` trong tx, gọi lại `isCoolingDown(employeeId)` lần 2. Nếu cooldown → `throw ConflictError`.
- **Void:** `warehouseReceiptService.void:1688` đổi `lotProduct.update({ soLuong: 0 })` → `throw ValidationError`.
- **Notification:** Bắn `EVALUATION_APPEAL_SUBMITTED/REPLIED` riêng; tách `REPAIR_REQUEST_REJECTED/CANCELLED`, gộp duplicate `UPDATED+COMPLETED`.
- **File orphan:** Sau `catch` trong service, `if (req.file) fs.unlink(req.file.path)`.

---

## 2. Phase 2 — Migration có FK/index

### 2A. FK mới — `NOT VALID` → `VALIDATE`

```sql
ALTER TABLE "common"."repair_supply_links"
  ADD CONSTRAINT "repair_supply_links_supplyRequestId_fkey"
  FOREIGN KEY ("supplyRequestId") REFERENCES "business"."supply_requests"("id") ON DELETE CASCADE NOT VALID;
ALTER TABLE "common"."repair_supply_links"
  ADD CONSTRAINT "repair_supply_links_unique" UNIQUE ("repairRequestId", "supplyRequestId") NOT VALID;
ALTER TABLE "common"."acceptance_handovers"
  ADD CONSTRAINT "acceptance_handovers_warehouseIssueId_fkey"
  FOREIGN KEY ("warehouseIssueId") REFERENCES "business"."warehouse_issues"("id") ON DELETE SET NULL NOT VALID;
-- Deploy sau: VALIDATE CONSTRAINT
```

Pre-flight: audit SQL + dọn `supplyRequestId` rác trước.

### 2B. Index — `CONCURRENTLY` thủ công

```sql
CREATE INDEX CONCURRENTLY "employee_positionId_idx" ON "common"."employees"("positionId");
CREATE INDEX CONCURRENTLY "employee_subDepartmentId_idx" ON "common"."employees"("subDepartmentId");
CREATE INDEX CONCURRENTLY "lot_warehouseId_idx" ON "business"."lots"("warehouseId");
```

### 2C. SupplyRequest backward transition

Ghi `SupplyRequestStatusLog` khi kéo lùi `Chờ bổ sung→Đang xử lý` trong `onReplenishmentRequestCancelled:1635`.

---

## 3. Phase 3 — Chuẩn hóa + tách schema + dọn dead code

### 3A. `trangThai String` → enum

Chỉ làm sau khi `SELECT DISTINCT` sạch. Chuẩn hóa sai chính tả trước.

### 3B. Tách `common.prisma`

Prisma hỗ trợ nhiều file cùng `@@schema("common")`. Chỉ tách file, không đổi model → no-op migration. Làm trên nhánh riêng khi ít PR.

```
common_hr.prisma          — Employee, Position, Department, Evaluation, Payroll, Attendance
common_technical.prisma   — InspectionRequest, RepairRequest, AcceptanceHandover
common_process.prisma     — Process, ProductionProcess, Flowcharts
common_timesheet.prisma   — Holiday, AttendanceCode, TimesheetCell
common_system.prisma      — Lookup, SystemSettings, Notification, AuditLog
```

### 3C. Dead code

Xóa theo batch 5 files/lần, mỗi batch `grep` dynamic import + `tsc` + smoke test. URL sync theo mẫu `TechnicalSupplyCostTab` với `useUrlFilters`.

### 3D. Enum chết + partial index

- `DROP TYPE "business"."CustomerStatus"`, xóa `MaterialStandardType`.
- `CREATE UNIQUE INDEX ... WHERE "maKien" IS NOT NULL` cho `LotProduct(lotId, maKien)`.

---

## 4. Phase 4 — Backlog

- Rename `warehouses` → `Warehouse` + `@@map("warehouses")`.
- Link `SparePart`/`MaterialEvaluationCriteria`/`ProductionReport`.
- Thêm `entityType`/`entityId` vào `Notification`.
- Job cron quét orphan soft-ref định kỳ.

---

## Alternatives Considered

| Lựa chọn | Vì sao không chọn |
|----------|-------------------|
| Thêm FK cross-schema ngay bằng `CASCADE` trực tiếp | Lock lâu, fail nếu có rác — `NOT VALID` an toàn hơn |
| Xóa `Task`/`WorkPlan` soft-ref bằng FK thật ngay | Cross-schema FK `common`→`auth` phức tạp, nên guard ở service trước |
| Tách `common.prisma` ngay Phase 1 | Nhiều PR đang chạm file, gây conflict — để Phase 3 |
| Đổi `trangThai String→enum` ngay | Cần chuẩn hóa dữ liệu trước — để Phase 3 |

## Risks & Mitigations

| Rủi ro | Mitigation |
|--------|------------|
| FK migration fail do rác | Audit SQL trên replica + dọn trước + `NOT VALID` |
| `CREATE INDEX` lock bảng lớn | `CONCURRENTLY` thủ công ngoài giờ hành chính |
| Enum migration fail do string rác | `SELECT DISTINCT` + chuẩn hóa trước |
| Xóa nhầm dead code có dynamic import | `grep -r "Name"` batch nhỏ |
| Tách `common.prisma` gây conflict | Nhánh riêng, no-op migration |

## Verification

- Phase 1: `npx tsc --noEmit` (backend + frontend), `npx jest --runInBand`, `ai-service: pytest`, smoke test race/face/guard.
- Phase 2: `prisma migrate diff` trên DB copy, `VALIDATE CONSTRAINT` pass, `EXPLAIN` dùng index.
- Phase 3: `prisma validate && prisma generate`, `SELECT DISTINCT trangThai` chỉ còn enum values, dead code `grep` 0 hit.
