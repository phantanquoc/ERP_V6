/**
 * Package A guards for YCKT / YCSC:
 *  - item diff update (ids preserved, referenced items cannot be deleted)
 *  - edit / cancel permission matrix (owner + CHO_XU_LY vs technician/ADMIN before acceptance)
 *  - ADMIN bypass limits (submit needs a pending slip, startRepair only from LEN_KE_HOACH)
 *  - acceptance slip duplicate / retarget guards, numeric NT code + P2002 retry
 *  - YCSC-from-YCKT preconditions, delete guards
 */

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { notify: jest.fn().mockResolvedValue(undefined) },
}));

const mockIsTechnicalMember = jest.fn();
jest.mock('@middlewares/technicalAccess', () => ({
  __esModule: true,
  isTechnicalMember: (...args: unknown[]) => mockIsTechnicalMember(...args),
}));

const tx: any = {
  repairRequest: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
  repairRequestItem: { findMany: jest.fn(), update: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
  repairRequestStatusLog: { create: jest.fn(), findFirst: jest.fn() },
  repairMaterialNeed: { count: jest.fn() },
  repairSupplyLink: { count: jest.fn() },
  acceptanceHandover: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  acceptanceHandoverItem: { count: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn() },
  inspectionRequest: { findUnique: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
  inspectionRequestItem: { findMany: jest.fn(), update: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn() },
  inspectionRequestStatusLog: { create: jest.fn() },
  warehouseIssue: { findUnique: jest.fn() },
};

const mockPrisma: any = {
  $transaction: jest.fn((fn: (t: any) => unknown) => fn(tx)),
  repairRequest: { findUnique: jest.fn() },
  inspectionRequest: { findUnique: jest.fn() },
  inspectionRequestItem: { findMany: jest.fn() },
  acceptanceHandover: { findUnique: jest.fn(), findMany: jest.fn() },
  machineSystem: { findUnique: jest.fn() },
  machineSystemDetail: { findUnique: jest.fn() },
  faultRecord: { findUnique: jest.fn() },
  employee: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  warehouseIssue: { findUnique: jest.fn() },
};

jest.mock('@config/database', () => ({ __esModule: true, default: mockPrisma }));

import { Prisma, RepairRequestStatus, InspectionRequestStatus, RequestType } from '@prisma/client';
import repairRequestService from '@services/repairRequestService';
import inspectionRequestService from '@services/inspectionRequestService';
import acceptanceHandoverService from '@services/acceptanceHandoverService';
import { AuthorizationError, ConflictError, ValidationError } from '@utils/errors';

const owner = { actorId: 'owner', actorRole: 'EMPLOYEE' };
const stranger = { actorId: 'stranger', actorRole: 'EMPLOYEE' };
const tech = { actorId: 'tech', actorRole: 'EMPLOYEE' };
const admin = { actorId: 'admin', actorRole: 'ADMIN' };

const item = (over: Record<string, unknown> = {}) => ({ tenHeThong: 'Bơm', tinhTrangThietBi: 'Rung', loaiLoi: 'Lỗi mới', noiDungLoi: 'Kêu to', ...over });

function repairRow(trangThai: RepairRequestStatus, over: Record<string, unknown> = {}) {
  return {
    id: 1, maYeuCau: 'YC-SC-2026-001', trangThai, requestType: RequestType.SUA_CHUA, createdById: 'owner',
    sourceInspectionRequestId: null, items: [{ id: 'it-1', faultRecordId: null }, { id: 'it-2', faultRecordId: null }],
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((fn: (t: any) => unknown) => fn(tx));
  mockIsTechnicalMember.mockImplementation((uid: string) => Promise.resolve(uid === 'tech'));
  tx.repairRequest.updateMany.mockResolvedValue({ count: 1 });
  tx.repairRequest.update.mockResolvedValue({ id: 1, maYeuCau: 'YC-SC-2026-001', trangThai: 'CHO_XU_LY' });
  tx.repairRequest.deleteMany.mockResolvedValue({ count: 1 });
  tx.inspectionRequest.updateMany.mockResolvedValue({ count: 1 });
  tx.inspectionRequest.deleteMany.mockResolvedValue({ count: 1 });
  tx.repairRequestItem.findMany.mockResolvedValue([{ id: 'it-1' }, { id: 'it-2' }]);
  tx.inspectionRequestItem.findMany.mockResolvedValue([{ id: 'ki-1' }, { id: 'ki-2' }]);
  for (const c of [tx.acceptanceHandoverItem.count, tx.repairMaterialNeed.count, tx.repairSupplyLink.count, tx.repairRequestItem.count]) c.mockResolvedValue(0);
  tx.acceptanceHandover.findMany.mockResolvedValue([]);
  tx.acceptanceHandover.findFirst.mockResolvedValue(null);
  tx.repairRequestStatusLog.findFirst.mockResolvedValue(null);
  mockPrisma.inspectionRequest.findUnique.mockResolvedValue({ id: 5, trangThai: InspectionRequestStatus.CHO_XU_LY, createdById: 'owner' });
});

// ── 1. Item diff update ──────────────────────────────────────────────────────

describe('YCSC item diff update', () => {
  beforeEach(() => {
    mockPrisma.repairRequest.findUnique.mockResolvedValue(repairRow(RepairRequestStatus.DANG_SUA_CHUA));
  });

  it('updates items with an id in place, creates new ones, keeps ids (no delete-all)', async () => {
    await repairRequestService.updateRepairRequest(1, { items: [item({ id: 'it-1', noiDungLoi: 'Sửa lại' }), item({ id: 'it-2' }), item()] }, tech);

    expect(tx.repairRequestItem.deleteMany).not.toHaveBeenCalled();
    expect(tx.repairRequestItem.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'it-1' }, data: expect.objectContaining({ noiDungLoi: 'Sửa lại' }) }));
    expect(tx.repairRequestItem.update).toHaveBeenCalledTimes(2);
    expect(tx.repairRequestItem.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ repairRequestId: 1, tenHeThong: 'Bơm' })] });
  });

  it('does not clear sourceInspectionItemId / faultRecordId when the client omits them', async () => {
    await repairRequestService.updateRepairRequest(1, { items: [item({ id: 'it-1' }), item({ id: 'it-2' })] }, tech);
    const data = tx.repairRequestItem.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty('sourceInspectionItemId');
    expect(data).not.toHaveProperty('faultRecordId');
  });

  it('deletes an unreferenced item that is no longer in the list', async () => {
    await repairRequestService.updateRepairRequest(1, { items: [item({ id: 'it-1' })] }, tech);
    expect(tx.repairRequestItem.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['it-2'] }, repairRequestId: 1 } });
  });

  it.each([
    ['acceptance slip item', () => tx.acceptanceHandoverItem.count],
    ['material need', () => tx.repairMaterialNeed.count],
    ['supply link', () => tx.repairSupplyLink.count],
  ])('blocks deleting an item referenced by a %s', async (_label, counter) => {
    counter().mockResolvedValue(1);
    await expect(repairRequestService.updateRepairRequest(1, { items: [item({ id: 'it-1' })] }, tech))
      .rejects.toThrow('Không thể xóa hạng mục đã có nghiệm thu/vật tư/liên kết');
    expect(tx.repairRequestItem.deleteMany).not.toHaveBeenCalled();
  });

  it('rejects an item id that belongs to another request', async () => {
    await expect(repairRequestService.updateRepairRequest(1, { items: [item({ id: 'foreign' })] }, tech)).rejects.toThrow(ValidationError);
  });

  it('never writes ketQuaNghiemThu through the generic update', async () => {
    await repairRequestService.updateRepairRequest(1, { ghiChu: 'x', ketQuaNghiemThu: 'DAT' } as never, tech);
    expect(tx.repairRequest.update.mock.calls[0][0].data).not.toHaveProperty('ketQuaNghiemThu');
  });
});

