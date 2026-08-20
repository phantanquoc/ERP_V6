import React, { useMemo, useRef, useCallback } from 'react';
import { History, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useMyHistory } from '../hooks/useMyHistory';
import { MyHistoryParams, HistoryItem } from '../services/myHistoryService';
import MyHistoryFilters from '../components/MyHistoryFilters';
import {
  GROUP_TO_ENTITY_TYPES,
  STATUS_LABEL_TO_CODES,
  isStatusLabelActive,
  detectPreset,
} from '../components/myHistoryUtils';
import MyHistoryTimeline from '../components/MyHistoryTimeline';
import MyHistoryDetailModal from '../components/MyHistoryDetailModal';

// ---- URL <-> MyHistoryParams adapter -----------------------------------

/** Returns today minus N days in YYYY-MM-DD */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateStr(d);
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns today minus 30 days (default range) */
function getDefaultDateFrom(): string {
  return daysAgo(30);
}

const GROUP_NAMES = Object.keys(GROUP_TO_ENTITY_TYPES);

/** Parse URLSearchParams → MyHistoryParams (with defaults injected). */
function parseParams(sp: URLSearchParams): MyHistoryParams {
  const params: MyHistoryParams = {};

  // dateFrom / dateTo
  const dateFrom = sp.get('dateFrom');
  const dateTo = sp.get('dateTo');
  params.dateFrom = dateFrom ?? getDefaultDateFrom();
  if (dateTo) params.dateTo = dateTo;

  // Expand shorthand `groups=<name>` back into individual types
  const groupNames = sp.getAll('groups');
  const rawTypes = sp.getAll('types');
  const expandedFromGroups = groupNames.flatMap((g) => GROUP_TO_ENTITY_TYPES[g] ?? []);
  const allTypes = [...expandedFromGroups, ...rawTypes.filter((t) => !expandedFromGroups.includes(t))];
  if (allTypes.length) params.types = allTypes;

  // statuses
  const statuses = sp.getAll('statuses');
  if (statuses.length) params.statuses = statuses;

  // roleFilter
  const role = sp.get('roleFilter');
  if (role === 'created' || role === 'related') params.roleFilter = role;

  // search
  const search = sp.get('search');
  if (search) params.search = search;

  // page / limit
  const page = sp.get('page');
  params.page = page ? parseInt(page, 10) : 1;
  const limit = sp.get('limit');
  params.limit = limit ? parseInt(limit, 10) : 20;

  return params;
}

/** Serialize MyHistoryParams → URLSearchParams (strip defaults). */
function serializeParams(params: MyHistoryParams): URLSearchParams {
  const sp = new URLSearchParams();

  // dateFrom — strip if it matches the 30-day default (± 1 day tolerance)
  const defaultFrom = getDefaultDateFrom();
  const isDefaultDateFrom =
    !params.dateFrom ||
    params.dateFrom === defaultFrom ||
    Math.abs(new Date(params.dateFrom).getTime() - new Date(defaultFrom).getTime()) <= 86400000;
  if (params.dateFrom && !isDefaultDateFrom) {
    sp.set('dateFrom', params.dateFrom);
  }
  if (params.dateTo) sp.set('dateTo', params.dateTo);

  // Collapse fully-selected groups to `groups=<name>`
  const types = params.types ?? [];
  const serializedGroups: string[] = [];
  const serializedTypes: string[] = [...types];
  for (const group of GROUP_NAMES) {
    const groupTypes = GROUP_TO_ENTITY_TYPES[group];
    if (groupTypes.every((t) => types.includes(t))) {
      serializedGroups.push(group);
      // Remove these types from the individual types list
      groupTypes.forEach((t) => {
        const idx = serializedTypes.indexOf(t);
        if (idx !== -1) serializedTypes.splice(idx, 1);
      });
    }
  }
  serializedGroups.forEach((g) => sp.append('groups', g));
  serializedTypes.forEach((t) => sp.append('types', t));

  // statuses
  (params.statuses ?? []).forEach((s) => sp.append('statuses', s));

  // roleFilter — strip default 'both'
  if (params.roleFilter && params.roleFilter !== 'both') {
    sp.set('roleFilter', params.roleFilter);
  }

  // search
  if (params.search) sp.set('search', params.search);

  // page — strip default 1
  if (params.page && params.page > 1) sp.set('page', String(params.page));

  // limit — strip default 20
  if (params.limit && params.limit !== 20) sp.set('limit', String(params.limit));

  return sp;
}

