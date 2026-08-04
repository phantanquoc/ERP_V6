import prisma from '@config/database';
import attendedOperatorsService from '@services/attendedOperatorsService';
import workShiftService from '@services/workShiftService';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    dataEntryPagePosition: { findMany: jest.fn() },
    attendance: { findMany: jest.fn() },
  },
}));

jest.mock('@services/workShiftService', () => ({
  __esModule: true,
  default: { determineShift: jest.fn() },
}));

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mocked = prisma as unknown as {
  dataEntryPagePosition: { findMany: jest.Mock };
  attendance: { findMany: jest.Mock };
};
const mockedShiftService = workShiftService as unknown as { determineShift: jest.Mock };

function attendanceRow(opts: {
  employeeId: string;
  lastName: string;
  firstName: string;
  code: string;
  shift?: number | null;
  checkInTime?: Date;
  positionName?: string;
}) {
  return {
    id: `att-${opts.employeeId}`,
    checkInTime: opts.checkInTime ?? new Date('2026-08-04T00:00:00.000Z'),
    shift: opts.shift ?? null,
    employee: {
      id: opts.employeeId,
      employeeCode: opts.code,
      positionId: 'pos-prod',
      position: { id: 'pos-prod', name: opts.positionName ?? 'Nhân viên sản xuất' },
      user: { firstName: opts.firstName, lastName: opts.lastName },
    },
  };
}

describe('getAttendedOperators — shift comes from the recorded column', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.dataEntryPagePosition.findMany.mockResolvedValue([]);
  });

  it('returns an operator whose recorded shift matches, without re-deriving from the clock', async () => {
    mocked.attendance.findMany.mockResolvedValue([
      attendanceRow({ employeeId: 'e1', lastName: 'Nguyễn', firstName: 'An', code: 'NV0001', shift: 2 }),
    ]);

    const result = await attendedOperatorsService.getAttendedOperators('2026-08-04', 2, 'PRODUCTION_OUTPUT');

    expect(result).toEqual([
      { id: 'e1', name: 'Nguyễn An', employeeCode: 'NV0001', positionName: 'Nhân viên sản xuất' },
    ]);
    // The whole point of the column: no clock-based guessing for recorded rows.
    expect(mockedShiftService.determineShift).not.toHaveBeenCalled();
  });

  it('excludes an operator whose recorded shift is a different shift', async () => {
    mocked.attendance.findMany.mockResolvedValue([
      attendanceRow({ employeeId: 'e1', lastName: 'Nguyễn', firstName: 'An', code: 'NV0001', shift: 1 }),
    ]);

    const result = await attendedOperatorsService.getAttendedOperators('2026-08-04', 3, 'PRODUCTION_OUTPUT');

    expect(result).toEqual([]);
  });

  it('keeps an operator whose recorded shift disagrees with what the clock would say', async () => {
    // Scanned at 08:20 but recorded as Ca 3 — a late scan for the night shift. Deriving
    // from the clock would land on the office window and drop the row entirely.
    mocked.attendance.findMany.mockResolvedValue([
      attendanceRow({
        employeeId: 'e1',
        lastName: 'Trần',
        firstName: 'Bình',
        code: 'NV0002',
        shift: 3,
        checkInTime: new Date('2026-08-04T01:20:00.000Z'), // 08:20 VN
      }),
    ]);
    mockedShiftService.determineShift.mockResolvedValue('Văn phòng');

    const result = await attendedOperatorsService.getAttendedOperators('2026-08-04', 3, 'PRODUCTION_OUTPUT');

    expect(result).toHaveLength(1);
    expect(result[0].employeeCode).toBe('NV0002');
  });
});

