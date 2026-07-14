jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    processType: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    process: {
      count: jest.fn(),
    },
  },
}));

import prisma from '@config/database';
import { ProcessTypeService } from '@services/processTypeService';
import { ValidationError, ConflictError, NotFoundError } from '@utils/errors';

const service = new ProcessTypeService();
const mockedPrisma = prisma as unknown as {
  processType: {
    findMany: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  process: { count: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createProcessType', () => {
  it('slugifies a Vietnamese name into a PROCTYPE_ code', async () => {
    mockedPrisma.processType.findFirst.mockResolvedValue(null);
    mockedPrisma.processType.create.mockImplementation(({ data }: any) =>
      Promise.resolve({ id: 'new-id', ...data })
    );

    const result = await service.createProcessType({ name: 'Kiểm định chất lượng' });

    expect(mockedPrisma.processType.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: 'PROCTYPE_KIEM_DINH_CHAT_LUONG',
        name: 'Kiểm định chất lượng',
        thuTu: 0,
        kichHoat: true,
        macDinhHeThong: false,
      }),
    });
    expect(result.code).toBe('PROCTYPE_KIEM_DINH_CHAT_LUONG');
  });

  it('throws ConflictError when name already exists', async () => {
    mockedPrisma.processType.findFirst.mockResolvedValue({
      id: 'existing',
      code: 'PROCTYPE_SAN_XUAT',
      name: 'Sản xuất',
    });

    await expect(
      service.createProcessType({ name: 'Sản xuất' })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(mockedPrisma.processType.create).not.toHaveBeenCalled();
  });
});

describe('updateProcessType', () => {
  it('rejects renaming a macDinhHeThong=true row', async () => {
    mockedPrisma.processType.findUnique.mockResolvedValue({
      id: 'sys-1',
      code: 'PROCTYPE_SAN_XUAT',
      name: 'Sản xuất',
      macDinhHeThong: true,
    });

    await expect(
      service.updateProcessType('sys-1', { name: 'Sản xuất mới' })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(mockedPrisma.processType.update).not.toHaveBeenCalled();
  });

  it('allows toggling kichHoat on a macDinhHeThong=true row', async () => {
    mockedPrisma.processType.findUnique.mockResolvedValue({
      id: 'sys-1',
      code: 'PROCTYPE_SAN_XUAT',
      name: 'Sản xuất',
      macDinhHeThong: true,
    });
    mockedPrisma.processType.update.mockResolvedValue({
      id: 'sys-1',
      code: 'PROCTYPE_SAN_XUAT',
      name: 'Sản xuất',
      macDinhHeThong: true,
      kichHoat: false,
    });

    const result = await service.updateProcessType('sys-1', { kichHoat: false });

    expect(mockedPrisma.processType.update).toHaveBeenCalledWith({
      where: { id: 'sys-1' },
      data: { kichHoat: false },
    });
    expect(result.kichHoat).toBe(false);
  });

  it('throws NotFoundError when the row is missing', async () => {
    mockedPrisma.processType.findUnique.mockResolvedValue(null);

    await expect(
      service.updateProcessType('missing', { thuTu: 5 })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe('deleteProcessType', () => {
  it('rejects deleting a macDinhHeThong=true row', async () => {
    mockedPrisma.processType.findUnique.mockResolvedValue({
      id: 'sys-1',
      name: 'Sản xuất',
      macDinhHeThong: true,
    });

    await expect(service.deleteProcessType('sys-1')).rejects.toBeInstanceOf(ValidationError);
    expect(mockedPrisma.processType.delete).not.toHaveBeenCalled();
  });

  it('rejects deleting a custom row referenced by a Process (with count in message)', async () => {
    mockedPrisma.processType.findUnique.mockResolvedValue({
      id: 'custom-1',
      name: 'Kiểm định',
      macDinhHeThong: false,
    });
    mockedPrisma.process.count.mockResolvedValue(3);

    await expect(service.deleteProcessType('custom-1')).rejects.toMatchObject({
      constructor: ConflictError,
      message: expect.stringContaining('3'),
    });
    expect(mockedPrisma.processType.delete).not.toHaveBeenCalled();
  });

  it('deletes an unreferenced custom row', async () => {
    mockedPrisma.processType.findUnique.mockResolvedValue({
      id: 'custom-2',
      name: 'Kiểm định',
      macDinhHeThong: false,
    });
    mockedPrisma.process.count.mockResolvedValue(0);
    mockedPrisma.processType.delete.mockResolvedValue({});

    await expect(service.deleteProcessType('custom-2')).resolves.toBeUndefined();
    expect(mockedPrisma.processType.delete).toHaveBeenCalledWith({ where: { id: 'custom-2' } });
  });
});
