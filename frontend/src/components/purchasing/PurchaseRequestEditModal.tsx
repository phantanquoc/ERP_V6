import { useEffect, useMemo, useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import FileUpload from '../FileUpload';
import SupplierCombobox from '../common/SupplierCombobox';
import Modal from '../Modal';
import type { PurchaseRequest } from '../../types/purchaseRequest';
import { ALLOWED_TRANSITIONS, ALL_TRANG_THAI } from '../../utils/purchaseRequestBadges';
import { useWarehouses } from '../../hooks/useWarehouses';

interface EditItem {
  id?: string;
  phanLoai: string;
  tenHangHoa: string;
  soLuong: number;
  donViTinh: string;
  nhaCungCapId: string | null;
  giaDuKien: number | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  purchaseRequest: PurchaseRequest | null;
  pricingSuppliers?: Array<{ id: string; tenNhaCungCap: string; maNhaCungCap?: string; loaiCungCap?: string }>;
  pricingSuppliersLoading?: boolean;
  pricingSuppliersError?: unknown;
  onRetryPricingSuppliers?: () => void;
  user?: { firstName?: string; lastName?: string } | null;
  onSubmit: (id: string, data: { items: EditItem[]; formData: Record<string, unknown>; file: File | null }) => Promise<void>;
  onSubmitForApproval: (id: string, data: { items: EditItem[]; formData: Record<string, unknown>; file: File | null }) => Promise<void>;
}

function toDateInputValue(raw?: string | null): string {
  if (!raw) return '';
  try {
    const d = new Date(raw as string);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch { return ''; }
}

export default function PurchaseRequestEditModal({
  isOpen, onClose, purchaseRequest: pr, pricingSuppliers, pricingSuppliersLoading, pricingSuppliersError, onRetryPricingSuppliers, user, onSubmit, onSubmitForApproval,
}: Props) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [items, setItems] = useState<EditItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [confirmNeeded, setConfirmNeeded] = useState<{ title: string; message: string } | null>(null);
  const { data: warehousesData } = useWarehouses();
  const warehouses: Array<{ id: string; tenKho: string }> = useMemo(() => {
    const raw: any = warehousesData;
    if (Array.isArray(raw)) return raw;
    if (raw?.data && Array.isArray(raw.data)) return raw.data;
    return [];
  }, [warehousesData]);

  // Sync from pr when opened
  useEffect(() => {
    if (!isOpen || !pr) return;
    const currentUserName = user ? `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim() : '';
    const today = new Date().toISOString();
    setFormData({
      trangThai: pr.trangThai ?? '',
      ghiChuMuaHang: pr.ghiChuMuaHang ?? '',
      fileKemTheo: pr.fileKemTheo ?? '',
      nguoiDuyet: pr.nguoiDuyet ?? currentUserName,
      ngayDuyet: pr.ngayDuyet ?? today,
      ngayDuKienNhap: toDateInputValue(pr.ngayDuKienNhap ?? null),
      warehouseId: pr.warehouseId ?? '',
      ghiChuVanChuyen: pr.ghiChuVanChuyen ?? '',
    });
    if (pr.items && pr.items.length > 0) {
      setItems(pr.items.map((it) => ({
        id: it.id, phanLoai: it.phanLoai, tenHangHoa: it.tenHangHoa, soLuong: it.soLuong, donViTinh: it.donViTinh,
        nhaCungCapId: it.nhaCungCapId ?? null, giaDuKien: it.giaDuKien ?? null,
      })));
    } else {
      setItems([{
        phanLoai: pr.phanLoai ?? '', tenHangHoa: pr.tenHangHoa ?? '', soLuong: pr.soLuong ?? 0, donViTinh: pr.donViTinh ?? '',
        nhaCungCapId: pr.nhaCungCapId ?? null, giaDuKien: pr.giaDuKien ?? null,
      }]);
    }
    setSelectedFile(null);
    setApiError(null);
    setDateError(null);
    setConfirmNeeded(null);
  }, [isOpen, pr, user]);

  const locked = pr?.trangThai === 'Hoàn thành' || pr?.trangThai === 'Đã hủy';
  const originalStatus = pr?.trangThai ?? '';
  const allowedNext = useMemo(() => ALLOWED_TRANSITIONS[originalStatus] ?? [], [originalStatus]);

  const tongTien = useMemo(() => items.reduce((s, it) => {
    const q = typeof it.soLuong === 'number' ? it.soLuong : parseFloat(String(it.soLuong)) || 0;
    const g = typeof it.giaDuKien === 'number' ? it.giaDuKien : parseFloat(String(it.giaDuKien ?? 0)) || 0;
    return s + q * g;
  }, 0), [items]);

  const updateItem = (idx: number, patch: Partial<EditItem>) => setItems((prev) => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));

  const validateNgayDuKienNhap = (dateStr: string): string | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Ngày không hợp lệ';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dDay = new Date(d); dDay.setHours(0, 0, 0, 0);
    // Khi tạo mới (Chờ báo giá / Chờ duyệt) hoặc khi có giá trị: phải >= today
    const isCreatingPhase = originalStatus === 'Chờ báo giá' || originalStatus === 'Chờ duyệt' || !pr?.ngayDuKienNhap;
    if (isCreatingPhase && dDay < today) return 'Ngày dự kiến nhập phải từ hôm nay trở đi';
    return null;
  };

  const isHoanThanhTransition = formData.trangThai === 'Hoàn thành' || (originalStatus === 'Đã duyệt' && formData.trangThai === 'Hoàn thành');

  if (!isOpen || !pr) return null;

  // Blocked states
  if (locked) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop ariaLabel="Không thể chỉnh sửa">
        <div className="bg-white rounded-lg shadow-sm w-full max-w-lg mx-4 p-6" onClick={(e) => e.stopPropagation()} role="document">
          <h2 className="text-lg font-bold text-gray-800">Không thể chỉnh sửa</h2>
          <p className="text-sm text-gray-600 mt-2">
            Phiếu {pr.maYeuCau} đang ở trạng thái <span className="font-medium">{pr.trangThai}</span> nên không thể chỉnh sửa.
            {pr.trangThai === 'Đã hủy' && pr.lyDoHuy ? ` Lý do hủy: ${pr.lyDoHuy}` : ''}
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
    // Validate Từ chối requires ghiChuMuaHang
    if (formData.trangThai === 'Từ chối' && !String(formData.ghiChuMuaHang ?? '').trim()) {
      setApiError('Vui lòng nhập ghi chú thu mua khi từ chối (lý do từ chối).');
      return;
    }
    // Validate ngayDuKienNhap bắt buộc khi Hoàn thành
    if ((formData.trangThai === 'Hoàn thành' || isHoanThanhTransition) && !String(formData.ngayDuKienNhap ?? '').trim()) {
      setDateError('Ngày dự kiến nhập là bắt buộc khi hoàn thành phiếu.');
      setApiError('Vui lòng nhập ngày dự kiến hàng về trước khi hoàn thành.');
      return;
    }
    // Validate ngayDuKienNhap >= today
    const dErr = validateNgayDuKienNhap(String(formData.ngayDuKienNhap ?? ''));
    if (dErr) {
      setDateError(dErr);
      setApiError(dErr);
      return;
    }
    // Validate transition
    if (formData.trangThai !== originalStatus && !allowedNext.includes(formData.trangThai) && formData.trangThai !== originalStatus) {
      setApiError(`Không thể chuyển từ "${originalStatus}" sang "${formData.trangThai}". Chỉ cho phép: ${allowedNext.join(', ') || 'không chuyển tiếp'}.`);
      return;
    }
    setApiError(null);
    setDateError(null);
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        ...formData,
        ngayDuKienNhap: formData.ngayDuKienNhap || null,
        warehouseId: formData.warehouseId || null,
        ghiChuVanChuyen: formData.ghiChuVanChuyen || null,
      };
      await onSubmit(pr.id, { items, formData: payload, file: selectedFile });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (err as { message?: string })?.message ?? 'Lỗi hệ thống, vui lòng thử lại';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForApproval = () => {
    const missing = items.filter((it) => !it.nhaCungCapId || it.giaDuKien == null || Number(it.giaDuKien) <= 0);
    if (missing.length > 0) {
      setConfirmNeeded({ title: 'Chưa thể gửi duyệt', message: `Còn ${missing.length} hàng hóa chưa có nhà cung cấp hoặc đơn giá:\n${missing.map((it) => `• ${it.tenHangHoa}`).join('\n')}\n\nVui lòng bổ sung trước khi gửi duyệt.` });
      return;
    }
    const dErr = validateNgayDuKienNhap(String(formData.ngayDuKienNhap ?? ''));
    if (dErr) {
      setDateError(dErr);
      setApiError(dErr);
      return;
    }
    setConfirmNeeded({ title: 'Lưu & gửi duyệt', message: `Lưu báo giá cho yêu cầu ${pr.maYeuCau} và gửi lên admin phê duyệt?\nTổng tiền dự kiến: ${tongTien.toLocaleString('vi-VN')}đ` });
  };

  const confirmSendForApproval = async () => {
    setConfirmNeeded(null);
    setLoading(true);
    setApiError(null);
    try {
      const payload: Record<string, unknown> = {
        ...formData,
        ngayDuKienNhap: formData.ngayDuKienNhap || null,
        warehouseId: formData.warehouseId || null,
        ghiChuVanChuyen: formData.ghiChuVanChuyen || null,
      };
      await onSubmitForApproval(pr.id, { items, formData: payload, file: selectedFile });
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
        ?? (err as { message?: string })?.message ?? 'Lỗi khi gửi duyệt';
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeOnBackdrop ariaLabel="Xử lý yêu cầu mua hàng" className="p-0 sm:p-4">
      <div className="bg-white rounded-lg shadow-sm w-full max-w-2xl md:max-w-4xl lg:max-w-6xl mx-2 sm:mx-4 max-h-[calc(100vh-1rem)] sm:max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()} role="document">
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex flex-col flex-1 min-h-0">
          <div className="flex justify-between items-center mb-5 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Xử lý yêu cầu mua hàng</h2>
              <p className="text-sm text-gray-500 mt-0.5">{pr.maYeuCau} · {pr.trangThai}</p>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {apiError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-md flex items-start gap-2">
                <p className="text-sm text-red-700">{apiError}</p>
              </div>
            )}

            {/* Compact summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-5">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Thông tin yêu cầu</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div className="flex gap-2"><span className="text-gray-500 shrink-0">Người yêu cầu:</span><span className="font-medium text-gray-800">{pr.tenNhanVien}{pr.maNhanVien ? <span className="text-gray-400 ml-1">({pr.maNhanVien})</span> : null}</span></div>
                <div className="flex gap-2"><span className="text-gray-500 shrink-0">Ngày yêu cầu:</span><span className="font-medium text-gray-800">{new Date(pr.ngayYeuCau).toLocaleDateString('vi-VN')}</span></div>
                <div className="flex gap-2"><span className="text-gray-500 shrink-0">Mức độ ưu tiên:</span><span className={`font-medium ${pr.mucDoUuTien === 'Cao' ? 'text-red-600' : pr.mucDoUuTien === 'Trung bình' ? 'text-yellow-600' : 'text-green-600'}`}>{pr.mucDoUuTien}</span></div>
                <div className="flex gap-2"><span className="text-gray-500 shrink-0">Phân loại:</span><span className="font-medium text-gray-800">{pr.items?.[0]?.phanLoai ?? pr.phanLoai ?? '—'}</span></div>
                {pr.mucDichYeuCau && <div className="col-span-1 sm:col-span-2 flex gap-2"><span className="text-gray-500 shrink-0">Mục đích:</span><span className="text-gray-700">{pr.mucDichYeuCau}</span></div>}
                {pr.ghiChu && <div className="col-span-1 sm:col-span-2 flex gap-2"><span className="text-gray-500 shrink-0">Ghi chú YC:</span><span className="text-gray-700 italic">{pr.ghiChu}</span></div>}
                {pr.ghiChuMuaHang && <div className="col-span-1 sm:col-span-2 flex gap-2"><span className="text-gray-500 shrink-0">Ghi chú MH hiện tại:</span><span className="text-gray-700 italic">{pr.ghiChuMuaHang}</span></div>}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Xử lý thu mua</h3>

              {/* Trang thai select with allowlist */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                <select
                  value={formData.trangThai ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    const currentUserName = user ? `${user.lastName ?? ''} ${user.firstName ?? ''}`.trim() : '';
                    setFormData((prev) => ({
                      ...prev,
                      trangThai: v,
                      nguoiDuyet: v === 'Đã duyệt' ? (prev.nguoiDuyet || currentUserName) : prev.nguoiDuyet,
                      ngayDuyet: v === 'Đã duyệt' ? (prev.ngayDuyet || new Date().toISOString()) : prev.ngayDuyet,
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {ALL_TRANG_THAI.filter((s) => s !== 'Đã hủy').map((s) => {
                    const isCurrent = s === originalStatus;
                    const isAllowed = isCurrent || allowedNext.includes(s);
                    return (
                      <option key={s} value={s} disabled={!isAllowed}>
                        {s}{!isAllowed ? ' — không cho phép từ ' + originalStatus : ''}{isCurrent ? ' (hiện tại)' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-gray-500 mt-1">Chỉ các trạng thái hợp lệ từ <span className="font-medium">{originalStatus}</span> mới được chọn. Hủy phiếu dùng nút riêng ở danh sách/chi tiết.</p>
              </div>

              {/* Inbound scheduling — right after Trạng thái for visibility */}
              <div className="border border-blue-100 rounded-lg p-4 bg-blue-50/40 space-y-3">
                <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Dự kiến hàng về</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ngày dự kiến hàng về {(formData.trangThai === 'Hoàn thành' || isHoanThanhTransition) && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="date"
                      value={formData.ngayDuKienNhap ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormData((prev) => ({ ...prev, ngayDuKienNhap: v }));
                        const err = validateNgayDuKienNhap(v);
                        setDateError(err);
                      }}
                      onBlur={(e) => setDateError(validateNgayDuKienNhap(e.target.value))}
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 ${dateError ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-blue-400'}`}
                    />
                    {dateError && <p className="text-xs text-red-600 mt-1">{dateError}</p>}
                    {!dateError && <p className="text-xs text-gray-500 mt-1">Phải từ hôm nay trở đi. Bắt buộc khi Hoàn thành.</p>}
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

              {formData.trangThai === 'Đã duyệt' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-green-50 border border-green-200 rounded-md p-3">
                  <div>
                    <label className="block text-xs font-medium text-green-800 mb-1">Người duyệt</label>
                    <input type="text" value={formData.nguoiDuyet ?? ''} readOnly className="w-full px-3 py-2 border border-green-200 rounded-md bg-white text-sm text-gray-700 cursor-default" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-green-800 mb-1">Ngày duyệt</label>
                    <input type="date" value={formData.ngayDuyet ? new Date(formData.ngayDuyet).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} onChange={(e) => setFormData((prev) => ({ ...prev, ngayDuyet: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString() }))} className="w-full px-3 py-2 border border-green-200 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                  </div>
                </div>
              )}

              {formData.trangThai === 'Từ chối' && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <label className="block text-xs font-medium text-red-800 mb-1">Lý do từ chối (ghi chú thu mua) *</label>
                  <textarea value={formData.ghiChuMuaHang ?? ''} onChange={(e) => setFormData((prev) => ({ ...prev, ghiChuMuaHang: e.target.value }))} rows={2} placeholder="Nhập lý do từ chối..." className="w-full px-3 py-2 border border-red-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-400" />
                  {!String(formData.ghiChuMuaHang ?? '').trim() && <p className="text-xs text-red-600 mt-1">Bắt buộc khi chọn Từ chối.</p>}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Báo giá cho từng hàng hóa</label>
                <div className="border border-gray-200 rounded-md overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8">#</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hàng hóa</th>
                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-20">SL</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-20">ĐVT</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-52">Nhà cung cấp</th>
                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">Đơn giá (đ)</th>
                        <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((it, idx) => {
                        const qty = typeof it.soLuong === 'number' ? it.soLuong : parseFloat(String(it.soLuong)) || 0;
                        const gia = typeof it.giaDuKien === 'number' ? it.giaDuKien : parseFloat(String(it.giaDuKien ?? 0)) || 0;
                        const thanhTien = qty * gia;
                        return (
                          <tr key={it.id ?? idx} className="align-top">
                            <td className="px-2 py-2 text-gray-500 text-center">{idx + 1}</td>
                            <td className="px-2 py-2"><div className="font-medium text-gray-800">{it.tenHangHoa}</div>{it.phanLoai && <div className="text-xs text-gray-500">{it.phanLoai}</div>}</td>
                            <td className="px-2 py-2 text-right">{qty.toLocaleString('vi-VN')}</td>
                            <td className="px-2 py-2">{it.donViTinh}</td>
                            <td className="px-2 py-2 min-w-[180px]">
                              <SupplierCombobox suppliers={(pricingSuppliers ?? []) as Array<{ id: string; tenNhaCungCap: string; maNhaCungCap?: string; loaiCungCap?: string }>} value={it.nhaCungCapId || ''} onChange={(id) => updateItem(idx, { nhaCungCapId: id || null })} loading={Boolean(pricingSuppliersLoading)} error={Boolean(pricingSuppliersError)} onRetry={() => onRetryPricingSuppliers?.()} placeholder="Tìm NCC…" />
                            </td>
                            <td className="px-2 py-2"><input type="number" min={0} step="any" value={it.giaDuKien ?? ''} onChange={(e) => updateItem(idx, { giaDuKien: e.target.value ? parseFloat(e.target.value) : null })} placeholder="0" className="w-full px-2 py-1 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-green-500" /></td>
                            <td className="px-2 py-2 text-right font-medium text-green-700">{thanhTien > 0 ? thanhTien.toLocaleString('vi-VN') + 'đ' : '—'}</td>
                          </tr>
                        );
                      })}
                      {items.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-gray-400 italic">Không có hàng hóa</td></tr>}
                    </tbody>
                    {items.length > 0 && (
                      <tfoot className="bg-green-50">
                        <tr><td colSpan={6} className="px-2 py-2 text-right font-semibold text-gray-700">Tổng cộng:</td><td className="px-2 py-2 text-right font-bold text-green-800">{tongTien > 0 ? tongTien.toLocaleString('vi-VN') + 'đ' : '—'}</td></tr>
                      </tfoot>
                    )}
                  </table>
                </div>
                <p className="text-xs text-gray-500 mt-1">Chọn nhà cung cấp và đơn giá cho từng dòng. Giá thực tế được xác nhận riêng sau khi duyệt.</p>
              </div>

              {formData.trangThai !== 'Từ chối' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú thu mua</label>
                  <textarea value={formData.ghiChuMuaHang ?? ''} onChange={(e) => setFormData((prev) => ({ ...prev, ghiChuMuaHang: e.target.value }))} rows={3} placeholder="Ghi chú nội bộ của phòng thu mua..." className="w-full px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              )}

              <FileUpload label="File đính kèm" files={selectedFile ? [selectedFile] : []} onChange={(files) => setSelectedFile(files[0] || null)} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" existingFileName={!selectedFile && formData.fileKemTheo ? String(formData.fileKemTheo) : undefined} existingFileUrl={!selectedFile && formData.fileKemTheo ? String(formData.fileKemTheo) : undefined} onRemoveExisting={() => setFormData((prev) => ({ ...prev, fileKemTheo: '' }))} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-6 pt-4 border-t border-gray-100 bg-white shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">Hủy</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">{loading ? 'Đang lưu...' : 'Lưu cập nhật'}</button>
            {originalStatus === 'Chờ báo giá' && (
              <button type="button" disabled={loading} onClick={handleSubmitForApproval} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 inline-flex items-center gap-1">
                <CheckCircle className="w-4 h-4" /> Lưu & Gửi duyệt
              </button>
            )}
          </div>
        </form>
      </div>

      {confirmNeeded && (
        <Modal isOpen={true} onClose={() => setConfirmNeeded(null)} closeOnBackdrop ariaLabel={confirmNeeded.title}>
          <div className="bg-white rounded-lg shadow-sm max-w-md w-full p-6" onClick={(e) => e.stopPropagation()} role="document">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{confirmNeeded.title}</h3>
            <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">{confirmNeeded.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmNeeded(null)} className="px-4 py-2 border border-gray-200 rounded-md text-gray-700 hover:bg-gray-50">Đóng</button>
              {confirmNeeded.title === 'Lưu & gửi duyệt' && (
                <button onClick={confirmSendForApproval} className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700">Gửi duyệt</button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
}
