/**
 * Test: deriveThoiGianChien — timezone-independent timestamp derivation.
 *
 * This test locks the rule that deriveThoiGianChien MUST produce the same naive
 * local-time string regardless of the browser's system timezone. The function
 * must never construct a zone-dependent Date for the target instant.
 *
 * Coverage:
 * - All 16 batch codes (MC-01 06:30 through MC-16 05:00, 90-min cadence)
 * - MC-01–MC-12 stay on the production day's calendar date
 * - MC-13–MC-16 land on the next calendar date (isNextCalendarDay=true)
 * - Month-end rollover (2026-07-31 → 2026-08-01)
 * - Year-end rollover (2026-12-31 → 2027-01-01)
 * - Timezone independence: identical output under UTC, Asia/Ho_Chi_Minh, America/New_York
 */

import { describe, it, expect } from 'vitest';
import { deriveThoiGianChien } from '../pages/production/deriveThoiGianChien';

// ─── Schedule definition (mirrors backend dailyFryBatchSchedule) ─────────────

interface BatchDef {
  code: string;
  hour: number;
  minute: number;
  isNextCalendarDay: boolean;
}

// MC-01 starts at 06:30, each subsequent batch +90 minutes
// MC-13 (00:30) through MC-16 (05:00) cross midnight → isNextCalendarDay=true
const ALL_BATCHES: BatchDef[] = [
  { code: 'MC-01', hour: 6, minute: 30, isNextCalendarDay: false },
  { code: 'MC-02', hour: 8, minute: 0, isNextCalendarDay: false },
  { code: 'MC-03', hour: 9, minute: 30, isNextCalendarDay: false },
  { code: 'MC-04', hour: 11, minute: 0, isNextCalendarDay: false },
  { code: 'MC-05', hour: 12, minute: 30, isNextCalendarDay: false },
  { code: 'MC-06', hour: 14, minute: 0, isNextCalendarDay: false },
  { code: 'MC-07', hour: 15, minute: 30, isNextCalendarDay: false },
  { code: 'MC-08', hour: 17, minute: 0, isNextCalendarDay: false },
  { code: 'MC-09', hour: 18, minute: 30, isNextCalendarDay: false },
  { code: 'MC-10', hour: 20, minute: 0, isNextCalendarDay: false },
  { code: 'MC-11', hour: 21, minute: 30, isNextCalendarDay: false },
  { code: 'MC-12', hour: 23, minute: 0, isNextCalendarDay: false },
  { code: 'MC-13', hour: 0, minute: 30, isNextCalendarDay: true },
  { code: 'MC-14', hour: 2, minute: 0, isNextCalendarDay: true },
  { code: 'MC-15', hour: 3, minute: 30, isNextCalendarDay: true },
  { code: 'MC-16', hour: 5, minute: 0, isNextCalendarDay: true },
];

// ─── Helper to run derivation under a given TZ ──────────────────────────────

