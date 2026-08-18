// Sức chứa tối đa của 1 pallet (kiện) theo đơn vị đóng gói — đồng bộ với
// backend/src/services/warehouseStockService.ts. Nghiệp vụ: 1 pallet chứa tối đa
// 36 thùng hoặc 32 bao (7kg/thùng, 25kg/bao). Đơn vị khác chưa có quy định → null.
const KIEN_CAPACITY: Record<string, number> = {
  thùng: 36,
  thùng: 36,
  thung: 36,
  bao: 32,
};

export function kienCapacityByUnit(unit?: string | null): number | null {
  if (!unit) return null;
  return KIEN_CAPACITY[unit.trim().toLowerCase()] ?? null;
}
