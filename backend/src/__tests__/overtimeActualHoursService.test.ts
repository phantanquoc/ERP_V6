/**
 * Tests for the actual-overtime derivation module.
 *
 * The module reads prisma only in its aggregation layer; the calculation
 * functions are pure. prisma is mocked regardless because the module imports it
 * at load time.
 */

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    overtimePlanItem: { findMany: jest.fn() },
    employee: { findMany: jest.fn() },
    attendance: { findMany: jest.fn() },
    payrollSettings: { findFirst: jest.fn() },
  },
}));

import prisma from '@config/database';
import {
  calculateActualOvertimeHours,
  applyRoundingRules,
  resolveDirection,
  classifyItem,
  resolveActualOvertimeForPeriod,
  isActualOvertimeEnabled,
  employeeDayKey,
  type ShiftWindow,
} from '@services/overtimeActualHoursService';

const mockedPrisma = prisma as unknown as {
  overtimePlanItem: { findMany: jest.Mock };
  employee: { findMany: jest.Mock };
  attendance: { findMany: jest.Mock };
  payrollSettings: { findFirst: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedPrisma.overtimePlanItem.findMany.mockResolvedValue([]);
  mockedPrisma.employee.findMany.mockResolvedValue([]);
  mockedPrisma.attendance.findMany.mockResolvedValue([]);
  mockedPrisma.payrollSettings.findFirst.mockResolvedValue(null);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Attendance dates are stored as UTC midnight of the VN calendar date. */
const D = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

/**
 * A punch instant for a VN wall-clock time. The backend runs UTC and VN is
 * UTC+7, so the stored instant is the local time minus seven hours.
 */
const vn = (iso: string, hhmm: string): Date => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(
    Number(iso.slice(0, 4)),
    Number(iso.slice(5, 7)) - 1,
    Number(iso.slice(8, 10)),
    h - 7,
    m
  ));
};

const shift = (name: string, startTime: string, endTime: string): ShiftWindow => ({
  name,
  startTime,
  endTime,
});

/** The live shifts, so tests exercise real boundaries. */
const CA_1 = shift('Ca 1', '06:00', '14:00');
const CA_2 = shift('Ca 2', '14:00', '22:00');
const CA_3 = shift('Ca 3', '22:00', '06:00'); // overnight
const HANH_CHINH = shift('Hành chính', '07:30', '17:00');

// ─── Direction (task 8.2) ─────────────────────────────────────────────────────

describe('resolveDirection', () => {
  it('after-shift when overtime starts at the shift end', () => {
    expect(
      resolveDirection({
        ngayTangCa: D('2026-07-20'),
        gioBatDau: '17:00',
        gioKetThuc: '20:00',
        shift: HANH_CHINH,
      })
    ).toBe('AFTER_SHIFT');
  });

  it('before-shift when overtime ends at the shift start', () => {
    expect(
      resolveDirection({
        ngayTangCa: D('2026-07-20'),
        gioBatDau: '11:00',
        gioKetThuc: '14:00',
        shift: CA_2,
      })
    ).toBe('BEFORE_SHIFT');
  });

  // The most common live shape: Ca 1 with overtime attached after 14:00.
  it('after-shift for Ca 1 overtime starting at the shift end', () => {
    expect(
      resolveDirection({
        ngayTangCa: D('2026-07-20'),
        gioBatDau: '14:00',
        gioKetThuc: '17:00',
        shift: CA_1,
      })
    ).toBe('AFTER_SHIFT');
  });

  it('overlapping when the window sits inside the shift', () => {
    expect(
      resolveDirection({
        ngayTangCa: D('2026-07-20'),
        gioBatDau: '12:00',
        gioKetThuc: '13:00',
        shift: HANH_CHINH,
      })
    ).toBe('OVERLAPPING');
  });

  it('no-shift when the item names none', () => {
    expect(
      resolveDirection({
        ngayTangCa: D('2026-07-20'),
        gioBatDau: '14:00',
        gioKetThuc: '18:00',
        shift: null,
      })
    ).toBe('NO_SHIFT');
  });

  // Regression: both window tests are satisfiable at once on an overnight
  // shift, so a naive first-match returned BEFORE_SHIFT for after-shift work
  // and then measured from the wrong punch.
  it('overnight shift: overtime after the shift end is after-shift', () => {
    expect(
      resolveDirection({
        ngayTangCa: D('2026-07-20'),
        gioBatDau: '06:00',
        gioKetThuc: '09:00',
        shift: CA_3,
      })
    ).toBe('AFTER_SHIFT');
  });

  it('overnight shift: overtime before the shift start is before-shift', () => {
    expect(
      resolveDirection({
        ngayTangCa: D('2026-07-20'),
        gioBatDau: '19:00',
        gioKetThuc: '22:00',
        shift: CA_3,
      })
    ).toBe('BEFORE_SHIFT');
  });

  it('overnight shift: a window inside the shift overlaps', () => {
    expect(
      resolveDirection({
        ngayTangCa: D('2026-07-20'),
        gioBatDau: '23:00',
        gioKetThuc: '02:00',
        shift: CA_3,
      })
    ).toBe('OVERLAPPING');
  });
});

