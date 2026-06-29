/**
 * Integration tests for forward-only status transitions on quotationService and orderService.
 *
 * These are unit tests that mock Prisma so they run without a database.
 * They verify the service-level guard (not just the helper) behaves correctly.
 */
import { QuotationStatus, OrderProductionStatus } from '@prisma/client';
import { ValidationError } from '@utils/errors';

// ─── Mock Prisma ──────────────────────────────────────────────────────────────
const mockQuotation = {
  findUnique: jest.fn(),
  update: jest.fn(),
};
const mockQuotationItem = {
  deleteMany: jest.fn(),
  createMany: jest.fn(),
};
const mockQuotationRevision = {
  findMany: jest.fn(),
  create: jest.fn(),
  aggregate: jest.fn(),
};
const mockOrder = {
  findUnique: jest.fn(),
  update: jest.fn(),
};
const mockMaterialStandard = {
  findUnique: jest.fn(),
};

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    get quotation() { return mockQuotation; },
    get quotationItem() { return mockQuotationItem; },
    get quotationRevision() { return mockQuotationRevision; },
    get order() { return mockOrder; },
    get materialStandard() { return mockMaterialStandard; },
    $transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
      return cb({
        get quotation() { return mockQuotation; },
        get quotationItem() { return mockQuotationItem; },
        get quotationRevision() { return mockQuotationRevision; },
      });
    }),
  },
}));

// Mock notificationService to avoid import side-effects
jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { notify: jest.fn() },
}));

import prisma from '@config/database';
import quotationService from '@services/quotationService';
import orderService from '@services/orderService';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeQuotation(tinhTrang: QuotationStatus) {
  return {
    id: 'q-1',
    tinhTrang,
    maBaoGia: 'BG-001',
    materialStandardId: null,
  };
}

function makeOrder(trangThaiSanXuat: OrderProductionStatus) {
  return {
    id: 'o-1',
    maDonHang: 'DH-001',
    trangThaiSanXuat,
    tenKhachHang: 'Test',
  };
}

function makeUpdatedQuotation(tinhTrang: QuotationStatus) {
  return { id: 'q-1', tinhTrang, maBaoGia: 'BG-001', items: [] };
}

function makeUpdatedOrder(trangThaiSanXuat: OrderProductionStatus) {
  return { id: 'o-1', maDonHang: 'DH-001', trangThaiSanXuat, items: [] };
}

// ─── Quotation status transitions (service level) ────────────────────────────

describe('quotationService.updateQuotation — status transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPrisma.materialStandard.findUnique as jest.Mock).mockResolvedValue(null);
    // Revision mocks: aggregate returns max=0 so next revision = 1
    mockQuotationRevision.aggregate.mockResolvedValue({ _max: { revisionNumber: null } });
    mockQuotationRevision.findMany.mockResolvedValue([]);
    mockQuotationRevision.create.mockResolvedValue({ id: 'rev-1', revisionNumber: 1 });
    mockQuotationItem.deleteMany.mockResolvedValue({ count: 0 });
    mockQuotationItem.createMany.mockResolvedValue({ count: 0 });
  });

  it('legal forward: DRAFT → DANG_CHO_PHAN_HOI succeeds', async () => {
    (mockPrisma.quotation.findUnique as jest.Mock).mockResolvedValue(
      makeQuotation(QuotationStatus.DRAFT)
    );
    (mockPrisma.quotation.update as jest.Mock).mockResolvedValue(
      makeUpdatedQuotation(QuotationStatus.DANG_CHO_PHAN_HOI)
    );

    const result = await quotationService.updateQuotation(
      'q-1',
      { tinhTrang: QuotationStatus.DANG_CHO_PHAN_HOI },
      'DEPARTMENT_HEAD'
    );
    expect(result.tinhTrang).toBe(QuotationStatus.DANG_CHO_PHAN_HOI);
  });

  it('skip rejected: DRAFT → DA_DAT_HANG throws ValidationError', async () => {
    (mockPrisma.quotation.findUnique as jest.Mock).mockResolvedValue(
      makeQuotation(QuotationStatus.DRAFT)
    );

    await expect(
      quotationService.updateQuotation('q-1', { tinhTrang: QuotationStatus.DA_DAT_HANG }, 'EMPLOYEE')
    ).rejects.toThrow(ValidationError);
  });

  it('backward rejected: DA_DAT_HANG → DRAFT throws ValidationError', async () => {
    (mockPrisma.quotation.findUnique as jest.Mock).mockResolvedValue(
      makeQuotation(QuotationStatus.DA_DAT_HANG)
    );

    await expect(
      quotationService.updateQuotation('q-1', { tinhTrang: QuotationStatus.DRAFT }, 'DEPARTMENT_HEAD')
    ).rejects.toThrow(ValidationError);
  });

  it('cancel from non-terminal accepted: DANG_CHO_PHAN_HOI → KHONG_DAT_HANG', async () => {
    (mockPrisma.quotation.findUnique as jest.Mock).mockResolvedValue(
      makeQuotation(QuotationStatus.DANG_CHO_PHAN_HOI)
    );
    (mockPrisma.quotation.update as jest.Mock).mockResolvedValue(
      makeUpdatedQuotation(QuotationStatus.KHONG_DAT_HANG)
    );

    const result = await quotationService.updateQuotation(
      'q-1',
      { tinhTrang: QuotationStatus.KHONG_DAT_HANG },
      'EMPLOYEE'
    );
    expect(result.tinhTrang).toBe(QuotationStatus.KHONG_DAT_HANG);
  });

  it('ADMIN bypass: DA_DAT_HANG → DRAFT succeeds', async () => {
    (mockPrisma.quotation.findUnique as jest.Mock).mockResolvedValue(
      makeQuotation(QuotationStatus.DA_DAT_HANG)
    );
    (mockPrisma.quotation.update as jest.Mock).mockResolvedValue(
      makeUpdatedQuotation(QuotationStatus.DRAFT)
    );

    const result = await quotationService.updateQuotation(
      'q-1',
      { tinhTrang: QuotationStatus.DRAFT },
      'ADMIN'
    );
    expect(result.tinhTrang).toBe(QuotationStatus.DRAFT);
  });
});

