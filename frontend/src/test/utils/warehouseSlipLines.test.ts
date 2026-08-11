import { describe, expect, it } from 'vitest';
import {
  getUniqueSlipField,
  getWarehouseSlipLines,
  normalizeWarehouseListResponse,
} from '../../utils/warehouseSlipLines';
import type { WarehouseReceipt } from '../../services/warehouseReceiptService';
import type { WarehouseIssue } from '../../services/warehouseIssueService';

const baseReceipt: WarehouseReceipt = {
  id: 'receipt-1',
  maPhieuNhap: 'PN-001',
  ngayNhap: '2026-08-11',
  employeeId: 'employee-1',
  maNhanVien: 'NV-001',
  tenNhanVien: 'Nguyễn Văn A',
  createdAt: '2026-08-11T08:00:00Z',
  updatedAt: '2026-08-11T08:00:00Z',
};

const baseIssue: WarehouseIssue = {
  id: 'issue-1',
  maPhieuXuat: 'PX-001',
  ngayXuat: '2026-08-11',
  employeeId: 'employee-1',
  maNhanVien: 'NV-001',
  tenNhanVien: 'Nguyễn Văn A',
  createdAt: '2026-08-11T08:00:00Z',
  updatedAt: '2026-08-11T08:00:00Z',
};

describe('getWarehouseSlipLines', () => {
  it('converts a legacy receipt header into one printable line', () => {
    const lines = getWarehouseSlipLines({
      ...baseReceipt,
      lotProductId: 'package-1',
      tenSanPham: 'Mít sấy',
      donViTinh: 'kg',
      warehouseId: 'warehouse-1',
      tenKho: 'Kho nguyên liệu',
      lotId: 'lot-1',
      tenLo: 'Lô A',
      soLuongNhap: 12,
    });

    expect(lines).toEqual([
      expect.objectContaining({
        lotProductId: 'package-1',
        tenSanPham: 'Mít sấy',
        warehouseId: 'warehouse-1',
        lotId: 'lot-1',
        soLuongThucTe: 12,
      }),
    ]);
  });

  it('uses issue quantity for a legacy outbound slip', () => {
    const lines = getWarehouseSlipLines({
      ...baseIssue,
      tenSanPham: 'Chuối sấy',
      soLuongXuat: 7,
    });

    expect(lines[0]).toMatchObject({ tenSanPham: 'Chuối sấy', soLuongThucTe: 7 });
  });

  it('preserves all lines on a migrated slip instead of rebuilding the header mirror', () => {
    const items = [
      { lotProductId: 'package-1', tenSanPham: 'Mít sấy', warehouseId: 'warehouse-1', lotId: 'lot-1', soLuongThucTe: 3 },
      { lotProductId: 'package-2', tenSanPham: 'Chuối sấy', warehouseId: 'warehouse-2', lotId: 'lot-2', soLuongThucTe: 4 },
    ];

    expect(getWarehouseSlipLines({ ...baseReceipt, items })).toBe(items);
    expect(getWarehouseSlipLines({ ...baseReceipt, items })).toHaveLength(2);
  });
});

describe('warehouse slip display helpers', () => {
  it('deduplicates warehouse and lot summaries while retaining order', () => {
    const lines = [
      { lotProductId: '1', tenSanPham: 'A', warehouseId: 'w1', tenKho: 'Kho A', lotId: 'l1', tenLo: 'Lô 1', soLuongThucTe: 1 },
      { lotProductId: '2', tenSanPham: 'B', warehouseId: 'w1', tenKho: 'Kho A', lotId: 'l2', tenLo: 'Lô 2', soLuongThucTe: 1 },
      { lotProductId: '3', tenSanPham: 'C', warehouseId: 'w2', tenKho: 'Kho B', lotId: 'l1', tenLo: 'Lô 1', soLuongThucTe: 1 },
    ];

    expect(getUniqueSlipField(lines, 'tenKho')).toBe('Kho A, Kho B');
    expect(getUniqueSlipField(lines, 'tenLo')).toBe('Lô 1, Lô 2');
  });

  it('accepts both supported list response envelopes and rejects malformed data', () => {
    expect(normalizeWarehouseListResponse<{ id: string }>([{ id: '1' }])).toEqual([{ id: '1' }]);
    expect(normalizeWarehouseListResponse<{ id: string }>({ data: [{ id: '2' }] })).toEqual([{ id: '2' }]);
    expect(normalizeWarehouseListResponse<{ id: string }>({ data: 'not-a-list' })).toEqual([]);
  });
});