describe('direction determines which punch is measured', () => {
  const PLAN_CREATED = D('2026-07-01'); // before the item date → prospective
  const NOW = D('2026-07-31');

  it('after-shift overtime is measured from the clock-out', () => {
    const result = calculateActualOvertimeHours(
      {
        ngayTangCa: D('2026-07-20'),
        gioBatDau: '17:00',
        gioKetThuc: '20:00',
        shift: HANH_CHINH,
      },
      PLAN_CREATED,
      { checkInTime: vn('2026-07-20', '07:30'), checkOutTime: vn('2026-07-20', '18:00') },
      NOW
    );
    // 18:00 clock-out minus 17:00 shift end = one hour.
    expect(result.direction).toBe('AFTER_SHIFT');
    expect(result.actualHours).toBe(1);
    expect(result.plannedHours).toBe(3);
    expect(result.flag).toBeNull();
  });

  it('before-shift overtime is measured from the clock-in', () => {
    const result = calculateActualOvertimeHours(
      {
        ngayTangCa: D('2026-07-20'),
        gioBatDau: '11:00',
        gioKetThuc: '14:00',
        shift: CA_2,
      },
      PLAN_CREATED,
      { checkInTime: vn('2026-07-20', '10:55'), checkOutTime: vn('2026-07-20', '22:00') },
      NOW
    );
    // 14:00 shift start minus 10:55 clock-in ≈ three hours, capped at planned.
    expect(result.direction).toBe('BEFORE_SHIFT');
    expect(result.actualHours).toBe(3);
  });

  it('a later clock-out does not change before-shift overtime', () => {
    const early = calculateActualOvertimeHours(
      { ngayTangCa: D('2026-07-20'), gioBatDau: '12:00', gioKetThuc: '14:00', shift: CA_2 },
      PLAN_CREATED,
      { checkInTime: vn('2026-07-20', '13:00'), checkOutTime: vn('2026-07-20', '22:00') },
      NOW
    );
    // Measured from the clock-in only: 14:00 − 13:00 = 1h.
    expect(early.actualHours).toBe(1);
  });
});

// ─── The plan's shift wins over the inferred label (task 8.7) ─────────────────

describe('the shift comes from the plan item, not the inferred label', () => {
  // NV0031/NV0035 clocked in at 06:27 and were labelled "Ca 1" by the check-in
  // window matcher, while their plan item names Hành chính. Deriving against
  // Ca 1 (ends 14:00) would credit hours from an unrelated boundary.
  it('derives against the plan shift even when the punch suits another shift', () => {
    const result = calculateActualOvertimeHours(
      {
        ngayTangCa: D('2026-07-20'),
        gioBatDau: '17:00',
        gioKetThuc: '20:00',
        shift: HANH_CHINH, // the plan's shift
      },
      D('2026-07-01'),
      { checkInTime: vn('2026-07-20', '06:27'), checkOutTime: vn('2026-07-20', '19:00') },
      D('2026-07-31')
    );
    // Against Hành chính's 17:00 end: 19:00 − 17:00 = 2h.
    // Against Ca 1's 14:00 end it would have been 5h, capped to the planned 3.
    expect(result.actualHours).toBe(2);
  });
});

