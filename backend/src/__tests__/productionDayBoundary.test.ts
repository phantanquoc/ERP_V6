/**
 * Unit test for the production-day boundary helper (getProductionDay).
 *
 * The 06:30 boundary rule: timestamps before 06:30 local (Asia/Ho_Chi_Minh)
 * map to the PREVIOUS calendar date; timestamps at or after 06:30 map to the
 * same calendar date.
 *
 * This test covers the change's most silent failure mode: a naive calendar-date
 * implementation would pass the daytime cases and silently misdate every
 * after-midnight historical row — precisely the rows the new grouping exists to fix.
 */
import { getProductionDay } from '@utils/productionDay';

// Asia/Ho_Chi_Minh is UTC+7. To create a local time, subtract 7h from desired local.
// e.g., local 02:00 on 2026-07-27 → UTC 19:00 on 2026-07-26

describe('getProductionDay — 06:30 boundary mapping', () => {
  it('02:00 local maps to the PREVIOUS calendar date (after-midnight batch)', () => {
    // Local: 2026-07-27 02:00 → UTC: 2026-07-26 19:00
    const ts = new Date('2026-07-26T19:00:00.000Z');
    expect(getProductionDay(ts)).toBe('2026-07-26');
  });

  it('exactly 06:30 local maps to THAT calendar date (boundary inclusive)', () => {
    // Local: 2026-07-27 06:30 → UTC: 2026-07-26 23:30
    const ts = new Date('2026-07-26T23:30:00.000Z');
    expect(getProductionDay(ts)).toBe('2026-07-27');
  });

  it('12:00 local maps to THAT calendar date (daytime)', () => {
    // Local: 2026-07-27 12:00 → UTC: 2026-07-27 05:00
    const ts = new Date('2026-07-27T05:00:00.000Z');
    expect(getProductionDay(ts)).toBe('2026-07-27');
  });

  it('23:30 local maps to THAT calendar date (late evening)', () => {
    // Local: 2026-07-27 23:30 → UTC: 2026-07-27 16:30
    const ts = new Date('2026-07-27T16:30:00.000Z');
    expect(getProductionDay(ts)).toBe('2026-07-27');
  });

  it('06:29 local maps to the PREVIOUS calendar date (one minute before boundary)', () => {
    // Local: 2026-07-27 06:29 → UTC: 2026-07-26 23:29
    const ts = new Date('2026-07-26T23:29:00.000Z');
    expect(getProductionDay(ts)).toBe('2026-07-26');
  });

  it('00:00 midnight local maps to the PREVIOUS calendar date', () => {
    // Local: 2026-07-27 00:00 → UTC: 2026-07-26 17:00
    const ts = new Date('2026-07-26T17:00:00.000Z');
    expect(getProductionDay(ts)).toBe('2026-07-26');
  });

  it('05:00 local (MC-16 start time) maps to the PREVIOUS calendar date', () => {
    // Local: 2026-07-28 05:00 → UTC: 2026-07-27 22:00
    // Production day should be 2026-07-27 (the day the shift started)
    const ts = new Date('2026-07-27T22:00:00.000Z');
    expect(getProductionDay(ts)).toBe('2026-07-27');
  });
});
