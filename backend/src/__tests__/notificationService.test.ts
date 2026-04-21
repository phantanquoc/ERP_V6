process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    notification: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
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
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@services/pushNotificationService', () => ({
  __esModule: true,
  default: {
    sendPushToEmployee: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@services/systemSettingsService', () => ({
  __esModule: true,
  default: {
    getSettings: jest.fn(),
  },
}));

import prisma from '@config/database';
import notificationService from '@services/notificationService';
import pushNotificationService from '@services/pushNotificationService';
import systemSettingsService from '@services/systemSettingsService';
import { DEFAULT_NOTIFICATION_SETTINGS } from '@types';
import { NotFoundError } from '@utils/errors';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedPush = pushNotificationService as jest.Mocked<typeof pushNotificationService>;
const mockedSystemSettingsService = systemSettingsService as jest.Mocked<typeof systemSettingsService>;

const baseNotification = {
  id: 'notif-1',
  employeeId: 'emp-1',
  type: 'TASK',
  title: 'Nhiệm vụ mới',
  message: 'Bạn có nhiệm vụ mới',
  metadata: null,
  period: null,
  evaluationId: null,
  taskId: 'task-1',
  acceptanceHandoverId: null,
  leaveRequestId: null,
  supplyRequestId: null,
  isRead: false,
  createdAt: new Date('2026-04-16T08:00:00.000Z'),
  updatedAt: new Date('2026-04-16T08:00:00.000Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedSystemSettingsService.getSettings.mockResolvedValue({
    id: 'settings-1',
    activeTheme: 'DEFAULT',
    slogan: 'ERP',
    notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
    updatedAt: new Date('2026-04-17T00:00:00.000Z'),
    updatedBy: null,
  });
});

