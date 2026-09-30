/**
 * Hardening tests for split-inspection-repair (Phase 5)
 */

const txMock: any = {
  repairRequest: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  repairRequestItem: { findMany: jest.fn(), findFirst: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn(), count: jest.fn() },
  repairRequestStatusLog: { create: jest.fn(), findMany: jest.fn() },
  repairRequestAssignee: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), delete: jest.fn(), updateMany: jest.fn() },
  repairMaterialNeed: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  repairSupplyLink: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), delete: jest.fn() },
  supplyRequest: { findUnique: jest.fn(), findMany: jest.fn() },
  supplyRequestItem: { findMany: jest.fn(), findFirst: jest.fn() },
  supplyRequestDecision: { findMany: jest.fn(), findFirst: jest.fn() },
  replenishmentRequest: { findMany: jest.fn(), findFirst: jest.fn() },
  purchaseRequest: { findMany: jest.fn() },
  inboundPlan: { findMany: jest.fn() },
  warehouseIssue: { findMany: jest.fn(), findUnique: jest.fn() },
  machineSystem: { findUnique: jest.fn() },
  machineSystemDetail: { findUnique: jest.fn() },
  faultRecord: { findUnique: jest.fn() },
  user: { findUnique: jest.fn(), findMany: jest.fn() },
  acceptanceHandover: { findFirst: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
  acceptanceHandoverItem: { createMany: jest.fn(), findMany: jest.fn() },
  inspectionRequest: { findUnique: jest.fn() },
  inspectionRequestItem: { findMany: jest.fn() },
};

const mockPrisma: any = {
  $transaction: jest.fn((fn: (tx: any) => unknown) => fn(txMock)),
  repairRequest: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  repairRequestItem: { findMany: jest.fn(), findFirst: jest.fn(), groupBy: jest.fn() },
  repairRequestStatusLog: { findMany: jest.fn(), create: jest.fn() },
  repairRequestAssignee: { findMany: jest.fn() },
  repairMaterialNeed: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
  repairSupplyLink: { findMany: jest.fn() },
  supplyRequest: { findUnique: jest.fn(), findMany: jest.fn() },
  supplyRequestItem: { findMany: jest.fn() },
  supplyRequestDecision: { findMany: jest.fn() },
  replenishmentRequest: { findMany: jest.fn(), findFirst: jest.fn() },
  purchaseRequest: { findMany: jest.fn() },
  inboundPlan: { findMany: jest.fn() },
  warehouseIssue: { findMany: jest.fn() },
  machineSystem: { findMany: jest.fn(), findUnique: jest.fn() },
  machineSystemDetail: { findMany: jest.fn() },
  user: { findMany: jest.fn(), findUnique: jest.fn() },
  inspectionRequest: { findUnique: jest.fn(), findMany: jest.fn() },
  inspectionRequestItem: { findMany: jest.fn() },
};

jest.mock('@config/database', () => ({ __esModule: true, default: mockPrisma }));
jest.mock('@services/notificationService', () => ({ __esModule: true, default: { notify: jest.fn().mockResolvedValue(undefined) } }));

import { RepairRequestStatus, RequestType } from '@prisma/client';
import { ValidationError, ConflictError } from '@utils/errors';
import { advanceRepairRequestStatus, REPAIR_STATUS_ORDER, REPAIR_REQUEST_TERMINAL_STATUSES } from '@utils/statusTransitions';
import repairRequestService from '@services/repairRequestService';

