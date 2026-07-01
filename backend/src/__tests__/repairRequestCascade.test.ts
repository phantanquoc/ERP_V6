/**
 * Jest tests for the RepairRequest cascade: when a RepairRequest auto-completes to
 * HOAN_THANH via AcceptanceHandover, linked FaultRecords should be closed to DA_XU_LY
 * inside the same transaction. Failures on individual FaultRecord updates must NOT
 * roll back the parent transition.
 *
 * These tests mock the DB and test the `createAcceptanceHandover` cascade logic.
 */

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { notify: jest.fn().mockResolvedValue(undefined) },
}));

// ── Prisma mock ───────────────────────────────────────────────────────────────

const txMock: any = {
  repairRequest: { findUnique: jest.fn(), update: jest.fn() },
  repairRequestItem: { count: jest.fn(), findMany: jest.fn() },
  repairRequestStatusLog: { create: jest.fn() },
  acceptanceHandover: { create: jest.fn(), findUnique: jest.fn() },
  acceptanceHandoverItem: { createMany: jest.fn(), findMany: jest.fn() },
  faultRecord: { findUnique: jest.fn(), update: jest.fn() },
  faultRecordStatusLog: { create: jest.fn() },
};

const mockPrisma: any = {
  $transaction: jest.fn((fn: (tx: any) => unknown) => fn(txMock)),
  acceptanceHandover: { findFirst: jest.fn() },
};

jest.mock('@config/database', () => ({ __esModule: true, default: mockPrisma }));

import acceptanceHandoverService from '@services/acceptanceHandoverService';
import { RepairRequestStatus, FaultRecordStatus } from '@prisma/client';

// ── Shared fixtures ────────────────────────────────────────────────────────────

const baseRepairRequest = {
  id: 1,
  maYeuCau: 'YC-SC-2026-001',
  trangThai: RepairRequestStatus.DANG_SUA_CHUA,
};

const baseHandover = {
  id: 'nt-1',
  maNghiemThu: 'NT-001',
  maYeuCauSuaChua: 'YC-SC-2026-001',
};

const baseCreateData = {
  repairRequestId: 1,
  maYeuCauSuaChua: 'YC-SC-2026-001',
  tenHeThongThietBi: 'Hệ thống bơm',
  tinhTrangTruocSuaChua: 'Hỏng',
  tinhTrangSauSuaChua: 'Đã sửa',
  nguoiBanGiao: 'Kỹ thuật viên A',
  nguoiNhan: 'Quản lý B',
  userId: 'user-1',
  items: [],
};

function setupFullCoverage() {
  // 1 item in parent, 1 covered in handover → triggers HOAN_THANH auto-complete
  txMock.repairRequest.findUnique.mockResolvedValue(baseRepairRequest);
  txMock.acceptanceHandover.create.mockResolvedValue({ id: 'nt-1' });
  txMock.acceptanceHandoverItem.createMany.mockResolvedValue({ count: 0 });
  txMock.repairRequestItem.count.mockResolvedValue(1);
  txMock.acceptanceHandoverItem.findMany.mockResolvedValue([{ repairRequestItemId: 'item-1' }]);
  txMock.repairRequest.update.mockResolvedValue({});
  txMock.repairRequestStatusLog.create.mockResolvedValue({});
  txMock.acceptanceHandover.findUnique.mockResolvedValue({ ...baseHandover, repairRequest: { items: [] }, items: [] });
  mockPrisma.acceptanceHandover.findFirst.mockResolvedValue(null); // for code generation
}

// ── Test: one linked FaultRecord auto-closes on HOAN_THANH ────────────────────

describe('cascade: one linked FaultRecord auto-closes on RepairRequest HOAN_THANH', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupFullCoverage();

    // Parent has 1 item with faultRecordId
    txMock.repairRequestItem.findMany.mockResolvedValue([
      { faultRecordId: 'fr-1' },
    ]);
    // FaultRecord is at DANG_THEO_DOI
    txMock.faultRecord.findUnique.mockResolvedValue({
      id: 'fr-1',
      trangThai: FaultRecordStatus.DANG_THEO_DOI,
    });
    txMock.faultRecord.update.mockResolvedValue({});
    txMock.faultRecordStatusLog.create.mockResolvedValue({});
  });

  it('updates linked FaultRecord to DA_XU_LY with source auto_from_repair', async () => {
    await acceptanceHandoverService.createAcceptanceHandover(baseCreateData);

    expect(txMock.faultRecord.update).toHaveBeenCalledWith({
      where: { id: 'fr-1' },
      data: expect.objectContaining({
        trangThai: FaultRecordStatus.DA_XU_LY,
        ngayXuLy: expect.any(Date),
      }),
    });

    expect(txMock.faultRecordStatusLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        faultRecordId: 'fr-1',
        oldStatus: FaultRecordStatus.DANG_THEO_DOI,
        newStatus: FaultRecordStatus.DA_XU_LY,
        source: 'auto_from_repair',
      }),
    });
  });
});

