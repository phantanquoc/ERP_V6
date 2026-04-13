import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';

export interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'select';
  options?: { value: string; label: string }[];
  placeholder?: string;
}

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
    if (field?.type === 'select' && field.options) {
      const option = field.options.find(o => o.value === value);
      return option?.label || value;
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
