import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';
import { AppNotification } from '../services/notificationService';
import MyNotificationsItem from './MyNotificationsItem';

const DAY_COLLAPSE_THRESHOLD = 5;

// ---- helpers -----------------------------------------------------------

function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const wd = weekdays[d.getDay()];
  return `${wd}, ${day}/${month}/${year}`;
}

function groupByDay(
  items: AppNotification[]
): { day: string; dayLabel: string; items: AppNotification[] }[] {
  const map = new Map<string, AppNotification[]>();
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

// ---- skeleton ----------------------------------------------------------

const SkeletonRow: React.FC = () => (
  <div className="flex items-start gap-3 px-4 py-3 animate-pulse border-b border-gray-100">
    <div className="w-8 h-8 rounded-lg bg-gray-200 flex-shrink-0" />
    <div className="flex-1 space-y-1.5 pt-0.5">
      <div className="h-3.5 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-100 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-1/2" />
    </div>
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

  return (
    <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-100">
      <button
        type="button"
        disabled={page <= 1}
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
        disabled={page >= totalPages}
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

interface MyNotificationsTimelineProps {
  items: AppNotification[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  onItemClick: (item: AppNotification, buttonEl?: HTMLButtonElement) => void;
  onDelete: (id: string) => void;
  onPageChange: (page: number) => void;
  hasActiveFilters: boolean;
  onExpandYear: () => void;
  onClearFilters: () => void;
}

const MyNotificationsTimeline: React.FC<MyNotificationsTimelineProps> = ({
  items,
  total,
  page,
  totalPages,
  isLoading,
  onItemClick,
  onDelete,
  onPageChange,
  hasActiveFilters,
  onExpandYear,
  onClearFilters,
}) => {
  // Per-day expansion state — resets when items reference changes
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    setExpandedDays(new Set());
  }, [items]);

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

  if (total === 0) {
    if (hasActiveFilters) {
      return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Inbox className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-700 text-sm font-semibold mb-1">
              Không có thông báo nào khớp bộ lọc
            </p>
            <p className="text-gray-400 text-xs mb-4">
              Thử mở rộng thời gian hoặc xóa bộ lọc
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={onExpandYear}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Mở rộng thời gian (1 năm)
              </button>
              <button
                type="button"
                onClick={onClearFilters}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <Inbox className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-700 text-sm font-semibold mb-1">
            Chưa có thông báo nào trong 30 ngày qua
          </p>
          <p className="text-gray-400 text-xs mb-4">
            Bạn chưa có thông báo nào được ghi nhận
          </p>
          <button
            type="button"
            onClick={onExpandYear}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Mở rộng 1 năm
          </button>
        </div>
      </div>
    );
  }

  const groups = groupByDay(items);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Total count header */}
      <div className="px-4 py-2.5 bg-gray-50/60 border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{total}</span> thông báo
        </span>
      </div>

      {/* Timeline body */}
      <div>
        {groups.map(({ day, dayLabel, items: dayItems }) => {
          const isExpanded = expandedDays.has(day);
          const collapsed = dayItems.length > DAY_COLLAPSE_THRESHOLD && !isExpanded;
          const visibleItems = collapsed ? dayItems.slice(0, DAY_COLLAPSE_THRESHOLD) : dayItems;
          const hiddenCount = dayItems.length - DAY_COLLAPSE_THRESHOLD;

          return (
            <section key={day} className="relative">
              {/* Sticky day header */}
              <div className="sticky top-0 z-[5] bg-white/95 backdrop-blur-sm px-4 py-2 flex items-center gap-3 border-b border-gray-100">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                  {dayLabel}
                </p>
                <span className="flex-1 h-px bg-gray-100" aria-hidden="true" />
                <span className="text-[11px] text-gray-400 whitespace-nowrap">
                  {dayItems.length} thông báo
                </span>
              </div>

              {/* Items */}
              <div>
                {visibleItems.map((item) => (
                  <MyNotificationsItem
                    key={item.id}
                    item={item}
                    onItemClick={onItemClick}
                    onDelete={onDelete}
                  />
                ))}
              </div>

              {/* Expand / collapse */}
              {dayItems.length > DAY_COLLAPSE_THRESHOLD && (
                <div className="pl-4 pr-4 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedDays((prev) => {
                        const next = new Set(prev);
                        if (next.has(day)) next.delete(day);
                        else next.add(day);
                        return next;
                      });
                    }}
                    aria-expanded={isExpanded}
                    className="text-xs text-blue-600 hover:text-blue-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1"
                  >
                    {isExpanded
                      ? 'Thu gọn'
                      : `Xem thêm ${hiddenCount} thông báo`}
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="px-4 pb-4 pt-2 border-t border-gray-100">
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    </div>
  );
};

export default MyNotificationsTimeline;
