import React, { useState, useRef, useEffect, useCallback } from 'react';
import { InternationalProduct } from '../../services/internationalProductService';
import type { LotProduct } from '../../services/warehouseService';

interface ProductComboboxProps {
  products: InternationalProduct[];
  value: string | null;
  onChange: (productId: string | null, product: InternationalProduct | null) => void;
  placeholder?: string;
  disabled?: boolean;
  /** When true, typing a name with no exact match shows a "Tạo mới" option.
   *  Selecting it calls onCreateNew with the typed text instead of onChange. */
  allowCreate?: boolean;
  /** Called when the user picks "Tạo mới «text»" (only relevant when allowCreate is true). */
  onCreateNew?: (tenSanPham: string) => void;
  /** Kiện already in the target lot. When given, those products are grouped first
   *  and annotated with their current stock, so the user can see what the lot holds. */
  lotProducts?: LotProduct[];
}

/** Build the display string for an option. */
function displayText(p: InternationalProduct): string {
  return `${p.maSanPham} · ${p.tenSanPham} · ${p.loaiSanPham ?? '—'}`;
}

/**
 * Custom autocomplete combobox for InternationalProduct selection.
 * No external deps — built with useState/useRef/useEffect only.
 * Filters by maSanPham, tenSanPham, loaiSanPham (case-insensitive substring).
 */
