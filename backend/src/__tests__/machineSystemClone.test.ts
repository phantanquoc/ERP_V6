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
import { MachineStatus } from '@prisma/client';
import { ConflictError, NotFoundError } from '@utils/errors';

beforeEach(() => {
  jest.clearAllMocks();
});

// --- Test data factories ---

function makeSourceSystem(details: any[] = []) {
  return {
    id: 'src-sys-1',
    maHeThong: 'SX-001',
    tenHeThong: 'He Thong San Xuat 1',
    khuVuc: 'KV-A',
    viTri: 'VT-01',
    chucNang: 'San xuat',
    loaiHeThong: 'THIET_BI_CHINH',
    maThietBi: 'TB-MAIN-001',
    tenThietBi: 'May say',
    nhiemVu: 'Say trai cay',
    maNguoiThucHien: 'NV-001',
    nguoiThucHien: 'Nguyen A',
    hoatDong: true,
    trangThai: MachineStatus.HOAT_DONG,
    details,
  };
}

function makeDetail(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? 'det-1',
    maChiTiet: overrides.maChiTiet ?? 'TB-001',
    tenChiTiet: overrides.tenChiTiet ?? 'Motor chinh',
    loaiChiTiet: overrides.loaiChiTiet ?? 'THIET_BI',
    viTri: overrides.viTri ?? 'VT-A1',
    moTa: overrides.moTa ?? 'Mo ta chi tiet',
    fileDinhKem: overrides.fileDinhKem ?? null,
    maNguoiPhuTrach: overrides.maNguoiPhuTrach ?? 'NV-002',
    nguoiPhuTrach: overrides.nguoiPhuTrach ?? 'Tran B',
    thuTu: overrides.thuTu ?? 1,
    hoatDong: overrides.hoatDong ?? true,
    trangThai: overrides.trangThai ?? 'HOAT_DONG',
    parentDetailId: overrides.parentDetailId ?? null,
    machineSystemId: overrides.machineSystemId ?? 'src-sys-1',
  };
}

