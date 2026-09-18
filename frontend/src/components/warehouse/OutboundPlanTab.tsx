import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, CalendarClock, XCircle, Pencil, AlertTriangle, RefreshCw, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import outboundPlanService, { OutboundPlan } from '../../services/outboundPlanService';
import Modal from '../Modal';
import TableFilter from '../TableFilter';
import CancelWithReasonModal from '../common/CancelWithReasonModal';
import CreateWarehouseIssueModal from '../CreateWarehouseIssueModal';
import PlanLogHistory from './PlanLogHistory';
import { formatDateInAppTz } from '../../utils/dateUtils';
import { useDebounce } from '../../hooks/useDebounce';
import { resolvePlanBadge } from '../../utils/warehousePlanBadges';

// Không có "Quá hạn" như một giá trị trangThai gửi thẳng: xem isOverdueFilter bên dưới.
const STATUS_FILTERS = [
  { value: 'Chờ xuất', label: 'Chờ xuất' },
  { value: 'Quá hạn', label: 'Quá hạn' },
  { value: 'Đã xuất', label: 'Đã xuất' },
  { value: 'Đã hủy', label: 'Đã hủy' },
];

const ITEMS_PER_PAGE = 10;

type SortKey = 'maKeHoach' | 'ngayDuKien' | 'createdAt';

function statusBadge(plan: OutboundPlan) {
  const { label, className } = resolvePlanBadge({
    trangThai: plan.trangThai,
    ngayDuKien: plan.ngayDuKien,
    pendingStatus: 'Chờ xuất',
    doneStatus: 'Đã xuất',
  });
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}

