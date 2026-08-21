import React, { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCheck } from 'lucide-react';
import type { MyNotificationsParams } from '../services/notificationService';
import {
  useMyNotificationsList,
  useMyNotificationsStats,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
} from '../hooks/useMyNotifications';
import MyNotificationsFilters from '../components/MyNotificationsFilters';
import MyNotificationsTimeline from '../components/MyNotificationsTimeline';
import MyNotificationsDetailModal from '../components/MyNotificationsDetailModal';
import { AppNotification } from '../services/notificationService';
import {
  NOTIFICATION_TYPE_GROUPS,
  detectDatePreset,
} from '../components/myNotificationsUtils';

// ---- URL state helpers --------------------------------------------------

function paramsFromSearch(sp: URLSearchParams): MyNotificationsParams {
  const types = sp.getAll('types');
  const isReadStr = sp.get('isRead');
  const page = sp.get('page');
  return {
    types: types.length > 0 ? types : undefined,
    isRead: isReadStr === 'true' ? true : isReadStr === 'false' ? false : undefined,
    dateFrom: sp.get('dateFrom') ?? undefined,
    dateTo: sp.get('dateTo') ?? undefined,
    search: sp.get('search') ?? undefined,
    page: page ? Math.max(1, parseInt(page, 10)) : 1,
    sort: (sp.get('sort') as 'newest' | 'oldest' | null) ?? 'newest',
    limit: 20,
  };
}

function paramsToSearch(p: MyNotificationsParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (p.types && p.types.length > 0) p.types.forEach((t) => sp.append('types', t));
  if (p.isRead !== undefined) sp.set('isRead', String(p.isRead));
  if (p.dateFrom) sp.set('dateFrom', p.dateFrom);
  if (p.dateTo) sp.set('dateTo', p.dateTo);
  if (p.search) sp.set('search', p.search);
  if (p.page && p.page > 1) sp.set('page', String(p.page));
  if (p.sort && p.sort !== 'newest') sp.set('sort', p.sort);
  return sp;
}

// ---- Stats card ---------------------------------------------------------

