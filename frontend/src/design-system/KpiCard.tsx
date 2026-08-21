import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { shell, typography } from './tokens';

interface KpiSubCount {
  label: string;
  count: number;
  tone?: 'red' | 'yellow' | 'amber' | 'green' | 'blue' | 'gray';
}

interface KpiCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon?: React.ReactNode;
  tone?: 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'red' | 'amber' | 'gray';
  to?: string;
  dot?: string;
  loading?: boolean;
  className?: string;
  /** Positive = up, negative = down, 0 or null = flat — ported from deprecated StatCard */
  delta?: number | null;
  deltaLabel?: string;
  subCounts?: KpiSubCount[];
}

const toneIcon: Record<string, string> = {
  blue: 'text-blue-500',
  green: 'text-emerald-500',
  purple: 'text-violet-500',
  orange: 'text-orange-500',
  cyan: 'text-cyan-500',
  red: 'text-red-500',
  amber: 'text-amber-500',
  gray: 'text-gray-400',
};

const TONE_DOT: Record<string, string> = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  gray: 'bg-gray-400',
};

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  sub,
  icon,
  tone = 'blue',
  to,
  dot,
  loading,
  className,
  delta,
  deltaLabel,
  subCounts,
}) => {
  const navigate = useNavigate();
  const Tag = to ? 'button' : 'div';

  const DeltaIcon =
    delta == null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const deltaColor =
    delta == null || delta === 0
      ? 'text-gray-500'
      : delta > 0
        ? 'text-red-600'
        : 'text-green-600';

  // Shell: shell.card (bg-white border border-gray-200 rounded-lg shadow-sm) + p-3 sm:p-4
  // Interactive: shell.cardInteractive for clickable cards — keeps token as single source.
  const baseClass = `${shell.card} p-3 sm:p-4 text-left w-full`;
  const interactiveClass = to ? ` ${shell.cardInteractive}` : '';
  const extraClass = className ? ` ${className}` : '';

  const ariaLabel = to ? [label, String(value), sub].filter(Boolean).join(' — ') : undefined;

  const tagProps: Record<string, unknown> = {
    className: `${baseClass}${interactiveClass}${extraClass}`,
    ...(to
      ? {
          type: 'button' as const,
          onClick: () => navigate(to),
          'aria-label': ariaLabel,
        }
      : {}),
  };

  return (
    <Tag {...tagProps}>
      <div className="flex items-center gap-2 mb-1 min-w-0">
        {icon && <span className={`${toneIcon[tone] ?? toneIcon.blue} shrink-0`}>{icon}</span>}
        <span className={`${typography.cardLabel} break-words line-clamp-2 leading-tight flex-1 min-w-0`} title={label}>{label}</span>
      </div>
      <div className="flex items-center gap-2 min-w-0">
        {dot && (
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot} ${dot.includes('animate') ? '' : 'animate-pulse'}`}
          />
        )}
        {loading ? (
          <span className="h-7 w-24 bg-gray-200 rounded animate-pulse inline-block" aria-hidden="true" />
        ) : (
          <span className={`${typography.cardValue} truncate min-w-0`} title={String(value)}>{value}</span>
        )}
      </div>
      {sub && <p className={`${typography.cardSub} mt-1 break-words line-clamp-2 leading-tight`} title={sub}>{sub}</p>}
      {delta != null && (
        <p className={`mt-1 flex items-center gap-0.5 text-[11px] font-medium ${deltaColor}`}>
          <DeltaIcon className="h-3 w-3" />
          {delta > 0 ? '+' : ''}
          {delta}
          {deltaLabel && <span className="ml-0.5 font-normal text-gray-500">{deltaLabel}</span>}
        </p>
      )}
      {subCounts && subCounts.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {subCounts.map((sc) => (
            <span
              key={sc.label}
              className="inline-flex items-center gap-0.5 rounded-full border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
            >
              {sc.tone && <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[sc.tone] ?? 'bg-gray-400'}`} />}
              {sc.label}: {sc.count}
            </span>
          ))}
        </div>
      )}
    </Tag>
  );
};

export default KpiCard;
