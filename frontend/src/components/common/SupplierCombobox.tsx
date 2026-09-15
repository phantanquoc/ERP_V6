import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, ChevronDown, Check } from 'lucide-react';

export interface SupplierOption {
  id: string;
  tenNhaCungCap: string;
  maNhaCungCap?: string;
  loaiCungCap?: string;
}

interface SupplierComboboxProps {
  /** Loaded supplier list. Empty while loading; pass an error to show a retry. */
  suppliers: SupplierOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Fetch is in flight — shows a subtle spinner instead of "no results". */
  loading?: boolean;
  /** Load failed — renders the current value read-only-ish plus a "Thử lại" button. */
  error?: boolean;
  onRetry?: () => void;
  /** Extra content rendered next to the input (e.g. an inline "+ create supplier" button). */
  accessory?: React.ReactNode;
  className?: string;
}

/**
 * Single-select searchable supplier picker — the combobox counterpart of the
 * plain `<select>` this form used. Keeps the SAME contract (value = supplier
 * id, onChange = id) so it drops into any row without touching submit logic.
 *
 * Unlike the old native dropdown, it surfaces load errors with an inline retry
 * instead of silently rendering an empty list ("chọn xong không có NCC").
 */
const SupplierCombobox: React.FC<SupplierComboboxProps> = ({
  suppliers,
  value,
  onChange,
  placeholder = 'Tìm nhà cung cấp...',
  disabled = false,
  loading = false,
  error = false,
  onRetry,
  accessory,
  className = '',
}) => {
  const selected = useMemo(
    () => suppliers.find((s) => s.id === value) ?? null,
    [suppliers, value],
  );
  const [inputText, setInputText] = useState(selected?.tenNhaCungCap || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Reflect external value changes (row switch, reset) back into the text box.
  useEffect(() => {
    setInputText(selected?.tenNhaCungCap || '');
  }, [selected]);

  // Close on outside click; revert a half-typed query to the committed name.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setInputText(selected?.tenNhaCungCap || '');
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selected]);

  const filtered = useMemo(() => {
    const query = inputText.toLowerCase().trim();
    if (!query || (selected && query === selected.tenNhaCungCap.toLowerCase())) return suppliers;
    return suppliers.filter((s) =>
      s.tenNhaCungCap.toLowerCase().includes(query) ||
      (s.maNhaCungCap ?? '').toLowerCase().includes(query) ||
      (s.loaiCungCap ?? '').toLowerCase().includes(query),
    );
  }, [inputText, suppliers, selected]);

  const selectSupplier = useCallback(
    (s: SupplierOption) => {
      setInputText(s.tenNhaCungCap);
      setIsOpen(false);
      setHighlightedIndex(-1);
      onChange(s.id);
    },
    [onChange],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
    // Typing away from the current selection clears it until a new pick.
    if (value && e.target.value !== selected?.tenNhaCungCap) onChange('');
  };

  const handleClear = () => {
    setInputText('');
    setIsOpen(false);
    onChange('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (error) return;
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setIsOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filtered[highlightedIndex]) selectSupplier(filtered[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputText(selected?.tenNhaCungCap || '');
      setHighlightedIndex(-1);
    }
  };

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} className={`relative flex items-center gap-1 ${className}`}>
      <div className="relative flex-1">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onFocus={() => { if (!disabled) { setIsOpen(true); setHighlightedIndex(-1); } }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
          className="w-full px-2 py-1 pr-8 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
          <ChevronDown className="w-3.5 h-3.5" />
        </span>
        {selected && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2 px-0.5 text-gray-300 hover:text-gray-500"
            aria-label="Xoá lựa chọn"
            title="Xoá lựa chọn"
          >
            &times;
          </button>
        )}
      </div>

      {accessory}

      {error && (
        <button
          type="button"
          onClick={onRetry}
          disabled={!onRetry}
          title="Tải lại danh sách nhà cung cấp"
          className="shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs rounded border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Thử lại
        </button>
      )}

      {isOpen && !error && (
        filtered.length > 0 ? (
          <ul
            ref={listRef}
            role="listbox"
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto"
          >
            {filtered.map((s, index) => (
              <li
                key={s.id}
                role="option"
                aria-selected={s.id === value}
                onMouseDown={(e) => { e.preventDefault(); selectSupplier(s); }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer ${
                  index === highlightedIndex
                    ? 'bg-green-50 text-green-800'
                    : s.id === value
                    ? 'bg-gray-50 text-gray-800'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>
                  <span className="font-medium">{s.tenNhaCungCap}</span>
                  {s.maNhaCungCap && <span className="ml-2 text-xs text-gray-400">{s.maNhaCungCap}</span>}
                </span>
                {s.id === value && <Check className="w-4 h-4 text-green-600 shrink-0" />}
              </li>
            ))}
          </ul>
        ) : (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
            {loading ? 'Đang tải…' : 'Không tìm thấy nhà cung cấp'}
          </div>
        )
      )}
    </div>
  );
};

export default SupplierCombobox;
