process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    leaveRequest: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: {
    getConfiguredRecipientEmployeeIds: jest.fn(),
    createLeaveRequestNotification: jest.fn(),
  },
}));

import prisma from '@config/database';
import leaveRequestService from '@services/leaveRequestService';
import notificationService from '@services/notificationService';
import { NotificationRoutingEvent } from '@types';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedNotificationService = notificationService as jest.Mocked<typeof notificationService>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('leaveRequestService.createLeaveRequest routing', () => {
  it('routes new leave requests through quality-personnel fallback', async () => {
    (mockedPrisma.leaveRequest.findFirst as jest.Mock).mockResolvedValue(null);
    (mockedPrisma.leaveRequest.create as jest.Mock).mockResolvedValue({
      id: 'leave-1',
      code: 'NP-001',
      leaveType: 'ANNUAL',
      employeeId: 'emp-1',
      employee: {
        user: {
          firstName: 'Nguyễn',
          lastName: 'An',
          email: 'an@example.com',
        },
      },
    });
    (mockedNotificationService.getConfiguredRecipientEmployeeIds as jest.Mock).mockResolvedValue(['quality-1']);

    await leaveRequestService.createLeaveRequest({
      employeeId: 'emp-1',
      leaveType: 'ANNUAL',
      startDate: '2026-04-20',
      endDate: '2026-04-20',
      startTime: '08:00',
      endTime: '17:00',
      reason: 'Nghỉ phép',
    });

    expect(mockedNotificationService.getConfiguredRecipientEmployeeIds).toHaveBeenCalledWith(
      NotificationRoutingEvent.LEAVE_REQUEST_CREATED,
      {
        subDepartmentCodes: ['SUBDEPT_QUALITY_PERSONNEL'],
      }
    );
    expect(mockedNotificationService.createLeaveRequestNotification).toHaveBeenCalledWith(
      ['quality-1'],
      'Nguyễn An',
      'nghỉ phép năm',
      'leave-1'
    );
  });
});
