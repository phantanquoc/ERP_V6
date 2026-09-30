import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { Ban, CheckCircle, Edit, Eye, History, Plus, Search, Trash2, Wrench, X } from 'lucide-react';
import AcceptanceHandoverForm from './AcceptanceHandoverForm';
import Modal from './Modal';
import RepairRequestFormModal from './RepairRequestFormModal';
import apiClient from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { can, isCachedPermissionsLoaded } from '../utils/permissions';
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
import {
  useAcceptInspection,
  useCancelInspection,
  useDeleteInspectionRequest,
  useInspectionRequests,
  useInspectionRequestStats,
  useInspectionStatusHistory,
  useStartInspection as useStartInspectionCheck,
} from '../hooks/useInspectionRequests';
import repairRequestService, {
  RepairRequest,
  STATUS_LABELS,
} from '../services/repairRequestService';
import type { RepairRequestStatus } from '../services/repairRequestService';
import inspectionRequestService, {
  type InspectionRequest,
  STATUS_LABELS as INSPECTION_STATUS_LABELS,
} from '../services/inspectionRequestService';
import type { InspectionRequestStatus } from '../services/inspectionRequestService';

type ModalMode = 'create' | 'edit' | 'view';

const PRIORITY_TONE: Record<string, 'red'|'yellow'|'blue'|'gray'> = { 'Khẩn cấp': 'red', 'Cao': 'yellow', 'Trung bình': 'blue', 'Thấp': 'gray' };

