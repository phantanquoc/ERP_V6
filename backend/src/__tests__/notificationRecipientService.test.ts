jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    department: {
      findMany: jest.fn(),
    },
    subDepartment: {
      findMany: jest.fn(),
    },
    employee: {
      findMany: jest.fn(),
    },
  },
}));

import prisma from '@config/database';
import notificationRecipientService from '@services/notificationRecipientService';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => {
  jest.clearAllMocks();
  (mockedPrisma.department.findMany as jest.Mock).mockResolvedValue([]);
  (mockedPrisma.subDepartment.findMany as jest.Mock).mockResolvedValue([]);
});

describe('notificationRecipientService.resolveEmployeeIds', () => {
  it('returns empty array when no routing criteria are provided', async () => {
    await expect(notificationRecipientService.resolveEmployeeIds({})).resolves.toEqual([]);
    expect(mockedPrisma.employee.findMany).not.toHaveBeenCalled();
  });

  it('resolves recipients from roles, department codes, and sub-department codes', async () => {
    (mockedPrisma.department.findMany as jest.Mock).mockResolvedValue([{ id: 'dept-purchasing' }]);
    (mockedPrisma.subDepartment.findMany as jest.Mock).mockResolvedValue([{ id: 'sub-warehouse' }]);
    (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([
      { id: 'emp-1', userId: 'user-1' },
      { id: 'emp-2', userId: 'user-2' },
    ]);

    const recipients = await notificationRecipientService.resolveEmployeeIds({
      roles: ['ADMIN'],
      departmentCodes: ['DEPT_PURCHASING'],
      subDepartmentCodes: ['SUBDEPT_PRODUCTION_WAREHOUSE'],
    });

    expect(recipients).toEqual(['emp-1', 'emp-2']);
    expect(mockedPrisma.department.findMany).toHaveBeenCalledWith({
      where: { code: { in: ['DEPT_PURCHASING'] } },
      select: { id: true },
    });
    expect(mockedPrisma.subDepartment.findMany).toHaveBeenCalledWith({
      where: { code: { in: ['SUBDEPT_PRODUCTION_WAREHOUSE'] } },
      select: { id: true },
    });
    expect(mockedPrisma.employee.findMany).toHaveBeenCalledWith({
      where: {
        status: 'ACTIVE',
        user: {
          isActive: true,
        },
        OR: [
          { user: { role: { in: ['ADMIN'] } } },
          { user: { secondaryRole: { in: ['ADMIN'] } } },
          { user: { departmentId: { in: ['dept-purchasing'] } } },
          { user: { secondaryDepartmentId: { in: ['dept-purchasing'] } } },
          { subDepartmentId: { in: ['sub-warehouse'] } },
          { secondarySubDepartmentId: { in: ['sub-warehouse'] } },
          { user: { subDepartmentId: { in: ['sub-warehouse'] } } },
          { user: { secondarySubDepartmentId: { in: ['sub-warehouse'] } } },
        ],
      },
      select: {
        id: true,
        userId: true,
      },
    });
  });

  it('deduplicates recipients and applies exclusion filters', async () => {
    (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([
      { id: 'emp-1', userId: 'user-1' },
      { id: 'emp-1', userId: 'user-1' },
      { id: 'emp-2', userId: 'user-2' },
      { id: 'emp-3', userId: 'user-3' },
    ]);

    const recipients = await notificationRecipientService.resolveEmployeeIds({
      employeeIds: ['emp-1'],
      userIds: ['user-2', 'user-3'],
      excludeEmployeeIds: ['emp-2'],
      excludeUserIds: ['user-3'],
    });

    expect(recipients).toEqual(['emp-1']);
  });
});
