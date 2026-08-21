import React from 'react';
import { typography, colors } from './tokens';

// Re-export NavCard from its own module — keeps Progress.tsx focused on progress primitives
// while preserving backward-compat import path `from '../design-system/Progress'`.
export { NavCard } from './NavCard';
export type { NavCardProps, NavCardTone } from './NavCard';

export const CircularProgress: React.FC<{ value: number; size?: number; strokeWidth?: number; color?: string; label?: string }> = ({
  value, size = 100, strokeWidth = 8, color = colors.success, label,
}) => {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <div
      className="flex flex-col items-center"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${clamped}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fill="#1f2937" className="text-lg font-bold">
          {clamped}%
        </text>
      </svg>
      {label && <p className={typography.cardSub + ' mt-1'}>{label}</p>}
    </div>
  );
};

export const ProgressBar: React.FC<{ segments: { label: string; value: number; color: string }[]; total: number; ariaLabel?: string }> = ({ segments, total, ariaLabel }) => (
  <div role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={segments.reduce((sum, s) => sum + s.value, 0)} aria-label={ariaLabel ?? 'Progress'}>
    <div className="flex h-5 rounded-full overflow-hidden gap-0.5 mb-3">
      {segments.map((s, i) => {
        const pct = total > 0 ? (s.value / total) * 100 : 0;
        return (
          <div key={`${s.label}-${i}`} className={`${s.color} transition-all duration-500 flex items-center justify-center focus-visible:outline-none`} style={{ width: `${pct}%`, minWidth: pct > 0 ? '2px' : '0' }}>
            {/* Only render value label when segment is wide enough to fit text without overflow/clipping; pct > 8 threshold ~ ensures ~8% minimum width for readability */}
            {pct > 8 && <span className="text-white text-xs font-medium">{s.value}</span>}
          </div>
        );
      })}
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {segments.map((s, i) => (
        <span key={`${s.label}-${i}`} className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className={`inline-block w-2.5 h-2.5 rounded-sm ${s.color}`} /> {s.label}: <strong className="text-gray-700">{s.value}</strong>
        </span>
      ))}
    </div>
  </div>
);

export default CircularProgress;
