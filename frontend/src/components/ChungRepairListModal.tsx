import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import Modal from './Modal';
import RepairRequestFormModal from './RepairRequestFormModal';
import StatusBadge from './shared/StatusBadge';
import { LoadingState, ErrorState, EmptyState } from '../design-system/States';
import { useRepairRequests, useRepairRequest } from '../hooks/useRepairRequests';
import { formatDateVN } from '../constants/repairRequest';
import { STATUS_LABELS } from '../services/repairRequestService';
import type { RepairRequestStatus } from '../services/repairRequestService';

interface Props { isOpen: boolean; onClose: () => void; initialViewId?: number | null; onViewIdChange?: (id: number | null) => void; }

const ChungRepairListModal = ({ isOpen, onClose, initialViewId, onViewIdChange }: Props) => {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<RepairRequestStatus | ''>('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [viewId, setViewId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && initialViewId != null) setViewId(initialViewId);
    if (!isOpen) setViewId(null);
  }, [isOpen, initialViewId]);

  const setViewIdAndNotify = (id: number | null) => {
    setViewId(id);
    onViewIdChange?.(id);
  };

  const query = useRepairRequests(
    { search: q || undefined, trangThai: (status as RepairRequestStatus) || undefined, page, limit },
    { enabled: isOpen },
  );
  const rows = query.data?.data ?? [];
  const pagination = query.data?.pagination;
  const totalPages = pagination ? Math.ceil(pagination.total / limit) : 1;

  const detailQ = useRepairRequest(viewId);
  const detailRecord = (() => {
    const d = detailQ.data as unknown;
    if (d && typeof d === 'object' && 'data' in (d as Record<string, unknown>)) {
      const inner = (d as { data: unknown }).data;
      if (inner && typeof inner === 'object') return inner as never;
    }
    return (d as never) ?? undefined;
  })();
  const modalRecord = (detailRecord ?? rows.find((r: { id: number }) => r.id === viewId) ?? null) as never;

  const statuses: RepairRequestStatus[] = ['CHO_XU_LY','DA_TIEP_NHAN','LEN_KE_HOACH','DANG_SUA_CHUA','CHO_NGHIEM_THU','DA_NGHIEM_THU','HOAN_THANH','DA_HUY','TU_CHOI'];

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} className="max-w-5xl" ariaLabel="Theo dõi yêu cầu sửa chữa">
        <div className="bg-white rounded-xl w-full max-h-[85vh] flex flex-col">
          <div className="px-5 py-4 border-b flex items-center justify-between shrink-0">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Theo dõi yêu cầu sửa chữa</h2>
              <p className="text-xs text-gray-500 mt-0.5">Chỉ xem — không chỉnh sửa</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none px-2" aria-label="Đóng">×</button>
          </div>

          <div className="px-5 pt-3 pb-2 flex flex-col sm:flex-row gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Tìm theo mã, hệ thống..." className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={status} onChange={e => { setStatus(e.target.value as RepairRequestStatus | ''); setPage(1); }} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Tất cả trạng thái</option>
              {statuses.map(s => <option key={s} value={s}>{STATUS_LABELS[s]?.label ?? s}</option>)}
            </select>
          </div>

          <div className="flex-1 overflow-auto px-5 pb-3">
            {query.isLoading ? <LoadingState message="Đang tải..." /> :
             query.isError ? <ErrorState onRetry={() => query.refetch()} /> :
             rows.length === 0 ? <EmptyState message="Không có yêu cầu sửa chữa" /> : (
              <>
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-xs text-gray-500 border-b">
                      <th className="py-2 pr-2 font-medium">Mã</th>
                      <th className="py-2 pr-2 font-medium">Hệ thống</th>
                      <th className="py-2 pr-2 font-medium">Ngày</th>
                      <th className="py-2 pr-2 font-medium">Trạng thái</th>
                    </tr></thead>
                    <tbody>
                      {rows.map((r: { id: number; maYeuCau: string; trangThai: RepairRequestStatus; ngayThang: string; items?: { tenHeThong: string }[] }) => {
                        const meta = STATUS_LABELS[r.trangThai];
                        return (
                          <tr key={r.id} onClick={() => setViewIdAndNotify(r.id)} className="border-b hover:bg-gray-50 cursor-pointer">
                            <td className="py-2 pr-2 font-medium text-gray-900">{r.maYeuCau}</td>
                            <td className="py-2 pr-2 text-gray-600 truncate max-w-[200px]">{r.items?.[0]?.tenHeThong ?? '—'}</td>
                            <td className="py-2 pr-2 text-gray-600 whitespace-nowrap">{formatDateVN(r.ngayThang)}</td>
                            <td className="py-2 pr-2">{meta ? <StatusBadge label={meta.label} tone={meta.tone} size="sm" /> : r.trangThai}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="sm:hidden space-y-2">
                  {rows.map((r: { id: number; maYeuCau: string; trangThai: RepairRequestStatus; ngayThang: string; items?: { tenHeThong: string }[] }) => {
                    const meta = STATUS_LABELS[r.trangThai];
                    return (
                      <button key={r.id} onClick={() => setViewIdAndNotify(r.id)} className="w-full text-left p-3 rounded-lg border border-gray-200 bg-white">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm text-gray-900">{r.maYeuCau}</span>
                          {meta ? <StatusBadge label={meta.label} tone={meta.tone} size="sm" /> : <span className="text-xs">{r.trangThai}</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 truncate">{r.items?.[0]?.tenHeThong ?? '—'} · {formatDateVN(r.ngayThang)}</p>
                      </button>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Trước</button>
                    <span className="text-sm text-gray-500">{page} / {totalPages}{pagination ? ` · ${pagination.total}` : ''}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded text-sm disabled:opacity-40">Sau</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Modal>

      {viewId != null && (
        modalRecord ? (
          <RepairRequestFormModal
            isOpen={true}
            onClose={() => setViewIdAndNotify(null)}
            mode="view"
            record={modalRecord}
            _source="repair"
            readOnly
          />
        ) : detailQ.isLoading ? (
          <Modal isOpen={true} onClose={() => setViewId(null)} className="max-w-2xl" ariaLabel="Chi tiết yêu cầu sửa chữa">
            <div className="p-8"><LoadingState message="Đang tải chi tiết..." /></div>
          </Modal>
        ) : null
      )}
    </>
  );
};

export default ChungRepairListModal;
