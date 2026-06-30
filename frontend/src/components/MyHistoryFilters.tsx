import React, { useState, useEffect, useRef, useId } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { MyHistoryParams } from '../services/myHistoryService';
import {
  GROUP_TO_ENTITY_TYPES,
  STATUS_LABEL_TO_CODES,
  isStatusLabelActive,
  detectPreset,
  type DatePreset,
} from './myHistoryUtils';

/** Human-readable labels for entity types within sub-chips */
const ENTITY_TYPE_LABELS: Record<string, string> = {
  'quotation-request': 'Yêu cầu báo giá',
  'supply-request': 'Yêu cầu cung ứng',
  'purchase-request': 'Yêu cầu mua hàng',
  'leave-request': 'Yêu cầu nghỉ phép',
  'repair-request': 'Yêu cầu sửa chữa',
  'task': 'Nhiệm vụ',
  'work-plan': 'Kế hoạch công việc',
  'project': 'Dự án',
  'maintenance-plan': 'Kế hoạch bảo trì',
  'daily-work-report': 'Báo cáo công việc',
  'private-feedback': 'Phản hồi',
  'fault-record': 'Ghi nhận lỗi',
  'material-evaluation': 'Đánh giá nguyên liệu',
  'finished-product': 'Thành phẩm',
  'quality-evaluation': 'Đánh giá chất lượng',
  'production-report': 'Báo cáo sản xuất',
  'internal-inspection': 'Kiểm tra nội bộ',
  'customer-feedback': 'Phản hồi khách hàng',
  'tax-report': 'Báo cáo thuế',
  'warehouse-receipt': 'Phiếu nhập kho',
  'warehouse-issue': 'Phiếu xuất kho',
  'quotation': 'Báo giá',
  'maintenance-record': 'Phiếu bảo trì',
  'acceptance-handover': 'Biên bản nghiệm thu',
  'invoice': 'Hóa đơn',
};

const GROUP_OPTIONS: string[] = ['Yêu cầu', 'Nhiệm vụ', 'Kế hoạch', 'Báo cáo', 'Phiếu'];

/** All raw codes covered by the label map */
const KNOWN_CODES = new Set(STATUS_LABEL_TO_CODES.flatMap((s) => s.codes));