describe('YCKT item diff update', () => {
  beforeEach(() => {
    mockPrisma.inspectionRequest.findUnique.mockResolvedValue({ id: 5, trangThai: InspectionRequestStatus.DANG_KIEM_TRA, createdById: 'owner' });
  });

  it('keeps ids and blocks deleting an item a YCSC item links to', async () => {
    tx.repairRequestItem.count.mockResolvedValue(1);
    await expect(inspectionRequestService.updateInspectionRequest(5, { items: [item({ id: 'ki-1' })] }, tech))
      .rejects.toThrow('Không thể xóa hạng mục đã có nghiệm thu/vật tư/liên kết');
    expect(tx.repairRequestItem.count).toHaveBeenCalledWith({ where: { sourceInspectionItemId: { in: ['ki-2'] } } });
    expect(tx.inspectionRequestItem.deleteMany).not.toHaveBeenCalled();
  });

  it('updates in place and creates new items', async () => {
    await inspectionRequestService.updateInspectionRequest(5, { items: [item({ id: 'ki-1' }), item({ id: 'ki-2' }), item()] }, tech);
    expect(tx.inspectionRequestItem.update).toHaveBeenCalledTimes(2);
    expect(tx.inspectionRequestItem.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ inspectionRequestId: 5 })] });
    expect(tx.inspectionRequestItem.deleteMany).not.toHaveBeenCalled();
  });

});

// ── 2. Edit / cancel permission matrix ───────────────────────────────────────

