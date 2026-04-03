/**
 * SupplyAdjustmentService Unit Tests
 *
 * Tests for the Supply Adjustment (Điều chỉnh Vật tư) module:
 * - Create supply adjustment with auto-generated requestCode (DCVT-yyyyMMdd-XXXX)
 * - Notifications to QC + ADMIN + WAREHOUSE approvers
 * - Role-based access: ADMIN/QC/WAREHOUSE see all, EMPLOYEE sees only own
 * - Approve/reject with audit fields
 * - Broadcast SUPPLY_ADJUSTMENT_CHANGED
 *
 * @see supplyAdjustmentService.ts
 *
 * NOTE: This test file is scaffolded in advance of supplyAdjustmentService.ts delivery.
 * Written based on CLAUDE.md conventions + expected interface from Task 11 spec.
 * Remove .skip once the backend agent completes Task 11.
 *
 * Run after supplyAdjustmentService.ts exists:
 *   npx jest --testPathPattern="supplyAdjustmentService.test"
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

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    employee: { findUnique: jest.fn(), findMany: jest.fn() },
    supplyAdjustment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    notification: { create: jest.fn(), findMany: jest.fn() },
  },
}));

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { createNotification: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@services/websocket', () => ({
  broadcast: jest.fn(),
}));

import prisma from '@config/database';
import notificationService from '@services/notificationService';
import { broadcast } from '@services/websocket';
// Import dynamically — file may not exist yet during scaffolding phase
let SupplyAdjustmentService: any;
let ValidationError: any;
let NotFoundError: any;
let AuthorizationError: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const module = require('@services/supplyAdjustmentService');
  SupplyAdjustmentService = module.SupplyAdjustmentService || module.default;
} catch {
  SupplyAdjustmentService = null;
}

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { ValidationError: VE, NotFoundError: NFE, AuthorizationError: AE } = require('@utils/errors');
  ValidationError = VE;
  NotFoundError = NFE;
  AuthorizationError = AE;
} catch {
  ValidationError = class extends Error { constructor(m: string) { super(m); } };
  NotFoundError = class extends Error { constructor(m: string) { super(m); } };
  AuthorizationError = class extends Error { constructor(m: string) { super(m); } };
}

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedNotification = notificationService as jest.Mocked<typeof notificationService>;
const mockedBroadcast = broadcast as jest.Mock;

// ─── FIXTURES ───────────────────────────────────────────────────────────────

const ADMIN_USER = {
  id: 'admin-id',
  firstName: 'Admin',
  lastName: 'User',
  role: 'ADMIN',
  isActive: true,
  departmentId: 'dept-qc',
};

const QC_USER = {
  id: 'qc-id',
  firstName: 'QC',
  lastName: 'Staff',
  role: 'QC',
  isActive: true,
  departmentId: 'dept-qc',
};

const WAREHOUSE_USER = {
  id: 'warehouse-id',
  firstName: 'Warehouse',
  lastName: 'Staff',
  role: 'WAREHOUSE',
  isActive: true,
  departmentId: 'dept-warehouse',
};


const EMPLOYEE_RECORD = {
  id: 'emp-1',
  userId: 'employee-user-id',
  employeeCode: 'EMP001',
  status: 'ACTIVE',
};

const ADJUSTMENT_RECORD = {
  id: 'adj-001',
  maDieuChinh: 'DCVT-20260402-A1B2',
  employeeId: 'emp-1',
  loaiVatTu: 'Nguyên liệu',
  tenVatTu: 'Bột mì',
  soLuongHienTai: 100,
  soLuongDieuChinh: 50,
  donViTinh: 'kg',
  lyDo: 'Kiểm kê thực tế phát hiện hao hụt',
  trangThai: 'CHO_DUYET',
  ngayDieuChinh: new Date('2026-04-02'),
  createdAt: new Date(),
  updatedAt: new Date(),
  nguoiTao: { id: 'employee-user-id', firstName: 'Employee', lastName: 'User' },
};

function getService() {
  if (!SupplyAdjustmentService) {
    throw new Error('supplyAdjustmentService.ts not yet created — backend agent is still working on Task 11');
  }
  return SupplyAdjustmentService instanceof Function
    ? SupplyAdjustmentService
    : new SupplyAdjustmentService();
}

// ─── TESTS ───────────────────────────────────────────────────────────────────

describe.skip('SupplyAdjustmentService', () => {
  // NOTE: Tests are skipped until supplyAdjustmentService.ts is delivered (Task 11).
  // Remove .skip once the backend agent completes Task 11.

  beforeEach(() => jest.clearAllMocks());

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    beforeEach(() => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(EMPLOYEE_RECORD);
      (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue([ADMIN_USER, QC_USER, WAREHOUSE_USER]);
      (mockedPrisma.supplyAdjustment.create as jest.Mock).mockResolvedValue(ADJUSTMENT_RECORD);
    });

    it('should generate requestCode in format DCVT-yyyyMMdd-XXXX', async () => {
      const service = getService();
      await service.create({
        employeeId: 'emp-1',
        loaiVatTu: 'Nguyên liệu',
        tenVatTu: 'Bột mì',
        soLuongHienTai: 100,
        soLuongDieuChinh: 50,
        donViTinh: 'kg',
        lyDo: 'Kiểm kê',
        ngayDieuChinh: new Date().toISOString(),
      });

      const createCall = (mockedPrisma.supplyAdjustment.create as jest.Mock).mock.calls[0][0];
      const code: string = createCall.data.maDieuChinh;

      // Format: DCVT-YYYYMMDD-XXXX
      expect(code).toMatch(/^DCVT-\d{8}-[A-Z0-9]{4}$/);
    });

    it('should reject when requestedQty <= 0 (soLuongDieuChinh must be positive)', async () => {
      const service = getService();

      await expect(
        service.create({
          employeeId: 'emp-1',
          loaiVatTu: 'Nguyên liệu',
          tenVatTu: 'Bột mì',
          soLuongHienTai: 100,
          soLuongDieuChinh: 0, // invalid
          donViTinh: 'kg',
          lyDo: 'Test',
          ngayDieuChinh: new Date().toISOString(),
        })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('should reject when soLuongDieuChinh is negative', async () => {
      const service = getService();

      await expect(
        service.create({
          employeeId: 'emp-1',
          loaiVatTu: 'Nguyên liệu',
          tenVatTu: 'Bột mì',
          soLuongHienTai: 100,
          soLuongDieuChinh: -10,
          donViTinh: 'kg',
          lyDo: 'Test',
          ngayDieuChinh: new Date().toISOString(),
        })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('should notify all QC + ADMIN + WAREHOUSE users after creation', async () => {
      const service = getService();
      await service.create({
        employeeId: 'emp-1',
        loaiVatTu: 'Nguyên liệu',
        tenVatTu: 'Bột mì',
        soLuongHienTai: 100,
        soLuongDieuChinh: 50,
        donViTinh: 'kg',
        lyDo: 'Kiểm kê',
        ngayDieuChinh: new Date().toISOString(),
      });

      // Should notify admin, qc, and warehouse
      expect(mockedNotification.createNotification).toHaveBeenCalledTimes(3);
      const notifiedUserIds = (mockedNotification.createNotification as jest.Mock).mock.calls.map(
        (c: any[]) => c[0].userId
      );
      expect(notifiedUserIds).toContain('admin-id');
      expect(notifiedUserIds).toContain('qc-id');
      expect(notifiedUserIds).toContain('warehouse-id');
    });

    it('should NOT notify the requester themselves when creating', async () => {
      const service = getService();
      await service.create({
        employeeId: 'emp-1',
        loaiVatTu: 'Nguyên liệu',
        tenVatTu: 'Bột mì',
        soLuongHienTai: 100,
        soLuongDieuChinh: 50,
        donViTinh: 'kg',
        lyDo: 'Kiểm kê',
        ngayDieuChinh: new Date().toISOString(),
      });

      const notifiedUserIds = (mockedNotification.createNotification as jest.Mock).mock.calls.map(
        (c: any[]) => c[0].userId
      );
      expect(notifiedUserIds).not.toContain('employee-user-id');
    });

    it('should broadcast SUPPLY_ADJUSTMENT_CHANGED after creation', async () => {
      const service = getService();
      await service.create({
        employeeId: 'emp-1',
        loaiVatTu: 'Nguyên liệu',
        tenVatTu: 'Bột mì',
        soLuongHienTai: 100,
        soLuongDieuChinh: 50,
        donViTinh: 'kg',
        lyDo: 'Kiểm kê',
        ngayDieuChinh: new Date().toISOString(),
      });

      expect(mockedBroadcast).toHaveBeenCalledWith({ type: 'SUPPLY_ADJUSTMENT_CHANGED' });
    });
  });

  // ── getAll ──────────────────────────────────────────────────────────────

  describe('getAll', () => {
    beforeEach(() => {
      (mockedPrisma.supplyAdjustment.findMany as jest.Mock).mockResolvedValue([ADJUSTMENT_RECORD]);
      (mockedPrisma.supplyAdjustment.count as jest.Mock).mockResolvedValue(1);
    });

    it('ADMIN should see ALL records', async () => {
      const service = getService();
      await service.getAll({ page: 1, limit: 10 }, 'admin-id', 'ADMIN');

      expect(mockedPrisma.supplyAdjustment.findMany).toHaveBeenCalled();
      const findManyCall = (mockedPrisma.supplyAdjustment.findMany as jest.Mock).mock.calls[0][0];
      // ADMIN: no employee filter in where clause
      expect(findManyCall.where.employeeId).toBeUndefined();
    });

    it('QC role should see ALL records', async () => {
      const service = getService();
      await service.getAll({ page: 1, limit: 10 }, 'qc-id', 'QC');

      const findManyCall = (mockedPrisma.supplyAdjustment.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.employeeId).toBeUndefined();
    });

    it('WAREHOUSE role should see ALL records', async () => {
      const service = getService();
      await service.getAll({ page: 1, limit: 10 }, 'warehouse-id', 'WAREHOUSE');

      const findManyCall = (mockedPrisma.supplyAdjustment.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.employeeId).toBeUndefined();
    });

    it('EMPLOYEE should only see their OWN records', async () => {
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(EMPLOYEE_RECORD);

      const service = getService();
      await service.getAll({ page: 1, limit: 10 }, 'employee-user-id', 'EMPLOYEE');

      const findManyCall = (mockedPrisma.supplyAdjustment.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.employeeId).toBe('emp-1');
    });

    it('should filter by trangThai (status)', async () => {
      const service = getService();
      await service.getAll({ page: 1, limit: 10, trangThai: 'CHO_DUYET' }, 'admin-id', 'ADMIN');

      const findManyCall = (mockedPrisma.supplyAdjustment.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.trangThai).toBe('CHO_DUYET');
    });

    it('should filter by trangThai DA_DUYET', async () => {
      const service = getService();
      await service.getAll({ page: 1, limit: 10, trangThai: 'DA_DUYET' }, 'admin-id', 'ADMIN');

      const findManyCall = (mockedPrisma.supplyAdjustment.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.trangThai).toBe('DA_DUYET');
    });

    it('should return pagination metadata', async () => {
      const service = getService();
      const result = await service.getAll({ page: 1, limit: 10 }, 'admin-id', 'ADMIN');

      expect(result.total || result.pagination?.totalItems).toBe(1);
      expect(result.page || result.pagination?.currentPage).toBe(1);
    });
  });

  // ── approve / reject ───────────────────────────────────────────────────

  describe('approve', () => {
    beforeEach(() => {
      (mockedPrisma.supplyAdjustment.findUnique as jest.Mock).mockResolvedValue(ADJUSTMENT_RECORD);
      (mockedPrisma.supplyAdjustment.update as jest.Mock).mockResolvedValue({
        ...ADJUSTMENT_RECORD,
        trangThai: 'DA_DUYET',
        approvedBy: 'admin-id',
        approvedAt: new Date(),
      });
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(EMPLOYEE_RECORD);
    });

    it('should reject if not ADMIN/QC/WAREHOUSE role', async () => {
      const service = getService();

      await expect(
        service.approve('adj-001', 'employee-user-id', 'EMPLOYEE')
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should reject EMPLOYEE role even with valid adjustment ID', async () => {
      const service = getService();

      await expect(
        service.approve('adj-001', 'employee-user-id', 'EMPLOYEE')
      ).rejects.toThrow();
    });

    it('should set trangThai to DA_DUYET and record approvedBy + approvedAt on approval', async () => {
      const service = getService();
      await service.approve('adj-001', 'admin-id', 'ADMIN');

      const updateCall = (mockedPrisma.supplyAdjustment.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.trangThai).toBe('DA_DUYET');
      expect(updateCall.data.approvedBy).toBe('admin-id');
      expect(updateCall.data.approvedAt).toBeDefined();
    });

    it('should notify the REQUESTER (employee who created the adjustment)', async () => {
      const service = getService();
      await service.approve('adj-001', 'admin-id', 'ADMIN');

      expect(mockedNotification.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'employee-user-id' })
      );
    });

    it('should set rejectionReason when rejected', async () => {
      (mockedPrisma.supplyAdjustment.update as jest.Mock).mockResolvedValue({
        ...ADJUSTMENT_RECORD,
        trangThai: 'TU_CHOI',
        rejectionReason: 'Số lượng không hợp lý',
      });

      const service = getService();
      await service.reject('adj-001', 'admin-id', 'ADMIN', 'Số lượng không hợp lý');

      const updateCall = (mockedPrisma.supplyAdjustment.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.trangThai).toBe('TU_CHOI');
      expect(updateCall.data.rejectionReason).toBe('Số lượng không hợp lý');
    });

    it('should broadcast SUPPLY_ADJUSTMENT_CHANGED after approval', async () => {
      const service = getService();
      await service.approve('adj-001', 'admin-id', 'ADMIN');

      expect(mockedBroadcast).toHaveBeenCalledWith({ type: 'SUPPLY_ADJUSTMENT_CHANGED' });
    });

    it('should broadcast SUPPLY_ADJUSTMENT_CHANGED after rejection', async () => {
      (mockedPrisma.supplyAdjustment.update as jest.Mock).mockResolvedValue({
        ...ADJUSTMENT_RECORD,
        trangThai: 'TU_CHOI',
      });

      const service = getService();
      await service.reject('adj-001', 'admin-id', 'ADMIN', 'Lý do từ chối');

      expect(mockedBroadcast).toHaveBeenCalledWith({ type: 'SUPPLY_ADJUSTMENT_CHANGED' });
    });

    it('should throw NotFoundError when adjustment does not exist', async () => {
      (mockedPrisma.supplyAdjustment.findUnique as jest.Mock).mockResolvedValue(null);

      const service = getService();
      await expect(
        service.approve('non-existent', 'admin-id', 'ADMIN')
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ── reject ───────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('should allow ADMIN to reject', async () => {
      (mockedPrisma.supplyAdjustment.findUnique as jest.Mock).mockResolvedValue(ADJUSTMENT_RECORD);
      (mockedPrisma.supplyAdjustment.update as jest.Mock).mockResolvedValue({
        ...ADJUSTMENT_RECORD,
        trangThai: 'TU_CHOI',
      });
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(EMPLOYEE_RECORD);

      const service = getService();
      await service.reject('adj-001', 'admin-id', 'ADMIN', 'Lý do từ chối');

      expect(mockedPrisma.supplyAdjustment.update).toHaveBeenCalled();
    });

    it('should allow WAREHOUSE to reject', async () => {
      (mockedPrisma.supplyAdjustment.findUnique as jest.Mock).mockResolvedValue(ADJUSTMENT_RECORD);
      (mockedPrisma.supplyAdjustment.update as jest.Mock).mockResolvedValue({
        ...ADJUSTMENT_RECORD,
        trangThai: 'TU_CHOI',
      });
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(EMPLOYEE_RECORD);

      const service = getService();
      await service.reject('adj-001', 'warehouse-id', 'WAREHOUSE', 'Không đủ chứng cứ');

      expect(mockedPrisma.supplyAdjustment.update).toHaveBeenCalled();
    });

    it('should NOT allow EMPLOYEE to reject', async () => {
      const service = getService();

      await expect(
        service.reject('adj-001', 'employee-user-id', 'EMPLOYEE', 'Lý do')
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should notify requester when rejected', async () => {
      (mockedPrisma.supplyAdjustment.findUnique as jest.Mock).mockResolvedValue(ADJUSTMENT_RECORD);
      (mockedPrisma.supplyAdjustment.update as jest.Mock).mockResolvedValue({
        ...ADJUSTMENT_RECORD,
        trangThai: 'TU_CHOI',
      });
      (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(EMPLOYEE_RECORD);

      const service = getService();
      await service.reject('adj-001', 'admin-id', 'ADMIN', 'Không hợp lệ');

      expect(mockedNotification.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'employee-user-id' })
      );
    });
  });
});
