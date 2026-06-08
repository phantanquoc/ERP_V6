jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { notify: jest.fn().mockResolvedValue(undefined) },
  NotificationService: jest.fn().mockImplementation(() => ({
    createAcceptanceHandoverNotification: jest.fn().mockResolvedValue(undefined),
  })),
}));

const mockPrisma: any = {
  $transaction: jest.fn((arg: unknown): unknown => {
    if (typeof arg === 'function') return (arg as (tx: any) => unknown)(mockPrisma);
    return Promise.all(arg as Promise<unknown>[]);
  }),
  department: { findUnique: jest.fn() },
  subDepartment: { findUnique: jest.fn() },
  machineSystem: { findUnique: jest.fn(), count: jest.fn() },
  machineSystemDetail: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn(),
  },
  faultTemplate: { findFirst: jest.fn(), findUnique: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  faultRecord: { findFirst: jest.fn(), findUnique: jest.fn(), count: jest.fn(), create: jest.fn(), groupBy: jest.fn() },
  repairRequest: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
  repairRequestItem: { findMany: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
  acceptanceHandover: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
  acceptanceHandoverItem: { createMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
  project: { findUnique: jest.fn(), count: jest.fn(), groupBy: jest.fn() },
  projectPhase: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), groupBy: jest.fn() },
  projectTask: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), count: jest.fn() },
};

jest.mock('@config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

import fs from 'fs';
import machineSystemDetailService from '@services/machineSystemDetailService';
import faultTemplateService from '@services/faultTemplateService';
import faultRecordService from '@services/faultRecordService';
import repairRequestService from '@services/repairRequestService';
import acceptanceHandoverService from '@services/acceptanceHandoverService';
import projectService from '@services/projectService';
import { requireTechnicalAccess, TECHNICAL_SUB_DEPARTMENT_CODES } from '@routes/technicalAccess';
import { registerRoutes } from '@routes/index';
import { ConflictError, ValidationError } from '@utils/errors';

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((arg: unknown) => {
    if (typeof arg === 'function') return (arg as (tx: any) => unknown)(mockPrisma);
    return Promise.all(arg as Promise<unknown>[]);
  });
});

