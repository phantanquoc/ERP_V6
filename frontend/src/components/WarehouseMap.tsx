import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { MapPin, Package, PackageOpen, Plus, Minus, Maximize2 } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { Warehouse, LotProduct } from '../services/warehouseService';
import { useWarehouses, useUpdateLotProduct } from '../hooks';
import { getLayoutByMaKho, type LayoutHatch, type LayoutSlot, type LayoutWall } from '../constants/warehouseLayouts';
import { kienCapacityByUnit } from '../utils/kienCapacity';
import Modal from './Modal';

interface PlacedRow extends LotProduct {
  tenLo: string;
}

const formatNumber = (n: number) => new Intl.NumberFormat('vi-VN').format(n);

const zoneLabel = (zone: string) => {
  if (zone.startsWith('DAUCHIEN-')) return `Dầu chiên · ${zone.replace('DAUCHIEN-LO', 'LÔ ')}`;
  if (zone.startsWith('NHA-')) return `Nha · ${zone.replace('NHA-LO', 'LÔ ')}`;
  return zone.replace('LO', 'LÔ ');
};

// Zone label color — each zone gets a distinct stroke for its label text so the
// eye groups pallet positions by lot at a glance. Slot FILLS do not use this palette;
// they encode fill-level via FILL_LEVELS below.
const ZONE_LABEL_STROKES = [
  '#2563eb', '#16a34a', '#d97706', '#a21caf', '#e11d48', '#0891b2',
  '#4f46e5', '#475569', '#dc2626', '#65a30d', '#9333ea',
];

// Fill-level heatmap: cool (light blue, empty) → yellow (partial) → hot (red, full).
// Với kiện cố định (1 kiện = 1 ô pallet), độ đầy được tính theo SỨC CHỨA TỐI ĐA
// của pallet (36 Thùng / 32 Bao) — không chỉ là "có hàng hay không".
type FillLevel = 'empty' | 'partial' | 'full';
const FILL_LEVELS: Record<FillLevel, { fill: string; stroke: string; label: string }> = {
  empty: { fill: '#dbeafe', stroke: '#93c5fd', label: 'Trống' },
  partial: { fill: '#fef08a', stroke: '#ca8a04', label: 'Có hàng (<75%)' },
  full: { fill: '#fca5a5', stroke: '#b91c1c', label: 'Đầy (≥75% sức chứa)' },
};

/** Tổng số lượng + đơn vị của các hàng trong một ô. */
const slotQty = (rows: PlacedRow[]) => {
  const total = rows.reduce((a, r) => a + r.soLuong, 0);
  const unit = rows.find((r) => r.donViTinh)?.donViTinh ?? '';
  return { total, unit };
};

/** Sức chứa tối đa của ô (theo đơn vị của hàng trong ô). */
const slotCapacity = (rows: PlacedRow[]) => kienCapacityByUnit(rows.find((r) => r.donViTinh)?.donViTinh);

// Classify a slot by how full it is relative to the pallet capacity. When the unit
// has no defined capacity, fall back to has-goods / ≥2 rows.
const classifyFill = (rows: PlacedRow[]): FillLevel => {
  const { total } = slotQty(rows);
  if (total <= 0) return 'empty';
  const cap = slotCapacity(rows);
  if (cap && cap > 0) {
    return total / cap >= 0.75 ? 'full' : 'partial';
  }
  return rows.filter((r) => r.soLuong > 0).length >= 2 ? 'full' : 'partial';
};

const wallKey = (w: LayoutWall) => {
  const mx = (w.x1 + w.x2) / 2;
  const my = (w.y1 + w.y2) / 2;
  const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
  return `${mx.toFixed(1)}|${my.toFixed(1)}|${len.toFixed(1)}`;
};

// CAD files often emit the same wall segment 2-3x (overlapping polyline endpoints).
// Drop near-identical segments so the floor plan doesn't render double-thick lines.
const dedupeWalls = (walls: LayoutWall[]): LayoutWall[] => {
  const seen = new Set<string>();
  const out: LayoutWall[] = [];
  for (const w of walls) {
    const k = wallKey(w);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(w);
  }
  return out;
};

