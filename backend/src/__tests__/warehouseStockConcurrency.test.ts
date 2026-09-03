/**
 * Batch E 7.1 — warehouse stock concurrency / idempotent catalog
 * Verifies:
 * - issue decrement uses updateMany with gte guard and throws when count==0
 * - receipt increment
 * - resolveOrCreateLotProduct returns existing on P2002 instead of duplicating
 */

const mockTx: any = {
  warehouseIssue: { create: jest.fn(), findUnique: jest.fn() },
  warehouseIssueItem: { create: jest.fn(), deleteMany: jest.fn(), update: jest.fn() },
  warehouseReceipt: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), delete: jest.fn() },
  warehouseReceiptItem: { create: jest.fn(), deleteMany: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  lotProduct: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  internationalProduct: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  lot: { findUnique: jest.fn() },
};

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    warehouseIssue: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    warehouseReceipt: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    warehouseReceiptItem: { findMany: jest.fn() },
    lotProduct: { findMany: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    internationalProduct: { findFirst: jest.fn(), create: jest.fn() },
    lot: { findUnique: jest.fn() },
    $transaction: jest.fn((fn: any) => fn(mockTx)),
  },
}));

jest.mock('@utils/errors', () => {
  class ValidationError extends Error { statusCode = 400; constructor(m: string) { super(m); this.name = 'ValidationError'; } }
  class NotFoundError extends Error { statusCode = 404; constructor(m: string) { super(m); this.name = 'NotFoundError'; } }
  class ConflictError extends Error { statusCode = 409; constructor(m: string) { super(m); this.name = 'ConflictError'; } }
  return { ValidationError, NotFoundError, ConflictError, AppError: Error };
});

jest.mock('../utils/codeGenerator', () => ({
  nextYearlyCode: jest.fn(() => 'PX2026-001'),
  yearlyCodeWhere: jest.fn(() => ({ startsWith: 'PX' })),
  nextStaticCode: jest.fn(() => 'SP001'),
  staticCodeWhere: jest.fn(() => ({ startsWith: 'SP' })),
}));

jest.mock('../utils/productCode', () => ({
  suggestAvailableProductCodeFor: jest.fn().mockResolvedValue('SP-NVL-001'),
  UNCLASSIFIED_CATEGORY: 'Chưa phân loại',
}));

jest.mock('../services/reorderRuleService', () => ({
  __esModule: true,
  default: { checkAndNotify: jest.fn().mockResolvedValue(undefined) },
}));

import prisma from '@config/database';
import warehouseIssueService from '@services/warehouseIssueService';
import warehouseReceiptService from '@services/warehouseReceiptService';

const prismaMock = prisma as jest.Mocked<typeof prisma>;

function packageRow(id: string, soLuong: number, productId = `ip-${id}`) {
  return { id, soLuong, donViTinh: 'Kg', maKien: `K-${id}`, internationalProductId: productId, internationalProduct: { tenSanPham: `SP ${id}` } };
}

beforeEach(() => {
  jest.clearAllMocks();
  (prismaMock.$transaction as jest.Mock).mockImplementation((fn: any) => fn(mockTx));
  mockTx.warehouseIssue.create.mockImplementation(({ data }: any) =>
    Promise.resolve({ id: 'issue-1', maPhieuXuat: 'PX2026-001', supplyRequestId: data.supplyRequestId ?? null, ...data, items: [] } as any)
  );
  mockTx.warehouseReceipt.create.mockImplementation(({ data }: any) =>
    Promise.resolve({ id: 'rcpt-1', maPhieuNhap: 'PN2026-001', supplyRequestId: data.supplyRequestId ?? null, ...data, items: [] } as any)
  );
  mockTx.lotProduct.findMany.mockResolvedValue([]);
  mockTx.lotProduct.updateMany.mockResolvedValue({ count: 1 });
  mockTx.lotProduct.update.mockResolvedValue({});
});

describe('warehouse issue — atomic decrement with gte guard', () => {
  it('uses updateMany with where.soLuong.gte and throws when count==0 (concurrent drain)', async () => {
    // Balance passes the pre-write guard, but a concurrent transaction drained
    // the package between read and write — the affected-rows check must reject.
    mockTx.lotProduct.findMany.mockResolvedValue([packageRow('lp-1', 10)]);
    mockTx.lotProduct.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      warehouseIssueService.create({
        employeeId: 'emp-1',
        items: [{ lotProductId: 'lp-1', tenSanPham: 'SP lp-1', donViTinh: 'Kg', warehouseId: 'w1', lotId: 'l1', soLuongThucTe: 10 }],
      } as any)
    ).rejects.toMatchObject({ name: 'ValidationError' });

    expect(mockTx.lotProduct.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'lp-1', soLuong: expect.objectContaining({ gte: 10 }) }) })
    );
  });

  it('succeeds when stock is sufficient — updateMany called with decrement', async () => {
    mockTx.lotProduct.findMany.mockResolvedValue([packageRow('lp-1', 100)]);
    mockTx.lotProduct.updateMany.mockResolvedValue({ count: 1 });

    const res = await warehouseIssueService.create({
      employeeId: 'emp-1',
      items: [{ lotProductId: 'lp-1', tenSanPham: 'SP lp-1', donViTinh: 'Kg', warehouseId: 'w1', lotId: 'l1', soLuongThucTe: 10 }],
    } as any);

    expect(res).toBeDefined();
    expect(mockTx.lotProduct.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ soLuong: expect.objectContaining({ decrement: 10 }) }) })
    );
  });
});

