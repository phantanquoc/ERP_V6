import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { EmployeeOption } from '../../hooks/useEmployeesForAssignment';

interface EmployeeComboboxProps {
  employees: EmployeeOption[];
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Single-select searchable combobox for employee selection.
 * Value is the employee display name (string).
 * Filters by name, employeeCode, department (case-insensitive substring).
 */
const EmployeeCombobox: React.FC<EmployeeComboboxProps> = ({
  employees,
  value,
  onChange,
  placeholder = 'Tìm nhân viên...',
  disabled = false,
}) => {
  const [inputText, setInputText] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync inputText when value changes externally
  useEffect(() => {
    setInputText(value || '');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // Revert to current value if user typed but didn't select
        setInputText(value || '');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const filtered = useMemo(() => {
    const query = inputText.toLowerCase().trim();
    if (!query || query === value.toLowerCase()) return employees;
    return employees.filter((emp) =>
      emp.name.toLowerCase().includes(query) ||
      emp.employeeCode.toLowerCase().includes(query) ||
      (emp.department ?? '').toLowerCase().includes(query)
    );
  }, [inputText, employees, value]);

  const selectEmployee = useCallback(
    (emp: EmployeeOption) => {
      setInputText(emp.name);
      setIsOpen(false);
      setHighlightedIndex(-1);
      onChange(emp.name);
    },
    [onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    setIsOpen(true);
    setHighlightedIndex(-1);
    if (value && e.target.value !== value) {
      onChange('');
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  const handleClear = () => {
    setInputText('');
    setIsOpen(false);
    onChange('');
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
        selectEmployee(filtered[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setInputText(value || '');
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
            aria-label="Xoá lựa chọn"
          >
            &times;
          </button>
        )}
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
              aria-selected={emp.name === value}
              onMouseDown={(e) => { e.preventDefault(); selectEmployee(emp); }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`px-3 py-2 text-sm cursor-pointer ${
                index === highlightedIndex
                  ? 'bg-blue-50 text-blue-800'
                  : emp.name === value
                  ? 'bg-gray-50 text-gray-800'
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

      {isOpen && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-400">
          Không tìm thấy nhân viên
        </div>
      )}
    </div>
  );
};

export default EmployeeCombobox;
