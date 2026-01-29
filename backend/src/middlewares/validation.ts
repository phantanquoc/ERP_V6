import { Request, Response, NextFunction } from 'express';

export interface ValidationRule {
  field: string;
  label?: string; // Tên hiển thị tiếng Việt
  required?: boolean;
  type?: 'string' | 'number' | 'email' | 'boolean' | 'array' | 'date';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMessage?: string; // Custom message cho pattern validation
  custom?: (value: unknown, body: Record<string, unknown>) => boolean | string;
  requiredIf?: (body: Record<string, unknown>) => boolean; // Conditional required
}

// Predefined validation rules for common fields
export const commonValidations = {
  email: (field: string = 'email', label: string = 'Email'): ValidationRule => ({
    field,
    label,
    type: 'email',
  }),
  phone: (field: string = 'phone', label: string = 'Số điện thoại'): ValidationRule => ({
    field,
    label,
    type: 'string',
    pattern: /^[0-9+\-\s()]{8,20}$/,
    patternMessage: `${label} không hợp lệ`,
  }),
  requiredString: (field: string, label: string): ValidationRule => ({
    field,
    label,
    required: true,
    type: 'string',
  }),
  optionalString: (field: string, label: string): ValidationRule => ({
    field,
    label,
    type: 'string',
  }),
  requiredNumber: (field: string, label: string, min?: number, max?: number): ValidationRule => ({
    field,
    label,
    required: true,
    type: 'number',
    min,
    max,
  }),
  optionalNumber: (field: string, label: string, min?: number, max?: number): ValidationRule => ({
    field,
    label,
    type: 'number',
    min,
    max,
  }),
};

export const validate = (rules: ValidationRule[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Record<string, string> = {};

    for (const rule of rules) {
      const value = req.body[rule.field];
      const displayName = rule.label || rule.field;

      // Check conditional required
      const isRequired = rule.required || (rule.requiredIf && rule.requiredIf(req.body));

      // Check required
      if (isRequired && (value === undefined || value === null || value === '')) {
        errors[rule.field] = `${displayName} là bắt buộc`;
        continue;
      }

      if (value === undefined || value === null || value === '') {
        continue;
      }

      // Check type
      if (rule.type) {
        if (rule.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(String(value))) {
            errors[rule.field] = `${displayName} không đúng định dạng email`;
          }
        } else if (rule.type === 'array') {
          if (!Array.isArray(value)) {
            errors[rule.field] = `${displayName} phải là một danh sách`;
          }
        } else if (rule.type === 'date') {
          const dateValue = new Date(value);
          if (isNaN(dateValue.getTime())) {
            errors[rule.field] = `${displayName} không đúng định dạng ngày`;
          }
        } else if (rule.type === 'number') {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            errors[rule.field] = `${displayName} phải là số`;
          }
        } else if (typeof value !== rule.type) {
          errors[rule.field] = `${displayName} phải là ${rule.type}`;
        }
      }

      // Check string length
      if ((rule.type === 'string' || typeof value === 'string') && !errors[rule.field]) {
        const strValue = String(value);
        if (rule.minLength && strValue.length < rule.minLength) {
          errors[rule.field] = `${displayName} phải có ít nhất ${rule.minLength} ký tự`;
        }
        if (rule.maxLength && strValue.length > rule.maxLength) {
          errors[rule.field] = `${displayName} không được vượt quá ${rule.maxLength} ký tự`;
        }
      }

      // Check number range
      if ((rule.type === 'number' || typeof value === 'number') && !errors[rule.field]) {
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          if (rule.min !== undefined && numValue < rule.min) {
            errors[rule.field] = `${displayName} phải lớn hơn hoặc bằng ${rule.min}`;
          }
          if (rule.max !== undefined && numValue > rule.max) {
            errors[rule.field] = `${displayName} không được vượt quá ${rule.max}`;
          }
        }
      }

      // Check pattern
      if (rule.pattern && !rule.pattern.test(String(value)) && !errors[rule.field]) {
        errors[rule.field] = rule.patternMessage || `${displayName} không đúng định dạng`;
      }

      // Custom validation
      if (rule.custom && !errors[rule.field]) {
        const result = rule.custom(value, req.body);
        if (result !== true) {
          errors[rule.field] = typeof result === 'string' ? result : `${displayName} không hợp lệ`;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors,
      });
      return;
    }

    next();
  };
};

