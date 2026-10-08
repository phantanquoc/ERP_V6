import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Edit, Eye, Plus, Power, RefreshCw, Search, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { can, isCachedPermissionsLoaded, isTechnicalUser, canDeleteTechnical } from '../utils/permissions';
import { UserRole } from '../types/auth';
import { ApiError } from '../services/apiClient';
import ConfirmDialog from './common/ConfirmDialog';
import FileUpload from './FileUpload';
import FaultTemplateDetail from './FaultTemplateDetail';
import Modal from './Modal';
import RepairStepForm from './RepairStepForm';
import ResponsiveRowActions, { type RowAction } from './ResponsiveRowActions';
import FaultTrendChart from './FaultTrendChart';
import FaultHeatmap from './FaultHeatmap';
import { StatusBadge, SeverityBadge, CollapsibleSection, StatCard } from './shared';
import {
  useCreateFaultRecord,
  useCreateFaultRecordFromTemplate,
  useDeleteFaultRecord,
  useFaultRecord,
  useFaultRecordStatusHistory,
  useFaultRecordStats,
  useFaultRecurrence,
  useFaultRecords,
  useMarkResolved,
  useMarkRecurred,
  useUpdateFaultRecord,
} from '../hooks/useFaultRecords';
import {
  useCreateFaultTemplate,
  useDeactivateFaultTemplate,
  useDeleteFaultTemplate,
  useFaultTemplates,
  useTemplateSearch,
  useUpdateFaultTemplate,
} from '../hooks/useFaultTemplates';
import { useMachineSystemDetails, useMachineSystems } from '../hooks/useMachineSystemDetails';
import type { FaultRecord, CreateFaultRecordRequest, FaultRecordStatus } from '../services/faultRecordService';
import type { FaultTemplate, CreateFaultTemplateRequest, RepairStepInput } from '../services/faultTemplateService';
import type { FaultRecordFilters } from '../services/faultRecordService';
import type { FaultTemplateFilters } from '../services/faultTemplateService';

type ViewMode = 'records' | 'templates';
type ModalMode = 'create' | 'edit' | 'view';

const SEVERITIES = ['Nghiêm trọng', 'Trung bình', 'Nhẹ'];
const TEMPLATE_STATUSES = ['Đang áp dụng', 'Tạm dừng'];

// 8.8: enum → Vietnamese display label
const FAULT_STATUS_LABEL: Record<FaultRecordStatus, string> = {
  DANG_THEO_DOI: 'Đang theo dõi',
  DA_XU_LY: 'Đã xử lý',
  TAI_PHAT: 'Tái phát',
};

// 8.8: enum → badge tone
const FAULT_STATUS_TONE: Record<FaultRecordStatus, 'yellow' | 'green' | 'red'> = {
  DANG_THEO_DOI: 'yellow',
  DA_XU_LY: 'green',
  TAI_PHAT: 'red',
};

// Enum values used for filter params
const RECORD_STATUS_VALUES: FaultRecordStatus[] = ['DANG_THEO_DOI', 'DA_XU_LY', 'TAI_PHAT'];

// Template status tone (template statuses are still free-form strings)
const templateStatusTone = (value: string): 'green' | 'gray' => (value === 'Đang áp dụng' ? 'green' : 'gray');

// Shared table style contract (mirrors design-system DataTable look across Technical tabs)
const TH = 'px-3 py-2.5 text-left text-xs font-semibold text-gray-500 whitespace-nowrap';
const TD = 'px-3 py-2.5 text-gray-700 align-top';
const STICKY_LEFT_TH = 'sticky left-0 z-30 bg-gray-50 shadow-[1px_0_0_0_rgb(229_231_235)]';
const STICKY_RIGHT_TH = 'sticky right-0 z-30 bg-gray-50 shadow-[-1px_0_0_0_rgb(229_231_235)]';
// Sticky body cells follow the row hover colour via group-hover so they never look detached
const STICKY_LEFT_TD = 'sticky left-0 z-10 bg-white group-hover:bg-gray-50 shadow-[1px_0_0_0_rgb(229_231_235)]';
const STICKY_RIGHT_TD = 'sticky right-0 z-10 bg-white group-hover:bg-gray-50 shadow-[-1px_0_0_0_rgb(229_231_235)]';
const FILTER_CONTROL = 'h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';
const PAGER_BUTTON = 'h-8 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500';

