import React, { useEffect } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  details?: string[];
  loading?: boolean;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  details,
  loading = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirm-delete-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={loading ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Close button */}
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 disabled:opacity-40"
          onClick={onClose}
          disabled={loading}
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Icon + title */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2
              id="confirm-delete-title"
              className="text-lg font-semibold text-gray-900"
            >
              {title}
            </h2>
          </div>

          {/* Message */}
          <p className="text-sm text-gray-600 mb-4">{message}</p>

          {/* Cascade impact list */}
          {details && details.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
              <p className="text-xs font-medium text-red-700 mb-2">
                Các dữ liệu liên quan cũng sẽ bị xóa:
              </p>
              <ul className="space-y-1">
                {details.map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-red-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-2">
            <button
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40"
              onClick={onClose}
              disabled={loading}
            >
              Huỷ
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Xoá
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
