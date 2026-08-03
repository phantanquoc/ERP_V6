import React from 'react';
import { useLookups } from '../../hooks/useLookups';
import { LOOKUP_GROUPS } from '../../types/lookup';

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
 * Reusable dropdown for donViTinh, backed by the shared lookup API
 * (`useLookups('DON_VI_TINH')`) rather than a hardcoded constant — change:
 * shared-lookup-table. Admins manage the option list from Settings; no redeploy needed.
 *
 * ZERO DATA LOSS (design.md Q2): whenever `value` is non-empty it is passed as
 * `includeValue`, so a stored label that has since been hidden (isActive=false) is
 * still rendered — marked "(đã ẩn)" — instead of being silently dropped from the
 * options and blanked on save. The preserved entry is scoped to this field's current
 * value only; it is never offered as a choice for a different record.
 *
 * While the list is loading we render the current `value` as the sole option and never
 * emit an onChange, so an in-flight fetch cannot clear an existing field.
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

  // Non-empty value => edit mode: keep the stored label selectable even if hidden.
  const { data: units, isLoading, isError } = useLookups(LOOKUP_GROUPS.DON_VI_TINH, {
    includeValue: value || undefined,
  });

  return (
    <>
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
        <option value="">{isLoading ? 'Đang tải...' : '-- Chọn đơn vị --'}</option>
        {/*
          Preserve the stored value during load/error so the field never renders a
          value the <select> has no option for (which would blank it on submit).
        */}
        {(isLoading || isError) && value && <option value={value}>{value}</option>}
        {!isLoading &&
          !isError &&
          units.map((unit) => (
            <option key={unit.id} value={unit.label}>
              {unit.isActive ? unit.label : `${unit.label} (đã ẩn)`}
            </option>
          ))}
      </select>
      {isError && (
        <p className="mt-1 text-xs text-red-500">
          Không tải được danh sách đơn vị tính. Giá trị hiện tại được giữ nguyên.
        </p>
      )}
    </>
  );
};

export default UnitSelect;
