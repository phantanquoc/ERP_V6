import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useUrlTab, useUrlDetailId } from '../../hooks/useUrlState';
import {
  Package,
  ArrowUp,
  ArrowDown,
  FileText,
  ClipboardList,
  Warehouse,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import PageHeader from '../../design-system/PageHeader';
import SupplyRequestManagement from '../../components/SupplyRequestManagement';
import WarehouseUnifiedView from '../../components/WarehouseUnifiedView';
import FactoryOverview from '../../components/FactoryOverview';
import WarehouseReceiptTab from '../../components/WarehouseReceiptTab';
import WarehouseIssueTab from '../../components/WarehouseIssueTab';
import InternationalProductManagement from '../../components/InternationalProductManagement';
import InventoryOverview from '../../components/InventoryOverview';
import warehouseService, { Warehouse as WarehouseType } from '../../services/warehouseService';
import warehouseReceiptService from '../../services/warehouseReceiptService';
import warehouseIssueService from '../../services/warehouseIssueService';
import supplyRequestService from '../../services/supplyRequestService';
import { useWarehouses } from '../../hooks';
import { resolveWarehouseParam } from '../../utils/warehouseParam';
import InboundPlanTab from '../../components/warehouse/InboundPlanTab';
import OutboundPlanTab from '../../components/warehouse/OutboundPlanTab';
import inboundPlanService from '../../services/inboundPlanService';
import outboundPlanService from '../../services/outboundPlanService';

type TabType = 'inbound' | 'outbound' | 'supplyRequest' | 'warehouseManagement' | 'products' | 'inventory';
const VALID_TABS: TabType[] = ['supplyRequest', 'inventory', 'inbound', 'outbound', 'products', 'warehouseManagement'];

/**
 * Query params OWNED by each tab.
 *
 * Every tab body below renders conditionally, so when the user switches away the
 * component holding a detail param unmounts and nothing is left to clean it up.
 * Declaring the owner here lets `useUrlTab` drop the param on the way out instead
 * of leaking it across tabs (`?tab=products&warehouseId=…`, which then silently
 * re-selects that warehouse when the user comes back to the warehouse tab).
 *
 * Params NOT listed are page-level and must survive a tab switch:
 * `warehouseMonth`/`warehouseYear` (period filter) and `warehouseDetailId`
 * (overview modal opened from the cards above the tabs).
 */
/**
 * Real URL keys are `prefix + defaultKey`, e.g. useUrlFilters({ _search, maPhieuNhap, ... }, {prefix:'in_'})
 * writes `in__search`, `in_maPhieuNhap`, … — the previous table listed `in_q`/`in_status` etc which
 * never matched, so nothing was ever deleted on tab switch and params leaked across tabs.
 */
const TAB_SCOPED_PARAMS: Record<TabType, readonly string[]> = {
  supplyRequest: ['supplyRequestId', 'supplyStatus', 'supplyPriority', 'supplyOverdue'],
  inventory: ['inventoryScrollTo', 'loaiSanPham'],
  inbound: [
    'receiptId', 'inboundSubTab',
    // WarehouseReceiptTab — prefix 'in_'
    'in__search', 'in_maPhieuNhap', 'in_tenNhanVien', 'in_nguoiDeNghi', 'in_boPhan', 'in_warehouseId', 'in_tinhTrang', 'in_daIn', 'in_isVoided', 'in_fromNgay', 'in_toNgay', 'in_page', 'in_sortBy', 'in_sortOrder',
    // InboundPlanTab — prefix 'in_plan_'
    'in_plan__search', 'in_plan_trangThai', 'in_plan_warehouseId', 'in_plan_fromNgay', 'in_plan_toNgay', 'in_plan_page', 'in_plan_sortBy', 'in_plan_sortOrder',
  ],
  outbound: [
    'issueId', 'outboundSubTab',
    // WarehouseIssueTab — prefix 'out_'
    'out__search', 'out_maPhieuXuat', 'out_tenNhanVien', 'out_nguoiDeNghi', 'out_boPhan', 'out_warehouseId', 'out_tinhTrang', 'out_daIn', 'out_isVoided', 'out_fromNgay', 'out_toNgay', 'out_page', 'out_sortBy', 'out_sortOrder',
    // OutboundPlanTab — prefix 'out_plan_'
    'out_plan__search', 'out_plan_trangThai', 'out_plan_warehouseId', 'out_plan_fromNgay', 'out_plan_toNgay', 'out_plan_page', 'out_plan_sortBy', 'out_plan_sortOrder',
  ],
  products: [],
  warehouseManagement: ['warehouseId'],
};

// ── MiniSparkline: pure SVG, no deps, CSP-safe ──
const MiniSparkline: React.FC<{ data: number[]; width?: number; height?: number; color?: string; fillOpacity?: number; showDot?: boolean }> = ({
  data, width = 96, height = 28, color = '#8b5cf6', fillOpacity = 0.15, showDot = true,
}) => {
  if (!data.length) return <div style={{ width, height }} className="flex items-center justify-center"><span className="text-[10px] text-gray-400">—</span></div>;
  const allZero = data.every((v) => v === 0);
  if (allZero) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden>
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#e5e7eb" strokeWidth={1} strokeDasharray="3 3" />
      </svg>
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padY = 3;
  const innerH = height - padY * 2;
  const stepX = data.length > 1 ? width / (data.length - 1) : width;
  const pts = data.map((v, i) => ({ x: i * stepX, y: padY + innerH - ((v - min) / range) * innerH }));
  const lineD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${lineD} L${pts[pts.length - 1].x.toFixed(1)},${height - padY} L${pts[0].x.toFixed(1)},${height - padY} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden>
      <path d={areaD} fill={color} opacity={fillOpacity} />
      <path d={lineD} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      {showDot && <circle cx={last.x} cy={last.y} r={2.5} fill={color} stroke="white" strokeWidth={1} />}
    </svg>
  );
};

const bucketByDay = (items: any[], dateKey: string, days: number, endDate: Date): number[] => {
  const map = new Map<string, number>();
  const pad = (n: number) => String(n).padStart(2, '0');
  for (let i = 0; i < days; i++) {
    const d = new Date(endDate); d.setDate(endDate.getDate() - (days - 1 - i));
    map.set(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, 0);
  }
  const keys = Array.from(map.keys());
  const startStr = keys[0];
  for (const it of items) {
    const raw = it?.[dateKey] || it?.ngayTao || it?.createdAt;
    if (!raw) continue;
    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) continue;
    const k = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    if (map.has(k) && k >= startStr) map.set(k, (map.get(k) || 0) + 1);
  }
  return Array.from(map.values());
};

const wowLabel = (curr: number[], prev: number[]): { text: string; positive: boolean | null } => {
  const sCurr = curr.reduce((a, b) => a + b, 0);
  const sPrev = prev.reduce((a, b) => a + b, 0);
  if (sPrev === 0 && sCurr === 0) return { text: '—', positive: null };
  if (sPrev === 0) return { text: `↑ ${sCurr} mới`, positive: true };
  const pct = Math.round(((sCurr - sPrev) / sPrev) * 100);
  if (pct === 0) return { text: '→ 0%', positive: null };
  return { text: `${pct > 0 ? '↑' : '↓'} ${Math.abs(pct)}%`, positive: pct > 0 };
};

type WarehouseSubTab = 'overview' | 'management';