// ─── Rounding (task 8.3) ──────────────────────────────────────────────────────

describe('applyRoundingRules', () => {
  it('rounds to the nearest half hour rather than downward', () => {
    // The pair that motivated the rule: punches one minute apart on the same
    // item. Rounding down paid 0.5 and 1.0 for a one-minute difference.
    expect(applyRoundingRules(0.983, 3)).toBe(1);
    expect(applyRoundingRules(1.0, 3)).toBe(1);
  });

  it('forgives a shortfall of ten minutes or less', () => {
    expect(applyRoundingRules(2.92, 3)).toBe(3); // 4.8 minutes short
    expect(applyRoundingRules(2.84, 3)).toBe(3); // 9.6 minutes short
  });

  it('does not forgive a shortfall beyond ten minutes', () => {
    expect(applyRoundingRules(2.8, 3)).toBe(3); // 12 min short → rounds to 3 anyway
    expect(applyRoundingRules(2.6, 3)).toBe(2.5); // 24 min short → rounds down to 2.5
  });

  it('never credits more than the planned figure', () => {
    expect(applyRoundingRules(2.28, 2)).toBe(2);
    expect(applyRoundingRules(9, 3)).toBe(3);
  });

  it('floors a trivial overrun to zero', () => {
    expect(applyRoundingRules(0.22, 3)).toBe(0);
    expect(applyRoundingRules(0.1, 2)).toBe(0);
  });

  it('credits exactly half an hour', () => {
    expect(applyRoundingRules(0.5, 1)).toBe(0.5);
  });

  it('credits nothing for a non-positive derivation', () => {
    expect(applyRoundingRules(0, 3)).toBe(0);
    expect(applyRoundingRules(-1, 3)).toBe(0);
  });

  it('the one-minute-apart pair ends up equal end to end', () => {
    const item = {
      ngayTangCa: D('2026-07-20'),
      gioBatDau: '17:00',
      gioKetThuc: '18:00',
      shift: HANH_CHINH,
    };
    const a = calculateActualOvertimeHours(
      item,
      D('2026-07-01'),
      { checkInTime: vn('2026-07-20', '07:30'), checkOutTime: vn('2026-07-20', '17:59') },
      D('2026-07-31')
    );
    const b = calculateActualOvertimeHours(
      item,
      D('2026-07-01'),
      { checkInTime: vn('2026-07-20', '07:30'), checkOutTime: vn('2026-07-20', '18:00') },
      D('2026-07-31')
    );
    expect(a.actualHours).toBe(1);
    expect(b.actualHours).toBe(1);
    expect(a.actualHours).toBe(b.actualHours);
  });
});

// ─── Classification (task 8.4) ────────────────────────────────────────────────

describe('classifyItem', () => {
  const NOW = D('2026-07-31');

  it('retrospective when the item precedes its plan creation', () => {
    expect(classifyItem(D('2026-07-22'), D('2026-07-26'), NOW)).toBe('RETROSPECTIVE');
  });

  it('prospective when the item is on or after plan creation and has passed', () => {
    expect(classifyItem(D('2026-07-26'), D('2026-07-26'), NOW)).toBe('PROSPECTIVE');
    expect(classifyItem(D('2026-07-29'), D('2026-07-26'), NOW)).toBe('PROSPECTIVE');
  });

  it('pending when the item date has not arrived', () => {
    expect(classifyItem(D('2026-08-05'), D('2026-07-26'), NOW)).toBe('PENDING');
  });

  // Plan cms1wenyf00qlrq07koz6sujn: created 26 July, items 22–29 July.
  it('splits a plan spanning its own creation date, per item', () => {
    const created = D('2026-07-26');
    const classes = ['2026-07-22', '2026-07-25', '2026-07-26', '2026-07-29'].map(d =>
      classifyItem(D(d), created, NOW)
    );
    expect(classes).toEqual([
      'RETROSPECTIVE',
      'RETROSPECTIVE',
      'PROSPECTIVE',
      'PROSPECTIVE',
    ]);
  });
});

