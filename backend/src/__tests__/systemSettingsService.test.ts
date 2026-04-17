jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    systemSettings: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import prisma from '@config/database';
import systemSettingsService from '@services/systemSettingsService';
import { NotificationRoutingEvent } from '@types';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('systemSettingsService', () => {
  it('creates default settings with routing rules when no settings row exists', async () => {
    (mockedPrisma.systemSettings.findFirst as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.systemSettings.create as jest.Mock).mockImplementation(async ({ data }) => ({
      id: 'settings-1',
      activeTheme: data.activeTheme,
      slogan: data.slogan,
      notificationSettings: data.notificationSettings,
      updatedAt: new Date('2026-04-17T00:00:00.000Z'),
      updatedBy: null,
    }));

    const result = await systemSettingsService.getSettings();

    expect(result.notificationSettings.routingRules[NotificationRoutingEvent.PURCHASE_REQUEST_CREATED]).toMatchObject({
      eventKey: NotificationRoutingEvent.PURCHASE_REQUEST_CREATED,
      enabled: true,
    });
    expect(result.notificationSettings.routingRules[NotificationRoutingEvent.PURCHASE_REQUEST_CREATED].recipients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'department',
          value: 'DEPT_PURCHASING',
        }),
      ])
    );
    expect(result.notificationSettings.routingRules[NotificationRoutingEvent.LEAVE_REQUEST_CREATED].recipients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'SUBDEPT_QUALITY_PERSONNEL',
        }),
      ])
    );
    expect(result.notificationSettings.routingRules[NotificationRoutingEvent.QUOTATION_REQUEST_CREATED].recipients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'ADMIN',
        }),
      ])
    );
    expect(result.notificationSettings.routingRules[NotificationRoutingEvent.ORDER_CREATED].recipients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'ADMIN',
        }),
      ])
    );
  });

  it('normalizes routing rules before persisting updates', async () => {
    (mockedPrisma.systemSettings.findFirst as jest.Mock).mockResolvedValue({
      id: 'settings-1',
      activeTheme: 'DEFAULT',
      slogan: 'ERP',
      notificationSettings: null,
      updatedAt: new Date('2026-04-17T00:00:00.000Z'),
      updatedBy: null,
    });
    (mockedPrisma.systemSettings.update as jest.Mock).mockImplementation(async ({ data }) => ({
      id: 'settings-1',
      activeTheme: 'DEFAULT',
      slogan: 'ERP',
      notificationSettings: data.notificationSettings,
      updatedAt: new Date('2026-04-17T00:05:00.000Z'),
      updatedBy: 'user-1',
    }));

    await systemSettingsService.updateSettings(
      {
        notificationSettings: {
          routingRules: {
            [NotificationRoutingEvent.PURCHASE_REQUEST_CREATED]: {
              eventKey: NotificationRoutingEvent.PURCHASE_REQUEST_CREATED,
              enabled: true,
              recipients: [
                { id: 'blank', type: 'department', value: '', label: '' },
                { id: 'lead', type: 'role', value: 'TEAM_LEAD', label: 'Trưởng nhóm' },
              ],
            },
          } as any,
        },
      },
      'user-1'
    );

    const updatePayload = (mockedPrisma.systemSettings.update as jest.Mock).mock.calls[0][0].data.notificationSettings as any;
    const purchaseRule = updatePayload.routingRules[NotificationRoutingEvent.PURCHASE_REQUEST_CREATED];

    expect(purchaseRule.enabled).toBe(true);
    expect(purchaseRule.recipients).toEqual([
      {
        id: 'lead',
        type: 'role',
        value: 'TEAM_LEAD',
        label: 'Trưởng nhóm',
      },
    ]);
  });

  it('preserves untouched routing rules when patching a single rule', async () => {
    (mockedPrisma.systemSettings.findFirst as jest.Mock).mockResolvedValue({
      id: 'settings-1',
      activeTheme: 'DEFAULT',
      slogan: 'ERP',
      notificationSettings: null,
      updatedAt: new Date('2026-04-17T00:00:00.000Z'),
      updatedBy: null,
    });
    (mockedPrisma.systemSettings.update as jest.Mock).mockImplementation(async ({ data }) => ({
      id: 'settings-1',
      activeTheme: 'DEFAULT',
      slogan: 'ERP',
      notificationSettings: data.notificationSettings,
      updatedAt: new Date('2026-04-17T00:05:00.000Z'),
      updatedBy: 'user-1',
    }));

    await systemSettingsService.updateSettings(
      {
        notificationSettings: {
          routingRules: {
            [NotificationRoutingEvent.TASK_ADMIN_VISIBLE]: {
              eventKey: NotificationRoutingEvent.TASK_ADMIN_VISIBLE,
              enabled: false,
            },
          } as any,
        },
      },
      'user-1'
    );

    const updatePayload = (mockedPrisma.systemSettings.update as jest.Mock).mock.calls[0][0].data.notificationSettings as any;
    expect(updatePayload.routingRules[NotificationRoutingEvent.TASK_ADMIN_VISIBLE].enabled).toBe(false);
    expect(updatePayload.routingRules[NotificationRoutingEvent.TASK_ADMIN_VISIBLE].recipients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: 'ADMIN',
        }),
      ])
    );
    expect(updatePayload.routingRules[NotificationRoutingEvent.PURCHASE_REQUEST_CREATED]).toBeDefined();
  });
});
