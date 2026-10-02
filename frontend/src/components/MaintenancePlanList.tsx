import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Eye, Pencil, Trash2, Check, ChevronLeft, ChevronRight, Download, RefreshCw, Search } from 'lucide-react';
import { useMaintenancePlans, useMaintenancePlan, useToggleMonth, useDeleteMaintenancePlan, useUpdateLogNote, useSyncDetails } from '../hooks/useMaintenancePlans';
import { useMachineSystems } from '../hooks/useMachineSystemDetails';
import MaintenancePlanForm from './MaintenancePlanForm';
import MaintenanceLogModal from './MaintenanceLogModal';
import { MaintenancePlan, MaintenancePlanItem, MaintenancePlanItemLog } from '../services/maintenancePlanService';
import { StatusBadge, type BadgeTone } from './shared/StatusBadge';
import ConfirmDialog from './common/ConfirmDialog';
import { ErrorState } from '../design-system/States';
import { useAuth } from '../contexts/AuthContext';
import { canDeleteTechnical } from '../utils/permissions';

const TH_CLASS = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap';
const STICKY_LEFT_SHADOW = 'shadow-[1px_0_0_0_rgb(229_231_235)]';
const CONTROL_CLASS = 'h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
const ICON_BTN_CLASS = 'inline-flex items-center justify-center h-7 w-7 rounded text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
const PAGER_BTN_CLASS = 'inline-flex items-center gap-1 h-8 px-2.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

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
    default: return MONTHS;
  }
}

function getTimesPerMonth(frequency: string): number {
  return FREQUENCY_TIMES[frequency] ?? 1;
}

function calculatePlanProgress(items: MaintenancePlanItem[]): { completed: number; total: number } {
  let total = 0;
  let completed = 0;
  for (const item of items) {
    if (item.tanSuat === 'KHONG_CO_DINH') continue;
    const applicableMonths = getApplicableMonths(item.tanSuat, item.thangBatDau ?? 1);
    const timesPerMonth = getTimesPerMonth(item.tanSuat);
    total += applicableMonths.length * timesPerMonth;
    completed += (item.logs ?? []).filter((l) => l.hoanThanh).length;
  }
  return { completed, total };
}

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

