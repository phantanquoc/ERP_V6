import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { EmptyState } from './States';
import { shell } from './tokens';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  emptyDescription?: string;
  dense?: boolean;
  stickyHeader?: boolean;
  /** Optional key extractor — fallback to row.id ?? index for backward compat. */
  rowKey?: (row: T) => string;
  pagination?: {
    page: number;
    totalPages: number;
    total: number;
    onPageChange: (page: number) => void;
  };
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  loading,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  emptyMessage = 'Chưa có dữ liệu',
  emptyDescription,
  dense,
  stickyHeader,
  rowKey,
  pagination,
}: DataTableProps<T>) {
  const cellPad = dense ? 'px-2 py-1.5' : 'px-3 py-2.5';
  const headerPad = dense ? 'px-2 py-1.5' : 'px-3 py-2.5';

  if (loading) {
    return (
      <div className={`${shell.card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {columns.map((col) => (
                  <th key={col.key} scope="col" className={`${headerPad} text-xs font-semibold text-gray-500 whitespace-nowrap`} style={{ width: col.width }}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {columns.map((col) => (
                    <td key={col.key} className={`${cellPad}`}>
                      <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`${shell.card} overflow-hidden`}>
        <EmptyState message={emptyMessage} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className={`${shell.card} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className={`${stickyHeader ? 'sticky top-0 z-10' : ''} bg-gray-50 border-b border-gray-200`}>
            <tr>
              {columns.map((col) => {
                const isSorted = col.sortable && sortKey === col.key;
                const ariaSort: React.AriaAttributes['aria-sort'] = !col.sortable
                  ? undefined
                  : isSorted
                    ? sortDir === 'asc' ? 'ascending' : 'descending'
                    : 'none';
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={`${headerPad} text-xs font-semibold text-gray-500 whitespace-nowrap ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'} ${col.sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''}`}
                    style={{ width: col.width }}
                    onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {col.sortable && sortKey === col.key && (
                        <span className="text-gray-400">
                          {sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </span>
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, idx) => {
              const key = rowKey ? rowKey(row) : ((row.id as string) ?? String(idx));
              return (
                <tr
                  key={key}
                  className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : 'hover:bg-gray-50/50'} ${idx % 2 === 1 ? 'bg-gray-50/30' : 'bg-white'}`}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`${cellPad} text-sm text-gray-700 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] as React.ReactNode) ?? '—'}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 bg-gray-50/50">
          <span className="text-xs text-gray-500">
            Tổng {pagination.total} dòng — Trang {pagination.page}/{pagination.totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 text-xs border border-gray-200 rounded bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Trước
            </button>
            <button
              onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="px-2.5 py-1 text-xs border border-gray-200 rounded bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
