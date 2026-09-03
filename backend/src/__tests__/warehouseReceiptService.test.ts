/**
 * Tests for warehouseReceiptService in its header-plus-lines shape:
 * - One code per slip regardless of line count
 * - Sequential snapshots chaining across two lines on one package
 * - Update as a line diff: removed, added, and repointed lines
 * - Every negative-stock guard runs before the first write
 * - Lock rejection for supplyRequestId, evaluated on the header
 */

const mockTx = {
  $queryRaw: jest.fn().mockResolvedValue([{ id: 'r1' }]),
  warehouseReceipt: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  warehouseReceiptItem: {
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  lotProduct: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  internationalProduct: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  lot: {
    findUnique: jest.fn(),
  },
};

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    warehouseReceipt: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    warehouseReceiptItem: {
      findMany: jest.fn(),
    },
    lotProduct: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
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
  nextYearlyCode: jest.fn(() => 'PN2026-001'),
  yearlyCodeWhere: jest.fn(() => ({ startsWith: 'PN2026' })),
  nextStaticCode: jest.fn(() => 'SP001'),
  staticCodeWhere: jest.fn(() => ({ startsWith: 'SP' })),
}));

import prisma from '@config/database';
import { nextYearlyCode } from '../utils/codeGenerator';

// Must import AFTER mocks
import warehouseReceiptService from '@services/warehouseReceiptService';

const prismaMock = prisma as jest.Mocked<typeof prisma>;

/** Shape `tx.lotProduct.findMany` returns for the balance load. */
function balanceRows(rows: Array<{ id: string; soLuong: number; tenSanPham?: string }>) {
  return rows.map((row) => ({
    id: row.id,
    soLuong: row.soLuong,
    donViTinh: 'Kg',
    internationalProduct: { tenSanPham: row.tenSanPham ?? 'SP1' },
  }));
}

function line(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    lotProductId: 'lp1',
    tenSanPham: 'SP1',
    donViTinh: 'Kg',
    warehouseId: 'w1',
    tenKho: 'Kho A',
    lotId: 'l1',
    tenLo: 'Lo 1',
    soLuongThucTe: 10,
    ...overrides,
  } as any;
}

/** Stored line as `include: { items }` returns it. */
function storedLine(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'it1',
    receiptId: 'r1',
    stt: 1,
    lotProductId: 'lp1',
    tenSanPham: 'SP1',
    donViTinh: 'Kg',
    warehouseId: 'w1',
    tenKho: 'Kho A',
    lotId: 'l1',
    tenLo: 'Lo 1',
    soLuongYeuCau: 10,
    soLuongThucTe: 10,
    soLuongTruoc: 0,
    soLuongSau: 10,
    ghiChu: null,
    ...overrides,
  } as any;
}

/** Fake LotProduct row sufficient for the resolveLines cross-check (maKien + lot/wallet). */
function fakeLotProductRow(lotProductId: string, overrides: Record<string, any> = {}) {
  return { maKien: 'K1.1', lotId: 'l1', internationalProductId: 'ip1', donViTinh: 'Kg', lot: { warehouseId: 'w1' }, ...overrides, id: lotProductId } as any;
}