const WarehouseManagementWithSubTabs: React.FC = () => {
  const [subTab, setSubTab] = useState<WarehouseSubTab>('overview');
  const { id: urlWarehouseId, open: openWarehouse, close: closeWarehouse, syncingRef } = useUrlDetailId('warehouseId');
  const [pickedWarehouseId, setPickedWarehouseId] = useState<string | undefined>(urlWarehouseId ?? undefined);
  const { data: warehousesData } = useWarehouses();
  // Memoized: the deep-link effect below depends on this array, and a bare `?? []`
  // would hand it a fresh reference on every render while the query is loading.
  const warehouses = useMemo(
    () => (warehousesData as WarehouseType[] | undefined) ?? [],
    [warehousesData],
  );

  // Restore from URL on mount (?warehouseId=).
  // The param may carry a cuid (what the UI writes) or a `maKho` (what people
  // paste, e.g. ?warehouseId=KHOHH). Resolve either, rewrite the URL to the cuid
  // so every consumer downstream sees one canonical form, and drop the param when
  // it matches no warehouse — a dead param otherwise survives forever and
  // re-selects a stale warehouse the next time this tab is opened.
  useEffect(() => {
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }
    // Empty list = not loaded yet, not "no match"; leave the param alone.
    if (!urlWarehouseId || warehouses.length === 0) return;
    const resolved = resolveWarehouseParam(warehouses, urlWarehouseId);
    if (!resolved.warehouse || !resolved.canonicalId) {
      closeWarehouse();
      return;
    }
    if (resolved.needsNormalize) openWarehouse(resolved.canonicalId, { replace: true });
    setPickedWarehouseId(resolved.canonicalId);
    // open/close depend on searchParams, so listing them here would re-run this
    // effect on the very URL write it performs. syncingRef is a stable ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlWarehouseId, warehouses]);

  const handleSelectWarehouse = (id: string) => {
    setPickedWarehouseId(id);
    openWarehouse(id);
    setSubTab('management');
  };

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        <button
          onClick={() => setSubTab('overview')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            subTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Sơ đồ tổng thể
        </button>
        <button
          onClick={() => setSubTab('management')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            subTab === 'management'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Quản lý & Bản đồ
        </button>
      </div>
      {subTab === 'overview' && (
        <FactoryOverview
          warehouses={warehouses}
          selectedWarehouseId={pickedWarehouseId ?? null}
          onSelectWarehouse={handleSelectWarehouse}
        />
      )}
      {subTab === 'management' && <WarehouseUnifiedView initialWarehouseId={pickedWarehouseId} />}
    </div>
  );
};

// Keys owned by each sub-tab — when switching sub-tab inside the same top tab,
// TAB_SCOPED_PARAMS does NOT fire, so the sub-tab setter must drop the sibling's
// keys itself. B behavior: switching plan ↔ list resets the view just left
// (filters + page + detail), so returning always starts clean.
const INBOUND_LIST_KEYS: readonly string[] = [
  'receiptId',
  'in__search', 'in_maPhieuNhap', 'in_tenNhanVien', 'in_nguoiDeNghi', 'in_boPhan', 'in_warehouseId', 'in_tinhTrang', 'in_daIn', 'in_isVoided', 'in_fromNgay', 'in_toNgay', 'in_page', 'in_sortBy', 'in_sortOrder',
];
const INBOUND_PLAN_KEYS: readonly string[] = [
  'in_plan__search', 'in_plan_trangThai', 'in_plan_warehouseId', 'in_plan_fromNgay', 'in_plan_toNgay', 'in_plan_page', 'in_plan_sortBy', 'in_plan_sortOrder',
];
const OUTBOUND_LIST_KEYS: readonly string[] = [
  'issueId',
  'out__search', 'out_maPhieuXuat', 'out_tenNhanVien', 'out_nguoiDeNghi', 'out_boPhan', 'out_warehouseId', 'out_tinhTrang', 'out_daIn', 'out_isVoided', 'out_fromNgay', 'out_toNgay', 'out_page', 'out_sortBy', 'out_sortOrder',
];
const OUTBOUND_PLAN_KEYS: readonly string[] = [
  'out_plan__search', 'out_plan_trangThai', 'out_plan_warehouseId', 'out_plan_fromNgay', 'out_plan_toNgay', 'out_plan_page', 'out_plan_sortBy', 'out_plan_sortOrder',
];

const LS_INBOUND_SUBTAB = 'warehouse:lastInboundSubTab';
const LS_OUTBOUND_SUBTAB = 'warehouse:lastOutboundSubTab';
const readLastSubTab = (key: string): 'plan' | 'list' | null => {
  try {
    const v = localStorage.getItem(key);
    return v === 'plan' || v === 'list' ? v : null;
  } catch { return null; }
};

const ProductionWarehouse = () => {
  const { value: activeTab, set: setActiveTab, searchParams, setSearchParams } = useUrlTab<TabType>('tab', (v): v is TabType => VALID_TABS.includes(v as TabType), 'supplyRequest', TAB_SCOPED_PARAMS);

  // Sub tabs for inbound/outbound — synced to URL ?inboundSubTab / ?outboundSubTab
  // Default to last visited sub-tab (remembered in localStorage) so re-entering
  // Danh sách nhập kho lands on Danh sách phiếu if that's where the user was,
  // matching the reported expected flow. Fallback to 'list' (most used).
  const inboundSubTab = (() => {
    const raw = searchParams.get('inboundSubTab');
    if (raw === 'plan' || raw === 'list') return raw;
    return readLastSubTab(LS_INBOUND_SUBTAB) ?? 'list';
  })() as 'plan' | 'list';
  const outboundSubTab = (() => {
    const raw = searchParams.get('outboundSubTab');
    if (raw === 'plan' || raw === 'list') return raw;
    return readLastSubTab(LS_OUTBOUND_SUBTAB) ?? 'list';
  })() as 'plan' | 'list';
  const setInboundSubTab = (v: 'plan' | 'list') => {
    try { localStorage.setItem(LS_INBOUND_SUBTAB, v); } catch {}
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('inboundSubTab', v);
      const drop = v === 'plan' ? INBOUND_LIST_KEYS : INBOUND_PLAN_KEYS;
      for (const k of drop) p.delete(k);
      return p;
    }, { replace: true });
  };
  const setOutboundSubTab = (v: 'plan' | 'list') => {
    try { localStorage.setItem(LS_OUTBOUND_SUBTAB, v); } catch {}
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set('outboundSubTab', v);
      const drop = v === 'plan' ? OUTBOUND_LIST_KEYS : OUTBOUND_PLAN_KEYS;
      for (const k of drop) p.delete(k);
      return p;
    }, { replace: true });
  };

  // Seed URL with the resolved sub-tab when (re-)entering inbound/outbound without that key,
  // so a following click on the sibling sub-tab mutates a URL that already reflects the
  // current view instead of racing on a stale tab value. Also guarantees deep-link
  // shareability (URL always carries inboundSubTab/outboundSubTab while inside that tab).
  const inboundSubTabRaw = searchParams.get('inboundSubTab');
  const outboundSubTabRaw = searchParams.get('outboundSubTab');
  React.useEffect(() => {
    if (activeTab === 'inbound' && inboundSubTabRaw !== 'plan' && inboundSubTabRaw !== 'list') {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        // Don't overwrite if another effect already seeded
        if (p.get('inboundSubTab') === 'plan' || p.get('inboundSubTab') === 'list') return prev;
        p.set('inboundSubTab', inboundSubTab);
        return p;
      }, { replace: true });
    }
  }, [activeTab, inboundSubTabRaw, inboundSubTab]);
  React.useEffect(() => {
    if (activeTab === 'outbound' && outboundSubTabRaw !== 'plan' && outboundSubTabRaw !== 'list') {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        if (p.get('outboundSubTab') === 'plan' || p.get('outboundSubTab') === 'list') return prev;
        p.set('outboundSubTab', outboundSubTab);
        return p;
      }, { replace: true });
    }
  }, [activeTab, outboundSubTabRaw, outboundSubTab]);

  // Overview data states — receipts/issues keep overview-specific pagination totals
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [overviewReceipts, setOverviewReceipts] = useState<any[]>([]);
  const [overviewIssues, setOverviewIssues] = useState<any[]>([]);
  const [overviewReceiptTotal, setOverviewReceiptTotal] = useState(0);
  const [overviewIssueTotal, setOverviewIssueTotal] = useState(0);
  const [overviewInboundPlanTotal, setOverviewInboundPlanTotal] = useState(0);
  const [overviewOutboundPlanTotal, setOverviewOutboundPlanTotal] = useState(0);
  const [supplyRequests, setSupplyRequests] = useState<any[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);
  // Sparkline 7d sources for Card 2 (fetched separately over last 14d to compute WoW)
  const [sparkReceipts, setSparkReceipts] = useState<any[]>([]);
  const [sparkIssues, setSparkIssues] = useState<any[]>([]);

  // Period filter — URL-backed (?warehouseMonth / ?warehouseYear) so reload, Back and
  // shared links keep the same reporting period instead of resetting to "all".
  // Absent/invalid param means "no filter", exactly like the old useState(undefined).
  const parseMonthParam = (raw: string | null): number | undefined => {
    const n = Number(raw);
    return Number.isInteger(n) && n >= 1 && n <= 12 ? n : undefined;
  };
  const parseYearParam = (raw: string | null): number | undefined => {
    const n = Number(raw);
    // wide band so a pasted/shared year is honoured rather than silently dropped
    return Number.isInteger(n) && n >= 1990 && n <= 2100 ? n : undefined;
  };

  const [filterMonth, setFilterMonthRaw] = useState<number | undefined>(
    () => parseMonthParam(searchParams.get('warehouseMonth')),
  );
  const [filterYear, setFilterYearRaw] = useState<number | undefined>(
    () => parseYearParam(searchParams.get('warehouseYear')),
  );
  // Guard so our own state→URL writes don't echo back through the URL→state effect
  const syncingPeriodRef = useRef(false);

  // state → URL. Copies the live params first so ?tab / ?warehouseDetailId survive.
  const setPeriodFilter = (patch: { month?: number | undefined; year?: number | undefined }) => {
    const nextMonth = 'month' in patch ? patch.month : filterMonth;
    const nextYear = 'year' in patch ? patch.year : filterYear;
    setFilterMonthRaw(nextMonth);
    setFilterYearRaw(nextYear);
    const params = new URLSearchParams(searchParams);
    if (nextMonth) params.set('warehouseMonth', String(nextMonth));
    else params.delete('warehouseMonth');
    if (nextYear) params.set('warehouseYear', String(nextYear));
    else params.delete('warehouseYear');
    syncingPeriodRef.current = true;
    setSearchParams(params, { replace: true });
  };

  // URL → state: back/forward, pasted links
  useEffect(() => {
    if (syncingPeriodRef.current) {
      syncingPeriodRef.current = false;
      return;
    }
    const m = parseMonthParam(searchParams.get('warehouseMonth'));
    if (m !== filterMonth) setFilterMonthRaw(m);
    const y = parseYearParam(searchParams.get('warehouseYear'));
    if (y !== filterYear) setFilterYearRaw(y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch overview data — resilient: each call independent via Promise.allSettled
  // Period filter is pushed to server (fromNgay/toNgay) so counts use pagination.total
  // instead of the first 10 rows.
  const periodRange = useMemo(() => {
    if (!filterMonth && !filterYear) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (filterMonth && filterYear) {
      const lastDay = new Date(filterYear, filterMonth, 0).getDate();
      return { fromNgay: `${filterYear}-${pad(filterMonth)}-01`, toNgay: `${filterYear}-${pad(filterMonth)}-${pad(lastDay)}` };
    }
    if (filterYear && !filterMonth) {
      return { fromNgay: `${filterYear}-01-01`, toNgay: `${filterYear}-12-31` };
    }
    return null; // month-only: keep client-side filter (cannot map to single range)
  }, [filterMonth, filterYear]);

  useEffect(() => {
    const fetchOverviewData = async () => {
      setLoadingOverview(true);
      try {
        const periodParams = periodRange ? { fromNgay: periodRange.fromNgay, toNgay: periodRange.toNgay } : {};
        const [warehouseRes, receiptRes, issueRes, supplyRes, inboundPlanRes, outboundPlanRes] = await Promise.allSettled([
          warehouseService.getAllWarehouses(),
          warehouseReceiptService.getAllWarehouseReceipts({ ...periodParams, page: 1, limit: 1 } as any),
          warehouseIssueService.getAllWarehouseIssues({ ...periodParams, page: 1, limit: 1 } as any),
          supplyRequestService.getAllSupplyRequests(1, 1000),
          inboundPlanService.getAll({ ...periodParams, page: 1, limit: 1 } as any),
          outboundPlanService.getAll({ ...periodParams, page: 1, limit: 1 } as any),
        ]);

        if (warehouseRes.status === 'fulfilled') {
          setWarehouses((warehouseRes.value as any).data?.data || (warehouseRes.value as any).data || []);
        } else {
          console.error('Error fetching warehouses:', warehouseRes.reason);
        }

        if (receiptRes.status === 'fulfilled') {
          const v: any = receiptRes.value as any;
          setOverviewReceipts(v?.data?.data ?? v?.data ?? []);
          setOverviewReceiptTotal(v?.pagination?.total ?? v?.data?.pagination?.total ?? (Array.isArray(v?.data?.data ?? v?.data) ? (v?.data?.data ?? v?.data).length : 0));
        } else {
          console.error('Error fetching receipts:', receiptRes.reason);
        }

        if (issueRes.status === 'fulfilled') {
          const v2: any = issueRes.value as any;
          setOverviewIssues(v2?.data?.data ?? v2?.data ?? []);
          setOverviewIssueTotal(v2?.pagination?.total ?? v2?.data?.pagination?.total ?? (Array.isArray(v2?.data?.data ?? v2?.data) ? (v2?.data?.data ?? v2?.data).length : 0));
        } else {
          console.error('Error fetching issues:', issueRes.reason);
        }

        if (supplyRes.status === 'fulfilled') {
          setSupplyRequests((supplyRes.value as any).data?.data || (supplyRes.value as any).data || []);
        } else {
          console.error('Error fetching supply requests:', supplyRes.reason);
        }

        const extractPlanTotal = (r: PromiseSettledResult<any>): number => {
          if (r.status !== 'fulfilled') return 0;
          const v: any = r.value as any;
          // inboundPlanService/outboundPlanService use apiClient.get -> axios response { data: T[], ... } wrapped as { data, pagination } at top level via controller
          // axios nests as v.data, controller puts { success, data, pagination }
          // so v.data may be { success, data: [...], pagination } or direct array
          const body = v?.data;
          if (body?.pagination?.total != null) return Number(body.pagination.total) || 0;
          if (v?.pagination?.total != null) return Number(v.pagination.total) || 0;
          if (Array.isArray(body?.data)) return body.data.length;
          if (Array.isArray(body)) return body.length;
          return 0;
        };
        if (inboundPlanRes.status === 'fulfilled') {
          setOverviewInboundPlanTotal(extractPlanTotal(inboundPlanRes));
        } else {
          console.error('Error fetching inbound plans:', (inboundPlanRes as PromiseRejectedResult).reason);
          setOverviewInboundPlanTotal(0);
        }
        if (outboundPlanRes.status === 'fulfilled') {
          setOverviewOutboundPlanTotal(extractPlanTotal(outboundPlanRes));
        } else {
          console.error('Error fetching outbound plans:', (outboundPlanRes as PromiseRejectedResult).reason);
          setOverviewOutboundPlanTotal(0);
        }
      } catch (error) {
        console.error('Error in overview fetch:', error);
      } finally {
        setLoadingOverview(false);
      }
    };
    fetchOverviewData();
  }, [periodRange]);

  // Sparkline 7d: fetch last 14d receipts/issues (page 1 limit 100) for client-side bucketing
  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const end = new Date();
    const start14 = new Date(); start14.setDate(end.getDate() - 13);
    const fromNgay = toStr(start14);
    const toNgay = toStr(end);
    let cancelled = false;
    (async () => {
      try {
        const [rRes, iRes] = await Promise.allSettled([
          warehouseReceiptService.getAllWarehouseReceipts({ fromNgay, toNgay, page: 1, limit: 100 } as any),
          warehouseIssueService.getAllWarehouseIssues({ fromNgay, toNgay, page: 1, limit: 100 } as any),
        ]);
        if (cancelled) return;
        if (rRes.status === 'fulfilled') {
          const v: any = rRes.value as any;
          const arr = v?.data?.data ?? v?.data ?? [];
          setSparkReceipts(Array.isArray(arr) ? arr : []);
        }
        if (iRes.status === 'fulfilled') {
          const v: any = iRes.value as any;
          const arr = v?.data?.data ?? v?.data ?? [];
          setSparkIssues(Array.isArray(arr) ? arr : []);
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Calculate overview stats
  const totalWarehouses = warehouses.length;
  const emptyLots = warehouses.reduce((acc, w) => {
    if (!w.lots) return acc;
    return acc + w.lots.filter(lot => !lot.lotProducts || lot.lotProducts.length === 0).length;
  }, 0);

  // Distinct in-stock item count: lotProduct rows with soLuong > 0
  const inStockItemCount = warehouses.reduce((acc, w) => {
    if (!w.lots) return acc;
    return acc + w.lots.reduce((lotAcc, lot) => {
      if (!lot.lotProducts) return lotAcc;
      return lotAcc + lot.lotProducts.filter((lp: any) => lp.soLuong > 0).length;
    }, 0);
  }, 0);

  // Total inventory value: sum of (soLuong * giaThanh) across all lotProducts
  const totalInventoryValue = warehouses.reduce((acc, w) => {
    if (!w.lots) return acc;
    return acc + w.lots.reduce((lotAcc, lot) => {
      if (!lot.lotProducts) return lotAcc;
      return lotAcc + lot.lotProducts.reduce((lpAcc: number, lp: any) => {
        return lpAcc + ((lp.soLuong || 0) * (lp.giaThanh || 0));
      }, 0);
    }, 0);
  }, 0);

  const fmtVND = (n: number) => new Intl.NumberFormat('vi-VN').format(Math.round(n)) + ' đ';
  const formattedInventoryValue = fmtVND(totalInventoryValue);

  const classifyLoai = (raw?: string | null): 'thanhPham' | 'phuLieu' | 'nguyenLieu' | null => {
    if (!raw) return null;
    const s = raw.toLowerCase().trim();
    // DB thực tế: "Trái cây sấy" / "Rau củ sấy" / "Hạt dinh dưỡng" = thành phẩm; "Nguyên liệu thô" = nguyên liệu; "Phụ liệu"/"Vật tư"/"Bao bì" = phụ liệu
    if (s.includes('nguyên liệu') || s.includes('nguyen lieu')) return 'nguyenLieu';
    if (s.includes('phụ liệu') || s.includes('phu lieu') || s.includes('vật tư') || s.includes('vat tu') || s.includes('bao bì') || s.includes('bao bi')) return 'phuLieu';
    if (s.includes('trái cây') || s.includes('trai cay') || s.includes('rau củ') || s.includes('rau cu') || s.includes('hạt') || s.includes('hat ') || s.includes('thành phẩm') || s.includes('thanh pham') || s.includes(' sấy') || s.includes(' say')) return 'thanhPham';
    // Fallback: sản phẩm có loaiSanPham nhưng không khớp pattern nào → coi là thành phẩm (sấy = thành phẩm trong nhà máy này)
    return 'thanhPham';
  };

  const inventoryValueByLoai = useMemo(() => {
    let thanhPham = 0;
    let phuLieu = 0;
    let nguyenLieu = 0;
    for (const w of warehouses) {
      if (!w.lots) continue;
      for (const lot of w.lots as any[]) {
        if (!lot.lotProducts) continue;
        for (const lp of lot.lotProducts as any[]) {
          const v = (lp.soLuong || 0) * (lp.giaThanh || 0);
          if (!v) continue;
          const cat = classifyLoai(lp.internationalProduct?.loaiSanPham);
          if (cat === 'thanhPham') thanhPham += v;
          else if (cat === 'phuLieu') phuLieu += v;
          else if (cat === 'nguyenLieu') nguyenLieu += v;
        }
      }
    }
    return { thanhPham, phuLieu, nguyenLieu };
  }, [warehouses]);

  // SKU counts for Card 4 KPI phụ — không thêm fetch
  const inventorySkuCounts = useMemo(() => {
    let valuedSku = 0;
    let totalSku = 0;
    for (const w of warehouses) {
      if (!w.lots) continue;
      for (const lot of w.lots as any[]) {
        if (!lot.lotProducts) continue;
        for (const lp of lot.lotProducts as any[]) {
          totalSku += 1;
          if ((lp.soLuong || 0) > 0 && (lp.giaThanh || 0) > 0) valuedSku += 1;
        }
      }
    }
    return { valuedSku, totalSku, avgValue: totalSku ? totalInventoryValue / totalSku : 0 };
  }, [warehouses, totalInventoryValue]);

  // Cards use overview totals from server pagination when period maps to a server range;
  // for month-only (no server range) keep client filter on the single-page sample.
  const isMonthOnlyCards = !!filterMonth && !filterYear;
  const filteredOverviewReceipts = isMonthOnlyCards ? overviewReceipts.filter((r: any) => (new Date(r.ngayNhap || r.createdAt).getMonth() + 1) === filterMonth) : overviewReceipts;
  const filteredOverviewIssues = isMonthOnlyCards ? overviewIssues.filter((r: any) => (new Date(r.ngayXuat || r.createdAt).getMonth() + 1) === filterMonth) : overviewIssues;
  const totalReceipts = isMonthOnlyCards ? filteredOverviewReceipts.length : overviewReceiptTotal;
  const totalIssues = isMonthOnlyCards ? filteredOverviewIssues.length : overviewIssueTotal;


  const totalSupplyRequests = supplyRequests.length;

  // Funnel groups for supply requests (not period-scoped)
  // Ảnh spec: 3 bucket hiển thị — Chờ xử lý / Đang mua / Đã cung cấp.
  // Data thật có 4 bucket (pending / awaitingReplenishment / inTransit / fulfilled).
  // Chọn gộp: Chờ xử lý (hiển thị) = pending + awaitingReplenishment, giữ 4 field nội bộ để không mất data.
  // overdue: đếm YCC chưa fulfilled mà quá hạn = hanXuLy || ngayDuKien || (ngayYeuCau/createdAt + 7 ngày).
  const supplyFunnel = useMemo(() => {
    const pendingStatuses = new Set(['Chờ xử lý', 'Chưa cung cấp', 'Đã duyệt mua', 'Chờ duyệt', 'Đã duyệt']);
    const awaitingReplenishmentStatuses = new Set(['Chờ bổ sung']);
    const inTransitStatuses = new Set(['Đã mua hàng']);
    const fulfilledStatuses = new Set(['Đã cung cấp', 'Đã cấp đủ', 'Đã cấp một phần']);

    let pending = 0;
    let awaitingReplenishment = 0;
    let inTransit = 0;
    let fulfilled = 0;
    let highPriorityPending = 0;
    let overdue = 0;

    const now = Date.now();
    supplyRequests.forEach((r) => {
      const status = r.trangThai || '';
      const isFulfilled = fulfilledStatuses.has(status);
      if (pendingStatuses.has(status)) {
        pending++;
        if (r.mucDoUuTien === 'Cao') highPriorityPending++;
      } else if (awaitingReplenishmentStatuses.has(status)) {
        awaitingReplenishment++;
        if (r.mucDoUuTien === 'Cao') highPriorityPending++;
      } else if (inTransitStatuses.has(status)) {
        inTransit++;
        if (r.mucDoUuTien === 'Cao') highPriorityPending++;
      } else if (isFulfilled) {
        fulfilled++;
      }
      // Unknown statuses are silently skipped for bucket, but still checked for overdue if not fulfilled

      // Quá thời hạn: chỉ tính khi chưa fulfilled
      if (!isFulfilled) {
        // Field hạn thật trong schema SupplyRequest không có hanXuLy/ngayDuKien;
        // thử đọc hanXuLy || ngayDuKien || hanXuLy tuỳ data, fallback createdAt/ngayYeuCau +7 ngày
        const rawDeadline = (r as any).hanXuLy || (r as any).ngayDuKien || (r as any).hanXuLy;
        let deadlineMs: number | null = null;
        if (rawDeadline) {
          const d = new Date(rawDeadline).getTime();
          if (!Number.isNaN(d)) deadlineMs = d;
        } else {
          const baseRaw = (r as any).ngayYeuCau || r.createdAt;
          const base = baseRaw ? new Date(baseRaw).getTime() : NaN;
          if (!Number.isNaN(base)) deadlineMs = base + 7 * 24 * 60 * 60 * 1000;
        }
        if (deadlineMs !== null && deadlineMs < now) overdue++;
      }
    });

    const pendingCombined = pending + awaitingReplenishment;
    return { pending, awaitingReplenishment, pendingCombined, inTransit, fulfilled, highPriorityPending, overdue };
  }, [supplyRequests]);

  // Low-stock warning items per warehouse — top 5 with lowest qty (0 < qty <= 10)
  const LOW_STOCK_THRESHOLD = 10;
  const lowStockItems = useMemo(() => {
    const stockMap: Record<string, { warehouseId: string; warehouseName: string; name: string; qty: number; unit: string; maSanPham: string; productId: string }> = {};

    warehouses.forEach((w) => {
      if (!w.lots) return;
      w.lots.forEach((lot: any) => {
        if (!lot.lotProducts) return;
        lot.lotProducts.forEach((lp: any) => {
          const name = lp.internationalProduct?.tenSanPham;
          const qty = lp.soLuong || 0;
          const unit = lp.donViTinh || '';
          if (!name || qty <= 0) return;
          const maSanPham: string = lp.internationalProduct?.maSanPham || lp.maSanPham || '';
          const productId: string = lp.internationalProduct?.id || lp.internationalProductId || lp.productId || '';
          const key = `${w.id}|||${name}|||${unit}`;
          if (!stockMap[key]) {
            stockMap[key] = { warehouseId: w.id, warehouseName: w.tenKho, name, qty: 0, unit, maSanPham, productId };
          }
          stockMap[key].qty += qty;
          // keep first non-empty identifiers if initial row lacked them
          if (!stockMap[key].maSanPham && maSanPham) stockMap[key].maSanPham = maSanPham;
          if (!stockMap[key].productId && productId) stockMap[key].productId = productId;
        });
      });
    });

    return Object.values(stockMap)
      .filter((item) => item.qty > 0 && item.qty <= LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.qty - b.qty)
      .slice(0, 5);
  }, [warehouses]);

  const goToInventoryProduct = (item: { maSanPham?: string; productId?: string }) => {
    const key = (item.maSanPham && String(item.maSanPham).trim()) || (item.productId && String(item.productId).trim()) || '';
    if (!key) { goToTab('inventory'); return; }
    goToTab('inventory', { inventoryScrollTo: key });
  };

  // State for modals — URL-backed so reload / back button / shared link
  // reopens the same record instead of losing it.
  const { id: urlDetailId, open: pushDetailId, close: popDetailId, syncingRef } = useUrlDetailId('warehouseDetailId');
  void pushDetailId;
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Deep-link reader: resolve ?warehouseDetailId= against the overview data this page
  // already fetches on mount (no extra round-trip), then open the modal.
  useEffect(() => {
    // Skip the echo from our own URL write when the modal closes.
    if (syncingRef.current) {
      syncingRef.current = false;
      return;
    }
    if (!urlDetailId) return;
    const match =
      warehouses.find((w) => w?.id === urlDetailId) ??
      (overviewReceipts as any[]).find((r) => r?.id === urlDetailId) ??
      (overviewIssues as any[]).find((i) => i?.id === urlDetailId) ??
      (supplyRequests as any[]).find((s) => s?.id === urlDetailId);
    if (match) {
      setSelectedItem(match);
      setIsDetailModalOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlDetailId, warehouses, overviewReceipts, overviewIssues, supplyRequests]);

  const closeDetailModal = () => {
    popDetailId();
    setIsDetailModalOpen(false);
    setSelectedItem(null);
  };

  const pendingWarehouseCount = supplyRequests.filter(r => r.trangThai === 'Đã mua hàng').length;

  // Derive available years from data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    overviewReceipts.forEach((r: any) => {
      const y = new Date(r.ngayNhap || r.createdAt).getFullYear();
      if (y) years.add(y);
    });
    overviewIssues.forEach((r: any) => {
      const y = new Date(r.ngayXuat || r.createdAt).getFullYear();
      if (y) years.add(y);
    });
    // Fallback: current + last year
    const now = new Date().getFullYear();
    years.add(now);
    years.add(now - 1);
    return Array.from(years).sort((a, b) => b - a);
  }, [overviewReceipts, overviewIssues]);

  const tabs = [
    {
      id: 'supplyRequest',
      name: 'Danh sách yêu cầu cung cấp',
      icon: <FileText className="w-4 h-4" />,
      badge: pendingWarehouseCount > 0 ? pendingWarehouseCount : null,
    },
    { id: 'inventory', name: 'Danh sách tồn kho', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'inbound', name: 'Danh sách nhập kho', icon: <ArrowDown className="w-4 h-4" /> },
    { id: 'outbound', name: 'Danh sách xuất kho', icon: <ArrowUp className="w-4 h-4" /> },
    { id: 'products', name: 'Danh sách hàng hóa', icon: <Package className="w-4 h-4" /> },
    { id: 'warehouseManagement', name: 'Danh sách kho', icon: <Warehouse className="w-4 h-4" /> }
  ];

  const tabStripRef = useRef<HTMLDivElement>(null);

  // `extraParams` forwards to useUrlTab.set so a caller can switch tab AND seed a
  // detail param in ONE URL write — two separate writes race on the same stale
  // searchParams snapshot and the second silently reverts the first.
  const goToTab = (tab: TabType, extraParams?: Record<string, string | null>) => {
    setActiveTab(tab, extraParams);
    requestAnimationFrame(() => tabStripRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const clickableProps = (tab: TabType, extraParams?: Record<string, string | null>) => ({
    role: 'button' as const,
    tabIndex: 0,
    onClick: () => goToTab(tab, extraParams),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        goToTab(tab, extraParams);
      }
    },
  });

  // Helpers for card drill-down — keep param names centralised so TAB_SCOPED_PARAMS + tab hook stay in sync
  const goSupply = (params?: Record<string, string | null>) => goToTab('supplyRequest', params);
  const goInbound = (subTab: 'plan' | 'list') => goToTab('inbound', { inboundSubTab: subTab });
  const goOutbound = (subTab: 'plan' | 'list') => goToTab('outbound', { outboundSubTab: subTab });
  const tileKeyDown =
    (fn: () => void) =>
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fn();
      }
    };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Quản lý kho"
        description="Quản lý kho, nhập xuất kho và yêu cầu cung cấp"
        icon={<Warehouse className="w-5 h-5 text-blue-600" />}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={filterMonth ?? ''}
              onChange={(e) => setPeriodFilter({ month: e.target.value ? Number(e.target.value) : undefined })}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả tháng</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
            <select
              value={filterYear ?? ''}
              onChange={(e) => setPeriodFilter({ year: e.target.value ? Number(e.target.value) : undefined })}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả năm</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        }
      />

        {/* Overview Cards — thứ tự khớp ảnh: 1) YCC | 2) Nhập xuất | 3) Tổng quan tồn kho | 4) Hàng hóa còn tồn */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
          {/* Card 1: Yêu cầu cung cấp — funnel 3 bucket + overdue (ảnh: Tổng 29, 3 ô, dải ưu tiên cao, dòng quá hạn) */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4 hover:border-gray-300 hover:shadow-md transition-all duration-200 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2.5 shrink-0">
              <h3 className="text-[15px] font-bold flex items-center text-gray-800">
                <ClipboardList className="w-5 h-5 mr-2 text-purple-600" />
                Yêu cầu cung cấp
              </h3>
            </div>
            <div className="flex-1 space-y-2.5">
              {(() => {
                const end = new Date();
                const curr7 = bucketByDay(supplyRequests as any[], 'ngayYeuCau', 7, end);
                const prevEnd = new Date(end); prevEnd.setDate(end.getDate() - 7);
                const prev7 = bucketByDay(supplyRequests as any[], 'ngayYeuCau', 7, prevEnd);
                const wow = wowLabel(curr7, prev7);
                const wowColor = wow.positive === null ? 'text-gray-400 bg-gray-50 border-gray-200' : wow.positive ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200';
                const hasAny = curr7.some((v) => v > 0) || prev7.some((v) => v > 0);
                return (
                  <>
                    <div role="button" tabIndex={0} onClick={() => goSupply({ supplyStatus: null, supplyPriority: null, supplyOverdue: null })} onKeyDown={tileKeyDown(() => goSupply({ supplyStatus: null, supplyPriority: null, supplyOverdue: null }))} className="bg-purple-50 rounded-lg p-3 border border-purple-300 cursor-pointer transition-all duration-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-700">Tổng yêu cầu</span>
                        <span className="text-2xl font-bold text-purple-600">{loadingOverview ? '...' : totalSupplyRequests}</span>
                      </div>
                      {!loadingOverview && (
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-purple-200">
                          <MiniSparkline data={curr7} width={64} height={18} color="#9333ea" />
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${wowColor}`}>{hasAny ? wow.text : '—'}</span>
                          <span className="text-[10px] text-gray-400 ml-auto">7 ngày · vs tuần trước</span>
                        </div>
                      )}
                      {!loadingOverview && !hasAny && (
                        <div className="text-[10px] text-gray-400 mt-1">Chưa có dữ liệu kỳ này</div>
                      )}
                    </div>
              {/* 3 ô như ảnh: Chờ xử lý (= pending + awaitingReplenishment) / Đang mua (= inTransit) / Đã cung cấp (= fulfilled) */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <div role="button" tabIndex={0} onClick={() => goSupply({ supplyStatus: 'pending', supplyPriority: null, supplyOverdue: null })} onKeyDown={tileKeyDown(() => goSupply({ supplyStatus: 'pending', supplyPriority: null, supplyOverdue: null }))} title={`Chờ xử lý (${supplyFunnel.pending} + ${supplyFunnel.awaitingReplenishment} chờ bổ sung)`} className="bg-orange-50 rounded-lg p-1.5 sm:p-2 text-center border border-orange-300 cursor-pointer transition-all duration-200">
                  <div className="text-lg sm:text-xl font-bold text-orange-600">{loadingOverview ? '...' : supplyFunnel.pendingCombined}</div>
                  <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 truncate">Chờ xử lý</div>
                </div>
                <div role="button" tabIndex={0} onClick={() => goSupply({ supplyStatus: 'inTransit', supplyPriority: null, supplyOverdue: null })} onKeyDown={tileKeyDown(() => goSupply({ supplyStatus: 'inTransit', supplyPriority: null, supplyOverdue: null }))} title="Đang mua" className="bg-amber-50 rounded-lg p-1.5 sm:p-2 text-center border border-amber-300 cursor-pointer transition-all duration-200">
                  <div className="text-lg sm:text-xl font-bold text-amber-600">{loadingOverview ? '...' : supplyFunnel.inTransit}</div>
                  <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 truncate">Đang mua</div>
                </div>
                <div role="button" tabIndex={0} onClick={() => goSupply({ supplyStatus: 'fulfilled', supplyPriority: null, supplyOverdue: null })} onKeyDown={tileKeyDown(() => goSupply({ supplyStatus: 'fulfilled', supplyPriority: null, supplyOverdue: null }))} title="Đã cung cấp" className="bg-green-50 rounded-lg p-1.5 sm:p-2 text-center border border-green-300 cursor-pointer transition-all duration-200">
                  <div className="text-lg sm:text-xl font-bold text-green-600">{loadingOverview ? '...' : supplyFunnel.fulfilled}</div>
                  <div className="text-[10px] sm:text-xs text-gray-600 mt-0.5 truncate">Đã cung cấp</div>
                </div>
              </div>
              {!loadingOverview && supplyFunnel.highPriorityPending > 0 ? (
                <div role="button" tabIndex={0} onClick={() => goSupply({ supplyPriority: 'Cao', supplyStatus: 'pending', supplyOverdue: null })} onKeyDown={tileKeyDown(() => goSupply({ supplyPriority: 'Cao', supplyStatus: 'pending', supplyOverdue: null }))} className="bg-red-50 rounded-lg px-3 py-2 border border-red-200 flex items-center gap-2 cursor-pointer transition-all duration-200">
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-500 text-white min-w-[18px]">
                    {supplyFunnel.highPriorityPending}
                  </span>
                  <span className="text-xs font-medium text-red-700">Ưu tiên cao đang chờ</span>
                </div>
              ) : !loadingOverview ? (
                <div className="rounded-lg px-3 py-2 border border-green-100 bg-green-50/60 flex items-center gap-2">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 border border-green-200 text-green-600 text-xs">✓</span>
                  <span className="text-xs text-gray-500">Không có YCC ưu tiên cao</span>
                </div>
              ) : null}
              {!loadingOverview && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => goSupply({ supplyOverdue: '1', supplyStatus: 'pending', supplyPriority: null })}
                  onKeyDown={tileKeyDown(() => goSupply({ supplyOverdue: '1', supplyStatus: 'pending', supplyPriority: null }))}
                  title={supplyFunnel.overdue > 0 ? 'YCC chưa cung cấp đã quá hạn (hanXuLy/ngayDuKien hoặc +7 ngày từ ngày yêu cầu)' : 'Chưa có YCC quá hạn — hạn = hanXuLy/ngayDuKien, fallback +7 ngày từ ngày yêu cầu'}
                  className={`rounded-lg px-3 py-2 border flex items-center justify-between cursor-pointer transition-all duration-200 ${supplyFunnel.overdue > 0 ? 'bg-amber-50 border-amber-300' : 'bg-gray-50 border-gray-200'}`}
                >
                  <span className={`text-xs font-medium ${supplyFunnel.overdue > 0 ? 'text-amber-700' : 'text-gray-500'}`}>Quá thời hạn</span>
                  <span className={`text-sm font-bold ${supplyFunnel.overdue > 0 ? 'text-red-600' : 'text-gray-600'}`}>{supplyFunnel.overdue}</span>
                </div>
              )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Card 2: Tổng quan nhập xuất kho — Kế hoạch vs Thực tế + Lệch (ảnh spec) */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4 hover:border-gray-300 hover:shadow-md transition-all duration-200 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2.5 shrink-0">
              <h3 className="text-[15px] font-bold flex items-center text-gray-800">
                <ArrowDown className="w-5 h-5 mr-2 text-green-600" />
                Tổng quan nhập xuất kho
              </h3>
            </div>
            {(() => {
              const planIn = overviewInboundPlanTotal;
              const actualIn = totalReceipts;
              const planOut = overviewOutboundPlanTotal;
              const actualOut = totalIssues;
              const noPlanIn = !loadingOverview && planIn === 0;
              const noPlanOut = !loadingOverview && planOut === 0;
              const bothNoPlan = noPlanIn && noPlanOut;
              const lechIn = actualIn - planIn;
              const lechOut = actualOut - planOut;
              // inline badge when plan exists
              const lechInBadge = !noPlanIn ? `${lechIn > 0 ? '+' : ''}${lechIn}` : null;
              const lechOutBadge = !noPlanOut ? `${lechOut > 0 ? '+' : ''}${lechOut}` : null;
              const lechInColor = lechIn === 0 ? 'bg-gray-100 text-gray-600 border-gray-200' : lechIn > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200';
              const lechOutColor = lechOut === 0 ? 'bg-gray-100 text-gray-600 border-gray-200' : lechOut > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200';
              // sparklines 7d for Card2
              const end = new Date();
              const currIn7 = bucketByDay(sparkReceipts as any[], 'ngayNhap', 7, end);
              const prevEnd = new Date(end); prevEnd.setDate(end.getDate() - 7);
              const prevIn7 = bucketByDay(sparkReceipts as any[], 'ngayNhap', 7, prevEnd);
              const currOut7 = bucketByDay(sparkIssues as any[], 'ngayXuat', 7, end);
              const prevOut7 = bucketByDay(sparkIssues as any[], 'ngayXuat', 7, prevEnd);
              const wowIn = wowLabel(currIn7, prevIn7);
              const wowOut = wowLabel(currOut7, prevOut7);
              const wowInCls = wowIn.positive === null ? 'text-gray-400 bg-gray-50 border-gray-200' : wowIn.positive ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200';
              const wowOutCls = wowOut.positive === null ? 'text-gray-400 bg-gray-50 border-gray-200' : wowOut.positive ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200';
              const hasIn = currIn7.some((v) => v > 0) || prevIn7.some((v) => v > 0);
              const hasOut = currOut7.some((v) => v > 0) || prevOut7.some((v) => v > 0);
              return (
                <div className="flex-1 space-y-2.5">
                  {/* Hàng Nhập: Kế hoạch | Thực tế */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 border border-green-200">
                        <ArrowDown className="w-3 h-3 text-green-600" />
                      </span>
                      <span className="text-xs font-semibold text-green-700">Nhập kho</span>
                      {noPlanIn && <span className="text-[10px] text-gray-400 ml-1">Chưa có kế hoạch</span>}
                      {lechInBadge && <span className={`ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${lechInColor}`} title={`Lệch nhập = ${actualIn} − ${planIn}`}>Lệch {lechInBadge}</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div
                        role="button" tabIndex={0}
                        onClick={() => goInbound('plan')} onKeyDown={tileKeyDown(() => goInbound('plan'))}
                        title="Nhập — Kế hoạch (InboundPlan trong kỳ)"
                        className="bg-green-50 rounded-lg p-2.5 text-center border border-green-200 cursor-pointer hover:bg-green-100 transition-colors"
                      >
                        <div className="text-[10px] font-medium text-green-700 tracking-wide uppercase">Kế hoạch</div>
                        <div className="text-xl font-bold text-green-700 leading-none mt-1">{loadingOverview ? '...' : noPlanIn ? '—' : planIn}</div>
                      </div>
                      <div
                        role="button" tabIndex={0}
                        onClick={() => goInbound('list')} onKeyDown={tileKeyDown(() => goInbound('list'))}
                        title="Nhập — Thực tế (phiếu nhập trong kỳ)"
                        className="bg-emerald-50 rounded-lg p-2.5 text-center border border-emerald-200 cursor-pointer hover:bg-emerald-100 transition-colors"
                      >
                        <div className="text-[10px] font-medium text-emerald-700 tracking-wide uppercase">Thực tế</div>
                        <div className="text-xl font-bold text-emerald-700 leading-none mt-1">{loadingOverview ? '...' : actualIn}</div>
                      </div>
                    </div>
                    {noPlanIn && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                        <MiniSparkline data={currIn7} width={64} height={18} color="#16a34a" />
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${wowInCls}`}>{hasIn ? wowIn.text + ' vs tuần trước' : 'Chưa có dữ liệu kỳ này'}</span>
                      </div>
                    )}
                    {noPlanIn && <div className="text-[10px] text-gray-400 mt-1">7 ngày gần nhất · Nhập</div>}
                  </div>
                  {/* Hàng Xuất: Kế hoạch | Thực tế */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 border border-red-200">
                        <ArrowUp className="w-3 h-3 text-red-600" />
                      </span>
                      <span className="text-xs font-semibold text-red-700">Xuất kho</span>
                      {noPlanOut && <span className="text-[10px] text-gray-400 ml-1">Chưa có kế hoạch</span>}
                      {lechOutBadge && <span className={`ml-auto inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold border ${lechOutColor}`} title={`Lệch xuất = ${actualOut} − ${planOut}`}>Lệch {lechOutBadge}</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div
                        role="button" tabIndex={0}
                        onClick={() => goOutbound('plan')} onKeyDown={tileKeyDown(() => goOutbound('plan'))}
                        title="Xuất — Kế hoạch (OutboundPlan trong kỳ)"
                        className="bg-red-50 rounded-lg p-2.5 text-center border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
                      >
                        <div className="text-[10px] font-medium text-red-700 tracking-wide uppercase">Kế hoạch</div>
                        <div className="text-xl font-bold text-red-700 leading-none mt-1">{loadingOverview ? '...' : noPlanOut ? '—' : planOut}</div>
                      </div>
                      <div
                        role="button" tabIndex={0}
                        onClick={() => goOutbound('list')} onKeyDown={tileKeyDown(() => goOutbound('list'))}
                        title="Xuất — Thực tế (phiếu xuất trong kỳ)"
                        className="bg-orange-50 rounded-lg p-2.5 text-center border border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors"
                      >
                        <div className="text-[10px] font-medium text-orange-700 tracking-wide uppercase">Thực tế</div>
                        <div className="text-xl font-bold text-red-600 leading-none mt-1">{loadingOverview ? '...' : actualOut}</div>
                      </div>
                    </div>
                    {noPlanOut && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                        <MiniSparkline data={currOut7} width={64} height={18} color="#dc2626" />
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${wowOutCls}`}>{hasOut ? wowOut.text + ' vs tuần trước' : 'Chưa có dữ liệu kỳ này'}</span>
                      </div>
                    )}
                    {noPlanOut && <div className="text-[10px] text-gray-400 mt-1">7 ngày gần nhất · Xuất</div>}
                  </div>
                  {/* Lệch rows: only when at least one plan exists */}
                  {!bothNoPlan && (
                    <div className="space-y-1.5 pt-1 border-t border-gray-100">
                      {!noPlanIn && (
                        <div
                          role="button" tabIndex={0}
                          onClick={() => goInbound('list')} onKeyDown={tileKeyDown(() => goInbound('list'))}
                          title={`Lệch nhập = Thực tế (${actualIn}) − Kế hoạch (${planIn})`}
                          className="flex items-center justify-between rounded-lg px-3 py-2 bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <span className="text-xs font-medium text-gray-600">Lệch kế hoạch nhập:</span>
                          <span className={`text-sm font-bold ${lechIn === 0 ? 'text-gray-600' : lechIn > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>{loadingOverview ? '...' : `${lechIn > 0 ? '+' : ''}${lechIn}`}</span>
                        </div>
                      )}
                      {!noPlanOut && (
                        <div
                          role="button" tabIndex={0}
                          onClick={() => goOutbound('list')} onKeyDown={tileKeyDown(() => goOutbound('list'))}
                          title={`Lệch xuất = Thực tế (${actualOut}) − Kế hoạch (${planOut})`}
                          className="flex items-center justify-between rounded-lg px-3 py-2 bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                        >
                          <span className="text-xs font-medium text-gray-600">Lệch kế hoạch xuất:</span>
                          <span className={`text-sm font-bold ${lechOut === 0 ? 'text-gray-600' : lechOut > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>{loadingOverview ? '...' : `${lechOut > 0 ? '+' : ''}${lechOut}`}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Card 3: Cảnh báo thiếu — top 5 tồn thấp (qty 0 < x <= 10), click nhảy tới kho chứa */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4 hover:border-gray-300 hover:shadow-md transition-all duration-200 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2.5 shrink-0">
              <h3 className="text-[15px] font-bold flex items-center text-gray-800">
                <AlertTriangle className="w-5 h-5 mr-2 text-amber-600" />
                Cảnh báo thiếu
              </h3>
              {!loadingOverview && lowStockItems.length > 0 && (
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white min-w-[20px]">
                  {lowStockItems.length}
                </span>
              )}
            </div>
            {loadingOverview ? (
              <div className="space-y-2">
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="rounded-lg px-3 py-2.5 border border-gray-100 bg-gray-50 animate-pulse">
                      <div className="h-3 bg-gray-200 rounded w-3/4 mb-1.5" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full animate-pulse" />
                <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-gray-100">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 animate-pulse"><div className="h-4 bg-gray-200 rounded w-8 mx-auto" /></div>
                  ))}
                </div>
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="flex-1 flex flex-col justify-between">
                <div className="flex flex-col items-center justify-center rounded-lg px-3 py-4 border border-green-200 bg-green-50 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 border border-green-200 mb-2 text-green-600">✓</span>
                  <p className="text-sm font-medium text-green-700">Tồn kho ổn định</p>
                  <p className="text-xs text-gray-500 mt-1">Không có mặt hàng tồn thấp · ngưỡng ≤ {LOW_STOCK_THRESHOLD}</p>
                </div>
                <div className="rounded-lg px-3 py-2 border border-gray-100 bg-gray-50 flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-500">Tỷ lệ thiếu</span>
                  <span className="text-xs font-semibold text-green-600">0 / {Math.max(inStockItemCount, 1)} SKU · 0%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mt-1.5">
                  <div className="h-full bg-green-400 rounded-full" style={{ width: '0%' }} />
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-gray-100">
                  <div {...clickableProps('warehouseManagement')} className="bg-blue-50 rounded-lg p-1.5 text-center border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
                    <div className="text-sm font-bold text-blue-600">{totalWarehouses}</div>
                    <div className="text-[10px] text-gray-600">Kho</div>
                  </div>
                  <div {...clickableProps('warehouseManagement')} className="bg-gray-50 rounded-lg p-1.5 text-center border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="text-sm font-bold text-gray-600">{emptyLots}</div>
                    <div className="text-[10px] text-gray-600">Lô trống</div>
                  </div>
                  <div {...clickableProps('warehouseManagement')} className="bg-green-50 rounded-lg p-1.5 text-center border border-green-200 cursor-pointer hover:bg-green-100 transition-colors">
                    <div className="text-sm font-bold text-green-600">{inStockItemCount}</div>
                    <div className="text-[10px] text-gray-600">Có hàng</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  {lowStockItems.map((item) => (
                    <div
                      key={`${item.warehouseId}-${item.name}-${item.unit}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => goToInventoryProduct(item)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToInventoryProduct(item); } }}
                      title={`${item.name} — ${item.warehouseName} · Nhấn để xem trong Danh sách tồn kho`}
                      className="rounded-lg px-2.5 py-1.5 border border-amber-200 bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                          <p className="text-[11px] text-gray-500 truncate">{item.warehouseName}{item.unit ? ` · ${item.unit}` : ''}</p>
                        </div>
                        <span className="shrink-0 text-sm font-bold text-amber-700">{item.qty}</span>
                      </div>
                    </div>
                  ))}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => goToTab('inventory')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToTab('inventory'); } }}
                    className="rounded-lg px-2.5 py-1.5 border border-gray-200 bg-gray-50 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-[11px] font-medium text-gray-600">Xem tất cả tồn kho →</span>
                  </div>
                </div>
                {(() => {
                  const denom = Math.max(inStockItemCount, 1);
                  const pct = Math.min(100, Math.round((lowStockItems.length / denom) * 100));
                  return (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-gray-500">Tỷ lệ thiếu</span>
                        <span className="font-semibold text-amber-700">{lowStockItems.length} / {inStockItemCount} SKU · {pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })()}
                <div className="grid grid-cols-3 gap-1.5 mt-3 pt-3 border-t border-gray-100">
                  <div {...clickableProps('warehouseManagement')} className="bg-blue-50 rounded-lg p-1.5 text-center border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors">
                    <div className="text-sm font-bold text-blue-600">{totalWarehouses}</div>
                    <div className="text-[10px] text-gray-600">Kho</div>
                  </div>
                  <div {...clickableProps('warehouseManagement')} className="bg-gray-50 rounded-lg p-1.5 text-center border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="text-sm font-bold text-gray-600">{emptyLots}</div>
                    <div className="text-[10px] text-gray-600">Lô trống</div>
                  </div>
                  <div {...clickableProps('warehouseManagement')} className="bg-green-50 rounded-lg p-1.5 text-center border border-green-200 cursor-pointer hover:bg-green-100 transition-colors">
                    <div className="text-sm font-bold text-green-600">{inStockItemCount}</div>
                    <div className="text-[10px] text-gray-600">Có hàng</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 4: Giá trị tồn kho — breakdown theo loaiSanPham */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 sm:p-4 hover:border-gray-300 hover:shadow-md transition-all duration-200 flex flex-col h-full">
            <div className="flex items-center justify-between mb-2.5 shrink-0">
              <h3 className="text-[15px] font-bold flex items-center text-gray-800">
                <Package className="w-5 h-5 mr-2 text-emerald-600" />
                Giá trị tồn kho
              </h3>
            </div>
            {loadingOverview ? (
              <div className="space-y-2">
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-lg px-3 py-2.5 border border-gray-100 bg-gray-50 animate-pulse">
                      <div className="h-3 bg-gray-200 rounded w-2/3 mb-1.5" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full animate-pulse" />
                <div className="h-8 bg-gray-50 rounded-lg border border-gray-100 animate-pulse" />
              </div>
            ) : (
              <div className="space-y-2">
                <div role="button" tabIndex={0} onClick={() => goToTab('inventory', { loaiSanPham: null })} onKeyDown={tileKeyDown(() => goToTab('inventory', { loaiSanPham: null }))} className="flex justify-between items-center rounded-lg px-3 py-2.5 border border-blue-200 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors">
                  <span className="text-xs font-medium text-gray-700">Tổng giá trị tồn</span>
                  <span className="text-sm font-bold text-blue-700">{formattedInventoryValue}</span>
                </div>
                {(() => {
                  const sumByLoai = inventoryValueByLoai.thanhPham + inventoryValueByLoai.phuLieu + inventoryValueByLoai.nguyenLieu;
                  const hasBreakdown = sumByLoai > 0;
                  if (!hasBreakdown) {
                    return (
                      <div className="rounded-lg px-3 py-3 border border-dashed border-gray-300 bg-gray-50 text-center">
                        <p className="text-xs font-medium text-gray-600">Chưa phân loại theo loaiSanPham</p>
                        <p className="text-[11px] text-gray-400 mt-1">Cập nhật loaiSanPham cho sản phẩm để xem breakdown Thành phẩm / Phụ liệu / Nguyên liệu</p>
                      </div>
                    );
                  }
                  return (
                    <>
                      <div role="button" tabIndex={0} onClick={() => goToTab('inventory')} onKeyDown={tileKeyDown(() => goToTab('inventory'))} className="flex justify-between items-center rounded-lg px-3 py-2.5 border border-indigo-200 bg-indigo-50 cursor-pointer hover:bg-indigo-100 transition-colors">
                        <span className="text-xs font-medium text-gray-700">Tồn thành phẩm</span>
                        <span className="text-sm font-bold text-indigo-700">{fmtVND(inventoryValueByLoai.thanhPham)}</span>
                      </div>
                      <div role="button" tabIndex={0} onClick={() => goToTab('inventory')} onKeyDown={tileKeyDown(() => goToTab('inventory'))} className="flex justify-between items-center rounded-lg px-3 py-2.5 border border-purple-200 bg-purple-50 cursor-pointer hover:bg-purple-100 transition-colors">
                        <span className="text-xs font-medium text-gray-700">Tồn phụ liệu</span>
                        <span className="text-sm font-bold text-purple-700">{fmtVND(inventoryValueByLoai.phuLieu)}</span>
                      </div>
                      <div role="button" tabIndex={0} onClick={() => goToTab('inventory', { loaiSanPham: 'Nguyên liệu thô' })} onKeyDown={tileKeyDown(() => goToTab('inventory', { loaiSanPham: 'Nguyên liệu thô' }))} className="flex justify-between items-center rounded-lg px-3 py-2.5 border border-emerald-200 bg-emerald-50 cursor-pointer hover:bg-emerald-100 transition-colors">
                        <span className="text-xs font-medium text-gray-700">Tồn nguyên liệu</span>
                        <span className="text-sm font-bold text-emerald-700">{fmtVND(inventoryValueByLoai.nguyenLieu)}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-100">
                        <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-gray-100">
                          <div className="bg-indigo-400" style={{ width: `${Math.round((inventoryValueByLoai.thanhPham / Math.max(1, sumByLoai)) * 100)}%` }} title="Thành phẩm" />
                          <div className="bg-purple-400" style={{ width: `${Math.round((inventoryValueByLoai.phuLieu / Math.max(1, sumByLoai)) * 100)}%` }} title="Phụ liệu" />
                          <div className="bg-emerald-400" style={{ width: `${Math.round((inventoryValueByLoai.nguyenLieu / Math.max(1, sumByLoai)) * 100)}%` }} title="Nguyên liệu" />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                          <span>Thành phẩm</span><span>Phụ liệu</span><span>Nguyên liệu</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
                <div className="rounded-lg px-3 py-2 border border-gray-100 bg-gray-50 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">SKU có giá trị</span>
                  <span className="text-xs font-semibold text-gray-700">{inventorySkuCounts.valuedSku} / {inventorySkuCounts.totalSku} SKU · TB {fmtVND(inventorySkuCounts.avgValue)}/SKU</span>
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Tabs */}
      <div ref={tabStripRef} className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
              }`}
            >
              {tab.icon}
              {tab.name}
              {tab.badge && (
                <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white min-w-[18px]">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'supplyRequest' && <SupplyRequestManagement />}
      {activeTab === 'inventory' && <InventoryOverview />}
      {activeTab === 'warehouseManagement' && <WarehouseManagementWithSubTabs />}
      {activeTab === 'products' && <InternationalProductManagement />}
      {activeTab === 'inbound' && (
        <div className="space-y-4">
          <div className="flex gap-1 border-b border-gray-200">
            <button onClick={() => setInboundSubTab('plan')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${inboundSubTab === 'plan' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Kế hoạch nhập
            </button>
            <button onClick={() => setInboundSubTab('list')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${inboundSubTab === 'list' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Danh sách phiếu
            </button>
          </div>
          {inboundSubTab === 'plan' ? <InboundPlanTab /> : <WarehouseReceiptTab month={filterMonth} year={filterYear} />}
        </div>
      )}
      {activeTab === 'outbound' && (
        <div className="space-y-4">
          <div className="flex gap-1 border-b border-gray-200">
            <button onClick={() => setOutboundSubTab('plan')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${outboundSubTab === 'plan' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Kế hoạch xuất
            </button>
            <button onClick={() => setOutboundSubTab('list')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${outboundSubTab === 'list' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              Danh sách phiếu
            </button>
          </div>
          {outboundSubTab === 'plan' ? <OutboundPlanTab /> : <WarehouseIssueTab month={filterMonth} year={filterYear} />}
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-sm max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Chi tiết thông tin</h2>
                  <button
                    onClick={closeDetailModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(selectedItem).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </label>
                      <p className="text-sm text-gray-900">{String(value)}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-4 mt-6">
                  <button
                    onClick={closeDetailModal}
                    className="px-4 py-2 border border-gray-200 rounded-md text-gray-700"
                  >
                    Đóng
                  </button>
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                    Chỉnh sửa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default ProductionWarehouse;
