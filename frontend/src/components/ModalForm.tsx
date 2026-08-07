import React from 'react';
import { X, Upload } from 'lucide-react';
import Modal from './Modal';

// ─── ModalForm ────────────────────────────────────────────────────────────────

interface ModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Icon nhỏ bên trái tiêu đề (optional) */
  titleIcon?: React.ReactNode;
  isLoading?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  children: React.ReactNode;
  /** Footer tùy chỉnh — nếu không truyền thì không render footer */
  footer?: React.ReactNode;
}

const maxWidthMap: Record<string, string> = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
};

export const ModalForm: React.FC<ModalFormProps> = ({
  isOpen,
  onClose,
  title,
  titleIcon,
  maxWidth = '3xl',
  children,
  footer,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} showBackdrop closeOnBackdrop={true}>
    {/* stopPropagation trực tiếp trên modal box — ngăn click bên trong bubble lên backdrop */}
    <div
      className={`
        bg-white rounded-xl shadow-2xl w-full ${maxWidthMap[maxWidth]}
        flex flex-col
        modal-viewport-h
      `}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header — trắng, border dưới */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          {titleIcon && <span className="text-gray-500">{titleIcon}</span>}
          {title}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body — scrollable */}
      <div className="overflow-y-auto flex-1 px-6 py-5">
        {children}
      </div>

      {/* Footer */}
      {footer !== undefined && (
        <div className="px-6 py-4 border-t border-gray-200 shrink-0 bg-gray-50 rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  </Modal>
);

// ─── Footer helpers ───────────────────────────────────────────────────────────

interface ModalFooterProps {
  onClose: () => void;
  onSubmit?: () => void;
  submitLabel?: string;
  isLoading?: boolean;
  submitDisabled?: boolean;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  onClose,
  onSubmit,
  submitLabel = 'Lưu',
  isLoading = false,
  submitDisabled = false,
}) => (
  <div className="flex justify-end gap-3">
    <button
      type="button"
      onClick={onClose}
      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
    >
      Hủy
    </button>
    {onSubmit && (
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitDisabled || isLoading}
        className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? 'Đang xử lý...' : submitLabel}
      </button>
    )}
  </div>
);

// ─── FormField ────────────────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({ label, required, error, hint, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
  </div>
);

// ─── Input class helpers ──────────────────────────────────────────────────────

const base = 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors';

export const inputCls    = (err?: boolean) => `${base} ${err ? 'border-red-400 bg-red-50' : 'border-gray-300'}`;
export const selectCls   = (err?: boolean) => `${base} bg-white ${err ? 'border-red-400 bg-red-50' : 'border-gray-300'}`;
export const textareaCls = (err?: boolean) => `${base} resize-none ${err ? 'border-red-400 bg-red-50' : 'border-gray-300'}`;
export const readonlyCls = `${base} border-gray-200 bg-gray-50 text-gray-500 cursor-default`;

// ─── FileDropZone ─────────────────────────────────────────────────────────────

interface FileDropZoneProps {
  id: string;
  accept?: string;
  multiple?: boolean;
  hint?: string;
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  id,
  accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png',
  multiple = true,
  hint = 'PDF, DOC, DOCX, JPG, PNG (Tối đa 100MB)',
  inputProps = {},
}) => (
  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
    <input type="file" id={id} accept={accept} multiple={multiple} className="hidden" {...inputProps} />
    <label htmlFor={id} className="cursor-pointer flex flex-col items-center gap-1">
      <Upload className="w-6 h-6 text-gray-400" />
      <p className="text-sm text-gray-600">Click để chọn file</p>
      <p className="text-xs text-gray-400">{hint}</p>
    </label>
  </div>
);
