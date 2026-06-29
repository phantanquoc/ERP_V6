import React, { useState } from 'react';
import { AuditLog, AuditAction } from '../../services/auditLogService';
import { FIELD_LABELS, STATUS_LABELS, formatScalar } from './snapshotFormat';

interface AuditTimelineProps {
  entries: AuditLog[]; // expected to be newest-first from API
}

interface ActionMeta {
  label: string;
  dot: string;       // dot background
  ring: string;      // dot ring/border
  chip: string;      // chip badge classes
  cardEdge: string;  // left border accent of the card
  icon: string;      // glyph inside the dot
}

const ACTION_META: Record<AuditAction, ActionMeta> = {
  CREATE: {
    label: 'Tạo mới',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-200',
    chip: 'bg-emerald-100 text-emerald-800',
    cardEdge: 'border-l-emerald-400',
    icon: '+',
  },
  UPDATE: {
    label: 'Cập nhật',
    dot: 'bg-blue-500',
    ring: 'ring-blue-200',
    chip: 'bg-blue-100 text-blue-800',
    cardEdge: 'border-l-blue-400',
    icon: '✎',
  },
  STATUS_CHANGE: {
    label: 'Đổi trạng thái',
    dot: 'bg-amber-500',
    ring: 'ring-amber-200',
    chip: 'bg-amber-100 text-amber-800',
    cardEdge: 'border-l-amber-400',
    icon: '⇄',
  },
  PRICE_UNLOCK: {
    label: 'Mở khóa giá',
    dot: 'bg-orange-500',
    ring: 'ring-orange-200',
    chip: 'bg-orange-100 text-orange-800',
    cardEdge: 'border-l-orange-400',
    icon: '🔓',
  },
  DELETE: {
    label: 'Xóa',
    dot: 'bg-rose-500',
    ring: 'ring-rose-200',
    chip: 'bg-rose-100 text-rose-800',
    cardEdge: 'border-l-rose-400',
    icon: '×',
  },
};