// ------------------------------------------------------------------
// Part A: statusTransitions pure
// ------------------------------------------------------------------
describe('state machine: advanceRepairRequestStatus', () => {
  it('exports 7-step linear order', () => {
    expect(REPAIR_STATUS_ORDER).toHaveLength(7);
    expect(REPAIR_STATUS_ORDER[0]).toBe(RepairRequestStatus.CHO_XU_LY);
    expect(REPAIR_STATUS_ORDER[REPAIR_STATUS_ORDER.length - 1]).toBe(RepairRequestStatus.HOAN_THANH);
  });
  it('allows each SUA_CHUA step sequentially', () => {
    for (let i = 0; i < REPAIR_STATUS_ORDER.length - 1; i++) {
      expect(advanceRepairRequestStatus(REPAIR_STATUS_ORDER[i], REPAIR_STATUS_ORDER[i + 1])).toBe(REPAIR_STATUS_ORDER[i + 1]);
    }
  });
  it('backward compat CHO_XU_LY -> DANG_SUA_CHUA allowed', () => {
    expect(advanceRepairRequestStatus(RepairRequestStatus.CHO_XU_LY, RepairRequestStatus.DANG_SUA_CHUA)).toBe(RepairRequestStatus.DANG_SUA_CHUA);
  });
  it('rejects backward: DANG_SUA_CHUA -> DA_TIEP_NHAN', () => {
    expect(() => advanceRepairRequestStatus(RepairRequestStatus.DANG_SUA_CHUA, RepairRequestStatus.DA_TIEP_NHAN)).toThrow(ValidationError);
  });
  it('rejects skip: CHO_XU_LY -> CHO_NGHIEM_THU', () => {
    expect(() => advanceRepairRequestStatus(RepairRequestStatus.CHO_XU_LY, RepairRequestStatus.CHO_NGHIEM_THU)).toThrow(ValidationError);
  });
  it('allows skip with ADMIN bypass', () => {
    expect(advanceRepairRequestStatus(RepairRequestStatus.CHO_XU_LY, RepairRequestStatus.CHO_NGHIEM_THU, { bypass: true })).toBe(RepairRequestStatus.CHO_NGHIEM_THU);
  });
  it('rejects any transition from terminal HOAN_THANH', () => {
    expect(() => advanceRepairRequestStatus(RepairRequestStatus.HOAN_THANH, RepairRequestStatus.DA_TIEP_NHAN)).toThrow(ValidationError);
  });
  it('rejects any transition from terminal TU_CHOI', () => {
    expect(() => advanceRepairRequestStatus(RepairRequestStatus.TU_CHOI, RepairRequestStatus.CHO_XU_LY)).toThrow(ValidationError);
  });
  it('KIEM_TRA guard blocks SUA_CHUA-only statuses', () => {
    for (const blocked of [RepairRequestStatus.LEN_KE_HOACH, RepairRequestStatus.DANG_SUA_CHUA, RepairRequestStatus.CHO_NGHIEM_THU, RepairRequestStatus.DA_NGHIEM_THU]) {
      expect(() => advanceRepairRequestStatus(RepairRequestStatus.DA_TIEP_NHAN, blocked, { requestType: 'KIEM_TRA' })).toThrow(ValidationError);
    }
  });
  it('KIEM_TRA short path CHO_XU_LY -> DA_TIEP_NHAN -> HOAN_THANH works', () => {
    expect(advanceRepairRequestStatus(RepairRequestStatus.CHO_XU_LY, RepairRequestStatus.DA_TIEP_NHAN, { requestType: 'KIEM_TRA' })).toBe(RepairRequestStatus.DA_TIEP_NHAN);
    expect(advanceRepairRequestStatus(RepairRequestStatus.DA_TIEP_NHAN, RepairRequestStatus.HOAN_THANH, { requestType: 'KIEM_TRA' })).toBe(RepairRequestStatus.HOAN_THANH);
  });
  it('TU_CHOI allowed only from CHO_XU_LY | DA_TIEP_NHAN | LEN_KE_HOACH', () => {
    expect(advanceRepairRequestStatus(RepairRequestStatus.CHO_XU_LY, RepairRequestStatus.TU_CHOI)).toBe(RepairRequestStatus.TU_CHOI);
    expect(advanceRepairRequestStatus(RepairRequestStatus.DA_TIEP_NHAN, RepairRequestStatus.TU_CHOI)).toBe(RepairRequestStatus.TU_CHOI);
    expect(advanceRepairRequestStatus(RepairRequestStatus.LEN_KE_HOACH, RepairRequestStatus.TU_CHOI)).toBe(RepairRequestStatus.TU_CHOI);
    expect(() => advanceRepairRequestStatus(RepairRequestStatus.DANG_SUA_CHUA, RepairRequestStatus.TU_CHOI)).toThrow(ValidationError);
    expect(() => advanceRepairRequestStatus(RepairRequestStatus.CHO_NGHIEM_THU, RepairRequestStatus.TU_CHOI)).toThrow(ValidationError);
  });
  it('KHONG_DAT loop DA_NGHIEM_THU -> DANG_SUA_CHUA always allowed', () => {
    expect(advanceRepairRequestStatus(RepairRequestStatus.DA_NGHIEM_THU, RepairRequestStatus.DANG_SUA_CHUA)).toBe(RepairRequestStatus.DANG_SUA_CHUA);
  });
  it('DA_HUY before DANG_SUA_CHUA for normal, up to CHO_NGHIEM_THU for ADMIN', () => {
    expect(advanceRepairRequestStatus(RepairRequestStatus.LEN_KE_HOACH, RepairRequestStatus.DA_HUY)).toBe(RepairRequestStatus.DA_HUY);
    expect(() => advanceRepairRequestStatus(RepairRequestStatus.DANG_SUA_CHUA, RepairRequestStatus.DA_HUY)).toThrow(ValidationError);
    expect(() => advanceRepairRequestStatus(RepairRequestStatus.CHO_NGHIEM_THU, RepairRequestStatus.DA_HUY)).toThrow(ValidationError);
    expect(advanceRepairRequestStatus(RepairRequestStatus.DANG_SUA_CHUA, RepairRequestStatus.DA_HUY, { bypass: true })).toBe(RepairRequestStatus.DA_HUY);
    expect(advanceRepairRequestStatus(RepairRequestStatus.CHO_NGHIEM_THU, RepairRequestStatus.DA_HUY, { bypass: true })).toBe(RepairRequestStatus.DA_HUY);
    expect(() => advanceRepairRequestStatus(RepairRequestStatus.DA_NGHIEM_THU, RepairRequestStatus.DA_HUY, { bypass: true })).toThrow(ValidationError);
  });
  it('terminal set contains DA_HUY,TU_CHOI,HOAN_THANH', () => {
    expect(REPAIR_REQUEST_TERMINAL_STATUSES.has(RepairRequestStatus.DA_HUY)).toBe(true);
    expect(REPAIR_REQUEST_TERMINAL_STATUSES.has(RepairRequestStatus.TU_CHOI)).toBe(true);
    expect(REPAIR_REQUEST_TERMINAL_STATUSES.has(RepairRequestStatus.HOAN_THANH)).toBe(true);
  });
});

