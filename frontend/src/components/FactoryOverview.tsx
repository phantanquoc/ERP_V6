import React, { useMemo } from 'react';
import { MapPin, Plus, Minus, Maximize2 } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { Warehouse } from '../services/warehouseService';
import { WAREHOUSE_LAYOUTS, getLayoutByMaKho } from '../constants/warehouseLayouts';
import { FACTORY_LAYOUT, type FactoryArea } from '../constants/factoryLayout';

interface FactoryOverviewProps {
  warehouses: Warehouse[];
  selectedWarehouseId?: string | null;
  onSelectWarehouse: (id: string) => void;
}

// Fill-level heatmap bins (shared convention with WarehouseMap):
// cool (light blue, empty) → yellow (partial) → hot (red, full).
type FillLevel = 'empty' | 'partial' | 'full';
const FILL_LEVELS: Record<FillLevel, { fill: string; stroke: string; label: string }> = {
  empty: { fill: '#dbeafe', stroke: '#93c5fd', label: 'Trống (<40%)' },
  partial: { fill: '#fef08a', stroke: '#ca8a04', label: 'Có hàng (40–75%)' },
  full: { fill: '#fca5a5', stroke: '#b91c1c', label: 'Đầy (>75%)' },
};

/** Classify a warehouse's fill ratio into a heatmap bin. */
const classifyRatio = (ratio: number): FillLevel => {
  if (ratio >= 0.75) return 'full';
  if (ratio >= 0.4) return 'partial';
  return 'empty';
};

/**
 * Sơ đồ tổng thể nhà máy — block-level floor plan showing where each warehouse sits
 * in the factory. 6 CAD warehouses are clickable areas tinted by their fill ratio
 * (cool→hot heatmap) so staff can see at a glance which stores are busy. Clicking a
 * warehouse switches to its detailed pallet map.
 */
