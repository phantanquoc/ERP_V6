/**
 * SupplyRequestService Unit Tests
 *
 * Kiểm tra workflow tạo yêu cầu bổ sung cung cấp:
 * - Generate mã tự động: YC-CC001, YC-CC002...
 * - Tạo yêu cầu mới (validate employeeId, default status "Chưa cung cấp")
 * - broadcast({ type: 'SUPPLY_REQUEST_CHANGED' }) sau create/update/delete
 * - Gửi notification khi trangThai thay đổi (chỉ notify người tạo)
 * - Phân quyền: tất cả user tạo được, chỉ ADMIN/HEAD/LEAD cập nhật
 * - Lấy danh sách có pagination + search
 * - Lấy chi tiết kèm purchaseRequests và warehouseReceipts
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

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: {
    createSupplyRequestNotification: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@services/websocket', () => ({
  __esModule: true,
  broadcast: jest.fn(),
}));

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    supplyRequest: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
    },
  },
}));

// ─── IMPORTS (sau mock) ─────────────────────────────────────────────────────

import prisma from '@config/database';
import supplyRequestService from '@services/supplyRequestService';
import notificationService from '@services/notificationService';
import { broadcast } from '@services/websocket';
import { NotFoundError, ValidationError } from '@utils/errors';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedBroadcast = broadcast as jest.Mock;
const mockedNotify = notificationService.createSupplyRequestNotification as jest.Mock;

// ─── MOCK DATA ───────────────────────────────────────────────────────────────

const mockEmployee = {
  id: 'emp-001',
  maNhanVien: 'NV001',
  userId: 'user-001',
  status: 'ACTIVE',
};

const mockSupplyRequest = {
  id: 'sr-001',
  maYeuCau: 'YC-CC001',
  employeeId: 'emp-001',
  maNhanVien: 'NV001',
  tenNhanVien: 'Nguyễn Văn A',
  boPhan: 'Sản xuất',
  phanLoai: 'Vật tư',
  tenGoi: 'Găng tay bảo hộ',
  soLuong: 100,
  donViTinh: 'Đôi',
  mucDichYeuCau: 'Bảo hộ lao động',
  mucDoUuTien: 'Trung bình',
  ghiChu: null,
  trangThai: 'Chưa cung cấp',
  fileKemTheo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  employee: {
    id: 'emp-001',
    user: { firstName: 'Nguyễn', lastName: 'Văn A' },
    position: { tenChucVu: 'Công nhân' },
  },
  purchaseRequests: [],
  warehouseReceipts: [],
};

// ─── TESTS ───────────────────────────────────────────────────────────────────

describe('SupplyRequestService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('generateSupplyRequestCode', () => {
    it('should generate YC-CC001 when no previous requests exist', async () => {
      (mockedPrisma.supplyRequest.findFirst as jest.Mock).mockResolvedValue(null);

      const code = await supplyRequestService.generateSupplyRequestCode();

      expect(code).toBe('YC-CC001');
    });

    it('should increment sequence from last code', async () => {
      (mockedPrisma.supplyRequest.findFirst as jest.Mock).mockResolvedValue({ maYeuCau: 'YC-CC005' });

      const code = await supplyRequestService.generateSupplyRequestCode();

      expect(code).toBe('YC-CC006');
    });

    it('should zero-pad to 3 digits', async () => {
      (mockedPrisma.supplyRequest.findFirst as jest.Mock).mockResolvedValue({ maYeuCau: 'YC-CC009' });

      const code = await supplyRequestService.generateSupplyRequestCode();

      expect(code).toBe('YC-CC010');
    });

    it('should handle non-matching maYeuCau format gracefully (fallback to 001)', async () => {
      (mockedPrisma.supplyRequest.findFirst as jest.Mock).mockResolvedValue({ maYeuCau: 'INVALID' });

      const code = await supplyRequestService.generateSupplyRequestCode();

      expect(code).toBe('YC-CC001');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('getAllSupplyRequests', () => {
    it('should return paginated supply requests', async () => {
      (mockedPrisma.supplyRequest.findMany as jest.Mock).mockResolvedValue([mockSupplyRequest]);
      (mockedPrisma.supplyRequest.count as jest.Mock).mockResolvedValue(1);

      const result = await supplyRequestService.getAllSupplyRequests(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].maYeuCau).toBe('YC-CC001');
      expect(result.pagination.totalItems).toBe(1);
      expect(result.pagination.currentPage).toBe(1);
    });

    it('should filter by search term across multiple fields', async () => {
      (mockedPrisma.supplyRequest.findMany as jest.Mock).mockResolvedValue([mockSupplyRequest]);
      (mockedPrisma.supplyRequest.count as jest.Mock).mockResolvedValue(1);

      await supplyRequestService.getAllSupplyRequests(1, 10, 'NV001');

      expect(mockedPrisma.supplyRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: expect.arrayContaining([
              expect.objectContaining({ maNhanVien: expect.objectContaining({ contains: 'NV001' }) }),
            ]),
          },
        })
      );
    });

    it('should include purchaseRequests and warehouseReceipts in response', async () => {
      (mockedPrisma.supplyRequest.findMany as jest.Mock).mockResolvedValue([mockSupplyRequest]);
      (mockedPrisma.supplyRequest.count as jest.Mock).mockResolvedValue(1);

      await supplyRequestService.getAllSupplyRequests(1, 10);

      expect(mockedPrisma.supplyRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            purchaseRequests: true,
            warehouseReceipts: true,
          }),
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('createSupplyRequest', () => {
    const createData = {
      employeeId: 'emp-001',
      maNhanVien: 'NV001',
      tenNhanVien: 'Nguyễn Văn A',
      boPhan: 'Sản xuất',
      phanLoai: 'Vật tư',
      tenGoi: 'Găng tay bảo hộ',
      soLuong: 100,
      donViTinh: 'Đôi',
      mucDichYeuCau: 'Bảo hộ lao động',
      mucDoUuTien: 'Trung bình',
    };

    it('should validate employeeId exists before creating', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(supplyRequestService.createSupplyRequest(createData)).rejects.toThrow(ValidationError);
      await expect(supplyRequestService.createSupplyRequest(createData)).rejects.toThrow(
        'Không tìm thấy thông tin nhân viên'
      );
      expect(mockedPrisma.supplyRequest.create).not.toHaveBeenCalled();
    });

    it('should auto-generate maYeuCau with YC-CC format', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);
      (mockedPrisma.supplyRequest.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.supplyRequest.create as jest.Mock).mockResolvedValue(mockSupplyRequest);

      await supplyRequestService.createSupplyRequest(createData);

      expect(mockedPrisma.supplyRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            maYeuCau: 'YC-CC001',
          }),
        })
      );
    });

    it('should set default trangThai to "Chưa cung cấp"', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);
      (mockedPrisma.supplyRequest.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.supplyRequest.create as jest.Mock).mockResolvedValue(mockSupplyRequest);

      await supplyRequestService.createSupplyRequest(createData);

      expect(mockedPrisma.supplyRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            trangThai: 'Chưa cung cấp',
          }),
        })
      );
    });

    it('should broadcast SUPPLY_REQUEST_CHANGED after creation', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);
      (mockedPrisma.supplyRequest.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.supplyRequest.create as jest.Mock).mockResolvedValue(mockSupplyRequest);

      await supplyRequestService.createSupplyRequest(createData);

      expect(mockedBroadcast).toHaveBeenCalledWith({ type: 'SUPPLY_REQUEST_CHANGED' });
    });

    it('should NOT send notification on creation (only on status change)', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);
      (mockedPrisma.supplyRequest.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.supplyRequest.create as jest.Mock).mockResolvedValue(mockSupplyRequest);

      await supplyRequestService.createSupplyRequest(createData);

      expect(mockedNotify).not.toHaveBeenCalled();
    });

    it('should return created supply request with employee and purchaseRequests included', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(mockEmployee);
      (mockedPrisma.supplyRequest.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.supplyRequest.create as jest.Mock).mockResolvedValue(mockSupplyRequest);

      const result = await supplyRequestService.createSupplyRequest(createData);

      expect(result.maYeuCau).toBe('YC-CC001');
      expect(result.employee).toBeDefined();
      expect(result.purchaseRequests).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('updateSupplyRequest', () => {
    it('should throw NotFoundError when supply request not found', async () => {
      (mockedPrisma.supplyRequest.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        supplyRequestService.updateSupplyRequest('sr-999', { trangThai: 'Đã cung cấp' })
      ).rejects.toThrow(NotFoundError);
    });

    it('should update supply request and broadcast SUPPLY_REQUEST_CHANGED', async () => {
      (mockedPrisma.supplyRequest.findUnique as jest.Mock).mockResolvedValue(mockSupplyRequest);
      const updated = { ...mockSupplyRequest, soLuong: 150 };
      (mockedPrisma.supplyRequest.update as jest.Mock).mockResolvedValue(updated);

      await supplyRequestService.updateSupplyRequest('sr-001', { soLuong: 150 });

      expect(mockedBroadcast).toHaveBeenCalledWith({ type: 'SUPPLY_REQUEST_CHANGED' });
    });

    it('should send notification to requester when trangThai changes', async () => {
      (mockedPrisma.supplyRequest.findUnique as jest.Mock).mockResolvedValue({
        ...mockSupplyRequest,
        employee: {
          ...mockSupplyRequest.employee,
          user: { firstName: 'Nguyễn', lastName: 'Văn A' },
        },
      });
      const updated = {
        ...mockSupplyRequest,
        trangThai: 'Đã cung cấp',
        employee: {
          ...mockSupplyRequest.employee,
          user: { firstName: 'Trần', lastName: 'Thị B' },
        },
      };
      (mockedPrisma.supplyRequest.update as jest.Mock).mockResolvedValue(updated);

      await supplyRequestService.updateSupplyRequest('sr-001', { trangThai: 'Đã cung cấp' });

      expect(mockedNotify).toHaveBeenCalledWith(
        'emp-001',           // employeeId người tạo yêu cầu
        'sr-001',            // supplyRequestId
        'YC-CC001',          // maYeuCau
        'Đã cung cấp',       // trạng thái mới
        expect.any(String)   // tên người cập nhật
      );
    });

    it('should NOT send notification when trangThai does not change', async () => {
      (mockedPrisma.supplyRequest.findUnique as jest.Mock).mockResolvedValue(mockSupplyRequest);
      // trangThai vẫn là 'Chưa cung cấp', chỉ cập nhật ghiChu
      (mockedPrisma.supplyRequest.update as jest.Mock).mockResolvedValue({
        ...mockSupplyRequest,
        ghiChu: 'Ghi chú mới',
      });

      await supplyRequestService.updateSupplyRequest('sr-001', { ghiChu: 'Ghi chú mới' });

      expect(mockedNotify).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('deleteSupplyRequest', () => {
    it('should delete supply request and broadcast SUPPLY_REQUEST_CHANGED', async () => {
      (mockedPrisma.supplyRequest.delete as jest.Mock).mockResolvedValue(mockSupplyRequest);

      await supplyRequestService.deleteSupplyRequest('sr-001');

      expect(mockedPrisma.supplyRequest.delete).toHaveBeenCalledWith({ where: { id: 'sr-001' } });
      expect(mockedBroadcast).toHaveBeenCalledWith({ type: 'SUPPLY_REQUEST_CHANGED' });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  describe('getSupplyRequestById', () => {
    it('should return supply request with employee and purchaseRequests', async () => {
      (mockedPrisma.supplyRequest.findUnique as jest.Mock).mockResolvedValue(mockSupplyRequest);

      const result = await supplyRequestService.getSupplyRequestById('sr-001');

      expect(result.id).toBe('sr-001');
      expect(result.employee).toBeDefined();
      expect(mockedPrisma.supplyRequest.findUnique).toHaveBeenCalledWith({
        where: { id: 'sr-001' },
        include: expect.objectContaining({
          employee: expect.anything(),
          purchaseRequests: true,
        }),
      });
    });

    it('should throw NotFoundError when not found', async () => {
      (mockedPrisma.supplyRequest.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(supplyRequestService.getSupplyRequestById('sr-999')).rejects.toThrow(NotFoundError);
    });
  });
});
