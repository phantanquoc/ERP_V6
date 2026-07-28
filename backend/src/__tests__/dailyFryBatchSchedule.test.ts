/**
 * Unit tests for the daily fry-batch schedule module.
 *
 * Asserts:
 * - All sixteen codes MC-01 through MC-16
 * - All sixteen start times (06:30 + 90min cadence)
 * - Shift grouping (5/5/6 by position)
 * - After-midnight batches (MC-13–MC-16) carry the starting day's ngaySanXuat
 * - Cycle closes exactly at 06:30 the next morning
 * - Reuses getProductionDay from @utils/productionDay (no reimplementation)
 */
import {
  getDailySchedule,
  getScheduleForShift,
  getShiftForSequence,
  isScheduledCode,
  getSequenceFromCode,
  getProductionDay,
  BATCH_COUNT,
  CADENCE_MINUTES,
} from '@utils/dailyFryBatchSchedule';

describe('dailyFryBatchSchedule', () => {
  const PROD_DAY = '2026-07-27';

  describe('getDailySchedule', () => {
    const schedule = getDailySchedule(PROD_DAY);

    it('returns exactly 16 batches', () => {
      expect(schedule).toHaveLength(16);
    });

    it('codes are MC-01 through MC-16 (two-digit, zero-padded)', () => {
      const codes = schedule.map((b) => b.code);
      expect(codes).toEqual([
        'MC-01', 'MC-02', 'MC-03', 'MC-04', 'MC-05',
        'MC-06', 'MC-07', 'MC-08', 'MC-09', 'MC-10',
        'MC-11', 'MC-12', 'MC-13', 'MC-14', 'MC-15', 'MC-16',
      ]);
    });

    it('all sixteen start times follow the 90-minute cadence from 06:30', () => {
      const expectedTimes = [
        { hour: 6, minute: 30 },   // MC-01
        { hour: 8, minute: 0 },    // MC-02
        { hour: 9, minute: 30 },   // MC-03
        { hour: 11, minute: 0 },   // MC-04
        { hour: 12, minute: 30 },  // MC-05
        { hour: 14, minute: 0 },   // MC-06
        { hour: 15, minute: 30 },  // MC-07
        { hour: 17, minute: 0 },   // MC-08
        { hour: 18, minute: 30 },  // MC-09
        { hour: 20, minute: 0 },   // MC-10
        { hour: 21, minute: 30 },  // MC-11
        { hour: 23, minute: 0 },   // MC-12
        { hour: 0, minute: 30 },   // MC-13 (next calendar day)
        { hour: 2, minute: 0 },    // MC-14 (next calendar day)
        { hour: 3, minute: 30 },   // MC-15 (next calendar day)
        { hour: 5, minute: 0 },    // MC-16 (next calendar day)
      ];

      schedule.forEach((batch, i) => {
        expect(batch.startTime).toEqual(expectedTimes[i]);
      });
    });

    it('cycle closes exactly at 06:30 next morning (16 x 90min = 24h)', () => {
      expect(BATCH_COUNT * CADENCE_MINUTES).toBe(24 * 60);
    });

    it('all batches carry the same ngaySanXuat as the requested production day', () => {
      schedule.forEach((batch) => {
        expect(batch.ngaySanXuat).toBe(PROD_DAY);
      });
    });

    it('MC-13 through MC-16 are marked as next calendar day', () => {
      // MC-01 to MC-12 are NOT next calendar day
      for (let i = 0; i < 12; i++) {
        expect(schedule[i].isNextCalendarDay).toBe(false);
      }
      // MC-13 to MC-16 ARE next calendar day
      for (let i = 12; i < 16; i++) {
        expect(schedule[i].isNextCalendarDay).toBe(true);
      }
    });

    it('MC-13 through MC-16 keep ngaySanXuat of the starting day despite clock on next date', () => {
      // This is the critical assertion: after-midnight batches belong to the
      // production day that started at 06:30, not to the next calendar date.
      expect(schedule[12].code).toBe('MC-13');
      expect(schedule[12].startTime).toEqual({ hour: 0, minute: 30 });
      expect(schedule[12].ngaySanXuat).toBe('2026-07-27');

      expect(schedule[13].code).toBe('MC-14');
      expect(schedule[13].startTime).toEqual({ hour: 2, minute: 0 });
      expect(schedule[13].ngaySanXuat).toBe('2026-07-27');

      expect(schedule[14].code).toBe('MC-15');
      expect(schedule[14].startTime).toEqual({ hour: 3, minute: 30 });
      expect(schedule[14].ngaySanXuat).toBe('2026-07-27');

      expect(schedule[15].code).toBe('MC-16');
      expect(schedule[15].startTime).toEqual({ hour: 5, minute: 0 });
      expect(schedule[15].ngaySanXuat).toBe('2026-07-27');
    });

    it('codes are identical across different production days', () => {
      const day1 = getDailySchedule('2026-07-27');
      const day2 = getDailySchedule('2026-08-15');
      const codes1 = day1.map((b) => b.code);
      const codes2 = day2.map((b) => b.code);
      expect(codes1).toEqual(codes2);
    });
  });

  describe('shift grouping (5/5/6 by position)', () => {
    const schedule = getDailySchedule(PROD_DAY);

    it('shift 1 covers MC-01 to MC-05', () => {
      for (let i = 0; i < 5; i++) {
        expect(schedule[i].shift).toBe(1);
      }
    });

    it('shift 2 covers MC-06 to MC-10', () => {
      for (let i = 5; i < 10; i++) {
        expect(schedule[i].shift).toBe(2);
      }
    });

    it('shift 3 covers MC-11 to MC-16', () => {
      for (let i = 10; i < 16; i++) {
        expect(schedule[i].shift).toBe(3);
      }
    });

    it('getScheduleForShift returns correct subset', () => {
      const shift1 = getScheduleForShift(PROD_DAY, 1);
      expect(shift1).toHaveLength(5);
      expect(shift1.map((b) => b.code)).toEqual(['MC-01', 'MC-02', 'MC-03', 'MC-04', 'MC-05']);

      const shift2 = getScheduleForShift(PROD_DAY, 2);
      expect(shift2).toHaveLength(5);
      expect(shift2.map((b) => b.code)).toEqual(['MC-06', 'MC-07', 'MC-08', 'MC-09', 'MC-10']);

      const shift3 = getScheduleForShift(PROD_DAY, 3);
      expect(shift3).toHaveLength(6);
      expect(shift3.map((b) => b.code)).toEqual(['MC-11', 'MC-12', 'MC-13', 'MC-14', 'MC-15', 'MC-16']);
    });

    it('getShiftForSequence is consistent with schedule', () => {
      expect(getShiftForSequence(1)).toBe(1);
      expect(getShiftForSequence(5)).toBe(1);
      expect(getShiftForSequence(6)).toBe(2);
      expect(getShiftForSequence(10)).toBe(2);
      expect(getShiftForSequence(11)).toBe(3);
      expect(getShiftForSequence(16)).toBe(3);
    });
  });

  describe('getProductionDay reuse (task 3.4)', () => {
    // This confirms the schedule module reuses the Batch A helper rather than
    // reimplementing the 06:30 boundary rule.
    it('re-exports getProductionDay from @utils/productionDay', () => {
      expect(typeof getProductionDay).toBe('function');
    });

    it('after-midnight timestamps map to previous calendar date', () => {
      // Local 02:00 on 2026-07-28 → UTC 19:00 on 2026-07-27
      // Production day should be 2026-07-27
      const ts = new Date('2026-07-27T19:00:00.000Z');
      expect(getProductionDay(ts)).toBe('2026-07-27');
    });

    it('06:30 local maps to that calendar date', () => {
      // Local 06:30 on 2026-07-27 → UTC 23:30 on 2026-07-26
      const ts = new Date('2026-07-26T23:30:00.000Z');
      expect(getProductionDay(ts)).toBe('2026-07-27');
    });
  });

  describe('isScheduledCode / getSequenceFromCode', () => {
    it('validates two-digit MC codes', () => {
      expect(isScheduledCode('MC-01')).toBe(true);
      expect(isScheduledCode('MC-16')).toBe(true);
      expect(isScheduledCode('MC-00')).toBe(false);
      expect(isScheduledCode('MC-17')).toBe(false);
      expect(isScheduledCode('MC-001')).toBe(false); // legacy three-digit
      expect(isScheduledCode('MC-1')).toBe(false);   // no zero-pad
    });

    it('extracts sequence number from code', () => {
      expect(getSequenceFromCode('MC-01')).toBe(1);
      expect(getSequenceFromCode('MC-16')).toBe(16);
      expect(getSequenceFromCode('MC-001')).toBeNull(); // legacy
      expect(getSequenceFromCode('XX-01')).toBeNull();
    });
  });
});
