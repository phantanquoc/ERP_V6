/**
 * Utility để xử lý leading zeros trong number inputs.
 * 
 * Vấn đề: Khi dùng type="number" với controlled value = 0,
 * user gõ thêm số → nối thành "0012000" thay vì "12000".
 * 
 * Giải pháp: Parse value thành number rồi trả về, loại bỏ leading zeros.
 */

/**
 * Parse giá trị input number, loại bỏ leading zeros.
 * Dùng cho onChange handler của input type="number".
 * 
 * @param value - e.target.value từ input
 * @param allowDecimal - cho phép số thập phân (default: true)
 * @returns number đã parse, không có leading zeros
 * 
 * @example
 * // Trong onChange handler:
 * onChange={(e) => setFormData({ ...formData, soLuong: parseNumberInput(e.target.value) })}
 */
export const parseNumberInput = (value: string, allowDecimal: boolean = true): number => {
  if (value === '' || value === '-') return 0;
  
  // Giữ nguyên nếu đang nhập phần thập phân (VD: "1." hoặc "1.0")
  // Trường hợp này sẽ được xử lý bởi parseFloat
  const parsed = allowDecimal ? parseFloat(value) : parseInt(value, 10);
  
  return isNaN(parsed) ? 0 : parsed;
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

