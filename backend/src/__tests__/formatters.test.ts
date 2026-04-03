// @ts-nocheck — formatter functions return strings, minimal type complexity needed

/**
 * Formatters — Unit Tests
 * ─────────────────────────────────────────────────────────────────────────────
 * Tests verify the format utilities exported from @utils/helpers:
 *   • formatDate      — converts Date/ISO-string → "dd/mm/yyyy"
 *   • formatDateTime  — converts Date/ISO-string/timestamp → "dd/mm/yyyy HH:mm"
 *   • formatNumber     — converts number → Vietnamese thousand-separated string
 * ─────────────────────────────────────────────────────────────────────────────
 */

jest.mock('@config/env', () => ({ isProduction: false, isDevelopment: true }));

jest.mock('@config/logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { formatDate, formatDateTime, formatNumber } from '@utils/helpers';

// ─── formatDate ───────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('should format ISO date string "2026-04-02" → "02/04/2026"', () => {
    expect(formatDate('2026-04-02')).toBe('02/04/2026');
  });

  it('should format Date object → "dd/mm/yyyy"', () => {
    const d = new Date('2026-04-02T00:00:00.000Z');
    expect(formatDate(d)).toBe('02/04/2026');
  });

  it('should pad single-digit day and month with leading zero', () => {
    expect(formatDate('2026-01-05')).toBe('05/01/2026');
    expect(formatDate('2026-12-01')).toBe('01/12/2026');
  });

  it('should return empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('should return empty string for invalid date string', () => {
    expect(formatDate('not-a-date')).toBe('');
  });

  it('should handle date-only string (no time component)', () => {
    expect(formatDate('2026-12-31')).toBe('31/12/2026');
  });
});

// ─── formatDateTime ───────────────────────────────────────────────────────────

describe('formatDateTime', () => {
  it('should format timestamp "2026-04-02T08:30:00" → "02/04/2026 08:30"', () => {
    // Use local-time string (no 'Z') so getHours() = 08 in any timezone
    expect(formatDateTime('2026-04-02T08:30:00')).toBe('02/04/2026 08:30');
  });

  it('should format Date object → "dd/mm/yyyy HH:mm"', () => {
    const d = new Date(2026, 3, 2, 8, 30, 0); // local time constructor
    expect(formatDateTime(d)).toBe('02/04/2026 08:30');
  });

  it('should format numeric timestamp (ms)', () => {
    const ts = new Date(2026, 3, 2, 8, 30, 0).getTime(); // local time
    expect(formatDateTime(ts)).toBe('02/04/2026 08:30');
  });

  it('should pad single-digit hours and minutes with leading zero', () => {
    const d = new Date(2026, 3, 2, 9, 5, 0); // local time constructor
    expect(formatDateTime(d)).toBe('02/04/2026 09:05');
  });

  it('should return empty string for null', () => {
    expect(formatDateTime(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(formatDateTime(undefined)).toBe('');
  });

  it('should return empty string for invalid date', () => {
    expect(formatDateTime('abc')).toBe('');
  });
});

// ─── formatNumber ────────────────────────────────────────────────────────────

describe('formatNumber', () => {
  it('should format 1000000 → "1.000.000"', () => {
    expect(formatNumber(1000000)).toBe('1.000.000');
  });

  it('should format integer with no decimals', () => {
    expect(formatNumber(12345)).toBe('12.345');
  });

  it('should format float with default 0 decimals (rounds to integer)', () => {
    expect(formatNumber(1234.56)).toBe('1.235');
  });

  it('should format with specified decimal places', () => {
    expect(formatNumber(1234.567, 1)).toBe('1.234,6');
    expect(formatNumber(1234.567, 2)).toBe('1.234,57');
  });

  it('should return empty string for null', () => {
    expect(formatNumber(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(formatNumber(undefined)).toBe('');
  });

  it('should return empty string for NaN', () => {
    expect(formatNumber(NaN)).toBe('');
  });

  it('should format zero', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('should format small numbers', () => {
    expect(formatNumber(999)).toBe('999');
  });

  it('should handle large numbers', () => {
    expect(formatNumber(999999999)).toBe('999.999.999');
  });
});
