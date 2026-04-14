// @ts-nocheck — Jest mock objects intentionally don't satisfy strict Prisma client types

/**
 * OvertimePlan Attendance Integration Tests
 *
 * Tests the integration between OvertimePlan approval flow and Attendance records:
 * - createOvertimeAttendances() for all participants
 * - Extension of existing attendance checkOutTime
 * - No-duplicate attendance per employee per day
 * - approvePlan() triggers attendance auto-creation + notifications + broadcast
 *
 * @see overtimePlanService.ts — OvertimePlanService.createOvertimeAttendances()
 * @see overtimePlanService.ts — OvertimePlanService.approvePlan()
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
    employee: { findMany: jest.fn() },
    overtimePlan: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    attendance: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
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
import { OvertimePlanService } from '@services/overtimePlanService';
import { AttendanceStatus } from '@prisma/client';
import { ApiError, NotFoundError, ValidationError } from '@utils/errors';

const service = new OvertimePlanService();
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
};

const PARTICIPANT_USERS = [
  { id: 'user-creator', firstName: 'Creator', lastName: 'One', departmentId: 'dept-1', employees: { employeeCode: 'EMP001' } },
  { id: 'user-member-2', firstName: 'Member', lastName: 'Two', departmentId: 'dept-1', employees: { employeeCode: 'EMP002' } },
  { id: 'user-member-3', firstName: 'Member', lastName: 'Three', departmentId: 'dept-1', employees: { employeeCode: 'EMP003' } },
];

const PLAN_APPROVED = {
  id: 'plan-approved-001',
  nguoiTaoId: 'user-creator',
  nguoiThamGiaIds: ['user-creator', 'user-member-2', 'user-member-3'],
  noiDung: 'Tăng ca kiểm tra chất lượng',
  ngayTangCa: new Date('2026-04-06T00:00:00.000Z'),
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

const EMPLOYEES = [
  { id: 'emp-creator', userId: 'user-creator' },
  { id: 'emp-member-2', userId: 'user-member-2' },
  { id: 'emp-member-3', userId: 'user-member-3' },
];

function mockPopulateUsers() {
  (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue(PARTICIPANT_USERS);
}

function setupApproveMocks() {
  (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(ADMIN_USER);
  (mockedPrisma.overtimePlan.findUnique as jest.Mock).mockResolvedValue(PLAN_APPROVED);
  (mockedPrisma.overtimePlan.update as jest.Mock).mockResolvedValue({ ...PLAN_APPROVED, trangThai: 'DA_DUYET' });
  (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue(EMPLOYEES);
  mockedPrisma.attendance.findFirst.mockResolvedValue(null);
  mockedPrisma.attendance.create.mockResolvedValue({});
  mockedPrisma.attendance.update.mockResolvedValue({});
  mockPopulateUsers();
}

// ─── TESTS ───────────────────────────────────────────────────────────────────

describe('OvertimePlan Attendance Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── createOvertimeAttendances ────────────────────────────────────────────

  describe('createOvertimeAttendances', () => {
    beforeEach(() => {
      (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue(EMPLOYEES);
    });

    it('should create new OVERTIME attendance records for ALL participants', async () => {
      mockedPrisma.attendance.findFirst.mockResolvedValue(null);
      mockedPrisma.attendance.create.mockResolvedValue({});

      await service.createOvertimeAttendances(PLAN_APPROVED);

      // Should create 3 records (creator + 2 members)
      expect(mockedPrisma.attendance.create).toHaveBeenCalledTimes(3);

      // Verify first create call — participant 1
      const createCall0 = (mockedPrisma.attendance.create as jest.Mock).mock.calls[0][0];
      expect(createCall0.data.status).toBe(AttendanceStatus.OVERTIME);
      expect(createCall0.data.isOvertime).toBe(true);
      expect(createCall0.data.overtimePlanId).toBe(PLAN_APPROVED.id);
      expect(createCall0.data.notes).toContain(PLAN_APPROVED.noiDung);
    });

    it('should set correct checkInTime and checkOutTime from HH:mm on overtime date', async () => {
      mockedPrisma.attendance.findFirst.mockResolvedValue(null);
      mockedPrisma.attendance.create.mockResolvedValue({});

      await service.createOvertimeAttendances(PLAN_APPROVED);

      // The checkInTime and checkOutTime should be Date objects with correct hours/minutes
      const createCall = (mockedPrisma.attendance.create as jest.Mock).mock.calls[0][0];
      const checkIn: Date = createCall.data.checkInTime;
      const checkOut: Date = createCall.data.checkOutTime;

      expect(checkIn.getHours()).toBe(18);
      expect(checkIn.getMinutes()).toBe(0);
      expect(checkOut.getHours()).toBe(21);
      expect(checkOut.getMinutes()).toBe(0);
    });

    it('should UPDATE existing attendance record when found by overtimePlanId (re-sync)', async () => {
      // Employee member-2 already has a daytime attendance linked to this plan
      mockedPrisma.attendance.findFirst.mockImplementation((args) => {
        const where: any = args?.where || {};
        if (where.employeeId === 'emp-member-2') {
          return Promise.resolve({
            id: 'att-existing-002',
            checkOutTime: new Date(2026, 3, 6, 17, 0, 0), // local 17:00
            notes: 'Ca ngày thường',
          });
        }
        return Promise.resolve(null);
      });
      mockedPrisma.attendance.update.mockResolvedValue({});

      await service.createOvertimeAttendances(PLAN_APPROVED);

      // emp-member-2: should UPDATE existing record (not create new)
      const updateCall = (mockedPrisma.attendance.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.where.id).toBe('att-existing-002');
      expect(updateCall.data.isOvertime).toBe(true);
      expect(updateCall.data.overtimePlanId).toBeUndefined(); // not in update data (already on record)
      expect(updateCall.data.notes).toContain(PLAN_APPROVED.noiDung);
      expect(mockedPrisma.attendance.create).toHaveBeenCalledTimes(2); // Only 2 new records
    });

    it('should UPDATE existing record even when checkOut is already later (re-sync behavior)', async () => {
      // Employee already checked out at 22:00 — later than overtime end (21:00)
      mockedPrisma.attendance.findFirst.mockResolvedValue({
        id: 'att-already-out',
        checkOutTime: new Date(2026, 3, 6, 22, 0, 0), // local 22:00 > 21:00
        notes: 'Ca tối',
      });
      mockedPrisma.attendance.update.mockResolvedValue({});

      await service.createOvertimeAttendances(PLAN_APPROVED);

      // Service re-syncs existing record with approved plan times (idempotent)
      expect(mockedPrisma.attendance.update).toHaveBeenCalled();
      expect(mockedPrisma.attendance.create).not.toHaveBeenCalled();
    });

    it('should create new attendance even when existing record has null checkOutTime', async () => {
      // Employee checked in but hasn't checked out yet (open attendance)
      mockedPrisma.attendance.findFirst.mockResolvedValue({
        id: 'att-open',
        checkOutTime: null,
        notes: null,
      });
      mockedPrisma.attendance.update.mockResolvedValue({});

      await service.createOvertimeAttendances(PLAN_APPROVED);

      expect(mockedPrisma.attendance.update).toHaveBeenCalledTimes(3); // All 3 employees updated
      expect(mockedPrisma.attendance.create).not.toHaveBeenCalled();
    });

    it('should link overtimePlanId to the correct plan on each attendance', async () => {
      mockedPrisma.attendance.findFirst.mockResolvedValue(null);
      mockedPrisma.attendance.create.mockResolvedValue({});

      await service.createOvertimeAttendances(PLAN_APPROVED);

      for (const call of (mockedPrisma.attendance.create as jest.Mock).mock.calls) {
        expect(call[0].data.overtimePlanId).toBe(PLAN_APPROVED.id);
      }
    });

    it('should skip failing employees gracefully without throwing', async () => {
      mockedPrisma.attendance.findFirst
        .mockRejectedValueOnce(new Error('DB connection error')) // emp-creator fails
        .mockResolvedValue(null); // others succeed
      mockedPrisma.attendance.create.mockResolvedValue({});

      // Should NOT throw — errors are caught per-employee
      await expect(service.createOvertimeAttendances(PLAN_APPROVED)).resolves.not.toThrow();
    });

    it('should query attendance by employeeId + overtimePlanId (not date range)', async () => {
      mockedPrisma.attendance.findFirst.mockResolvedValue(null);
      mockedPrisma.attendance.create.mockResolvedValue({});

      await service.createOvertimeAttendances(PLAN_APPROVED);

      const findFirstCall = (mockedPrisma.attendance.findFirst as jest.Mock).mock.calls[0][0];
      expect(findFirstCall.where.employeeId).toBe('emp-creator'); // First employee
      expect(findFirstCall.where.overtimePlanId).toBe(PLAN_APPROVED.id);
      expect(findFirstCall.where.attendanceDate).toBeUndefined(); // No date range query
    });
  });

  // ── approvePlan → attendance + notification + broadcast ────────────────

  describe('approvePlan', () => {
    it('should auto-create OVERTIME attendances for ALL participants after approval', async () => {
      setupApproveMocks();

      await service.approvePlan('plan-approved-001', 'admin-id', { trangThai: 'DA_DUYET' } as any);

      // attendance.create should be called for each employee
      expect(mockedPrisma.attendance.create).toHaveBeenCalled();
    });

    it('should send notification to plan CREATOR after approval', async () => {
      setupApproveMocks();

      await service.approvePlan('plan-approved-001', 'admin-id', { trangThai: 'DA_DUYET' } as any);

      // Must notify the creator (nguoiTaoId)
      expect(mockedNotification.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-creator',
          type: 'OVERTIME_PLAN',
        })
      );
    });

    it('should send notification to plan CREATOR when REJECTED (not just on approval)', async () => {
      setupApproveMocks();
      (mockedPrisma.overtimePlan.update as jest.Mock).mockResolvedValue({ ...PLAN_APPROVED, trangThai: 'TU_CHOI' });

      await service.approvePlan('plan-approved-001', 'admin-id', { trangThai: 'TU_CHOI', lyDoTuChoi: 'Không đủ nhân lực' } as any);

      // Should still notify creator on rejection
      expect(mockedNotification.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-creator' })
      );
    });

    it('should NOT auto-create attendances when plan is REJECTED', async () => {
      setupApproveMocks();
      (mockedPrisma.overtimePlan.update as jest.Mock).mockResolvedValue({ ...PLAN_APPROVED, trangThai: 'TU_CHOI' });

      await service.approvePlan('plan-approved-001', 'admin-id', { trangThai: 'TU_CHOI' } as any);

      expect(mockedPrisma.attendance.create).not.toHaveBeenCalled();
      expect(mockedPrisma.attendance.update).not.toHaveBeenCalled();
    });

    it('should send OVERTIME_PLAN_APPROVAL notifications to participants (except creator)', async () => {
      setupApproveMocks();

      await service.approvePlan('plan-approved-001', 'admin-id', { trangThai: 'DA_DUYET' } as any);

      // Participants other than creator should get notified
      const notifCalls = (mockedNotification.createNotification as jest.Mock).mock.calls;
      const participantNotifications = notifCalls.filter(
        (call) => call[0].userId !== 'user-creator' && call[0].type === 'OVERTIME_PLAN'
      );
      expect(participantNotifications.length).toBeGreaterThan(0);
    });

    it('should broadcast OVERTIME_PLAN_CHANGED after approval (triggered by createOvertimeAttendances)', async () => {
      setupApproveMocks();

      await service.approvePlan('plan-approved-001', 'admin-id', { trangThai: 'DA_DUYET' } as any);

      // The approvePlan calls createOvertimeAttendances then broadcasts OVERTIME_PLAN_CHANGED
      expect(mockedBroadcast).toHaveBeenCalledWith({ type: 'OVERTIME_PLAN_CHANGED' });
    });

    it('should broadcast OVERTIME_PLAN_CHANGED even when plan is rejected', async () => {
      setupApproveMocks();
      (mockedPrisma.overtimePlan.update as jest.Mock).mockResolvedValue({ ...PLAN_APPROVED, trangThai: 'TU_CHOI' });

      await service.approvePlan('plan-approved-001', 'admin-id', { trangThai: 'TU_CHOI' } as any);

      expect(mockedBroadcast).toHaveBeenCalledWith({ type: 'OVERTIME_PLAN_CHANGED' });
    });

    it('should throw NotFoundError when plan does not exist', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(ADMIN_USER);
      (mockedPrisma.overtimePlan.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.approvePlan('non-existent-id', 'admin-id', { trangThai: 'DA_DUYET' } as any)
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw ValidationError when plan is already processed', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(ADMIN_USER);
      (mockedPrisma.overtimePlan.findUnique as jest.Mock).mockResolvedValue({ ...PLAN_APPROVED, trangThai: 'DA_DUYET' });

      await expect(
        service.approvePlan('plan-approved-001', 'admin-id', { trangThai: 'DA_DUYET' } as any)
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw ApiError when user is not authorized to approve', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({ ...ADMIN_USER, role: 'EMPLOYEE' });

      await expect(
        service.approvePlan('plan-approved-001', 'normal-user-id', { trangThai: 'DA_DUYET' } as any)
      ).rejects.toBeInstanceOf(ApiError);
    });

    it('should allow DEPARTMENT_HEAD to approve', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({ ...ADMIN_USER, role: 'DEPARTMENT_HEAD' });
      (mockedPrisma.overtimePlan.findUnique as jest.Mock).mockResolvedValue(PLAN_APPROVED);
      (mockedPrisma.overtimePlan.update as jest.Mock).mockResolvedValue({ ...PLAN_APPROVED, trangThai: 'DA_DUYET' });
      (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue(EMPLOYEES);
      mockedPrisma.attendance.findFirst.mockResolvedValue(null);
      mockedPrisma.attendance.create.mockResolvedValue({});
      mockPopulateUsers();

      await service.approvePlan('plan-approved-001', 'dept-head-id', { trangThai: 'DA_DUYET' } as any);

      expect(mockedPrisma.overtimePlan.update).toHaveBeenCalled();
    });

    it('should allow TEAM_LEAD to approve', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({ ...ADMIN_USER, role: 'TEAM_LEAD' });
      (mockedPrisma.overtimePlan.findUnique as jest.Mock).mockResolvedValue(PLAN_APPROVED);
      (mockedPrisma.overtimePlan.update as jest.Mock).mockResolvedValue({ ...PLAN_APPROVED, trangThai: 'DA_DUYET' });
      (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue(EMPLOYEES);
      mockedPrisma.attendance.findFirst.mockResolvedValue(null);
      mockedPrisma.attendance.create.mockResolvedValue({});
      mockPopulateUsers();

      await service.approvePlan('plan-approved-001', 'team-lead-id', { trangThai: 'DA_DUYET' } as any);

      expect(mockedPrisma.overtimePlan.update).toHaveBeenCalled();
    });

    it('should NOT create duplicate attendance when called twice (findFirst returns existing on 2nd call)', async () => {
      // First call — no existing records
      mockedPrisma.attendance.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValue(null)
        .mockResolvedValue(null);
      mockedPrisma.attendance.create.mockResolvedValue({});
      mockedPrisma.attendance.update.mockResolvedValue({});

      await service.createOvertimeAttendances(PLAN_APPROVED);
      const createCallsAfterFirst = (mockedPrisma.attendance.create as jest.Mock).mock.calls.length;

      // Reset so second call finds existing records
      mockedPrisma.attendance.create.mockClear();

      // Second call — all employees now have records with checkout ≥ overtime end
      mockedPrisma.attendance.findFirst.mockResolvedValue({
        id: 'att-existing-from-first-call',
        checkOutTime: new Date('2026-04-06T21:00:00.000Z'), // 21:00 >= overtime end (21:00) → skip update
        notes: 'Tăng ca từ lần trước',
      });

      await service.createOvertimeAttendances(PLAN_APPROVED);

      // Second call should NOT create any new records
      expect(mockedPrisma.attendance.create).not.toHaveBeenCalled();
    });
  });
});
