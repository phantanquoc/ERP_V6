> ⚠️ **LỖI THỜI (2026-10-01):** Phần mô hình dữ liệu "1 bảng RepairRequest + requestType" không còn đúng. Code hiện tại tách 2 bảng độc lập `InspectionRequest` (YCKT, `/inspection-requests`) và `RepairRequest` (YCSC). Xem "Domain Map" trong `AGENTS.md`.

# Proposal — Tách Phiếu Kiểm Tra vs Sửa Chữa (split-inspection-repair)

## Why

Tab **Chung** (Thiết bị & Bảo trì) hiện dùng chung một loại phiếu `RepairRequest` cho mọi nhu cầu — từ kiểm tra/bảo dưỡng định kỳ tới sửa chữa đột xuất. Toàn bộ phiếu chung một `maYeuCau` (`YC-SC`), một `trangThai` 4 giá trị (`CHO_XU_LY → DANG_SUA_CHUA → HOAN_THANH / DA_HUY`), một luồng duy nhất và một danh sách duy nhất. Thực tế vận hành theo PDF đặc tả lại có **hai giai đoạn tách biệt**:

1. **Kiểm tra** — phát hiện, ghi nhận tình trạng, đề xuất phương án. Không gắn chi phí, không yêu cầu vật tư kho, không cần nghiệm thu.
2. **Sửa chữa** — lập kế hoạch, phân công người, dự toán/thực chi, liên kết phiếu yêu cầu vật tư (YC cung cấp), theo dõi kho cấp phát, nghiệm thu và quyết toán.

Hệ quả của việc gộp chung:

- Không phân biệt được phiếu kiểm tra và phiếu sửa chữa trong báo cáo/thống kê.
- Không có luồng **"từ kết quả kiểm tra tạo yêu cầu sửa chữa"** — kỹ thuật phải tạo thủ công lại từ đầu, mất vết truy vết.
- Thiếu các trường lập kế hoạch (`ngayHoanThienDuKien`, `keHoachChiTiet`, `phuongAn`, `bienPhapAnToan`, `canNgungMay`), phân công đa người (`RepairRequestAssignee`), dự toán/thực chi, giờ công.
- Thiếu **vật tư dự kiến** (`RepairMaterialNeed`) và **liên kết kho** (`RepairSupplyLink`) — phiếu sửa chữa không nối được với phiếu YC vật tư / phiếu xuất kho; kho không biết vật tư nào phục vụ sửa chữa nào.
- State machine 4 trạng thái không mô tả được các bước `DA_TIEP_NHAN → LEN_KE_HOACH → CHO_NGHIEM_THU → DA_NGHIEM_THU` và nhánh `TU_CHOI`; thiếu vòng lặp `KHONG_DAT → DANG_SUA_CHUA`.
- Nghiệm thu chung một bản ghi `AcceptanceHandover` nhưng thiếu `warehouseIssueId`, `ketQua` (DAT/KHONG_DAT) và snapshot chi phí.

Nếu không tách, mọi cải tiến sau (lập kế hoạch, giao việc, quản lý vật tư, nghiệm thu có điều kiện) đều phải nhồi thêm field vào một model đã quá tải, làm tăng rủi ro hồi quy cho luồng hiện tại.

## What Changes

### Backend

