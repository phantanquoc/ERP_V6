/**
 * Tests for warehouseIssueService (header + N lines):
 * - Aggregate-by-package stock validation before any write (two lines that each
 *   fit but jointly overdraw must be rejected)
 * - Sequential snapshots chaining across two lines on one package
 * - Update as a line diff, validated against the post-reversal balance
 * - Delete refunding every line to its own package
 * - Lock rejection for supplyRequestId AND materialEvaluation
 * - Reorder-rule check fired once per distinct product
 */

const mockTx = {
  warehouseIssue: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  warehouseIssueItem: {
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  lotProduct: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    warehouseIssue: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    lotProduct: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn: any) => fn(mockTx)),
  },
}));

jest.mock('@utils/errors', () => {
  class ValidationError extends Error {
    statusCode = 400;
    constructor(msg: string) { super(msg); this.name = 'ValidationError'; }
  }
  class ConflictError extends Error {
    statusCode = 409;
    constructor(msg: string) { super(msg); this.name = 'ConflictError'; }
  }
  class NotFoundError extends Error {
    statusCode = 404;
    constructor(msg: string) { super(msg); this.name = 'NotFoundError'; }
  }
  return { ValidationError, ConflictError, NotFoundError, AppError: Error };
});

jest.mock('../utils/codeGenerator', () => ({
  nextYearlyCode: jest.fn(() => 'PX2026-001'),
  yearlyCodeWhere: jest.fn(() => ({ startsWith: 'PX2026' })),
}));

jest.mock('../services/reorderRuleService', () => ({
  __esModule: true,
  default: { checkAndNotify: jest.fn().mockResolvedValue(undefined) },
}));

import prisma from '@config/database';
import warehouseIssueService from '@services/warehouseIssueService';
import reorderRuleService from '../services/reorderRuleService';

const prismaMock = prisma as jest.Mocked<typeof prisma>;
const reorderMock = reorderRuleService.checkAndNotify as jest.Mock;

/** One `lotProduct.findMany` row as the service selects it. */
function packageRow(id: string, soLuong: number, productId = `ip-${id}`) {
  return {
    id,
    soLuong,
    donViTinh: 'Kg',
    internationalProductId: productId,
    internationalProduct: { tenSanPham: `SP ${id}` },
  };
}

function line(lotProductId: string, soLuongThucTe: number, extra: Record<string, unknown> = {}) {
  return {
    lotProductId,
    tenSanPham: `SP ${lotProductId}`,
    donViTinh: 'Kg',
    warehouseId: 'w1',
    tenKho: 'Kho A',
    lotId: 'l1',
    tenLo: 'Lo 1',
    soLuongThucTe,
    ...extra,
  };
}

/** Stored line as read back from `warehouse_issue_items`. */
function storedLine(id: string, lotProductId: string, soLuongThucTe: number, stt: number) {
  return {
    id,
    issueId: 'i1',
    stt,
    lotProductId,
    tenSanPham: `SP ${lotProductId}`,
    donViTinh: 'Kg',
    warehouseId: 'w1',
    tenKho: 'Kho A',
    lotId: 'l1',
    tenLo: 'Lo 1',
    soLuongYeuCau: soLuongThucTe,
    soLuongThucTe,
    soLuongTruoc: 0,
    soLuongSau: 0,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (prismaMock.$transaction as jest.Mock).mockImplementation((fn: any) => fn(mockTx));
  mockTx.warehouseIssue.create.mockResolvedValue({ id: 'i1', supplyRequestId: null, items: [] });
  mockTx.warehouseIssue.update.mockResolvedValue({ id: 'i1', supplyRequestId: null, items: [] });
  mockTx.warehouseIssue.delete.mockResolvedValue({});
  mockTx.lotProduct.update.mockResolvedValue({});
  mockTx.warehouseIssueItem.create.mockResolvedValue({});
  mockTx.warehouseIssueItem.update.mockResolvedValue({});
  mockTx.warehouseIssueItem.deleteMany.mockResolvedValue({ count: 0 });
});

