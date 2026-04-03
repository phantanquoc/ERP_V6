/**
 * SupplyAdjustmentModal — Điều chỉnh bổ sung vật tư
 *
 * Renders in an embedded full-screen overlay (no Portal) from CommonManagement.
 * Features:
 *   - List view with tabs (Tất cả / Của tôi / Chờ duyệt)
 *   - Create form for employees
 *   - Admin/Manager: Approve / Reject with notes
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, X, CheckCircle, XCircle, Eye, ClipboardList, Clock, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types/auth';
import {
  supplyAdjustmentService,
  SupplyAdjustment,
  SupplyAdjustmentStatus,
  CreateSupplyAdjustmentData,
} from '../services/supplyAdjustmentService';
import { formatDate } from '../utils/formatters';

// ─── Constants ────────────────────────────────────────────────────────────────

type TabValue = 'all' | 'my' | 'pending';

const STATUS_BADGE: Record<SupplyAdjustmentStatus, { label: string; bg: string; text: string }> = {
  CHO_DUYET:  { label: 'Chờ duyệt',  bg: 'bg-yellow-100', text: 'text-yellow-700' },
  DA_DUYET:   { label: 'Đã duyệt',   bg: 'bg-green-100',  text: 'text-green-700'  },
  TU_CHOI:    { label: 'Từ chối',    bg: 'bg-red-100',    text: 'text-red-700'    },
};

const LOAI_VAT_TU_OPTIONS = [
  'Nguyên liệu',
  'Bao bì',
  'Vật tư phụ trợ',
  'Hóa chất',
  'Thiết bị/Dụng cụ',
  'Khác',
];

const DON_VI_TINH_OPTIONS = ['kg', 'g', 'lít', 'ml', 'cái', 'hộp', 'thùng', 'cuộn', 'mét', 'gói'];

// ─── Props ────────────────────────────────────────────────────────────────────

interface SupplyAdjustmentModalProps {
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const SupplyAdjustmentModal: React.FC<SupplyAdjustmentModalProps> = ({ onClose }) => {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.MANAGER;

  // ── List state
  const [tab, setTab] = useState<TabValue>(isManagerOrAdmin ? 'all' : 'my');
  const [items, setItems] = useState<SupplyAdjustment[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // ── Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CreateSupplyAdjustmentData>({
    loaiVatTu: '',
    tenVatTu: '',
    soLuongHienTai: 0,
    soLuongDieuChinh: 0,
    donViTinh: 'kg',
    lyDo: '',
    ngayDieuChinh: new Date().toISOString().split('T')[0],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Detail / approval state
  const [selectedItem, setSelectedItem] = useState<SupplyAdjustment | null>(null);
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const params: Record<string, any> = { page: currentPage, limit: 10 };
      if (tab === 'pending') params.trangThai = 'CHO_DUYET';
      const res = await supplyAdjustmentService.getAll(params);
      // For 'my' tab, filter client-side using employee data (API is role-aware anyway)
      setItems(res.data);
      setPagination(res.pagination);
    } catch {
      setError('Không thể tải danh sách điều chỉnh vật tư');
    } finally {
      setIsLoading(false);
    }
  }, [tab, currentPage]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Realtime
  useEffect(() => {
    const handler = () => fetchItems();
    window.addEventListener('SUPPLY_ADJUSTMENT_CHANGED', handler);
    window.addEventListener('wsReconnected', handler);
    return () => {
      window.removeEventListener('SUPPLY_ADJUSTMENT_CHANGED', handler);
      window.removeEventListener('wsReconnected', handler);
    };
  }, [fetchItems]);

  // ── Create form ──────────────────────────────────────────────────────────

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.loaiVatTu) errs.loaiVatTu = 'Vui lòng chọn loại vật tư';
    if (!formData.tenVatTu.trim()) errs.tenVatTu = 'Vui lòng nhập tên vật tư';
    if (formData.soLuongHienTai < 0) errs.soLuongHienTai = 'Số lượng hiện tại không được âm';
    if (formData.soLuongDieuChinh <= 0) errs.soLuongDieuChinh = 'Số lượng điều chỉnh phải lớn hơn 0';
    if (!formData.donViTinh) errs.donViTinh = 'Vui lòng chọn đơn vị tính';
    if (!formData.lyDo.trim()) errs.lyDo = 'Vui lòng nhập lý do điều chỉnh';
    if (!formData.ngayDieuChinh) errs.ngayDieuChinh = 'Vui lòng chọn ngày điều chỉnh';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      await supplyAdjustmentService.create(formData);
      setShowCreateForm(false);
      setFormData({
        loaiVatTu: '', tenVatTu: '', soLuongHienTai: 0, soLuongDieuChinh: 0,
        donViTinh: 'kg', lyDo: '', ngayDieuChinh: new Date().toISOString().split('T')[0],
      });
      fetchItems();
    } catch (err: any) {
      setError(err?.message || 'Không thể tạo yêu cầu điều chỉnh');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Approval actions ─────────────────────────────────────────────────────

  const handleApprove = async () => {
    if (!selectedItem) return;
    setActionLoading(true);
    try {
      await supplyAdjustmentService.approve(selectedItem.id, approvalNote || undefined);
      setSelectedItem(null);
      setApprovalNote('');
      fetchItems();
    } catch {
      setError('Không thể duyệt yêu cầu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await supplyAdjustmentService.reject(selectedItem.id, rejectReason);
      setSelectedItem(null);
      setRejectReason('');
      setShowRejectForm(false);
      fetchItems();
    } catch {
      setError('Không thể từ chối yêu cầu');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-800">Điều chỉnh bổ sung vật tư</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Tạo yêu cầu
          </button>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1 w-fit">
          {([
            ['all',     'Tất cả'],
            ['my',      'Của tôi'],
            ['pending', 'Chờ duyệt'],
          ] as [TabValue, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => { setTab(val); setCurrentPage(1); }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === val ? 'bg-purple-600 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2">
            <XCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="text-sm">Đang tải...</span>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <ClipboardList className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-base font-medium">Chưa có yêu cầu điều chỉnh nào</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Mã</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Vật tư</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Loại</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">SL hiện tại</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-600">SL điều chỉnh</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Người yêu cầu</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Ngày</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Trạng thái</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-600">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => {
                      const badge = STATUS_BADGE[item.trangThai];
                      return (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{item.maDieuChinh}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{item.tenVatTu}</td>
                          <td className="px-4 py-3 text-gray-600">{item.loaiVatTu}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{item.soLuongHienTai} {item.donViTinh}</td>
                          <td className="px-4 py-3 text-right font-medium text-purple-700">+{item.soLuongDieuChinh} {item.donViTinh}</td>
                          <td className="px-4 py-3 text-gray-700">
                            {item.employee ? `${item.employee.user.firstName} ${item.employee.user.lastName}` : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(item.ngayDieuChinh)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setSelectedItem(item)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                                title="Xem chi tiết"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              {isManagerOrAdmin && item.trangThai === 'CHO_DUYET' && (
                                <>
                                  <button
                                    onClick={() => { setSelectedItem(item); setShowRejectForm(false); }}
                                    className="p-1.5 text-green-600 hover:bg-green-100 rounded-md transition-colors"
                                    title="Duyệt"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => { setSelectedItem(item); setShowRejectForm(true); }}
                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                                    title="Từ chối"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {items.map((item) => {
                  const badge = STATUS_BADGE[item.trangThai];
                  return (
                    <div key={item.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-gray-900">{item.tenVatTu}</p>
                          <p className="text-xs text-gray-500 font-mono">{item.maDieuChinh}</p>
                        </div>
                        <span className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-sm text-gray-600">
                        <span>Loại: {item.loaiVatTu}</span>
                        <span>SL ĐC: +{item.soLuongDieuChinh} {item.donViTinh}</span>
                        <span>Ngày: {formatDate(item.ngayDieuChinh)}</span>
                        {item.employee && (
                          <span>{item.employee.user.firstName} {item.employee.user.lastName}</span>
                        )}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Chi tiết
                        </button>
                        {isManagerOrAdmin && item.trangThai === 'CHO_DUYET' && (
                          <>
                            <button
                              onClick={() => { setSelectedItem(item); setShowRejectForm(false); }}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs text-green-700 bg-green-50 rounded-md hover:bg-green-100 transition-colors"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Duyệt
                            </button>
                            <button
                              onClick={() => { setSelectedItem(item); setShowRejectForm(true); }}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-700 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Từ chối
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                  <span className="text-sm text-gray-600">
                    {pagination.total} kết quả — Trang {pagination.page}/{pagination.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Trước
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                      disabled={currentPage >= pagination.totalPages}
                      className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Sau
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Create Form Overlay ─────────────────────────────────────────────── */}
      {showCreateForm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Tạo yêu cầu điều chỉnh vật tư</h3>
              <button onClick={() => setShowCreateForm(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Loại vật tư */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại vật tư <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.loaiVatTu}
                    onChange={e => setFormData(p => ({ ...p, loaiVatTu: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${formErrors.loaiVatTu ? 'border-red-400' : 'border-gray-300'}`}
                  >
                    <option value="">Chọn loại vật tư</option>
                    {LOAI_VAT_TU_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  {formErrors.loaiVatTu && <p className="text-red-500 text-xs mt-1">{formErrors.loaiVatTu}</p>}
                </div>

                {/* Tên vật tư */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tên vật tư <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.tenVatTu}
                    onChange={e => setFormData(p => ({ ...p, tenVatTu: e.target.value }))}
                    placeholder="Nhập tên vật tư..."
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${formErrors.tenVatTu ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {formErrors.tenVatTu && <p className="text-red-500 text-xs mt-1">{formErrors.tenVatTu}</p>}
                </div>

                {/* Số lượng hiện tại */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số lượng hiện tại
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={formData.soLuongHienTai}
                    onChange={e => setFormData(p => ({ ...p, soLuongHienTai: parseFloat(e.target.value) || 0 }))}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${formErrors.soLuongHienTai ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {formErrors.soLuongHienTai && <p className="text-red-500 text-xs mt-1">{formErrors.soLuongHienTai}</p>}
                </div>

                {/* Số lượng điều chỉnh */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số lượng điều chỉnh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={formData.soLuongDieuChinh}
                    onChange={e => setFormData(p => ({ ...p, soLuongDieuChinh: parseFloat(e.target.value) || 0 }))}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${formErrors.soLuongDieuChinh ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {formErrors.soLuongDieuChinh && <p className="text-red-500 text-xs mt-1">{formErrors.soLuongDieuChinh}</p>}
                </div>

                {/* Đơn vị tính */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Đơn vị tính <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.donViTinh}
                    onChange={e => setFormData(p => ({ ...p, donViTinh: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    {DON_VI_TINH_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>

                {/* Ngày điều chỉnh */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày điều chỉnh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.ngayDieuChinh}
                    onChange={e => setFormData(p => ({ ...p, ngayDieuChinh: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 ${formErrors.ngayDieuChinh ? 'border-red-400' : 'border-gray-300'}`}
                  />
                  {formErrors.ngayDieuChinh && <p className="text-red-500 text-xs mt-1">{formErrors.ngayDieuChinh}</p>}
                </div>
              </div>

              {/* Lý do */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lý do điều chỉnh <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.lyDo}
                  onChange={e => setFormData(p => ({ ...p, lyDo: e.target.value }))}
                  placeholder="Mô tả lý do cần điều chỉnh số lượng vật tư..."
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none ${formErrors.lyDo ? 'border-red-400' : 'border-gray-300'}`}
                />
                {formErrors.lyDo && <p className="text-red-500 text-xs mt-1">{formErrors.lyDo}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors font-medium"
              >
                {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail / Approval Overlay ───────────────────────────────────────── */}
      {selectedItem && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Chi tiết yêu cầu điều chỉnh</h3>
              <button onClick={() => { setSelectedItem(null); setShowRejectForm(false); setApprovalNote(''); setRejectReason(''); }} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-sm">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-3">
                <div><span className="text-gray-500">Mã:</span> <span className="font-mono font-medium">{selectedItem.maDieuChinh}</span></div>
                <div>
                  <span className="text-gray-500">Trạng thái:</span>{' '}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[selectedItem.trangThai].bg} ${STATUS_BADGE[selectedItem.trangThai].text}`}>
                    {STATUS_BADGE[selectedItem.trangThai].label}
                  </span>
                </div>
                <div><span className="text-gray-500">Loại:</span> {selectedItem.loaiVatTu}</div>
                <div><span className="text-gray-500">Vật tư:</span> <strong>{selectedItem.tenVatTu}</strong></div>
                <div><span className="text-gray-500">SL hiện tại:</span> {selectedItem.soLuongHienTai} {selectedItem.donViTinh}</div>
                <div><span className="text-gray-500">SL điều chỉnh:</span> <strong className="text-purple-700">+{selectedItem.soLuongDieuChinh} {selectedItem.donViTinh}</strong></div>
                <div><span className="text-gray-500">Ngày:</span> {formatDate(selectedItem.ngayDieuChinh)}</div>
                <div>
                  <span className="text-gray-500">Người YC:</span>{' '}
                  {selectedItem.employee ? `${selectedItem.employee.user.firstName} ${selectedItem.employee.user.lastName}` : '—'}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">Lý do điều chỉnh</p>
                <p className="text-gray-800">{selectedItem.lyDo}</p>
              </div>

              {selectedItem.ghiChuQC && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-blue-500 text-xs mb-1">Ghi chú QC</p>
                  <p className="text-blue-800">{selectedItem.ghiChuQC}</p>
                </div>
              )}

              {selectedItem.lyDoTuChoi && (
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-red-500 text-xs mb-1">Lý do từ chối</p>
                  <p className="text-red-800">{selectedItem.lyDoTuChoi}</p>
                </div>
              )}

              {/* Approval panel */}
              {isManagerOrAdmin && selectedItem.trangThai === 'CHO_DUYET' && (
                <div className="border-t border-gray-200 pt-3 space-y-3">
                  {!showRejectForm ? (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú (tuỳ chọn)</label>
                        <textarea
                          rows={2}
                          value={approvalNote}
                          onChange={e => setApprovalNote(e.target.value)}
                          placeholder="Ghi chú khi duyệt..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleApprove}
                          disabled={actionLoading}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium"
                        >
                          <CheckCircle className="h-4 w-4" />
                          {actionLoading ? 'Đang duyệt...' : 'Duyệt yêu cầu'}
                        </button>
                        <button
                          onClick={() => setShowRejectForm(true)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          <XCircle className="h-4 w-4" />
                          Từ chối
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Lý do từ chối <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={3}
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Nhập lý do từ chối..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setShowRejectForm(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm transition-colors">
                          Quay lại
                        </button>
                        <button
                          onClick={handleReject}
                          disabled={actionLoading || !rejectReason.trim()}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                          {actionLoading ? 'Đang gửi...' : 'Xác nhận từ chối'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplyAdjustmentModal;
