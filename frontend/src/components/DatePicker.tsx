import React, { useState, useRef, useEffect } from 'react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
      setViewMonth(date.getMonth());
      setViewYear(date.getFullYear());
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
  
  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
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

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setViewMonth(parseInt(e.target.value));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setViewYear(parseInt(e.target.value));
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const renderCalendarDays = () => {
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="p-1"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        day === selectedDate.getDate() &&
        viewMonth === selectedDate.getMonth() &&
        viewYear === selectedDate.getFullYear();

      const isToday =
        day === new Date().getDate() &&
        viewMonth === new Date().getMonth() &&
        viewYear === new Date().getFullYear();

      const disabled = isDateDisabled(day);

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateClick(day)}
          disabled={disabled}
          className={`
            p-1 text-xs rounded transition-colors
            ${disabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-green-50 cursor-pointer'}
            ${isSelected && !disabled ? 'bg-green-600 text-white hover:bg-green-700' : ''}
            ${isToday && !isSelected && !disabled ? 'border border-green-600 text-green-600' : ''}
            ${!isSelected && !isToday && !disabled ? 'text-gray-700' : ''}
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

  return (
    <div ref={containerRef} className="relative">
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
          type="text"
          value={value ? formatDisplayDate(new Date(value)) : ''}
          onClick={() => !disabled && setIsOpen(!isOpen)}
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
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Calendar Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 w-64">
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
                onChange={handleMonthChange}
                className="px-1.5 py-0.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 focus:border-transparent"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={handleYearChange}
                className="px-1.5 py-0.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-green-500 focus:border-transparent"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
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
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default DatePicker;