describe('warehouseReceiptService.create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prismaMock.warehouseReceipt.findFirst as jest.Mock).mockResolvedValue(null);
    mockTx.lotProduct.findUnique.mockImplementation((args: any) => Promise.resolve(fakeLotProductRow(args.where.id)));
    mockTx.warehouseReceipt.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'r1', ...data, items: [] })
    );
  });

  it('generates exactly one code for a multi-line slip', async () => {
    mockTx.lotProduct.findMany.mockResolvedValue(
      balanceRows([{ id: 'lp1', soLuong: 100 }, { id: 'lp2', soLuong: 5 }])
    );

    await warehouseReceiptService.create({
      employeeId: 'e1',
      items: [
        line({ soLuongThucTe: 30 }),
        line({ lotProductId: 'lp2', soLuongThucTe: 20 }),
        line({ soLuongThucTe: 50 }),
      ],
    });

    expect(nextYearlyCode).toHaveBeenCalledTimes(1);
    expect(mockTx.warehouseReceipt.create).toHaveBeenCalledTimes(1);
  });

  it('chains snapshots across two lines sharing one package', async () => {
    mockTx.lotProduct.findMany.mockResolvedValue(balanceRows([{ id: 'lp1', soLuong: 100 }]));

    await warehouseReceiptService.create({
      employeeId: 'e1',
      items: [line({ soLuongThucTe: 30 }), line({ soLuongThucTe: 20 })],
    });

    const created = mockTx.warehouseReceipt.create.mock.calls[0][0].data;
    const lines = created.items.create;

    expect(lines[0]).toMatchObject({ stt: 1, soLuongTruoc: 100, soLuongSau: 130 });
    // Line 2 opens where line 1 closed, not at the pre-transaction balance.
    expect(lines[1]).toMatchObject({ stt: 2, soLuongTruoc: 130, soLuongSau: 150 });
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith({ where: { id: 'lp1' }, data: { soLuong: { increment: 50 } } });
  });

  it('records header totals from its lines', async () => {
    mockTx.lotProduct.findMany.mockResolvedValue(
      balanceRows([{ id: 'lp1', soLuong: 0 }, { id: 'lp2', soLuong: 0 }])
    );

    await warehouseReceiptService.create({
      employeeId: 'e1',
      items: [
        line({ soLuongThucTe: 30 }),
        line({ soLuongThucTe: 20 }),
        line({ lotProductId: 'lp2', soLuongThucTe: 50 }),
      ],
    });

    const created = mockTx.warehouseReceipt.create.mock.calls[0][0].data;
    expect(created.tongSoLuongThucTe).toBe(100);
    expect(created.soDongHang).toBe(3);
  });

  it('defaults soLuongYeuCau to the actual quantity', async () => {
    mockTx.lotProduct.findMany.mockResolvedValue(balanceRows([{ id: 'lp1', soLuong: 0 }]));

    await warehouseReceiptService.create({
      employeeId: 'e1',
      items: [line({ soLuongThucTe: 42 })],
    });

    const lines = mockTx.warehouseReceipt.create.mock.calls[0][0].data.items.create;
    expect(lines[0].soLuongYeuCau).toBe(42);
  });

  it('rejects an empty line array and writes nothing', async () => {
    await expect(
      warehouseReceiptService.create({ employeeId: 'e1', items: [] })
    ).rejects.toThrow('phải có ít nhất một mặt hàng');

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(nextYearlyCode).not.toHaveBeenCalled();
  });

  it('rejects a non-positive actual quantity before any write', async () => {
    await expect(
      warehouseReceiptService.create({ employeeId: 'e1', items: [line({ soLuongThucTe: 0 })] })
    ).rejects.toThrow('phải lớn hơn 0');

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('resolves a line without lotProductId inside the slip transaction', async () => {
    mockTx.internationalProduct.findFirst.mockResolvedValue({ id: 'ip1', donViTinh: 'Kg' });
    mockTx.lotProduct.findFirst.mockResolvedValue({ id: 'lpNew', soLuong: 7 });
    mockTx.lotProduct.findMany.mockResolvedValue(balanceRows([{ id: 'lpNew', soLuong: 7 }]));

    await warehouseReceiptService.create({
      employeeId: 'e1',
      items: [line({ lotProductId: undefined, soLuongThucTe: 3 })],
    });

    // Resolution used the transaction client, not the global prisma client.
    expect(mockTx.internationalProduct.findFirst).toHaveBeenCalled();
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith({ where: { id: 'lpNew' }, data: { soLuong: { increment: 3 } } });
  });

  it('links the commodity onto an empty pre-created kiện selected by id', async () => {
    // PN-2026-021 regression: a fixed kiện from the CAD layout has no product
    // until goods land. Targeting it by id must attach the product, or the
    // pallet holds stock that every product-joined view renders as "?".
    mockTx.lotProduct.findUnique.mockResolvedValue(
      fakeLotProductRow('lp1', { internationalProductId: null, donViTinh: '' })
    );
    mockTx.internationalProduct.findFirst.mockResolvedValue({ id: 'ip-dam', donViTinh: 'Can', giaThanh: 120000 });
    mockTx.lotProduct.findMany.mockResolvedValue(balanceRows([{ id: 'lp1', soLuong: 0 }]));

    await warehouseReceiptService.create({
      employeeId: 'e1',
      items: [line({ tenSanPham: 'Dầu ăn Olein 25kg 1 can', donViTinh: 'Thùng', soLuongThucTe: 15 })],
    });

    expect(mockTx.lotProduct.update).toHaveBeenCalledWith({
      where: { id: 'lp1' },
      data: { internationalProductId: 'ip-dam', donViTinh: 'Thùng', giaThanh: 120000 },
    });
    // The attach runs before the stock increment — both updates are present.
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith({ where: { id: 'lp1' }, data: { soLuong: { increment: 15 } } });
  });

  it('never overwrites the product a kiện already carries', async () => {
    mockTx.lotProduct.findUnique.mockResolvedValue(
      fakeLotProductRow('lp1', { internationalProductId: 'ip-existing', donViTinh: 'Kg' })
    );
    mockTx.lotProduct.findMany.mockResolvedValue(balanceRows([{ id: 'lp1', soLuong: 5 }]));

    await warehouseReceiptService.create({
      employeeId: 'e1',
      items: [line({ soLuongThucTe: 10 })],
    });

    expect(mockTx.internationalProduct.findFirst).not.toHaveBeenCalled();
    expect(mockTx.lotProduct.update).toHaveBeenCalledTimes(1); // only the increment
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith({ where: { id: 'lp1' }, data: { soLuong: { increment: 10 } } });
  });
});