describe('warehouseIssueService.create — aggregate stock validation', () => {
  it('rejects two lines of 60 on one package holding 100 (aggregate 120)', async () => {
    mockTx.lotProduct.findMany.mockResolvedValue([packageRow('lp1', 100)]);

    await expect(
      warehouseIssueService.create({
        employeeId: 'e1',
        items: [line('lp1', 60), line('lp1', 60)],
      })
    ).rejects.toThrow('Số lượng tồn kho');

    // Nothing may be written when the aggregate guard fails.
    expect(mockTx.warehouseIssue.create).not.toHaveBeenCalled();
    expect(mockTx.lotProduct.update).not.toHaveBeenCalled();
  });

  it('accepts two lines of 40 on the same package and leaves 20', async () => {
    mockTx.lotProduct.findMany.mockResolvedValue([packageRow('lp1', 100)]);

    await warehouseIssueService.create({
      employeeId: 'e1',
      items: [line('lp1', 40), line('lp1', 40)],
    });

    expect(mockTx.lotProduct.update).toHaveBeenCalledTimes(1);
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith({
      where: { id: 'lp1' },
      data: { soLuong: 20 },
    });
  });

  it('chains snapshots across two lines sharing one package', async () => {
    mockTx.lotProduct.findMany.mockResolvedValue([packageRow('lp1', 100)]);

    await warehouseIssueService.create({
      employeeId: 'e1',
      items: [line('lp1', 40), line('lp1', 40)],
    });

    const created = mockTx.warehouseIssue.create.mock.calls[0][0].data;
    const lines = created.items.create;
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ stt: 1, soLuongTruoc: 100, soLuongSau: 60 });
    // Line 2 must open where line 1 closed, not at the pre-transaction balance.
    expect(lines[1]).toMatchObject({ stt: 2, soLuongTruoc: 60, soLuongSau: 20 });
    expect(created.tongSoLuongThucTe).toBe(80);
    expect(created.soDongHang).toBe(2);
  });

  it('rejects an empty line array', async () => {
    await expect(
      warehouseIssueService.create({ employeeId: 'e1', items: [] })
    ).rejects.toThrow('Phiếu xuất kho phải có ít nhất một mặt hàng');
  });

  it('generates exactly one code for a multi-line slip', async () => {
    mockTx.lotProduct.findMany.mockResolvedValue([packageRow('lp1', 100), packageRow('lp2', 100)]);
    (prismaMock.warehouseIssue.findFirst as jest.Mock).mockResolvedValue(null);

    await warehouseIssueService.create({
      employeeId: 'e1',
      items: [line('lp1', 10), line('lp2', 10)],
    });

    expect(prismaMock.warehouseIssue.findFirst).toHaveBeenCalledTimes(1);
    expect(mockTx.warehouseIssue.create.mock.calls[0][0].data.maPhieuXuat).toBe('PX2026-001');
  });

  it('accepts the legacy flat payload as a single line', async () => {
    mockTx.lotProduct.findMany.mockResolvedValue([packageRow('lp1', 50)]);

    await warehouseIssueService.create({
      maPhieuXuat: 'PX2026-009',
      employeeId: 'e1',
      warehouseId: 'w1',
      lotId: 'l1',
      lotProductId: 'lp1',
      tenSanPham: 'SP1',
      soLuongXuat: 5,
      donViTinh: 'Kg',
    });

    const created = mockTx.warehouseIssue.create.mock.calls[0][0].data;
    expect(created.soDongHang).toBe(1);
    expect(created.soLuongXuat).toBe(5);
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith({
      where: { id: 'lp1' },
      data: { soLuong: 45 },
    });
  });
});

describe('warehouseIssueService.create — reorder-rule notification', () => {
  it('fires once per distinct product across the lines', async () => {
    mockTx.lotProduct.findMany.mockResolvedValue([
      packageRow('lp1', 100, 'ipA'),
      packageRow('lp2', 100, 'ipA'), // same product, different package
      packageRow('lp3', 100, 'ipB'),
    ]);

    await warehouseIssueService.create({
      employeeId: 'e1',
      items: [line('lp1', 5), line('lp2', 5), line('lp3', 5)],
    });

    expect(reorderMock).toHaveBeenCalledTimes(2);
    expect(reorderMock.mock.calls.map((c) => c[0]).sort()).toEqual(['ipA', 'ipB']);
  });

  it('does not fail the slip when the notification rejects', async () => {
    mockTx.lotProduct.findMany.mockResolvedValue([packageRow('lp1', 100)]);
    reorderMock.mockRejectedValueOnce(new Error('notification down'));

    await expect(
      warehouseIssueService.create({ employeeId: 'e1', items: [line('lp1', 5)] })
    ).resolves.toMatchObject({ id: 'i1' });
  });
});

