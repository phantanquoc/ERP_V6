import React, { useCallback, useEffect, useState } from 'react';
import { Plus, CalendarClock, XCircle, Pencil, Search, AlertTriangle, ClipboardCheck } from 'lucide-react';
import inboundPlanService, { InboundPlan } from '../../services/inboundPlanService';
import Modal from '../Modal';
import CreateWarehouseReceiptModal from '../CreateWarehouseReceiptModal';

function statusBadge(plan: InboundPlan) {
  const now = new Date();
  const due = plan.ngayDuKien ? new Date(plan.ngayDuKien) : null;
  const isOverdue = due && due < now && ['Chờ nhập', 'Quá hạn'].includes(plan.trangThai);
  const isSoon = due && !isOverdue && ['Chờ nhập'].includes(plan.trangThai) && (due.getTime() - now.getTime()) / 86400000 <= 3;
  if (plan.trangThai === 'Đã hủy') return <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Đã hủy</span>;
  if (plan.trangThai === 'Đã nhập') return <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Đã nhập</span>;
  if (isOverdue || plan.trangThai === 'Quá hạn') return <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Quá hạn</span>;
  if (isSoon) return <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Sắp đến hạn</span>;
  return <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{plan.trangThai}</span>;
}

const InboundPlanTab: React.FC = () => {
  const [plans, setPlans] = useState<InboundPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [editingPlan, setEditingPlan] = useState<InboundPlan | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [createForPlan, setCreateForPlan] = useState<InboundPlan | null>(null);
  const [createFromPlan, setCreateFromPlan] = useState<InboundPlan | null>(null);
  const [cancelPlan, setCancelPlan] = useState<InboundPlan | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await inboundPlanService.getAll({
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

  const openEdit = (p: InboundPlan) => {
    setEditingPlan(p);
    setEditDate(p.ngayDuKien ? new Date(p.ngayDuKien).toISOString().slice(0, 10) : '');
    setEditReason('');
  };

  const handleEditSave = async () => {
    if (!editingPlan) return;
    if (!editDate) { alert('Vui lòng chọn ngày hẹn mới'); return; }
    setSaving(true);
    try {
      await inboundPlanService.update(editingPlan.id, { ngayDuKien: editDate, lyDo: editReason || undefined });
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
      await inboundPlanService.cancel(cancelPlan.id, { lyDo: cancelReason });
      setCancelPlan(null); setCancelReason('');
      fetchPlans();
    } catch (e: any) { alert(e.response?.data?.message || e.message || 'Lỗi hủy'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-blue-600" /> Kế hoạch nhập kho
          <span className="ml-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{plans.length}</span>
        </h3>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Mã KH / YCMH..."
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-lg">
            <option value="">Tất cả trạng thái</option>
            <option value="Chờ nhập">Chờ nhập</option>
            <option value="Quá hạn">Quá hạn</option>
            <option value="Đã nhập">Đã nhập</option>
            <option value="Đã hủy">Đã hủy</option>
          </select>
        </div>
      </div>

      {loading ? <div className="text-sm text-gray-400 py-8 text-center">Đang tải...</div> : plans.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center border border-dashed rounded-lg">Chưa có kế hoạch nhập kho</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="bg-gray-50 border-b text-xs text-gray-500">
              <th className="px-3 py-2 text-left">Mã KH</th>
              <th className="px-3 py-2 text-left">YCMH</th>
              <th className="px-3 py-2 text-left">NCC</th>
              <th className="px-3 py-2 text-left">Ngày hẹn</th>
              <th className="px-3 py-2 text-left">Kho đích</th>
              <th className="px-3 py-2 text-left">Trạng thái</th>
              <th className="px-3 py-2 text-right">Thao tác</th>
            </tr></thead>
            <tbody>
              {plans.map((p) => {
                const pr = p.purchaseRequest;
                const ncc = (pr as any)?.supplier?.tenNhaCungCap || (pr as any)?.nhaCungCapId || '—';
                const kho = p.warehouse?.tenKho || (pr as any)?.warehouse?.tenKho || '—';
                const canEdit = !['Đã nhập', 'Đã hủy'].includes(p.trangThai);
                return (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs font-medium">{p.maKeHoach}</td>
                    <td className="px-3 py-2 font-mono text-xs">{pr?.maYeuCau || '—'}</td>
                    <td className="px-3 py-2 text-xs truncate max-w-[160px]" title={ncc}>{ncc}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{p.ngayDuKien ? new Date(p.ngayDuKien).toLocaleDateString('vi-VN') : '—'}</td>
                    <td className="px-3 py-2 text-xs">{kho}</td>
                    <td className="px-3 py-2">{statusBadge(p)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button onClick={() => setCreateForPlan(p)} title="Nhập kho (form trống)"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-600 text-white text-xs hover:bg-slate-700">
                            <Plus className="w-3 h-3" /> Nhập kho
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => setCreateFromPlan(p)} title="Tạo phiếu thực tế từ kế hoạch (prefill)"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700">
                            <ClipboardCheck className="w-3 h-3" /> Từ kế hoạch
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

      {/* Edit date dialog */}
      <Modal isOpen={!!editingPlan} onClose={() => setEditingPlan(null)} showBackdrop closeOnBackdrop>
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] max-w-md p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-semibold text-gray-900 mb-3">Sửa ngày hẹn — {editingPlan?.maKeHoach}</h3>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ngày hẹn mới <span className="text-red-500">*</span></label>
          <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3" />
          <label className="block text-xs font-medium text-gray-600 mb-1">Lý do đổi ngày</label>
          <textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} rows={3}
            placeholder="Nhập lý do..." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditingPlan(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Hủy</button>
            <button onClick={handleEditSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Đang lưu...' : 'Lưu'}</button>
          </div>
        </div>
      </Modal>

      {/* Cancel dialog */}
      <Modal isOpen={!!cancelPlan} onClose={() => setCancelPlan(null)} showBackdrop closeOnBackdrop>
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] max-w-md p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-500" /> Hủy kế hoạch — {cancelPlan?.maKeHoach}</h3>
          <p className="text-sm text-gray-500 mb-3">Hành động này không thể hoàn tác.</p>
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
        <CreateWarehouseReceiptModal
          isOpen={!!createForPlan}
          onClose={() => setCreateForPlan(null)}
          onSuccess={() => { setCreateForPlan(null); fetchPlans(); }}
        />
      )}
      {createFromPlan && (
        <CreateWarehouseReceiptModal
          isOpen={!!createFromPlan}
          inboundPlan={createFromPlan}
          onClose={() => setCreateFromPlan(null)}
          onSuccess={() => { setCreateFromPlan(null); fetchPlans(); }}
        />
      )}
    </div>
  );
};

export default InboundPlanTab;