describe('warehouseReceiptService.update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTx.lotProduct.findUnique.mockImplementation((args: any) => Promise.resolve(fakeLotProductRow(args.where.id)));
    mockTx.warehouseReceipt.update.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'r1', supplyRequestId: null, ...data, items: [] })
    );
  });

  it('reverses the stored line and applies the incoming one on the same package', async () => {
    (mockTx.warehouseReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1', supplyRequestId: null, items: [storedLine({ soLuongThucTe: 10 })],
    });
    mockTx.lotProduct.findMany.mockResolvedValue(balanceRows([{ id: 'lp1', soLuong: 50 }]));

    const result = await warehouseReceiptService.update('r1', {
      items: [line({ id: 'it1', soLuongThucTe: 15 })],
    });

    expect(result.tongSoLuongThucTe).toBe(15);
    // Reversal 50 - 10 = 40 is the line's opening balance; it closes at 55.
    expect(mockTx.warehouseReceiptItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'it1' },
        data: expect.objectContaining({ soLuongTruoc: 40, soLuongSau: 55, soLuongThucTe: 15 }),
      })
    );
    // netIn = 15 - 10 = 5
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith({ where: { id: 'lp1' }, data: { soLuong: { increment: 5 } } });
  });

  it('removes a dropped line and settles its package at the reversed balance', async () => {
    (mockTx.warehouseReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1',
      supplyRequestId: null,
      items: [
        storedLine({ id: 'it1', soLuongThucTe: 10 }),
        storedLine({ id: 'it2', stt: 2, lotProductId: 'lp2', soLuongThucTe: 25 }),
      ],
    });
    mockTx.lotProduct.findMany.mockResolvedValue(
      balanceRows([{ id: 'lp1', soLuong: 50 }, { id: 'lp2', soLuong: 60 }])
    );

    await warehouseReceiptService.update('r1', {
      items: [line({ id: 'it1', soLuongThucTe: 10 })],
    });

    expect(mockTx.warehouseReceiptItem.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['it2'] } } });
    // lp1 keeps its line: netIn 10 - 10 = 0 → no stock update for lp1.
    expect(mockTx.lotProduct.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'lp1' }) })
    );
    // lp2 only reverses: netIn = 0 - 25 = -25 → decrement 25 with gte guard.
    expect(mockTx.lotProduct.updateMany).toHaveBeenCalledWith({
      where: { id: 'lp2', soLuong: { gte: 25 } },
      data: { soLuong: { decrement: 25 } },
    });
  });

  it('creates an added line and leaves the existing one intact', async () => {
    (mockTx.warehouseReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1', supplyRequestId: null, items: [storedLine({ soLuongThucTe: 10 })],
    });
    mockTx.lotProduct.findMany.mockResolvedValue(
      balanceRows([{ id: 'lp1', soLuong: 50 }, { id: 'lp2', soLuong: 5 }])
    );

    await warehouseReceiptService.update('r1', {
      items: [line({ id: 'it1', soLuongThucTe: 10 }), line({ lotProductId: 'lp2', soLuongThucTe: 7 })],
    });

    expect(mockTx.warehouseReceiptItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ receiptId: 'r1', stt: 2, lotProductId: 'lp2', soLuongTruoc: 5, soLuongSau: 12 }),
      })
    );
    // lp1 netIn = 0 → no stock update.
    expect(mockTx.lotProduct.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 'lp1' }) })
    );
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith({ where: { id: 'lp2' }, data: { soLuong: { increment: 7 } } });
  });

  it('repoints a line to another package, reversing the original', async () => {
    (mockTx.warehouseReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1', supplyRequestId: null, items: [storedLine({ soLuongThucTe: 10 })],
    });
    mockTx.lotProduct.findMany.mockResolvedValue(
      balanceRows([{ id: 'lp1', soLuong: 50 }, { id: 'lp2', soLuong: 20 }])
    );

    await warehouseReceiptService.update('r1', {
      items: [line({ id: 'it1', lotProductId: 'lp2', soLuongThucTe: 10 })],
    });

    expect(mockTx.lotProduct.updateMany).toHaveBeenCalledWith({
      where: { id: 'lp1', soLuong: { gte: 10 } },
      data: { soLuong: { decrement: 10 } },
    });
    expect(mockTx.lotProduct.update).toHaveBeenCalledWith({ where: { id: 'lp2' }, data: { soLuong: { increment: 10 } } });
    expect(mockTx.warehouseReceiptItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'it1' },
        data: expect.objectContaining({ lotProductId: 'lp2', soLuongTruoc: 20, soLuongSau: 30 }),
      })
    );
  });

  it('writes nothing when reversing a line would drive stock negative', async () => {
    (mockTx.warehouseReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1', supplyRequestId: null, items: [storedLine({ soLuongThucTe: 50 })],
    });
    mockTx.lotProduct.findMany.mockResolvedValue(balanceRows([{ id: 'lp1', soLuong: 30 }]));

    await expect(
      warehouseReceiptService.update('r1', { items: [line({ id: 'it1', soLuongThucTe: 10 })] })
    ).rejects.toThrow('không đủ');

    expect(mockTx.lotProduct.update).not.toHaveBeenCalled();
    expect(mockTx.warehouseReceiptItem.update).not.toHaveBeenCalled();
    expect(mockTx.warehouseReceiptItem.deleteMany).not.toHaveBeenCalled();
    expect(mockTx.warehouseReceipt.update).not.toHaveBeenCalled();
  });

  it('throws ConflictError if the receipt is supply-request-linked', async () => {
    (mockTx.warehouseReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1', supplyRequestId: 'sr1', items: [storedLine()],
    });

    await expect(
      warehouseReceiptService.update('r1', { items: [line({ id: 'it1' })] })
    ).rejects.toThrow('Không thể sửa/xóa phiếu gắn với yêu cầu cung cấp');
  });

  it('throws NotFoundError for an unknown receipt', async () => {
    (mockTx.warehouseReceipt.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      warehouseReceiptService.update('rX', { items: [line({ id: 'it1' })] })
    ).rejects.toThrow('Không tìm thấy phiếu nhập kho');
  });
});

