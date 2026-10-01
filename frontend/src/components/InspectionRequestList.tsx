import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Ban, CheckCheck, CheckCircle, Edit, History, Plus, Search, Trash2, X } from 'lucide-react';
import Modal from './Modal';
import RepairRequestFormModal, { StatusTimeline, type StatusHistoryEntry } from './RepairRequestFormModal';
import ResponsiveRowActions, { type RowAction } from './ResponsiveRowActions';
import { StatusBadge } from './shared/StatusBadge';
import { ErrorState } from '../design-system/States';
import { useAuth } from '../contexts/AuthContext';
import { isTechnicalUser, canDeleteTechnical } from '../utils/permissions';
import { UserRole } from '../types/auth';
import { useQueryClient } from '@tanstack/react-query';
import { useInspectionRequests, useInspectionStatusHistory, useDeleteInspectionRequest, useAcceptInspection, useCompleteInspection, useCancelInspection, inspectionKeys } from '../hooks/useInspectionRequests';
import { useDepartments } from '../hooks/useDepartments';
import inspectionRequestService, { InspectionRequest, INSPECTION_STATUS_LABELS } from '../services/inspectionRequestService';
import type { InspectionRequestStatus } from '../services/inspectionRequestService';
import type { RepairRequest } from '../services/repairRequestService';
import {
  KET_LUAN_TONE,
  PRIORITY_TONE,
  activeRepairs,
  canCancelInspection,
  canConfirmAcceptance,
  canDeleteRequest,
  canEditInspection,
  formatDateVN,
  formatKetLuan,
} from '../constants/repairRequest';

// Shared table cell styles (keep in sync with the other Technical tabs)
const TH = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap';
const TD = 'px-3 py-2.5 text-gray-700 align-top';
const STICKY_LEFT = 'sticky left-0 z-10 shadow-[1px_0_0_0_rgb(229_231_235)]';
const STICKY_RIGHT = 'sticky right-0 z-10 shadow-[-1px_0_0_0_rgb(229_231_235)]';
const PAGE_SIZES = [10, 20, 50] as const;

const VALID_STATUS = new Set(Object.keys(INSPECTION_STATUS_LABELS));
const parsePositive = (v: string | null, fallback: number, max = 100) => {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n >= 1 && n <= max ? n : fallback;
};
const parseFilters = (sp: URLSearchParams) => {
  const status = sp.get('status') ?? sp.get('trangThai') ?? '';
  return {
    page: parsePositive(sp.get('page'), 1, 100000),
    limit: parsePositive(sp.get('limit'), 10),
    search: sp.get('q') ?? sp.get('search') ?? '',
    trangThai: VALID_STATUS.has(status) ? status : '',
  };
};
type Filters = ReturnType<typeof parseFilters>;

type LegacyFields = { tenHeThong?: string | null };

/** Device names: items first, legacy record-level tenHeThong as fallback. */
const deviceNamesOf = (r: InspectionRequest): string[] => {
  const names = (r.items ?? []).map((it) => it.tenHeThong).filter(Boolean);
  if (names.length) return names;
  const legacy = (r as InspectionRequest & LegacyFields).tenHeThong;
  return legacy ? [legacy] : [];
};
/** Area comes from the linked machine system of each item (InspectionRequest has no khuVuc column). */
const areasOf = (r: InspectionRequest): string[] =>
  Array.from(new Set((r.items ?? []).map((it) => it.machineSystem?.khuVuc?.trim() ?? '').filter(Boolean)));

const SkeletonRows = ({ cols }: { cols: number }) => (
  <>
    {Array.from({ length: 6 }).map((_, i) => (
      <tr key={`sk-${i}`} aria-hidden="true">
        {Array.from({ length: cols }).map((__, j) => (
          <td key={j} className="px-3 py-3"><div className={`h-3.5 rounded bg-gray-200 animate-pulse ${j === 1 ? 'w-4/5' : 'w-2/3'}`} /></td>
        ))}
      </tr>
    ))}
  </>
);

