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

jest.mock('@services/notificationRecipientService', () => ({
  __esModule: true,
  default: {
    resolveEmployeeIds: jest.fn(),
  },
}));

jest.mock('@services/systemSettingsService', () => ({
  __esModule: true,
  default: {
    getSettings: jest.fn(),
  },
}));

import notificationService from '@services/notificationService';
import notificationRecipientService from '@services/notificationRecipientService';
import systemSettingsService from '@services/systemSettingsService';
import { DEFAULT_NOTIFICATION_SETTINGS, NotificationRoutingEvent, NotificationRoutingTargetType } from '@types';

const mockedRecipientService = notificationRecipientService as jest.Mocked<typeof notificationRecipientService>;
const mockedSystemSettingsService = systemSettingsService as jest.Mocked<typeof systemSettingsService>;

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

describe('notificationService.getConfiguredRecipientEmployeeIds', () => {
  it('returns empty array when a routing rule is disabled', async () => {
    mockedSystemSettingsService.getSettings.mockResolvedValue({
      id: 'settings-1',
      activeTheme: 'DEFAULT',
      slogan: 'ERP',
      notificationSettings: {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        routingRules: {
          ...DEFAULT_NOTIFICATION_SETTINGS.routingRules,
          [NotificationRoutingEvent.TASK_ADMIN_VISIBLE]: {
            ...DEFAULT_NOTIFICATION_SETTINGS.routingRules[NotificationRoutingEvent.TASK_ADMIN_VISIBLE],
            enabled: false,
          },
        },
      },
      updatedAt: new Date('2026-04-17T00:00:00.000Z'),
      updatedBy: null,
    });

    await expect(
      notificationService.getConfiguredRecipientEmployeeIds(NotificationRoutingEvent.TASK_ADMIN_VISIBLE, {
        roles: ['ADMIN'],
      })
    ).resolves.toEqual([]);

    expect(mockedRecipientService.resolveEmployeeIds).not.toHaveBeenCalled();
  });

  it('falls back to producer query when the routing rule is missing', async () => {
    mockedSystemSettingsService.getSettings.mockResolvedValue({
      id: 'settings-1',
      activeTheme: 'DEFAULT',
      slogan: 'ERP',
      notificationSettings: {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        routingRules: {} as typeof DEFAULT_NOTIFICATION_SETTINGS.routingRules,
      },
      updatedAt: new Date('2026-04-17T00:00:00.000Z'),
      updatedBy: null,
    });
    mockedRecipientService.resolveEmployeeIds.mockResolvedValue(['emp-1']);

    const result = await notificationService.getConfiguredRecipientEmployeeIds(
      NotificationRoutingEvent.PURCHASE_REQUEST_CREATED,
      {
        roles: ['ADMIN'],
        departmentCodes: ['DEPT_PURCHASING'],
        excludeUserIds: ['actor-1'],
      }
    );

    expect(result).toEqual(['emp-1']);
    expect(mockedRecipientService.resolveEmployeeIds).toHaveBeenCalledWith({
      roles: ['ADMIN'],
      departmentCodes: ['DEPT_PURCHASING'],
      excludeUserIds: ['actor-1'],
    });
  });

  it('maps configured recipients and preserves exclusions', async () => {
    mockedSystemSettingsService.getSettings.mockResolvedValue({
      id: 'settings-1',
      activeTheme: 'DEFAULT',
      slogan: 'ERP',
      notificationSettings: {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        routingRules: {
          ...DEFAULT_NOTIFICATION_SETTINGS.routingRules,
          [NotificationRoutingEvent.PURCHASE_REQUEST_CREATED]: {
            eventKey: NotificationRoutingEvent.PURCHASE_REQUEST_CREATED,
            enabled: true,
            recipients: [
              { id: 'role-admin', type: NotificationRoutingTargetType.ROLE, value: 'ADMIN', label: 'Admin' },
              { id: 'dept-purchasing', type: NotificationRoutingTargetType.DEPARTMENT, value: 'DEPT_PURCHASING', label: 'Phòng mua hàng' },
              { id: 'sub-warehouse', type: NotificationRoutingTargetType.SUB_DEPARTMENT, value: 'SUBDEPT_PRODUCTION_WAREHOUSE', label: 'Kho sản xuất' },
            ],
          },
        },
      },
      updatedAt: new Date('2026-04-17T00:00:00.000Z'),
      updatedBy: null,
    });
    mockedRecipientService.resolveEmployeeIds.mockResolvedValue(['emp-2', 'emp-3']);

    await notificationService.getConfiguredRecipientEmployeeIds(
      NotificationRoutingEvent.PURCHASE_REQUEST_CREATED,
      {
        roles: ['TEAM_LEAD'],
        excludeUserIds: ['actor-1'],
        excludeEmployeeIds: ['emp-actor'],
      }
    );

    expect(mockedRecipientService.resolveEmployeeIds).toHaveBeenCalledWith({
      roles: ['ADMIN'],
      departmentCodes: ['DEPT_PURCHASING'],
      subDepartmentCodes: ['SUBDEPT_PRODUCTION_WAREHOUSE'],
      employeeIds: [],
      userIds: [],
      excludeUserIds: ['actor-1'],
      excludeEmployeeIds: ['emp-actor'],
    });
  });

  it('maps direct user recipients to userIds', async () => {
    mockedSystemSettingsService.getSettings.mockResolvedValue({
      id: 'settings-1',
      activeTheme: 'DEFAULT',
      slogan: 'ERP',
      notificationSettings: {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        routingRules: {
          ...DEFAULT_NOTIFICATION_SETTINGS.routingRules,
          [NotificationRoutingEvent.PURCHASE_REQUEST_CREATED]: {
            eventKey: NotificationRoutingEvent.PURCHASE_REQUEST_CREATED,
            enabled: true,
            recipients: [
              { id: 'user-jane', type: NotificationRoutingTargetType.USER, value: 'user-123', label: 'Jane Doe' },
            ],
          },
        },
      },
      updatedAt: new Date('2026-04-17T00:00:00.000Z'),
      updatedBy: null,
    });
    mockedRecipientService.resolveEmployeeIds.mockResolvedValue(['emp-123']);

    await notificationService.getConfiguredRecipientEmployeeIds(
      NotificationRoutingEvent.PURCHASE_REQUEST_CREATED,
      {
        excludeEmployeeIds: ['emp-actor'],
        excludeUserIds: ['user-actor'],
      }
    );

    expect(mockedRecipientService.resolveEmployeeIds).toHaveBeenCalledWith({
      roles: [],
      departmentCodes: [],
      subDepartmentCodes: [],
      employeeIds: [],
      userIds: ['user-123'],
      excludeEmployeeIds: ['emp-actor'],
      excludeUserIds: ['user-actor'],
    });
  });
});