// ---- hasNonDefaultFilters helper ----------------------------------------
function hasNonDefaultFilters(params: MyHistoryParams): boolean {
  const defaultFrom = getDefaultDateFrom();
  const isDefaultDateFrom =
    !params.dateFrom ||
    params.dateFrom === defaultFrom ||
    Math.abs(new Date(params.dateFrom).getTime() - new Date(defaultFrom).getTime()) <= 86400000;

  if (!isDefaultDateFrom) return true;
  if (params.dateTo) return true;
  if (params.types && params.types.length > 0) return true;
  if (params.statuses && params.statuses.length > 0) return true;
  if (params.roleFilter && params.roleFilter !== 'both') return true;
  if (params.search) return true;
  return false;
}

// ---- count active non-default filters (for badge) -----------------------
function countActiveFilters(params: MyHistoryParams): number {
  let count = 0;
  const defaultFrom = getDefaultDateFrom();
  const isDefaultDateFrom =
    !params.dateFrom ||
    params.dateFrom === defaultFrom ||
    Math.abs(new Date(params.dateFrom).getTime() - new Date(defaultFrom).getTime()) <= 86400000;

  if (!isDefaultDateFrom || params.dateTo) count++;
  if (params.types && params.types.length > 0) count++;
  if (params.statuses && params.statuses.length > 0) count++;
  if (params.roleFilter && params.roleFilter !== 'both') count++;
  if (params.search) count++;
  return count;
}

// ---- date formatting for chips -----------------------------------------
function formatDisplayDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// ---- entity type label lookup (mirrors MyHistoryFilters) ----------------
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

