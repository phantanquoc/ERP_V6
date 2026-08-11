import { computeSummary, TimesheetCellData } from '@services/timesheetService';

describe('Timesheet with OT data (matching Excel sheet TĂNG CA)', () => {
  const settings = {
    standardWorkDays: 26,
    otRateWeekday: 1.5,
    otRateSunday: 2,
    otRateHoliday: 3,
  };

  it('Employee with 20 days work + OT on weekdays and Sundays', () => {
    // Scenario: 20 workdays with OT
    // - Day 2 (Mon, June 2): work 8h + OT 2h weekday (150%)
    // - Day 8 (Sun, June 8): work 8h + OT 3h Sunday (200%)
    // - Days 3-7, 9-26: work 8h, no OT
    // June 2025: starts on Sunday (day 1), so day 1,8,15,22,29 are Sundays

    const cells: TimesheetCellData[] = [
      // Days 2-7: Mon-Sat week 1 (day 2 with OT)
      { employeeId: 'TEST01', date: '2025-06-02', code: 'x', workHours: 8, overtimeHours: 2 },
      { employeeId: 'TEST01', date: '2025-06-03', code: 'x', workHours: 8, overtimeHours: 0 },
      { employeeId: 'TEST01', date: '2025-06-04', code: 'x', workHours: 8, overtimeHours: 0 },
      { employeeId: 'TEST01', date: '2025-06-05', code: 'x', workHours: 8, overtimeHours: 0 },
      { employeeId: 'TEST01', date: '2025-06-06', code: 'x', workHours: 8, overtimeHours: 0 },
      { employeeId: 'TEST01', date: '2025-06-07', code: 'x', workHours: 8, overtimeHours: 0 },
      // Day 8: Sunday with OT
      { employeeId: 'TEST01', date: '2025-06-08', code: 'x', workHours: 8, overtimeHours: 3 },
      // Days 9-26: rest of work days
      ...([9,10,11,12,13,14,16,17,18,19,20,21,23,24,25,26].map(day => ({
        employeeId: 'TEST01',
        date: `2025-06-${String(day).padStart(2, '0')}`,
        code: 'x',
        workHours: 8,
        overtimeHours: 0,
      }))),
    ];

    const result = computeSummary(cells, [], settings);

    // Expected values
    expect(result.payableHours).toBe(208); // FIXED: 26 × 8 (không phụ thuộc days worked)
    expect(result.officialWorkDays).toBe(184); // 23 days × 8h

    // OT hours: day 2 (Mon 2h) + day 8 (Sun 3h) = 5h total
    // Excel CHAM-CONG.xlsx uses 3 bands based ONLY on day type (no hour split):
    //   - Weekday OT → all @ 150%
    //   - Sunday OT → all @ 200%
    //   - Holiday OT → all @ 300%
    expect(result.otWeekday).toBe(2); // Day 2 Mon OT (all 2h @ 150%)
    expect(result.otSunday).toBe(3); // Day 8 Sun OT (all 3h @ 200%)
    expect(result.otHoliday).toBe(0); // No holiday OT
  });

  it('Employee with mixed codes: x, P, KL, and OT', () => {
    // 16 days work (x) + 2 days paid leave (P) + 1 day unpaid (KL)
    // Day 2 (Monday) has OT 1.5h
    const cells: TimesheetCellData[] = [
      // Day 2 with OT (Monday - not Sunday June 1)
      { employeeId: 'TEST02', date: '2025-06-02', code: 'x', workHours: 8, overtimeHours: 1.5 },
      // Other work days
      ...([3,4,5,6,9,10,11,12,13,16,17,18,19,20,23].map(day => ({
        employeeId: 'TEST02',
        date: `2025-06-${String(day).padStart(2, '0')}`,
        code: 'x',
        workHours: 8,
        overtimeHours: 0,
      }))),
      // Paid leave
      { employeeId: 'TEST02', date: '2025-06-24', code: 'P', workHours: 0, overtimeHours: 0 },
      { employeeId: 'TEST02', date: '2025-06-25', code: 'P', workHours: 0, overtimeHours: 0 },
      // Unpaid leave
      { employeeId: 'TEST02', date: '2025-06-26', code: 'KL', workHours: 0, overtimeHours: 0 },
    ];

    const result = computeSummary(cells, [], settings);

    expect(result.payableHours).toBe(208); // FIXED: 26 × 8
    expect(result.officialWorkDays).toBe(128); // 16 days × 8h
    expect(result.leaveHoursPayable).toBe(16); // 2 days P × 8h
    expect(result.leaveHoursUnpaid).toBe(8); // 1 day KL × 8h
    expect(result.otWeekday).toBe(1.5); // Day 2 (Mon) OT - weekday not Sunday
  });

  it('Excel mapping check: officialWorkDays matches AP formula', () => {
    // Excel AP = (COUNTIF "x")*8 + (COUNTIF "x/2")*4 + (COUNTIF "P")*0 + ...
    // Backend officialWorkDays = same logic
    // Note: lateEarlyHours is handled via overrides at service layer, not in computeSummary

    const cells: TimesheetCellData[] = [
      ...([1,2,3,4,5].map(day => ({
        employeeId: 'TEST03',
        date: `2025-06-${String(day).padStart(2, '0')}`,
        code: 'x',
        workHours: 8,
        overtimeHours: 0,
      }))),
      { employeeId: 'TEST03', date: '2025-06-08', code: 'X/2', workHours: 4, overtimeHours: 0 },
      { employeeId: 'TEST03', date: '2025-06-09', code: 'P', workHours: 0, overtimeHours: 0 },
    ];

    const result = computeSummary(cells, [], settings);

    // Excel: AP = (5×8) + (1×4) + (1×0) = 44 (before lateEarly subtraction)
    expect(result.officialWorkDays).toBe(44);

    // Excel: AS = (COUNTIF "X/2")*4 + other unpaid codes
    // X/2 counts as BOTH work (4h in AP) AND unpaid leave (4h in AS)
    expect(result.leaveHoursUnpaid).toBe(4); // 1 day X/2 × 4h

    // Excel: AQ = (COUNTIF "P")*8 + ...
    expect(result.leaveHoursPayable).toBe(8); // 1 day P × 8h
  });
});