describe('warehouseReceiptService.delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTx.warehouseReceipt.delete.mockResolvedValue({});
  });

  it('reverses every line against its own package and deletes the slip', async () => {
    (mockTx.warehouseReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1',
      supplyRequestId: null,
      items: [
        storedLine({ id: 'it1', soLuongThucTe: 20 }),
        storedLine({ id: 'it2', lotProductId: 'lp2', soLuongThucTe: 5 }),
      ],
    });
    mockTx.lotProduct.findMany.mockResolvedValue(
      balanceRows([{ id: 'lp1', soLuong: 50 }, { id: 'lp2', soLuong: 8 }])
    );

    const result = await warehouseReceiptService.delete('r1');

    expect(result).toEqual({ id: 'r1' });
    expect(mockTx.lotProduct.updateMany).toHaveBeenCalledWith({
      where: { id: 'lp1', soLuong: { gte: 20 } },
      data: { soLuong: { decrement: 20 } },
    });
    expect(mockTx.lotProduct.updateMany).toHaveBeenCalledWith({
      where: { id: 'lp2', soLuong: { gte: 5 } },
      data: { soLuong: { decrement: 5 } },
    });
    expect(mockTx.warehouseReceipt.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
  });

  it('reverses two lines sharing one package by their aggregate', async () => {
    (mockTx.warehouseReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1',
      supplyRequestId: null,
      items: [
        storedLine({ id: 'it1', soLuongThucTe: 30 }),
        storedLine({ id: 'it2', soLuongThucTe: 20 }),
      ],
    });
    mockTx.lotProduct.findMany.mockResolvedValue(balanceRows([{ id: 'lp1', soLuong: 150 }]));

    await warehouseReceiptService.delete('r1');

    expect(mockTx.lotProduct.updateMany).toHaveBeenCalledTimes(1);
    expect(mockTx.lotProduct.updateMany).toHaveBeenCalledWith({
      where: { id: 'lp1', soLuong: { gte: 50 } },
      data: { soLuong: { decrement: 50 } },
    });
  });

  it('writes nothing when the aggregate reversal would go negative', async () => {
    (mockTx.warehouseReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1',
      supplyRequestId: null,
      items: [
        storedLine({ id: 'it1', soLuongThucTe: 30 }),
        storedLine({ id: 'it2', soLuongThucTe: 20 }),
      ],
    });
    // 40 covers each line alone but not the aggregate of 50.
    mockTx.lotProduct.findMany.mockResolvedValue(balanceRows([{ id: 'lp1', soLuong: 40 }]));

    await expect(warehouseReceiptService.delete('r1')).rejects.toThrow('không đủ');

    expect(mockTx.lotProduct.updateMany).not.toHaveBeenCalled();
    expect(mockTx.lotProduct.update).not.toHaveBeenCalled();
    expect(mockTx.warehouseReceipt.delete).not.toHaveBeenCalled();
  });

  it('throws ConflictError if the receipt is locked', async () => {
    (mockTx.warehouseReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1', supplyRequestId: 'sr1', items: [storedLine()],
    });

    await expect(warehouseReceiptService.delete('r1')).rejects.toThrow('Không thể sửa/xóa phiếu gắn với yêu cầu cung cấp');
  });
});

