jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { notify: jest.fn().mockResolvedValue(undefined) },
}));

const mockPrisma: any = {
  $transaction: jest.fn((arg: unknown): unknown => {
    if (typeof arg === 'function') return (arg as (tx: any) => unknown)(mockPrisma);
    return Promise.all(arg as Promise<unknown>[]);
  }),
  faultRecord: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  faultRecordStatusLog: {
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  repairRequest: {
    findUnique: jest.fn(),
  },
  faultTemplate: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
  },
  machineSystem: {
    findUnique: jest.fn(),
  },
  machineSystemDetail: {
    findUnique: jest.fn(),
  },
};

jest.mock('@config/database', () => ({ __esModule: true, default: mockPrisma }));

import faultRecordService from '@services/faultRecordService';
import { FaultRecordStatus } from '@prisma/client';
import { ValidationError, NotFoundError } from '@utils/errors';

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── markResolved ──────────────────────────────────────────────────────────────

describe('faultRecordService.markResolved', () => {
  it('happy path: transitions DANG_THEO_DOI → DA_XU_LY, sets ngayXuLy, creates log row', async () => {
    const record = {
      id: 'fr-1',
      trangThai: FaultRecordStatus.DANG_THEO_DOI,
      maLoi: 'LI-2026-001',
    };
    mockPrisma.faultRecord.findUnique.mockResolvedValue(record);
    mockPrisma.faultRecord.update.mockResolvedValue({ ...record, trangThai: FaultRecordStatus.DA_XU_LY });
    mockPrisma.faultRecordStatusLog.create.mockResolvedValue({});

    await expect(faultRecordService.markResolved('fr-1', 'user-1', 'Test reason')).resolves.not.toThrow();

    expect(mockPrisma.faultRecord.update).toHaveBeenCalledWith({
      where: { id: 'fr-1' },
      data: expect.objectContaining({
        trangThai: FaultRecordStatus.DA_XU_LY,
        ngayXuLy: expect.any(Date),
      }),
    });

    expect(mockPrisma.faultRecordStatusLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        faultRecordId: 'fr-1',
        oldStatus: FaultRecordStatus.DANG_THEO_DOI,
        newStatus: FaultRecordStatus.DA_XU_LY,
        source: 'manual',
        reason: 'Test reason',
      }),
    });
  });

  it('rejects skip-step: DANG_THEO_DOI → TAI_PHAT', async () => {
    // markResolved always targets DA_XU_LY — skip-step test via TAI_PHAT → DA_XU_LY
    // Test: if current is already DA_XU_LY, advanceFaultRecordStatus is a no-op but
    // the intent is to verify that an invalid input causes ValidationError.
    // Since markResolved always calls advanceFaultRecordStatus(current, DA_XU_LY),
    // we test that markRecurred (TAI_PHAT) from DANG_THEO_DOI is rejected via advanceFaultRecordStatus.
    const record = {
      id: 'fr-skip',
      trangThai: FaultRecordStatus.DANG_THEO_DOI,
    };
    mockPrisma.faultRecord.findUnique.mockResolvedValue(record);

    // Calling markRecurred (which targets TAI_PHAT) from DANG_THEO_DOI should throw ValidationError
    await expect(faultRecordService.markRecurred('fr-skip', 'user-1')).rejects.toThrow(ValidationError);
  });

  it('throws NotFoundError when record not found', async () => {
    mockPrisma.faultRecord.findUnique.mockResolvedValue(null);
    await expect(faultRecordService.markResolved('missing', 'user-1')).rejects.toThrow(NotFoundError);
  });
});

// ─── markResolvedFromRepair ────────────────────────────────────────────────────

describe('faultRecordService.markResolvedFromRepair', () => {
  it('resolves DANG_THEO_DOI → DA_XU_LY with source auto_from_repair', async () => {
    const record = { id: 'fr-2', trangThai: FaultRecordStatus.DANG_THEO_DOI };
    const repairRequest = { maYeuCau: 'YC-2026-001' };
    mockPrisma.faultRecord.findUnique.mockResolvedValue(record);
    mockPrisma.repairRequest.findUnique.mockResolvedValue(repairRequest);
    mockPrisma.faultRecord.update.mockResolvedValue({});
    mockPrisma.faultRecordStatusLog.create.mockResolvedValue({});

    await expect(faultRecordService.markResolvedFromRepair('fr-2', 1, 'user-1')).resolves.not.toThrow();

    expect(mockPrisma.faultRecordStatusLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: 'auto_from_repair',
        faultRecordId: 'fr-2',
      }),
    });
  });

  it('no-op when record is already DA_XU_LY', async () => {
    const record = { id: 'fr-3', trangThai: FaultRecordStatus.DA_XU_LY };
    mockPrisma.faultRecord.findUnique.mockResolvedValue(record);

    await faultRecordService.markResolvedFromRepair('fr-3', 1, 'user-1');

    expect(mockPrisma.faultRecord.update).not.toHaveBeenCalled();
    expect(mockPrisma.faultRecordStatusLog.create).not.toHaveBeenCalled();
  });

  it('swallows errors without throwing (cascade must not roll back)', async () => {
    mockPrisma.faultRecord.findUnique.mockRejectedValue(new Error('DB error'));

    // Must resolve without throwing
    await expect(faultRecordService.markResolvedFromRepair('fr-err', 1, 'user-1')).resolves.toBeUndefined();
  });

  it('no-op when record is not found', async () => {
    mockPrisma.faultRecord.findUnique.mockResolvedValue(null);

    await faultRecordService.markResolvedFromRepair('fr-missing', 1, 'user-1');

    expect(mockPrisma.faultRecord.update).not.toHaveBeenCalled();
  });
});

