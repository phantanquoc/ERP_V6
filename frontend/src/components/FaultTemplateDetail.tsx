import { X } from 'lucide-react';
import Portal from './Portal';
import { useTemplateSummary } from '../hooks/useFaultTemplates';
import type { FaultTemplate } from '../services/faultTemplateService';

interface FaultTemplateDetailProps {
  template: FaultTemplate | null;
  onClose: () => void;
}

const severityBadge = (value: string) => {
  if (value === 'Nghiêm trọng') return 'bg-red-100 text-red-700 border-red-200';
  if (value === 'Trung bình') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-green-100 text-green-700 border-green-200';
};

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString('vi-VN') : '—';

const FaultTemplateDetail = ({ template, onClose }: FaultTemplateDetailProps) => {
  const summaryQuery = useTemplateSummary(template?.id ?? null);
  const summary = summaryQuery.data?.data;

  const isOpen = !!template;

  return (
    <Portal>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998] bg-black/30"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-[9999] flex w-full max-w-xl flex-col bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết mẫu lỗi"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {template?.tenMauLoi ?? '—'}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-blue-600">
              {template?.maMauLoi}
            </p>
          </div>
          <button
            type="button"
            title="Đóng"
            onClick={onClose}
            className="ml-4 rounded p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 text-sm">
          {summaryQuery.isLoading && (
            <p className="text-gray-400">Đang tải...</p>
          )}

          {summaryQuery.isError && (
            <p className="text-red-500">Không tải được dữ liệu tổng hợp.</p>
          )}

          {summary && (
            <>
              {/* Basic info */}
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Thông tin chung
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Mức độ</p>
                    <span
                      className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${severityBadge(summary.mucDo)}`}
                    >
                      {summary.mucDo}
                    </span>
                  </div>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-xs text-gray-500">Trạng thái</p>
                    <p className="mt-0.5 font-medium text-gray-800">
                      {summary.hoatDong ? summary.trangThai : 'Dừng'}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                    <p className="text-xs text-blue-600">Tổng lần xuất hiện</p>
                    <p className="mt-0.5 text-2xl font-bold text-blue-700">
                      {summary.totalRecords}
                    </p>
                  </div>
                </div>
                {summary.moTa && (
                  <p className="mt-2 text-gray-600">{summary.moTa}</p>
                )}
                {summary.ghiChu && (
                  <p className="mt-1 text-xs text-gray-400">{summary.ghiChu}</p>
                )}
              </section>

              {/* Monthly timeline — only show if there's at least one non-zero month */}
              {summary.monthlyTimeline.length > 0 && summary.monthlyTimeline.some((m) => m.count > 0) && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Theo tháng
                  </h3>
                  <div className="space-y-1">
                    {(() => {
                      const maxCount = Math.max(
                        ...summary.monthlyTimeline.map((m) => m.count),
                        1,
                      );
                      return summary.monthlyTimeline.map((m) => (
                        <div key={m.month} className="flex items-center gap-2">
                          <span className="w-16 shrink-0 text-right text-xs text-gray-500">
                            {m.month}
                          </span>
                          <div className="flex-1 rounded-full bg-gray-100">
                            <div
                              className="h-4 rounded-full bg-blue-400 transition-all"
                              style={{
                                width: `${Math.round((m.count / maxCount) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="w-5 shrink-0 text-right text-xs font-medium text-gray-700">
                            {m.count}
                          </span>
                        </div>
                      ));
                    })()}
                  </div>
                </section>
              )}

              {/* Recent records */}
              {summary.recentRecords.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    5 bản ghi gần nhất
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 text-gray-500">
                        <tr>
                          <th className="border-b px-3 py-2 text-left font-medium">
                            Mã
                          </th>
                          <th className="border-b px-3 py-2 text-left font-medium">
                            Tên lỗi
                          </th>
                          <th className="border-b px-3 py-2 text-left font-medium">
                            Mức độ
                          </th>
                          <th className="border-b px-3 py-2 text-left font-medium">
                            Ngày
                          </th>
                          <th className="border-b px-3 py-2 text-left font-medium">
                            Người PH
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {summary.recentRecords.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-blue-600">
                              {r.maLoi}
                            </td>
                            <td className="px-3 py-2 text-gray-800">
                              {r.tenLoi}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${severityBadge(r.mucDo)}`}
                              >
                                {r.mucDo}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-500">
                              {formatDate(r.ngayPhatHien)}
                            </td>
                            <td className="px-3 py-2 text-gray-500">
                              {r.nguoiPhatHien}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Repair steps — only show if steps exist */}
              {summary.repairSteps.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Các bước sửa chữa ({summary.repairSteps.length})
                </h3>
                  <ol className="space-y-2">
                    {summary.repairSteps.map((step, index) => (
                      <li
                        key={step.id}
                        className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600">
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-800">
                            {step.moTa}
                          </span>
                        </div>
                        <div className="ml-7 flex flex-wrap gap-3 text-xs text-gray-500">
                          {step.thoiGianUocTinh != null && (
                            <span>{step.thoiGianUocTinh} phút</span>
                          )}
                          {step.dungCu && <span>Dụng cụ: {step.dungCu}</span>}
                          {step.ghiChu && <span>{step.ghiChu}</span>}
                        </div>
                      </li>
                    ))}
                  </ol>
              </section>
              )}
            </>
          )}
        </div>
      </div>
    </Portal>
  );
};

export default FaultTemplateDetail;
