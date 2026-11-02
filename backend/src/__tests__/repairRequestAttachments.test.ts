/**
 * Attachment merge+cap tests for RepairRequest.tepDinhKem
 * (OpenSpec change: repair-ycsc-attachments-phatsinh-yccc)
 */

const txMock: any = {
  repairRequest: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  repairRequestItem: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  repairRequestStatusLog: { create: jest.fn(), findMany: jest.fn() },
  repairRequestAssignee: { findMany: jest.fn() },
  repairMaterialNeed: { findMany: jest.fn(), count: jest.fn() },
  repairSupplyLink: { findMany: jest.fn(), count: jest.fn() },
  acceptanceHandoverItem: { count: jest.fn() },
  acceptanceHandover: { findFirst: jest.fn() },
  user: { findUnique: jest.fn() },
  machineSystem: { findUnique: jest.fn() },
  machineSystemDetail: { findUnique: jest.fn() },
  faultRecord: { findUnique: jest.fn() },
  inspectionRequest: { findUnique: jest.fn() },
  inspectionRequestItem: { findMany: jest.fn() },
};

const mockPrisma: any = {
  $transaction: jest.fn((fn: (tx: any) => unknown) => fn(txMock)),
  repairRequest: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  repairRequestItem: { findMany: jest.fn(), findFirst: jest.fn(), groupBy: jest.fn() },
  repairRequestStatusLog: { findMany: jest.fn(), create: jest.fn() },
  repairRequestAssignee: { findMany: jest.fn() },
  repairMaterialNeed: { findMany: jest.fn() },
  repairSupplyLink: { findMany: jest.fn() },
  user: { findUnique: jest.fn(), findMany: jest.fn() },
  machineSystem: { findUnique: jest.fn() },
  machineSystemDetail: { findUnique: jest.fn() },
  inspectionRequest: { findUnique: jest.fn(), findMany: jest.fn() },
  inspectionRequestItem: { findMany: jest.fn() },
};

jest.mock('@config/database', () => ({ __esModule: true, default: mockPrisma }));
jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { notify: jest.fn().mockResolvedValue(undefined) },
}));

import { RepairRequestStatus, RequestType } from '@prisma/client';
import repairRequestService from '@services/repairRequestService';

const FULL_ROW: any = {
  id: 1,
  trangThai: RepairRequestStatus.CHO_XU_LY,
  requestType: RequestType.SUA_CHUA,
  maYeuCau: 'YC-SC-2026-001',
  createdById: 'u1',
  createdByName: 'Tester',
  sourceInspectionRequestId: null,
  items: [],
  assignees: [],
  supplyLinks: [],
  materialNeeds: [],
  incidentalCosts: [],
};

function resetMocks(storedFiles: string[] = []) {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((fn: (tx: any) => unknown) => fn(txMock));
  mockPrisma.repairRequest.findUnique.mockImplementation((args: any) => {
    if (args?.select?.tepDinhKem) return Promise.resolve({ tepDinhKem: storedFiles });
    return Promise.resolve(FULL_ROW);
  });
  txMock.repairRequest.findUnique.mockResolvedValue({
    id: 1,
    trangThai: RepairRequestStatus.CHO_XU_LY,
    requestType: RequestType.SUA_CHUA,
    maYeuCau: 'YC-SC-2026-001',
  });
  txMock.repairRequest.create.mockImplementation((args: any) =>
    Promise.resolve({ id: 1, ...args.data })
  );
  txMock.repairRequest.update.mockImplementation((args: any) =>
    Promise.resolve({ id: 1, ...args.data })
  );
  txMock.repairRequest.updateMany.mockResolvedValue({ count: 1 });
  txMock.repairRequestStatusLog.create.mockResolvedValue({});
}

describe('RepairRequest tepDinhKem — create', () => {
  beforeEach(() => resetMocks());

  it('stores all files when <= 4', async () => {
    const res = await repairRequestService.createRepairRequest({
      ngayThang: new Date(),
      maYeuCau: 'YC-SC-2026-010',
      mucDoUuTien: 'CAO',
      tepDinhKem: ['u1', 'u2', 'u3'],
    } as any);
    expect(res).toBeDefined();
    expect(txMock.repairRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tepDinhKem: ['u1', 'u2', 'u3'] }) })
    );
  });

  it('caps at 4 files when more are passed', async () => {
    await repairRequestService.createRepairRequest({
      ngayThang: new Date(),
      maYeuCau: 'YC-SC-2026-011',
      mucDoUuTien: 'CAO',
      tepDinhKem: ['u1', 'u2', 'u3', 'u4', 'u5'],
    } as any);
    expect(txMock.repairRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tepDinhKem: ['u1', 'u2', 'u3', 'u4'] }),
      })
    );
  });

  it('creates with empty tepDinhKem when no files given', async () => {
    await repairRequestService.createRepairRequest({
      ngayThang: new Date(),
      maYeuCau: 'YC-SC-2026-012',
      mucDoUuTien: 'CAO',
    } as any);
    expect(txMock.repairRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tepDinhKem: [] }) })
    );
  });
});

describe('RepairRequest tepDinhKem — update append-merge', () => {
  it('appends new files preserving existing ones', async () => {
    resetMocks(['a', 'b']);
    await repairRequestService.updateRepairRequest(
      1,
      { ghiChu: 'sua', tepDinhKem: ['c'] } as any,
      { actorId: 'admin', actorRole: 'ADMIN' }
    );
    expect(txMock.repairRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tepDinhKem: ['a', 'b', 'c'] }),
      })
    );
  });

  it('merges up to exactly 4 files', async () => {
    resetMocks(['a', 'b', 'c']);
    await repairRequestService.updateRepairRequest(
      1,
      { tepDinhKem: ['d'] } as any,
      { actorId: 'admin', actorRole: 'ADMIN' }
    );
    expect(txMock.repairRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tepDinhKem: ['a', 'b', 'c', 'd'] }),
      })
    );
  });

  it('throws ValidationError before any write when merged list exceeds 4', async () => {
    resetMocks(['a', 'b', 'c']);
    await expect(
      repairRequestService.updateRepairRequest(
        1,
        { tepDinhKem: ['d', 'e'] } as any,
        { actorId: 'admin', actorRole: 'ADMIN' }
      )
    ).rejects.toThrow('Mỗi phiếu tối đa 4 tệp đính kèm');
    // Nothing written: optimistic guard and scalar update never ran.
    expect(txMock.repairRequest.updateMany).not.toHaveBeenCalled();
    expect(txMock.repairRequest.update).not.toHaveBeenCalled();
  });

  it('leaves tepDinhKem untouched when update carries no files', async () => {
    resetMocks(['a', 'b']);
    await repairRequestService.updateRepairRequest(
      1,
      { ghiChu: 'khong file' } as any,
      { actorId: 'admin', actorRole: 'ADMIN' }
    );
    const call = txMock.repairRequest.update.mock.calls[0][0];
    expect(call.data.tepDinhKem).toBeUndefined();
  });
});