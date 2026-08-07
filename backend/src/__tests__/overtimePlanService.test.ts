jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    overtimePlan: { findUnique: jest.fn() },
    overtimePlanItem: { findUnique: jest.fn() },
    employee: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn() },
    workShift: { findUnique: jest.fn(), findMany: jest.fn() },
    user: { findMany: jest.fn(), findUnique: jest.fn() },
  },
}));

jest.mock('@services/notificationService', () => ({
  __esModule: true,
  default: { notify: jest.fn().mockResolvedValue(undefined) },
}));

import prisma from '@config/database';
import overtimePlanService from '@services/overtimePlanService';
import { ApiError } from '@utils/errors';

const mockedPrisma = prisma as unknown as {
  $transaction: jest.Mock;
  overtimePlan: { findUnique: jest.Mock };
  employee: { findMany: jest.Mock; findFirst: jest.Mock; findUnique: jest.Mock };
  workShift: { findUnique: jest.Mock; findMany: jest.Mock };
  user: { findMany: jest.Mock; findUnique: jest.Mock };
};

const PLAN_ID = 'plan-1';
const OTHER_PLAN_ID = 'plan-2';

/** Transaction client captured per test so assertions can inspect the calls. */
interface MockTx {
  overtimePlan: { update: jest.Mock; findUnique: jest.Mock };
  overtimePlanItem: { deleteMany: jest.Mock; createMany: jest.Mock };
  attendance: { deleteMany: jest.Mock; create: jest.Mock; findFirst: jest.Mock };
  employee: { findFirst: jest.Mock };
  workShift: { findMany: jest.Mock };
}

let tx: MockTx;

/** Employees keyed by userId; the service resolves userId → employee row. */
const EMPLOYEES: Record<string, { id: string; userId: string }> = {
  'user-a': { id: 'emp-a', userId: 'user-a' },
  'user-b': { id: 'emp-b', userId: 'user-b' },
  'user-c': { id: 'emp-c', userId: 'user-c' },
};

function makeTx(overrides: Partial<MockTx> = {}): MockTx {
  return {
    overtimePlan: {
      update: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue({ id: PLAN_ID, nguoiTaoId: 'user-a', items: [] }),
    },
    overtimePlanItem: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    attendance: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    employee: {
      findFirst: jest.fn(({ where }: any) => Promise.resolve(EMPLOYEES[where.userId] ?? null)),
    },
    workShift: { findMany: jest.fn().mockResolvedValue([]) },
    ...overrides,
  };
}

/** An existing plan row as findPlanWithItems would return it. */
function existingPlan(opts: {
  trangThai?: string;
  nguoiTaoId?: string;
  items?: any[];
  noiDung?: string;
} = {}) {
  return {
    id: PLAN_ID,
    nguoiTaoId: opts.nguoiTaoId ?? 'user-a',
    noiDung: opts.noiDung ?? 'Tăng ca lựa hàng',
    ghiChu: null,
    files: [],
    trangThai: opts.trangThai ?? 'DA_DUYET',
    items: opts.items ?? [],
  };
}

function priorItem(opts: {
  ngayTangCa: string;
  gioBatDau: string;
  gioKetThuc: string;
  nguoiThamGiaIds: string[];
  trangThaiTiepNhan?: Record<string, string>;
  gioThucTe?: Record<string, any>;
}) {
  return {
    id: `item-${opts.ngayTangCa}-${opts.gioBatDau}`,
    overtimePlanId: PLAN_ID,
    ngayTangCa: new Date(opts.ngayTangCa),
    gioBatDau: opts.gioBatDau,
    gioKetThuc: opts.gioKetThuc,
    workShiftId: null,
    workShiftName: null,
    nguoiThamGiaIds: opts.nguoiThamGiaIds,
    ghiChuItem: null,
    trangThaiTiepNhan: opts.trangThaiTiepNhan ?? {},
    gioThucTe: opts.gioThucTe ?? {},
  };
}

