import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';

const MANUAL_ENTRY_VALUE = '__manual__';
const MANUAL_ENTRY_LABEL = 'Không có trong danh sách (nhập tay)';

interface MachineSystemComboboxProps {
  systems: Array<{ id: string; maHeThong: string; tenHeThong: string }>;
  /** "" | systemId | MANUAL_ENTRY ('__manual__') */
  value: string;
  onSelectSystem: (systemId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

/** Build display text for a system option. */
function systemDisplayText(s: { maHeThong: string; tenHeThong: string }): string {
  return `${s.maHeThong} - ${s.tenHeThong}`;
}

/**
 * Searchable combobox for selecting a machine system (Hệ thống).
 * Mirrors ProductCombobox behavior: type-to-filter, keyboard navigation,
 * outside-click close, and a manual-entry fallback option.
 */
const MachineSystemCombobox: React.FC<MachineSystemComboboxProps> = ({
  systems,
  value,
  onSelectSystem,
  placeholder = 'Tìm hệ thống theo mã hoặc tên...',
  disabled = false,
  required = false,
}) => {
  const selectedSystem = value && value !== MANUAL_ENTRY_VALUE
    ? (systems.find((s) => s.id === value) ?? null)
    : null;

  const getDisplayText = useCallback(() => {
    if (value === MANUAL_ENTRY_VALUE) return MANUAL_ENTRY_LABEL;
    if (selectedSystem) return systemDisplayText(selectedSystem);
    return '';
  }, [value, selectedSystem]);

  const [inputText, setInputText] = useState(getDisplayText());
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync inputText when value changes externally (e.g., form reset)
  useEffect(() => {
    setInputText(getDisplayText());
  }, [getDisplayText]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Revert to confirmed display text
        setInputText(getDisplayText());
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [getDisplayText]);

  const filteredSystems = useMemo(() => {
    const query = inputText.trim().toLowerCase();
    // When manual entry is selected the input shows the manual label — don't filter by that string; show all systems.
    if (value === MANUAL_ENTRY_VALUE && inputText === MANUAL_ENTRY_LABEL) {
      return systems;
    }
    if (!query || (selectedSystem && systemDisplayText(selectedSystem).toLowerCase() === query)) {
      return systems;
    }
    return systems.filter(
      (s) =>
        s.maHeThong.toLowerCase().includes(query) ||
        s.tenHeThong.toLowerCase().includes(query)
    );
  }, [inputText, systems, selectedSystem, value]);

  // Total options = filtered systems + 1 manual entry option (always shown last)
  const totalOptions = filteredSystems.length + 1;

  const selectSystem = useCallback(
    (systemId: string) => {
      setIsOpen(false);
      setHighlightedIndex(-1);
      onSelectSystem(systemId);
    },
    [onSelectSystem]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    setInputText('');
    setIsOpen(true);
    setHighlightedIndex(-1);
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
      if (highlightedIndex >= 0 && highlightedIndex < filteredSystems.length) {
        const sys = filteredSystems[highlightedIndex];
        if (sys) selectSystem(sys.id);
      } else if (highlightedIndex === filteredSystems.length) {
        // Manual entry option
        selectSystem(MANUAL_ENTRY_VALUE);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputText(getDisplayText());
    }
  };

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  // Disabled / locked mode: render a read-only input
  if (disabled) {
    return (
      <input
        type="text"
        disabled
        value={getDisplayText()}
        required={required}
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
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
          className="w-full px-3 py-2.5 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm min-h-[44px] transition-colors"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        />
        {value && (
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

      {isOpen && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto"
        >
          {filteredSystems.map((system, index) => (
            <li
              key={system.id}
              role="option"
              aria-selected={system.id === value}
              onMouseDown={(e) => {
                e.preventDefault();
                selectSystem(system.id);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`px-3 py-2 text-sm cursor-pointer ${
                index === highlightedIndex
                  ? 'bg-blue-50 text-blue-800'
                  : system.id === value
                    ? 'bg-gray-50 text-gray-800'
                    : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="font-medium text-blue-700">{system.maHeThong}</span>
              {' - '}
              {system.tenHeThong}
            </li>
          ))}

          {/* Manual entry option — always last, serves as fallback when no match */}
          <li
            role="option"
            aria-selected={value === MANUAL_ENTRY_VALUE}
            onMouseDown={(e) => {
              e.preventDefault();
              selectSystem(MANUAL_ENTRY_VALUE);
            }}
            onMouseEnter={() => setHighlightedIndex(filteredSystems.length)}
            className={`px-3 py-2 text-sm cursor-pointer border-t border-gray-100 ${
              highlightedIndex === filteredSystems.length
                ? 'bg-blue-50 text-blue-800'
                : value === MANUAL_ENTRY_VALUE
                  ? 'bg-gray-50 text-gray-800'
                  : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {MANUAL_ENTRY_LABEL}
          </li>
        </ul>
      )}
    </div>
  );
};

export default MachineSystemCombobox;
