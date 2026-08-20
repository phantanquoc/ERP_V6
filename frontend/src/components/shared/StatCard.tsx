import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface SubCount {
  label: string;
  count: number;
  tone?: 'red' | 'yellow' | 'green' | 'blue' | 'gray';
}

interface StatCardProps {
  label: string;
  value: number | null;
  /** Positive = up, negative = down, 0 or undefined = flat */
  delta?: number | null;
  deltaLabel?: string;
  subCounts?: SubCount[];
  icon?: React.ReactNode;
  onClick?: () => void;
  /** Extra CSS class to apply to the card container */
  className?: string;
}

const TONE_DOT: Record<string, string> = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  gray: 'bg-gray-400',
};

/** @deprecated Use KpiCard from design-system/KpiCard.tsx instead */
export const StatCard = ({
  label,
  value,
  delta,
  deltaLabel,
  subCounts,
  icon,
  onClick,
  className = '',
}: StatCardProps) => {
  const Tag = onClick ? 'button' : 'div';

  const DeltaIcon =
    delta == null || delta === 0
      ? Minus
      : delta > 0
      ? TrendingUp
      : TrendingDown;

  const deltaColor =
    delta == null || delta === 0
      ? 'text-gray-500'
      : delta > 0
      ? 'text-red-600'
      : 'text-green-600';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-lg border bg-white px-4 py-3 text-left transition-shadow hover:shadow-md ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <p className="flex items-center gap-1 text-xs font-medium text-gray-600">
        {icon && <span className="shrink-0">{icon}</span>}
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold text-gray-900">
        {value === null ? (
          <span className="block h-7 w-10 animate-pulse rounded bg-gray-200" />
        ) : (
          value
        )}
      </p>

      {delta != null && (
        <p className={`mt-0.5 flex items-center gap-0.5 text-[11px] font-medium ${deltaColor}`}>
          <DeltaIcon className="h-3 w-3" />
          {delta > 0 ? '+' : ''}{delta}
          {deltaLabel && <span className="ml-0.5 text-gray-500 font-normal">{deltaLabel}</span>}
        </p>
      )}

      {subCounts && subCounts.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {subCounts.map((sc) => (
            <span
              key={sc.label}
              className="inline-flex items-center gap-0.5 rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
            >
              {sc.tone && (
                <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[sc.tone] ?? 'bg-gray-400'}`} />
              )}
              {sc.label}: {sc.count}
            </span>
          ))}
        </div>
      )}
    </Tag>
  );
};

export default StatCard;