/** Incoming item payload; nguoiThamGia carries employee IDs, not user IDs. */
function inputItem(opts: {
  ngayTangCa: string;
  gioBatDau: string;
  gioKetThuc: string;
  nguoiThamGia: string[];
  workShiftId?: string;
  ghiChuItem?: string;
}) {
  return {
    ngayTangCa: opts.ngayTangCa,
    gioBatDau: opts.gioBatDau,
    gioKetThuc: opts.gioKetThuc,
    nguoiThamGia: opts.nguoiThamGia,
    workShiftId: opts.workShiftId,
    ghiChuItem: opts.ghiChuItem,
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  tx = makeTx();

  mockedPrisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

  // resolveItemData: employee IDs → user IDs
  mockedPrisma.employee.findMany.mockImplementation(({ where }: any) =>
    Promise.resolve(
      (where.id.in as string[]).map(empId => ({
        id: empId,
        userId: Object.values(EMPLOYEES).find(e => e.id === empId)?.userId,
      }))
    )
  );
  mockedPrisma.user.findMany.mockResolvedValue([]);
  mockedPrisma.employee.findFirst.mockImplementation(({ where }: any) =>
    Promise.resolve(EMPLOYEES[where.userId] ?? null)
  );
});

// ── 8.6 Status gating ────────────────────────────────────────────────────────

describe('update() status gating', () => {
  it.each(['TU_CHOI', 'HOAN_THANH', 'HUY'])(
    'rejects an admin edit on terminal status %s with a Vietnamese message',
    async (trangThai) => {
      mockedPrisma.overtimePlan.findUnique.mockResolvedValue(existingPlan({ trangThai }));

      await expect(
        overtimePlanService.update(PLAN_ID, {} as any, 'admin-1', true)
      ).rejects.toThrow(ApiError);
      await expect(
        overtimePlanService.update(PLAN_ID, {} as any, 'admin-1', true)
      ).rejects.toThrow(/Không thể chỉnh sửa kế hoạch/);

      expect(mockedPrisma.$transaction).not.toHaveBeenCalled();
    }
  );

  it.each(['CHO_DUYET', 'DA_DUYET'])('allows an admin edit on %s', async (trangThai) => {
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue(existingPlan({ trangThai }));

    await overtimePlanService.update(PLAN_ID, { noiDung: 'x' } as any, 'admin-1', true);

    expect(mockedPrisma.$transaction).toHaveBeenCalled();
  });

  it('still blocks a non-admin who is not the creator', async () => {
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue(
      existingPlan({ trangThai: 'CHO_DUYET', nguoiTaoId: 'user-a' })
    );

    await expect(
      overtimePlanService.update(PLAN_ID, {} as any, 'user-b', false)
    ).rejects.toThrow(/Chỉ người tạo hoặc admin/);
  });

  it('still blocks the creator once the plan is approved', async () => {
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue(
      existingPlan({ trangThai: 'DA_DUYET', nguoiTaoId: 'user-a' })
    );

    await expect(
      overtimePlanService.update(PLAN_ID, {} as any, 'user-a', false)
    ).rejects.toThrow(/khi chưa được duyệt/);
  });
});

// ── 8.2 / 8.3 Attendance sync ────────────────────────────────────────────────