const ProductCombobox: React.FC<ProductComboboxProps> = ({
  products,
  value,
  onChange,
  placeholder = 'Tìm sản phẩm theo mã, tên hoặc loại, hoặc nhập tên mới...',
  disabled = false,
  allowCreate = false,
  onCreateNew,
  lotProducts,
}) => {
  const selectedProduct = value ? (products.find((p) => p.id === value) ?? null) : null;

  const [inputText, setInputText] = useState(
    selectedProduct ? displayText(selectedProduct) : ''
  );
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync inputText when value changes externally (e.g., form reset)
  useEffect(() => {
    if (value === null || value === '') {
      setInputText('');
    } else if (selectedProduct) {
      setInputText(displayText(selectedProduct));
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // If user typed but didn't select, revert to last confirmed value
        if (selectedProduct) {
          setInputText(displayText(selectedProduct));
        } else {
          setInputText('');
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedProduct]);

  // Map productId → kiện in the lot, for the stock annotation and ordering
  const stockByProductId = React.useMemo(() => {
    const map = new Map<string, LotProduct>();
    for (const lp of lotProducts ?? []) {
      map.set(lp.internationalProductId, lp);
    }
    return map;
  }, [lotProducts]);

  const filtered = React.useMemo(() => {
    const query = inputText.toLowerCase();
    const matches =
      !query || (selectedProduct && displayText(selectedProduct).toLowerCase() === query)
        ? products
        : products.filter((p) => {
            return (
              p.maSanPham.toLowerCase().includes(query) ||
              p.tenSanPham.toLowerCase().includes(query) ||
              (p.loaiSanPham ?? '').toLowerCase().includes(query)
            );
          });

    // Without lot context the order is whatever the caller gave us
    if (stockByProductId.size === 0) return matches;

    // Products already in the lot come first — that's what the user is most
    // likely topping up, and it makes the lot's contents visible at a glance.
    const inLot: InternationalProduct[] = [];
    const notInLot: InternationalProduct[] = [];
    for (const p of matches) {
      (stockByProductId.has(p.id) ? inLot : notInLot).push(p);
    }
    return [...inLot, ...notInLot];
  }, [inputText, products, selectedProduct, stockByProductId]);

  const inLotCount = React.useMemo(
    () => filtered.filter((p) => stockByProductId.has(p.id)).length,
    [filtered, stockByProductId]
  );

  const selectProduct = useCallback(
    (product: InternationalProduct) => {
      setInputText(displayText(product));
      setIsOpen(false);
      setHighlightedIndex(-1);
      onChange(product.id, product);
    },
    [onChange]
  );

  // Show "Tạo mới «text»" when allowCreate is on, the user typed something,
  // and it doesn't exactly match an existing product name (case-insensitive).
  const trimmedInput = inputText.trim();
  const hasExactMatch = products.some(
    (p) => p.tenSanPham.toLowerCase() === trimmedInput.toLowerCase()
  );
  const showCreateOption =
    allowCreate && trimmedInput.length > 0 && !hasExactMatch && !selectedProduct;

  const selectCreateNew = useCallback(() => {
    if (!trimmedInput) return;
    setIsOpen(false);
    setHighlightedIndex(-1);
    onCreateNew?.(trimmedInput);
  }, [trimmedInput, onCreateNew]);

  // Combined list length for keyboard navigation: create option (if any) + filtered products
  const totalOptions = filtered.length + (showCreateOption ? 1 : 0);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
    // Clear selection if user edits the text
    if (value !== null) {
      onChange(null, null);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    setInputText('');
    setIsOpen(false);
    onChange(null, null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, totalOptions - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filtered.length && filtered[highlightedIndex]) {
        selectProduct(filtered[highlightedIndex]);
      } else if (showCreateOption && highlightedIndex === filtered.length) {
        selectCreateNew();
      } else if (showCreateOption && highlightedIndex === -1 && filtered.length === 0) {
        selectCreateNew();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      if (selectedProduct) {
        setInputText(displayText(selectedProduct));
      }
    }
  };

  // Scroll highlighted option into view
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
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Xóa lựa chọn"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && (filtered.length > 0 || showCreateOption) && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto"
        >
          {filtered.map((product, index) => {
            const kien = stockByProductId.get(product.id);
            // Group headers only make sense when we know the lot's contents
            const showInLotHeader = stockByProductId.size > 0 && index === 0 && !!kien;
            const showOtherHeader =
              stockByProductId.size > 0 && index === inLotCount && inLotCount > 0 && !kien;
            return (
              <React.Fragment key={product.id}>
                {showInLotHeader && (
                  <li className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50/60 sticky top-0">
                    Đã có trong lô
                  </li>
                )}
                {showOtherHeader && (
                  <li className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 border-t border-gray-100">
                    Hàng hóa khác
                  </li>
                )}
                <li
                  role="option"
                  aria-selected={product.id === value}
                  onMouseDown={(e) => {
                    // Prevent blur before click registers
                    e.preventDefault();
                    selectProduct(product);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`px-3 py-2 text-sm cursor-pointer ${
                    index === highlightedIndex
                      ? 'bg-blue-50 text-blue-800'
                      : product.id === value
                      ? 'bg-gray-50 text-gray-800'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium text-blue-700">{product.maSanPham}</span>
                  {' · '}
                  {product.tenSanPham}
                  {' · '}
                  <span className="text-gray-400 text-xs">{product.loaiSanPham ?? '—'}</span>
                  {kien && (
                    <span className="ml-1.5 text-xs font-semibold text-green-700">
                      · Tồn: {kien.soLuong} {kien.donViTinh}
                      {kien.maKien ? (
                        <span className="ml-1 font-normal font-mono text-[10px] text-gray-400">
                          ({kien.maKien})
                        </span>
                      ) : null}
                    </span>
                  )}
                </li>
              </React.Fragment>
            );
          })}
          {showCreateOption && (
            <li
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                e.preventDefault();
                selectCreateNew();
              }}
              onMouseEnter={() => setHighlightedIndex(filtered.length)}
              className={`px-3 py-2 text-sm cursor-pointer border-t border-gray-100 ${
                highlightedIndex === filtered.length
                  ? 'bg-green-50 text-green-800'
                  : 'text-green-700 hover:bg-green-50'
              }`}
            >
              <span className="font-medium">+ Tạo mới sản phẩm</span> "{trimmedInput}"
            </li>
          )}
        </ul>
      )}

      {isOpen && filtered.length === 0 && !showCreateOption && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
          Không tìm thấy sản phẩm
        </div>
      )}
    </div>
  );
};

export default ProductCombobox;
