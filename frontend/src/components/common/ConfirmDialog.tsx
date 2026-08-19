import React from 'react';
import ConfirmDeleteModal from './ConfirmDeleteModal';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
  children?: React.ReactNode;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  onClose,
  loading = false,
  children,
}) => {
  const handleClose = onCancel ?? onClose ?? (() => {});
  // If children provided, render them below message inside ConfirmDeleteModal via details hack:
  // Instead, render a custom wrapper that mimics ConfirmDeleteModal but injects children.
  if (children) {
    // Custom rendering to support children (e.g. textarea for reject reason)
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
        <div className="absolute inset-0 bg-black/50" onClick={loading ? undefined : handleClose} aria-hidden="true" />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
          <p className="text-sm text-gray-600 mb-3">{message}</p>
          <div className="mb-4">{children}</div>
          <div className="flex justify-end gap-3">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40" onClick={handleClose} disabled={loading}>Huy</button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60" onClick={onConfirm} disabled={loading}>Xac nhan</button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <ConfirmDeleteModal
      isOpen={isOpen}
      title={title}
      message={message}
      onConfirm={onConfirm}
      onClose={handleClose}
      loading={loading}
    />
  );
};

export default ConfirmDialog;