- **Data model — discriminator Phase 1 (không tách bảng):** Thêm `requestType` (`KIEM_TRA | SUA_CHUA`, default `SUA_CHUA`) trên `RepairRequest`; mở rộng `RepairRequestStatus` thêm 5 giá trị (`DA_TIEP_NHAN`, `LEN_KE_HOACH`, `CHO_NGHIEM_THU`, `DA_NGHIEM_THU`, `TU_CHOI`); thêm các nhóm field lập kế hoạch / chi phí / nghiệm thu; thêm `sourceInspectionRequestId` để truy vết phiếu kiểm tra nguồn; thêm 2 field cho `RepairRequestItem` (`sourceInspectionItemId`, `phuongAnSua`); thêm 3 field cho `AcceptanceHandover` (`warehouseIssueId`, `chiPhiThucTe`, `ketQua`); tạo 3 bảng mới `RepairRequestAssignee`, `RepairMaterialNeed`, `RepairSupplyLink` (đều `@@schema("common")`, PK `cuid()`).
- **State machine:** `advanceStatus` mở rộng forward-only với 7 bước chính + 2 nhánh terminal (`DA_HUY`, `TU_CHOI`); chặn hủy sau `DANG_SUA_CHUA` (trừ `ADMIN` bypass); `KHONG_DAT` cho phép quay lại `DANG_SUA_CHUA`.
- **Service layer (`repairRequestService`):** nhận `requestType` khi tạo; khi `requestType=SUA_CHUA` và có `sourceInspectionRequestId` thì copy `sourceInspectionItemId` xuống từng item; CRUD cho assignee / materialNeed / supplyLink; các action chuyển trạng thái mới (`accept`, `plan`, `submitAcceptance`, `confirmAcceptance`, `reject`); guard `requestType=KIEM_TRA` không đi qua luồng vật tư/nghiệm thu kho.
- **API & validation:** Mở rộng Zod schemas, thêm endpoints cho assignee / material-need / supply-link; RBAC giữ nguyên 3 middleware (`authenticate → authorize → checkAccess`), `ADMIN` bypass.
- **Kho & nghiệm thu integration:** `RepairSupplyLink` cầu nối `Int` (RepairRequest) ↔ `String` (SupplyRequest); `AcceptanceHandover.warehouseIssueId` nối phiếu xuất kho; fulfillment flow: tạo YC vật tư → kho duyệt/xuất → ghi `warehouseIssueId` → nghiệm thu.

### Frontend

- **Tab Chung — tách 2 view:** Bộ lọc `requestType` + 2 sub-tab (hoặc segmented control) "Kiểm tra" / "Sửa chữa"; badge trạng thái mới; deep-link `?type=kiem_tra|sua_chua&status=...`.
- **Tạo phiếu:** Form tạo phân nhánh theo `requestType`; khi tạo sửa chữa từ kiểm tra: picker chọn phiếu kiểm tra nguồn + auto-fill items từ `sourceInspectionItemId`.
- **Chi tiết sửa chữa:** Panel lập kế hoạch (ngày, phương án, an toàn, ngừng máy), danh sách người thực hiện (multi-assignee, 1 lead), bảng vật tư dự kiến, liên kết YC vật tư (inline tạo/xem SupplyRequest), timeline trạng thái, khu vực nghiệm thu.
- **Hooks & state:** `useRepairRequests({ requestType, trangThai, page, limit })` mở rộng; `useRepairAssignees`, `useRepairMaterialNeeds`, `useRepairSupplyLinks`; query key factory `{ all, lists(type,status), detail(id) }`; invalidation sau mutation.
- **Kho:** Trong phiếu YC vật tư liên kết, hiển thị chiều ngược "phục vụ sửa chữa #YC-SC-...".

## Capabilities

### New Capabilities

- `inspection-request-lifecycle` — Vòng đời phiếu kiểm tra (tạo → tiếp nhận → hoàn thành/hủy) tách khỏi sửa chữa.
- `repair-planning-and-assignment` — Lập kế hoạch sửa chữa, phân công đa người (1 lead), dự toán/giờ công.
- `repair-material-need` — Vật tư dự kiến theo từng hạng mục sửa chữa.
- `repair-supply-link` — Liên kết sửa chữa ↔ YC vật tư (YCCC - SupplyRequest) va truy vet chuoi YCCC -> YCBS (ReplenishmentRequest) -> YCMH (PurchaseRequest) -> kho (InboundPlan/WarehouseReceipt/WarehouseIssue); `RepairSupplyLink` chi luu goc YCCC, cac nac sau truy vet qua FK san co `SupplyRequestDecision.triggeredReplenishmentRequestId` va `ReplenishmentRequest.convertedPurchaseRequestId`; ho tro reverse lookup tu ca 3 cap (YCCC/YCBS/YCMH) nguoc ve phieu sua chua.
- `repair-acceptance-with-warehouse` — Nghiệm thu gắn phiếu xuất kho, kết quả DAT/KHONG_DAT, vòng lặp sửa lại.

