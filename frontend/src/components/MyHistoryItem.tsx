import React from 'react';
import {
  AlertCircle,
  ClipboardList,
  CalendarDays,
  BarChart2,
  FileText,
  User,
  Users,
  ChevronRight,
} from 'lucide-react';
import { HistoryItem } from '../services/myHistoryService';

// ---- group icon --------------------------------------------------------
const GROUP_ICON: Record<string, React.ReactNode> = {
  'Yêu cầu': <AlertCircle className="w-4 h-4" />,
  'Nhiệm vụ': <ClipboardList className="w-4 h-4" />,
  'Kế hoạch': <CalendarDays className="w-4 h-4" />,
  'Báo cáo': <BarChart2 className="w-4 h-4" />,
  'Phiếu': <FileText className="w-4 h-4" />,
};

const GROUP_COLOR: Record<string, string> = {
  'Yêu cầu': 'bg-red-100 text-red-600',
  'Nhiệm vụ': 'bg-blue-100 text-blue-600',
  'Kế hoạch': 'bg-indigo-100 text-indigo-600',
  'Báo cáo': 'bg-amber-100 text-amber-700',
  'Phiếu': 'bg-green-100 text-green-600',
};

// ---- status pill -------------------------------------------------------
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  IN_PROGRESS: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border border-blue-200',
  COMPLETED: 'bg-green-50 text-green-700 border border-green-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 border border-red-200',
  CANCELLED: 'bg-gray-100 text-gray-500 border border-gray-200',
};

// ---- time formatting ---------------------------------------------------
function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// ---- component ---------------------------------------------------------
interface MyHistoryItemProps {
  item: HistoryItem;
  onClick: (item: HistoryItem) => void;
}

const MyHistoryItem: React.FC<MyHistoryItemProps> = ({ item, onClick }) => {
  const groupIcon = GROUP_ICON[item.group] ?? <FileText className="w-4 h-4" />;
  const groupColor = GROUP_COLOR[item.group] ?? 'bg-gray-100 text-gray-600';
  const statusLabel = item.status ? (STATUS_LABEL[item.status] ?? item.status) : null;
  const statusColor = item.status ? (STATUS_COLOR[item.status] ?? 'bg-gray-100 text-gray-500 border border-gray-200') : '';

  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group"
    >
      {/* Group icon badge */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${groupColor}`}>
        {groupIcon}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">{item.title}</span>
          {item.code && (
            <span className="flex-shrink-0 text-xs text-gray-400 font-mono">{item.code}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-500">{item.group}</span>
          {statusLabel && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${statusColor}`}>{statusLabel}</span>
          )}
        </div>
      </div>

      {/* Role badge + time */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
          item.role === 'creator'
            ? 'bg-blue-50 text-blue-600'
            : 'bg-gray-100 text-gray-500'
        }`}>
          {item.role === 'creator'
            ? <><User className="w-3 h-3" /> Tạo</>
            : <><Users className="w-3 h-3" /> Liên quan</>
          }
        </div>
        <span className="text-xs text-gray-400">{formatTime(item.createdAt)}</span>
      </div>

      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0" />
    </button>
  );
};

export default MyHistoryItem;