const OutboundPlanTab: React.FC = () => {
  const [plans, setPlans] = useState<OutboundPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({ _search: '', trangThai: '' });
  const debouncedSearch = useDebounce(filterValues._search, 300);
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [editingPlan, setEditingPlan] = useState<OutboundPlan | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [createForPlan, setCreateForPlan] = useState<OutboundPlan | null>(null);
  const [cancelPlan, setCancelPlan] = useState<OutboundPlan | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Backend outboundPlanService không có nơi nào GHI trạng thái 'Quá hạn' (khác inbound
  // qua onReceiptCreated) — chỉ đọc khi lọc overdueOnly theo ngày. Map option "Quá hạn"
  // sang overdueOnly để filter thực sự trả về dòng nào đó, thay vì luôn rỗng.
  const isOverdueFilter = filterValues.trangThai === 'Quá hạn';

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await outboundPlanService.getAll({
        search: debouncedSearch || undefined,
        trangThai: isOverdueFilter ? undefined : (filterValues.trangThai || undefined),
        overdueOnly: isOverdueFilter || undefined,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        sortBy: sortKey,
        sortDir,
      }) as any;
      const data = res?.data?.data ?? res?.data ?? [];
      const pagination = res?.data?.pagination;
      setPlans(Array.isArray(data) ? data : []);
      setTotal(pagination?.total ?? (Array.isArray(data) ? data.length : 0));
      setTotalPages(pagination?.totalPages ?? 1);
    } catch (e: any) {
      console.error(e);
      setLoadError(e?.response?.data?.message || e?.message || 'Không tải được danh sách kế hoạch xuất kho');
    } finally { setLoading(false); }
  }, [debouncedSearch, filterValues.trangThai, isOverdueFilter, currentPage, sortKey, sortDir]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, filterValues.trangThai]);
  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(1, page), Math.max(1, totalPages)));
  }, [totalPages]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  const openEdit = (p: OutboundPlan) => {
    setEditingPlan(p);
    setEditDate(p.ngayDuKien ? formatDateInAppTz(p.ngayDuKien) : '');
    setEditReason(p.ghiChu || '');
  };

  const handleEditSave = async () => {
    if (!editingPlan) return;
    if (!editDate) { toast.error('Vui lòng chọn ngày hẹn mới'); return; }
    setSaving(true);
    try {
      await outboundPlanService.update(editingPlan.id, { ngayDuKien: editDate, ghiChu: editReason || undefined, lyDo: editReason || undefined });
      setEditingPlan(null);
      toast.success('Cập nhật ngày hẹn thành công');
      fetchPlans();
    } catch (e: any) { toast.error(e.response?.data?.message || e.message || 'Lỗi cập nhật'); }
    finally { setSaving(false); }
  };

  const handleCancel = async (lyDoHuy: string) => {
    if (!cancelPlan) return;
    setCancelling(true);
    try {
      await outboundPlanService.cancel(cancelPlan.id, { lyDo: lyDoHuy });
      setCancelPlan(null);
      toast.success('Đã hủy kế hoạch xuất kho');
      fetchPlans();
    } catch (e: any) { toast.error(e.response?.data?.message || e.message || 'Lỗi hủy'); }
    finally { setCancelling(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-blue-600" /> Kế hoạch xuất kho
          <span className="ml-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{total}</span>
        </h3>
      </div>

      <TableFilter
        filters={[{ key: 'trangThai', label: 'Trạng thái', type: 'select', options: STATUS_FILTERS }]}
        values={filterValues}
        onChange={setFilterValues}
        searchPlaceholder="Mã KH / YCCB..."
      />

      {loadError ? (
        <div className="flex items-center justify-between gap-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" /> {loadError}</span>
          <button onClick={fetchPlans} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs hover:bg-red-700 flex-shrink-0">
            <RefreshCw className="w-3 h-3" /> Thử lại
          </button>
        </div>
      ) : loading ? <div className="text-sm text-gray-400 py-8 text-center">Đang tải...</div> : plans.length === 0 ? (
        <div className="text-sm text-gray-400 py-8 text-center border border-dashed rounded-lg">Chưa có kế hoạch xuất kho</div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="bg-gray-50 border-b text-xs text-gray-500">
              <th scope="col" className="px-3 py-2 text-left">
                <button onClick={() => toggleSort('maKeHoach')} className="inline-flex items-center gap-1 hover:text-gray-700">Mã KH {sortIcon('maKeHoach')}</button>
              </th>
              <th scope="col" className="px-3 py-2 text-left">YCCB</th>
              <th scope="col" className="px-3 py-2 text-left">Hàng hóa</th>
              <th scope="col" className="px-3 py-2 text-left">
                <button onClick={() => toggleSort('ngayDuKien')} className="inline-flex items-center gap-1 hover:text-gray-700">Ngày hẹn {sortIcon('ngayDuKien')}</button>
              </th>
              <th scope="col" className="px-3 py-2 text-left">Kho</th>
              <th scope="col" className="px-3 py-2 text-left">Trạng thái</th>
              <th scope="col" className="px-3 py-2 text-right">Thao tác</th>
            </tr></thead>
            <tbody>
              {plans.map((p) => {
                const kho = p.warehouse?.tenKho || '— (tự tạo)';
                const canEdit = !['Đã xuất', 'Đã hủy'].includes(p.trangThai);
                const items = p.supplyRequest?.items ?? [];
                const itemsSummary = items.length === 0 ? '—' : items
                  .map((it) => `${it.tenGoi} (${it.soLuong} ${it.donViTinh})`)
                  .join(', ');
                return (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs font-medium">{p.maKeHoach}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.supplyRequest?.maYeuCau || '—'}</td>
                    <td className="px-3 py-2 text-xs truncate max-w-[220px]" title={itemsSummary}>{itemsSummary}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{p.ngayDuKien ? new Date(p.ngayDuKien).toLocaleDateString('vi-VN') : '—'}</td>
                    <td className="px-3 py-2 text-xs">{kho}</td>
                    <td className="px-3 py-2">{statusBadge(p)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <button onClick={() => setCreateForPlan(p)} title="Tạo phiếu xuất kho từ kế hoạch"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700">
                            <Plus className="w-3 h-3" /> Xuất kho
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => openEdit(p)} title="Sửa ngày hẹn" aria-label={`Sửa ngày hẹn kế hoạch ${p.maKeHoach}`}
                            className="p-1.5 rounded hover:bg-amber-50 text-amber-600"><Pencil className="w-4 h-4" /></button>
                        )}
                        {canEdit && (
                          <button onClick={() => setCancelPlan(p)} title="Hủy kế hoạch" aria-label={`Hủy kế hoạch ${p.maKeHoach}`}
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

      {!loadError && !loading && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-2">
          <span className="text-sm text-gray-600">
            Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, total)} / {total} kế hoạch
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Trước</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
              .map((page, idx, arr) => (
                <React.Fragment key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-gray-400">...</span>}
                  <button onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-sm rounded-md ${page === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}>
                    {page}
                  </button>
                </React.Fragment>
              ))}
            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Sau</button>
          </div>
        </div>
      )}

      <Modal isOpen={!!editingPlan} onClose={() => setEditingPlan(null)} showBackdrop closeOnBackdrop>
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] max-w-md p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-semibold text-gray-900 mb-3">Sửa ngày hẹn — {editingPlan?.maKeHoach}</h3>
          <PlanLogHistory logs={editingPlan?.logs} />
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

      <CancelWithReasonModal
        isOpen={!!cancelPlan}
        onClose={() => setCancelPlan(null)}
        onConfirm={handleCancel}
        ticketLabel={`kế hoạch xuất ${cancelPlan?.maKeHoach ?? ''}`}
        description="Hành động này không thể hoàn tác."
        loading={cancelling}
      />

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
