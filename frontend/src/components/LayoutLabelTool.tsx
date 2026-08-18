import React, { useMemo, useRef, useState } from 'react';
import { WAREHOUSE_LAYOUTS, type LayoutFan, type LayoutNote } from '../constants/warehouseLayouts';

interface ZoneLabelPos { x: number; y: number }

const zoneLabelText = (zone: string) => {
  if (zone.startsWith('DAUCHIEN-')) return `Dầu chiên · ${zone.replace('DAUCHIEN-LO', 'LÔ ')}`;
  if (zone.startsWith('NHA-')) return `Nha · ${zone.replace('NHA-LO', 'LÔ ')}`;
  return zone.replace('LO', 'LÔ ');
};

/** Vị trí tự tính (đáy-giữa zone) — dùng làm vị trí mặc định khi chưa kéo. */
function defaultZoneLabels(layout: (typeof WAREHOUSE_LAYOUTS)[number]) {
  const m = new Map<string, ZoneLabelPos>();
  layout.slots.forEach((s) => {
    const cur = m.get(s.zone);
    const cx = (s.x + s.x + s.w) / 2;
    const bottom = s.y + s.h;
    if (!cur) m.set(s.zone, { x: cx, y: bottom });
    else m.set(s.zone, { x: (cur.x + cx) / 2, y: Math.max(cur.y, bottom) });
  });
  return m;
}

type DragState =
  | { kind: 'zone'; zone: string }
  | { kind: 'note'; index: number }
  | { kind: 'fan'; index: number }
  | null;

const ZONE_STROKES = ['#2563eb','#16a34a','#d97706','#a21caf','#e11d48','#0891b2','#4f46e5','#475569','#dc2626','#65a30d','#9333ea'];

