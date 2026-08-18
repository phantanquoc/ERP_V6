import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Plus, Minus, Maximize2, Loader2, AlertTriangle } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { Warehouse } from '../services/warehouseService';
import { getLayoutByMaKho } from '../constants/warehouseLayouts';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Page size of the source PDF (pts). The rendered canvas follows this aspect.
const PAGE_W = 842;
const PAGE_H = 595;

// ---------------------------------------------------------------------------
// Warehouse overlay rectangles — measured against the ACTUAL rendered factory
// walls (source: "Sơ đồ tổng thể nhà máy.pdf"). Values are % of the PDF page
// so they align 1:1 with the rendered backdrop regardless of screen size.
// ---------------------------------------------------------------------------
interface OverlayRoom {
  maKho: string;
  label: string;
  left: number;  // % of page width
  top: number;   // % of page height
  width: number; // % of page width
  height: number; // % of page height
  points?: [number, number][]; // polygon in page % (overrides the box when present)
}

const OVERLAY_ROOMS: OverlayRoom[] = [
  {
    maKho: 'KHOTP', label: 'Kho thành phẩm sấy', left: 19.47, top: 43.48, width: 18.61, height: 18.72,
    points: [[38.08,57.09],[33.38,57.31],[33.38,62.2],[19.47,61.98],[19.47,49.8],[21.85,49.7],[24.23,46.32],[24.38,43.48],[37.92,43.6]],
  },
  {
    maKho: 'KHOTD1', label: 'Kho trữ đông 1', left: 41.15, top: 28.13, width: 14.07, height: 10.45,
    points: [[41.15,28.13],[55.15,28.13],[55.23,38.59],[41.24,38.47]],
  },
  {
    maKho: 'HD1', label: 'Hầm đông 1', left: 55.27, top: 28.17, width: 5.65, height: 8.67,
    points: [[55.27,28.17],[60.93,28.25],[60.93,36.84],[55.46,36.84]],
  },
  {
    maKho: 'HD2', label: 'Hầm đông 2', left: 61, top: 26.29, width: 5.93, height: 10.55,
    points: [[61.12,26.32],[66.92,26.29],[66.77,36.84],[61,36.84]],
  },
  {
    maKho: 'KHOTD2', label: 'Kho trữ đông 2', left: 66.85, top: 26.18, width: 8.61, height: 10.77,
    points: [[66.9,26.32],[75.46,26.18],[75.38,36.96],[66.85,36.84]],
  },
  {
    maKho: 'KHOPL', label: 'Phòng phụ liệu', left: 80.67, top: 34.99, width: 4.11, height: 24.71,
    points: [[80.67,35.03],[84.69,34.99],[84.77,59.7],[80.69,59.6]],
  },
];

// Fill-level heatmap bins (shared convention with WarehouseMap):
// cool (light blue, empty) → yellow (partial) → hot (red, full).
type FillLevel = 'empty' | 'partial' | 'full';
const FILL_LEVELS: Record<FillLevel, { fill: string; stroke: string; label: string }> = {
  empty: { fill: 'rgba(59,130,246,0.18)', stroke: '#3b82f6', label: 'Trống (<40%)' },
  partial: { fill: 'rgba(234,179,8,0.30)', stroke: '#ca8a04', label: 'Có hàng (40–75%)' },
  full: { fill: 'rgba(239,68,68,0.38)', stroke: '#b91c1c', label: 'Đầy (>75%)' },
};

