/**
 * Production-day boundary helper for the frontend.
 *
 * A "production day" runs from 06:30 on one calendar date to 06:29:59 the next.
 * - Local time at or after 06:30 → same calendar date is the production day
 * - Local time before 06:30 → previous calendar date is the production day
 *
 * This mirrors backend/src/utils/productionDay.ts exactly.
 */

const BOUNDARY_HOUR = 6;
const BOUNDARY_MINUTE = 30;

/**
 * Given a production day (YYYY-MM-DD), return the local-time date range
 * that covers that production day:
 *   from: `${productionDay}T06:30:00` (inclusive)
 *   to:   `${nextDay}T06:30:00` (exclusive)
 *
 * Returns { from, to } as local-time strings suitable for API query params.
 * This is the SINGLE frontend implementation of the 06:30 boundary range.
 */
export function productionDayRange(productionDay: string): { from: string; to: string } {
  const from = `${productionDay}T06:30:00`;
  const nextDay = new Date(productionDay + 'T12:00:00');
  nextDay.setDate(nextDay.getDate() + 1);
  const toDate = nextDay.toISOString().split('T')[0];
  const to = `${toDate}T06:30:00`;
  return { from, to };
}

/**
 * Get the current production day as YYYY-MM-DD.
 * Before 06:30 → previous calendar date; at or after 06:30 → current calendar date.
 */
export function getCurrentProductionDay(now?: Date): string {
  const d = now ?? new Date();
  const hour = d.getHours();
  const minute = d.getMinutes();

  let target = d;
  if (hour < BOUNDARY_HOUR || (hour === BOUNDARY_HOUR && minute < BOUNDARY_MINUTE)) {
    // Before boundary → previous calendar date
    target = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  }

  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
