# Design — history-per-entity-detail

## Context

`MyHistory` la trang lich su ca nhan gop moi loai phieu cua user (`/my-history` + `GET /my-history/:entityType/:id?includeRelations=true`). Hien tai:

- `MyHistoryDetailModal` → `HistoryEntityDetailModal` render **1 generic view** cho moi `entityType` (kv/field list tron, an relation qua `HIDDEN_RELATION_ARRAYS`).
- Trong khi cac tab phong ban da co view dep, du nghiep vu: YCKT/YCSC `RepairRequestFormModal` (isView, stepper, timeline, file, handover), YCCC `SupplyRequestManagement` detail, YCMH `ReplenishmentDetailModal`, phieu kho `Warehouse*Tab` detail.
- `GROUP_TO_ENTITY_TYPES` FE thieu `inspection-request`, `overtime-plan`, `order` so voi BE → filter nhom leak.
- `STATUS_LABEL`/`STATUS_TONE` lap 3 file, thieu `CHO_XU_LY`, `DA_TIEP_NHAN`…; `pendingCount`/`thisWeek` tinh sai (0 / chi trang hien tai); `HIDDEN_RELATION_ARRAYS` an ca link quan trong.

Can dua MyHistory ve do doc nhu tab phong ban bang cach reuse view san co, dong thoi gom label/group/count ve 1 nguon dung.

## Goals / Non-Goals

**Goals:**
- Chi tiet MyHistory doc nhu tab phong ban: YCKT/YCSC/YCCC/YCMH/phieu kho hien dung view chuyen biet o che do view/readOnly.
- 1 nguon dung cho `GROUP_TO_ENTITY_TYPES` va `STATUS_LABEL/TONE` (khong lap 3 file).
- Filter nhom + pill + count (`pendingCount`, `thisWeek`) dung, tinh tren toan bo du lieu da loc.
- Mo lai timeline/lich su trang thai khi co `statusLogs`/`history`.

**Non-Goals:**
- Khong doi Prisma schema / migration.
- Khong them endpoint / khong doi ROUTE_MAP / RBAC.
- Khong them thu vien moi, khong doi logic ghi/mutation cua view goc.

## Decisions

- **Reuse view phong ban o readOnly/view mode:** YCKT/YCSC → `RepairRequestFormModal` (`isView`/`readOnly`, truyen `data` tu `GET /my-history/:entityType/:id`), YCCC → detail view cua `SupplyRequestManagement`, YCMH → `ReplenishmentDetailModal`, phieu kho → detail cua `Warehouse*Tab` tuong ung. Khong goi mutation, khong mount form ghi; neu view yeu cau fetch phu thi dung data san co hoac disable fetch.
- **`HistoryEntityDetailModal` thanh router + `GenericDetailView` fallback:** `MyHistoryDetailModal` chi mo router; router switch theo `entityType` sang view chuyen biet, default → `GenericDetailView` (generic cai thien: nhom field, hien relation co chon loc, timeline). Logic generic cu chuyen vao `GenericDetailView`.
- **Trich `DetailViews` dung chung (khi can):** cac khoi lap (header ma+badge+ngay, `StatusTimeline`/lich su trang thai, list file dinh kem, kv thong tin) tach thanh helper nho trong `components/history/` hoac `utils/` de ca generic va per-entity view dung, tranh copy-paste; khong tao abstraction thua neu chi dung 1 lan.
- **Single source `GROUP_TO_ENTITY_TYPES`:** 1 dinh nghia chuan dong bo FE/BE (FE import tu `myHistoryUtils.ts` lam source, BE doi chieu; hoac FE dong bo tu BE response). Bo sung `inspection-request`, `overtime-plan`, `order` va map dung voi BE branches.
- **Status label union:** 1 map `STATUS_LABEL`/`STATUS_TONE` bao phu du enum thuc te (`CHO_XU_LY`, `DA_TIEP_NHAN`, `DANG_KIEM_TRA`, `CHO_NGHIEM_THU`, `DA_NGHIEM_THU`, `HOAN_THANH`, `TU_CHOI`, `DA_HUY`…), dat tai `myHistoryUtils.ts` (hoac `utils/status.ts` neu da co) va import o moi noi, xoa ban copy o `MyHistory.tsx`/`HistoryEntityDetailModal.tsx`.
- **Sua group counts/pills:** `pendingCount`/`thisWeek` tinh tren mang da loc truoc phan trang (hoac tu BE `pagination.total` neu BE tra), pill nhom dong bo voi GROUP moi.
- **Expose status timeline:** khi `includeRelations=true` tra ve `statusLogs`/`history`/`logs`, render timeline (dung `StatusTimeline` san co hoac block nho), khong an sau `HIDDEN_RELATION_ARRAYS`; thu hep `HIDDEN_RELATION_ARRAYS` chi an truong noi bo thuc su.
- **Khong Prisma moi:** chi doc `myHistoryService.ts` BE de doi chieu GROUP/count, khong them model/enum.

## Risks / Trade-offs

- Reuse view phong ban co the keo hook/query phu → Mitigation: render o view/readOnly, truyen prop `data`/`readOnly`, mock/disable query phu neu thieu context.
- Generic fallback van can dep khi thieu relation → Mitigation: nhom field theo prefix/domain, hien relation co chon loc + timeline neu co.
- Dong bo GROUP FE/BE lech → Mitigation: 1 test/unit assert `GROUP_TO_ENTITY_TYPES` FE khop BE branches.

## Migration Plan

1. Dong bo `GROUP_TO_ENTITY_TYPES` + `STATUS_LABEL` ve 1 source, sua `HIDDEN_RELATION_ARRAYS`.
2. Tach `GenericDetailView` va them router trong `HistoryEntityDetailModal`/`MyHistoryDetailModal`; gan tung per-entity view (YCKT/YCSC truoc, roi YCCC/YCMH/phieu kho).
3. Sua counts/pills + expose timeline; `npx tsc --noEmit` FE/BE 0 loi; manual mo chi tiet moi loai phieu o MyHistory.
