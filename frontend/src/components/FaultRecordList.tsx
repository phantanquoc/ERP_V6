import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Edit, Eye, Plus, Power, RefreshCw, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
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

// Template status badge helper (template statuses are still free-form strings)
const templateStatusBadge = (value: string) => {
  if (value === 'Đang áp dụng') return 'bg-green-100 text-green-700 border-green-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('vi-VN') : '—';
const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
};

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

const FaultRecordList = ({ lockedMachineSystemId }: FaultRecordListProps = {}) => {
  const { user } = useAuth();
  const reporter = user ? `${user.lastName} ${user.firstName}`.trim() : '';
  const isTechnical = user?.department === 'technical' ||
    user?.secondaryDepartments?.some(d => d.departmentCode === 'technical');
  const canCreate = !!user;
  const canMutate = user?.role === 'admin' || isTechnical;

  const [view, setView] = useState<ViewMode>('records');
  const [recordFilters, setRecordFilters] = useState<FaultRecordFilters>({ page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc', machineSystemId: lockedMachineSystemId });
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

  const records = recordsQuery.data?.data ?? [];
  const templates = templatesQuery.data?.data ?? [];
  const activeTemplates = activeTemplatesQuery.data?.data ?? [];
  const systems = systemsQuery.data?.data ?? [];
  // Memoize to stabilise reference so downstream useMemos don't re-run on every render
  const details = useMemo(() => detailsQuery.data?.data ?? [], [detailsQuery.data?.data]);
  const stats = statsQuery.data?.data;

  const [recordModal, setRecordModal] = useState<{ mode: ModalMode; record?: FaultRecord } | null>(null);
  const [templateModal, setTemplateModal] = useState<{ mode: ModalMode; template?: FaultTemplate } | null>(null);
  const [recordForm, setRecordForm] = useState<CreateFaultRecordRequest>(emptyRecordForm(reporter, lockedMachineSystemId ?? ''));
  const [templateForm, setTemplateForm] = useState<CreateFaultTemplateRequest>(emptyTemplateForm(lockedMachineSystemId ?? ''));
  const [templateRepairSteps, setTemplateRepairSteps] = useState<RepairStepInput[]>([]);
  const [recordRepairSteps, setRecordRepairSteps] = useState<RepairStepInput[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');
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

  // Auto-open view modal when ?faultRecordId= is in URL (deep-link from notifications)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const faultRecordId = searchParams.get('faultRecordId');
    if (!faultRecordId) return;
    setPendingViewId(faultRecordId);
    const next = new URLSearchParams(searchParams);
    next.delete('faultRecordId');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('faultRecordId')]);

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
      setRecordModal(null);
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

  const pager = (pagination: typeof recordsQuery.data.pagination, page: number, setPage: (page: number) => void) => {
    if (!pagination || pagination.totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between border-t border-gray-200 px-3 py-2 text-sm">
        <span className="text-gray-600">Trang {pagination.page}/{pagination.totalPages} - {pagination.total} dòng</span>
        <div className="flex gap-1">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40">Trước</button>
          <button disabled={page >= pagination.totalPages} onClick={() => setPage(page + 1)} className="rounded-md border border-gray-300 px-3 py-1 disabled:opacity-40">Sau</button>
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
    <div className="space-y-4">
      {/* Header row with title and tab switcher */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Lỗi cơ điện</h2>
          <p className="text-xs text-gray-500">Mẫu lỗi tham chiếu và bản ghi lỗi thực tế theo chi tiết máy.</p>
        </div>
        <div className="flex rounded-lg border border-gray-300 bg-white p-1 text-sm">
          <button onClick={() => setView('records')} className={`rounded-md px-3 py-1.5 ${view === 'records' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>Bản ghi lỗi</button>
          {canMutate && (
            <button onClick={() => setView('templates')} className={`rounded-md px-3 py-1.5 ${view === 'templates' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>Mẫu lỗi</button>
          )}
        </div>
      </div>

      {/* Summary stat cards — only shown in records view */}
      {view === 'records' && (
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

      {/* A6: quick-filter chip row */}
      {view === 'records' && (
        <div className="flex flex-wrap gap-2">
          {(['ALL' as const, ...RECORD_STATUS_VALUES]).map((chip) => {
            const isActive = chip === 'ALL' ? !recordFilters.trangThai : recordFilters.trangThai === chip;
            const label = chip === 'ALL' ? 'Tất cả' : FAULT_STATUS_LABEL[chip];
            return (
              <button
                key={chip}
                type="button"
                onClick={() => setRecordFilters((f) => ({ ...f, trangThai: chip === 'ALL' ? undefined : chip, page: 1 }))}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${isActive ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Collapsible sections — only shown in records view */}
      {view === 'records' && (
        <>
          {/* A3: default-open insight collapsibles */}
          <CollapsibleSection title="Máy hay lỗi nhất" defaultOpen>
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

          <CollapsibleSection title="Lỗi hay tái phát" defaultOpen>
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

          {/* A3: Xu hướng theo tháng default-open; 12.3 wires FaultTrendChart */}
          <CollapsibleSection title="Xu hướng theo tháng" defaultOpen>
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
        </>
      )}

      {view === 'records' ? (
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-600">Tổng: {recordsQuery.data?.pagination?.total ?? 0} bản ghi</div>
              {canCreate && <button onClick={() => openRecordModal('create')} className="inline-flex w-fit items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white"><Plus className="h-4 w-4" /> Thêm bản ghi</button>}
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <input value={recordFilters.search ?? ''} onChange={(event) => setRecordFilters((filters) => ({ ...filters, search: event.target.value, page: 1 }))} placeholder="Tìm mã, tên lỗi..." className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm" />
              </div>
              <select value={recordFilters.machineSystemId ?? ''} onChange={(event) => setRecordFilters((filters) => ({ ...filters, machineSystemId: event.target.value || undefined, machineSystemDetailId: undefined, page: 1 }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm" disabled={!!lockedMachineSystemId} hidden={!!lockedMachineSystemId}>
                <option value="">Tất cả hệ thống</option>
                {systems.map((system) => <option key={system.id} value={system.id}>{system.maHeThong} - {system.tenHeThong}</option>)}
              </select>
              <select value={recordFilters.machineSystemDetailId ?? ''} onChange={(event) => setRecordFilters((filters) => ({ ...filters, machineSystemDetailId: event.target.value || undefined, page: 1 }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Tất cả chi tiết</option>
                {details.map((detail) => <option key={detail.id} value={detail.id}>{detail.maChiTiet} - {detail.tenChiTiet}</option>)}
              </select>
              <select value={recordFilters.mucDo ?? ''} onChange={(event) => setRecordFilters((filters) => ({ ...filters, mucDo: event.target.value || undefined, page: 1 }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Mức độ</option>
                {SEVERITIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={recordFilters.trangThai ?? ''} onChange={(event) => setRecordFilters((filters) => ({ ...filters, trangThai: (event.target.value as FaultRecordStatus) || undefined, page: 1 }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Trạng thái</option>
                {RECORD_STATUS_VALUES.map((item) => <option key={item} value={item}>{FAULT_STATUS_LABEL[item]}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                <tr>
                  <th className="border-b px-3 py-2.5 text-left sticky left-0 bg-gray-50 z-10 min-w-[90px]">Mã lỗi</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[160px]">Tên lỗi</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[150px]">Vị trí</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[90px]">Mức độ</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[100px]">Trạng thái</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[110px]">Phát hiện</th>
                  <th className="border-b px-3 py-2.5 text-right sticky right-0 bg-gray-50 z-10 min-w-[100px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recordsQuery.isLoading ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">Đang tải...</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">Chưa có bản ghi lỗi phù hợp.</td></tr>
                ) : records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-2.5 sticky left-0 bg-white z-10 font-mono text-xs text-blue-700 font-medium">{record.maLoi}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-gray-900 leading-tight">{record.tenLoi}</div>
                      {record.faultTemplate && <div className="text-xs text-gray-400 mt-0.5">Mẫu: {record.faultTemplate.tenMauLoi}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-gray-800 leading-tight text-xs">{record.machineSystem ? record.machineSystem.tenHeThong : record.maHeThong ?? '—'}</div>
                      {record.machineSystemDetail && <div className="text-[11px] text-gray-400 mt-0.5">{record.machineSystemDetail.tenChiTiet}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      {/* 8.3: use shared SeverityBadge */}
                      <SeverityBadge value={record.mucDo} />
                    </td>
                    <td className="px-3 py-2.5">
                      {/* 8.3/8.8: use shared StatusBadge with enum→label+tone mapping */}
                      <StatusBadge
                        label={FAULT_STATUS_LABEL[record.trangThai] ?? record.trangThai}
                        tone={FAULT_STATUS_TONE[record.trangThai] ?? 'gray'}
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-gray-700 text-xs">{formatDate(record.ngayPhatHien)}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{record.nguoiPhatHien}</div>
                      {record.trangThai === 'DA_XU_LY' && record.ngayXuLy && (
                        <div className="text-[11px] text-green-600 mt-1">Xử lý: {formatDateTime(record.ngayXuLy)}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 sticky right-0 bg-white z-10">
                      <ResponsiveRowActions
                        actions={[
                          { key: 'view', label: 'Xem bản ghi', icon: <Eye className="h-4 w-4" />, onClick: () => openRecordModal('view', record), tone: 'primary' },
                          ...(canMutate ? [{ key: 'edit', label: 'Sửa bản ghi', icon: <Edit className="h-4 w-4" />, onClick: () => openRecordModal('edit', record), tone: 'success' } satisfies RowAction] : []),
                          // 8.7: mark-resolved — visible when not DA_XU_LY, role ADMIN/DEPT_HEAD/TEAM_LEAD
                          ...((user?.role === 'admin' || user?.role === 'department_head' || user?.role === 'team_lead') && record.trangThai !== 'DA_XU_LY'
                            ? [{ key: 'mark-resolved', label: 'Đánh dấu đã xử lý', icon: <CheckCircle className="h-4 w-4" />, onClick: () => markResolved.mutate({ id: record.id }), tone: 'success', disabled: markResolved.isPending } satisfies RowAction]
                            : []),
                          // 8.7: mark-recurred — visible only when DA_XU_LY, role ADMIN/DEPT_HEAD
                          ...((user?.role === 'admin' || user?.role === 'department_head') && record.trangThai === 'DA_XU_LY'
                            ? [{ key: 'mark-recurred', label: 'Đánh dấu tái phát', icon: <RefreshCw className="h-4 w-4" />, onClick: () => markRecurred.mutate({ id: record.id }), tone: 'warning', disabled: markRecurred.isPending } satisfies RowAction]
                            : []),
                          ...(canMutate ? [{ key: 'delete', label: 'Xóa bản ghi', icon: <Trash2 className="h-4 w-4" />, onClick: () => deleteRecord.mutate(record.id), tone: 'danger' } satisfies RowAction] : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pager(recordsQuery.data?.pagination, recordFilters.page ?? 1, (page) => setRecordFilters((filters) => ({ ...filters, page })))}
        </section>
      ) : (
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-600">Tổng: {templatesQuery.data?.pagination?.total ?? 0} mẫu</div>
              {canMutate && <button onClick={() => openTemplateModal('create')} className="inline-flex w-fit items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white"><Plus className="h-4 w-4" /> Thêm mẫu lỗi</button>}
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <input value={templateFilters.search ?? ''} onChange={(event) => setTemplateFilters((filters) => ({ ...filters, search: event.target.value, page: 1 }))} placeholder="Tìm mã, tên mẫu..." className="w-full rounded-md border border-gray-300 py-2 pl-8 pr-3 text-sm" />
              </div>
              <select value={templateFilters.machineSystemId ?? ''} onChange={(event) => setTemplateFilters((filters) => ({ ...filters, machineSystemId: event.target.value || undefined, machineSystemDetailId: undefined, page: 1 }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm" disabled={!!lockedMachineSystemId} hidden={!!lockedMachineSystemId}>
                <option value="">Tất cả hệ thống</option>
                {systems.map((system) => <option key={system.id} value={system.id}>{system.maHeThong} - {system.tenHeThong}</option>)}
              </select>
              <select value={templateFilters.machineSystemDetailId ?? ''} onChange={(event) => setTemplateFilters((filters) => ({ ...filters, machineSystemDetailId: event.target.value || undefined, page: 1 }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Tất cả chi tiết</option>
                {details.map((detail) => <option key={detail.id} value={detail.id}>{detail.maChiTiet} - {detail.tenChiTiet}</option>)}
              </select>
              <select value={templateFilters.mucDo ?? ''} onChange={(event) => setTemplateFilters((filters) => ({ ...filters, mucDo: event.target.value || undefined, page: 1 }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Mức độ</option>
                {SEVERITIES.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={templateFilters.hoatDong === undefined ? '' : String(templateFilters.hoatDong)} onChange={(event) => setTemplateFilters((filters) => ({ ...filters, hoatDong: event.target.value === '' ? undefined : event.target.value === 'true', page: 1 }))} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Hoạt động</option>
                <option value="true">Đang hoạt động</option>
                <option value="false">Dừng</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[750px]">
              <thead className="bg-gray-50 text-xs text-gray-500 font-medium">
                <tr>
                  <th className="border-b px-3 py-2.5 text-left sticky left-0 bg-gray-50 z-10 min-w-[90px]">Mã mẫu</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[150px]">Tên mẫu</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[140px]">Vị trí</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[90px]">Mức độ</th>
                  <th className="border-b px-3 py-2.5 text-left min-w-[100px]">Trạng thái</th>
                  <th className="border-b px-3 py-2.5 text-center min-w-[70px]">Bản ghi</th>
                  <th className="border-b px-3 py-2.5 text-right sticky right-0 bg-gray-50 z-10 min-w-[110px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {templatesQuery.isLoading ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">Đang tải...</td></tr>
                ) : templates.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">Chưa có mẫu lỗi phù hợp.</td></tr>
                ) : templates.map((template) => (
                  <tr
                    key={template.id}
                    className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    onClick={() => setDetailTemplate(template)}
                  >
                    <td className="px-3 py-2.5 sticky left-0 bg-white z-10 font-mono text-xs text-blue-700 font-medium">{template.maMauLoi}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-900">{template.tenMauLoi}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-gray-800 leading-tight text-xs">{template.machineSystem ? template.machineSystem.tenHeThong : '—'}</div>
                      {template.machineSystemDetail && <div className="text-[11px] text-gray-400 mt-0.5">{template.machineSystemDetail.tenChiTiet}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      <SeverityBadge value={template.mucDo} />
                    </td>
                    <td className="px-3 py-2.5"><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${templateStatusBadge(template.hoatDong ? template.trangThai : 'Dừng')}`}>{template.hoatDong ? template.trangThai : 'Dừng'}</span></td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-gray-100 text-xs font-medium text-gray-600">{template._count?.faultRecords ?? 0}</span>
                    </td>
                    <td className="px-3 py-2.5 sticky right-0 bg-white z-10">
                      <ResponsiveRowActions
                        actions={[
                          { key: 'view', label: 'Xem mẫu lỗi', icon: <Eye className="h-4 w-4" />, onClick: () => setDetailTemplate(template), tone: 'primary' },
                          ...(canMutate ? [{ key: 'edit', label: 'Sửa mẫu lỗi', icon: <Edit className="h-4 w-4" />, onClick: () => openTemplateModal('edit', template), tone: 'success' } satisfies RowAction] : []),
                          ...(canMutate && template.hoatDong ? [{ key: 'deactivate', label: 'Dừng hoạt động', icon: <Power className="h-4 w-4" />, onClick: () => deactivateTemplate.mutate(template.id), tone: 'warning' } satisfies RowAction] : []),
                          ...(canMutate ? [{ key: 'delete', label: 'Xóa mẫu lỗi', icon: <Trash2 className="h-4 w-4" />, onClick: () => deleteTemplate.mutate(template.id), tone: 'danger' } satisfies RowAction] : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pager(templatesQuery.data?.pagination, templateFilters.page ?? 1, (page) => setTemplateFilters((filters) => ({ ...filters, page })))}
        </section>
      )}

      {/* Record create/edit/view modal */}
      <Modal isOpen={!!recordModal} onClose={() => setRecordModal(null)} showBackdrop closeOnBackdrop>
        <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-base font-semibold text-gray-900">{recordModal?.mode === 'view' ? 'Chi tiết bản ghi lỗi' : recordModal?.record ? 'Sửa bản ghi lỗi' : 'Thêm bản ghi lỗi'}</h3>
            <button title="Đóng" onClick={() => setRecordModal(null)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X className="h-4 w-4" /></button>
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
                  setRecordModal(null);
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
              <button type="button" onClick={() => setRecordModal(null)} className="rounded-md border border-gray-300 px-4 py-2">{recordModal?.mode === 'view' ? 'Đóng' : 'Hủy'}</button>
              {recordModal?.mode !== 'view' && <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white">Lưu</button>}
            </div>
          </form>
        </div>
      </Modal>

      {/* Template create/edit/view modal */}
      <Modal isOpen={!!templateModal} onClose={() => setTemplateModal(null)} showBackdrop closeOnBackdrop>
        <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
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
      {/* 8.2: Template detail drawer */}
      <FaultTemplateDetail
        template={detailTemplate}
        onClose={() => setDetailTemplate(null)}
      />
    </div>
  );
};

export default FaultRecordList;
