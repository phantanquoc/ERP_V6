import React from 'react';
import { ProjectPhase, ProjectTask } from '../services/projectService';

interface Props {
  ngayBatDau: string;
  ngayKetThuc?: string;
  phases: ProjectPhase[];
}

const COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-amber-500', 'bg-emerald-500', 'bg-rose-500',
];

const daysBetween = (a: Date, b: Date) => Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000));

const formatDate = (d: Date) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

const ProjectGantt: React.FC<Props> = ({ ngayBatDau, ngayKetThuc, phases }) => {
  const start = new Date(ngayBatDau);
  const end = ngayKetThuc ? new Date(ngayKetThuc) : new Date(start.getTime() + 90 * 86400000);
  const totalDays = daysBetween(start, end);

  const today = new Date();
  const todayPct = Math.min(100, Math.max(0, (daysBetween(start, today) / totalDays) * 100));

  const milestones: { task: ProjectTask; pct: number; color: string }[] = [];

  const phaseRows = phases.map((phase, idx) => {
    const color = COLORS[idx % COLORS.length];
    const pStart = phase.ngayBatDau ? new Date(phase.ngayBatDau) : null;
    const pEnd = phase.ngayKetThuc ? new Date(phase.ngayKetThuc) : null;

    if (phase.tasks) {
      phase.tasks
        .filter(t => t.laMilestone && t.deadline)
        .forEach(t => {
          const mDate = new Date(t.deadline!);
          const mPct = Math.min(100, Math.max(0, (daysBetween(start, mDate) / totalDays) * 100));
          milestones.push({ task: t, pct: mPct, color });
        });
    }

    if (!pStart || !pEnd) {
      return { phase, color, leftPct: 0, widthPct: 100, noDate: true };
    }

    const leftPct = Math.max(0, (daysBetween(start, pStart) / totalDays) * 100);
    const widthPct = Math.min(100 - leftPct, (daysBetween(pStart, pEnd) / totalDays) * 100);
    return { phase, color, leftPct, widthPct, noDate: false };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-gray-500 px-1">
        <span>{formatDate(start)}</span>
        <span className="text-red-500 font-medium">Hôm nay</span>
        <span>{formatDate(end)}</span>
      </div>

      <div className="relative space-y-2">
        {/* Today marker */}
        {todayPct > 0 && todayPct < 100 && (
          <div
            className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
            style={{ left: `${todayPct}%` }}
          />
        )}

        {phaseRows.map(({ phase, color, leftPct, widthPct, noDate }, idx) => (
          <div key={phase.id} className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-28 truncate shrink-0" title={phase.tenGiaiDoan}>
              {idx + 1}. {phase.tenGiaiDoan}
            </span>
            <div className="relative flex-1 h-7 bg-gray-100 rounded overflow-hidden">
              {noDate ? (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400 italic">
                  Chưa có ngày
                </div>
              ) : (
                <div
                  className={`absolute h-full rounded ${color} flex items-center px-2 overflow-hidden`}
                  style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 3)}%` }}
                >
                  <span className="text-xs text-white font-medium truncate">
                    {phase.tienDo}%
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Milestones row */}
        {milestones.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600 w-28 shrink-0">Milestones</span>
            <div className="relative flex-1 h-7 bg-gray-50 rounded">
              {milestones.map(({ task, pct }) => (
                <div
                  key={task.id}
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-orange-500 rotate-45 border border-orange-600"
                  style={{ left: `${pct}%`, marginLeft: '-6px' }}
                  title={`${task.tieuDe} — ${task.deadline ? new Date(task.deadline).toLocaleDateString('vi-VN') : ''}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-100">
        {phaseRows.map(({ phase, color }, idx) => (
          <div key={phase.id} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${color}`} />
            <span className="text-xs text-gray-600">{idx + 1}. {phase.tenGiaiDoan}</span>
          </div>
        ))}
        {milestones.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-orange-500 rotate-45" />
            <span className="text-xs text-gray-600">Milestone</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectGantt;
