/**
 * Jest tests for the acceptance flow + FaultRecord cascade.
 *
 * Creating an AcceptanceHandover must NOT complete the repair any more — the requester
 * (creator of the source YCKT, else creator of the YCSC) has to confirm first. The
 * FaultRecord cascade (→ DA_XU_LY) now runs inside the `complete` transition, and a failure
 * on one FaultRecord must never roll back the parent status change.
 */

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { notify: jest.fn().mockResolvedValue(undefined) },
}));

// ── Prisma mock ───────────────────────────────────────────────────────────────

const txMock: any = {
  repairRequest: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  repairRequestItem: { count: jest.fn(), findMany: jest.fn() },
  repairRequestStatusLog: { create: jest.fn(), findFirst: jest.fn() },
  acceptanceHandover: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  acceptanceHandoverItem: { createMany: jest.fn(), findMany: jest.fn() },
  faultRecord: { findUnique: jest.fn(), update: jest.fn() },
  faultRecordStatusLog: { create: jest.fn() },
};

const mockPrisma: any = {
  $transaction: jest.fn((fn: (tx: any) => unknown) => fn(txMock)),
  acceptanceHandover: { findFirst: jest.fn() },
  employee: { findUnique: jest.fn() },
  repairRequest: { findUnique: jest.fn() },
  repairIncidentalCost: { findMany: jest.fn() },
  repairSupplyLink: { findMany: jest.fn() },
};

jest.mock('@config/database', () => ({ __esModule: true, default: mockPrisma }));

import acceptanceHandoverService from '@services/acceptanceHandoverService';
import repairRequestService from '@services/repairRequestService';
import { RepairRequestStatus, FaultRecordStatus, NghiemThuKetQua } from '@prisma/client';
import { AuthorizationError, ValidationError } from '@utils/errors';

// ── Shared fixtures ────────────────────────────────────────────────────────────

const baseHandover = {
  id: 'nt-1',
  maNghiemThu: 'NT-001',
  maYeuCauSuaChua: 'YC-SC-2026-001',
  tenHeThongThietBi: 'Hệ thống bơm',
};

const baseCreateData = {
  repairRequestId: 1,
  maYeuCauSuaChua: 'YC-SC-2026-001',
  tenHeThongThietBi: 'Hệ thống bơm',
  tinhTrangTruocSuaChua: 'Hỏng',
  tinhTrangSauSuaChua: 'Đã sửa',
  nguoiBanGiao: 'Kỹ thuật viên A',
  nguoiNhan: 'Quản lý B',
  userId: 'tech-user',
  items: [],
};

function mockRepairForCreate(source: { inspection?: { createdById: string; createdByName: string } | null } = {}) {
  txMock.repairRequest.findUnique.mockImplementation((args: { select?: Record<string, unknown> }) => {
    if (args.select && 'inspectionRequest' in args.select) {
      return Promise.resolve({
        createdById: 'ycsc-creator',
        createdByName: 'Người tạo YCSC',
        inspectionRequest: source.inspection ?? null,
      });
    }
    return Promise.resolve({ id: 1, maYeuCau: 'YC-SC-2026-001', trangThai: RepairRequestStatus.DANG_SUA_CHUA });
  });
  txMock.acceptanceHandover.create.mockResolvedValue({ id: 'nt-1' });
  txMock.acceptanceHandover.findUnique.mockResolvedValue({ ...baseHandover, repairRequest: { items: [] }, items: [] });
  txMock.acceptanceHandover.findFirst.mockResolvedValue(null); // no pending slip
  txMock.acceptanceHandover.findMany.mockResolvedValue([]); // no existing NT codes
  txMock.repairRequestStatusLog.findFirst.mockResolvedValue(null);
  mockPrisma.acceptanceHandover.findFirst.mockResolvedValue(null);
  mockPrisma.employee.findUnique.mockResolvedValue({ id: 'emp-confirmer' });
}

// ── createAcceptanceHandover: no auto-complete, confirmer resolution ──────────