// Door symbols per architectural drawing standards (ISO 128 / Life of an Architect):
// doors use MEDIUM line weight (lighter than cut walls), drawn as a leaf line + swing arc.
// Arc radius is capped so large door openings don't produce oversized quarter-circles.
// Color is neutral slate — red/orange read as error markers in UI, not structure.
const renderHatch = (h: LayoutHatch, i: number): React.ReactNode => {
  const THIN = 0.5;
  const MAX_ARC_R = 1.6;
  const doorStroke = '#64748b'; // slate-500 — medium weight, neutral
  const leafWidth = 0.22;       // medium line weight
  const arcWidth = 0.13;        // light line weight for the swing arc
  if (h.w < THIN && h.h < THIN) return null; // degenerate point — skip
  if (h.w < THIN) {
    const r = Math.min(h.h, MAX_ARC_R);
    return (
      <g key={`hatch-${i}`}>
        <line x1={h.x} y1={h.y} x2={h.x} y2={h.y + h.h} stroke={doorStroke} strokeWidth={leafWidth} strokeLinecap="round" />
        <path d={`M ${h.x} ${h.y + h.h} A ${r} ${r} 0 0 1 ${h.x + r} ${h.y + h.h}`} fill="none" stroke={doorStroke} strokeWidth={arcWidth} />
      </g>
    );
  }
  if (h.h < THIN) {
    const r = Math.min(h.w, MAX_ARC_R);
    return (
      <g key={`hatch-${i}`}>
        <line x1={h.x} y1={h.y} x2={h.x + h.w} y2={h.y} stroke={doorStroke} strokeWidth={leafWidth} strokeLinecap="round" />
        <path d={`M ${h.x + h.w} ${h.y} A ${r} ${r} 0 0 1 ${h.x + h.w} ${h.y + r}`} fill="none" stroke={doorStroke} strokeWidth={arcWidth} />
      </g>
    );
  }
  // Real rectangular hatch (equipment/column) — light gray fill, no border
  return (
    <rect key={`hatch-${i}`} x={h.x} y={h.y} width={h.w} height={h.h} fill="#cbd5e1" fillOpacity={0.5} stroke="none" />
  );
};

interface ActiveSlot {
  zone: string;
  code: string;
  dbSlotId: string | null;
}

interface WarehouseMapProps {
  warehouseId: string | null;
  onWarehouseChange?: (id: string) => void;
  /** Khi true: ẩn side panel + dropdown chọn kho (dùng trong unified view) */
  hideSidePanel?: boolean;
}

