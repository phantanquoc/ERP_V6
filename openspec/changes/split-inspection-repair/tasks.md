# Tasks — split-inspection-repair

> Thứ tự bắt buộc: Schema → Backend → Frontend → Kho & nghiệm thu → Hardening. Không nhảy cóc.

## Phase 1 — Schema & Migration

- [ ] 1.1 Tạo migration `xxx_split_inspection_repair_phase1` — DDL only, không mất dữ liệu:
  - Tạo enum `RequestType` (KIEM_TRA, SUA_CHUA), `AssigneeRole` (CHINH, PHU), `NghiemThuKetQua` (DAT, KHONG_DAT)
  - Mở rộng enum `RepairRequestStatus` thêm 5 giá trị: DA_TIEP_NHAN, LEN_KE_HOACH, CHO_NGHIEM_THU, DA_NGHIEM_THU, TU_CHOI (dùng `ALTER TYPE ... ADD VALUE IF NOT EXISTS`, test trên staging vì non-transactional) ← (verify: `npx prisma migrate dev` chạy không lỗi trên DB trống và DB có dữ liệu cũ)
  - `ALTER TABLE common.repair_requests` thêm 14 cột: `request_type`, `source_inspection_request_id`, `ngay_hoan_thien_du_kien`, `ngay_bat_dau_ke_hoach`, `ke_hoach_chi_tiet`, `phuong_an`, `bien_phap_an_toan`, `chi_phi_du_kien`, `chi_phi_thuc_te`, `noi_dung_thuc_hien`, `gio_cong_thuc_te`, `ket_qua_nghiem_thu`, `can_ngung_may`, `phong_ban_id`, `ngay_hoan_thanh_thuc_te`; backfill `request_type='SUA_CHUA'` + `SET NOT NULL DEFAULT`; tạo index `[request_type, trang_thai]`, `[source_inspection_request_id]`, `[phong_ban_id]`, `[ngay_hoan_thien_du_kien]`
  - `ALTER TABLE common.repair_request_items` thêm `source_inspection_item_id`, `phuong_an_sua`; index `[source_inspection_item_id]`
  - `ALTER TABLE common.acceptance_handovers` thêm `warehouse_issue_id`, `chi_phi_thuc_te`, `ket_qua`; index `[warehouse_issue_id]`
  - `CREATE TABLE common.repair_request_assignees / repair_material_needs / repair_supply_links` (PK cuid, FK cascade, indexes + unique như design)
- [ ] 1.2 Cập nhật `backend/prisma/common.prisma` — thêm 3 enum, mở rộng `RepairRequestStatus`, thêm fields/relations/indexes cho `RepairRequest` / `RepairRequestItem` / `AcceptanceHandover`, thêm 3 models mới `RepairRequestAssignee` / `RepairMaterialNeed` / `RepairSupplyLink`
- [ ] 1.3 Chạy `npx prisma generate` và `npx prisma migrate dev` — đảm bảo Prisma Client mới có đủ types ← (verify: `npx prisma generate` + `npx tsc --noEmit` trong backend không lỗi type mới)
- [ ] 1.4 Viết script backfill kiểm tra: `SELECT count(*) FROM common.repair_requests WHERE request_type IS NULL` phải = 0 sau migration

## Phase 2 — Backend (Service → Controller → Route → Validation → RBAC)

- [ ] 2.1 Mở rộng `backend/src/utils/statusTransition.ts` (hoặc `repairRequestService.advanceRepairRequestStatus`) — thêm 5 trạng thái mới vào thứ tự forward-only, định nghĩa `REPAIR_STATUS_ORDER` 7 bước + nhánh `DA_HUY`/`TU_CHOI`, guard `TU_CHOI` chỉ từ `CHO_XU_LY|DA_TIEP_NHAN|LEN_KE_HOACH`, chặn `DA_HUY` sau `DANG_SUA_CHUA` trừ `ADMIN` bypass, cho phép `DA_NGHIEM_THU --KHONG_DAT--> DANG_SUA_CHUA` ← (verify: unit test cho mọi transition hợp lệ/bị chặn, bao gồm ADMIN bypass)
- [ ] 2.2 Cập nhật `backend/src/services/repairRequestService.ts`:
  - `generateRepairRequestCode()` giữ nguyên prefix `YC-SC` (không đổi mã cho Phase 1)
  - `getAllRepairRequests` thêm filter `requestType`, `sourceInspectionRequestId`; include `assignees`, `supplyLinks`, `items.materialNeeds`
  - `createRepairRequest` nhận `requestType` (default SUA_CHUA), nếu `requestType=SUA_CHUA` và có `sourceInspectionRequestId` thì validate tồn tại + copy `sourceInspectionItemId` xuống items; guard `requestType=KIEM_TRA` thì `sourceInspectionRequestId` phải null
  - `updateRepairRequest` — strip `trangThai` như cũ, sync `requestType` không cho đổi sau tạo (throw ValidationError)
  - Thêm methods: `assignUser / unassignUser / listAssignees` (enforce tối đa 1 `isLead=true` trong transaction), `upsertMaterialNeed / removeMaterialNeed / listMaterialNeeds` (unique `[itemId, tenVatTu]`), `linkSupplyRequest / unlinkSupplyRequest / listSupplyLinks` (validate SupplyRequest tồn tại, unique `[itemId, supplyRequestId]`)
  - Thêm transitions: `accept(id, actor)`, `plan(id, actor, keHoachData)`, `submitForAcceptance(id, actor)`, `confirmAcceptance(id, actor, ketQua, chiPhiThucTe)`, `reject(id, actor, reason)` — mỗi transition ghi `RepairRequestStatusLog` với `actorId/actorRole/reason`
  - `getStatusHistory` giữ nguyên, `getStats` mở rộng groupBy thêm `requestType`
