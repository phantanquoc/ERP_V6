import React, { useRef } from 'react';
import {
  AlertCircle,
  ClipboardList,
  CalendarDays,
  BarChart2,
  FileText,
  User,
  Users,
} from 'lucide-react';
import { HistoryItem } from '../services/myHistoryService';
import { GROUP_DOT_COLOR } from './myHistoryUtils';

// ---- group icon --------------------------------------------------------
const GROUP_ICON: Record<string, React.ReactNode> = {
  'Yêu cầu': <AlertCircle className="w-4 h-4" />,
  'Nhiệm vụ': <ClipboardList className="w-4 h-4" />,
  'Kế hoạch': <CalendarDays className="w-4 h-4" />,
  'Báo cáo': <BarChart2 className="w-4 h-4" />,
  'Phiếu': <FileText className="w-4 h-4" />,
};

const GROUP_COLOR: Record<string, string> = {
  'Yêu cầu': 'bg-white text-red-600 ring-1 ring-red-200',
  'Nhiệm vụ': 'bg-white text-blue-600 ring-1 ring-blue-200',
  'Kế hoạch': 'bg-white text-indigo-600 ring-1 ring-indigo-200',
  'Báo cáo': 'bg-white text-amber-700 ring-1 ring-amber-200',
  'Phiếu': 'bg-white text-green-600 ring-1 ring-green-200',
};

// ---- status pill -------------------------------------------------------
const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  IN_PROGRESS: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
  // VN codes
  CHO_DUYET: 'Chờ duyệt',
  DA_DUYET: 'Đã duyệt',
  HOAN_THANH: 'Hoàn thành',
  DA_HUY: 'Đã hủy',
  DANG_XU_LY: 'Đang xử lý',
  MOI_TAO: 'Mới tạo',
  TU_CHOI: 'Từ chối',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'text-yellow-700 border-yellow-300 bg-yellow-50/30',
  CHO_DUYET: 'text-yellow-700 border-yellow-300 bg-yellow-50/30',
  IN_PROGRESS: 'text-blue-700 border-blue-300 bg-blue-50/30',
  DANG_XU_LY: 'text-blue-700 border-blue-300 bg-blue-50/30',
  COMPLETED: 'text-green-700 border-green-300 bg-green-50/30',
  HOAN_THANH: 'text-green-700 border-green-300 bg-green-50/30',
  APPROVED: 'text-emerald-700 border-emerald-300 bg-emerald-50/30',
  DA_DUYET: 'text-emerald-700 border-emerald-300 bg-emerald-50/30',
  REJECTED: 'text-red-700 border-red-300 bg-red-50/30',
  TU_CHOI: 'text-red-700 border-red-300 bg-red-50/30',
  CANCELLED: 'text-gray-500 border-gray-200 bg-gray-50/30',
  DA_HUY: 'text-gray-500 border-gray-200 bg-gray-50/30',
  MOI_TAO: 'text-slate-600 border-slate-300 bg-slate-50/30',
};

// ---- date formatting ---------------------------------------------------
function formatTimeOnly(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatFullDateTime(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${h}:${m}`;
}

// ---- component ---------------------------------------------------------
interface MyHistoryItemProps {
  item: HistoryItem;
  onClick: (item: HistoryItem, buttonEl?: HTMLButtonElement) => void;
}

const MyHistoryItem: React.FC<MyHistoryItemProps> = ({ item, onClick }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const groupIcon = GROUP_ICON[item.group] ?? <FileText className="w-3.5 h-3.5" />;
  const groupColor = GROUP_COLOR[item.group] ?? 'bg-white text-gray-600 ring-1 ring-gray-200';
  const dotColor = GROUP_DOT_COLOR[item.group] ?? 'bg-gray-400';
  const statusLabel = item.status ? (STATUS_LABEL[item.status] ?? item.status) : null;
  const statusColor = item.status
    ? (STATUS_COLOR[item.status] ?? 'text-gray-500 border-gray-200 bg-gray-50/30')
    : '';

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => onClick(item, buttonRef.current ?? undefined)}
      title={formatFullDateTime(item.createdAt)}
      className="relative w-full text-left flex items-center gap-3 pl-24 pr-4 py-2.5 hover:bg-gray-50/70 transition-colors scroll-mt-16 focus:outline-none focus-visible:bg-blue-50/40 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
      style={{ scrollMarginTop: '4rem' }}
    >
      {/* Time on left of rail */}
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-mono tabular-nums text-gray-400 select-none">
        {formatTimeOnly(item.createdAt)}
      </span>

      {/* Rail dot — sits over the vertical rail line (rail itself rendered by Timeline wrapper) */}
      <span
        className={`absolute left-[4.5rem] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${dotColor} ring-2 ring-white shadow-sm`}
        aria-hidden="true"
      />

      {/* Outline group icon */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${groupColor}`}>
        {groupIcon}
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">{item.title}</span>
          {item.code && (
            <span className="flex-shrink-0 text-[11px] text-gray-400 font-mono">{item.code}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-500">{item.group}</span>
          {statusLabel && (
            <span className={`text-[11px] leading-none px-2 py-0.5 rounded-full border ${statusColor}`}>{statusLabel}</span>
          )}
        </div>
      </div>

      {/* Role badge only — time already on rail */}
      <div className={`flex-shrink-0 flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full ${
        item.role === 'creator'
          ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100'
          : 'bg-gray-50 text-gray-500 ring-1 ring-gray-100'
      }`}>
        {item.role === 'creator'
          ? <><User className="w-3 h-3" /> Tạo</>
          : <><Users className="w-3 h-3" /> Liên quan</>
        }
      </div>
    </button>
  );
};

export default MyHistoryItem;
