/**
 * Production-day boundary helper.
 *
 * A "production day" runs from 06:30 on one calendar date to 06:29:59 the next.
 * - A timestamp at or after 06:30 belongs to THAT calendar date's production day.
 * - A timestamp before 06:30 belongs to the PREVIOUS calendar date's production day.
 *
 * This is the SINGLE source of truth for the 06:30 boundary.
 * Used by: Batch A (day-scoped queries), Batch B (backfill), Batch C (schedule module).
 */

const APP_TZ = process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh';

/** Production-day boundary: 06:30 local time */
const BOUNDARY_HOUR = 6;
const BOUNDARY_MINUTE = 30;

/**
 * Given a timestamp (UTC Date), return the production day it belongs to as a
 * "YYYY-MM-DD" string in the application timezone.
 *
 * Rules:
 * - Timestamp at or after 06:30 local → same calendar date
 * - Timestamp before 06:30 local → previous calendar date
 */
export function getProductionDay(timestamp: Date): string {
  // Get the local date/time parts in the app timezone
  const dateFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TZ,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(timestamp);

  const rawHour = timeParts.find((p) => p.type === 'hour')?.value || '0';
  const hour = parseInt(rawHour, 10) % 24;
  const minute = parseInt(timeParts.find((p) => p.type === 'minute')?.value || '0', 10);

  // Get the calendar date string in YYYY-MM-DD
  const calendarDate = dateFmt.format(timestamp);

  // If before boundary, the production day is the previous calendar date
  if (hour < BOUNDARY_HOUR || (hour === BOUNDARY_HOUR && minute < BOUNDARY_MINUTE)) {
    const d = new Date(calendarDate + 'T00:00:00.000Z');
    d.setUTCDate(d.getUTCDate() - 1);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return calendarDate;
}

/**
 * Build a thoiGianChien date-range filter for Prisma queries that scope
 * records to a single production day.
 *
 * A production day "YYYY-MM-DD" spans:
 *   from: that date at 06:30 local time (inclusive)
 *   to:   the next date at 06:30 local time (exclusive)
 *
 * Returns { gte: Date, lt: Date } suitable for Prisma DateTime where clauses.
 */
export function productionDayRange(productionDay: string): { gte: Date; lt: Date } {
  const gte = localDateTimeToUTC(productionDay, BOUNDARY_HOUR, BOUNDARY_MINUTE);
  // Next day at boundary
  const nextDate = new Date(new Date(productionDay + 'T00:00:00.000Z').getTime() + 86400000);
  const nextDay = nextDate.toISOString().slice(0, 10);
  const lt = localDateTimeToUTC(nextDay, BOUNDARY_HOUR, BOUNDARY_MINUTE);
  return { gte, lt };
}

/**
 * Parse a datetime string (possibly without timezone indicator) as a local time
 * in the application timezone (APP_TZ) and return the corresponding UTC Date.
 *
 * Handles:
 * - Full ISO with Z suffix ("2026-07-27T06:30:00.000Z") → already UTC, returned as-is
 * - Full ISO with offset ("2026-07-27T06:30:00+07:00") → parsed directly
 * - Naive datetime ("2026-07-27T06:30:00") → interpreted as APP_TZ local time
 * - Date-only ("2026-07-27") → interpreted as midnight in APP_TZ
 *
 * This is the TZ-safe replacement for bare `new Date(str)` in service code.
 */
export function parseLocalDateTimeAsAppTz(str: string): Date {
  // If already has timezone info (Z or +/-offset), parse directly
  if (/Z$|[+-]\d{2}:\d{2}$/.test(str)) {
    return new Date(str);
  }

  // Naive datetime string — interpret as APP_TZ local time
  // Split into date and time components
  let dateStr: string;
  let hour = 0;
  let minute = 0;
  let second = 0;

  if (str.includes('T')) {
    const [datePart, timePart] = str.split('T');
    dateStr = datePart;
    const timePieces = timePart.split(':');
    hour = parseInt(timePieces[0] || '0', 10);
    minute = parseInt(timePieces[1] || '0', 10);
    second = parseInt(timePieces[2] || '0', 10);
  } else {
    dateStr = str;
  }

  return localDateTimeToUTC(dateStr, hour, minute, second);
}

/**
 * Convert a local date and time in APP_TZ to a UTC Date object.
 *
 * Strategy: determine the timezone offset by comparing a reference point
 * formatted in APP_TZ versus UTC, then apply that offset.
 * Asia/Ho_Chi_Minh is UTC+7 with no DST, so this is stable, but the
 * implementation handles arbitrary fixed-offset timezones correctly.
 */
function localDateTimeToUTC(dateStr: string, hour: number, minute: number, second: number = 0): Date {
  // Treat dateStr + time as if it were UTC, then adjust by the TZ offset.
  const naiveUtc = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}.000Z`);

  // Determine the UTC offset of APP_TZ at this approximate instant.
  // Format naiveUtc in APP_TZ and see what time it shows.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(naiveUtc);

  const tzDay = parseInt(parts.find((p) => p.type === 'day')?.value || '1', 10);
  const tzHour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10) % 24;
  const tzMinute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);

  // The offset is (what APP_TZ shows) minus (what we fed as UTC)
  // in minutes. For UTC+7: feeding 06:30 UTC shows 13:30 local → offset = +420 min
  const utcMinutes = hour * 60 + minute;
  const tzMinutes = tzHour * 60 + tzMinute;

  // Handle day rollover: if the TZ day differs from the input day, adjust
  const inputDay = parseInt(dateStr.slice(8, 10), 10);
  let dayDiff = tzDay - inputDay;
  // Clamp to -1/0/+1 (month boundary edge case)
  if (dayDiff > 15) dayDiff -= 30; // e.g., 1 - 31
  if (dayDiff < -15) dayDiff += 30; // e.g., 31 - 1

  const offsetMinutes = dayDiff * 1440 + tzMinutes - utcMinutes;

  // The actual UTC instant for "dateStr at hour:minute in APP_TZ" is:
  // naiveUtc shifted backward by offsetMinutes
  return new Date(naiveUtc.getTime() - offsetMinutes * 60 * 1000);
}

/**
 * Extract the numeric production shift from a work-shift name.
 *
 * Only the three production shifts ("Ca 1"/"Ca 2"/"Ca 3") yield a number; office
 * shifts ("Hành chính", "Văn phòng") and unrecognized names yield null, because the
 * kiosk entry pages are scoped to production shifts.
 */
export function parseProductionShift(shiftName: string | null | undefined): number | null {
  if (!shiftName) return null;
  const match = shiftName.match(/^Ca\s+([123])$/i);
  if (!match) return null;
  return parseInt(match[1], 10);
}