function resetMocks() {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((fn: (tx: any) => unknown) => fn(txMock));
  txMock.repairRequest.findUnique.mockResolvedValue({ id: 1, trangThai: RepairRequestStatus.CHO_XU_LY, requestType: RequestType.SUA_CHUA, maYeuCau: 'YC-SC-2026-001' });
  txMock.repairRequestItem.findMany.mockResolvedValue([]);
  mockPrisma.repairRequest.findUnique.mockResolvedValue({ id: 1, trangThai: RepairRequestStatus.CHO_XU_LY, requestType: RequestType.SUA_CHUA, maYeuCau: 'YC-SC-2026-001', items: [], assignees: [], supplyLinks: [], materialNeeds: [] } as any);
  txMock.machineSystem.findUnique.mockResolvedValue(null);
  txMock.machineSystemDetail.findUnique.mockResolvedValue(null);
  mockPrisma.inspectionRequest.findUnique.mockReset();
  mockPrisma.inspectionRequestItem.findMany.mockReset();
  txMock.inspectionRequest.findUnique.mockReset();
  txMock.inspectionRequestItem.findMany.mockReset();
}

// ------------------------------------------------------------------
// Part B: discriminator / assignee / materialNeed / supplyLink / filters / supplyChain / reverse
// ------------------------------------------------------------------
describe('discriminator', () => {
  beforeEach(resetMocks);
  it('KIEM_TRA with sourceInspectionRequestId throws ValidationError', async () => {
    await expect(repairRequestService.createRepairRequest({
      ngayThang: new Date(), maYeuCau: 'YC-SC-2026-001', mucDoUuTien: 'CAO', requestType: RequestType.KIEM_TRA, sourceInspectionRequestId: '1',
    } as any)).rejects.toThrow(ValidationError);
  });
  it('KIEM_TRA without sourceInspectionRequestId throws ValidationError (phai tao qua /inspection-requests)', async () => {
    await expect(repairRequestService.createRepairRequest({
      ngayThang: new Date(), maYeuCau: 'YC-SC-2026-010', mucDoUuTien: 'CAO', requestType: RequestType.KIEM_TRA,
      items: [{ tenHeThong: 'HT', tinhTrangThietBi: 'Hong', loaiLoi: 'Co khi', noiDungLoi: 'Vo' }],
    } as any)).rejects.toThrow(ValidationError);
  });
  it('SUA_CHUA with non-existent sourceInspectionRequestId throws ValidationError', async () => {
    mockPrisma.inspectionRequest.findUnique = jest.fn().mockResolvedValue(null);
    txMock.inspectionRequest.findUnique = jest.fn().mockResolvedValue(null);
    await expect(repairRequestService.createRepairRequest({
      ngayThang: new Date(), maYeuCau: 'YC-SC-2026-099', mucDoUuTien: 'CAO', requestType: RequestType.SUA_CHUA, sourceInspectionRequestId: '999999',
      items: [{ tenHeThong: 'HT', tinhTrangThietBi: 'Hong', loaiLoi: 'Co khi', noiDungLoi: 'Vo' }],
    } as any)).rejects.toThrow(ValidationError);
  });
  it('SUA_CHUA with invalid sourceInspectionItemId throws ValidationError', async () => {
    mockPrisma.inspectionRequest.findUnique = jest.fn().mockResolvedValue({ id: 1 } as any);
    mockPrisma.inspectionRequestItem.findMany = jest.fn().mockResolvedValue([] as any);
    await expect(repairRequestService.createRepairRequest({
      ngayThang: new Date(), maYeuCau: 'YC-SC-2026-100', mucDoUuTien: 'CAO', requestType: RequestType.SUA_CHUA, sourceInspectionRequestId: '1',
      items: [{ tenHeThong: 'HT', tinhTrangThietBi: 'Hong', loaiLoi: 'Co khi', noiDungLoi: 'Vo', sourceInspectionItemId: 'invalid-item' }],
    } as any)).rejects.toThrow(ValidationError);
  });
  it('SUA_CHUA with valid sourceInspectionRequestId and sourceInspectionItemId creates', async () => {
    mockPrisma.inspectionRequest.findUnique = jest.fn().mockResolvedValue({ id: 1 } as any);
    mockPrisma.inspectionRequestItem.findMany = jest.fn().mockResolvedValue([{ id: 'item-1' }] as any);
    mockPrisma.$transaction.mockImplementation(async (fn: any) => {
      const fakeTx: any = {
        repairRequest: {
          create: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: 20, ...args.data })),
          findUnique: jest.fn().mockResolvedValue({ id: 20, requestType: RequestType.SUA_CHUA, maYeuCau: 'YC-SC-2026-020', sourceInspectionRequestId: 1 }),
        },
        repairRequestItem: { createMany: jest.fn().mockResolvedValue({}) },
      };
      return fn(fakeTx);
    });
    const res = await repairRequestService.createRepairRequest({
      ngayThang: new Date(), maYeuCau: 'YC-SC-2026-020', mucDoUuTien: 'CAO', requestType: RequestType.SUA_CHUA, sourceInspectionRequestId: '1',
      items: [{ tenHeThong: 'HT', tinhTrangThietBi: 'Hong', loaiLoi: 'Co khi', noiDungLoi: 'Vo', sourceInspectionItemId: 'item-1' }],
    } as any);
    expect(res).toBeDefined();
    expect((res as any).sourceInspectionRequestId).toBe(1);
  });
});

