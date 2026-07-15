/**
 * Shift quick-time helpers dùng chung cho các form nhập liệu chiên.
 *
 * - `getQuickTimesForShift(ca)` trả danh sách giờ HH:mm gợi ý cho ca đó.
 * - `computeShiftDatetime(ca, time)` tính datetime-local (`YYYY-MM-DDTHH:mm`)
 *   đúng cho ca, xử lý ca 3 (đêm) có phần sau nửa đêm.
 */

/** Giờ gợi ý cho từng ca (định dạng "HH:mm"). */
export const getQuickTimesForShift = (ca: number): string[] => {
  switch (ca) {
    case 1: return ['06:30', '08:00', '09:30', '11:00', '12:30', '14:00'];
    case 2: return ['15:30', '17:00', '18:30', '20:00', '21:30'];
    case 3: return ['23:00', '00:30', '02:00', '03:30', '05:00'];
    default: return [];
  }
};

/**
 * Tính datetime-local (`YYYY-MM-DDTHH:mm`) cho ca + giờ đã cho.
 * Với ca 3, giờ trước 06:00 rơi vào ngày kế tiếp so với base date.
 */
export const computeShiftDatetime = (ca: number, time: string): string => {
  const [hourStr, minuteStr] = time.split(':');
  const hour = parseInt(hourStr);
  const minute = parseInt(minuteStr);
  const now = new Date();

  let baseDate: Date;
  if (ca === 3) {
    // Base date = yesterday if current hour is 0..5, else today
    const currentHour = now.getHours();
    if (currentHour >= 0 && currentHour <= 5) {
      baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    } else {
      baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
    // 23:00 -> base date; 00:30/02:00/03:30/05:00 -> base date + 1
    if (hour < 6) {
      // After midnight times use base + 1 day
      baseDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 1);
    }
  } else {
    // Ca 1, Ca 2 -> always today
    baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const y = baseDate.getFullYear();
  const m = String(baseDate.getMonth() + 1).padStart(2, '0');
  const d = String(baseDate.getDate()).padStart(2, '0');
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}`;
};
