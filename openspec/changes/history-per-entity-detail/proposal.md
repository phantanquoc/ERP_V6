# Proposal — history-per-entity-detail

## Why

Lich su ca nhan (`MyHistory` + `MyHistoryDetailModal` + `HistoryEntityDetailModal` + `myHistoryUtils.ts` + `services/myHistoryService.ts` + backend `myHistoryService.ts`) hien dung 1 form generic cho moi loai phieu (render field/relation tron qua `HIDDEN_RELATION_ARRAYS`, label map rieng 3 file, status label thieu). Ket qua:

- **Kho doc, khong dung UX phong ban:** YCKT/YCSC co `RepairRequestFormModal` view day du, YCCC co `SupplyRequestManagement` detail, YCMH co `ReplenishmentDetailModal`, phieu kho co `Warehouse*Tab` detail — nhung MyHistory lai render chung 1 generic table/kv, bo mat stepper/timeline/business fields quan trong.
- **Filter rot:** `GROUP_TO_ENTITY_TYPES` frontend thieu `inspection-request`, `overtime-plan`, `order` so voi backend branches → filter theo nhom bi leak/thieu.
- **Chi so sai:** bang `STATUS_LABEL` thieu `CHO_XU_LY`, `DA_TIEP_NHAN`…; `pendingCount` luon 0; `thisWeek` chi dem trang hien tai; nhieu relation quan trong bi an boi `HIDDEN_RELATION_ARRAYS`.
- **Lap code:** map label mau/trang thai lap lai 3 noi, kho bao tri.

Muc tieu: doc nhu tab phong ban (reuse view san co), sua filter/count/label thanh 1 nguon dung, mo lai relation quan trong, bo lap.

## What Changes

- **Router trong `MyHistoryDetailModal`:** theo `entityType` chon view chuyen biet; `HistoryEntityDetailModal` thanh router + `GenericDetailView` fallback.
- **Reuse view phong ban o che do readOnly/view:** YCKT/YCSC → `RepairRequestFormModal` (`isView`/`readOnly`), YCCC → detail cua `SupplyRequestManagement`, YCMH → `ReplenishmentDetailModal`, phieu kho → detail cua `Warehouse*Tab`; cac loai khac giu generic nhung cai thien (nhom field, hien relation, timeline).
- **Trich `DetailViews` dung chung (neu can):** tach cac khoi dung lai (header/badge, timeline/lich su trang thai, file dinh kem, kv thong tin) de generic va per-entity view cung dung, tranh copy-paste.
- **Sua `GROUP_TO_ENTITY_TYPES` thanh single source:** 1 dinh nghia dung chung FE/BE (FE import hoac dong bo tu BE), bo sung `inspection-request`, `overtime-plan`, `order` va dong bo voi backend branches.
- **Sua bang nhan trang thai:** bo sung du `CHO_XU_LY`, `DA_TIEP_NHAN`, `DANG_KIEM_TRA`… theo Prisma enum thuc te; thong nhat 1 map dung chung thay 3 ban copy.
- **Sua group counts/pills:** `pendingCount`/`thisWeek` tinh tren toan bo du lieu da loc (khong phai trang hien tai), dong bo pill nhom voi FE filter thuc te.
- **Mo status timeline:** hien lich su trang thai/timeline khi `includeRelations` co `statusLogs`/`history`, khong an sau `HIDDEN_RELATION_ARRAYS`.
- **Xu ly fix gap:** xoa/gop `HIDDEN_RELATION_ARRAYS` an lien ket quan trong, gop duplicate label maps ve 1 source (`myHistoryUtils.ts` hoac `utils/status.ts`).

## Capabilities

### New Capabilities
<!-- per-entity detail routing is new behavior, but pure frontend composition — no spec capability change required; skip_specs=true -->

### Modified Capabilities
<!-- improves existing MyHistory capability — no spec file change -->

## Impact

- `frontend/src/pages/MyHistory.tsx`
- `frontend/src/components/MyHistoryDetailModal.tsx`
- `frontend/src/components/HistoryEntityDetailModal.tsx` (thanh router + GenericDetailView)
- `frontend/src/utils/myHistoryUtils.ts` (single source GROUP + STATUS_LABEL + counts)
- `frontend/src/services/myHistoryService.ts` (neu dong bo GROUP voi BE)
- `backend/src/services/myHistoryService.ts` (doi chieu GROUP, sua count neu can)
- Cac view duoc reuse: `RepairRequestFormModal.tsx`, `SupplyRequestManagement` detail, `ReplenishmentDetailModal.tsx`, `Warehouse*Tab` detail — chi dung o che do view/readOnly, khong doi logic ghi.
- Khong doi Prisma schema, khong them endpoint moi, khong doi ROUTE_MAP/RBAC.

## Out of Scope

- Khong doi Prisma schema / migration.
- Khong them endpoint API moi (reuse `GET /my-history/:entityType/:id` san co).
- Khong doi quy tac RBAC/ABAC cua MyHistory.
- Khong them thu vien moi.

## Risks

- Reuse view phong ban co the keo them dependency/hook — Mitigation: chi render o `view/readOnly`, truyen `data` san co tu MyHistory detail, khong goi mutation.
