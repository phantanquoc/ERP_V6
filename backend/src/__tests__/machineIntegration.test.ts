jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { notify: jest.fn().mockResolvedValue(undefined) },
}));

const mockPrisma: any = {
  $transaction: jest.fn((arg: unknown): unknown => {
    if (typeof arg === 'function') return (arg as (tx: any) => unknown)(mockPrisma);
    return Promise.all(arg as Promise<unknown>[]);
  }),
  machine: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  machineSystem: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  faultRecord: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
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
  acceptanceHandover: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  acceptanceHandoverItem: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
};

jest.mock('@config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

import { MachineService } from '@services/machineService';
import machineSystemService from '@services/machineSystemService';
import faultRecordService from '@services/faultRecordService';
import { NotFoundError } from '@utils/errors';

const machineService = new MachineService();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MachineService — filters', () => {
  it('getAllMachines applies machineSystemId filter', async () => {
    mockPrisma.machine.findMany.mockResolvedValue([]);
    mockPrisma.machine.count.mockResolvedValue(0);

    await machineService.getAllMachines(1, 10, { machineSystemId: 'sys-1' });

    const whereArg = mockPrisma.machine.findMany.mock.calls[0][0].where;
    expect(whereArg.machineSystemId).toBe('sys-1');
  });

  it('getAllMachines applies trangThai filter', async () => {
    mockPrisma.machine.findMany.mockResolvedValue([]);
    mockPrisma.machine.count.mockResolvedValue(0);

    await machineService.getAllMachines(1, 10, { trangThai: 'HOAT_DONG' });

    const whereArg = mockPrisma.machine.findMany.mock.calls[0][0].where;
    expect(whereArg.trangThai).toBe('HOAT_DONG');
  });

  it('getAllMachines applies search filter with OR', async () => {
    mockPrisma.machine.findMany.mockResolvedValue([]);
    mockPrisma.machine.count.mockResolvedValue(0);

    await machineService.getAllMachines(1, 10, { search: 'sấy' });

    const whereArg = mockPrisma.machine.findMany.mock.calls[0][0].where;
    expect(whereArg.OR).toHaveLength(2);
    expect(whereArg.OR[0].maMay.contains).toBe('sấy');
  });

  it('getAllMachines returns paginated result', async () => {
    const machines = [{ id: '1', maMay: 'MAY001', tenMay: 'Máy 1' }];
    mockPrisma.machine.findMany.mockResolvedValue(machines);
    mockPrisma.machine.count.mockResolvedValue(25);

    const result = await machineService.getAllMachines(2, 10);

    expect(result.pagination).toEqual({ page: 2, limit: 10, total: 25, totalPages: 3 });
    expect(result.data).toEqual(machines);
    expect(mockPrisma.machine.findMany.mock.calls[0][0].skip).toBe(10);
  });
});

describe('MachineService — getMachineSummary', () => {
  it('returns machine with related faults, repairs, operations', async () => {
    const summary = {
      id: 'machine-1',
      maMay: 'MAY001',
      tenMay: 'Máy sấy 1',
      trangThai: 'HOAT_DONG',
      machineSystem: { id: 'sys-1', maHeThong: 'HT001' },
      faultRecords: [{ id: 'f1', maLoi: 'L001' }],
      repairRequestItems: [{ id: 'r1', noiDungLoi: 'Hỏng bơm' }],
      systemOperations: [{ id: 'o1', loaiVanHanh: 'Kiểm tra' }],
    };
    mockPrisma.machine.findUnique.mockResolvedValue(summary);

    const result = await machineService.getMachineSummary('machine-1');

    expect(result.faultRecords).toHaveLength(1);
    expect(result.repairRequestItems).toHaveLength(1);
    expect(result.systemOperations).toHaveLength(1);
    expect(mockPrisma.machine.findUnique.mock.calls[0][0].include.faultRecords.take).toBe(3);
    expect(mockPrisma.machine.findUnique.mock.calls[0][0].include.repairRequestItems.take).toBe(3);
    expect(mockPrisma.machine.findUnique.mock.calls[0][0].include.systemOperations.take).toBe(5);
  });

  it('throws NotFoundError when machine does not exist', async () => {
    mockPrisma.machine.findUnique.mockResolvedValue(null);

    await expect(machineService.getMachineSummary('nonexist')).rejects.toThrow(NotFoundError);
  });
});

describe('MachineSystemService — getMachinesForSystem', () => {
  it('returns machines with fault and repair counts', async () => {
    mockPrisma.machineSystem.findUnique.mockResolvedValue({ id: 'sys-1', maHeThong: 'HT001' });
    const machines = [
      { id: 'm1', maMay: 'MAY001', _count: { faultRecords: 2, repairRequestItems: 1 } },
      { id: 'm2', maMay: 'MAY002', _count: { faultRecords: 0, repairRequestItems: 0 } },
    ];
    mockPrisma.machine.findMany.mockResolvedValue(machines);

    const result = await machineSystemService.getMachinesForSystem('sys-1');

    expect(result).toHaveLength(2);
    expect(result[0]._count.faultRecords).toBe(2);
    expect(mockPrisma.machine.findMany.mock.calls[0][0].where.machineSystemId).toBe('sys-1');
  });

  it('throws NotFoundError when system does not exist', async () => {
    mockPrisma.machineSystem.findUnique.mockResolvedValue(null);

    await expect(machineSystemService.getMachinesForSystem('no-sys')).rejects.toThrow(NotFoundError);
  });
});

describe('FaultRecordService — machineId support', () => {
  it('createFaultRecord includes machineId in data', async () => {
    mockPrisma.faultRecord.findFirst.mockResolvedValue(null);
    const created = { id: 'fr-1', maLoi: 'L001', machineId: 'machine-1' };
    mockPrisma.faultRecord.create.mockResolvedValue(created);

    const result = await faultRecordService.createFaultRecord({
      tenLoi: 'Lỗi bơm',
      moTa: 'Bơm rò rỉ',
      mucDo: 'Nghiêm trọng',
      trangThai: 'Đang theo dõi',
      nguoiPhatHien: 'Nguyễn Văn A',
      ngayPhatHien: new Date('2026-06-01'),
      machineId: 'machine-1',
    });

    expect(result.machineId).toBe('machine-1');
    const createData = mockPrisma.faultRecord.create.mock.calls[0][0].data;
    expect(createData.machineId).toBe('machine-1');
  });

  it('createFaultRecord sets machineId to null when not provided', async () => {
    mockPrisma.faultRecord.findFirst.mockResolvedValue(null);
    mockPrisma.faultRecord.create.mockResolvedValue({ id: 'fr-2', maLoi: 'L002', machineId: null });

    await faultRecordService.createFaultRecord({
      tenLoi: 'Lỗi khác',
      moTa: 'Mô tả',
      mucDo: 'Nhẹ',
      trangThai: 'Đang theo dõi',
      nguoiPhatHien: 'Trần B',
      ngayPhatHien: new Date('2026-06-01'),
    });

    const createData = mockPrisma.faultRecord.create.mock.calls[0][0].data;
    expect(createData.machineId).toBeNull();
  });

  it('getAllFaultRecords applies machineId filter', async () => {
    mockPrisma.faultRecord.findMany.mockResolvedValue([]);
    mockPrisma.faultRecord.count.mockResolvedValue(0);

    await faultRecordService.getAllFaultRecords(
      1, 10, undefined, undefined, undefined, undefined, undefined, undefined, 'machine-1'
    );

    const whereArg = mockPrisma.faultRecord.findMany.mock.calls[0][0].where;
    expect(whereArg.machineId).toBe('machine-1');
  });
});