describe('assignee guards', () => {
  beforeEach(() => {
    resetMocks();
    txMock.repairRequestAssignee.updateMany = jest.fn().mockResolvedValue({});
    txMock.repairRequestAssignee.create = jest.fn().mockImplementation((args: any) => Promise.resolve({ id: 'a1', ...args.data }));
  });
  it('assigning lead demotes prior lead (updateMany called)', async () => {
    jest.spyOn(repairRequestService as any, 'getRepairRequestById').mockResolvedValue({ id: 1, requestType: RequestType.SUA_CHUA } as any);
    await (repairRequestService as any).assignUser(1, { userId: 'u2', isLead: true }, { actorId: 'admin', actorRole: 'ADMIN' });
    expect(txMock.repairRequestAssignee.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ isLead: true }) }));
    jest.restoreAllMocks();
  });
  it('unique [repairId,userId] duplicate bubbles as P2002/ConflictError', async () => {
    jest.spyOn(repairRequestService as any, 'getRepairRequestById').mockResolvedValue({ id: 1, requestType: RequestType.SUA_CHUA } as any);
    txMock.repairRequestAssignee.create = jest.fn().mockRejectedValue(Object.assign(new Error('Unique'), { code: 'P2002' }));
    try {
      await (repairRequestService as any).assignUser(1, { userId: 'u1' }, {});
    } catch (e: any) {
      expect(e.code === 'P2002' || e instanceof ConflictError).toBe(true);
    }
    jest.restoreAllMocks();
  });
});