const FactoryOverview: React.FC<FactoryOverviewProps> = ({ warehouses, selectedWarehouseId, onSelectWarehouse }) => {
  // Fill ratio per warehouse = occupied slots / total CAD slots.
  const fillByKho = useMemo(() => {
    const m = new Map<string, { ratio: number; occupied: number; total: number; level: FillLevel }>();
    warehouses.forEach((w) => {
      const layout = getLayoutByMaKho(w.maKho);
      if (!layout) return;
      // A slot is "occupied" if any of this warehouse's lotProducts reference it.
      const slotIds = new Set((w.warehouseSlots ?? []).map((s) => s.id));
      const placedSlotIds = new Set<string>();
      (w.lots ?? []).forEach((lot) => {
        (lot.lotProducts ?? []).forEach((lp) => {
          if (lp.slotId && lp.soLuong > 0) placedSlotIds.add(lp.slotId);
        });
      });
      const total = slotIds.size || layout.slots.length;
      const occupied = placedSlotIds.size;
      const ratio = total > 0 ? occupied / total : 0;
      m.set(w.maKho, { ratio, occupied, total, level: classifyRatio(ratio) });
    });
    return m;
  }, [warehouses]);

  const fillCounts = useMemo(() => {
    const c: Record<FillLevel, number> = { empty: 0, partial: 0, full: 0 };
    fillByKho.forEach((v) => { c[v.level] += 1; });
    return c;
  }, [fillByKho]);

  // Map maKho → warehouse id for click handler + status lookup.
  const khoById = useMemo(() => {
    const m = new Map<string, Warehouse>();
    warehouses.forEach((w) => m.set(w.maKho, w));
    return m;
  }, [warehouses]);

  const areaLabel = (a: FactoryArea) => {
    const f = a.maKho ? fillByKho.get(a.maKho) : undefined;
    if (!f) return a.label;
    return `${a.label} · ${f.occupied}/${f.total} ô (${Math.round(f.ratio * 100)}%)`;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-blue-600" />
          Sơ đồ tổng thể nhà máy
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
      <p className="text-xs text-gray-500 mb-2">Bấm vào một kho để xem sơ đồ chi tiết vị trí kiện.</p>

      <TransformWrapper minScale={1} maxScale={6} wheel={{ step: 0.08 }} doubleClick={{ mode: 'toggle', step: 2 }} limitToBounds centerOnInit>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <div className="relative">
            <div className="absolute right-2 top-2 z-10 flex flex-col gap-1 bg-white/90 rounded-lg shadow border border-gray-200 p-1">
              <button onClick={() => zoomIn(0.3)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Phóng to" aria-label="Phóng to"><Plus className="w-4 h-4" /></button>
              <button onClick={() => zoomOut(0.3)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Thu nhỏ" aria-label="Thu nhỏ"><Minus className="w-4 h-4" /></button>
              <button onClick={() => resetTransform()} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Vừa màn hình" aria-label="Đặt lại"><Maximize2 className="w-4 h-4" /></button>
            </div>
            <TransformComponent wrapperClass="!w-full !h-[72vh] !cursor-grab active:!cursor-grabbing" contentClass="!w-full">
              <svg viewBox={`0 0 ${FACTORY_LAYOUT.viewW} ${FACTORY_LAYOUT.viewH + 3}`} className="w-full" role="img" aria-label="Sơ đồ tổng thể nhà máy">
                {/* Walls — thin slate, factory structure */}
                {FACTORY_LAYOUT.walls.map((wl, i) => (
                  <line key={`fw-${i}`} x1={wl.x1} y1={wl.y1} x2={wl.x2} y2={wl.y2} stroke="#475569" strokeWidth={0.4} strokeLinecap="square" />
                ))}

                {/* Context rooms (non-clickable, orientation only) */}
                {FACTORY_LAYOUT.context.map((c, i) => (
                  <g key={`ctx-${i}`}>
                    <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={0.3} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={0.12} />
                    <text x={c.x + c.w / 2} y={c.y + c.h / 2} textAnchor="middle" fontSize={1.1} className="fill-slate-400 pointer-events-none">
                      {c.label}
                    </text>
                  </g>
                ))}

                {/* Warehouse areas — clickable, tinted by fill ratio */}
                {FACTORY_LAYOUT.areas.map((a, i) => {
                  const w = a.maKho ? khoById.get(a.maKho) : undefined;
                  const f = a.maKho ? fillByKho.get(a.maKho) : undefined;
                  const lvl = f?.level ?? 'empty';
                  const fill = FILL_LEVELS[lvl];
                  const isSelected = w && selectedWarehouseId === w.id;
                  const clickable = !!w;
                  return (
                    <g
                      key={`area-${i}`}
                      className={clickable ? 'cursor-pointer' : ''}
                      onClick={() => clickable && w && onSelectWarehouse(w.id)}
                    >
                      <title>{areaLabel(a)}</title>
                      <rect
                        x={a.x}
                        y={a.y}
                        width={a.w}
                        height={a.h}
                        rx={0.4}
                        fill={fill.fill}
                        stroke={isSelected ? '#1d4ed8' : fill.stroke}
                        strokeWidth={isSelected ? 0.6 : 0.25}
                        className={clickable ? 'hover:brightness-95 transition-[filter]' : ''}
                      />
                      <text x={a.x + a.w / 2} y={a.y + a.h / 2} textAnchor="middle" fontSize={1.4} fontWeight={700} className="fill-slate-700 pointer-events-none">
                        {a.label}
                      </text>
                      {f && (
                        <text x={a.x + a.w / 2} y={a.y + a.h / 2 + 2.4} textAnchor="middle" fontSize={1} className="fill-slate-500 pointer-events-none">
                          {f.occupied}/{f.total} ô
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </TransformComponent>
          </div>
        )}
      </TransformWrapper>
    </div>
  );
};

export default FactoryOverview;
// Re-export for external use of the slot-count source.
export { WAREHOUSE_LAYOUTS };