const FALLBACK_META: ActionMeta = {
  label: 'Khác',
  dot: 'bg-gray-400',
  ring: 'ring-gray-200',
  chip: 'bg-gray-100 text-gray-800',
  cardEdge: 'border-l-gray-300',
  icon: '•',
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

interface DiffRow {
  key: string;
  label: string;
  beforeText: string;
  afterText: string;
}

// Compute field-level diff between before/after using FIELD_LABELS as whitelist
const computeDiff = (before: unknown, after: unknown): DiffRow[] => {
  const b = isPlainObject(before) ? before : {};
  const a = isPlainObject(after) ? after : {};
  const keys = new Set<string>([...Object.keys(b), ...Object.keys(a)]);
  const out: DiffRow[] = [];
  keys.forEach(k => {
    const label = FIELD_LABELS[k];
    if (!label) return; // hide internal fields
    const beforeVal = (b as any)[k];
    const afterVal = (a as any)[k];
    if (JSON.stringify(beforeVal ?? null) === JSON.stringify(afterVal ?? null)) return;
    out.push({
      key: k,
      label,
      beforeText: formatScalar(k, beforeVal),
      afterText: formatScalar(k, afterVal),
    });
  });
  // Stable order: keep FIELD_LABELS insertion order
  const order = Object.keys(FIELD_LABELS);
  out.sort((x, y) => order.indexOf(x.key) - order.indexOf(y.key));
  return out;
};

// Build a short one-line headline (max 1-2 changes inline)
const headlineFromDiff = (action: AuditAction, diff: DiffRow[], after: unknown): string => {
  if (action === 'CREATE') return 'Tạo mới bản ghi';
  if (action === 'DELETE') return 'Xóa bản ghi';

  if (action === 'STATUS_CHANGE') {
    const statusRow = diff.find(d => d.key === 'tinhTrang');
    if (statusRow) return `${statusRow.beforeText} → ${statusRow.afterText}`;
    if (isPlainObject(after) && typeof after.tinhTrang === 'string') {
      return `Chuyển sang: ${STATUS_LABELS[after.tinhTrang] ?? after.tinhTrang}`;
    }
    return 'Thay đổi trạng thái';
  }

  if (action === 'PRICE_UNLOCK') {
    const priceRow = diff.find(d => d.key === 'giaBaoKhach');
    if (priceRow) return `Mở khóa & sửa giá: ${priceRow.beforeText} → ${priceRow.afterText}`;
    return 'Mở khóa giá báo';
  }

  // UPDATE
  if (diff.length === 0) return 'Cập nhật (không phát hiện thay đổi trường công khai)';
  if (diff.length === 1) {
    return `${diff[0].label}: ${diff[0].beforeText} → ${diff[0].afterText}`;
  }
  if (diff.length === 2) {
    return `${diff[0].label}, ${diff[1].label}`;
  }
  return `${diff[0].label}, ${diff[1].label} +${diff.length - 2} trường khác`;
};

const RelativeTime: React.FC<{ iso: string }> = ({ iso }) => {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  let rel = '';
  if (mins < 1) rel = 'vừa xong';
  else if (mins < 60) rel = `${mins} phút trước`;
  else if (mins < 60 * 24) rel = `${Math.floor(mins / 60)} giờ trước`;
  else rel = `${Math.floor(mins / (60 * 24))} ngày trước`;
  return (
    <span title={d.toLocaleString('vi-VN')} className="text-xs text-gray-500">
      {rel}
    </span>
  );
};

const TimelineEntry: React.FC<{ entry: AuditLog; isLast: boolean }> = ({ entry, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = ACTION_META[entry.action] ?? FALLBACK_META;
  const diff = computeDiff(entry.before, entry.after);
  const headline = headlineFromDiff(entry.action, diff, entry.after);
  const actor = entry.actorName ?? entry.actorId;
  const seq = entry.sequenceNumber;

  return (
    <div className="relative pl-12">
      {/* vertical connector line */}
      {!isLast && (
        <span className="absolute left-[18px] top-9 bottom-0 w-px bg-gray-200" aria-hidden />
      )}
      {/* dot with version number */}
      <div
        className={`absolute left-0 top-1 flex h-9 w-9 items-center justify-center rounded-full text-white text-xs font-semibold shadow ring-4 ${meta.dot} ${meta.ring}`}
        title={meta.label}
      >
        {seq != null ? `v${seq}` : <span className="text-base leading-none">{meta.icon}</span>}
      </div>

      {/* card */}
      <div className={`rounded-lg border border-gray-200 bg-white shadow-sm border-l-4 ${meta.cardEdge}`}>
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.chip}`}>
              {meta.label}
            </span>
            <span className="text-sm text-gray-900 truncate" title={headline}>{headline}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <RelativeTime iso={entry.createdAt} />
            {(diff.length > 0 || entry.action === 'DELETE' || entry.action === 'CREATE') && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="text-xs text-blue-600 hover:underline"
              >
                {expanded ? 'Ẩn' : 'Chi tiết'}
              </button>
            )}
          </div>
        </div>

        <div className="px-3 pb-2 text-xs text-gray-500 flex items-center gap-2">
          <span className="font-medium text-gray-700">{actor}</span>
          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{entry.actorRole}</span>
        </div>

        {expanded && diff.length > 0 && (
          <div className="border-t border-gray-100 px-3 py-2">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left py-1 font-medium w-1/3">Trường</th>
                  <th className="text-left py-1 font-medium">Trước</th>
                  <th className="text-left py-1 font-medium">Sau</th>
                </tr>
              </thead>
              <tbody>
                {diff.map(row => (
                  <tr key={row.key} className="border-t border-gray-50">
                    <td className="py-1 text-gray-700">{row.label}</td>
                    <td className="py-1 text-gray-500 line-through">{row.beforeText}</td>
                    <td className="py-1 text-gray-900 font-medium">{row.afterText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {expanded && diff.length === 0 && (entry.action === 'CREATE' || entry.action === 'DELETE') && (
          <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-500 italic">
            {entry.action === 'CREATE' ? 'Bản ghi được tạo mới — không có dữ liệu trước.' : 'Bản ghi đã bị xóa — không có dữ liệu sau.'}
          </div>
        )}
      </div>
    </div>
  );
};

const AuditTimeline: React.FC<AuditTimelineProps> = ({ entries }) => {
  if (!entries.length) {
    return <p className="text-gray-500 text-sm text-center py-6">Chưa có hoạt động nào</p>;
  }

  // Stats card row — count by action
  const counts: Record<string, number> = {};
  entries.forEach(e => { counts[e.action] = (counts[e.action] ?? 0) + 1; });

  return (
    <div className="space-y-4">
      {/* summary chips */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-xs text-gray-500">Tổng quan:</span>
        {(Object.keys(ACTION_META) as AuditAction[]).map(action => {
          if (!counts[action]) return null;
          const meta = ACTION_META[action];
          return (
            <span key={action} className={`px-2 py-0.5 rounded-full text-xs font-medium ${meta.chip}`}>
              {meta.label}: {counts[action]}
            </span>
          );
        })}
        <span className="ml-auto text-xs text-gray-500">{entries.length} hoạt động</span>
      </div>

      {/* timeline */}
      <div className="space-y-3">
        {entries.map((entry, idx) => (
          <TimelineEntry key={entry.id} entry={entry} isLast={idx === entries.length - 1} />
        ))}
      </div>
    </div>
  );
};

export default AuditTimeline;
