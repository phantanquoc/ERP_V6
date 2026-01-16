import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface DateTimePickerProps {
  value: string; // YYYY-MM-DDTHH:mm format (datetime-local format)
  onChange: (datetime: string) => void;
  label?: string;
  error?: string;
  required?: boolean;
  minDateTime?: string;
  maxDateTime?: string;
  placeholder?: string;
  allowClear?: boolean;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  label,
  error,
  required,
  minDateTime,
  maxDateTime,
  placeholder = 'Chọn ngày và giờ',
  allowClear = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dateValue, setDateValue] = useState('');
  const [timeValue, setTimeValue] = useState('');
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const [date, time] = value.split('T');
      setDateValue(date || '');
      setTimeValue(time || '');

      // Update view month/year based on selected date
      if (date) {
        const selectedDate = new Date(date);
        setViewMonth(selectedDate.getMonth());
        setViewYear(selectedDate.getFullYear());
      }
    } else {
      setDateValue('');
      setTimeValue('');
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

  const formatDisplayDateTime = (datetime: string) => {
    if (!datetime) return '';
    const [date, time] = datetime.split('T');
    if (!date || !time) return '';

    // Parse date: YYYY-MM-DD -> DD/MM/YYYY
    const [year, month, day] = date.split('-');

    // Format: HH:mm DD/MM/YYYY
    return `${time} ${day}/${month}/${year}`;
  };

  const handleDateChange = (newDate: string) => {
    setDateValue(newDate);
    if (newDate && timeValue) {
      onChange(`${newDate}T${timeValue}`);
    } else if (newDate) {
      // Set default time to current time if not set
      const now = new Date();
      const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      setTimeValue(defaultTime);
      onChange(`${newDate}T${defaultTime}`);
    }
  };

  const handleTimeChange = (newTime: string) => {
    setTimeValue(newTime);
    if (dateValue && newTime) {
      onChange(`${dateValue}T${newTime}`);
    }
  };

  const handleClear = () => {
    setDateValue('');
    setTimeValue('');
    onChange('');
    setIsOpen(false);
  };

  const handleNow = () => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setDateValue(date);
    setTimeValue(time);
    setViewMonth(now.getMonth());
    setViewYear(now.getFullYear());
    onChange(`${date}T${time}`);
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

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setViewMonth(parseInt(e.target.value));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setViewYear(parseInt(e.target.value));
  };

  const isDateDisabled = (day: number): boolean => {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (minDateTime) {
      const minDate = minDateTime.split('T')[0];
      if (dateStr < minDate) return true;
    }

    if (maxDateTime) {
      const maxDate = maxDateTime.split('T')[0];
      if (dateStr > maxDate) return true;
    }

    return false;
  };

  const handleDateClick = (day: number) => {
    if (isDateDisabled(day)) return;

    const newDate = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    handleDateChange(newDate);
  };

  const renderCalendarDays = () => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days: JSX.Element[] = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = dateValue === dateStr;
      const isToday = dateStr === new Date().toISOString().split('T')[0];
      const disabled = isDateDisabled(day);

      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateClick(day)}
          disabled={disabled}
          className={`
            p-2 text-sm rounded transition-colors
            ${disabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-blue-50 cursor-pointer'}
            ${isSelected && !disabled ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
            ${isToday && !isSelected && !disabled ? 'border border-blue-600 text-blue-600' : ''}
            ${!isSelected && !isToday && !disabled ? 'text-gray-700' : ''}
          `}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 20 }, (_, i) => currentYear - 10 + i);

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input Field */}
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={value ? formatDisplayDateTime(value) : ''}
          onClick={() => setIsOpen(!isOpen)}
          readOnly
          required={required}
          className={`
            w-full pl-10 pr-${allowClear && value ? '10' : '3'} py-2 border rounded-md cursor-pointer
            focus:ring-2 focus:ring-blue-500 focus:border-transparent
            ${error ? 'border-red-500' : 'border-gray-300'}
          `}
          placeholder={placeholder}
        />
        {allowClear && value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-full min-w-[320px]">
          <div className="space-y-3">
            {/* Calendar */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Ngày
              </label>

              {/* Month/Year Navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex gap-2">
                  <select
                    value={viewMonth}
                    onChange={handleMonthChange}
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Day Names */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {dayNames.map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-gray-600 p-1">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {renderCalendarDays()}
              </div>
            </div>

            {/* Time Input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Giờ
              </label>
              <input
                type="time"
                value={timeValue}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between gap-2 pt-2 border-t border-gray-200">
              <button
                type="button"
                onClick={handleNow}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                Bây giờ
              </button>
              <div className="flex gap-2">
                {allowClear && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    Xóa
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Xong
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateTimePicker;