describe('edit permission matrix', () => {
  const ycsc = (s: RepairRequestStatus) => mockPrisma.repairRequest.findUnique.mockResolvedValue(repairRow(s));
  const yckt = (s: InspectionRequestStatus) => mockPrisma.inspectionRequest.findUnique.mockResolvedValue({ id: 5, trangThai: s, createdById: 'owner' });

  it('owner edits own YCSC only while CHO_XU_LY', async () => {
    ycsc(RepairRequestStatus.CHO_XU_LY);
    await expect(repairRequestService.updateRepairRequest(1, { ghiChu: 'a' }, owner)).resolves.toBeDefined();
    ycsc(RepairRequestStatus.DA_TIEP_NHAN);
    await expect(repairRequestService.updateRepairRequest(1, { ghiChu: 'a' }, owner)).rejects.toThrow(ValidationError);
  });

  it('a non-technical stranger can never edit', async () => {
    ycsc(RepairRequestStatus.CHO_XU_LY);
    await expect(repairRequestService.updateRepairRequest(1, { ghiChu: 'a' }, stranger)).rejects.toThrow(AuthorizationError);
    yckt(InspectionRequestStatus.CHO_XU_LY);
    await expect(inspectionRequestService.updateInspectionRequest(5, { ghiChu: 'a' }, stranger)).rejects.toThrow(AuthorizationError);
  });

  it.each([RepairRequestStatus.CHO_XU_LY, RepairRequestStatus.DA_TIEP_NHAN, RepairRequestStatus.LEN_KE_HOACH, RepairRequestStatus.DANG_SUA_CHUA])(
    'technician edits YCSC in %s', async (s) => {
      ycsc(s);
      await expect(repairRequestService.updateRepairRequest(1, { ghiChu: 'a' }, tech)).resolves.toBeDefined();
    });

  it.each([RepairRequestStatus.CHO_NGHIEM_THU, RepairRequestStatus.DA_NGHIEM_THU, RepairRequestStatus.HOAN_THANH, RepairRequestStatus.DA_HUY])(
    'technician and ADMIN cannot edit YCSC in %s', async (s) => {
      ycsc(s);
      await expect(repairRequestService.updateRepairRequest(1, { ghiChu: 'a' }, tech)).rejects.toThrow(ValidationError);
      await expect(repairRequestService.updateRepairRequest(1, { ghiChu: 'a' }, admin)).rejects.toThrow(ValidationError);
    });

  it('YCKT: technician edits up to DANG_KIEM_TRA, not after submission', async () => {
    yckt(InspectionRequestStatus.DANG_KIEM_TRA);
    await expect(inspectionRequestService.updateInspectionRequest(5, { ghiChu: 'a' }, tech)).resolves.toBeDefined();
    for (const s of [InspectionRequestStatus.DA_KIEM_TRA, InspectionRequestStatus.CHO_NGHIEM_THU, InspectionRequestStatus.HOAN_THANH]) {
      yckt(s);
      await expect(inspectionRequestService.updateInspectionRequest(5, { ghiChu: 'a' }, admin)).rejects.toThrow(ValidationError);
    }
  });

  it('non-technical owner cannot write execution fields', async () => {
    ycsc(RepairRequestStatus.CHO_XU_LY);
    await repairRequestService.updateRepairRequest(1, { ghiChu: 'a', chiPhiThucTe: 0 } as never, owner);
    expect(tx.repairRequest.update.mock.calls[0][0].data).not.toHaveProperty('chiPhiThucTe');
  });

  it('a status change between check and write conflicts', async () => {
    ycsc(RepairRequestStatus.CHO_XU_LY);
    tx.repairRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(repairRequestService.updateRepairRequest(1, { ghiChu: 'a' }, owner)).rejects.toThrow(ConflictError);
  });
});

