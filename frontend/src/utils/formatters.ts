/**
 * Vietnamese locale formatters for consistent date, number, and currency display.
 */

/**
 * Format a date to DD/MM/YYYY (Vietnamese locale).
 * Returns "—" for null/undefined.
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Format a datetime to DD/MM/YYYY HH:mm (Vietnamese locale).
 * Returns "—" for null/undefined.
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '—';
  return new Date(date).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format a number with Vietnamese thousands separator (1.234.567).
 * Returns "—" for null/undefined.
 */
export const formatNumber = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('vi-VN');
};

/**
 * Format a number as Vietnamese VND currency (1.234.567 ₫).
 * Returns "—" for null/undefined.
 */
export const formatCurrency = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
};

/**
 * Format a time string "HH:mm" for display.
 * Returns "—" for null/undefined.
 */
export const formatTime = (time: string | null | undefined): string => {
  if (!time) return '—';
  return time;
};

/**
 * Format work hours as X.Xh.
 * Returns "—" for null/undefined.
 */
export const formatWorkHours = (hours: number | null | undefined): string => {
  if (hours === null || hours === undefined) return '—';
  return `${hours.toFixed(1)}h`;
};
