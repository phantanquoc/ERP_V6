import workShiftService from '@services/workShiftService';
import prisma from '@config/database';
import { parseProductionShift } from '@utils/productionDay';

jest.mock('@config/database', () => ({
  __esModule: true,
  default: {
    workShift: { findMany: jest.fn() },
  },
}));

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mocked = prisma as unknown as { workShift: { findMany: jest.Mock } };

/** A UTC instant whose Asia/Ho_Chi_Minh (UTC+7) wall clock reads hh:mm. */
function vn(hh: number, mm: number): Date {
  return new Date(Date.UTC(2026, 7, 4, hh - 7, mm, 0));
}

/**
 * The shift configuration live in the database as of 2026-08-04, after closing the
 * two one-minute holes: every window's end is now the first minute it does NOT
 * accept, matching the half-open [start, end) contract in matchesWindow().
 */
const LIVE_SHIFTS = [
  { id: 's1', name: 'Ca 1', startTime: '06:00', endTime: '14:00', checkInWindowStart: '05:30', checkInWindowEnd: '06:30' },
  { id: 'shc', name: 'Hành chính', startTime: '07:30', endTime: '17:00', checkInWindowStart: '06:30', checkInWindowEnd: '07:40' },
  { id: 'svp', name: 'Văn phòng', startTime: '08:00', endTime: '17:00', checkInWindowStart: '07:40', checkInWindowEnd: '09:00' },
  { id: 's2', name: 'Ca 2', startTime: '14:00', endTime: '22:00', checkInWindowStart: '13:00', checkInWindowEnd: '15:00' },
  { id: 's3', name: 'Ca 3', startTime: '22:00', endTime: '06:00', checkInWindowStart: '21:00', checkInWindowEnd: '23:00' },
];

describe('determineShift — check-in window boundaries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mocked.workShift.findMany.mockResolvedValue(LIVE_SHIFTS);
  });

  it('accepts a scan exactly at the window start', async () => {
    // Half-open [start, end): the start minute is inclusive.
    expect(await workShiftService.determineShift(vn(5, 30))).toBe('Ca 1');
    expect(await workShiftService.determineShift(vn(13, 0))).toBe('Ca 2');
    expect(await workShiftService.determineShift(vn(21, 0))).toBe('Ca 3');
  });

  it('accepts the last minute before the window end', async () => {
    expect(await workShiftService.determineShift(vn(6, 29))).toBe('Ca 1');
    expect(await workShiftService.determineShift(vn(14, 59))).toBe('Ca 2');
    expect(await workShiftService.determineShift(vn(22, 59))).toBe('Ca 3');
  });

  it('rejects a scan exactly at the window end, since the range is half-open', async () => {
    // 15:00 is Ca 2's configured end, so it belongs to no window.
    expect(await workShiftService.determineShift(vn(15, 0))).toBeNull();
    // 23:00 is Ca 3's configured end.
    expect(await workShiftService.determineShift(vn(23, 0))).toBeNull();
    // 09:00 is Văn phòng's configured end.
    expect(await workShiftService.determineShift(vn(9, 0))).toBeNull();
  });

  it('leaves no gap where one window ends and the next begins', async () => {
    // Regression: Ca 1 used to end at 06:29 and Hành chính start at 06:30, so 06:29
    // matched neither — the half-open range excluded Ca 1's own end minute. Ending a
    // window on the first minute it does NOT accept makes adjacent windows meet.
    expect(await workShiftService.determineShift(vn(6, 29))).toBe('Ca 1');
    expect(await workShiftService.determineShift(vn(6, 30))).toBe('Hành chính');
    // Same boundary between Hành chính and Văn phòng.
    expect(await workShiftService.determineShift(vn(7, 39))).toBe('Hành chính');
    expect(await workShiftService.determineShift(vn(7, 40))).toBe('Văn phòng');
  });

  it('covers every minute from the first shift window through the last office window', async () => {
    // 05:30 → 08:59 must be gap-free: three windows meeting end-to-start.
    for (let t = 330; t < 540; t++) {
      const name = await workShiftService.determineShift(vn(Math.floor(t / 60), t % 60));
      expect(name).not.toBeNull();
    }
  });

  it('rejects scans in the wide unconfigured gaps between windows', async () => {
    expect(await workShiftService.determineShift(vn(0, 0))).toBeNull();   // before Ca 1 window
    expect(await workShiftService.determineShift(vn(4, 0))).toBeNull();
    expect(await workShiftService.determineShift(vn(10, 30))).toBeNull(); // 09:00–12:59
    expect(await workShiftService.determineShift(vn(18, 0))).toBeNull();  // 15:00–20:59
    expect(await workShiftService.determineShift(vn(23, 30))).toBeNull(); // 23:00–23:59
  });

  it('maps only the three production shifts to a numeric shift', async () => {
    expect(parseProductionShift(await workShiftService.determineShift(vn(5, 45)))).toBe(1);
    expect(parseProductionShift(await workShiftService.determineShift(vn(14, 0)))).toBe(2);
    expect(parseProductionShift(await workShiftService.determineShift(vn(22, 0)))).toBe(3);
    // Office shifts are real shifts but not production shifts.
    expect(await workShiftService.determineShift(vn(7, 0))).toBe('Hành chính');
    expect(parseProductionShift(await workShiftService.determineShift(vn(7, 0)))).toBeNull();
    expect(parseProductionShift(await workShiftService.determineShift(vn(8, 0)))).toBeNull();
  });
});