describe('cancel permission matrix', () => {
  const txRepair = (s: RepairRequestStatus) => tx.repairRequest.findUnique.mockResolvedValue({ id: 1, trangThai: s, maYeuCau: 'YC-SC-2026-001', requestType: RequestType.SUA_CHUA, createdById: 'owner' });
  const txInspection = (s: InspectionRequestStatus) => tx.inspectionRequest.findUnique.mockResolvedValue({ id: 5, trangThai: s, maYeuCau: 'YC-KT-2026-005', createdById: 'owner', ketLuan: null });

  it('owner cancels own YCSC in CHO_XU_LY', async () => {
    txRepair(RepairRequestStatus.CHO_XU_LY);
    await repairRequestService.cancel(1, owner);
    expect(tx.repairRequest.updateMany).toHaveBeenCalledWith({ where: { id: 1, trangThai: RepairRequestStatus.CHO_XU_LY }, data: { trangThai: RepairRequestStatus.DA_HUY } });
  });

  it('owner cannot cancel after acceptance by Kỹ thuật; stranger never', async () => {
    txRepair(RepairRequestStatus.LEN_KE_HOACH);
    await expect(repairRequestService.cancel(1, owner)).rejects.toThrow(ValidationError);
    txRepair(RepairRequestStatus.CHO_XU_LY);
    await expect(repairRequestService.cancel(1, stranger)).rejects.toThrow(AuthorizationError);
    txInspection(InspectionRequestStatus.DANG_KIEM_TRA);
    await expect(inspectionRequestService.cancel(5, stranger)).rejects.toThrow(AuthorizationError);
  });

  it('technician follows the DA_HUY table (LEN_KE_HOACH ok, DANG_SUA_CHUA not)', async () => {
    txRepair(RepairRequestStatus.LEN_KE_HOACH);
    await expect(repairRequestService.cancel(1, tech)).resolves.toBeDefined();
    txRepair(RepairRequestStatus.DANG_SUA_CHUA);
    await expect(repairRequestService.cancel(1, tech)).rejects.toThrow(ValidationError);
  });

  it('YCKT cannot be cancelled in CHO_NGHIEM_THU, even by ADMIN', async () => {
    txInspection(InspectionRequestStatus.CHO_NGHIEM_THU);
    await expect(inspectionRequestService.cancel(5, admin)).rejects.toThrow('xác nhận KHÔNG ĐẠT trước khi hủy');
  });
});

// ── 3. ADMIN bypass limits ───────────────────────────────────────────────────

describe('ADMIN bypass limits (YCSC)', () => {
  const txRepair = (s: RepairRequestStatus) => tx.repairRequest.findUnique.mockResolvedValue({ id: 1, trangThai: s, maYeuCau: 'YC-SC-2026-001', requestType: RequestType.SUA_CHUA, createdById: 'owner' });

  beforeEach(() => {
    mockPrisma.repairRequest.findUnique.mockResolvedValue({ requestType: RequestType.SUA_CHUA, trangThai: 'LEN_KE_HOACH', supplyLinks: [] });
  });

  it('submit-acceptance requires a pending slip for ADMIN too', async () => {
    txRepair(RepairRequestStatus.DANG_SUA_CHUA);
    await expect(repairRequestService.submitForAcceptance(1, admin)).rejects.toThrow('Vui lòng lập phiếu nghiệm thu');
  });

  it('after KHÔNG ĐẠT only a slip created after that decision counts', async () => {
    txRepair(RepairRequestStatus.DANG_SUA_CHUA);
    const rejectedAt = new Date('2026-09-30T10:00:00Z');
    tx.repairRequestStatusLog.findFirst.mockResolvedValue({ createdAt: rejectedAt });
    await expect(repairRequestService.submitForAcceptance(1, tech)).rejects.toThrow(ValidationError);
    expect(tx.acceptanceHandover.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { repairRequestId: 1, ketQua: null, createdAt: { gt: rejectedAt } },
    }));
  });

  it('submit-acceptance notifies the confirmer once the YCSC is CHO_NGHIEM_THU', async () => {
    txRepair(RepairRequestStatus.DANG_SUA_CHUA);
    tx.acceptanceHandover.findFirst.mockResolvedValue({ id: 'nt-1', maNghiemThu: 'NT-001', maYeuCauSuaChua: 'YC-SC-2026-001', tenHeThongThietBi: 'Bơm', nguoiBanGiao: 'KT', nguoiXacNhanId: 'owner' });
    const spy = jest.spyOn(acceptanceHandoverService, 'notifyConfirmer').mockResolvedValue(undefined);
    await repairRequestService.submitForAcceptance(1, tech);
    expect(tx.repairRequest.updateMany).toHaveBeenCalledWith({ where: { id: 1, trangThai: RepairRequestStatus.DANG_SUA_CHUA }, data: { trangThai: RepairRequestStatus.CHO_NGHIEM_THU } });
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'nt-1' }), 'owner', 'KT');
    spy.mockRestore();
  });

  it.each([RepairRequestStatus.CHO_XU_LY, RepairRequestStatus.DA_NGHIEM_THU, RepairRequestStatus.HOAN_THANH])(
    'start-repair only from LEN_KE_HOACH (ADMIN from %s rejected)', async (s) => {
      txRepair(s);
      await expect(repairRequestService.startRepair(1, admin)).rejects.toThrow(ValidationError);
      expect(tx.repairRequest.updateMany).not.toHaveBeenCalled();
    });

  it('ADMIN cannot reopen a completed YCSC', async () => {
    txRepair(RepairRequestStatus.HOAN_THANH);
    await expect(repairRequestService.accept(1, admin)).rejects.toThrow(ValidationError);
    await expect(repairRequestService.cancel(1, admin)).rejects.toThrow(ValidationError);
  });

  it('confirm-acceptance ignores cost and clears the stored result on KHÔNG ĐẠT', async () => {
    txRepair(RepairRequestStatus.CHO_NGHIEM_THU);
    tx.acceptanceHandover.findFirst.mockResolvedValue({ id: 'nt-1', nguoiXacNhanId: 'owner', nguoiXacNhanTen: 'Owner' });
    await repairRequestService.confirmAcceptance(1, owner, 'KHONG_DAT' as never, 'Còn rò rỉ');
    expect(tx.repairRequest.updateMany).toHaveBeenCalledWith({
      where: { id: 1, trangThai: RepairRequestStatus.CHO_NGHIEM_THU },
      data: { trangThai: RepairRequestStatus.DANG_SUA_CHUA, ketQuaNghiemThu: null },
    });
  });
});