describe('update() attendance sync', () => {
  const baseItems = [
    priorItem({
      ngayTangCa: '2026-08-03T00:00:00.000Z',
      gioBatDau: '18:00',
      gioKetThuc: '21:00',
      nguoiThamGiaIds: ['user-a'],
    }),
  ];

  it('regenerates attendance with the new hours when hours change', async () => {
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue(
      existingPlan({ trangThai: 'DA_DUYET', items: baseItems })
    );

    await overtimePlanService.update(
      PLAN_ID,
      {
        items: [
          inputItem({
            ngayTangCa: '2026-08-03T00:00:00.000Z',
            gioBatDau: '18:00',
            gioKetThuc: '22:00',
            nguoiThamGia: ['emp-a'],
          }),
        ],
      } as any,
      'admin-1',
      true
    );

    expect(tx.attendance.deleteMany).toHaveBeenCalledWith({ where: { overtimePlanId: PLAN_ID } });
    expect(tx.attendance.create).toHaveBeenCalledTimes(1);
    const created = tx.attendance.create.mock.calls[0][0].data;
    expect(created.workHours).toBe(4);
    expect(created.employeeId).toBe('emp-a');
    expect(created.overtimePlanId).toBe(PLAN_ID);
  });

  it('drops the removed participant and keeps the remaining one', async () => {
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue(
      existingPlan({
        trangThai: 'DA_DUYET',
        items: [
          priorItem({
            ngayTangCa: '2026-08-03T00:00:00.000Z',
            gioBatDau: '18:00',
            gioKetThuc: '21:00',
            nguoiThamGiaIds: ['user-a', 'user-b'],
          }),
        ],
      })
    );

    await overtimePlanService.update(
      PLAN_ID,
      {
        items: [
          inputItem({
            ngayTangCa: '2026-08-03T00:00:00.000Z',
            gioBatDau: '18:00',
            gioKetThuc: '21:00',
            nguoiThamGia: ['emp-a'],
          }),
        ],
      } as any,
      'admin-1',
      true
    );

    const employeeIds = tx.attendance.create.mock.calls.map((c: any) => c[0].data.employeeId);
    expect(employeeIds).toEqual(['emp-a']);
  });

  it('creates a row for a newly added participant', async () => {
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue(
      existingPlan({ trangThai: 'DA_DUYET', items: baseItems })
    );

    await overtimePlanService.update(
      PLAN_ID,
      {
        items: [
          inputItem({
            ngayTangCa: '2026-08-03T00:00:00.000Z',
            gioBatDau: '18:00',
            gioKetThuc: '21:00',
            nguoiThamGia: ['emp-a', 'emp-c'],
          }),
        ],
      } as any,
      'admin-1',
      true
    );

    const employeeIds = tx.attendance.create.mock.calls.map((c: any) => c[0].data.employeeId);
    expect(employeeIds).toEqual(['emp-a', 'emp-c']);
  });

  it('moves the attendance row when the date changes', async () => {
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue(
      existingPlan({ trangThai: 'DA_DUYET', items: baseItems })
    );

    await overtimePlanService.update(
      PLAN_ID,
      {
        items: [
          inputItem({
            ngayTangCa: '2026-08-04T00:00:00.000Z',
            gioBatDau: '18:00',
            gioKetThuc: '21:00',
            nguoiThamGia: ['emp-a'],
          }),
        ],
      } as any,
      'admin-1',
      true
    );

    const created = tx.attendance.create.mock.calls[0][0].data;
    expect(created.attendanceDate.toISOString()).toBe('2026-08-04T00:00:00.000Z');
  });

  it('scopes the delete to this plan so kiosk and other plans survive', async () => {
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue(
      existingPlan({ trangThai: 'DA_DUYET', items: baseItems })
    );

    await overtimePlanService.update(
      PLAN_ID,
      {
        items: [
          inputItem({
            ngayTangCa: '2026-08-03T00:00:00.000Z',
            gioBatDau: '18:00',
            gioKetThuc: '21:00',
            nguoiThamGia: ['emp-a'],
          }),
        ],
      } as any,
      'admin-1',
      true
    );

    // The only delete issued is keyed on this plan's id — a null overtimePlanId
    // (kiosk) or another plan's id can never fall inside that predicate.
    expect(tx.attendance.deleteMany).toHaveBeenCalledTimes(1);
    const where = tx.attendance.deleteMany.mock.calls[0][0].where;
    expect(where).toEqual({ overtimePlanId: PLAN_ID });
    expect(where.overtimePlanId).not.toBeNull();
    expect(where.overtimePlanId).not.toBe(OTHER_PLAN_ID);
  });

  it('leaves attendance completely untouched for a pending plan', async () => {
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue(
      existingPlan({ trangThai: 'CHO_DUYET', items: baseItems })
    );

    await overtimePlanService.update(
      PLAN_ID,
      {
        items: [
          inputItem({
            ngayTangCa: '2026-08-03T00:00:00.000Z',
            gioBatDau: '18:00',
            gioKetThuc: '23:00',
            nguoiThamGia: ['emp-a'],
          }),
        ],
      } as any,
      'admin-1',
      true
    );

    expect(tx.attendance.deleteMany).not.toHaveBeenCalled();
    expect(tx.attendance.create).not.toHaveBeenCalled();
  });

  // ── 8.4 Transaction atomicity ──────────────────────────────────────────────

  it('rolls the whole edit back when regeneration throws', async () => {
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue(
      existingPlan({ trangThai: 'DA_DUYET', items: baseItems })
    );
    tx.attendance.create.mockRejectedValue(new Error('db down'));

    // $transaction propagates the rejection; Prisma rolls back every write made
    // on tx, so the plan and item writes are discarded along with the attendance.
    await expect(
      overtimePlanService.update(
        PLAN_ID,
        {
          items: [
            inputItem({
              ngayTangCa: '2026-08-03T00:00:00.000Z',
              gioBatDau: '18:00',
              gioKetThuc: '21:00',
              nguoiThamGia: ['emp-a'],
            }),
          ],
        } as any,
        'admin-1',
        true
      )
    ).rejects.toThrow('db down');

    // Plan and item writes went through the same tx that just failed.
    expect(tx.overtimePlan.update).toHaveBeenCalled();
    expect(tx.overtimePlanItem.createMany).toHaveBeenCalled();
  });
});

