import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Modal from '../Modal';
import FileUpload from '../FileUpload';
import type { PurchaseRequest } from '../../types/purchaseRequest';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  purchaseRequest: PurchaseRequest | null;
  onSubmit: (id: string, file: File | null, clearExisting: boolean) => Promise<void>;
}

export default function PurchaseRequestAttachmentModal({ isOpen, onClose, purchaseRequest: pr, onSubmit }: Props) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedFile(null);
    setClearExisting(false);
    setApiError(null);
  }, [isOpen, pr]);

  if (!isOpen || !pr) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !clearExisting) {
      setApiError('Vui lòng chọn file mới hoặc xóa file hiện tại.');
      return;
    }
    setApiError(null);
    setLoading(true);
    try {
      await onSubmit(pr.id, selectedFile, clearExisting);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (err as { message?: string })?.message ?? 'Lỗi hệ thống, vui lòng thử lại';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  const existingName = !selectedFile && !clearExisting ? (pr.fileKemTheo ?? '') : '';
  const existingUrl = existingName;

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop ariaLabel="Cập nhật tệp đính kèm">
      <div className="bg-white rounded-lg shadow-sm w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()} role="document">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Cập nhật tệp đính kèm</h2>
            <p className="text-sm text-gray-500 mt-0.5">{pr.maYeuCau} · {pr.trangThai}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {apiError && <div className="p-3 bg-red-50 border border-red-300 rounded-md text-sm text-red-700">{apiError}</div>}

          <p className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded px-3 py-2">
            Phiếu đã hoàn thành — chỉ được cập nhật tệp hóa đơn/chứng từ. Các thông tin khác đã khóa.
          </p>

          <FileUpload
            label="Tệp hóa đơn / chứng từ"
            files={selectedFile ? [selectedFile] : []}
            onChange={(files) => setSelectedFile(files[0] ?? null)}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            existingFileName={existingName || undefined}
            existingFileUrl={existingUrl || undefined}
            onRemoveExisting={() => { setClearExisting(true); }}
          />
          {clearExisting && !selectedFile && (
            <p className="text-xs text-amber-600">Sẽ xóa file hiện tại khi lưu. Chọn file mới để thay thế.</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Đang lưu...' : 'Lưu tệp'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
