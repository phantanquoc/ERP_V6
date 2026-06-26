import React from 'react';
import { DON_VI_TINH_OPTIONS } from '../../constants/units';

interface UnitSelectProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  label?: string;
}

/**
 * Reusable dropdown for the 13 standard donViTinh options.
 * Keeps all form fields consistent and prevents free-text variants
 * that would break the ME Kg filter.
 */
const UnitSelect: React.FC<UnitSelectProps> = ({
  value,
  onChange,
  id,
  name,
  className,
  required,
  disabled,
  label,
}) => {
  const baseClass =
    'w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className ?? baseClass}
      required={required}
      disabled={disabled}
      aria-label={label ?? 'Đơn vị tính'}
    >
      <option value="">-- Chọn đơn vị --</option>
      {DON_VI_TINH_OPTIONS.map((unit) => (
        <option key={unit} value={unit}>
          {unit}
        </option>
      ))}
    </select>
  );
};

export default UnitSelect;