// ── 8.5 Item state preservation ──────────────────────────────────────────────

describe('update() item state preservation', () => {
  const acceptedItem = priorItem({
    ngayTangCa: '2026-08-03T00:00:00.000Z',
    gioBatDau: '18:00',
    gioKetThuc: '21:00',
    nguoiThamGiaIds: ['user-a', 'user-b'],
    trangThaiTiepNhan: { 'user-a': 'DA_TIEP_NHAN', 'user-b': 'DA_TIEP_NHAN' },
    gioThucTe: { 'user-a': { gioVao: '18:05' }, 'user-b': { gioVao: '18:10' } },
  });

  const siblingItem = priorItem({
    ngayTangCa: '2026-08-04T00:00:00.000Z',
    gioBatDau: '18:00',
    gioKetThuc: '21:00',
    nguoiThamGiaIds: ['user-a'],
    trangThaiTiepNhan: { 'user-a': 'DA_TIEP_NHAN' },
    gioThucTe: { 'user-a': { gioVao: '18:02' } },
  });

  function createdItems() {
    return tx.overtimePlanItem.createMany.mock.calls[0][0].data as any[];
  }

  it('keeps the untouched sibling intact while resetting the edited item', async () => {
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue(
      existingPlan({ trangThai: 'CHO_DUYET', items: [acceptedItem, siblingItem] })
    );

    await overtimePlanService.update(
      PLAN_ID,
      {
        items: [
          // unchanged
          inputItem({
            ngayTangCa: '2026-08-03T00:00:00.000Z',
            gioBatDau: '18:00',
            gioKetThuc: '21:00',
            nguoiThamGia: ['emp-a', 'emp-b'],
          }),
          // hours changed → resets
          inputItem({
            ngayTangCa: '2026-08-04T00:00:00.000Z',
            gioBatDau: '18:00',
            gioKetThuc: '23:00',
            nguoiThamGia: ['emp-a'],
          }),
        ],
      } as any,
      'admin-1',
      true
    );

    const [unchanged, changed] = createdItems();
    expect(unchanged.trangThaiTiepNhan).toEqual({
      'user-a': 'DA_TIEP_NHAN',
      'user-b': 'DA_TIEP_NHAN',
    });
    expect(unchanged.gioThucTe).toEqual({
      'user-a': { gioVao: '18:05' },
      'user-b': { gioVao: '18:10' },
    });
    expect(changed.trangThaiTiepNhan).toEqual({ 'user-a': 'CHUA_TIEP_NHAN' });
    expect(changed.gioThucTe).toEqual({});
  });

  it('preserves state when only ghiChuItem changes', async () => {
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue(
      existingPlan({ trangThai: 'CHO_DUYET', items: [acceptedItem] })
    );

    await overtimePlanService.update(
      PLAN_ID,
      {
        items: [
          inputItem({
            ngayTangCa: '2026-08-03T00:00:00.000Z',
            gioBatDau: '18:00',
            gioKetThuc: '21:00',
            nguoiThamGia: ['emp-a', 'emp-b'],
            ghiChuItem: 'ghi chú mới',
          }),
        ],
      } as any,
      'admin-1',
      true
    );

    const [item] = createdItems();
    expect(item.ghiChuItem).toBe('ghi chú mới');
    expect(item.trangThaiTiepNhan['user-a']).toBe('DA_TIEP_NHAN');
    expect(item.gioThucTe['user-a']).toEqual({ gioVao: '18:05' });
  });

  it('leaves no orphan entry for a removed participant', async () => {
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue(
      existingPlan({ trangThai: 'CHO_DUYET', items: [acceptedItem] })
    );

    await overtimePlanService.update(
      PLAN_ID,
      {
        items: [
          inputItem({
            ngayTangCa: '2026-08-03T00:00:00.000Z',
            gioBatDau: '18:00',
            gioKetThuc: '21:00',
            nguoiThamGia: ['emp-a'],
          }),
        ],
      } as any,
      'admin-1',
      true
    );

    const [item] = createdItems();
    expect(item.trangThaiTiepNhan).toEqual({ 'user-a': 'DA_TIEP_NHAN' });
    expect(item.gioThucTe).toEqual({ 'user-a': { gioVao: '18:05' } });
    expect(item.trangThaiTiepNhan['user-b']).toBeUndefined();
    expect(item.gioThucTe['user-b']).toBeUndefined();
  });

  it('defaults a newly added participant to CHUA_TIEP_NHAN without disturbing the others', async () => {
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue(
      existingPlan({ trangThai: 'CHO_DUYET', items: [acceptedItem] })
    );

    await overtimePlanService.update(
      PLAN_ID,
      {
        items: [
          inputItem({
            ngayTangCa: '2026-08-03T00:00:00.000Z',
            gioBatDau: '18:00',
            gioKetThuc: '21:00',
            nguoiThamGia: ['emp-a', 'emp-b', 'emp-c'],
          }),
        ],
      } as any,
      'admin-1',
      true
    );

    const [item] = createdItems();
    expect(item.trangThaiTiepNhan).toEqual({
      'user-a': 'DA_TIEP_NHAN',
      'user-b': 'DA_TIEP_NHAN',
      'user-c': 'CHUA_TIEP_NHAN',
    });
    expect(item.gioThucTe['user-c']).toBeUndefined();
  });
});