// Validation rules for specific entities
export const customerValidationRules = {
  create: [
    { field: 'tenCongTy', label: 'Tên công ty', required: true, type: 'string' as const },
    { field: 'nguoiLienHe', label: 'Người liên hệ', required: true, type: 'string' as const },
    { field: 'loaiKhachHang', label: 'Loại khách hàng', required: true, type: 'string' as const },
    {
      field: 'quocGia',
      label: 'Quốc gia',
      requiredIf: (body: Record<string, unknown>) => !body.tinhThanh,
      custom: (value: unknown, body: Record<string, unknown>) => {
        if (!value && !body.tinhThanh) {
          return 'Phải có Quốc gia (khách quốc tế) hoặc Tỉnh/Thành (khách nội địa)';
        }
        return true;
      }
    },
    { field: 'email', label: 'Email', type: 'email' as const },
    { field: 'soDienThoai', label: 'Số điện thoại', type: 'string' as const },
  ],
  update: [
    { field: 'tenCongTy', label: 'Tên công ty', type: 'string' as const },
    { field: 'nguoiLienHe', label: 'Người liên hệ', type: 'string' as const },
    { field: 'loaiKhachHang', label: 'Loại khách hàng', type: 'string' as const },
    { field: 'email', label: 'Email', type: 'email' as const },
    { field: 'soDienThoai', label: 'Số điện thoại', type: 'string' as const },
  ],
};

export const quotationRequestValidationRules = {
  create: [
    { field: 'customerId', label: 'Khách hàng', required: true, type: 'string' as const },
    { field: 'employeeId', label: 'Nhân viên', required: true, type: 'string' as const },
    { field: 'items', label: 'Danh sách sản phẩm', required: true, type: 'array' as const },
  ],
  update: [
    { field: 'trangThai', label: 'Trạng thái', type: 'string' as const },
    { field: 'ghiChu', label: 'Ghi chú', type: 'string' as const },
  ],
};

export const quotationValidationRules = {
  create: [
    { field: 'quotationRequestId', label: 'Yêu cầu báo giá', required: true, type: 'string' as const },
  ],
  update: [
    { field: 'giaBaoKhach', label: 'Giá báo khách', type: 'number' as const, min: 0 },
    { field: 'thoiGianGiaoHang', label: 'Thời gian giao hàng', type: 'number' as const, min: 0 },
    { field: 'hieuLucBaoGia', label: 'Hiệu lực báo giá', type: 'number' as const, min: 0 },
    { field: 'tinhTrang', label: 'Tình trạng', type: 'string' as const },
    { field: 'ghiChu', label: 'Ghi chú', type: 'string' as const },
  ],
};

export const systemOperationValidationRules = {
  create: [
    { field: 'maChien', label: 'Mã chiên', required: true, type: 'string' as const },
    { field: 'thoiGianChien', label: 'Thời gian chiên', required: true, type: 'string' as const },
  ],
  createBulk: [
    { field: 'maChien', label: 'Mã chiên', required: true, type: 'string' as const },
    { field: 'thoiGianChien', label: 'Thời gian chiên', required: true, type: 'string' as const },
  ],
  update: [
    { field: 'giaiDoan1ThoiGian', label: 'Giai đoạn 1 - Thời gian', type: 'number' as const, min: 0 },
    { field: 'giaiDoan1NhietDo', label: 'Giai đoạn 1 - Nhiệt độ', type: 'number' as const },
    { field: 'giaiDoan1ApSuat', label: 'Giai đoạn 1 - Áp suất', type: 'number' as const },
    { field: 'trangThai', label: 'Trạng thái', type: 'string' as const },
  ],
};