const LayoutLabelTool: React.FC = () => {
  const [maKho, setMaKho] = useState<string>(WAREHOUSE_LAYOUTS[0].maKho);
  const layout = WAREHOUSE_LAYOUTS.find((l) => l.maKho === maKho)!;

  const defaults = useMemo(() => defaultZoneLabels(layout), [layout]);
  const initialZone = useMemo(() => {
    const m = new Map<string, ZoneLabelPos>();
    (layout.zoneLabels ?? []).forEach((z) => m.set(z.zone, { x: z.x, y: z.y }));
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  const [zonePos, setZonePos] = useState<Map<string, ZoneLabelPos>>(initialZone);
  const [notes, setNotes] = useState<LayoutNote[]>(layout.notes);
  const [fans, setFans] = useState<LayoutFan[]>(layout.fans);
  const [drag, setDrag] = useState<DragState>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [out, setOut] = useState('');

  const switchWarehouse = (mk: string) => {
    setMaKho(mk);
    const l = WAREHOUSE_LAYOUTS.find((x) => x.maKho === mk)!;
    const ini = new Map<string, ZoneLabelPos>();
    (l.zoneLabels ?? []).forEach((z) => ini.set(z.zone, { x: z.x, y: z.y }));
    setZonePos(ini);
    setNotes(l.notes);
    setFans(l.fans);
    setDrag(null);
    setOut('');
  };

  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const ctm = svg.getScreenCTM();
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm!.inverse());
    return { x: p.x, y: p.y };
  };

  const onPointerDown = (e: React.PointerEvent, kind: DragState) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDrag(kind);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const { x, y } = toSvg(e.clientX, e.clientY);
    if (drag.kind === 'zone') {
      setZonePos((m) => new Map(m).set(drag.zone, { x, y: y - 2.2 }));
    } else if (drag.kind === 'note') {
      setNotes((arr) => arr.map((n, i) => (i === drag.index ? { ...n, x, y } : n)));
    } else if (drag.kind === 'fan') {
      setFans((arr) => arr.map((f, i) => (i === drag.index ? { ...f, x: x - f.w / 2, y: y - f.h / 2 } : f)));
    }
  };

  const exportJson = () => {
    const zoneLabels = [...new Set(layout.slots.map((s) => s.zone))]
      .sort()
      .map((zone) => ({ zone, ...(zonePos.get(zone) ?? defaults.get(zone)!) }));
    setOut(JSON.stringify({ maKho, zoneLabels, notes, fans }, null, 2));
  };

  const zoneIndexMap = useMemo(() => {
    const zones = [...new Set(layout.slots.map((s) => s.zone))].sort();
    return new Map(zones.map((z, i) => [z, i % ZONE_STROKES.length]));
  }, [layout]);

  return (
    <div className="p-4 bg-slate-50 min-h-screen">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h1 className="text-lg font-bold text-gray-900">Công cụ sắp xếp chữ trên bản đồ kho</h1>
        <select value={maKho} onChange={(e) => switchWarehouse(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
          {WAREHOUSE_LAYOUTS.map((l) => <option key={l.maKho} value={l.maKho}>{l.name} ({l.maKho})</option>)}
        </select>
        <button onClick={exportJson} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm">Tạo JSON</button>
        <button onClick={() => switchWarehouse(maKho)} className="px-3 py-1.5 border border-gray-300 rounded text-sm">Đặt lại</button>
        <span className="text-xs text-gray-500">Kéo chữ “LÔ…”, “DÀN QUẠT”, ghi chú để sắp lại. Bấm “Tạo JSON” rồi gửi tôi.</span>
      </div>

      <div className="bg-white rounded-lg shadow p-3">
        <svg
          ref={svgRef}
          viewBox={`${-4} ${-4} ${layout.viewW + 8} ${layout.viewH + 8}`}
          className="w-full h-[78vh] touch-none select-none"
          onPointerMove={onPointerMove}
          onPointerUp={() => setDrag(null)}
          onPointerCancel={() => setDrag(null)}
        >
          {/* Walls */}
          {layout.walls.map((w, i) => (
            <line key={i} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2} stroke="#475569" strokeWidth={0.35} strokeLinecap="square" />
          ))}
          {/* Hatches */}
          {layout.hatches.map((h, i) => (
            <rect key={i} x={h.x} y={h.y} width={h.w} height={h.h} fill="#cbd5e1" fillOpacity={0.5} stroke="none" />
          ))}
          {/* Slots */}
          {layout.slots.map((s, i) => (
            <g key={i}>
              <rect x={s.x} y={s.y} width={s.w} height={s.h} fill="#eff6ff" stroke="#93c5fd" strokeWidth={0.12} />
              <text x={s.x + s.w / 2} y={s.y + s.h / 2 + 0.6} textAnchor="middle" fontSize={0.8} className="fill-slate-400 pointer-events-none">{s.code}</text>
            </g>
          ))}

          {/* Zone labels — draggable */}
          {[...new Set(layout.slots.map((s) => s.zone))].sort().map((zone) => {
            const pos = zonePos.get(zone) ?? defaults.get(zone)!;
            return (
              <text
                key={zone}
                x={pos.x}
                y={pos.y + 2.2}
                textAnchor="middle"
                fontSize={1.5}
                fontWeight={700}
                fill={ZONE_STROKES[zoneIndexMap.get(zone) ?? 0]}
                style={{ cursor: 'grab', userSelect: 'none' }}
                onPointerDown={(e) => onPointerDown(e, { kind: 'zone', zone })}
              >
                {zoneLabelText(zone)}
              </text>
            );
          })}

          {/* Notes — draggable text, leader to target */}
          {notes.map((n, i) => (
            <g key={i}>
              <line x1={n.x} y1={n.y} x2={n.tx} y2={n.ty} stroke="#64748b" strokeWidth={0.12} />
              <text
                x={n.x} y={n.y - 0.6} fontSize={1.2}
                className="fill-slate-500 font-medium"
                style={{ cursor: 'grab', userSelect: 'none' }}
                onPointerDown={(e) => onPointerDown(e, { kind: 'note', index: i })}
              >
                {n.text}
              </text>
            </g>
          ))}

          {/* Fans — draggable */}
          {fans.map((f, i) => (
            <g
              key={i}
              style={{ cursor: 'grab' }}
              onPointerDown={(e) => onPointerDown(e, { kind: 'fan', index: i })}
            >
              <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={0.3} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.15} />
              <text x={f.x + f.w / 2} y={f.y + f.h / 2 + 0.6} textAnchor="middle" fontSize={1.1} className="fill-slate-500 font-medium pointer-events-none">DÀN QUẠT</text>
            </g>
          ))}
        </svg>
      </div>

      {out && (
        <div className="mt-3 bg-slate-900 rounded-lg p-3">
          <pre className="text-xs text-green-300 whitespace-pre-wrap overflow-x-auto">{out}</pre>
        </div>
      )}
    </div>
  );
};

export default LayoutLabelTool;