// ─── markRecurred ──────────────────────────────────────────────────────────────

describe('faultRecordService.markRecurred', () => {
  it('transitions DA_XU_LY → TAI_PHAT and clears ngayXuLy', async () => {
    const record = {
      id: 'fr-4',
      trangThai: FaultRecordStatus.DA_XU_LY,
      ngayXuLy: new Date(),
    };
    mockPrisma.faultRecord.findUnique.mockResolvedValue(record);
    mockPrisma.faultRecord.update.mockResolvedValue({});
    mockPrisma.faultRecordStatusLog.create.mockResolvedValue({});

    await faultRecordService.markRecurred('fr-4', 'user-1');

    expect(mockPrisma.faultRecord.update).toHaveBeenCalledWith({
      where: { id: 'fr-4' },
      data: expect.objectContaining({
        trangThai: FaultRecordStatus.TAI_PHAT,
        ngayXuLy: null,
      }),
    });
  });

  it('uses source manual when opts.auto is falsy', async () => {
    const record = { id: 'fr-5', trangThai: FaultRecordStatus.DA_XU_LY };
    mockPrisma.faultRecord.findUnique.mockResolvedValue(record);
    mockPrisma.faultRecord.update.mockResolvedValue({});
    mockPrisma.faultRecordStatusLog.create.mockResolvedValue({});

    await faultRecordService.markRecurred('fr-5', 'user-1', { reason: 'Test' });

    expect(mockPrisma.faultRecordStatusLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: 'manual' }),
    });
  });

  it('uses source recurrence_detected_manual_confirm when opts.auto is true', async () => {
    const record = { id: 'fr-6', trangThai: FaultRecordStatus.DA_XU_LY };
    mockPrisma.faultRecord.findUnique.mockResolvedValue(record);
    mockPrisma.faultRecord.update.mockResolvedValue({});
    mockPrisma.faultRecordStatusLog.create.mockResolvedValue({});

    await faultRecordService.markRecurred('fr-6', 'user-1', { auto: true });

    expect(mockPrisma.faultRecordStatusLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: 'recurrence_detected_manual_confirm' }),
    });
  });
});

// ─── detectRecurrenceOnCreate ──────────────────────────────────────────────────

describe('faultRecordService.detectRecurrenceOnCreate', () => {
  it('inserts recurrence_detected log on OLD record when match found', async () => {
    const priorRecord = { id: 'fr-old' };
    mockPrisma.faultRecord.findFirst.mockResolvedValue(priorRecord);
    mockPrisma.faultRecordStatusLog.create.mockResolvedValue({});

    await faultRecordService.detectRecurrenceOnCreate(
      {
        id: 'fr-new',
        maLoi: 'LI-2026-002',
        machineSystemDetailId: 'detail-1',
        tenLoi: 'Lỗi bơm',
      },
      'user-1'
    );

    expect(mockPrisma.faultRecordStatusLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        faultRecordId: 'fr-old', // log is on the OLD record
        source: 'recurrence_detected',
        reason: expect.stringContaining('LI-2026-002'),
      }),
    });
  });

  it('does nothing when no prior record found', async () => {
    mockPrisma.faultRecord.findFirst.mockResolvedValue(null);

    await faultRecordService.detectRecurrenceOnCreate(
      {
        id: 'fr-new',
        maLoi: 'LI-2026-003',
        machineSystemDetailId: 'detail-2',
        tenLoi: 'Lỗi van',
      },
      null
    );

    expect(mockPrisma.faultRecordStatusLog.create).not.toHaveBeenCalled();
  });

  it('does nothing when machineSystemDetailId is null', async () => {
    await faultRecordService.detectRecurrenceOnCreate(
      {
        id: 'fr-new',
        maLoi: 'LI-2026-004',
        machineSystemDetailId: null,
        tenLoi: 'Lỗi van',
      },
      null
    );

    expect(mockPrisma.faultRecord.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.faultRecordStatusLog.create).not.toHaveBeenCalled();
  });

  it('swallows errors without throwing', async () => {
    mockPrisma.faultRecord.findFirst.mockRejectedValue(new Error('DB error'));

    // Must resolve without throwing
    await expect(
      faultRecordService.detectRecurrenceOnCreate(
        {
          id: 'fr-err',
          maLoi: 'LI-2026-005',
          machineSystemDetailId: 'detail-3',
          tenLoi: 'Lỗi bơm',
        },
        null
      )
    ).resolves.toBeUndefined();
  });
});