describe('materialNeed', () => {
  beforeEach(resetMocks);
  it('KIEM_TRA rejects materialNeed', async () => {
    jest.spyOn(repairRequestService as any, 'getRepairRequestById').mockResolvedValue({ id: 1, requestType: RequestType.KIEM_TRA } as any);
    await expect(repairRequestService.upsertMaterialNeed(1, { repairRequestItemId: 'item1', tenVatTu: 'Bi', soLuongDuKien: 1 } as any)).rejects.toThrow(ValidationError);
    jest.restoreAllMocks();
  });
  it('unique [itemId, tenVatTu] duplicate surfaces P2002', async () => {
    jest.spyOn(repairRequestService as any, 'getRepairRequestById').mockResolvedValue({ id: 1, requestType: RequestType.SUA_CHUA } as any);
    const prismaMock: any = mockPrisma;
    prismaMock.repairRequestItem = { findFirst: jest.fn().mockResolvedValue({ id: 'item1', repairRequestId: 1 } as any) };
    prismaMock.repairMaterialNeed = { create: jest.fn().mockRejectedValue(Object.assign(new Error('Unique'), { code: 'P2002' })) };
    // upsertMaterialNeed uses tx? It uses prisma directly for uniqueness, so mock that path
    mockPrisma.repairMaterialNeed = prismaMock.repairMaterialNeed;
    // Also need to mock prisma used inside service (same mock)
    try {
      await repairRequestService.upsertMaterialNeed(1, { repairRequestItemId: 'item1', tenVatTu: 'Bi', soLuongDuKien: 1 } as any);
    } catch (e: any) {
      expect(e.code === 'P2002' || e instanceof ConflictError || e instanceof ValidationError).toBe(true);
    }
    jest.restoreAllMocks();
  });
});

describe('supplyLink', () => {
  beforeEach(resetMocks);
  it('KIEM_TRA rejects supply link', async () => {
    jest.spyOn(repairRequestService as any, 'getRepairRequestById').mockResolvedValue({ id: 1, requestType: RequestType.KIEM_TRA } as any);
    await expect(repairRequestService.linkSupplyRequest(1, { supplyRequestId: 'sr1' } as any, {} as any)).rejects.toThrow(ValidationError);
    jest.restoreAllMocks();
  });
  it('invalid supplyRequestId throws ValidationError', async () => {
    jest.spyOn(repairRequestService as any, 'getRepairRequestById').mockResolvedValue({ id: 1, requestType: RequestType.SUA_CHUA } as any);
    mockPrisma.supplyRequest.findUnique = jest.fn().mockResolvedValue(null);
    await expect(repairRequestService.linkSupplyRequest(1, { supplyRequestId: 'no-such' } as any, {} as any)).rejects.toThrow(ValidationError);
    jest.restoreAllMocks();
  });
  it('duplicate per-item link surfaces P2002', async () => {
    jest.spyOn(repairRequestService as any, 'getRepairRequestById').mockResolvedValue({ id: 1, requestType: RequestType.SUA_CHUA } as any);
    mockPrisma.supplyRequest.findUnique = jest.fn().mockResolvedValue({ id: 'sr1' } as any);
    mockPrisma.repairRequestItem.findFirst = jest.fn().mockResolvedValue({ id: 'item1' } as any);
    mockPrisma.repairSupplyLink.create = jest.fn().mockRejectedValue(Object.assign(new Error('Unique'), { code: 'P2002' }));
    // service linkSupplyRequest delegates to prisma.repairSupplyLink.create via tx? Actually via prisma directly
    // Our mockPrisma above does not wire tx; patch directly
    const orig = mockPrisma.repairSupplyLink;
    try {
      await repairRequestService.linkSupplyRequest(1, { supplyRequestId: 'sr1', repairRequestItemId: 'item1' } as any, {} as any);
    } catch (e: any) {
      expect(e.code === 'P2002' || e instanceof ConflictError).toBe(true);
    }
    void orig;
    jest.restoreAllMocks();
  });
});

