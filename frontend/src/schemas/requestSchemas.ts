import { z } from 'zod';

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

// Schema cho đăng nhập
export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email là bắt buộc')
    .email('Email không hợp lệ'),
  password: z.string()
    .min(1, 'Mật khẩu là bắt buộc')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
});

// Schema cho quên mật khẩu
export const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'Email là bắt buộc')
    .email('Email không hợp lệ')
});

// Types
export type RepairRequestFormData = z.infer<typeof repairRequestSchema>;
export type GeneralRequestFormData = z.infer<typeof generalRequestSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
