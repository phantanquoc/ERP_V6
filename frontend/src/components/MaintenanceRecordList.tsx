import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import maintenanceRecordService from '../services/maintenanceRecordService';
import toast from 'react-hot-toast';
import { Plus, Trash2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMaintenanceRecords, useDeleteMaintenanceRecord } from '../hooks/useMaintenanceRecords';
import { useMachineSystems } from '../hooks/useMachineSystemDetails';
import MaintenanceRecordForm from './MaintenanceRecordForm';
import { MaintenanceRecord } from '../services/maintenanceRecordService';
import { StatusBadge } from './shared/StatusBadge';
import ConfirmDialog from './common/ConfirmDialog';
import { ErrorState } from '../design-system/States';
import { useAuth } from '../contexts/AuthContext';
import { canDeleteTechnical } from '../utils/permissions';

type ModalMode = 'create' | 'edit' | 'view' | null;

// Shared table styles (keep in sync with the technical tabs table contract)
const TH_CLASS = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap';
const TD_CLASS = 'px-3 py-2.5 text-gray-700 align-top';
const STICKY_LEFT_SHADOW = 'shadow-[1px_0_0_0_rgb(229_231_235)]';
const STICKY_RIGHT_SHADOW = 'shadow-[-1px_0_0_0_rgb(229_231_235)]';
const CONTROL_CLASS = 'h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
const PAGER_BTN_CLASS = 'inline-flex items-center gap-1 h-8 px-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** Clamped text cell (max 2 lines) with full-text tooltip; renders "—" when empty. */
const TextCell = ({ value, className = '' }: { value: string | null | undefined; className?: string }) => {
  if (!value) return <span className="text-gray-400">—</span>;
  return (
    <div className={`line-clamp-2 break-words ${className}`} title={value}>
      {value}
    </div>
  );
};

// Namespaced URL params: plans and records (and MachineSystemList, which hosts both
// inside its drawer) must not share `page` / `q`.
const PAGE_PARAM = 'recPage';
const Q_PARAM = 'recQ';
const PAGE_SIZE = 10;
const COL_COUNT = 7;

interface MaintenanceRecordListProps {
  lockedMachineSystemId?: string;
}

