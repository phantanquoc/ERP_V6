import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Ban, CheckCircle, Edit, Eye, History, Plus, Search, Trash2, Wrench, X } from 'lucide-react';
import { getFileUrl } from '../config/api';
import AcceptanceHandoverForm from './AcceptanceHandoverForm';
import Modal from './Modal';
import RepairRequestFormModal from './RepairRequestFormModal';
import ResponsiveRowActions from './ResponsiveRowActions';
import { useAuth } from '../contexts/AuthContext';
import { StatCard, CollapsibleSection, StatusBadge } from './shared';
import {
  useCancelRepair,
  useDeleteRepairRequest,
  useRepairRequests,
  useRepairRequestStats,
  useRepairStatusHistory,
  useStartRepair,
} from '../hooks/useRepairRequests';
import repairRequestService, {
  RepairRequest,
  STATUS_LABELS,
} from '../services/repairRequestService';

type ModalMode = 'create' | 'edit' | 'view';

const priorityBadge = (value: string) => {
  if (value === 'Khẩn cấp') return 'bg-red-100 text-red-700 border-red-200';
  if (value === 'Cao') return 'bg-orange-100 text-orange-700 border-orange-200';
  if (value === 'Trung bình') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-green-100 text-green-700 border-green-200';
};

// 8.1 Badge driven by STATUS_LABELS
const statusBadgeClass = (tone: 'gray' | 'blue' | 'green' | 'red') => {
  if (tone === 'green') return 'bg-green-100 text-green-700 border-green-200';
  if (tone === 'blue') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (tone === 'red') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';

interface RepairRequestListProps {
  lockedMachineSystemId?: string;
}

const RepairRequestList = ({ lockedMachineSystemId }: RepairRequestListProps = {}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [filters, setFilters] = useState({ page: 1, limit: lockedMachineSystemId ? 200 : 10, search: '', trangThai: '' });

  // 9.3: date range for stats dashboard (default last 90 days)
  const today = new Date().toISOString().split('T')[0];
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [statsDateFrom, setStatsDateFrom] = useState(ninetyDaysAgo);
  const [statsDateTo, setStatsDateTo] = useState(today);
  const statsQuery = useRepairRequestStats({
    dateFrom: statsDateFrom,
    dateTo: statsDateTo,
    machineSystemId: lockedMachineSystemId,
  });
  const stats = statsQuery.data?.data;

  useEffect(() => {
    if (lockedMachineSystemId) {
      setFilters((value) => ({ ...value, limit: 200, page: 1 }));
    }
  }, [lockedMachineSystemId]);

  const requestsQuery = useRepairRequests({
    page: filters.page,
    limit: filters.limit,
    search: filters.search || undefined,
    trangThai: (filters.trangThai as any) || undefined,
  });

  const deleteRequest = useDeleteRepairRequest();
  const startRepair = useStartRepair();
  const cancelRepair = useCancelRepair();

  const rawRequests = requestsQuery.data?.data ?? [];
  const requests = useMemo(() => {
    if (!lockedMachineSystemId) return rawRequests;
    return rawRequests.filter((request) =>
      request.items?.some((item) => item.machineSystemId === lockedMachineSystemId)
    );
  }, [rawRequests, lockedMachineSystemId]);
  const pagination = lockedMachineSystemId ? undefined : requestsQuery.data?.pagination;

  const [modal, setModal] = useState<{ mode: ModalMode; record?: RepairRequest } | null>(null);
  const [handoverRequest, setHandoverRequest] = useState<RepairRequest | null>(null);
  // 8.6 Status history drawer
  const [historyRequestId, setHistoryRequestId] = useState<number | null>(null);
  const statusHistoryQuery = useRepairStatusHistory(historyRequestId);
  // 8.5 Cancel reason prompt
  const [cancelTarget, setCancelTarget] = useState<RepairRequest | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const openModal = (mode: ModalMode, record?: RepairRequest) => {
    setModal({ mode, record });
  };

  // Auto-open view modal when ?repairRequestId= is in URL (deep-link from notifications)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const repairRequestId = searchParams.get('repairRequestId');
    if (!repairRequestId) return;
    let cancelled = false;
    repairRequestService
      .getById(repairRequestId)
      .then((res) => {
        if (cancelled) return;
        const record = res?.data;
        if (record && record.id) {
          openModal('view', record);
        }
        const next = new URLSearchParams(searchParams);
        next.delete('repairRequestId');
        setSearchParams(next, { replace: true });
      })
      .catch((err) => {
        console.error('Error loading repair request from URL:', err);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('repairRequestId')]);

  const remove = async (record: RepairRequest) => {
    if (!confirm(`Xóa yêu cầu ${record.maYeuCau}?`)) return;
    try {
      await deleteRequest.mutateAsync(record.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không xóa được yêu cầu');
    }
  };

  const exportExcel = async () => {
    try {
      await repairRequestService.exportExcel({ search: filters.search || undefined });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không xuất được Excel');
    }
  };

  // 8.4 Start repair with confirmation
  const handleStartRepair = async (record: RepairRequest) => {
    if (!confirm(`Bắt đầu sửa chữa cho yêu cầu ${record.maYeuCau}?`)) return;
    try {
      await startRepair.mutateAsync(record.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể bắt đầu sửa chữa');
    }
  };

  // 8.5 Cancel: show reason prompt then submit
  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelRepair.mutateAsync({ id: cancelTarget.id, reason: cancelReason || undefined });
      setCancelTarget(null);
      setCancelReason('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Không thể hủy yêu cầu');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Yêu cầu sửa chữa</h2>
          <p className="text-xs text-gray-500">Mỗi yêu cầu có thể gồm nhiều thiết bị lỗi, có hoặc không có liên kết máy.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportExcel} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Xuất Excel</button>
          <button type="button" onClick={() => openModal('create')} className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> Thêm mới</button>
        </div>
      </div>

      {/* 9.3–9.7: Stats dashboard */}
      {/* Date range control */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-gray-700">Từ:</span>
        <input
          type="date"
          value={statsDateFrom}
          max={statsDateTo}
          onChange={(e) => setStatsDateFrom(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <span className="font-medium text-gray-700">Đến:</span>
        <input
          type="date"
          value={statsDateTo}
          min={statsDateFrom}
          onChange={(e) => setStatsDateTo(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>

      {/* Error banner */}
      {statsQuery.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Không thể tải thống kê yêu cầu sửa chữa.
        </div>
      )}

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statsQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-white px-4 py-3 animate-pulse">
              <div className="h-3 w-20 rounded bg-gray-200 mb-2" />
              <div className="h-7 w-10 rounded bg-gray-200" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Tổng"
              value={stats?.total ?? null}
              delta={stats?.delta?.total}
              deltaLabel="vs kỳ trước"
              onClick={() => setFilters((f) => ({ ...f, trangThai: '', page: 1 }))}
              className={!filters.trangThai ? 'ring-2 ring-blue-400' : ''}
            />
            <StatCard
              label={STATUS_LABELS.CHO_XU_LY.label}
              value={stats?.byStatus?.['CHO_XU_LY'] ?? null}
              delta={stats?.delta?.byStatus?.['CHO_XU_LY']}
              onClick={() => setFilters((f) => ({ ...f, trangThai: 'CHO_XU_LY', page: 1 }))}
              className={filters.trangThai === 'CHO_XU_LY' ? 'ring-2 ring-blue-400' : ''}
            />
            <StatCard
              label={STATUS_LABELS.DANG_SUA_CHUA.label}
              value={stats?.byStatus?.['DANG_SUA_CHUA'] ?? null}
              delta={stats?.delta?.byStatus?.['DANG_SUA_CHUA']}
              onClick={() => setFilters((f) => ({ ...f, trangThai: 'DANG_SUA_CHUA', page: 1 }))}
              className={filters.trangThai === 'DANG_SUA_CHUA' ? 'ring-2 ring-blue-400' : ''}
            />
            <StatCard
              label={STATUS_LABELS.HOAN_THANH.label}
              value={stats?.byStatus?.['HOAN_THANH'] ?? null}
              delta={stats?.delta?.byStatus?.['HOAN_THANH']}
              deltaLabel={stats?.avgCompletionHours != null ? `Tb. ${Math.round(stats.avgCompletionHours)}h` : undefined}
              onClick={() => setFilters((f) => ({ ...f, trangThai: 'HOAN_THANH', page: 1 }))}
              className={filters.trangThai === 'HOAN_THANH' ? 'ring-2 ring-blue-400' : ''}
            />
          </>
        )}
      </div>

      {/* 4 collapsible sections */}
      <CollapsibleSection title="Máy hay yêu cầu sửa chữa nhất">
        {statsQuery.isLoading ? (
          <p className="text-sm text-gray-400">Đang tải...</p>
        ) : !stats || stats.topMachines.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có dữ liệu.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {stats.topMachines.map((m, i) => (
              <li key={m.machineSystemId ?? i} className="flex items-center justify-between">
                <span className="text-gray-700">{m.tenHeThong ?? m.machineSystemId ?? '—'}</span>
                <span className="font-medium text-gray-900">{m.count} lần</span>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Yêu cầu tái phát">
        {statsQuery.isLoading ? (
          <p className="text-sm text-gray-400">Đang tải...</p>
        ) : !stats || stats.recurringItems.length === 0 ? (
          <p className="text-sm text-gray-400">Không có mục tái phát trong 180 ngày qua.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {stats.recurringItems.map((r, i) => (
              <li key={r.machineSystemDetailId ?? i} className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-gray-700">{r.tenChiTiet ?? r.machineSystemDetailId ?? '—'}</span>
                  {r.latestMaYeuCau && (
                    <p className="text-[11px] text-gray-400">Mã mới nhất: {r.latestMaYeuCau}</p>
                  )}
                </div>
                <span className="shrink-0 font-medium text-gray-900">{r.count} lần</span>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Xu hướng theo tháng" defaultOpen>
        {statsQuery.isLoading ? (
          <p className="text-sm text-gray-400">Đang tải...</p>
        ) : !stats || stats.monthlyTrend.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có dữ liệu.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="py-1 text-left font-medium">Tháng</th>
                  <th className="py-1 text-right font-medium">Tổng</th>
                  <th className="py-1 text-right font-medium">Hoàn thành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.monthlyTrend.map((row) => (
                  <tr key={row.month}>
                    <td className="py-1 text-gray-700">{row.month}</td>
                    <td className="py-1 text-right text-gray-900 font-medium">{row.total}</td>
                    <td className="py-1 text-right text-green-700">{row.hoanThanh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>

      {/* 9.5: recentlyCreated rows open detail modal on click */}
      <CollapsibleSection title="Mới phát sinh">
        {statsQuery.isLoading ? (
          <p className="text-sm text-gray-400">Đang tải...</p>
        ) : !stats || stats.recentlyCreated.length === 0 ? (
          <p className="text-sm text-gray-400">Không có yêu cầu mới phát sinh.</p>
        ) : (
          <ul className="space-y-1">
            {stats.recentlyCreated.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    repairRequestService.getById(r.id).then((res) => {
                      if (res?.data) openModal('view', res.data);
                    }).catch(() => {/* no-op */});
                  }}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-medium text-gray-800">{r.maYeuCau}</span>
                    {r.tenHeThongThietBi && (
                      <span className="ml-2 text-xs text-gray-400">{r.tenHeThongThietBi}</span>
                    )}
                  </div>
                  <StatusBadge label={STATUS_LABELS[r.trangThai]?.label ?? r.trangThai} tone={STATUS_LABELS[r.trangThai]?.tone ?? 'gray'} size="sm" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-wrap gap-2 border-b border-gray-200 p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input value={filters.search} onChange={(event) => setFilters((value) => ({ ...value, search: event.target.value, page: 1 }))} placeholder="Tìm yêu cầu" className="w-56 rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm" />
          </div>
          <select value={filters.trangThai} onChange={(event) => setFilters((value) => ({ ...value, trangThai: event.target.value, page: 1 }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Tất cả trạng thái</option>
            {(Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>).map((key) => (
              <option key={key} value={key}>{STATUS_LABELS[key].label}</option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
              <tr>
                <th className="border-b px-3 py-2.5 text-left sticky left-0 bg-gray-50 z-10 min-w-[90px]">Mã yêu cầu</th>
                <th className="border-b px-3 py-2.5 text-left min-w-[80px]">Ngày</th>
                <th className="border-b px-3 py-2.5 text-left min-w-[140px]">Thiết bị lỗi</th>
                <th className="border-b px-3 py-2.5 text-left min-w-[140px]">Bối cảnh</th>
                <th className="border-b px-3 py-2.5 text-left min-w-[80px]">Ưu tiên</th>
                <th className="border-b px-3 py-2.5 text-left min-w-[90px]">Trạng thái</th>
                <th className="border-b px-3 py-2.5 text-left min-w-[50px]">File</th>
                <th className="border-b px-3 py-2.5 text-left min-w-[80px]">Nghiệm thu</th>
                <th className="border-b px-3 py-2.5 text-right sticky right-0 bg-gray-50 z-10 min-w-[120px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requestsQuery.isLoading ? (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400">Đang tải...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400">Chưa có yêu cầu sửa chữa.</td></tr>
              ) : requests.map((request) => {
                const requestItems = request.items?.length ? request.items : [{
                  id: `${request.id}-legacy`,
                  repairRequestId: request.id,
                  tenHeThong: request.tenHeThong ?? '',
                  tinhTrangThietBi: request.tinhTrangThietBi ?? '',
                  loaiLoi: request.loaiLoi ?? '',
                  noiDungLoi: request.noiDungLoi ?? '',
                }];
                return (
                  <tr key={request.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-2.5 sticky left-0 bg-white z-10 font-mono text-xs text-blue-700 font-medium">{request.maYeuCau}</td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs">{formatDate(request.ngayThang)}</td>
                    <td className="px-3 py-2.5 text-gray-900">
                      <div className="space-y-0.5">
                        {requestItems.map((item) => <div key={item.id} className="text-xs leading-tight">{item.tenHeThong || '—'}</div>)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">
                      <div className="space-y-0.5">
                        {requestItems.map((item) => (
                          <div key={item.id} className="text-xs leading-tight">
                            {item.machineSystemDetail ? `${item.machineSystemDetail.maChiTiet} - ${item.machineSystemDetail.tenChiTiet}` : item.machineSystem ? `${item.machineSystem.maHeThong} - ${item.machineSystem.tenHeThong}` : item.tinhTrangThietBi || 'Text'}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${priorityBadge(request.mucDoUuTien)}`}>{request.mucDoUuTien}</span></td>
                    <td className="px-3 py-2.5"><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(STATUS_LABELS[request.trangThai]?.tone ?? 'gray')}`}>{STATUS_LABELS[request.trangThai]?.label ?? request.trangThai}</span></td>
                    <td className="px-3 py-2.5">{request.fileDinhKem ? <a href={getFileUrl(request.fileDinhKem)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs">Xem</a> : '—'}</td>
                    <td className="px-3 py-2.5">
                      {(request.acceptanceHandovers?.length ?? 0) > 0 ? (
                        <span className="inline-flex items-center rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          {request.acceptanceHandovers!.length} NT
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          Chưa có
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 sticky right-0 bg-white z-10">
                      {(() => {
                        const isTerminal = request.trangThai === 'HOAN_THANH' || request.trangThai === 'DA_HUY';
                        // Primary CTA per state — the one action the user most likely wants.
                        let primary: { label: string; icon: JSX.Element; onClick: () => void; className: string };
                        if (request.trangThai === 'CHO_XU_LY') {
                          primary = {
                            label: 'Bắt đầu',
                            icon: <Wrench className="h-3.5 w-3.5" />,
                            onClick: () => handleStartRepair(request),
                            className: 'bg-blue-600 text-white hover:bg-blue-700',
                          };
                        } else if (request.trangThai === 'DANG_SUA_CHUA') {
                          primary = {
                            label: 'Nghiệm thu',
                            icon: <CheckCircle className="h-3.5 w-3.5" />,
                            onClick: () => setHandoverRequest(request),
                            className: 'bg-green-600 text-white hover:bg-green-700',
                          };
                        } else {
                          primary = {
                            label: 'Xem',
                            icon: <Eye className="h-3.5 w-3.5" />,
                            onClick: () => openModal('view', request),
                            className: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
                          };
                        }
                        const overflow = [
                          // Include "Xem" here only if it's NOT already the primary CTA.
                          ...(isTerminal
                            ? []
                            : [{ key: 'view', label: 'Xem chi tiết', icon: <Eye className="h-4 w-4" />, onClick: () => openModal('view', request), tone: 'primary' as const }]),
                          ...(!isTerminal
                            ? [{ key: 'edit', label: 'Sửa', icon: <Edit className="h-4 w-4" />, onClick: () => openModal('edit', request), tone: 'default' as const }]
                            : []),
                          { key: 'history', label: 'Lịch sử trạng thái', icon: <History className="h-4 w-4" />, onClick: () => setHistoryRequestId(request.id), tone: 'default' as const },
                          ...(!isTerminal
                            ? [{ key: 'cancel', label: 'Hủy yêu cầu', icon: <Ban className="h-4 w-4" />, onClick: () => { setCancelTarget(request); setCancelReason(''); }, tone: 'danger' as const }]
                            : []),
                          ...(isAdmin
                            ? [{ key: 'delete', label: 'Xóa', icon: <Trash2 className="h-4 w-4" />, onClick: () => remove(request), tone: 'danger' as const }]
                            : []),
                        ];
                        return (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={primary.onClick}
                              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium shadow-sm transition-colors ${primary.className}`}
                            >
                              {primary.icon}
                              {primary.label}
                            </button>
                            <ResponsiveRowActions actions={overflow} menuLabel="Thêm" alwaysMenu />
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-sm">
            <span className="text-gray-600">Trang {pagination.page}/{pagination.totalPages} - {pagination.total} dòng</span>
            <div className="flex gap-1">
              <button disabled={filters.page <= 1} onClick={() => setFilters((value) => ({ ...value, page: value.page - 1 }))} className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40">Trước</button>
              <button disabled={filters.page >= pagination.totalPages} onClick={() => setFilters((value) => ({ ...value, page: value.page + 1 }))} className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40">Sau</button>
            </div>
          </div>
        )}
      </section>

      <RepairRequestFormModal
        isOpen={!!modal}
        onClose={() => setModal(null)}
        mode={modal?.mode ?? 'create'}
        record={modal?.record}
        lockedMachineSystemId={lockedMachineSystemId}
        onSaved={() => setModal(null)}
      />

      {handoverRequest && (
        <AcceptanceHandoverForm
          repairRequest={handoverRequest}
          onClose={() => setHandoverRequest(null)}
          onSuccess={() => {
            setHandoverRequest(null);
            requestsQuery.refetch();
          }}
        />
      )}

      {/* 8.5 Cancel reason modal */}
      {cancelTarget && (
        <Modal isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} showBackdrop>
          <div className="flex w-full max-w-md flex-col rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-base font-semibold text-gray-900">Hủy yêu cầu {cancelTarget.maYeuCau}</h3>
              <button title="Đóng" onClick={() => setCancelTarget(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <label className="block space-y-1">
                <span className="font-medium text-gray-700">Lý do hủy (tùy chọn)</span>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Nhập lý do hủy..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setCancelTarget(null)} className="rounded-md border border-gray-300 px-4 py-2">Không</button>
                <button type="button" onClick={handleConfirmCancel} className="rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700">Xác nhận hủy</button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* 8.6 Status history drawer */}
      {historyRequestId && (
        <Modal isOpen={!!historyRequestId} onClose={() => setHistoryRequestId(null)} showBackdrop>
          <div className="flex w-full max-w-lg flex-col rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-base font-semibold text-gray-900">Lịch sử trạng thái</h3>
              <button title="Đóng" onClick={() => setHistoryRequestId(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4 text-sm">
              {statusHistoryQuery.isLoading && <p className="text-gray-400 text-center py-4">Đang tải...</p>}
              {statusHistoryQuery.isError && <p className="text-red-600 text-center py-4">Không tải được lịch sử.</p>}
              {statusHistoryQuery.data?.data?.length === 0 && <p className="text-gray-400 text-center py-4">Chưa có thay đổi trạng thái.</p>}
              <ol className="space-y-3">
                {statusHistoryQuery.data?.data?.map((log) => {
                  const oldLabel = STATUS_LABELS[log.oldStatus]?.label ?? log.oldStatus;
                  const newLabel = STATUS_LABELS[log.newStatus]?.label ?? log.newStatus;
                  const newTone = STATUS_LABELS[log.newStatus]?.tone ?? 'gray';
                  return (
                    <li key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={`mt-1 inline-flex h-2 w-2 rounded-full ${newTone === 'green' ? 'bg-green-500' : newTone === 'blue' ? 'bg-blue-500' : newTone === 'red' ? 'bg-red-500' : 'bg-gray-400'}`} />
                        <div className="mt-1 flex-1 w-px bg-gray-200" />
                      </div>
                      <div className="pb-3">
                        <p className="font-medium text-gray-800">{oldLabel} → <span className={`${statusBadgeClass(newTone)} inline-flex items-center rounded-full border px-2 py-0.5 text-xs`}>{newLabel}</span></p>
                        {log.reason && <p className="text-xs text-gray-500 mt-0.5">Lý do: {log.reason}</p>}
                        {log.actorName && <p className="text-xs text-gray-500">Bởi: {log.actorName} ({log.actorRole})</p>}
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(log.createdAt).toLocaleString('vi-VN')}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </Modal>
      )}

      {requestsQuery.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Không tải được danh sách yêu cầu sửa chữa.
        </div>
      )}
      {requests.length === 0 && !requestsQuery.isLoading && (
        <div className="hidden items-center gap-2 text-sm text-gray-500">
          <Wrench className="h-4 w-4" /> Chưa có dữ liệu.
        </div>
      )}
    </div>
  );
};

export default RepairRequestList;
