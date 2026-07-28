/**
 * Derive the thoiGianChien naive datetime string from a production day and batch start time.
 *
 * Returns a timezone-free string in the shape "YYYY-MM-DDTHH:mm:00" which the backend
 * interprets via parseLocalDateTimeAsAppTz (Asia/Ho_Chi_Minh).
 *
 * IMPORTANT: This function does NOT construct a Date object for the target instant,
 * because doing so would introduce browser-timezone dependence. All date arithmetic
 * is done in UTC (zone-neutral) and the result is formatted by hand.
 */

/**
 * @param productionDay - The production day as "YYYY-MM-DD"
 * @param hour - The batch start hour (0-23)
 * @param minute - The batch start minute (0-59)
 * @param isNextCalendarDay - Whether the batch clock time falls on the next calendar day
 * @returns Naive local-time string "YYYY-MM-DDTHH:mm:00" (no timezone suffix)
 */
export function deriveThoiGianChien(
  productionDay: string,
  hour: number,
  minute: number,
  isNextCalendarDay: boolean,
): string {
  // Parse production day components
  const [y, m, d] = productionDay.split('-').map(Number);

  let targetYear = y;
  let targetMonth = m; // 1-based
  let targetDay = d;

  if (isNextCalendarDay) {
    // Advance one calendar day using UTC Date arithmetic (zone-free)
    // We use UTC methods exclusively so the browser timezone has zero effect.
    const utcDate = new Date(Date.UTC(y, m - 1, d));
    utcDate.setUTCDate(utcDate.getUTCDate() + 1);
    targetYear = utcDate.getUTCFullYear();
    targetMonth = utcDate.getUTCMonth() + 1;
    targetDay = utcDate.getUTCDate();
  }

  // Format as naive datetime string — no Date.toISOString, no timezone
  const datePart = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
  const timePart = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

  return `${datePart}T${timePart}`;
}