describe('technical Batch B services', () => {
  it('rejects machine detail parent from another machine system', async () => {
    mockPrisma.machineSystem.findUnique.mockResolvedValue({ id: 'system-a' });
    mockPrisma.machineSystemDetail.findUnique.mockResolvedValue({
      id: 'parent-b',
      machineSystemId: 'system-b',
      parentDetailId: null,
    });

    await expect(machineSystemDetailService.create({
      machineSystemId: 'system-a',
      parentDetailId: 'parent-b',
      loaiChiTiet: 'Thiet bi',
      maChiTiet: 'CT-001',
      tenChiTiet: 'Bơm cấp liệu',
    })).rejects.toThrow(ValidationError);
  });

  it('protects referenced machine details from hard delete', async () => {
    mockPrisma.machineSystemDetail.findUnique.mockResolvedValue({
      id: 'detail-1',
      machineSystemId: 'system-1',
      childDetails: [],
    });
    mockPrisma.faultRecord.count.mockResolvedValue(1);
    mockPrisma.faultTemplate.count.mockResolvedValue(0);
    mockPrisma.repairRequestItem.count.mockResolvedValue(0);
    mockPrisma.acceptanceHandoverItem.count.mockResolvedValue(0);

    await expect(machineSystemDetailService.delete('detail-1')).rejects.toThrow(ConflictError);
    expect(mockPrisma.machineSystemDetail.delete).not.toHaveBeenCalled();
  });

  it('rejects fault template creation for inactive machine details', async () => {
    mockPrisma.machineSystemDetail.findUnique.mockResolvedValue({
      id: 'detail-1',
      machineSystemId: 'system-1',
      hoatDong: false,
      machineSystem: { id: 'system-1' },
    });

    await expect(faultTemplateService.create({
      tenMauLoi: 'Kẹt motor',
      moTa: 'Motor bị kẹt',
      mucDo: 'Nghiêm trọng',
      machineSystemDetailId: 'detail-1',
    })).rejects.toThrow(ValidationError);
  });

  it('deactivates referenced fault templates instead of deleting them', async () => {
    mockPrisma.faultTemplate.findUnique.mockResolvedValue({ id: 'template-1' });
    mockPrisma.faultRecord.count.mockResolvedValue(1);
    mockPrisma.faultTemplate.update.mockResolvedValue({ id: 'template-1', hoatDong: false });

    const result = await faultTemplateService.delete('template-1');

    expect(result).toEqual({ id: 'template-1', hoatDong: false });
    expect(mockPrisma.faultTemplate.delete).not.toHaveBeenCalled();
    expect(mockPrisma.faultTemplate.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { hoatDong: false, trangThai: 'Ngừng hoạt động' },
    }));
  });

  it('creates fault records from templates with copied machine context', async () => {
    mockPrisma.faultRecord.findFirst.mockResolvedValue(null);
    mockPrisma.faultTemplate.findUnique.mockResolvedValue({
      id: 'template-1',
      tenMauLoi: 'Đứt dây cảm biến',
      moTa: 'Cảm biến mất tín hiệu',
      mucDo: 'Trung bình',
      hoatDong: true,
      machineSystem: { id: 'system-1', maHeThong: 'HT-01' },
      machineSystemDetail: { id: 'detail-1' },
    });
    mockPrisma.faultRecord.create.mockImplementation(async (args: any) => ({ id: 'fault-1', ...args.data }));

    const result = await faultRecordService.createFaultRecord({
      faultTemplateId: 'template-1',
      nguoiPhatHien: 'Nguyễn Văn A',
    });

    expect(result).toMatchObject({
      tenLoi: 'Đứt dây cảm biến',
      machineSystemId: 'system-1',
      machineSystemDetailId: 'detail-1',
      faultTemplateId: 'template-1',
      maHeThong: 'HT-01',
    });
  });

  it('stores linked repair item IDs and readable snapshots', async () => {
    mockPrisma.machineSystem.findUnique.mockResolvedValue(null);
    mockPrisma.machineSystemDetail.findUnique.mockResolvedValue({
      id: 'detail-1',
      tenChiTiet: 'Bơm P-01',
      machineSystemId: 'system-1',
      machineSystem: { id: 'system-1', tenHeThong: 'Dây chuyền sấy 1' },
    });
    mockPrisma.repairRequest.create.mockResolvedValue({ id: 10, maYeuCau: 'YC-SC-2026-001' });
    mockPrisma.repairRequest.findUnique.mockResolvedValue({ id: 10, items: [] });

    await repairRequestService.createRepairRequest({
      ngayThang: new Date('2026-06-05'),
      maYeuCau: 'YC-SC-2026-001',
      mucDoUuTien: 'Cao',
      items: [{
        machineSystemDetailId: 'detail-1',
        tenHeThong: '',
        tinhTrangThietBi: '',
        loaiLoi: 'Lỗi mới',
        noiDungLoi: 'Bơm không chạy',
      }],
    });

    expect(mockPrisma.repairRequestItem.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        repairRequestId: 10,
        machineSystemId: 'system-1',
        machineSystemDetailId: 'detail-1',
        tenHeThong: 'Dây chuyền sấy 1',
        tinhTrangThietBi: 'Bơm P-01',
      })],
    });
  });

  it('rejects handover items from another repair request', async () => {
    mockPrisma.acceptanceHandover.findFirst.mockResolvedValue(null);
    mockPrisma.repairRequest.findUnique.mockResolvedValue({ id: 1, maYeuCau: 'YC-SC-001' });
    mockPrisma.repairRequestItem.findMany.mockResolvedValue([{ id: 'item-2', repairRequestId: 2 }]);

    await expect(acceptanceHandoverService.createAcceptanceHandover({
      repairRequestId: 1,
      maYeuCauSuaChua: 'YC-SC-001',
      tenHeThongThietBi: 'Dây chuyền sấy 1',
      tinhTrangTruocSuaChua: 'Hỏng',
      tinhTrangSauSuaChua: 'Đã sửa',
      nguoiBanGiao: 'A',
      nguoiNhan: 'B',
      items: [{
        repairRequestItemId: 'item-2',
        tinhTrangTruocSuaChua: 'Hỏng',
        tinhTrangSauSuaChua: 'Đã sửa',
      }],
    })).rejects.toThrow(ValidationError);
    expect(mockPrisma.acceptanceHandover.create).not.toHaveBeenCalled();
  });

  it('validates project phase progress and reorders phases in one transaction', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ id: 'project-1', members: [], phases: [], tasks: [] });
    await expect(projectService.addPhase('project-1', {
      tenGiaiDoan: 'Lắp đặt',
      tienDo: 101,
    })).rejects.toThrow(ValidationError);

    mockPrisma.projectPhase.findMany
      .mockResolvedValueOnce([{ id: 'phase-a' }, { id: 'phase-b' }])
      .mockResolvedValueOnce([{ id: 'phase-b', thuTu: 0 }, { id: 'phase-a', thuTu: 1 }]);
    mockPrisma.projectPhase.update.mockResolvedValue({});

    const result = await projectService.reorderPhases('project-1', ['phase-b', 'phase-a']);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockPrisma.projectPhase.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'phase-b' },
      data: { thuTu: 0 },
    });
    expect(result).toEqual([{ id: 'phase-b', thuTu: 0 }, { id: 'phase-a', thuTu: 1 }]);
  });
});