- [ ] 2.3 Cập nhật `backend/src/controllers/repairRequestController.ts` — thêm handlers cho assignee/material/supply-link/status mới, forward `req.user` làm actor, không chứa business logic
- [ ] 2.4 Cập nhật `backend/src/routes/repairRequestRoutes.ts` — đăng ký routes mới dưới `/repair-requests`:
  - `GET /` (mở rộng query), `POST /`, `GET /:id`, `PUT /:id`, `PATCH /:id/accept|plan|start|submit-acceptance|confirm-acceptance|reject|cancel`, `GET /:id/status-history`
  - `POST /:id/assignees`, `DELETE /:id/assignees/:assigneeId`, `GET /:id/assignees`
  - `POST /:id/material-needs`, `PUT /:id/material-needs/:needId`, `DELETE /:id/material-needs/:needId`, `GET /:id/material-needs`
  - `POST /:id/supply-links`, `DELETE /:id/supply-links/:linkId`, `GET /:id/supply-links`
  - Đảm bảo `authenticate` → `authorize`/`checkAccess` cho từng route, `ADMIN` bypass
- [ ] 2.5 Cập nhật `backend/src/schemas/repairRequest.schema.ts` (Zod) — thêm `requestType` enum, `sourceInspectionRequestId` nullable, `phuongAnSua`, assignee/material/supply-link schemas, keHoach fields validation (`ngayHoanThienDuKien` > `ngayBatDauKeHoach`, `chiPhiDuKien` >= 0)
- [ ] 2.6 Cập nhật `backend/src/routes/index.ts` (ROUTE_MAP) — verify route mới xuất hiện trong server logs khi boot ← (verify: `npm run dev` log có đủ routes mới)

## Phase 3 — Frontend (Hooks → Components → Tab Chung)

- [ ] 3.1 Mở rộng `frontend/src/hooks/useRepairRequests.ts` — thêm params `requestType`, `sourceInspectionRequestId` vào query key factory `{ all, lists(type,status,page,limit), detail(id) }`, invalidation sau mutations
- [ ] 3.2 Tạo hooks mới:
  - `frontend/src/hooks/useRepairAssignees.ts` — list/assign/unassign, invalidate `detail(id)` + `assignees`
  - `frontend/src/hooks/useRepairMaterialNeeds.ts` — CRUD material-need, invalidate `detail(id)`
  - `frontend/src/hooks/useRepairSupplyLinks.ts` — link/unlink/list, invalidate cả `detail(id)` và `supplyRequest` liên quan
- [ ] 3.3 Tạo components:
  - `frontend/src/components/repair/RepairTabFilter.tsx` — segmented control KIEM_TRA/SUA_CHUA + filter trạng thái + search, sync URL `?type=&status=&q=`
  - `frontend/src/components/repair/RepairRequestForm.tsx` — phân nhánh theo `requestType`; khi `SUA_CHUA` có picker chọn phiếu KIEM_TRA nguồn + auto-fill items từ `sourceInspectionItemId`; validation Zod
  - `frontend/src/components/repair/RepairDetailPanel.tsx` — layout chi tiết: header (maYeuCau, requestType badge, status badge, timeline), khu vực lập kế hoạch (ngày, phương án, an toàn, ngừng máy), chi phí (duKien/thucTe/gioCong)
  - `frontend/src/components/repair/RepairAssigneeList.tsx` — danh sách người thực hiện, add/remove, đánh dấu lead (CHINH), avatar + vaiTro badge
  - `frontend/src/components/repair/RepairMaterialNeedTable.tsx` — bảng vật tư dự kiến (tenVatTu, donVi, soLuongDuKien/ThucTe), inline edit, delete
  - `frontend/src/components/repair/RepairSupplyLinkPanel.tsx` — liên kết YC vật tư: list links, nút "Tạo YC vật tư" (inline tạo SupplyRequest) / "Liên kết YC có sẵn" (picker), hiển thị trạng thái phiếu VT, deep-link sang tab Cung ứng
  - `frontend/src/components/repair/RepairStatusTimeline.tsx` — timeline các transition từ `RepairRequestStatusLog`, highlight current, hiển thị actor + reason
