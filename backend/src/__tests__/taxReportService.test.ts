// Mock env + logger TRƯỚC mọi import
jest.mock('@config/env', () => ({
  isProduction: false,
  isDevelopment: true,
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-secret-minimum-64-chars-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    JWT_EXPIRE: '7d',
    JWT_REFRESH_SECRET: 'test-refresh-secret-minimum-64-chars-aaaaaaaaaaaaaaaaaaaaaaaaa',
    JWT_REFRESH_EXPIRE: '30d',
    PORT: 5001,
    CORS_ORIGIN: 'http://localhost:5173',
    NODE_ENV: 'test',
  },
}));

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    taxReport: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('exceljs', () => {
  const Workbook = jest.fn().mockImplementation(() => ({
    addWorksheet: jest.fn().mockReturnValue({
      columns: [],
      getRow: jest.fn().mockReturnValue({ font: {}, fill: {} }),
      addRow: jest.fn(),
    }),
    xlsx: { writeBuffer: jest.fn().mockResolvedValue(Buffer.from('excel')) },
  }));
  return { __esModule: true, default: { Workbook } };
});

// Mock TaxReportStatus enum từ @prisma/client
jest.mock('@prisma/client', () => ({
  TaxReportStatus: {
    CHUA_BAO_CAO: 'CHUA_BAO_CAO',
    DANG_CAP_NHAT_HO_SO: 'DANG_CAP_NHAT_HO_SO',
    DA_DAY_DU_HO_SO: 'DA_DAY_DU_HO_SO',
    DA_BAO_CAO: 'DA_BAO_CAO',
    DA_QUYET_TOAN: 'DA_QUYET_TOAN',
  },
}));

import prisma from '@config/database';
import taxReportService from '@services/taxReportService';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers — mock data
   ───────────────────────────────────────────────────────────────────────────── */

const makeOrder = (overrides: any = {}) => ({
  id: 'order-1',
  maDonHang: 'DH001',
  ngayDatHang: new Date('2024-01-10'),
  giaTriDonHangUSD: 5000,
  giaTriDonHangVND: null,
  items: [
    { tenHangHoa: 'Gạo ST25', soLuong: 100, donVi: 'kg' },
    { tenHangHoa: 'Nếp cái', soLuong: 50, donVi: 'kg' },
  ],
  ...overrides,
});

