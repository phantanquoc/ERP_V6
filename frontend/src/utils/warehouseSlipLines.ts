import type { WarehouseReceipt, WarehouseReceiptLine } from '../services/warehouseReceiptService';
import type { WarehouseIssue, WarehouseIssueLine } from '../services/warehouseIssueService';

type WarehouseSlip = WarehouseReceipt | WarehouseIssue;
type WarehouseSlipLine = WarehouseReceiptLine | WarehouseIssueLine;

/**
 * Keeps pre-migration slips readable. New slips always expose `items`, while
 * older headers retain only a mirror of their original single commodity line.
 */
export function getWarehouseSlipLines(slip: WarehouseSlip): WarehouseSlipLine[] {
  if (slip.items && slip.items.length > 0) return slip.items as WarehouseSlipLine[];

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
  } as unknown as WarehouseSlipLine];
}

export function getUniqueSlipField(
  lines: WarehouseSlipLine[],
  field: 'tenKho' | 'tenLo',
): string {
  const values = [...new Set(lines.map((line) => line[field]).filter(Boolean))];
  return values.length > 0 ? values.join(', ') : '-';
}

/**
 * BM01/BM03 column B "Mã hàng hóa" is the catalog code `maSanPham` (VT-…, SP-…),
 * not the pallet code `maKien` (K1.1…). The receipt/issue list now carries
 * `maSanPham` from InternationalProduct; older/cached payloads that predate the
 * enrichment have only `maKien`.
 */
export function displayMaHang(line: WarehouseSlipLine): string {
  const maSanPham = (line as unknown as { maSanPham?: string | null }).maSanPham;
  if (maSanPham) return maSanPham;
  if (line.maKien) return line.maKien;
  const lotProductId = (line as unknown as { lotProductId?: string }).lotProductId;
  if (lotProductId) return lotProductId.slice(-6);
  return '-';
}

/**
 * BM01/BM03 column C "Loại Kho" is the warehouse code `maKho` (KHONL, KHOTP,
 * HD1, …) from `warehouses.maKho`, not the human label `tenKho`. `maKho` is
 * what the site uses as the warehouse class; `warehouses.loaiKho` is empty for
 * every warehouse in production. Fall back to `tenKho` only for cached rows
 * that predate the enrichment.
 */
export function displayLoaiKho(line: WarehouseSlipLine): string {
  const maKho = (line as unknown as { maKho?: string | null }).maKho;
  if (maKho) return maKho;
  if (line.tenKho) return line.tenKho;
  return '-';
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
