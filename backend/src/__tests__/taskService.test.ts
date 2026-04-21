process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';

jest.mock('@config/database', () => ({
  __esModule: true,
    default: {
      $transaction: jest.fn(),
      task: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    employee: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: {
    createTaskNotifications: jest.fn(),
    createAdminTaskNotification: jest.fn(),
    createTaskEvaluationNotifications: jest.fn(),
    sendPushNotifications: jest.fn(),
  },
}));

import prisma from '@config/database';
import taskService from '@services/taskService';
import notificationService from '@services/notificationService';

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedNotificationService = notificationService as jest.Mocked<typeof notificationService>;

const baseTask = {
  id: 'task-1',
  nguoiGiaoId: 'user-giao',
  nguoiNhanIds: ['user-a', 'user-b'],
  noiDung: 'Kiểm tra mẫu',
  ghiChu: null,
  files: [],
  mucDoUuTien: 'CAO',
  trangThaiTiepNhan: {},
  thoiHanHoanThanh: new Date('2026-05-20T00:00:00.000Z'),
  ngayGiao: new Date('2026-04-21T00:00:00.000Z'),
  diemDanhGia: null,
  noiDungDanhGia: null,
} as any;

beforeEach(() => {
  jest.clearAllMocks();
  (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (callback: (tx: typeof mockedPrisma) => Promise<unknown>) => callback(mockedPrisma));
});

const mockPopulateTaskQueries = () => {
  (mockedPrisma.user.findUnique as jest.Mock)
    .mockResolvedValueOnce({ firstName: 'Nguyễn', lastName: 'A' })
    .mockResolvedValueOnce({
      id: 'user-giao',
      firstName: 'Người',
      lastName: 'Giao',
      employees: { employeeCode: 'NV001' },
      departmentId: 'd1',
    });
  (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue([
    {
      id: 'user-a',
      firstName: 'User',
      lastName: 'A',
      employees: { employeeCode: 'NV002' },
      departmentId: 'd1',
    },
    {
      id: 'user-b',
      firstName: 'User',
      lastName: 'B',
      employees: { employeeCode: 'NV003' },
      departmentId: 'd1',
    },
  ]);
};

describe('taskService.evaluateTask notification integration', () => {
  it('fans out evaluation notifications with recipient employee ids, task title, evaluator name, and score', async () => {
    (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue(baseTask);
    (mockedPrisma.task.update as jest.Mock).mockResolvedValue({
      ...baseTask,
      diemDanhGia: 95,
      noiDungDanhGia: 'Tốt',
    });
    (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([{ id: 'emp-1' }, { id: 'emp-2' }]);
    mockPopulateTaskQueries();

    await taskService.evaluateTask('task-1', 'user-giao', { diemDanhGia: 95, noiDungDanhGia: 'Tốt' });

    expect(mockedNotificationService.createTaskEvaluationNotifications).toHaveBeenCalledWith(
      ['emp-1', 'emp-2'],
      'task-1',
      'Kiểm tra mẫu',
      'Nguyễn A',
      95,
      {
        dbClient: mockedPrisma,
        sendPush: false,
      }
    );
    expect(mockedNotificationService.sendPushNotifications).toHaveBeenCalledWith(
      ['emp-1', 'emp-2'],
      'Nhiệm vụ đã được đánh giá',
      expect.stringContaining('95/100'),
      'TASK_EVALUATED'
    );
  });

  it('does not call createTaskEvaluationNotifications when no recipient employees are found', async () => {
    (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue(baseTask);
    (mockedPrisma.task.update as jest.Mock).mockResolvedValue({
      ...baseTask,
      diemDanhGia: 88,
    });
    (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([]);
    mockPopulateTaskQueries();

    await taskService.evaluateTask('task-1', 'user-giao', { diemDanhGia: 88 });

    expect(mockedNotificationService.createTaskEvaluationNotifications).not.toHaveBeenCalled();
    expect(mockedNotificationService.sendPushNotifications).not.toHaveBeenCalled();
  });

  it('rolls back the evaluation flow when notification persistence fails', async () => {
    (mockedPrisma.task.findUnique as jest.Mock).mockResolvedValue(baseTask);
    (mockedPrisma.task.update as jest.Mock).mockResolvedValue({
      ...baseTask,
      diemDanhGia: 70,
    });
    (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([{ id: 'emp-1' }]);
    (mockedNotificationService.createTaskEvaluationNotifications as jest.Mock).mockRejectedValue(new Error('notification write failed'));
    mockPopulateTaskQueries();

    await expect(taskService.evaluateTask('task-1', 'user-giao', { diemDanhGia: 70 }))
      .rejects
      .toThrow('notification write failed');
    expect(mockedNotificationService.sendPushNotifications).not.toHaveBeenCalled();
  });
});

describe('taskService.createTask admin notification routing', () => {
  it('sends admin-visible task notifications with recipient summary', async () => {
    (mockedPrisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-giao',
      firstName: 'Người',
      lastName: 'Giao',
      employees: { employeeCode: 'NV001' },
    });
    (mockedPrisma.employee.findMany as jest.Mock).mockResolvedValue([
      { id: 'emp-1', userId: 'user-a' },
      { id: 'emp-2', userId: 'user-b' },
    ]);
    (mockedPrisma.task.create as jest.Mock).mockResolvedValue({
      id: 'task-new',
      nguoiGiaoId: 'user-giao',
      nguoiNhanIds: ['user-a', 'user-b'],
      noiDung: 'Soạn báo cáo tuần',
      ghiChu: null,
      files: [],
      mucDoUuTien: 'CAO',
      trangThaiTiepNhan: { 'user-a': 'CHUA_TIEP_NHAN', 'user-b': 'CHUA_TIEP_NHAN' },
      thoiHanHoanThanh: new Date('2026-05-20T00:00:00.000Z'),
      ngayGiao: new Date('2026-04-21T00:00:00.000Z'),
    });
    (mockedPrisma.user.findMany as jest.Mock).mockResolvedValue([
      { firstName: 'User', lastName: 'A' },
      { firstName: 'User', lastName: 'B' },
    ]);

    await taskService.createTask(
      {
        nguoiNhan: ['emp-1', 'emp-2'],
        noiDung: 'Soạn báo cáo tuần',
        thoiHanHoanThanh: '2026-05-20',
        mucDoUuTien: 'CAO',
      } as any,
      'user-giao'
    );

    expect(mockedNotificationService.createAdminTaskNotification).toHaveBeenCalledWith(
      'Soạn báo cáo tuần',
      'Người Giao',
      'task-new',
      'user-giao',
      'User A, User B'
    );
  });
});