describe('MachineSystemService — clone', () => {
  const cloneOverrides = {
    maHeThong: 'SX-002',
    tenHeThong: 'He Thong San Xuat 2',
    khuVuc: 'KV-B',
    viTri: 'VT-02',
  };

  it('clones system with multi-level detail tree (root → child → grandchild)', async () => {
    const rootDetail = makeDetail({ id: 'det-root', maChiTiet: 'TB-001', parentDetailId: null });
    const childDetail = makeDetail({ id: 'det-child', maChiTiet: 'CUM-001', parentDetailId: 'det-root', thuTu: 2 });
    const grandchildDetail = makeDetail({ id: 'det-grandchild', maChiTiet: 'LK-001', parentDetailId: 'det-child', thuTu: 3, fileDinhKem: 'drawing.pdf' });

    const source = makeSourceSystem([rootDetail, childDetail, grandchildDetail]);

    // findUnique for source system (with details)
    mockPrisma.machineSystem.findUnique
      .mockResolvedValueOnce(source)   // source lookup
      .mockResolvedValueOnce(null)     // pre-check: destination maHeThong does not exist
      .mockResolvedValueOnce({ id: 'new-sys-1', details: [] }); // final return with details

    // machineSystem.create returns the new system
    const newSystem = { id: 'new-sys-1', maHeThong: 'SX-002', tenHeThong: 'He Thong San Xuat 2' };
    mockPrisma.machineSystem.create.mockResolvedValue(newSystem);

    // machineSystemDetail.findUnique for collision checks — all return null (no collision)
    mockPrisma.machineSystemDetail.findUnique.mockResolvedValue(null);

    // machineSystemDetail.create returns created details with new IDs
    let createCallCount = 0;
    mockPrisma.machineSystemDetail.create.mockImplementation((args: any) => {
      createCallCount++;
      return Promise.resolve({ id: `new-det-${createCallCount}`, ...args.data });
    });

    await machineSystemService.clone('src-sys-1', cloneOverrides);

    // Verify system was created
    expect(mockPrisma.machineSystem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          maHeThong: 'SX-002',
          tenHeThong: 'He Thong San Xuat 2',
          parentSystemId: 'src-sys-1',
        }),
      })
    );

    // Verify detail creation calls
    const detailCalls = mockPrisma.machineSystemDetail.create.mock.calls;
    expect(detailCalls).toHaveLength(3);

    // Root detail: maChiTiet = "SX-002-TB-001", parentDetailId = null
    expect(detailCalls[0][0].data.maChiTiet).toBe('SX-002-TB-001');
    expect(detailCalls[0][0].data.parentDetailId).toBeNull();

    // Child detail: maChiTiet = "SX-002-CUM-001", parentDetailId = new root ID
    expect(detailCalls[1][0].data.maChiTiet).toBe('SX-002-CUM-001');
    expect(detailCalls[1][0].data.parentDetailId).toBe('new-det-1');

    // Grandchild detail: maChiTiet = "SX-002-LK-001", parentDetailId = new child ID
    expect(detailCalls[2][0].data.maChiTiet).toBe('SX-002-LK-001');
    expect(detailCalls[2][0].data.parentDetailId).toBe('new-det-2');
  });

  it('throws ConflictError when destination maHeThong already exists', async () => {
    const source = makeSourceSystem([]);

    mockPrisma.machineSystem.findUnique
      .mockResolvedValueOnce(source)   // source lookup
      .mockResolvedValueOnce({ id: 'existing-sys', maHeThong: 'SX-002' }); // pre-check: exists!

    await expect(
      machineSystemService.clone('src-sys-1', cloneOverrides)
    ).rejects.toThrow('Mã hệ thống "SX-002" đã tồn tại, vui lòng chọn mã khác');
  });

  it('copies fileDinhKem field to cloned details', async () => {
    const detailWithFile = makeDetail({
      id: 'det-1',
      maChiTiet: 'TB-010',
      fileDinhKem: 'schematic_v2.pdf',
      parentDetailId: null,
    });

    const source = makeSourceSystem([detailWithFile]);

    mockPrisma.machineSystem.findUnique
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce(null)     // pre-check pass
      .mockResolvedValueOnce({ id: 'new-sys-1', details: [] });

    mockPrisma.machineSystem.create.mockResolvedValue({ id: 'new-sys-1', maHeThong: 'SX-002' });
    mockPrisma.machineSystemDetail.findUnique.mockResolvedValue(null);
    mockPrisma.machineSystemDetail.create.mockImplementation((args: any) =>
      Promise.resolve({ id: 'new-det-1', ...args.data })
    );

    await machineSystemService.clone('src-sys-1', cloneOverrides);

    const createCall = mockPrisma.machineSystemDetail.create.mock.calls[0][0];
    expect(createCall.data.fileDinhKem).toBe('schematic_v2.pdf');
  });

  it('throws ConflictError when generated maChiTiet collides with existing detail', async () => {
    const detail = makeDetail({ id: 'det-1', maChiTiet: 'TB-001', parentDetailId: null });
    const source = makeSourceSystem([detail]);

    mockPrisma.machineSystem.findUnique
      .mockResolvedValueOnce(source)
      .mockResolvedValueOnce(null)     // pre-check pass
      .mockResolvedValueOnce(null);

    mockPrisma.machineSystem.create.mockResolvedValue({ id: 'new-sys-1', maHeThong: 'SX-002' });

    // Collision: detail with same code already exists
    mockPrisma.machineSystemDetail.findUnique.mockResolvedValue({ id: 'existing-det', maChiTiet: 'SX-002-TB-001' });

    await expect(
      machineSystemService.clone('src-sys-1', cloneOverrides)
    ).rejects.toThrow(ConflictError);
  });

  it('throws NotFoundError when source system does not exist', async () => {
    mockPrisma.machineSystem.findUnique.mockResolvedValue(null);

    await expect(
      machineSystemService.clone('nonexistent', cloneOverrides)
    ).rejects.toThrow(NotFoundError);
  });
});
