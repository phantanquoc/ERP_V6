import React, { useState, useMemo } from 'react';
import { Search, X, PackageSearch, ChevronDown } from 'lucide-react';

/**
 * Threshold: if <= this many options, render an inline button grid.
 * Above this, show a full-screen overlay with search.
 * 8 is generous for a 501px portrait tablet — 2 columns x 4 rows fit comfortably.
 */
const INLINE_GRID_THRESHOLD = 8;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CascadeOption {
  id: string;
  /** Primary label shown large and bold */
  primary: string;
  /** Optional secondary label shown smaller below */
  secondary?: string;
}

interface CascadePickerProps {
  options: CascadeOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  loading?: boolean;
  /** Placeholder when disabled (parent not chosen yet) */
  placeholderDisabled?: string;
  /** Placeholder when enabled but nothing selected */
  placeholderReady?: string;
  /** Message when list is empty and not loading */
  emptyMessage?: string;
  /** Title for the overlay header */
  overlayTitle?: string;
  /** Search placeholder for the overlay */
  searchPlaceholder?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

const CascadePicker: React.FC<CascadePickerProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  loading = false,
  placeholderDisabled = '-- Chọn mục cha trước --',
  placeholderReady = '-- Chọn --',
  emptyMessage = 'Không có dữ liệu',
  overlayTitle = 'Chọn',
  searchPlaceholder = 'Tìm kiếm...',
}) => {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedOption = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (o) =>
        o.primary.toLowerCase().includes(term) ||
        (o.secondary || '').toLowerCase().includes(term),
    );
  }, [options, search]);

  const useGrid = options.length <= INLINE_GRID_THRESHOLD && options.length > 0;

  const handlePick = (id: string) => {
    onChange(id);
    setOverlayOpen(false);
    setSearch('');
  };

  const handleClose = () => {
    setOverlayOpen(false);
    setSearch('');
  };

  // ─── Disabled state ─────────────────────────────────────────────────────
  if (disabled) {
    return (
      <div className="w-full min-h-[52px] px-3 py-2 border border-gray-300 rounded-lg text-lg bg-gray-100 text-gray-400 flex items-center cursor-not-allowed">
        {placeholderDisabled}
      </div>
    );
  }

  // ─── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full min-h-[52px] px-3 py-2 border border-gray-300 rounded-lg text-lg bg-gray-50 text-gray-500 flex items-center animate-pulse">
        Đang tải...
      </div>
    );
  }

  // ─── Empty state ────────────────────────────────────────────────────────
  if (options.length === 0) {
    return (
      <div className="w-full min-h-[52px] px-3 py-2 border border-gray-200 rounded-lg text-lg bg-gray-50 text-gray-400 flex items-center">
        {emptyMessage}
      </div>
    );
  }

  // ─── Grid variant (few options) ────────────────────────────────────────
  if (useGrid) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handlePick(opt.id)}
              className={`min-h-[60px] rounded-2xl px-4 py-3 text-left border-2 transition-all duration-150 ${
                active
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50'
              }`}
            >
              <span className={`text-lg font-bold block ${active ? 'text-blue-700' : 'text-gray-900'}`}>
                {opt.primary}
              </span>
              {opt.secondary && (
                <span className={`text-sm block mt-0.5 ${active ? 'text-blue-600' : 'text-gray-500'}`}>
                  {opt.secondary}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // ─── Overlay variant (many options) ────────────────────────────────────
  return (
    <div>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOverlayOpen(true)}
        className="w-full min-h-[52px] px-3 py-2 border border-gray-300 rounded-lg text-lg text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className={selectedOption ? 'text-gray-900 truncate' : 'text-gray-400'}>
          {selectedOption
            ? selectedOption.primary + (selectedOption.secondary ? ` — ${selectedOption.secondary}` : '')
            : placeholderReady}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {/* Full-screen overlay */}
      {overlayOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b px-4 py-3 space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-800 flex-1">{overlayTitle}</h2>
              <button
                type="button"
                onClick={handleClose}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                aria-label="Dong"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                type="text"
                inputMode="search"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-h-[44px] pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <PackageSearch className="w-10 h-10 mb-2" />
                <p className="text-sm">{emptyMessage}</p>
              </div>
            ) : (
              filtered.map((opt) => {
                const active = opt.id === value;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handlePick(opt.id)}
                    className={`w-full text-left rounded-xl border px-4 py-3 min-h-[60px] transition-colors ${
                      active
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-lg font-semibold text-gray-900">{opt.primary}</span>
                    {opt.secondary && (
                      <div className="text-sm text-gray-500 mt-0.5">{opt.secondary}</div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CascadePicker;
