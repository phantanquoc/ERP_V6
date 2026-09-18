import React, { useCallback, useEffect, useState } from 'react';
import { Plus, CalendarClock, XCircle, Pencil, Search, AlertTriangle } from 'lucide-react';
import outboundPlanService, { OutboundPlan } from '../../services/outboundPlanService';
import Modal from '../Modal';
import CreateWarehouseIssueModal from '../CreateWarehouseIssueModal';

function statusBadge(plan: OutboundPlan) {
  const now = new Date();
  const due = plan.ngayDuKien ? new Date(plan.ngayDuKien) : null;
  const isOverdue = due && due < now && ['Chờ xuất', 'Quá hạn'].includes(plan.trangThai);
  const isSoon = due && !isOverdue && ['Chờ xuất'].includes(plan.trangThai) && (due.getTime() - now.getTime()) / 86400000 <= 3;
  if (plan.trangThai === 'Đã hủy') return <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Đã hủy</span>;
  if (plan.trangThai === 'Đã xuất') return <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Đã xuất</span>;
  if (isOverdue || plan.trangThai === 'Quá hạn') return <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Quá hạn</span>;
  if (isSoon) return <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Sắp đến hạn</span>;
  return <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{plan.trangThai}</span>;
}

const OutboundPlanTab: React.FC = () => {
  const [plans, setPlans] = useState<OutboundPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editingPlan, setEditingPlan] = useState<OutboundPlan | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [createForPlan, setCreateForPlan] = useState<OutboundPlan | null>(null);
  const [cancelPlan, setCancelPlan] = useState<OutboundPlan | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await outboundPlanService.getAll({
        search: search || undefined,
        trangThai: filterStatus || undefined,
        limit: 100,
      }) as any;
      const data = res?.data?.data ?? res?.data ?? [];
      setPlans(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, filterStatus]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const openEdit = (p: OutboundPlan) => {
    setEditingPlan(p);
    setEditDate(p.ngayDuKien ? new Date(p.ngayDuKien).toISOString().slice(0, 10) : '');
    setEditReason(p.ghiChu || '');
  };

  const handleEditSave = async () => {
    if (!editingPlan) return;
    if (!editDate) { alert('Vui lòng chọn ngày hẹn mới'); return; }
    setSaving(true);
    try {
      await outboundPlanService.update(editingPlan.id, { ngayDuKien: editDate, ghiChu: editReason || undefined });
      setEditingPlan(null);
      fetchPlans();
    } catch (e: any) { alert(e.response?.data?.message || e.message || 'Lỗi cập nhật'); }
    finally { setSaving(false); }
  };

  const handleCancel = async () => {
    if (!cancelPlan) return;
    if (!cancelReason.trim()) { alert('Vui lòng nhập lý do hủy'); return; }
    setSaving(true);
    try {
      await outboundPlanService.cancel(cancelPlan.id, { lyDo: cancelReason });
      setCancelPlan(null); setCancelReason('');
      fetchPlans();
    } catch (e: any) { alert(e.response?.data?.message || e.message || 'Lỗi hủy'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-orange-600" /> Kế hoạch xuất kho
          <span className="ml-1 inline-flex rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">{plans.length}</span>
        </h3>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Mã KH / YCCB..."
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
            <option value="">Tất cả trạng thái</option>
            <option value="Chờ xuất">Chờ xuất</option>
            <option value="Quá hạn">Quá hạn</option>
            <option value="Đã xuất">Đã xuất</option>
            <option value="Đã hủy">Đã hủy</option>
          </select>
        </div>
      </div>

      {loading ? <div className="text-sm text-gray-400 py-8 text-center">Đang tải...</div> : plans.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center border border-dashed rounded-lg">Chưa có kế hoạch xuất kho</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="bg-gray-50 border-b text-xs text-gray-500">
              <th className="px-3 py-2 text-left">Mã KH</th>
              <th className="px-3 py-2 text-left">YCCB</th>
              <th className="px-3 py-2 text-left">Ngày hẹn</th>
              <th className="px-3 py-2 text-left">Kho</th>
              <th className="px-3 py-2 text-left">Trạng thái</th>
              <th className="px-3 py-2 text-right">Thao tác</th>
            </tr></thead>
            <tbody>
              {plans.map((p) => {
                const kho = p.warehouse?.tenKho || '— (tự tạo)';
                const canEdit = !['Đã xuất', 'Đã hủy'].includes(p.trangThai);
                return (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs font-medium">{p.maKeHoach}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.supplyRequest?.maYeuCau || '—'}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{p.ngayDuKien ? new Date(p.ngayDuKien).toLocaleDateString('vi-VN') : '—'}</td>
                    <td className="px-3 py-2 text-xs">{kho}</td>
                    <td className="px-3 py-2">{statusBadge(p)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button onClick={() => setCreateForPlan(p)} title="Tạo phiếu xuất (prefill)"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-600 text-white text-xs hover:bg-orange-700">
                            <Plus className="w-3 h-3" /> Xuất kho
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => openEdit(p)} title="Sửa ngày hẹn"
                            className="p-1.5 rounded hover:bg-amber-50 text-amber-600"><Pencil className="w-4 h-4" /></button>
                        )}
                        {canEdit && (
                          <button onClick={() => { setCancelPlan(p); setCancelReason(''); }} title="Hủy kế hoạch"
                            className="p-1.5 rounded hover:bg-red-50 text-red-600"><XCircle className="w-4 h-4" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={!!editingPlan} onClose={() => setEditingPlan(null)} showBackdrop closeOnBackdrop>
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] max-w-md p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-semibold text-gray-900 mb-3">Sửa ngày hẹn — {editingPlan?.maKeHoach}</h3>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ngày hẹn mới <span className="text-red-500">*</span></label>
          <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3" />
          <label className="block text-xs font-medium text-gray-600 mb-1">Ghi chú / lý do</label>
          <textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} rows={3}
            placeholder="Nhập lý do..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditingPlan(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Hủy</button>
            <button onClick={handleEditSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!cancelPlan} onClose={() => setCancelPlan(null)} showBackdrop closeOnBackdrop>
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] max-w-md p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /> Hủy kế hoạch — {cancelPlan?.maKeHoach}</h3>
          <label className="block text-xs font-medium text-gray-600 mb-1">Lý do hủy <span className="text-red-500">*</span></label>
          <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3}
            placeholder="Nhập lý do hủy..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setCancelPlan(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Đóng</button>
            <button onClick={handleCancel} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">{saving ? 'Đang xử lý...' : 'Xác nhận hủy'}</button>
          </div>
        </div>
      </Modal>

      {createForPlan && (
        <CreateWarehouseIssueModal
          isOpen={!!createForPlan}
          onClose={() => setCreateForPlan(null)}
          outboundPlan={createForPlan}
          supplyRequest={(createForPlan.supplyRequest as any) ?? null}
          onSuccess={() => { setCreateForPlan(null); fetchPlans(); }}
        />
      )}
    </div>
  );
};

export default OutboundPlanTab;