// ---- summary stats helpers ---------------------------------------------
function getStartOfWeek(): Date {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 1=Mon, ...
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

const PENDING_STATUS_CODES = new Set([
  'CHO_DUYET', 'PENDING', 'DANG_XU_LY', 'IN_PROGRESS', 'MOI_TAO',
]);

function computeStats(items: HistoryItem[], total: number) {
  const weekStart = getStartOfWeek();
  let thisWeek = 0;
  let pendingCount = 0;
  for (const item of items) {
    const d = new Date(item.createdAt);
    if (d >= weekStart) thisWeek++;
    if (item.status && PENDING_STATUS_CODES.has(item.status)) pendingCount++;
  }
  return { total, thisWeek, pendingCount };
}

// ---- MyHistorySummaryCard -----------------------------------------------
interface SummaryCardProps {
  total: number;
  thisWeek: number;
  pendingCount: number;
  isLoading: boolean;
}

const MyHistorySummaryCard: React.FC<SummaryCardProps> = ({ total, thisWeek, pendingCount, isLoading }) => {
  const tiles = [
    { label: 'Tổng hoạt động', value: total },
    { label: 'Tuần này', value: thisWeek },
    { label: 'Chờ xử lý', value: pendingCount },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
        {tiles.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between sm:flex-col sm:items-center sm:justify-center py-2 sm:py-0 sm:px-2">
            <p className="text-xs text-gray-500 sm:order-2 sm:mt-0.5">{label}</p>
            <p className="text-2xl font-bold text-gray-900 sm:order-1">
              {isLoading ? <span className="inline-block w-8 h-6 bg-gray-200 rounded animate-pulse" /> : value}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 text-center mt-3">* Tuần này và Chờ xử lý tính trên trang hiện tại</p>
    </div>
  );
};

// ---- ActiveFilterChips --------------------------------------------------
interface ActiveFilterChipsProps {
  params: MyHistoryParams;
  onRemove: (next: MyHistoryParams) => void;
  onClearAll: () => void;
}

const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({ params, onRemove, onClearAll }) => {
  const chips: { label: string; onRemove: () => void }[] = [];

  // Date range chip
  const defaultFrom = getDefaultDateFrom();
  const isDefaultDateFrom =
    !params.dateFrom ||
    params.dateFrom === defaultFrom ||
    Math.abs(new Date(params.dateFrom).getTime() - new Date(defaultFrom).getTime()) <= 86400000;

  if (!isDefaultDateFrom || params.dateTo) {
    const preset = detectPreset(params);
    let label: string;
    if (preset === '7') label = '7 ngày qua';
    else if (preset === '30') label = '30 ngày qua';
    else if (preset === '90') label = '90 ngày qua';
    else if (preset === '365') label = '1 năm qua';
    else {
      const from = params.dateFrom ? formatDisplayDate(params.dateFrom) : '?';
      const to = params.dateTo ? formatDisplayDate(params.dateTo) : 'nay';
      label = `Từ ${from} đến ${to}`;
    }
    chips.push({
      label,
      onRemove: () => onRemove({ ...params, dateFrom: undefined, dateTo: undefined, page: 1 }),
    });
  }

  // Group chips (fully selected groups) and individual sub-type chips
  const types = params.types ?? [];
  const coveredByGroup = new Set<string>();
  for (const group of GROUP_NAMES) {
    const groupTypes = GROUP_TO_ENTITY_TYPES[group];
    if (groupTypes.every((t) => types.includes(t))) {
      coveredByGroup.add(group);
      chips.push({
        label: group,
        onRemove: () => {
          const next = types.filter((t) => !groupTypes.includes(t));
          onRemove({ ...params, types: next.length ? next : undefined, page: 1 });
        },
      });
    }
  }
  // Individual types not covered by a fully-selected group
  for (const t of types) {
    const belongsToFullGroup = GROUP_NAMES.some(
      (g) => coveredByGroup.has(g) && GROUP_TO_ENTITY_TYPES[g].includes(t)
    );
    if (!belongsToFullGroup) {
      chips.push({
        label: ENTITY_TYPE_LABELS[t] ?? t,
        onRemove: () => {
          const next = types.filter((x) => x !== t);
          onRemove({ ...params, types: next.length ? next : undefined, page: 1 });
        },
      });
    }
  }

  // Status chips — one chip per label that has at least one code active
  const statuses = params.statuses ?? [];
  for (const { label, codes } of STATUS_LABEL_TO_CODES) {
    if (isStatusLabelActive(codes, statuses)) {
      chips.push({
        label,
        onRemove: () => {
          const next = statuses.filter((s) => !codes.includes(s));
          onRemove({ ...params, statuses: next.length ? next : undefined, page: 1 });
        },
      });
    }
  }
  // Unknown raw codes
  const knownCodes = new Set(STATUS_LABEL_TO_CODES.flatMap((s) => s.codes));
  for (const code of statuses) {
    if (!knownCodes.has(code)) {
      chips.push({
        label: code,
        onRemove: () => {
          const next = statuses.filter((s) => s !== code);
          onRemove({ ...params, statuses: next.length ? next : undefined, page: 1 });
        },
      });
    }
  }

  // Role chip
  if (params.roleFilter && params.roleFilter !== 'both') {
    chips.push({
      label: params.roleFilter === 'created' ? 'Tôi tạo' : 'Liên quan đến tôi',
      onRemove: () => onRemove({ ...params, roleFilter: undefined, page: 1 }),
    });
  }

  // Search chip
  if (params.search) {
    chips.push({
      label: `"${params.search}"`,
      onRemove: () => onRemove({ ...params, search: undefined, page: 1 }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {chips.map(({ label, onRemove: removeChip }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs"
        >
          {label}
          <button
            type="button"
            onClick={removeChip}
            aria-label={`Xóa bộ lọc: ${label}`}
            className="ml-0.5 text-blue-500 hover:text-blue-700 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2 transition-colors"
      >
        Xóa tất cả
      </button>
    </div>
  );
};

// ---- Group count pills (clickable) --------------------------------------
const GROUP_LABELS_LIST = ['Yêu cầu', 'Nhiệm vụ', 'Kế hoạch', 'Báo cáo', 'Phiếu'];

interface GroupPillsProps {
  groupCounts: Record<string, number>;
  params: MyHistoryParams;
  onChange: (next: MyHistoryParams) => void;
}

const GroupPills: React.FC<GroupPillsProps> = ({ groupCounts, params, onChange }) => {
  const types = params.types ?? [];

  const isGroupActive = (group: string) => {
    const groupTypes = GROUP_TO_ENTITY_TYPES[group] ?? [];
    return groupTypes.length > 0 && groupTypes.every((t) => types.includes(t));
  };
  const isGroupPartial = (group: string) => {
    const groupTypes = GROUP_TO_ENTITY_TYPES[group] ?? [];
    return groupTypes.some((t) => types.includes(t)) && !isGroupActive(group);
  };

  const handleGroupPillClick = (group: string) => {
    const groupTypes = GROUP_TO_ENTITY_TYPES[group] ?? [];
    const active = isGroupActive(group);
    let next: string[];
    if (active) {
      next = types.filter((t) => !groupTypes.includes(t));
    } else {
      next = [...types, ...groupTypes.filter((t) => !types.includes(t))];
    }
    onChange({ ...params, types: next.length ? next : undefined, page: 1 });
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {GROUP_LABELS_LIST.map((key) => {
        const count = groupCounts[key] ?? 0;
        const active = isGroupActive(key);
        const partial = isGroupPartial(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => handleGroupPillClick(key)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
              active
                ? 'bg-blue-100 border-blue-400 text-blue-700'
                : partial
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-gray-100 border-transparent text-gray-600 hover:bg-gray-200'
            } ${count === 0 ? 'opacity-50' : ''}`}
          >
            {partial && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" aria-hidden="true" />}
            {key}
            <span className="font-semibold text-gray-800">{count}</span>
          </button>
        );
      })}
    </div>
  );
};

// ---- MyHistory page -----------------------------------------------------
const MyHistory: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedItem, setSelectedItem] = React.useState<HistoryItem | null>(null);
  const lastClickedItemRef = useRef<HTMLButtonElement | null>(null);

  // Derive params from URL on every render (memoized)
  const params = useMemo(() => parseParams(searchParams), [searchParams]);

  const { data, isLoading, isError } = useMyHistory(params);

  // Auto-snap back to page 1 if current page is out of range
  React.useEffect(() => {
    if (
      data &&
      data.total > 0 &&
      data.items.length === 0 &&
      (params.page ?? 1) > 1
    ) {
      setSearchParams(serializeParams({ ...params, page: 1 }), { replace: true });
    }
  }, [data, params, setSearchParams]);

  const handleFiltersChange = useCallback((next: MyHistoryParams) => {
    setSearchParams(serializeParams(next), { replace: false });
  }, [setSearchParams]);

  const handlePageChange = useCallback((page: number) => {
    setSearchParams(serializeParams({ ...params, page }), { replace: false });
  }, [params, setSearchParams]);

  const handleClearAll = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: false });
  }, [setSearchParams]);

  const groupCounts = data?.groupCounts as Record<string, number> | undefined;
  const activeFilterCount = useMemo(() => countActiveFilters(params), [params]);
  const nonDefaultFilters = useMemo(() => hasNonDefaultFilters(params), [params]);
  const stats = useMemo(
    () => computeStats(data?.items ?? [], data?.total ?? 0),
    [data]
  );

  const handleItemClick = useCallback((item: HistoryItem, buttonEl?: HTMLButtonElement) => {
    lastClickedItemRef.current = buttonEl ?? null;
    setSelectedItem(item);
  }, []);

  const handleModalClose = useCallback(() => {
    setSelectedItem(null);
    // Return focus to originating row
    if (lastClickedItemRef.current) {
      lastClickedItemRef.current.focus();
      lastClickedItemRef.current = null;
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <History className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Lịch sử của tôi</h1>
          <p className="text-sm text-gray-500">Tất cả hoạt động bạn đã tạo hoặc tham gia</p>
        </div>
      </div>

      {/* Group count pills */}
      {groupCounts && (
        <GroupPills groupCounts={groupCounts} params={params} onChange={handleFiltersChange} />
      )}

      {/* Active filter chips */}
      <ActiveFilterChips
        params={params}
        onRemove={handleFiltersChange}
        onClearAll={handleClearAll}
      />

      {/* Filters (sticky on desktop, drawer on mobile) */}
      <div className="mb-4">
        <MyHistoryFilters
          params={params}
          onChange={handleFiltersChange}
          activeFilterCount={activeFilterCount}
        />
      </div>

      {/* Summary stats */}
      <MyHistorySummaryCard
        total={stats.total}
        thisWeek={stats.thisWeek}
        pendingCount={stats.pendingCount}
        isLoading={isLoading}
      />

      {/* Error state */}
      {isError && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 mb-4">
          Không thể tải dữ liệu. Vui lòng thử lại.
        </div>
      )}

      {/* Timeline */}
      <MyHistoryTimeline
        items={data?.items ?? []}
        total={data?.total ?? 0}
        page={data?.page ?? 1}
        totalPages={data?.totalPages ?? 1}
        isLoading={isLoading}
        onItemClick={handleItemClick}
        onPageChange={handlePageChange}
        hasActiveFilters={nonDefaultFilters}
        onExpandYear={() => handleFiltersChange({ ...params, dateFrom: daysAgo(365), dateTo: undefined, page: 1 })}
        onClearFilters={handleClearAll}
      />

      {/* Detail modal */}
      <MyHistoryDetailModal
        item={selectedItem}
        onClose={handleModalClose}
      />
    </div>
  );
};

export default MyHistory;