// ── 4. Acceptance slip guards ────────────────────────────────────────────────

describe('acceptance slip guards', () => {
  const slipInput = { repairRequestId: 1, maYeuCauSuaChua: 'YC-SC-2026-001', tenHeThongThietBi: 'Bơm', tinhTrangTruocSuaChua: 'Hỏng', tinhTrangSauSuaChua: 'Tốt', nguoiBanGiao: 'KT', nguoiNhan: '', userId: 'tech', actorRole: 'EMPLOYEE' };
  const parent = (s: RepairRequestStatus) => tx.repairRequest.findUnique.mockImplementation((args: { select?: Record<string, unknown> }) =>
    Promise.resolve(args.select && 'inspectionRequest' in args.select
      ? { createdById: 'owner', createdByName: 'Owner', inspectionRequest: null }
      : { id: 1, maYeuCau: 'YC-SC-2026-001', trangThai: s, requestType: RequestType.SUA_CHUA }));

  beforeEach(() => {
    tx.acceptanceHandover.create.mockResolvedValue({ id: 'nt-new' });
    tx.acceptanceHandover.findUnique.mockResolvedValue({ id: 'nt-new', maNghiemThu: 'NT-010', maYeuCauSuaChua: 'YC-SC-2026-001', tenHeThongThietBi: 'Bơm' });
    mockPrisma.employee.findUnique.mockResolvedValue({ id: 'emp-owner' });
  });

  it('rejects a second slip while one is pending', async () => {
    parent(RepairRequestStatus.DANG_SUA_CHUA);
    tx.acceptanceHandover.findFirst.mockResolvedValue({ id: 'nt-old', maNghiemThu: 'NT-005' });
    await expect(acceptanceHandoverService.createAcceptanceHandover(slipInput)).rejects.toThrow('NT-005');
    expect(tx.acceptanceHandover.create).not.toHaveBeenCalled();
  });

  it.each([RepairRequestStatus.DA_NGHIEM_THU, RepairRequestStatus.HOAN_THANH, RepairRequestStatus.LEN_KE_HOACH])(
    'rejects slip creation in %s (ADMIN too)', async (s) => {
      parent(s);
      await expect(acceptanceHandoverService.createAcceptanceHandover({ ...slipInput, actorRole: 'ADMIN' })).rejects.toThrow(ValidationError);
    });

  it('allows the recovery slip in CHO_NGHIEM_THU without a pending slip and notifies right away', async () => {
    parent(RepairRequestStatus.CHO_NGHIEM_THU);
    const spy = jest.spyOn(acceptanceHandoverService, 'notifyConfirmer').mockResolvedValue(undefined);
    await acceptanceHandoverService.createAcceptanceHandover(slipInput);
    expect(tx.acceptanceHandover.create).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('normal slip (DANG_SUA_CHUA) does not notify yet — notification waits for submit', async () => {
    parent(RepairRequestStatus.DANG_SUA_CHUA);
    const spy = jest.spyOn(acceptanceHandoverService, 'notifyConfirmer').mockResolvedValue(undefined);
    await acceptanceHandoverService.createAcceptanceHandover(slipInput);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('NT code is numeric max + 1 (NT-1000 after NT-999)', async () => {
    tx.acceptanceHandover.findMany.mockResolvedValue([{ maNghiemThu: 'NT-999' }, { maNghiemThu: 'NT-1000' }, { maNghiemThu: 'NT-012' }]);
    await expect(acceptanceHandoverService.nextHandoverCode(tx)).resolves.toBe('NT-1001');
  });

  it('retries the transaction on a maNghiemThu unique violation', async () => {
    parent(RepairRequestStatus.DANG_SUA_CHUA);
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique', { code: 'P2002', clientVersion: 'test', meta: { target: ['maNghiemThu'] } });
    tx.acceptanceHandover.create.mockRejectedValueOnce(p2002).mockResolvedValueOnce({ id: 'nt-new' });
    await acceptanceHandoverService.createAcceptanceHandover(slipInput);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('a slip cannot be moved to another request', async () => {
    mockPrisma.acceptanceHandover.findUnique.mockResolvedValue({ id: 'nt-1', repairRequestId: 1, inspectionRequestId: null, ketQua: null, repairRequest: { id: 1, trangThai: 'CHO_NGHIEM_THU', maYeuCau: 'YC-SC-2026-001' } });
    await expect(acceptanceHandoverService.updateAcceptanceHandover('nt-1', { repairRequestId: 2, actorRole: 'EMPLOYEE' }))
      .rejects.toThrow('Không thể chuyển phiếu nghiệm thu sang yêu cầu khác');
    await expect(acceptanceHandoverService.updateAcceptanceHandover('nt-1', { inspectionRequestId: 3, actorRole: 'ADMIN' } as never))
      .rejects.toThrow('Không thể chuyển phiếu nghiệm thu sang yêu cầu khác');
  });
});

// ── 5. YCSC from YCKT preconditions ──────────────────────────────────────────

describe('create YCSC from YCKT', () => {
  const create = (actor: { actorId: string; actorRole: string }, extra: Record<string, unknown> = {}) => repairRequestService.createRepairRequest({
    ngayThang: new Date(), maYeuCau: 'YC-SC-2026-050', mucDoUuTien: 'Cao', sourceInspectionRequestId: '5',
    userId: actor.actorId, actorRole: actor.actorRole, items: [item(extra)],
  } as never);

  it('non-technical users cannot create from a YCKT', async () => {
    await expect(create(owner)).rejects.toThrow(AuthorizationError);
  });

  it.each([
    [InspectionRequestStatus.CHO_XU_LY, 'CAN_SUA_CHUA'],
    [InspectionRequestStatus.DA_KIEM_TRA, 'DA_KHAC_PHUC'],
    [InspectionRequestStatus.DA_HUY, 'CAN_SUA_CHUA'],
  ])('rejects source YCKT in %s / %s', async (trangThai, ketLuan) => {
    mockPrisma.inspectionRequest.findUnique.mockResolvedValue({ id: 5, trangThai, ketLuan });
    await expect(create(tech)).rejects.toThrow('Chỉ tạo yêu cầu sửa chữa từ phiếu kiểm tra đã kiểm tra với kết luận Cần sửa chữa');
  });

  it('rejects a sourceInspectionItemId from another YCKT', async () => {
    mockPrisma.inspectionRequest.findUnique.mockResolvedValue({ id: 5, trangThai: InspectionRequestStatus.DA_KIEM_TRA, ketLuan: 'CAN_SUA_CHUA' });
    mockPrisma.inspectionRequestItem.findMany.mockResolvedValue([]);
    await expect(create(tech, { sourceInspectionItemId: 'other' })).rejects.toThrow('sourceInspectionItemId không thuộc phiếu kiểm tra nguồn');
  });

  it('creates with a valid source and writes the initial status log', async () => {
    mockPrisma.inspectionRequest.findUnique.mockResolvedValue({ id: 5, trangThai: InspectionRequestStatus.DA_KIEM_TRA, ketLuan: 'CAN_SUA_CHUA' });
    mockPrisma.inspectionRequestItem.findMany.mockResolvedValue([{ id: 'ki-1' }]);
    mockPrisma.user.findUnique.mockResolvedValue({ firstName: 'A', lastName: 'Kỹ thuật' });
    (tx.repairRequest as any).create = jest.fn().mockResolvedValue({ id: 50 });
    tx.repairRequest.findUnique.mockResolvedValue({ id: 50, maYeuCau: 'YC-SC-2026-050' });
    await create(tech, { sourceInspectionItemId: 'ki-1' });
    expect(tx.repairRequest.create).toHaveBeenCalledWith({ data: expect.objectContaining({ sourceInspectionRequestId: 5 }) });
    expect(tx.repairRequestStatusLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ repairRequestId: 50, newStatus: 'CHO_XU_LY', reason: 'create', actorId: 'tech' }) });
  });

  it('keeps the fault link inherited from the source YCKT item even when the fault is already resolved', async () => {
    mockPrisma.inspectionRequest.findUnique.mockResolvedValue({ id: 5, trangThai: InspectionRequestStatus.DA_KIEM_TRA, ketLuan: 'CAN_SUA_CHUA' });
    // 1st call: inherited fault lookup; 2nd call: source item ownership check
    mockPrisma.inspectionRequestItem.findMany
      .mockResolvedValueOnce([{ id: 'ki-1', faultRecordId: 'fr-1' }])
      .mockResolvedValueOnce([{ id: 'ki-1' }]);
    mockPrisma.faultRecord.findUnique.mockResolvedValue({ id: 'fr-1', trangThai: 'DA_XU_LY' });
    mockPrisma.user.findUnique.mockResolvedValue({ firstName: 'A', lastName: 'Kỹ thuật' });
    (tx.repairRequest as any).create = jest.fn().mockResolvedValue({ id: 51 });
    tx.repairRequest.findUnique.mockResolvedValue({ id: 51, maYeuCau: 'YC-SC-2026-051' });
    await create(tech, { sourceInspectionItemId: 'ki-1', faultRecordId: 'fr-1' });
    expect(tx.repairRequestItem.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ faultRecordId: 'fr-1', sourceInspectionItemId: 'ki-1' })],
    });
  });

  it('still rejects a resolved fault that is not the source YCKT item link', async () => {
    mockPrisma.inspectionRequest.findUnique.mockResolvedValue({ id: 5, trangThai: InspectionRequestStatus.DA_KIEM_TRA, ketLuan: 'CAN_SUA_CHUA' });
    mockPrisma.inspectionRequestItem.findMany.mockResolvedValue([{ id: 'ki-1', faultRecordId: 'fr-1' }]);
    mockPrisma.faultRecord.findUnique.mockResolvedValue({ id: 'fr-2', trangThai: 'DA_XU_LY' });
    await expect(create(tech, { sourceInspectionItemId: 'ki-1', faultRecordId: 'fr-2' }))
      .rejects.toThrow('Bản ghi lỗi phải ở trạng thái Đang theo dõi hoặc Tái phát để liên kết');
  });
});

