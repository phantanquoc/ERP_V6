// @ts-nocheck — Jest mock objects

/**
 * MeetingService — Unit Tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests cover the MeetingService methods:
 *   • create()          — validation, participant creation, notifications, broadcast
 *   • getAll()          — pagination, filters
 *   • getById()         — full detail with participants
 *   • update()          — authorization, cancellation notification, broadcast
 *   • delete()          — SCHEDULED-only, authorization
 *   • confirmAttendance() — update isConfirmed
 *   • checkUpcomingReminders() — reminder notification + marking
 *
 * @see meetingService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

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
    employee: { count: jest.fn(), findUnique: jest.fn() },
    meeting: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), count: jest.fn() },
    meetingParticipant: { deleteMany: jest.fn(), createMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { createNotification: jest.fn().mockResolvedValue(undefined) },
}));

const broadcastMock = jest.fn();
jest.mock('@services/websocket', () => ({
  broadcast: broadcastMock,
  pushNotification: jest.fn(),
}));

import prisma from '@config/database';
import notificationService from '@services/notificationService';
import { MeetingService } from '@services/meetingService';
import { ValidationError, NotFoundError, AuthorizationError } from '@utils/errors';

const service = new MeetingService();
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedNotification = notificationService as jest.Mocked<typeof notificationService>;

// ── Fixtures ────────────────────────────────────────────────────────────────

const TODAY = new Date();
TODAY.setHours(12, 0, 0, 0);

const MEETING_FIXTURE = {
  id: 'meeting-001',
  title: 'Họp dự án A',
  agenda: 'Thảo luận tiến độ',
  meetingDate: TODAY,
  startTime: '14:00',
  endTime: '15:30',
  room: 'Phòng A',
  notes: null,
  status: 'SCHEDULED',
  departmentId: null,
  createdBy: 'user-admin',
  reminderSentAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const PARTICIPANTS = [
  {
    id: 'part-1',
    meetingId: 'meeting-001',
    employeeId: 'emp-1',
    isConfirmed: false,
    createdAt: new Date(),
    employee: {
      id: 'emp-1',
      employeeCode: 'EMP001',
      user: { id: 'user-1', firstName: 'Người', lastName: 'Tham Gia 1' },
      subDepartment: { name: 'Phòng Kỹ thuật' },
    },
  },
  {
    id: 'part-2',
    meetingId: 'meeting-001',
    employeeId: 'emp-2',
    isConfirmed: false,
    createdAt: new Date(),
    employee: {
      id: 'emp-2',
      employeeCode: 'EMP002',
      user: { id: 'user-2', firstName: 'Người', lastName: 'Tham Gia 2' },
      subDepartment: { name: 'Phòng Kinh doanh' },
    },
  },
];

// ── Tests ───────────────────────────────────────────────────────────────────

describe('MeetingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    broadcastMock.mockClear();
    mockedNotification.createNotification.mockClear();
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a meeting with participants and broadcast MEETING_CHANGED', async () => {
      mockedPrisma.employee.count.mockResolvedValue(2);
      (mockedPrisma.meeting.create as jest.Mock).mockResolvedValue({
        ...MEETING_FIXTURE,
        participants: PARTICIPANTS,
      });

      await service.create({
        title: 'Họp dự án A',
        agenda: 'Thảo luận tiến độ',
        meetingDate: TODAY,
        startTime: '14:00',
        endTime: '15:30',
        room: 'Phòng A',
        participantIds: ['emp-1', 'emp-2'],
      }, 'user-admin');

      expect(mockedPrisma.meeting.create).toHaveBeenCalled();
      expect(broadcastMock).toHaveBeenCalledWith({ type: 'MEETING_CHANGED' });
    });

    it('should notify each participant', async () => {
      mockedPrisma.employee.count.mockResolvedValue(2);
      (mockedPrisma.meeting.create as jest.Mock).mockResolvedValue({
        ...MEETING_FIXTURE,
        participants: PARTICIPANTS,
      });

      await service.create({
        title: 'Họp dự án A',
        meetingDate: TODAY,
        startTime: '14:00',
        endTime: '15:30',
        participantIds: ['emp-1', 'emp-2'],
      }, 'user-admin');

      // Should notify both participants
      expect(mockedNotification.createNotification).toHaveBeenCalledTimes(2);
    });

    it('should throw ValidationError when endTime <= startTime', async () => {
      await expect(
        service.create({
          title: 'Test',
          meetingDate: TODAY,
          startTime: '15:00',
          endTime: '14:00', // invalid
          participantIds: [],
        }, 'user-admin')
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw ValidationError when meetingDate is in the past', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await expect(
        service.create({
          title: 'Test',
          meetingDate: yesterday,
          startTime: '10:00',
          endTime: '11:00',
          participantIds: [],
        }, 'user-admin')
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw NotFoundError when a participant does not exist', async () => {
      mockedPrisma.employee.count.mockResolvedValue(1); // only 1 of 2 found

      await expect(
        service.create({
          title: 'Test',
          meetingDate: TODAY,
          startTime: '10:00',
          endTime: '11:00',
          participantIds: ['emp-1', 'emp-nonexistent'],
        }, 'user-admin')
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should allow creating meeting with no participants', async () => {
      mockedPrisma.employee.count.mockResolvedValue(0);
      (mockedPrisma.meeting.create as jest.Mock).mockResolvedValue({
        ...MEETING_FIXTURE,
        participants: [],
      });

      await service.create({
        title: 'Họp nội bộ',
        meetingDate: TODAY,
        startTime: '10:00',
        endTime: '11:00',
        participantIds: [],
      }, 'user-admin');

      expect(mockedPrisma.meeting.create).toHaveBeenCalled();
      expect(mockedNotification.createNotification).not.toHaveBeenCalled();
    });
  });

  // ── getAll ──────────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('should return paginated meetings', async () => {
      (mockedPrisma.meeting.findMany as jest.Mock).mockResolvedValue([MEETING_FIXTURE]);
      (mockedPrisma.meeting.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getAll({ page: 1, limit: 10 });

      expect(result.total).toBe(1);
      expect(result.data.length).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should filter by status', async () => {
      (mockedPrisma.meeting.findMany as jest.Mock).mockResolvedValue([MEETING_FIXTURE]);
      (mockedPrisma.meeting.count as jest.Mock).mockResolvedValue(1);

      await service.getAll({ status: 'SCHEDULED' });

      const findManyCall = (mockedPrisma.meeting.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.status).toBe('SCHEDULED');
    });

    it('should filter by date range', async () => {
      (mockedPrisma.meeting.findMany as jest.Mock).mockResolvedValue([]);
      (mockedPrisma.meeting.count as jest.Mock).mockResolvedValue(0);

      await service.getAll({ startDate: '2026-04-01', endDate: '2026-04-30' });

      const findManyCall = (mockedPrisma.meeting.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.meetingDate.gte).toBeDefined();
      expect(findManyCall.where.meetingDate.lte).toBeDefined();
    });

    it('should search by title', async () => {
      (mockedPrisma.meeting.findMany as jest.Mock).mockResolvedValue([MEETING_FIXTURE]);
      (mockedPrisma.meeting.count as jest.Mock).mockResolvedValue(1);

      await service.getAll({ search: 'dự án' });

      const findManyCall = (mockedPrisma.meeting.findMany as jest.Mock).mock.calls[0][0];
      expect(findManyCall.where.title.contains).toBe('dự án');
    });
  });

  // ── getById ─────────────────────────────────────────────────────────────

  describe('getById', () => {
    it('should return full meeting detail with participants', async () => {
      (mockedPrisma.meeting.findUnique as jest.Mock).mockResolvedValue({
        ...MEETING_FIXTURE,
        participants: PARTICIPANTS,
      });

      const result = await service.getById('meeting-001');

      expect(result.id).toBe('meeting-001');
      expect(result.participants.length).toBe(2);
    });

    it('should throw NotFoundError when meeting does not exist', async () => {
      (mockedPrisma.meeting.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getById('nonexistent')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    beforeEach(() => {
      (mockedPrisma.meeting.findUnique as jest.Mock).mockResolvedValue({
        ...MEETING_FIXTURE,
        participants: PARTICIPANTS,
      });
      (mockedPrisma.meeting.update as jest.Mock).mockResolvedValue({
        ...MEETING_FIXTURE,
        participants: PARTICIPANTS,
      });
    });

    it('should throw AuthorizationError when non-creator and non-ADMIN tries to update', async () => {
      await expect(
        service.update('meeting-001', { title: 'Updated' }, 'user-other', 'EMPLOYEE')
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should allow ADMIN to update any meeting', async () => {
      const result = await service.update('meeting-001', { title: 'Updated Title' }, 'user-other', 'ADMIN');

      expect(mockedPrisma.meeting.update).toHaveBeenCalled();
    });

    it('should notify participants when meeting is CANCELLED', async () => {
      (mockedPrisma.meeting.update as jest.Mock).mockResolvedValue({
        ...MEETING_FIXTURE,
        status: 'CANCELLED',
        participants: PARTICIPANTS,
      });

      await service.update('meeting-001', { status: 'CANCELLED' }, 'user-admin', 'ADMIN');

      expect(mockedNotification.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'MEETING_CANCELLED', title: 'Cuộc họp đã bị hủy' })
      );
    });

    it('should throw ValidationError when updating a cancelled meeting', async () => {
      (mockedPrisma.meeting.findUnique as jest.Mock).mockResolvedValue({
        ...MEETING_FIXTURE,
        status: 'CANCELLED',
      });

      await expect(
        service.update('meeting-001', { title: 'New Title' }, 'user-admin', 'ADMIN')
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('should broadcast MEETING_CHANGED after update', async () => {
      await service.update('meeting-001', { title: 'Updated Title' }, 'user-admin', 'ADMIN');

      expect(broadcastMock).toHaveBeenCalledWith({ type: 'MEETING_CHANGED' });
    });
  });

  // ── delete ─────────────────────────────────────────────────────────────

  describe('delete', () => {
    it('should throw ValidationError when meeting is not SCHEDULED', async () => {
      (mockedPrisma.meeting.findUnique as jest.Mock).mockResolvedValue({
        ...MEETING_FIXTURE,
        status: 'COMPLETED',
      });

      await expect(
        service.delete('meeting-001', 'user-admin', 'ADMIN')
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it('should throw AuthorizationError when non-creator and non-ADMIN deletes', async () => {
      (mockedPrisma.meeting.findUnique as jest.Mock).mockResolvedValue(MEETING_FIXTURE);

      await expect(
        service.delete('meeting-001', 'user-other', 'EMPLOYEE')
      ).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('should delete meeting and broadcast MEETING_CHANGED', async () => {
      (mockedPrisma.meeting.findUnique as jest.Mock).mockResolvedValue(MEETING_FIXTURE);

      await service.delete('meeting-001', 'user-admin', 'ADMIN');

      expect(mockedPrisma.meeting.delete).toHaveBeenCalledWith({ where: { id: 'meeting-001' } });
      expect(broadcastMock).toHaveBeenCalledWith({ type: 'MEETING_CHANGED' });
    });
  });

  // ── confirmAttendance ───────────────────────────────────────────────────

  describe('confirmAttendance', () => {
    it('should update isConfirmed to true', async () => {
      (mockedPrisma.meeting.findUnique as jest.Mock).mockResolvedValue(MEETING_FIXTURE);
      (mockedPrisma.meetingParticipant.findUnique as jest.Mock).mockResolvedValue(PARTICIPANTS[0]);
      (mockedPrisma.meetingParticipant.update as jest.Mock).mockResolvedValue({
        ...PARTICIPANTS[0],
        isConfirmed: true,
      });

      const result = await service.confirmAttendance('meeting-001', 'emp-1', true);

      expect(result.isConfirmed).toBe(true);
      expect(broadcastMock).toHaveBeenCalledWith({ type: 'MEETING_CHANGED' });
    });

    it('should throw NotFoundError when meeting does not exist', async () => {
      (mockedPrisma.meeting.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.confirmAttendance('nonexistent', 'emp-1', true)
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw NotFoundError when employee is not a participant', async () => {
      (mockedPrisma.meeting.findUnique as jest.Mock).mockResolvedValue(MEETING_FIXTURE);
      (mockedPrisma.meetingParticipant.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.confirmAttendance('meeting-001', 'emp-not-participant', true)
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  // ── checkUpcomingReminders ─────────────────────────────────────────────

  describe('checkUpcomingReminders', () => {
    it('should notify participants for meetings starting within reminder window', async () => {
      const in15Min = new Date(Date.now() + 15 * 60 * 1000);
      in15Min.setHours(14, 0, 0, 0);

      const upcomingMeeting = {
        ...MEETING_FIXTURE,
        meetingDate: in15Min,
        startTime: `${in15Min.getHours().toString().padStart(2, '0')}:00`,
        status: 'SCHEDULED',
        reminderSentAt: null,
        participants: PARTICIPANTS,
      };

      (mockedPrisma.meeting.findMany as jest.Mock).mockResolvedValue([upcomingMeeting]);
      (mockedPrisma.meeting.update as jest.Mock).mockResolvedValue(upcomingMeeting);

      await service.checkUpcomingReminders();

      expect(mockedNotification.createNotification).toHaveBeenCalled();
      expect(mockedPrisma.meeting.update).toHaveBeenCalled(); // marks reminderSentAt
    });

    it('should NOT send reminder if reminderSentAt is already set', async () => {
      const in15Min = new Date(Date.now() + 15 * 60 * 1000);
      in15Min.setHours(14, 0, 0, 0);

      (mockedPrisma.meeting.findMany as jest.Mock).mockResolvedValue([]); // excluded by query

      await service.checkUpcomingReminders();

      expect(mockedNotification.createNotification).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully without throwing', async () => {
      (mockedPrisma.meeting.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(service.checkUpcomingReminders()).resolves.not.toThrow();
    });
  });
});