### Modified Capabilities

- `repair-request-lifecycle` — Mở rộng từ 4 lên 9 trạng thái, thêm discriminator `requestType`, forward-only với nhánh TU_CHOI và loop KHONG_DAT.
- `acceptance-handover` — Thêm `warehouseIssueId`, `ketQua`, `chiPhiThucTe` snapshot.

## Impact

- **Code:** `backend/prisma/common.prisma` (enums + 3 models mới + mở rộng 3 models), `backend/src/services/repairRequestService.ts` (+ ~300 dòng), `backend/src/controllers/repairRequestController.ts`, `backend/src/routes/repairRequestRoutes.ts`, `backend/src/schemas/repairRequest.schema.ts`, `frontend/src/hooks/useRepairRequests.ts` (mở rộng) + 3 hooks mới, `frontend/src/components/repair/*` (tab, form, detail, assignee, material, supply-link, acceptance).
- **APIs:** Mở rộng `GET /repair-requests` (thêm query `requestType`, `sourceInspectionRequestId`), `POST /repair-requests` (thêm `requestType`, `sourceInspectionRequestId`, `phuongAnSua`), thêm `POST/DELETE /repair-requests/:id/assignees`, `POST/PUT/DELETE /repair-requests/:id/material-needs`, `POST/DELETE /repair-requests/:id/supply-links`, `GET /repair-requests/:id/supply-chain` (tra ve chuoi YCCC->YCBS->YCMH->kho cho moi link, batch resolve qua FK san co; `GET /:id/supply-links?includeChain=true` la alias), `GET /replenishment-requests/:id/repair-links` va `GET /purchase-requests/:id/repair-links` (reverse lookup tu YCBS/YCMH nguoc ve SC), mở rộng `PATCH /repair-requests/:id/status` (thêm transitions mới). Tất cả giữ envelope `{ success, message, data, pagination }`.
- **DB migration:** `xxx_split_inspection_repair_phase1` — DDL only, backfill `requestType='SUA_CHUA'` cho dữ liệu cũ, không mất dữ liệu. Enum `RepairRequestStatus` thêm giá trị bằng `ALTER TYPE ... ADD VALUE` (non-transactional trên Postgres — test trên staging).
- **No breaking change cho dữ liệu cũ:** Phiếu cũ mặc định `SUA_CHUA`, luồng 4 trạng thái cũ là sub-path của state machine mới nên vẫn hợp lệ.

## Scope / Non-Goals

**In scope (Phase 1):**
- Discriminator + mở rộng model + 3 bảng mới + migration.
- State machine mới + service/controller/route/Zod/RBAC.
- Frontend tách tab Chung, form/chi tiết theo `requestType`, assignee/material/supply-link UI, nghiệm thu gắn kho.
- Seed + exportExcel + tests + type check.

**Non-Goals (defer):**
- Tách bảng vật lý `InspectionRequest` riêng (Phase 2, khi có đủ dữ liệu để đánh giá materialized view).
- Workflow phê duyệt nhiều cấp cho kế hoạch sửa chữa.
- Tự động trừ tồn kho / đặt trước vật tư (chỉ liên kết, không reservation).
- Mobile offline / QR nghiệm thu.
- Báo cáo chi phí tổng hợp cross-phiếu (chỉ snapshot chi phí cấp phiếu).

## Risks