- [ ] 3.4 Cập nhật `frontend/src/components/repair/RepairTab.tsx` (tab Chung) — tích hợp `RepairTabFilter`, tách 2 view KIEM_TRA/SUA_CHUA, bảng danh sách với badge `requestType`, row click → detail panel/modal, deep-link `?type=&status=&id=`
- [ ] 3.5 Cập nhật `frontend/src/services/repairRequestService.ts` (API client) — thêm methods cho assignee/material/supply-link/status mới, typed request/response

## Phase 4 — Kho & Nghiệm Thu Integration

- [ ] 4.1 Backend — `acceptanceHandoverService` mở rộng: khi tạo/cập nhật `AcceptanceHandover` cho `requestType=SUA_CHUA`, cho phép gắn `warehouseIssueId` (validate tồn tại), snapshot `chiPhiThucTe`, set `ketQua` (DAT/KHONG_DAT); khi `KHONG_DAT` thì trigger transition `DA_NGHIEM_THU → DANG_SUA_CHUA` (ghi log `reason: 'acceptance_khong_dat'`)
- [ ] 4.2 Backend — `supplyRequestService` / `warehouseIssueService` — khi duyệt/xuất phiếu VT có `RepairSupplyLink`, không chặn luồng hiện tại; chỉ thêm index để query ngược "phiếu VT này phục vụ sửa chữa nào"
- [ ] 4.3 Frontend — `frontend/src/components/repair/RepairAcceptanceSection.tsx` — khu vực nghiệm thu trong detail: hiển thị `AcceptanceHandover` (maNghiemThu, ngayNghiemThu, warehouseIssueId link, chiPhi, ketQua badge), nút "Đề nghị nghiệm thu" (CH0_NGHIEM_THU), "Xác nhận DAT/KHONG_DAT" (DA_NGHIEM_THU), cảnh báo khi KHONG_DAT sẽ quay lại sửa chữa
- [ ] 4.4 Frontend — Trong `SupplyRequestTab` / `WarehouseIssueTab`, khi phiếu có `RepairSupplyLink`, hiển thị badge/chip "Phục vụ SC #YC-SC-..." với deep-link ngược về `RepairDetail`

## Phase 5 — Hardening (Seed, Export, Tests, Type Check)

- [ ] 5.1 Seed — `backend/prisma/seed.ts` thêm seed cho `requestType` mix (KIEM_TRA + SUA_CHUA), assignee, materialNeed, supplyLink mẫu; đảm bảo seed idempotent
- [ ] 5.2 Export Excel — mở rộng `exportExcel` cho repair: thêm cột `Loại phiếu` (KIEM_TRA/SUA_CHUA), `Người thực hiện` (assignees), `Vật tư dự kiến`, `YC vật tư liên kết`, `Kết quả nghiệm thu`
- [ ] 5.3 Tests — `backend/src/__tests__/repairRequestService.test.ts`:
  - State machine: mọi transition hợp lệ/bị chặn, ADMIN bypass, KHONG_DAT loop, TU_CHOI guard
  - Discriminator: tạo KIEM_TRA không cho có sourceInspectionRequestId, tạo SUA_CHUA từ KIEM_TRA copy items
  - Assignee: tối đa 1 lead, unique [repairRequestId, userId]
  - MaterialNeed: unique [itemId, tenVatTu], CRUD trong transaction
  - SupplyLink: Int↔String validate, unique [itemId, supplyRequestId], link cấp phiếu vs cấp item
  - `getAll` filter theo `requestType` + `sourceInspectionRequestId`
- [ ] 5.4 Type check & lint:
  - `cd backend && npx tsc --noEmit` — 0 lỗi ← (verify: `| grep -c "error TS"` == 0)
  - `cd backend && npm run lint` — 0 lỗi mới
  - `cd backend && npm test -- --runInBand` — tất cả pass
  - `cd frontend && npx tsc --noEmit -p tsconfig.app.json` — 0 lỗi
  - `cd frontend && npm run lint` — 0 lỗi mới
- [ ] 5.5 Manual verification — Tạo phiếu KIEM_TRA → từ đó tạo SUA_CHUA (auto-fill items) → lập kế hoạch → phân công → thêm vật tư → liên kết YC vật tư → kho duyệt/xuất → nghiệm thu DAT và luồng KHONG_DAT quay lại sửa chữa; kiểm tra deep-link, filter, export, timeline
