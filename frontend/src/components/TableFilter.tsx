import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';

export interface FilterField {
  key: string;
  label: string;
  /**
   * - 'text': free text input
   * - 'select': native dropdown, requires `options`
   * - 'date': native date input, value stored as 'YYYY-MM-DD'
   * - 'combobox': searchable dropdown, requires `options`, empty value = "Tất cả"
   */
  type: 'text' | 'select' | 'date' | 'combobox';
  options?: { value: string; label: string }[];
  placeholder?: string;
  /**
   * Combobox only. Allows filtering by a value outside `options` — typed text is
   * committed on Enter or by picking the "Dùng ..." entry. Use for dirty-data
   * columns whose stored values legitimately sit outside the catalog (e.g. ĐVT).
   */
  allowFreeValue?: boolean;
}

/** Format 'YYYY-MM-DD' → 'DD/MM/YYYY' for display. Returns raw value if not parseable. */
const formatDateLabel = (value: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, y, m, d] = match;
  return `${d}/${m}/${y}`;
};

interface FilterComboboxProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowFreeValue?: boolean;
}

/**
 * Searchable single-select combobox for table filters.
 * Unlike the comboboxes in components/common/, an empty value is a valid state
 * meaning "Tất cả" (no filter applied).
 */
const FilterCombobox: React.FC<FilterComboboxProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Tất cả',
  allowFreeValue = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // A value with no matching option (dirty data) still shows itself, not blank.
  const selectedLabel = useMemo(() => {
    const match = options.find(o => o.value === value)?.label;
    if (match !== undefined) return match;
    return allowFreeValue ? value : '';
  }, [options, value, allowFreeValue]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // "Tất cả" is always first so clearing stays reachable via keyboard.
  const entries = useMemo(() => {
    const all = [{ value: '', label: 'Tất cả' }, ...options];
    const q = query.trim();
    if (!q) return all;
    const lower = q.toLowerCase();
    const matched = all.filter(o => o.label.toLowerCase().includes(lower));
    if (allowFreeValue && !options.some(o => o.value.toLowerCase() === lower)) {
      return [...matched, { value: q, label: `Dùng "${q}"` }];
    }
    return matched;
  }, [options, query, allowFreeValue]);

  const select = useCallback(
    (next: string) => {
      onChange(next);
      setIsOpen(false);
      setQuery('');
      setHighlightedIndex(-1);
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setIsOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, entries.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && entries[highlightedIndex]) {
        select(entries[highlightedIndex].value);
      } else if (allowFreeValue && query.trim()) {
        select(query.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          autoComplete="off"
          value={isOpen ? query : selectedLabel}
          placeholder={selectedLabel || placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => {
            setIsOpen(true);
            setQuery('');
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-2 pr-6 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
        />
        {value ? (
          <button
            type="button"
            aria-label="Xóa lựa chọn"
            onClick={() => {
              select('');
              inputRef.current?.blur();
            }}
            className="absolute right-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <ChevronDown className="absolute right-1 w-3 h-3 text-gray-400 pointer-events-none" />
        )}
      </div>

      {isOpen && (
        entries.length > 0 ? (
          <ul
            ref={listRef}
            role="listbox"
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto"
          >
            {entries.map((opt, index) => (
              <li
                key={opt.value || '__all__'}
                role="option"
                aria-selected={opt.value === value}
                onMouseDown={(e) => { e.preventDefault(); select(opt.value); }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-2 py-1 text-xs cursor-pointer ${
                  index === highlightedIndex
                    ? 'bg-blue-50 text-blue-800'
                    : opt.value === value
                    ? 'bg-gray-50 text-gray-800'
                    : 'text-gray-700'
                } ${opt.value === '' ? 'text-gray-400' : ''}`}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        ) : (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded shadow-lg px-2 py-1 text-xs text-gray-400">
            Không có kết quả
          </div>
        )
      )}
    </div>
  );
};

interface TableFilterProps {
  filters: FilterField[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  searchPlaceholder?: string;
}

const TableFilter: React.FC<TableFilterProps> = ({
  filters,
  values,
  onChange,
  searchPlaceholder = 'Tìm kiếm tất cả...',
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const activeFilters = useMemo(() => {
    return Object.entries(values).filter(([key, val]) => val !== '' && key !== '_search');
  }, [values]);

  const handleSearchChange = (value: string) => {
    onChange({ ...values, _search: value });
  };

  const handleFilterChange = (key: string, value: string) => {
    onChange({ ...values, [key]: value });
  };

  const handleRemoveFilter = (key: string) => {
    onChange({ ...values, [key]: '' });
  };

  const handleClearAll = () => {
    const cleared: Record<string, string> = {};
    Object.keys(values).forEach(key => {
      cleared[key] = '';
    });
    onChange(cleared);
  };

  const getFilterLabel = (key: string) => {
    const field = filters.find(f => f.key === key);
    return field?.label || key;
  };

  const getValueLabel = (key: string, value: string) => {
    const field = filters.find(f => f.key === key);
    if ((field?.type === 'select' || field?.type === 'combobox') && field.options) {
      const option = field.options.find(o => o.value === value);
      return option?.label || value;
    }
    if (field?.type === 'date') {
      return formatDateLabel(value);
    }
    return value;
  };

  const hasAnyFilter = activeFilters.length > 0 || (values._search || '') !== '';

  return (
    <div className="space-y-2">
      {/* Search bar + Filter toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={values._search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-medium transition-colors ${
            showFilters || activeFilters.length > 0
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Bộ lọc
          {activeFilters.length > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-blue-600 rounded-full leading-none">
              {activeFilters.length}
            </span>
          )}
        </button>
        {hasAnyFilter && (
          <button
            onClick={handleClearAll}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-3 h-3" />
            Xóa lọc
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-gray-50/80 border border-gray-200 rounded-md px-3 py-2.5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {filters.map((field) => (
              <div key={field.key}>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 uppercase tracking-wide">
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={values[field.key] || ''}
                    onChange={(e) => handleFilterChange(field.key, e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="">Tất cả</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'combobox' ? (
                  <FilterCombobox
                    options={field.options || []}
                    value={values[field.key] || ''}
                    onChange={(val) => handleFilterChange(field.key, val)}
                    placeholder={field.placeholder || 'Tất cả'}
                    allowFreeValue={field.allowFreeValue}
                  />
                ) : field.type === 'date' ? (
                  <input
                    type="date"
                    value={values[field.key] || ''}
                    onChange={(e) => handleFilterChange(field.key, e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                ) : (
                  <input
                    type="text"
                    placeholder={field.placeholder || `Lọc ${field.label.toLowerCase()}...`}
                    value={values[field.key] || ''}
                    onChange={(e) => handleFilterChange(field.key, e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-gray-400 font-medium">Đang lọc:</span>
          {activeFilters.map(([key, value]) => (
            <span
              key={key}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded text-[11px] font-medium"
            >
              {getFilterLabel(key)}: {getValueLabel(key, value)}
              <button
                onClick={() => handleRemoveFilter(key)}
                className="ml-0.5 hover:text-blue-900 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default TableFilter;
