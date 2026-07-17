import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { EmployeeOption } from '../../hooks/useEmployeesForAssignment';

interface EmployeeMultiComboboxProps {
  employees: EmployeeOption[];
  value: string[];
  onChange: (names: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Multi-select searchable combobox for employee selection (chips).
 * Value is an array of employee display names.
 * Filters by name, employeeCode, department (case-insensitive substring).
 * Deduplicates selections automatically.
 */
const EmployeeMultiCombobox: React.FC<EmployeeMultiComboboxProps> = ({
  employees,
  value,
  onChange,
  placeholder = 'Tìm và thêm nhân viên...',
  disabled = false,
}) => {
  const [inputText, setInputText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setInputText('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const query = inputText.toLowerCase().trim();
    const available = employees.filter((emp) => !value.includes(emp.name));
    if (!query) return available;
    return available.filter((emp) =>
      emp.name.toLowerCase().includes(query) ||
      emp.employeeCode.toLowerCase().includes(query) ||
      (emp.department ?? '').toLowerCase().includes(query)
    );
  }, [inputText, employees, value]);

  const addEmployee = useCallback(
    (emp: EmployeeOption) => {
      if (!value.includes(emp.name)) {
        onChange([...value, emp.name]);
      }
      setInputText('');
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    },
    [onChange, value]
  );

  const removeEmployee = useCallback(
    (name: string) => {
      onChange(value.filter((n) => n !== name));
    },
    [onChange, value]
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !inputText && value.length > 0) {
      removeEmployee(value[value.length - 1]);
      return;
    }
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
        addEmployee(filtered[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputText('');
    }
  };

  // Scroll highlighted into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`flex flex-wrap items-center gap-1 px-2 py-1.5 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 min-h-[38px] ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
        }`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {value.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
          >
            {name}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeEmployee(name); }}
                className="text-blue-500 hover:text-blue-700 focus:outline-none"
                aria-label={`Xoá ${name}`}
              >
                &times;
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
          autoComplete="off"
          className="flex-1 min-w-[80px] px-1 py-0.5 text-sm border-none outline-none bg-transparent disabled:cursor-not-allowed"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          role="combobox"
        />
      </div>

      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto"
        >
          {filtered.map((emp, index) => (
            <li
              key={emp.id}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => { e.preventDefault(); addEmployee(emp); }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`px-3 py-2 text-sm cursor-pointer ${
                index === highlightedIndex
                  ? 'bg-blue-50 text-blue-800'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="font-medium">{emp.name}</span>
              {emp.employeeCode && (
                <span className="ml-2 text-xs text-gray-400">{emp.employeeCode}</span>
              )}
              {emp.department && (
                <span className="ml-2 text-xs text-gray-400">({emp.department})</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOpen && filtered.length === 0 && inputText && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
          Không tìm thấy nhân viên
        </div>
      )}
    </div>
  );
};

export default EmployeeMultiCombobox;
