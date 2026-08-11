import { computeSummary, TimesheetCellData } from '@services/timesheetService';

describe('Real Excel data validation', () => {
  const settings = {
    standardWorkDays: 26,
    otRateWeekday: 1.5,
    otRateWeekdayExtra: 2.1,
    otRateSunday: 2,
    otRateSundayExtra: 2.7,
    otRateHoliday: 3,
  };

  it('NV0005 - Ngô Thị Ngọc Hân: 26 days "x" → payableHours 208h (26×8), officialWorkDays 208h', () => {
    // Days worked: 1,2,3,4,5,6,8,9,10,11,12,13,15,16,17,18,19,20,22,23,24,25,26,27,29,30
    const cells: TimesheetCellData[] = [
      1,2,3,4,5,6,8,9,10,11,12,13,15,16,17,18,19,20,22,23,24,25,26,27,29,30
    ].map(day => ({
      employeeId: 'NV0005',
      date: `2025-06-${String(day).padStart(2, '0')}`,
      code: 'x',
      workHours: 8,
      overtimeHours: 0,
    }));

    const result = computeSummary(cells, [], settings);

    // Excel values
    expect(result.payableHours).toBe(208); // standardWorkDays × 8 = 26 × 8
    expect(result.officialWorkDays).toBe(208); // 26 days × 8h
    expect(result.leaveHoursPayable).toBe(0);
    expect(result.leaveHoursHolidayRegime).toBe(0);
    expect(result.leaveHoursUnpaid).toBe(0);
    expect(result.probationDays).toBe(0);
    expect(result.lateEarlyHours).toBe(0);
  });

  it('NV0007 - Lê Thị Mai: 14 days "x" + 2 days "KL" → payableHours 208h (still 26×8), officialWorkDays 112h', () => {
    // Excel shows: payable=128h, official=112h, leave_unpaid=16h
    // But with NEW logic: payableHours should be FIXED 208h (26 workdays × 8h)
    const cells: TimesheetCellData[] = [
      ...([1,2,3,4,5,6,8,9,10,11,12,13,15,16].map(day => ({
        employeeId: 'NV0007',
        date: `2025-06-${String(day).padStart(2, '0')}`,
        code: 'x',
        workHours: 8,
        overtimeHours: 0,
      }))),
      ...([ 17, 18 ].map(day => ({
        employeeId: 'NV0007',
        date: `2025-06-${String(day).padStart(2, '0')}`,
        code: 'KL',
        workHours: 0,
        overtimeHours: 0,
      }))),
    ];

    const result = computeSummary(cells, [], settings);

    expect(result.payableHours).toBe(208); // FIXED: standardWorkDays × 8
    expect(result.officialWorkDays).toBe(112); // 14 days × 8h
    expect(result.leaveHoursUnpaid).toBe(16); // 2 days KL × 8h
  });
});
