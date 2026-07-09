import { z } from 'zod';

// ==================== AUTH SCHEMAS ====================
export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email là bắt buộc')
    .email('Email không hợp lệ'),
  password: z.string()
    .min(1, 'Mật khẩu là bắt buộc')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

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

export const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'Email là bắt buộc')
    .email('Email không hợp lệ'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token là bắt buộc'),
  password: z.string()
    .min(1, 'Mật khẩu là bắt buộc')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

// ==================== CUSTOMER SCHEMAS ====================
// Helper: accept string, null, or undefined
const optionalString = z.string().optional().nullable();
const optionalNumber = z.union([z.number(), z.string()]).optional().nullable();

export const createCustomerSchema = z.object({
  tenCongTy: z.string().min(1, 'Tên công ty là bắt buộc'),
  nguoiLienHe: z.string().min(1, 'Người liên hệ là bắt buộc'),
  loaiKhachHang: z.string().min(1, 'Loại khách hàng là bắt buộc'),
  quocGia: optionalString,
  thanhPho: optionalString,
  tinhThanh: optionalString,
  quanHuyen: optionalString,
  maSoThue: optionalString,
  email: z.string().email('Email không hợp lệ').optional().nullable().or(z.literal('')),
  soDienThoai: optionalString,
  diaChi: optionalString,
  website: optionalString,
  maKhachHang: optionalString,
  trangThai: optionalString,
  ngayHopTac: optionalString,
  doanhThuNam: optionalNumber,
  soLuongDonHang: optionalNumber,
  sanPhamChinh: optionalString,
  ghiChu: optionalString,
}).refine(
  (data) => data.quocGia || data.tinhThanh,
  { message: 'Phải có Quốc gia (khách quốc tế) hoặc Tỉnh/Thành (khách nội địa)', path: ['quocGia'] }
);

export const updateCustomerSchema = z.object({
  tenCongTy: z.string().min(1, 'Tên công ty là bắt buộc').optional(),
  nguoiLienHe: optionalString,
  loaiKhachHang: optionalString,
  quocGia: optionalString,
  thanhPho: optionalString,
  tinhThanh: optionalString,
  quanHuyen: optionalString,
  maSoThue: optionalString,
  email: z.string().email('Email không hợp lệ').optional().nullable().or(z.literal('')),
  soDienThoai: optionalString,
  diaChi: optionalString,
  website: optionalString,
  trangThai: optionalString,
  ngayHopTac: optionalString,
  doanhThuNam: optionalNumber,
  soLuongDonHang: optionalNumber,
  sanPhamChinh: optionalString,
  ghiChu: optionalString,
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
  hinhThucVanChuyen: z.string().optional(),
  hinhThucThanhToan: z.string().optional(),
  quocGia: z.string().optional(),
  cangDen: z.string().optional(),
  ghiChu: z.string().optional(),
});

export const updateQuotationRequestSchema = z.object({
  customerId: z.string().optional(),
  trangThai: z.string().optional(),
  hinhThucVanChuyen: z.string().optional(),
  hinhThucThanhToan: z.string().optional(),
  quocGia: z.string().optional(),
  cangDen: z.string().optional(),
  ghiChu: z.string().optional(),
  items: z.array(quotationRequestItemSchema).optional(),
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
  ghiChu: z.string().optional(),
  nguoiThucHien: z.string().optional(),
  materialEvaluationId: z.string().optional(),
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
  ghiChu: z.string().optional(),
  nguoiThucHien: z.string().optional(),
});

// ==================== TYPE EXPORTS ====================
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type CreateQuotationRequestInput = z.infer<typeof createQuotationRequestSchema>;
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;
export type CreateSystemOperationInput = z.infer<typeof createSystemOperationSchema>;

// ==================== EMPLOYEE EVALUATION SCHEMAS ====================

export const updateEvaluationCommentSchema = z.object({
  role: z.enum(['employee', 'sup1', 'sup2']),
  comment: z.string().max(4000, 'Nhận xét không được quá 4000 ký tự'),
});

export const toggleNotApplicableSchema = z.object({
  notApplicable: z.boolean(),
});

export const submitAppealSchema = z.object({
  appealComment: z.string()
    .min(1, 'Nội dung khiếu nại là bắt buộc')
    .max(4000, 'Nội dung khiếu nại không được quá 4000 ký tự'),
});

export const replyAppealSchema = z.object({
  appealResponse: z.string()
    .min(1, 'Nội dung phản hồi là bắt buộc')
    .max(4000, 'Nội dung phản hồi không được quá 4000 ký tự'),
});

export const createGoalSchema = z.object({
  title: z.string().min(1, 'Tiêu đề mục tiêu là bắt buộc').max(500),
  description: z.string().max(2000).optional(),
  targetPeriod: z.string().min(1, 'Kỳ mục tiêu là bắt buộc').max(20),
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional().nullable(),
  targetPeriod: z.string().min(1).max(20).optional(),
});

export const createIdpItemSchema = z.object({
  skill: z.string().min(1, 'Kỹ năng là bắt buộc').max(500),
  action: z.string().min(1, 'Hành động là bắt buộc').max(2000),
  deadline: z.string().min(1, 'Deadline là bắt buộc'),
});

export const updateIdpItemSchema = z.object({
  skill: z.string().min(1).max(500).optional(),
  action: z.string().min(1).max(2000).optional(),
  deadline: z.string().optional(),
});

export const invitePeersSchema = z.object({
  inviteeUserIds: z.array(z.string().min(1)).min(2, 'Cần ít nhất 2 người').max(3, 'Tối đa 3 người'),
});

export const submitPeerFeedbackSchema = z.object({
  strength: z.string().min(1, 'Điểm mạnh là bắt buộc').max(2000),
  weakness: z.string().min(1, 'Điểm yếu là bắt buộc').max(2000),
  suggestion: z.string().max(2000).optional(),
});

export type UpdateEvaluationCommentInput = z.infer<typeof updateEvaluationCommentSchema>;
export type ToggleNotApplicableInput = z.infer<typeof toggleNotApplicableSchema>;
export type SubmitAppealInput = z.infer<typeof submitAppealSchema>;
export type ReplyAppealInput = z.infer<typeof replyAppealSchema>;
export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type CreateIdpItemInput = z.infer<typeof createIdpItemSchema>;
export type UpdateIdpItemInput = z.infer<typeof updateIdpItemSchema>;
export type InvitePeersInput = z.infer<typeof invitePeersSchema>;
export type SubmitPeerFeedbackInput = z.infer<typeof submitPeerFeedbackSchema>;