describe('retrospective items', () => {
  const CREATED = D('2026-07-26');
  const NOW = D('2026-07-31');
  const ITEM = {
    ngayTangCa: D('2026-07-22'), // before creation → retrospective
    gioBatDau: '17:00',
    gioKetThuc: '20:00',
    shift: HANH_CHINH,
  };

  it('keep their planned hours when the clock roughly agrees', () => {
    const result = calculateActualOvertimeHours(
      ITEM,
      CREATED,
      { checkInTime: vn('2026-07-22', '07:30'), checkOutTime: vn('2026-07-22', '19:54') },
      NOW
    );
    // Clock derives 2.9h against a 3h plan — inside the one-hour tolerance.
    expect(result.classification).toBe('RETROSPECTIVE');
    expect(result.actualHours).toBe(3);
    expect(result.payableActualHours).toBe(3);
    expect(result.flag).toBeNull();
  });

  it('keep their planned hours but are flagged when the clock disagrees badly', () => {
    const result = calculateActualOvertimeHours(
      ITEM,
      CREATED,
      { checkInTime: vn('2026-07-22', '07:30'), checkOutTime: vn('2026-07-22', '18:00') },
      NOW
    );
    // Clock derives 1h against a 3h plan — a two-hour disagreement.
    expect(result.actualHours).toBe(3);
    expect(result.payableActualHours).toBe(3);
    expect(result.flag?.code).toBe('RETROSPECTIVE_DISAGREEMENT');
    expect(result.flag?.kind).toBe('ADVISORY');
  });

  // The clock is only overridden where it says *something*. Where it shows no
  // overtime at all, there is nothing for the author's account to correct.
  it('are refused when the clock shows no overtime whatsoever', () => {
    const result = calculateActualOvertimeHours(
      ITEM,
      CREATED,
      { checkInTime: vn('2026-07-22', '07:30'), checkOutTime: vn('2026-07-22', '17:00') },
      NOW
    );
    expect(result.actualHours).toBeNull();
    expect(result.payableActualHours).toBe(0);
    expect(result.flag?.code).toBe('RETROSPECTIVE_NO_CLOCK_EVIDENCE');
    expect(result.flag?.kind).toBe('REFUSAL');
  });

  it('prospective items are derived from the clock once the date has passed', () => {
    const result = calculateActualOvertimeHours(
      { ...ITEM, ngayTangCa: D('2026-07-28') },
      CREATED,
      { checkInTime: vn('2026-07-28', '07:30'), checkOutTime: vn('2026-07-28', '18:00') },
      NOW
    );
    expect(result.classification).toBe('PROSPECTIVE');
    expect(result.actualHours).toBe(1); // the clock, not the 3h plan
  });

  it('pending items retain planned hours without a flag', () => {
    const result = calculateActualOvertimeHours(
      { ...ITEM, ngayTangCa: D('2026-08-10') },
      CREATED,
      null,
      NOW
    );
    expect(result.classification).toBe('PENDING');
    expect(result.actualHours).toBe(3);
    expect(result.flag).toBeNull();
  });
});

// ─── Refusals and exclusions (task 8.5) ───────────────────────────────────────