export default function InspectionRequestList(_props: { lockedMachineSystemId?: string } = {}) {
  const { user } = useAuth();
  // Delete: ADMIN / Trưởng bộ phận Kỹ thuật only. Process: any Kỹ thuật member (primary or secondary), any role.
  const canDelete = canDeleteTechnical(user);
  const isTechnical = isTechnicalUser(user);
  const isAdmin = user?.role === UserRole.ADMIN;
  const userId = String(user?.id ?? user?._id ?? '');
  const queryClient = useQueryClient();
  const { data: departments = [] } = useDepartments();
  // phongBanId is stored either as a department id or (newer rows) as the department name — show text as stored
  const deptName = (value: string | null | undefined) => {
    if (!value) return '';
    const d = (departments as { id: string; name: string }[]).find((x) => x.id === value);
    return d?.name ?? value;
  };
  const [searchParams, setSearchParams] = useSearchParams();
  const detailSyncRef = useRef(false);
  const filterSyncRef = useRef(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filters, setFilters] = useState<Filters>(() => parseFilters(new URLSearchParams(window.location.search)));
  const [searchInput, setSearchInput] = useState(filters.search);
  const listQ = useInspectionRequests({ page: filters.page, limit: filters.limit, search: filters.search || undefined, trangThai: (filters.trangThai as InspectionRequestStatus) || undefined });
  const requests = useMemo(() => listQ.data?.data ?? [], [listQ.data]);
  const pagination = listQ.data?.pagination;
  const hasActiveFilter = !!filters.search || !!filters.trangThai;
  const [modal, setModal] = useState<{ mode: 'create' | 'edit' | 'view'; record?: InspectionRequest } | null>(null);
  const [historyId, setHistoryId] = useState<number | null>(null);
  const historyQ = useInspectionStatusHistory(historyId);
  const [cancelTarget, setCancelTarget] = useState<InspectionRequest | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const delMut = useDeleteInspectionRequest();
  const acceptMut = useAcceptInspection();
  const completeMut = useCompleteInspection();
  const cancelMut = useCancelInspection();

  // filters -> URL (replace, so F5 / shared links keep q/status/page/limit)
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const before = next.toString();
    next.delete('search');
    next.delete('trangThai');
    const put = (k: string, v: string, def = '') => { if (v && v !== def) next.set(k, v); else next.delete(k); };
    put('q', filters.search.trim());
    put('status', filters.trangThai);
    put('page', String(filters.page), '1');
    put('limit', String(filters.limit), '10');
    if (next.toString() === before) return;
    filterSyncRef.current = true;
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // URL -> filters (back/forward, pasted link)
  useEffect(() => {
    if (filterSyncRef.current) { filterSyncRef.current = false; return; }
    const parsed = parseFilters(searchParams);
    setFilters((f) => (f.page === parsed.page && f.limit === parsed.limit && f.search === parsed.search && f.trangThai === parsed.trangThai ? f : parsed));
    setSearchInput((s) => (s.trim() === parsed.search ? s : parsed.search));
  }, [searchParams]);

  const openModal = (mode: 'create' | 'edit' | 'view', record?: InspectionRequest) => {
    setModal({ mode, record });
    if (mode === 'view' && record?.id != null) {
      const next = new URLSearchParams(searchParams);
      next.set('inspectionId', String(record.id));
      next.delete('inspectionRequestId');
      next.delete('repairId');
      next.delete('repairRequestId');
      detailSyncRef.current = true;
      setSearchParams(next);
    }
    if (mode === 'create') {
      const next = new URLSearchParams(searchParams);
      next.set('create', 'inspection');
      detailSyncRef.current = true;
      setSearchParams(next);
    }
  };
  const closeModal = () => {
    const wasView = modal?.mode === 'view';
    const wasCreate = modal?.mode === 'create';
    setModal(null);
    if (wasView && (searchParams.has('inspectionId') || searchParams.has('inspectionRequestId'))) {
      const n = new URLSearchParams(searchParams);
      n.delete('inspectionId');
      n.delete('inspectionRequestId');
      detailSyncRef.current = true;
      setSearchParams(n, { replace: true });
    }
    if (wasCreate && searchParams.get('create') === 'inspection') {
      const n = new URLSearchParams(searchParams);
      n.delete('create');
      detailSyncRef.current = true;
      setSearchParams(n, { replace: true });
    }
  };

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const t = searchInput.trim();
      setFilters((f) => (f.search === t ? f : { ...f, search: t, page: 1 }));
    }, 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchInput]);

  const inspectionIdParam = searchParams.get('inspectionId') ?? searchParams.get('inspectionRequestId');
  const createParam = searchParams.get('create');
  useEffect(() => {
    if (detailSyncRef.current) { detailSyncRef.current = false; return; }
    if (createParam === 'inspection') { if (!modal || modal.mode !== 'create') setModal({ mode: 'create' }); }
    else if (modal?.mode === 'create') setModal(null);
    if (!inspectionIdParam) { if (modal?.mode === 'view') setModal(null); return; }
    if (modal?.mode === 'view' && String(modal.record?.id) === String(inspectionIdParam)) return;
    let cancelled = false;
    inspectionRequestService.getById(inspectionIdParam).then((res) => {
      if (cancelled) return;
      const rec = res?.data;
      if (rec?.id != null) setModal({ mode: 'view', record: rec });
    }).catch(() => { /* not found → no modal */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectionIdParam, createParam]);

  const remove = async (r: InspectionRequest) => {
    if (!confirm(`Xóa phiếu ${r.maYeuCau}?`)) return;
    try { await delMut.mutateAsync(r.id); toast.success('Đã xóa'); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không xóa được'); }
  };
  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelMut.mutateAsync({ id: cancelTarget.id, reason: cancelReason.trim() || undefined });
      toast.success('Đã hủy');
      setCancelTarget(null);
      setCancelReason('');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Không hủy được'); }
  };
  const exportExcel = () => {
    inspectionRequestService
      .exportExcel({ search: filters.search || undefined, trangThai: (filters.trangThai as InspectionRequestStatus) || undefined })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Lỗi xuất Excel'));
  };
  const clearFilters = () => { setSearchInput(''); setFilters((f) => ({ ...f, search: '', trangThai: '', page: 1 })); };

  // Hide columns that would be empty for the whole page
  const showArea = useMemo(() => requests.some((r) => areasOf(r).length > 0), [requests]);
  const showDept = useMemo(() => requests.some((r) => !!r.phongBanId), [requests]);
  const colCount = 7 + (showArea ? 1 : 0) + (showDept ? 1 : 0);

  const historyEntries = (historyQ.data?.data ?? []) as unknown as StatusHistoryEntry[];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Phiếu kiểm tra</h2>
          <p className="text-xs text-gray-500">Theo dõi yêu cầu kiểm tra thiết bị từ các bộ phận.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={exportExcel} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Xuất Excel</button>
          <button type="button" onClick={() => openModal('create')} className="inline-flex items-center gap-1.5 rounded-md bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-700"><Plus className="h-4 w-4" /> Thêm kiểm tra</button>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
            <input type="search" aria-label="Tìm phiếu kiểm tra" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Tìm mã, thiết bị, người yêu cầu..." className="w-56 rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm" />
          </div>
          <select aria-label="Lọc theo trạng thái" value={filters.trangThai} onChange={(e) => setFilters((v) => ({ ...v, trangThai: e.target.value, page: 1 }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Tất cả trạng thái</option>
            {Object.keys(INSPECTION_STATUS_LABELS).map((k) => <option key={k} value={k}>{INSPECTION_STATUS_LABELS[k as InspectionRequestStatus].label}</option>)}
          </select>
          {hasActiveFilter && <button type="button" onClick={clearFilters} className="text-xs font-medium text-blue-600 hover:underline">Xóa bộ lọc</button>}
        </div>

        {listQ.isError ? (
          <ErrorState message="Không tải được danh sách phiếu kiểm tra." onRetry={() => listQ.refetch()} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-20">
                <tr>
                  <th scope="col" className={`${TH} ${STICKY_LEFT} bg-gray-50`}>Mã</th>
                  <th scope="col" className={TH}>Trạng thái</th>
                  <th scope="col" className={TH}>Kết luận</th>
                  <th scope="col" className={TH}>Ưu tiên</th>
                  <th scope="col" className={TH}>Ngày</th>
                  <th scope="col" className={TH}>Thiết bị</th>
                  {showArea && <th scope="col" className={TH}>Khu vực</th>}
                  <th scope="col" className={TH}>Người yêu cầu</th>
                  {showDept && <th scope="col" className={TH}>Bộ phận</th>}
                  <th scope="col" className={`${TH} ${STICKY_RIGHT} bg-gray-50 text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {listQ.isLoading ? <SkeletonRows cols={colCount + 1} /> : requests.length === 0 ? (
                  <tr>
                    <td colSpan={colCount + 1} className="px-3 py-10 text-center">
                      <p className="text-sm font-medium text-gray-600">{hasActiveFilter ? 'Không tìm thấy phiếu phù hợp bộ lọc' : 'Chưa có phiếu kiểm tra'}</p>
                      {hasActiveFilter && <button type="button" onClick={clearFilters} className="mt-2 text-xs font-medium text-blue-600 hover:underline">Xóa bộ lọc</button>}
                    </td>
                  </tr>
                ) : requests.map((r) => {
                  const s = r.trangThai;
                  const gate = { isTechnical, isAdmin, isOwner: !!userId && r.createdById === userId };
                  const canEdit = canEditInspection(s, gate);
                  const canCancel = canCancelInspection(s, gate);
                  const canConfirm = s === 'CHO_NGHIEM_THU' && canConfirmAcceptance(r.acceptanceHandovers, userId, isAdmin);
                  const ketLuan = r.ketLuan ?? null;
                  const devices = deviceNamesOf(r);
                  const deviceLabel = devices.length > 1 ? `${devices[0]} +${devices.length - 1}` : (devices[0] ?? '');
                  const areas = areasOf(r);
                  const dept = deptName(r.phongBanId);
                  const statusEntry = INSPECTION_STATUS_LABELS[s];
                  const stickyBg = 'bg-white group-hover:bg-cyan-50';
                  const actions: RowAction[] = [];
                  // No separate "Xem" button: row click and the focusable Mã button open the detail (same as Repairs)
                  if (s === 'CHO_XU_LY' && isTechnical) actions.push({ key: 'accept', label: 'Tiếp nhận', icon: <CheckCircle size={14} />, tone: 'primary', onClick: () => acceptMut.mutate(r.id, { onSuccess: () => toast.success('Đã tiếp nhận'), onError: (e) => toast.error(e instanceof Error ? e.message : 'Lỗi') }) });
                  // Confirmation belongs to the slip's designated confirmer (YCKT creator) or ADMIN — opens the detail with evidence
                  if (canConfirm) actions.push({ key: 'confirm', label: 'Xác nhận nghiệm thu', icon: <CheckCircle size={14} />, tone: 'success', onClick: () => openModal('view', r) });
                  if (s === 'DA_KIEM_TRA' && isTechnical && activeRepairs(r.repairRequests).length > 0) actions.push({ key: 'complete', label: 'Hoàn thành kiểm tra', icon: <CheckCheck size={14} />, tone: 'success', onClick: () => completeMut.mutate(r.id, { onSuccess: () => toast.success('Đã hoàn thành'), onError: (e) => toast.error(e instanceof Error ? e.message : 'Lỗi') }) });
                  if (canEdit) actions.push({ key: 'edit', label: 'Sửa', icon: <Edit size={14} />, tone: 'primary', onClick: () => openModal('edit', r) });
                  actions.push({ key: 'history', label: 'Lịch sử', icon: <History size={14} />, onClick: () => setHistoryId(r.id) });
                  if (canCancel) actions.push({ key: 'cancel', label: 'Hủy phiếu', icon: <Ban size={14} />, tone: 'warning', onClick: () => { setCancelTarget(r); setCancelReason(''); } });
                  if (canDeleteRequest(s, canDelete)) actions.push({ key: 'delete', label: 'Xóa', icon: <Trash2 size={14} />, tone: 'danger', onClick: () => remove(r) });
                  return (
                    <tr key={r.id} onClick={() => openModal('view', r)} className="group cursor-pointer transition-colors hover:bg-cyan-50">
                      <td className={`${TD} ${STICKY_LEFT} ${stickyBg} whitespace-nowrap`}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); openModal('view', r); }} className="font-mono text-xs font-medium text-cyan-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded">{r.maYeuCau}</button>
                      </td>
                      <td className={`${TD} whitespace-nowrap`}><StatusBadge label={statusEntry?.label ?? s} tone={statusEntry?.tone ?? 'gray'} size="sm" /></td>
                      <td className={`${TD} whitespace-nowrap`}>{ketLuan ? <StatusBadge label={formatKetLuan(ketLuan)} tone={KET_LUAN_TONE[ketLuan] ?? 'gray'} size="sm" /> : <span className="text-gray-400">—</span>}</td>
                      <td className={`${TD} whitespace-nowrap`}><StatusBadge label={r.mucDoUuTien || '—'} tone={PRIORITY_TONE[r.mucDoUuTien] ?? 'gray'} size="sm" /></td>
                      <td className={`${TD} whitespace-nowrap text-xs text-gray-600 tabular-nums`}>{formatDateVN(r.ngayThang)}</td>
                      <td className={`${TD} text-xs`}>{deviceLabel ? <p className="max-w-[220px] truncate" title={devices.join('\n')}>{deviceLabel}</p> : <span className="text-gray-400">—</span>}</td>
                      {showArea && <td className={`${TD} text-xs text-gray-600`}>{areas.length ? <p className="max-w-[140px] truncate" title={areas.join(', ')}>{areas.join(', ')}</p> : <span className="text-gray-400">—</span>}</td>}
                      <td className={`${TD} text-xs`}>{r.createdByName ? <p className="max-w-[150px] truncate" title={r.createdByName}>{r.createdByName}</p> : <span className="text-gray-400">—</span>}</td>
                      {showDept && <td className={`${TD} text-xs text-gray-600`}>{dept ? <p className="max-w-[150px] truncate" title={dept}>{dept}</p> : <span className="text-gray-400">—</span>}</td>}
                      <td className={`px-3 py-1.5 align-middle ${STICKY_RIGHT} ${stickyBg}`} onClick={(e) => e.stopPropagation()}>
                        <ResponsiveRowActions actions={actions} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.total > 0 && !listQ.isError && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-3 py-2 text-sm">
            <span className="text-gray-600">Trang {pagination.page}/{Math.max(1, pagination.totalPages)} - {pagination.total} dòng</span>
            <div className="flex items-center gap-2">
              <select aria-label="Số dòng mỗi trang" value={filters.limit} onChange={(e) => setFilters((v) => ({ ...v, limit: Number(e.target.value), page: 1 }))} className="rounded-md border border-gray-300 px-2 py-1 text-sm">
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}/trang</option>)}
              </select>
              <button type="button" disabled={filters.page <= 1} onClick={() => setFilters((v) => ({ ...v, page: v.page - 1 }))} className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40">Trước</button>
              <button type="button" disabled={filters.page >= pagination.totalPages} onClick={() => setFilters((v) => ({ ...v, page: v.page + 1 }))} className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40">Sau</button>
            </div>
          </div>
        )}
      </section>

      <RepairRequestFormModal
        isOpen={!!modal}
        onClose={closeModal}
        mode={modal?.mode ?? 'create'}
        record={modal?.record as unknown as RepairRequest}
        _source="inspection"
        lockedRequestType="KIEM_TRA"
        hideCodeField={false}
        onSaved={() => {
          // After create, reset filters so the new row is visible on page 1
          if (modal?.mode === 'create') { setSearchInput(''); setFilters((v) => ({ ...v, search: '', trangThai: '', page: 1 })); }
          queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
          closeModal();
        }}
        onEdit={() => { if (modal?.record) setModal({ mode: 'edit', record: modal.record }); }}
      />

      {historyId != null && (
        <Modal isOpen onClose={() => setHistoryId(null)} showBackdrop>
          <div className="w-full max-w-lg rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="font-semibold">Lịch sử trạng thái</h3>
              <button type="button" onClick={() => setHistoryId(null)} title="Đóng" aria-label="Đóng" className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4 text-sm">
              {historyQ.isError
                ? <p className="py-4 text-center text-red-600">Không tải được lịch sử.</p>
                : <StatusTimeline entries={historyEntries} isLoading={historyQ.isLoading} statusLabels={INSPECTION_STATUS_LABELS} />}
            </div>
          </div>
        </Modal>
      )}

      {cancelTarget && (
        <Modal isOpen onClose={() => setCancelTarget(null)} showBackdrop>
          <div className="w-full max-w-md rounded-lg bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 font-semibold">Hủy {cancelTarget.maYeuCau}</h3>
            <textarea rows={3} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Lý do..." aria-label="Lý do hủy" className="w-full rounded border px-3 py-2 text-sm" />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setCancelTarget(null)} className="rounded border px-3 py-1 text-sm">Không</button>
              <button type="button" onClick={handleCancel} className="rounded bg-red-600 px-3 py-1 text-sm text-white">Xác nhận hủy</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
