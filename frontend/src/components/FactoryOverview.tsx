import React, { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Plus, Minus, Maximize2 } from 'lucide-react';
import type { Warehouse } from '../services/warehouseService';
import { getLayoutByMaKho } from '../constants/warehouseLayouts';
import { WAREHOUSE_VIEW_CONFIG, WRAPPER_CLASSES, CONTENT_CLASSES } from '../constants/warehouseViewConfig';
import { FILL_LEVELS, classifyRatio, type FillLevel } from '../utils/heatmap';
import { FACTORY_LAYOUT } from '../constants/factoryLayout';

interface FactoryOverviewProps {
  warehouses: Warehouse[];
  selectedWarehouseId?: string | null;
  onSelectWarehouse: (id: string) => void;
}

const FactoryOverview: React.FC<FactoryOverviewProps> = ({
  warehouses,
  selectedWarehouseId,
  onSelectWarehouse,
}) => {
  const fillByKho = useMemo(() => {
    const m = new Map<string, { ratio: number; occupied: number; total: number; level: FillLevel }>();
    warehouses.forEach((w) => {
      const layout = getLayoutByMaKho(w.maKho);
      if (!layout) return;
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

  const khoById = useMemo(() => {
    const m = new Map<string, Warehouse>();
    warehouses.forEach((w) => m.set(w.maKho, w));
    return m;
  }, [warehouses]);

  const areaLabel = (area: { maKho?: string; label: string }) => {
    const f = area.maKho ? fillByKho.get(area.maKho) : undefined;
    if (!f) return area.label;
    return `${area.label} · ${f.occupied}/${f.total} ô (${Math.round(f.ratio * 100)}%)`;
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
      <p className="text-xs text-gray-500 mb-2">Bấm vào một kho (tô màu) để xem sơ đồ chi tiết vị trí kiện.</p>

      <TransformWrapper
        minScale={WAREHOUSE_VIEW_CONFIG.factory.minScale}
        maxScale={WAREHOUSE_VIEW_CONFIG.factory.maxScale}
        initialScale={WAREHOUSE_VIEW_CONFIG.factory.initialScale}
        wheel={{ step: WAREHOUSE_VIEW_CONFIG.factory.wheel.step }}
        pinch={{ step: WAREHOUSE_VIEW_CONFIG.factory.pinch.step }}
        doubleClick={{ mode: WAREHOUSE_VIEW_CONFIG.factory.doubleClick.mode, step: WAREHOUSE_VIEW_CONFIG.factory.doubleClick.step }}
        panning={{ velocityDisabled: WAREHOUSE_VIEW_CONFIG.factory.panning.velocityDisabled }}
        limitToBounds={WAREHOUSE_VIEW_CONFIG.factory.limitToBounds}
        centerZoomedOut={WAREHOUSE_VIEW_CONFIG.factory.centerZoomedOut}
        centerOnInit={WAREHOUSE_VIEW_CONFIG.factory.centerOnInit}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <div className="relative">
            <div className="absolute right-2 top-2 z-10 flex flex-col gap-1 bg-white/90 rounded-lg shadow border border-gray-200 p-1">
              <button onClick={() => zoomIn(0.3)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Phóng to" aria-label="Phóng to"><Plus className="w-4 h-4" /></button>
              <button onClick={() => zoomOut(0.3)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Thu nhỏ" aria-label="Thu nhỏ"><Minus className="w-4 h-4" /></button>
              <button onClick={() => resetTransform()} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Vừa màn hình" aria-label="Đặt lại"><Maximize2 className="w-4 h-4" /></button>
            </div>
            <TransformComponent wrapperClass={WRAPPER_CLASSES.factory} contentClass={CONTENT_CLASSES.factory}>
              <div className="w-full relative select-none">
                <div className="relative w-full" style={{ aspectRatio: `${FACTORY_LAYOUT.viewW} / ${FACTORY_LAYOUT.viewH}` }}>
                  <svg
                    viewBox={`0 0 ${FACTORY_LAYOUT.viewW} ${FACTORY_LAYOUT.viewH}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="w-full h-full block bg-white border border-gray-200"
                    role="img"
                    aria-label="Sơ đồ tổng thể nhà máy"
                  >
                    {/* Raster PDF backdrop — hidden if PNG not yet generated */}
                    <image
                      href="/factory/factory-map.png"
                      x="0"
                      y="0"
                      width={FACTORY_LAYOUT.viewW}
                      height={FACTORY_LAYOUT.viewH}
                      preserveAspectRatio="xMidYMid meet"
                      opacity={0.12}
                      style={{ pointerEvents: 'none' }}
                      onError={(e) => { (e.target as SVGImageElement).style.display = 'none'; }}
                    />
                    {/* Factory walls — light gray structure */}
                    {FACTORY_LAYOUT.walls.map((w, i) => (
                      <line
                        key={`wall-${i}`}
                        x1={w.x1}
                        y1={w.y1}
                        x2={w.x2}
                        y2={w.y2}
                        stroke="#94a3b8"
                        strokeWidth={0.18}
                        strokeLinecap="square"
                        vectorEffect="non-scaling-stroke"
                      />
                    ))}

                    {/* Context rooms — orientation labels, non-clickable */}
                    {FACTORY_LAYOUT.context.map((area, i) => (
                      <g key={`ctx-${i}`}>
                        <rect
                          x={area.x}
                          y={area.y}
                          width={area.w}
                          height={area.h}
                          fill="#f1f5f9"
                          stroke="#cbd5e1"
                          strokeWidth={0.12}
                          rx={0.2}
                          vectorEffect="non-scaling-stroke"
                        />
                        <text
                          x={area.x + area.w / 2}
                          y={area.y + area.h / 2}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={0.9}
                          className="fill-slate-500 font-medium"
                          style={{ pointerEvents: 'none' }}
                        >
                          {area.label}
                        </text>
                      </g>
                    ))}

                    {/* Clickable warehouse areas — heatmap */}
                    {FACTORY_LAYOUT.areas.map((area, i) => {
                      const w = area.maKho ? khoById.get(area.maKho) : undefined;
                      const f = area.maKho ? fillByKho.get(area.maKho) : undefined;
                      const lvl = f?.level ?? 'empty';
                      const fill = FILL_LEVELS[lvl];
                      const isSelected = w && selectedWarehouseId === w.id;
                      const clickable = !!w;
                      const cx = area.x + area.w / 2;
                      const cy = area.y + area.h / 2;
                      return (
                        <g key={`area-${i}`}>
                          <title>{areaLabel(area)}</title>
                          <rect
                            x={area.x}
                            y={area.y}
                            width={area.w}
                            height={area.h}
                            rx={0.3}
                            fill={fill.fill}
                            stroke={isSelected ? '#1d4ed8' : fill.stroke}
                            strokeWidth={isSelected ? 0.35 : 0.18}
                            vectorEffect="non-scaling-stroke"
                            role={clickable ? 'button' : undefined}
                            tabIndex={clickable ? 0 : undefined}
                            aria-label={areaLabel(area)}
                            onClick={() => clickable && w && onSelectWarehouse(w.id)}
                            onKeyDown={(e) => {
                              if (!clickable || !w) return;
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSelectWarehouse(w.id);
                              }
                            }}
                            style={{
                              cursor: clickable ? 'pointer' : 'default',
                              transition: 'filter .15s',
                              filter: isSelected ? 'drop-shadow(0 0 1px rgba(29,78,216,.5))' : undefined,
                            }}
                            className={clickable ? 'hover:brightness-95 focus:outline-none focus:ring-1 focus:ring-blue-400' : ''}
                          />
                          <text
                            x={cx}
                            y={area.label.length > 18 ? cy - 0.6 : cy}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={area.w > 12 ? 1.1 : 0.85}
                            fontWeight={700}
                            fill="#0f172a"
                            style={{ pointerEvents: 'none', paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 0.25 }}
                          >
                            {area.label}
                          </text>
                          {f && (
                            <text
                              x={cx}
                              y={area.label.length > 18 ? cy + 0.7 : cy + 1.1}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize={0.75}
                              fontWeight={600}
                              fill="#334155"
                              style={{ pointerEvents: 'none' }}
                            >
                              {f.occupied}/{f.total} ô
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {/* Fallback link */}
                  <a
                    href="/factory/factory-map.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-1 right-1 text-[10px] text-blue-600 bg-white/90 px-1.5 py-0.5 rounded shadow hover:underline"
                  >
                    Mở PDF gốc
                  </a>
                </div>
              </div>
            </TransformComponent>
          </div>
        )}
      </TransformWrapper>
    </div>
  );
};

export default FactoryOverview;
