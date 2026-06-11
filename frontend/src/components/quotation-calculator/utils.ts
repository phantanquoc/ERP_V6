// ─── Number formatting helpers ───────────────────────────────────────────────

/**
 * Formats a number (or numeric string) with Vietnamese thousand-dot separators.
 * Returns '' for empty / undefined / NaN values.
 */
export const formatNumberWithDots = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null || value === '') return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return num.toLocaleString('vi-VN', { maximumFractionDigits: 2 });
};

/**
 * Parses a Vietnamese-formatted number string (dots as thousand separators,
 * commas as decimal separator) into a JS number. Returns 0 on failure.
 */
export const parseNumberFromDots = (value: string): number => {
  if (!value || value === '') return 0;
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

/**
 * Strips invalid characters from a raw numeric input string.
 * Allows digits, dots, and commas only.
 */
export const handleNumericInput = (value: string): string => {
  return value.replace(/[^0-9.,]/g, '');
};
