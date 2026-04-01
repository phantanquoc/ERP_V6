// Mock env TRƯỚC mọi import
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

// Mock WebSocket push — không cần WS server thật khi test service
jest.mock('@services/websocket', () => ({
  pushNotification: jest.fn(),
}));

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    notification: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import prisma from '@config/database';
import { pushNotification } from '@services/websocket';
import { NotificationService } from '@services/notificationService';
import { NotificationType } from '@types';

const service = new NotificationService();
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedPush = pushNotification as jest.Mock;

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers — mock data
   ───────────────────────────────────────────────────────────────────────────── */

const makeUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'test@example.com',
  employees: { id: 'emp-1' },
  ...overrides,
});

const makeNotification = (overrides = {}) => ({
  id: 'notif-1',
  employeeId: 'emp-1',
  type: NotificationType.TASK,
  title: 'Test Title',
  message: 'Test Message',
  isRead: false,
  createdAt: new Date('2026-04-01T10:00:00Z'),
  period: null,
  evaluationId: null,
  taskId: null,
  acceptanceHandoverId: null,
  leaveRequestId: null,
  ...overrides,
});

/* ─────────────────────────────────────────────────────────────────────────────
   createNotification
   ───────────────────────────────────────────────────────────────────────────── */

describe('NotificationService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createNotification', () => {
    it('should create notification and push via WebSocket', async () => {
      const mockUser = makeUser();
      const mockNotif = makeNotification();

      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockedPrisma.notification.create as jest.Mock).mockResolvedValue(mockNotif);

      const result = await service.createNotification({
        userId: 'user-1',
        type: NotificationType.TASK,
        title: 'Test Title',
        message: 'Test Message',
      });

      expect(result.id).toBe('notif-1');
      expect(result.employeeId).toBe('emp-1');
      // WebSocket push phải được gọi sau khi lưu DB
      expect(mockedPush).toHaveBeenCalledWith(
        'emp-1',
        expect.objectContaining({ id: 'notif-1', title: 'Test Title' })
      );
    });

    it('should throw Error when user has no employee record', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-orphan',
        employees: null, // user chưa có employee
      });

      await expect(
        service.createNotification({
          userId: 'user-orphan',
          type: NotificationType.TASK,
          title: 'Test',
          message: 'Test',
        })
      ).rejects.toThrow('Employee not found for user');

      expect(mockedPrisma.notification.create).not.toHaveBeenCalled();
      expect(mockedPush).not.toHaveBeenCalled();
    });

    it('should throw Error when user does not exist', async () => {
      (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createNotification({
          userId: 'user-nonexistent',
          type: NotificationType.TASK,
          title: 'Test',
          message: 'Test',
        })
      ).rejects.toThrow('Employee not found for user');
    });
  });

  /* ─────────────────────────────────────────────────────────────────────────
     getEmployeeNotifications
     ───────────────────────────────────────────────────────────────────────── */

  describe('getEmployeeNotifications', () => {
    it('should return notifications ordered by createdAt desc with default limit 10', async () => {
      const mockList = [makeNotification(), makeNotification({ id: 'notif-2' })];
      (mockedPrisma.notification.findMany as jest.Mock).mockResolvedValue(mockList);

      const result = await service.getEmployeeNotifications('emp-1');

      expect(result).toHaveLength(2);
      expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { employeeId: 'emp-1' },
          orderBy: { createdAt: 'desc' },
          take: 10,
        })
      );
    });

    it('should respect custom limit parameter', async () => {
      (mockedPrisma.notification.findMany as jest.Mock).mockResolvedValue([]);

      await service.getEmployeeNotifications('emp-1', 5);

      expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });

    it('should return empty list when employee has no notifications', async () => {
      (mockedPrisma.notification.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getEmployeeNotifications('emp-empty');

      expect(result).toHaveLength(0);
    });
  });

  /* ─────────────────────────────────────────────────────────────────────────
     getUnreadNotifications
     ───────────────────────────────────────────────────────────────────────── */

  describe('getUnreadNotifications', () => {
    it('should return only unread notifications', async () => {
      const unread = [makeNotification({ isRead: false })];
      (mockedPrisma.notification.findMany as jest.Mock).mockResolvedValue(unread);

      const result = await service.getUnreadNotifications('emp-1');

      expect(result).toHaveLength(1);
      expect(result[0].isRead).toBe(false);
      expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { employeeId: 'emp-1', isRead: false } })
      );
    });

    it('should return empty array when all are read', async () => {
      (mockedPrisma.notification.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getUnreadNotifications('emp-all-read');

      expect(result).toHaveLength(0);
    });
  });

  /* ─────────────────────────────────────────────────────────────────────────
     markAsRead
     ───────────────────────────────────────────────────────────────────────── */

  describe('markAsRead', () => {
    it('should mark a specific notification as read', async () => {
      const updated = makeNotification({ isRead: true });
      (mockedPrisma.notification.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.markAsRead('notif-1');

      expect(result.isRead).toBe(true);
      expect(mockedPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
        data: { isRead: true },
      });
    });
  });

  /* ─────────────────────────────────────────────────────────────────────────
     markAllAsRead
     ───────────────────────────────────────────────────────────────────────── */

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read and return count', async () => {
      (mockedPrisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('emp-1');

      expect(result.count).toBe(5);
      expect(mockedPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { employeeId: 'emp-1', isRead: false },
        data: { isRead: true },
      });
    });

    it('should return count 0 when no unread notifications exist', async () => {
      (mockedPrisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await service.markAllAsRead('emp-no-unread');

      expect(result.count).toBe(0);
    });
  });
});
