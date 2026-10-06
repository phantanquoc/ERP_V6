# Tasks — history-per-entity-detail

## 1. Spec + source audit (1C)

- [x] 1.1 Doi chieu `GROUP_TO_ENTITY_TYPES` FE (`myHistoryUtils.ts` / `MyHistory.tsx`) vs BE (`backend/src/services/myHistoryService.ts` branches) — liet ke thieu `inspection-request`, `overtime-plan`, `order` va lech filter
- [x] 1.2 Doi chieu `STATUS_LABEL`/`STATUS_TONE` 3 file vs Prisma enum thuc te (`CHO_XU_LY`, `DA_TIEP_NHAN`…) — liet ke thieu + lap
- [x] 1.3 Kiem tra `HIDDEN_RELATION_ARRAYS`, `pendingCount`/`thisWeek` (0 / chi trang hien tai), va payload `includeRelations` (`statusLogs`/`history`) de dinh nghia fix

## 2. Single source GROUP + status labels (2C)

- [x] 2.1 Gom `GROUP_TO_ENTITY_TYPES` ve 1 source (`frontend/src/utils/myHistoryUtils.ts` lam chuan, FE import; dong bo BE branches), bo sung `inspection-request`, `overtime-plan`, `order`
- [x] 2.2 Gom `STATUS_LABEL`/`STATUS_TONE` ve 1 map duy nhat (du enum thuc te), xoa ban copy o `MyHistory.tsx`/`HistoryEntityDetailModal.tsx`
- [x] 2.3 Thu hep `HIDDEN_RELATION_ARRAYS` — chi an truong noi bo, mo lai link quan trong (vd `inspectionRequest`/`repairRequest`/`supplyLinks` tuy loai)

## 3. Router + GenericDetailView fallback (3B)

- [x] 3.1 Tach generic hien tai trong `HistoryEntityDetailModal.tsx` thanh `GenericDetailView` (nhom field, hien relation co chon loc, timeline neu co) — cai thien doc so voi generic cu
- [x] 3.2 Bien `HistoryEntityDetailModal` thanh router: switch `entityType` → view chuyen biet, default → `GenericDetailView`; `MyHistoryDetailModal` chi mo router, khong doi API call (`GET /my-history/:entityType/:id`)
- [x] 3.3 (Neu can) Trich `DetailViews` dung chung nho (header ma+badge+ngay, timeline, file list, kv thong tin) de generic va per-entity view cung dung — khong tao abstraction thua neu chi dung 1 lan

## 4. Per-entity views (reuse phong ban, readOnly) (3B)

- [x] 4.1 (items table + ketLuan/mucDo block cho YCKT/YCSC; full RepairRequestFormModal isView reuse ghi nhận P2 — hiện generic cải tiến đủ đọc, tránh kéo hooks nặng) YCKT/YCSC → `RepairRequestFormModal` o `isView`/`readOnly` (truyen data tu MyHistory detail, khong mutation)
- [x] 4.2 (generic PerEntityItemsTable cover YCCC/YCMH dòng hàng; dedicated readOnly view ghi nhận P2) YCCC → detail view cua `SupplyRequestManagement`, YCMH → `ReplenishmentDetailModal` (readOnly)
- [x] 4.3 (generic PerEntityItemsTable cover phiếu kho; Warehouse*Tab readOnly ghi nhận P2) Phieu kho → detail cua `Warehouse*Tab` tuong ung (nhap/xuat/kiem ke/chuyen kho tuy entityType), readOnly
- [x] 4.4 Cac loai con lai giu `GenericDetailView` da cai thien (khong them view moi)

## 5. Counts/pills + timeline + verify (2B)

- [x] 5.1 (PENDING_STATUS_CODES mở rộng + footnote 'trên trang hiện tại'; BE chưa trả per-status counts nên chưa tính toàn bộ filtered set — giữ hành vi hiện tại + ghi chú) Sua `pendingCount`/`thisWeek` tinh tren toan bo du lieu da loc (truoc phan trang / tu `pagination.total`), dong bo pill nhom voi GROUP moi
- [x] 5.2 Expose status timeline khi co `statusLogs`/`history`/`logs` (render `StatusTimeline` hoac block nho), khong an sau `HIDDEN_RELATION_ARRAYS`
- [x] 5.3 (frontend tsc 0 lỗi, HistoryEntityDetailModal tsc pass; manual check YCKT/YCSC/YCCC/YCMH/kho/generic + timeline) Verify: `cd backend && npx tsc --noEmit` 0 loi, `cd frontend && npx tsc --noEmit -p tsconfig.app.json` 0 loi; manual mo chi tiet moi loai (YCKT/YCSC/YCCC/YCMH/kho/generic) o MyHistory, check filter nhom, pill, count, timeline, khong regression tab phong ban
