import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { Ban, CheckCheck, CheckCircle, ClipboardList, Edit, History, Play, Plus, Search, Trash2, X, XCircle } from 'lucide-react';
import AcceptanceHandoverForm from './AcceptanceHandoverForm';
import Modal from './Modal';
import RepairRequestFormModal, { StatusTimeline, type StatusHistoryEntry } from './RepairRequestFormModal';
import ResponsiveRowActions, { type RowAction } from './ResponsiveRowActions';
import { ErrorState } from '../design-system/States';
import apiClient from '../services/apiClient';
import {
  PRIORITY_TONE,
  canCancelRepair,
  canConfirmAcceptance,
  canDeleteRequest,
  canEditRepair,
  buildTechnicalDetailParams,
  dedupeById,
  formatDateVN,
} from '../constants/repairRequest';
import { useAuth } from '../contexts/AuthContext';
import { isTechnicalUser, canDeleteTechnical } from '../utils/permissions';
import { UserRole } from '../types/auth';
import { StatCard, CollapsibleSection, StatusBadge } from './shared';
import {
  useAcceptRepair,
  useCancelRepair,
  useCompleteRepair,
  useConfirmAcceptance,
  useDeleteRepairRequest,
  usePlanRepair,
  useRepairRequests,
  useRepairRequestStats,
  useRepairStatusHistory,
  useStartRepair,
  useSubmitAcceptance,
} from '../hooks/useRepairRequests';
import repairRequestService, {
  RepairRequest,
  STATUS_LABELS,
} from '../services/repairRequestService';
import type { RepairRequestStatus } from '../services/repairRequestService';

type ModalMode = 'create' | 'edit' | 'view';

// Shared table cell styles (keep in sync with the other Technical tabs)
const TH = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap';
const TD = 'px-3 py-2.5 text-gray-700 align-top';
const STICKY_LEFT = 'sticky left-0 z-10 shadow-[1px_0_0_0_rgb(229_231_235)]';
const STICKY_RIGHT = 'sticky right-0 z-10 shadow-[-1px_0_0_0_rgb(229_231_235)]';

const SUA_CHUA_STATUSES: RepairRequestStatus[] = Object.keys(STATUS_LABELS) as RepairRequestStatus[];
// Status chips follow the workflow (incl. Chờ nghiệm thu); rare branches stay in the select
const FLOW_CHIPS: RepairRequestStatus[] = ['CHO_XU_LY', 'DA_TIEP_NHAN', 'LEN_KE_HOACH', 'DANG_SUA_CHUA', 'CHO_NGHIEM_THU', 'DA_NGHIEM_THU', 'HOAN_THANH'];

type NeedRow = { id: string; tenVatTu: string; donVi: string | null; soLuongDuKien: number | string; soLuongThucTe: number | string | null };

/** Material needs come both top-level and under items (same rows) — merge by id, never sum twice. */
const materialNeedsOf = (r: RepairRequest): NeedRow[] => {
  const top = (r.materialNeeds ?? []) as NeedRow[];
  const fromItems = (r.items ?? []).flatMap((it) => (it.materialNeeds ?? []) as NeedRow[]);
  return dedupeById([...top, ...fromItems]);
};
const isNeedSupplied = (m: NeedRow) => Number(m.soLuongThucTe ?? 0) >= Number(m.soLuongDuKien ?? 0) && Number(m.soLuongDuKien ?? 0) > 0;

const deviceNamesOf = (r: RepairRequest): string[] => {
  const names = (r.items ?? []).map((it) => it.tenHeThong).filter(Boolean);
  if (names.length) return names;
  return r.tenHeThong ? [r.tenHeThong] : [];
};
const leadOf = (r: RepairRequest): string => {
  const lead = (r.assignees ?? []).find((a) => a.isLead || a.vaiTro === 'CHINH');
  return lead?.userName ?? '';
};

interface RepairRequestListProps {
  lockedMachineSystemId?: string;
}

