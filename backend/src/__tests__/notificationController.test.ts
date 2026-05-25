// Mock @config/database — controller uses require('@config/database').default inline
jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    employee: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock notificationService module entirely
jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: {
    getEmployeeNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    getUnreadNotifications: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    getUnreadCountByType: jest.fn(),
    getLatestEvaluationNotification: jest.fn(),
  },
}));

jest.mock('@services/pushNotificationService', () => ({
  __esModule: true,
  default: {
    saveSubscription: jest.fn(),
    removeSubscription: jest.fn(),
  },
}));

import prisma from '@config/database';
import notificationService from '@services/notificationService';
import { NotificationController } from '@controllers/notificationController';
import { NotFoundError } from '@utils/errors';

const controller = new NotificationController();
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedService = notificationService as jest.Mocked<typeof notificationService>;

const mockRequest = (overrides: Record<string, any> = {}) =>
  ({ params: {}, query: {}, body: {}, ...overrides } as any);

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── getEmployeeNotifications ─────────────────────────────────────────────────

describe('getEmployeeNotifications', () => {
  it('should return 401 when userId is not set', async () => {
    const req = mockRequest({ user: undefined });
    const res = mockResponse();

    await controller.getEmployeeNotifications(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
  });

  it('should return empty array when employee record does not exist', async () => {
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);
    const req = mockRequest({ user: { id: 'user-1' }, query: {} });
    const res = mockResponse();

    await controller.getEmployeeNotifications(req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  it('should return notifications for the authenticated employee', async () => {
    const employee = { id: 'emp-1' };
    const notifications = [
      { id: 'n1', title: 'Hello', isRead: false },
      { id: 'n2', title: 'World', isRead: true },
    ];
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(employee);
    mockedService.getEmployeeNotifications.mockResolvedValue(notifications);

    const req = mockRequest({ user: { id: 'user-1' }, query: { limit: '5' } });
    const res = mockResponse();

    await controller.getEmployeeNotifications(req, res, mockNext);

    expect(mockedService.getEmployeeNotifications).toHaveBeenCalledWith('emp-1', 5, undefined);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: notifications });
  });

  it('should call next(error) on unexpected error', async () => {
    (mockedPrisma.employee.findUnique as jest.Mock).mockRejectedValue(new Error('DB down'));
    const req = mockRequest({ user: { id: 'user-1' }, query: {} });
    const res = mockResponse();

    await controller.getEmployeeNotifications(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─── getUnreadCount ───────────────────────────────────────────────────────────

describe('getUnreadCount', () => {
  it('should return 401 when userId is not set', async () => {
    const req = mockRequest({ user: undefined });
    const res = mockResponse();

    await controller.getUnreadCount(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return count 0 when employee record does not exist', async () => {
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);
    const req = mockRequest({ user: { id: 'user-1' } });
    const res = mockResponse();

    await controller.getUnreadCount(req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: { count: 0 } });
  });

  it('should return unread count from service', async () => {
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: 'emp-1' });
    mockedService.getUnreadCount.mockResolvedValue(7);

    const req = mockRequest({ user: { id: 'user-1' } });
    const res = mockResponse();

    await controller.getUnreadCount(req, res, mockNext);

    expect(mockedService.getUnreadCount).toHaveBeenCalledWith('emp-1');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { count: 7 } });
  });
});

// ─── getUnreadNotifications ───────────────────────────────────────────────────

describe('getUnreadNotifications', () => {
  it('should return 401 when userId is not set', async () => {
    const req = mockRequest({ user: undefined });
    const res = mockResponse();

    await controller.getUnreadNotifications(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return empty array and count 0 when employee does not exist', async () => {
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);
    const req = mockRequest({ user: { id: 'user-1' } });
    const res = mockResponse();

    await controller.getUnreadNotifications(req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: [] });
  });

  it('should return unread notifications with count', async () => {
    const unread = [{ id: 'n1', isRead: false }, { id: 'n2', isRead: false }];
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: 'emp-1' });
    mockedService.getUnreadNotifications.mockResolvedValue(unread);

    const req = mockRequest({ user: { id: 'user-1' } });
    const res = mockResponse();

    await controller.getUnreadNotifications(req, res, mockNext);

    expect(mockedService.getUnreadNotifications).toHaveBeenCalledWith('emp-1');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: unread });
  });
});

// ─── markAsRead ───────────────────────────────────────────────────────────────

