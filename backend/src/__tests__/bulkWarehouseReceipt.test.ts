/**
 * Tests for FinishedProductService.confirmBulkFinishedProductWarehouseReceipt
 *
 * Happy path + conflict + empty list + zero-grade skip
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockTx = {
  warehouseReceipt: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  internationalProduct: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  lotProduct: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  finishedProduct: {
    updateMany: jest.fn(),
  },
};

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    warehouses: { findUnique: jest.fn() },
    lot: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    finishedProduct: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    warehouseReceipt: { findFirst: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@services/warehouseReceiptService', () => ({
  __esModule: true,
  default: {
    batchCreate: jest.fn(),
  },
}));

jest.mock('@utils/codeGenerator', () => ({
  nextYearlyCode: jest.fn((last: string | null, prefix: string, year: number) => {
    // Simple deterministic mock: PN2026-001, PN2026-002, ...
    if (!last) return `${prefix}${year}-001`;
    const num = parseInt(last.split('-')[1] ?? '0', 10);
    return `${prefix}${year}-${String(num + 1).padStart(3, '0')}`;
  }),
  yearlyCodeWhere: jest.fn(() => ({ startsWith: 'PN2026' })),
}));

import prisma from '@config/database';
import { FinishedProductService } from '@services/finishedProductService';
import { ValidationError, NotFoundError, ConflictError } from '@utils/errors';

const service = new FinishedProductService();
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

// ─── Shared test data ─────────────────────────────────────────────────────────

const WAREHOUSE_ID = 'wh-001';
const LOT_ID = 'lot-001';
const USER_ID = 'user-001';

const mockWarehouse = { id: WAREHOUSE_ID, tenKho: 'Kho A', lots: [] };
const mockLot = { id: LOT_ID, tenLo: 'Lô 01', warehouseId: WAREHOUSE_ID };
const mockUser = {
  firstName: 'Văn A',
  lastName: 'Nguyễn',
  employees: { employeeCode: 'NV001' },
};

/** Build a FinishedProduct row with specified grade values. All grade defaults to 0. */
function makeFP(overrides: Partial<{
  id: string;
  maChien: string;
  tenHangHoa: string;
  daNhapKho: boolean;
  aKhoiLuong: number;
  bKhoiLuong: number;
  bDauKhoiLuong: number;
  cKhoiLuong: number;
  vunLonKhoiLuong: number;
  vunNhoKhoiLuong: number;
  phePhamKhoiLuong: number;
  uotKhoiLuong: number;
}> = {}) {
  return {
    id: overrides.id ?? 'fp-001',
    maChien: overrides.maChien ?? 'MC-2026-001',
    tenHangHoa: overrides.tenHangHoa ?? 'Xoài sấy',
    machineSystemId: 'ms-001',
    daNhapKho: overrides.daNhapKho ?? false,
    khoiLuong: 100,
    aKhoiLuong: overrides.aKhoiLuong ?? 0,
    bKhoiLuong: overrides.bKhoiLuong ?? 0,
    bDauKhoiLuong: overrides.bDauKhoiLuong ?? 0,
    cKhoiLuong: overrides.cKhoiLuong ?? 0,
    vunLonKhoiLuong: overrides.vunLonKhoiLuong ?? 0,
    vunNhoKhoiLuong: overrides.vunNhoKhoiLuong ?? 0,
    phePhamKhoiLuong: overrides.phePhamKhoiLuong ?? 0,
    uotKhoiLuong: overrides.uotKhoiLuong ?? 0,
    tongKhoiLuong: 100,
    nguoiThucHien: 'Nguyễn Văn A',
    createdAt: new Date('2026-06-25'),
    updatedAt: new Date('2026-06-25'),
    thoiGianChien: new Date('2026-06-25'),
    fileDinhKem: null,
  };
}

/** Set up the happy-path transaction mock that records receipt creation. */
function setupTransactionMock() {
  (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (fn: Function) => {
    // tx.warehouseReceipt.findFirst → no existing receipts
    mockTx.warehouseReceipt.findFirst.mockResolvedValue(null);
    // tx.internationalProduct.findFirst → no existing product → will create
    mockTx.internationalProduct.findFirst.mockResolvedValue(null);
    mockTx.internationalProduct.create.mockImplementation(({ data }: any) => ({
      id: `ip-${data.maSanPham}`,
      ...data,
    }));
    // Code generation reads sibling codes for the category prefix; none exist yet, so
    // the suggested code is the first sequence for that category.
    mockTx.internationalProduct.findMany.mockResolvedValue([]);
    mockTx.lotProduct.findFirst.mockResolvedValue(null);
    mockTx.lotProduct.create.mockImplementation(({ data }: any) => ({
      id: `lp-${Date.now()}`,
      soLuong: 0,
      ...data,
    }));
    mockTx.warehouseReceipt.create.mockResolvedValue({ id: 'wr-001' });
    mockTx.lotProduct.update.mockResolvedValue({});
    mockTx.finishedProduct.updateMany.mockResolvedValue({ count: 1 });

    return fn(mockTx);
  });
}