describe('technical Batch B route access and registration', () => {
  it('allows QLHTM users and blocks users from another technical sub-department', async () => {
    mockPrisma.department.findUnique.mockResolvedValue({ code: 'DEPT_TECHNICAL' });
    mockPrisma.subDepartment.findUnique
      .mockResolvedValueOnce({ code: TECHNICAL_SUB_DEPARTMENT_CODES.QLHTM })
      .mockResolvedValueOnce({ code: TECHNICAL_SUB_DEPARTMENT_CODES.MECHANICAL });

    const middleware = requireTechnicalAccess(TECHNICAL_SUB_DEPARTMENT_CODES.QLHTM);
    const next = jest.fn();
    const allowedReq: any = {
      user: { id: 'u1', role: 'EMPLOYEE', departmentId: 'dept-tech', subDepartmentId: 'sub-qlhtm' },
    };
    await middleware(allowedReq, mockResponse(), next);
    expect(next).toHaveBeenCalledTimes(1);

    const deniedRes = mockResponse();
    const deniedReq: any = {
      user: { id: 'u2', role: 'EMPLOYEE', departmentId: 'dept-tech', subDepartmentId: 'sub-mechanical' },
    };
    await middleware(deniedReq, deniedRes, jest.fn());
    expect(deniedRes.status).toHaveBeenCalledWith(403);
  });

  it('registers new Batch B route files through ROUTE_MAP', () => {
    const readdirSpy = jest.spyOn(fs, 'readdirSync').mockReturnValue([
      'machineSystemDetailRoutes.ts',
      'faultTemplateRoutes.ts',
      'technicalSummaryRoutes.ts',
    ] as any);
    const app = { use: jest.fn() };

    registerRoutes(app as any);

    expect(app.use).toHaveBeenCalledWith('/api/machine-system-details', expect.any(Function));
    expect(app.use).toHaveBeenCalledWith('/api/fault-templates', expect.any(Function));
    expect(app.use).toHaveBeenCalledWith('/api/technical-summary', expect.any(Function));
    readdirSpy.mockRestore();
  });
});
