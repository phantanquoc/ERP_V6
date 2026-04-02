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
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    employee: { findMany: jest.fn() },
    overtimePlan: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    attendance: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { createNotification: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('@services/websocket', () => ({
  pushNotification: jest.fn(),
  broadcast: jest.fn(),
}));

import prisma from '@config/database';
import notificationService from '@services/notificationService';
import { broadcast } from '@services/websocket';
import { OvertimePlanService } from '@services/overtimePlanService';
import { AttendanceStatus } from '@prisma/client';
import { ApiError, NotFoundError, ValidationError } from '@utils/errors';

const service = new OvertimePlanService();
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedNotification = notificationService as jest.Mocked<typeof notificationService>;
const mockedBroadcast = broadcast as jest.Mock;

// ── Fixtures ────────────────────────────────────────────────────────────────

const ADMIN_USER = {
  id: 'admin-user-id',
  firstName: 'Admin',
  lastName: 'Test',
  role: 'ADMIN',
  isActive: true,
};

const PLAN_BASE = {
  id: 'plan-001',
  nguoiTaoId: 'user-creator',
  nguoiThamGiaIds: ['user-creator', 'user-member'],
  noiDung: 'Tăng ca cuối tuần',
  ngayTangCa: new Date('2026-04-05T00:00:00.000Z'),
  gioBatDau: '18:00',
  gioKetThuc: '21:00',
  ghiChu: null,
  files: [],
  mucDoUuTien: 'MEDIUM',
  trangThai: 'CHO_DUYET',
  trangThaiTiepNhan: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const UPDATED_PLAN = { ...PLAN_BASE, trangThai: 'DA_DUYET' };

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockPopulateUsers() {
  (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue([
    { id: 'user-creator', firstName: 'Creator', lastName: 'One', departmentId: 'dept-1', employees: { employeeCode: 'EMP001' } },
    { id: 'user-member', firstName: 'Member', lastName: 'Two', departmentId: 'dept-1', employees: { employeeCode: 'EMP002' } },
  ]);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OvertimePlanService', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── parseTimeToDate ──────────────────────────────────────────────────────
  describe('parseTimeToDate', () => {
    it('should set hours and minutes from HH:mm string on base date', () => {
      const base = new Date('2026-04-05T00:00:00.000Z');
      const result = service.parseTimeToDate(base, '18:30');
      expect(result.getHours()).toBe(18);
      expect(result.getMinutes()).toBe(30);
      expect(result.getSeconds()).toBe(0);
    });

    it('should return a new Date (not mutate the original)', () => {
      const base = new Date('2026-04-05T00:00:00.000Z');
      const original = base.getTime();
      service.parseTimeToDate(base, '09:00');
      expect(base.getTime()).toBe(original);
    });
  });

  // ── createOvertimeAttendances ────────────────────────────────────────────
  describe('createOvertimeAttendances', () => {
    const employees = [
      { id: 'emp-creator', userId: 'user-creator' },
      { id: 'emp-member', userId: 'user-member' },
    ];

    beforeEach(() => {
      (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue(employees);
    });

    it('should create OVERTIME attendance when no existing record', async () => {
      (mockedPrisma.attendance.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.attendance.create as jest.Mock).mockResolvedValue({});

      await service.createOvertimeAttendances(PLAN_BASE);

      expect(mockedPrisma.attendance.create).toHaveBeenCalledTimes(2);
      const firstCall = (mockedPrisma.attendance.create as jest.Mock).mock.calls[0][0];
      expect(firstCall.data.status).toBe(AttendanceStatus.OVERTIME);
      expect(firstCall.data.isOvertime).toBe(true);
      expect(firstCall.data.overtimePlanId).toBe(PLAN_BASE.id);
      expect(firstCall.data.notes).toContain(PLAN_BASE.noiDung);
    });

    it('should extend checkOutTime when attendance already exists and overtime ends later', async () => {
      const existingCheckOut = new Date('2026-04-05T16:00:00.000Z'); // 16:00
      (mockedPrisma.attendance.findFirst as jest.Mock).mockResolvedValue({
        id: 'att-001',
        checkOutTime: existingCheckOut,
        notes: 'Ca ngày',
      });
      (mockedPrisma.attendance.update as jest.Mock).mockResolvedValue({});

      await service.createOvertimeAttendances(PLAN_BASE); // gioKetThuc = 21:00

      expect(mockedPrisma.attendance.update).toHaveBeenCalled();
      const updateCall = (mockedPrisma.attendance.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.isOvertime).toBe(true);
      expect(updateCall.data.overtimePlanId).toBe(PLAN_BASE.id);
      expect(updateCall.data.notes).toContain('Ca ngày');
      expect(updateCall.data.notes).toContain(PLAN_BASE.noiDung);
    });

    it('should NOT update checkOutTime when existing checkout is already later', async () => {
      const laterCheckOut = new Date('2026-04-05T23:00:00.000Z'); // 23:00 > 21:00
      (mockedPrisma.attendance.findFirst as jest.Mock).mockResolvedValue({
        id: 'att-001',
        checkOutTime: laterCheckOut,
        notes: null,
      });

      await service.createOvertimeAttendances(PLAN_BASE);

      expect(mockedPrisma.attendance.update).not.toHaveBeenCalled();
      expect(mockedPrisma.attendance.create).not.toHaveBeenCalled();
    });

    it('should create attendance even when checkOutTime is null on existing record', async () => {
      (mockedPrisma.attendance.findFirst as jest.Mock).mockResolvedValue({
        id: 'att-002',
        checkOutTime: null,
        notes: null,
      });
      (mockedPrisma.attendance.update as jest.Mock).mockResolvedValue({});

      await service.createOvertimeAttendances(PLAN_BASE);

      expect(mockedPrisma.attendance.update).toHaveBeenCalled();
    });

    it('should skip employee gracefully and log error if DB throws', async () => {
      (mockedPrisma.attendance.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));
      // Should not throw — errors are caught per employee
      await expect(service.createOvertimeAttendances(PLAN_BASE)).resolves.not.toThrow();
    });
  });

  // ── approvePlan ──────────────────────────────────────────────────────────
  describe('approvePlan', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(ADMIN_USER);
      (mockedPrisma.overtimePlan.findUnique as jest.Mock).mockResolvedValue(PLAN_BASE);
      (mockedPrisma.overtimePlan.update as jest.Mock).mockResolvedValue(UPDATED_PLAN);
      (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([
        { id: 'emp-creator', userId: 'user-creator' },
        { id: 'emp-member', userId: 'user-member' },
      ]);
      (mockedPrisma.attendance.findFirst as jest.Mock).mockResolvedValue(null);
      (mockedPrisma.attendance.create as jest.Mock).mockResolvedValue({});
      mockPopulateUsers();
    });

    it('should approve plan and create attendance records', async () => {
      await service.approvePlan('plan-001', 'admin-user-id', { trangThai: 'DA_DUYET' } as any);

      expect(mockedPrisma.overtimePlan.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ trangThai: 'DA_DUYET' }) })
      );
      expect(mockedPrisma.attendance.create).toHaveBeenCalled();
    });

    it('should send notifications to all participants when approved', async () => {
      await service.approvePlan('plan-001', 'admin-user-id', { trangThai: 'DA_DUYET' } as any);

      // Notification to creator + each other participant
      expect(mockedNotification.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-creator', title: 'Kế hoạch tăng ca đã được duyệt' })
      );
      expect(mockedNotification.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-member', title: 'Kế hoạch tăng ca đã được duyệt' })
      );
    });

    it('should NOT create attendance records when plan is rejected', async () => {
      (mockedPrisma.overtimePlan.update as jest.Mock).mockResolvedValue({ ...PLAN_BASE, trangThai: 'TU_CHOI' });

      await service.approvePlan('plan-001', 'admin-user-id', { trangThai: 'TU_CHOI', lyDoTuChoi: 'Không đủ nhân lực' } as any);

      expect(mockedPrisma.attendance.create).not.toHaveBeenCalled();
    });

    it('should throw ApiError when non-admin tries to approve', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({ ...ADMIN_USER, role: 'EMPLOYEE' });

      await expect(
        service.approvePlan('plan-001', 'normal-user-id', { trangThai: 'DA_DUYET' } as any)
      ).rejects.toBeInstanceOf(ApiError);
    });

    it('should allow DEPARTMENT_HEAD to approve', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({ ...ADMIN_USER, role: 'DEPARTMENT_HEAD' });

      await service.approvePlan('plan-001', 'dept-head-id', { trangThai: 'DA_DUYET' } as any);

      expect(mockedPrisma.overtimePlan.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ trangThai: 'DA_DUYET' }) })
      );
    });

    it('should allow TEAM_LEAD to approve', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({ ...ADMIN_USER, role: 'TEAM_LEAD' });

      await service.approvePlan('plan-001', 'team-lead-id', { trangThai: 'DA_DUYET' } as any);

      expect(mockedPrisma.overtimePlan.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ trangThai: 'DA_DUYET' }) })
      );
    });

    it('should throw NotFoundError when plan does not exist', async () => {
      (mockedPrisma.overtimePlan.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.approvePlan('non-existent', 'admin-user-id', { trangThai: 'DA_DUYET' } as any)
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw ValidationError when plan is already processed', async () => {
      (mockedPrisma.overtimePlan.findUnique as jest.Mock).mockResolvedValue({ ...PLAN_BASE, trangThai: 'DA_DUYET' });

      await expect(
        service.approvePlan('plan-001', 'admin-user-id', { trangThai: 'DA_DUYET' } as any)
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('should broadcast OVERTIME_PLAN_CHANGED after successful approval', async () => {
      await service.approvePlan('plan-001', 'admin-user-id', { trangThai: 'DA_DUYET' } as any);

      expect(mockedBroadcast).toHaveBeenCalledWith({ type: 'OVERTIME_PLAN_CHANGED' });
    });

    it('should broadcast OVERTIME_PLAN_CHANGED even when plan is rejected', async () => {
      (mockedPrisma.overtimePlan.update as jest.Mock).mockResolvedValue({ ...PLAN_BASE, trangThai: 'TU_CHOI' });

      await service.approvePlan('plan-001', 'admin-user-id', { trangThai: 'TU_CHOI' } as any);

      expect(mockedBroadcast).toHaveBeenCalledWith({ type: 'OVERTIME_PLAN_CHANGED' });
    });
  });
});