const MaintenanceRecordList = ({ lockedMachineSystemId }: MaintenanceRecordListProps = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const syncingRef = useRef(false);
  const { user } = useAuth();
  const canDelete = canDeleteTechnical(user);
  const [pendingDelete, setPendingDelete] = useState<MaintenanceRecord | null>(null);
  const initPage = Math.max(1, Number(searchParams.get(PAGE_PARAM) ?? '1') || 1);
  const initSearch = searchParams.get(Q_PARAM) ?? '';
  const initLoai = searchParams.get('loai') ?? '';
  const initSystem = lockedMachineSystemId ?? (searchParams.get('machineSystemId') ?? '');
  const initRecordId = searchParams.get('recordId');
  void initRecordId;
  const [page, setPage] = useState(initPage);
  const [loaiFilter, setLoaiFilter] = useState(initLoai);
  const [systemFilter, setSystemFilter] = useState(initSystem);
  const [search, setSearch] = useState(initSearch);
  const [appliedSearch, setAppliedSearch] = useState(initSearch);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);

  useEffect(() => {
    if (lockedMachineSystemId) {
      setSystemFilter(lockedMachineSystemId);
      setPage(1);
    }
  }, [lockedMachineSystemId]);

  const updateParams = useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    syncingRef.current = true;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (search === appliedSearch) return;
    const t = setTimeout(() => {
      setAppliedSearch(search);
      setPage(1);
      updateParams({ [Q_PARAM]: search || null, [PAGE_PARAM]: null });
    }, 400);
    return () => clearTimeout(t);
  }, [search, appliedSearch, updateParams]);

  useEffect(() => {
    if (syncingRef.current) { syncingRef.current = false; return; }
    const p = Math.max(1, Number(searchParams.get(PAGE_PARAM) ?? '1') || 1);
    const q = searchParams.get(Q_PARAM) ?? '';
    const loai = searchParams.get('loai') ?? '';
    const msId = searchParams.get('machineSystemId') ?? '';
    if (p !== page) setPage(p);
    if (q !== appliedSearch) { setAppliedSearch(q); setSearch(q); }
    if (loai !== loaiFilter) setLoaiFilter(loai);
    if (!lockedMachineSystemId && msId !== systemFilter) setSystemFilter(msId);
  }, [searchParams]);

  const filters = useMemo(() => ({
    page,
    limit: PAGE_SIZE,
    ...(loaiFilter && { loai: loaiFilter }),
    ...(systemFilter && { machineSystemId: systemFilter }),
    ...(appliedSearch && { search: appliedSearch }),
  }), [page, loaiFilter, systemFilter, appliedSearch]);

  const { data: recordsResponse, isLoading, isError, refetch } = useMaintenanceRecords(filters);
  const { data: systemsResponse } = useMachineSystems({ page: 1, limit: 200, hoatDong: true });
  const deleteRecord = useDeleteMaintenanceRecord();

  const records = recordsResponse?.data ?? [];
  const pagination = recordsResponse?.pagination;
  const systems = systemsResponse?.data ?? [];

  useEffect(() => {
    const recordId = searchParams.get('recordId');
    if (!recordId) return;
    if (selectedRecord?.id === recordId) return;
    const found = records.find((r: MaintenanceRecord) => r.id === recordId);
    if (found) { setSelectedRecord(found); setModalMode('view'); return; }
    let cancelled = false;
    maintenanceRecordService.getById(recordId).then((res: any) => {
      if (cancelled) return;
      const rec = res?.data ?? res;
      if (rec?.id) { setSelectedRecord(rec as MaintenanceRecord); setModalMode('view'); }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [searchParams.get('recordId'), records]);

  // Page beyond the last page (e.g. stale URL or last row deleted) → clamp to the last page
  useEffect(() => {
    if (!pagination || isLoading) return;
    const last = Math.max(1, pagination.totalPages || 1);
    if (page > last) {
      setPage(last);
      updateParams({ [PAGE_PARAM]: last > 1 ? String(last) : null });
    }
  }, [pagination, page, isLoading, updateParams]);

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteRecord.mutate(pendingDelete.id, {
      onSuccess: () => { toast.success('Đã xóa biên bản'); setPendingDelete(null); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Xóa biên bản thất bại'),
    });
  };


  const openView = (record: MaintenanceRecord) => {
    setSelectedRecord(record);
    setModalMode('view');
    updateParams({ recordId: record.id });
  };
  const closeRecordModal = () => {
    setModalMode(null);
    setSelectedRecord(null);
    if (searchParams.get('recordId')) updateParams({ recordId: null });
  };

  const selectedRecordId = searchParams.get('recordId');
  const hasFilters = !!(appliedSearch || loaiFilter || (!lockedMachineSystemId && systemFilter));
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center flex-wrap gap-2">
          <input
            type="search"
            placeholder="Tìm mã, nội dung, người TH..."
            aria-label="Tìm kiếm biên bản"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setAppliedSearch(search), setPage(1), updateParams({ [Q_PARAM]: search || null, [PAGE_PARAM]: null }))}
            className={`${CONTROL_CLASS} w-56`}
          />
          <select
            aria-label="Lọc theo loại biên bản"
            value={loaiFilter}
            onChange={(e) => { const v = e.target.value; setLoaiFilter(v); setPage(1); updateParams({ loai: v || null, [PAGE_PARAM]: null }); }}
            className={CONTROL_CLASS}
          >
            <option value="">Tất cả loại</option>
            <option value="Bảo dưỡng">Bảo dưỡng</option>
            <option value="Sửa chữa">Sửa chữa</option>
          </select>
          {!lockedMachineSystemId && (
            <select
              aria-label="Lọc theo hệ thống"
              value={systemFilter}
              onChange={(e) => { const v = e.target.value; setSystemFilter(v); setPage(1); updateParams({ machineSystemId: v || null, [PAGE_PARAM]: null }); }}
              className={`${CONTROL_CLASS} max-w-[16rem]`}
            >
              <option value="">Tất cả hệ thống</option>
              {systems.map((s: any) => (
                <option key={s.id} value={s.id}>{s.tenHeThong}</option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={() => { setSelectedRecord(null); setModalMode('create'); }}
          className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> Tạo biên bản
        </button>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-20">
              <tr>
                <th scope="col" className={`${TH_CLASS} sticky left-0 z-10 bg-gray-50 ${STICKY_LEFT_SHADOW}`}>Mã BB</th>
                <th scope="col" className={TH_CLASS}>Ngày</th>
                <th scope="col" className={TH_CLASS}>Loại</th>
                <th scope="col" className={TH_CLASS}>Thiết bị / Hệ thống</th>
                <th scope="col" className={TH_CLASS}>Nội dung</th>
                <th scope="col" className={TH_CLASS}>Người TH</th>
                <th scope="col" className={`${TH_CLASS} text-center sticky right-0 z-10 bg-gray-50 ${STICKY_RIGHT_SHADOW}`}>
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`sk-${i}`} aria-hidden="true">
                    {Array.from({ length: COL_COUNT }).map((__, j) => (
                      <td key={j} className="px-3 py-3">
                        <div className={`h-3 bg-gray-200 rounded animate-pulse ${j === 4 ? 'w-40' : 'w-16'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={COL_COUNT} className="px-3">
                    <ErrorState message="Không tải được danh sách biên bản." onRetry={() => { void refetch(); }} />
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={COL_COUNT} className="px-3 py-10 text-center text-sm text-gray-400">
                    {hasFilters
                      ? 'Không có biên bản nào khớp với bộ lọc hiện tại.'
                      : 'Chưa có biên bản bảo dưỡng / sửa chữa nào được lập.'}
                  </td>
                </tr>
              ) : (
                records.map((r: MaintenanceRecord) => {
                  const isSelected = selectedRecordId === r.id;
                  // Sticky cells need an opaque background matching the row state
                  const stickyBg = isSelected ? 'bg-blue-50' : 'bg-white group-hover:bg-gray-50';
                  const helpers = r.nguoiPhu ?? [];
                  return (
                    <tr
                      key={r.id}
                      onClick={() => openView(r)}
                      aria-selected={isSelected}
                      className={`group cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className={`${TD_CLASS} sticky left-0 z-10 whitespace-nowrap ${stickyBg} ${STICKY_LEFT_SHADOW} ${isSelected ? 'border-l-2 border-l-blue-600' : ''}`}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-900">{r.maBienBan}</span>
                          {r.sourceLogId && (
                            <span title="Biên bản tự sinh từ kế hoạch bảo dưỡng">
                              <StatusBadge label="Tự sinh" tone="gray" size="sm" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className={`${TD_CLASS} whitespace-nowrap tabular-nums`}>{formatDate(r.ngayThucHien)}</td>
                      <td className={`${TD_CLASS} whitespace-nowrap`}>
                        <StatusBadge label={r.loai} tone={r.loai === 'Bảo dưỡng' ? 'blue' : 'yellow'} />
                      </td>
                      <td className={TD_CLASS}>
                        <TextCell value={r.machineSystemDetail?.tenChiTiet} className="min-w-[8rem] max-w-[16rem]" />
                        {r.machineSystem?.tenHeThong && (
                          <div className="mt-0.5 text-xs text-gray-400 truncate max-w-[16rem]" title={r.machineSystem.tenHeThong}>
                            {r.machineSystem.tenHeThong}
                          </div>
                        )}
                      </td>
                      <td className={TD_CLASS}>
                        <TextCell value={r.noiDung} className="min-w-[9rem] max-w-[22rem]" />
                      </td>
                      <td className={`${TD_CLASS} whitespace-nowrap`}>
                        <div>{r.nguoiThucHien || <span className="text-gray-400">—</span>}</div>
                        {helpers.length > 0 && (
                          <div className="mt-0.5 text-xs text-gray-400" title={helpers.join(', ')}>
                            +{helpers.length} người phụ
                          </div>
                        )}
                      </td>
                      <td className={`${TD_CLASS} sticky right-0 z-10 ${stickyBg} ${STICKY_RIGHT_SHADOW}`}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openView(r); }}
                            title="Xem biên bản"
                            aria-label={`Xem biên bản ${r.maBienBan}`}
                            className="inline-flex items-center justify-center h-7 w-7 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            <Eye className="w-4 h-4" aria-hidden="true" />
                            <span className="sr-only">Xem</span>
                          </button>
                          {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setPendingDelete(r); }}
                            title="Xóa biên bản"
                            aria-label={`Xóa biên bản ${r.maBienBan}`}
                            className="inline-flex items-center justify-center h-7 w-7 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                            <span className="sr-only">Xóa</span>
                          </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {pagination && pagination.total > 0 && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-200 bg-gray-50 text-sm">
            <span className="text-gray-600">
              Tổng <span className="font-medium text-gray-900">{pagination.total}</span> dòng — Trang {page}/{totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => { const np = Math.max(1, page - 1); setPage(np); updateParams({ [PAGE_PARAM]: np > 1 ? String(np) : null }); }}
                disabled={page === 1}
                className={PAGER_BTN_CLASS}
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Trước
              </button>
              <button
                type="button"
                onClick={() => { const np = Math.min(totalPages, page + 1); setPage(np); updateParams({ [PAGE_PARAM]: String(np) }); }}
                disabled={page >= totalPages}
                className={PAGER_BTN_CLASS}
              >
                Sau <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalMode && (
        <MaintenanceRecordForm
          mode={modalMode === 'create' ? 'create' : modalMode === 'edit' ? 'edit' : 'view'}
          record={selectedRecord}
          systems={systems}
          onClose={closeRecordModal}
          lockedMachineSystemId={lockedMachineSystemId}
          onEdit={() => setModalMode('edit')}
        />
      )}

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc muốn xóa biên bản ${pendingDelete?.maBienBan ?? ''}? Thao tác này không thể hoàn tác.`}
        loading={deleteRecord.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

export default MaintenanceRecordList;
