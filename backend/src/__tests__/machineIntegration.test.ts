jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { notify: jest.fn().mockResolvedValue(undefined) },
}));

const mockPrisma: any = {
  $transaction: jest.fn((arg: unknown): unknown => {
    if (typeof arg === 'function') return (arg as (tx: any) => unknown)(mockPrisma);
    return Promise.all(arg as Promise<unknown>[]);
  }),
  machineSystem: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  machineSystemDetail: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  machineStatusLog: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  faultRecord: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  faultTemplate: {
    findUnique: jest.fn(),
  },
  repairRequest: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  repairRequestItem: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  systemOperation: {
    findMany: jest.fn(),
  },
  maintenanceRecord: {
    findMany: jest.fn(),
  },
  acceptanceHandover: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  acceptanceHandoverItem: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.mock('@config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

import machineSystemService from '@services/machineSystemService';
import faultRecordService from '@services/faultRecordService';
import { MachineStatus } from '@prisma/client';
import { NotFoundError, ValidationError } from '@utils/errors';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MachineSystemService — getSummary', () => {
  it('returns summary with recent faults, repairs, and status logs', async () => {
    mockPrisma.machineSystem.findUnique.mockResolvedValue({ id: 'sys-1', maHeThong: 'HT001' });
    mockPrisma.faultRecord.findMany.mockResolvedValue([{ id: 'f1', maLoi: 'L001' }]);
    mockPrisma.repairRequestItem.findMany.mockResolvedValue([{ id: 'r1', noiDungLoi: 'Hỏng bơm' }]);
    mockPrisma.acceptanceHandoverItem.findMany.mockResolvedValue([]);
    mockPrisma.systemOperation.findMany.mockResolvedValue([]);
    mockPrisma.maintenanceRecord.findMany.mockResolvedValue([]);
    mockPrisma.machineStatusLog.findMany.mockResolvedValue([{ id: 's1', trangThaiMoi: MachineStatus.BAO_TRI }]);

    const result = await machineSystemService.getSummary('sys-1');

    expect(result.machine).toEqual({ id: 'sys-1', maHeThong: 'HT001' });
    expect(result.faultRecords).toHaveLength(1);
    expect(result.repairItems).toHaveLength(1);
    expect(result.statusLogs).toHaveLength(1);
  });

  it('throws NotFoundError when system does not exist', async () => {
    mockPrisma.machineSystem.findUnique.mockResolvedValue(null);

    await expect(machineSystemService.getSummary('no-sys')).rejects.toThrow(NotFoundError);
  });
});

describe('MachineSystemService — updateStatus', () => {
  it('throws ValidationError when new status equals current status', async () => {
    mockPrisma.machineSystem.findUnique.mockResolvedValue({
      id: 'sys-1',
      trangThai: MachineStatus.HOAT_DONG,
    });

    await expect(
      machineSystemService.updateStatus('sys-1', MachineStatus.HOAT_DONG, 'same status', 'Nguyen A'),
    ).rejects.toThrow(ValidationError);
  });

  it('throws ValidationError when nguyenNhan is empty', async () => {
    mockPrisma.machineSystem.findUnique.mockResolvedValue({
      id: 'sys-1',
      trangThai: MachineStatus.HOAT_DONG,
    });

    await expect(
      machineSystemService.updateStatus('sys-1', MachineStatus.BAO_TRI, '', 'Nguyen A'),
    ).rejects.toThrow(ValidationError);
  });

  it('updates trangThai and creates status log in transaction', async () => {
    mockPrisma.machineSystem.findUnique.mockResolvedValue({
      id: 'sys-1',
      trangThai: MachineStatus.HOAT_DONG,
    });
    const updated = { id: 'sys-1', trangThai: MachineStatus.BAO_TRI };
    mockPrisma.machineSystem.update.mockResolvedValue(updated);
    mockPrisma.machineStatusLog.create.mockResolvedValue({ id: 'log-1' });

    const result = await machineSystemService.updateStatus(
      'sys-1', MachineStatus.BAO_TRI, 'Bảo trì định kỳ', 'Nguyen A',
    );

    expect(result).toEqual(updated);
    expect(mockPrisma.machineStatusLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          machineSystemId: 'sys-1',
          trangThaiCu: MachineStatus.HOAT_DONG,
          trangThaiMoi: MachineStatus.BAO_TRI,
          nguyenNhan: 'Bảo trì định kỳ',
        }),
      }),
    );
  });
});

describe('FaultRecordService — machineSystemId support', () => {
  it('createFaultRecord passes machineSystemId through resolveMachineContext', async () => {
    const ms = { id: 'sys-1', maHeThong: 'HT001', tenHeThong: 'Hệ thống A' };
    mockPrisma.machineSystem.findUnique.mockResolvedValue(ms);
    mockPrisma.machineSystemDetail.findUnique.mockResolvedValue(null);
    const created = { id: 'fr-1', maLoi: 'LI-2026-001', machineSystemId: 'sys-1' };
    mockPrisma.faultRecord.create.mockResolvedValue(created);

    const result = await faultRecordService.createFaultRecord({
      tenLoi: 'Lỗi bơm',
      moTa: 'Bơm rò rỉ',
      mucDo: 'Nghiêm trọng',
      trangThai: 'Đang theo dõi',
      nguoiPhatHien: 'Nguyễn Văn A',
      ngayPhatHien: new Date('2026-06-01'),
      machineSystemId: 'sys-1',
    });

    expect(result.machineSystemId).toBe('sys-1');
    const createData = mockPrisma.faultRecord.create.mock.calls[0][0].data;
    expect(createData.machineSystemId).toBe('sys-1');
  });

  it('createFaultRecord sets machineSystemId to null when not provided', async () => {
    mockPrisma.faultRecord.create.mockResolvedValue({ id: 'fr-2', maLoi: 'L002', machineSystemId: null });

    await faultRecordService.createFaultRecord({
      tenLoi: 'Lỗi khác',
      moTa: 'Mô tả',
      mucDo: 'Nhẹ',
      trangThai: 'Đang theo dõi',
      nguoiPhatHien: 'Trần B',
      ngayPhatHien: new Date('2026-06-01'),
    });

    const createData = mockPrisma.faultRecord.create.mock.calls[0][0].data;
    expect(createData.machineSystemId).toBeUndefined();
  });

  it('getAllFaultRecords applies machineSystemId filter', async () => {
    mockPrisma.faultRecord.findMany.mockResolvedValue([]);
    mockPrisma.faultRecord.count.mockResolvedValue(0);

    await faultRecordService.getAllFaultRecords(
      1, 10, undefined, undefined, undefined, 'sys-1',
    );

    const whereArg = mockPrisma.faultRecord.findMany.mock.calls[0][0].where;
    expect(whereArg.machineSystemId).toBe('sys-1');
  });
});