// ── 8.7 Approval-versus-edit parity ──────────────────────────────────────────

describe('approval and edit produce identical attendance rows', () => {
  const SHIFT = { id: 'shift-3', name: 'Ca 3', startTime: '22:00', endTime: '06:00' };

  // An overnight SHIFT (Ca 3) with a same-day OT range: this exercises the
  // shiftCrossesMidnight dayOffset=1 anchoring, the branch most likely to drift
  // if the two paths diverge. Note an overnight OT *range* (e.g. 22:00→02:00)
  // cannot be tested through update(): resolveItemData rejects
  // gioBatDau >= gioKetThuc, so the `durationMin <= 0 → +24h` rule is
  // unreachable defensive code on both paths, carried over verbatim.
  const NGAY = '2026-08-03T00:00:00.000Z';
  const GIO_BAT_DAU = '22:00';
  const GIO_KET_THUC = '23:30';

  async function rowFromApproval() {
    mockedPrisma.user.findUnique = jest.fn().mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue({
      ...existingPlan({ trangThai: 'CHO_DUYET' }),
      items: [
        {
          ...priorItem({
            ngayTangCa: NGAY,
            gioBatDau: GIO_BAT_DAU,
            gioKetThuc: GIO_KET_THUC,
            nguoiThamGiaIds: ['user-a'],
          }),
          workShiftId: SHIFT.id,
        },
      ],
    });
    tx.workShift.findMany.mockResolvedValue([SHIFT]);
    mockedPrisma.employee.findUnique = jest.fn().mockResolvedValue({ id: 'emp-a' });
    mockedPrisma.employee.findMany.mockResolvedValue([{ id: 'emp-a' }]);

    await overtimePlanService.approvePlan(PLAN_ID, 'admin-1', { trangThai: 'DA_DUYET' } as any);
    return tx.attendance.create.mock.calls[0][0].data;
  }

  async function rowFromEdit() {
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue(
      existingPlan({
        trangThai: 'DA_DUYET',
        items: [
          priorItem({
            ngayTangCa: NGAY,
            gioBatDau: '18:00',
            gioKetThuc: '19:00',
            nguoiThamGiaIds: ['user-a'],
          }),
        ],
      })
    );
    tx.workShift.findMany.mockResolvedValue([SHIFT]);
    mockedPrisma.workShift.findUnique.mockResolvedValue(SHIFT);

    await overtimePlanService.update(
      PLAN_ID,
      {
        items: [
          inputItem({
            ngayTangCa: NGAY,
            gioBatDau: GIO_BAT_DAU,
            gioKetThuc: GIO_KET_THUC,
            nguoiThamGia: ['emp-a'],
            workShiftId: SHIFT.id,
          }),
        ],
      } as any,
      'admin-1',
      true
    );
    return tx.attendance.create.mock.calls[0][0].data;
  }

  it('derives the same checkInTime, checkOutTime and workHours on both paths', async () => {
    const approved = await rowFromApproval();

    jest.clearAllMocks();
    tx = makeTx();
    mockedPrisma.$transaction.mockImplementation(async (cb: any) => cb(tx));
    mockedPrisma.user.findMany.mockResolvedValue([]);
    mockedPrisma.employee.findMany.mockImplementation(({ where }: any) =>
      Promise.resolve(
        (where.id.in as string[]).map(empId => ({
          id: empId,
          userId: Object.values(EMPLOYEES).find(e => e.id === empId)?.userId,
        }))
      )
    );

    const edited = await rowFromEdit();

    expect(edited.checkInTime.toISOString()).toBe(approved.checkInTime.toISOString());
    expect(edited.checkOutTime.toISOString()).toBe(approved.checkOutTime.toISOString());
    expect(edited.workHours).toBe(approved.workHours);
    // 22:00→23:30 is 1.5h, anchored on the overnight shift's end
    // (06:00 next day, VN → 2026-08-03T23:00Z).
    expect(approved.workHours).toBe(1.5);
    expect(approved.checkInTime.toISOString()).toBe('2026-08-03T23:00:00.000Z');
  });

  it('stamps the plan reference on rows created by approval', async () => {
    const approved = await rowFromApproval();
    expect(approved.overtimePlanId).toBe(PLAN_ID);
  });

  it('keeps re-approval idempotent via skip-if-exists', async () => {
    mockedPrisma.user.findUnique = jest.fn().mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue({
      ...existingPlan({ trangThai: 'CHO_DUYET' }),
      items: [
        priorItem({
          ngayTangCa: NGAY,
          gioBatDau: '18:00',
          gioKetThuc: '21:00',
          nguoiThamGiaIds: ['user-a'],
        }),
      ],
    });
    mockedPrisma.employee.findUnique = jest.fn().mockResolvedValue({ id: 'emp-a' });
    mockedPrisma.employee.findMany.mockResolvedValue([{ id: 'emp-a' }]);
    tx.attendance.findFirst.mockResolvedValue({ id: 'existing-row' });

    await overtimePlanService.approvePlan(PLAN_ID, 'admin-1', { trangThai: 'DA_DUYET' } as any);

    expect(tx.attendance.create).not.toHaveBeenCalled();
  });
});

