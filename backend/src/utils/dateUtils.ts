import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { env } from '@config/env';

/**
 * Returns a UTC Date representing midnight (00:00:00.000) of today in APP_TIMEZONE.
 * Use this for Prisma gte/lt queries that need to target "today" in the app timezone.
 *
 * Example: if APP_TIMEZONE=Asia/Ho_Chi_Minh and UTC time is 2024-01-15T17:00:00Z
 * (which is 2024-01-16T00:00:00+07:00), this returns 2024-01-16T17:00:00Z
 * (midnight of Jan 16 in UTC+7, expressed as UTC).
 */
export function getTodayInAppTz(): Date {
  const tz = env.APP_TIMEZONE;
  const nowUtc = new Date();
  // Convert current UTC time to the app timezone to get the local date
  const nowInTz = toZonedTime(nowUtc, tz);
  // Build a "midnight" date in the app timezone
  const midnightInTz = new Date(
    nowInTz.getFullYear(),
    nowInTz.getMonth(),
    nowInTz.getDate(),
    0, 0, 0, 0
  );
  // Convert that midnight back to UTC so Prisma can use it in queries
  return fromZonedTime(midnightInTz, tz);
}

/**
 * Returns the current hour and minute in APP_TIMEZONE.
 * Use this instead of new Date().getHours() / getMinutes() for shift/late detection.
 */
export function nowInAppTz(): { hour: number; minute: number } {
  const tz = env.APP_TIMEZONE;
  const nowInTz = toZonedTime(new Date(), tz);
  return {
    hour: nowInTz.getHours(),
    minute: nowInTz.getMinutes(),
  };
}
