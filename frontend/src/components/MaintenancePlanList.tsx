import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import maintenancePlanService from '../services/maintenancePlanService';
import toast from 'react-hot-toast';
import { Plus, Eye, Pencil, Trash2, Check, ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react';
import { useMaintenancePlans, useToggleMonth, useDeleteMaintenancePlan, useUpdateLogNote, useSyncDetails } from '../hooks/useMaintenancePlans';
import { useMachineSystems } from '../hooks/useMachineSystemDetails';
import MaintenancePlanForm from './MaintenancePlanForm';
import MaintenanceLogModal from './MaintenanceLogModal';
import { MaintenancePlan, MaintenancePlanItem, MaintenancePlanItemLog } from '../services/maintenancePlanService';
import { StatusBadge, type BadgeTone } from './shared/StatusBadge';
import ConfirmDialog from './common/ConfirmDialog';
import { ErrorState } from '../design-system/States';
import { useAuth } from '../contexts/AuthContext';
import { canDeleteTechnical } from '../utils/permissions';

// Shared table styles (keep in sync with the technical tabs table contract)
const TH_CLASS = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap';
const STICKY_LEFT_SHADOW = 'shadow-[1px_0_0_0_rgb(229_231_235)]';
const CONTROL_CLASS = 'h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
const ICON_BTN_CLASS = 'inline-flex items-center justify-center h-7 w-7 rounded text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
const PAGER_BTN_CLASS = 'inline-flex items-center gap-1 h-8 px-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

/** Same colors as before: in-progress green, completed blue, anything else yellow */
const PLAN_STATUS_TONE: Record<string, BadgeTone> = {
  'Đang thực hiện': 'green',
  'Hoàn thành': 'blue',
};

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const FREQUENCY_LABELS: Record<string, string> = {
  HANG_NGAY: 'Hàng ngày',
  HANG_TUAN: 'Hàng tuần',
  HANG_THANG: 'Hàng tháng',
  HAI_THANG: '2 tháng/lần',
  BA_THANG: '3 tháng/lần',
  SAU_THANG: '6 tháng/lần',
  HANG_NAM: 'Hàng năm',
  KHONG_CO_DINH: 'Không cố định',
};
const TEAM_LABELS: Record<string, string> = {
  CO_KHI: 'Cơ khí',
  CO_DIEN: 'Cơ điện',
  DIEN: 'Điện',
  TONG_HOP: 'Tổng hợp',
};

/** Number of occurrences per applicable month for each frequency */
const FREQUENCY_TIMES: Record<string, number> = {
  HANG_NGAY: 22,
  HANG_TUAN: 4,
  HANG_THANG: 1,
  HAI_THANG: 1,
  BA_THANG: 1,
  SAU_THANG: 1,
  HANG_NAM: 1,
  KHONG_CO_DINH: 0,
};

/** Which months are applicable for each frequency, starting from thangBatDau */
function getApplicableMonths(frequency: string, thangBatDau: number = 1): number[] {
  switch (frequency) {
    case 'HAI_THANG': {
      const months: number[] = [];
      for (let m = thangBatDau; m <= 12; m += 2) months.push(m);
      return months;
    }
    case 'BA_THANG': {
      const months: number[] = [];
      for (let m = thangBatDau; m <= 12; m += 3) months.push(m);
      return months;
    }
    case 'SAU_THANG': {
      const months: number[] = [];
      for (let m = thangBatDau; m <= 12; m += 6) months.push(m);
      return months;
    }
    case 'HANG_NAM': return [thangBatDau];
    case 'KHONG_CO_DINH': return MONTHS;
    default: return MONTHS; // HANG_NGAY, HANG_TUAN, HANG_THANG
  }
}

/** Get times per month for a frequency */
function getTimesPerMonth(frequency: string): number {
  return FREQUENCY_TIMES[frequency] ?? 1;
}

/** Calculate plan progress: completed / total applicable occurrences */
function calculatePlanProgress(items: MaintenancePlanItem[]): { completed: number; total: number } {
  let total = 0;
  let completed = 0;
  for (const item of items) {
    // KHONG_CO_DINH items do not count toward plan progress
    if (item.tanSuat === 'KHONG_CO_DINH') continue;
    const applicableMonths = getApplicableMonths(item.tanSuat, item.thangBatDau ?? 1);
    const timesPerMonth = getTimesPerMonth(item.tanSuat);
    total += applicableMonths.length * timesPerMonth;
    completed += (item.logs ?? []).filter((l) => l.hoanThanh).length;
  }
  return { completed, total };
}

/** Export plan as CSV download */
function exportPlanCSV(plan: MaintenancePlan) {
  const items = plan.items ?? [];
  const headers = ['Thiết bị', 'Nội dung BD', 'Tần suất', 'Tổ TH', ...MONTHS.map((m) => `T${m}`)];
  const rows = items.map((item) => {
    const applicableMonths = getApplicableMonths(item.tanSuat, item.thangBatDau ?? 1);
    const timesPerMonth = getTimesPerMonth(item.tanSuat);
    const logs = item.logs ?? [];
    const monthCells = MONTHS.map((m) => {
      if (!applicableMonths.includes(m)) return '';
      const monthLogs = logs.filter((l) => l.thang === m);
      const doneCount = monthLogs.filter((l) => l.hoanThanh).length;
      if (doneCount === timesPerMonth) return '✓';
      if (doneCount > 0) return `${doneCount}/${timesPerMonth}`;
      return '0/' + timesPerMonth;
    });
    return [
      item.machineSystemDetail?.tenChiTiet ?? '',
      item.noiDung,
      FREQUENCY_LABELS[item.tanSuat] ?? item.tanSuat,
      TEAM_LABELS[item.toThucHien] ?? item.toThucHien,
      ...monthCells,
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const bom = '﻿';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${plan.maKeHoach}_bao-duong.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// Namespaced URL params: plans and records share the same page, so `page` / `q` must not collide.
const PAGE_PARAM = 'planPage';
const Q_PARAM = 'planQ';
const PAGE_SIZE = 5;

/** Current month (1-12), refreshed when the tab regains focus so a long-open tab never shows a stale month. */
const useCurrentMonth = (): number => {
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  useEffect(() => {
    const refresh = () => setMonth(new Date().getMonth() + 1);
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  return month;
};

type ModalMode = 'create' | 'view' | 'edit' | null;

interface LogModalState {
  planId: string;
  itemId: string;
  month: number;
  timesPerMonth: number;
  noiDung: string;
  tenThietBi: string;
  nguoiLap: string;
}

interface MaintenancePlanListProps {
  lockedMachineSystemId?: string;
}

const MaintenancePlanList = ({ lockedMachineSystemId }: MaintenancePlanListProps = {}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const syncingRef = useRef(false);

  const getParam = (k: string) => searchParams.get(k);

  const { user } = useAuth();
  const canDelete = canDeleteTechnical(user);
  const currentMonth = useCurrentMonth();
  const [pendingDelete, setPendingDelete] = useState<MaintenancePlan | null>(null);

  const initPage = Math.max(1, Number(getParam(PAGE_PARAM) ?? '1') || 1);
  const initNam = Number(getParam('nam') ?? '') || new Date().getFullYear();
  const initQ = getParam(Q_PARAM) ?? '';
  const initTrangThai = getParam('trangThai') ?? '';
  const initMachineSystemId = lockedMachineSystemId ?? (getParam('machineSystemId') ?? '');
  const initPlanId = getParam('planId');
  const initPlanMonth = Number(getParam('planMonth') ?? '') || null;
  const initMode = getParam('mode') as ModalMode | null;

  const [page, setPage] = useState(initPage);
  const [selectedYear, setSelectedYear] = useState(initNam);
  const [search, setSearch] = useState(initQ);
  const [appliedSearch, setAppliedSearch] = useState(initQ);
  const [selectedSystemId, setSelectedSystemId] = useState(initMachineSystemId);
  const [selectedTrangThai, setSelectedTrangThai] = useState(initTrangThai);
  const [highlightPlanMonth, setHighlightPlanMonth] = useState<number | null>(initPlanMonth && initPlanMonth >= 1 && initPlanMonth <= 12 ? initPlanMonth : null);
  const [modalMode, setModalMode] = useState<ModalMode>(initMode && ['create','view','edit'].includes(initMode) ? initMode : null);
  const [viewingPlan, setViewingPlan] = useState<MaintenancePlan | null>(null);
  const [logModal, setLogModal] = useState<LogModalState | null>(null);

  useEffect(() => {
    if (lockedMachineSystemId) {
      setSelectedSystemId(lockedMachineSystemId);
      setPage(1);
    }
  }, [lockedMachineSystemId]);

  const updateParams = useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    syncingRef.current = true;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Debounce search -> URL
  useEffect(() => {
    if (search === appliedSearch) return;
    const t = setTimeout(() => {
      setAppliedSearch(search);
      setPage(1);
      updateParams({ [Q_PARAM]: search || null, [PAGE_PARAM]: null });
    }, 400);
    return () => clearTimeout(t);
  }, [search, appliedSearch, updateParams]);

  // URL -> state sync (back/reload/share) — do not duplicate ?sub
  useEffect(() => {
    if (syncingRef.current) { syncingRef.current = false; return; }
    const p = Math.max(1, Number(searchParams.get(PAGE_PARAM) ?? '1') || 1);
    const nam = Number(searchParams.get('nam') ?? '') || null;
    const q = searchParams.get(Q_PARAM) ?? '';
    const tt = searchParams.get('trangThai') ?? '';
    const msId = searchParams.get('machineSystemId') ?? '';
    const planMonth = Number(searchParams.get('planMonth') ?? '') || null;
    const mode = searchParams.get('mode') as ModalMode | null;
    if (p !== page) setPage(p);
    if (nam !== null && nam !== selectedYear) setSelectedYear(nam);
    if (q !== appliedSearch) { setAppliedSearch(q); setSearch(q); }
    if (tt !== selectedTrangThai) setSelectedTrangThai(tt);
    if (!lockedMachineSystemId && msId !== selectedSystemId) setSelectedSystemId(msId);
    if (planMonth !== highlightPlanMonth && planMonth !== null && planMonth >= 1 && planMonth <= 12) setHighlightPlanMonth(planMonth);
    if (planMonth === null && highlightPlanMonth !== null && !searchParams.get('planMonth')) setHighlightPlanMonth(null);
    if (mode !== modalMode && mode && ['create','view','edit'].includes(mode)) setModalMode(mode);
    if (!mode && modalMode) { /* keep until user closes */ }
  }, [searchParams]);

  const filters = useMemo(() => ({
    page,
    limit: PAGE_SIZE,
    nam: selectedYear,
    ...(appliedSearch && { search: appliedSearch }),
    ...(selectedSystemId && { machineSystemId: selectedSystemId }),
    ...(selectedTrangThai && { trangThai: selectedTrangThai }),
  }), [page, selectedYear, appliedSearch, selectedSystemId, selectedTrangThai]);

  const { data: plansResponse, isLoading, isError, refetch } = useMaintenancePlans(filters);
  const { data: systemsResponse } = useMachineSystems({ page: 1, limit: 200, hoatDong: true });
  const toggleMonth = useToggleMonth();
  const deletePlan = useDeleteMaintenancePlan();
  const updateLogNote = useUpdateLogNote();
  const syncDetails = useSyncDetails();

  const plans = plansResponse?.data ?? [];
  const pagination = plansResponse?.pagination;
  const systems = systemsResponse?.data ?? [];
  const planRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const openedPlanIdRef = useRef<string | null>(null);

  // Deep-link ?planId -> open detail (view), highlight and scroll to card
  useEffect(() => {
    const planId = searchParams.get('planId');
    if (!planId) { openedPlanIdRef.current = null; return; }
    if (openedPlanIdRef.current === planId && viewingPlan?.id === planId) return;
    if (viewingPlan?.id === planId) return;
    const highlightAndScroll = (id: string, month: number | null) => {
      requestAnimationFrame(() => {
        const el = planRefs.current.get(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (month && month >= 1 && month <= 12) {
            const monthEl = el.querySelector(`[data-month="${month}"]`);
            if (monthEl) (monthEl as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          }
        }
      });
    };
    const monthParam = Number(searchParams.get('planMonth') ?? '') || null;
    const validMonth = monthParam && monthParam >= 1 && monthParam <= 12 ? monthParam : null;
    const found = plans.find((pl: MaintenancePlan) => pl.id === planId);
    if (found) {
      setViewingPlan(found);
      if (!modalMode) setModalMode('view');
      openedPlanIdRef.current = planId;
      highlightAndScroll(planId, validMonth);
      return;
    }
    // Fetch if not in current page
    let cancelled = false;
    maintenancePlanService.getById(planId).then((res: any) => {
      if (cancelled) return;
      const plan = res?.data ?? res;
      if (plan?.id) {
        setViewingPlan(plan as MaintenancePlan);
        if (!modalMode) setModalMode('view');
        openedPlanIdRef.current = planId;
        highlightAndScroll(planId, validMonth);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [searchParams.get('planId'), searchParams.get('planMonth'), plans]);

  // Keep viewingPlan in sync when plans refresh (e.g., after toggle)
  useEffect(() => {
    if (!viewingPlan) return;
    const updated = plans.find((pl: MaintenancePlan) => pl.id === viewingPlan.id);
    if (updated) setViewingPlan(updated);
  }, [plans]);

  void initPlanId;

  const handleToggle = (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string, nguoiPhu?: string[]) => {
    toggleMonth.mutate({ planId, itemId, month, lanThu, nguoiThucHien, nguoiPhu }, {
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Cập nhật tháng thất bại'),
    });
  };

  const handleUpdateNote = (logId: string, data: { ghiChu?: string; nguoiThucHien?: string; nguoiPhu?: string[] }) => {
    updateLogNote.mutate({ logId, data }, {
      onSuccess: () => toast.success('Đã cập nhật ghi chú'),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Cập nhật ghi chú thất bại'),
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deletePlan.mutate(pendingDelete.id, {
      onSuccess: () => { toast.success('Đã xóa kế hoạch'); setPendingDelete(null); },
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Xóa kế hoạch thất bại'),
    });
  };

  // Page beyond the last page (stale URL or last plan deleted) → clamp to the last page
  useEffect(() => {
    if (!pagination || isLoading) return;
    const last = Math.max(1, pagination.totalPages || 1);
    if (page > last) {
      setPage(last);
      updateParams({ [PAGE_PARAM]: last > 1 ? String(last) : null });
    }
  }, [pagination, page, isLoading, updateParams]);

  const openPlanView = (plan: MaintenancePlan) => {
    setViewingPlan(plan);
    setModalMode('view');
    updateParams({ planId: plan.id, mode: 'view' });
  };
  const openPlanEdit = (plan: MaintenancePlan) => {
    setViewingPlan(plan);
    setModalMode('edit');
    updateParams({ planId: plan.id, mode: 'edit' });
  };
  const openCreate = () => {
    setViewingPlan(null);
    setModalMode('create');
    updateParams({ mode: 'create', planId: null, planMonth: null });
  };
  const closePlanModal = () => {
    setModalMode(null);
    setViewingPlan(null);
    const next = new URLSearchParams(searchParams);
    next.delete('mode');
    next.delete('planId');
    // keep planMonth? spec says focus, so keep until explicit change; but clear on close view
    // Do not delete planMonth automatically - let user navigate
    syncingRef.current = true;
    setSearchParams(next, { replace: true });
  };

  const handleToggleWithFocus = (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string, nguoiPhu?: string[]) => {
    handleToggle(planId, itemId, month, lanThu, nguoiThucHien, nguoiPhu);
    setHighlightPlanMonth(month);
    updateParams({ planId, planMonth: String(month) });
  };

  const handleOpenLogModal = (state: LogModalState) => {
    setLogModal(state);
    setHighlightPlanMonth(state.month);
    updateParams({ planId: state.planId, planMonth: String(state.month) });
  };

  const hasFilters = !!(appliedSearch || selectedTrangThai || (!lockedMachineSystemId && selectedSystemId));
  const totalPages = pagination?.totalPages ?? 1;
  // Dynamic year range (current-2 … current+1), always including the selected year
  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    const years = new Set<number>([selectedYear]);
    for (let y = now - 2; y <= now + 1; y++) years.add(y);
    return Array.from(years).sort((a, b) => a - b);
  }, [selectedYear]);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center flex-wrap gap-2">
          <input
            type="search"
            placeholder="Tìm kế hoạch..."
            aria-label="Tìm kế hoạch bảo dưỡng"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (setAppliedSearch(search), setPage(1), updateParams({ [Q_PARAM]: search || null, [PAGE_PARAM]: null }))}
            className={`${CONTROL_CLASS} w-48`}
          />
          <select
            aria-label="Lọc theo năm"
            value={selectedYear}
            onChange={(e) => { const v = Number(e.target.value); setSelectedYear(v); setPage(1); updateParams({ nam: String(v), [PAGE_PARAM]: null }); }}
            className={CONTROL_CLASS}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>
          {!lockedMachineSystemId && (
            <select
              aria-label="Lọc theo hệ thống"
              value={selectedSystemId}
              onChange={(e) => { const v = e.target.value; setSelectedSystemId(v); setPage(1); updateParams({ machineSystemId: v || null, [PAGE_PARAM]: null }); }}
              className={`${CONTROL_CLASS} max-w-[16rem]`}
            >
              <option value="">Tất cả hệ thống</option>
              {systems.map((s: any) => (
                <option key={s.id} value={s.id}>{s.tenHeThong}</option>
              ))}
            </select>
          )}
          <select
            aria-label="Lọc theo trạng thái"
            value={selectedTrangThai}
            onChange={(e) => { const v = e.target.value; setSelectedTrangThai(v); setPage(1); updateParams({ trangThai: v || null, [PAGE_PARAM]: null }); }}
            className={CONTROL_CLASS}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Đang thực hiện">Đang thực hiện</option>
            <option value="Hoàn thành">Hoàn thành</option>
          </select>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 h-9 px-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4" aria-hidden="true" /> Tạo kế hoạch
        </button>
      </div>

      {/* Legend for the month grid (color is never the only indicator) */}
      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex w-4 h-4 rounded border bg-green-500 border-green-500 text-white items-center justify-center"><Check className="w-2.5 h-2.5" aria-hidden="true" /></span>
          Đã hoàn thành
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-4 rounded border border-blue-400 bg-blue-50 ring-1 ring-blue-300" aria-hidden="true" />
          Lượt kế tiếp cần làm
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-4 rounded border border-gray-300" aria-hidden="true" />
          Chưa làm
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex w-4 h-4 rounded border border-dashed border-gray-300 text-[9px] text-gray-400 items-center justify-center" aria-hidden="true">+</span>
          Tháng ngoài lịch
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 bg-yellow-400 rounded-full" aria-hidden="true" />
          Có ghi chú
        </span>
      </div>

      {/* Plans */}
      {isLoading ? (
        <div className="space-y-3" aria-busy="true" aria-label="Đang tải kế hoạch bảo dưỡng">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg overflow-hidden" aria-hidden="true">
              <div className="h-11 bg-gray-50 border-b border-gray-200 px-4 flex items-center gap-3">
                <div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-48 bg-gray-200 rounded animate-pulse" />
              </div>
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="h-9 px-4 flex items-center gap-4 border-b border-gray-100 last:border-b-0">
                  <div className="h-3 w-56 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-40 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 flex-1 bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="border border-gray-200 rounded-lg">
          <ErrorState message="Không tải được danh sách kế hoạch bảo dưỡng." onRetry={() => { void refetch(); }} />
        </div>
      ) : plans.length === 0 && (pagination?.total ?? 0) > 0 ? (
        // Out-of-range page: the clamp effect is moving to the last page
        <div className="border border-gray-200 rounded-lg px-3 py-10 text-center text-sm text-gray-400">Đang chuyển trang…</div>
      ) : plans.length === 0 ? (
        <div className="border border-gray-200 rounded-lg px-3 py-10 text-center text-sm text-gray-400">
          {hasFilters
            ? 'Không có kế hoạch bảo dưỡng nào khớp với bộ lọc hiện tại.'
            : `Chưa có kế hoạch bảo dưỡng nào cho năm ${selectedYear}.`}
        </div>
      ) : (
        plans.map((plan: MaintenancePlan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onToggle={handleToggleWithFocus}
            onOpenLogModal={handleOpenLogModal}
            highlightMonth={highlightPlanMonth}
            isHighlighted={searchParams.get('planId') === plan.id}
            registerRef={(el) => {
              if (el) planRefs.current.set(plan.id, el);
              else planRefs.current.delete(plan.id);
            }}
            onView={() => openPlanView(plan)}
            onEdit={() => openPlanEdit(plan)}
            onDelete={canDelete ? () => setPendingDelete(plan) : undefined}
            currentMonth={currentMonth}
            onSync={() => syncDetails.mutate(plan.id, {
              onSuccess: () => toast.success('Đồng bộ linh kiện thành công'),
              onError: (err) => toast.error(err instanceof Error ? err.message : 'Đồng bộ thất bại'),
            })}
            isSyncing={syncDetails.isPending}
          />
        ))
      )}

      {/* Pagination */}
      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm">
          <span className="text-gray-600">
            Tổng <span className="font-medium text-gray-900">{pagination.total}</span> kế hoạch — Trang {page}/{totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => { const np = Math.max(1, page - 1); setPage(np); updateParams({ [PAGE_PARAM]: np > 1 ? String(np) : null }); }}
              disabled={page === 1}
              className={PAGER_BTN_CLASS}
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Trước
            </button>
            <button
              type="button"
              onClick={() => { const np = Math.min(totalPages, page + 1); setPage(np); updateParams({ [PAGE_PARAM]: String(np) }); }}
              disabled={page >= totalPages}
              className={PAGER_BTN_CLASS}
            >
              Sau <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalMode === 'create' && (
        <MaintenancePlanForm
          onClose={closePlanModal}
          systems={systems}
          year={selectedYear}
          lockedMachineSystemId={lockedMachineSystemId}
        />
      )}
      {modalMode === 'view' && viewingPlan && (
        <MaintenancePlanForm
          onClose={closePlanModal}
          systems={systems}
          year={selectedYear}
          plan={viewingPlan}
          viewOnly
          lockedMachineSystemId={lockedMachineSystemId}
        />
      )}
      {modalMode === 'edit' && viewingPlan && (
        <MaintenancePlanForm
          onClose={closePlanModal}
          systems={systems}
          year={selectedYear}
          plan={viewingPlan}
          lockedMachineSystemId={lockedMachineSystemId}
        />
      )}

      {logModal && (
        <MaintenanceLogModal
          isOpen
          onClose={() => setLogModal(null)}
          planId={logModal.planId}
          itemId={logModal.itemId}
          month={logModal.month}
          timesPerMonth={logModal.timesPerMonth}
          logs={
            plans
              .find((p) => p.id === logModal.planId)
              ?.items?.find((i) => i.id === logModal.itemId)
              ?.logs?.filter((l) => l.thang === logModal.month) ?? []
          }
          noiDung={logModal.noiDung}
          tenThietBi={logModal.tenThietBi}
          nguoiLap={logModal.nguoiLap}
          onToggle={handleToggle}
          onUpdateNote={handleUpdateNote}
        />
      )}

      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="Xác nhận xóa"
        message={`Bạn có chắc muốn xóa kế hoạch ${pendingDelete?.maKeHoach ?? ''}? Thao tác này không thể hoàn tác.`}
        loading={deletePlan.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

interface PlanCardProps {
  plan: MaintenancePlan;
  onToggle: (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string, nguoiPhu?: string[]) => void;
  onOpenLogModal: (state: LogModalState) => void;
  onView: () => void;
  onEdit: () => void;
  /** Omitted when the user may not delete (canDeleteTechnical) — the button is then hidden. */
  onDelete?: () => void;
  onSync: () => void;
  isSyncing: boolean;
  highlightMonth?: number | null;
  isHighlighted?: boolean;
  registerRef?: (el: HTMLDivElement | null) => void;
  currentMonth: number;
}

const PlanCard = ({ plan, onToggle, onOpenLogModal, onView, onEdit, onDelete, onSync, isSyncing, highlightMonth, isHighlighted, registerRef, currentMonth }: PlanCardProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Bring the current month column into view on mount (narrow screens hide T4..T12 otherwise).
  // Skipped when a deep-linked month is highlighted — that flow scrolls to its own month.
  useEffect(() => {
    if (highlightMonth) return;
    const container = scrollRef.current;
    if (!container || container.scrollWidth <= container.clientWidth) return;
    const th = container.querySelector<HTMLElement>(`th[data-month-header="${currentMonth}"]`);
    if (!th) return;
    const stickyWidth = container.querySelector<HTMLElement>('th[data-sticky-col]')?.offsetWidth ?? 0;
    const target = th.offsetLeft - stickyWidth - (container.clientWidth - stickyWidth - th.offsetWidth) / 2;
    container.scrollLeft = Math.max(0, target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, plan.id]);

  const { completed, total } = calculatePlanProgress(plan.items ?? []);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const items = plan.items ?? [];

  // Build parent-child groups for display
  // Parents: items where machineSystemDetail.parentDetailId === null (or undefined)
  // Children: items where parentDetailId is set
  // Standalone: items with no parent and no children themselves
  const parentItems = items.filter((i) => !i.machineSystemDetail?.parentDetailId);
  const childItemsByParentDetailId = new Map<string, MaintenancePlanItem[]>();
  for (const item of items) {
    const pid = item.machineSystemDetail?.parentDetailId;
    if (pid) {
      const arr = childItemsByParentDetailId.get(pid) ?? [];
      arr.push(item);
      childItemsByParentDetailId.set(pid, arr);
    }
  }

  // Determine which parentItems actually have children
  const renderedRows: Array<{ type: 'parent-header'; item: MaintenancePlanItem; children: MaintenancePlanItem[] } | { type: 'child' | 'standalone'; item: MaintenancePlanItem }> = [];
  for (const parentItem of parentItems) {
    const children = childItemsByParentDetailId.get(parentItem.machineSystemDetailId) ?? [];
    if (children.length > 0) {
      renderedRows.push({ type: 'parent-header', item: parentItem, children });
      for (const child of children) {
        renderedRows.push({ type: 'child', item: child });
      }
    } else {
      renderedRows.push({ type: 'standalone', item: parentItem });
    }
  }

  // Orphan sweep: render children whose parentDetailId points to a device
  // not present in the plan (parent was never added or was removed).
  const parentDetailIdSet = new Set(parentItems.map((p) => p.machineSystemDetailId));
  for (const [key, orphans] of childItemsByParentDetailId) {
    if (!parentDetailIdSet.has(key)) {
      for (const child of orphans) {
        renderedRows.push({ type: 'standalone', item: child });
      }
    }
  }

  return (
    <div ref={registerRef} className={`border rounded-lg overflow-hidden ${isHighlighted ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200"}`} data-plan-id={plan.id} data-highlight-month={highlightMonth ?? ""}>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-x-3 gap-y-2 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <div className="min-w-0 flex-1">
          <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{plan.maKeHoach}</span>
            <StatusBadge label={plan.trangThai} tone={PLAN_STATUS_TONE[plan.trangThai] ?? 'yellow'} />
            <span className="text-sm text-gray-700 truncate max-w-full" title={plan.machineSystem?.tenHeThong}>
              {plan.machineSystem?.tenHeThong ?? <span className="text-gray-400">—</span>}
            </span>
          </div>
          {(plan.machineSystem?.khuVuc || plan.machineSystem?.viTri) && (
            <div className="mt-0.5 text-xs text-gray-500 truncate">
              {[plan.machineSystem?.khuVuc, plan.machineSystem?.viTri].filter(Boolean).join(' - ')}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {plan.trangThai === 'Đang thực hiện' && (
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              className={`${ICON_BTN_CLASS} hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-50`}
              title="Đồng bộ linh kiện mới"
              aria-label={`Đồng bộ linh kiện mới cho ${plan.maKeHoach}`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span className="sr-only">Đồng bộ linh kiện</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => exportPlanCSV(plan)}
            className={`${ICON_BTN_CLASS} hover:text-green-600 hover:bg-green-50`}
            title="Xuất CSV"
            aria-label={`Xuất CSV kế hoạch ${plan.maKeHoach}`}
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">Xuất CSV</span>
          </button>
          <button
            type="button"
            onClick={onView}
            className={`${ICON_BTN_CLASS} hover:text-blue-600 hover:bg-blue-50`}
            title="Xem chi tiết kế hoạch"
            aria-label={`Xem chi tiết kế hoạch ${plan.maKeHoach}`}
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">Xem</span>
          </button>
          <button
            type="button"
            onClick={onEdit}
            className={`${ICON_BTN_CLASS} hover:text-amber-600 hover:bg-amber-50`}
            title="Sửa kế hoạch"
            aria-label={`Sửa kế hoạch ${plan.maKeHoach}`}
          >
            <Pencil className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">Sửa</span>
          </button>
          {onDelete && (
            <>
              <span className="mx-0.5 h-4 w-px bg-gray-200" aria-hidden="true" />
              <button
                type="button"
                onClick={onDelete}
                className={`${ICON_BTN_CLASS} hover:text-red-600 hover:bg-red-50`}
                title="Xóa kế hoạch"
                aria-label={`Xóa kế hoạch ${plan.maKeHoach}`}
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">Xóa</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Items table with month columns — bounded scroll container (both axes) so the month
          header stays sticky while scrolling long plans; device column stays pinned. */}
      <div ref={scrollRef} className="overflow-auto max-h-[60vh]">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-gray-50 sticky top-0 z-20 shadow-[inset_0_-1px_0_0_rgb(229_231_235)]">
            <tr>
              <th scope="col" data-sticky-col className={`${TH_CLASS} sticky left-0 z-30 bg-gray-50 ${STICKY_LEFT_SHADOW}`}>Thiết bị</th>
              <th scope="col" className={`${TH_CLASS} bg-gray-50`}>Nội dung BD</th>
              <th scope="col" className={`${TH_CLASS} bg-gray-50`}>Tần suất</th>
              <th scope="col" className={`${TH_CLASS} bg-gray-50`}>Tổ TH</th>
              {MONTHS.map((m) => (
                <th
                  key={m}
                  scope="col"
                  data-month-header={m}
                  className={`px-1 py-2.5 text-center text-xs font-semibold w-8 min-w-[2rem] ${m === currentMonth ? 'bg-blue-50 text-blue-700 shadow-[inset_0_-2px_0_0_rgb(96_165_250)]' : 'bg-gray-50 text-gray-500'}`}
                  title={m === currentMonth ? `Tháng ${m} (tháng hiện tại)` : `Tháng ${m}`}
                >
                  T{m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {renderedRows.map((row) => {
              if (row.type === 'parent-header') {
                // Calculate group progress for current month
                const groupChildren = row.children;
                const groupTotal = groupChildren.length;
                const groupCompleted = groupChildren.filter((child) => {
                  const logs = child.logs ?? [];
                  const monthLogs = logs.filter((l) => l.thang === currentMonth && l.hoanThanh);
                  return monthLogs.length > 0;
                }).length;
                return (
                  <tr key={`parent-${row.item.id}`} className="bg-gray-100/70">
                    <td className={`px-3 py-1.5 font-medium text-gray-800 sticky left-0 z-10 bg-gray-100 ${STICKY_LEFT_SHADOW}`}>
                      <div className="flex items-center flex-wrap gap-1.5 min-w-[12rem] max-w-[18rem]">
                        <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-semibold uppercase tracking-wide">
                          {row.item.machineSystemDetail?.loaiChiTiet ?? 'Cụm'}
                        </span>
                        <span className="truncate max-w-full" title={row.item.machineSystemDetail?.tenChiTiet ?? undefined}>
                          {row.item.machineSystemDetail?.tenChiTiet ?? '—'}
                        </span>
                        {row.item.machineSystemDetail?.hoatDong === false && (
                          <StatusBadge label="Ngừng HĐ" tone="red" size="sm" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-gray-500 whitespace-nowrap" colSpan={3}>
                      T{currentMonth}: {groupCompleted}/{groupTotal} hạng mục đã làm
                    </td>
                    {MONTHS.map((m) => (
                      <td key={m} className={`px-1 py-1.5 ${m === currentMonth ? 'bg-blue-50/40' : ''}`} />
                    ))}
                  </tr>
                );
              }

              const indent = row.type === 'child';
              return (
                <PlanItemRow
                  key={row.item.id}
                  planId={plan.id}
                  item={row.item}
                  nguoiLap={plan.nguoiLap}
                  onToggle={onToggle}
                  onOpenLogModal={onOpenLogModal}
                  indent={indent}
                  highlightMonth={highlightMonth}
                  currentMonth={currentMonth}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer with progress bar */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>
            Người lập: <span className="text-gray-700">{plan.nguoiLap || '—'}</span>
            <span className="mx-1.5 text-gray-300" aria-hidden="true">|</span>
            Ngày lập: <span className="text-gray-700 tabular-nums">{formatDate(plan.ngayLap)}</span>
            {plan._count?.records ? (
              <>
                <span className="mx-1.5 text-gray-300" aria-hidden="true">|</span>
                {plan._count.records} biên bản
              </>
            ) : null}
          </span>
          <span className="text-gray-700 font-medium tabular-nums">{completed}/{total} hoàn thành ({percent}%)</span>
        </div>
        <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

interface PlanItemRowProps {
  planId: string;
  item: MaintenancePlanItem;
  nguoiLap: string;
  onToggle: (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string, nguoiPhu?: string[]) => void;
  onOpenLogModal: (state: LogModalState) => void;
  indent?: boolean;
  highlightMonth?: number | null;
  currentMonth: number;
}

const PlanItemRow = ({ planId, item, nguoiLap, onToggle, onOpenLogModal, indent, highlightMonth, currentMonth }: PlanItemRowProps) => {
  const applicableMonths = getApplicableMonths(item.tanSuat, item.thangBatDau ?? 1);
  const timesPerMonth = getTimesPerMonth(item.tanSuat);
  const logs = item.logs ?? [];
  const isKhongCoDinh = item.tanSuat === 'KHONG_CO_DINH';

  // Smart suggestion: skip for KHONG_CO_DINH
  const suggestedMonth = isKhongCoDinh ? null : (applicableMonths.find((m) => {
    const monthLogs = logs.filter((l) => l.thang === m);
    const completedCount = monthLogs.filter((l) => l.hoanThanh).length;
    return completedCount < timesPerMonth;
  }) ?? null);

  const hoatDong = item.machineSystemDetail?.hoatDong !== false;

  return (
    <tr className="group hover:bg-gray-50">
      <td className={`px-3 py-2 align-middle text-gray-900 sticky left-0 z-10 bg-white group-hover:bg-gray-50 ${STICKY_LEFT_SHADOW}`}>
        <div className={`flex items-center gap-1.5 min-w-[12rem] max-w-[18rem] ${indent ? 'pl-4' : ''}`}>
          {indent && <span className="text-gray-300 shrink-0" aria-hidden="true">└</span>}
          <span className="line-clamp-2 break-words" title={item.machineSystemDetail?.tenChiTiet ?? undefined}>
            {item.machineSystemDetail?.tenChiTiet ?? <span className="text-gray-400">—</span>}
          </span>
          {!hoatDong && (
            <span className="shrink-0"><StatusBadge label="Ngừng HĐ" tone="red" size="sm" /></span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 align-middle text-gray-700">
        {item.noiDung ? (
          <div className="line-clamp-2 break-words min-w-[10rem] max-w-[16rem]" title={item.noiDung}>{item.noiDung}</div>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-3 py-2 align-middle text-gray-600 whitespace-nowrap">{FREQUENCY_LABELS[item.tanSuat] ?? item.tanSuat}</td>
      <td className="px-3 py-2 align-middle text-gray-600 whitespace-nowrap">{TEAM_LABELS[item.toThucHien] ?? item.toThucHien ?? '—'}</td>
      {MONTHS.map((m) => {
        const isApplicable = applicableMonths.includes(m);
        const isCurrentMonth = m === currentMonth;
        const isSuggested = isApplicable && m === suggestedMonth;
        const monthLogs = logs.filter((l) => l.thang === m);
        return (
          <td key={m} data-month={m} className={`px-1 py-2 align-middle text-center ${isCurrentMonth ? 'bg-blue-50/40' : ''} ${highlightMonth === m ? 'ring-2 ring-amber-300 ring-inset' : ''}`}>
            <MonthCell
              planId={planId}
              itemId={item.id}
              month={m}
              isHighlighted={highlightMonth === m}
              timesPerMonth={timesPerMonth}
              logs={monthLogs}
              noiDung={item.noiDung}
              tenThietBi={item.machineSystemDetail?.tenChiTiet ?? '—'}
              nguoiLap={nguoiLap}
              isApplicable={isApplicable}
              isSuggested={isSuggested}
              onToggle={onToggle}
              onOpenLogModal={onOpenLogModal}
            />
          </td>
        );
      })}
    </tr>
  );
};

interface MonthCellProps {
  planId: string;
  itemId: string;
  month: number;
  timesPerMonth: number;
  logs: MaintenancePlanItemLog[];
  noiDung: string;
  tenThietBi: string;
  nguoiLap: string;
  isApplicable: boolean;
  isSuggested: boolean;
  isHighlighted?: boolean;
  onToggle: (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string, nguoiPhu?: string[]) => void;
  onOpenLogModal: (state: LogModalState) => void;
}

const MonthCell = ({ planId, itemId, month, timesPerMonth, logs, noiDung, tenThietBi, nguoiLap, isApplicable, isSuggested, isHighlighted: _isHighlighted, onToggle: _onToggle, onOpenLogModal }: MonthCellProps) => {
  const openModal = () => {
    onOpenLogModal({ planId, itemId, month, timesPerMonth, noiDung, tenThietBi, nguoiLap });
  };

  // Non-applicable months: clickable but styled with dashed border to indicate "extra"
  if (!isApplicable) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <button
          onClick={openModal}
          type="button"
          className="w-6 h-6 rounded border border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-gray-400 hover:text-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          title="Tháng không áp dụng — nhấn để xem / ghi chú"
          aria-label={`${tenThietBi} — tháng ${month}: ngoài lịch, nhấn để xem / ghi chú`}
        >
          <span className="text-[9px]">+</span>
        </button>
      </div>
    );
  }

  if (timesPerMonth === 1) {
    const log = logs.find((l) => l.lanThu === 1);
    const checked = log?.hoanThanh ?? false;
    const hasNote = !!log?.ghiChu;
    return (
      <div className="flex flex-col items-center gap-0.5 relative">
        <button
          type="button"
          onClick={openModal}
          title={checked ? `Tháng ${month}: đã hoàn thành` : `Tháng ${month}: chưa hoàn thành`}
          aria-label={`${tenThietBi} — tháng ${month}: ${checked ? 'đã hoàn thành' : 'chưa hoàn thành'}${hasNote ? ', có ghi chú' : ''}`}
          className={`w-6 h-6 rounded border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            checked
              ? 'bg-green-500 border-green-500 text-white'
              : isSuggested
              ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300 hover:bg-blue-100'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          {checked && <Check className="w-3 h-3" />}
        </button>
        {hasNote && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" title={log?.ghiChu ?? ''} />
        )}
      </div>
    );
  }

  const completedCount = logs.filter((l) => l.hoanThanh).length;
  const allDone = completedCount === timesPerMonth;

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={openModal}
        aria-label={`${tenThietBi} — tháng ${month}: ${completedCount}/${timesPerMonth} lượt hoàn thành`}
        className={`w-6 h-6 rounded border text-[10px] font-medium flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          allDone
            ? 'bg-green-500 border-green-500 text-white'
            : completedCount > 0
            ? 'bg-green-100 border-green-300 text-green-700'
            : isSuggested
            ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300 hover:bg-blue-100 text-gray-500'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-500'
        }`}
        title={`${completedCount}/${timesPerMonth} hoàn thành`}
      >
        {allDone ? <Check className="w-3 h-3" /> : completedCount > 0 ? `${completedCount}` : ''}
      </button>
    </div>
  );
};

export default MaintenancePlanList;