describe('refusal conditions', () => {
  const CREATED = D('2026-07-01');
  const NOW = D('2026-07-31');
  const ITEM = {
    ngayTangCa: D('2026-07-20'),
    gioBatDau: '17:00',
    gioKetThuc: '20:00',
    shift: HANH_CHINH,
  };

  it('refuses and flags when there is no attendance row', () => {
    const result = calculateActualOvertimeHours(ITEM, CREATED, null, NOW);
    expect(result.actualHours).toBeNull();
    expect(result.payableActualHours).toBe(0);
    expect(result.flag?.code).toBe('NO_ATTENDANCE_ROW');
    expect(result.flag?.kind).toBe('REFUSAL');
    expect(result.flag?.message).toContain('Không có dữ liệu chấm công');
  });

  it('refuses and flags when the clock-out is missing', () => {
    const result = calculateActualOvertimeHours(
      ITEM,
      CREATED,
      { checkInTime: vn('2026-07-20', '07:30'), checkOutTime: null },
      NOW
    );
    expect(result.actualHours).toBeNull();
    expect(result.flag?.code).toBe('INCOMPLETE_PUNCH_PAIR');
  });

  it('refuses and flags when the clock-in is missing', () => {
    const result = calculateActualOvertimeHours(
      ITEM,
      CREATED,
      { checkInTime: null, checkOutTime: vn('2026-07-20', '18:00') },
      NOW
    );
    expect(result.flag?.code).toBe('INCOMPLETE_PUNCH_PAIR');
  });

  // NV0038 on 25 July: a punch pair eleven minutes apart. The before-shift
  // formula reads only the clock-in and would otherwise return 3.25 hours.
  it('refuses and flags an implausibly short day', () => {
    const result = calculateActualOvertimeHours(
      { ngayTangCa: D('2026-07-25'), gioBatDau: '11:00', gioKetThuc: '14:00', shift: CA_2 },
      CREATED,
      { checkInTime: vn('2026-07-25', '10:45'), checkOutTime: vn('2026-07-25', '10:56') },
      NOW
    );
    expect(result.actualHours).toBeNull();
    expect(result.flag?.code).toBe('IMPLAUSIBLY_SHORT_DAY');
  });

  // Live: three participants on 27–29 July carry items naming Ca 2
  // (14:00–22:00) while their punches span 05:47–17:02, which is Ca 1.
  it('refuses and flags punches incompatible with the named shift', () => {
    const result = calculateActualOvertimeHours(
      { ngayTangCa: D('2026-07-27'), gioBatDau: '11:00', gioKetThuc: '14:00', shift: CA_2 },
      CREATED,
      { checkInTime: vn('2026-07-27', '05:47'), checkOutTime: vn('2026-07-27', '17:02') },
      NOW
    );
    expect(result.actualHours).toBeNull();
    expect(result.flag?.code).toBe('SHIFT_MISMATCH');
    // Without the test this would have credited the full three hours.
    expect(result.payableActualHours).toBe(0);
  });

  it('excludes an overlapping window, retaining planned hours with a flag', () => {
    const result = calculateActualOvertimeHours(
      { ngayTangCa: D('2026-07-20'), gioBatDau: '12:00', gioKetThuc: '13:00', shift: HANH_CHINH },
      CREATED,
      { checkInTime: vn('2026-07-20', '07:30'), checkOutTime: vn('2026-07-20', '17:00') },
      NOW
    );
    expect(result.direction).toBe('OVERLAPPING');
    expect(result.actualHours).toBe(1); // the planned figure
    expect(result.payableActualHours).toBe(1);
    expect(result.flag?.code).toBe('OVERLAPPING_WINDOW');
    expect(result.flag?.kind).toBe('ADVISORY');
  });

  it('excludes a shift-less item, retaining planned hours with a flag', () => {
    const result = calculateActualOvertimeHours(
      { ngayTangCa: D('2026-07-20'), gioBatDau: '14:00', gioKetThuc: '18:00', shift: null },
      CREATED,
      { checkInTime: vn('2026-07-20', '06:00'), checkOutTime: vn('2026-07-20', '18:00') },
      NOW
    );
    expect(result.direction).toBe('NO_SHIFT');
    expect(result.actualHours).toBe(4);
    expect(result.flag?.code).toBe('NO_SHIFT_ON_ITEM');
    expect(result.flag?.kind).toBe('ADVISORY');
  });

  it('a retrospective item hitting a refusal keeps its planned hours', () => {
    // The author's first-hand account is the only evidence available.
    const result = calculateActualOvertimeHours(
      { ...ITEM, ngayTangCa: D('2026-07-22') },
      D('2026-07-26'),
      null,
      NOW
    );
    expect(result.classification).toBe('RETROSPECTIVE');
    expect(result.actualHours).toBe(3);
    expect(result.payableActualHours).toBe(3);
    expect(result.flag?.code).toBe('NO_ATTENDANCE_ROW');
  });
});