// ─── beforeEach ───────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Default: warehouse + lot + user all exist
  (mockedPrisma.warehouses.findUnique as jest.Mock).mockResolvedValue(mockWarehouse);
  (mockedPrisma.lot.findUnique as jest.Mock).mockResolvedValue(mockLot);
  (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
});

// ─── ValidationError: empty maChienList ───────────────────────────────────────

describe('confirmBulkFinishedProductWarehouseReceipt — input validation', () => {
  it('throws ValidationError when maChienList is empty', async () => {
    await expect(
      service.confirmBulkFinishedProductWarehouseReceipt([], WAREHOUSE_ID, LOT_ID, USER_ID),
    ).rejects.toThrow(ValidationError);

    await expect(
      service.confirmBulkFinishedProductWarehouseReceipt([], WAREHOUSE_ID, LOT_ID, USER_ID),
    ).rejects.toThrow('trống');
  });

  it('throws ValidationError when warehouseId is empty string', async () => {
    await expect(
      service.confirmBulkFinishedProductWarehouseReceipt(['MC-001'], '', LOT_ID, USER_ID),
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when lotId is empty string', async () => {
    await expect(
      service.confirmBulkFinishedProductWarehouseReceipt(['MC-001'], WAREHOUSE_ID, '', USER_ID),
    ).rejects.toThrow(ValidationError);
  });
});

// ─── NotFoundError: warehouse / lot / maChien ─────────────────────────────────

describe('confirmBulkFinishedProductWarehouseReceipt — not found', () => {
  it('throws NotFoundError when warehouse does not exist', async () => {
    (mockedPrisma.warehouses.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.confirmBulkFinishedProductWarehouseReceipt(['MC-001'], WAREHOUSE_ID, LOT_ID, USER_ID),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when lot does not exist', async () => {
    (mockedPrisma.lot.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.confirmBulkFinishedProductWarehouseReceipt(['MC-001'], WAREHOUSE_ID, LOT_ID, USER_ID),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when a maChien has no FinishedProducts', async () => {
    // allFPs query returns empty — no FP for any maChien
    (mockedPrisma.finishedProduct.findMany as jest.Mock).mockResolvedValue([]);

    await expect(
      service.confirmBulkFinishedProductWarehouseReceipt(['MC-MISSING'], WAREHOUSE_ID, LOT_ID, USER_ID),
    ).rejects.toThrow(NotFoundError);

    await expect(
      service.confirmBulkFinishedProductWarehouseReceipt(['MC-MISSING'], WAREHOUSE_ID, LOT_ID, USER_ID),
    ).rejects.toThrow('MC-MISSING');
  });

  it('throws NotFoundError when one of multiple maChien has no FPs', async () => {
    // Only MC-001 has a FP; MC-002 has none
    (mockedPrisma.finishedProduct.findMany as jest.Mock).mockResolvedValue([
      makeFP({ maChien: 'MC-001', aKhoiLuong: 10 }),
    ]);

    await expect(
      service.confirmBulkFinishedProductWarehouseReceipt(['MC-001', 'MC-002'], WAREHOUSE_ID, LOT_ID, USER_ID),
    ).rejects.toThrow(NotFoundError);
  });
});

// ─── ConflictError: already received ─────────────────────────────────────────

describe('confirmBulkFinishedProductWarehouseReceipt — conflict', () => {
  it('throws ConflictError when any FP has daNhapKho=true', async () => {
    (mockedPrisma.finishedProduct.findMany as jest.Mock).mockResolvedValue([
      makeFP({ maChien: 'MC-001', daNhapKho: true, aKhoiLuong: 50 }),
    ]);

    await expect(
      service.confirmBulkFinishedProductWarehouseReceipt(['MC-001'], WAREHOUSE_ID, LOT_ID, USER_ID),
    ).rejects.toThrow(ConflictError);
  });

  it('ConflictError message includes the offending maChien', async () => {
    (mockedPrisma.finishedProduct.findMany as jest.Mock).mockResolvedValue([
      makeFP({ maChien: 'MC-CONFLICT', daNhapKho: true, aKhoiLuong: 50 }),
    ]);

    await expect(
      service.confirmBulkFinishedProductWarehouseReceipt(['MC-CONFLICT'], WAREHOUSE_ID, LOT_ID, USER_ID),
    ).rejects.toThrow('MC-CONFLICT');
  });

  it('throws ConflictError when only one FP in a list has daNhapKho=true', async () => {
    (mockedPrisma.finishedProduct.findMany as jest.Mock).mockResolvedValue([
      makeFP({ id: 'fp-1', maChien: 'MC-001', daNhapKho: false, aKhoiLuong: 20 }),
      makeFP({ id: 'fp-2', maChien: 'MC-002', daNhapKho: true, aKhoiLuong: 30 }),
    ]);

    await expect(
      service.confirmBulkFinishedProductWarehouseReceipt(['MC-001', 'MC-002'], WAREHOUSE_ID, LOT_ID, USER_ID),
    ).rejects.toThrow(ConflictError);
  });
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('confirmBulkFinishedProductWarehouseReceipt — happy path', () => {
  it('returns { success: true } and calls tx.finishedProduct.updateMany with correct maChienList', async () => {
    const fp1 = makeFP({ id: 'fp-1', maChien: 'MC-001', aKhoiLuong: 40, bKhoiLuong: 10 });
    const fp2 = makeFP({ id: 'fp-2', maChien: 'MC-002', cKhoiLuong: 25 });

    (mockedPrisma.finishedProduct.findMany as jest.Mock).mockResolvedValue([fp1, fp2]);
    setupTransactionMock();

    const result = await service.confirmBulkFinishedProductWarehouseReceipt(
      ['MC-001', 'MC-002'],
      WAREHOUSE_ID,
      LOT_ID,
      USER_ID,
    );

    expect(result).toEqual({ success: true });

    // The transaction must have marked both maChien as received
    expect(mockTx.finishedProduct.updateMany).toHaveBeenCalledWith({
      where: { maChien: { in: ['MC-001', 'MC-002'] } },
      data: { daNhapKho: true },
    });
  });

  it('creates one warehouseReceipt row per non-zero grade', async () => {
    // fp1 has A=50, B=20, all other grades = 0 → expect 2 receipt rows
    const fp1 = makeFP({ id: 'fp-1', maChien: 'MC-001', aKhoiLuong: 50, bKhoiLuong: 20 });

    (mockedPrisma.finishedProduct.findMany as jest.Mock).mockResolvedValue([fp1]);
    setupTransactionMock();

    await service.confirmBulkFinishedProductWarehouseReceipt(
      ['MC-001'],
      WAREHOUSE_ID,
      LOT_ID,
      USER_ID,
    );

    // warehouseReceipt.create should have been called exactly twice (A + B)
    expect(mockTx.warehouseReceipt.create).toHaveBeenCalledTimes(2);
  });

  it('sums grades across multiple machines for the same maChien', async () => {
    // Two FPs for MC-001 — machine 1: A=30, machine 2: A=20 → total A = 50
    const fp1 = makeFP({ id: 'fp-1', maChien: 'MC-001', aKhoiLuong: 30 });
    const fp2 = makeFP({ id: 'fp-2', maChien: 'MC-001', aKhoiLuong: 20 });

    (mockedPrisma.finishedProduct.findMany as jest.Mock).mockResolvedValue([fp1, fp2]);
    setupTransactionMock();

    await service.confirmBulkFinishedProductWarehouseReceipt(
      ['MC-001'],
      WAREHOUSE_ID,
      LOT_ID,
      USER_ID,
    );

    // One receipt row for grade A with soLuongNhap = 50
    expect(mockTx.warehouseReceipt.create).toHaveBeenCalledTimes(1);
    expect(mockTx.warehouseReceipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          soLuongNhap: 50,
          tenSanPham: expect.stringContaining('Loại A'),
        }),
      }),
    );
  });
});

// ─── Zero-grade skip ──────────────────────────────────────────────────────────

describe('confirmBulkFinishedProductWarehouseReceipt — zero-grade skip', () => {
  it('skips all grade rows when every grade is 0 (no receipts created)', async () => {
    // All grade fields = 0
    const fp = makeFP({ id: 'fp-1', maChien: 'MC-001' }); // all grades default to 0

    (mockedPrisma.finishedProduct.findMany as jest.Mock).mockResolvedValue([fp]);
    setupTransactionMock();

    await service.confirmBulkFinishedProductWarehouseReceipt(
      ['MC-001'],
      WAREHOUSE_ID,
      LOT_ID,
      USER_ID,
    );

    // No receipt rows created — all grades were 0
    expect(mockTx.warehouseReceipt.create).not.toHaveBeenCalled();

    // But daNhapKho should still be set to true
    expect(mockTx.finishedProduct.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { daNhapKho: true },
      }),
    );
  });

  it('only creates receipt rows for grades with sum > 0, skips the rest', async () => {
    // Only phePhamKhoiLuong (scrap) has a value — 7 other grades = 0
    const fp = makeFP({ id: 'fp-1', maChien: 'MC-001', phePhamKhoiLuong: 15 });

    (mockedPrisma.finishedProduct.findMany as jest.Mock).mockResolvedValue([fp]);
    setupTransactionMock();

    await service.confirmBulkFinishedProductWarehouseReceipt(
      ['MC-001'],
      WAREHOUSE_ID,
      LOT_ID,
      USER_ID,
    );

    // Exactly one receipt created (Phế phẩm)
    expect(mockTx.warehouseReceipt.create).toHaveBeenCalledTimes(1);
    expect(mockTx.warehouseReceipt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenSanPham: expect.stringContaining('Phế phẩm'),
          soLuongNhap: 15,
        }),
      }),
    );
  });
});