describe('markAsRead', () => {
  it('should return 401 when userId is not set', async () => {
    const req = mockRequest({ user: undefined, params: { notificationId: 'n1' } });
    const res = mockResponse();

    await controller.markAsRead(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockedService.markAsRead).not.toHaveBeenCalled();
  });

  it('should return 404 when employee record does not exist', async () => {
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);
    const req = mockRequest({ user: { id: 'user-1' }, params: { notificationId: 'n1' } });
    const res = mockResponse();

    await controller.markAsRead(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockedService.markAsRead).not.toHaveBeenCalled();
  });

  it('should mark a notification as read and return the updated record', async () => {
    const updated = { id: 'n1', isRead: true };
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: 'emp-1' });
    mockedService.markAsRead.mockResolvedValue(updated);

    const req = mockRequest({ user: { id: 'user-1' }, params: { notificationId: 'n1' } });
    const res = mockResponse();

    await controller.markAsRead(req, res, mockNext);

    expect(mockedService.markAsRead).toHaveBeenCalledWith('n1', 'emp-1');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: updated });
  });

  it('should call next(error) when service throws (e.g. wrong owner)', async () => {
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: 'emp-1' });
    mockedService.markAsRead.mockRejectedValue(new NotFoundError('Không tìm thấy thông báo'));

    const req = mockRequest({ user: { id: 'user-1' }, params: { notificationId: 'n-bad' } });
    const res = mockResponse();

    await controller.markAsRead(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
  });
});

// ─── markAllAsRead ────────────────────────────────────────────────────────────

describe('markAllAsRead', () => {
  it('should return 401 when userId is not set', async () => {
    const req = mockRequest({ user: undefined });
    const res = mockResponse();

    await controller.markAllAsRead(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return count 0 when employee does not exist', async () => {
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);
    const req = mockRequest({ user: { id: 'user-1' } });
    const res = mockResponse();

    await controller.markAllAsRead(req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: { count: 0 } });
  });

  it('should mark all unread notifications and return result', async () => {
    const updateResult = { count: 4 };
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: 'emp-1' });
    mockedService.markAllAsRead.mockResolvedValue(updateResult);

    const req = mockRequest({ user: { id: 'user-1' } });
    const res = mockResponse();

    await controller.markAllAsRead(req, res, mockNext);

    expect(mockedService.markAllAsRead).toHaveBeenCalledWith('emp-1');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: updateResult });
  });
});

// ─── deleteNotification ───────────────────────────────────────────────────────

describe('deleteNotification', () => {
  it('should return 401 when userId is not set', async () => {
    const req = mockRequest({ user: undefined, params: { notificationId: 'n1' } });
    const res = mockResponse();

    await controller.deleteNotification(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockedService.deleteNotification).not.toHaveBeenCalled();
  });

  it('should return 404 when employee record does not exist', async () => {
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);
    const req = mockRequest({ user: { id: 'user-1' }, params: { notificationId: 'n1' } });
    const res = mockResponse();

    await controller.deleteNotification(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(mockedService.deleteNotification).not.toHaveBeenCalled();
  });

  it('should call service with notificationId and employeeId', async () => {
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: 'emp-1' });
    mockedService.deleteNotification.mockResolvedValue(undefined);

    const req = mockRequest({ user: { id: 'user-1' }, params: { notificationId: 'n-abc' } });
    const res = mockResponse();

    await controller.deleteNotification(req, res, mockNext);

    expect(mockedService.deleteNotification).toHaveBeenCalledWith('n-abc', 'emp-1');
  });

  it('should return success with Vietnamese message on successful delete', async () => {
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: 'emp-1' });
    mockedService.deleteNotification.mockResolvedValue(undefined);

    const req = mockRequest({ user: { id: 'user-1' }, params: { notificationId: 'n-abc' } });
    const res = mockResponse();

    await controller.deleteNotification(req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Xóa thông báo thành công',
    });
  });

  it('should call next(error) when service throws NotFoundError (wrong owner)', async () => {
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: 'emp-1' });
    mockedService.deleteNotification.mockRejectedValue(
      new NotFoundError('Không tìm thấy thông báo')
    );

    const req = mockRequest({ user: { id: 'user-1' }, params: { notificationId: 'n-other' } });
    const res = mockResponse();

    await controller.deleteNotification(req, res, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundError));
    expect(res.json).not.toHaveBeenCalled();
  });
});

// ─── getUnreadCountByType ─────────────────────────────────────────────────────

describe('getUnreadCountByType', () => {
  it('should return 401 when userId is not set', async () => {
    const req = mockRequest({ user: undefined });
    const res = mockResponse();

    await controller.getUnreadCountByType(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should return empty object when employee does not exist', async () => {
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);
    const req = mockRequest({ user: { id: 'user-1' } });
    const res = mockResponse();

    await controller.getUnreadCountByType(req, res, mockNext);

    expect(res.json).toHaveBeenCalledWith({ success: true, data: {} });
  });

  it('should return counts grouped by type from service', async () => {
    const counts = { TASK: 2, EVALUATION: 1 };
    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: 'emp-1' });
    mockedService.getUnreadCountByType.mockResolvedValue(counts);

    const req = mockRequest({ user: { id: 'user-1' } });
    const res = mockResponse();

    await controller.getUnreadCountByType(req, res, mockNext);

    expect(mockedService.getUnreadCountByType).toHaveBeenCalledWith('emp-1');
    expect(res.json).toHaveBeenCalledWith({ success: true, data: counts });
  });
});