const WarehouseMap: React.FC<WarehouseMapProps> = ({
  warehouseId,
  onWarehouseChange,
  hideSidePanel = false,
}) => {
  const { data: warehousesData } = useWarehouses();
  const updateLotProduct = useUpdateLotProduct();
  const [activeSlot, setActiveSlot] = useState<ActiveSlot | null>(null);
  const [assignId, setAssignId] = useState('');

  const warehouse = (warehousesData as Warehouse[] | undefined)?.find((w) => w.id === warehouseId) ?? null;
  const layout = getLayoutByMaKho(warehouse?.maKho);

  const mappedWarehouses = useMemo(
    () => ((warehousesData as Warehouse[] | undefined) ?? []).filter((w) => getLayoutByMaKho(w.maKho)),
    [warehousesData],
  );

  // Every stock row of this warehouse, flattened with its lot name
  const rows = useMemo<PlacedRow[]>(
    () => (warehouse?.lots ?? []).flatMap((l) => (l.lotProducts ?? []).map((lp) => ({ ...lp, tenLo: l.tenLo }))),
    [warehouse],
  );

  const dbSlotByZoneCode = useMemo(() => {
    const m = new Map<string, string>();
    (warehouse?.warehouseSlots ?? []).forEach((s) => m.set(`${s.zone}|${s.code}`, s.id));
    return m;
  }, [warehouse]);

  const bySlot = useMemo(() => {
    const m = new Map<string, PlacedRow[]>();
    rows.forEach((r) => {
      if (r.slotId) m.set(r.slotId, [...(m.get(r.slotId) ?? []), r]);
    });
    return m;
  }, [rows]);

  const unplaced = useMemo(() => rows.filter((r) => !r.slotId && r.soLuong > 0), [rows]);

  // Compact goods overview: sum quantities per product + unit
  const goods = useMemo(() => {
    const m = new Map<string, { tenSanPham: string; donViTinh: string; soLuong: number; kien: number }>();
    rows.forEach((r) => {
      const key = `${r.internationalProduct?.tenSanPham ?? '?'}|||${r.donViTinh}`;
      const cur = m.get(key) ?? { tenSanPham: r.internationalProduct?.tenSanPham ?? '?', donViTinh: r.donViTinh, soLuong: 0, kien: 0 };
      cur.soLuong += r.soLuong;
      cur.kien += 1;
      m.set(key, cur);
    });
    return [...m.values()].sort((a, b) => b.soLuong - a.soLuong);
  }, [rows]);

  // Zone label anchors: bottom-center of each zone's bounding box
  const zoneAnchors = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    (layout?.slots ?? []).forEach((s) => {
      const cur = m.get(s.zone);
      const right = s.x + s.w;
      const bottom = s.y + s.h;
      if (!cur) {
        m.set(s.zone, { x: (s.x + right) / 2, y: bottom });
      } else {
        m.set(s.zone, { x: (cur.x + (s.x + right) / 2) / 2, y: Math.max(cur.y, bottom) });
      }
    });
    return m;
  }, [layout]);

  // Stable zone → label-color index so zone text colors don't reshuffle on re-render.
  const zoneIndex = useMemo(() => {
    const zones = [...new Set((layout?.slots ?? []).map((s) => s.zone))].sort();
    const m = new Map<string, number>();
    zones.forEach((z, i) => m.set(z, i % ZONE_LABEL_STROKES.length));
    return m;
  }, [layout]);

  // Vị trí nhãn zone: dùng zoneLabels thủ công nếu có, ngược lại tự tính (đáy-giữa zone).
  const zoneLabelOverride = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    (layout?.zoneLabels ?? []).forEach((z) => m.set(z.zone, { x: z.x, y: z.y }));
    return m;
  }, [layout]);

  // Per-slot fill classification + counts per level (for the heatmap legend).
  // Computed null-safe before the early return so hook order stays stable.
  const fillBySlot = useMemo(() => {
    const m = new Map<string, FillLevel>();
    (layout?.slots ?? []).forEach((s) => {
      const id = dbSlotByZoneCode.get(`${s.zone}|${s.code}`);
      const rs = id ? (bySlot.get(id) ?? []) : [];
      m.set(`${s.zone}|${s.code}`, classifyFill(rs));
    });
    return m;
  }, [layout, bySlot, dbSlotByZoneCode]);
  const fillCounts = useMemo(() => {
    const c: Record<FillLevel, number> = { empty: 0, partial: 0, full: 0 };
    fillBySlot.forEach((v) => { c[v] += 1; });
    return c;
  }, [fillBySlot]);

  if (!warehouse || !layout) return null;

  const slotRows = (s: LayoutSlot) => {
    const id = dbSlotByZoneCode.get(`${s.zone}|${s.code}`);
    return id ? bySlot.get(id) ?? [] : [];
  };
  const slotDbId = (s: LayoutSlot) => dbSlotByZoneCode.get(`${s.zone}|${s.code}`) ?? null;

  const activeRows = activeSlot?.dbSlotId ? bySlot.get(activeSlot.dbSlotId) ?? [] : [];

  const handleAssign = async () => {
    if (!activeSlot?.dbSlotId || !assignId) return;
    try {
      await updateLotProduct.mutateAsync({ id: assignId, data: { slotId: activeSlot.dbSlotId } });
      toast.success('Đã đặt hàng vào vị trí');
      setAssignId('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi đặt vị trí');
    }
  };

  const handleUnplace = async (id: string) => {
    if (!window.confirm('Gỡ hàng khỏi vị trí này?')) return;
    try {
      await updateLotProduct.mutateAsync({ id, data: { slotId: null } });
      toast.success('Đã gỡ vị trí');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi gỡ vị trí');
    }
  };

  const containerClass = hideSidePanel
    ? 'flex flex-col'
    : 'flex flex-col xl:flex-row gap-4';

  return (
    <div className={containerClass}>
      {/* Map */}
      <div className="flex-1 bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-600" />
            Sơ đồ
            {!hideSidePanel && onWarehouseChange ? (
              <select
                value={warehouse?.id ?? ''}
                onChange={(e) => onWarehouseChange(e.target.value)}
                aria-label="Chọn kho có bản đồ"
                className="border border-gray-300 rounded-lg px-2 py-1 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {mappedWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>{w.tenKho}</option>
                ))}
              </select>
            ) : (
              warehouse?.tenKho
            )}
          </h3>
          <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
            {(Object.keys(FILL_LEVELS) as FillLevel[]).map((k) => {
              const lv = FILL_LEVELS[k];
              return (
                <span key={k} className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm border inline-block" style={{ background: lv.fill, borderColor: lv.stroke }} />
                  {lv.label} ({fillCounts[k]})
                </span>
              );
            })}
          </div>
        </div>

        <TransformWrapper
          minScale={1}
          maxScale={8}
          initialScale={1}
          wheel={{ step: 0.08 }}
          doubleClick={{ mode: 'toggle', step: 2 }}
          limitToBounds
          centerOnInit
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <div className="relative">
              {/* Zoom toolbar */}
              <div className="absolute right-2 top-2 z-10 flex flex-col gap-1 bg-white/90 rounded-lg shadow border border-gray-200 p-1">
                <button onClick={() => zoomIn(0.3)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Phóng to" aria-label="Phóng to">
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={() => zoomOut(0.3)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Thu nhỏ" aria-label="Thu nhỏ">
                  <Minus className="w-4 h-4" />
                </button>
                <button onClick={() => resetTransform()} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Vừa màn hình" aria-label="Đặt lại">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
              <TransformComponent
                wrapperClass="!w-full !h-[72vh] !overflow-hidden !cursor-grab active:!cursor-grabbing"
                contentClass="!w-full !h-[72vh]"
              >
        {/* SVG chiếm trọn khung hiển thị; bản vẽ tự co giãn giữ đúng tỷ lệ (meet)
            như cách Sơ đồ tổng thể lấp đầy vùng hiển thị. */}
        <svg
          viewBox={`0 0 ${layout.viewW} ${layout.viewH}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full block bg-white"
          role="img"
          aria-label={`Sơ đồ ${warehouse.tenKho}`}
        >
          {/* Walls — HEAVY line weight per architectural standard (cut elements).
              Dark slate so the structure reads clearly; dedup removes doubled segments. */}
          {dedupeWalls(layout.walls).map((wl, i) => (
            <line
              key={`wall-${i}`}
              x1={wl.x1}
              y1={wl.y1}
              x2={wl.x2}
              y2={wl.y2}
              stroke="#334155"
              strokeWidth={0.55}
              strokeLinecap="square"
            />
          ))}

          {/* Doors (hatches) — MEDIUM/LIGHT weight, neutral slate swing arcs */}
          {layout.hatches.map((h, i) => renderHatch(h, i))}

          {/* Area notes with leader lines (e.g. "Khu vực để dầu chiên") */}
          {layout.notes.map((n, i) => (
            <g key={`note-${i}`}>
              <line x1={n.x + 2.5} y1={n.y} x2={n.tx} y2={n.ty} stroke="#64748b" strokeWidth={0.1} />
              <text x={n.x} y={n.y - 0.5} fontSize={1.5} className="fill-slate-500 font-medium">{n.text}</text>
            </g>
          ))}

          {layout.fans.map((f, i) => (
            <g key={`fan-${i}`}>
              <rect x={f.x} y={f.y} width={f.w} height={f.h} rx={0.3} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.15} />
              <text x={f.x + f.w / 2} y={f.y + f.h / 2 + 0.55} textAnchor="middle" fontSize={1.3} className="fill-slate-500 font-medium">
                DÀN QUẠT
              </text>
            </g>
          ))}

          {layout.slots.map((s) => {
            const rs = slotRows(s);
            const { total, unit } = slotQty(rs);
            const cap = slotCapacity(rs);
            const lvl = fillBySlot.get(`${s.zone}|${s.code}`) ?? 'empty';
            const fill = FILL_LEVELS[lvl];
            const title = total > 0
              ? `${zoneLabel(s.zone)} — ${s.code}: ${formatNumber(total)} ${unit}${cap ? ` / ${cap} ${unit} (${Math.round((total / cap) * 100)}%)` : ''}`
              : `${zoneLabel(s.zone)} — ${s.code}: trống`;
            return (
              <g
                key={`${s.zone}|${s.code}`}
                className="cursor-pointer"
                onClick={() => {
                  setActiveSlot({ zone: s.zone, code: s.code, dbSlotId: slotDbId(s) });
                  setAssignId('');
                }}
              >
                <title>{title}</title>
                <rect
                  x={s.x}
                  y={s.y}
                  width={s.w}
                  height={s.h}
                  rx={0.3}
                  fill={fill.fill}
                  stroke={fill.stroke}
                  strokeWidth={0.18}
                  className="hover:brightness-95 transition-[filter]"
                />
                <text x={s.x + s.w / 2} y={s.y + s.h / 2 - 0.7} textAnchor="middle" fontSize={1.5} className="fill-slate-700 pointer-events-none font-medium">
                  {s.code}
                </text>
                {total > 0 && (
                  <text x={s.x + s.w / 2} y={s.y + s.h / 2 + 1.8} textAnchor="middle" fontSize={1.15} className="fill-slate-600 pointer-events-none font-medium">
                    {formatNumber(total)}{cap ? `/${cap}` : ''}
                  </text>
                )}
              </g>
            );
          })}

          {[...zoneAnchors.entries()].map(([zone, a]) => {
            const o = zoneLabelOverride.get(zone);
            return (
              <text key={zone} x={o?.x ?? a.x} y={(o?.y ?? a.y) + 2.2} textAnchor="middle" fontSize={1.6} fontWeight={700} fill={ZONE_LABEL_STROKES[zoneIndex.get(zone) ?? 0]}>
                {zoneLabel(zone)}
              </text>
            );
          })}
        </svg>
              </TransformComponent>
            </div>
          )}
        </TransformWrapper>
      </div>

      {/* Side panel — ẩn khi hideSidePanel (đã được render bởi parent trong unified view) */}
      {!hideSidePanel && (
        <div className="w-full xl:w-80 shrink-0 space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-blue-600" />
              Hàng hóa trong kho
            </h4>
            {goods.length === 0 ? (
              <p className="text-xs text-gray-400">Kho chưa có hàng hóa</p>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                {goods.map((g) => (
                  <li key={`${g.tenSanPham}|${g.donViTinh}`} className="py-1.5 flex items-baseline justify-between gap-2 text-xs">
                    <span className="text-gray-700">{g.tenSanPham}</span>
                    <span className="text-gray-900 font-medium whitespace-nowrap">
                      {formatNumber(g.soLuong)} {g.donViTinh}
                      <span className="text-gray-400 font-normal"> · {g.kien} kiện</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-1.5">
              <PackageOpen className="w-4 h-4 text-amber-600" />
              Chưa xếp vị trí ({unplaced.length})
            </h4>
            {unplaced.length === 0 ? (
              <p className="text-xs text-gray-400">Mọi hàng hóa đều đã có vị trí trên sơ đồ</p>
            ) : (
              <>
                <ul className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
                  {unplaced.map((r) => (
                    <li key={r.id} className="py-1.5 flex items-baseline justify-between gap-2 text-xs">
                      <span className="text-gray-700 truncate">
                        {r.internationalProduct?.tenSanPham ?? '?'}
                        <span className="text-gray-400"> · {r.maKien ?? r.id.slice(-4)}</span>
                      </span>
                      <span className="text-gray-900 font-medium whitespace-nowrap">{formatNumber(r.soLuong)} {r.donViTinh}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-gray-400">Chọn một ô trên sơ đồ để đặt hàng vào vị trí.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Slot modal */}
      <Modal isOpen={!!activeSlot} onClose={() => setActiveSlot(null)} ariaLabel="Chi tiết vị trí">
        {activeSlot && (
          <div className="bg-white rounded-lg shadow-xl w-[calc(100vw-2rem)] sm:w-96 max-h-[85vh] flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-800">
                Vị trí {zoneLabel(activeSlot.zone)} — {activeSlot.code}
              </h3>
              <button onClick={() => setActiveSlot(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded" aria-label="Đóng">
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              {activeSlot.dbSlotId ? (
                activeRows.length === 0 ? (
                  <p className="text-xs text-gray-400">Vị trí trống</p>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {activeRows.map((r) => (
                      <li key={r.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                        <div>
                          <p className="text-gray-800 font-medium">{r.internationalProduct?.tenSanPham ?? '?'}</p>
                          <p className="text-gray-400">
                            {r.maKien ?? ''} · Lô {r.tenLo} · {formatNumber(r.soLuong)} {r.donViTinh}
                          </p>
                        </div>
                        <button
                          onClick={() => handleUnplace(r.id)}
                          className="px-2 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50 whitespace-nowrap"
                        >
                          Gỡ vị trí
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <p className="text-xs text-amber-600">Vị trí chưa có trong CSDL — làm mới dữ liệu kho để đồng bộ.</p>
              )}

              {activeSlot.dbSlotId && (
                <div className="border-t border-gray-100 pt-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor="assign-select">
                    Đặt hàng vào vị trí
                  </label>
                  <select
                    id="assign-select"
                    value={assignId}
                    onChange={(e) => setAssignId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">— Chọn hàng chưa xếp vị trí —</option>
                    {unplaced.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.internationalProduct?.tenSanPham ?? '?'} · {r.maKien ?? r.id.slice(-4)} · {formatNumber(r.soLuong)} {r.donViTinh}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssign}
                    disabled={!assignId || updateLotProduct.isPending}
                    className="mt-2 w-full px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Đặt vào vị trí
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WarehouseMap;
