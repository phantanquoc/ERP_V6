import { computeSummary, TimesheetCellData } from '@services/timesheetService';

// Default settings for all tests
const defaultSettings = {
  standardWorkDays: 26,
  otRateWeekday: 1.5,
  otRateSunday: 2,
  otRateHoliday: 3,
};

// Helper to create a cell
function makeCell(overrides: Partial<TimesheetCellData> & { date: string; code: string }): TimesheetCellData {
  return {
    employeeId: 'emp-1',
    workHours: 0,
    overtimeHours: 0,
    ...overrides,
  };
}

// ─── Payable hours & official days ──────────────────────────────────────────────

describe('computeSummary — payable hours & official days', () => {
  // "officialWorkDays" holds official work time in HOURS (work days × 8), matching
  // the Excel "Tổng thời gian làm chính thức" column. "payableHours" = FIXED planned hours
  // of the month (standardWorkDays × 8), e.g., 26 workdays × 8h = 208h.
  it('code "x" (1 full day) → officialWorkDays 8h, payableHours 208h (fixed), mealAllowanceDays 1', () => {
    const cells = [makeCell({ date: '2026-06-01', code: 'x', workHours: 8 })];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.officialWorkDays).toBe(8);
    expect(result.payableHours).toBe(208); // standardWorkDays × 8 = 26 × 8
    expect(result.mealAllowanceDays).toBe(1);
  });

  it('code "N" (half day) → officialWorkDays 4h, mealAllowanceDays 0.5', () => {
    const cells = [makeCell({ date: '2026-06-01', code: 'N', workHours: 8 })];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.officialWorkDays).toBe(4);
    expect(result.mealAllowanceDays).toBe(0.5);
  });

  it('code "ON" → officialWorkDays 8h but mealAllowanceDays 0 (online = no meal)', () => {
    const cells = [makeCell({ date: '2026-06-01', code: 'ON', workHours: 8 })];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.officialWorkDays).toBe(8);
    expect(result.mealAllowanceDays).toBe(0);
  });

  it('"Giờ lương" = FIXED planned hours (standardWorkDays × 8), independent of actual work', () => {
    const cells = [
      makeCell({ date: '2026-06-01', code: 'x', workHours: 8 }),   // +8h official
      makeCell({ date: '2026-06-02', code: 'P', workHours: 0 }),   // +8h paid leave
      makeCell({ date: '2026-06-03', code: 'L', workHours: 0 }),   // +8h holiday/regime
      makeCell({ date: '2026-06-04', code: 'KL', workHours: 0 }),  // +8h unpaid
    ];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.officialWorkDays).toBe(8);
    expect(result.leaveHoursPayable).toBe(8);
    expect(result.leaveHoursHolidayRegime).toBe(8);
    expect(result.leaveHoursUnpaid).toBe(8);
    expect(result.payableHours).toBe(208); // standardWorkDays × 8 = 26 × 8, NOT summed buckets
  });

  it('code "ON" counts as 8h official work (business exception, not 0 like raw Excel)', () => {
    const cells = [makeCell({ date: '2026-06-01', code: 'ON', workHours: 8 })];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.officialWorkDays).toBe(8);
  });

  it('code "X/2" → 4h official work + 4h unpaid leave (Excel AP + AS)', () => {
    const cells = [makeCell({ date: '2026-06-01', code: 'X/2', workHours: 0 })];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.officialWorkDays).toBe(4);
    expect(result.leaveHoursUnpaid).toBe(4);
  });

  it('code "P/2" → 4h official work + 4h paid annual leave (Excel AP + AQ)', () => {
    const cells = [makeCell({ date: '2026-06-01', code: 'P/2', workHours: 0 })];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.officialWorkDays).toBe(4);
    expect(result.leaveHoursPayable).toBe(4);
  });
});

// ─── Half-day leave ────────────────────────────────────────────────────────────

describe('computeSummary — half-day leave = 4h not 8h', () => {
  it('code "P/2" with workHours 0 → leaveHoursPayable 4', () => {
    const cells = [makeCell({ date: '2026-06-01', code: 'P/2', workHours: 0 })];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.leaveHoursPayable).toBe(4);
  });

  it('code "X/2" → leaveHoursUnpaid 4', () => {
    const cells = [makeCell({ date: '2026-06-01', code: 'X/2', workHours: 0 })];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.leaveHoursUnpaid).toBe(4);
  });

  it('full "P" → leaveHoursPayable 8', () => {
    const cells = [makeCell({ date: '2026-06-01', code: 'P', workHours: 0 })];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.leaveHoursPayable).toBe(8);
  });

  it('"KL" → leaveHoursUnpaid 8', () => {
    const cells = [makeCell({ date: '2026-06-01', code: 'KL', workHours: 0 })];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.leaveHoursUnpaid).toBe(8);
  });
});

// ─── OT bands by day type ──────────────────────────────────────────────────────