describe('warehouseIssueService.update', () => {
  it('refunds the stored line then applies the new quantity on the same package', async () => {
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue({
      id: 'i1',
      supplyRequestId: null,
      materialEvaluation: null,
      items: [storedLine('it1', 'lp1', 5, 1)],
    });
    mockTx.lotProduct.findMany.mockResolvedValue([packageRow('lp1', 20)]);

    await warehouseIssueService.update('i1', {
      items: [line('lp1', 8, { id: 'it1' })],
    });

    // 20 + 5 refunded = 25, then 25 - 8 = 17.
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith({
      where: { id: 'lp1' },
      data: { soLuong: 17 },
    });
    expect(mockTx.warehouseIssueItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'it1' },
        data: expect.objectContaining({ soLuongThucTe: 8, soLuongTruoc: 25, soLuongSau: 17 }),
      })
    );
  });

  it('accepts a new quantity that only fits after the reversal is credited back', async () => {
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue({
      id: 'i1',
      supplyRequestId: null,
      materialEvaluation: null,
      items: [storedLine('it1', 'lp1', 90, 1)],
    });
    // Only 10 left on hand, but the stored 90 comes back first.
    mockTx.lotProduct.findMany.mockResolvedValue([packageRow('lp1', 10)]);

    await warehouseIssueService.update('i1', {
      items: [line('lp1', 95, { id: 'it1' })],
    });

    expect(mockTx.lotProduct.update).toHaveBeenCalledWith({
      where: { id: 'lp1' },
      data: { soLuong: 5 },
    });
  });

  it('handles removed, added, and repointed lines in one diff', async () => {
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue({
      id: 'i1',
      supplyRequestId: null,
      materialEvaluation: null,
      items: [storedLine('it1', 'lp1', 10, 1), storedLine('it2', 'lp2', 10, 2)],
    });
    mockTx.lotProduct.findMany.mockResolvedValue([
      packageRow('lp1', 50),
      packageRow('lp2', 50),
      packageRow('lp3', 50),
    ]);

    await warehouseIssueService.update('i1', {
      items: [
        line('lp3', 10, { id: 'it1' }), // repointed lp1 → lp3
        line('lp2', 4), // added
      ],
    });

    // it2 removed → its 10 stays refunded on lp2, plus the new 4 taken back off.
    expect(mockTx.warehouseIssueItem.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['it2'] } },
    });
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith({
      where: { id: 'lp1' },
      data: { soLuong: 60 }, // fully refunded, nothing re-applied
    });
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith({
      where: { id: 'lp2' },
      data: { soLuong: 56 }, // 50 + 10 refunded - 4 new
    });
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith({
      where: { id: 'lp3' },
      data: { soLuong: 40 }, // 50 - 10 repointed
    });
    expect(mockTx.warehouseIssueItem.create).toHaveBeenCalledTimes(1);
  });

  it('writes nothing when the aggregate guard fails on the resolved diff', async () => {
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue({
      id: 'i1',
      supplyRequestId: null,
      materialEvaluation: null,
      items: [storedLine('it1', 'lp1', 10, 1)],
    });
    mockTx.lotProduct.findMany.mockResolvedValue([packageRow('lp1', 100)]);

    await expect(
      warehouseIssueService.update('i1', {
        // 110 available after refund, but 60 + 60 = 120 demanded.
        items: [line('lp1', 60, { id: 'it1' }), line('lp1', 60)],
      })
    ).rejects.toThrow('Số lượng tồn kho');

    expect(mockTx.lotProduct.update).not.toHaveBeenCalled();
    expect(mockTx.warehouseIssueItem.update).not.toHaveBeenCalled();
    expect(mockTx.warehouseIssueItem.create).not.toHaveBeenCalled();
    expect(mockTx.warehouseIssueItem.deleteMany).not.toHaveBeenCalled();
    expect(mockTx.warehouseIssue.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundError for a missing slip', async () => {
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      warehouseIssueService.update('nope', { items: [line('lp1', 1)] })
    ).rejects.toThrow('Không tìm thấy phiếu xuất kho');
  });

  it('throws ConflictError if the slip is supply-request-linked', async () => {
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue({
      id: 'i1',
      supplyRequestId: 'sr1',
      materialEvaluation: null,
      items: [storedLine('it1', 'lp1', 5, 1)],
    });

    await expect(
      warehouseIssueService.update('i1', { items: [line('lp1', 5, { id: 'it1' })] })
    ).rejects.toThrow('Không thể sửa/xóa phiếu gắn với yêu cầu cung cấp');
  });

  it('throws ConflictError if the slip is material-evaluation-generated', async () => {
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue({
      id: 'i1',
      supplyRequestId: null,
      materialEvaluation: { id: 'me1' },
      items: [storedLine('it1', 'lp1', 5, 1)],
    });

    await expect(
      warehouseIssueService.update('i1', { items: [line('lp1', 5, { id: 'it1' })] })
    ).rejects.toThrow('Không thể sửa/xóa phiếu xuất do đánh giá nguyên liệu tạo');
  });
});

