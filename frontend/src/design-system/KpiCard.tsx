import React from 'react';
import { useNavigate } from 'react-router-dom';

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
}) => {
  const navigate = useNavigate();
  const Tag = to ? 'button' : 'div';

  const baseClass =
    'bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm text-left w-full';
  const interactiveClass = to
    ? ' cursor-pointer hover:border-gray-300 hover:shadow-md transition-all duration-200'
    : '';
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
        <span className="text-xs font-medium text-gray-500 break-words line-clamp-2 leading-tight flex-1 min-w-0" title={label}>{label}</span>
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
          <span className="text-xl sm:text-2xl font-bold text-gray-800 truncate min-w-0" title={String(value)}>{value}</span>
        )}
      </div>
      {sub && <p className="text-xs text-gray-400 mt-1 break-words line-clamp-2 leading-tight" title={sub}>{sub}</p>}
    </Tag>
  );
};

export default KpiCard;
