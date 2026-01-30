import { z } from 'zod';

// ==================== AUTH SCHEMAS ====================
// Schema cho đăng nhập
export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email là bắt buộc')
    .email('Email không hợp lệ'),
  password: z.string()
    .min(1, 'Mật khẩu là bắt buộc')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
});

// Schema cho đăng ký
export const registerSchema = z.object({
  email: z.string()
    .min(1, 'Email là bắt buộc')
    .email('Email không hợp lệ'),
  password: z.string()
    .min(1, 'Mật khẩu là bắt buộc')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  firstName: z.string().min(1, 'Họ là bắt buộc'),
  lastName: z.string().min(1, 'Tên là bắt buộc'),
});

// Schema cho quên mật khẩu
export const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'Email là bắt buộc')
    .email('Email không hợp lệ')
});

// Schema cho đặt lại mật khẩu
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token là bắt buộc'),
  password: z.string()
    .min(1, 'Mật khẩu là bắt buộc')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

// ==================== CUSTOMER SCHEMAS ====================
export const createCustomerSchema = z.object({
  tenCongTy: z.string().min(1, 'Tên công ty là bắt buộc'),
  nguoiLienHe: z.string().min(1, 'Người liên hệ là bắt buộc'),
  loaiKhachHang: z.string().min(1, 'Loại khách hàng là bắt buộc'),
  quocGia: z.string().optional(),
  tinhThanh: z.string().optional(),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  soDienThoai: z.string().optional(),
  diaChi: z.string().optional(),
  maKhachHang: z.string().optional(),
  ngayHopTac: z.string().optional(),
  ghiChu: z.string().optional(),
}).refine(
  (data) => data.quocGia || data.tinhThanh,
  { message: 'Phải có Quốc gia (khách quốc tế) hoặc Tỉnh/Thành (khách nội địa)', path: ['quocGia'] }
);

export const updateCustomerSchema = z.object({
  tenCongTy: z.string().min(1, 'Tên công ty là bắt buộc').optional(),
  nguoiLienHe: z.string().optional(),
  loaiKhachHang: z.string().optional(),
  quocGia: z.string().optional(),
  tinhThanh: z.string().optional(),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  soDienThoai: z.string().optional(),
  diaChi: z.string().optional(),
  ngayHopTac: z.string().optional(),
  ghiChu: z.string().optional(),
});

// ==================== QUOTATION REQUEST SCHEMAS ====================
export const quotationRequestItemSchema = z.object({
  productId: z.string().min(1, 'Sản phẩm là bắt buộc'),
  soLuong: z.number().min(0, 'Số lượng phải >= 0'),
  donViTinh: z.string().min(1, 'Đơn vị tính là bắt buộc'),
  yeuCauSanPham: z.string().optional(),
  quyDongGoi: z.string().optional(),
  giaDoiThuBan: z.number().optional(),
  giaBanGanNhat: z.number().optional(),
});

export const createQuotationRequestSchema = z.object({
  customerId: z.string().min(1, 'Khách hàng là bắt buộc'),
  employeeId: z.string().min(1, 'Nhân viên là bắt buộc'),
  items: z.array(quotationRequestItemSchema).min(1, 'Phải có ít nhất 1 sản phẩm'),
  maYeuCauBaoGia: z.string().optional(),
  ghiChu: z.string().optional(),
});

export const updateQuotationRequestSchema = z.object({
  trangThai: z.string().optional(),
  ghiChu: z.string().optional(),
});

// ==================== QUOTATION SCHEMAS ====================
export const createQuotationSchema = z.object({
  quotationRequestId: z.string().min(1, 'Yêu cầu báo giá là bắt buộc'),
  materialStandardId: z.string().optional(),
  tiLeThuHoi: z.number().optional(),
  sanPhamDauRa: z.string().optional(),
  thanhPhamTonKho: z.number().optional(),
  tongThanhPhamCanSxThem: z.number().optional(),
  tongNguyenLieuCanSanXuat: z.number().optional(),
  nguyenLieuTonKho: z.number().optional(),
  nguyenLieuCanNhapThem: z.number().optional(),
  tinhTrang: z.string().optional(),
  ghiChu: z.string().optional(),
  items: z.array(z.object({
    tenThanhPham: z.string(),
    tiLe: z.number(),
    khoiLuongTuongUng: z.number().optional(),
  })).optional(),
});

export const updateQuotationSchema = z.object({
  giaBaoKhach: z.number().min(0, 'Giá báo khách phải >= 0').optional(),
  thoiGianGiaoHang: z.number().min(0, 'Thời gian giao hàng phải >= 0').optional(),
  hieuLucBaoGia: z.number().min(0, 'Hiệu lực báo giá phải >= 0').optional(),
  tinhTrang: z.string().optional(),
  ghiChu: z.string().optional(),
});

