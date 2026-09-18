import React from 'react';
import { History } from 'lucide-react';

export interface PlanLogEntry {
  id: string;
  hanhDong: string;
  ngayCu?: string | null;
  ngayMoi?: string | null;
  lyDo?: string | null;
  nguoiThucHien?: string | null;
  createdAt: string;
}

interface PlanLogHistoryProps {
  logs?: PlanLogEntry[];
  /** Số dòng hiển thị tối đa — lịch sử dài không nên đẩy nút Lưu ra khỏi tầm nhìn. */
  limit?: number;
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.toLocaleDateString('vi-VN');
};

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

/**
 * Lịch sử thao tác của một kế hoạch nhập/xuất kho.
 *
 * Backend đã trả về `logs` kèm mỗi kế hoạch (đổi ngày hẹn có ngayCu/ngayMoi, hủy có lyDo)
 * nhưng trước đây UI không hiển thị ở đâu cả — người kho không có cách nào biết dòng này
 * đã bị dời hẹn mấy lần và vì sao.
 */
const PlanLogHistory: React.FC<PlanLogHistoryProps> = ({ logs, limit = 5 }) => {
  if (!logs || logs.length === 0) return null;

  const shown = logs.slice(0, limit);
  const hiddenCount = logs.length - shown.length;

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-600">
        <History className="h-3.5 w-3.5" />
        Lịch sử ({logs.length})
      </div>
      <ul className="space-y-2">
        {shown.map((log) => {
          const cu = fmtDate(log.ngayCu);
          const moi = fmtDate(log.ngayMoi);
          return (
            <li key={log.id} className="border-l-2 border-gray-300 pl-2.5 text-xs">
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="font-medium text-gray-800">{log.hanhDong}</span>
                {cu && moi && (
                  <span className="text-gray-500">{cu} → <strong className="font-medium text-gray-700">{moi}</strong></span>
                )}
              </div>
              {log.lyDo && <div className="mt-0.5 text-gray-600">{log.lyDo}</div>}
              <div className="mt-0.5 text-[11px] text-gray-400">
                {fmtDateTime(log.createdAt)}{log.nguoiThucHien ? ` · ${log.nguoiThucHien}` : ''}
              </div>
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 && (
        <div className="mt-2 text-[11px] text-gray-400">…và {hiddenCount} thao tác cũ hơn</div>
      )}
    </div>
  );
};

export default PlanLogHistory;