describe('createAcceptanceHandover', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not change the repair status (waits for requester confirmation)', async () => {
    mockRepairForCreate();
    await acceptanceHandoverService.createAcceptanceHandover(baseCreateData);

    expect(txMock.repairRequest.update).not.toHaveBeenCalled();
    expect(txMock.repairRequestStatusLog.create).not.toHaveBeenCalled();
    expect(txMock.faultRecord.update).not.toHaveBeenCalled();
    expect(txMock.acceptanceHandover.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ ketQua: null }),
    });
  });

  it('assigns the YCKT creator as confirmer when the repair came from an inspection', async () => {
    mockRepairForCreate({ inspection: { createdById: 'yckt-creator', createdByName: 'Người tạo YCKT' } });
    await acceptanceHandoverService.createAcceptanceHandover(baseCreateData);

    expect(txMock.acceptanceHandover.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ nguoiXacNhanId: 'yckt-creator', nguoiXacNhanTen: 'Người tạo YCKT', nguoiNhan: 'Người tạo YCKT' }),
    });
  });

  it('assigns the YCSC creator as confirmer for a standalone repair', async () => {
    mockRepairForCreate({ inspection: null });
    await acceptanceHandoverService.createAcceptanceHandover(baseCreateData);

    expect(txMock.acceptanceHandover.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ nguoiXacNhanId: 'ycsc-creator', nguoiXacNhanTen: 'Người tạo YCSC' }),
    });
  });
});

// ── recordConfirmationTx: only the designated confirmer (or ADMIN) ────────────

describe('recordConfirmationTx', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    txMock.acceptanceHandover.findFirst.mockResolvedValue({ id: 'nt-1', nguoiXacNhanId: 'yckt-creator', nguoiXacNhanTen: 'Người tạo YCKT' });
    txMock.acceptanceHandover.update.mockResolvedValue({});
  });

  it('rejects a technician who is not the confirmer', async () => {
    await expect(acceptanceHandoverService.recordConfirmationTx(
      txMock, { repairRequestId: 1 }, { actorId: 'tech-user', actorRole: 'TEAM_LEAD' }, NghiemThuKetQua.DAT,
    )).rejects.toThrow(AuthorizationError);
    expect(txMock.acceptanceHandover.update).not.toHaveBeenCalled();
  });

  it('records ĐẠT from the confirmer', async () => {
    await acceptanceHandoverService.recordConfirmationTx(
      txMock, { repairRequestId: 1 }, { actorId: 'yckt-creator', actorRole: 'EMPLOYEE' }, NghiemThuKetQua.DAT,
    );
    expect(txMock.acceptanceHandover.update).toHaveBeenCalledWith({
      where: { id: 'nt-1' },
      data: expect.objectContaining({ ketQua: NghiemThuKetQua.DAT, xacNhanBoiId: 'yckt-creator', xacNhanLuc: expect.any(Date) }),
    });
  });

  it('requires a reason for KHÔNG ĐẠT', async () => {
    await expect(acceptanceHandoverService.recordConfirmationTx(
      txMock, { repairRequestId: 1 }, { actorId: 'yckt-creator' }, NghiemThuKetQua.KHONG_DAT, '  ',
    )).rejects.toThrow(ValidationError);
  });

  it('lets ADMIN confirm on behalf of the requester', async () => {
    await acceptanceHandoverService.recordConfirmationTx(
      txMock, { repairRequestId: 1 }, { actorId: 'admin-user', actorRole: 'ADMIN' }, NghiemThuKetQua.DAT,
    );
    expect(txMock.acceptanceHandover.update).toHaveBeenCalled();
  });

  it('fails when there is no pending slip', async () => {
    txMock.acceptanceHandover.findFirst.mockResolvedValue(null);
    await expect(acceptanceHandoverService.recordConfirmationTx(
      txMock, { repairRequestId: 1 }, { actorId: 'yckt-creator' }, NghiemThuKetQua.DAT,
    )).rejects.toThrow('Chưa có phiếu nghiệm thu chờ xác nhận');
  });
});

// ── complete(): FaultRecord cascade lives here now ────────────────────────────