describe('notificationService.getEmployeeNotifications', () => {
  it('should map legacy notification rows into envelopes', async () => {
    (mockedPrisma.notification.findMany as jest.Mock).mockResolvedValue([
      baseNotification,
      {
        ...baseNotification,
        id: 'notif-2',
        type: 'WORK_PLAN',
        taskId: null,
      },
    ]);

    const result = await notificationService.getEmployeeNotifications('emp-1', 10);

    expect(mockedPrisma.notification.findMany).toHaveBeenCalledWith({
      where: { employeeId: 'emp-1' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    expect(result[0]).toMatchObject({
      id: 'notif-1',
      type: 'TASK',
      eventName: 'task.assigned',
      category: 'TASK',
      entityType: 'task',
      entityId: 'task-1',
      metadata: {
        legacyType: 'TASK',
        taskId: 'task-1',
      },
    });
    expect(result[1]).toMatchObject({
      id: 'notif-2',
      type: 'WORK_PLAN',
      eventName: 'work-plan.created',
      category: 'WORK_PLAN',
    });
  });

  it('should preserve actor and action metadata from stored rows', async () => {
    (mockedPrisma.notification.findMany as jest.Mock).mockResolvedValue([
      {
        ...baseNotification,
        id: 'notif-audit',
        type: 'ORDER',
        metadata: {
          actor: {
            userId: 'user-1',
            employeeId: 'emp-actor',
            name: 'Nguyễn Văn Admin',
          },
          action: {
            type: 'status_changed',
            label: 'Cập nhật trạng thái đơn hàng',
            changedFields: ['trangThaiSanXuat'],
          },
          entity: {
            type: 'order',
            id: 'order-1',
            code: 'DH-203',
          },
        },
      },
    ]);

    const [result] = await notificationService.getEmployeeNotifications('emp-1', 10);

    expect(result.metadata).toMatchObject({
      legacyType: 'ORDER',
      actor: {
        name: 'Nguyễn Văn Admin',
      },
      action: {
        label: 'Cập nhật trạng thái đơn hàng',
        changedFields: ['trangThaiSanXuat'],
      },
      entity: {
        code: 'DH-203',
      },
    });
  });

  it('should map task evaluation notifications by semantic type instead of title text', async () => {
    (mockedPrisma.notification.findMany as jest.Mock).mockResolvedValue([
      {
        ...baseNotification,
        id: 'notif-3',
        type: 'TASK_EVALUATED',
        title: 'Bản sao nội dung khác',
      },
    ]);

    const [result] = await notificationService.getEmployeeNotifications('emp-1', 10);

    expect(result).toMatchObject({
      id: 'notif-3',
      type: 'TASK_EVALUATED',
      eventName: 'task.evaluated',
      category: 'TASK',
      entityType: 'task',
      entityId: 'task-1',
    });
  });

  it('should map purchase request notifications to purchase events', async () => {
    (mockedPrisma.notification.findMany as jest.Mock).mockResolvedValue([
      {
        ...baseNotification,
        id: 'notif-4',
        type: 'PURCHASE_REQUEST',
        title: 'Yêu cầu mua hàng mới',
        supplyRequestId: 'purchase-1',
      },
      {
        ...baseNotification,
        id: 'notif-5',
        type: 'PURCHASE_REQUEST_COMPLETED',
        title: 'Hàng hóa đã mua về - Chuẩn bị nhập kho',
        supplyRequestId: 'purchase-1',
      },
    ]);

    const [created, completed] = await notificationService.getEmployeeNotifications('emp-1', 10);

    expect(created).toMatchObject({
      type: 'PURCHASE_REQUEST',
      eventName: 'purchase-request.created',
      entityType: 'purchase-request',
      entityId: 'purchase-1',
    });
    expect(completed).toMatchObject({
      type: 'PURCHASE_REQUEST_COMPLETED',
      eventName: 'purchase-request.completed',
      entityType: 'purchase-request',
      entityId: 'purchase-1',
    });
  });

  it('should map repair request notifications to technical events', async () => {
    (mockedPrisma.notification.findMany as jest.Mock).mockResolvedValue([
      {
        ...baseNotification,
        id: 'notif-6',
        type: 'REPAIR_REQUEST',
        title: 'Yêu cầu sửa chữa mới',
      },
    ]);

    const [result] = await notificationService.getEmployeeNotifications('emp-1', 10);

    expect(result).toMatchObject({
      type: 'REPAIR_REQUEST',
      eventName: 'repair-request.created',
      category: 'TECHNICAL',
      entityType: 'repair-request',
    });
  });
});

describe('notificationService.createRepairRequestNotification', () => {
  it('uses the processing route when repair status becomes in progress', async () => {
    const resolveRecipientsSpy = jest
      .spyOn(notificationService as any, 'resolveRecipientEmployeeIdsForEvent')
      .mockResolvedValue(['emp-1']);
    const createNotificationsSpy = jest
      .spyOn(notificationService as any, 'createNotificationsForEmployees')
      .mockResolvedValue(undefined);

    await notificationService.createRepairRequestNotification({
      maYeuCau: 'YC-100',
      tenHeThong: 'Máy nén khí',
      repairRequestId: 10,
      action: 'updated',
      status: 'Đang sửa chữa',
    });

    expect(resolveRecipientsSpy).toHaveBeenCalledWith('repair-request.processing', {
      roles: ['ADMIN'],
      subDepartmentCodes: ['SUBDEPT_QUALITY_PERSONNEL'],
    });
    expect(createNotificationsSpy).toHaveBeenCalledWith(
      ['emp-1'],
      expect.objectContaining({
        type: 'REPAIR_REQUEST',
        title: 'Yêu cầu sửa chữa đã được cập nhật',
        message: expect.stringContaining('Đang sửa chữa'),
      })
    );

    resolveRecipientsSpy.mockRestore();
    createNotificationsSpy.mockRestore();
  });

  it('uses the processing route for intermediate repair statuses', async () => {
    const resolveRecipientsSpy = jest
      .spyOn(notificationService as any, 'resolveRecipientEmployeeIdsForEvent')
      .mockResolvedValue(['emp-1']);
    const createNotificationsSpy = jest
      .spyOn(notificationService as any, 'createNotificationsForEmployees')
      .mockResolvedValue(undefined);

    await notificationService.createRepairRequestNotification({
      maYeuCau: 'YC-101',
      tenHeThong: 'Băng tải',
      repairRequestId: 11,
      action: 'updated',
      status: 'Chờ linh kiện',
    });

    expect(resolveRecipientsSpy).toHaveBeenCalledWith('repair-request.processing', {
      roles: ['ADMIN'],
      subDepartmentCodes: ['SUBDEPT_QUALITY_PERSONNEL'],
    });
    expect(createNotificationsSpy).toHaveBeenCalledWith(
      ['emp-1'],
      expect.objectContaining({
        type: 'REPAIR_REQUEST',
        title: 'Yêu cầu sửa chữa đã được cập nhật',
        message: expect.stringContaining('Chờ linh kiện'),
      })
    );

    resolveRecipientsSpy.mockRestore();
    createNotificationsSpy.mockRestore();
  });
});

describe('notificationService.markAsReadForEmployee', () => {
  it('should scope mark-as-read to the employee owner', async () => {
    (mockedPrisma.notification.findFirst as jest.Mock).mockResolvedValue(baseNotification);
    (mockedPrisma.notification.update as jest.Mock).mockResolvedValue({
      ...baseNotification,
      isRead: true,
      updatedAt: new Date('2026-04-16T08:05:00.000Z'),
    });

    const result = await notificationService.markAsReadForEmployee('notif-1', 'emp-1');

    expect(mockedPrisma.notification.findFirst).toHaveBeenCalledWith({
      where: { id: 'notif-1', employeeId: 'emp-1' },
    });
    expect(mockedPrisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-1' },
      data: { isRead: true },
    });
    expect(result.isRead).toBe(true);
    expect(result.readAt).toBe('2026-04-16T08:05:00.000Z');
  });

  it('should throw when notification does not belong to the employee', async () => {
    (mockedPrisma.notification.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(notificationService.markAsReadForEmployee('notif-1', 'emp-1')).rejects.toThrow(NotFoundError);
  });
});

describe('notificationService.deleteNotificationForEmployee', () => {
  it('should delete only when notification belongs to the employee', async () => {
    (mockedPrisma.notification.findFirst as jest.Mock).mockResolvedValue(baseNotification);
    (mockedPrisma.notification.delete as jest.Mock).mockResolvedValue(baseNotification);

    await notificationService.deleteNotificationForEmployee('notif-1', 'emp-1');

    expect(mockedPrisma.notification.findFirst).toHaveBeenCalledWith({
      where: { id: 'notif-1', employeeId: 'emp-1' },
    });
    expect(mockedPrisma.notification.delete).toHaveBeenCalledWith({
      where: { id: 'notif-1' },
    });
  });

  it('should throw when notification does not belong to the employee', async () => {
    (mockedPrisma.notification.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(notificationService.deleteNotificationForEmployee('notif-1', 'emp-1')).rejects.toThrow(NotFoundError);
    expect(mockedPrisma.notification.delete).not.toHaveBeenCalled();
  });
});

describe('notificationService.createTaskEvaluationNotifications', () => {
  it('should write rows and fan out push notifications through the facade', async () => {
    (mockedPrisma.notification.createMany as jest.Mock).mockResolvedValue({ count: 2 });

    await notificationService.createTaskEvaluationNotifications(
      ['emp-1', 'emp-2'],
      'task-1',
      'Kiểm tra mẫu',
      'Nguyễn Văn A',
      95
    );

    expect(mockedPrisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          employeeId: 'emp-1',
          type: 'TASK_EVALUATED',
          title: 'Nhiệm vụ đã được đánh giá',
          message: expect.stringContaining('Nguyễn Văn A'),
          taskId: 'task-1',
        }),
        expect.objectContaining({
          employeeId: 'emp-2',
          type: 'TASK_EVALUATED',
          title: 'Nhiệm vụ đã được đánh giá',
          message: expect.stringContaining('95/100'),
          taskId: 'task-1',
        }),
      ],
    });
    expect(mockedPush.sendPushToEmployee).toHaveBeenNthCalledWith(
      1,
      'emp-1',
      'Nhiệm vụ đã được đánh giá',
      expect.stringContaining('95/100')
    );
    expect(mockedPush.sendPushToEmployee).toHaveBeenNthCalledWith(
      2,
      'emp-2',
      'Nhiệm vụ đã được đánh giá',
      expect.stringContaining('Nguyễn Văn A')
    );
  });
});

describe('notificationService.sendPushNotifications', () => {
  it('skips push fan-out when the notification type is disabled at runtime', async () => {
    mockedSystemSettingsService.getSettings.mockResolvedValue({
      id: 'settings-1',
      activeTheme: 'DEFAULT',
      slogan: 'ERP',
      notificationSettings: {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        channels: {
          ...DEFAULT_NOTIFICATION_SETTINGS.channels,
          webPushEnabled: false,
        },
      },
      updatedAt: new Date('2026-04-17T00:00:00.000Z'),
      updatedBy: null,
    });

    await notificationService.sendPushNotifications(['emp-1'], 'Test', 'Message', 'TASK_EVALUATED');

    expect(mockedPush.sendPushToEmployee).not.toHaveBeenCalled();
  });
});