interface MyHistoryFiltersProps {
  params: MyHistoryParams;
  onChange: (params: MyHistoryParams) => void;
  /** Count of active non-default filters (used for mobile badge) */
  activeFilterCount?: number;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getPresetDates(preset: DatePreset): { dateFrom?: string; dateTo?: string } {
  if (preset === 'all') return {};
  if (preset === 'custom') return {};
  const days = parseInt(preset, 10);
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { dateFrom: toDateStr(from), dateTo: toDateStr(to) };
}

/** Tiny debounce hook — co-located here per design decision #5 */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const MyHistoryFilters: React.FC<MyHistoryFiltersProps> = ({ params, onChange, activeFilterCount = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [customFrom, setCustomFrom] = useState(params.dateFrom ?? '');
  const [customTo, setCustomTo] = useState(params.dateTo ?? '');

  // Controlled input value for search (raw, not yet committed to URL)
  const [inputSearch, setInputSearch] = useState(params.search ?? '');
  const debouncedSearch = useDebouncedValue(inputSearch, 300);
  const isSearchPending = inputSearch !== debouncedSearch;

  // Unique ids for aria-controls
  const filterId = useId();
  const getGroupSubChipsId = (group: string) => `${filterId}-group-${group.replace(/\s/g, '-')}`;

  // Sync debouncedSearch → params (skip if already in sync or if cleared)
  const prevDebouncedRef = useRef(debouncedSearch);
  useEffect(() => {
    if (debouncedSearch === prevDebouncedRef.current) return;
    prevDebouncedRef.current = debouncedSearch;
    const trimmed = debouncedSearch.trim();
    onChange({ ...params, search: trimmed || undefined, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Keep inputSearch in sync when params.search changes externally (e.g., URL chip removal)
  useEffect(() => {
    setInputSearch(params.search ?? '');
  }, [params.search]);

  const activePreset = detectPreset(params);
  const activeEntityTypes = params.types ?? [];
  const activeStatuses = params.statuses ?? [];
  const activeRole = params.roleFilter ?? 'both';

  // Group state helpers
  const isGroupActive = (group: string): boolean => {
    const types = GROUP_TO_ENTITY_TYPES[group] ?? [];
    return types.length > 0 && types.every((t) => activeEntityTypes.includes(t));
  };
  const isGroupPartial = (group: string): boolean => {
    const types = GROUP_TO_ENTITY_TYPES[group] ?? [];
    return types.some((t) => activeEntityTypes.includes(t)) && !isGroupActive(group);
  };

  const handlePreset = (preset: DatePreset) => {
    if (preset === 'custom') return; // handled by date inputs
    const dates = getPresetDates(preset);
    onChange({ ...params, ...dates, page: 1 });
  };

  const handleCustomDateChange = (field: 'dateFrom' | 'dateTo', value: string) => {
    if (field === 'dateFrom') setCustomFrom(value);
    else setCustomTo(value);
    onChange({ ...params, [field]: value || undefined, page: 1 });
  };

  const handleGroupToggle = (group: string) => {
    const groupTypes = GROUP_TO_ENTITY_TYPES[group] ?? [];
    const isActive = isGroupActive(group);
    let next: string[];
    if (isActive) {
      next = activeEntityTypes.filter((t) => !groupTypes.includes(t));
    } else {
      next = [...activeEntityTypes, ...groupTypes.filter((t) => !activeEntityTypes.includes(t))];
    }
    onChange({ ...params, types: next.length ? next : undefined, page: 1 });
  };

  const handleSubChipToggle = (entityType: string) => {
    const isSelected = activeEntityTypes.includes(entityType);
    const next = isSelected
      ? activeEntityTypes.filter((t) => t !== entityType)
      : [...activeEntityTypes, entityType];
    onChange({ ...params, types: next.length ? next : undefined, page: 1 });
  };

  const handleStatusChipToggle = (codes: string[]) => {
    const isActive = codes.some((c) => activeStatuses.includes(c));
    let next: string[];
    if (isActive) {
      next = activeStatuses.filter((s) => !codes.includes(s));
    } else {
      next = [...activeStatuses, ...codes.filter((c) => !activeStatuses.includes(c))];
    }
    onChange({ ...params, statuses: next.length ? next : undefined, page: 1 });
  };

  const handleRoleToggle = (role: 'created' | 'related' | 'both') => {
    onChange({ ...params, roleFilter: role === 'both' ? undefined : role, page: 1 });
  };

  const handleSearchClear = () => {
    setInputSearch('');
    // Clear immediately (no debounce)
    onChange({ ...params, search: undefined, page: 1 });
  };

  const toggleGroupExpanded = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  // Find raw status codes not covered by any label
  const unknownCodes = activeStatuses.filter((c) => !KNOWN_CODES.has(c));

  const filterPanel = (
    <div className="space-y-4 border-t border-gray-100 pt-4">
      {/* Date range presets */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Khoảng thời gian</p>
        <div className="flex flex-wrap gap-2">
          {([
            { value: '7', label: '7 ngày' },
            { value: '30', label: '30 ngày' },
            { value: '90', label: '90 ngày' },
            { value: '365', label: '1 năm' },
            { value: 'all', label: 'Tất cả' },
            { value: 'custom', label: 'Tùy chỉnh' },
          ] as { value: DatePreset; label: string }[]).map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => {
                if (p.value === 'custom') {
                  // just switch UI to show inputs; don't clear dates
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
                onChange={(e) => handleCustomDateChange('dateFrom', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Đến ngày</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => handleCustomDateChange('dateTo', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Group pills with expandable sub-chips */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Nhóm</p>
        <div className="space-y-2">
          {GROUP_OPTIONS.map((group) => {
            const active = isGroupActive(group);
            const partial = isGroupPartial(group);
            const isExpanded = expandedGroups.has(group);
            const subChipsId = getGroupSubChipsId(group);

            return (
              <div key={group}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleGroupToggle(group)}
                    aria-pressed={active ? 'true' : partial ? 'false' : 'false'}
                    className={`relative flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm transition-colors ${
                      active
                        ? 'bg-blue-50 border-blue-400 text-blue-700'
                        : partial
                        ? 'bg-blue-50/50 border-blue-200 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {partial && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" aria-hidden="true" />
                    )}
                    {group}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleGroupExpanded(group)}
                    aria-expanded={isExpanded}
                    aria-controls={subChipsId}
                    className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={isExpanded ? `Thu gọn nhóm ${group}` : `Mở rộng nhóm ${group}`}
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {/* Sub-chips */}
                <div
                  id={subChipsId}
                  className={`mt-1.5 ml-2 flex flex-wrap gap-1.5 ${isExpanded ? '' : 'hidden'}`}
                >
                  {(GROUP_TO_ENTITY_TYPES[group] ?? []).map((entityType) => {
                    const subActive = activeEntityTypes.includes(entityType);
                    return (
                      <button
                        key={entityType}
                        type="button"
                        onClick={() => handleSubChipToggle(entityType)}
                        aria-pressed={subActive}
                        className={`px-2.5 py-0.5 rounded-full text-xs border transition-colors ${
                          subActive
                            ? 'bg-blue-100 border-blue-400 text-blue-700'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {ENTITY_TYPE_LABELS[entityType] ?? entityType}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status chips */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Trạng thái</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_LABEL_TO_CODES.map(({ label, codes }) => {
            const active = isStatusLabelActive(codes, activeStatuses);
            return (
              <button
                key={label}
                type="button"
                onClick={() => handleStatusChipToggle(codes)}
                aria-pressed={active}
                className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                  active
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            );
          })}
          {/* Tail chips for unknown raw codes */}
          {unknownCodes.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => handleStatusChipToggle([code])}
              aria-pressed
              className="px-3 py-1 rounded-full text-sm border bg-gray-100 border-gray-300 text-gray-600"
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {/* Role toggle */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Vai trò của tôi</p>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden w-fit">
          {([
            { value: 'both', label: 'Tất cả' },
            { value: 'created', label: 'Người tạo' },
            { value: 'related', label: 'Liên quan' },
          ] as { value: 'both' | 'created' | 'related'; label: string }[]).map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => handleRoleToggle(r.value)}
              aria-pressed={activeRole === r.value}
              className={`px-3 py-1.5 text-xs transition-colors ${
                activeRole === r.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop filter bar — sticky, visible on md+ */}
      <div className="hidden md:block bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-sm p-4 sticky top-0 z-10">
        {/* Top row: search + expand toggle */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none">
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
                // Clear immediately if empty
                if (!v.trim()) {
                  prevDebouncedRef.current = '';
                  onChange({ ...params, search: undefined, page: 1 });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') handleSearchClear();
              }}
              placeholder="Tìm kiếm theo tiêu đề, mã..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={`${filterId}-panel`}
            className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-colors ${
              expanded
                ? 'bg-blue-50 border-blue-300 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Bộ lọc
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-xs leading-none">
                {activeFilterCount}
              </span>
            )}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
        {expanded && (
          <div id={`${filterId}-panel`}>
            {filterPanel}
          </div>
        )}
      </div>

      {/* Mobile: single "Bộ lọc" trigger button */}
      <MobileFilterDrawer
        params={params}
        onChange={onChange}
        activeFilterCount={activeFilterCount}
        filterPanel={filterPanel}
        inputSearch={inputSearch}
        setInputSearch={setInputSearch}
        isSearchPending={isSearchPending}
        handleSearchClear={handleSearchClear}
        onSearchChange={(v) => {
          setInputSearch(v);
          if (!v.trim()) {
            prevDebouncedRef.current = '';
            onChange({ ...params, search: undefined, page: 1 });
          }
        }}
        prevDebouncedRef={prevDebouncedRef}
      />
    </>
  );
};

// ---- Mobile bottom-sheet drawer ----------------------------------------
interface MobileDrawerProps {
  params: MyHistoryParams;
  onChange: (params: MyHistoryParams) => void;
  activeFilterCount: number;
  filterPanel: React.ReactNode;
  inputSearch: string;
  setInputSearch: React.Dispatch<React.SetStateAction<string>>;
  isSearchPending: boolean;
  handleSearchClear: () => void;
  onSearchChange: (v: string) => void;
  prevDebouncedRef: React.MutableRefObject<string>;
}

const MobileFilterDrawer: React.FC<MobileDrawerProps> = ({
  activeFilterCount,
  filterPanel,
  inputSearch,
  isSearchPending,
  handleSearchClear,
  onSearchChange,
}) => {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Focus close button when drawer opens
  useEffect(() => {
    if (open && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
    if (!open && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [open]);

  // Focus trap inside drawer
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
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
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Swipe-down to close (only on drawer header)
  const touchStartY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const delta = e.changedTouches[0].clientY - touchStartY.current;
    if (delta > 60) setOpen(false);
    touchStartY.current = null;
  };

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

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      {open && (
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Bộ lọc"
          className="fixed inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-xl z-50"
        >
          {/* Drawer handle / header — swipe target */}
          <div
            className="flex items-center justify-between px-4 pt-4 pb-2 cursor-grab"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
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
              ✕
            </button>
          </div>

          {/* Search inside drawer */}
          <div className="px-4 pb-2">
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none">
                {isSearchPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Search className="w-4 h-4" />}
              </div>
              <input
                type="text"
                value={inputSearch}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') handleSearchClear(); }}
                placeholder="Tìm kiếm theo tiêu đề, mã..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="px-4 pb-2">
            {filterPanel}
          </div>

          {/* Apply / close button */}
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

export default MyHistoryFilters;
