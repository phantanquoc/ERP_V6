import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { useMachineStatusLogs, useMachineSystems } from '../hooks/useMachineSystemDetails';
import type { MachineStatus, MachineStatusLogFilters } from '../services/machineSystemService';

interface MachineStatusLogListProps {
  lockedMachineSystemId?: string;
  hideHeader?: boolean;
}

const STATUS_OPTIONS: { value: MachineStatus; label: string }[] = [
  { value: 'HOAT_DONG', label: 'Hoạt động' },
  { value: 'BAO_TRI', label: 'Bảo trì' },
  { value: 'NGUNG_HOAT_DONG', label: 'Ngừng hoạt động' },
];

const statusBadge = (status?: string | null) => {
  if (status === 'HOAT_DONG') return 'bg-green-100 text-green-700 border-green-200';
  if (status === 'BAO_TRI') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  if (status === 'NGUNG_HOAT_DONG') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-gray-100 text-gray-600 border-gray-200';
};

const statusLabel = (status?: string | null) => {
  if (status === 'HOAT_DONG') return 'Hoạt động';
  if (status === 'BAO_TRI') return 'Bảo trì';
  if (status === 'NGUNG_HOAT_DONG') return 'Ngừng hoạt động';
  return status ?? '—';
};

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const MachineStatusLogList = ({ lockedMachineSystemId, hideHeader }: MachineStatusLogListProps = {}) => {
  const [filters, setFilters] = useState<MachineStatusLogFilters>({
    page: 1,
    limit: 20,
    machineSystemId: lockedMachineSystemId,
  });

  useEffect(() => {
    if (lockedMachineSystemId) {
      setFilters((f) => ({ ...f, machineSystemId: lockedMachineSystemId, page: 1 }));
    }
  }, [lockedMachineSystemId]);

  const logsQuery = useMachineStatusLogs(filters);
  const systemsQuery = useMachineSystems({ page: 1, limit: 200, hoatDong: true, sortBy: 'maHeThong', sortOrder: 'asc' });

  const logs = logsQuery.data?.data ?? [];
  const pagination = logsQuery.data?.pagination;
  const systems = systemsQuery.data?.data ?? [];

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-3 lg:flex-row lg:items-center lg:justify-between">
          {!hideHeader && (
            <div>
              <h2 className="text-base font-semibold text-gray-900">Nhật ký trạng thái máy</h2>
              <p className="text-xs text-gray-500">Lịch sử cập nhật trạng thái của hệ thống máy.</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {!lockedMachineSystemId && (
              <select
                value={filters.machineSystemId ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, machineSystemId: e.target.value || undefined, page: 1 }))}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Tất cả máy</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>{s.maHeThong} — {s.tenHeThong}</option>
                ))}
              </select>
            )}
            <select
              value={filters.trangThaiMoi ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, trangThaiMoi: (e.target.value || undefined) as MachineStatus | undefined, page: 1 }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Tất cả trạng thái</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={filters.dateFrom ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined, page: 1 }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              title="Từ ngày"
            />
            <input
              type="date"
              value={filters.dateTo ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined, page: 1 }))}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              title="Đến ngày"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] border-collapse text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
              <tr>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[130px]">Máy</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[110px]">Trạng thái cũ</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[110px]">Trạng thái mới</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[160px]">Nguyên nhân</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[120px]">Người cập nhật</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[100px]">Ghi chú</th>
                <th className="border-b border-gray-200 px-3 py-2.5 text-left min-w-[130px]">Thời điểm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logsQuery.isLoading ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">Đang tải...</td></tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center">
                    <Activity className="mx-auto mb-2 h-10 w-10 text-gray-300" />
                    <p className="text-sm text-gray-400">Chưa có nhật ký trạng thái</p>
                  </td>
                </tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-xs font-medium text-blue-700">
                      {log.machineSystem?.maHeThong ?? '—'}
                    </span>
                    <span className="ml-1 text-xs text-gray-600">{log.machineSystem?.tenHeThong ?? ''}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    {log.trangThaiCu ? (
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(log.trangThaiCu)}`}>
                        {statusLabel(log.trangThaiCu)}
                      </span>
                    ) : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge(log.trangThaiMoi)}`}>
                      {statusLabel(log.trangThaiMoi)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-700">{log.nguyenNhan}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600">{log.nguoiCapNhat}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{log.ghiChu || '—'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{formatDateTime(log.thoiDiem)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-sm">
            <span className="text-gray-600">
              Trang {pagination.page}/{pagination.totalPages} — {pagination.total} dòng
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={(filters.page ?? 1) <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                className="rounded-md border border-gray-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={(filters.page ?? 1) >= pagination.totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                className="rounded-md border border-gray-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default MachineStatusLogList;
