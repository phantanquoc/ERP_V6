import type { WarehouseReceipt, WarehouseReceiptLine } from '../services/warehouseReceiptService';
import type { WarehouseIssue, WarehouseIssueLine } from '../services/warehouseIssueService';

type WarehouseSlip = WarehouseReceipt | WarehouseIssue;
type WarehouseSlipLine = WarehouseReceiptLine | WarehouseIssueLine;

/**
 * Keeps pre-migration slips readable. New slips always expose `items`, while
 * older headers retain only a mirror of their original single commodity line.
 */
export function getWarehouseSlipLines(slip: WarehouseSlip): WarehouseSlipLine[] {
  if (slip.items && slip.items.length > 0) return slip.items;

  const isReceipt = 'maPhieuNhap' in slip;
  return [{
    lotProductId: slip.lotProductId ?? '',
    tenSanPham: slip.tenSanPham ?? '',
    donViTinh: slip.donViTinh,
    warehouseId: slip.warehouseId ?? '',
    tenKho: slip.tenKho,
    lotId: slip.lotId ?? '',
    tenLo: slip.tenLo,
    soLuongThucTe: isReceipt ? slip.soLuongNhap ?? 0 : slip.soLuongXuat ?? 0,
  }];
}

export function getUniqueSlipField(
  lines: WarehouseSlipLine[],
  field: 'tenKho' | 'tenLo',
): string {
  const values = [...new Set(lines.map((line) => line[field]).filter(Boolean))];
  return values.length > 0 ? values.join(', ') : '-';
}

export function normalizeWarehouseListResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    Array.isArray((data as { data?: unknown }).data)
  ) {
    return (data as { data: T[] }).data;
  }
  return [];
}
