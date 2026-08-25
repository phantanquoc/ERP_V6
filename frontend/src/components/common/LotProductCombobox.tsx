import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { LotProduct } from '../../services/warehouseService';

interface LotProductComboboxProps {
  lotProducts: LotProduct[];
  value: string | null;
  onChange: (lotProductId: string | null, lotProduct: LotProduct | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Hide items with zero stock — issuing from an empty kiện is never valid. */
  hideEmpty?: boolean;
  /**
   * Render zero-stock kiện as disabled rows with a "Hết hàng" badge instead of
   * hiding them, so staff can SEE that stock is 0 (not that it doesn't exist).
   * Takes precedence over hideEmpty.
   */
  showEmptyDisabled?: boolean;
}

/** Label for a kiện: mã kiện · tên sản phẩm · tồn. */
function displayText(lp: LotProduct): string {
  const ma = lp.maKien ?? lp.id.slice(-4);
  const ten = lp.internationalProduct?.tenSanPham ?? '';
  return `${ma} · ${ten} · Tồn: ${lp.soLuong} ${lp.donViTinh}`;
}

/**
 * Searchable combobox for picking a kiện (LotProduct) to issue from.
 * Deliberately has no create-new path: you cannot issue stock that does not exist.
 * Filters by mã kiện and tên sản phẩm (case-insensitive substring).
 */
const LotProductCombobox: React.FC<LotProductComboboxProps> = ({
  lotProducts,
  value,
  onChange,
  placeholder = 'Tìm theo mã kiện hoặc tên hàng hóa...',
  disabled = false,
  hideEmpty = true,
  showEmptyDisabled = false,
}) => {
  const selected = value ? (lotProducts.find((lp) => lp.id === value) ?? null) : null;

  const [inputText, setInputText] = useState(selected ? displayText(selected) : '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync input when the selection changes from outside (row reset, lot change)
  useEffect(() => {
    if (!value) {
      setInputText('');
    } else if (selected) {
      setInputText(displayText(selected));
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setInputText(selected ? displayText(selected) : '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selected]);

  const candidates = React.useMemo(() => {
    if (showEmptyDisabled) return [...lotProducts].sort((a, b) => Number(b.soLuong > 0) - Number(a.soLuong > 0));
    return hideEmpty ? lotProducts.filter((lp) => lp.soLuong > 0) : lotProducts;
  }, [lotProducts, hideEmpty, showEmptyDisabled]);

  const filtered = React.useMemo(() => {
    const query = inputText.trim().toLowerCase();
    if (!query || (selected && displayText(selected).toLowerCase() === query)) {
      return candidates;
    }
    return candidates.filter((lp) => {
      const ma = (lp.maKien ?? '').toLowerCase();
      const ten = (lp.internationalProduct?.tenSanPham ?? '').toLowerCase();
      const maSp = (lp.internationalProduct?.maSanPham ?? '').toLowerCase();
      return ma.includes(query) || ten.includes(query) || maSp.includes(query);
    });
  }, [inputText, candidates, selected]);

  const selectItem = useCallback(
    (lp: LotProduct) => {
      setInputText(displayText(lp));
      setIsOpen(false);
      setHighlightedIndex(-1);
      onChange(lp.id, lp);
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
      setHighlightedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
        selectItem(filtered[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputText(selected ? displayText(selected) : '');
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
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
            if (value) onChange(null, null);
          }}
          onFocus={() => {
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="w-full px-2 py-1.5 pr-7 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => {
              setInputText('');
              setIsOpen(false);
              onChange(null, null);
              inputRef.current?.focus();
            }}
            className="absolute right-1.5 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Xóa lựa chọn"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto"
        >
          {filtered.map((lp, index) => {
            const isEmpty = lp.soLuong <= 0;
            const isDisabled = showEmptyDisabled && isEmpty;
            return (
            <li
              key={lp.id}
              role="option"
              aria-selected={lp.id === value}
              aria-disabled={isDisabled || undefined}
              onMouseDown={(e) => {
                if (isDisabled) { e.preventDefault(); return; }
                e.preventDefault();
                selectItem(lp);
              }}
              onMouseEnter={() => { if (!isDisabled) setHighlightedIndex(index); }}
              className={`px-3 py-2 text-sm ${isDisabled ? 'cursor-not-allowed opacity-60 bg-gray-50' : `cursor-pointer ${index === highlightedIndex ? 'bg-red-50 text-red-900' : lp.id === value ? 'bg-gray-50 text-gray-800' : 'text-gray-700 hover:bg-gray-50'}`}`}
            >
              <span className="font-medium font-mono text-xs text-gray-500">
                {lp.maKien ?? lp.id.slice(-4)}
              </span>
              {' · '}
              {lp.internationalProduct?.tenSanPham ?? ''}
              {' · '}
              <span className="text-xs font-semibold text-blue-700">
                Tồn: {lp.soLuong} {lp.donViTinh}
              </span>
              {isEmpty && (
                <span className="ml-2 inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 align-middle">Hết hàng</span>
              )}
            </li>
            );
          })}
        </ul>
      )}

      {isOpen && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
          {candidates.length === 0 ? 'Lô này không còn hàng tồn' : 'Không tìm thấy kiện phù hợp'}
        </div>
      )}
    </div>
  );
};

export default LotProductCombobox;