describe('getAttendedOperators — legacy rows without a recorded shift', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.dataEntryPagePosition.findMany.mockResolvedValue([]);
  });

  it('derives the shift from the clock when the column is null', async () => {
    mocked.attendance.findMany.mockResolvedValue([
      attendanceRow({ employeeId: 'e1', lastName: 'Lê', firstName: 'Cường', code: 'NV0003', shift: null }),
    ]);
    mockedShiftService.determineShift.mockResolvedValue('Ca 1');

    const result = await attendedOperatorsService.getAttendedOperators('2026-08-04', 1, 'PRODUCTION_OUTPUT');

    expect(result).toHaveLength(1);
    expect(mockedShiftService.determineShift).toHaveBeenCalled();
  });

  it('drops a legacy row whose derived shift is an office shift', async () => {
    mocked.attendance.findMany.mockResolvedValue([
      attendanceRow({ employeeId: 'e1', lastName: 'Lê', firstName: 'Cường', code: 'NV0003', shift: null }),
    ]);
    mockedShiftService.determineShift.mockResolvedValue('Hành chính');

    const result = await attendedOperatorsService.getAttendedOperators('2026-08-04', 1, 'PRODUCTION_OUTPUT');

    expect(result).toEqual([]);
  });

  it('drops a legacy row when no shift window matches at all', async () => {
    mocked.attendance.findMany.mockResolvedValue([
      attendanceRow({ employeeId: 'e1', lastName: 'Lê', firstName: 'Cường', code: 'NV0003', shift: null }),
    ]);
    mockedShiftService.determineShift.mockResolvedValue(null);

    const result = await attendedOperatorsService.getAttendedOperators('2026-08-04', 1, 'PRODUCTION_OUTPUT');

    expect(result).toEqual([]);
  });
});

describe('getAttendedOperators — position scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('falls back to production positions when no mapping is configured', async () => {
    mocked.dataEntryPagePosition.findMany.mockResolvedValue([]);
    mocked.attendance.findMany.mockResolvedValue([]);

    await attendedOperatorsService.getAttendedOperators('2026-08-04', 1, 'PRODUCTION_OUTPUT');

    // The regression this guards: an empty mapping table used to return nobody at all.
    const where = mocked.attendance.findMany.mock.calls[0]?.[0]?.where;
    expect(where.employee).toEqual({
      position: { name: { in: ['Nhân viên sản xuất', 'Kỹ sư sản xuất'] } },
    });
  });

  it('scopes to the mapped positions once a mapping exists', async () => {
    mocked.dataEntryPagePosition.findMany.mockResolvedValue([
      { positionId: 'pos-a' },
      { positionId: 'pos-b' },
    ]);
    mocked.attendance.findMany.mockResolvedValue([]);

    await attendedOperatorsService.getAttendedOperators('2026-08-04', 1, 'MATERIAL_EVALUATION');

    const where = mocked.attendance.findMany.mock.calls[0]?.[0]?.where;
    expect(where.employee).toEqual({ positionId: { in: ['pos-a', 'pos-b'] } });
  });
});

describe('getAttendedOperators — list hygiene', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.dataEntryPagePosition.findMany.mockResolvedValue([]);
  });

  it('collapses multiple attendance rows for the same employee', async () => {
    mocked.attendance.findMany.mockResolvedValue([
      attendanceRow({ employeeId: 'e1', lastName: 'Nguyễn', firstName: 'An', code: 'NV0001', shift: 2 }),
      attendanceRow({ employeeId: 'e1', lastName: 'Nguyễn', firstName: 'An', code: 'NV0001', shift: 2 }),
    ]);

    const result = await attendedOperatorsService.getAttendedOperators('2026-08-04', 2, 'PRODUCTION_OUTPUT');

    expect(result).toHaveLength(1);
  });

  it('sorts the list by name so the touch targets do not jump around', async () => {
    mocked.attendance.findMany.mockResolvedValue([
      attendanceRow({ employeeId: 'e2', lastName: 'Vũ', firstName: 'Nam', code: 'NV0002', shift: 1 }),
      attendanceRow({ employeeId: 'e1', lastName: 'Đỗ', firstName: 'Anh', code: 'NV0001', shift: 1 }),
    ]);

    const result = await attendedOperatorsService.getAttendedOperators('2026-08-04', 1, 'PRODUCTION_OUTPUT');

    expect(result.map(r => r.employeeCode)).toEqual(['NV0001', 'NV0002']);
  });
});
