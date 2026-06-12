import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Diamond, Flag } from 'lucide-react';
import type { ProjectPhase, ProjectTask } from '../services/projectService';

interface Props {
  ngayBatDau: string;
  ngayKetThuc?: string;
  phases: ProjectPhase[];
}

const PHASE_COLORS = [
  { bar: '#3b82f6', bg: 'bg-blue-500' },
  { bar: '#8b5cf6', bg: 'bg-violet-500' },
  { bar: '#f59e0b', bg: 'bg-amber-500' },
  { bar: '#10b981', bg: 'bg-emerald-500' },
  { bar: '#f43f5e', bg: 'bg-rose-500' },
  { bar: '#06b6d4', bg: 'bg-cyan-500' },
];

const STATUS_STYLES: Record<string, { color: string; bg: string }> = {
  'Hoàn thành': { color: '#16a34a', bg: '#22c55e' },
  'Đang làm': { color: '#2563eb', bg: '#60a5fa' },
  'Trễ': { color: '#dc2626', bg: '#ef4444' },
  'Chưa bắt đầu': { color: '#9ca3af', bg: '#d1d5db' },
};

const daysBetween = (a: Date, b: Date) => Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000));
const fmtDate = (d: Date) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
const fmtDateFull = (d: Date) => d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const NAME_COL = 260;

const GanttTooltip = ({ children, label }: { children: React.ReactNode; label: React.ReactNode }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
          {label}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};

const isTaskLate = (task: ProjectTask) => {
  if (task.trangThai === 'Trễ') return true;
  if (task.trangThai === 'Hoàn thành') return false;
  const endDate = task.ngayKetThuc ?? task.deadline;
  if (!endDate) return false;
  return new Date(endDate).getTime() < Date.now();
};

const getTaskStatus = (task: ProjectTask): string => {
  if (isTaskLate(task) && task.trangThai !== 'Hoàn thành') return 'Trễ';
  return task.trangThai;
};

const getMonthMarkers = (start: Date, end: Date, totalDays: number) => {
  const markers: { label: string; pct: number }[] = [];
  const current = new Date(start.getFullYear(), start.getMonth(), 1);
  while (current <= end) {
    const diffDays = (current.getTime() - start.getTime()) / 86400000;
    const pct = (diffDays / totalDays) * 100;
    if (pct >= -5 && pct <= 100) {
      markers.push({ label: `T${current.getMonth() + 1}/${current.getFullYear()}`, pct: Math.max(0, pct) });
    }
    current.setMonth(current.getMonth() + 1);
  }
  return markers;
};

