import { useEffect } from 'react';
import { X } from 'lucide-react';
import Portal from './Portal';
import { useMachineSystemSummary } from '../hooks/useMachineSystemDetails';

interface MachineSummaryDrawerProps {
  machineSystemId: string | null;
  onClose: () => void;
}

const statusBadge = (status?: string | null) => {
  const map: Record<string, { label: string; cls: string }> = {
    HOAT_DONG: { label: 'Hoạt động', cls: 'bg-green-100 text-green-700' },
    BAO_TRI: { label: 'Bảo trì', cls: 'bg-yellow-100 text-yellow-700' },
    NGUNG_HOAT_DONG: { label: 'Ngừng HĐ', cls: 'bg-red-100 text-red-700' },
  };
  const cfg = (status && map[status]) || map.HOAT_DONG;
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>;
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('vi-VN') : '—';

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';

const SectionEmpty = () => <p className="text-xs text-gray-400">Không có</p>;

const MachineSummaryDrawer = ({ machineSystemId, onClose }: MachineSummaryDrawerProps) => {
  const { data: summaryResp, isLoading } = useMachineSystemSummary(machineSystemId ?? '', 10);
  const summary = summaryResp?.data;
  const isOpen = !!machineSystemId;

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[9999]" onClick={onClose}>
        <div className="absolute inset-0 bg-black/30" />
        <div
          className="absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Tổng quan hệ thống máy</h2>
              <button onClick={onClose} className="rounded p-1.5 text-gray-500 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
              {isLoading ? (
                <div className="py-8 text-center text-gray-500">Đang tải...</div>
              ) : !summary ? (
                <div className="py-8 text-center text-gray-500">Không tìm thấy dữ liệu</div>
              ) : (
                <>
                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-gray-700">Thông tin hệ thống</h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <dt className="text-gray-500">Mã hệ thống</dt>
                      <dd className="font-medium text-blue-700">{summary.machine.maHeThong}</dd>
                      <dt className="text-gray-500">Tên hệ thống</dt>
                      <dd className="font-medium text-gray-900">{summary.machine.tenHeThong}</dd>
                      <dt className="text-gray-500">Trạng thái</dt>
                      <dd>{statusBadge(summary.machine.trangThai)}</dd>
                      <dt className="text-gray-500">Khu vực</dt>
                      <dd className="text-gray-700">{summary.machine.khuVuc || '—'}</dd>
                      <dt className="text-gray-500">Vị trí</dt>
                      <dd className="text-gray-700">{summary.machine.viTri || '—'}</dd>
                    </dl>
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-gray-700">
                      Nhật ký trạng thái ({summary.statusLogs?.length ?? 0})
                    </h3>
                    {!summary.statusLogs?.length ? <SectionEmpty /> : (
                      <ul className="space-y-1.5">
                        {summary.statusLogs.map((log: any) => (
                          <li key={log.id} className="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                            <span className="font-medium text-gray-800">{log.trangThaiCu ?? '—'} → {log.trangThaiMoi}</span>
                            <span className="ml-2 text-gray-600">{log.nguyenNhan}</span>
                            <span className="ml-2 text-gray-400">{formatDateTime(log.thoiDiem)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-gray-700">
                      Lỗi gần nhất ({summary.faultRecords?.length ?? 0})
                    </h3>
                    {!summary.faultRecords?.length ? <SectionEmpty /> : (
                      <ul className="space-y-1.5">
                        {summary.faultRecords.map((f: any) => (
                          <li key={f.id} className="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                            <span className="font-medium text-gray-800">{f.maLoi ?? '—'}</span>
                            <span className="ml-2 text-gray-600">{f.tenLoi}</span>
                            <span className="ml-2 text-gray-400">{formatDate(f.ngayPhatHien)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-gray-700">
                      Yêu cầu sửa chữa ({summary.repairItems?.length ?? 0})
                    </h3>
                    {!summary.repairItems?.length ? <SectionEmpty /> : (
                      <ul className="space-y-1.5">
                        {summary.repairItems.map((r: any) => (
                          <li key={r.id} className="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                            <span className="font-medium text-gray-800">{r.repairRequest?.maYeuCau ?? '—'}</span>
                            <span className="ml-2 text-gray-600">{r.noiDungLoi}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-gray-700">
                      Nghiệm thu bàn giao ({summary.handoverItems?.length ?? 0})
                    </h3>
                    {!summary.handoverItems?.length ? <SectionEmpty /> : (
                      <ul className="space-y-1.5">
                        {summary.handoverItems.map((h: any) => (
                          <li key={h.id} className="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                            <span className="font-medium text-gray-800">{h.acceptanceHandover?.maNghiemThu ?? '—'}</span>
                            <span className="ml-2 text-gray-600">{h.tinhTrangSauSuaChua}</span>
                            <span className="ml-2 text-gray-400">{formatDate(h.acceptanceHandover?.ngayNghiemThu)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-gray-700">
                      Vận hành gần nhất ({summary.systemOperations?.length ?? 0})
                    </h3>
                    {!summary.systemOperations?.length ? <SectionEmpty /> : (
                      <ul className="space-y-1.5">
                        {summary.systemOperations.map((op: any) => (
                          <li key={op.id} className="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                            <span className="font-medium text-gray-800">{op.maChien}</span>
                            <span className="ml-2 text-gray-600">{op.trangThai}</span>
                            <span className="ml-2 text-gray-400">{formatDate(op.thoiGianChien)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <section>
                    <h3 className="mb-2 text-sm font-semibold text-gray-700">
                      Bảo dưỡng ({summary.maintenanceRecords?.length ?? 0})
                    </h3>
                    {!summary.maintenanceRecords?.length ? <SectionEmpty /> : (
                      <ul className="space-y-1.5">
                        {summary.maintenanceRecords.map((m: any) => (
                          <li key={m.id} className="rounded border border-gray-100 bg-gray-50 px-3 py-2 text-xs">
                            <span className="font-medium text-gray-800">{m.maKeHoach ?? '—'}</span>
                            <span className="ml-2 text-gray-600">{m.loaiBaoDuong}</span>
                            <span className="ml-2 text-gray-400">{formatDate(m.ngayThucHien)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default MachineSummaryDrawer;
