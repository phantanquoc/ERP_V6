import React, { useState } from 'react';
import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { MyHistoryParams } from '../services/myHistoryService';

export type DatePreset = '30' | '90' | '365' | 'all' | 'custom';

/** Maps each group label to the entity type strings the backend recognises. */
const GROUP_TO_ENTITY_TYPES: Record<string, string[]> = {
  'Yêu cầu': ['quotation-request', 'supply-request', 'purchase-request', 'leave-request', 'repair-request'],
  'Nhiệm vụ': ['task'],
  'Kế hoạch': ['work-plan', 'project', 'maintenance-plan'],
  'Báo cáo': ['daily-work-report', 'private-feedback', 'fault-record', 'material-evaluation', 'finished-product', 'quality-evaluation', 'production-report', 'internal-inspection', 'customer-feedback', 'tax-report'],
  'Phiếu': ['warehouse-receipt', 'warehouse-issue', 'quotation', 'maintenance-record', 'acceptance-handover', 'invoice'],
};

const GROUP_OPTIONS: { value: string; label: string }[] = [
  { value: 'Yêu cầu', label: 'Yêu cầu' },
  { value: 'Nhiệm vụ', label: 'Nhiệm vụ' },
  { value: 'Kế hoạch', label: 'Kế hoạch' },
  { value: 'Báo cáo', label: 'Báo cáo' },
  { value: 'Phiếu', label: 'Phiếu' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'IN_PROGRESS', label: 'Đang xử lý' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

interface MyHistoryFiltersProps {
  params: MyHistoryParams;
  onChange: (params: MyHistoryParams) => void;
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

function detectPreset(params: MyHistoryParams): DatePreset {
  if (!params.dateFrom && !params.dateTo) return 'all';
  // check rough match against 30/90/365
  if (params.dateTo && params.dateFrom) {
    const from = new Date(params.dateFrom);
    const to = new Date(params.dateTo);
    const diffDays = Math.round((to.getTime() - from.getTime()) / 86400000);
    if (diffDays === 30) return '30';
    if (diffDays >= 89 && diffDays <= 91) return '90';
    if (diffDays >= 364 && diffDays <= 366) return '365';
    return 'custom';
  }
  return 'custom';
}

const MyHistoryFilters: React.FC<MyHistoryFiltersProps> = ({ params, onChange }) => {
  const [expanded, setExpanded] = useState(false);
  const [localSearch, setLocalSearch] = useState(params.search ?? '');
  const [customFrom, setCustomFrom] = useState(params.dateFrom ?? '');
  const [customTo, setCustomTo] = useState(params.dateTo ?? '');

  const activePreset = detectPreset(params);

  const handlePreset = (preset: DatePreset) => {
    if (preset === 'custom') {
      onChange({ ...params, dateFrom: customFrom || undefined, dateTo: customTo || undefined, page: 1 });
      return;
    }
    const dates = getPresetDates(preset);
    onChange({ ...params, ...dates, page: 1 });
  };

  const handleCustomDateChange = (field: 'dateFrom' | 'dateTo', value: string) => {
    if (field === 'dateFrom') setCustomFrom(value);
    else setCustomTo(value);
    onChange({
      ...params,
      [field]: value || undefined,
      page: 1,
    });
  };

  const handleGroupToggle = (group: string) => {
    const groupEntityTypes = GROUP_TO_ENTITY_TYPES[group] ?? [];
    const current = params.types ?? [];
    // Determine if this group is currently active (all its entity types are in current)
    const isActive = groupEntityTypes.every((t) => current.includes(t));
    let next: string[];
    if (isActive) {
      // Deselect — remove all entity types belonging to this group
      next = current.filter((t) => !groupEntityTypes.includes(t));
    } else {
      // Select — add entity types for this group (avoid duplicates)
      next = [...current, ...groupEntityTypes.filter((t) => !current.includes(t))];
    }
    onChange({ ...params, types: next.length ? next : undefined, page: 1 });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange({ ...params, statuses: value ? [value] : undefined, page: 1 });
  };

  const handleRoleToggle = (role: 'created' | 'related' | 'both') => {
    onChange({ ...params, roleFilter: role, page: 1 });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange({ ...params, search: localSearch.trim() || undefined, page: 1 });
  };

  const activeEntityTypes = params.types ?? [];
  // A group is "active" when all its entity types are present in the current types filter
  const isGroupActive = (group: string): boolean => {
    const groupEntityTypes = GROUP_TO_ENTITY_TYPES[group] ?? [];
    if (groupEntityTypes.length === 0) return false;
    return groupEntityTypes.every((t) => activeEntityTypes.includes(t));
  };
  const activeRole = params.roleFilter ?? 'both';
  const activeStatus = params.statuses?.[0] ?? '';

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      {/* Top row: search + toggle expand */}
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Tìm kiếm theo tiêu đề, mã..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </form>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Filter className="w-4 h-4" />
          Bộ lọc
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          {/* Date range presets */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Khoảng thời gian</p>
            <div className="flex flex-wrap gap-2">
              {([
                { value: '30', label: '30 ngày' },
                { value: '90', label: '90 ngày' },
                { value: '365', label: '1 năm' },
                { value: 'all', label: 'Tất cả' },
                { value: 'custom', label: 'Tùy chỉnh' },
              ] as { value: DatePreset; label: string }[]).map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handlePreset(p.value)}
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
            {/* Custom date inputs */}
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

          {/* Group checkboxes */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Nhóm</p>
            <div className="flex flex-wrap gap-2">
              {GROUP_OPTIONS.map((g) => {
                const active = isGroupActive(g.value);
                return (
                  <label
                    key={g.value}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm cursor-pointer transition-colors ${
                      active
                        ? 'bg-blue-50 border-blue-400 text-blue-700'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => handleGroupToggle(g.value)}
                      className="sr-only"
                    />
                    {g.label}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Status + Role */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[140px]">
              <label className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide block">Trạng thái</label>
              <select
                value={activeStatus}
                onChange={handleStatusChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Tất cả</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[180px]">
              <p className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">Vai trò của tôi</p>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                {([
                  { value: 'both', label: 'Tất cả' },
                  { value: 'created', label: 'Người tạo' },
                  { value: 'related', label: 'Liên quan' },
                ] as { value: 'both' | 'created' | 'related'; label: string }[]).map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => handleRoleToggle(r.value)}
                    className={`flex-1 px-2 py-1.5 text-xs transition-colors ${
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
        </div>
      )}
    </div>
  );
};

export default MyHistoryFilters;
