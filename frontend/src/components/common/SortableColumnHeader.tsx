import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, ChevronsUpDown, Filter, X } from 'lucide-react';

export type SortOrder = 'asc' | 'desc';

interface SortableColumnHeaderProps {
  label: string;
  /** Sort key sent to the server. Omit to render a plain, non-sortable header. */
  sortKey?: string;
  activeSortKey?: string;
  activeSortOrder?: SortOrder;
  onSort?: (key: string) => void;
  /**
   * Free-text filter for this column. Omitting `filterKey` renders no filter control,
   * which is what non-filterable columns (STT, actions) want.
   */
  filterKey?: string;
  filterValue?: string;
  onFilterChange?: (key: string, value: string) => void;
  filterPlaceholder?: string;
  /** Fixed options turn the filter into a dropdown instead of a text box. */
  filterOptions?: string[];
  align?: 'left' | 'center';
  className?: string;
}

/**
 * Table header cell with click-to-sort and an optional per-column filter.
 *
 * Sorting and filtering are delegated upward and resolved by the server: these lists are
 * paginated server-side, so ordering or filtering the rows already on screen would only
 * cover the current page.
 */
const SortableColumnHeader: React.FC<SortableColumnHeaderProps> = ({
  label,
  sortKey,
  activeSortKey,
  activeSortOrder,
  onSort,
  filterKey,
  filterValue = '',
  onFilterChange,
  filterPlaceholder,
  filterOptions,
  align = 'left',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filterValue);
  const popoverRef = useRef<HTMLDivElement>(null);

  const sortable = !!sortKey && !!onSort;
  const filterable = !!filterKey && !!onFilterChange;
  const isSorted = sortable && activeSortKey === sortKey;
  const hasFilter = filterValue.trim() !== '';

  // Keep the draft in step when the value is cleared from outside (e.g. "clear filters").
  useEffect(() => {
    setDraft(filterValue);
  }, [filterValue]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const applyFilter = (value: string) => {
    onFilterChange!(filterKey!, value);
    setOpen(false);
  };

  const SortIcon = () => {
    if (!sortable) return null;
    if (!isSorted) {
      // Shown faintly so the column reads as sortable before any click.
      return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 shrink-0" />;
    }
    return activeSortOrder === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-blue-600 shrink-0" />
      : <ArrowDown className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
  };

  return (
    <th
      scope="col"
      aria-sort={isSorted ? (activeSortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-600 ${align === 'center' ? 'text-center' : 'text-left'} ${className}`}
    >
      <div className={`flex items-center gap-1 ${align === 'center' ? 'justify-center' : ''}`}>
        {sortable ? (
          <button
            type="button"
            onClick={() => onSort!(sortKey!)}
            title={`Sắp xếp theo ${label}`}
            className="group inline-flex items-center gap-1 uppercase tracking-wide hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          >
            <span>{label}</span>
            <SortIcon />
          </button>
        ) : (
          <span>{label}</span>
        )}

        {filterable && (
          <div className="relative" ref={open ? popoverRef : undefined}>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              title={hasFilter ? `Đang lọc: ${filterValue}` : `Lọc theo ${label}`}
              aria-label={`Lọc theo ${label}`}
              className={`p-0.5 rounded hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${hasFilter ? 'text-blue-600' : 'text-gray-300 hover:text-gray-600'}`}
            >
              <Filter className={`w-3.5 h-3.5 ${hasFilter ? 'fill-blue-600' : ''}`} />
            </button>

            {open && (
              <div className="absolute z-20 top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg p-2 normal-case">
                {filterOptions ? (
                  <select
                    autoFocus
                    value={draft}
                    onChange={(e) => applyFilter(e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-normal focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Tất cả --</option>
                    {filterOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    autoFocus
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') applyFilter(draft);
                    }}
                    placeholder={filterPlaceholder || `Lọc ${label.toLowerCase()}...`}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm font-normal focus:ring-2 focus:ring-blue-500"
                  />
                )}

                <div className="flex justify-between gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => { setDraft(''); applyFilter(''); }}
                    disabled={!hasFilter && draft === ''}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded disabled:opacity-40 font-normal"
                  >
                    <X className="w-3 h-3" />
                    Bỏ lọc
                  </button>
                  {!filterOptions && (
                    <button
                      type="button"
                      onClick={() => applyFilter(draft)}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-normal"
                    >
                      Áp dụng
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </th>
  );
};

export default SortableColumnHeader;
