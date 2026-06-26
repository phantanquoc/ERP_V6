import React, { useState, useRef, useEffect, useCallback } from 'react';
import { InternationalProduct } from '../../services/internationalProductService';

interface ProductComboboxProps {
  products: InternationalProduct[];
  value: string | null;
  onChange: (productId: string | null, product: InternationalProduct | null) => void;
  placeholder?: string;
  disabled?: boolean;
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
  placeholder = 'Tìm sản phẩm theo mã, tên hoặc loại...',
  disabled = false,
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

  const filtered = React.useMemo(() => {
    const query = inputText.toLowerCase();
    if (!query || (selectedProduct && displayText(selectedProduct).toLowerCase() === query)) {
      // Show all when input matches current selection or is empty
      return products;
    }
    return products.filter((p) => {
      return (
        p.maSanPham.toLowerCase().includes(query) ||
        p.tenSanPham.toLowerCase().includes(query) ||
        (p.loaiSanPham ?? '').toLowerCase().includes(query)
      );
    });
  }, [inputText, products, selectedProduct]);

  const selectProduct = useCallback(
    (product: InternationalProduct) => {
      setInputText(displayText(product));
      setIsOpen(false);
      setHighlightedIndex(-1);
      onChange(product.id, product);
    },
    [onChange]
  );

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
      setHighlightedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
        selectProduct(filtered[highlightedIndex]);
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

      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto"
        >
          {filtered.map((product, index) => (
            <li
              key={product.id}
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
            </li>
          ))}
        </ul>
      )}

      {isOpen && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
          Không tìm thấy sản phẩm
        </div>
      )}
    </div>
  );
};

export default ProductCombobox;