interface StatsCardProps {
  total: number;
  unread: number;
  today: number;
  isLoading: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({ total, unread, today, isLoading }) => (
  <div
    className="bg-white rounded-lg border border-gray-200 shadow-sm p-4"
    aria-live="polite"
    aria-atomic="true"
  >
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Tổng', value: total, color: 'text-gray-900' },
        { label: 'Chưa đọc', value: unread, color: 'text-blue-600' },
        { label: 'Hôm nay', value: today, color: 'text-green-600' },
      ].map(({ label, value, color }) => (
        <div key={label} className="text-center">
          <p
            className={`text-2xl font-bold ${color} ${isLoading ? 'opacity-50' : ''} transition-opacity`}
          >
            {value}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  </div>
);

// ---- Active filter chips bar -------------------------------------------

interface ActiveChipsProps {
  params: MyNotificationsParams;
  onRemoveGroup: (key: string) => void;
  onRemoveReadState: () => void;
  onRemoveDateRange: () => void;
  onRemoveSearch: () => void;
  onClearAll: () => void;
}

const ActiveChips: React.FC<ActiveChipsProps> = ({
  params,
  onRemoveGroup,
  onRemoveReadState,
  onRemoveDateRange,
  onRemoveSearch,
  onClearAll,
}) => {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  // Type group chips
  const activeTypes = params.types ?? [];
  NOTIFICATION_TYPE_GROUPS.forEach((group) => {
    const groupActive = group.types.every((t) => activeTypes.includes(t));
    if (groupActive) {
      chips.push({
        key: `group-${group.key}`,
        label: group.label,
        onRemove: () => onRemoveGroup(group.key),
      });
    }
  });

  // Read state
  if (params.isRead === false) {
    chips.push({ key: 'isRead-false', label: 'Chưa đọc', onRemove: onRemoveReadState });
  } else if (params.isRead === true) {
    chips.push({ key: 'isRead-true', label: 'Đã đọc', onRemove: onRemoveReadState });
  }

  // Date range
  if (params.dateFrom || params.dateTo) {
    const preset = detectDatePreset(params.dateFrom, params.dateTo);
    const presetLabels: Record<string, string> = {
      today: 'Hôm nay',
      '7': '7 ngày qua',
      '30': '30 ngày qua',
      month: 'Tháng này',
    };
    const label = preset !== 'custom' && preset !== 'none'
      ? presetLabels[preset] ?? preset
      : `${params.dateFrom ?? '...'} → ${params.dateTo ?? '...'}`;
    chips.push({ key: 'dateRange', label, onRemove: onRemoveDateRange });
  }

  // Search
  if (params.search) {
    chips.push({
      key: 'search',
      label: `"${params.search}"`,
      onRemove: onRemoveSearch,
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.onRemove}
            className="ml-0.5 text-blue-500 hover:text-blue-700 focus:outline-none"
            aria-label={`Xóa bộ lọc ${chip.label}`}
          >
            ×
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
      >
        Xóa tất cả
      </button>
    </div>
  );
};

// ---- Quick filter pills (shortcuts above timeline) -----------------------

const PRICING_TYPES: string[] = ['PRICING'];

interface QuickPillsProps {
  params: MyNotificationsParams;
  stats: { total: number; unread: number; byType: Record<string, number> };
  onChange: (next: MyNotificationsParams) => void;
}

const QuickFilterPills: React.FC<QuickPillsProps> = ({ params, stats, onChange }) => {
  const activeTypes = params.types ?? [];
  const byType = stats.byType ?? {};

  const evaluationGroup = NOTIFICATION_TYPE_GROUPS.find((g) => g.key === 'evaluation');
  const taskGroup = NOTIFICATION_TYPE_GROUPS.find((g) => g.key === 'task');

  const isGroupExactlyActive = (group: (typeof NOTIFICATION_TYPE_GROUPS)[number] | undefined) =>
    !!group &&
    group.types.length > 0 &&
    group.types.length === activeTypes.length &&
    group.types.every((t) => activeTypes.includes(t));

  const isPricingActive =
    PRICING_TYPES.length === activeTypes.length &&
    PRICING_TYPES.every((t) => activeTypes.includes(t));

  const isAllActive = !params.types && params.isRead === undefined;
  const isUnreadActive = params.isRead === false;
  const isEvaluationActive = isGroupExactlyActive(evaluationGroup);
  const isTaskActive = isGroupExactlyActive(taskGroup);

  const groupCount = (group: (typeof NOTIFICATION_TYPE_GROUPS)[number] | undefined) =>
    group ? group.types.reduce((s, t) => s + (byType[t] ?? 0), 0) : 0;

  const pricingCount = byType['PRICING'] ?? 0;

  const pillBase =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors';
  const activeCls = 'bg-blue-600 text-white border-blue-600';
  const inactiveCls = 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50';

  return (
    <div className="flex flex-wrap gap-2 mb-3" role="group" aria-label="Bộ lọc nhanh">
      <button
        type="button"
        onClick={() => onChange({ ...params, types: undefined, isRead: undefined, page: 1 })}
        aria-pressed={isAllActive}
        className={`${pillBase} ${isAllActive ? activeCls : inactiveCls}`}
      >
        Tất cả
        <span
          className={`inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[11px] ${isAllActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          {stats.total}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onChange({ ...params, isRead: isUnreadActive ? undefined : false, page: 1 })}
        aria-pressed={isUnreadActive}
        className={`${pillBase} ${isUnreadActive ? activeCls : inactiveCls}`}
      >
        Chưa đọc
        <span
          className={`inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[11px] ${isUnreadActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          {stats.unread}
        </span>
      </button>

      <button
        type="button"
        onClick={() => {
          if (isEvaluationActive) {
            onChange({ ...params, types: undefined, page: 1 });
          } else if (evaluationGroup) {
            onChange({ ...params, types: [...evaluationGroup.types], page: 1 });
          }
        }}
        aria-pressed={isEvaluationActive}
        className={`${pillBase} ${isEvaluationActive ? activeCls : inactiveCls}`}
      >
        Đánh giá
        {groupCount(evaluationGroup) > 0 && (
          <span
            className={`inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[11px] ${isEvaluationActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {groupCount(evaluationGroup)}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          if (isTaskActive) {
            onChange({ ...params, types: undefined, page: 1 });
          } else if (taskGroup) {
            onChange({ ...params, types: [...taskGroup.types], page: 1 });
          }
        }}
        aria-pressed={isTaskActive}
        className={`${pillBase} ${isTaskActive ? activeCls : inactiveCls}`}
      >
        Nhiệm vụ
        {groupCount(taskGroup) > 0 && (
          <span
            className={`inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[11px] ${isTaskActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {groupCount(taskGroup)}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          if (isPricingActive) onChange({ ...params, types: undefined, page: 1 });
          else onChange({ ...params, types: [...PRICING_TYPES], page: 1 });
        }}
        aria-pressed={isPricingActive}
        className={`${pillBase} ${isPricingActive ? activeCls : inactiveCls}`}
      >
        Báo giá
        {pricingCount > 0 && (
          <span
            className={`inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[11px] ${isPricingActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {pricingCount}
          </span>
        )}
      </button>
    </div>
  );
};

// ---- Main page ----------------------------------------------------------

const MyNotifications: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const params: MyNotificationsParams = paramsFromSearch(searchParams);

  const updateParams = useCallback(
    (next: MyNotificationsParams) => {
      setSearchParams(paramsToSearch(next), { replace: true });
    },
    [setSearchParams]
  );

  // Stats params: only types + dateRange (no isRead, search, page, sort)
  const statsParams = {
    types: params.types,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
  };

  const listQuery = useMyNotificationsList({ ...params, limit: 20 });
  const statsQuery = useMyNotificationsStats(statsParams);
  const markAllMutation = useMarkAllNotificationsAsRead();
  const deleteMutation = useDeleteNotification();

  const [selectedItem, setSelectedItem] = useState<AppNotification | null>(null);
  const originButtonRef = useRef<HTMLButtonElement | null>(null);

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const page = listQuery.data?.page ?? 1;
  const totalPages = listQuery.data?.totalPages ?? 1;

  const stats = statsQuery.data ?? { total: 0, unread: 0, today: 0, byType: {} };

  const hasActiveFilters = Boolean(
    (params.types && params.types.length > 0) ||
    params.isRead !== undefined ||
    params.dateFrom ||
    params.dateTo ||
    params.search
  );

  const handleItemClick = (item: AppNotification, buttonEl?: HTMLButtonElement) => {
    originButtonRef.current = buttonEl ?? null;
    setSelectedItem(item);
  };

  const handleModalClose = () => {
    setSelectedItem(null);
    if (originButtonRef.current) {
      originButtonRef.current.focus();
      originButtonRef.current = null;
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id, {
      onError: () => toast.error('Không thể xóa thông báo'),
    });
  };

  const handleMarkAllRead = () => {
    markAllMutation.mutate(undefined, {
      onSuccess: () => toast.success('Đã đánh dấu tất cả đã đọc'),
      onError: () => toast.error('Không thể đánh dấu đã đọc'),
    });
  };

  const handleExpandYear = () => {
    const now = new Date();
    const from = new Date(now);
    from.setFullYear(from.getFullYear() - 1);
    const toStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}-${String(from.getDate()).padStart(2, '0')}`;
    updateParams({ ...params, dateFrom: fromStr, dateTo: toStr, page: 1 });
  };

  const handleClearFilters = () => {
    updateParams({ page: 1, sort: 'newest', limit: 20 });
  };

  // Active chips handlers
  const handleRemoveGroup = (key: string) => {
    const group = NOTIFICATION_TYPE_GROUPS.find((g) => g.key === key);
    if (!group) return;
    const next = (params.types ?? []).filter((t) => !group.types.includes(t));
    updateParams({ ...params, types: next.length ? next : undefined, page: 1 });
  };

  const handleRemoveReadState = () => updateParams({ ...params, isRead: undefined, page: 1 });
  const handleRemoveDateRange = () =>
    updateParams({ ...params, dateFrom: undefined, dateTo: undefined, page: 1 });
  const handleRemoveSearch = () => updateParams({ ...params, search: undefined, page: 1 });

  // Count active filters for badge
  const activeFilterCount =
    (params.types && params.types.length > 0 ? 1 : 0) +
    (params.isRead !== undefined ? 1 : 0) +
    (params.dateFrom || params.dateTo ? 1 : 0) +
    (params.search ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Thông báo của tôi</h1>
            <p className="text-xs text-gray-500 mt-0.5">Quản lý và theo dõi các thông báo của bạn</p>
          </div>
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markAllMutation.isPending || stats.unread === 0}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Đánh dấu tất cả đã đọc
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {/* Stats card */}
        <div className="mb-5">
          <StatsCard
            total={stats.total}
            unread={stats.unread}
            today={stats.today}
            isLoading={statsQuery.isLoading}
          />
        </div>

        {/* Active chips bar */}
        {hasActiveFilters && (
          <div className="mb-4">
            <ActiveChips
              params={params}
              onRemoveGroup={handleRemoveGroup}
              onRemoveReadState={handleRemoveReadState}
              onRemoveDateRange={handleRemoveDateRange}
              onRemoveSearch={handleRemoveSearch}
              onClearAll={handleClearFilters}
            />
          </div>
        )}

        {/* Main grid: filters sidebar + timeline */}
        <div className="flex gap-6">
          {/* Filters */}
          <div className="flex-shrink-0 md:w-64">
            <MyNotificationsFilters
              params={params}
              stats={statsQuery.data}
              onChange={updateParams}
              activeFilterCount={activeFilterCount}
            />
          </div>

          {/* Timeline */}
          <div className="flex-1 min-w-0">
            <QuickFilterPills params={params} stats={stats} onChange={updateParams} />
            <MyNotificationsTimeline
              items={items}
              total={total}
              page={page}
              totalPages={totalPages}
              isLoading={listQuery.isLoading}
              onItemClick={handleItemClick}
              onDelete={handleDelete}
              onPageChange={(p) => updateParams({ ...params, page: p })}
              hasActiveFilters={hasActiveFilters}
              onExpandYear={handleExpandYear}
              onClearFilters={handleClearFilters}
            />
          </div>
        </div>
      </div>

      {/* Detail modal */}
      <MyNotificationsDetailModal item={selectedItem} onClose={handleModalClose} />
    </div>
  );
};

export default MyNotifications;

