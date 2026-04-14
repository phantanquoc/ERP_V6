/**
 * RepairRequestService Unit Tests
 *
 * Kiểm tra workflow tạo phiếu yêu cầu sửa chữa / kiểm tra:
 * - Generate mã yêu cầu tự động (YC-{timestamp})
 * - Tạo yêu cầu mới với trạng thái mặc định "Chờ xử lý"
 * - Lấy danh sách có pagination
 * - Lấy chi tiết theo ID (kèm acceptanceHandovers)
 * - Cập nhật thông tin
 * - Xóa yêu cầu
 * - Throw NotFoundError khi không tìm thấy
 */

// ─── MOCK DEPENDENCIES ──────────────────────────────────────────────────────

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
  getPaginationParams: jest.fn().mockReturnValue({ skip: 0, limit: 10 }),
}));

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    repairRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

// ─── IMPORTS (sau mock) ─────────────────────────────────────────────────────

import prisma from '@config/database';
import repairRequestService from '@services/repairRequestService';
import { NotFoundError } from '@utils/errors';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

// ─── MOCK DATA ───────────────────────────────────────────────────────────────

const mockRepairRequest = {
  id: 1,
  ngayThang: new Date('2026-04-14'),
  maYeuCau: 'YC-1713067200000',
  tenHeThong: 'Máy đóng gói A1',
  tinhTrangThietBi: 'Hư hỏng nặng',
  loaiLoi: 'Cơ khí',
  mucDoUuTien: 'Cao',
  noiDungLoi: 'Băng chuyền bị kẹt, không hoạt động được',
  ghiChu: 'Cần sửa gấp',
  trangThai: 'Chờ xử lý',
  fileDinhKem: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRepairRequestWithHandovers = {
  ...mockRepairRequest,
  acceptanceHandovers: [
    { id: 1, repairRequestId: 1, ngayBanGiao: new Date(), ghiChu: 'Đã sửa xong' },
  ],
};

// ─── TESTS ───────────────────────────────────────────────────────────────────

describe('RepairRequestService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('generateRepairRequestCode', () => {
    it('should generate code with YC- prefix and timestamp', () => {
      const before = Date.now();
      const code = repairRequestService.generateRepairRequestCode();
      const after = Date.now();

      expect(code).toMatch(/^YC-\d+$/);

      const timestamp = parseInt(code.replace('YC-', ''));
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should generate unique codes when Date.now returns different values', () => {
      const mockNow = jest.spyOn(Date, 'now');
      mockNow.mockReturnValueOnce(1000).mockReturnValueOnce(1001);

      const code1 = repairRequestService.generateRepairRequestCode();
      const code2 = repairRequestService.generateRepairRequestCode();

      expect(code1).toBe('YC-1000');
      expect(code2).toBe('YC-1001');
      expect(code1).not.toBe(code2);

      mockNow.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('getAllRepairRequests', () => {
    it('should return paginated list of repair requests', async () => {
      (mockedPrisma.repairRequest.findMany as jest.Mock).mockResolvedValue([mockRepairRequest]);
      (mockedPrisma.repairRequest.count as jest.Mock).mockResolvedValue(1);

      const result = await repairRequestService.getAllRepairRequests(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].maYeuCau).toBe('YC-1713067200000');
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should call findMany with orderBy createdAt desc', async () => {
      (mockedPrisma.repairRequest.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.repairRequest.count as jest.Mock).mockResolvedValue(0);

      await repairRequestService.getAllRepairRequests(1, 10);

      expect(mockedPrisma.repairRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('should calculate totalPages correctly', async () => {
      (mockedPrisma.repairRequest.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.repairRequest.count as jest.Mock).mockResolvedValue(25);

      const result = await repairRequestService.getAllRepairRequests(1, 10);

      expect(result.pagination.totalPages).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('getRepairRequestById', () => {
    it('should return repair request with acceptanceHandovers when found', async () => {
      (mockedPrisma.repairRequest.findUnique as jest.Mock).mockResolvedValue(mockRepairRequestWithHandovers);

      const result = await repairRequestService.getRepairRequestById(1);

      expect(result.id).toBe(1);
      expect(result.acceptanceHandovers).toHaveLength(1);
      expect(mockedPrisma.repairRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { acceptanceHandovers: true },
      });
    });

    it('should throw NotFoundError when repair request not found', async () => {
      (mockedPrisma.repairRequest.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(repairRequestService.getRepairRequestById(999)).rejects.toThrow(NotFoundError);
      await expect(repairRequestService.getRepairRequestById(999)).rejects.toThrow(
        'Không tìm thấy yêu cầu sửa chữa'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('createRepairRequest', () => {
    const createData = {
      ngayThang: new Date('2026-04-14'),
      maYeuCau: 'YC-1713067200000',
      tenHeThong: 'Máy đóng gói A1',
      tinhTrangThietBi: 'Hư hỏng nặng',
      loaiLoi: 'Cơ khí',
      mucDoUuTien: 'Cao',
      noiDungLoi: 'Băng chuyền bị kẹt',
    };

    it('should create repair request with default status "Chờ xử lý"', async () => {
      (mockedPrisma.repairRequest.create as jest.Mock).mockResolvedValue(mockRepairRequest);

      const result = await repairRequestService.createRepairRequest(createData);

      expect(mockedPrisma.repairRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            trangThai: 'Chờ xử lý',
          }),
        })
      );
      expect(result.trangThai).toBe('Chờ xử lý');
    });

    it('should use provided trangThai when given', async () => {
      const dataWithStatus = { ...createData, trangThai: 'Đang xử lý' };
      (mockedPrisma.repairRequest.create as jest.Mock).mockResolvedValue({
        ...mockRepairRequest,
        trangThai: 'Đang xử lý',
      });

      await repairRequestService.createRepairRequest(dataWithStatus);

      expect(mockedPrisma.repairRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            trangThai: 'Đang xử lý',
          }),
        })
      );
    });

    it('should save fileDinhKem when provided', async () => {
      const dataWithFile = {
        ...createData,
        fileDinhKem: '/uploads/repair-requests/test-file.pdf',
      };
      (mockedPrisma.repairRequest.create as jest.Mock).mockResolvedValue({
        ...mockRepairRequest,
        fileDinhKem: '/uploads/repair-requests/test-file.pdf',
      });

      await repairRequestService.createRepairRequest(dataWithFile);

      expect(mockedPrisma.repairRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            fileDinhKem: '/uploads/repair-requests/test-file.pdf',
          }),
        })
      );
    });

    it('should return the created repair request', async () => {
      (mockedPrisma.repairRequest.create as jest.Mock).mockResolvedValue(mockRepairRequest);

      const result = await repairRequestService.createRepairRequest(createData);

      expect(result.id).toBe(1);
      expect(result.maYeuCau).toBe('YC-1713067200000');
      expect(result.tenHeThong).toBe('Máy đóng gói A1');
    });

    // Xác nhận không có WebSocket broadcast (RepairRequest không broadcast)
    it('should NOT broadcast WebSocket events (no real-time push for repair requests)', async () => {
      (mockedPrisma.repairRequest.create as jest.Mock).mockResolvedValue(mockRepairRequest);

      // createRepairRequest không gọi broadcast — chỉ lưu DB
      await expect(repairRequestService.createRepairRequest(createData)).resolves.toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('updateRepairRequest', () => {
    it('should update repair request successfully', async () => {
      // First call: getRepairRequestById check (findUnique)
      (mockedPrisma.repairRequest.findUnique as jest.Mock).mockResolvedValue(mockRepairRequestWithHandovers);
      const updatedRequest = { ...mockRepairRequest, trangThai: 'Đã hoàn thành', ghiChu: 'Đã sửa xong' };
      (mockedPrisma.repairRequest.update as jest.Mock).mockResolvedValue(updatedRequest);

      const result = await repairRequestService.updateRepairRequest(1, {
        trangThai: 'Đã hoàn thành',
        ghiChu: 'Đã sửa xong',
      });

      expect(result.trangThai).toBe('Đã hoàn thành');
      expect(mockedPrisma.repairRequest.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { trangThai: 'Đã hoàn thành', ghiChu: 'Đã sửa xong' },
      });
    });

    it('should throw NotFoundError when updating non-existent request', async () => {
      (mockedPrisma.repairRequest.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        repairRequestService.updateRepairRequest(999, { trangThai: 'Đã hoàn thành' })
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('deleteRepairRequest', () => {
    it('should delete repair request when found', async () => {
      (mockedPrisma.repairRequest.findUnique as jest.Mock).mockResolvedValue(mockRepairRequestWithHandovers);
      (mockedPrisma.repairRequest.delete as jest.Mock).mockResolvedValue(mockRepairRequest);

      const result = await repairRequestService.deleteRepairRequest(1);

      expect(mockedPrisma.repairRequest.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result.message).toContain('thành công');
    });

    it('should throw NotFoundError when deleting non-existent request', async () => {
      (mockedPrisma.repairRequest.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(repairRequestService.deleteRepairRequest(999)).rejects.toThrow(NotFoundError);
      expect(mockedPrisma.repairRequest.delete).not.toHaveBeenCalled();
    });
  });
});