function deriveUnderTz(
  tz: string,
  productionDay: string,
  batch: BatchDef,
): string {
  // Set the TZ env var. Note: in Node.js, process.env.TZ affects Date behavior
  // only if set before the first Date usage in the process — but for our function
  // deriveThoiGianChien, it must NOT use Date at all for the target instant,
  // so the result must be identical regardless of TZ. We still set TZ to prove
  // the function doesn't read the system timezone.
  const originalTz = process.env.TZ;
  process.env.TZ = tz;
  try {
    return deriveThoiGianChien(
      productionDay,
      batch.hour,
      batch.minute,
      batch.isNextCalendarDay,
    );
  } finally {
    if (originalTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = originalTz;
    }
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('deriveThoiGianChien', () => {
  const PRODUCTION_DAY = '2026-07-27';

  describe('all 16 batch codes produce correct naive datetime', () => {
    const expected: Record<string, string> = {
      'MC-01': '2026-07-27T06:30:00',
      'MC-02': '2026-07-27T08:00:00',
      'MC-03': '2026-07-27T09:30:00',
      'MC-04': '2026-07-27T11:00:00',
      'MC-05': '2026-07-27T12:30:00',
      'MC-06': '2026-07-27T14:00:00',
      'MC-07': '2026-07-27T15:30:00',
      'MC-08': '2026-07-27T17:00:00',
      'MC-09': '2026-07-27T18:30:00',
      'MC-10': '2026-07-27T20:00:00',
      'MC-11': '2026-07-27T21:30:00',
      'MC-12': '2026-07-27T23:00:00',
      'MC-13': '2026-07-28T00:30:00',
      'MC-14': '2026-07-28T02:00:00',
      'MC-15': '2026-07-28T03:30:00',
      'MC-16': '2026-07-28T05:00:00',
    };

    for (const batch of ALL_BATCHES) {
      it(`${batch.code} → ${expected[batch.code]}`, () => {
        const result = deriveThoiGianChien(
          PRODUCTION_DAY,
          batch.hour,
          batch.minute,
          batch.isNextCalendarDay,
        );
        expect(result).toBe(expected[batch.code]);
      });
    }
  });

  describe('MC-01–MC-12 stay on production day calendar date', () => {
    for (const batch of ALL_BATCHES.filter(b => !b.isNextCalendarDay)) {
      it(`${batch.code} date part equals production day`, () => {
        const result = deriveThoiGianChien(PRODUCTION_DAY, batch.hour, batch.minute, false);
        expect(result.slice(0, 10)).toBe(PRODUCTION_DAY);
      });
    }
  });

  describe('MC-13–MC-16 land on next calendar date', () => {
    for (const batch of ALL_BATCHES.filter(b => b.isNextCalendarDay)) {
      it(`${batch.code} date part is day after production day`, () => {
        const result = deriveThoiGianChien(PRODUCTION_DAY, batch.hour, batch.minute, true);
        expect(result.slice(0, 10)).toBe('2026-07-28');
      });
    }
  });

  describe('timezone independence — same output under UTC, Asia/Ho_Chi_Minh, America/New_York', () => {
    const timezones = ['UTC', 'Asia/Ho_Chi_Minh', 'America/New_York'];

    for (const batch of ALL_BATCHES) {
      it(`${batch.code} is timezone-invariant`, () => {
        const results = timezones.map(tz => deriveUnderTz(tz, PRODUCTION_DAY, batch));
        // All three must be identical
        expect(results[0]).toBe(results[1]);
        expect(results[1]).toBe(results[2]);
        // Sanity: not empty
        expect(results[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/);
      });
    }
  });

  describe('month-end rollover (2026-07-31)', () => {
    const prodDay = '2026-07-31';

    it('MC-12 stays on 2026-07-31', () => {
      const result = deriveThoiGianChien(prodDay, 23, 0, false);
      expect(result).toBe('2026-07-31T23:00:00');
    });

    it('MC-13 rolls to 2026-08-01', () => {
      const result = deriveThoiGianChien(prodDay, 0, 30, true);
      expect(result).toBe('2026-08-01T00:30:00');
    });

    it('MC-16 rolls to 2026-08-01', () => {
      const result = deriveThoiGianChien(prodDay, 5, 0, true);
      expect(result).toBe('2026-08-01T05:00:00');
    });

    it('timezone-invariant at month boundary', () => {
      const timezones = ['UTC', 'Asia/Ho_Chi_Minh', 'America/New_York'];
      const mc13 = ALL_BATCHES.find(b => b.code === 'MC-13')!;
      const results = timezones.map(tz => deriveUnderTz(tz, prodDay, mc13));
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
      expect(results[0]).toBe('2026-08-01T00:30:00');
    });
  });

  describe('year-end rollover (2026-12-31 → 2027-01-01)', () => {
    const prodDay = '2026-12-31';

    it('MC-01 stays on 2026-12-31', () => {
      const result = deriveThoiGianChien(prodDay, 6, 30, false);
      expect(result).toBe('2026-12-31T06:30:00');
    });

    it('MC-12 stays on 2026-12-31', () => {
      const result = deriveThoiGianChien(prodDay, 23, 0, false);
      expect(result).toBe('2026-12-31T23:00:00');
    });

    it('MC-13 rolls to 2027-01-01', () => {
      const result = deriveThoiGianChien(prodDay, 0, 30, true);
      expect(result).toBe('2027-01-01T00:30:00');
    });

    it('MC-14 rolls to 2027-01-01', () => {
      const result = deriveThoiGianChien(prodDay, 2, 0, true);
      expect(result).toBe('2027-01-01T02:00:00');
    });

    it('MC-15 rolls to 2027-01-01', () => {
      const result = deriveThoiGianChien(prodDay, 3, 30, true);
      expect(result).toBe('2027-01-01T03:30:00');
    });

    it('MC-16 rolls to 2027-01-01', () => {
      const result = deriveThoiGianChien(prodDay, 5, 0, true);
      expect(result).toBe('2027-01-01T05:00:00');
    });

    it('timezone-invariant at year boundary', () => {
      const timezones = ['UTC', 'Asia/Ho_Chi_Minh', 'America/New_York'];
      const mc16 = ALL_BATCHES.find(b => b.code === 'MC-16')!;
      const results = timezones.map(tz => deriveUnderTz(tz, prodDay, mc16));
      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
      expect(results[0]).toBe('2027-01-01T05:00:00');
    });
  });

  describe('output format', () => {
    it('always matches YYYY-MM-DDTHH:mm:00 (no timezone suffix)', () => {
      for (const batch of ALL_BATCHES) {
        const result = deriveThoiGianChien(PRODUCTION_DAY, batch.hour, batch.minute, batch.isNextCalendarDay);
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00$/);
        // Must NOT end with Z or +/-offset
        expect(result).not.toMatch(/Z$/);
        expect(result).not.toMatch(/[+-]\d{2}:\d{2}$/);
      }
    });
  });
});