describe('warehouse receipt — increment', () => {
  it('increments lotProduct.soLuong on receipt create', async () => {
    mockTx.lotProduct.findMany.mockResolvedValue([packageRow('lp-1', 20)]);
    // resolveLines cross-checks the package's lot/warehouse against the line's
    // declared lotId/warehouseId, so the mock must carry matching values.
    // The kiện already holds a product — resolveLines must not attach a new one.
    mockTx.lotProduct.findUnique.mockResolvedValue({ maKien: 'K-lp-1', lotId: 'l1', internationalProductId: 'ip-lp-1', donViTinh: 'Kg', lot: { warehouseId: 'w1' } });
    const res = await warehouseReceiptService.create({
      employeeId: 'emp-1',
      items: [{ lotProductId: 'lp-1', tenSanPham: 'SP lp-1', donViTinh: 'Kg', warehouseId: 'w1', lotId: 'l1', soLuongThucTe: 5 }],
    } as any);
    expect(res).toBeDefined();
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lp-1' }, data: expect.objectContaining({ soLuong: expect.objectContaining({ increment: 5 }) }) })
    );
  });
});

describe('resolveOrCreateLotProduct — P2002 idempotence', () => {
  it('returns existing product on P2002 instead of duplicating (InternationalProduct)', async () => {
    const winner = { id: 'ip-winner', maSanPham: 'SP-NVL-001', tenSanPham: 'Xoai', donViTinh: 'Kg', loaiSanPham: 'Nguyên liệu' };
    mockTx.internationalProduct.findFirst
      .mockResolvedValueOnce(null) // fast path miss
      .mockResolvedValueOnce(winner); // re-read after P2002
    mockTx.internationalProduct.create.mockRejectedValue(Object.assign(new Error('Unique'), { code: 'P2002' }));
    mockTx.lot.findUnique.mockResolvedValue({ id: 'lot-1', tenLo: 'Lo 1', zone: null } as any);
    mockTx.lotProduct.findFirst.mockResolvedValue(null);
    // lotProduct create path not hit because we return early after product winner? Actually still needs lotProduct — mock winner LotProduct
    mockTx.lotProduct.create.mockResolvedValue({ id: 'lp-new', soLuong: 0, maKien: null } as any);
    mockTx.lotProduct.update.mockResolvedValue({ id: 'lp-new', soLuong: 0, maKien: 'Lo 1-nNEW' } as any);

    const res = await warehouseReceiptService.resolveOrCreateLotProduct('lot-1', 'Xoai', 'Kg', 'Nguyên liệu', mockTx as any);
    expect(res).toBeDefined();
    expect(res.id).toBeTruthy();
    // Winner's row was reused: exactly one create attempt, then a re-read.
    expect(mockTx.internationalProduct.create).toHaveBeenCalledTimes(1);
    expect(mockTx.internationalProduct.findFirst).toHaveBeenCalledTimes(2);
  });

  it('returns existing LotProduct on P2002 instead of duplicating (LotProduct)', async () => {
    const product = { id: 'ip-1', maSanPham: 'SP-NVL-001', tenSanPham: 'Xoai', donViTinh: 'Kg', loaiSanPham: 'Nguyên liệu' };
    mockTx.internationalProduct.findFirst.mockResolvedValue(product as any);
    mockTx.lot.findUnique.mockResolvedValue({ id: 'lot-1', tenLo: 'Lo 1', zone: null } as any);
    mockTx.lotProduct.findFirst
      .mockResolvedValueOnce(null) // first check miss
      .mockResolvedValueOnce({ id: 'lp-winner', soLuong: 7, maKien: 'K-WIN' } as any); // re-read after P2002
    mockTx.lotProduct.create.mockRejectedValue(Object.assign(new Error('Unique'), { code: 'P2002' }));

    const res = await warehouseReceiptService.resolveOrCreateLotProduct('lot-1', 'Xoai', 'Kg', 'Nguyên liệu', mockTx as any);
    expect(res.id).toBe('lp-winner');
    expect(res.soLuong).toBe(7);
    // No duplicate package: one create attempt, then re-read of the winner.
    expect(mockTx.lotProduct.create).toHaveBeenCalledTimes(1);
    expect(mockTx.lotProduct.findFirst).toHaveBeenCalledTimes(2);
  });
});
