import React, { useState, useEffect, useRef, useCallback } from 'react';
import useVirtualKeyboard from '../../hooks/useVirtualKeyboard';

export interface FieldFocusEditorProps {
  open: boolean;
  label: string;
  value: number;
  unit?: string;
  suggestions?: number[];
  onChange: (v: number) => void;
  onNext?: () => void;
  onClose: () => void;
  integer?: boolean;
  min?: number;
  max?: number;
}

const FieldFocusEditor: React.FC<FieldFocusEditorProps> = ({
  open,
  label,
  value,
  unit,
  suggestions,
  onChange,
  onNext,
  onClose,
  integer,
  min = 0,
  max,
}) => {
  const { keyboardHeight } = useVirtualKeyboard();
  const [localValue, setLocalValue] = useState<string>('');
  const [warning, setWarning] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync local value when opening or when value/label changes (field switch via "Tiep")
  useEffect(() => {
    if (open) {
      setLocalValue(value === 0 ? '' : String(value));
      setWarning('');
      // Auto-focus with slight delay to ensure DOM is ready
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [open, value, label]);

  const clampAndNotify = useCallback(
    (raw: number): number => {
      if (!isFinite(raw) || isNaN(raw)) {
        setWarning(`${label} không hợp lệ`);
        return min;
      }
      let clamped = integer ? Math.floor(raw) : raw;
      if (clamped < min) clamped = min;
      if (max !== undefined && clamped > max) {
        setWarning(`${label} phải từ ${min} đến ${max}${unit ? unit : ''}`);
        clamped = max;
      } else {
        setWarning('');
      }
      return clamped;
    },
    [label, unit, integer, min, max],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setLocalValue(raw);
      const parsed = raw === '' ? 0 : Number(raw);
      if (!isNaN(parsed)) {
        const clamped = clampAndNotify(parsed);
        onChange(clamped);
      }
    },
    [onChange, clampAndNotify],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: number) => {
      setLocalValue(String(suggestion));
      setWarning('');
      onChange(suggestion);
    },
    [onChange],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center"
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className="w-full max-w-md mx-4 mt-8 bg-white rounded-2xl shadow-xl p-6 space-y-4"
        style={{ paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 16}px` : undefined }}
      >
        {/* Label */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-800">
            {label}
            {unit && <span className="text-gray-400 font-normal ml-1">({unit})</span>}
          </h2>
          {max !== undefined && (
            <p className="text-xs text-gray-400 mt-0.5">Giới hạn: {min} — {max}</p>
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="number"
          inputMode={integer ? 'numeric' : 'decimal'}
          min={min}
          max={max}
          value={localValue}
          onChange={handleInputChange}
          placeholder="0"
          className="w-full min-h-[64px] px-4 py-3 border-2 border-blue-400 rounded-xl text-2xl text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />

        {/* Warning message */}
        {warning && (
          <p className="text-sm text-amber-600 text-center">{warning}</p>
        )}

        {/* Suggestions */}
        {suggestions && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleSuggestionClick(s)}
                className={`min-h-[48px] px-4 py-2 rounded-lg text-base font-medium border transition-colors ${
                  value === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                }`}
              >
                {s}{unit ? ` ${unit}` : ''}
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              className="flex-1 min-h-[52px] px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Tiếp &rarr;
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`${onNext ? 'flex-1' : 'w-full'} min-h-[52px] px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-xl text-base font-semibold focus:outline-none focus:ring-2 focus:ring-gray-400`}
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
};

export default FieldFocusEditor;
