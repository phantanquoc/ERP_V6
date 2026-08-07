import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  label?: string;
  error?: string;
  required?: boolean;
  minDate?: string; // YYYY-MM-DD format - Ngày tối thiểu
  maxDate?: string; // YYYY-MM-DD format - Ngày tối đa
  placeholder?: string; // Placeholder text
  allowClear?: boolean; // Cho phép xóa giá trị
  disabled?: boolean; // Vô hiệu hóa input
}

const DROPDOWN_WIDTH = 256; // w-64 = 16rem = 256px
const DROPDOWN_HEIGHT = 300; // approximate calendar height
const VIEWPORT_MARGIN = 8;

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  error,
  required,
  minDate,
  maxDate,
  placeholder = 'Chọn ngày',
  allowClear = false,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(value ? new Date(value) : new Date());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync internal state when value prop changes
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
      setViewMonth(date.getMonth());
      setViewYear(date.getFullYear());
    }
  }, [value]);

  // Calculate dropdown position relative to viewport (for position: fixed)
  const calcPosition = () => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const showAbove = spaceBelow < DROPDOWN_HEIGHT && rect.top > DROPDOWN_HEIGHT;

    const top = showAbove
      ? rect.top - DROPDOWN_HEIGHT - 4
      : rect.bottom + 4;

    // Clamp both edges: the right-edge clamp alone goes negative on viewports
    // narrower than DROPDOWN_WIDTH + margin.
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.left, window.innerWidth - DROPDOWN_WIDTH - VIEWPORT_MARGIN)
    );

    setDropdownPos({ top, left });
  };

  // Recalculate on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return;
    calcPosition();

    const handleUpdate = () => calcPosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);
    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click (handles both input wrapper and portal dropdown)
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideInput = inputRef.current?.parentElement?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideInput && !insideDropdown) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();

  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
  ];

  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const isDateDisabled = (day: number): boolean => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    return false;
  };

  const handleDateClick = (day: number) => {
    if (isDateDisabled(day)) return;
    const newDate = new Date(viewYear, viewMonth, day);
    setSelectedDate(newDate);
    const formattedDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(formattedDate);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const formatDisplayDate = (date: Date) =>
    date.toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit' });

  const renderCalendarDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="p-1" />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        day === selectedDate.getDate() &&
        viewMonth === selectedDate.getMonth() &&
        viewYear === selectedDate.getFullYear();
      const isToday =
        day === new Date().getDate() &&
        viewMonth === new Date().getMonth() &&
        viewYear === new Date().getFullYear();
      const isDisabled = isDateDisabled(day);

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateClick(day)}
          disabled={isDisabled}
          className={`
            p-1 text-xs rounded transition-colors
            ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-green-50 cursor-pointer'}
            ${isSelected && !isDisabled ? 'bg-green-600 text-white hover:bg-green-700' : ''}
            ${isToday && !isSelected && !isDisabled ? 'border border-green-600 text-green-600' : ''}
            ${!isSelected && !isToday && !isDisabled ? 'text-gray-700' : ''}
          `}
        >
          {day}
        </button>
      );
    }
    return days;
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);

  // Portal calendar rendered at document.body — escapes any overflow:hidden / stacking context
  const calendarPortal = isOpen
    ? ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: DROPDOWN_WIDTH,
            zIndex: 9999,
          }}
          className="bg-white rounded-lg shadow-xl border border-gray-200 p-2"
        >
          {/* Month/Year Selector */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-0.5 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>

            <div className="flex gap-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(parseInt(e.target.value))}
                className="px-1.5 py-0.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 focus:border-transparent"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>{month}</option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value))}
                className="px-1.5 py-0.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 focus:border-transparent"
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-0.5 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-600 p-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-0.5">
            {renderCalendarDays()}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-1.5 mt-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                onChange(formattedDate);
                setSelectedDate(today);
                setViewMonth(today.getMonth());
                setViewYear(today.getFullYear());
              }}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Xong
            </button>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Field */}
      <div className="relative">
        <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value ? formatDisplayDate(new Date(value)) : ''}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          readOnly
          disabled={disabled}
          className={`
            w-full pl-8 py-1.5 text-sm border rounded-lg
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'}
            focus:ring-2 focus:ring-green-500 focus:border-transparent
            ${error ? 'border-red-500' : 'border-gray-300'}
            ${allowClear && value ? 'pr-8' : 'pr-3'}
          `}
          placeholder={placeholder}
        />
        {allowClear && value && !disabled && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {calendarPortal}

      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default DatePicker;
