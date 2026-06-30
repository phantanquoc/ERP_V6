import React, { useState, useEffect, useRef, useId } from 'react';
import { Search, Filter, Loader2, X } from 'lucide-react';
import { MyNotificationsParams } from '../services/notificationService';
import { MyNotificationsStats } from '../services/notificationService';
import {
  NOTIFICATION_TYPE_GROUPS,
  detectDatePreset,
  getPresetDates,
  DatePreset,
} from './myNotificationsUtils';

// ---- debounce hook -------------------------------------------------------
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ---- component -----------------------------------------------------------

interface MyNotificationsFiltersProps {
  params: MyNotificationsParams;
  stats?: MyNotificationsStats;
  onChange: (params: MyNotificationsParams) => void;
  activeFilterCount?: number;
}

const MyNotificationsFilters: React.FC<MyNotificationsFiltersProps> = ({
  params,
  stats,
  onChange,
  activeFilterCount = 0,
}) => {
  const filterId = useId();
  const [customFrom, setCustomFrom] = useState(params.dateFrom ?? '');
  const [customTo, setCustomTo] = useState(params.dateTo ?? '');
  const [inputSearch, setInputSearch] = useState(params.search ?? '');
  const debouncedSearch = useDebouncedValue(inputSearch, 300);
  const isSearchPending = inputSearch !== debouncedSearch;
  const prevDebouncedRef = useRef(debouncedSearch);

  const activeTypes = params.types ?? [];
  const activePreset = detectDatePreset(params.dateFrom, params.dateTo);

  // Sync debounced search → params
  useEffect(() => {
    if (debouncedSearch === prevDebouncedRef.current) return;
    prevDebouncedRef.current = debouncedSearch;
    const trimmed = debouncedSearch.trim();
    onChange({ ...params, search: trimmed || undefined, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Keep inputSearch in sync when cleared externally
  useEffect(() => {
    setInputSearch(params.search ?? '');
  }, [params.search]);

  useEffect(() => {
    setCustomFrom(params.dateFrom ?? '');
    setCustomTo(params.dateTo ?? '');
  }, [params.dateFrom, params.dateTo]);

  // --- group helpers ---
  const isGroupActive = (group: typeof NOTIFICATION_TYPE_GROUPS[0]) =>
    group.types.length > 0 && group.types.every((t) => activeTypes.includes(t));

  const handleGroupToggle = (group: typeof NOTIFICATION_TYPE_GROUPS[0]) => {
    const active = isGroupActive(group);
    let next: string[];
    if (active) {
      next = activeTypes.filter((t) => !group.types.includes(t));
    } else {
      next = [...activeTypes, ...group.types.filter((t) => !activeTypes.includes(t))];
    }
    onChange({ ...params, types: next.length ? next : undefined, page: 1 });
  };

  const getGroupCount = (group: typeof NOTIFICATION_TYPE_GROUPS[0]): number => {
    if (!stats) return 0;
    return group.types.reduce((sum, t) => sum + (stats.byType[t] ?? 0), 0);
  };

  // --- preset helpers ---
  const handlePreset = (preset: DatePreset) => {
    if (preset === 'custom' || preset === 'none') return;
    const dates = getPresetDates(preset);
    onChange({ ...params, ...dates, page: 1 });
  };

  const handleCustomDate = (field: 'dateFrom' | 'dateTo', value: string) => {
    if (field === 'dateFrom') setCustomFrom(value);
    else setCustomTo(value);
    onChange({ ...params, [field]: value || undefined, page: 1 });
  };

  const handleSearchClear = () => {
    setInputSearch('');
    prevDebouncedRef.current = '';
    onChange({ ...params, search: undefined, page: 1 });
  };

  // --- read state ---
  type ReadFilter = 'all' | 'unread' | 'read';
  const activeReadFilter: ReadFilter =
    params.isRead === false ? 'unread' : params.isRead === true ? 'read' : 'all';

  const handleReadToggle = (value: ReadFilter) => {
    const next: boolean | undefined =
      value === 'unread' ? false : value === 'read' ? true : undefined;
    onChange({ ...params, isRead: next, page: 1 });
  };

  const DATE_PRESETS: { value: DatePreset; label: string }[] = [
    { value: 'today', label: 'Hôm nay' },
    { value: '7', label: '7 ngày' },
    { value: '30', label: '30 ngày' },
    { value: 'month', label: 'Tháng này' },
    { value: 'custom', label: 'Tùy chỉnh' },
  ];

  const filterPanel = (
    <div className="space-y-4">
      {/* Search */}
      <div>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {isSearchPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Search className="w-4 h-4" />}
          </div>
          <input
            type="text"
            value={inputSearch}
            onChange={(e) => {
              const v = e.target.value;
              setInputSearch(v);
              if (!v.trim()) {
                prevDebouncedRef.current = '';
                onChange({ ...params, search: undefined, page: 1 });
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Escape') handleSearchClear(); }}
            placeholder="Tìm kiếm tiêu đề, nội dung..."
            className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {inputSearch && (
            <button
              type="button"
              onClick={handleSearchClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Read state */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
          Trạng thái đọc
        </p>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden w-fit">
          {(
            [
              { value: 'all', label: 'Tất cả' },
              { value: 'unread', label: 'Chưa đọc' },
              { value: 'read', label: 'Đã đọc' },
            ] as { value: ReadFilter; label: string }[]
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleReadToggle(opt.value)}
              aria-pressed={activeReadFilter === opt.value}
              className={`px-3 py-1.5 text-xs transition-colors ${
                activeReadFilter === opt.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Date presets */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
          Khoảng thời gian
        </p>
        <div className="flex flex-wrap gap-2">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                if (p.value === 'custom') {
                  onChange({ ...params, page: 1 });
                } else {
                  handlePreset(p.value);
                }
              }}
              aria-pressed={activePreset === p.value}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                activePreset === p.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {activePreset === 'custom' && (
          <div className="flex gap-3 mt-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Từ ngày</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => handleCustomDate('dateFrom', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Đến ngày</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => handleCustomDate('dateTo', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Type group chips */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Nhóm</p>
        <div className="flex flex-wrap gap-2">
          {NOTIFICATION_TYPE_GROUPS.map((group) => {
            const active = isGroupActive(group);
            const count = getGroupCount(group);
            return (
              <button
                key={group.key}
                type="button"
                onClick={() => handleGroupToggle(group)}
                aria-pressed={active}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {group.label}
                {count > 0 && ` (${count})`}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sticky panel */}
      <div
        id={`${filterId}-desktop`}
        className="hidden md:block bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm p-4 sticky top-4 z-10"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
            <Filter className="w-4 h-4" />
            Bộ lọc
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-xs leading-none">
                {activeFilterCount}
              </span>
            )}
          </p>
        </div>
        {filterPanel}
      </div>

      {/* Mobile bottom-sheet drawer */}
      <MobileFilterDrawer
        activeFilterCount={activeFilterCount}
        filterPanel={filterPanel}
      />
    </>
  );
};

// ---- Mobile drawer component --------------------------------------------

interface MobileDrawerProps {
  activeFilterCount: number;
  filterPanel: React.ReactNode;
}

const MobileFilterDrawer: React.FC<MobileDrawerProps> = ({
  activeFilterCount,
  filterPanel,
}) => {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
    if (!open && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [open]);

  // Focus trap + Esc
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key !== 'Tab') return;
      const el = drawerRef.current;
      if (!el) return;
      const focusable = Array.from(
        el.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((n) => n.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const touchStartY = useRef<number | null>(null);

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-xl shadow-sm text-sm text-gray-700 w-full justify-center"
      >
        <Filter className="w-4 h-4" />
        Bộ lọc
        {activeFilterCount > 0 && (
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs">
            {activeFilterCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {open && (
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Bộ lọc thông báo"
          className="fixed inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-xl z-50"
        >
          <div
            className="flex items-center justify-between px-4 pt-4 pb-2 cursor-grab"
            onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; }}
            onTouchEnd={(e) => {
              if (touchStartY.current === null) return;
              if (e.changedTouches[0].clientY - touchStartY.current > 60) setOpen(false);
              touchStartY.current = null;
            }}
          >
            <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
            <span className="text-sm font-semibold text-gray-800">Bộ lọc</span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Đóng bộ lọc"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-4 pb-2 pt-2">{filterPanel}</div>

          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Áp dụng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyNotificationsFilters;