const ProjectGantt: React.FC<Props> = ({ ngayBatDau, ngayKetThuc, phases }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const start = new Date(ngayBatDau);
  const end = ngayKetThuc ? new Date(ngayKetThuc) : new Date(start.getTime() + 90 * 86400000);
  const totalDays = daysBetween(start, end);

  const today = new Date();
  const todayOffset = (today.getTime() - start.getTime()) / (end.getTime() - start.getTime()) * 100;
  const showToday = todayOffset >= 0 && todayOffset <= 100;
  const monthMarkers = getMonthMarkers(start, end, totalDays);

  const toggleExpand = (phaseId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(phaseId) ? next.delete(phaseId) : next.add(phaseId);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(phases.map((p) => p.id)));
  const collapseAll = () => setExpanded(new Set());

  const getBarPct = (sd?: string | null, ed?: string | null) => {
    if (!sd || !ed) return null;
    const s = new Date(sd);
    const e = new Date(ed);
    const left = Math.max(0, ((s.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100);
    const width = Math.min(100 - left, ((e.getTime() - s.getTime()) / (end.getTime() - start.getTime())) * 100);
    return { left, width: Math.max(width, 1.2) };
  };

  const milestones = phases.flatMap((phase, idx) =>
    (phase.tasks ?? [])
      .filter((t) => t.laMilestone && (t.ngayKetThuc || t.deadline))
      .map((t) => {
        const mDate = new Date((t.ngayKetThuc ?? t.deadline)!);
        const pct = Math.min(100, Math.max(0, ((mDate.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100));
        return { task: t, pct, colorIdx: idx };
      })
  );

  const totalTasks = phases.reduce((s, p) => s + (p.tasks?.length ?? 0), 0);
  const doneTasks = phases.reduce((s, p) => s + (p.tasks?.filter(t => t.trangThai === 'Hoàn thành').length ?? 0), 0);
  const lateTasks = phases.reduce((s, p) => s + (p.tasks?.filter(t => getTaskStatus(t) === 'Trễ').length ?? 0), 0);

  return (
    <div className="space-y-2">
      {/* Compact header stats */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-gray-600">
        <div className="flex items-center gap-4">
          <span><strong>{totalTasks}</strong> tasks</span>
          <span className="text-green-600"><strong>{doneTasks}</strong> xong</span>
          {lateTasks > 0 && <span className="text-red-600"><strong>{lateTasks}</strong> trễ</span>}
          <span>{fmtDateFull(start)} → {fmtDateFull(end)} ({totalDays} ngày)</span>
        </div>
        <div className="flex gap-2">
          <button onClick={expandAll} className="px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-100 text-xs">Mở tất cả</button>
          <button onClick={collapseAll} className="px-2 py-0.5 rounded border border-gray-300 hover:bg-gray-100 text-xs">Thu gọn</button>
        </div>
      </div>

      {/* Gantt chart — sticky name column + scrollable timeline */}
      <div className="border border-gray-200 rounded-lg overflow-x-auto">
        <div style={{ minWidth: `${NAME_COL + Math.max(700, totalDays * 8)}px` }}>
          {/* Month header row */}
          <div className="flex h-7 border-b border-gray-200 bg-gray-50">
            <div className="sticky left-0 z-20 shrink-0 border-r border-gray-200 bg-gray-50 flex items-center px-2" style={{ width: NAME_COL }}>
              <span className="text-[10px] text-gray-500 font-medium uppercase">Giai đoạn / Công việc</span>
            </div>
            <div className="relative flex-1 min-w-0">
              {monthMarkers.map((m, i) => {
                const nextPct = i < monthMarkers.length - 1 ? monthMarkers[i + 1].pct : 100;
                const w = nextPct - m.pct;
                return (
                  <div key={m.label} className="absolute top-0 h-full flex items-center border-l border-gray-200" style={{ left: `${m.pct}%`, width: `${w}%` }}>
                    <span className="pl-1.5 text-[10px] text-gray-500 font-medium">{m.label}</span>
                  </div>
                );
              })}
              {showToday && (
                <div className="absolute top-0 h-full w-0.5 bg-red-500 z-10" style={{ left: `${todayOffset}%` }}>
                  <span className="absolute -top-0 left-1 text-[9px] text-red-500 font-bold whitespace-nowrap">Hôm nay</span>
                </div>
              )}
            </div>
          </div>

          {/* Phase & task rows */}
          {phases.map((phase, idx) => {
            const phaseColor = PHASE_COLORS[idx % PHASE_COLORS.length];
            const pos = getBarPct(phase.ngayBatDau, phase.ngayKetThuc);
            const isExp = expanded.has(phase.id);
            const tasks = phase.tasks ?? [];
            const tasksDone = tasks.filter((t) => t.trangThai === 'Hoàn thành').length;

            return (
              <React.Fragment key={phase.id}>
                {/* Phase row */}
                <div className={`flex items-center h-9 border-b border-gray-100 cursor-pointer ${isExp ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`} onClick={() => toggleExpand(phase.id)}>
                  <div className={`sticky left-0 z-20 shrink-0 flex items-center gap-1 px-2 border-r border-gray-100 overflow-hidden ${isExp ? 'bg-blue-50' : 'bg-white'}`} style={{ width: NAME_COL }}>
                    {isExp ? <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />}
                    <GanttTooltip label={<div><p className="font-medium">{phase.tenGiaiDoan}</p><p>{phase.ngayBatDau ? fmtDate(new Date(phase.ngayBatDau)) : '?'} → {phase.ngayKetThuc ? fmtDate(new Date(phase.ngayKetThuc)) : '?'}</p><p>Tiến độ: {phase.tienDo}% | {tasksDone}/{tasks.length} tasks xong</p></div>}>
                      <span className="text-xs font-medium text-gray-800 truncate">{phase.tenGiaiDoan}</span>
                    </GanttTooltip>
                    <span className="ml-auto text-[10px] text-gray-400 shrink-0">{tasksDone}/{tasks.length}</span>
                  </div>
                  <div className="relative flex-1 min-w-0 h-full flex items-center px-1">
                    {pos && (
                      <div className="absolute h-5 rounded-sm opacity-85" style={{ left: `${pos.left}%`, width: `${pos.width}%`, background: phaseColor.bar }}>
                        <div className="absolute inset-y-0 left-0 rounded-sm bg-white/25" style={{ width: `${phase.tienDo}%` }} />
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-semibold">{phase.tienDo}%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Task rows */}
                {isExp && tasks.map((task) => {
                  const tPos = getBarPct(task.ngayBatDau, task.ngayKetThuc);
                  const status = getTaskStatus(task);
                  const sty = STATUS_STYLES[status] ?? STATUS_STYLES['Chưa bắt đầu'];
                  const progress = task.tienDo ?? (status === 'Hoàn thành' ? 100 : status === 'Đang làm' ? 50 : 0);

                  return (
                    <div key={task.id} className="flex items-center h-7 border-b border-gray-50 hover:bg-gray-50/50">
                      <div className="sticky left-0 z-20 shrink-0 flex items-center gap-1 pl-7 pr-2 border-r border-gray-50 bg-white overflow-hidden" style={{ width: NAME_COL }}>
                        {task.laMilestone && <Diamond className="h-2.5 w-2.5 text-orange-500 shrink-0" />}
                        <GanttTooltip label={<div><p className="font-medium">{task.tieuDe}</p>{task.ngayBatDau && <p>{fmtDate(new Date(task.ngayBatDau))} → {task.ngayKetThuc ? fmtDate(new Date(task.ngayKetThuc)) : '?'}</p>}<p>{status}{task.nguoiPhuTrach ? ` | ${task.nguoiPhuTrach}` : ''}</p></div>}>
                          <span className={`text-[11px] truncate ${status === 'Trễ' ? 'text-red-600 font-medium' : 'text-gray-600'}`}>{task.tieuDe}</span>
                        </GanttTooltip>
                      </div>
                      <div className="relative flex-1 min-w-0 h-full flex items-center px-1">
                        {tPos ? (
                          <div className="absolute h-3 rounded-sm border overflow-hidden" style={{ left: `${tPos.left}%`, width: `${tPos.width}%`, borderColor: sty.color }}>
                            <div className="h-full" style={{ width: `${progress}%`, background: sty.bg }} />
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-300 ml-1">—</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}

          {/* Milestones row */}
          {milestones.length > 0 && (
            <div className="flex items-center h-8 border-t border-gray-200 bg-amber-50/40">
              <div className="sticky left-0 z-20 shrink-0 flex items-center gap-1 px-2 border-r border-gray-100 bg-amber-50" style={{ width: NAME_COL }}>
                <Flag className="h-3 w-3 text-orange-500" />
                <span className="text-xs text-gray-600 font-medium">Milestones ({milestones.length})</span>
              </div>
              <div className="relative flex-1 min-w-0 h-full flex items-center">
                {milestones.map(({ task, pct }) => (
                  <GanttTooltip key={task.id} label={<div><p className="font-medium">{task.tieuDe}</p><p>{fmtDateFull(new Date((task.ngayKetThuc ?? task.deadline)!))}</p><p>{task.trangThai}</p></div>}>
                    <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 border-2 ${task.trangThai === 'Hoàn thành' ? 'bg-green-500 border-green-600' : 'bg-orange-500 border-orange-600'}`} style={{ left: `${pct}%`, marginLeft: '-6px' }} />
                  </GanttTooltip>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <div className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: '#22c55e' }} /><span>Hoàn thành</span></div>
        <div className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: '#60a5fa' }} /><span>Đang làm</span></div>
        <div className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: '#ef4444' }} /><span>Trễ</span></div>
        <div className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: '#d1d5db' }} /><span>Chưa bắt đầu</span></div>
        <div className="flex items-center gap-1"><Diamond className="h-3 w-3 text-orange-500" /><span>Milestone</span></div>
        <div className="flex items-center gap-1"><div className="w-0.5 h-3 bg-red-500" /><span>Hôm nay</span></div>
      </div>
    </div>
  );
};

export default ProjectGantt;
