import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';

interface DetailOption {
  id: string;
  maChiTiet: string;
  tenChiTiet: string;
}

interface Props {
  details: DetailOption[];
  value: string;
  onSelectDetail: (detailId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

function detailDisplayText(d: DetailOption): string {
  return `${d.maChiTiet} - ${d.tenChiTiet}`;
}

const MachineSystemDetailCombobox: React.FC<Props> = ({
  details,
  value,
  onSelectDetail,
  placeholder = 'Tìm chi tiết theo mã hoặc tên...',
  disabled = false,
}) => {
  const selected = value ? details.find((d) => d.id === value) ?? null : null;

  const getDisplayText = useCallback(() => {
    if (selected) return detailDisplayText(selected);
    return '';
  }, [selected]);

  const [inputText, setInputText] = useState(getDisplayText());
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setInputText(getDisplayText());
  }, [getDisplayText]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setInputText(getDisplayText());
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [getDisplayText]);

  const filtered = useMemo(() => {
    const q = inputText.trim().toLowerCase();
    if (!q || (selected && detailDisplayText(selected).toLowerCase() === q)) return details;
    return details.filter(
      (d) => d.maChiTiet.toLowerCase().includes(q) || d.tenChiTiet.toLowerCase().includes(q),
    );
  }, [inputText, details, selected]);

  // +1 for "Không chọn" option
  const totalOptions = filtered.length + 1;

  const select = useCallback(
    (id: string) => {
      setIsOpen(false);
      setHighlightedIndex(-1);
      onSelectDetail(id);
    },
    [onSelectDetail],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    setInputText('');
    setIsOpen(true);
    setHighlightedIndex(-1);
    if (value) onSelectDetail('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') setIsOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((p) => Math.min(p + 1, totalOptions - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((p) => Math.max(p - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex === 0) {
        select('');
      } else if (highlightedIndex > 0 && highlightedIndex <= filtered.length) {
        const d = filtered[highlightedIndex - 1];
        if (d) select(d.id);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputText(getDisplayText());
    }
  };

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  if (disabled) {
    return (
      <input
        type="text"
        disabled
        value={getDisplayText()}
        className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-default min-h-[44px] focus:outline-none"
      />
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={handleChange}
          onFocus={() => { setIsOpen(true); setHighlightedIndex(-1); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full px-3 py-2.5 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm min-h-[44px] transition-colors"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        />
        {value && (
          <button type="button" onClick={handleClear} className="absolute right-2 text-gray-400 hover:text-gray-600 focus:outline-none" aria-label="Xóa lựa chọn">×</button>
        )}
      </div>

      {isOpen && (
        <ul ref={listRef} role="listbox" className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          <li
            role="option"
            aria-selected={!value}
            onMouseDown={(e) => { e.preventDefault(); select(''); }}
            onMouseEnter={() => setHighlightedIndex(0)}
            className={`px-3 py-2 text-sm cursor-pointer border-b border-gray-100 ${highlightedIndex === 0 ? 'bg-blue-50 text-blue-800' : !value ? 'bg-gray-50 text-gray-800' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Không chọn
          </li>
          {filtered.map((d, idx) => {
            const liIndex = idx + 1;
            return (
              <li
                key={d.id}
                role="option"
                aria-selected={d.id === value}
                onMouseDown={(e) => { e.preventDefault(); select(d.id); }}
                onMouseEnter={() => setHighlightedIndex(liIndex)}
                className={`px-3 py-2 text-sm cursor-pointer ${liIndex === highlightedIndex ? 'bg-blue-50 text-blue-800' : d.id === value ? 'bg-gray-50 text-gray-800' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <span className="font-medium text-blue-700">{d.maChiTiet}</span>{' - '}{d.tenChiTiet}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default MachineSystemDetailCombobox;