describe('computeSummary — OT bands by day type (3 bands, no hour split)', () => {
  // 2026-06-01 is Monday (UTC), 2026-06-07 is Sunday (UTC)
  // Excel CHAM-CONG.xlsx uses 3 bands based ONLY on day type:
  //   - AO: OT weekday → 150% (otWeekday)
  //   - AP: OT Sunday → 200% (otSunday)
  //   - AQ: OT holiday → 300% (otHoliday)
  // NO split by hours (no "first 2h vs beyond 2h" logic).

  it('weekday OT → all into otWeekday (150%)', () => {
    const cells = [makeCell({ date: '2026-06-01', code: 'x', workHours: 8, overtimeHours: 1.5 })];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.otWeekday).toBe(1.5);
    expect(result.otSunday).toBe(0);
    expect(result.otHoliday).toBe(0);
  });

  it('weekday OT (3h) → all into otWeekday, no split', () => {
    // 2026-06-01 = Monday, 3h OT → all 3h @ 150%
    const cells = [makeCell({ date: '2026-06-01', code: 'x', workHours: 8, overtimeHours: 3 })];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.otWeekday).toBe(3);
    expect(result.otSunday).toBe(0);
    expect(result.otHoliday).toBe(0);
  });

  it('Sunday OT → all into otSunday (200%)', () => {
    // 2026-06-07 = Sunday
    const cells = [makeCell({ date: '2026-06-07', code: 'x', workHours: 8, overtimeHours: 2 })];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.otSunday).toBe(2);
    expect(result.otWeekday).toBe(0);
  });

  it('Sunday OT (3.5h) → all into otSunday, no split', () => {
    // 2026-06-07 = Sunday, 3.5h OT → all 3.5h @ 200%
    const cells = [makeCell({ date: '2026-06-07', code: 'x', workHours: 8, overtimeHours: 3.5 })];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.otSunday).toBe(3.5);
    expect(result.otWeekday).toBe(0);
  });

  it('holiday OT → all into otHoliday (300%)', () => {
    // 2026-06-02 is Tuesday, pass it as a holiday
    const holidayDate = new Date('2026-06-02T00:00:00Z');
    const cells = [makeCell({ date: '2026-06-02', code: 'x', workHours: 8, overtimeHours: 4 })];
    const result = computeSummary(cells, [holidayDate], defaultSettings);
    expect(result.otHoliday).toBe(4);
    expect(result.otWeekday).toBe(0);
  });
});

// ─── OT meal threshold > 2.5 ──────────────────────────────────────────────────

describe('computeSummary — OT meal threshold strictly > 2.5', () => {
  it('overtimeHours [2.5, 3.0, 1.0] → overtimeMealDays 1 (only 3.0)', () => {
    const cells = [
      makeCell({ date: '2026-06-01', code: 'x', workHours: 8, overtimeHours: 2.5 }),
      makeCell({ date: '2026-06-02', code: 'x', workHours: 8, overtimeHours: 3.0 }),
      makeCell({ date: '2026-06-03', code: 'x', workHours: 8, overtimeHours: 1.0 }),
    ];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.overtimeMealDays).toBe(1);
  });
});

// ─── leaveCompensatory ─────────────────────────────────────────────────────────

describe('computeSummary — leaveCompensatory', () => {
  it('two "BU" cells → leaveCompensatory 2', () => {
    const cells = [
      makeCell({ date: '2026-06-01', code: 'BU', workHours: 0 }),
      makeCell({ date: '2026-06-02', code: 'BU', workHours: 0 }),
    ];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.leaveCompensatory).toBe(2);
  });
});

// ─── diligence ─────────────────────────────────────────────────────────────────

describe('computeSummary — diligence (Excel BI: X/2×0.5 + KL×1 ≤ 1)', () => {
  it('full attendance → diligence true', () => {
    const cells = [makeCell({ date: '2026-06-01', code: 'x', workHours: 8 })];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.diligence).toBe(true);
  });

  it('exactly 1 "KL" day → still diligent (penalty = 1, ≤ 1)', () => {
    const cells = [
      makeCell({ date: '2026-06-01', code: 'x', workHours: 8 }),
      makeCell({ date: '2026-06-02', code: 'KL', workHours: 0 }),
    ];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.diligence).toBe(true);
  });

  it('2 "KL" days → diligence false (penalty = 2, > 1)', () => {
    const cells = [
      makeCell({ date: '2026-06-01', code: 'KL', workHours: 0 }),
      makeCell({ date: '2026-06-02', code: 'KL', workHours: 0 }),
    ];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.diligence).toBe(false);
  });

  it('1 "KL" + 1 "X/2" → false (penalty = 1.5, > 1)', () => {
    const cells = [
      makeCell({ date: '2026-06-01', code: 'KL', workHours: 0 }),
      makeCell({ date: '2026-06-02', code: 'X/2', workHours: 0 }),
    ];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.diligence).toBe(false);
  });

  it('sick "B" / maternity "TS" / not-yet "O" do NOT break diligence', () => {
    const cells = [
      makeCell({ date: '2026-06-01', code: 'B', workHours: 0 }),
      makeCell({ date: '2026-06-02', code: 'TS', workHours: 0 }),
      makeCell({ date: '2026-06-03', code: 'O', workHours: 0 }),
    ];
    const result = computeSummary(cells, [], defaultSettings);
    expect(result.diligence).toBe(true);
  });
});