describe('repairRequestService.complete — FaultRecord cascade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // calcActualCost: no supply links → no unpriced items
    mockPrisma.repairSupplyLink.findMany.mockResolvedValue([]);
    mockPrisma.repairIncidentalCost.findMany.mockResolvedValue([]);
    mockPrisma.repairRequest.findUnique.mockResolvedValue({ trangThai: RepairRequestStatus.DA_NGHIEM_THU, chiPhiDuKien: null, supplyLinks: [] });
    txMock.repairRequest.findUnique.mockResolvedValue({ id: 1, trangThai: RepairRequestStatus.DA_NGHIEM_THU, maYeuCau: 'YC-SC-2026-001', requestType: 'SUA_CHUA', createdById: 'ycsc-creator' });
    txMock.repairRequest.update.mockResolvedValue({});
    txMock.repairRequest.updateMany.mockResolvedValue({ count: 1 });
    txMock.repairRequestStatusLog.create.mockResolvedValue({});
  });

  it('closes linked FaultRecords to DA_XU_LY with source auto_from_repair', async () => {
    txMock.repairRequestItem.findMany.mockResolvedValue([{ faultRecordId: 'fr-1' }]);
    txMock.faultRecord.findUnique.mockResolvedValue({ id: 'fr-1', trangThai: FaultRecordStatus.DANG_THEO_DOI });

    await repairRequestService.complete(1, { actorId: 'tech-user', actorRole: 'TEAM_LEAD' });

    expect(txMock.faultRecord.update).toHaveBeenCalledWith({
      where: { id: 'fr-1' },
      data: expect.objectContaining({ trangThai: FaultRecordStatus.DA_XU_LY, ngayXuLy: expect.any(Date) }),
    });
    expect(txMock.faultRecordStatusLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ faultRecordId: 'fr-1', newStatus: FaultRecordStatus.DA_XU_LY, source: 'auto_from_repair' }),
    });
  });

  it('skips FaultRecords already at DA_XU_LY', async () => {
    txMock.repairRequestItem.findMany.mockResolvedValue([{ faultRecordId: 'fr-done' }]);
    txMock.faultRecord.findUnique.mockResolvedValue({ id: 'fr-done', trangThai: FaultRecordStatus.DA_XU_LY });

    await repairRequestService.complete(1, { actorId: 'tech-user', actorRole: 'TEAM_LEAD' });
    expect(txMock.faultRecord.update).not.toHaveBeenCalled();
  });

  it('still completes the repair when a FaultRecord update fails', async () => {
    txMock.repairRequestItem.findMany.mockResolvedValue([{ faultRecordId: 'fr-fail' }]);
    txMock.faultRecord.findUnique.mockRejectedValue(new Error('DB connection error'));

    await expect(repairRequestService.complete(1, { actorId: 'tech-user', actorRole: 'TEAM_LEAD' })).resolves.not.toThrow();
    expect(txMock.repairRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1, trangThai: RepairRequestStatus.DA_NGHIEM_THU },
        data: expect.objectContaining({ trangThai: RepairRequestStatus.HOAN_THANH }),
      }),
    );
  });

  it('refuses to complete before the requester confirmed ĐẠT (status read inside the transaction)', async () => {
    txMock.repairRequest.findUnique.mockResolvedValue({ id: 1, trangThai: RepairRequestStatus.CHO_NGHIEM_THU, maYeuCau: 'YC-SC-2026-001', requestType: 'SUA_CHUA', createdById: null });
    await expect(repairRequestService.complete(1, { actorId: 'tech-user', actorRole: 'TEAM_LEAD' }))
      .rejects.toThrow('Chỉ hoàn thành khi người yêu cầu đã xác nhận nghiệm thu ĐẠT');
    expect(txMock.repairRequest.updateMany).not.toHaveBeenCalled();
  });

  it('ADMIN cannot complete without ĐẠT either', async () => {
    txMock.repairRequest.findUnique.mockResolvedValue({ id: 1, trangThai: RepairRequestStatus.CHO_XU_LY, maYeuCau: 'YC-SC-2026-001', requestType: 'SUA_CHUA', createdById: null });
    await expect(repairRequestService.complete(1, { actorId: 'admin', actorRole: 'ADMIN' }))
      .rejects.toThrow('Chỉ hoàn thành khi người yêu cầu đã xác nhận nghiệm thu ĐẠT');
    expect(txMock.repairRequest.updateMany).not.toHaveBeenCalled();
  });

  it('a concurrent change makes the guarded update conflict', async () => {
    txMock.repairRequestItem.findMany.mockResolvedValue([]);
    txMock.repairRequest.updateMany.mockResolvedValue({ count: 0 });
    await expect(repairRequestService.complete(1, { actorId: 'tech-user', actorRole: 'TEAM_LEAD' }))
      .rejects.toThrow('Phiếu đã được cập nhật bởi người khác, vui lòng tải lại');
    expect(txMock.repairRequestStatusLog.create).not.toHaveBeenCalled();
  });
});
