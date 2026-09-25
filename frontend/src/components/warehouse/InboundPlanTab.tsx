import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUrlDetailId, useUrlFilters } from '../../hooks/useUrlState';
import toast from 'react-hot-toast';
import { CalendarClock, XCircle, Pencil, AlertTriangle, RefreshCw, ClipboardCheck, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import inboundPlanService, { InboundPlan } from '../../services/inboundPlanService';
import Modal from '../Modal';
import TableFilter from '../TableFilter';
import CancelWithReasonModal from '../common/CancelWithReasonModal';
import CreateWarehouseReceiptModal from '../CreateWarehouseReceiptModal';
import PlanLogHistory from './PlanLogHistory';
import InboundPlanDetailModal from './InboundPlanDetailModal';
import { formatDateInAppTz } from '../../utils/dateUtils';
import { useWarehouses } from '../../hooks/useWarehouses';
import { resolvePlanBadge } from '../../utils/warehousePlanBadges';

const STATUS_FILTERS = [
  { value: 'Chờ nhập', label: 'Chờ nhập' },
  { value: 'Quá hạn', label: 'Quá hạn' },
  { value: 'Đã nhập', label: 'Đã nhập' },
  { value: 'Đã hủy', label: 'Đã hủy' },
];

const ITEMS_PER_PAGE = 10;

type SortKey = 'maKeHoach' | 'ngayDuKien' | 'createdAt';

function statusBadge(plan: InboundPlan) {
  const { label, className } = resolvePlanBadge({
    trangThai: plan.trangThai,
    ngayDuKien: plan.ngayDuKien,
    pendingStatus: 'Chờ nhập',
    doneStatus: 'Đã nhập',
  });
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}

function auditTooltip(plan: InboundPlan): string | undefined {
  const log = plan.logs?.[0];
  if (!log) return undefined;
  const parts: string[] = [log.hanhDong];
  if (log.ngayMoi) {
    const d = new Date(log.ngayMoi);
    if (!isNaN(d.getTime())) parts.push(`ngày mới: ${d.toLocaleDateString('vi-VN')}`);
  }
  if (log.nguoiThucHien) parts.push(`bởi ${log.nguoiThucHien}`);
  return parts.join(' · ');
}

function auditBadge(plan: InboundPlan) {
  const count = plan.logs?.length ?? 0;
  if (count === 0) return null;
  const label = `${count} thay đổi`;
  const tip = auditTooltip(plan);
  return (
    <span
      title={tip}
      className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200 cursor-help"
    >
      {label}
    </span>
  );
}

const InboundPlanTab: React.FC = () => {
  const [plans, setPlans] = useState<InboundPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [urlFilters, setUrlFilters] = useUrlFilters({ _search: '', trangThai: '', warehouseId: '', fromNgay: '', toNgay: '', page: '1', sortBy: 'createdAt', sortOrder: 'desc' }, { prefix: 'in_plan_' });
  const currentPage = Math.max(1, parseInt(urlFilters.page || '1', 10) || 1);
  const setCurrentPage = (v: number | ((p: number) => number)) => { const next = typeof v === 'function' ? (v as (p:number)=>number)(currentPage) : v; setUrlFilters({ page: String(next) }); };
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const filterValues = { _search: urlFilters._search, trangThai: urlFilters.trangThai, warehouseId: urlFilters.warehouseId, fromNgay: urlFilters.fromNgay, toNgay: urlFilters.toNgay } as Record<string, string>;
  const setFilterValues = (vals: Record<string, string>) => setUrlFilters({ _search: vals._search ?? '', trangThai: vals.trangThai ?? '', warehouseId: vals.warehouseId ?? '', fromNgay: vals.fromNgay ?? '', toNgay: vals.toNgay ?? '', page: '1' });
  const sortKey = (urlFilters.sortBy as SortKey) || 'createdAt';
  const sortDir = (urlFilters.sortOrder as 'asc' | 'desc') || 'desc';
  const setSortKey = (k: SortKey) => setUrlFilters({ sortBy: k });
  const setSortDir = (d: 'asc' | 'desc') => setUrlFilters({ sortOrder: d as 'asc' | 'desc' });
  const [editingPlan, setEditingPlan] = useState<InboundPlan | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editReason, setEditReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [createFromPlan, setCreateFromPlan] = useState<InboundPlan | null>(null);
  const [cancelPlan, setCancelPlan] = useState<InboundPlan | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [selectedDetailPlan, setSelectedDetailPlan] = useState<InboundPlan | null>(null);
  const { id: urlPlanId, open: openUrlPlan, close: closeUrlPlan, syncingRef: planSyncRef } = useUrlDetailId('inboundPlanId');
  const detailSeqRef = useRef(0);

  // "Quá hạn" không phải trạng thái duy nhất bị lọc quá hạn — backend chỉ ĐÁNH DẤU
  // 'Quá hạn' khi có phiếu nhập chạy qua onReceiptCreated, còn kế hoạch quá hạn nhưng
  // chưa từng chạm phiếu nhập vẫn còn 'Chờ nhập'. Dùng overdueOnly (query theo ngày)
  // để bắt cả hai, thay vì so trangThai === 'Quá hạn' làm filter luôn thiếu dòng.
  const isOverdueFilter = filterValues.trangThai === 'Quá hạn';

  const { data: warehousesData } = useWarehouses();
  const warehouseOptions = useMemo(() => {
    const raw = (warehousesData as any)?.data ?? warehousesData;
    const list = Array.isArray(raw) ? raw : [];
    return list.map((w: any) => ({ value: w.id, label: `${w.tenKho} (${w.maKho})` }));
  }, [warehousesData]);

  const dateRangeInvalid = !!(filterValues.fromNgay && filterValues.toNgay && filterValues.fromNgay > filterValues.toNgay);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await inboundPlanService.getAll({
        search: filterValues._search || undefined,
        trangThai: isOverdueFilter ? undefined : (filterValues.trangThai || undefined),
        overdueOnly: isOverdueFilter || undefined,
        warehouseId: filterValues.warehouseId || undefined,
        fromNgay: filterValues.fromNgay || undefined,
        toNgay: filterValues.toNgay || undefined,
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
      setLoadError(e?.response?.data?.message || e?.message || 'Không tải được danh sách kế hoạch nhập kho');
    } finally { setLoading(false); }
  }, [filterValues._search, filterValues.trangThai, filterValues.warehouseId, filterValues.fromNgay, filterValues.toNgay, isOverdueFilter, currentPage, sortKey, sortDir]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);
  // page reset handled via URL: when filter changes, effect below resets page
  useEffect(() => { /* filter->page reset: caller TableFilter resets via setFilterValues which keeps page; explicitly reset */ }, []);
  useEffect(() => {
    setCurrentPage((page) => Math.min(Math.max(1, page), Math.max(1, totalPages)));
  }, [totalPages]);

  const openPlanDetail = useCallback((p: InboundPlan) => {
    openUrlPlan(p.id);
    setSelectedDetailPlan(p);
  }, [openUrlPlan]);

  const closePlanDetail = useCallback(() => {
    closeUrlPlan();
    setSelectedDetailPlan(null);
  }, [closeUrlPlan]);

  // Deep-link / F5 / Back: ?inboundPlanId=xxx → open/close detail
  useEffect(() => {
    if (planSyncRef.current) { planSyncRef.current = false; return; }
    if (!urlPlanId) {
      if (selectedDetailPlan !== null) setSelectedDetailPlan(null);
      return;
    }
    if (selectedDetailPlan?.id === urlPlanId) return;
    const local = plans.find((x) => x.id === urlPlanId);
    if (local) { setSelectedDetailPlan(local); return; }
    // Not on current page (pagination/filter): fetch directly
    (async () => {
      const seq = ++detailSeqRef.current;
      try {
        const res = await inboundPlanService.getById(urlPlanId) as any;
        const fresh = res?.data?.data ?? res?.data ?? res;
        if (seq !== detailSeqRef.current) return;
        if (fresh?.id) setSelectedDetailPlan(fresh as InboundPlan);
      } catch { /* invalid id — leave closed, don't loop */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlPlanId, plans]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  const openEdit = (p: InboundPlan) => {
    setEditingPlan(p);
    setEditDate(p.ngayDuKien ? formatDateInAppTz(p.ngayDuKien) : '');
    setEditReason('');
  };

  const handleEditSave = async () => {
    if (!editingPlan) return;
    if (!editDate) { toast.error('Vui lòng chọn ngày hẹn mới'); return; }
    setSaving(true);
    try {
      await inboundPlanService.update(editingPlan.id, { ngayDuKien: editDate, lyDo: editReason || undefined });
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
      await inboundPlanService.cancel(cancelPlan.id, { lyDo: lyDoHuy });
      setCancelPlan(null);
      toast.success('Đã hủy kế hoạch nhập kho');
      fetchPlans();
    } catch (e: any) { toast.error(e.response?.data?.message || e.message || 'Lỗi hủy'); }
    finally { setCancelling(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-blue-600" /> Kế hoạch nhập kho
          <span className="ml-1 inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{total}</span>
        </h3>
      </div>

      <TableFilter
        filters={[
          { key: 'trangThai', label: 'Trạng thái', type: 'select', options: STATUS_FILTERS },
          { key: 'warehouseId', label: 'Kho đích', type: 'select', options: warehouseOptions },
          { key: 'fromNgay', label: 'Từ ngày hẹn', type: 'date' },
          { key: 'toNgay', label: 'Đến ngày hẹn', type: 'date' },
        ]}
        values={filterValues}
        onChange={setFilterValues}
        searchPlaceholder="Mã KH / YCMH..."
        dateRangeInvalid={dateRangeInvalid}
      />

      {loadError ? (
        <div className="flex items-center justify-between gap-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <span className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" /> {loadError}</span>
          <button onClick={fetchPlans} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs hover:bg-red-700 flex-shrink-0">
            <RefreshCw className="w-3 h-3" /> Thử lại
          </button>
        </div>
      ) : loading ? <div className="text-sm text-gray-400 py-8 text-center">Đang tải...</div> : plans.length === 0 ? (
        (() => {
          const hasActiveFilter = !!(filterValues._search || filterValues.trangThai || filterValues.warehouseId || filterValues.fromNgay || filterValues.toNgay);
          return hasActiveFilter ? (
            <div className="flex flex-col items-center gap-3 text-sm text-gray-500 py-8 text-center border border-dashed rounded-lg">
              <span>Không khớp bộ lọc</span>
              <button onClick={() => setFilterValues({ _search: '', trangThai: '', warehouseId: '', fromNgay: '', toNgay: '' })} className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-50">Xóa lọc</button>
            </div>
          ) : (
            <div className="text-sm text-gray-400 py-8 text-center border border-dashed rounded-lg">Chưa có kế hoạch nhập kho</div>
          );
        })()
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto bg-white rounded-lg border border-gray-200">
            <table className="w-full min-w-[900px] text-sm">
              <thead><tr className="bg-gray-50 border-b text-xs text-gray-500">
                <th scope="col" aria-sort={sortKey === 'maKeHoach' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-3 py-2 text-left">
                  <button type="button" aria-label="Sắp xếp theo mã kế hoạch" onClick={() => toggleSort('maKeHoach')} className="inline-flex items-center gap-1 hover:text-gray-700">Mã KH {sortIcon('maKeHoach')}</button>
                </th>
                <th scope="col" className="px-3 py-2 text-left">YCMH</th>
                <th scope="col" className="px-3 py-2 text-left">NCC</th>
                <th scope="col" className="px-3 py-2 text-left">Hàng hóa</th>
                <th scope="col" aria-sort={sortKey === 'ngayDuKien' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-3 py-2 text-left">
                  <button type="button" aria-label="Sắp xếp theo ngày hẹn" onClick={() => toggleSort('ngayDuKien')} className="inline-flex items-center gap-1 hover:text-gray-700">Ngày hẹn {sortIcon('ngayDuKien')}</button>
                </th>
                <th scope="col" className="px-3 py-2 text-left">Kho đích</th>
                <th scope="col" className="px-3 py-2 text-left">Trạng thái</th>
                <th scope="col" className="px-3 py-2 text-right">Thao tác</th>
              </tr></thead>
              <tbody>
                {plans.map((p) => {
                  const pr = p.purchaseRequest;
                  const ncc = (pr as any)?.supplier?.tenNhaCungCap || (pr as any)?.nhaCungCapId || '—';
                  const kho = p.warehouse?.tenKho || (pr as any)?.warehouse?.tenKho || '—';
                  const canEdit = !['Đã nhập', 'Đã hủy'].includes(p.trangThai);
                  const items = pr?.items ?? [];
                  const itemsSummary = items.length === 0 ? '—' : items
                    .map((it) => `${it.tenHangHoa} (${it.soLuong} ${it.donViTinh})`)
                    .join(', ');
                  return (
                    <tr
                      key={p.id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => openPlanDetail(p)}
                    >
                      <td className="px-3 py-2 font-mono text-xs font-medium">{p.maKeHoach}</td>
                      <td className="px-3 py-2 font-mono text-xs">{pr?.maYeuCau || '—'}</td>
                      <td className="px-3 py-2 text-xs truncate max-w-[160px]" title={ncc}>{ncc}</td>
                      <td className="px-3 py-2 text-xs truncate max-w-[220px]" title={itemsSummary}>{itemsSummary}</td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">{p.ngayDuKien ? new Date(p.ngayDuKien).toLocaleDateString('vi-VN') : '—'}</td>
                      <td className="px-3 py-2 text-xs">{kho}</td>
                      <td className="px-3 py-2"><span className="inline-flex items-center gap-1.5 flex-wrap">{statusBadge(p)}{auditBadge(p)}</span></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {canEdit && (
                            <button onClick={(e) => { e.stopPropagation(); setCreateFromPlan(p); }} title="Tạo phiếu nhập kho từ kế hoạch"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-600 text-white text-xs hover:bg-blue-700">
                              <ClipboardCheck className="w-3 h-3" /> Nhập kho
                            </button>
                          )}
                          {canEdit && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(p); }} title="Sửa ngày hẹn" aria-label={`Sửa ngày hẹn kế hoạch ${p.maKeHoach}`}
                              className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] p-1.5 rounded hover:bg-amber-50 text-amber-600"><Pencil className="w-4 h-4" /></button>
                          )}
                          {canEdit && (
                            <button type="button" onClick={(e) => { e.stopPropagation(); setCancelPlan(p); }} title="Hủy kế hoạch" aria-label={`Hủy kế hoạch ${p.maKeHoach}`}
                              className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] p-1.5 rounded hover:bg-red-50 text-red-600"><XCircle className="w-4 h-4" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {plans.map((p) => {
              const pr = p.purchaseRequest;
              const ncc = (pr as any)?.supplier?.tenNhaCungCap || (pr as any)?.nhaCungCapId || '—';
              const kho = p.warehouse?.tenKho || (pr as any)?.warehouse?.tenKho || '—';
              const canEdit = !['Đã nhập', 'Đã hủy'].includes(p.trangThai);
              const items = pr?.items ?? [];
              const itemsSummary = items.length === 0 ? '—' : items.map((it) => `${it.tenHangHoa} (${it.soLuong} ${it.donViTinh})`).join(', ');
              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openPlanDetail(p)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPlanDetail(p); } }}
                  className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm cursor-pointer hover:border-gray-300"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-gray-900">{p.maKeHoach}</span>
                    <span className="inline-flex items-center gap-1.5 flex-wrap justify-end">{statusBadge(p)}{auditBadge(p)}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">YCMH {pr?.maYeuCau || '—'} · NCC {ncc}</div>
                  <div className="mt-1 text-xs text-gray-500">Kho đích {kho} · Ngày hẹn {p.ngayDuKien ? new Date(p.ngayDuKien).toLocaleDateString('vi-VN') : '—'}</div>
                  <div className="mt-2 rounded border border-gray-100 bg-gray-50 px-2.5 py-2 text-xs text-gray-700 truncate" title={itemsSummary}>{itemsSummary}</div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {canEdit && (
                      <button onClick={(e) => { e.stopPropagation(); setCreateFromPlan(p); }} className="inline-flex items-center gap-1 rounded bg-blue-600 px-2.5 py-1 text-xs text-white hover:bg-blue-700"><ClipboardCheck className="w-3 h-3" /> Nhập kho</button>
                    )}
                    {canEdit && (
                      <button onClick={(e) => { e.stopPropagation(); openEdit(p); }} aria-label={`Sửa ngày hẹn kế hoạch ${p.maKeHoach}`} className="rounded border border-amber-200 px-2.5 py-1 text-xs text-amber-700">Sửa ngày hẹn</button>
                    )}
                    {canEdit && (
                      <button onClick={(e) => { e.stopPropagation(); setCancelPlan(p); }} aria-label={`Hủy kế hoạch ${p.maKeHoach}`} className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-700">Hủy</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loadError && !loading && totalPages > 1 && (
        <nav aria-label="Phân trang kế hoạch nhập" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-2">
          <span className="text-sm text-gray-600">
            Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, total)} / {total} kế hoạch
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <button type="button" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Trước</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
              .map((page, idx, arr) => (
                <React.Fragment key={page}>
                  {idx > 0 && arr[idx - 1] !== page - 1 && <span className="px-1 text-gray-400">...</span>}
                  <button type="button" aria-current={page === currentPage ? 'page' : undefined} aria-label={`Trang ${page}`} onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-sm rounded-md ${page === currentPage ? 'bg-blue-600 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}>
                    {page}
                  </button>
                </React.Fragment>
              ))}
            <button type="button" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">Sau</button>
          </div>
        </nav>
      )}

      {/* Edit date dialog */}
      <Modal isOpen={!!editingPlan} onClose={() => setEditingPlan(null)} showBackdrop closeOnBackdrop>
        <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-1rem)] max-w-md p-6" onClick={(e) => e.stopPropagation()}>
          <h3 className="font-semibold text-gray-900 mb-3">Sửa ngày hẹn — {editingPlan?.maKeHoach}</h3>
          <PlanLogHistory logs={editingPlan?.logs} />
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
      <CancelWithReasonModal
        isOpen={!!cancelPlan}
        onClose={() => setCancelPlan(null)}
        onConfirm={handleCancel}
        ticketLabel={`kế hoạch nhập ${cancelPlan?.maKeHoach ?? ''}`}
        description="Hành động này không thể hoàn tác."
        loading={cancelling}
      />

      {createFromPlan && (
        <CreateWarehouseReceiptModal
          isOpen={!!createFromPlan}
          inboundPlan={createFromPlan}
          onClose={() => setCreateFromPlan(null)}
          onSuccess={() => { setCreateFromPlan(null); fetchPlans(); }}
        />
      )}

      <InboundPlanDetailModal
        isOpen={!!selectedDetailPlan}
        onClose={closePlanDetail}
        plan={selectedDetailPlan}
        onCreateReceipt={(p) => { closePlanDetail(); setCreateFromPlan(p); }}
        onEdit={(p) => { closePlanDetail(); openEdit(p); }}
        onCancel={(p) => { closePlanDetail(); setCancelPlan(p); }}
      />
    </div>
  );
};

export default InboundPlanTab;
