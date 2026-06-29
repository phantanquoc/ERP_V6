import React from 'react';
import ConfirmDeleteModal from './ConfirmDeleteModal';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * A general-purpose confirmation dialog backed by ConfirmDeleteModal.
 * Exposes `onCancel` (mapped to `onClose`) to match the spec interface.
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  loading = false,
}) => (
  <ConfirmDeleteModal
    isOpen={isOpen}
    title={title}
    message={message}
    onConfirm={onConfirm}
    onClose={onCancel}
    loading={loading}
  />
);

export default ConfirmDialog;
