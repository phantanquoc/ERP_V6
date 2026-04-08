import React, { useEffect, useState } from 'react';
import { X, ShoppingCart, Calendar, User, Package, FileText } from 'lucide-react';
import Modal from './Modal';
import purchaseRequestService, { PurchaseRequest } from '../services/purchaseRequestService';

interface PurchaseRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseRequestId: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING:  'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING:  'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const PRIORITY_LABEL: Record<string, string> = {
  LOW:    'Thấp',
  MEDIUM: 'Trung bình',
  HIGH:   'Cao',
  URGENT: 'Khẩn cấp',
};

const PRIORITY_COLOR: Record<string, string> = {
  LOW:    'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH:   'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const PurchaseRequestDetailModal: React.FC<PurchaseRequestDetailModalProps> = ({
  isOpen,
  onClose,
  purchaseRequestId,
}) => {
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !purchaseRequestId) return;
    setLoading(true);
    purchaseRequestService.getPurchaseRequestById(purchaseRequestId)
      .then((res: any) => setRequest(res?.data ?? res ?? null))
      .catch(() => setRequest(null))
      .finally(() => setLoading(false));
  }, [isOpen, purchaseRequestId]);

  const fmt = (date?: string) =>
    date ? new Date(date).toLocaleDateString('vi-VN') : '—';

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 rounded-t-2xl flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-lg font-bold text-white">
                {request ? `Yêu cầu ${request.maYeuCau}` : 'Yêu cầu mua hàng'}
              </h2>
              <p className="text-emerald-100 text-xs">Chi tiết yêu cầu mua hàng</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:text-emerald-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          )}

          {!loading && !request && (
            <p className="text-center text-gray-500 py-12">Không tìm thấy yêu cầu mua hàng</p>
          )}

          {!loading && request && (
            <div className="space-y-5">
              {/* Trạng thái & ưu tiên */}
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLOR[request.trangThai] ?? 'bg-gray-100 text-gray-700'}`}>
                  {STATUS_LABEL[request.trangThai] ?? request.trangThai}
                </span>
                {request.mucDoUuTien && (
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${PRIORITY_COLOR[request.mucDoUuTien] ?? 'bg-gray-100 text-gray-700'}`}>
                    Ưu tiên: {PRIORITY_LABEL[request.mucDoUuTien] ?? request.mucDoUuTien}
                  </span>
                )}
              </div>

              {/* Thông tin chính */}
              <div className="grid grid-cols-2 gap-4">
                <InfoRow icon={<User className="w-4 h-4 text-gray-400" />} label="Nhân viên" value={request.tenNhanVien} />
                <InfoRow icon={<User className="w-4 h-4 text-gray-400" />} label="Mã NV" value={request.maNhanVien} />
                <InfoRow icon={<Calendar className="w-4 h-4 text-gray-400" />} label="Ngày yêu cầu" value={fmt(request.createdAt)} />
                <InfoRow icon={<Package className="w-4 h-4 text-gray-400" />} label="Phân loại" value={request.phanLoai} />
              </div>

              {/* Hàng hóa */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">Thông tin hàng hóa</p>
                <p className="text-sm font-medium text-gray-800">{request.tenHangHoa}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Số lượng: <span className="font-medium">{request.soLuong} {request.donViTinh}</span>
                </p>
              </div>

              {/* Mục đích */}
              {request.mucDichYeuCau && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-blue-600 mb-1">Mục đích yêu cầu</p>
                  <p className="text-sm text-gray-700">{request.mucDichYeuCau}</p>
                </div>
              )}

              {/* Ghi chú */}
              {request.ghiChu && (
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                  <span className="font-medium text-gray-500">Ghi chú: </span>{request.ghiChu}
                </div>
              )}

              {/* File đính kèm */}
              {request.fileKemTheo && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <FileText className="w-4 h-4" />
                  <a href={request.fileKemTheo} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    Xem file đính kèm
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-2">
    <span className="mt-0.5">{icon}</span>
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  </div>
);

export default PurchaseRequestDetailModal;