// ─── Order production status transitions (service level) ─────────────────────

describe('orderService.updateOrder — production status transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('legal forward: CHO_SAN_XUAT → DANG_SAN_XUAT succeeds', async () => {
    (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(
      makeOrder(OrderProductionStatus.CHO_SAN_XUAT)
    );
    (mockPrisma.order.update as jest.Mock).mockResolvedValue(
      makeUpdatedOrder(OrderProductionStatus.DANG_SAN_XUAT)
    );

    const result = await orderService.updateOrder(
      'o-1',
      { trangThaiSanXuat: OrderProductionStatus.DANG_SAN_XUAT },
      'DEPARTMENT_HEAD'
    );
    expect(result.trangThaiSanXuat).toBe(OrderProductionStatus.DANG_SAN_XUAT);
  });

  it('skip rejected: CHO_SAN_XUAT → DA_GIAO_CHO_KHACH_HANG throws ValidationError', async () => {
    (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(
      makeOrder(OrderProductionStatus.CHO_SAN_XUAT)
    );

    await expect(
      orderService.updateOrder(
        'o-1',
        { trangThaiSanXuat: OrderProductionStatus.DA_GIAO_CHO_KHACH_HANG },
        'EMPLOYEE'
      )
    ).rejects.toThrow(ValidationError);
  });

  it('backward rejected: DANG_SAN_XUAT → CHO_SAN_XUAT throws ValidationError', async () => {
    (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(
      makeOrder(OrderProductionStatus.DANG_SAN_XUAT)
    );

    await expect(
      orderService.updateOrder(
        'o-1',
        { trangThaiSanXuat: OrderProductionStatus.CHO_SAN_XUAT },
        'DEPARTMENT_HEAD'
      )
    ).rejects.toThrow(ValidationError);
  });

  it('ADMIN bypass allows any direction', async () => {
    (mockPrisma.order.findUnique as jest.Mock).mockResolvedValue(
      makeOrder(OrderProductionStatus.DA_GIAO_CHO_KHACH_HANG)
    );
    (mockPrisma.order.update as jest.Mock).mockResolvedValue(
      makeUpdatedOrder(OrderProductionStatus.CHO_LEN_KE_HOACH)
    );

    const result = await orderService.updateOrder(
      'o-1',
      { trangThaiSanXuat: OrderProductionStatus.CHO_LEN_KE_HOACH },
      'ADMIN'
    );
    expect(result.trangThaiSanXuat).toBe(OrderProductionStatus.CHO_LEN_KE_HOACH);
  });
});
