// Shared field labels + value formatters for QuotationRevision snapshots and AuditLog diffs.
// User-facing labels are Vietnamese; anything not in FIELD_LABELS is treated as internal-only.

export const FIELD_LABELS: Record<string, string> = {
  maBaoGia: 'Mã báo giá',
  maYeuCauBaoGia: 'Mã yêu cầu báo giá',
  tenKhachHang: 'Khách hàng',
  maKhachHang: 'Mã khách hàng',
  tenNhanVien: 'Nhân viên phụ trách',
  tinhTrang: 'Trạng thái',
  giaBaoKhach: 'Giá báo khách',
  thoiGianGiaoHang: 'Thời gian giao hàng (ngày)',
  hieuLucBaoGia: 'Hiệu lực báo giá (ngày)',
  tiLeThuHoi: 'Tỉ lệ thu hồi (%)',
  sanPhamDauRa: 'Sản phẩm đầu ra',
  thanhPhamTonKho: 'Thành phẩm tồn kho',
  tongThanhPhamCanSxThem: 'Thành phẩm cần SX thêm',
  tongNguyenLieuCanSanXuat: 'Nguyên liệu cần SX',
  nguyenLieuTonKho: 'Nguyên liệu tồn kho',
  nguyenLieuCanNhapThem: 'Nguyên liệu cần nhập thêm',
  maDinhMuc: 'Mã định mức',
  tenDinhMuc: 'Tên định mức',
  ghiChu: 'Ghi chú',
  priceLocked: 'Trạng thái khóa giá',
  priceLockedAt: 'Thời điểm khóa giá',
  priceLockedByName: 'Người khóa giá',
  ngayBaoGia: 'Ngày báo giá',
  createdAt: 'Ngày tạo',
  updatedAt: 'Cập nhật lần cuối',
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bản nháp',
  DANG_CHO_PHAN_HOI: 'Đang chờ phản hồi',
  DANG_CHO_GUI_DON_HANG: 'Đang chờ gửi đơn hàng',
  DA_DAT_HANG: 'Đã đặt hàng',
  KHONG_DAT_HANG: 'Không đặt hàng',
  EXPIRED: 'Hết hiệu lực',
  REJECTED: 'Bị từ chối',
  CHO_XU_LY: 'Chờ xử lý',
  DANG_BAO_GIA: 'Đang báo giá',
  DA_BAO_GIA: 'Đã báo giá',
  HUY: 'Đã hủy',
};

export const PRICE_FIELDS = new Set([
  'giaBaoKhach', 'donGia', 'thanhTien', 'totalAmount',
  'tongNguyenLieuCanSanXuat', 'nguyenLieuTonKho', 'nguyenLieuCanNhapThem',
  'tongThanhPhamCanSxThem', 'thanhPhamTonKho',
]);

export const DATE_FIELDS = new Set([
  'ngayBaoGia', 'createdAt', 'updatedAt', 'priceLockedAt',
]);

export const formatNumber = (n: number): string =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(n);

export const formatDateTime = (s: string): string => {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

export const formatScalar = (key: string, value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';
  if (key === 'tinhTrang' && typeof value === 'string') return STATUS_LABELS[value] ?? value;
  if (DATE_FIELDS.has(key) && typeof value === 'string') return formatDateTime(value);
  if (PRICE_FIELDS.has(key) && typeof value === 'number') return formatNumber(value);
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
};
