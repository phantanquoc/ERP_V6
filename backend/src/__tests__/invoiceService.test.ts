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

jest.mock('@utils/helpers', () => ({
  getPaginationParams: jest.fn().mockReturnValue({ skip: 0 }),
  calculateTotalPages: jest.fn().mockReturnValue(1),
}));

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    invoice: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock ExcelJS để không phụ thuộc ghi file thật
jest.mock('exceljs', () => {
  const mockWriteBuffer = jest.fn().mockResolvedValue(Buffer.from('excel'));
  const Workbook = jest.fn().mockImplementation(() => ({
    addWorksheet: jest.fn().mockReturnValue({
      columns: [],
      getRow: jest.fn().mockReturnValue({ font: {}, fill: {} }),
      addRow: jest.fn(),
    }),
    xlsx: { writeBuffer: mockWriteBuffer },
  }));
  return { __esModule: true, default: { Workbook } };
});

import prisma from '@config/database';
import { InvoiceService } from '@services/invoiceService';
import { NotFoundError, ValidationError } from '@utils/errors';

const service = new InvoiceService();
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers — mock data
   ───────────────────────────────────────────────────────────────────────────── */

const makeInvoice = (overrides = {}) => ({
  id: 'inv-1',
  soHoaDon: 'HD001',
  ngayLap: new Date('2024-01-15'),
  khachHang: 'Công ty ABC',
  maSoThue: '0123456789',
  tongTien: 1000000,
  thue: 10,
  thanhTien: 1100000,
  trangThai: 'Chưa xử lý',
  loaiHoaDon: 'Bán hàng',
  phuongThucThanhToan: 'Chuyển khoản',
  ngayThanhToan: null,
  nhanVienLap: 'Nguyễn Văn A',
  ghiChu: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/* ─────────────────────────────────────────────────────────────────────────────
   generateInvoiceNumber
   ───────────────────────────────────────────────────────────────────────────── */

describe('InvoiceService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('generateInvoiceNumber', () => {
    it('trả về HD001 khi chưa có hóa đơn nào', async () => {
      (mockedPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.generateInvoiceNumber();

      expect(result).toBe('HD001');
    });

    it('tăng sequence +1 từ hóa đơn cuối cùng', async () => {
      (mockedPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(makeInvoice({ soHoaDon: 'HD005' }));

      const result = await service.generateInvoiceNumber();

      expect(result).toBe('HD006');
    });

    it('padding đúng 3 chữ số (HD009 → HD010)', async () => {
      (mockedPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(makeInvoice({ soHoaDon: 'HD009' }));

      const result = await service.generateInvoiceNumber();

      expect(result).toBe('HD010');
    });
  });

  /* ──────────────────────────────────────────────────────────────────────────
     getAllInvoices
     ────────────────────────────────────────────────────────────────────────── */

  describe('getAllInvoices', () => {
    it('trả về danh sách có pagination khi không tìm kiếm', async () => {
      const invoices = [makeInvoice(), makeInvoice({ id: 'inv-2', soHoaDon: 'HD002' })];
      (mockedPrisma.invoice.findMany as jest.Mock).mockResolvedValue(invoices);
      (mockedPrisma.invoice.count as jest.Mock).mockResolvedValue(2);

      const result = await service.getAllInvoices(1, 10);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('truyền điều kiện tìm kiếm vào where.OR khi có search', async () => {
      (mockedPrisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.invoice.count as jest.Mock).mockResolvedValue(0);

      await service.getAllInvoices(1, 10, 'ABC');

      const findManyCall = (mockedPrisma.invoice.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.OR).toBeDefined();
      expect(findManyCall.where.OR).toContainEqual(
        expect.objectContaining({ khachHang: expect.objectContaining({ contains: 'ABC' }) })
      );
    });

    it('không thêm where.OR khi không có search', async () => {
      (mockedPrisma.invoice.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.invoice.count as jest.Mock).mockResolvedValue(0);

      await service.getAllInvoices(1, 10);

      const findManyCall = (mockedPrisma.invoice.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.OR).toBeUndefined();
    });
  });

  /* ──────────────────────────────────────────────────────────────────────────
     getInvoiceById
     ────────────────────────────────────────────────────────────────────────── */

  describe('getInvoiceById', () => {
    it('trả về hóa đơn khi tìm thấy', async () => {
      const invoice = makeInvoice();
      (mockedPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(invoice);

      const result = await service.getInvoiceById('inv-1');

      expect(result).toEqual(invoice);
      expect(mockedPrisma.invoice.findUnique).toHaveBeenCalledWith({ where: { id: 'inv-1' } });
    });

    it('throw NotFoundError khi không tìm thấy', async () => {
      (mockedPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getInvoiceById('not-exist')).rejects.toThrow(NotFoundError);
    });
  });

  /* ──────────────────────────────────────────────────────────────────────────
     createInvoice
     ────────────────────────────────────────────────────────────────────────── */

  describe('createInvoice', () => {
    it('throw ValidationError khi thiếu khachHang', async () => {
      await expect(service.createInvoice({ tongTien: 1000000, thue: 10 })).rejects.toThrow(ValidationError);
    });

    it('tính thanhTien = tongTien + tongTien * thue / 100', async () => {
      (mockedPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(null); // cho generateInvoiceNumber
      (mockedPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(null); // chưa trùng soHoaDon
      const createdInvoice = makeInvoice({ tongTien: 2000000, thue: 10, thanhTien: 2200000 });
      (mockedPrisma.invoice.create as jest.Mock).mockResolvedValue(createdInvoice);

      await service.createInvoice({ khachHang: 'Công ty ABC', tongTien: '2000000', thue: '10' });

      const createCall = (mockedPrisma.invoice.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.thanhTien).toBe(2200000);
    });

    it('thanhTien = tongTien khi thue = 0', async () => {
      (mockedPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice({ tongTien: 500000, thue: 0, thanhTien: 500000 }));

      await service.createInvoice({ khachHang: 'KH Test', tongTien: '500000', thue: '0' });

      const createCall = (mockedPrisma.invoice.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.thanhTien).toBe(500000);
    });

    it('throw ValidationError khi soHoaDon đã tồn tại', async () => {
      (mockedPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(makeInvoice()); // đã tồn tại

      await expect(
        service.createInvoice({ khachHang: 'KH Test', soHoaDon: 'HD001', tongTien: 1000000, thue: 10 })
      ).rejects.toThrow(ValidationError);
    });

    it('tự sinh soHoaDon khi không truyền', async () => {
      (mockedPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
      const created = makeInvoice({ soHoaDon: 'HD001' });
      (mockedPrisma.invoice.create as jest.Mock).mockResolvedValue(created);

      await service.createInvoice({ khachHang: 'KH Test', tongTien: 1000000, thue: 0 });

      const createCall = (mockedPrisma.invoice.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.soHoaDon).toBe('HD001');
    });

    it('đặt ngayLap = now khi không truyền', async () => {
      const before = new Date();
      (mockedPrisma.invoice.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.invoice.create as jest.Mock).mockResolvedValue(makeInvoice());

      await service.createInvoice({ khachHang: 'KH Test', tongTien: 1000000, thue: 0 });

      const after = new Date();
      const createCall = (mockedPrisma.invoice.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.ngayLap.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(createCall.data.ngayLap.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  /* ──────────────────────────────────────────────────────────────────────────
     updateInvoice
     ────────────────────────────────────────────────────────────────────────── */

  describe('updateInvoice', () => {
    it('cập nhật thành công và trả về invoice mới', async () => {
      const existing = makeInvoice();
      const updated = makeInvoice({ khachHang: 'KH Mới' });
      (mockedPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(existing);
      (mockedPrisma.invoice.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.updateInvoice('inv-1', { khachHang: 'KH Mới' });

      expect(result.khachHang).toBe('KH Mới');
    });

    it('tái tính thanhTien khi tongTien hoặc thue thay đổi', async () => {
      (mockedPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(makeInvoice());
      (mockedPrisma.invoice.update as jest.Mock).mockResolvedValue(makeInvoice());

      await service.updateInvoice('inv-1', { tongTien: '3000000', thue: '5' });

      const updateCall = (mockedPrisma.invoice.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.thanhTien).toBe(3150000); // 3000000 + 3000000 * 5 / 100
    });

    it('không tính lại thanhTien khi không truyền tongTien/thue', async () => {
      (mockedPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(makeInvoice());
      (mockedPrisma.invoice.update as jest.Mock).mockResolvedValue(makeInvoice());

      await service.updateInvoice('inv-1', { ghiChu: 'ghi chú mới' });

      const updateCall = (mockedPrisma.invoice.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.thanhTien).toBeUndefined();
    });

    it('throw NotFoundError khi id không tồn tại', async () => {
      (mockedPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.updateInvoice('not-exist', { ghiChu: 'x' })).rejects.toThrow(NotFoundError);
    });
  });

  /* ──────────────────────────────────────────────────────────────────────────
     deleteInvoice
     ────────────────────────────────────────────────────────────────────────── */

  describe('deleteInvoice', () => {
    it('xóa thành công khi id tồn tại', async () => {
      (mockedPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(makeInvoice());
      (mockedPrisma.invoice.delete as jest.Mock).mockResolvedValue(undefined);

      await expect(service.deleteInvoice('inv-1')).resolves.toBeUndefined();
      expect(mockedPrisma.invoice.delete).toHaveBeenCalledWith({ where: { id: 'inv-1' } });
    });

    it('throw NotFoundError khi id không tồn tại', async () => {
      (mockedPrisma.invoice.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteInvoice('not-exist')).rejects.toThrow(NotFoundError);
      expect(mockedPrisma.invoice.delete).not.toHaveBeenCalled();
    });
  });
});