const statusBadgeClass = (tone: string) => {
  if (tone === 'green') return 'bg-green-100 text-green-700 border-green-200';
  if (tone === 'blue') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (tone === 'red') return 'bg-red-100 text-red-700 border-red-200';
  if (tone === 'yellow') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';

// ── View constants ──────────────────────────────────────────────────────────
type RepairView = 'KIEM_TRA' | 'SUA_CHUA';
const KIEM_TRA_STATUSES: InspectionRequestStatus[] = ['CHO_XU_LY', 'DA_TIEP_NHAN', 'DANG_KIEM_TRA', 'DA_KIEM_TRA', 'HOAN_THANH', 'DA_HUY', 'TU_CHOI'];
const KIEM_TRA_STATUSES_MAIN: InspectionRequestStatus[] = ['CHO_XU_LY', 'DA_TIEP_NHAN', 'DANG_KIEM_TRA', 'DA_KIEM_TRA', 'HOAN_THANH'];
const SUA_CHUA_STATUSES: RepairRequestStatus[] = Object.keys(STATUS_LABELS) as RepairRequestStatus[];

// Adapter: InspectionRequest -> RepairRequest shape for shared table rendering
type UnifiedRequest = RepairRequest & { _source: 'inspection' | 'repair' };
const adaptInspection = (r: InspectionRequest): UnifiedRequest =>
  ({
    id: r.id,
    ngayThang: r.ngayThang,
    maYeuCau: r.maYeuCau,
    requestType: 'KIEM_TRA',
    sourceInspectionRequestId: null,
    mucDoUuTien: r.mucDoUuTien,
    ghiChu: r.ghiChu ?? null,
    trangThai: r.trangThai as unknown as RepairRequestStatus,
    fileDinhKem: r.fileDinhKem ?? null,
    phongBanId: r.phongBanId ?? null,
    createdById: r.createdById ?? null,
    createdByName: r.createdByName ?? null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    items: (r.items ?? []) as unknown as UnifiedRequest['items'],
    _source: 'inspection',
    ketLuan: (r as unknown as { ketLuan?: string }).ketLuan ?? null,
    phongBan: (r as unknown as { phongBanId?: string }).phongBanId ?? null,
    // carry inspection-only fields for detail view if needed
    ketQuaKiemTra: (r as unknown as { ketQuaKiemTra?: string }).ketQuaKiemTra,
    mucDoHuHong: (r as unknown as { mucDoHuHong?: string }).mucDoHuHong,
    deXuatXuLy: (r as unknown as { deXuatXuLy?: string }).deXuatXuLy,
  } as unknown as UnifiedRequest);

const normalizeType = (raw: string | null): RepairView | '' => {
  if (!raw) return '';
  const up = raw.toUpperCase();
  if (up === 'KIEM_TRA' || up === 'KIEMTRA') return 'KIEM_TRA';
  if (up === 'SUA_CHUA' || up === 'SUACHUA') return 'SUA_CHUA';
  return '';
};
const typeToUrl = (v: RepairView) => v.toLowerCase(); // kiem_tra | sua_chua

interface RepairRequestListProps {
  lockedMachineSystemId?: string;
}

const RepairRequestList = ({ lockedMachineSystemId }: RepairRequestListProps = {}) => {
  const { user } = useAuth();
  const isAdmin = isCachedPermissionsLoaded() ? can('repair-requests', 'DELETE', user?.role as string) : user?.role === UserRole.ADMIN;
  const canUpdateRepair = isCachedPermissionsLoaded() ? can('repair-requests', 'UPDATE', user?.role as string) : (user?.role === UserRole.ADMIN || user?.role === UserRole.DEPARTMENT_HEAD || user?.role === UserRole.TEAM_LEAD);
  const [searchParams, setSearchParams] = useSearchParams();
  const filterSyncRef = useRef(false);
  const detailSyncRef = useRef(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const VALID_STATUS_UNION = new Set([...Object.keys(STATUS_LABELS), ...Object.keys(INSPECTION_STATUS_LABELS)]);
  const parseRepairPage = (v: string | null, fallback: number) => {
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) && n >= 1 ? n : fallback;
  };
  const parseRepairLimit = (v: string | null, fallback: number) => {
    const n = v ? parseInt(v, 10) : NaN;
    return Number.isFinite(n) && n >= 1 && n <= 100 ? n : fallback;
  };
  const parseRepairFiltersFromUrl = (sp: URLSearchParams): { page: number; limit: number; search: string; trangThai: string; requestType: string } => {
    const q = sp.get('q') ?? sp.get('search') ?? '';
    const status = sp.get('status') ?? sp.get('trangThai') ?? '';
    const rtRaw = sp.get('type') ?? sp.get('requestType') ?? '';
    const rtNorm = normalizeType(rtRaw);
    const page = parseRepairPage(sp.get('page'), 1);
    const limit = parseRepairLimit(sp.get('limit'), lockedMachineSystemId ? 200 : 10);
    const normalizedStatus = VALID_STATUS_UNION.has(status) ? status : '';
    return { page, limit, search: q, trangThai: normalizedStatus, requestType: rtNorm };
  };
  const initialParsed = (() => {
    const sp = new URLSearchParams(window.location.search);
    const q = sp.get('q') ?? sp.get('search') ?? '';
    const status = sp.get('status') ?? sp.get('trangThai') ?? '';
    const rtRaw = sp.get('type') ?? sp.get('requestType') ?? '';
    const rtNorm = normalizeType(rtRaw);
    const page = parseRepairPage(sp.get('page'), 1);
    const limit = parseRepairLimit(sp.get('limit'), lockedMachineSystemId ? 200 : 10);
    const normalizedStatus = VALID_STATUS_UNION.has(status) ? status : '';
    // backward compat: no type param → default SUA_CHUA (full table backward compatible)
    const defaultRt: RepairView = 'SUA_CHUA';
    return { page, limit, search: q, trangThai: normalizedStatus, requestType: rtNorm || defaultRt };
  })();
  const [filters, setFilters] = useState(initialParsed);
  const [searchInput, setSearchInput] = useState(initialParsed.search);

  // Derived view — always one of the two (no "all")
  const activeView: RepairView = (filters.requestType as RepairView) === 'KIEM_TRA' ? 'KIEM_TRA' : 'SUA_CHUA';

  const today = new Date().toISOString().split('T')[0];
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [statsDateFrom, setStatsDateFrom] = useState(ninetyDaysAgo);
  const [statsDateTo, setStatsDateTo] = useState(today);
  const isKiemTra = activeView === 'KIEM_TRA';
  const repairStatsQuery = useRepairRequestStats({
    dateFrom: statsDateFrom,
    dateTo: statsDateTo,
    machineSystemId: lockedMachineSystemId,
    requestType: 'SUA_CHUA' as never,
  }, { enabled: !isKiemTra });
  const inspectionStatsQuery = useInspectionRequestStats({
    dateFrom: statsDateFrom,
    dateTo: statsDateTo,
  }, { enabled: isKiemTra });
  const statsQuery = isKiemTra ? inspectionStatsQuery : repairStatsQuery;
  const stats = statsQuery.data?.data as unknown as { byStatus?: Record<string, number>; delta?: { total?: number; byStatus?: Record<string, number>; avgCompletionHours?: number | null }; avgCompletionHours?: number | null; topMachines?: { machineSystemId: string | null; tenHeThong: string | null; count: number }[]; recurringItems?: { machineSystemDetailId: string | null; tenChiTiet: string | null; count: number; latestMaYeuCau: string | null }[]; monthlyTrend?: { month: string; total: number; hoanThanh: number }[]; recentlyCreated?: { id: number; maYeuCau: string; tenHeThongThietBi: string | null; trangThai: string; createdAt: string }[] } | undefined;

  useEffect(() => {
    if (lockedMachineSystemId) {
      setFilters((value) => ({ ...value, limit: 200, page: 1 }));
    }
  }, [lockedMachineSystemId]);

  const repairRequestsQuery = useRepairRequests({
    page: filters.page,
    limit: filters.limit,
    search: filters.search || undefined,
    trangThai: (filters.trangThai as any) || undefined,
    requestType: 'SUA_CHUA' as never,
  }, { enabled: !isKiemTra });
  const inspectionRequestsQuery = useInspectionRequests({
    page: filters.page,
    limit: filters.limit,
    search: filters.search || undefined,
    trangThai: (filters.trangThai as unknown as InspectionRequestStatus) || undefined,
  }, { enabled: isKiemTra });
  const requestsQuery = isKiemTra ? inspectionRequestsQuery : repairRequestsQuery;

  const deleteInspection = useDeleteInspectionRequest();
  const deleteRequest = useDeleteRepairRequest();
  const startRepair = useStartRepair();
  const cancelRepair = useCancelRepair();
  const acceptRepair = useAcceptRepair();
  const planRepair = usePlanRepair();
  const submitAcceptance = useSubmitAcceptance();
  const confirmAcceptance = useConfirmAcceptance();
  const completeRepair = useCompleteRepair();
  const acceptInspection = useAcceptInspection();
  const startInspection = useStartInspectionCheck();
  const cancelInspection = useCancelInspection();

  const rawRepairRequests = (repairRequestsQuery.data?.data ?? []) as RepairRequest[];
  const rawInspectionRequests = (inspectionRequestsQuery.data?.data ?? []) as InspectionRequest[];
  const rawUnified: UnifiedRequest[] = useMemo(() => {
    if (isKiemTra) return rawInspectionRequests.map(adaptInspection);
    return (rawRepairRequests as unknown as UnifiedRequest[]).map(r => ({ ...r, _source: 'repair' as const }));
  }, [isKiemTra, rawRepairRequests, rawInspectionRequests]);
  const requests: UnifiedRequest[] = useMemo(() => {
    if (!lockedMachineSystemId) return rawUnified;
    return rawUnified.filter((request) =>
      (request.items as unknown as { machineSystemId?: string | null }[] | undefined)?.some((item) => item.machineSystemId === lockedMachineSystemId)
    );
  }, [rawUnified, lockedMachineSystemId]);
  const serverPagination = (requestsQuery as unknown as { data?: { pagination?: { page: number; totalPages: number; total: number } } }).data?.pagination;
  const pagination = useMemo(() => {
    if (!lockedMachineSystemId) return serverPagination;
    if (!serverPagination) return undefined;
    // Client-side filter by machineSystemId makes server total stale — recompute from filtered set
    const total = requests.length;
    const limit = filters.limit || 200;
    return { page: 1, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }, [lockedMachineSystemId, serverPagination, requests.length, filters.limit]);

  // ui-dna: hide Ke hoach column when all rows have no ngayHoanThienDuKien
  const showKeHoachCol = useMemo(() => {
    if (activeView !== 'SUA_CHUA') return false;
  void showKeHoachCol;
    return requests.some((r) => !!(r as unknown as { ngayHoanThienDuKien?: string }).ngayHoanThienDuKien);
  }, [requests, activeView]);

  const [modal, setModal] = useState<{ mode: ModalMode; record?: RepairRequest } | null>(null);
  const [handoverRequest, setHandoverRequest] = useState<RepairRequest | null>(null);
  const [historyRequestId, setHistoryRequestId] = useState<number | null>(null);
  // inspection vs repair history — pick based on _source of modal/record or activeView
  const historySource: 'inspection' | 'repair' = useMemo(() => {
    const recSource = (modal?.record as unknown as UnifiedRequest | undefined)?._source;
    if (recSource) return recSource;
    // fallback to activeView when opening via history button before modal
    return isKiemTra ? 'inspection' : 'repair';
  }, [modal?.record, isKiemTra]);
  const repairHistoryQuery = useRepairStatusHistory(historySource === 'repair' ? historyRequestId : null);
  const inspectionHistoryQuery = useInspectionStatusHistory(historySource === 'inspection' ? historyRequestId : null);
  const statusHistoryQuery = historySource === 'inspection' ? inspectionHistoryQuery : repairHistoryQuery;
  const [cancelTarget, setCancelTarget] = useState<UnifiedRequest | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const openModal = (mode: ModalMode, record?: RepairRequest) => {
    setModal({ mode, record });
    if (mode === 'view' && record?.id != null) {
      const next = new URLSearchParams(searchParams);
      next.set('repairId', String(record.id));
      next.delete('repairRequestId');
      next.set('type', typeToUrl(activeView));
      if (next.get('sub') !== 'repair') next.set('sub', 'repair');
      if (next.get('tab') !== 'repairAndFault') next.set('tab', 'repairAndFault');
      detailSyncRef.current = true;
      setSearchParams(next);
    } else if (mode === 'create') {
      const next = new URLSearchParams(searchParams);
      next.set('create', 'repair');
      next.set('type', typeToUrl(activeView));
      if (next.get('sub') !== 'repair') next.set('sub', 'repair');
      if (next.get('tab') !== 'repairAndFault') next.set('tab', 'repairAndFault');
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
    const urlType = typeToUrl(activeView);
    if (next.get('type') !== urlType) { next.set('type', urlType); changed = true; }
    next.delete('requestType');
    const defaultLimit = lockedMachineSystemId ? 200 : 10;
    const pageVal = String(filters.page ?? 1);
    const limitVal = String(filters.limit ?? defaultLimit);
    if ((next.get('page') ?? '1') !== pageVal) { if (pageVal === '1') next.delete('page'); else next.set('page', pageVal); changed = true; }
    if ((next.get('limit') ?? String(defaultLimit)) !== limitVal) { if (Number(limitVal) === defaultLimit) next.delete('limit'); else next.set('limit', limitVal); changed = true; }
    if (!changed) return;
    filterSyncRef.current = true;
    setSearchParams(next, { replace: true });
  }, [filters, activeView]);

  // URL -> filters + searchInput
  useEffect(() => {
    if (filterSyncRef.current) { filterSyncRef.current = false; return; }
    const parsed = parseRepairFiltersFromUrl(searchParams);
    const urlQ = parsed.search;
    const normalizedStatus = parsed.trangThai;
    // if URL has no type, keep current view (default SUA_CHUA already in initialParsed)
    const rtFromUrl = (parsed as unknown as { requestType: string }).requestType;
    const normalizedRt = rtFromUrl || activeView;
    const page = parsed.page;
    const limit = parsed.limit;
    let needs = false;
    if ((filters.search ?? '') !== urlQ) needs = true;
    if ((filters.trangThai ?? '') !== normalizedStatus) needs = true;
    if (((filters as unknown as { requestType?: string }).requestType ?? '') !== normalizedRt) needs = true;
    if (filters.page !== page || filters.limit !== limit) needs = true;
    if (needs) setFilters({ page, limit, search: urlQ, trangThai: normalizedStatus, requestType: normalizedRt } as never);
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

  // Validate trangThai when switching view: if current status not in view's allowed set, clear it
  const handleViewChange = (view: RepairView) => {
    setFilters((f) => {
      const allowed = view === 'KIEM_TRA' ? new Set<string>(KIEM_TRA_STATUSES) : new Set<string>(SUA_CHUA_STATUSES);
      const keepStatus = f.trangThai && allowed.has(f.trangThai) ? f.trangThai : '';
      return { ...f, requestType: view as never, trangThai: keepStatus, page: 1 };
    });
  };

  const repairIdParam = searchParams.get('repairId');
  const repairRequestIdParam = searchParams.get('repairRequestId');
  const inspectionIdParam = searchParams.get('inspectionId');
  const createParam = searchParams.get('create');
  useEffect(() => {
    if (detailSyncRef.current) { detailSyncRef.current = false; return; }
    const createVal = createParam;
    if (createVal === 'repair') {
      if (!modal || modal.mode !== 'create') setModal({ mode: 'create' });
    } else if (modal?.mode === 'create') {
      setModal(null);
    }
    const repairId = repairIdParam ?? repairRequestIdParam ?? inspectionIdParam;
    if (!repairId) {
      if (modal?.mode === 'view' && modal.record?.id != null) setModal(null);
      return;
    }
    if (modal?.mode === 'view' && String(modal.record?.id) === String(repairId)) return;
    let cancelled = false;
    const urlType = normalizeType(searchParams.get('type'));
    const isInspectionParam = !!inspectionIdParam && String(inspectionIdParam) === String(repairId);
    const tryInspectionFirst = isInspectionParam || urlType === 'KIEM_TRA';
    const preferRepairWhenAmbiguous = !isInspectionParam && !urlType;
    const primaryIsInspection = preferRepairWhenAmbiguous ? false : tryInspectionFirst;
    const shouldFallback = !urlType || isInspectionParam;
    const getPrimary = () => primaryIsInspection ? inspectionRequestService.getById(repairId) : repairRequestService.getById(repairId);
    const getFallback = () => primaryIsInspection ? repairRequestService.getById(repairId) : inspectionRequestService.getById(repairId);
    getPrimary().then((res) => {
      if (cancelled) return;
      const record = res?.data as unknown as RepairRequest | InspectionRequest | undefined;
      if (record?.id != null) {
        const isInspection = primaryIsInspection;
        const adapted = isInspection ? adaptInspection(record as InspectionRequest) as unknown as RepairRequest : record as RepairRequest;
        const recType: RepairView | undefined = isInspection ? 'KIEM_TRA' : (record as unknown as { requestType?: string }).requestType as RepairView | undefined;
        if (recType && recType !== activeView) {
          setFilters((f) => ({ ...f, requestType: recType as never }));
        }
        setModal({ mode: 'view', record: adapted });
      } else {
        throw new Error('empty');
      }
      if (searchParams.has('repairRequestId') && !searchParams.has('repairId')) {
        const next = new URLSearchParams(searchParams);
        next.set('repairId', String(repairId));
        next.delete('repairRequestId');
        detailSyncRef.current = true;
        setSearchParams(next, { replace: true });
      }
    }).catch(() => {
      if (!shouldFallback) {
        console.warn(`Deep-link ${repairId} not found for type=${urlType ?? 'unknown'} — skip fallback to avoid cross-table 404 spam`);
        return;
      }
      getFallback().then((res2) => {
        if (cancelled) return;
        const record2 = res2?.data as unknown as RepairRequest | InspectionRequest | undefined;
        if (record2?.id != null) {
          const isInspection2 = !primaryIsInspection;
          const adapted2 = isInspection2 ? adaptInspection(record2 as InspectionRequest) as unknown as RepairRequest : record2 as RepairRequest;
          const recType2: RepairView | undefined = isInspection2 ? 'KIEM_TRA' : (record2 as unknown as { requestType?: string }).requestType as RepairView | undefined;
          if (recType2 && recType2 !== activeView) {
            setFilters((f) => ({ ...f, requestType: recType2 as never }));
          }
          setModal({ mode: 'view', record: adapted2 });
        } else {
          console.warn(`Deep-link ${repairId} not found in either table`);
        }
      }).catch((err) => { console.warn('Deep-link fallback not found:', repairId, err instanceof Error ? err.message : err); }).catch(()=>null);
    }).catch(()=>null);
    return () => { cancelled = true; };
  }, [repairIdParam, repairRequestIdParam, inspectionIdParam, createParam, searchParams, activeView]);

  const remove = async (record: UnifiedRequest | RepairRequest) => {
    if (!confirm(`Xóa yêu cầu ${record.maYeuCau}?`)) return;
    try {
      const isInspection = (record as UnifiedRequest)._source === 'inspection';
      if (isInspection) await deleteInspection.mutateAsync(record.id as number);
      else await deleteRequest.mutateAsync(record.id);
      toast.success(isInspection ? 'Đã xóa yêu cầu kiểm tra' : 'Đã xóa yêu cầu sửa chữa');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không xóa được yêu cầu');
    }
  };

  const exportExcel = async () => {
    try {
      if (isKiemTra) await inspectionRequestService.exportExcel({ search: filters.search || undefined });
      else await repairRequestService.exportExcel({ search: filters.search || undefined });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không xuất được Excel');
    }
  };

  const handleStartRepair = async (record: RepairRequest) => {
    if (!confirm(`Bắt đầu sửa chữa cho yêu cầu ${record.maYeuCau}?`)) return;
    try {
      await startRepair.mutateAsync(record.id);
      toast.success('Đã bắt đầu sửa chữa');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể bắt đầu sửa chữa');
    }
  };

  const handleAccept = async (record: UnifiedRequest | RepairRequest) => {
    const isInspection = (record as UnifiedRequest)._source === 'inspection';
    try {
      if (isInspection) await acceptInspection.mutateAsync(record.id);
      else await acceptRepair.mutateAsync(record.id);
      toast.success('Đã tiếp nhận');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Không thể tiếp nhận'); }
  };
  const handleStartInspection = async (record: UnifiedRequest | RepairRequest) => {
    if (!confirm(`Bắt đầu kiểm tra cho yêu cầu ${record.maYeuCau}?`)) return;
    try { await startInspection.mutateAsync(record.id); toast.success('Đã bắt đầu kiểm tra'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Không thể bắt đầu kiểm tra'); }
  };

  // ── Plan / Acceptance / Confirm modals state ──
  const [planTarget, setPlanTarget] = useState<UnifiedRequest | null>(null);
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
  const [acceptanceTarget, setAcceptanceTarget] = useState<UnifiedRequest | null>(null);
  const [acceptanceForm, setAcceptanceForm] = useState({ warehouseIssueId: '', chiPhiThucTe: '' });
  const [confirmTarget, setConfirmTarget] = useState<UnifiedRequest | null>(null);
  const [confirmForm, setConfirmForm] = useState({ ketQua: '' as '' | 'DAT' | 'KHONG_DAT', lyDo: '', chiPhiThucTe: '' });

  const openPlanModal = (record: UnifiedRequest | RepairRequest) => {
    const r = record as UnifiedRequest;
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
  const openAcceptanceModal = (record: UnifiedRequest | RepairRequest) => {
    setAcceptanceForm({ warehouseIssueId: '', chiPhiThucTe: '' });
    setAcceptanceTarget(record as UnifiedRequest);
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
  const openConfirmModal = (record: UnifiedRequest | RepairRequest, ketQua: 'DAT' | 'KHONG_DAT') => {
    setConfirmForm({ ketQua, lyDo: '', chiPhiThucTe: '' });
    setConfirmTarget(record as UnifiedRequest);
  };
  const handleConfirmAcceptanceSubmit = async () => {
    if (!confirmTarget) return;
    if (!confirmForm.ketQua) { toast.error('Vui lòng chọn kết quả'); return; }
    if (!confirmForm.lyDo.trim()) { toast.error('Vui lòng nhập lý do'); return; }
    let chiPhi: number | undefined;
    if (confirmForm.chiPhiThucTe !== '') {
      const n = Number(confirmForm.chiPhiThucTe);
      if (!Number.isFinite(n) || n < 0) { toast.error('Chi phí thực tế phải >= 0'); return; }
      chiPhi = n;
    }
    try {
      await confirmAcceptance.mutateAsync({ id: confirmTarget.id as unknown as number, payload: { ketQua: confirmForm.ketQua, ...(chiPhi !== undefined ? { chiPhiThucTe: chiPhi } : {}), lyDo: confirmForm.lyDo.trim() } as unknown as never });
      toast.success(confirmForm.ketQua === 'DAT' ? 'Đã xác nhận ĐẠT' : 'Đã xác nhận KHÔNG ĐẠT');
      setConfirmTarget(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Không thể xác nhận'); }
  };

  // Compat aliases for row actions that call handlePlan/handleSubmitAcceptance/handleConfirmDat
  const handlePlan = (record: RepairRequest) => openPlanModal(record as unknown as UnifiedRequest);
  const handleSubmitAcceptance = (record: RepairRequest) => openAcceptanceModal(record as unknown as UnifiedRequest);
  const handleConfirmDat = (record: RepairRequest) => openConfirmModal(record as unknown as UnifiedRequest, 'DAT');

  const handleComplete = async (record: RepairRequest) => {
    try { await completeRepair.mutateAsync(record.id); toast.success('Đã hoàn thành'); }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Không thể hoàn thành'); }
  };

  const handleCreateRepairFromInspection = async (record: RepairRequest) => {
    setModal({ mode: 'create', record: { ...record, sourceInspectionRequestId: String(record.id) } as unknown as RepairRequest });
  };
  void handlePlan; void handleSubmitAcceptance; void handleConfirmDat; void handleCreateRepairFromInspection;

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      const isInspectionTarget = (cancelTarget as UnifiedRequest)._source === 'inspection';
      if (isInspectionTarget) {
        await cancelInspection.mutateAsync({ id: cancelTarget.id, reason: cancelReason || undefined });
        toast.success('Đã hủy yêu cầu kiểm tra');
      } else {
        await cancelRepair.mutateAsync({ id: cancelTarget.id, reason: cancelReason || undefined });
        toast.success('Đã hủy yêu cầu sửa chữa');
      }
      setCancelTarget(null);
      setCancelReason('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể hủy yêu cầu');
    }
  };

  // Badge counts from stats.byStatus
  const countFor = (key: string) => (stats?.byStatus?.[key] as number | undefined) ?? 0;
  const kiemTraTotal = KIEM_TRA_STATUSES.reduce((s, k) => s + countFor(k), 0);
  const suaChuaTotal = SUA_CHUA_STATUSES.reduce((s, k) => s + countFor(k), 0);

  const statusOptions = activeView === 'KIEM_TRA' ? KIEM_TRA_STATUSES_MAIN : SUA_CHUA_STATUSES;
  const activeStatusLabels = isKiemTra ? INSPECTION_STATUS_LABELS : STATUS_LABELS;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Yêu cầu sửa chữa</h2>
          <p className="text-xs text-gray-500">Mỗi yêu cầu có thể gồm nhiều thiết bị lỗi, có hoặc không có liên kết máy.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportExcel} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">Xuất Excel</button>
          {/* Sua chua create only for canUpdate; Kiem tra create allowed for all */}
          {(activeView === 'KIEM_TRA' || canUpdateRepair) && (
            <button type="button" onClick={() => openModal('create')} className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"><Plus className="h-4 w-4" /> Thêm mới</button>
          )}
        </div>
      </div>

      {/* Date range control */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-gray-700">Từ:</span>
        <input
          type="date"
          value={statsDateFrom}
          max={statsDateTo}
          onChange={(e) => setStatsDateFrom(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
        <span className="font-medium text-gray-700">Đến:</span>
        <input
          type="date"
          value={statsDateTo}
          min={statsDateFrom}
          onChange={(e) => setStatsDateTo(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>

      {statsQuery.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Không thể tải thống kê yêu cầu sửa chữa.
        </div>
      )}

      {/* Stats: two-row or toggle per requestType — show pills with badge counts */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statsQuery.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border bg-white px-4 py-3 animate-pulse">
              <div className="h-3 w-20 rounded bg-gray-200 mb-2" />
              <div className="h-7 w-10 rounded bg-gray-200" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Tổng"
              value={activeView === 'KIEM_TRA' ? kiemTraTotal : suaChuaTotal}
              delta={stats?.delta?.byStatus ? undefined : stats?.delta?.total}
              deltaLabel="vs kỳ trước"
              onClick={() => setFilters((f) => ({ ...f, trangThai: '', page: 1 }))}
              className={!filters.trangThai ? 'ring-2 ring-blue-400' : ''}
            />
            <StatCard
              label={STATUS_LABELS.CHO_XU_LY.label}
              value={countFor('CHO_XU_LY')}
              delta={stats?.delta?.byStatus?.['CHO_XU_LY']}
              onClick={() => setFilters((f) => ({ ...f, trangThai: 'CHO_XU_LY', page: 1 }))}
              className={filters.trangThai === 'CHO_XU_LY' ? 'ring-2 ring-blue-400' : ''}
            />
            <StatCard
              label={activeView === 'KIEM_TRA' ? STATUS_LABELS.DA_TIEP_NHAN.label : STATUS_LABELS.DANG_SUA_CHUA.label}
              value={activeView === 'KIEM_TRA' ? countFor('DA_TIEP_NHAN') : countFor('DANG_SUA_CHUA')}
              delta={activeView === 'KIEM_TRA' ? stats?.delta?.byStatus?.['DA_TIEP_NHAN'] : stats?.delta?.byStatus?.['DANG_SUA_CHUA']}
              onClick={() => setFilters((f) => ({ ...f, trangThai: activeView === 'KIEM_TRA' ? 'DA_TIEP_NHAN' : 'DANG_SUA_CHUA', page: 1 }))}
              className={filters.trangThai === (activeView === 'KIEM_TRA' ? 'DA_TIEP_NHAN' : 'DANG_SUA_CHUA') ? 'ring-2 ring-blue-400' : ''}
            />
            <StatCard
              label={STATUS_LABELS.HOAN_THANH.label}
              value={countFor('HOAN_THANH')}
              delta={stats?.delta?.byStatus?.['HOAN_THANH']}
              deltaLabel={stats?.avgCompletionHours != null ? `Tb. ${Math.round(stats.avgCompletionHours)}h` : undefined}
              onClick={() => setFilters((f) => ({ ...f, trangThai: 'HOAN_THANH', page: 1 }))}
              className={filters.trangThai === 'HOAN_THANH' ? 'ring-2 ring-blue-400' : ''}
            />
          </>
        )}
      </div>

      <CollapsibleSection title="Máy hay yêu cầu sửa chữa nhất">
        {statsQuery.isLoading ? (
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
        {statsQuery.isLoading ? (
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
        {statsQuery.isLoading ? (
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
        {statsQuery.isLoading ? (
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
                    const svc = isKiemTra ? inspectionRequestService.getById(String(r.id)) : repairRequestService.getById(r.id);
                    const fallbackSvc = isKiemTra ? repairRequestService.getById(r.id) : inspectionRequestService.getById(String(r.id));
                    svc.then((res) => {
                      if (res?.data) openModal('view', res.data as unknown as RepairRequest);
                      else throw new Error('empty');
                    }).catch(() => {
                      fallbackSvc.then((res2) => { if (res2?.data) openModal('view', res2.data as unknown as RepairRequest); }).catch(() => {/* no-op */}).catch(()=>null);
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
                  <StatusBadge label={(STATUS_LABELS as Record<string, { label: string; tone: string }>)[r.trangThai]?.label ?? r.trangThai} tone={((STATUS_LABELS as Record<string, { label: string; tone: string }>)[r.trangThai]?.tone ?? 'gray') as never} size="sm" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CollapsibleSection>

      <section className="rounded-lg border border-gray-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-gray-200 p-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary segmented: Kiểm tra | Sửa chữa with badge counts */}
            <div className="inline-flex rounded-lg border bg-gray-100 p-0.5">
              {(['KIEM_TRA', 'SUA_CHUA'] as const).map(v => {
                const isActive = activeView === v;
                const badgeCount = v === 'KIEM_TRA' ? kiemTraTotal : suaChuaTotal;
                return (
                  <button key={v} onClick={() => handleViewChange(v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md ${isActive ? 'bg-white shadow border' : 'text-gray-600'}`}>
                    {v==='KIEM_TRA' ? 'Kiểm tra' : 'Sửa chữa'}
                    <span className={`inline-flex min-w-[18px] justify-center rounded-full px-1 py-0.5 text-[10px] leading-none ${isActive ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600'}`}>{badgeCount}</span>
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm mã, thiết bị, người yêu cầu..." title="Tìm theo mã yêu cầu, tên thiết bị hoặc người tạo" className="w-48 rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm placeholder:text-gray-400" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Secondary status filter with badge pills */}
            <select value={filters.trangThai} onChange={(event) => setFilters((value) => ({ ...value, trangThai: event.target.value, page: 1 }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Tất cả trạng thái ({(isKiemTra ? KIEM_TRA_STATUSES : SUA_CHUA_STATUSES).length})</option>
              {(isKiemTra ? KIEM_TRA_STATUSES : SUA_CHUA_STATUSES).map((key) => {
                const c = countFor(key);
                const lbl = (activeStatusLabels as Record<string, { label: string }>)[key]?.label ?? key;
                return <option key={key} value={key}>{lbl} {c ? `(${c})` : ''}</option>;
              })}
            </select>
            {/* Quick pill filters — kiem_tra shows 5 main only */}
            <div className="flex flex-wrap items-center gap-1">
              {(isKiemTra ? statusOptions : statusOptions.slice(0, 4)).map((key) => {
                const active = filters.trangThai === key;
                const c = countFor(key);
                const lbl = (activeStatusLabels as Record<string, { label: string }>)[key]?.label ?? key;
                return (
                  <button key={key} type="button" onClick={() => setFilters((f) => ({ ...f, trangThai: active ? '' : key, page: 1 }))}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}>
                    {lbl} {c ? <span className={`rounded-full px-1 text-[10px] ${active ? 'bg-white text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{c}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {activeView === 'KIEM_TRA' ? (
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                <tr>
                  <th className="border-b px-3 py-2.5 text-left sticky left-0 bg-gray-50 z-10 min-w-[90px]">Mã</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[90px]">Ngày</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[110px]">Người phát hiện</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[110px]">Bộ phận</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[140px]">Thiết bị</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[90px]">Khu vực</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[90px]">Trạng thái</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[100px]">Kết luận</th>
                  <th className="border-b px-3 py-2.5 text-right sticky right-0 bg-gray-50 z-10 min-w-[160px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requestsQuery.isLoading ? (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400">Đang tải...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400">Chưa có yêu cầu kiểm tra.</td></tr>
                ) : requests.map((request) => {
                  const requestItems = request.items?.length ? request.items : [{
                    id: `${request.id}-legacy`,
                    repairRequestId: request.id,
                    tenHeThong: request.tenHeThong ?? '',
                    tinhTrangThietBi: request.tinhTrangThietBi ?? '',
                    loaiLoi: request.loaiLoi ?? '',
                    noiDungLoi: request.noiDungLoi ?? '',
                  }];
                  const firstItem: any = requestItems[0];
                  const khuVuc = (request as any).khuVuc || firstItem?.machineSystem?.tenHeThong || (request as any).phongBanId || '—';
                  const ketLuan = (request as unknown as { ketLuan?: string | null }).ketLuan ?? null;
                  const ketLuanTone = ketLuan === 'CAN_SUA_CHUA' ? 'yellow' : ketLuan === 'KHONG_CAN' ? 'green' : ketLuan === 'THEO_DOI' ? 'blue' : 'gray';
                  const ketLuanLabel = ketLuan === 'CAN_SUA_CHUA' ? 'Cần SC' : ketLuan === 'KHONG_CAN' ? 'Không cần' : ketLuan === 'THEO_DOI' ? 'Theo dõi' : '—';
                  const boPhanLabel = (request as unknown as { phongBanId?: string | null }).phongBanId ?? '—';
                  return (
                    <tr key={request.id} onClick={() => openModal('view', request)} className="border-b border-gray-200 hover:bg-blue-100 border-l-2 border-l-transparent hover:border-l-blue-500 cursor-pointer transition-all">
                      <td className="px-3 py-2.5 sticky left-0 bg-white z-10 font-mono text-xs text-blue-700 font-medium">{request.maYeuCau}</td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs">{formatDate(request.ngayThang)}</td>
                      <td className="px-3 py-2.5 text-gray-700 text-xs">{request.createdByName || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs">{boPhanLabel}</td>
                      <td className="px-3 py-2.5 text-gray-900 text-xs">{requestItems.map((it: any) => <div key={it.id} className="leading-tight">{it.tenHeThong || '—'}</div>)}</td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs">{khuVuc}</td>
                      <td className="px-3 py-2.5"><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(INSPECTION_STATUS_LABELS[request.trangThai as InspectionRequestStatus]?.tone ?? STATUS_LABELS[request.trangThai as RepairRequestStatus]?.tone ?? 'gray')}`}>{INSPECTION_STATUS_LABELS[request.trangThai as InspectionRequestStatus]?.label ?? STATUS_LABELS[request.trangThai as RepairRequestStatus]?.label ?? request.trangThai}</span></td>
                      <td className="px-3 py-2.5"><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(ketLuanTone)}`}>{ketLuanLabel}</span></td>
                      <td className="px-3 py-2.5 sticky right-0 bg-white z-10">
                        {(() => {
                          const isTerminal = request.trangThai === 'HOAN_THANH' || request.trangThai === 'DA_HUY' || request.trangThai === 'TU_CHOI';
                          const iconBtn = (cls: string) => `inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors ${cls}`;
                          const acts: { title: string; icon: JSX.Element; onClick: (e: React.MouseEvent) => void; cls: string }[] = [];
                          // Xem luôn có
                          acts.push({ title: 'Xem chi tiết', icon: <Eye className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); openModal('view', request); }, cls: 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50' });
                          if (!isTerminal) acts.push({ title: 'Sửa', icon: <Edit className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); openModal('edit', request); }, cls: 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50' });
                          acts.push({ title: 'Lịch sử', icon: <History className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); setHistoryRequestId(request.id); }, cls: 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50' });
                          if (!isTerminal) acts.push({ title: 'Hủy phiếu', icon: <Ban className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); setCancelTarget(request); setCancelReason(''); }, cls: 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' });
                          if (isAdmin) acts.push({ title: 'Xóa', icon: <Trash2 className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); remove(request); }, cls: 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' });
                          // primary theo trạng thái — đặt đầu
                          if (request.trangThai === 'CHO_XU_LY') acts.unshift({ title: 'Tiếp nhận', icon: <CheckCircle className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); handleAccept(request); }, cls: 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700' });
                          else if (request.trangThai === 'DA_TIEP_NHAN') acts.unshift({ title: 'Bắt đầu kiểm tra', icon: <Wrench className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); handleStartInspection(request); }, cls: 'bg-amber-600 border-amber-600 text-white hover:bg-amber-700' });
                          return (
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              {acts.map((a, i) => (
                                <button key={i} type="button" title={a.title} aria-label={a.title} onClick={a.onClick} className={iconBtn(a.cls)}><span className="sr-only">{a.title}</span>{a.icon}</button>
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                <tr>
                  <th className="border-b px-3 py-2.5 text-left sticky left-0 bg-gray-50 z-10 min-w-[90px]">Mã</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[95px]">Ngày</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[110px]">Nguồn KT</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[85px]">Ưu tiên</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[120px]">Thiết bị</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[100px]">Trạng thái</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[140px]">Yêu cầu/Đã cấp/Còn thiếu</th>
                  <th className="border-b px-3 py-2.5 text-right sticky right-0 bg-gray-50 z-10 min-w-[160px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requestsQuery.isLoading ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">Đang tải...</td></tr>
                ) : requests.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">Chưa có yêu cầu sửa chữa.</td></tr>
                ) : requests.map((request) => {
                  const srcMa = (request as unknown as { inspectionRequest?: { maYeuCau?: string } })?.inspectionRequest?.maYeuCau ?? null;
                  const srcId = (request as unknown as { sourceInspectionRequestId?: string | number | null })?.sourceInspectionRequestId ?? null;
                  const itemNames = ((request as unknown as { items?: { tenHeThong: string }[] })?.items ?? []).map(j=>j.tenHeThong).filter(Boolean).join(', ') || '—';
                  const needs = ((request as unknown as { materialNeeds?: { soLuongDuKien: unknown; soLuongThucTe: unknown }[] })?.materialNeeds ?? []) as { soLuongDuKien: unknown; soLuongThucTe: unknown }[];
                  const fromItemsNeeds = ((request as unknown as { items?: { materialNeeds?: { soLuongDuKien: unknown; soLuongThucTe: unknown }[] }[] })?.items ?? []).flatMap(it => it.materialNeeds ?? []) as { soLuongDuKien: unknown; soLuongThucTe: unknown }[];
                  const allNeeds = [...needs, ...fromItemsNeeds];
                  // dedup by id if items carry m.id (when from items they have id, but above map loses it — approximate via loop below without dedup is okay)
                  const yeuCau = allNeeds.reduce((s,m)=> s + (Number(m.soLuongDuKien) || 0), 0);
                  const daCap = allNeeds.reduce((s,m)=> s + (Number(m.soLuongThucTe) || 0), 0);
                  const conThieu = Math.max(0, yeuCau - daCap);
                  return (
                    <tr key={request.id} onClick={() => openModal('view', request)} className="border-b border-gray-200 hover:bg-blue-100 border-l-2 border-l-transparent hover:border-l-blue-500 cursor-pointer transition-all">
                      <td className="px-3 py-2.5 sticky left-0 bg-white z-10 font-mono text-xs text-blue-700 font-medium">{request.maYeuCau}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{formatDate((request as unknown as { ngayThang?: string })?.ngayThang ?? (request as unknown as { createdAt?: string })?.createdAt)}</td>
                      <td className="px-3 py-2.5 text-xs">{srcMa ? <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-700 font-mono">{srcMa}</span> : srcId ? <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-amber-700">YC-KT#{String(srcId).slice(0,6)}</span> : <span className="text-gray-400">—</span>}</td>
                      <td className="px-3 py-2.5"><StatusBadge label={(request as unknown as { mucDoUuTien?: string })?.mucDoUuTien ?? '—'} tone={PRIORITY_TONE[String((request as unknown as { mucDoUuTien?: string })?.mucDoUuTien ?? '')] ?? 'gray'} size="sm" /></td>
                      <td className="px-3 py-2.5 text-xs text-gray-800 truncate max-w-[160px]" title={itemNames}>{itemNames}</td>
                      <td className="px-3 py-2.5"><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(STATUS_LABELS[request.trangThai]?.tone ?? 'gray')}`}>{STATUS_LABELS[request.trangThai]?.label ?? request.trangThai}</span></td>
                      <td className="px-3 py-2.5 text-xs">
                        {allNeeds.length === 0 ? <span className="text-gray-400">—</span> : (
                          <span className="inline-flex items-center gap-1 flex-wrap">
                            <span className="inline-flex rounded-full bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-blue-700">YC {yeuCau}</span>
                            <span className="inline-flex rounded-full bg-green-50 border border-green-200 px-1.5 py-0.5 text-green-700">Đã cấp {daCap}</span>
                            <span className={`inline-flex rounded-full border px-1.5 py-0.5 ${conThieu>0?'bg-amber-50 border-amber-200 text-amber-700':'bg-gray-50 border-gray-200 text-gray-600'}`}>Thiếu {conThieu}</span>
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 sticky right-0 bg-white z-10">
                        {(() => {
                          const s = request.trangThai as RepairRequestStatus;
                          const isTerminal = s === 'HOAN_THANH' || s === 'DA_HUY';
                          const iconBtn = (cls: string) => `inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors ${cls}`;
                          const acts: { title: string; icon: JSX.Element; onClick: (e: React.MouseEvent) => void; cls: string }[] = [];
                          acts.push({ title: 'Xem chi tiết', icon: <Eye className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); openModal('view', request); }, cls: 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50' });
                          if (canUpdateRepair && !isTerminal) acts.push({ title: 'Sửa', icon: <Edit className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); openModal('edit', request); }, cls: 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50' });
                          acts.push({ title: 'Lịch sử', icon: <History className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); setHistoryRequestId(request.id); }, cls: 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50' });
                          if (canUpdateRepair && !isTerminal) acts.push({ title: 'Hủy', icon: <Ban className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); setCancelTarget(request); setCancelReason(''); }, cls: 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' });
                          if (isAdmin) acts.push({ title: 'Xóa', icon: <Trash2 className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); remove(request); }, cls: 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' });
                          if (canUpdateRepair && s === 'CHO_NGHIEM_THU') acts.push({ title: 'Xác nhận KHÔNG ĐẠT', icon: <X className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); openConfirmModal(request as unknown as UnifiedRequest, 'KHONG_DAT'); }, cls: 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100' });
                          // primary theo trạng thái — đặt đầu
                          if (!canUpdateRepair) { /* no primary */ }
                          else if (s === 'CHO_XU_LY') acts.unshift({ title: 'Tiếp nhận', icon: <CheckCircle className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); handleAccept(request); }, cls: 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700' });
                          else if (s === 'DA_TIEP_NHAN') acts.unshift({ title: 'Lên kế hoạch', icon: <Wrench className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); openPlanModal(request as unknown as UnifiedRequest); }, cls: 'bg-amber-600 border-amber-600 text-white hover:bg-amber-700' });
                          else if (s === 'LEN_KE_HOACH') acts.unshift({ title: 'Bắt đầu', icon: <Wrench className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); handleStartRepair(request); }, cls: 'bg-blue-600 border-blue-600 text-white hover:bg-blue-700' });
                          else if (s === 'DANG_SUA_CHUA') acts.unshift({ title: 'Đề nghị nghiệm thu', icon: <CheckCircle className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); openAcceptanceModal(request as unknown as UnifiedRequest); }, cls: 'bg-green-600 border-green-600 text-white hover:bg-green-700' });
                          else if (s === 'CHO_NGHIEM_THU') acts.unshift({ title: 'Xác nhận ĐẠT', icon: <CheckCircle className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); openConfirmModal(request as unknown as UnifiedRequest, 'DAT'); }, cls: 'bg-green-600 border-green-600 text-white hover:bg-green-700' });
                          else if (s === 'DA_NGHIEM_THU') acts.unshift({ title: 'Hoàn thành', icon: <CheckCircle className="h-3.5 w-3.5" />, onClick: (e) => { e.stopPropagation(); handleComplete(request); }, cls: 'bg-green-700 border-green-700 text-white hover:bg-green-800' });
                          return (
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              {acts.map((a, i) => (
                                <button key={i} type="button" title={a.title} aria-label={a.title} onClick={a.onClick} className={iconBtn(a.cls)}><span className="sr-only">{a.title}</span>{a.icon}</button>
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {pagination && pagination.totalPages > 1 && (
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
        lockedMachineSystemId={lockedMachineSystemId}
        lockedRequestType={modal?.mode === 'create' ? (activeView === 'KIEM_TRA' ? 'KIEM_TRA' : 'SUA_CHUA') : undefined}
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
            requestsQuery.refetch();
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
              {statusHistoryQuery.isLoading && <p className="text-gray-400 text-center py-4">Đang tải...</p>}
              {statusHistoryQuery.isError && <p className="text-red-600 text-center py-4">Không tải được lịch sử.</p>}
              {statusHistoryQuery.data?.data?.length === 0 && <p className="text-gray-400 text-center py-4">Chưa có thay đổi trạng thái.</p>}
              <ol className="space-y-3">
                {(statusHistoryQuery.data?.data as unknown as { id: string; oldStatus: string; newStatus: string; reason: string | null; actorName: string | null; actorRole: string | null; createdAt: string }[] | undefined)?.map((log) => {
                  const lbl = historySource === 'inspection' ? INSPECTION_STATUS_LABELS : STATUS_LABELS;
                  const oldLabel = (lbl as Record<string, { label: string }>)[log.oldStatus]?.label ?? log.oldStatus ?? '—';
                  const newLabel = (lbl as Record<string, { label: string }>)[log.newStatus]?.label ?? log.newStatus;
                  const newTone = (lbl as Record<string, { tone: string }>)[log.newStatus]?.tone ?? 'gray';
                  return (
                    <li key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className={`mt-1 inline-flex h-2 w-2 rounded-full ${newTone === 'green' ? 'bg-green-500' : newTone === 'blue' ? 'bg-blue-500' : newTone === 'red' ? 'bg-red-500' : 'bg-gray-400'}`} />
                        <div className="mt-1 flex-1 w-px bg-gray-200" />
                      </div>
                      <div className="pb-3">
                        <p className="font-medium text-gray-800">{oldLabel} → <span className={`${statusBadgeClass(newTone)} inline-flex items-center rounded-full border px-2 py-0.5 text-xs`}>{newLabel}</span></p>
                        {log.reason && <p className="text-xs text-gray-500 mt-0.5">Lý do: {log.reason}</p>}
                        {log.actorName && <p className="text-xs text-gray-500">Bởi: {log.actorName} ({log.actorRole})</p>}
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(log.createdAt).toLocaleString('vi-VN')}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </Modal>
      )}

      {requestsQuery.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Không tải được danh sách yêu cầu sửa chữa.
        </div>
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
              <label className="block space-y-1"><span className="font-medium text-gray-700">Lý do <span className="text-red-500">*</span></span><textarea rows={3} value={confirmForm.lyDo} onChange={(e) => setConfirmForm((f) => ({ ...f, lyDo: e.target.value }))} placeholder="Nhập lý do / ghi chú nghiệm thu" className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <label className="block space-y-1"><span className="font-medium text-gray-700">Chi phí thực tế — tùy chọn</span><input type="number" min={0} value={confirmForm.chiPhiThucTe} onChange={(e) => setConfirmForm((f) => ({ ...f, chiPhiThucTe: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" /></label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setConfirmTarget(null)} className="rounded-md border border-gray-300 px-4 py-2">Hủy</button>
                <button type="button" onClick={handleConfirmAcceptanceSubmit} className={`rounded-md px-4 py-2 font-medium text-white ${confirmForm.ketQua === 'KHONG_DAT' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>Xác nhận</button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {requests.length === 0 && !requestsQuery.isLoading && (
        <div className="hidden items-center gap-2 text-sm text-gray-500">
          <Wrench className="h-4 w-4" /> Chưa có dữ liệu.
        </div>
      )}
    </div>
  );
};

export default RepairRequestList;
