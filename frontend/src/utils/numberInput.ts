/**
 * Utility để xử lý leading zeros trong number inputs.
 *
 * Vấn đề: Khi dùng type="number" với controlled value = 0,
 * user gõ thêm số → nối thành "0012000" thay vì "12000".
 *
 * Giải pháp: Parse value thành number rồi trả về, loại bỏ leading zeros.
 */

// ==================== PRODUCTION ENTRY LIMITS ====================
// Bảng ngưỡng min/max cho thông số nhập liệu sản xuất.
// ⚠️ PHẢI sửa cùng lúc với backend/src/schemas/index.ts (PRODUCTION_LIMITS)
export const PRODUCTION_LIMITS = {
  nhietDoNuocTruocNgam: { min: 0, max: 200, integer: false },
  nhietDoNuocSauVot: { min: 0, max: 200, integer: false },
  giaiDoan1NhietDo: { min: 0, max: 400, integer: false },
  giaiDoan2NhietDo: { min: 0, max: 400, integer: false },
  giaiDoan3NhietDo: { min: 0, max: 400, integer: false },
  giaiDoan4NhietDo: { min: 0, max: 400, integer: false },
  brixNuocNgam: { min: 0, max: 100, integer: false },
  giaiDoan1ApSuat: { min: 0, max: 20, integer: false },
  giaiDoan2ApSuat: { min: 0, max: 20, integer: false },
  giaiDoan3ApSuat: { min: 0, max: 20, integer: false },
  giaiDoan4ApSuat: { min: 0, max: 20, integer: false },
  thoiGianNgam: { min: 0, max: 2880, integer: true },
  giaiDoan1ThoiGian: { min: 0, max: 2880, integer: true },
  giaiDoan2ThoiGian: { min: 0, max: 2880, integer: true },
  giaiDoan3ThoiGian: { min: 0, max: 2880, integer: true },
  giaiDoan4ThoiGian: { min: 0, max: 2880, integer: true },
  soLanNgam: { min: 0, max: 40, integer: true },
  khoiLuong: { min: 0, max: 200000, integer: false },
  khoiLuongDauVao: { min: 0, max: 200000, integer: false },
  tongThoiGianSay: { min: 0, max: 11520, integer: true },
  // Alias for finished product output cells
  sanLuong: { min: 0, max: 200000, integer: false },
} as const;

export type ProductionLimitKey = keyof typeof PRODUCTION_LIMITS;

export interface ParseNumberOptions {
  min?: number;
  max?: number;
  integer?: boolean;
}

/**
 * Parse giá trị input number, loại bỏ leading zeros.
 * Dùng cho onChange handler của input type="number".
 *
 * Supports optional clamping via `options`:
 * - min/max: clamp giá trị vào ngưỡng
 * - integer: Math.floor khi true
 * - Từ chối Infinity/NaN (trả về min hoặc 0)
 *
 * @param value - e.target.value từ input
 * @param allowDecimalOrOptions - boolean (legacy) or ParseNumberOptions
 * @returns number đã parse và clamp
 */
export const parseNumberInput = (
  value: string,
  allowDecimalOrOptions: boolean | ParseNumberOptions = true,
): number => {
  // Handle legacy boolean signature
  const options: ParseNumberOptions = typeof allowDecimalOrOptions === 'boolean'
    ? { integer: !allowDecimalOrOptions }
    : allowDecimalOrOptions;

  if (value === '' || value === '-') return options.min ?? 0;

  const parsed = options.integer ? parseInt(value, 10) : parseFloat(value);

  // Reject Infinity and NaN
  if (!isFinite(parsed) || isNaN(parsed)) return options.min ?? 0;

  // Floor for integer fields
  let result = options.integer ? Math.floor(parsed) : parsed;

  // Clamp
  if (options.min !== undefined && result < options.min) result = options.min;
  if (options.max !== undefined && result > options.max) result = options.max;

  return result;
};

/**
 * Parse giá trị input number, trả về string đã loại bỏ leading zeros.
 * Dùng cho trường hợp state lưu dạng string.
 *
 * @param value - e.target.value từ input
 * @returns string đã loại bỏ leading zeros
 *
 * @example
 * onChange={(e) => setFormData({ ...formData, tiLeThuHoi: parseNumberInputStr(e.target.value) })}
 */
export const parseNumberInputStr = (value: string): string => {
  if (value === '' || value === '-') return value;

  // Cho phép nhập "0." để user có thể gõ số thập phân
  if (value === '0.' || value === '-0.') return value;

  // Cho phép nhập phần thập phân đang gõ dở (VD: "1.0", "1.00")
  if (value.includes('.') && value.endsWith('0')) {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      // Giữ nguyên trailing zeros sau dấu chấm khi đang gõ
      return value.replace(/^0+(?=\d)/, '');
    }
  }

  const parsed = parseFloat(value);
  if (isNaN(parsed)) return '';

  // Nếu có phần thập phân đang gõ dở (kết thúc bằng "."), giữ nguyên
  if (value.endsWith('.')) {
    return parsed.toString() + '.';
  }

  return parsed.toString();
};

