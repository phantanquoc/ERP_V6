/**
 * Timezone-aware date utilities for attendance.
 * Uses APP_TIMEZONE env var (default: Asia/Ho_Chi_Minh).
 */

const APP_TZ = process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh';

/**
 * Get today's date at 00:00:00 in the application timezone.
 * Used for attendance queries (attendanceDate = today).
 */
export function getTodayInAppTz(): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: APP_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  const dateStr = formatter.format(now); // "2026-05-20"
  return new Date(dateStr + 'T00:00:00.000Z');
}

/**
 * Get current hour and minute in the application timezone.
 * Used for late detection (compare against shift start time).
 */
export function nowInAppTz(): { hour: number; minute: number } {
  return dateInAppTz(new Date());
}

/**
 * Convert any Date to { hour, minute } in the application timezone.
 * Use this to determine the shift for a specific captured timestamp
 * (avoids drift when the caller captured `new Date()` earlier).
 */
export function dateInAppTz(d: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TZ,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(d);
  const rawHour = parts.find(p => p.type === 'hour')?.value || '0';
  // Intl may return "24" for midnight in some locales; normalize to 0
  const hour = parseInt(rawHour, 10) % 24;
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  return { hour, minute };
}