// ── Multi-item same-day parity ───────────────────────────────────────────────

describe('a participant on several items of the same day yields one row on both paths', () => {
  // Mirrors live plan cmrcvuajt006nqn079wcptf9i: several items on one date with
  // one user on more than one of them. Approval collapses these to a single row
  // (the pre-existing skip-if-exists shape); update must produce exactly the
  // same count, or every edit would inflate the payroll sum over these rows.
  const NGAY = '2026-07-09T00:00:00.000Z';

  // No workShiftId: checkInTime anchors on gioBatDau, so the winning item is
  // directly readable from checkInTime. 12:00 VN → 05:00Z.
  const SAME_DAY_ITEMS = [
    { gioBatDau: '12:00', gioKetThuc: '13:00', users: ['user-a'] },
    { gioBatDau: '12:00', gioKetThuc: '14:00', users: ['user-a', 'user-b'] },
    { gioBatDau: '14:00', gioKetThuc: '16:00', users: ['user-a'] },
    { gioBatDau: '17:00', gioKetThuc: '18:00', users: ['user-c'] },
  ];

  /** Rows keyed by employeeId, from the tx.attendance.create call log. */
  function createdRows() {
    return tx.attendance.create.mock.calls.map((c: any[]) => c[0].data);
  }

  it('creates one row per employee on approval, first item winning', async () => {
    mockedPrisma.user.findUnique = jest.fn().mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue({
      ...existingPlan({ trangThai: 'CHO_DUYET' }),
      items: SAME_DAY_ITEMS.map(i =>
        priorItem({
          ngayTangCa: NGAY,
          gioBatDau: i.gioBatDau,
          gioKetThuc: i.gioKetThuc,
          nguoiThamGiaIds: i.users,
        })
      ),
    });
    mockedPrisma.employee.findUnique = jest.fn().mockResolvedValue({ id: 'emp-a' });
    mockedPrisma.employee.findMany.mockResolvedValue([{ id: 'emp-a' }]);

    await overtimePlanService.approvePlan(PLAN_ID, 'admin-1', { trangThai: 'DA_DUYET' } as any);

    const rows = createdRows();
    // user-a appears on three items, user-b and user-c on one each.
    expect(rows).toHaveLength(3);
    expect(rows.map((r: any) => r.employeeId).sort()).toEqual(['emp-a', 'emp-b', 'emp-c']);

    const rowA = rows.find((r: any) => r.employeeId === 'emp-a');
    // First item (12:00→13:00) wins, not the 2h or the 14:00 one.
    expect(rowA.workHours).toBe(1);
    expect(rowA.checkInTime.toISOString()).toBe('2026-07-09T05:00:00.000Z');
  });

  it('creates the same number of rows on update, not one per item', async () => {
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue(
      existingPlan({
        trangThai: 'DA_DUYET',
        items: SAME_DAY_ITEMS.map(i =>
          priorItem({
            ngayTangCa: NGAY,
            gioBatDau: i.gioBatDau,
            gioKetThuc: i.gioKetThuc,
            nguoiThamGiaIds: i.users,
          })
        ),
      })
    );

    await overtimePlanService.update(
      PLAN_ID,
      {
        items: SAME_DAY_ITEMS.map(i =>
          inputItem({
            ngayTangCa: NGAY,
            gioBatDau: i.gioBatDau,
            gioKetThuc: i.gioKetThuc,
            nguoiThamGia: i.users.map(u => EMPLOYEES[u].id),
          })
        ),
      } as any,
      'admin-1',
      true
    );

    const rows = createdRows();
    // 3 rows, not 5 (the raw item × participant fan-out) — parity with approval.
    expect(rows).toHaveLength(3);
    expect(rows.map((r: any) => r.employeeId).sort()).toEqual(['emp-a', 'emp-b', 'emp-c']);

    const rowA = rows.find((r: any) => r.employeeId === 'emp-a');
    expect(rowA.workHours).toBe(1);
    expect(rowA.checkInTime.toISOString()).toBe('2026-07-09T05:00:00.000Z');

    // The other two are untouched by the dedupe and keep their own item's hours.
    expect(rows.find((r: any) => r.employeeId === 'emp-b').workHours).toBe(2);
    expect(rows.find((r: any) => r.employeeId === 'emp-c').workHours).toBe(1);
  });
});