describe('warehouseReceiptService.getByLotProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns one row per line, carrying header code and date', async () => {
    (prismaMock.lotProduct.findUnique as jest.Mock).mockResolvedValue({ id: 'lp1' });
    const header = {
      id: 'r1', maPhieuNhap: 'PN2026-001', ngayNhap: new Date('2026-08-01'),
      maNhanVien: 'NV1', tenNhanVien: 'A', mucDich: 'Nhập từ thu mua',
    };
    (prismaMock.warehouseReceiptItem.findMany as jest.Mock).mockResolvedValue([
      { id: 'it1', soLuongThucTe: 30, soLuongTruoc: 100, soLuongSau: 130, donViTinh: 'Kg', ghiChu: null, receipt: header },
      { id: 'it2', soLuongThucTe: 20, soLuongTruoc: 130, soLuongSau: 150, donViTinh: 'Kg', ghiChu: null, receipt: header },
    ]);

    const rows = await warehouseReceiptService.getByLotProduct('lp1');

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ maPhieuNhap: 'PN2026-001', soLuongNhap: 30, soLuongTruoc: 100, soLuongSau: 130 });
    expect(rows[1]).toMatchObject({ maPhieuNhap: 'PN2026-001', soLuongNhap: 20, soLuongTruoc: 130 });
    expect((prismaMock.warehouseReceiptItem.findMany as jest.Mock).mock.calls[0][0].orderBy).toEqual([
      { receipt: { ngayNhap: 'asc' } },
      { stt: 'asc' },
    ]);
  });

  it('throws NotFoundError for an unknown package', async () => {
    (prismaMock.lotProduct.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(warehouseReceiptService.getByLotProduct('lpX')).rejects.toThrow('Không tìm thấy sản phẩm trong lô');
  });
});

