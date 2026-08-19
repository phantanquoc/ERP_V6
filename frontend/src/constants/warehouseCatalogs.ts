export const TINH_TRANG_OPTIONS = [
  { value: 'Bình thường', label: 'Bình thường' },
  { value: 'Hỏng', label: 'Hỏng' },
  { value: 'Ẩm mốc', label: 'Ẩm mốc' },
  { value: 'Quá hạn', label: 'Quá hạn' },
  { value: 'Đang kiểm tra', label: 'Đang kiểm tra' },
  { value: 'Tạm giữ', label: 'Tạm giữ' },
  { value: 'Khác', label: 'Khác' },
] as const;

export const LY_DO_XUAT_KHO_PRESETS = [
  'Xuất cho sản xuất',
  'Xuất bán',
  'Xuất hủy',
  'Xuất điều chuyển',
  'Kiểm kê điều chỉnh',
  'Xuất mẫu',
] as const;

export const MUC_DICH_PRESETS = [
  'Nhập từ thu mua',
  'Nhập thành phẩm',
  'Nhập điều chuyển',
  'Nhập trả lại',
] as const;

export const COMPANY_HEADER = {
  name: 'CÔNG TY TNHH THỰC PHẨM QUỐC TẾ AN BÌNH',
  address: 'Số 58, đường 3, thôn 4, Đức Hạnh, Đức Linh, Bình Thuận, Việt Nam',
  phone: '0941 508 468',
  email: 'sales@anbinhfoods.com',
  website: 'anbinhfoods.com.vn',
} as const;

export const BM_CODES = {
  receipt: 'BM01-QT03',
  issue: 'BM03-QT03',
  version: 'Lần 02 Ngày 17/05/2026',
  kienNote: '1 kiện nguyên liệu 32 bao (1 bao 25kg) / 1 kiện thành phẩm 36 thùng',
} as const;
