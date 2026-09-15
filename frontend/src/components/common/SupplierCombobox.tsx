import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
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

const LIST_MAX_H = 224;

/**
 * Single-select searchable supplier picker — the combobox counterpart of the
 * plain `<select>` this form used. Keeps the SAME contract (value = supplier
 * id, onChange = id) so it drops into any row without touching submit logic.
 *
 * The list renders through a portal with fixed positioning because every
 * call-site sits inside an `overflow-x-auto` table wrapper — an absolutely
 * positioned list there is clipped by the scroll container and ends up under
 * the next rows' borders. Typing only filters: a committed selection stays
 * until an explicit pick or clear, so keystrokes can never wipe the input.
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
  const [listStyle, setListStyle] = useState<React.CSSProperties | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedId = selected?.id;

  // Reflect a CHANGED committed selection into the text box. Keyed on the id
  // (primitive), not the object: a background refetch rebuilds the array but
  // keeps the same id, and must not stomp the text mid-typing.
  useEffect(() => {
    setInputText(selectedId ? (suppliers.find((s) => s.id === selectedId)?.tenNhaCungCap ?? '') : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const closeAndRevert = useCallback(() => {
    setIsOpen(false);
    setHighlightedIndex(-1);
    setInputText(selected?.tenNhaCungCap || '');
  }, [selected]);

  // Close on outside click — the portal list is OUTSIDE containerRef, so the
  // hit test has to allow clicks landing on it.
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      closeAndRevert();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeAndRevert]);

  // Position the fixed list against the input; flip above when there is no
  // room below (the last rows of a tall modal used to render "under" it).
  const measure = useCallback(() => {
    const anchor = containerRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const spaceAbove = r.top - 8;
    const openUp = spaceBelow < 140 && spaceAbove > spaceBelow;
    const height = Math.max(120, Math.min(LIST_MAX_H, openUp ? spaceAbove : spaceBelow));
    setListStyle({
      position: 'fixed',
      left: r.left,
      width: r.width,
      maxHeight: height,
      ...(openUp ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    measure();
    // capture:true — fires for scrolls of ANY ancestor (modal body, table wrapper)
    const onMove = () => measure();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [isOpen, measure]);

  const filtered = useMemo(() => {
    const query = inputText.toLowerCase().trim();
    if (!query || query === selected?.tenNhaCungCap.toLowerCase()) return suppliers;
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
  };

  const handleClear = () => {
    setInputText('');
    setIsOpen(false);
    setHighlightedIndex(-1);
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
      // Enter picks the highlight; with none and exactly one match, that match
      // is what the user asked for (keyboard shortcut for narrow→confirm).
      if (highlightedIndex >= 0 && filtered[highlightedIndex]) selectSupplier(filtered[highlightedIndex]);
      else if (highlightedIndex === -1 && filtered.length === 1) selectSupplier(filtered[0]);
    } else if (e.key === 'Escape') {
      closeAndRevert();
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
          onFocus={() => { if (!disabled && !error) { setIsOpen(true); setHighlightedIndex(-1); } }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
          className="w-full px-2.5 py-1.5 pr-7 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        {/* One trailing slot only: × when a pick can be removed, else ▾.
            (Having both caused the overlap the old version showed.) */}
        {selected && !disabled ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-0.5 text-gray-400 hover:text-gray-600"
            aria-label="Xoá lựa chọn"
            title="Xoá lựa chọn"
          >
            &times;
          </button>
        ) : (
          !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => { setIsOpen((o) => !o); inputRef.current?.focus(); }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Mở danh sách"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )
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

      {isOpen && !error && listStyle && createPortal(
        filtered.length > 0 ? (
          <ul
            ref={listRef}
            role="listbox"
            style={listStyle}
            className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-y-auto py-1"
          >
            {filtered.map((s, index) => (
              <li
                key={s.id}
                role="option"
                aria-selected={s.id === value}
                onMouseDown={(e) => { e.preventDefault(); selectSupplier(s); }}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`flex items-center justify-between gap-2 px-3 py-1.5 text-sm cursor-pointer ${
                  index === highlightedIndex
                    ? 'bg-green-50 text-green-800'
                    : s.id === value
                    ? 'bg-gray-50 text-gray-800'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="truncate">
                  <span className="font-medium">{s.tenNhaCungCap}</span>
                  {s.maNhaCungCap && <span className="ml-2 text-xs text-gray-400">{s.maNhaCungCap}</span>}
                  {s.loaiCungCap && <span className="ml-2 text-xs text-gray-400">({s.loaiCungCap})</span>}
                </span>
                {s.id === value && <Check className="w-4 h-4 text-green-600 shrink-0" />}
              </li>
            ))}
          </ul>
        ) : (
          <div style={listStyle} className="bg-white border border-gray-200 rounded-lg shadow-xl px-3 py-2 text-sm text-gray-400">
            {loading ? 'Đang tải…' : suppliers.length === 0 ? 'Chưa có nhà cung cấp nào' : 'Không tìm thấy nhà cung cấp'}
          </div>
        ),
        document.body,
      )}
    </div>
  );
};

export default SupplierCombobox;