const makeTaxReport = (overrides: any = {}) => ({
  id: 'tr-1',
  orderId: 'order-1',
  maDonHang: 'DH001',
  ngayDatHang: new Date('2024-01-10'),
  tenHangHoa: 'Gạo ST25, Nếp cái',
  soLuong: 150,
  donVi: 'kg',
  giaTriDonHang: 5000,
  soTienDongThue: null,
  trangThai: 'CHUA_BAO_CAO',
  ghiChi: null,
  fileDinhKem: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/* ─────────────────────────────────────────────────────────────────────────────
   getAllTaxReports
   ───────────────────────────────────────────────────────────────────────────── */

describe('TaxReportService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getAllTaxReports', () => {
    it('trả về danh sách có pagination', async () => {
      const reports = [makeTaxReport(), makeTaxReport({ id: 'tr-2', maDonHang: 'DH002' })];
      (mockedPrisma.taxReport.findMany as jest.Mock).mockResolvedValue(reports);
      (mockedPrisma.taxReport.count as jest.Mock).mockResolvedValue(2);

      const result = await taxReportService.getAllTaxReports(1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('truyền điều kiện tìm kiếm khi có search', async () => {
      (mockedPrisma.taxReport.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.taxReport.count as jest.Mock).mockResolvedValue(0);

      await taxReportService.getAllTaxReports(1, 10, 'DH001');

      const findManyCall = (mockedPrisma.taxReport.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
      expect(findManyCall.where.OR).toContainEqual(
        expect.objectContaining({ maDonHang: expect.objectContaining({ contains: 'DH001' }) })
      );
    });

    it('không thêm where.OR khi không có search', async () => {
      (mockedPrisma.taxReport.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.taxReport.count as jest.Mock).mockResolvedValue(0);

      await taxReportService.getAllTaxReports(1, 10);

      const findManyCall = (mockedPrisma.taxReport.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.OR).toBeUndefined();
    });
  });

  /* ──────────────────────────────────────────────────────────────────────────
     getTaxReportById
     ────────────────────────────────────────────────────────────────────────── */

  describe('getTaxReportById', () => {
    it('trả về báo cáo khi tìm thấy', async () => {
      const report = makeTaxReport();
      (mockedPrisma.taxReport.findUnique as jest.Mock).mockResolvedValue(report);

      const result = await taxReportService.getTaxReportById('tr-1');

      expect(result).toEqual(report);
      expect(mockedPrisma.taxReport.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tr-1' } })
      );
    });

    it('trả về null khi không tìm thấy', async () => {
      (mockedPrisma.taxReport.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await taxReportService.getTaxReportById('not-exist');

      expect(result).toBeNull();
    });
  });

  /* ──────────────────────────────────────────────────────────────────────────
     createTaxReportFromOrder
     ────────────────────────────────────────────────────────────────────────── */

  describe('createTaxReportFromOrder', () => {
    it('throw Error khi order không tồn tại', async () => {
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(taxReportService.createTaxReportFromOrder('order-99')).rejects.toThrow('Order not found');
    });

    it('throw Error khi tax report đã tồn tại cho order', async () => {
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrder());
      (mockedPrisma.taxReport.findUnique as jest.Mock).mockResolvedValue(makeTaxReport());

      await expect(taxReportService.createTaxReportFromOrder('order-1')).rejects.toThrow(
        'Tax report already exists for this order'
      );
    });

    it('tổng hợp tenHangHoa từ tất cả order items', async () => {
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrder());
      (mockedPrisma.taxReport.findUnique as jest.Mock).mockResolvedValue(null); // chưa tồn tại
      (mockedPrisma.taxReport.create as jest.Mock).mockResolvedValue(makeTaxReport());

      await taxReportService.createTaxReportFromOrder('order-1');

      const createCall = (mockedPrisma.taxReport.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.tenHangHoa).toBe('Gạo ST25, Nếp cái');
    });

    it('tổng hợp soLuong = tổng tất cả item.soLuong', async () => {
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrder());
      (mockedPrisma.taxReport.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.taxReport.create as jest.Mock).mockResolvedValue(makeTaxReport());

      await taxReportService.createTaxReportFromOrder('order-1');

      const createCall = (mockedPrisma.taxReport.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.soLuong).toBe(150); // 100 + 50
    });

    it('lấy donVi từ item đầu tiên', async () => {
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrder());
      (mockedPrisma.taxReport.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.taxReport.create as jest.Mock).mockResolvedValue(makeTaxReport());

      await taxReportService.createTaxReportFromOrder('order-1');

      const createCall = (mockedPrisma.taxReport.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.donVi).toBe('kg');
    });

    it('dùng giaTriDonHangUSD nếu có', async () => {
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrder({ giaTriDonHangUSD: 5000, giaTriDonHangVND: 120000000 }));
      (mockedPrisma.taxReport.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.taxReport.create as jest.Mock).mockResolvedValue(makeTaxReport());

      await taxReportService.createTaxReportFromOrder('order-1');

      const createCall = (mockedPrisma.taxReport.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.giaTriDonHang).toBe(5000);
    });

    it('dùng giaTriDonHangVND khi giaTriDonHangUSD là null', async () => {
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(
        makeOrder({ giaTriDonHangUSD: null, giaTriDonHangVND: 120000000 })
      );
      (mockedPrisma.taxReport.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.taxReport.create as jest.Mock).mockResolvedValue(makeTaxReport());

      await taxReportService.createTaxReportFromOrder('order-1');

      const createCall = (mockedPrisma.taxReport.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.giaTriDonHang).toBe(120000000);
    });

    it('đặt trangThai mặc định là CHUA_BAO_CAO khi không truyền', async () => {
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrder());
      (mockedPrisma.taxReport.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.taxReport.create as jest.Mock).mockResolvedValue(makeTaxReport());

      await taxReportService.createTaxReportFromOrder('order-1');

      const createCall = (mockedPrisma.taxReport.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.trangThai).toBe('CHUA_BAO_CAO');
    });

    it('ghi đè trangThai khi truyền input.trangThai', async () => {
      (mockedPrisma.order.findUnique as jest.Mock).mockResolvedValue(makeOrder());
      (mockedPrisma.taxReport.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.taxReport.create as jest.Mock).mockResolvedValue(makeTaxReport());

      await taxReportService.createTaxReportFromOrder('order-1', { trangThai: 'DA_BAO_CAO' as any });

      const createCall = (mockedPrisma.taxReport.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.trangThai).toBe('DA_BAO_CAO');
    });
  });

  /* ──────────────────────────────────────────────────────────────────────────
     updateTaxReport
     ────────────────────────────────────────────────────────────────────────── */

  describe('updateTaxReport', () => {
    it('cập nhật soTienDongThue thành công', async () => {
      const updated = makeTaxReport({ soTienDongThue: 1000000, trangThai: 'DA_BAO_CAO' });
      (mockedPrisma.taxReport.update as jest.Mock).mockResolvedValue(updated);

      const result = await taxReportService.updateTaxReport('tr-1', {
        soTienDongThue: 1000000,
        trangThai: 'DA_BAO_CAO' as any,
      });

      expect(result.soTienDongThue).toBe(1000000);
      expect(result.trangThai).toBe('DA_BAO_CAO');
    });

    it('truyền đúng id vào where của update', async () => {
      (mockedPrisma.taxReport.update as jest.Mock).mockResolvedValue(makeTaxReport());

      await taxReportService.updateTaxReport('tr-abc', { ghiChi: 'test' });

      const updateCall = (mockedPrisma.taxReport.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: 'tr-abc' });
    });
  });

  /* ──────────────────────────────────────────────────────────────────────────
     deleteTaxReport
     ────────────────────────────────────────────────────────────────────────── */

  describe('deleteTaxReport', () => {
    it('gọi prisma.taxReport.delete với đúng id', async () => {
      (mockedPrisma.taxReport.delete as jest.Mock).mockResolvedValue(undefined);

      await taxReportService.deleteTaxReport('tr-1');

      expect(mockedPrisma.taxReport.delete).toHaveBeenCalledWith({ where: { id: 'tr-1' } });
    });
  });
});