interface PagerInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Skeleton placeholder rows while a list query is loading
const SkeletonRows = ({ cols, rows = 5 }: { cols: number; rows?: number }) => (
  <>
    {Array.from({ length: rows }).map((_, r) => (
      <tr key={r} aria-hidden="true">
        {Array.from({ length: cols }).map((__, c) => (
          <td key={c} className="px-3 py-3">
            <div className={`h-3.5 animate-pulse rounded bg-gray-200 ${c === 1 ? 'w-40' : c === cols - 1 ? 'ml-auto w-14' : 'w-20'}`} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

// DD/MM/YYYY (zero-padded) so date columns line up
const DATE_OPTS: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('vi-VN', DATE_OPTS) : '—';
const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return `${d.toLocaleDateString('vi-VN', DATE_OPTS)} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

// faultRecordService rewraps errors (status code is lost), so also match the backend 403 message
const isForbiddenError = (err: unknown): boolean => {
  if (err instanceof ApiError) return err.statusCode === 403;
  const msg = err instanceof Error ? err.message : '';
  return /truy cập bị từ chối|không có quyền|forbidden|HTTP 403/i.test(msg);
};

const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

// Task 3.5: label + tone helpers for the log source column
const STATUS_LOG_SOURCE_LABEL: Record<string, string> = {
  manual: 'Thủ công',
  auto_from_repair: 'Từ sửa chữa',
  recurrence_detected: 'Hệ thống phát hiện',
  recurrence_detected_manual_confirm: 'Xác nhận tái phát',
  legacy_migration_fallback: 'Chuyển đổi cũ',
};

const STATUS_LOG_SOURCE_TONE: Record<string, 'blue' | 'gray' | 'yellow' | 'green'> = {
  manual: 'blue',
  auto_from_repair: 'green',
  recurrence_detected: 'yellow',
  recurrence_detected_manual_confirm: 'yellow',
  legacy_migration_fallback: 'gray',
};

// Task 3.5: status history sub-component. Extracted to keep hook call rules simple —
// hook only fires when this section actually renders (view mode with a valid record).
function FaultStatusHistorySection({ faultRecordId }: { faultRecordId: string }) {
  const historyQuery = useFaultRecordStatusHistory(faultRecordId);
  const logs = historyQuery.data?.data ?? [];

  return (
    <CollapsibleSection title="Lịch sử trạng thái" defaultOpen={false}>
      {historyQuery.isLoading ? (
        <p className="px-2 py-3 text-sm text-gray-400">Đang tải...</p>
      ) : logs.length === 0 ? (
        <p className="px-2 py-3 text-sm text-gray-400">Chưa có thay đổi trạng thái nào được ghi nhận.</p>
      ) : (
        <ol className="space-y-2">
          {logs.map((log) => {
            const from = log.oldStatus ? FAULT_STATUS_LABEL[log.oldStatus] ?? log.oldStatus : '—';
            const to = FAULT_STATUS_LABEL[log.newStatus] ?? log.newStatus;
            const toTone = FAULT_STATUS_TONE[log.newStatus] ?? 'gray';
            const sourceLabel = STATUS_LOG_SOURCE_LABEL[log.source] ?? log.source;
            const sourceTone = STATUS_LOG_SOURCE_TONE[log.source] ?? 'gray';
            return (
              <li key={log.id} className="rounded-md border border-gray-100 bg-white p-2.5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-xs text-gray-500">{from}</span>
                  <span className="text-gray-400">→</span>
                  <StatusBadge label={to} tone={toTone} size="sm" />
                  <StatusBadge label={sourceLabel} tone={sourceTone} size="sm" />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                  <span>{formatDateTime(log.createdAt)}</span>
                  {log.actorName && <span>Người thao tác: {log.actorName}</span>}
                </div>
                {log.reason && <p className="mt-1 text-xs text-gray-600">Lý do: {log.reason}</p>}
              </li>
            );
          })}
        </ol>
      )}
    </CollapsibleSection>
  );
}

// B5: compute days since a date string
const daysSince = (iso?: string | null): number | null => {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const emptyRecordForm = (nguoiPhatHien = '', machineSystemId = ''): CreateFaultRecordRequest => ({
  tenLoi: '',
  moTa: '',
  maHeThong: '',
  machineSystemId,
  machineSystemDetailId: '',
  faultTemplateId: '',
  mucDo: 'Trung bình',
  nguoiPhatHien,
  ngayPhatHien: new Date().toISOString().split('T')[0],
});

const emptyTemplateForm = (machineSystemId = ''): CreateFaultTemplateRequest => ({
  tenMauLoi: '',
  moTa: '',
  mucDo: 'Trung bình',
  machineSystemId,
  machineSystemDetailId: '',
  hoatDong: true,
  trangThai: 'Đang áp dụng',
  ghiChu: '',
  repairSteps: [],
});

// Sub-component: recurrence banner shown inside the create modal
interface RecurrenceBannerProps {
  faultTemplateId: string;
  machineSystemDetailId: string;
  onMarkRecurrence?: () => void;
  onOpenRecord?: (id: string) => void;
}

const RecurrenceBanner = ({ faultTemplateId, machineSystemDetailId, onMarkRecurrence, onOpenRecord }: RecurrenceBannerProps) => {
  const { data, isLoading } = useFaultRecurrence({ faultTemplateId, machineSystemDetailId });

  if (isLoading) return null;
  if (!data?.data) return null;

  const { count, records } = data.data;

  if (count === 0) {
    return (
      <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-green-700 text-xs">
        Lỗi mới với thiết bị này
      </div>
    );
  }

  return (
    <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium mb-1">Lỗi này đã xảy ra {count} lần trước đó</p>
        {/* C3: auto-mark recurrence button */}
        {onMarkRecurrence && (
          <button
            type="button"
            onClick={onMarkRecurrence}
            className="shrink-0 rounded bg-yellow-600 px-2 py-0.5 text-white text-[10px] font-medium hover:bg-yellow-700"
          >
            Tự động đánh dấu Tái phát
          </button>
        )}
      </div>
      {/* A4: each past record is a clickable button that opens the view modal */}
      <ul className="space-y-0.5">
        {records.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => onOpenRecord?.(r.id)}
              className="text-yellow-700 hover:underline cursor-pointer"
            >
              {r.maLoi} — {formatDate(r.ngayPhatHien)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

interface FaultRecordListProps {
  lockedMachineSystemId?: string;
}

// Deep-link helpers — Phase 2A
const VALID_SORT_BY = new Set(['maLoi', 'tenLoi', 'mucDo', 'trangThai', 'ngayPhatHien', 'createdAt']);
const VALID_SORT_ORDER = new Set(['asc', 'desc']);
const parsePage = (v: string | null, fallback: number) => {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n >= 1 ? n : fallback;
};
const parseLimit = (v: string | null, fallback: number) => {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) && n >= 1 && n <= 100 ? n : fallback;
};
const parseFaultRecordFiltersFromUrl = (sp: URLSearchParams, lockedMachineSystemId?: string): FaultRecordFilters => {
  const q = sp.get('q');
  const status = sp.get('status');
  const mucDo = sp.get('mucDo');
  const sortBy = sp.get('sortBy');
  const sortOrder = sp.get('sortOrder');
  const page = parsePage(sp.get('page'), 1);
  const limit = parseLimit(sp.get('limit'), 10);
  // Preserve locked system: URL value is used only when not locked
  const rawMachineSystemId = sp.get('machineSystemId');
  const machineSystemId = lockedMachineSystemId ?? (rawMachineSystemId || undefined);
  const machineSystemDetailId = sp.get('machineSystemDetailId') || undefined;
  const out: FaultRecordFilters = { page, limit, sortBy: 'createdAt', sortOrder: 'desc' };
  if (q) out.search = q;
  if (status && (RECORD_STATUS_VALUES as string[]).includes(status)) out.trangThai = status as FaultRecordStatus;
  if (mucDo && SEVERITIES.includes(mucDo)) out.mucDo = mucDo;
  if (machineSystemId) out.machineSystemId = machineSystemId;
  if (machineSystemDetailId) out.machineSystemDetailId = machineSystemDetailId;
  if (sortBy && VALID_SORT_BY.has(sortBy)) out.sortBy = sortBy as FaultRecordFilters['sortBy'];
  if (sortOrder && VALID_SORT_ORDER.has(sortOrder)) out.sortOrder = sortOrder as FaultRecordFilters['sortOrder'];
  // Legacy aliases: ?search -> ?q, ?trangThai -> ?status (read for backwards compat, normalized to new keys on write)
  if (!out.search) {
    const legacySearch = sp.get('search');
    if (legacySearch) out.search = legacySearch;
  }
  if (!out.trangThai) {
    const legacyStatus = sp.get('trangThai');
    if (legacyStatus && (RECORD_STATUS_VALUES as string[]).includes(legacyStatus)) out.trangThai = legacyStatus as FaultRecordStatus;
  }
  return out;
};

const FaultRecordList = ({ lockedMachineSystemId }: FaultRecordListProps = {}) => {
  const { user } = useAuth();
  const reporter = user ? `${user.lastName} ${user.firstName}`.trim() : '';
  // Writes require Kỹ thuật membership (primary or secondary); the Rule Matrix may only narrow it further.
  const rulesLoaded = isCachedPermissionsLoaded();
  const isTechnical = isTechnicalUser(user);
  const canMutate = isTechnical && (!rulesLoaded || can('fault-records', 'CREATE', user?.role as string) || can('fault-records', 'UPDATE', user?.role as string));
  const canCreate = canMutate;
  const canDeleteRecord = canDeleteTechnical(user) && (!rulesLoaded || can('fault-records', 'DELETE', user?.role as string));
  // Lifecycle actions mirror the backend role guards (mark-resolved: TEAM_LEAD+, mark-recurred: DEPARTMENT_HEAD+)
  const roleAtLeastLead = user?.role === UserRole.ADMIN || user?.role === UserRole.DEPARTMENT_HEAD || user?.role === UserRole.TEAM_LEAD;
  const roleAtLeastHead = user?.role === UserRole.ADMIN || user?.role === UserRole.DEPARTMENT_HEAD;
  const canUpdateRule = !rulesLoaded || can('fault-records', 'UPDATE', user?.role as string);
  const canMarkResolved = isTechnical && roleAtLeastLead && canUpdateRule;
  const canMarkRecurred = isTechnical && roleAtLeastHead && canUpdateRule;

  const [searchParams, setSearchParams] = useSearchParams();
  const filterSyncRef = useRef(false);
  const detailSyncRef = useRef(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchInput, setSearchInput] = useState(() => {
    const sp = new URLSearchParams(window.location.search);
    return sp.get('q') ?? sp.get('search') ?? '';
  });

  const [view, setView] = useState<ViewMode>('records');
  const [recordFilters, setRecordFilters] = useState<FaultRecordFilters>(() => {
    const sp = new URLSearchParams(window.location.search);
    const init = parseFaultRecordFiltersFromUrl(sp, lockedMachineSystemId);
    if (lockedMachineSystemId) init.machineSystemId = lockedMachineSystemId;
    return init;
  });
  const [templateFilters, setTemplateFilters] = useState<FaultTemplateFilters>({ page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc', machineSystemId: lockedMachineSystemId });

  // A3: heatmap collapsible tracks its own open state for lazy-loading
  const [heatmapExpanded, setHeatmapExpanded] = useState(false);
  // B4: "Mới phát sinh" tab state
  const [recentTab, setRecentTab] = useState<'today' | 'thisWeek'>('today');

  useEffect(() => {
    if (lockedMachineSystemId) {
      setRecordFilters((f) => ({ ...f, machineSystemId: lockedMachineSystemId, machineSystemDetailId: undefined, page: 1 }));
      setTemplateFilters((f) => ({ ...f, machineSystemId: lockedMachineSystemId, machineSystemDetailId: undefined, page: 1 }));
    }
  }, [lockedMachineSystemId]);

  const recordsQuery = useFaultRecords(recordFilters);
  // A5: forward lockedMachineSystemId to stats
  const statsQuery = useFaultRecordStats(lockedMachineSystemId);
  const templatesQuery = useFaultTemplates(templateFilters);
  const activeTemplatesQuery = useFaultTemplates({ page: 1, limit: 300, activeOnly: true, sortBy: 'tenMauLoi', sortOrder: 'asc' });
  const systemsQuery = useMachineSystems({ page: 1, limit: 200, hoatDong: true, sortBy: 'maHeThong', sortOrder: 'asc' });
  const detailsQuery = useMachineSystemDetails({ page: 1, limit: 300, hoatDong: true, machineSystemId: recordFilters.machineSystemId || templateFilters.machineSystemId });

  const createRecord = useCreateFaultRecord();
  const createRecordFromTemplate = useCreateFaultRecordFromTemplate();
  const updateRecord = useUpdateFaultRecord();
  const deleteRecord = useDeleteFaultRecord();
  const markResolved = useMarkResolved();
  const markRecurred = useMarkRecurred();
  const createTemplate = useCreateFaultTemplate();
  const updateTemplate = useUpdateFaultTemplate();
  const deactivateTemplate = useDeactivateFaultTemplate();
  const deleteTemplate = useDeleteFaultTemplate();

  // Error vs empty: a failed list (e.g. 403 for non-Mechanical users) must not look like "no records"
  const recordsForbidden = recordsQuery.isError && isForbiddenError(recordsQuery.error);
  const recordsFailed = recordsQuery.isError;
  const records = useMemo(() => recordsQuery.data?.data ?? [], [recordsQuery.data?.data]);
  const templates = templatesQuery.data?.data ?? [];
  const activeTemplates = activeTemplatesQuery.data?.data ?? [];
  const systems = useMemo(() => systemsQuery.data?.data ?? [], [systemsQuery.data?.data]);
  // Memoize to stabilise reference so downstream useMemos don't re-run on every render
  const details = useMemo(() => detailsQuery.data?.data ?? [], [detailsQuery.data?.data]);
  const stats = statsQuery.data?.data;

  // Consistent location label: always the system name; legacy rows that only carry maHeThong are
  // resolved against the loaded systems list, falling back to the raw code.
  const systemByCode = useMemo(() => new Map(systems.map((s) => [s.maHeThong, s])), [systems]);
  const resolveSystemLabel = (record: FaultRecord): { systemLabel: string; systemCode: string } => {
    if (record.machineSystem) return { systemLabel: record.machineSystem.tenHeThong, systemCode: record.machineSystem.maHeThong };
    const code = record.maHeThong ?? '';
    if (!code) return { systemLabel: '', systemCode: '' };
    const match = systemByCode.get(code);
    return { systemLabel: match?.tenHeThong ?? code, systemCode: match ? code : '' };
  };
  // ui-dna: hide content that is identical across the displayed rows
  const showReporterLine = useMemo(
    () => new Set(records.map((r) => (r.nguoiPhatHien ?? '').trim())).size > 1,
    [records],
  );

  const [recordModal, setRecordModal] = useState<{ mode: ModalMode; record?: FaultRecord } | null>(null);
  const [templateModal, setTemplateModal] = useState<{ mode: ModalMode; template?: FaultTemplate } | null>(null);
  const [recordForm, setRecordForm] = useState<CreateFaultRecordRequest>(emptyRecordForm(reporter, lockedMachineSystemId ?? ''));
  const [templateForm, setTemplateForm] = useState<CreateFaultTemplateRequest>(emptyTemplateForm(lockedMachineSystemId ?? ''));
  const [templateRepairSteps, setTemplateRepairSteps] = useState<RepairStepInput[]>([]);
  const [recordRepairSteps, setRecordRepairSteps] = useState<RepairStepInput[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  // Destructive / irreversible row actions go through a confirm dialog first
  const [pendingAction, setPendingAction] = useState<
    | { kind: 'deleteRecord'; record: FaultRecord }
    | { kind: 'markRecurred'; record: FaultRecord }
    | { kind: 'deleteTemplate'; template: FaultTemplate }
    | { kind: 'deactivateTemplate'; template: FaultTemplate }
    | null
  >(null);
  const [recurReason, setRecurReason] = useState('');
  // A4: id queued from recurrence banner click — opens view modal once data is fetched
  const [pendingViewId, setPendingViewId] = useState('');
  const pendingViewQuery = useFaultRecord(pendingViewId);
  // 8.2: template detail drawer
  const [detailTemplate, setDetailTemplate] = useState<FaultTemplate | null>(null);
  // 6.1: typeahead combobox state
  const [templateSearch, setTemplateSearch] = useState('');
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const templateSearchRef = useRef<HTMLDivElement>(null);
  const templateSearchQuery = useTemplateSearch(templateSearch);

  const createFaultTemplateId = !recordModal?.record ? (recordForm.faultTemplateId ?? '') : '';
  const createMachineSystemDetailId = !recordModal?.record ? (recordForm.machineSystemDetailId ?? '') : '';

  const detailOptionsForRecord = useMemo(
    () => details.filter((detail) => !recordForm.machineSystemId || detail.machineSystemId === recordForm.machineSystemId),
    [details, recordForm.machineSystemId]
  );
  const detailOptionsForTemplate = useMemo(
    () => details.filter((detail) => !templateForm.machineSystemId || detail.machineSystemId === templateForm.machineSystemId),
    [details, templateForm.machineSystemId]
  );

  const openRecordModal = (mode: ModalMode, record?: FaultRecord) => {
    setError('');
    setSelectedFile(null);
    setRecordModal({ mode, record });
    setTemplateSearch('');
    setShowTemplateDropdown(false);
    setRecordRepairSteps([]);
    setRecordForm(record ? {
      tenLoi: record.tenLoi,
      moTa: record.moTa,
      maHeThong: record.maHeThong ?? record.machineSystem?.maHeThong ?? '',
      machineSystemId: record.machineSystemId ?? '',
      machineSystemDetailId: record.machineSystemDetailId ?? '',
      faultTemplateId: record.faultTemplateId ?? '',
      mucDo: record.mucDo,
      nguoiPhatHien: record.nguoiPhatHien,
      ngayPhatHien: record.ngayPhatHien?.split('T')[0] ?? '',
    } : emptyRecordForm(reporter, lockedMachineSystemId ?? ''));
    // URL side effects: view -> ?faultId, create -> ?create=fault (optional), edit -> no URL param
    if (mode === 'view' && record?.id) pushFaultId(record.id);
    else if (mode === 'create') pushCreateFault();
  };
  const closeRecordModal = () => {
    const wasView = recordModal?.mode === 'view';
    const wasCreate = recordModal?.mode === 'create';
    setRecordModal(null);
    // Clear whichever URL param we set; defer so state settles before navigation effect reads it
    if (wasView) clearFaultId();
    if (wasCreate) clearCreateFault();
  };

  // Phase 2A: recordFilters -> URL (filter/search/pagination/sort). Guarded so our own write does not echo.
  useEffect(() => {
    // Never sync when locked (machine filter is forced by parent, not URL-driven)
    // but still allow other params to sync — skip only machine keys if locked.
    const next = new URLSearchParams(searchParams);
    let changed = false;
    const setOrDelete = (key: string, value: string | undefined, legacyKey?: string) => {
      if (legacyKey) next.delete(legacyKey);
      if (value) { if (next.get(key) !== value) { next.set(key, value); changed = true; } }
      else if (next.has(key)) { next.delete(key); changed = true; }
    };
    const searchVal = (recordFilters.search ?? '').trim();
    setOrDelete('q', searchVal || undefined, 'search');
    setOrDelete('status', recordFilters.trangThai || undefined, 'trangThai');
    setOrDelete('mucDo', recordFilters.mucDo || undefined);
    // machine filters are URL-visible only when not locked
    if (!lockedMachineSystemId) {
      setOrDelete('machineSystemId', recordFilters.machineSystemId || undefined);
      setOrDelete('machineSystemDetailId', recordFilters.machineSystemDetailId || undefined);
    } else {
      // ensure stale machine params do not linger in URL when locked
      if (next.has('machineSystemId')) { next.delete('machineSystemId'); changed = true; }
      if (next.has('machineSystemDetailId') && !recordFilters.machineSystemDetailId) {
        // keep if user picked a detail within the locked system
      }
    }
    const pageVal = String(recordFilters.page ?? 1);
    const limitVal = String(recordFilters.limit ?? 10);
    const sortByVal = recordFilters.sortBy ?? 'createdAt';
    const sortOrderVal = recordFilters.sortOrder ?? 'desc';
    // Only write pagination/sort when non-default to keep URL tidy, but treat missing as default on read
    if ((next.get('page') ?? '1') !== pageVal) { if (pageVal === '1') next.delete('page'); else next.set('page', pageVal); changed = true; }
    if ((next.get('limit') ?? '10') !== limitVal) { if (limitVal === '10') next.delete('limit'); else next.set('limit', limitVal); changed = true; }
    if ((next.get('sortBy') ?? 'createdAt') !== sortByVal) { if (sortByVal === 'createdAt') next.delete('sortBy'); else next.set('sortBy', sortByVal); changed = true; }
    if ((next.get('sortOrder') ?? 'desc') !== sortOrderVal) { if (sortOrderVal === 'desc') next.delete('sortOrder'); else next.set('sortOrder', sortOrderVal); changed = true; }
    if (!changed) return;
    filterSyncRef.current = true;
    setSearchParams(next, { replace: true });
  }, [recordFilters]);

  // Phase 2A: URL -> recordFilters + searchInput (back/forward, shared links, manual edit)
  useEffect(() => {
    if (filterSyncRef.current) { filterSyncRef.current = false; return; }
    const nextFilters = parseFaultRecordFiltersFromUrl(searchParams, lockedMachineSystemId);
    // Preserve locked id if present
    if (lockedMachineSystemId) nextFilters.machineSystemId = lockedMachineSystemId;
    let needsUpdate = false;
    // shallow compare significant keys
    const keys: (keyof FaultRecordFilters)[] = ['search', 'trangThai', 'mucDo', 'machineSystemId', 'machineSystemDetailId', 'page', 'limit', 'sortBy', 'sortOrder'];
    for (const k of keys) {
      if ((nextFilters[k] ?? undefined) !== (recordFilters[k] ?? undefined)) { needsUpdate = true; break; }
    }
    if (needsUpdate) setRecordFilters(nextFilters);
    const urlSearch = searchParams.get('q') ?? searchParams.get('search') ?? '';
    if (urlSearch !== searchInput) setSearchInput(urlSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Phase 2A: debounced searchInput -> recordFilters.search
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const trimmed = searchInput.trim();
      setRecordFilters((f) => {
        const cur = (f.search ?? '').trim();
        if (cur === trimmed) return f;
        return { ...f, search: trimmed || undefined, page: 1 };
      });
    }, 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchInput]);

  // Phase 2A: detail deep-link ?faultId (+ legacy ?faultRecordId), ?create=fault, and pending fetch
  // Standalone list lives under TechnicalQuality ?tab=faults. Embedded (locked) usage keeps the host tab as-is.
  // Legacy `sub` param is dropped (TechnicalQuality no longer reads it).
  const applyFaultsTab = (next: URLSearchParams) => {
    next.delete('sub');
    if (next.get('tab') !== 'faults') next.set('tab', 'faults');
  };
  // Embedded in MachineSummaryDrawer (locked): the host page owns the URL. Writing ?faultId there would
  // make TechnicalQuality jump to the faults tab, so the modal is driven by local state only.
  const pushFaultId = (id: string) => {
    if (lockedMachineSystemId) return;
    const next = new URLSearchParams(searchParams);
    next.set('faultId', id);
    next.delete('faultRecordId');
    applyFaultsTab(next);
    detailSyncRef.current = true;
    setSearchParams(next);
  };
  const clearFaultId = () => {
    if (!searchParams.has('faultId') && !searchParams.has('faultRecordId')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('faultId');
    next.delete('faultRecordId');
    detailSyncRef.current = true;
    setSearchParams(next, { replace: true });
  };
  const pushCreateFault = () => {
    if (lockedMachineSystemId) return;
    const next = new URLSearchParams(searchParams);
    next.set('create', 'fault');
    applyFaultsTab(next);
    detailSyncRef.current = true;
    setSearchParams(next);
  };
  const clearCreateFault = () => {
    if (!searchParams.has('create')) return;
    const next = new URLSearchParams(searchParams);
    if (next.get('create') === 'fault') next.delete('create');
    detailSyncRef.current = true;
    setSearchParams(next, { replace: true });
  };

  // A4: once the pending record is fetched, open the view modal
  useEffect(() => {
    if (pendingViewId && pendingViewQuery.data?.data) {
      openRecordModal('view', pendingViewQuery.data.data);
      setPendingViewId('');
    }
  // openRecordModal is a stable inline function — intentionally omitted from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingViewId, pendingViewQuery.data]);

  const faultIdParam = searchParams.get('faultId');
  const faultRecordIdParam = searchParams.get('faultRecordId');
  const faultIdResolved = faultIdParam ?? faultRecordIdParam;
  // Deep-link: ?faultId (preferred) or legacy ?faultRecordId; keep in sync with modal open/close and back/forward
  useEffect(() => {
    if (detailSyncRef.current) { detailSyncRef.current = false; return; }
    const faultId = faultIdResolved;
    if (!faultId) {
      if (recordModal?.mode === 'view' && recordModal.record?.id) {
        setRecordModal(null);
      }
      return;
    }
    if (recordModal?.mode === 'view' && recordModal.record?.id === faultId) return;
    if (pendingViewId === faultId) return;
    if (searchParams.has('faultRecordId') && !searchParams.has('faultId')) {
      const next = new URLSearchParams(searchParams);
      next.set('faultId', faultId);
      next.delete('faultRecordId');
      detailSyncRef.current = true;
      setSearchParams(next, { replace: true });
    }
    setPendingViewId(faultId);
  }, [faultIdParam, faultRecordIdParam]);

  const createParam = searchParams.get('create');
  // ?create=fault -> open create modal; clearing it closes
  useEffect(() => {
    if (detailSyncRef.current) { detailSyncRef.current = false; return; }
    const createVal = createParam;
    if (createVal === 'fault') {
      if (!recordModal || recordModal.mode !== 'create') openRecordModal('create');
    } else {
      if (recordModal?.mode === 'create') setRecordModal(null);
    }
  }, [createParam]);

  // 6.1: close typeahead dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (templateSearchRef.current && !templateSearchRef.current.contains(e.target as Node)) {
        setShowTemplateDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openTemplateModal = (mode: ModalMode, template?: FaultTemplate) => {
    setError('');
    setSelectedFile(null);
    setTemplateModal({ mode, template });
    const steps: RepairStepInput[] = (template?.repairSteps ?? []).map((s) => ({
      moTa: s.moTa,
      thoiGianUocTinh: s.thoiGianUocTinh ?? null,
      dungCu: s.dungCu ?? null,
      ghiChu: s.ghiChu ?? null,
    }));
    setTemplateRepairSteps(steps);
    setTemplateForm(template ? {
      maMauLoi: template.maMauLoi,
      tenMauLoi: template.tenMauLoi,
      moTa: template.moTa,
      mucDo: template.mucDo,
      machineSystemId: template.machineSystemId,
      machineSystemDetailId: template.machineSystemDetailId,
      hoatDong: template.hoatDong,
      trangThai: template.trangThai,
      ghiChu: template.ghiChu ?? '',
      repairSteps: steps,
    } : emptyTemplateForm(lockedMachineSystemId ?? ''));
  };

  const syncSystemFromDetail = (detailId: string, target: 'record' | 'template') => {
    const detail = details.find((item) => item.id === detailId);
    if (target === 'record') {
      setRecordForm((form) => ({
        ...form,
        machineSystemDetailId: detailId,
        machineSystemId: lockedMachineSystemId ?? detail?.machineSystemId ?? form.machineSystemId,
        maHeThong: detail?.machineSystem?.maHeThong ?? form.maHeThong,
      }));
    } else {
      setTemplateForm((form) => ({
        ...form,
        machineSystemDetailId: detailId,
        machineSystemId: lockedMachineSystemId ?? detail?.machineSystemId ?? form.machineSystemId,
      }));
    }
  };

  const chooseTemplate = (templateId: string, templateObj?: FaultTemplate) => {
    const template = templateObj ?? activeTemplates.find((item) => item.id === templateId);
    setRecordForm((form) => ({
      ...form,
      faultTemplateId: templateId,
      tenLoi: template?.tenMauLoi ?? form.tenLoi,
      moTa: template?.moTa ?? form.moTa,
      mucDo: template?.mucDo ?? form.mucDo,
      machineSystemId: lockedMachineSystemId ?? template?.machineSystemId ?? form.machineSystemId,
      machineSystemDetailId: template?.machineSystemDetailId ?? form.machineSystemDetailId,
      maHeThong: template?.machineSystem?.maHeThong ?? form.maHeThong,
    }));
    setTemplateSearch(template ? `${template.maMauLoi} - ${template.tenMauLoi}` : '');
    setShowTemplateDropdown(false);
  };

  const saveRecord = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload: CreateFaultRecordRequest = {
        ...recordForm,
        machineSystemId: recordForm.machineSystemId || undefined,
        machineSystemDetailId: recordForm.machineSystemDetailId || undefined,
        faultTemplateId: recordForm.faultTemplateId || undefined,
        maHeThong: recordForm.maHeThong || undefined,
      };
      if (recordModal?.record) {
        await updateRecord.mutateAsync({ id: recordModal.record.id, data: payload, file: selectedFile ?? undefined });
      } else if (payload.faultTemplateId) {
        await createRecordFromTemplate.mutateAsync({
          data: {
            faultTemplateId: payload.faultTemplateId,
            nguoiPhatHien: payload.nguoiPhatHien,
            ngayPhatHien: payload.ngayPhatHien,
            tenLoi: payload.tenLoi,
            moTa: payload.moTa,
            mucDo: payload.mucDo,
          },
          file: selectedFile ?? undefined,
        });
      } else {
        // auto-create path — include repairSteps when canMutate
        const autoPayload = canMutate && recordRepairSteps.length > 0
          ? { ...payload, repairSteps: recordRepairSteps }
          : payload;
        await createRecord.mutateAsync({ data: autoPayload, file: selectedFile ?? undefined });
      }
      closeRecordModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được bản ghi lỗi');
    }
  };

  const saveTemplate = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const payload: CreateFaultTemplateRequest = {
        ...templateForm,
        machineSystemId: templateForm.machineSystemId || undefined,
        repairSteps: templateRepairSteps,
      };
      if (templateModal?.template) {
        await updateTemplate.mutateAsync({ id: templateModal.template.id, data: payload, file: selectedFile ?? undefined });
      } else {
        await createTemplate.mutateAsync({ data: payload, file: selectedFile ?? undefined });
      }
      setTemplateModal(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được mẫu lỗi');
    }
  };

  const confirmBusy = deleteRecord.isPending || markRecurred.isPending || deleteTemplate.isPending || deactivateTemplate.isPending;
  const closePendingAction = () => {
    if (confirmBusy) return;
    setPendingAction(null);
    setRecurReason('');
  };
  const runPendingAction = async () => {
    if (!pendingAction) return;
    try {
      switch (pendingAction.kind) {
        case 'deleteRecord':
          await deleteRecord.mutateAsync(pendingAction.record.id);
          toast.success(`Đã xóa bản ghi ${pendingAction.record.maLoi}`);
          break;
        case 'markRecurred': {
          const reason = recurReason.trim();
          await markRecurred.mutateAsync({ id: pendingAction.record.id, opts: reason ? { reason } : undefined });
          toast.success(`Đã đánh dấu tái phát ${pendingAction.record.maLoi}`);
          break;
        }
        case 'deleteTemplate':
          await deleteTemplate.mutateAsync(pendingAction.template.id);
          toast.success(`Đã xóa mẫu lỗi ${pendingAction.template.maMauLoi}`);
          break;
        case 'deactivateTemplate':
          await deactivateTemplate.mutateAsync(pendingAction.template.id);
          toast.success(`Đã dừng mẫu lỗi ${pendingAction.template.maMauLoi}`);
          break;
      }
      setPendingAction(null);
      setRecurReason('');
    } catch (err) {
      toast.error(errorText(err, 'Thao tác thất bại'));
    }
  };
  const handleMarkResolved = (record: FaultRecord) => {
    markResolved.mutate(
      { id: record.id },
      {
        onSuccess: () => toast.success(`Đã đánh dấu đã xử lý ${record.maLoi}`),
        onError: (err) => toast.error(errorText(err, 'Không cập nhật được trạng thái')),
      },
    );
  };

  const pager = (pagination: PagerInfo | undefined, page: number, setPage: (page: number) => void): JSX.Element | null => {
    if (!pagination || pagination.total <= 0) return null;
    const totalPages = Math.max(pagination.totalPages, 1);
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-3 py-2 text-sm">
        <span className="text-gray-600">Tổng {pagination.total} dòng — Trang {pagination.page}/{totalPages}</span>
        <div className="flex gap-1">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className={PAGER_BUTTON}>Trước</button>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className={PAGER_BUTTON}>Sau</button>
        </div>
      </div>
    );
  };

  // B2: delta for Tổng card (thisMonth vs prevMonth)
  const totalDelta = stats ? stats.thisMonth - stats.prevMonth : null;

  // A2: severity sub-counts for StatCard subCounts prop
  const severitySubCounts = (statusKey: FaultRecordStatus | 'ALL') => {
    if (!stats) return undefined;
    return SEVERITIES.map((s) => {
      const count = statusKey === 'ALL'
        ? (stats.bySeverity?.[s] ?? 0)
        : (stats.bySeverityByStatus?.[statusKey]?.[s] ?? 0);
      const tone: 'red' | 'yellow' | 'gray' =
        s === 'Nghiêm trọng' ? 'red' : s === 'Trung bình' ? 'yellow' : 'gray';
      return { label: s, count, tone };
    });
  };

  // 8.8: enum-aware status-card click handler
  const handleCardClick = (status: FaultRecordStatus | 'ALL') => {
    if (status === 'ALL') {
      setRecordFilters((f) => ({ ...f, trangThai: undefined, page: 1 }));
    } else {
      setRecordFilters((f) => ({ ...f, trangThai: status, page: 1 }));
    }
  };

  const cardData: Array<{
    label: string;
    status: FaultRecordStatus | 'ALL';
    count: number | null;
    tone: 'blue' | 'yellow' | 'green' | 'red';
  }> = [
    { label: 'Tổng', status: 'ALL', count: stats?.total ?? null, tone: 'blue' },
    { label: FAULT_STATUS_LABEL.DANG_THEO_DOI, status: 'DANG_THEO_DOI', count: stats?.byStatus?.['DANG_THEO_DOI'] ?? null, tone: 'yellow' },
    { label: FAULT_STATUS_LABEL.DA_XU_LY, status: 'DA_XU_LY', count: stats?.byStatus?.['DA_XU_LY'] ?? null, tone: 'green' },
    { label: FAULT_STATUS_LABEL.TAI_PHAT, status: 'TAI_PHAT', count: stats?.byStatus?.['TAI_PHAT'] ?? null, tone: 'red' },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Lỗi cơ điện</h2>
        <p className="text-xs text-gray-500">Mẫu lỗi tham chiếu và bản ghi lỗi thực tế theo chi tiết máy.</p>
      </div>
      <div className="inline-flex w-fit gap-1 rounded-lg bg-gray-100 p-1">
        <button type="button" aria-pressed={view === 'records'} onClick={() => setView('records')} className={`rounded-md px-3 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${view === 'records' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>Bản ghi lỗi</button>
        {canMutate && (
          <button type="button" aria-pressed={view === 'templates'} onClick={() => setView('templates')} className={`rounded-md px-3 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${view === 'templates' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>Mẫu lỗi</button>
        )}
      </div>

      {/* Summary stat cards — only shown in records view (they double as status filters) */}
      {view === 'records' && !recordsFailed && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cardData.map((card) => {
            const isActive = card.status === 'ALL'
              ? !recordFilters.trangThai
              : recordFilters.trangThai === card.status;
            const delta = card.status === 'ALL' ? totalDelta : undefined;
            const deltaLabel = card.status === 'ALL' ? 'tháng này' : undefined;
            const extraSubCounts = card.status === 'DA_XU_LY' && stats?.mttrDays != null
              ? [{ label: `Tb. ${stats.mttrDays} ngày xử lý`, count: 0 as number, tone: 'green' as const }]
              : [];
            const subCounts = [...(severitySubCounts(card.status) ?? []), ...extraSubCounts];
            return (
              <StatCard
                key={card.status}
                label={card.label}
                value={card.count}
                delta={delta}
                deltaLabel={deltaLabel}
                subCounts={subCounts.length > 0 ? subCounts : undefined}
                onClick={() => handleCardClick(card.status)}
                className={isActive ? 'ring-2 ring-blue-400' : ''}
              />
            );
          })}
        </div>
      )}

      {/* Status chip row removed: the stat cards above already filter by status. */}

      {/* Insight sections — collapsed by default and pushed below the table (order-last on the flex
          column) so the list stays the primary content. */}
      {view === 'records' && !recordsFailed && (
        <div className="order-last space-y-4">
          <CollapsibleSection title="Máy hay lỗi nhất">
            {!stats || stats.topMachines.length === 0 ? (
              <p className="text-sm text-gray-400">Chưa có dữ liệu.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {stats.topMachines.map((m) => (
                  <li key={m.machineSystemId} className="flex items-center justify-between">
                    <span className="text-gray-700">{m.tenHeThong} <span className="text-gray-400">({m.maHeThong})</span></span>
                    <span className="font-medium text-gray-900">{m.count} lần</span>
                  </li>
                ))}
              </ul>
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Lỗi hay tái phát">
            {!stats || stats.topRecurring.length === 0 ? (
              <p className="text-sm text-gray-400">Chưa có dữ liệu.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {stats.topRecurring.map((r) => {
                  const days = daysSince(r.lastSeenAt);
                  return (
                    <li key={`${r.faultTemplateId}-${r.machineSystemDetailId}`} className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-gray-700">{r.tenMauLoi} <span className="text-gray-400">@ {r.tenChiTiet}</span></span>
                        {/* B5: last seen */}
                        {days !== null && (
                          <p className="text-[11px] text-gray-400">Lần cuối: {days === 0 ? 'Hôm nay' : `${days} ngày trước`}</p>
                        )}
                      </div>
                      <span className="shrink-0 font-medium text-gray-900">{r.count} lần</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CollapsibleSection>

          {/* 12.3 wires FaultTrendChart */}
          <CollapsibleSection title="Xu hướng theo tháng">
            <FaultTrendChart data={stats?.monthlyTrend ?? []} />
          </CollapsibleSection>

          {/* B4: Mới phát sinh — default closed */}
          <CollapsibleSection title="Mới phát sinh">
            <div>
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRecentTab('today')}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${recentTab === 'today' ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => setRecentTab('thisWeek')}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${recentTab === 'thisWeek' ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  Tuần này
                </button>
              </div>
              {(() => {
                const recentRecords = recentTab === 'today' ? (stats?.recent?.today ?? []) : (stats?.recent?.thisWeek ?? []);
                if (!stats) return <p className="text-sm text-gray-400">Đang tải...</p>;
                if (recentRecords.length === 0) return <p className="text-sm text-gray-400">Không có bản ghi mới.</p>;
                return (
                  <ul className="space-y-1">
                    {recentRecords.map((r) => (
                      /* A4: clickable row opens record-view modal */
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => openRecordModal('view', r)}
                          className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-medium text-gray-800">{r.tenLoi}</span>
                            <span className="ml-2 text-xs text-gray-400">{r.maLoi}</span>
                          </div>
                          <span className="shrink-0 text-xs text-gray-500">{formatDate(r.ngayPhatHien)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
          </CollapsibleSection>

          {/* A3 + 12.3: Bản đồ nhiệt default closed; lazy-loads on expand */}
          <CollapsibleSection
            title="Bản đồ nhiệt máy × loại lỗi"
            onExpand={() => setHeatmapExpanded(true)}
          >
            <FaultHeatmap
              machineSystemId={lockedMachineSystemId}
              enabled={heatmapExpanded}
            />
          </CollapsibleSection>
        </div>
      )}

      {view === 'records' ? (
        <section className="min-w-0 rounded-lg border border-gray-200 bg-white">
          {/* Toolbar: search + filters + count + create on one wrapping row */}
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-3">
            <div className="relative min-w-[180px] flex-1 basis-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input type="search" aria-label="Tìm bản ghi lỗi" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Tìm mã, tên lỗi..." className={`${FILTER_CONTROL} w-full pl-8`} />
            </div>
            <select aria-label="Lọc theo hệ thống" value={recordFilters.machineSystemId ?? ''} onChange={(event) => setRecordFilters((filters) => ({ ...filters, machineSystemId: event.target.value || undefined, machineSystemDetailId: undefined, page: 1 }))} className={`${FILTER_CONTROL} max-w-[200px]`} disabled={!!lockedMachineSystemId} hidden={!!lockedMachineSystemId}>
              <option value="">Tất cả hệ thống</option>
              {systems.map((system) => <option key={system.id} value={system.id}>{system.maHeThong} - {system.tenHeThong}</option>)}
            </select>
            <select aria-label="Lọc theo chi tiết máy" value={recordFilters.machineSystemDetailId ?? ''} onChange={(event) => setRecordFilters((filters) => ({ ...filters, machineSystemDetailId: event.target.value || undefined, page: 1 }))} className={`${FILTER_CONTROL} max-w-[200px] truncate`}>
              <option value="">Tất cả chi tiết</option>
              {details.map((detail) => <option key={detail.id} value={detail.id}>{detail.maChiTiet} - {detail.tenChiTiet}</option>)}
            </select>
            <select aria-label="Lọc theo mức độ" value={recordFilters.mucDo ?? ''} onChange={(event) => setRecordFilters((filters) => ({ ...filters, mucDo: event.target.value || undefined, page: 1 }))} className={FILTER_CONTROL}>
              <option value="">Tất cả mức độ</option>
              {SEVERITIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select aria-label="Lọc theo trạng thái" value={recordFilters.trangThai ?? ''} onChange={(event) => setRecordFilters((filters) => ({ ...filters, trangThai: (event.target.value as FaultRecordStatus) || undefined, page: 1 }))} className={FILTER_CONTROL}>
              <option value="">Tất cả trạng thái</option>
              {RECORD_STATUS_VALUES.map((item) => <option key={item} value={item}>{FAULT_STATUS_LABEL[item]}</option>)}
            </select>
            <div className="ml-auto flex items-center gap-3">
              {!recordsFailed && <span className="whitespace-nowrap text-sm text-gray-600">Tổng: {recordsQuery.data?.pagination?.total ?? 0} bản ghi</span>}
              {canCreate && !recordsForbidden && <button type="button" onClick={() => openRecordModal('create')} className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"><Plus className="h-4 w-4" aria-hidden="true" /> Thêm bản ghi</button>}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead className="sticky top-0 z-20 border-b border-gray-200 bg-gray-50">
                <tr>
                  <th scope="col" className={`${TH} ${STICKY_LEFT_TH} w-[110px]`}>Mã lỗi</th>
                  <th scope="col" className={TH}>Tên lỗi</th>
                  <th scope="col" className={TH}>Vị trí</th>
                  <th scope="col" className={`${TH} w-[110px]`}>Mức độ</th>
                  <th scope="col" className={`${TH} w-[120px]`}>Trạng thái</th>
                  <th scope="col" className={`${TH} w-[130px]`}>Phát hiện</th>
                  <th scope="col" className={`${TH} ${STICKY_RIGHT_TH} w-[1%] text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recordsFailed ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center">
                      <p role="alert" className="text-sm font-medium text-gray-700">
                        {recordsForbidden ? 'Bạn không có quyền xem danh sách này' : 'Không tải được danh sách bản ghi lỗi'}
                      </p>
                      {recordsForbidden ? (
                        <p className="mt-1 text-xs text-gray-400">Danh sách lỗi cơ điện chỉ dành cho bộ phận Kỹ thuật — Cơ điện.</p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { void recordsQuery.refetch(); void statsQuery.refetch(); }}
                          disabled={recordsQuery.isFetching}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-blue-600 hover:bg-gray-50 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${recordsQuery.isFetching ? 'animate-spin' : ''}`} aria-hidden="true" /> Thử lại
                        </button>
                      )}
                    </td>
                  </tr>
                ) : recordsQuery.isLoading ? (
                  <SkeletonRows cols={7} />
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-sm text-gray-400">
                      {recordFilters.search || recordFilters.trangThai || recordFilters.mucDo || recordFilters.machineSystemDetailId || (recordFilters.machineSystemId && !lockedMachineSystemId)
                        ? 'Không có bản ghi lỗi nào khớp với bộ lọc hiện tại.'
                        : lockedMachineSystemId
                          ? 'Máy này chưa có bản ghi lỗi nào được ghi nhận.'
                          : 'Chưa có bản ghi lỗi nào được ghi nhận.'}
                    </td>
                  </tr>
                ) : records.map((record) => {
                  const { systemLabel, systemCode } = resolveSystemLabel(record);
                  const detailLabel = record.machineSystemDetail?.tenChiTiet ?? '';
                  return (
                  <tr key={record.id} onClick={() => openRecordModal('view', record)} className="group cursor-pointer transition-colors hover:bg-gray-50">
                    <td className={`${TD} ${STICKY_LEFT_TD} whitespace-nowrap`}>
                      {/* Keyboard-reachable entry point to the same detail view the row click opens */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openRecordModal('view', record); }}
                        title={`Xem chi tiết ${record.maLoi}`}
                        className="rounded font-mono text-xs font-medium text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        {record.maLoi}
                      </button>
                    </td>
                    <td className={TD}>
                      <div className="max-w-[260px] truncate font-medium leading-tight text-gray-900" title={record.tenLoi}>{record.tenLoi}</div>
                      {record.faultTemplate && (
                        <div className="mt-0.5 max-w-[260px] truncate text-xs text-gray-400" title={`Mẫu: ${record.faultTemplate.tenMauLoi}`}>Mẫu: {record.faultTemplate.tenMauLoi}</div>
                      )}
                    </td>
                    <td className={TD}>
                      {systemLabel
                        ? <div className="max-w-[180px] truncate text-xs leading-tight text-gray-800" title={systemCode ? `${systemLabel} (${systemCode})` : systemLabel}>{systemLabel}</div>
                        : <div className="text-xs text-gray-400">Không gắn thiết bị</div>}
                      {detailLabel && <div className="mt-0.5 max-w-[180px] truncate text-[11px] text-gray-400" title={detailLabel}>{detailLabel}</div>}
                    </td>
                    <td className={`${TD} whitespace-nowrap`}>
                      {/* 8.3: use shared SeverityBadge */}
                      {record.mucDo ? <SeverityBadge value={record.mucDo} /> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className={`${TD} whitespace-nowrap`}>
                      {/* 8.3/8.8: use shared StatusBadge with enum→label+tone mapping */}
                      <StatusBadge
                        label={FAULT_STATUS_LABEL[record.trangThai] ?? record.trangThai}
                        tone={FAULT_STATUS_TONE[record.trangThai] ?? 'gray'}
                      />
                    </td>
                    <td className={TD}>
                      <div className="whitespace-nowrap text-xs text-gray-700" title={record.nguoiPhatHien ? `Người phát hiện: ${record.nguoiPhatHien}` : undefined}>{formatDate(record.ngayPhatHien)}</div>
                      {/* Reporter line only when it differs across the page (uniform values are noise) */}
                      {showReporterLine && record.nguoiPhatHien && <div className="mt-0.5 max-w-[150px] truncate text-[11px] text-gray-400" title={record.nguoiPhatHien}>{record.nguoiPhatHien}</div>}
                      {record.trangThai === 'DA_XU_LY' && record.ngayXuLy && (
                        <div className="mt-1 whitespace-nowrap text-[11px] text-green-600">Xử lý: {formatDateTime(record.ngayXuLy)}</div>
                      )}
                    </td>
                    <td className={`${TD} ${STICKY_RIGHT_TD} whitespace-nowrap`} onClick={(e) => e.stopPropagation()}>
                      <ResponsiveRowActions
                        actions={[
                          ...(canMutate ? [{ key: 'edit', label: 'Sửa bản ghi', icon: <Edit className="h-4 w-4" />, onClick: () => openRecordModal('edit', record), tone: 'success' } satisfies RowAction] : []),
                          // 8.7: mark-resolved — visible when not DA_XU_LY, role ADMIN/DEPT_HEAD/TEAM_LEAD
                          ...(canMarkResolved && record.trangThai !== 'DA_XU_LY'
                            ? [{ key: 'mark-resolved', label: 'Đánh dấu đã xử lý', icon: <CheckCircle className="h-4 w-4" />, onClick: () => handleMarkResolved(record), tone: 'success', disabled: markResolved.isPending } satisfies RowAction]
                            : []),
                          // 8.7: mark-recurred — visible only when DA_XU_LY, role ADMIN/DEPT_HEAD; confirmed with optional reason
                          ...(canMarkRecurred && record.trangThai === 'DA_XU_LY'
                            ? [{ key: 'mark-recurred', label: 'Đánh dấu tái phát', icon: <RefreshCw className="h-4 w-4" />, onClick: () => { setRecurReason(''); setPendingAction({ kind: 'markRecurred', record }); }, tone: 'warning', disabled: markRecurred.isPending } satisfies RowAction]
                            : []),
                          ...(canDeleteRecord ? [{ key: 'delete', label: 'Xóa bản ghi', icon: <Trash2 className="h-4 w-4" />, onClick: () => setPendingAction({ kind: 'deleteRecord', record }), tone: 'danger' } satisfies RowAction] : []),
                        ]}
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pager(recordsQuery.data?.pagination, recordFilters.page ?? 1, (page) => setRecordFilters((filters) => ({ ...filters, page })))}
        </section>
      ) : (
        <section className="min-w-0 rounded-lg border border-gray-200 bg-white">
          {/* Toolbar: search + filters + count + create on one wrapping row */}
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 p-3">
            <div className="relative min-w-[180px] flex-1 basis-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <input type="search" aria-label="Tìm mẫu lỗi" value={templateFilters.search ?? ''} onChange={(event) => setTemplateFilters((filters) => ({ ...filters, search: event.target.value, page: 1 }))} placeholder="Tìm mã, tên mẫu..." className={`${FILTER_CONTROL} w-full pl-8`} />
            </div>
            <select aria-label="Lọc theo hệ thống" value={templateFilters.machineSystemId ?? ''} onChange={(event) => setTemplateFilters((filters) => ({ ...filters, machineSystemId: event.target.value || undefined, machineSystemDetailId: undefined, page: 1 }))} className={`${FILTER_CONTROL} max-w-[200px]`} disabled={!!lockedMachineSystemId} hidden={!!lockedMachineSystemId}>
              <option value="">Tất cả hệ thống</option>
              {systems.map((system) => <option key={system.id} value={system.id}>{system.maHeThong} - {system.tenHeThong}</option>)}
            </select>
            <select aria-label="Lọc theo chi tiết máy" value={templateFilters.machineSystemDetailId ?? ''} onChange={(event) => setTemplateFilters((filters) => ({ ...filters, machineSystemDetailId: event.target.value || undefined, page: 1 }))} className={`${FILTER_CONTROL} max-w-[200px]`}>
              <option value="">Tất cả chi tiết</option>
              {details.map((detail) => <option key={detail.id} value={detail.id}>{detail.maChiTiet} - {detail.tenChiTiet}</option>)}
            </select>
            <select aria-label="Lọc theo mức độ" value={templateFilters.mucDo ?? ''} onChange={(event) => setTemplateFilters((filters) => ({ ...filters, mucDo: event.target.value || undefined, page: 1 }))} className={FILTER_CONTROL}>
              <option value="">Tất cả mức độ</option>
              {SEVERITIES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select aria-label="Lọc theo hoạt động" value={templateFilters.hoatDong === undefined ? '' : String(templateFilters.hoatDong)} onChange={(event) => setTemplateFilters((filters) => ({ ...filters, hoatDong: event.target.value === '' ? undefined : event.target.value === 'true', page: 1 }))} className={FILTER_CONTROL}>
              <option value="">Tất cả hoạt động</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Dừng</option>
            </select>
            <div className="ml-auto flex items-center gap-3">
              <span className="whitespace-nowrap text-sm text-gray-600">Tổng: {templatesQuery.data?.pagination?.total ?? 0} mẫu</span>
              {canMutate && <button type="button" onClick={() => openTemplateModal('create')} className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"><Plus className="h-4 w-4" aria-hidden="true" /> Thêm mẫu lỗi</button>}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-sm">
              <thead className="sticky top-0 z-20 border-b border-gray-200 bg-gray-50">
                <tr>
                  <th scope="col" className={`${TH} ${STICKY_LEFT_TH} w-[110px]`}>Mã mẫu</th>
                  <th scope="col" className={TH}>Tên mẫu</th>
                  <th scope="col" className={TH}>Vị trí</th>
                  <th scope="col" className={`${TH} w-[110px]`}>Mức độ</th>
                  <th scope="col" className={`${TH} w-[120px]`}>Trạng thái</th>
                  <th scope="col" className={`${TH} w-[80px] text-right`}>Bản ghi</th>
                  <th scope="col" className={`${TH} ${STICKY_RIGHT_TH} w-[1%] text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {templatesQuery.isLoading ? (
                  <SkeletonRows cols={7} />
                ) : templates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-10 text-center text-sm text-gray-400">
                      {templateFilters.search || templateFilters.mucDo || templateFilters.machineSystemDetailId || templateFilters.hoatDong !== undefined || (templateFilters.machineSystemId && !lockedMachineSystemId)
                        ? 'Không có mẫu lỗi nào khớp với bộ lọc hiện tại.'
                        : 'Chưa có mẫu lỗi nào được tạo.'}
                    </td>
                  </tr>
                ) : templates.map((template) => {
                  const statusLabel = template.hoatDong ? template.trangThai : 'Dừng';
                  const systemLabel = template.machineSystem?.tenHeThong ?? '';
                  const detailLabel = template.machineSystemDetail?.tenChiTiet ?? '';
                  return (
                  <tr
                    key={template.id}
                    className="group cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => setDetailTemplate(template)}
                  >
                    <td className={`${TD} ${STICKY_LEFT_TD} whitespace-nowrap`}>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDetailTemplate(template); }}
                        title={`Xem chi tiết ${template.maMauLoi}`}
                        className="rounded font-mono text-xs font-medium text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        {template.maMauLoi}
                      </button>
                    </td>
                    <td className={TD}>
                      <div className="max-w-[260px] truncate font-medium text-gray-900" title={template.tenMauLoi}>{template.tenMauLoi}</div>
                    </td>
                    <td className={TD}>
                      {systemLabel
                        ? <div className="max-w-[180px] truncate text-xs leading-tight text-gray-800" title={systemLabel}>{systemLabel}</div>
                        : <div className="text-xs text-gray-400">—</div>}
                      {detailLabel && <div className="mt-0.5 max-w-[180px] truncate text-[11px] text-gray-400" title={detailLabel}>{detailLabel}</div>}
                    </td>
                    <td className={`${TD} whitespace-nowrap`}>
                      {template.mucDo ? <SeverityBadge value={template.mucDo} /> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className={`${TD} whitespace-nowrap`}>
                      <StatusBadge label={statusLabel} tone={templateStatusTone(statusLabel)} />
                    </td>
                    <td className={`${TD} text-right tabular-nums`}>
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-100 px-1.5 text-xs font-medium text-gray-600" title={`${template._count?.faultRecords ?? 0} bản ghi lỗi dùng mẫu này`}>{template._count?.faultRecords ?? 0}</span>
                    </td>
                    {/* Stop propagation so an action click does not also open the detail drawer */}
                    <td className={`${TD} ${STICKY_RIGHT_TD} whitespace-nowrap`} onClick={(e) => e.stopPropagation()}>
                      <ResponsiveRowActions
                        actions={[
                          { key: 'view', label: 'Xem mẫu lỗi', icon: <Eye className="h-4 w-4" />, onClick: () => setDetailTemplate(template), tone: 'primary' },
                          ...(canMutate ? [{ key: 'edit', label: 'Sửa mẫu lỗi', icon: <Edit className="h-4 w-4" />, onClick: () => openTemplateModal('edit', template), tone: 'success' } satisfies RowAction] : []),
                          ...(canMutate && template.hoatDong ? [{ key: 'deactivate', label: 'Dừng hoạt động', icon: <Power className="h-4 w-4" />, onClick: () => setPendingAction({ kind: 'deactivateTemplate', template }), tone: 'warning' } satisfies RowAction] : []),
                          ...(canDeleteRecord ? [{ key: 'delete', label: 'Xóa mẫu lỗi', icon: <Trash2 className="h-4 w-4" />, onClick: () => setPendingAction({ kind: 'deleteTemplate', template }), tone: 'danger' } satisfies RowAction] : []),
                        ]}
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pager(templatesQuery.data?.pagination, templateFilters.page ?? 1, (page) => setTemplateFilters((filters) => ({ ...filters, page })))}
        </section>
      )}

      {/* Record create/edit/view modal */}
      <Modal isOpen={!!recordModal} onClose={closeRecordModal} showBackdrop closeOnBackdrop>
        <div className="flex modal-viewport-h w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-base font-semibold text-gray-900">{recordModal?.mode === 'view' ? 'Chi tiết bản ghi lỗi' : recordModal?.record ? 'Sửa bản ghi lỗi' : 'Thêm bản ghi lỗi'}</h3>
            <button title="Đóng" onClick={closeRecordModal} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={saveRecord} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>}
            {/* Recurrence banner — only shown when creating (not editing) and both ids are filled */}
            {recordModal?.mode !== 'view' && !recordModal?.record && createFaultTemplateId && createMachineSystemDetailId && (
              <RecurrenceBanner
                faultTemplateId={createFaultTemplateId}
                machineSystemDetailId={createMachineSystemDetailId}
                onMarkRecurrence={() => {/* server handles status — banner is informational only */}}
                onOpenRecord={(id) => {
                  closeRecordModal();
                  // Fetch then open in view mode (works for embedded/locked usage too)
                  setPendingViewId(id);
                }}
              />
            )}
            <div className="grid gap-3 md:grid-cols-2">
              {/* 6.1: Typeahead combobox for template selection */}
              <label className="space-y-1 md:col-span-2">
                <span className="font-medium text-gray-700">Chọn từ mẫu lỗi</span>
                {recordModal?.mode === 'view' || !!recordModal?.record ? (
                  <div className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-gray-700">
                    {recordModal?.record?.faultTemplate
                      ? `${recordModal.record.faultTemplate.maMauLoi} - ${recordModal.record.faultTemplate.tenMauLoi}`
                      : 'Không dùng mẫu'}
                  </div>
                ) : (
                  <div ref={templateSearchRef} className="relative">
                    <input
                      type="text"
                      value={templateSearch}
                      onChange={(e) => {
                        setTemplateSearch(e.target.value);
                        setShowTemplateDropdown(true);
                        if (!e.target.value) {
                          setRecordForm((f) => ({ ...f, faultTemplateId: '' }));
                        }
                      }}
                      onFocus={() => setShowTemplateDropdown(true)}
                      placeholder="Tìm tên mẫu lỗi... (ít nhất 2 ký tự)"
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                    {/* Clear button */}
                    {(recordForm.faultTemplateId || templateSearch) && (
                      <button
                        type="button"
                        onClick={() => {
                          setTemplateSearch('');
                          setShowTemplateDropdown(false);
                          setRecordForm((f) => ({ ...f, faultTemplateId: '' }));
                        }}
                        className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                        title="Xóa lựa chọn"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {/* Dropdown */}
                    {showTemplateDropdown && (
                      <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
                        {/* "No template" option */}
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setTemplateSearch('');
                            setShowTemplateDropdown(false);
                            setRecordForm((f) => ({ ...f, faultTemplateId: '' }));
                          }}
                          className="flex w-full items-center px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
                        >
                          Không chọn mẫu
                        </button>
                        {templateSearch.length >= 2 && (
                          <>
                            {templateSearchQuery.isLoading && (
                              <p className="px-3 py-2 text-sm text-gray-400">Đang tìm...</p>
                            )}
                            {templateSearchQuery.data?.data?.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => chooseTemplate(t.id, t)}
                                className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-blue-50 ${recordForm.faultTemplateId === t.id ? 'bg-blue-50' : ''}`}
                              >
                                <div className="text-left">
                                  <span className="font-medium text-gray-800">{t.tenMauLoi}</span>
                                  <span className="ml-1.5 font-mono text-xs text-gray-400">{t.maMauLoi}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <SeverityBadge value={t.mucDo} size="sm" />
                                  {t._count && (
                                    <span className="text-[11px] text-gray-400">{t._count.faultRecords} lần</span>
                                  )}
                                </div>
                              </button>
                            ))}
                            {!templateSearchQuery.isLoading && templateSearch.length >= 2 && (templateSearchQuery.data?.data?.length ?? 0) === 0 && (
                              <p className="px-3 py-2 text-sm text-gray-400">Không tìm thấy mẫu phù hợp.</p>
                            )}
                          </>
                        )}
                        {templateSearch.length < 2 && templateSearch.length > 0 && (
                          <p className="px-3 py-2 text-sm text-gray-400">Nhập thêm ký tự để tìm...</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </label>
              {/* 6.2: Linked repair steps read-only when template selected */}
              {recordForm.faultTemplateId && (() => {
                const tpl = activeTemplates.find((t) => t.id === recordForm.faultTemplateId);
                const steps = tpl?.repairSteps ?? [];
                if (steps.length === 0) return null;
                return (
                  <div className="md:col-span-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <p className="mb-2 text-xs font-semibold text-blue-600">Các bước sửa chữa ({steps.length})</p>
                    <ol className="space-y-1">
                      {steps.map((step, i) => (
                        <li key={step.id} className="flex gap-2 text-sm text-blue-800">
                          <span className="shrink-0 font-bold">{i + 1}.</span>
                          <div>
                            <span>{step.moTa}</span>
                            {step.thoiGianUocTinh != null && (
                              <span className="ml-1.5 text-xs text-blue-500">{step.thoiGianUocTinh} phút</span>
                            )}
                            {step.dungCu && <span className="ml-1.5 text-xs text-blue-500">{step.dungCu}</span>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })()}
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Hệ thống</span>
                <select disabled={recordModal?.mode === 'view' || !!lockedMachineSystemId} value={recordForm.machineSystemId ?? ''} onChange={(event) => setRecordForm((form) => ({ ...form, machineSystemId: event.target.value, machineSystemDetailId: '', maHeThong: systems.find((system) => system.id === event.target.value)?.maHeThong ?? '' }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">
                  <option value="">Chọn hệ thống</option>
                  {systems.map((system) => <option key={system.id} value={system.id}>{system.maHeThong} - {system.tenHeThong}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Chi tiết máy</span>
                <select disabled={recordModal?.mode === 'view'} value={recordForm.machineSystemDetailId ?? ''} onChange={(event) => syncSystemFromDetail(event.target.value, 'record')} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">
                  <option value="">Không chọn</option>
                  {detailOptionsForRecord.map((detail) => <option key={detail.id} value={detail.id}>{detail.maChiTiet} - {detail.tenChiTiet}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Tên lỗi</span>
                <input required disabled={recordModal?.mode === 'view'} value={recordForm.tenLoi ?? ''} onChange={(event) => setRecordForm((form) => ({ ...form, tenLoi: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Người phát hiện</span>
                <input required disabled={recordModal?.mode === 'view'} value={recordForm.nguoiPhatHien} onChange={(event) => setRecordForm((form) => ({ ...form, nguoiPhatHien: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Mức độ</span>
                <select disabled={recordModal?.mode === 'view'} value={recordForm.mucDo ?? 'Trung bình'} onChange={(event) => setRecordForm((form) => ({ ...form, mucDo: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">{SEVERITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              </label>
              {/* 8.6: trangThai is readonly — shown in view mode only; create/edit do not expose the field */}
              {recordModal?.mode === 'view' && recordModal.record && (
                <label className="space-y-1">
                  <span className="font-medium text-gray-700">Trạng thái</span>
                  <div className="flex items-center pt-1">
                    <StatusBadge
                      label={FAULT_STATUS_LABEL[recordModal.record.trangThai] ?? recordModal.record.trangThai}
                      tone={FAULT_STATUS_TONE[recordModal.record.trangThai] ?? 'gray'}
                    />
                  </div>
                </label>
              )}
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Ngày phát hiện</span>
                <input type="date" disabled={recordModal?.mode === 'view'} value={recordForm.ngayPhatHien ?? ''} onChange={(event) => setRecordForm((form) => ({ ...form, ngayPhatHien: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              {recordModal?.mode === 'view' && recordModal.record?.ngayXuLy && (
                <label className="space-y-1">
                  <span className="font-medium text-gray-700">Thời điểm xử lý</span>
                  <div className="flex items-center pt-1 text-sm text-gray-800">
                    {formatDateTime(recordModal.record.ngayXuLy)}
                  </div>
                </label>
              )}
              <label className="space-y-1 md:col-span-2">
                <span className="font-medium text-gray-700">Mô tả</span>
                <textarea required disabled={recordModal?.mode === 'view'} rows={3} value={recordForm.moTa ?? ''} onChange={(event) => setRecordForm((form) => ({ ...form, moTa: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              {recordModal?.mode !== 'view' && <div className="md:col-span-2"><FileUpload label="File đính kèm" files={selectedFile ? [selectedFile] : []} onChange={(files) => setSelectedFile(files[0] ?? null)} compact /></div>}
              {/* 7.2: RepairStepForm shown when auto-creating (no template, canMutate) */}
              {recordModal?.mode !== 'view' && !recordModal?.record && !recordForm.faultTemplateId && canMutate && (
                <div className="md:col-span-2 space-y-1">
                  <span className="font-medium text-gray-700 text-sm">Các bước sửa chữa (tùy chọn)</span>
                  <RepairStepForm steps={recordRepairSteps} onChange={setRecordRepairSteps} />
                </div>
              )}
              {/* Task 3.5: Status history — visible in view mode only */}
              {recordModal?.mode === 'view' && recordModal.record && (
                <div className="md:col-span-2">
                  <FaultStatusHistorySection faultRecordId={recordModal.record.id} />
                </div>
              )}
              {/* 7.4: Repair steps read-only in view modal when linked template has steps */}
              {recordModal?.mode === 'view' && recordModal.record?.faultTemplate?.repairSteps && recordModal.record.faultTemplate.repairSteps.length > 0 && (
                <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-gray-500">Các bước sửa chữa ({recordModal.record.faultTemplate.repairSteps.length})</p>
                  <ol className="space-y-1">
                    {recordModal.record.faultTemplate.repairSteps.map((step, i) => (
                      <li key={step.id} className="flex gap-2 text-sm text-gray-700">
                        <span className="shrink-0 font-bold text-gray-400">{i + 1}.</span>
                        <div>
                          <span>{step.moTa}</span>
                          {step.thoiGianUocTinh != null && (
                            <span className="ml-1.5 text-xs text-gray-400">{step.thoiGianUocTinh} phút</span>
                          )}
                          {step.dungCu && <span className="ml-1.5 text-xs text-gray-400">{step.dungCu}</span>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <button type="button" onClick={closeRecordModal} className="rounded-md border border-gray-300 px-4 py-2">{recordModal?.mode === 'view' ? 'Đóng' : 'Hủy'}</button>
              {recordModal?.mode !== 'view' && <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white">Lưu</button>}
            </div>
          </form>
        </div>
      </Modal>

      {/* Template create/edit/view modal */}
      <Modal isOpen={!!templateModal} onClose={() => setTemplateModal(null)} showBackdrop closeOnBackdrop>
        <div className="flex modal-viewport-h w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-base font-semibold text-gray-900">{templateModal?.mode === 'view' ? 'Chi tiết mẫu lỗi' : templateModal?.template ? 'Sửa mẫu lỗi' : 'Thêm mẫu lỗi'}</h3>
            <button title="Đóng" onClick={() => setTemplateModal(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
          </div>
          <form onSubmit={saveTemplate} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>}
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Hệ thống</span>
                <select disabled={templateModal?.mode === 'view' || !!lockedMachineSystemId} value={templateForm.machineSystemId ?? ''} onChange={(event) => setTemplateForm((form) => ({ ...form, machineSystemId: event.target.value, machineSystemDetailId: '' }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">
                  <option value="">Chọn hệ thống</option>
                  {systems.map((system) => <option key={system.id} value={system.id}>{system.maHeThong} - {system.tenHeThong}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Chi tiết máy</span>
                <select required disabled={templateModal?.mode === 'view'} value={templateForm.machineSystemDetailId} onChange={(event) => syncSystemFromDetail(event.target.value, 'template')} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">
                  <option value="">Chọn chi tiết</option>
                  {detailOptionsForTemplate.map((detail) => <option key={detail.id} value={detail.id}>{detail.maChiTiet} - {detail.tenChiTiet}</option>)}
                </select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Tên mẫu lỗi</span>
                <input required disabled={templateModal?.mode === 'view'} value={templateForm.tenMauLoi} onChange={(event) => setTemplateForm((form) => ({ ...form, tenMauLoi: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Mức độ</span>
                <select disabled={templateModal?.mode === 'view'} value={templateForm.mucDo} onChange={(event) => setTemplateForm((form) => ({ ...form, mucDo: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">{SEVERITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-700">Trạng thái</span>
                <select disabled={templateModal?.mode === 'view'} value={templateForm.trangThai ?? 'Đang áp dụng'} onChange={(event) => setTemplateForm((form) => ({ ...form, trangThai: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50">{TEMPLATE_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              </label>
              <label className="flex items-center gap-2 pt-6">
                <input type="checkbox" disabled={templateModal?.mode === 'view'} checked={!!templateForm.hoatDong} onChange={(event) => setTemplateForm((form) => ({ ...form, hoatDong: event.target.checked }))} />
                <span className="font-medium text-gray-700">Đang hoạt động</span>
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="font-medium text-gray-700">Mô tả</span>
                <textarea required disabled={templateModal?.mode === 'view'} rows={3} value={templateForm.moTa} onChange={(event) => setTemplateForm((form) => ({ ...form, moTa: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="font-medium text-gray-700">Ghi chú</span>
                <textarea disabled={templateModal?.mode === 'view'} rows={2} value={templateForm.ghiChu ?? ''} onChange={(event) => setTemplateForm((form) => ({ ...form, ghiChu: event.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2 disabled:bg-gray-50" />
              </label>
              {templateModal?.mode !== 'view' && <div className="md:col-span-2"><FileUpload label="File đính kèm" files={selectedFile ? [selectedFile] : []} onChange={(files) => setSelectedFile(files[0] ?? null)} compact /></div>}
              {/* 7.3: RepairStepForm integrated into template create/edit */}
              <div className="md:col-span-2 space-y-1">
                <span className="font-medium text-gray-700 text-sm">Các bước sửa chữa</span>
                <RepairStepForm
                  steps={templateRepairSteps}
                  onChange={setTemplateRepairSteps}
                  disabled={templateModal?.mode === 'view'}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-3">
              <button type="button" onClick={() => setTemplateModal(null)} className="rounded-md border border-gray-300 px-4 py-2">{templateModal?.mode === 'view' ? 'Đóng' : 'Hủy'}</button>
              {templateModal?.mode !== 'view' && <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white">Lưu</button>}
            </div>
          </form>
        </div>
      </Modal>
      {/* Confirm dialogs for destructive / irreversible row actions */}
      <ConfirmDialog
        isOpen={pendingAction?.kind === 'deleteRecord'}
        title="Xóa bản ghi lỗi"
        message={pendingAction?.kind === 'deleteRecord' ? `Xóa bản ghi ${pendingAction.record.maLoi} — ${pendingAction.record.tenLoi}? Thao tác này không thể hoàn tác.` : ''}
        onConfirm={() => { void runPendingAction(); }}
        onCancel={closePendingAction}
        loading={confirmBusy}
      />
      <ConfirmDialog
        isOpen={pendingAction?.kind === 'deleteTemplate'}
        title="Xóa mẫu lỗi"
        message={pendingAction?.kind === 'deleteTemplate' ? `Xóa mẫu lỗi ${pendingAction.template.maMauLoi} — ${pendingAction.template.tenMauLoi}? Thao tác này không thể hoàn tác.` : ''}
        onConfirm={() => { void runPendingAction(); }}
        onCancel={closePendingAction}
        loading={confirmBusy}
      />
      <ConfirmDialog
        isOpen={pendingAction?.kind === 'deactivateTemplate'}
        title="Dừng mẫu lỗi"
        message={pendingAction?.kind === 'deactivateTemplate' ? `Dừng áp dụng mẫu lỗi ${pendingAction.template.maMauLoi}? Mẫu sẽ không còn được gợi ý khi tạo bản ghi mới.` : ''}
        onConfirm={() => { void runPendingAction(); }}
        onCancel={closePendingAction}
        loading={confirmBusy}
        confirmText="Dừng hoạt động"
        cancelText="Hủy"
        variant="primary"
      >
        <span className="sr-only">Xác nhận dừng mẫu lỗi</span>
      </ConfirmDialog>
      <ConfirmDialog
        isOpen={pendingAction?.kind === 'markRecurred'}
        title="Đánh dấu tái phát"
        message={pendingAction?.kind === 'markRecurred' ? `Chuyển bản ghi ${pendingAction.record.maLoi} từ "Đã xử lý" sang "Tái phát"?` : ''}
        onConfirm={() => { void runPendingAction(); }}
        onCancel={closePendingAction}
        loading={confirmBusy}
        confirmText="Đánh dấu tái phát"
        cancelText="Hủy"
        variant="primary"
      >
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-gray-700">Lý do (tùy chọn)</span>
          <textarea
            rows={2}
            value={recurReason}
            onChange={(e) => setRecurReason(e.target.value)}
            maxLength={500}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            placeholder="Ví dụ: lỗi xuất hiện lại sau 2 ngày vận hành"
          />
        </label>
      </ConfirmDialog>

      {/* 8.2: Template detail drawer */}
      <FaultTemplateDetail
        template={detailTemplate}
        onClose={() => setDetailTemplate(null)}
      />
    </div>
  );
};

export default FaultRecordList;