// ==================== SYSTEM OPERATION SCHEMAS ====================
export const createSystemOperationSchema = z.object({
  maChien: z.string().min(1, 'Mã chiên là bắt buộc'),
  thoiGianChien: z.string().min(1, 'Thời gian chiên là bắt buộc'),
  tenMay: z.string().optional(),
  machineId: z.string().optional(),
});

export const createBulkSystemOperationSchema = z.object({
  maChien: z.string().min(1, 'Mã chiên là bắt buộc'),
  thoiGianChien: z.string().min(1, 'Thời gian chiên là bắt buộc'),
});

export const updateSystemOperationSchema = z.object({
  khoiLuongDauVao: z.number().min(0).optional(),
  giaiDoan1ThoiGian: z.number().min(0).optional(),
  giaiDoan1NhietDo: z.number().optional(),
  giaiDoan1ApSuat: z.number().optional(),
  giaiDoan2ThoiGian: z.number().min(0).optional(),
  giaiDoan2NhietDo: z.number().optional(),
  giaiDoan2ApSuat: z.number().optional(),
  giaiDoan3ThoiGian: z.number().min(0).optional(),
  giaiDoan3NhietDo: z.number().optional(),
  giaiDoan3ApSuat: z.number().optional(),
  giaiDoan4ThoiGian: z.number().min(0).optional(),
  giaiDoan4NhietDo: z.number().optional(),
  giaiDoan4ApSuat: z.number().optional(),
  tongThoiGianSay: z.number().min(0).optional(),
  trangThai: z.string().optional(),
  ghiChu: z.string().optional(),
  nguoiThucHien: z.string().optional(),
});

// ==================== REQUEST SCHEMAS ====================
// Schema cho yêu cầu sửa chữa
export const repairRequestSchema = z.object({
  employeeName: z.string().min(1, 'Tên nhân viên là bắt buộc'),
  systemName: z.string().min(1, 'Tên hệ thống/thiết bị là bắt buộc'),
  usageArea: z.string().min(1, 'Khu vực sử dụng là bắt buộc'),
  errorContent: z.string().min(10, 'Nội dung lỗi phải có ít nhất 10 ký tự'),
  errorType: z.enum(['loi_moi', 'loi_lap_lai', 'loi_he_thong', 'loi_phan_cung', 'loi_phan_mem'], {
    errorMap: () => ({ message: 'Vui lòng chọn loại lỗi' })
  }),
  priority: z.enum(['cao', 'trung_binh', 'thap', 'khan_cap'], {
    errorMap: () => ({ message: 'Vui lòng chọn mức độ ưu tiên' })
  }),
  notes: z.string().optional(),
  files: z.any().optional()
});

// Schema cho các yêu cầu khác
export const generalRequestSchema = z.object({
  title: z.string().min(1, 'Tiêu đề là bắt buộc').max(200, 'Tiêu đề không được quá 200 ký tự'),
  description: z.string().min(10, 'Mô tả phải có ít nhất 10 ký tự').max(1000, 'Mô tả không được quá 1000 ký tự'),
  priority: z.enum(['low', 'medium', 'high'], {
    errorMap: () => ({ message: 'Vui lòng chọn mức độ ưu tiên' })
  }),
  department: z.string().min(1, 'Phòng ban là bắt buộc'),
  attachments: z.any().optional()
});

// ==================== TYPE EXPORTS ====================
// Auth types
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Customer types
export type CreateCustomerFormData = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerFormData = z.infer<typeof updateCustomerSchema>;

// Quotation Request types
export type QuotationRequestItemFormData = z.infer<typeof quotationRequestItemSchema>;
export type CreateQuotationRequestFormData = z.infer<typeof createQuotationRequestSchema>;
export type UpdateQuotationRequestFormData = z.infer<typeof updateQuotationRequestSchema>;

// Quotation types
export type CreateQuotationFormData = z.infer<typeof createQuotationSchema>;
export type UpdateQuotationFormData = z.infer<typeof updateQuotationSchema>;

// System Operation types
export type CreateSystemOperationFormData = z.infer<typeof createSystemOperationSchema>;
export type CreateBulkSystemOperationFormData = z.infer<typeof createBulkSystemOperationSchema>;
export type UpdateSystemOperationFormData = z.infer<typeof updateSystemOperationSchema>;

// Request types
export type RepairRequestFormData = z.infer<typeof repairRequestSchema>;
export type GeneralRequestFormData = z.infer<typeof generalRequestSchema>;
