import React from 'react';
import { useNavigate } from 'react-router-dom';

export const CircularProgress: React.FC<{ value: number; size?: number; strokeWidth?: number; color?: string; label?: string }> = ({
  value, size = 100, strokeWidth = 8, color = '#10B981', label,
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
      {label && <p className="text-xs text-gray-400 mt-1">{label}</p>}
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

export const NavCard: React.FC<{ title: string; desc: string; icon: React.ReactNode; to: string }> = ({ title, desc, icon, to }) => {
  const navigate = useNavigate();
  const handleClick = () => { navigate(to); };
  return (
    <button onClick={handleClick} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-cyan-300 hover:shadow-md transition-all duration-200 text-left w-full group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600 group-hover:bg-cyan-100 transition-colors">{icon}</div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            <p className="text-xs text-gray-400">{desc}</p>
          </div>
        </div>
        <span className="text-gray-300 group-hover:text-cyan-500 transition-colors" aria-hidden="true">→</span>
      </div>
    </button>
  );
};

export default CircularProgress;
