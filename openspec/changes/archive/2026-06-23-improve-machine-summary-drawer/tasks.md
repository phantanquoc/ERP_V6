## 1. Backend — Extend getSummary

- [x] 1.1 Add maintenancePlans, finishedProducts, qualityEvaluations optional fields to SummaryLimits interface in machineSystemService.ts (default 5 each)
- [x] 1.2 Add parentSystem select (id, maHeThong, tenHeThong) and clonedSystems count to the machine query in getSummary
- [x] 1.3 Add 3 parallel queries to Promise.all: maintenancePlans (orderBy nam DESC), finishedProducts (orderBy createdAt DESC), qualityEvaluations (orderBy createdAt DESC) — all filtered by machineSystemId with take from limits
- [x] 1.4 Return new fields in getSummary response: maintenancePlans, finishedProducts, qualityEvaluations, parentSystem, clonedSystemsCount ← (verify: backend tsc --noEmit passes, response shape is additive)

## 2. Frontend — Extend types

- [x] 2.1 Add maintenancePlans, finishedProducts, qualityEvaluations (any[]), parentSystem (object | null), clonedSystemsCount (number) to MachineSystemSummary interface in machineSystemService.ts ← (verify: frontend tsc --noEmit passes)

## 3. Frontend — General tab enhancements

- [x] 3.1 Add CATEGORY_LABELS map (MachineSystemCategory enum → Vietnamese labels) in MachineSummaryDrawer
- [x] 3.2 Display loaiHeThong with label, maThietBi, tenThietBi in the general tab info grid
- [x] 3.3 Display fileDinhKem as download link (when non-null)
- [x] 3.4 Display createdAt and updatedAt formatted as DD/MM/YYYY
- [x] 3.5 Add clone lineage section: parentSystem link + clonedSystemsCount display (hide if no lineage) ← (verify: general tab renders all new fields without errors)

## 4. Frontend — Faults tab handover section

- [x] 4.1 Add "Nghiệm thu sau sửa chữa" section to the faults tab displaying handoverItems: maNghiemThu, ngayNghiemThu, tinhTrangTruocSuaChua, tinhTrangSauSuaChua ← (verify: handover items display correctly when data exists, empty state shows fallback)

## 5. Frontend — Summary metrics row

- [x] 5.1 Add "Nghiệm thu" metric (handoverItems.length) as 7th item in metrics row
- [x] 5.2 Update grid class from lg:grid-cols-6 to lg:grid-cols-7 ← (verify: all 7 metrics display correctly, responsive behavior works)

## 6. Verification

- [x] 6.1 Run cd backend && npx tsc --noEmit — must pass
- [x] 6.2 Run cd frontend && npx tsc --noEmit — must pass