describe('calcActualCost uses real SupplyRequestItem fields', () => {
  beforeEach(() => {
    mockPrisma.repairRequest.findUnique.mockResolvedValue({ chiPhiDuKien: 100 });
    mockPrisma.repairSupplyLink = { findMany: jest.fn().mockResolvedValue([{ supplyRequestId: 'sr-1' }]) };
    mockPrisma.repairIncidentalCost = { findMany: jest.fn().mockResolvedValue([{ soTien: 5 }]) };
    mockPrisma.$queryRawUnsafe = jest.fn().mockResolvedValue([]);
    mockPrisma.lotProduct = { findFirst: jest.fn().mockResolvedValue(null) };
    mockPrisma.internationalProduct = {
      findFirst: jest.fn(({ where }: any) => Promise.resolve(where.tenSanPham.equals === 'Không giá' ? null : { giaThanh: 10 })),
    };
  });

  it('qty = issued once issued, else requested; cancelled lines cost only what was issued; unpriced only when qty > 0', async () => {
    mockPrisma.supplyRequestItem = {
      findMany: jest.fn().mockResolvedValue([
        { id: 'a', tenGoi: 'Bạc đạn', soLuong: 4, fulfilledQty: 0, fulfillmentStatus: 'Chờ xử lý' },
        { id: 'b', tenGoi: 'Dây curoa', soLuong: 5, fulfilledQty: 2, fulfillmentStatus: 'Đã cấp một phần' },
        { id: 'c', tenGoi: 'Không giá', soLuong: 3, fulfilledQty: 0, fulfillmentStatus: 'Đã hủy' },
      ]),
    };
    const r = await repairRequestService.calcActualCost(1);
    expect(r.items.map((i) => i.qty)).toEqual([4, 2, 0]);
    // 4*10 + 2*10 + incidental 5
    expect(r.actual).toBe(65);
    expect(r.itemsWithNullPrice).toEqual([]);
    expect(r.planSnapshot).toBe(100);
  });

  it("'Không cấp' lines (warehouse declined) cost 0 and never block completion for a missing price", async () => {
    mockPrisma.supplyRequestItem = {
      findMany: jest.fn().mockResolvedValue([
        { id: 'a', tenGoi: 'Bạc đạn', soLuong: 4, fulfilledQty: 4, fulfillmentStatus: 'Đã cấp đủ' },
        { id: 'd', tenGoi: 'Không giá', soLuong: 6, fulfilledQty: 0, fulfillmentStatus: 'Không cấp' },
      ]),
    };
    const r = await repairRequestService.calcActualCost(1);
    expect(r.items.map((i) => i.qty)).toEqual([4, 0]);
    // 4*10 + incidental 5 — the declined line adds nothing
    expect(r.actual).toBe(45);
    expect(r.itemsWithNullPrice).toEqual([]);
  });
});

