import { InternationalProductService } from '@services/internationalProductService';
import prisma from '@config/database';

// ─── Mock prisma ─────────────────────────────────────────────────────────────
jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    internationalProduct: {
      findMany: jest.fn(),
    },
    lotProduct: {
      groupBy: jest.fn(),
    },
  },
}));

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockedPrisma = prisma as unknown as {
  internationalProduct: { findMany: jest.Mock };
  lotProduct: { groupBy: jest.Mock };
};

const service = new InternationalProductService();

// Mirrors the dev dataset: 9 raw materials, only 2 holding Kg stock.
const RAW_MATERIALS = [
  { id: 'p1', maSanPham: 'NLD-001-MDSLB', tenSanPham: 'Mít đông sấy Lá Bàng', loaiSanPham: 'Nguyên liệu đông', donViTinh: 'Kg' },
  { id: 'p2', maSanPham: 'NLD-002-MDSSS', tenSanPham: 'Mít đông sấy siêu sớm', loaiSanPham: 'Nguyên liệu đông', donViTinh: 'Kg' },
  { id: 'p3', maSanPham: 'NLD-003-XKDLCS', tenSanPham: 'Xoài keo đông lạnh cắt sợi', loaiSanPham: 'Nguyên liệu đông', donViTinh: 'Kg' },
  { id: 'p4', maSanPham: 'NLT-001-TMLB', tenSanPham: 'Trái mít lá bàng', loaiSanPham: 'Nguyên liệu trái', donViTinh: 'Kg' },
];

describe('getRawMaterials — stock reporting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPrisma.internationalProduct.findMany.mockResolvedValue(RAW_MATERIALS);
  });

  it('reports the summed Kg stock for a material that holds stock', async () => {
    mockedPrisma.lotProduct.groupBy.mockResolvedValue([
      { internationalProductId: 'p1', _sum: { soLuong: 8549 } },
      { internationalProductId: 'p3', _sum: { soLuong: 400 } },
    ]);

    const result = await service.getRawMaterials();

    expect(result.find(p => p.id === 'p1')?.tongTonKho).toBe(8549);
    expect(result.find(p => p.id === 'p3')?.tongTonKho).toBe(400);
  });

  it('reports zero stock and still returns the material when it holds none', async () => {
    mockedPrisma.lotProduct.groupBy.mockResolvedValue([
      { internationalProductId: 'p1', _sum: { soLuong: 8549 } },
    ]);

    const result = await service.getRawMaterials();

    // The reveal-all control on the picker depends on these being present.
    expect(result).toHaveLength(4);
    expect(result.find(p => p.id === 'p2')?.tongTonKho).toBe(0);
    expect(result.find(p => p.id === 'p4')?.tongTonKho).toBe(0);
  });

  it('counts only Kg rows with positive quantity as stock', async () => {
    mockedPrisma.lotProduct.groupBy.mockResolvedValue([]);

    await service.getRawMaterials();

    expect(mockedPrisma.lotProduct.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['internationalProductId'],
        where: expect.objectContaining({
          soLuong: { gt: 0 },
          donViTinh: 'Kg',
        }),
      }),
    );
  });

  it('resolves stock in a single aggregate query rather than one per material', async () => {
    mockedPrisma.lotProduct.groupBy.mockResolvedValue([]);

    await service.getRawMaterials();

    // 4 materials must still cost exactly one aggregate call, not 4.
    expect(mockedPrisma.lotProduct.groupBy).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.internationalProduct.findMany).toHaveBeenCalledTimes(1);
  });

  it('treats a null aggregate sum as zero stock', async () => {
    mockedPrisma.lotProduct.groupBy.mockResolvedValue([
      { internationalProductId: 'p1', _sum: { soLuong: null } },
    ]);

    const result = await service.getRawMaterials();

    expect(result.find(p => p.id === 'p1')?.tongTonKho).toBe(0);
  });

  it('still filters to raw-material categories and orders by code', async () => {
    mockedPrisma.lotProduct.groupBy.mockResolvedValue([]);

    await service.getRawMaterials();

    expect(mockedPrisma.internationalProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { loaiSanPham: { startsWith: 'Nguyên liệu', mode: 'insensitive' } },
        orderBy: { maSanPham: 'asc' },
      }),
    );
  });
});