const RepairRequestList = ({ lockedMachineSystemId }: RepairRequestListProps = {}) => {
  const { user } = useAuth();
  // Delete: ADMIN / Trưởng bộ phận Kỹ thuật only. Process: any Kỹ thuật member (primary or secondary), any role.
  const canDelete = canDeleteTechnical(user);
  const canUpdateRepair = isTechnicalUser(user);
  const isAdminRole = user?.role === UserRole.ADMIN;
  const userId = String(user?.id ?? user?._id ?? '');
  const [searchParams, setSearchParams] = useSearchParams();
  const filterSyncRef = useRef(false);
  const detailSyncRef = useRef(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const VALID_STATUS = new Set(Object.keys(STATUS_LABELS));
  const parseRepairPage = (v: string | null, fallback: number) => {
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) && n >= 1 ? n : fallback;
  };
  const parseRepairLimit = (v: string | null, fallback: number) => {
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) && n >= 1 && n <= 100 ? n : fallback;
  };
  const parseRepairFiltersFromUrl = (sp: URLSearchParams): { page: number; limit: number; search: string; trangThai: string } => {
    const q = sp.get('q') ?? sp.get('search') ?? '';
    const status = sp.get('status') ?? sp.get('trangThai') ?? '';
    const page = parseRepairPage(sp.get('page'), 1);
    const limit = parseRepairLimit(sp.get('limit'), lockedMachineSystemId ? 200 : 10);
    const normalizedStatus = VALID_STATUS.has(status) ? status : '';
    return { page, limit, search: q, trangThai: normalizedStatus };
  };
  const initialParsed = (() => {
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get('q') ?? sp.get('search') ?? '';
    const status = sp.get('status') ?? sp.get('trangThai') ?? '';
    const page = parseRepairPage(sp.get('page'), 1);
    const limit = parseRepairLimit(sp.get('limit'), lockedMachineSystemId ? 200 : 10);
    const normalizedStatus = VALID_STATUS.has(status) ? status : '';
    return { page, limit, search: q, trangThai: normalizedStatus };
  })();
  const [filters, setFilters] = useState(initialParsed);
  const [searchInput, setSearchInput] = useState(initialParsed.search);

  const today = new Date().toISOString().split('T')[0];
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [statsDateFrom, setStatsDateFrom] = useState(ninetyDaysAgo);
  const [statsDateTo, setStatsDateTo] = useState(today);
  const repairStatsQuery = useRepairRequestStats({
    dateFrom: statsDateFrom,
    dateTo: statsDateTo,
    machineSystemId: lockedMachineSystemId,
    requestType: 'SUA_CHUA' as never,
  });
  const stats = repairStatsQuery.data?.data as unknown as { byStatus?: Record<string, number>; delta?: { total?: number; byStatus?: Record<string, number>; avgCompletionHours?: number | null }; avgCompletionHours?: number | null; topMachines?: { machineSystemId: string | null; tenHeThong: string | null; count: number }[]; recurringItems?: { machineSystemDetailId: string | null; tenChiTiet: string | null; count: number; latestMaYeuCau: string | null }[]; monthlyTrend?: { month: string; total: number; hoanThanh: number }[]; recentlyCreated?: { id: number; maYeuCau: string; tenHeThongThietBi: string | null; trangThai: string; createdAt: string }[] } | undefined;

  useEffect(() => {
    if (lockedMachineSystemId) {
      setFilters((value) => ({ ...value, limit: 200, page: 1 }));
    }
  }, [lockedMachineSystemId]);

  const repairRequestsQuery = useRepairRequests({
    page: filters.page,
    limit: filters.limit,
    search: filters.search || undefined,
    trangThai: (filters.trangThai as RepairRequestStatus) || undefined,
    requestType: 'SUA_CHUA' as never,
  });
  const deleteRequest = useDeleteRepairRequest();
  const startRepair = useStartRepair();
  const cancelRepair = useCancelRepair();
  const acceptRepair = useAcceptRepair();
  const planRepair = usePlanRepair();
  const submitAcceptance = useSubmitAcceptance();
  const confirmAcceptance = useConfirmAcceptance();
  const completeRepair = useCompleteRepair();

  const rawRepairRequests = (repairRequestsQuery.data?.data ?? []) as RepairRequest[];
  const requests: RepairRequest[] = useMemo(() => {
    if (!lockedMachineSystemId) return rawRepairRequests;
    return rawRepairRequests.filter((request) =>
      (request.items as unknown as { machineSystemId?: string | null }[] | undefined)?.some((item) => item.machineSystemId === lockedMachineSystemId)
    );
  }, [rawRepairRequests, lockedMachineSystemId]);
  const serverPagination = (repairRequestsQuery as unknown as { data?: { pagination?: { page: number; totalPages: number; total: number } } }).data?.pagination;
  const pagination = useMemo(() => {
    if (!lockedMachineSystemId) return serverPagination;
    if (!serverPagination) return undefined;
    const total = requests.length;
    const limit = filters.limit || 200;
    return { page: 1, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }, [lockedMachineSystemId, serverPagination, requests.length, filters.limit]);


  const [modal, setModal] = useState<{ mode: ModalMode; record?: RepairRequest } | null>(null);
  const [handoverRequest, setHandoverRequest] = useState<RepairRequest | null>(null);
  const [historyRequestId, setHistoryRequestId] = useState<number | null>(null);
  const repairHistoryQuery = useRepairStatusHistory(historyRequestId);
  const statusHistoryQuery = repairHistoryQuery;
  const [cancelTarget, setCancelTarget] = useState<RepairRequest | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const openModal = (mode: ModalMode, record?: RepairRequest) => {
    setModal({ mode, record });
    if (mode === 'view' && record?.id != null) {
      const next = new URLSearchParams(searchParams);
      next.set('repairId', String(record.id));
      next.delete('repairRequestId');
      detailSyncRef.current = true;
      setSearchParams(next);
    } else if (mode === 'create') {
      const next = new URLSearchParams(searchParams);
      next.set('create', 'repair');
      detailSyncRef.current = true;
      setSearchParams(next);
    }
  };
  const closeModal = () => {
    const wasView = modal?.mode === 'view';
    const wasCreate = modal?.mode === 'create';
    setModal(null);
    if (wasView && (searchParams.has('repairId') || searchParams.has('repairRequestId'))) {
      const next = new URLSearchParams(searchParams);
      next.delete('repairId');
      next.delete('repairRequestId');
      detailSyncRef.current = true;
      setSearchParams(next, { replace: true });
    }
    if (wasCreate && searchParams.get('create') === 'repair') {
      const next = new URLSearchParams(searchParams);
      next.delete('create');
      detailSyncRef.current = true;
      setSearchParams(next, { replace: true });
    }
  };

  // filters -> URL
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    let changed = false;
    const setOrDelete = (key: string, value: string | undefined, legacyKey?: string) => {
      if (legacyKey) next.delete(legacyKey);
      if (value) { if (next.get(key) !== value) { next.set(key, value); changed = true; } }
      else if (next.has(key)) { next.delete(key); changed = true; }
    };
    const trimmed = (filters.search ?? '').trim();
    setOrDelete('q', trimmed || undefined, 'search');
    setOrDelete('status', filters.trangThai || undefined, 'trangThai');
    const defaultLimit = lockedMachineSystemId ? 200 : 10;
    const pageVal = String(filters.page ?? 1);
    const limitVal = String(filters.limit ?? defaultLimit);
    if ((next.get('page') ?? '1') !== pageVal) { if (pageVal === '1') next.delete('page'); else next.set('page', pageVal); changed = true; }
    if ((next.get('limit') ?? String(defaultLimit)) !== limitVal) { if (Number(limitVal) === defaultLimit) next.delete('limit'); else next.set('limit', limitVal); changed = true; }
    if (!changed) return;
    filterSyncRef.current = true;
    setSearchParams(next, { replace: true });
  }, [filters]);

  // URL -> filters + searchInput
  useEffect(() => {
    if (filterSyncRef.current) { filterSyncRef.current = false; return; }
    const parsed = parseRepairFiltersFromUrl(searchParams);
    const urlQ = parsed.search;
    const normalizedStatus = parsed.trangThai;
    const page = parsed.page;
    const limit = parsed.limit;
    let needs = false;
    if ((filters.search ?? '') !== urlQ) needs = true;
    if ((filters.trangThai ?? '') !== normalizedStatus) needs = true;
    if (filters.page !== page || filters.limit !== limit) needs = true;
    if (needs) setFilters({ page, limit, search: urlQ, trangThai: normalizedStatus });
    if (searchInput !== urlQ) setSearchInput(urlQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const trimmed = searchInput.trim();
      setFilters((f) => {
        if ((f.search ?? '') === trimmed) return f;
        return { ...f, search: trimmed, page: 1 };
      });
    }, 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchInput]);

  const repairIdParam = searchParams.get('repairId');
  const repairRequestIdParam = searchParams.get('repairRequestId');
  const createParam = searchParams.get('create');
  useEffect(() => {
    if (detailSyncRef.current) { detailSyncRef.current = false; return; }
    const createVal = createParam;
    if (createVal === 'repair') {
      if (!modal || modal.mode !== 'create') setModal({ mode: 'create' });
    } else if (modal?.mode === 'create') {
      setModal(null);
    }
    const repairId = repairIdParam ?? repairRequestIdParam;
    if (!repairId) {
      if (modal?.mode === 'view' && modal.record?.id != null) setModal(null);
      return;
    }
    if (modal?.mode === 'view' && String(modal.record?.id) === String(repairId)) return;
    let cancelled = false;
    repairRequestService.getById(repairId).then((res) => {
      if (cancelled) return;
      const record = res?.data as unknown as RepairRequest | undefined;
      if (record?.id != null) {
        setModal({ mode: 'view', record });
      }
      if (searchParams.has('repairRequestId') && !searchParams.has('repairId')) {
        const next = new URLSearchParams(searchParams);
        next.set('repairId', String(repairId));
        next.delete('repairRequestId');
        detailSyncRef.current = true;
        setSearchParams(next, { replace: true });
      }
    }).catch(()=>null);
    return () => { cancelled = true; };
  }, [repairIdParam, repairRequestIdParam, createParam, searchParams]);

  const remove = async (record: RepairRequest) => {
    if (!confirm(`Xóa yêu cầu ${record.maYeuCau}?`)) return;
    try {
      await deleteRequest.mutateAsync(record.id);
      toast.success('Đã xóa yêu cầu sửa chữa');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không xóa được yêu cầu');
    }
  };

  const exportExcel = async () => {
    try {
      await repairRequestService.exportExcel({ search: filters.search || undefined, trangThai: (filters.trangThai as RepairRequestStatus) || undefined });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không xuất được Excel');
    }
  };

  const clearFilters = () => { setSearchInput(''); setFilters((f) => ({ ...f, search: '', trangThai: '', page: 1 })); };
  const hasActiveFilter = !!filters.search || !!filters.trangThai;

  const handleStartRepair = async (record: RepairRequest) => {
    if (!confirm(`Bắt đầu sửa chữa cho yêu cầu ${record.maYeuCau}?`)) return;
    try {
      await startRepair.mutateAsync(record.id);
      toast.success('Đã bắt đầu sửa chữa');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể bắt đầu sửa chữa');
    }
  };

  const handleAccept = async (record: RepairRequest) => {
    try {
      await acceptRepair.mutateAsync(record.id);
      toast.success('Đã tiếp nhận');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Không thể tiếp nhận'); }
  };

  // ── Plan / Acceptance / Confirm modals state ──
  const [planTarget, setPlanTarget] = useState<RepairRequest | null>(null);
  const [planForm, setPlanForm] = useState({
    keHoachChiTiet: '',
    phuongAn: '',
    bienPhapAnToan: '',
    ngayBatDauKeHoach: '',
    ngayHoanThienDuKien: '',
    chiPhiDuKien: '',
    canNgungMay: false,
    phongBanId: '',
  });
  const [acceptanceTarget, setAcceptanceTarget] = useState<RepairRequest | null>(null);
  const [acceptanceForm, setAcceptanceForm] = useState({ warehouseIssueId: '', chiPhiThucTe: '' });
  const [confirmTarget, setConfirmTarget] = useState<RepairRequest | null>(null);
  // Confirmer sends { ketQua, lyDo } only
  const [confirmForm, setConfirmForm] = useState({ ketQua: '' as '' | 'DAT' | 'KHONG_DAT', lyDo: '' });

  const openPlanModal = (record: RepairRequest) => {
    const r = record;
    setPlanForm({
      keHoachChiTiet: (r as unknown as { keHoachChiTiet?: string }).keHoachChiTiet ?? '',
      phuongAn: (r as unknown as { phuongAn?: string }).phuongAn ?? '',
      bienPhapAnToan: (r as unknown as { bienPhapAnToan?: string }).bienPhapAnToan ?? '',
      ngayBatDauKeHoach: (r as unknown as { ngayBatDauKeHoach?: string }).ngayBatDauKeHoach ? String((r as unknown as { ngayBatDauKeHoach: string }).ngayBatDauKeHoach).slice(0, 10) : '',
      ngayHoanThienDuKien: (r as unknown as { ngayHoanThienDuKien?: string }).ngayHoanThienDuKien ? String((r as unknown as { ngayHoanThienDuKien: string }).ngayHoanThienDuKien).slice(0, 10) : '',
      chiPhiDuKien: (r as unknown as { chiPhiDuKien?: number }).chiPhiDuKien != null ? String((r as unknown as { chiPhiDuKien: number }).chiPhiDuKien) : '',
      canNgungMay: !!(r as unknown as { canNgungMay?: boolean }).canNgungMay,
      phongBanId: (r as unknown as { phongBanId?: string }).phongBanId ?? '',
    });
    setPlanTarget(r);
  };
  const handleConfirmPlan = async () => {
    if (!planTarget) return;
    if (planForm.ngayBatDauKeHoach && planForm.ngayHoanThienDuKien) {
      if (new Date(planForm.ngayHoanThienDuKien).getTime() <= new Date(planForm.ngayBatDauKeHoach).getTime()) {
        toast.error('Ngày hoàn thiện dự kiến phải sau ngày bắt đầu kế hoạch');
        return;
      }
    }
    const payload: Record<string, unknown> = {};
    if (planForm.keHoachChiTiet.trim()) payload.keHoachChiTiet = planForm.keHoachChiTiet.trim();
    if (planForm.phuongAn.trim()) payload.phuongAn = planForm.phuongAn.trim();
    if (planForm.bienPhapAnToan.trim()) payload.bienPhapAnToan = planForm.bienPhapAnToan.trim();
    if (planForm.ngayBatDauKeHoach) payload.ngayBatDauKeHoach = planForm.ngayBatDauKeHoach;
    if (planForm.ngayHoanThienDuKien) payload.ngayHoanThienDuKien = planForm.ngayHoanThienDuKien;
    if (planForm.chiPhiDuKien !== '') {
      const n = Number(planForm.chiPhiDuKien);
      if (!Number.isFinite(n) || n < 0) { toast.error('Chi phí dự kiến phải >= 0'); return; }
      payload.chiPhiDuKien = n;
    }
    payload.canNgungMay = planForm.canNgungMay;
    if (planForm.phongBanId.trim()) payload.phongBanId = planForm.phongBanId.trim();
    try {
      await planRepair.mutateAsync({ id: planTarget.id, payload: payload as never });
      toast.success('Đã lên kế hoạch');
      setPlanTarget(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Không thể lên kế hoạch'); }
  };
  const openAcceptanceModal = (record: RepairRequest) => {
    setAcceptanceForm({ warehouseIssueId: '', chiPhiThucTe: '' });
    setAcceptanceTarget(record);
  };
  const handleConfirmSubmitAcceptance = async () => {
    if (!acceptanceTarget) return;
    if (acceptanceForm.warehouseIssueId.trim()) {
      try {
        await apiClient.post('/acceptance-handovers', {
          repairRequestId: Number(acceptanceTarget.id),
          warehouseIssueId: acceptanceForm.warehouseIssueId.trim(),
          ...(acceptanceForm.chiPhiThucTe ? { chiPhiThucTe: Number(acceptanceForm.chiPhiThucTe) } : {}),
        } as never);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Không tạo được phiếu bàn giao, vẫn đề nghị nghiệm thu');
      }
    }
    if (acceptanceForm.chiPhiThucTe && !acceptanceForm.warehouseIssueId.trim()) {
      const n = Number(acceptanceForm.chiPhiThucTe);
      if (!Number.isFinite(n) || n < 0) { toast.error('Chi phí thực tế phải >= 0'); return; }
      try { await apiClient.put(`/repair-requests/${acceptanceTarget.id}`, { chiPhiThucTe: n } as never); } catch { /* ignore */ }
    }
    try { await submitAcceptance.mutateAsync(acceptanceTarget.id as unknown as number); toast.success('Đã đề nghị nghiệm thu'); setAcceptanceTarget(null); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Không thể đề nghị nghiệm thu'); }
  };
  const openConfirmModal = (record: RepairRequest, ketQua: 'DAT' | 'KHONG_DAT') => {
    setConfirmForm({ ketQua, lyDo: '' });
    setConfirmTarget(record);
  };
  const handleConfirmAcceptanceSubmit = async () => {
    if (!confirmTarget) return;
    if (!confirmForm.ketQua) { toast.error('Vui lòng chọn kết quả'); return; }
    if (confirmForm.ketQua === 'KHONG_DAT' && !confirmForm.lyDo.trim()) { toast.error('Vui lòng nhập lý do không đạt'); return; }
    try {
      await confirmAcceptance.mutateAsync({ id: confirmTarget.id as unknown as number, payload: { ketQua: confirmForm.ketQua as 'DAT' | 'KHONG_DAT', lyDo: confirmForm.lyDo.trim() || undefined } });
      toast.success(confirmForm.ketQua === 'DAT' ? 'Đã xác nhận ĐẠT' : 'Đã xác nhận KHÔNG ĐẠT');
      setConfirmTarget(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Không thể xác nhận'); }
  };

  // Compat aliases for row actions
  const handlePlan = (record: RepairRequest) => openPlanModal(record);
  const handleSubmitAcceptance = (record: RepairRequest) => openAcceptanceModal(record);
  const handleConfirmDat = (record: RepairRequest) => openConfirmModal(record, 'DAT');

  const handleComplete = async (record: RepairRequest) => {
    try { await completeRepair.mutateAsync(record.id); toast.success('Đã hoàn thành'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Không thể hoàn thành'); }
  };

  void handlePlan; void handleSubmitAcceptance; void handleConfirmDat;

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelRepair.mutateAsync({ id: cancelTarget.id, reason: cancelReason || undefined });
      toast.success('Đã hủy yêu cầu sửa chữa');
      setCancelTarget(null);
      setCancelReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể hủy yêu cầu');
    }
  };

  // Badge counts from stats.byStatus
  const countFor = (key: string) => (stats?.byStatus?.[key] as number | undefined) ?? 0;
  const suaChuaTotal = SUA_CHUA_STATUSES.reduce((s, k) => s + countFor(k), 0);

  // Optional columns: hide when empty for the whole page
  const showRequester = requests.some((r) => !!r.createdByName);
  const showLead = requests.some((r) => !!leadOf(r));
  const showSource = requests.some((r) => !!r.inspectionRequest?.maYeuCau);
  const showNeeds = requests.some((r) => materialNeedsOf(r).length > 0);
  const tableColCount = 6 + [showRequester, showLead, showSource, showNeeds].filter(Boolean).length;
  const historyEntries = (statusHistoryQuery.data?.data ?? []) as unknown as StatusHistoryEntry[];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Yêu cầu sửa chữa</h2>
          <p className="text-xs text-gray-500">Mỗi yêu cầu có thể gồm nhiều thiết bị lỗi, có hoặc không có liên kết máy.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportExcel} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Xuất Excel</button>
          {canUpdateRepair && (
            <button type="button" onClick={() => openModal('create')} className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> Thêm mới</button>
          )}
        </div>
      </div>

      {/* Statistics only — the list endpoint has no date filter, so this range never filters the table */}
      <CollapsibleSection
        title="Thống kê"
        rightAdornment={<span className="text-xs font-normal text-gray-500 tabular-nums">{formatDateVN(statsDateFrom)} – {formatDateVN(statsDateTo)}</span>}
      >
      <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-gray-700">Khoảng thống kê từ:</span>
        <input
          type="date"
          aria-label="Thống kê từ ngày"
          value={statsDateFrom}
          max={statsDateTo}
          onChange={(e) => setStatsDateFrom(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <span className="font-medium text-gray-700">đến:</span>
        <input
          type="date"
          aria-label="Thống kê đến ngày"
          value={statsDateTo}
          min={statsDateFrom}
          onChange={(e) => setStatsDateTo(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <span className="text-xs text-gray-400">Chỉ áp dụng cho số liệu thống kê, không lọc danh sách.</span>
      </div>

      {repairStatsQuery.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Không thể tải thống kê yêu cầu sửa chữa.
        </div>
      )}

      {/* Stat cards are read-only — filtering lives in the table toolbar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {repairStatsQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-white px-4 py-3 animate-pulse">
              <div className="h-3 w-20 rounded bg-gray-200 mb-2" />
              <div className="h-7 w-10 rounded bg-gray-200" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Tổng (kỳ thống kê)"
              value={suaChuaTotal}
              delta={stats?.delta?.byStatus ? undefined : stats?.delta?.total}
              deltaLabel="vs kỳ trước"
            />
            <StatCard
              label={STATUS_LABELS.CHO_XU_LY.label}
              value={countFor('CHO_XU_LY')}
              delta={stats?.delta?.byStatus?.['CHO_XU_LY']}
            />
            <StatCard
              label={STATUS_LABELS.DANG_SUA_CHUA.label}
              value={countFor('DANG_SUA_CHUA')}
              delta={stats?.delta?.byStatus?.['DANG_SUA_CHUA']}
            />
            <StatCard
              label={STATUS_LABELS.HOAN_THANH.label}
              value={countFor('HOAN_THANH')}
              delta={stats?.delta?.byStatus?.['HOAN_THANH']}
              deltaLabel={stats?.avgCompletionHours != null ? `Tb. ${Math.round(stats.avgCompletionHours)}h` : undefined}
            />
          </>
        )}
      </div>

      <CollapsibleSection title="Máy hay yêu cầu sửa chữa nhất">
        {repairStatsQuery.isLoading ? (
          <p className="text-sm text-gray-400">Đang tải...</p>
        ) : !stats?.topMachines || stats.topMachines.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có dữ liệu.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {stats.topMachines.map((m, i) => (
              <li key={m.machineSystemId ?? i} className="flex items-center justify-between">
                <span className="text-gray-700">{m.tenHeThong ?? m.machineSystemId ?? '—'}</span>
                <span className="font-medium text-gray-900">{m.count} lần</span>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Yêu cầu tái phát">
        {repairStatsQuery.isLoading ? (
          <p className="text-sm text-gray-400">Đang tải...</p>
        ) : !stats?.recurringItems || stats.recurringItems.length === 0 ? (
          <p className="text-sm text-gray-400">Không có mục tái phát trong 180 ngày qua.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {stats.recurringItems.map((r, i) => (
              <li key={r.machineSystemDetailId ?? i} className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-gray-700">{r.tenChiTiet ?? r.machineSystemDetailId ?? '—'}</span>
                  {r.latestMaYeuCau && (
                    <p className="text-[11px] text-gray-400">Mã mới nhất: {r.latestMaYeuCau}</p>
                  )}
                </div>
                <span className="shrink-0 font-medium text-gray-900">{r.count} lần</span>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Xu hướng theo tháng">
        {repairStatsQuery.isLoading ? (
          <p className="text-sm text-gray-400">Đang tải...</p>
        ) : !stats?.monthlyTrend || stats.monthlyTrend.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có dữ liệu.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-xs">
              <thead>
                <tr className="text-gray-500">
                  <th className="py-1 text-left font-medium">Tháng</th>
                  <th className="py-1 text-right font-medium">Tổng</th>
                  <th className="py-1 text-right font-medium">Hoàn thành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.monthlyTrend.map((row) => (
                  <tr key={row.month}>
                    <td className="py-1 text-gray-700">{row.month}</td>
                    <td className="py-1 text-right text-gray-900 font-medium">{row.total}</td>
                    <td className="py-1 text-right text-green-700">{row.hoanThanh}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Mới phát sinh">
        {repairStatsQuery.isLoading ? (
          <p className="text-sm text-gray-400">Đang tải...</p>
        ) : !stats?.recentlyCreated || stats.recentlyCreated.length === 0 ? (
          <p className="text-sm text-gray-400">Không có yêu cầu mới phát sinh.</p>
        ) : (
          <ul className="space-y-1">
            {stats.recentlyCreated.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    repairRequestService.getById(r.id).then((res) => {
                      if (res?.data) openModal('view', res.data as unknown as RepairRequest);
                    }).catch(()=>null);
                  }}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-medium text-gray-800">{r.maYeuCau}</span>
                    {r.tenHeThongThietBi && (
                      <span className="ml-2 text-xs text-gray-400">{r.tenHeThongThietBi}</span>
                    )}
                  </div>
                  <StatusBadge label={STATUS_LABELS[r.trangThai as RepairRequestStatus]?.label ?? r.trangThai} tone={STATUS_LABELS[r.trangThai as RepairRequestStatus]?.tone ?? 'gray'} size="sm" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>
      </div>
      </CollapsibleSection>

      <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-gray-200 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" aria-hidden="true" />
              <input type="search" aria-label="Tìm yêu cầu sửa chữa" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm mã, thiết bị..." title="Tìm theo mã yêu cầu hoặc tên thiết bị" className="w-56 rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm placeholder:text-gray-400" />
            </div>
            <select aria-label="Lọc theo trạng thái" value={filters.trangThai} onChange={(event) => setFilters((value) => ({ ...value, trangThai: event.target.value, page: 1 }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Tất cả trạng thái</option>
              {SUA_CHUA_STATUSES.map((key) => <option key={key} value={key}>{STATUS_LABELS[key]?.label ?? key}</option>)}
            </select>
            {hasActiveFilter && <button type="button" onClick={clearFilters} className="text-xs font-medium text-blue-600 hover:underline">Xóa bộ lọc</button>}
          </div>
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Lọc nhanh theo trạng thái">
            {FLOW_CHIPS.map((key) => {
              const active = filters.trangThai === key;
              return (
                <button key={key} type="button" aria-pressed={active} onClick={() => setFilters((f) => ({ ...f, trangThai: active ? '' : key, page: 1 }))}
                  className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                  {STATUS_LABELS[key].label}
                </button>
              );
            })}
          </div>
        </div>
        {repairRequestsQuery.isError ? (
          <ErrorState message="Không tải được danh sách yêu cầu sửa chữa." onRetry={() => repairRequestsQuery.refetch()} />
        ) : (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-20">
                <tr>
                  <th scope="col" className={`${TH} ${STICKY_LEFT} bg-gray-50`}>Mã</th>
                  <th scope="col" className={TH}>Trạng thái</th>
                  <th scope="col" className={TH}>Ưu tiên</th>
                  <th scope="col" className={TH}>Ngày</th>
                  <th scope="col" className={TH}>Thiết bị</th>
                  {showRequester && <th scope="col" className={TH}>Người yêu cầu</th>}
                  {showLead && <th scope="col" className={TH}>Phụ trách chính</th>}
                  {showSource && <th scope="col" className={TH}>Nguồn KT</th>}
                  {showNeeds && <th scope="col" className={TH}>Vật tư</th>}
                  <th scope="col" className={`${TH} ${STICKY_RIGHT} bg-gray-50 text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {repairRequestsQuery.isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`} aria-hidden="true">
                      {Array.from({ length: tableColCount }).map((__, j) => (
                        <td key={j} className="px-3 py-3"><div className={`h-3.5 rounded bg-gray-200 animate-pulse ${j === 4 ? 'w-4/5' : 'w-2/3'}`} /></td>
                      ))}
                    </tr>
                  ))
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={tableColCount} className="px-3 py-10 text-center">
                      <p className="text-sm font-medium text-gray-600">{hasActiveFilter ? 'Không có yêu cầu phù hợp bộ lọc' : 'Chưa có yêu cầu sửa chữa'}</p>
                      {hasActiveFilter && <button type="button" onClick={clearFilters} className="mt-2 text-xs font-medium text-blue-600 hover:underline">Xóa bộ lọc</button>}
                    </td>
                  </tr>
                ) : requests.map((request) => {
                  const srcMa = request.inspectionRequest?.maYeuCau ?? null;
                  const devices = deviceNamesOf(request);
                  const deviceLabel = devices.length > 1 ? `${devices[0]} +${devices.length - 1}` : (devices[0] ?? '');
                  const needs = materialNeedsOf(request);
                  const supplied = needs.filter(isNeedSupplied).length;
                  const needsTitle = needs.map((m) => `${m.tenVatTu}: ${Number(m.soLuongThucTe ?? 0)}/${Number(m.soLuongDuKien ?? 0)} ${m.donVi ?? ''}`.trim()).join('\n');
                  const lead = leadOf(request);
                  const statusEntry = STATUS_LABELS[request.trangThai];
                  const stickyBg = 'bg-white group-hover:bg-blue-50';
                  return (
                    <tr key={request.id} onClick={() => openModal('view', request)} className="group cursor-pointer transition-colors hover:bg-blue-50">
                      <td className={`${TD} ${STICKY_LEFT} ${stickyBg} whitespace-nowrap`}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); openModal('view', request); }} className="font-mono text-xs font-medium text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded">{request.maYeuCau}</button>
                      </td>
                      <td className={`${TD} whitespace-nowrap`}><StatusBadge label={statusEntry?.label ?? request.trangThai} tone={statusEntry?.tone ?? 'gray'} size="sm" /></td>
                      <td className={`${TD} whitespace-nowrap`}><StatusBadge label={request.mucDoUuTien || '—'} tone={PRIORITY_TONE[request.mucDoUuTien] ?? 'gray'} size="sm" /></td>
                      <td className={`${TD} whitespace-nowrap text-xs text-gray-600 tabular-nums`}>{formatDateVN(request.ngayThang ?? request.createdAt)}</td>
                      <td className={`${TD} text-xs text-gray-800`}>{deviceLabel ? <p className="max-w-[220px] truncate" title={devices.join('\n')}>{deviceLabel}</p> : <span className="text-gray-400">—</span>}</td>
                      {showRequester && <td className={`${TD} text-xs`}>{request.createdByName ? <p className="max-w-[150px] truncate" title={request.createdByName}>{request.createdByName}</p> : <span className="text-gray-400">—</span>}</td>}
                      {showLead && <td className={`${TD} text-xs`}>{lead ? <p className="max-w-[150px] truncate" title={lead}>{lead}</p> : <span className="text-gray-400">—</span>}</td>}
                      {showSource && <td className={`${TD} text-xs whitespace-nowrap`}>{srcMa ? (
                        request.sourceInspectionRequestId && !lockedMachineSystemId
                          // Switch to the YCKT tab and drop repairId (ids overlap between the two tables)
                          ? <button type="button" title={`Mở phiếu kiểm tra ${srcMa}`} onClick={(e) => { e.stopPropagation(); setSearchParams(buildTechnicalDetailParams(searchParams, 'inspection', String(request.sourceInspectionRequestId))); }} className="font-mono text-amber-700 hover:underline">{srcMa}</button>
                          : <span className="font-mono text-amber-700">{srcMa}</span>
                      ) : <span className="text-gray-400">—</span>}</td>}
                      {showNeeds && <td className={`${TD} text-xs whitespace-nowrap`}>{needs.length === 0 ? <span className="text-gray-400">—</span> : <span title={needsTitle} className={supplied >= needs.length ? 'text-green-600 font-medium' : 'text-amber-600'}>{supplied}/{needs.length}</span>}</td>}
                      <td className={`px-3 py-1.5 align-middle ${STICKY_RIGHT} ${stickyBg}`} onClick={(e) => e.stopPropagation()}>
                        {(() => {
                          const s = request.trangThai as RepairRequestStatus;
                          const gate = { isTechnical: canUpdateRepair, isAdmin: isAdminRole, isOwner: !!userId && request.createdById === userId };
                          // Row click opens the detail, so no separate "Xem" button. One primary action per state, each with its own icon.
                          const acts: RowAction[] = [];
                          // ĐẠT/KHÔNG ĐẠT belongs to the pending slip's confirmer (or ADMIN), not the technician
                          if (s === 'CHO_NGHIEM_THU' && canConfirmAcceptance(request.acceptanceHandovers, userId, isAdminRole)) {
                            acts.push({ key: 'dat', label: 'Xác nhận ĐẠT', icon: <CheckCircle size={14} />, tone: 'success', onClick: () => openConfirmModal(request, 'DAT') });
                            acts.push({ key: 'khongdat', label: 'Xác nhận KHÔNG ĐẠT', icon: <XCircle size={14} />, tone: 'danger', onClick: () => openConfirmModal(request, 'KHONG_DAT') });
                          }
                          if (canUpdateRepair) {
                            if (s === 'CHO_XU_LY') acts.push({ key: 'accept', label: 'Tiếp nhận', icon: <CheckCircle size={14} />, tone: 'primary', onClick: () => handleAccept(request) });
                            else if (s === 'DA_TIEP_NHAN') acts.push({ key: 'plan', label: 'Lên kế hoạch', icon: <ClipboardList size={14} />, tone: 'warning', onClick: () => openPlanModal(request) });
                            else if (s === 'LEN_KE_HOACH') acts.push({ key: 'start', label: 'Bắt đầu sửa chữa', icon: <Play size={14} />, tone: 'primary', onClick: () => handleStartRepair(request) });
                            else if (s === 'DA_NGHIEM_THU') acts.push({ key: 'complete', label: 'Hoàn thành', icon: <CheckCheck size={14} />, tone: 'success', onClick: () => handleComplete(request) });
                            // DANG_SUA_CHUA: the acceptance slip (per-item result + file) is filled in the detail view
                          }
                          if (canEditRepair(s, gate)) acts.push({ key: 'edit', label: 'Sửa', icon: <Edit size={14} />, tone: 'primary', onClick: () => openModal('edit', request) });
                          acts.push({ key: 'history', label: 'Lịch sử', icon: <History size={14} />, onClick: () => setHistoryRequestId(request.id) });
                          if (canCancelRepair(s, gate)) acts.push({ key: 'cancel', label: 'Hủy phiếu', icon: <Ban size={14} />, tone: 'warning', onClick: () => { setCancelTarget(request); setCancelReason(''); } });
                          if (canDeleteRequest(s, canDelete)) acts.push({ key: 'delete', label: 'Xóa', icon: <Trash2 size={14} />, tone: 'danger', onClick: () => remove(request) });
                          return <ResponsiveRowActions actions={acts} />;
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        </div>
        )}
        {pagination && pagination.totalPages > 1 && !repairRequestsQuery.isError && (
          <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-sm">
            <span className="text-gray-600">Trang {pagination.page}/{pagination.totalPages} - {pagination.total} dòng</span>
            <div className="flex gap-1">
              <button disabled={filters.page <= 1} onClick={() => setFilters((value) => ({ ...value, page: value.page - 1 }))} className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40">Trước</button>
              <button disabled={filters.page >= pagination.totalPages} onClick={() => setFilters((value) => ({ ...value, page: value.page + 1 }))} className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40">Sau</button>
            </div>
          </div>
        )}
      </section>

      <RepairRequestFormModal
        isOpen={!!modal}
        onClose={closeModal}
        mode={modal?.mode ?? 'create'}
        record={modal?.record}
        _source="repair"
        lockedMachineSystemId={lockedMachineSystemId}
        lockedRequestType={modal?.mode === 'create' ? 'SUA_CHUA' : undefined}
        onSaved={closeModal}
        onEdit={() => {
          if (modal?.record) {
            setModal({ mode: 'edit', record: modal.record });
          }
        }}
      />

      {handoverRequest && (
        <AcceptanceHandoverForm
          repairRequest={handoverRequest}
          onClose={() => setHandoverRequest(null)}
          onSuccess={() => {
            setHandoverRequest(null);
            repairRequestsQuery.refetch();
          }}
        />
      )}

      {cancelTarget && (
        <Modal isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} showBackdrop>
          <div className="flex w-full max-w-md flex-col rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-base font-semibold text-gray-900">Hủy yêu cầu {cancelTarget.maYeuCau}</h3>
              <button title="Đóng" onClick={() => setCancelTarget(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <label className="block space-y-1">
                <span className="font-medium text-gray-700">Lý do hủy (tùy chọn)</span>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Nhập lý do hủy..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </label>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setCancelTarget(null)} className="rounded-md border border-gray-300 px-4 py-2">Không</button>
                <button type="button" onClick={handleConfirmCancel} className="rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700">Xác nhận hủy</button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {historyRequestId && (
        <Modal isOpen={!!historyRequestId} onClose={() => setHistoryRequestId(null)} showBackdrop>
          <div className="flex w-full max-w-lg flex-col rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-base font-semibold text-gray-900">Lịch sử trạng thái</h3>
              <button title="Đóng" onClick={() => setHistoryRequestId(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-4 text-sm">
              {statusHistoryQuery.isError
                ? <p className="text-red-600 text-center py-4">Không tải được lịch sử.</p>
                : <StatusTimeline entries={historyEntries} isLoading={statusHistoryQuery.isLoading} statusLabels={STATUS_LABELS} />}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Plan modal (YSCC) ── */}
      {planTarget && (
        <Modal isOpen={!!planTarget} onClose={() => setPlanTarget(null)} showBackdrop>
          <div className="flex w-full max-w-lg flex-col rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-base font-semibold text-gray-900">Lên kế hoạch — {planTarget.maYeuCau}</h3>
              <button onClick={() => setPlanTarget(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <label className="block space-y-1"><span className="font-medium text-gray-700">Kế hoạch chi tiết</span><textarea rows={2} value={planForm.keHoachChiTiet} onChange={(e) => setPlanForm((f) => ({ ...f, keHoachChiTiet: e.target.value }))} placeholder="Mô tả kế hoạch..." className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="block space-y-1"><span className="font-medium text-gray-700">Phương án</span><input value={planForm.phuongAn} onChange={(e) => setPlanForm((f) => ({ ...f, phuongAn: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="block space-y-1"><span className="font-medium text-gray-700">Biện pháp an toàn</span><input value={planForm.bienPhapAnToan} onChange={(e) => setPlanForm((f) => ({ ...f, bienPhapAnToan: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1"><span className="font-medium text-gray-700">Ngày BĐKH</span><input type="date" value={planForm.ngayBatDauKeHoach} onChange={(e) => setPlanForm((f) => ({ ...f, ngayBatDauKeHoach: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
                <label className="space-y-1"><span className="font-medium text-gray-700">Ngày HTDK</span><input type="date" value={planForm.ngayHoanThienDuKien} onChange={(e) => setPlanForm((f) => ({ ...f, ngayHoanThienDuKien: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              </div>
              <label className="block space-y-1"><span className="font-medium text-gray-700">Chi phí dự kiến</span><input type="number" min={0} value={planForm.chiPhiDuKien} onChange={(e) => setPlanForm((f) => ({ ...f, chiPhiDuKien: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={planForm.canNgungMay} onChange={(e) => setPlanForm((f) => ({ ...f, canNgungMay: e.target.checked }))} /> <span className="font-medium text-gray-700">Cần ngừng máy</span></label>
              <label className="block space-y-1"><span className="font-medium text-gray-700">Phòng ban phụ trách (ID)</span><input value={planForm.phongBanId} onChange={(e) => setPlanForm((f) => ({ ...f, phongBanId: e.target.value }))} placeholder="Để trống nếu không đổi" className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setPlanTarget(null)} className="rounded-md border border-gray-300 px-4 py-2">Hủy</button>
                <button type="button" onClick={handleConfirmPlan} className="rounded-md bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700">Xác nhận kế hoạch</button>
              </div>
            </div>
          </div>
        </Modal>
      )}
      {acceptanceTarget && (
        <Modal isOpen={!!acceptanceTarget} onClose={() => setAcceptanceTarget(null)} showBackdrop>
          <div className="flex w-full max-w-md flex-col rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-base font-semibold text-gray-900">Đề nghị nghiệm thu — {acceptanceTarget.maYeuCau}</h3>
              <button onClick={() => setAcceptanceTarget(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <label className="block space-y-1"><span className="font-medium text-gray-700">Phiếu xuất kho (warehouseIssueId) — tùy chọn</span><input value={acceptanceForm.warehouseIssueId} onChange={(e) => setAcceptanceForm((f) => ({ ...f, warehouseIssueId: e.target.value }))} placeholder="Nhập ID phiếu xuất nếu có" className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="block space-y-1"><span className="font-medium text-gray-700">Chi phí thực tế — tùy chọn</span><input type="number" min={0} value={acceptanceForm.chiPhiThucTe} onChange={(e) => setAcceptanceForm((f) => ({ ...f, chiPhiThucTe: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAcceptanceTarget(null)} className="rounded-md border border-gray-300 px-4 py-2">Hủy</button>
                <button type="button" onClick={handleConfirmSubmitAcceptance} className="rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700">Đề nghị nghiệm thu</button>
              </div>
            </div>
          </div>
        </Modal>
      )}
      {confirmTarget && (
        <Modal isOpen={!!confirmTarget} onClose={() => setConfirmTarget(null)} showBackdrop>
          <div className="flex w-full max-w-md flex-col rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-base font-semibold text-gray-900">Xác nhận nghiệm thu — {confirmTarget.maYeuCau}</h3>
              <button onClick={() => setConfirmTarget(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <label className="block space-y-1"><span className="font-medium text-gray-700">Kết quả <span className="text-red-500">*</span></span>
                <select value={confirmForm.ketQua} onChange={(e) => setConfirmForm((f) => ({ ...f, ketQua: e.target.value as never }))} className="w-full rounded-md border border-gray-300 px-3 py-2">
                  <option value="">-- Chọn --</option>
                  <option value="DAT">ĐẠT</option>
                  <option value="KHONG_DAT">KHÔNG ĐẠT</option>
                </select>
              </label>
              <label className="block space-y-1"><span className="font-medium text-gray-700">Lý do {confirmForm.ketQua === 'KHONG_DAT' ? <span className="text-red-500">*</span> : <span className="text-gray-400">(tuỳ chọn)</span>}</span><textarea rows={3} value={confirmForm.lyDo} onChange={(e) => setConfirmForm((f) => ({ ...f, lyDo: e.target.value }))} placeholder="Nhập lý do / ghi chú nghiệm thu" className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setConfirmTarget(null)} className="rounded-md border border-gray-300 px-4 py-2">Hủy</button>
                <button type="button" onClick={handleConfirmAcceptanceSubmit} className={`rounded-md px-4 py-2 font-medium text-white ${confirmForm.ketQua === 'KHONG_DAT' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>Xác nhận</button>
              </div>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default RepairRequestList;