describe('YCKT complete counts only active YCSC', () => {
  it('rejects when every linked YCSC is cancelled/rejected and filters by active status', async () => {
    tx.inspectionRequest.findUnique.mockResolvedValue({ id: 5, trangThai: InspectionRequestStatus.DA_KIEM_TRA, maYeuCau: 'YC-KT-2026-005', createdById: 'owner', ketLuan: 'CAN_SUA_CHUA' });
    tx.repairRequest.count.mockResolvedValue(0);
    await expect(inspectionRequestService.complete(5, admin)).rejects.toThrow('có yêu cầu sửa chữa còn hiệu lực');
    expect(tx.repairRequest.count).toHaveBeenCalledWith({
      where: { sourceInspectionRequestId: 5, trangThai: { notIn: [RepairRequestStatus.DA_HUY, RepairRequestStatus.TU_CHOI] } },
    });
    expect(tx.inspectionRequest.updateMany).not.toHaveBeenCalled();
  });

  it('ADMIN cannot close a YCKT pending acceptance (CHO_NGHIEM_THU) without confirmation', async () => {
    tx.inspectionRequest.findUnique.mockResolvedValue({ id: 5, trangThai: InspectionRequestStatus.CHO_NGHIEM_THU, maYeuCau: 'YC-KT-2026-005', createdById: 'owner', ketLuan: 'DA_KHAC_PHUC' });
    await expect(inspectionRequestService.complete(5, admin)).rejects.toThrow(ValidationError);
    expect(tx.inspectionRequest.updateMany).not.toHaveBeenCalled();
  });
});

