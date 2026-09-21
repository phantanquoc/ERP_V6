import React, { useId } from 'react';
import { History, X } from 'lucide-react';
import Modal from '../Modal';

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
  const [expanded, setExpanded] = React.useState(false);
  const [showAllModal, setShowAllModal] = React.useState(false);
  const titleId = useId();
  if (!logs || logs.length === 0) return null;

  const visibleLimit = expanded ? logs.length : limit;
  const shown = logs.slice(0, visibleLimit);
  const hiddenCount = logs.length - shown.length;

  return (
    <>
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
        {hiddenCount > 0 && !expanded && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[11px] text-gray-400">…và {hiddenCount} thao tác cũ hơn</span>
            <button type="button" onClick={() => setExpanded(true)} className="rounded border border-gray-300 bg-white px-2 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50">Xem thêm ({hiddenCount})</button>
            {logs.length > limit + 3 && (
              <button type="button" onClick={() => setShowAllModal(true)} className="text-[11px] text-blue-600 hover:underline">Xem tất cả</button>
            )}
          </div>
        )}
        {expanded && logs.length > limit && (
          <div className="mt-2 flex items-center gap-2">
            <button type="button" onClick={() => setExpanded(false)} className="text-[11px] text-gray-500 hover:text-gray-700">Thu gọn</button>
            <button type="button" onClick={() => setShowAllModal(true)} className="text-[11px] text-blue-600 hover:underline">Xem tất cả trong modal</button>
          </div>
        )}
      </div>
      <Modal isOpen={showAllModal} onClose={() => setShowAllModal(false)} showBackdrop closeOnBackdrop ariaLabelledby={titleId}>
        <div className="max-h-[80vh] w-[calc(100vw-1rem)] max-w-lg overflow-auto rounded-lg bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-3 flex items-center justify-between">
            <h4 id={titleId} className="flex items-center gap-1.5 text-sm font-semibold text-gray-800"><History className="h-4 w-4" /> Lịch sử đầy đủ ({logs.length})</h4>
            <button type="button" onClick={() => setShowAllModal(false)} aria-label="Đóng lịch sử" className="inline-flex items-center justify-center min-h-[32px] min-w-[32px] rounded p-1 text-gray-400 hover:bg-gray-100"><X className="w-4 h-4" /></button>
          </div>
          <ul className="space-y-2">
            {logs.map((log) => {
              const cu = fmtDate(log.ngayCu);
              const moi = fmtDate(log.ngayMoi);
              return (
                <li key={log.id} className="border-l-2 border-gray-300 pl-2.5 text-xs">
                  <div className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className="font-medium text-gray-800">{log.hanhDong}</span>
                    {cu && moi && <span className="text-gray-500">{cu} → <strong className="font-medium text-gray-700">{moi}</strong></span>}
                  </div>
                  {log.lyDo && <div className="mt-0.5 text-gray-600">{log.lyDo}</div>}
                  <div className="mt-0.5 text-[11px] text-gray-400">{fmtDateTime(log.createdAt)}{log.nguoiThucHien ? ` · ${log.nguoiThucHien}` : ''}</div>
                </li>
              );
            })}
          </ul>
        </div>
      </Modal>
    </>
  );
};

export default PlanLogHistory;