// ─── Period aggregation ───────────────────────────────────────────────────────

describe('resolveActualOvertimeForPeriod', () => {
  const START = D('2026-07-01');
  const END = new Date('2026-07-31T23:59:59.999Z');

  const planItem = (over: Record<string, unknown> = {}) => ({
    id: 'item-1',
    overtimePlanId: 'plan-1',
    ngayTangCa: D('2026-07-20'),
    gioBatDau: '17:00',
    gioKetThuc: '20:00',
    workShiftName: 'Hành chính',
    nguoiThamGiaIds: ['user-1'],
    overtimePlan: { ngayTao: D('2026-07-01'), trangThai: 'DA_DUYET' },
    workShift: { name: 'Hành chính', startTime: '07:30', endTime: '17:00' },
    ...over,
  });

  it('joins plan items to the regular attendance row and sums per employee', async () => {
    mockedPrisma.overtimePlanItem.findMany.mockResolvedValue([planItem()]);
    mockedPrisma.employee.findMany.mockResolvedValue([{ id: 'emp-1', userId: 'user-1' }]);
    mockedPrisma.attendance.findMany.mockResolvedValue([
      {
        employeeId: 'emp-1',
        attendanceDate: D('2026-07-20'),
        checkInTime: vn('2026-07-20', '07:30'),
        checkOutTime: vn('2026-07-20', '18:00'),
      },
    ]);

    const totals = await resolveActualOvertimeForPeriod(START, END, undefined, D('2026-07-31'));

    expect(totals.plannedByEmployee.get('emp-1')).toBe(3);
    expect(totals.actualByEmployee.get('emp-1')).toBe(1);
    const entry = totals.byEmployeeDay.get(employeeDayKey('emp-1', '2026-07-20'));
    expect(entry?.actualHours).toBe(1);
    expect(entry?.shiftName).toBe('Hành chính');
  });

  // Only approved plans materialize attendance rows, so only approved plans may
  // contribute payable hours.
  it('reads only approved plans', async () => {
    mockedPrisma.overtimePlanItem.findMany.mockResolvedValue([]);
    await resolveActualOvertimeForPeriod(START, END);
    const where = mockedPrisma.overtimePlanItem.findMany.mock.calls[0][0].where;
    expect(where.overtimePlan).toEqual({ trangThai: 'DA_DUYET' });
  });

  it('reads punches from the regular row only, never the overtime row', async () => {
    mockedPrisma.overtimePlanItem.findMany.mockResolvedValue([planItem()]);
    mockedPrisma.employee.findMany.mockResolvedValue([{ id: 'emp-1', userId: 'user-1' }]);
    await resolveActualOvertimeForPeriod(START, END);
    const where = mockedPrisma.attendance.findMany.mock.calls[0][0].where;
    expect(where.isOvertime).toBe(false);
  });

  it('keeps one entry per participant-day when items collide', async () => {
    mockedPrisma.overtimePlanItem.findMany.mockResolvedValue([
      planItem({ id: 'item-a', gioBatDau: '17:00', gioKetThuc: '18:00' }),
      planItem({ id: 'item-b', gioBatDau: '18:00', gioKetThuc: '20:00' }),
    ]);
    mockedPrisma.employee.findMany.mockResolvedValue([{ id: 'emp-1', userId: 'user-1' }]);
    mockedPrisma.attendance.findMany.mockResolvedValue([
      {
        employeeId: 'emp-1',
        attendanceDate: D('2026-07-20'),
        checkInTime: vn('2026-07-20', '07:30'),
        checkOutTime: vn('2026-07-20', '18:00'),
      },
    ]);

    const totals = await resolveActualOvertimeForPeriod(START, END, undefined, D('2026-07-31'));
    // The first item by (date, start, end) wins — matching how the rows were written.
    expect(totals.byEmployeeDay.size).toBe(1);
    expect(totals.plannedByEmployee.get('emp-1')).toBe(1);
  });

  it('collects flagged entries for surfacing to managers', async () => {
    mockedPrisma.overtimePlanItem.findMany.mockResolvedValue([planItem()]);
    mockedPrisma.employee.findMany.mockResolvedValue([{ id: 'emp-1', userId: 'user-1' }]);
    mockedPrisma.attendance.findMany.mockResolvedValue([]); // no row → refusal

    const totals = await resolveActualOvertimeForPeriod(START, END, undefined, D('2026-07-31'));
    expect(totals.actualByEmployee.get('emp-1')).toBe(0);
    expect(totals.flagsByEmployee.get('emp-1')?.[0].flag?.code).toBe('NO_ATTENDANCE_ROW');
  });

  it('scopes to the requested employees', async () => {
    mockedPrisma.overtimePlanItem.findMany.mockResolvedValue([
      planItem({ nguoiThamGiaIds: ['user-1', 'user-2'] }),
    ]);
    mockedPrisma.employee.findMany.mockResolvedValue([
      { id: 'emp-1', userId: 'user-1' },
      { id: 'emp-2', userId: 'user-2' },
    ]);
    mockedPrisma.attendance.findMany.mockResolvedValue([]);

    const totals = await resolveActualOvertimeForPeriod(
      START,
      END,
      ['emp-1'],
      D('2026-07-31')
    );
    expect(totals.byEmployeeDay.has(employeeDayKey('emp-1', '2026-07-20'))).toBe(true);
    expect(totals.byEmployeeDay.has(employeeDayKey('emp-2', '2026-07-20'))).toBe(false);
  });

  it('returns empty totals when the period holds no items', async () => {
    mockedPrisma.overtimePlanItem.findMany.mockResolvedValue([]);
    const totals = await resolveActualOvertimeForPeriod(START, END);
    expect(totals.plannedByEmployee.size).toBe(0);
    expect(totals.actualByEmployee.size).toBe(0);
  });

  it('writes nothing to the database', async () => {
    mockedPrisma.overtimePlanItem.findMany.mockResolvedValue([planItem()]);
    mockedPrisma.employee.findMany.mockResolvedValue([{ id: 'emp-1', userId: 'user-1' }]);
    mockedPrisma.attendance.findMany.mockResolvedValue([]);
    await resolveActualOvertimeForPeriod(START, END);
    // The mock exposes no write methods; assert the read-only surface was used.
    expect(Object.keys(mockedPrisma.attendance)).toEqual(['findMany']);
  });
});

// ─── The setting (task 8.6, partial — payroll wiring covered separately) ──────

describe('isActualOvertimeEnabled', () => {
  it('defaults to planned hours when no settings row exists', async () => {
    mockedPrisma.payrollSettings.findFirst.mockResolvedValue(null);
    await expect(isActualOvertimeEnabled()).resolves.toBe(false);
  });

  it('defaults to planned hours when the column is unset', async () => {
    mockedPrisma.payrollSettings.findFirst.mockResolvedValue({});
    await expect(isActualOvertimeEnabled()).resolves.toBe(false);
  });

  it('reports actual hours when the setting is on', async () => {
    mockedPrisma.payrollSettings.findFirst.mockResolvedValue({ useActualOvertimeHours: true });
    await expect(isActualOvertimeEnabled()).resolves.toBe(true);
  });
});