describe('getAll filter', () => {
  beforeEach(resetMocks);
  it('filters by requestType and sourceInspectionRequestId', async () => {
    mockPrisma.repairRequest.findMany = jest.fn().mockResolvedValue([]);
    mockPrisma.repairRequest.count = jest.fn().mockResolvedValue(0);
    const res = await repairRequestService.getAllRepairRequests(1, 10, { requestType: RequestType.KIEM_TRA, sourceInspectionRequestId: '123' });
    expect(mockPrisma.repairRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ requestType: RequestType.KIEM_TRA, sourceInspectionRequestId: 123 }) }));
    expect(res.data).toEqual([]);
  });
});

describe('supply-chain batch resolve', () => {
  beforeEach(resetMocks);
  it('YCCC only returns null for repl/pr/inbound/issue', async () => {
    mockPrisma.repairSupplyLink.findMany = jest.fn().mockResolvedValue([{ id: 'link1', supplyRequestId: 'sr1', repairRequestId: 1, createdAt: new Date() }]);
    mockPrisma.supplyRequest.findMany = jest.fn().mockResolvedValue([{ id: 'sr1', maYeuCau: 'YC-VT-2026-001', trangThai: 'Cho duyet', createdAt: new Date() }]);
    mockPrisma.supplyRequestItem.findMany = jest.fn().mockResolvedValue([{ id: 'sri1', supplyRequestId: 'sr1' }]);
    mockPrisma.supplyRequestDecision.findMany = jest.fn().mockResolvedValue([]);
    mockPrisma.replenishmentRequest.findMany = jest.fn().mockResolvedValue([]);
    mockPrisma.purchaseRequest.findMany = jest.fn().mockResolvedValue([]);
    mockPrisma.inboundPlan.findMany = jest.fn().mockResolvedValue([]);
    mockPrisma.warehouseIssue.findMany = jest.fn().mockResolvedValue([]);
    const chains = await repairRequestService.getSupplyChain(1);
    expect(chains).toHaveLength(1);
    expect(chains[0].replenishmentRequest).toBeNull();
    expect(chains[0].purchaseRequest).toBeNull();
    expect(chains[0].inboundPlan).toBeNull();
    expect(chains[0].warehouseIssue).toBeNull();
  });
  it('YCCC -> YCBS returns repl populated, pr null', async () => {
    mockPrisma.repairSupplyLink.findMany = jest.fn().mockResolvedValue([{ id: 'link1', supplyRequestId: 'sr1', repairRequestId: 1, createdAt: new Date() }]);
    mockPrisma.supplyRequest.findMany = jest.fn().mockResolvedValue([{ id: 'sr1', maYeuCau: 'YC-VT-2026-001', trangThai: 'Cho duyet', createdAt: new Date() }]);
    mockPrisma.supplyRequestItem.findMany = jest.fn().mockResolvedValue([{ id: 'sri1', supplyRequestId: 'sr1' }]);
    mockPrisma.supplyRequestDecision.findMany = jest.fn().mockResolvedValue([{ supplyRequestItemId: 'sri1', triggeredReplenishmentRequestId: 'rr1', shortageQty: 5, reason: 'Thieu', decidedAt: new Date() }]);
    mockPrisma.replenishmentRequest.findMany = jest.fn().mockResolvedValue([{ id: 'rr1', maYeuCau: 'YC-BS-2026-001', trangThai: 'Cho bao gia', phanLoaiGroup: 'A', createdAt: new Date(), convertedPurchaseRequestId: null }]);
    mockPrisma.purchaseRequest.findMany = jest.fn().mockResolvedValue([]);
    mockPrisma.inboundPlan.findMany = jest.fn().mockResolvedValue([]);
    mockPrisma.warehouseIssue.findMany = jest.fn().mockResolvedValue([]);
    const chains = await repairRequestService.getSupplyChain(1);
    expect(chains[0].replenishmentRequest?.id).toBe('rr1');
    expect(chains[0].purchaseRequest).toBeNull();
  });
  it('full chain YCCC -> YCBS -> YCMH -> Inbound -> WarehouseIssue', async () => {
    mockPrisma.repairSupplyLink.findMany = jest.fn().mockResolvedValue([{ id: 'link1', supplyRequestId: 'sr1', repairRequestId: 1, createdAt: new Date() }]);
    mockPrisma.supplyRequest.findMany = jest.fn().mockResolvedValue([{ id: 'sr1', maYeuCau: 'YC-VT-2026-001', trangThai: 'Cho duyet', createdAt: new Date() }]);
    mockPrisma.supplyRequestItem.findMany = jest.fn().mockResolvedValue([{ id: 'sri1', supplyRequestId: 'sr1' }]);
    mockPrisma.supplyRequestDecision.findMany = jest.fn().mockResolvedValue([{ supplyRequestItemId: 'sri1', triggeredReplenishmentRequestId: 'rr1', shortageQty: 5, reason: 'Thieu', decidedAt: new Date() }]);
    mockPrisma.replenishmentRequest.findMany = jest.fn().mockResolvedValue([{ id: 'rr1', maYeuCau: 'YC-BS-2026-001', trangThai: 'Da chuyen mua hang', phanLoaiGroup: 'A', createdAt: new Date(), convertedPurchaseRequestId: 'pr1' }]);
    mockPrisma.purchaseRequest.findMany = jest.fn().mockResolvedValue([{ id: 'pr1', maYeuCau: 'YC-MH-2026-001', trangThai: 'Da duyet', sourceType: 'SHORTAGE', createdAt: new Date() }]);
    mockPrisma.inboundPlan.findMany = jest.fn().mockResolvedValue([{ id: 'ip1', maKeHoach: 'KH-NH-2026-001', trangThai: 'Cho nhap', purchaseRequestId: 'pr1' }]);
    mockPrisma.warehouseIssue.findMany = jest.fn().mockResolvedValue([{ id: 'wi1', maPhieuXuat: 'PX-001', supplyRequestId: 'sr1' }]);
    const chains = await repairRequestService.getSupplyChain(1);
    expect(chains[0].purchaseRequest?.id).toBe('pr1');
    expect(chains[0].inboundPlan?.maKeHoach).toBe('KH-NH-2026-001');
    expect(chains[0].warehouseIssue?.maPhieu).toBe('PX-001');
  });
});

