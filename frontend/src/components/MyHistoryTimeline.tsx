import React from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { HistoryItem } from '../services/myHistoryService';
import MyHistoryItemRow from './MyHistoryItem';

// ---- helpers -----------------------------------------------------------
function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  // "Thứ X, DD/MM/YYYY"
  const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const wd = weekdays[d.getDay()];
  return `${wd}, ${day}/${month}/${year}`;
}

function groupByDay(items: HistoryItem[]): { day: string; dayLabel: string; items: HistoryItem[] }[] {
  const map = new Map<string, HistoryItem[]>();
  for (const item of items) {
    const dayKey = item.createdAt.substring(0, 10);
    if (!map.has(dayKey)) map.set(dayKey, []);
    map.get(dayKey)!.push(item);
  }
  return Array.from(map.entries()).map(([day, dayItems]) => ({
    day,
    dayLabel: formatDayHeader(day + 'T00:00:00'),
    items: dayItems,
  }));
}

// ---- loading skeleton --------------------------------------------------
const SkeletonRow: React.FC = () => (
  <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
    <div className="w-8 h-8 rounded-lg bg-gray-200 flex-shrink-0" />
    <div className="flex-1 space-y-1.5">
      <div className="h-3.5 bg-gray-200 rounded w-2/3" />
      <div className="h-3 bg-gray-100 rounded w-1/3" />
    </div>
    <div className="w-16 h-5 bg-gray-100 rounded-full" />
  </div>
);

// ---- pagination --------------------------------------------------------
interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-100">
      <button
        type="button"
        disabled={!canPrev}
        onClick={() => onPageChange(page - 1)}
        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Trang trước"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <span className="text-sm text-gray-600">
        Trang <span className="font-semibold text-gray-900">{page}</span> / {totalPages}
      </span>

      <button
        type="button"
        disabled={!canNext}
        onClick={() => onPageChange(page + 1)}
        className="p-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        aria-label="Trang sau"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

// ---- main component ----------------------------------------------------
interface MyHistoryTimelineProps {
  items: HistoryItem[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  onItemClick: (item: HistoryItem) => void;
  onPageChange: (page: number) => void;
}

const MyHistoryTimeline: React.FC<MyHistoryTimelineProps> = ({
  items,
  total,
  page,
  totalPages,
  isLoading,
  onItemClick,
  onPageChange,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <Inbox className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 text-sm font-medium">Không có hoạt động nào</p>
          <p className="text-gray-400 text-xs mt-1">Thử thay đổi bộ lọc hoặc khoảng thời gian</p>
        </div>
      </div>
    );
  }

  const groups = groupByDay(items);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* total count */}
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{total}</span> hoạt động
        </span>
      </div>

      <div className="divide-y divide-gray-50">
        {groups.map(({ day, dayLabel, items: dayItems }) => (
          <div key={day}>
            {/* Day header */}
            <div className="px-4 py-2 bg-gray-50/70 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500">{dayLabel}</p>
            </div>
            {/* Items for this day */}
            <div className="divide-y divide-gray-50">
              {dayItems.map((item) => (
                <MyHistoryItemRow
                  key={`${item.entityType}-${item.entityId}`}
                  item={item}
                  onClick={onItemClick}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-4">
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    </div>
  );
};

export default MyHistoryTimeline;
