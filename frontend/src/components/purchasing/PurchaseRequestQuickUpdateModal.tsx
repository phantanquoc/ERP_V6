import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import Modal from '../Modal';
import FileUpload from '../FileUpload';
import { useWarehouses } from '../../hooks/useWarehouses';
import type { PurchaseRequest } from '../../types/purchaseRequest';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  purchaseRequest: PurchaseRequest | null;
  onSubmit: (id: string, data: { formData: Record<string, unknown>; file: File | null }) => Promise<void>;
}

function toDateInputValue(raw?: string | null): string {
  if (!raw) return '';
  try {
    const d = new Date(raw as string);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch { return ''; }
}

export default function PurchaseRequestQuickUpdateModal({ isOpen, onClose, purchaseRequest: pr, onSubmit }: Props) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const { data: warehousesData } = useWarehouses();
  const warehouses: Array<{ id: string; tenKho: string }> = useMemo(() => {
    const raw: any = warehousesData;
    if (Array.isArray(raw)) return raw;
    if (raw?.data && Array.isArray(raw.data)) return raw.data;
    return [];
  }, [warehousesData]);

  useEffect(() => {
    if (!isOpen || !pr) return;
    setFormData({
      ngayDuKienNhap: toDateInputValue(pr.ngayDuKienNhap ?? null),
      warehouseId: (pr as any).warehouseId ?? '',
      ghiChuVanChuyen: pr.ghiChuVanChuyen ?? '',
      ghiChuMuaHang: pr.ghiChuMuaHang ?? '',
      fileKemTheo: pr.fileKemTheo ?? '',
    });
    setSelectedFile(null);
    setApiError(null);
    setDateError(null);
  }, [isOpen, pr]);

  const locked = pr?.trangThai === 'Hoàn thành' || pr?.trangThai === 'Đã hủy';

  const validateNgayDuKienNhap = (dateStr: string): string | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Ngày không hợp lệ';
    // Must be >= ngayYeuCau when editing after approval
    if (pr?.ngayYeuCau) {
      const ref = new Date(pr.ngayYeuCau); ref.setHours(0, 0, 0, 0);
      const dDay = new Date(d); dDay.setHours(0, 0, 0, 0);
      if (dDay < ref) return 'Ngày dự kiến nhập phải từ ngày yêu cầu trở đi';
    }
    return null;
  };

  if (!isOpen || !pr) return null;

  if (locked) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop ariaLabel="Không thể cập nhật">
        <div className="bg-white rounded-lg shadow-sm w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()} role="document">
          <h2 className="text-lg font-bold text-gray-800">Không thể cập nhật</h2>
          <p className="text-sm text-gray-600 mt-2">
            Phiếu {pr.maYeuCau} đang ở trạng thái <span className="font-medium">{pr.trangThai}</span> nên không thể cập nhật thông tin đơn hàng.
          </p>
          <div className="flex justify-end mt-6">
            <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">Đóng</button>
          </div>
        </div>
      </Modal>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dErr = validateNgayDuKienNhap(String(formData.ngayDuKienNhap ?? ''));
    if (dErr) { setDateError(dErr); setApiError(dErr); return; }
    setApiError(null); setDateError(null);
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        ngayDuKienNhap: formData.ngayDuKienNhap || null,
        warehouseId: formData.warehouseId || null,
        ghiChuVanChuyen: formData.ghiChuVanChuyen || null,
        ghiChuMuaHang: formData.ghiChuMuaHang || null,
      };
      // If user removed existing file without picking new one, clear it
      if (!selectedFile && formData.fileKemTheo === '') {
        (payload as any).fileKemTheo = '';
      }
      await onSubmit(pr.id, { formData: payload, file: selectedFile });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (err as { message?: string })?.message ?? 'Lỗi hệ thống, vui lòng thử lại';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop ariaLabel="Cập nhật thông tin đơn hàng" className="p-0 sm:p-4">
      <div className="bg-white rounded-lg shadow-sm w-full max-w-2xl mx-2 sm:mx-4 max-h-[calc(100vh-1rem)] sm:max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()} role="document">
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex flex-col flex-1 min-h-0">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Cập nhật thông tin đơn hàng</h2>
              <p className="text-sm text-gray-500 mt-0.5">{pr.maYeuCau} · {pr.trangThai}</p>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-4">
            {apiError && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-md">
                <p className="text-sm text-red-700">{apiError}</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              Chỉ cập nhật thông tin đơn hàng (ngày về, kho, ghi chú vận chuyển, ghi chú thu mua, file). Không đổi báo giá hay trạng thái — dùng <span className="font-medium">Chỉnh sửa</span> cho việc đó.
            </div>

            <div className="border border-blue-100 rounded-lg p-4 bg-blue-50/40 space-y-3">
              <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Dự kiến hàng về</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày dự kiến hàng về</label>
                  <input
                    type="date"
                    value={formData.ngayDuKienNhap ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData((prev) => ({ ...prev, ngayDuKienNhap: v }));
                      setDateError(validateNgayDuKienNhap(v));
                    }}
                    onBlur={(e) => setDateError(validateNgayDuKienNhap(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${dateError ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-400'}`}
                  />
                  {dateError && <p className="text-xs text-red-600 mt-1">{dateError}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kho dự kiến nhập</label>
                  <select
                    value={formData.warehouseId ?? ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, warehouseId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  >
                    <option value="">-- Không chọn --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.tenKho}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú vận chuyển</label>
                <textarea
                  value={formData.ghiChuVanChuyen ?? ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, ghiChuVanChuyen: e.target.value }))}
                  rows={2}
                  placeholder="Thông tin vận chuyển, liên hệ, lưu ý giao nhận..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú thu mua</label>
              <textarea
                value={formData.ghiChuMuaHang ?? ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, ghiChuMuaHang: e.target.value }))}
                rows={3}
                placeholder="Ghi chú nội bộ của phòng thu mua..."
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <FileUpload
              label="File đính kèm"
              files={selectedFile ? [selectedFile] : []}
              onChange={(files) => setSelectedFile(files[0] || null)}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              existingFileName={!selectedFile && formData.fileKemTheo ? String(formData.fileKemTheo) : undefined}
              existingFileUrl={!selectedFile && formData.fileKemTheo ? String(formData.fileKemTheo) : undefined}
              onRemoveExisting={() => setFormData((prev) => ({ ...prev, fileKemTheo: '' }))}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 bg-white shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Đang lưu...' : 'Lưu cập nhật'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
