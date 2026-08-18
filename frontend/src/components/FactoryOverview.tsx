import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { MapPin, Plus, Minus, Maximize2, Loader2, AlertTriangle } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { Warehouse } from '../services/warehouseService';
import { getLayoutByMaKho } from '../constants/warehouseLayouts';
import { WAREHOUSE_VIEW_CONFIG, WRAPPER_CLASSES, CONTENT_CLASSES } from '../constants/warehouseViewConfig';
import { FILL_LEVELS, classifyRatio, type FillLevel } from '../utils/heatmap';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker as string;
const PAGE_W = 842; const PAGE_H = 595;
interface OverlayRoom { maKho: string; label: string; left: number; top: number; width: number; height: number; points?: [number, number][]; }
const OVERLAY_ROOMS: OverlayRoom[] = [
  { maKho: 'KHOTP', label: 'Kho thành phẩm sấy', left: 19.47, top: 43.48, width: 18.61, height: 18.72, points: [[38.08,57.09],[33.38,57.31],[33.38,62.2],[19.47,61.98],[19.47,49.8],[21.85,49.7],[24.23,46.32],[24.38,43.48],[37.92,43.6]] },
  { maKho: 'KHOTD1', label: 'Kho trữ đông 1', left: 41.15, top: 28.13, width: 14.07, height: 10.45, points: [[41.15,28.13],[55.15,28.13],[55.23,38.59],[41.24,38.47]] },
  { maKho: 'HD1', label: 'Hầm đông 1', left: 55.27, top: 28.17, width: 5.65, height: 8.67, points: [[55.27,28.17],[60.93,28.25],[60.93,36.84],[55.46,36.84]] },
  { maKho: 'HD2', label: 'Hầm đông 2', left: 61, top: 26.29, width: 5.93, height: 10.55, points: [[61.12,26.32],[66.92,26.29],[66.77,36.84],[61,36.84]] },
  { maKho: 'KHOTD2', label: 'Kho trữ đông 2', left: 66.85, top: 26.18, width: 8.61, height: 10.77, points: [[66.9,26.32],[75.46,26.18],[75.38,36.96],[66.85,36.84]] },
  { maKho: 'KHOPL', label: 'Phòng phụ liệu', left: 80.67, top: 34.99, width: 4.11, height: 24.71, points: [[80.67,35.03],[84.69,34.99],[84.77,59.7],[80.69,59.6]] },
];
interface FactoryOverviewProps { warehouses: Warehouse[]; selectedWarehouseId?: string | null; onSelectWarehouse: (id: string) => void; }
const FactoryOverview: React.FC<FactoryOverviewProps> = ({ warehouses, selectedWarehouseId, onSelectWarehouse }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfStatus, setPdfStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const fillByKho = useMemo(() => {
    const m = new Map<string, { ratio: number; occupied: number; total: number; level: FillLevel }>();
    warehouses.forEach((w) => {
      const layout = getLayoutByMaKho(w.maKho);
      if (!layout) return;
      const slotIds = new Set((w.warehouseSlots ?? []).map((s) => s.id));
      const placed = new Set<string>();
      (w.lots ?? []).forEach((lot) => (lot.lotProducts ?? []).forEach((lp) => { if (lp.slotId && lp.soLuong > 0) placed.add(lp.slotId); }));
      const total = slotIds.size || layout.slots.length;
      const occupied = placed.size;
      const ratio = total > 0 ? occupied / total : 0;
      m.set(w.maKho, { ratio, occupied, total, level: classifyRatio(ratio) });
    });
    return m;
  }, [warehouses]);
  const fillCounts = useMemo(() => { const c: Record<FillLevel, number> = { empty: 0, partial: 0, full: 0 }; fillByKho.forEach((v) => { c[v.level] += 1; }); return c; }, [fillByKho]);
  const khoById = useMemo(() => { const m = new Map<string, Warehouse>(); warehouses.forEach((w) => m.set(w.maKho, w)); return m; }, [warehouses]);
  const areaLabel = (a: OverlayRoom) => { const f = a.maKho ? fillByKho.get(a.maKho) : undefined; if (!f) return a.label; return `${a.label} · ${f.occupied}/${f.total} ô (${Math.round(f.ratio * 100)}%)`; };
  const taskRef = useRef<any>(null); const desiredScaleRef = useRef<number | null>(null); const busyRef = useRef(false); const pageRef = useRef<{ render: (scale: number) => void } | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const doc = await pdfjsLib.getDocument({ url: '/factory/factory-map.pdf' }).promise;
        if (cancelled) return;
        const page = await doc.getPage(1);
        if (cancelled) return;
        const render = async (scale: number) => {
          const canvas = canvasRef.current; if (!canvas) return;
          const vp = page.getViewport({ scale });
          canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height);
          const ctx = canvas.getContext('2d'); if (!ctx) return;
          const t = (page as any).render({ canvasContext: ctx, viewport: vp });
          taskRef.current = t; try { await t.promise; } finally { taskRef.current = null; }
        };
        pageRef.current = { render: (scale: number) => { desiredScaleRef.current = scale; if (busyRef.current) return; busyRef.current = true; (async () => { try { while (desiredScaleRef.current != null) { const s = desiredScaleRef.current; desiredScaleRef.current = null; try { taskRef.current?.cancel(); } catch {} await render(s); } } finally { busyRef.current = false; } })().catch(() => { busyRef.current = false; }); } };
        setPdfStatus('ready');
      } catch (e) { console.error('[FactoryOverview] PDF error', e); if (!cancelled) setPdfStatus('error'); }
    })();
    return () => { cancelled = true; try { taskRef.current?.cancel(); } catch {} };
  }, []);
  const rerender = useCallback(() => {
    const el = containerRef.current; if (!el || !pageRef.current || pdfStatus !== 'ready') return;
    const cssWidth = el.clientWidth || 900; const dpr = window.devicePixelRatio || 1;
    pageRef.current.render((cssWidth / PAGE_W) * 2.2 * dpr);
  }, [pdfStatus]);
  useEffect(() => {
    if (pdfStatus !== 'ready') return;
    const el = containerRef.current; if (!el) return;
    let raf = 0; const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(rerender); };
    schedule(); const ro = new ResizeObserver(schedule); ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [pdfStatus, rerender]);
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-blue-600" /> Sơ đồ tổng thể nhà máy</h3>
        <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
          {(Object.keys(FILL_LEVELS) as FillLevel[]).map((k) => { const lv = FILL_LEVELS[k]; return <span key={k} className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border inline-block" style={{ background: lv.fill, borderColor: lv.stroke }} />{lv.label} ({fillCounts[k]})</span>; })}
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-2">Bấm vào một kho (tô màu) để xem sơ đồ chi tiết vị trí kiện.</p>
      <TransformWrapper minScale={WAREHOUSE_VIEW_CONFIG.factory.minScale} maxScale={WAREHOUSE_VIEW_CONFIG.factory.maxScale} initialScale={WAREHOUSE_VIEW_CONFIG.factory.initialScale} wheel={{ step: WAREHOUSE_VIEW_CONFIG.factory.wheel.step }} pinch={{ step: WAREHOUSE_VIEW_CONFIG.factory.pinch.step }} doubleClick={{ mode: WAREHOUSE_VIEW_CONFIG.factory.doubleClick.mode, step: WAREHOUSE_VIEW_CONFIG.factory.doubleClick.step }} panning={{ velocityDisabled: WAREHOUSE_VIEW_CONFIG.factory.panning.velocityDisabled }} limitToBounds={WAREHOUSE_VIEW_CONFIG.factory.limitToBounds} centerZoomedOut={WAREHOUSE_VIEW_CONFIG.factory.centerZoomedOut} centerOnInit={WAREHOUSE_VIEW_CONFIG.factory.centerOnInit}>
        {({ zoomIn, zoomOut, resetTransform }) => (
          <div className="relative">
            <div className="absolute right-2 top-2 z-10 flex flex-col gap-1 bg-white/90 rounded-lg shadow border border-gray-200 p-1">
              <button onClick={() => zoomIn(0.3)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Phóng to" aria-label="Phóng to"><Plus className="w-4 h-4" /></button>
              <button onClick={() => zoomOut(0.3)} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Thu nhỏ" aria-label="Thu nhỏ"><Minus className="w-4 h-4" /></button>
              <button onClick={() => resetTransform()} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded" title="Vừa màn hình" aria-label="Đặt lại"><Maximize2 className="w-4 h-4" /></button>
            </div>
            <TransformComponent wrapperClass={WRAPPER_CLASSES.factory} contentClass={CONTENT_CLASSES.factory}>
              <div ref={containerRef} className="w-full relative select-none">
                <div className="relative w-full" style={{ aspectRatio: `${PAGE_W} / ${PAGE_H}` }}>
                  {pdfStatus === 'error' && <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-500 text-sm gap-2"><AlertTriangle className="w-4 h-4" /> Không tải được sơ đồ tổng thể (factory-map.pdf)</div>}
                  {pdfStatus !== 'error' && <canvas ref={canvasRef} className="w-full h-full block bg-white" />}
                  {pdfStatus === 'loading' && <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-slate-500 text-sm gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Đang tải sơ đồ…</div>}
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                    {OVERLAY_ROOMS.map((a, i) => {
                      const w = khoById.get(a.maKho); const f = fillByKho.get(a.maKho); const lvl = f?.level ?? 'empty'; const fill = FILL_LEVELS[lvl]; const isSelected = w && selectedWarehouseId === w.id; const clickable = !!w; const pts = a.points ?? [[a.left, a.top],[a.left+a.width,a.top],[a.left+a.width,a.top+a.height],[a.left,a.top+a.height]]; const cx = pts.reduce((s,p)=>s+p[0],0)/pts.length; const cy = pts.reduce((s,p)=>s+p[1],0)/pts.length; const fs = a.width > 12 ? 1.7 : 1.2;
                      return (
                        <g key={`area-${i}`}>
                          <title>{areaLabel(a)}</title>
                          <polygon points={pts.map(p=>p.join(',')).join(' ')} fill={fill.fill} stroke={isSelected ? '#1d4ed8' : fill.stroke} strokeWidth={isSelected ? 0.9 : 0.45} vectorEffect="non-scaling-stroke" role={clickable ? 'button' : undefined} tabIndex={clickable ? 0 : undefined} aria-label={areaLabel(a)} onMouseDown={(e)=>e.stopPropagation()} onClick={()=>clickable && w && onSelectWarehouse(w.id)} onKeyDown={(e)=>{ if(!clickable||!w) return; if(e.key==='Enter'||e.key===' '){ e.preventDefault(); onSelectWarehouse(w.id);} }} style={{ pointerEvents: clickable ? 'all' : 'none', cursor: clickable ? 'pointer' : 'default', transition: 'filter .15s', filter: isSelected ? 'drop-shadow(0 0 2px rgba(29,78,216,.6))' : undefined }} className={clickable ? 'hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-blue-400' : ''} />
                          {f && <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" style={{ pointerEvents:'none', fontSize: fs*0.8, fontWeight:700, fill:'#0f172a', paintOrder:'stroke', stroke:'#ffffff', strokeWidth:0.35 }}>{f.occupied}/{f.total}</text>}
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
