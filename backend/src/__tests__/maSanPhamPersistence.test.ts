import prisma from '@config/database';

// ─── Mock prisma ─────────────────────────────────────────────────────────────
jest.mock('@config/database', () => {
  const tx = {
    warehouseIssue: { create: jest.fn().mockResolvedValue({ id: 'wi-1' }) },
    lotProduct: { update: jest.fn().mockResolvedValue({}), findUnique: jest.fn() },
    materialEvaluation: { create: jest.fn(), update: jest.fn() },
    finishedProduct: { create: jest.fn(), deleteMany: jest.fn() },
    qualityEvaluation: { create: jest.fn(), deleteMany: jest.fn() },
    systemOperation: { create: jest.fn() },
  };
  return {
    __esModule: true,
    default: {
      $transaction: jest.fn((cb: any) => cb(tx)),
      __tx: tx,
      materialEvaluation: { create: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn() },
      finishedProduct: { create: jest.fn(), upsert: jest.fn() },
      lotProduct: { findUnique: jest.fn() },
      warehouseIssue: { findFirst: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(0) },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
      finishedProductEntryHistory: { deleteMany: jest.fn(), create: jest.fn() },
      machineSystem: { findMany: jest.fn().mockResolvedValue([]) },
    },
  };
});

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mocked = prisma as unknown as {
  $transaction: jest.Mock;
  __tx: {
    materialEvaluation: { create: jest.Mock };
    warehouseIssue: { create: jest.Mock };
    lotProduct: { update: jest.Mock; findUnique: jest.Mock };
  };
  materialEvaluation: { create: jest.Mock; findFirst: jest.Mock };
  finishedProduct: { upsert: jest.Mock };
  lotProduct: { findUnique: jest.Mock };
  user: { findUnique: jest.Mock };
};

const LOT_PRODUCT = {
  id: 'lp-1',
  soLuong: 8549,
  donViTinh: 'Kg',
  maKien: 'Lô Nguyên Liệu-s6hp',
  lot: { id: 'lot-1', tenLo: 'Lô Nguyên Liệu', warehouse: { id: 'w-1', tenKho: 'Kho nguyên liệu', maKho: 'KHONL' } },
  internationalProduct: {
    id: 'p1',
    maSanPham: 'NLD-001-MDSLB',
    tenSanPham: 'Mít đông sấy Lá Bàng',
  },
};

const BASE_PAYLOAD = {
  maChien: 'MC-05',
  khoiLuong: 100,
  soLanNgam: 2,
  nhietDoNuocTruocNgam: 30,
  nhietDoNuocSauVot: 28,
  thoiGianNgam: 60,
  brixNuocNgam: 12,
  danhGiaTruocNgam: '1,2',
  danhGiaSauNgam: '3',
  nguoiThucHien: 'Nguyễn Văn A',
  ca: 1,
  thoiGianChien: '2026-08-04T08:30',
};

describe('maSanPham persisted on entry records', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.__tx.materialEvaluation.create.mockResolvedValue({ id: 'me-1', maChien: 'MC-05', thoiGianChien: new Date() });
    mocked.materialEvaluation.create.mockResolvedValue({ id: 'me-1', maChien: 'MC-05', thoiGianChien: new Date() });
  });

  it('stores the commodity code taken from the warehouse package', async () => {
    mocked.__tx.lotProduct.findUnique.mockResolvedValue(LOT_PRODUCT);
    const { default: service } = await import('@services/materialEvaluationService');

    await service.createMaterialEvaluation(
      { ...BASE_PAYLOAD, lotProductId: 'lp-1' },
      'user-1',
    );

    const created = mocked.__tx.materialEvaluation.create.mock.calls[0]?.[0];
    expect(created.data.maSanPham).toBe('NLD-001-MDSLB');
    // The name snapshot must keep working alongside the new code column.
    expect(created.data.tenHangHoa).toBe('Mít đông sấy Lá Bàng');
  });

  it('stores the package code as the package reference rather than a CUID fragment', async () => {
    mocked.__tx.lotProduct.findUnique.mockResolvedValue(LOT_PRODUCT);
    const { default: service } = await import('@services/materialEvaluationService');

    await service.createMaterialEvaluation(
      { ...BASE_PAYLOAD, lotProductId: 'lp-1' },
      'user-1',
    );

    const created = mocked.__tx.materialEvaluation.create.mock.calls[0]?.[0];
    expect(created.data.soLoKien).toBe('Lô Nguyên Liệu-s6hp');
  });

  it('leaves the commodity code null when there is no warehouse link', async () => {
    const { default: service } = await import('@services/materialEvaluationService');

    await service.createMaterialEvaluation({ ...BASE_PAYLOAD, tenHangHoa: 'Nhập tay', soLoKien: 'K-1' }, 'user-1');

    const created = mocked.materialEvaluation.create.mock.calls[0]?.[0];
    expect(created.data.maSanPham).toBeNull();
  });

  it('carries the commodity code through an explicit payload when no lot is linked', async () => {
    const { default: service } = await import('@services/materialEvaluationService');

    await service.createMaterialEvaluation(
      { ...BASE_PAYLOAD, tenHangHoa: 'Nhập tay', soLoKien: 'K-1', maSanPham: 'NLT-001-TMLB' },
      'user-1',
    );

    const created = mocked.materialEvaluation.create.mock.calls[0]?.[0];
    expect(created.data.maSanPham).toBe('NLT-001-TMLB');
  });
});

describe('upsertByBatchMachine — commodity code on the output board', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.finishedProduct.upsert.mockResolvedValue({ id: 'fp-1', maChien: 'MC-05' });
  });

  it('inherits the commodity code from the parent evaluation when creating a cell', async () => {
    mocked.materialEvaluation.findFirst.mockResolvedValue({
      id: 'me-1',
      thoiGianChien: new Date('2026-08-04T01:30:00.000Z'),
      tenHangHoa: 'Mít đông sấy Lá Bàng',
      maSanPham: 'NLD-001-MDSLB',
    });
    const { default: service } = await import('@services/finishedProductService');

    await service.upsertByBatchMachine(
      { maChien: 'MC-05', machineSystemId: 'ms-1', thoiGianChien: '2026-08-04T08:30', aKhoiLuong: 12 },
      'user-1',
    );

    const call = mocked.finishedProduct.upsert.mock.calls[0]?.[0];
    expect(call.create.maSanPham).toBe('NLD-001-MDSLB');
  });

  it('leaves the code null when the parent evaluation has none', async () => {
    mocked.materialEvaluation.findFirst.mockResolvedValue({
      id: 'me-1',
      thoiGianChien: new Date('2026-08-04T01:30:00.000Z'),
      tenHangHoa: 'Nhập tay',
      maSanPham: null,
    });
    const { default: service } = await import('@services/finishedProductService');

    await service.upsertByBatchMachine(
      { maChien: 'MC-05', machineSystemId: 'ms-1', thoiGianChien: '2026-08-04T08:30', aKhoiLuong: 12 },
      'user-1',
    );

    const call = mocked.finishedProduct.upsert.mock.calls[0]?.[0];
    expect(call.create.maSanPham).toBeNull();
  });
});