describe('warehouseReceiptService.getAll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes lines on the list so the table can render one row per commodity', async () => {
    (prismaMock.warehouseReceipt.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'r1',
        supplyRequestId: null,
        tongSoLuongThucTe: 15,
        soDongHang: 2,
        items: [storedLine(), storedLine({ id: 'it2', stt: 2, lotProductId: 'lp2', soLuongThucTe: 5 })],
      },
    ]);

    const list = await warehouseReceiptService.getAll();

    // The list response must carry lines: the header mirror only holds line 1,
    // so a list without lines silently hides every other commodity.
    expect(list[0].items).toHaveLength(2);
    expect(list[0].isLocked).toBe(false);
    const findManyArgs = (prismaMock.warehouseReceipt.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyArgs.include.items).toEqual({ orderBy: { stt: 'asc' } });
  });
});

describe('warehouseReceiptService.getById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('includes lines and the computed lock flag', async () => {
    (prismaMock.warehouseReceipt.findUnique as jest.Mock).mockResolvedValue({
      id: 'r1', supplyRequestId: 'sr1', tongSoLuongThucTe: 50, soDongHang: 2, items: [storedLine()],
    });

    const receipt = await warehouseReceiptService.getById('r1');

    expect(receipt.isLocked).toBe(true);
    expect(receipt.items).toHaveLength(1);
  });
});

describe('warehouseReceiptService.batchCreate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prismaMock.warehouseReceipt.findFirst as jest.Mock).mockResolvedValue(null);
    mockTx.warehouseReceipt.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'r1', ...data, items: [] })
    );
  });

  it('folds flat rows sharing one code into a single multi-line slip', async () => {
    mockTx.lotProduct.findMany.mockResolvedValue(
      balanceRows([{ id: 'lp1', soLuong: 0 }, { id: 'lp2', soLuong: 0 }])
    );

    const results = await warehouseReceiptService.batchCreate([
      { maPhieuNhap: 'PN2026-001', employeeId: 'e1', warehouseId: 'w1', lotId: 'l1', lotProductId: 'lp1', tenSanPham: 'SP1', soLuongNhap: 10 },
      { maPhieuNhap: 'PN2026-001', employeeId: 'e1', warehouseId: 'w1', lotId: 'l1', lotProductId: 'lp2', tenSanPham: 'SP2', soLuongNhap: 20 },
    ]);

    expect(results).toHaveLength(1);
    expect(mockTx.warehouseReceipt.create).toHaveBeenCalledTimes(1);
    expect(mockTx.warehouseReceipt.create.mock.calls[0][0].data.soDongHang).toBe(2);
  });

  it('creates one slip per distinct code', async () => {
    mockTx.lotProduct.findMany.mockResolvedValue(balanceRows([{ id: 'lp1', soLuong: 0 }]));

    const results = await warehouseReceiptService.batchCreate([
      { maPhieuNhap: 'PN2026-001', employeeId: 'e1', warehouseId: 'w1', lotId: 'l1', lotProductId: 'lp1', tenSanPham: 'SP1', soLuongNhap: 10 },
      { maPhieuNhap: 'PN2026-002', employeeId: 'e1', warehouseId: 'w1', lotId: 'l1', lotProductId: 'lp1', tenSanPham: 'SP1', soLuongNhap: 20 },
    ]);

    expect(results).toHaveLength(2);
  });

  it('skips rows missing required fields', async () => {
    const results = await warehouseReceiptService.batchCreate([
      { employeeId: 'e1', warehouseId: '', lotId: '', tenSanPham: '', soLuongNhap: 0 } as any,
    ]);

    expect(results).toEqual([]);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
