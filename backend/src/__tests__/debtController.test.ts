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
    debt: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

// Mock upload middleware
jest.mock('../middlewares/upload', () => ({
  getFileUrl: jest.fn().mockReturnValue('http://localhost/uploads/debts/test.pdf'),
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

import { Request, Response } from 'express';
import prisma from '@config/database';
import {
  getAllDebts,
  getDebtById,
  createDebt,
  deleteDebt,
  getDebtSummary,
} from '@controllers/debtController';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers — mock req/res
   ───────────────────────────────────────────────────────────────────────────── */

const makeRes = () => {
  const res: Partial<Response> = {
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
  };
  return res as Response;
};

const makeDebt = (overrides: any = {}) => ({
  id: 'debt-1',
  ngayPhatSinh: new Date('2024-01-15'),
  loaiChiPhi: 'Nguyên liệu',
  maNhaCungCap: 'NCC001',
  tenNhaCungCap: 'Công ty Gạo Miền Tây',
  loaiCungCap: 'Nguyên liệu',
  cungCap: 'Gạo ST25',
  noiDungChiCho: 'Mua gạo tháng 1',
  loaiHinh: 'Tiền mặt',
  soTienPhaiTra: 10000000,
  soTienDaThanhToan: 5000000,
  ngayHoachToan: null,
  ngayDenHan: null,
  soTaiKhoan: null,
  ghiChu: null,
  fileDinhKem: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/* ─────────────────────────────────────────────────────────────────────────────
   getAllDebts
   ───────────────────────────────────────────────────────────────────────────── */

describe('DebtController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getAllDebts', () => {
    it('trả về danh sách công nợ với success: true', async () => {
      const debts = [makeDebt(), makeDebt({ id: 'debt-2', maNhaCungCap: 'NCC002' })];
      (mockedPrisma.debt.findMany as jest.Mock).mockResolvedValue(debts);

      const req = {} as Request;
      const res = makeRes();

      await getAllDebts(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith({ success: true, data: debts });
    });

    it('sắp xếp theo ngayPhatSinh desc', async () => {
      (mockedPrisma.debt.findMany as jest.Mock).mockResolvedValue([]);

      await getAllDebts({} as Request, makeRes(), jest.fn());

      expect(mockedPrisma.debt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { ngayPhatSinh: 'desc' } })
      );
    });

    it('gọi next(error) khi DB lỗi', async () => {
      const dbError = new Error('DB connection failed');
      (mockedPrisma.debt.findMany as jest.Mock).mockRejectedValue(dbError);
      const next = jest.fn();

      await getAllDebts({} as Request, makeRes(), next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  /* ──────────────────────────────────────────────────────────────────────────
     getDebtById
     ────────────────────────────────────────────────────────────────────────── */

  describe('getDebtById', () => {
    it('trả về công nợ khi tìm thấy', async () => {
      const debt = makeDebt();
      (mockedPrisma.debt.findUnique as jest.Mock).mockResolvedValue(debt);

      const req = { params: { id: 'debt-1' } } as unknown as Request;
      const res = makeRes();

      await getDebtById(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith({ success: true, data: debt });
    });

    it('trả về 404 khi không tìm thấy', async () => {
      (mockedPrisma.debt.findUnique as jest.Mock).mockResolvedValue(null);

      const req = { params: { id: 'not-exist' } } as unknown as Request;
      const res = makeRes();

      await getDebtById(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
    });
  });

  /* ──────────────────────────────────────────────────────────────────────────
     createDebt
     ────────────────────────────────────────────────────────────────────────── */

  describe('createDebt', () => {
    const validBody = {
      maNhaCungCap: 'NCC001',
      tenNhaCungCap: 'Công ty ABC',
      ngayPhatSinh: '2024-01-15',
      soTienPhaiTra: '10000000',
      soTienDaThanhToan: '0',
    };

    it('tạo công nợ thành công với dữ liệu hợp lệ', async () => {
      const created = makeDebt();
      (mockedPrisma.debt.create as jest.Mock).mockResolvedValue(created);

      const req = { body: validBody } as unknown as Request;
      const res = makeRes();

      await createDebt(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: created })
      );
    });

    it('trả về 400 khi thiếu maNhaCungCap', async () => {
      const req = {
        body: { tenNhaCungCap: 'ABC', ngayPhatSinh: '2024-01-15' },
      } as unknown as Request;
      const res = makeRes();

      await createDebt(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect(mockedPrisma.debt.create).not.toHaveBeenCalled();
    });

    it('trả về 400 khi thiếu tenNhaCungCap', async () => {
      const req = {
        body: { maNhaCungCap: 'NCC001', ngayPhatSinh: '2024-01-15' },
      } as unknown as Request;
      const res = makeRes();

      await createDebt(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockedPrisma.debt.create).not.toHaveBeenCalled();
    });

    it('trả về 400 khi thiếu ngayPhatSinh', async () => {
      const req = {
        body: { maNhaCungCap: 'NCC001', tenNhaCungCap: 'ABC' },
      } as unknown as Request;
      const res = makeRes();

      await createDebt(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockedPrisma.debt.create).not.toHaveBeenCalled();
    });

    it('parse soTienPhaiTra và soTienDaThanhToan sang số float', async () => {
      (mockedPrisma.debt.create as jest.Mock).mockResolvedValue(makeDebt());

      const req = { body: validBody } as unknown as Request;
      await createDebt(req, makeRes(), jest.fn());

      const createCall = (mockedPrisma.debt.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.soTienPhaiTra).toBe(10000000);
      expect(createCall.data.soTienDaThanhToan).toBe(0);
    });

    it('lưu fileDinhKem khi có file upload', async () => {
      (mockedPrisma.debt.create as jest.Mock).mockResolvedValue(makeDebt());

      const req = {
        body: validBody,
        file: { filename: 'invoice.pdf' },
      } as unknown as Request;

      await createDebt(req, makeRes(), jest.fn());

      const createCall = (mockedPrisma.debt.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.fileDinhKem).toBe('http://localhost/uploads/debts/test.pdf');
    });

    it('fileDinhKem là undefined khi không có file', async () => {
      (mockedPrisma.debt.create as jest.Mock).mockResolvedValue(makeDebt());

      const req = { body: validBody } as unknown as Request;
      await createDebt(req, makeRes(), jest.fn());

      const createCall = (mockedPrisma.debt.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.fileDinhKem).toBeUndefined();
    });
  });

  /* ──────────────────────────────────────────────────────────────────────────
     deleteDebt
     ────────────────────────────────────────────────────────────────────────── */

  describe('deleteDebt', () => {
    it('xóa công nợ thành công', async () => {
      (mockedPrisma.debt.delete as jest.Mock).mockResolvedValue(undefined);

      const req = { params: { id: 'debt-1' } } as unknown as Request;
      const res = makeRes();

      await deleteDebt(req, res, jest.fn());

      expect(mockedPrisma.debt.delete).toHaveBeenCalledWith({ where: { id: 'debt-1' } });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('gọi next(error) khi xóa thất bại', async () => {
      const dbError = new Error('Record not found');
      (mockedPrisma.debt.delete as jest.Mock).mockRejectedValue(dbError);
      const next = jest.fn();

      await deleteDebt({ params: { id: 'bad-id' } } as unknown as Request, makeRes(), next);

      expect(next).toHaveBeenCalledWith(dbError);
    });
  });

  /* ──────────────────────────────────────────────────────────────────────────
     getDebtSummary
     ────────────────────────────────────────────────────────────────────────── */

  describe('getDebtSummary', () => {
    it('tính đúng tongPhaiTra, daThanhToan, conNo', async () => {
      const debts = [
        makeDebt({ soTienPhaiTra: 10000000, soTienDaThanhToan: 3000000 }),
        makeDebt({ id: 'debt-2', soTienPhaiTra: 5000000, soTienDaThanhToan: 5000000 }),
        makeDebt({ id: 'debt-3', soTienPhaiTra: 8000000, soTienDaThanhToan: 0 }),
      ];
      (mockedPrisma.debt.findMany as jest.Mock).mockResolvedValue(debts);

      const res = makeRes();
      await getDebtSummary({} as Request, res, jest.fn());

      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.tongPhaiTra).toBe(23000000);
      expect(jsonCall.data.daThanhToan).toBe(8000000);
      expect(jsonCall.data.conNo).toBe(15000000);
    });

    it('tính đúng soLuongCongNo', async () => {
      const debts = [makeDebt(), makeDebt({ id: 'debt-2' }), makeDebt({ id: 'debt-3' })];
      (mockedPrisma.debt.findMany as jest.Mock).mockResolvedValue(debts);

      const res = makeRes();
      await getDebtSummary({} as Request, res, jest.fn());

      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.soLuongCongNo).toBe(3);
    });

    it('tính đúng chuaThanhToan (soTienDaThanhToan = 0 và soTienPhaiTra > 0)', async () => {
      const debts = [
        makeDebt({ soTienPhaiTra: 5000000, soTienDaThanhToan: 0 }),     // chưa TT
        makeDebt({ id: 'debt-2', soTienPhaiTra: 5000000, soTienDaThanhToan: 2000000 }), // đang TT
        makeDebt({ id: 'debt-3', soTienPhaiTra: 5000000, soTienDaThanhToan: 5000000 }), // đã TT hết
      ];
      (mockedPrisma.debt.findMany as jest.Mock).mockResolvedValue(debts);

      const res = makeRes();
      await getDebtSummary({} as Request, res, jest.fn());

      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.chuaThanhToan).toBe(1);
    });

    it('tính đúng daThanhToanHet (soTienDaThanhToan >= soTienPhaiTra > 0)', async () => {
      const debts = [
        makeDebt({ soTienPhaiTra: 5000000, soTienDaThanhToan: 0 }),
        makeDebt({ id: 'debt-2', soTienPhaiTra: 5000000, soTienDaThanhToan: 5000000 }), // đã TT hết
        makeDebt({ id: 'debt-3', soTienPhaiTra: 3000000, soTienDaThanhToan: 3500000 }), // trả thừa - vẫn tính là đã TT
      ];
      (mockedPrisma.debt.findMany as jest.Mock).mockResolvedValue(debts);

      const res = makeRes();
      await getDebtSummary({} as Request, res, jest.fn());

      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data.daThanhToanHet).toBe(2);
    });

    it('trả về tất cả bằng 0 khi không có công nợ', async () => {
      (mockedPrisma.debt.findMany as jest.Mock).mockResolvedValue([]);

      const res = makeRes();
      await getDebtSummary({} as Request, res, jest.fn());

      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.data).toEqual({
        tongPhaiTra: 0,
        daThanhToan: 0,
        conNo: 0,
        soLuongCongNo: 0,
        chuaThanhToan: 0,
        daThanhToanHet: 0,
      });
    });

    it('trả về success: true', async () => {
      (mockedPrisma.debt.findMany as jest.Mock).mockResolvedValue([]);

      const res = makeRes();
      await getDebtSummary({} as Request, res, jest.fn());

      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.success).toBe(true);
    });
  });
});