const Q_PARAM = 'planQ';
const NAV_LIMIT = 200;

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

  const initNam = Number(getParam('nam') ?? '') || new Date().getFullYear();
  const initQ = getParam(Q_PARAM) ?? '';
  const initTrangThai = getParam('trangThai') ?? '';
  const initMachineSystemId = lockedMachineSystemId ?? (getParam('machineSystemId') ?? '');
  const initPlanMonth = Number(getParam('planMonth') ?? '') || null;
  const initMode = getParam('mode') as ModalMode | null;

  const [selectedYear, setSelectedYear] = useState(initNam);
  const [search, setSearch] = useState(initQ);
  const [appliedSearch, setAppliedSearch] = useState(initQ);
  const [selectedSystemId, setSelectedSystemId] = useState(initMachineSystemId);
  const [selectedTrangThai, setSelectedTrangThai] = useState(initTrangThai);
  const [highlightPlanMonth, setHighlightPlanMonth] = useState<number | null>(initPlanMonth && initPlanMonth >= 1 && initPlanMonth <= 12 ? initPlanMonth : null);
  const [modalMode, setModalMode] = useState<ModalMode>(initMode && ['create','view','edit'].includes(initMode) ? initMode : null);
  const [viewingPlan, setViewingPlan] = useState<MaintenancePlan | null>(null);
  const [logModal, setLogModal] = useState<LogModalState | null>(null);
  const [navDropdownOpen, setNavDropdownOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');

  useEffect(() => {
    if (lockedMachineSystemId) {
      setSelectedSystemId(lockedMachineSystemId);
    }
  }, [lockedMachineSystemId]);

  // Strip deprecated planPage on entry
  useEffect(() => {
    if (searchParams.get('planPage') !== null) {
      const next = new URLSearchParams(searchParams);
      next.delete('planPage');
      syncingRef.current = true;
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateParams = useCallback((patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    next.delete('planPage');
    syncingRef.current = true;
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Debounce search -> URL
  useEffect(() => {
    if (search === appliedSearch) return;
    const t = setTimeout(() => {
      setAppliedSearch(search);
      updateParams({ [Q_PARAM]: search || null });
    }, 400);
    return () => clearTimeout(t);
  }, [search, appliedSearch, updateParams]);

  // URL -> state sync (back/reload/share)
  useEffect(() => {
    if (syncingRef.current) { syncingRef.current = false; return; }
    const nam = Number(searchParams.get('nam') ?? '') || null;
    const q = searchParams.get(Q_PARAM) ?? '';
    const tt = searchParams.get('trangThai') ?? '';
    const msId = searchParams.get('machineSystemId') ?? '';
    const planMonth = Number(searchParams.get('planMonth') ?? '') || null;
    const mode = searchParams.get('mode') as ModalMode | null;
    if (nam !== null && nam !== selectedYear) setSelectedYear(nam);
    if (q !== appliedSearch) { setAppliedSearch(q); setSearch(q); }
    if (tt !== selectedTrangThai) setSelectedTrangThai(tt);
    if (!lockedMachineSystemId && msId !== selectedSystemId) setSelectedSystemId(msId);
    if (planMonth !== highlightPlanMonth && planMonth !== null && planMonth >= 1 && planMonth <= 12) setHighlightPlanMonth(planMonth);
    if (planMonth === null && highlightPlanMonth !== null && !searchParams.get('planMonth')) setHighlightPlanMonth(null);
    if (mode !== modalMode && mode && ['create','view','edit'].includes(mode)) setModalMode(mode);
    if (!mode && modalMode) { /* keep until user closes */ }
  }, [searchParams]);

  // Navigator filtered set (capped)
  const navigatorFilters = useMemo(() => ({
    limit: NAV_LIMIT,
    nam: selectedYear,
    ...(appliedSearch && { search: appliedSearch }),
    ...(selectedSystemId && { machineSystemId: selectedSystemId }),
    ...(selectedTrangThai && { trangThai: selectedTrangThai }),
  }), [selectedYear, appliedSearch, selectedSystemId, selectedTrangThai]);

  const { data: navResponse, isLoading: navLoading, isError: navError, refetch: navRefetch } = useMaintenancePlans(navigatorFilters);
  const { data: systemsResponse } = useMachineSystems({ page: 1, limit: 200, hoatDong: true });
  const toggleMonth = useToggleMonth();
  const deletePlan = useDeleteMaintenancePlan();
  const updateLogNote = useUpdateLogNote();
  const syncDetails = useSyncDetails();

  const filteredPlans: MaintenancePlan[] = navResponse?.data ?? [];
  const navPagination = navResponse?.pagination;
  const systems = systemsResponse?.data ?? [];

  // Active plan id resolution
  const urlPlanId = searchParams.get('planId');
  const filteredIds = useMemo(() => filteredPlans.map((p) => p.id), [filteredPlans]);
  const activePlanId = useMemo(() => {
    if (filteredPlans.length === 0) return null;
    if (urlPlanId && filteredIds.includes(urlPlanId)) return urlPlanId;
    return filteredIds[0] ?? null;
  }, [urlPlanId, filteredIds, filteredPlans.length]);

  // Sync URL planId to first when missing or stale
  useEffect(() => {
    if (navLoading) return;
    if (filteredPlans.length === 0) return;
    if (!urlPlanId) {
      updateParams({ planId: filteredPlans[0].id });
      return;
    }
    if (!filteredIds.includes(urlPlanId)) {
      updateParams({ planId: filteredPlans[0].id });
    }
  }, [navLoading, filteredPlans, filteredIds, urlPlanId, updateParams]);

  // Keep viewingPlan in sync when filtered plans refresh
  useEffect(() => {
    if (!viewingPlan) return;
    const updated = filteredPlans.find((pl) => pl.id === viewingPlan.id);
    if (updated) setViewingPlan(updated);
  }, [filteredPlans, viewingPlan]);

  // Detail query for active plan
  const { data: detailResponse, isLoading: detailLoading, isError: detailError, refetch: detailRefetch } = useMaintenancePlan(activePlanId ?? '');
  const detailPlan: MaintenancePlan | null = (detailResponse?.data as unknown as MaintenancePlan) ?? null;
  // Prefer detail with items/logs; fallback to entry from filtered set (which may already have items)
  const activePlan: MaintenancePlan | null = useMemo(() => {
    if (detailPlan?.id) return detailPlan;
    if (activePlanId) return filteredPlans.find((p) => p.id === activePlanId) ?? null;
    return null;
  }, [detailPlan, activePlanId, filteredPlans]);

  const activeIndex = activePlanId ? filteredIds.indexOf(activePlanId) : -1;
  const canPrev = activeIndex > 0;
  const canNext = activeIndex >= 0 && activeIndex < filteredIds.length - 1;

  const handlePrev = () => {
    if (!canPrev) return;
    const nextId = filteredIds[activeIndex - 1];
    updateParams({ planId: nextId });
  };
  const handleNext = () => {
    if (!canNext) return;
    const nextId = filteredIds[activeIndex + 1];
    updateParams({ planId: nextId });
  };

  const handleNavigatorSelect = (id: string) => {
    setNavDropdownOpen(false);
    setNavSearch('');
    updateParams({ planId: id });
  };

  const filteredDropdownOptions = useMemo(() => {
    const q = navSearch.trim().toLowerCase();
    if (!q) return filteredPlans;
    return filteredPlans.filter((p) => {
      const code = p.maKeHoach?.toLowerCase() ?? '';
      const sys = p.machineSystem?.tenHeThong?.toLowerCase() ?? '';
      return code.includes(q) || sys.includes(q);
    });
  }, [filteredPlans, navSearch]);

  // Scroll to highlighted month after detail loads
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!activePlan || !highlightPlanMonth) return;
    // wait for grid render
    requestAnimationFrame(() => {
      const container = gridContainerRef.current;
      if (!container) return;
      const header = container.querySelector<HTMLElement>(`th[data-month-header="${highlightPlanMonth}"]`);
      if (header) {
        const stickyWidth = container.querySelector<HTMLElement>('th[data-sticky-col]')?.offsetWidth ?? 0;
        const target = header.offsetLeft - stickyWidth - (container.clientWidth - stickyWidth - header.offsetWidth) / 2;
        container.scrollLeft = Math.max(0, target);
      }
      const monthCell = container.querySelector<HTMLElement>(`[data-month="${highlightPlanMonth}"]`);
      if (monthCell) monthCell.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  }, [activePlan, highlightPlanMonth]);

  const handleToggle = (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string, nguoiPhu?: string[], ngayThucHien?: string, recordData?: { tinhTrangTruoc?: string; tinhTrangSau?: string; deXuat?: string; thoiGianThucHien?: string; noiDung?: string }) => {
    toggleMonth.mutate({ planId, itemId, month, lanThu, nguoiThucHien, nguoiPhu, ngayThucHien, recordData } as any, {
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Cập nhật tháng thất bại'),
    });
  };

  const handleUpdateNote = (logId: string, data: { ghiChu?: string; nguoiThucHien?: string; nguoiPhu?: string[]; ngayThucHien?: string; recordData?: { tinhTrangTruoc?: string; tinhTrangSau?: string; deXuat?: string; thoiGianThucHien?: string; noiDung?: string } }) => {
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
    updateParams({ mode: 'create', planMonth: null });
  };
  const closePlanModal = () => {
    setModalMode(null);
    setViewingPlan(null);
    const next = new URLSearchParams(searchParams);
    next.delete('mode');
    syncingRef.current = true;
    setSearchParams(next, { replace: true });
  };

  const handleToggleWithFocus = (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string, nguoiPhu?: string[], ngayThucHien?: string, recordData?: { tinhTrangTruoc?: string; tinhTrangSau?: string; deXuat?: string; thoiGianThucHien?: string; noiDung?: string }) => {
    handleToggle(planId, itemId, month, lanThu, nguoiThucHien, nguoiPhu, ngayThucHien, recordData);
    setHighlightPlanMonth(month);
    updateParams({ planId, planMonth: String(month) });
  };

  const handleOpenLogModal = (state: LogModalState) => {
    // Single-modal invariant: close plan form before opening log
    if (modalMode) {
      setModalMode(null);
      setViewingPlan(null);
    }
    setLogModal(state);
    setHighlightPlanMonth(state.month);
    updateParams({ planId: state.planId, planMonth: String(state.month) });
  };

  const hasFilters = !!(appliedSearch || selectedTrangThai || (!lockedMachineSystemId && selectedSystemId));
  const yearOptions = useMemo(() => {
    const now = new Date().getFullYear();
    const years = new Set<number>([selectedYear]);
    for (let y = now - 2; y <= now + 1; y++) years.add(y);
    return Array.from(years).sort((a, b) => a - b);
  }, [selectedYear]);

  const isLoading = navLoading || (activePlanId !== null && detailLoading && !activePlan);

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
            onKeyDown={(e) => e.key === 'Enter' && (setAppliedSearch(search), updateParams({ [Q_PARAM]: search || null }))}
            className={`${CONTROL_CLASS} w-48`}
          />
          <select
            aria-label="Lọc theo năm"
            value={selectedYear}
            onChange={(e) => { const v = Number(e.target.value); setSelectedYear(v); updateParams({ nam: String(v) }); }}
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
              onChange={(e) => { const v = e.target.value; setSelectedSystemId(v); updateParams({ machineSystemId: v || null }); }}
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
            onChange={(e) => { const v = e.target.value; setSelectedTrangThai(v); updateParams({ trangThai: v || null }); }}
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

      {/* Plan navigator */}
      {filteredPlans.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap p-2 border border-gray-200 rounded-lg bg-gray-50">
          <button type="button" onClick={handlePrev} disabled={!canPrev} className={PAGER_BTN_CLASS} aria-label="Kế hoạch trước">
            <ChevronLeft className="w-4 h-4" aria-hidden="true" /> Trước
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setNavDropdownOpen((v) => !v)}
              className="h-8 px-3 text-sm border border-gray-300 rounded-lg bg-white flex items-center gap-2 min-w-[14rem] justify-between"
              aria-haspopup="listbox"
              aria-expanded={navDropdownOpen}
            >
              <span className="truncate font-medium text-gray-800">{activePlan?.maKeHoach ?? '—'}</span>
              <span className="truncate text-gray-500 text-xs hidden sm:inline">{activePlan?.machineSystem?.tenHeThong ?? ''}</span>
              <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${navDropdownOpen ? 'rotate-90' : ''}`} />
            </button>
            {navDropdownOpen && (
              <div className="absolute z-20 mt-1 w-[22rem] max-w-[80vw] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                <div className="p-2 border-b border-gray-100 flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    autoFocus
                    type="search"
                    placeholder="Tìm mã / hệ thống..."
                    value={navSearch}
                    onChange={(e) => setNavSearch(e.target.value)}
                    className="flex-1 text-sm outline-none"
                  />
                </div>
                <div className="max-h-64 overflow-auto py-1" role="listbox">
                  {filteredDropdownOptions.length === 0 ? (
                    <div className="px-3 py-6 text-sm text-gray-400 text-center">Không khớp</div>
                  ) : (
                    filteredDropdownOptions.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        role="option"
                        aria-selected={p.id === activePlanId}
                        onClick={() => handleNavigatorSelect(p.id)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2 ${p.id === activePlanId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                      >
                        <span className="font-medium truncate">{p.maKeHoach}</span>
                        <span className="text-xs text-gray-500 truncate">{p.machineSystem?.tenHeThong ?? ''}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button type="button" onClick={handleNext} disabled={!canNext} className={PAGER_BTN_CLASS} aria-label="Kế hoạch sau">
            Sau <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
          <span className="text-xs text-gray-500">
            {activeIndex >= 0 ? `${activeIndex + 1} / ${filteredPlans.length}` : ''}
            {(navPagination?.total ?? 0) > NAV_LIMIT ? ` — Hiển thị ${NAV_LIMIT} kế hoạch gần nhất — hãy lọc thêm` : ''}
          </span>
        </div>
      )}

      {/* Legend */}
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

      {/* Single plan grid */}
      {isLoading ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden" aria-busy="true" aria-label="Đang tải kế hoạch bảo dưỡng">
          <div className="h-11 bg-gray-50 border-b border-gray-200 px-4 flex items-center gap-3">
            <div className="h-3 w-28 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
          {Array.from({ length: 4 }).map((_, j) => (
            <div key={j} className="h-9 px-4 flex items-center gap-4 border-b border-gray-100 last:border-b-0">
              <div className="h-3 w-56 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-40 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 flex-1 bg-gray-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : navError || detailError ? (
        <div className="border border-gray-200 rounded-lg p-4">
          <ErrorState message="Không tải được kế hoạch bảo dưỡng." onRetry={() => { void navRefetch(); if (activePlanId) void detailRefetch(); }} />
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="border border-gray-200 rounded-lg px-3 py-10 text-center">
          <p className="text-sm text-gray-400">
            {hasFilters
              ? 'Không có kế hoạch bảo dưỡng nào khớp với bộ lọc hiện tại.'
              : `Chưa có kế hoạch bảo dưỡng nào cho năm ${selectedYear}.`}
          </p>
          <button onClick={openCreate} className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Tạo kế hoạch
          </button>
        </div>
      ) : activePlan ? (
        <PlanCard
          plan={activePlan}
          onToggle={handleToggleWithFocus}
          onOpenLogModal={handleOpenLogModal}
          highlightMonth={highlightPlanMonth}
          isHighlighted={false}
          registerRef={null}
          gridContainerRef={gridContainerRef}
          onView={() => openPlanView(activePlan)}
          onEdit={() => openPlanEdit(activePlan)}
          onDelete={canDelete ? () => setPendingDelete(activePlan) : undefined}
          currentMonth={currentMonth}
          onSync={() => syncDetails.mutate(activePlan.id, {
            onSuccess: () => toast.success('Đồng bộ linh kiện thành công'),
            onError: (err) => toast.error(err instanceof Error ? err.message : 'Đồng bộ thất bại'),
          })}
          isSyncing={syncDetails.isPending}
        />
      ) : null}

      {/* Plan form modals */}
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
            (activePlan?.id === logModal.planId
              ? activePlan.items?.find((i) => i.id === logModal.itemId)?.logs?.filter((l) => l.thang === logModal.month)
              : filteredPlans.find((p) => p.id === logModal.planId)?.items?.find((i) => i.id === logModal.itemId)?.logs?.filter((l) => l.thang === logModal.month)) ?? []
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
  onDelete?: () => void;
  onSync: () => void;
  isSyncing: boolean;
  highlightMonth?: number | null;
  isHighlighted?: boolean;
  registerRef?: ((el: HTMLDivElement | null) => void) | null;
  gridContainerRef?: React.RefObject<HTMLDivElement | null>;
  currentMonth: number;
}

const PlanCard = ({ plan, onToggle, onOpenLogModal, onView, onEdit, onDelete, onSync, isSyncing, highlightMonth, isHighlighted, registerRef, gridContainerRef, currentMonth }: PlanCardProps) => {
  const localRef = useRef<HTMLDivElement>(null);
  const scrollRef = gridContainerRef ?? localRef;

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

  const parentDetailIdSet = new Set(parentItems.map((p) => p.machineSystemDetailId));
  for (const [key, orphans] of childItemsByParentDetailId) {
    if (!parentDetailIdSet.has(key)) {
      for (const child of orphans) {
        renderedRows.push({ type: 'standalone', item: child });
      }
    }
  }

  return (
    <div ref={registerRef as any} className={`border rounded-lg overflow-hidden ${isHighlighted ? "border-blue-400 ring-1 ring-blue-200" : "border-gray-200"}`} data-plan-id={plan.id} data-highlight-month={highlightMonth ?? ""}>
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
            <button type="button" onClick={onSync} disabled={isSyncing} className={`${ICON_BTN_CLASS} hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-50`} title="Đồng bộ linh kiện mới" aria-label={`Đồng bộ linh kiện mới cho ${plan.maKeHoach}`}>
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span className="sr-only">Đồng bộ linh kiện</span>
            </button>
          )}
          <button type="button" onClick={() => exportPlanCSV(plan)} className={`${ICON_BTN_CLASS} hover:text-green-600 hover:bg-green-50`} title="Xuất CSV" aria-label={`Xuất CSV kế hoạch ${plan.maKeHoach}`}>
            <Download className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">Xuất CSV</span>
          </button>
          <button type="button" onClick={onView} className={`${ICON_BTN_CLASS} hover:text-blue-600 hover:bg-blue-50`} title="Xem chi tiết kế hoạch" aria-label={`Xem chi tiết kế hoạch ${plan.maKeHoach}`}>
            <Eye className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">Xem</span>
          </button>
          <button type="button" onClick={onEdit} className={`${ICON_BTN_CLASS} hover:text-amber-600 hover:bg-amber-50`} title="Sửa kế hoạch" aria-label={`Sửa kế hoạch ${plan.maKeHoach}`}>
            <Pencil className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">Sửa</span>
          </button>
          {onDelete && (
            <>
              <span className="mx-0.5 h-4 w-px bg-gray-200" aria-hidden="true" />
              <button type="button" onClick={onDelete} className={`${ICON_BTN_CLASS} hover:text-red-600 hover:bg-red-50`} title="Xóa kế hoạch" aria-label={`Xóa kế hoạch ${plan.maKeHoach}`}>
                <Trash2 className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">Xóa</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div ref={scrollRef as any} className="overflow-auto max-h-[60vh]">
        <table className="w-full border-collapse text-xs">
          <thead className="bg-gray-50 sticky top-0 z-20 shadow-[inset_0_-1px_0_0_rgb(229_231_235)]">
            <tr>
              <th scope="col" data-sticky-col className={`${TH_CLASS} sticky left-0 z-30 bg-gray-50 ${STICKY_LEFT_SHADOW}`}>Thiết bị</th>
              <th scope="col" className={`${TH_CLASS} bg-gray-50`}>Nội dung BD</th>
              <th scope="col" className={`${TH_CLASS} bg-gray-50`}>Tần suất</th>
              <th scope="col" className={`${TH_CLASS} bg-gray-50`}>Tổ TH</th>
              {MONTHS.map((m) => (
                <th key={m} scope="col" data-month-header={m} className={`px-1 py-2.5 text-center text-xs font-semibold w-8 min-w-[2rem] ${m === currentMonth ? 'bg-blue-50 text-blue-700 shadow-[inset_0_-2px_0_0_rgb(96_165_250)]' : 'bg-gray-50 text-gray-500'}`} title={m === currentMonth ? `Tháng ${m} (tháng hiện tại)` : `Tháng ${m}`}>
                  T{m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {renderedRows.map((row) => {
              if (row.type === 'parent-header') {
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
                <PlanItemRow key={row.item.id} planId={plan.id} item={row.item} nguoiLap={plan.nguoiLap} onToggle={onToggle} onOpenLogModal={onOpenLogModal} indent={indent} highlightMonth={highlightMonth} currentMonth={currentMonth} />
              );
            })}
          </tbody>
        </table>
      </div>

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
          <div className="bg-green-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${percent}%` }} />
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
          {!hoatDong && (<span className="shrink-0"><StatusBadge label="Ngừng HĐ" tone="red" size="sm" /></span>)}
        </div>
      </td>
      <td className="px-3 py-2 align-middle text-gray-700">
        {item.noiDung ? (<div className="line-clamp-2 break-words min-w-[10rem] max-w-[16rem]" title={item.noiDung}>{item.noiDung}</div>) : (<span className="text-gray-400">—</span>)}
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
            <MonthCell planId={planId} itemId={item.id} month={m} isHighlighted={highlightMonth === m} timesPerMonth={timesPerMonth} logs={monthLogs} noiDung={item.noiDung} tenThietBi={item.machineSystemDetail?.tenChiTiet ?? '—'} nguoiLap={nguoiLap} isApplicable={isApplicable} isSuggested={isSuggested} onToggle={onToggle} onOpenLogModal={onOpenLogModal} />
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

const MonthCell = ({ planId, itemId, month, timesPerMonth, logs, noiDung, tenThietBi, nguoiLap, isApplicable, isSuggested, onToggle: _onToggle, onOpenLogModal }: MonthCellProps) => {
  const openModal = () => {
    onOpenLogModal({ planId, itemId, month, timesPerMonth, noiDung, tenThietBi, nguoiLap });
  };
  if (!isApplicable) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <button onClick={openModal} type="button" className="w-6 h-6 rounded border border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-gray-400 hover:text-gray-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" title="Tháng không áp dụng — nhấn để xem / ghi chú" aria-label={`${tenThietBi} — tháng ${month}: ngoài lịch, nhấn để xem / ghi chú`}>
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
        <button type="button" onClick={openModal} title={checked ? `Tháng ${month}: đã hoàn thành` : `Tháng ${month}: chưa hoàn thành`} aria-label={`${tenThietBi} — tháng ${month}: ${checked ? 'đã hoàn thành' : 'chưa hoàn thành'}${hasNote ? ', có ghi chú' : ''}`} className={`w-6 h-6 rounded border flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${checked ? 'bg-green-500 border-green-500 text-white' : isSuggested ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300 hover:bg-blue-100' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}`}>
          {checked && <Check className="w-3 h-3" />}
        </button>
        {hasNote && (<span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" title={log?.ghiChu ?? ''} />)}
      </div>
    );
  }
  const completedCount = logs.filter((l) => l.hoanThanh).length;
  const allDone = completedCount === timesPerMonth;
  return (
    <div className="flex flex-col items-center">
      <button type="button" onClick={openModal} aria-label={`${tenThietBi} — tháng ${month}: ${completedCount}/${timesPerMonth} lượt hoàn thành`} className={`w-6 h-6 rounded border text-[10px] font-medium flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${allDone ? 'bg-green-500 border-green-500 text-white' : completedCount > 0 ? 'bg-green-100 border-green-300 text-green-700' : isSuggested ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300 hover:bg-blue-100 text-gray-500' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-500'}`} title={`${completedCount}/${timesPerMonth} hoàn thành`}>
        {allDone ? <Check className="w-3 h-3" /> : completedCount > 0 ? `${completedCount}` : ''}
      </button>
    </div>
  );
};

export default MaintenancePlanList;
