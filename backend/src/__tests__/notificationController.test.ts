jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    employee: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: {
    markAsReadForEmployee: jest.fn(),
    deleteNotificationForEmployee: jest.fn(),
  },
}));

import prisma from '@config/database';
import notificationService from '@services/notificationService';
import notificationController from '@controllers/notificationController';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedNotificationService = notificationService as jest.Mocked<typeof notificationService>;

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

describe('NotificationController.markAsRead', () => {
  it('returns 401 for unauthenticated requests', async () => {
    const req = { params: { notificationId: 'notif-1' } } as any;
    const res = mockResponse();

    await notificationController.markAsRead(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockedNotificationService.markAsReadForEmployee).not.toHaveBeenCalled();
  });

  it('passes employee.id into markAsReadForEmployee', async () => {
    const req = {
      params: { notificationId: 'notif-1' },
      user: { id: 'user-1' },
    } as any;
    const res = mockResponse();
    const notification = { id: 'notif-1', isRead: true };

    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: 'emp-1' });
    (mockedNotificationService.markAsReadForEmployee as jest.Mock).mockResolvedValue(notification);

    await notificationController.markAsRead(req, res, mockNext);

    expect(mockedNotificationService.markAsReadForEmployee).toHaveBeenCalledWith('notif-1', 'emp-1');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: notification,
    });
  });

  it('returns 404 when authenticated user has no employee record', async () => {
    const req = {
      params: { notificationId: 'notif-1' },
      user: { id: 'user-1' },
    } as any;
    const res = mockResponse();

    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

    await notificationController.markAsRead(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Employee not found',
    });
    expect(mockedNotificationService.markAsReadForEmployee).not.toHaveBeenCalled();
  });
});

describe('NotificationController.deleteNotification', () => {
  it('returns 401 for unauthenticated requests', async () => {
    const req = { params: { notificationId: 'notif-1' } } as any;
    const res = mockResponse();

    await notificationController.deleteNotification(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockedNotificationService.deleteNotificationForEmployee).not.toHaveBeenCalled();
  });

  it('returns 404 when user has no employee record', async () => {
    const req = {
      params: { notificationId: 'notif-1' },
      user: { id: 'user-1' },
    } as any;
    const res = mockResponse();

    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue(null);

    await notificationController.deleteNotification(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Employee not found',
    });
    expect(mockedNotificationService.deleteNotificationForEmployee).not.toHaveBeenCalled();
  });

  it('passes employee.id into deleteNotificationForEmployee and returns success', async () => {
    const req = {
      params: { notificationId: 'notif-1' },
      user: { id: 'user-1' },
    } as any;
    const res = mockResponse();

    (mockedPrisma.employee.findUnique as jest.Mock).mockResolvedValue({ id: 'emp-1' });
    (mockedNotificationService.deleteNotificationForEmployee as jest.Mock).mockResolvedValue(undefined);

    await notificationController.deleteNotification(req, res, mockNext);

    expect(mockedNotificationService.deleteNotificationForEmployee).toHaveBeenCalledWith('notif-1', 'emp-1');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Notification deleted',
    });
  });
});