// ── Same-day tiebreak determinism ────────────────────────────────────────────

describe('the same-day winner is chosen by start time, not by input order', () => {
  // Two items on one date for one participant, deliberately of *unequal*
  // length so the two candidates are distinguishable by workHours alone.
  // Sorting on ngayTangCa only would leave the winner up to input order:
  // approval reads items under Postgres `ORDER BY ngayTangCa ASC` (ties
  // unordered) while update takes them in form-payload order. The gioBatDau
  // secondary key must pin 08:00 as the winner on both paths regardless.
  const NGAY = '2026-07-09T00:00:00.000Z';
  const EARLY = { gioBatDau: '08:00', gioKetThuc: '12:00' }; // 4h — must win
  const LATE = { gioBatDau: '14:00', gioKetThuc: '15:00' }; // 1h — must lose

  // No workShiftId, so checkInTime anchors on gioBatDau: 08:00 VN → 01:00Z.
  const EXPECTED_CHECK_IN = '2026-07-09T01:00:00.000Z';

  function createdRows() {
    return tx.attendance.create.mock.calls.map((c: any[]) => c[0].data);
  }

  /** The two items in reverse-chronological order — the adversarial input. */
  const REVERSED = [LATE, EARLY];

  it('picks the 08:00 item on approval even when it is fed second', async () => {
    mockedPrisma.user.findUnique = jest.fn().mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue({
      ...existingPlan({ trangThai: 'CHO_DUYET' }),
      items: REVERSED.map(i =>
        priorItem({
          ngayTangCa: NGAY,
          gioBatDau: i.gioBatDau,
          gioKetThuc: i.gioKetThuc,
          nguoiThamGiaIds: ['user-a'],
        })
      ),
    });
    mockedPrisma.employee.findUnique = jest.fn().mockResolvedValue({ id: 'emp-a' });
    mockedPrisma.employee.findMany.mockResolvedValue([{ id: 'emp-a' }]);

    await overtimePlanService.approvePlan(PLAN_ID, 'admin-1', { trangThai: 'DA_DUYET' } as any);

    const rows = createdRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].workHours).toBe(4);
    expect(rows[0].checkInTime.toISOString()).toBe(EXPECTED_CHECK_IN);
  });

  it('picks the same 08:00 item on update when the payload lists 14:00 first', async () => {
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue(
      existingPlan({
        trangThai: 'DA_DUYET',
        items: REVERSED.map(i =>
          priorItem({
            ngayTangCa: NGAY,
            gioBatDau: i.gioBatDau,
            gioKetThuc: i.gioKetThuc,
            nguoiThamGiaIds: ['user-a'],
          })
        ),
      })
    );

    await overtimePlanService.update(
      PLAN_ID,
      {
        items: REVERSED.map(i =>
          inputItem({
            ngayTangCa: NGAY,
            gioBatDau: i.gioBatDau,
            gioKetThuc: i.gioKetThuc,
            nguoiThamGia: ['emp-a'],
          })
        ),
      } as any,
      'admin-1',
      true
    );

    const rows = createdRows();
    expect(rows).toHaveLength(1);
    // 4h, not the 1h of the item that happened to arrive first in the payload.
    expect(rows[0].workHours).toBe(4);
    expect(rows[0].checkInTime.toISOString()).toBe(EXPECTED_CHECK_IN);
  });

  it('breaks a shared start time on the end time, so the shorter stint wins', async () => {
    // Both items start at 08:00; only gioKetThuc separates them. Without the
    // tertiary key the winner would again depend on input order.
    const SAME_START = [
      { gioBatDau: '08:00', gioKetThuc: '12:00' }, // 4h
      { gioBatDau: '08:00', gioKetThuc: '09:00' }, // 1h — earlier end, must win
    ];
    mockedPrisma.overtimePlan.findUnique.mockResolvedValue(
      existingPlan({
        trangThai: 'DA_DUYET',
        items: SAME_START.map(i =>
          priorItem({
            ngayTangCa: NGAY,
            gioBatDau: i.gioBatDau,
            gioKetThuc: i.gioKetThuc,
            nguoiThamGiaIds: ['user-a'],
          })
        ),
      })
    );

    await overtimePlanService.update(
      PLAN_ID,
      {
        items: SAME_START.map(i =>
          inputItem({
            ngayTangCa: NGAY,
            gioBatDau: i.gioBatDau,
            gioKetThuc: i.gioKetThuc,
            nguoiThamGia: ['emp-a'],
          })
        ),
      } as any,
      'admin-1',
      true
    );

    const rows = createdRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].workHours).toBe(1);
  });
});
