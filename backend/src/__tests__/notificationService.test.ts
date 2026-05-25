// Mock side-effect dependencies first (hoisted by Jest)
jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    notification: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../services/pushNotificationService', () => ({
  __esModule: true,
  default: {
    sendPushToEmployee: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../services/wsManager', () => ({
  pushNotification: jest.fn(),
}));

jest.mock('../services/notificationRegistry', () => ({
  notificationRegistry: {
    get: jest.fn(),
  },
}));

import prisma from '@config/database';
import { NotificationService } from '@services/notificationService';
import { NotFoundError } from '@utils/errors';

const service = new NotificationService();
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── getEmployeeNotifications ─────────────────────────────────────────────────

describe('getEmployeeNotifications', () => {
  it('should return notifications for employee ordered by createdAt desc', async () => {
    const mockNotifications = [
      { id: 'n1', employeeId: 'emp1', title: 'Test', isRead: false, createdAt: new Date() },
      { id: 'n2', employeeId: 'emp1', title: 'Test 2', isRead: true, createdAt: new Date() },
    ];
    (mockedPrisma.notification.findMany as jest.Mock).mockResolvedValue(mockNotifications);

    const result = await service.getEmployeeNotifications('emp1', 10);

    expect(result).toEqual(mockNotifications);
    expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith({
      where: { employeeId: 'emp1' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  });

  it('should use default limit of 10 when not specified', async () => {
    (mockedPrisma.notification.findMany as jest.Mock).mockResolvedValue([]);

    await service.getEmployeeNotifications('emp1');

    expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });

  it('should return empty array when employee has no notifications', async () => {
    (mockedPrisma.notification.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.getEmployeeNotifications('emp-no-notifs');

    expect(result).toEqual([]);
  });
});

// ─── getUnreadCount ───────────────────────────────────────────────────────────

describe('getUnreadCount', () => {
  it('should return the number of unread notifications', async () => {
    (mockedPrisma.notification.count as jest.Mock).mockResolvedValue(5);

    const result = await service.getUnreadCount('emp1');

    expect(result).toBe(5);
    expect(mockedPrisma.notification.count).toHaveBeenCalledWith({
      where: { employeeId: 'emp1', isRead: false },
    });
  });

  it('should return 0 when all notifications are read', async () => {
    (mockedPrisma.notification.count as jest.Mock).mockResolvedValue(0);

    const result = await service.getUnreadCount('emp1');

    expect(result).toBe(0);
  });
});

// ─── getUnreadNotifications ───────────────────────────────────────────────────

describe('getUnreadNotifications', () => {
  it('should return only unread notifications ordered by createdAt desc', async () => {
    const mockUnread = [
      { id: 'n1', employeeId: 'emp1', isRead: false },
      { id: 'n2', employeeId: 'emp1', isRead: false },
    ];
    (mockedPrisma.notification.findMany as jest.Mock).mockResolvedValue(mockUnread);

    const result = await service.getUnreadNotifications('emp1');

    expect(result).toEqual(mockUnread);
    expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith({
      where: { employeeId: 'emp1', isRead: false },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should return empty array when all notifications are read', async () => {
    (mockedPrisma.notification.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.getUnreadNotifications('emp1');

    expect(result).toEqual([]);
  });
});

// ─── markAsRead ───────────────────────────────────────────────────────────────

describe('markAsRead', () => {
  it('should update isRead to true when notification belongs to employee', async () => {
    const existing = { id: 'n1', employeeId: 'emp1', isRead: false };
    const updated = { id: 'n1', employeeId: 'emp1', isRead: true };
    (mockedPrisma.notification.findUnique as jest.Mock).mockResolvedValue(existing);
    (mockedPrisma.notification.update as jest.Mock).mockResolvedValue(updated);

    const result = await service.markAsRead('n1', 'emp1');

    expect(result).toEqual(updated);
    expect(mockedPrisma.notification.findUnique).toHaveBeenCalledWith({ where: { id: 'n1' } });
    expect(mockedPrisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'n1' },
      data: { isRead: true },
    });
  });

  it('should throw NotFoundError when notification does not exist', async () => {
    (mockedPrisma.notification.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.markAsRead('n-missing', 'emp1')).rejects.toThrow(NotFoundError);
    expect(mockedPrisma.notification.update).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when notification belongs to a different employee', async () => {
    const existing = { id: 'n1', employeeId: 'emp-other', isRead: false };
    (mockedPrisma.notification.findUnique as jest.Mock).mockResolvedValue(existing);

    await expect(service.markAsRead('n1', 'emp1')).rejects.toThrow(NotFoundError);
    expect(mockedPrisma.notification.update).not.toHaveBeenCalled();
  });
});

// ─── markAllAsRead ────────────────────────────────────────────────────────────

describe('markAllAsRead', () => {
  it('should mark all unread notifications for employee as read', async () => {
    const updateResult = { count: 3 };
    (mockedPrisma.notification.updateMany as jest.Mock).mockResolvedValue(updateResult);

    const result = await service.markAllAsRead('emp1');

    expect(result).toEqual(updateResult);
    expect(mockedPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { employeeId: 'emp1', isRead: false },
      data: { isRead: true },
    });
  });

  it('should return count 0 when no unread notifications exist', async () => {
    (mockedPrisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    const result = await service.markAllAsRead('emp1');

    expect(result).toEqual({ count: 0 });
  });
});

// ─── getUnreadCountByType ─────────────────────────────────────────────────────

describe('getUnreadCountByType', () => {
  it('should return a record grouped by notification type', async () => {
    const groupByResult = [
      { type: 'TASK', _count: { type: 3 } },
      { type: 'EVALUATION', _count: { type: 1 } },
    ];
    (mockedPrisma.notification.groupBy as jest.Mock).mockResolvedValue(groupByResult);

    const result = await service.getUnreadCountByType('emp1');

    expect(result).toEqual({ TASK: 3, EVALUATION: 1 });
    expect(mockedPrisma.notification.groupBy).toHaveBeenCalledWith({
      by: ['type'],
      where: { employeeId: 'emp1', isRead: false },
      _count: { type: true },
    });
  });

  it('should return empty object when no unread notifications', async () => {
    (mockedPrisma.notification.groupBy as jest.Mock).mockResolvedValue([]);

    const result = await service.getUnreadCountByType('emp1');

    expect(result).toEqual({});
  });
});

// ─── deleteNotification ───────────────────────────────────────────────────────

describe('deleteNotification', () => {
  const notificationId = 'notif-abc';
  const ownerEmployeeId = 'emp-owner';
  const otherEmployeeId = 'emp-other';

  it('should delete the notification when it belongs to the requesting employee', async () => {
    const mockNotif = { id: notificationId, employeeId: ownerEmployeeId };
    (mockedPrisma.notification.findUnique as jest.Mock).mockResolvedValue(mockNotif);
    (mockedPrisma.notification.delete as jest.Mock).mockResolvedValue(mockNotif);

    await service.deleteNotification(notificationId, ownerEmployeeId);

    expect(mockedPrisma.notification.findUnique).toHaveBeenCalledWith({
      where: { id: notificationId },
    });
    expect(mockedPrisma.notification.delete).toHaveBeenCalledWith({
      where: { id: notificationId },
    });
  });

  it('should throw NotFoundError when notification does not exist', async () => {
    (mockedPrisma.notification.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      service.deleteNotification(notificationId, ownerEmployeeId)
    ).rejects.toThrow(NotFoundError);

    await expect(
      service.deleteNotification(notificationId, ownerEmployeeId)
    ).rejects.toThrow('Không tìm thấy thông báo');

    expect(mockedPrisma.notification.delete).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when notification belongs to a different employee', async () => {
    const mockNotif = { id: notificationId, employeeId: ownerEmployeeId };
    (mockedPrisma.notification.findUnique as jest.Mock).mockResolvedValue(mockNotif);

    await expect(
      service.deleteNotification(notificationId, otherEmployeeId)
    ).rejects.toThrow(NotFoundError);

    expect(mockedPrisma.notification.delete).not.toHaveBeenCalled();
  });

  it('should not delete notifications owned by another employee even if IDs differ', async () => {
    const mockNotif = { id: notificationId, employeeId: 'emp-completely-different' };
    (mockedPrisma.notification.findUnique as jest.Mock).mockResolvedValue(mockNotif);

    await expect(
      service.deleteNotification(notificationId, ownerEmployeeId)
    ).rejects.toThrow(NotFoundError);

    expect(mockedPrisma.notification.delete).not.toHaveBeenCalled();
  });
});
