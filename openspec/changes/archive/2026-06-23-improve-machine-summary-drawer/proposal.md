## Why

MachineSummaryDrawer is the central profile view for machine systems, but it omits significant data already available in the schema and backend. The general tab lacks loaiHeThong, maThietBi, tenThietBi, fileDinhKem, timestamps, and clone lineage. The faults tab ignores AcceptanceHandover items despite the backend already returning them. The summary metrics row doesn't reflect handover count. Additionally, getSummary doesn't return maintenancePlans, finishedProducts, or qualityEvaluations — all of which are direct relations on MachineSystem.

## What Changes

- **Backend**: Extend `getSummary` to return `maintenancePlans`, `finishedProducts`, `qualityEvaluations`, `parentSystem` (id/ma/ten), and `clonedSystems` count. Extend `SummaryLimits` interface accordingly.
- **Frontend types**: Extend `MachineSystemSummary` interface to include new arrays and parent/clone fields.
- **Frontend general tab**: Display `loaiHeThong` (with VN label map), `maThietBi`, `tenThietBi`, `fileDinhKem` (download link), `createdAt`/`updatedAt` (DD/MM/YYYY), and clone lineage section (parentSystem link + clonedSystems count).
- **Frontend faults tab**: Add "Nghiệm thu sau sửa chữa" section listing `handoverItems` (already provided by backend) with maNghiemThu, ngayNghiemThu, tinhTrangTruoc, tinhTrangSau.
- **Frontend summary metrics**: Add "Nghiệm thu" count metric. Adjust grid from 6 to 7 columns.

## Capabilities

### New Capabilities
- `machine-summary-extended`: Extended machine system summary covering backend data expansion (maintenancePlans, finishedProducts, qualityEvaluations, parentSystem, clonedSystems) and frontend display of all MachineSystem fields, handover items in faults tab, and updated metrics row.

### Modified Capabilities

## Impact

- **Backend**: `machineSystemService.ts` — `getSummary` method and `SummaryLimits` interface (additive only, backward compatible).
- **Frontend**: `machineSystemService.ts` types, `MachineSummaryDrawer.tsx` (general tab, faults tab, metrics row).
- **No schema changes**: All data already exists in Prisma models.
- **No breaking API changes**: Response shape is additive — new fields alongside existing ones.
