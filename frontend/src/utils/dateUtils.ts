/**
 * Timezone-aware date utilities cho attendance (và các module dùng APP_TZ).
 * Mirror với backend `backend/src/utils/dateUtils.ts` — mọi thay đổi phải giữ 2 bên đồng nhất.
 *
 * VITE_APP_TIMEZONE (build-time env) hoặc default `Asia/Ho_Chi_Minh`.
 * VN không có DST nên offset cố định +07:00.
 */

export const APP_TZ =
  (import.meta.env?.VITE_APP_TIMEZONE as string | undefined) || 'Asia/Ho_Chi_Minh';

/**
 * Offset của APP_TZ hiện tại so với UTC, format `+07:00` / `-05:30`.
 * Dùng để append vào ISO string trước khi gửi lên BE, tránh việc BE parse theo server TZ.
 */
export function appTzOffset(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TZ,
    timeZoneName: 'shortOffset',
  }).formatToParts(now);
  const tzName = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT+7';
  const match = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return '+07:00';
  const sign = match[1];
  const hours = match[2].padStart(2, '0');
  const minutes = (match[3] || '00').padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}

/**
 * Kết hợp `YYYY-MM-DD` + `HH:mm` thành ISO string có TZ suffix theo APP_TZ.
 * Kết quả: `"2026-07-02T08:00:00+07:00"` — BE parse thành đúng thời điểm bất kể server TZ.
 */
export function toAppTzIso(dateStr: string, timeStr: string): string {
  return `${dateStr}T${timeStr}:00${appTzOffset()}`;
}

/**
 * Trả về `"HH:mm"` của Date theo APP_TZ.
 * Dùng khi convert timestamp UTC từ BE sang input time field.
 */
export function formatTimeInAppTz(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = parts.find(p => p.type === 'hour')?.value || '00';
  const minute = parts.find(p => p.type === 'minute')?.value || '00';
  return `${hour === '24' ? '00' : hour}:${minute}`;
}

/**
 * Trả về `"YYYY-MM-DD"` của Date theo APP_TZ (dùng cho input date field & so sánh key).
 */
export function formatDateInAppTz(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value || '1970';
  const month = parts.find(p => p.type === 'month')?.value || '01';
  const day = parts.find(p => p.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

/**
 * Hôm nay theo APP_TZ dưới dạng `"YYYY-MM-DD"`.
 */
export function todayInAppTz(): string {
  return formatDateInAppTz(new Date());
}