/** Classify a warehouse's fill ratio into a heatmap bin. */
const classifyRatio = (ratio: number): FillLevel => {
  if (ratio >= 0.75) return 'full';
  if (ratio >= 0.4) return 'partial';
  return 'empty';
};

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
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfStatus, setPdfStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Fill ratio per warehouse = occupied slots / total CAD slots.
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

  const areaLabel = (a: OverlayRoom) => {
    const f = a.maKho ? fillByKho.get(a.maKho) : undefined;
    if (!f) return a.label;
    return `${a.label} · ${f.occupied}/${f.total} ô (${Math.round(f.ratio * 100)}%)`;
  };

  // Load the PDF once and keep the page renderer + a queued render dispatcher.
  const taskRef = useRef<{ cancel: () => void } | null>(null);
  const desiredScaleRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const pageRef = useRef<{ render: (scale: number) => void } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const doc = await pdfjsLib.getDocument({ url: '/factory/factory-map.pdf' }).promise;
        if (cancelled) return;
        const page = await doc.getPage(1);
        if (cancelled) return;

        const render = async (scale: number) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const vp = page.getViewport({ scale });
          canvas.width = Math.floor(vp.width);
          canvas.height = Math.floor(vp.height);
          // CSS size is controlled by the outer container (w-full h-full),
          // so overlays positioned in % of the container align with the canvas.
          const t = page.render({ canvas, viewport: vp });
          taskRef.current = t;
          try {
            await t.promise;
          } finally {
            taskRef.current = null;
          }
        };

        pageRef.current = {
          render: (scale: number) => {
            desiredScaleRef.current = scale;
            if (busyRef.current) return; // a render is running; it will pick up the latest scale
            busyRef.current = true;
            (async () => {
              try {
                while (desiredScaleRef.current != null) {
                  const s = desiredScaleRef.current;
                  desiredScaleRef.current = null;
                  // Cancel any in-flight render before drawing again on the same canvas.
                  try {
                    taskRef.current?.cancel();
                  } catch { /* ignore */ }
                  await render(s);
                }
              } finally {
                busyRef.current = false;
              }
            })().catch(() => { busyRef.current = false; });
          },
        };
        setPdfStatus('ready');
      } catch {
        if (!cancelled) setPdfStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      try {
        taskRef.current?.cancel();
      } catch { /* ignore */ }
    };
  }, []);

  // Re-render the page whenever the container width changes (crisp on zoom).
  const rerender = useCallback(() => {
    const el = containerRef.current;
    if (!el || !pageRef.current || pdfStatus !== 'ready') return;
    const cssWidth = el.clientWidth || 900;
    const dpr = window.devicePixelRatio || 1;
    // Render ~2.5x the displayed size so zooming into the vector keeps detail.
    pageRef.current.render((cssWidth / PAGE_W) * 2.5 * dpr);
  }, [pdfStatus]);

  useLayoutEffect(() => {
    if (pdfStatus !== 'ready') return;
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(rerender);
    };
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [pdfStatus, rerender]);

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

      <TransformWrapper minScale={1} maxScale={6} wheel={{ step: 0.08 }} doubleClick={{ mode: 'toggle', step: 2 }} limitToBounds centerOnInit>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <div className="relative">
            <div className="absolute right-2 top-2 z-10 flex flex-col gap-1 bg-white/90 rounded-lg shadow border border-gray-200 p-1">
              <button onClick={() => zoomIn(0.3)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Phóng to" aria-label="Phóng to"><Plus className="w-4 h-4" /></button>
              <button onClick={() => zoomOut(0.3)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Thu nhỏ" aria-label="Thu nhỏ"><Minus className="w-4 h-4" /></button>
              <button onClick={() => resetTransform()} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Vừa màn hình" aria-label="Đặt lại"><Maximize2 className="w-4 h-4" /></button>
            </div>
            <TransformComponent wrapperClass="!w-full !h-[72vh] !cursor-grab active:!cursor-grabbing" contentClass="!w-full">
              <div ref={containerRef} className="w-full relative select-none">
                <div className="relative w-full" style={{ aspectRatio: `${PAGE_W} / ${PAGE_H}` }}>
                  {pdfStatus === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-500 text-sm gap-2">
                      <AlertTriangle className="w-4 h-4" /> Không tải được sơ đồ tổng thể (factory-map.pdf)
                    </div>
                  )}
                  {pdfStatus !== 'error' && (
                    <canvas ref={canvasRef} className="w-full h-full block bg-white" />
                  )}
                  {pdfStatus === 'loading' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white text-slate-500 text-sm gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Đang tải sơ đồ…
                    </div>
                  )}

                  {/* Warehouse areas — SVG polygons on top of the real PDF drawing.
                      viewBox 0..100 maps to the full page so polygon points are page-%.
                      preserveAspectRatio="none" aligns them 1:1 with the canvas. */}
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: 'none' }}
                  >
                    {OVERLAY_ROOMS.map((a, i) => {
                      const w = khoById.get(a.maKho);
                      const f = fillByKho.get(a.maKho);
                      const lvl = f?.level ?? 'empty';
                      const fill = FILL_LEVELS[lvl];
                      const isSelected = w && selectedWarehouseId === w.id;
                      const clickable = !!w;
                      const pts = a.points ?? [[a.left, a.top], [a.left + a.width, a.top], [a.left + a.width, a.top + a.height], [a.left, a.top + a.height]];
                      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
                      const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
                      const fs = a.width > 12 ? 1.7 : 1.2;
                      return (
                        <g key={`area-${i}`}>
                          <title>{areaLabel(a)}</title>
                          <polygon
                            points={pts.map((p) => p.join(',')).join(' ')}
                            fill={fill.fill}
                            stroke={isSelected ? '#1d4ed8' : fill.stroke}
                            strokeWidth={isSelected ? 0.9 : 0.45}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={() => clickable && w && onSelectWarehouse(w.id)}
                            style={{
                              pointerEvents: clickable ? 'all' : 'none',
                              cursor: clickable ? 'pointer' : 'default',
                              transition: 'filter .15s',
                              filter: isSelected ? 'drop-shadow(0 0 2px rgba(29,78,216,.6))' : undefined,
                            }}
                            className={clickable ? 'hover:brightness-95' : ''}
                          >
                            <title>{areaLabel(a)}</title>
                          </polygon>
                          {f && (
                            <text
                              x={cx}
                              y={cy}
                              textAnchor="middle"
                              dominantBaseline="central"
                              style={{ pointerEvents: 'none', fontSize: fs * 0.8, fontWeight: 700, fill: '#0f172a', paintOrder: 'stroke', stroke: '#ffffff', strokeWidth: 0.35 }}
                            >
                              {f.occupied}/{f.total}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
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
