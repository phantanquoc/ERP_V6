import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import acceptanceHandoverService, { AcceptanceHandover } from '../services/acceptanceHandoverService';

interface AcceptanceHandoverViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  acceptanceHandoverId: string | null;
  notificationMessage?: string;
}

const AcceptanceHandoverViewModal = ({ isOpen, onClose, acceptanceHandoverId, notificationMessage }: AcceptanceHandoverViewModalProps) => {
  const [data, setData] = useState<AcceptanceHandover | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && (acceptanceHandoverId || notificationMessage)) {
      loadData();
    } else {
      setData(null);
      setError('');
    }
  }, [isOpen, acceptanceHandoverId, notificationMessage]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      if (acceptanceHandoverId) {
        const response = await acceptanceHandoverService.getAcceptanceHandoverById(acceptanceHandoverId);
        setData(response.data || response);
      } else if (notificationMessage) {
        // Fallback: parse mã nghiệm thu từ message (e.g. "NT-001")
        const match = notificationMessage.match(/NT-\d+/);
        if (match) {
          const maNghiemThu = match[0];
          const response = await acceptanceHandoverService.getAllAcceptanceHandovers(1, 1, maNghiemThu);
          const list = response.data || [];
          if (list.length > 0) {
            setData(list[0]);
          } else {
            setError('Không tìm thấy nghiệm thu bàn giao');
          }
        } else {
          setError('Không tìm thấy mã nghiệm thu trong thông báo');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải thông tin nghiệm thu bàn giao');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Chi tiết nghiệm thu bàn giao</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
          )}

          {data && !loading && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã nghiệm thu</label>
                  <p className="text-gray-900 font-semibold">{data.maNghiemThu}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày nghiệm thu</label>
                  <p className="text-gray-900">{new Date(data.ngayNghiemThu).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã yêu cầu sửa chữa</label>
                  <p className="text-gray-900">{data.maYeuCauSuaChua}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên hệ thống/thiết bị</label>
                  <p className="text-gray-900">{data.tenHeThongThietBi}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tình trạng trước sửa chữa</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{data.tinhTrangTruocSuaChua}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tình trạng sau sửa chữa</label>
                <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{data.tinhTrangSauSuaChua}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người bàn giao</label>
                  <p className="text-gray-900">{data.nguoiBanGiao}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người nhận</label>
                  <p className="text-gray-900">{data.nguoiNhan}</p>
                </div>
              </div>

              {data.fileDinhKem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File đính kèm</label>
                  <a
                    href={`http://localhost:5000${data.fileDinhKem}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Xem file đính kèm
                  </a>
                </div>
              )}

              {data.ghiChu && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{data.ghiChu}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default AcceptanceHandoverViewModal;

