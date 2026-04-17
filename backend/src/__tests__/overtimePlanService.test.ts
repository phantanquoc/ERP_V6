process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    employee: {
      findMany: jest.fn(),
    },
    overtimePlan: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: {
    getConfiguredRecipientEmployeeIds: jest.fn(),
    createNotificationForResolvedEmployee: jest.fn(),
  },
}));

import prisma from '@config/database';
import overtimePlanService from '@services/overtimePlanService';
import notificationService from '@services/notificationService';
import { NotificationRoutingEvent } from '@types';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedNotificationService = notificationService as jest.Mocked<typeof notificationService>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('overtimePlanService.create routing', () => {
  it('routes approval-required notifications through admin fallback', async () => {
    (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-creator',
      firstName: 'Trần',
      lastName: 'Bình',
      employees: { id: 'emp-creator' },
    });
    (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([
      { id: 'emp-1', userId: 'user-1' },
    ]);
    ((mockedPrisma.overtimePlan as any).create as jest.Mock).mockResolvedValue({
      id: 'plan-1',
      nguoiTaoId: 'user-creator',
      nguoiThamGiaIds: ['user-1'],
      noiDung: 'Tăng ca kiểm kho',
    });
    (mockedNotificationService.getConfiguredRecipientEmployeeIds as jest.Mock).mockResolvedValue(['admin-emp']);

    await overtimePlanService.create(
      {
        nguoiThamGia: ['emp-1'],
        noiDung: 'Tăng ca kiểm kho',
        ngayTangCa: '2026-04-20',
        gioBatDau: '18:00',
        gioKetThuc: '21:00',
        mucDoUuTien: 'CAO',
      } as any,
      'user-creator'
    );

    expect(mockedNotificationService.getConfiguredRecipientEmployeeIds).toHaveBeenCalledWith(
      NotificationRoutingEvent.OVERTIME_PLAN_APPROVAL_REQUIRED,
      { roles: ['ADMIN'] }
    );
    expect(mockedNotificationService.createNotificationForResolvedEmployee).toHaveBeenCalledWith(
      'admin-emp',
      expect.objectContaining({
        type: 'OVERTIME_PLAN_APPROVAL',
        title: 'Kế hoạch tăng ca cần phê duyệt',
      })
    );
  });
});