describe('warehouseIssueService.delete', () => {
  it('refunds every line to its own package and deletes the slip', async () => {
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue({
      id: 'i1',
      supplyRequestId: null,
      materialEvaluation: null,
      items: [storedLine('it1', 'lp1', 12, 1), storedLine('it2', 'lp2', 3, 2)],
    });
    mockTx.lotProduct.findMany.mockResolvedValue([packageRow('lp1', 30), packageRow('lp2', 1)]);

    const result = await warehouseIssueService.delete('i1');

    expect(result).toEqual({ id: 'i1' });
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith({
      where: { id: 'lp1' },
      data: { soLuong: 42 },
    });
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith({
      where: { id: 'lp2' },
      data: { soLuong: 4 },
    });
    expect(mockTx.warehouseIssue.delete).toHaveBeenCalledWith({ where: { id: 'i1' } });
  });

  it('refunds the aggregate for two lines sharing a package', async () => {
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue({
      id: 'i1',
      supplyRequestId: null,
      materialEvaluation: null,
      items: [storedLine('it1', 'lp1', 10, 1), storedLine('it2', 'lp1', 5, 2)],
    });
    mockTx.lotProduct.findMany.mockResolvedValue([packageRow('lp1', 20)]);

    await warehouseIssueService.delete('i1');

    expect(mockTx.lotProduct.update).toHaveBeenCalledTimes(1);
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith({
      where: { id: 'lp1' },
      data: { soLuong: 35 },
    });
  });

  it('throws ConflictError if locked by materialEvaluation', async () => {
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue({
      id: 'i1',
      supplyRequestId: null,
      materialEvaluation: { id: 'me1' },
      items: [storedLine('it1', 'lp1', 5, 1)],
    });

    await expect(warehouseIssueService.delete('i1')).rejects.toThrow(
      'Không thể sửa/xóa phiếu xuất do đánh giá nguyên liệu tạo'
    );
    expect(mockTx.warehouseIssue.delete).not.toHaveBeenCalled();
  });

  it('throws ConflictError if locked by supplyRequestId', async () => {
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue({
      id: 'i1',
      supplyRequestId: 'sr1',
      materialEvaluation: null,
      items: [storedLine('it1', 'lp1', 5, 1)],
    });

    await expect(warehouseIssueService.delete('i1')).rejects.toThrow(
      'Không thể sửa/xóa phiếu gắn với yêu cầu cung cấp'
    );
  });
});

describe('warehouseIssueService.getAll / getById', () => {
  it('exposes isLocked from either header link and strips the raw relation on list', async () => {
    (prismaMock.warehouseIssue.findMany as jest.Mock).mockResolvedValue([
      { id: 'i1', supplyRequestId: null, materialEvaluation: { id: 'me1' }, tongSoLuongThucTe: 10, soDongHang: 2 },
      { id: 'i2', supplyRequestId: 'sr1', materialEvaluation: null, tongSoLuongThucTe: 5, soDongHang: 1 },
      { id: 'i3', supplyRequestId: null, materialEvaluation: null, tongSoLuongThucTe: 1, soDongHang: 1 },
    ]);

    const list = await warehouseIssueService.getAll();

    expect(list.map((i) => i.isLocked)).toEqual([true, true, false]);
    expect(list[0]).not.toHaveProperty('materialEvaluation');
    expect(list[0].soDongHang).toBe(2);
  });

  it('includes lines on the list so the table can render one row per commodity', async () => {
    (prismaMock.warehouseIssue.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'i1',
        supplyRequestId: null,
        materialEvaluation: null,
        tongSoLuongThucTe: 15,
        soDongHang: 2,
        items: [storedLine('it1', 'lp1', 10, 1), storedLine('it2', 'lp2', 5, 2)],
      },
    ]);

    const list = await warehouseIssueService.getAll();

    // The list response must carry lines: the header mirror only holds line 1,
    // so a list without lines silently hides every other commodity.
    expect(list[0].items).toHaveLength(2);
    const findManyArgs = (prismaMock.warehouseIssue.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyArgs.include.items).toEqual({ orderBy: { stt: 'asc' } });
  });

  it('includes lines on detail', async () => {
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue({
      id: 'i1',
      supplyRequestId: null,
      materialEvaluation: null,
      tongSoLuongThucTe: 15,
      soDongHang: 2,
      items: [storedLine('it1', 'lp1', 10, 1), storedLine('it2', 'lp2', 5, 2)],
    });

    const detail = await warehouseIssueService.getById('i1');

    expect(detail.items).toHaveLength(2);
    expect(detail.isLocked).toBe(false);
  });

  it('throws NotFoundError for a missing slip', async () => {
    (prismaMock.warehouseIssue.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(warehouseIssueService.getById('nope')).rejects.toThrow('Không tìm thấy phiếu xuất kho');
  });
});