| Rủi ro | Mức | Giảm thiểu |
|--------|-----|------------|
| Enum `RepairRequestStatus` thêm giá trị non-transactional | Medium | Dùng `prisma migrate --create-only` rồi sửa SQL thủ công, test trên staging; giữ `IF NOT EXISTS` |
| `RepairSupplyLink` nối `Int` ↔ `String` không có DB FK | Medium | Validate ở service, index cả hai chiều, unique `[repairRequestItemId, supplyRequestId]` |
| Phiếu cũ `requestType` null sau migration | Low | Backfill `SUA_CHUA` + `SET NOT NULL DEFAULT` trong cùng migration |
| State machine mới làm FE cũ hiển thị sai badge | Low | Map trạng thái mới về màu/badge, fallback về label cũ nếu chưa update FE |
| Multi-assignee lead uniqueness race | Low | Partial unique index + service guard trong transaction |

## Alternatives Considered

| Phương án | Mô tả | Chọn? | Lý do |
|-----------|-------|-------|-------|
| **A — Discriminator trên cùng bảng (Phase 1 này)** | Thêm `requestType` enum, giữ 1 bảng `RepairRequest`, mở rộng field nullable | **Chọn** | Ít rủi ro migration, dữ liệu cũ không phải di chuyển, query đơn giản (`WHERE requestType=...`), Phase 2 vẫn có thể tách view nếu cần. Phù hợp với nguyên tắc "không tách bảng khi chưa có đủ tín hiệu". |
| **B — Tách bảng vật lý ngay (`InspectionRequest` + `RepairRequest`)** | Tạo bảng `InspectionRequest` mới, `RepairRequest` chỉ giữ sửa chữa, FK `sourceInspectionRequestId` là DB FK thật | Không | Phải di chuyển dữ liệu, dual-write trong transition, tăng độ phức tạp migration/rollback. Lợi ích (FK thật, constraint mạnh) chưa đủ bù chi phí ở Phase 1 khi 90% phiếu hiện tại là sửa chữa. |
| **C — Giữ 1 loại phiếu, chỉ thêm field** | Không thêm `requestType`, chỉ thêm field lập kế hoạch/vật tư vào model hiện tại | Không | Không giải quyết được bài toán thống kê/điều hướng tách biệt; mọi query phải lọc bằng heuristic (có `keHoachChiTiet` thì là sửa chữa…), dễ sai và khó mở rộng. |

## Stakeholder Decisions

10 câu hỏi nghiệp vụ cần chốt trước khi implement — xem chi tiết trong `business-decisions.md`. Mỗi câu hỏi có đề xuất mặc định (recommended default) để stakeholder chỉ cần confirm hoặc chọn alternative:

1. **Phân biệt kiểm tra vs sửa chữa bằng gì?** → Đề xuất: `requestType` discriminator.
2. **Kiểm tra có cần duyệt/kế hoạch không?** → Đề xuất: luồng ngắn `CHO_XU_LY → DA_TIEP_NHAN → HOAN_THANH`.
3. **Sửa chữa tạo từ kiểm tra có bắt buộc chọn nguồn không?** → Đề xuất: không bắt buộc, khuyến khích chọn.
4. **Hủy sau khi đã bắt đầu sửa có cho phép không?** → Đề xuất: chỉ `ADMIN` được hủy sau `DANG_SUA_CHUA`.
5. **Nghiệm thu KHONG_DAT thì sao?** → Đề xuất: quay lại `DANG_SUA_CHUA`, giữ vết nghiệm thu cũ.
6. **Vật tư dự kiến có bắt buộc trước khi lập kế hoạch không?** → Đề xuất: không bắt buộc, cảnh báo nếu thiếu.
7. **Liên kết YC vật tư ở cấp phiếu hay cấp item?** → Đề xuất: cấp item (`repairRequestItemId` nullable, unique per item+supply).
8. **Phân công nhiều người, ai là lead?** → Đề xuất: tối đa 1 `isLead=true`, vai trò `CHINH|PHU`.
9. **Kho cấp phát thiếu so với dự kiến thì sao?** → Đề xuất: cho phép nghiệm thu với `soLuongThucTe`, ghi chênh lệch.
10. **Phiếu cũ sau migration tính là loại gì?** → Đề xuất: mặc định `SUA_CHUA` để không đổi hành vi hiện tại.