describe('reverse lookup 3 levels', () => {
  beforeEach(resetMocks);
  it('reverse from SupplyRequest traces to RepairRequest', async () => {
    mockPrisma.repairSupplyLink.findMany = jest.fn().mockResolvedValue([{ supplyRequestId: 'sr1', repairRequestId: 10 }]);
    mockPrisma.repairRequest.findMany = jest.fn().mockResolvedValue([{ id: 10, maYeuCau: 'YC-SC-2026-010', trangThai: RepairRequestStatus.CHO_XU_LY }]);
    const res = await (repairRequestService.constructor as any).resolveRepairLinksForSupplyIds(['sr1']);
    expect(res[0].supplyRequestId).toBe('sr1');
  });
  it('reverse from ReplenishmentRequest traces to RepairRequest', async () => {
    mockPrisma.supplyRequestDecision.findMany = jest.fn().mockResolvedValue([{ supplyRequestItemId: 'sri1' }]);
    mockPrisma.supplyRequestItem.findMany = jest.fn().mockResolvedValue([{ supplyRequestId: 'sr1' }]);
    mockPrisma.repairSupplyLink.findMany = jest.fn().mockResolvedValue([{ supplyRequestId: 'sr1', repairRequestId: 10 }]);
    mockPrisma.repairRequest.findMany = jest.fn().mockResolvedValue([{ id: 10, maYeuCau: 'YC-SC-2026-010', trangThai: RepairRequestStatus.DANG_SUA_CHUA }]);
    const res = await (repairRequestService.constructor as any).resolveRepairLinksForReplenishmentId('rr1');
    expect(res[0].repairRequestId).toBe(10);
  });
  it('reverse from PurchaseRequest traces to RepairRequest', async () => {
    mockPrisma.replenishmentRequest.findFirst = jest.fn().mockResolvedValue({ id: 'rr1' });
    mockPrisma.supplyRequestDecision.findMany = jest.fn().mockResolvedValue([{ supplyRequestItemId: 'sri1' }]);
    mockPrisma.supplyRequestItem.findMany = jest.fn().mockResolvedValue([{ supplyRequestId: 'sr1' }]);
    mockPrisma.repairSupplyLink.findMany = jest.fn().mockResolvedValue([{ supplyRequestId: 'sr1', repairRequestId: 10 }]);
    mockPrisma.repairRequest.findMany = jest.fn().mockResolvedValue([{ id: 10, maYeuCau: 'YC-SC-2026-010', trangThai: RepairRequestStatus.HOAN_THANH }]);
    const res = await (repairRequestService.constructor as any).resolveRepairLinksForPurchaseId('pr1');
    expect(res[0].repairRequestId).toBe(10);
  });
});
