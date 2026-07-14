jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    process: {
      findUnique: jest.fn(),
    },
    productionProcess: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import prisma from '@config/database';
import productionProcessService from '@services/productionProcessService';
import { ValidationError } from '@utils/errors';

const mockedPrisma = prisma as unknown as {
  process: { findUnique: jest.Mock };
  productionProcess: { findFirst: jest.Mock; create: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedPrisma.productionProcess.findFirst.mockResolvedValue(null);
});

const basePayload = {
  processId: 'template-1',
  msnv: 'NV0001',
  tenNhanVien: 'Nguyễn A',
  flowchart: { sections: [] },
} as any;

describe('createProductionProcess — Sản xuất invariant', () => {
  it('rejects a template whose loaiQuyTrinh is "Bảo dưỡng"', async () => {
    mockedPrisma.process.findUnique.mockResolvedValue({
      id: 'template-1',
      tenQuyTrinh: 'Bảo dưỡng máy sấy',
      loaiQuyTrinh: 'Bảo dưỡng',
      flowchart: null,
    });

    await expect(
      productionProcessService.createProductionProcess(basePayload)
    ).rejects.toMatchObject({
      constructor: ValidationError,
      message: expect.stringContaining('Sản xuất'),
    });
    expect(mockedPrisma.productionProcess.create).not.toHaveBeenCalled();
  });

  it('accepts a template whose loaiQuyTrinh is "Sản xuất"', async () => {
    mockedPrisma.process.findUnique.mockResolvedValue({
      id: 'template-1',
      tenQuyTrinh: 'Sấy khô mít',
      loaiQuyTrinh: 'Sản xuất',
      flowchart: null,
    });
    mockedPrisma.productionProcess.create.mockResolvedValue({
      id: 'pp-1',
      maQuyTrinhSanXuat: 'QTSX-001',
    });

    await expect(
      productionProcessService.createProductionProcess(basePayload)
    ).resolves.toEqual(expect.objectContaining({ id: 'pp-1' }));
    expect(mockedPrisma.productionProcess.create).toHaveBeenCalled();
  });
});
