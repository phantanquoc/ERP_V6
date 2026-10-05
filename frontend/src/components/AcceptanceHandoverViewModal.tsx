import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import acceptanceHandoverService, { AcceptanceHandover } from '../services/acceptanceHandoverService';
import { getFileUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import repairRequestService from '../services/repairRequestService';
import inspectionRequestService from '../services/inspectionRequestService';
import Modal from './Modal';

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
  const [lyDo, setLyDo] = useState('');
  const [confirming, setConfirming] = useState(false);
  const qc = useQueryClient();
  const { user } = useAuth() as unknown as { user: { id?: string; _id?: string; role?: string } | null };
  const userId = String(user?.id ?? (user as unknown as { _id?: string })?._id ?? '');
  const isAdmin = String(user?.role ?? '').toUpperCase() === 'ADMIN';

  useEffect(() => {
    if (isOpen && (acceptanceHandoverId || notificationMessage)) {
      loadData();
    } else {
      setData(null);
      setError('');
      setLyDo('');
    }
  }, [isOpen, acceptanceHandoverId, notificationMessage]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      if (acceptanceHandoverId) {
        const response = await acceptanceHandoverService.getAcceptanceHandoverById(acceptanceHandoverId);
        setData(response.data || response as any);
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

  const canConfirm = data && (data as unknown as { ketQua?: string | null }).ketQua == null
    && ((data as unknown as { nguoiXacNhanId?: string | null }).nguoiXacNhanId == null
      || String((data as unknown as { nguoiXacNhanId?: string | null }).nguoiXacNhanId) === userId || isAdmin);

  const doConfirm = async (ketQua: 'DAT' | 'KHONG_DAT') => {
    if (!data) return;
    if (ketQua === 'KHONG_DAT' && !lyDo.trim()) { toast.error('Vui lòng nhập lý do không đạt'); return; }
    const d = data as unknown as { repairRequestId?: number | null; inspectionRequestId?: number | null };
    const isRepair = d.repairRequestId != null;
    const isInspection = d.inspectionRequestId != null;
    // derive ids: prefer explicit FK, fallback to parsing maYeuCau is not safe — try both endpoints if unknown
    setConfirming(true);
    try {
      if (isRepair) {
        await repairRequestService.confirmAcceptance(d.repairRequestId as number, { ketQua, lyDo: lyDo.trim() || undefined });
      } else if (isInspection) {
        await inspectionRequestService.confirmAcceptance(d.inspectionRequestId as number, { ketQua, lyDo: lyDo.trim() || undefined });
      } else {
        // Ambiguous — try repair then inspection by re-fetching parent id from server object
        // Last resort: reload and infer from maYeuCau prefix is unreliable, so error out
        throw new Error('Không xác định được phiếu gốc của nghiệm thu này');
      }
      toast.success(ketQua === 'DAT' ? 'Đã xác nhận ĐẠT' : 'Đã xác nhận KHÔNG ĐẠT');
      qc.invalidateQueries({ queryKey: ['acceptanceHandovers'] });
      qc.invalidateQueries({ queryKey: ['repairRequests'] });
      qc.invalidateQueries({ queryKey: ['inspectionRequests'] });
      qc.invalidateQueries({ queryKey: ['my-history'] });
      const fresh = await acceptanceHandoverService.getAcceptanceHandoverById(data.id);
      setData(fresh.data || fresh as unknown as AcceptanceHandover);
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Xác nhận thất bại');
    } finally { setConfirming(false); }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showBackdrop closeOnBackdrop={true}>
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full flex flex-col modal-viewport-h" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="border-b px-6 py-4 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-gray-800">Chi tiết nghiệm thu bàn giao</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
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
                    href={getFileUrl(data.fileDinhKem)}
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
              {canConfirm && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <p className="text-sm font-medium text-amber-800">Xác nhận nghiệm thu</p>
                  <textarea value={lyDo} onChange={e=>setLyDo(e.target.value)} rows={2} placeholder="Lý do (bắt buộc khi KHÔNG ĐẠT)" className="w-full rounded border border-amber-200 bg-white px-3 py-2 text-sm" />
                  <div className="flex gap-2 justify-end">
                    <button disabled={confirming} onClick={()=>doConfirm('KHONG_DAT')} className="rounded border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">KHÔNG ĐẠT</button>
                    <button disabled={confirming} onClick={()=>doConfirm('DAT')} className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">ĐẠT</button>
                  </div>
                </div>
              )}
              {(data as unknown as { ketQua?: string | null }).ketQua && (
                <div className="text-sm">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${(data as unknown as { ketQua?: string | null }).ketQua === 'DAT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {(data as unknown as { ketQua?: string | null }).ketQua === 'DAT' ? 'ĐẠT' : 'KHÔNG ĐẠT'}
                  </span>
                  {(data as unknown as { lyDoXacNhan?: string | null }).lyDoXacNhan && <span className="ml-2 text-gray-600">{(data as unknown as { lyDoXacNhan?: string | null }).lyDoXacNhan}</span>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AcceptanceHandoverViewModal;

