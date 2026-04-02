import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';

// ─── Column Definitions ─────────────────────────────────────────────────────

export type FilterType = 'text' | 'select' | 'date-range' | 'multi-select';

export interface FilterOption {
  label: string;
  value: string;
}

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  filterable?: boolean;
  filterType?: FilterType;
  filterOptions?: FilterOption[];
  sortable?: boolean;
  width?: string;
}

export interface FilterValues {
  [key: string]: string | string[] | [string, string] | undefined;
}

// ─── Props ─────────────────────────────────────────────────────────────────

export interface DataTableProps<T> {
  /** Column definitions */
  columns: Column<T>[];
  /** Row data */
  data: T[];
  /** Override global isLoading — when true shows skeleton */
  isLoading?: boolean;
  /** Total record count (for pagination) */
  total?: number;
  /** Current page (1-indexed) */
  page?: number;
  /** Rows per page */
  pageSize?: number;
  /** Called when page changes */
  onPageChange?: (page: number) => void;
  /** Called when any filter changes; debounced 300 ms for text filters */
  onFilterChange?: (filters: FilterValues) => void;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state icon (Lucide component or ReactNode) */
  emptyIcon?: React.ReactNode;
  /** Key field for React list keys */
  rowKey?: keyof T | ((row: T) => string | number);
  /** Extra CSS class on the wrapper */
  className?: string;
}

// ─── Debounce Helper ─────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// ─── Date Range Picker (inline) ─────────────────────────────────────────────

interface DateRangeValue {
  from: string;
  to: string;
}

const DateRangeFilter: React.FC<{
  value: DateRangeValue | undefined;
  onChange: (v: DateRangeValue) => void;
}> = ({ value, onChange }) => {
  const [local, setLocal] = useState<DateRangeValue>({
    from: value?.from ?? '',
    to: value?.to ?? '',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local.from || local.to) {
        onChange(local);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [local, onChange]);

  return (
    <div className="flex gap-1 items-center">
      <input
        type="date"
        value={local.from}
        onChange={e => setLocal(prev => ({ ...prev, from: e.target.value }))}
        className="text-xs border border-gray-300 rounded px-1 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <span className="text-gray-400 text-xs">–</span>
      <input
        type="date"
        value={local.to}
        onChange={e => setLocal(prev => ({ ...prev, to: e.target.value }))}
        className="text-xs border border-gray-300 rounded px-1 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
};

// ─── Multi-Select Filter ────────────────────────────────────────────────────

const MultiSelectFilter: React.FC<{
  options: FilterOption[];
  value: string[] | undefined;
  onChange: (v: string[]) => void;
}> = ({ options, value = [], onChange }) => {
  const toggle = (opt: string) => {
    if (value.includes(opt)) {
      onChange(value.filter(v => v !== opt));
    } else {
      onChange([...value, opt]);
    }
  };

  return (
    <div className="relative group inline-block">
      <select
        className="text-xs border border-gray-300 rounded px-1 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none pr-6 cursor-pointer"
        onChange={e => {
          if (e.target.value === '__clear__') {
            onChange([]);
          } else {
            toggle(e.target.value);
          }
          e.target.value = '';
        }}
      >
        <option value="">Lọc…</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
        {value.length > 0 && <option value="__clear__">✕ Xóa lọc</option>}
      </select>
      {value.length > 0 && (
        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">
          {value.length}
        </span>
      )}
    </div>
  );
};

// ─── DataTable Component ────────────────────────────────────────────────────

/**
 * Reusable generic DataTable with filtering, pagination, loading skeleton,
 * and empty state. Built on TailwindCSS.
 */
export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  total,
  page = 1,
  pageSize = 10,
  onPageChange,
  onFilterChange,
  emptyMessage = 'Không có dữ liệu',
  emptyIcon,
  rowKey,
  className = '',
}: DataTableProps<T>) {
  const [filters, setFilters] = useState<FilterValues>({});
  const [textInputValues, setTextInputValues] = useState<Record<string, string>>({});

  // Debounce text inputs so onFilterChange fires at most every 300 ms
  const debouncedTextValues = useDebounce(textInputValues, 300);

  // Sync debounced text values into filters and notify parent
  useEffect(() => {
    const next: FilterValues = { ...filters };
    for (const key of Object.keys(debouncedTextValues)) {
      next[key] = debouncedTextValues[key] || undefined;
    }
    onFilterChange?.(next);
  }, [debouncedTextValues]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = useCallback((key: string, value: FilterValues[string]) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value };
      // Notify parent for non-text filters immediately
      if (onFilterChange) {
        const textKeys = columns.filter(c => c.filterable && c.filterType === 'text').map(c => c.key);
        const cleaned: FilterValues = {};
        for (const k of Object.keys(next)) {
          if (textKeys.includes(k)) continue; // text filters handled by debounce
          if (next[k] !== undefined) cleaned[k] = next[k];
        }
        onFilterChange(cleaned);
      }
      return next;
    });
  }, [columns, onFilterChange]);

  const clearFilter = useCallback((key: string) => {
    setFilters(prev => {
      const next = { ...prev, [key]: undefined };
      if (key in textInputValues) {
        setTextInputValues(prev => { const copy = { ...prev }; delete copy[key]; return copy; });
      }
      if (onFilterChange) {
        const textKeys = columns.filter(c => c.filterable && c.filterType === 'text').map(c => c.key);
        const cleaned: FilterValues = {};
        for (const k of Object.keys(next)) {
          if (textKeys.includes(k)) continue;
          if (next[k] !== undefined) cleaned[k] = next[k];
        }
        onFilterChange(cleaned);
      }
      return next;
    });
  }, [textInputValues, columns, onFilterChange]);

  const activeFilterCount = Object.values(filters).filter(
    v => v !== undefined && (Array.isArray(v) ? v.length > 0 : v !== '')
  ).length;

  // ─── Pagination helpers ───────────────────────────────────────────────────

  const totalItems = total ?? data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const handlePrev = () => { if (safePage > 1) onPageChange?.(safePage - 1); };
  const handleNext = () => { if (safePage < totalPages) onPageChange?.(safePage + 1); };

  const getRowKey = (row: T, index: number): string => {
    if (!rowKey) return index.toString();
    if (typeof rowKey === 'function') return String(rowKey(row));
    return String(row[rowKey] ?? index);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col gap-0 ${className}`}>
      {/* ── Filter Row ── */}
      {columns.some(c => c.filterable) && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="flex items-center gap-1 text-xs text-gray-500 font-medium mr-2">
            <Search className="w-3 h-3" />
            Lọc
          </span>
          {columns.map(col => {
            if (!col.filterable) return null;
            const filterValue = filters[col.key];
            const hasActive = filterValue !== undefined
              && (Array.isArray(filterValue) ? filterValue.length > 0 : filterValue !== '');

            return (
              <div key={col.key} className="flex items-center gap-1">
                <span className="text-xs text-gray-600 whitespace-nowrap">{col.label}:</span>

                {/* Text filter */}
                {col.filterType === 'text' && (
                  <div className="relative">
                    <input
                      type="text"
                      value={textInputValues[col.key] ?? ''}
                      onChange={e =>
                        setTextInputValues(prev => ({ ...prev, [col.key]: e.target.value }))
                      }
                      placeholder="Tìm…"
                      className="text-xs border border-gray-300 rounded px-2 py-1 pr-6 w-36 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {textInputValues[col.key] && (
                      <button
                        onClick={() => { setTextInputValues(prev => { const c = { ...prev }; delete c[col.key]; return c; }); clearFilter(col.key); }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Select filter */}
                {col.filterType === 'select' && (
                  <select
                    value={(filterValue as string) ?? ''}
                    onChange={e => handleFilterChange(col.key, e.target.value || undefined)}
                    className="text-xs border border-gray-300 rounded px-1 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Tất cả</option>
                    {col.filterOptions?.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                )}

                {/* Date range filter */}
                {col.filterType === 'date-range' && (
                  <DateRangeFilter
                    value={filterValue as DateRangeValue | undefined}
                    onChange={v => handleFilterChange(col.key, (v.from || v.to) ? [v.from, v.to] : undefined)}
                  />
                )}

                {/* Multi-select filter */}
                {col.filterType === 'multi-select' && (
                  <MultiSelectFilter
                    options={col.filterOptions ?? []}
                    value={filterValue as string[] | undefined}
                    onChange={v => handleFilterChange(col.key, v.length > 0 ? v : undefined)}
                  />
                )}

                {/* Clear button for active filters */}
                {hasActive && (
                  <button
                    onClick={() => clearFilter(col.key)}
                    className="text-gray-400 hover:text-red-500"
                    title="Xóa lọc"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {activeFilterCount > 0 && (
            <button
              onClick={() => {
                setFilters({});
                setTextInputValues({});
                onFilterChange?.({});
              }}
              className="ml-auto text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Xóa tất cả
            </button>
          )}
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto border border-gray-200 rounded-b-lg">
        <table className="w-full border-collapse min-w-max">
          <thead>
            <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
              {columns.map(col => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={`px-4 py-3 text-left text-sm font-semibold text-gray-900 ${
                    col.key !== columns[columns.length - 1].key ? 'border-r border-gray-200' : ''
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Loading skeleton */}
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`px-4 py-4 ${col.key !== columns[columns.length - 1].key ? 'border-r border-gray-100' : ''}`}
                    >
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}

            {/* Empty state */}
            {!isLoading && data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-16 text-center text-gray-400"
                >
                  <div className="flex flex-col items-center gap-2">
                    {emptyIcon ?? (
                      <Search className="w-10 h-10 opacity-30" />
                    )}
                    <p className="text-sm">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}

            {/* Data rows */}
            {!isLoading &&
              data.map((row, index) => (
                <tr
                  key={getRowKey(row, index)}
                  className={`border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-sm text-gray-900 ${
                        col.key !== columns[columns.length - 1].key ? 'border-r border-gray-100' : ''
                      }`}
                    >
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-3 bg-white border border-t-0 border-gray-200 rounded-b-lg">
          <span className="text-sm text-gray-600">
            Trang {safePage} / {totalPages} ({totalItems} kết quả)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              disabled={safePage <= 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Trước
            </button>

            {/* Page number pills — simplified window */}
            {(() => {
              const delta = 2;
              const range: (number | '...')[] = [];
              for (let i = 1; i <= totalPages; i++) {
                if (
                  i === 1 ||
                  i === totalPages ||
                  (i >= safePage - delta && i <= safePage + delta)
                ) {
                  range.push(i);
                } else if (range[range.length - 1] !== '...') {
                  range.push('...');
                }
              }
              return range.map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 select-none">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => onPageChange?.(p as number)}
                    className={`min-w-[2rem] px-2 py-1.5 text-sm rounded-md transition-colors ${
                      p === safePage
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              );
            })()}

            <button
              onClick={handleNext}
              disabled={safePage >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Sau
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