// ── 6. Delete guards ─────────────────────────────────────────────────────────

describe('delete guards', () => {
  it('YCSC with an acceptance slip cannot be deleted', async () => {
    tx.repairRequest.findUnique.mockResolvedValue({ id: 1, trangThai: RepairRequestStatus.DA_HUY, _count: { acceptanceHandovers: 1 } });
    await expect(repairRequestService.deleteRepairRequest(1)).rejects.toThrow('đã có phiếu nghiệm thu');
  });

  it('YCSC past CHO_XU_LY (not cancelled/rejected) cannot be deleted', async () => {
    tx.repairRequest.findUnique.mockResolvedValue({ id: 1, trangThai: RepairRequestStatus.HOAN_THANH, _count: { acceptanceHandovers: 0 } });
    await expect(repairRequestService.deleteRepairRequest(1)).rejects.toThrow(ValidationError);
  });

  it('YCKT in DA_HUY without slips can be deleted', async () => {
    tx.inspectionRequest.findUnique.mockResolvedValue({ id: 5, trangThai: InspectionRequestStatus.DA_HUY, _count: { acceptanceHandovers: 0 } });
    await inspectionRequestService.deleteInspectionRequest(5);
    expect(tx.inspectionRequest.deleteMany).toHaveBeenCalledWith({ where: { id: 5, trangThai: InspectionRequestStatus.DA_HUY } });
  });

  it('YCKT with a slip cannot be deleted', async () => {
    tx.inspectionRequest.findUnique.mockResolvedValue({ id: 5, trangThai: InspectionRequestStatus.HOAN_THANH, _count: { acceptanceHandovers: 1 } });
    await expect(inspectionRequestService.deleteInspectionRequest(5)).rejects.toThrow('đã có phiếu nghiệm thu');
  });
});

// ── 7. Multi-file attachments (tepDinhKem, max 4, append-only) ───────────────

describe('inspection attachments', () => {
  const techChxuLy = { id: 5, trangThai: InspectionRequestStatus.CHO_XU_LY, createdById: 'tech' };

  it('update appends new files to existing ones', async () => {
    mockIsTechnicalMember.mockResolvedValue(true);
    mockPrisma.inspectionRequest.findUnique
      .mockResolvedValueOnce(techChxuLy)
      .mockResolvedValueOnce({ tepDinhKem: ['/uploads/inspection-requests/a.pdf'] });
    await inspectionRequestService.updateInspectionRequest(5, { tepDinhKem: ['/uploads/inspection-requests/b.pdf'] } as never, { actorId: 'tech', actorRole: 'EMPLOYEE' });
    expect(tx.inspectionRequest.updateMany).toHaveBeenCalledWith({
      where: { id: 5, trangThai: InspectionRequestStatus.CHO_XU_LY },
      data: expect.objectContaining({ tepDinhKem: ['/uploads/inspection-requests/a.pdf', '/uploads/inspection-requests/b.pdf'] }),
    });
  });

  it('update rejects when total exceeds 4 files', async () => {
    mockIsTechnicalMember.mockResolvedValue(true);
    mockPrisma.inspectionRequest.findUnique
      .mockResolvedValueOnce(techChxuLy)
      .mockResolvedValueOnce({ tepDinhKem: ['/uploads/inspection-requests/a.pdf', '/uploads/inspection-requests/b.pdf', '/uploads/inspection-requests/c.pdf'] });
    await expect(
      inspectionRequestService.updateInspectionRequest(5, { tepDinhKem: ['/uploads/inspection-requests/d.pdf', '/uploads/inspection-requests/e.pdf'] } as never, { actorId: 'tech', actorRole: 'EMPLOYEE' }),
    ).rejects.toThrow('tối đa 4 tệp');
    expect(tx.inspectionRequest.updateMany).not.toHaveBeenCalled();
  });
});