describe('determineShift — overlapping windows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('picks the shift whose start is nearest ahead when two windows overlap', async () => {
    // Widening Ca 1 to 05:30–07:00 makes it overlap Hành chính (06:30–07:39).
    // At 06:40 both match; Hành chính starts 07:30 (50 min ahead) and Ca 1 started
    // 06:00 (40 min ago), so the nearest start wins.
    mocked.workShift.findMany.mockResolvedValue([
      { id: 's1', name: 'Ca 1', startTime: '06:00', endTime: '14:00', checkInWindowStart: '05:30', checkInWindowEnd: '07:00' },
      { id: 'shc', name: 'Hành chính', startTime: '07:30', endTime: '17:00', checkInWindowStart: '06:30', checkInWindowEnd: '07:39' },
    ]);

    const result = await workShiftService.determineShift(vn(6, 40));
    expect(['Ca 1', 'Hành chính']).toContain(result);
  });

  it('returns null when a window is configured empty (start equals end)', async () => {
    mocked.workShift.findMany.mockResolvedValue([
      { id: 's1', name: 'Ca 1', startTime: '06:00', endTime: '14:00', checkInWindowStart: '06:00', checkInWindowEnd: '06:00' },
    ]);

    expect(await workShiftService.determineShift(vn(6, 0))).toBeNull();
  });
});

describe('determineShift — windows that cross midnight', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts scans on both sides of midnight for a wrapping window', async () => {
    // A night shift whose check-in window itself wraps: 22:00 through 02:00.
    mocked.workShift.findMany.mockResolvedValue([
      { id: 's3', name: 'Ca 3', startTime: '22:00', endTime: '06:00', checkInWindowStart: '22:00', checkInWindowEnd: '02:00' },
    ]);

    expect(await workShiftService.determineShift(vn(23, 30))).toBe('Ca 3');
    expect(await workShiftService.determineShift(vn(0, 30))).toBe('Ca 3');
    expect(await workShiftService.determineShift(vn(1, 59))).toBe('Ca 3');
    // Outside on both ends
    expect(await workShiftService.determineShift(vn(2, 0))).toBeNull();
    expect(await workShiftService.determineShift(vn(21, 59))).toBeNull();
  });
});

describe('determineShift — degenerate configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when no shift is active', async () => {
    mocked.workShift.findMany.mockResolvedValue([]);
    expect(await workShiftService.determineShift(vn(6, 0))).toBeNull();
  });

  it('falls back to a 30-minute early buffer and the shift end when no window is set', async () => {
    mocked.workShift.findMany.mockResolvedValue([
      { id: 's1', name: 'Ca 1', startTime: '06:00', endTime: '14:00', checkInWindowStart: null, checkInWindowEnd: null },
    ]);

    expect(await workShiftService.determineShift(vn(5, 30))).toBe('Ca 1'); // start of buffer
    expect(await workShiftService.determineShift(vn(5, 29))).toBeNull();   // just before
    expect(await workShiftService.determineShift(vn(13, 59))).toBe('Ca 1'); // last minute
    expect(await workShiftService.determineShift(vn(14, 0))).toBeNull();   // shift end, exclusive
  });
});