// ── Test: no linked FaultRecords → no FaultRecord updates ────────────────────

describe('cascade: no linked FaultRecords → no-op', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupFullCoverage();

    // No items have faultRecordId
    txMock.repairRequestItem.findMany.mockResolvedValue([
      { faultRecordId: null },
    ]);
  });

  it('does not touch faultRecord table when no items are linked', async () => {
    await acceptanceHandoverService.createAcceptanceHandover(baseCreateData);

    expect(txMock.faultRecord.findUnique).not.toHaveBeenCalled();
    expect(txMock.faultRecord.update).not.toHaveBeenCalled();
    expect(txMock.faultRecordStatusLog.create).not.toHaveBeenCalled();
  });
});

// ── Test: already-DA_XU_LY FaultRecord → skip silently ───────────────────────

describe('cascade: already-DA_XU_LY FaultRecord → skip', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupFullCoverage();

    txMock.repairRequestItem.findMany.mockResolvedValue([
      { faultRecordId: 'fr-already-done' },
    ]);
    txMock.faultRecord.findUnique.mockResolvedValue({
      id: 'fr-already-done',
      trangThai: FaultRecordStatus.DA_XU_LY,
    });
  });

  it('skips update when FaultRecord already at DA_XU_LY', async () => {
    await acceptanceHandoverService.createAcceptanceHandover(baseCreateData);

    expect(txMock.faultRecord.update).not.toHaveBeenCalled();
    expect(txMock.faultRecordStatusLog.create).not.toHaveBeenCalled();
  });
});

// ── Test: cascade failure does not roll back parent ───────────────────────────

describe('cascade: FaultRecord update failure does not roll back RepairRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupFullCoverage();

    txMock.repairRequestItem.findMany.mockResolvedValue([
      { faultRecordId: 'fr-fail' },
    ]);
    // FaultRecord lookup throws
    txMock.faultRecord.findUnique.mockRejectedValue(new Error('DB connection error'));
  });

  it('resolves without throwing even when FaultRecord cascade fails', async () => {
    await expect(
      acceptanceHandoverService.createAcceptanceHandover(baseCreateData)
    ).resolves.not.toThrow();

    // Parent RepairRequest still updated to HOAN_THANH
    expect(txMock.repairRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ trangThai: RepairRequestStatus.HOAN_THANH }),
      })
    );
  });

  it('does not update FaultRecord when lookup throws', async () => {
    await acceptanceHandoverService.createAcceptanceHandover(baseCreateData);
    expect(txMock.faultRecord.update).not.toHaveBeenCalled();
  });
});

// ── Test: partial coverage → no auto-complete → no cascade ───────────────────

describe('cascade: partial coverage does not trigger auto-complete or cascade', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    txMock.repairRequest.findUnique.mockResolvedValue(baseRepairRequest);
    txMock.acceptanceHandover.create.mockResolvedValue({ id: 'nt-2' });
    txMock.acceptanceHandoverItem.createMany.mockResolvedValue({ count: 0 });
    // 2 items total, only 1 covered → no auto-complete
    txMock.repairRequestItem.count.mockResolvedValue(2);
    txMock.acceptanceHandoverItem.findMany.mockResolvedValue([{ repairRequestItemId: 'item-1' }]);
    txMock.acceptanceHandover.findUnique.mockResolvedValue({ ...baseHandover, repairRequest: { items: [] }, items: [] });
    mockPrisma.acceptanceHandover.findFirst.mockResolvedValue(null);
  });

  it('does not update RepairRequest status when coverage is partial', async () => {
    await acceptanceHandoverService.createAcceptanceHandover(baseCreateData);

    expect(txMock.repairRequest.update).not.toHaveBeenCalled();
    expect(txMock.faultRecord.update).not.toHaveBeenCalled();
  });
});
