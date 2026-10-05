import { FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Ban, CheckCheck, CheckCircle, FileText, History, Link2, Play, Plus, Save, Send, Trash2, Wrench, X, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getFileUrl } from '../config/api';
import acceptanceHandoverService from '../services/acceptanceHandoverService';
import type { AcceptanceHandoverItemInput } from '../services/acceptanceHandoverService';
import { useQueryClient } from '@tanstack/react-query';
import { isTechnicalUser, canDeleteTechnical } from '../utils/permissions';
import { useAuth as useAuthCtx } from '../contexts/AuthContext';
import FileUpload from './FileUpload';
import Modal from './Modal';
import { ModalForm, ModalFooter, FormField, inputCls, selectCls, textareaCls, readonlyCls } from './ModalForm';
import StatusBadge, { type BadgeTone } from './shared/StatusBadge';
import MachineSystemCombobox from './common/MachineSystemCombobox';
import MachineSystemDetailCombobox from './common/MachineSystemDetailCombobox';
import EmployeeCombobox from './common/EmployeeCombobox';
import ProductCombobox from './common/ProductCombobox';
import UnitSelect from './common/UnitSelect';
import { getDepartmentDisplayName } from '../utils/permissions';
import { useEmployeesForAssignment } from '../hooks/useEmployeesForAssignment';
import { internationalProductService, type InternationalProduct } from '../services/internationalProductService';
import { parseNumberInput } from '../utils/numberInput';
import {
  useCreateRepairRequest,
  useGeneratedRepairRequestCode,
  useRepairCostSummary,
  useRepairIncidentalCosts,
  useCreateIncidentalCost,
  useUpdateIncidentalCost,
  useDeleteIncidentalCost,
  useRepairStatusHistory,
  useUpdateRepairRequest,
  useConfirmAcceptance,
  useCompleteRepair,
  useUpdateRepairActualFields,
  repairRequestKeys,
} from '../hooks/useRepairRequests';
import {
  useCreateInspectionRequest,
  useGeneratedInspectionCode,
  useUpdateInspectionRequest,
  useConfirmInspectionAcceptance,
  useInspectionStatusHistory,
  inspectionKeys,
} from '../hooks/useInspectionRequests';
import { useMachineSystemDetails, useMachineSystems } from '../hooks/useMachineSystemDetails';
import { useFaultRecordTypeahead } from '../hooks/useFaultRecords';
import type { FaultTypeaheadItem } from '../services/faultRecordService';
import {
  CreateRepairRequestRequest,
  RepairRequest,
  RepairRequestItemInput,
  STATUS_LABELS as REPAIR_STATUS_LABELS,
} from '../services/repairRequestService';
import inspectionRequestService, {
  INSPECTION_MAX_FILES,
  STATUS_LABELS as INSPECTION_STATUS_LABELS,
} from '../services/inspectionRequestService';
import repairRequestService from '../services/repairRequestService';
import supplyRequestService from '../services/supplyRequestService';
import { useRepairSupplyChain } from '../hooks/useRepairSupplyLinks';
import type { MachineSystem, MachineSystemDetail } from '../services/machineSystemService';

import {
  PRIORITIES,
  FAULT_TYPES,
  PRIORITY_TONE,
  KET_LUAN_TONE,
  KET_LUAN_OPTIONS,
  KET_LUAN_LABELS,
  MUC_DO_TONE,
  MUC_DO_OPTIONS,
  MUC_DO_LABELS,
  MANUAL_ENTRY,
  formatKetLuan,
  formatMucDo,
  formatTimelineReason,
  formatDateVN,
  formatDateTimeVN,
  ROLE_LABELS,
  activeRepairs,
  buildTechnicalDetailParams,
  canCancelInspection,
  canCancelRepair,
  canConfirmAcceptance,
  canDeleteRequest,
  canEditInspection,
  canEditRepair,
  inspectionStepsFor,
  pickPendingSlip,
} from '../constants/repairRequest';

export type RepairRequestSavedInfo = { id?: number | string; maYeuCau?: string };
export type RepairRequestFormMode = 'create' | 'edit' | 'view';
export type ItemDraft = RepairRequestItemInput & {
  id?: string;
  faultRecordSearch?: string;
  machineSystem?: MachineSystem | null;
  machineSystemDetail?: MachineSystemDetail | null;
};

// Re-export removed — import from '../constants/repairRequest' instead (keeps this file HMR-clean).
// PRIORITIES, FAULT_TYPES, MANUAL_ENTRY, KET_LUAN_LABELS, MUC_DO_LABELS, formatKetLuan, formatMucDo are now in constants/repairRequest.ts

/** "Khu vực - Vị trí" from the machine catalog; a detail's own viTri overrides the system's. */
const locationLabel = (system?: Pick<MachineSystem, 'khuVuc' | 'viTri'> | null, detail?: Pick<MachineSystemDetail, 'viTri'> | null): string =>
  [system?.khuVuc?.trim(), (detail?.viTri?.trim() || system?.viTri?.trim())].filter(Boolean).join(' - ');

const isManualEntry = (item: ItemDraft) => item.machineSystemId === MANUAL_ENTRY;
const hasSystemPicked = (item: ItemDraft) => !!item.machineSystemId && item.machineSystemId !== MANUAL_ENTRY;

const emptyItem = (machineSystemId = ''): ItemDraft => ({
  machineSystemId,
  machineSystemDetailId: '',
  faultRecordId: null,
  faultRecordSearch: '',
  tenHeThong: '',
  tinhTrangThietBi: '',
  loaiLoi: '',
  noiDungLoi: '',
});

const emptyForm = (code = ''): CreateRepairRequestRequest => ({
  ngayThang: new Date().toISOString().split('T')[0],
  maYeuCau: code,
  mucDoUuTien: 'Thấp',
  ghiChu: '',
  items: [emptyItem()],
});

// Per-row typeahead component (hook must live inside a component, not inside .map())
interface FaultRecordTypeaheadCellProps {
  value: string; // faultRecordSearch display text
  faultRecordId: string | null;
  disabled: boolean;
  placeholder?: string;
  onSelect: (item: FaultTypeaheadItem | null) => void;
}

const FaultRecordTypeaheadCell = ({ value, faultRecordId, disabled, placeholder, onSelect }: FaultRecordTypeaheadCellProps) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Keep local display text in sync when parent resets (e.g. emptyItem)
  useEffect(() => {
    setSearch(value);
  }, [value]);

  const typeaheadQuery = useFaultRecordTypeahead({
    trangThai: ['DANG_THEO_DOI', 'TAI_PHAT'],
    search: search.trim().length >= 1 ? search.trim() : undefined,
    limit: 10,
  });
  const suggestions: FaultTypeaheadItem[] = typeaheadQuery.data?.data ?? [];

  useEffect(() => {
    setActiveIndex(-1);
  }, [typeaheadQuery.data]);

  if (disabled) {
    // View mode: show navigable chip or dash
    if (!faultRecordId && !value) return <span className="text-gray-400">—</span>;
    return (
      <button
        type="button"
        title="Xem lỗi liên quan"
        aria-label="Xem lỗi liên quan"
        onClick={() => {
          if (faultRecordId) {
            navigate(`/technical/quality?tab=repairAndFault&faultRecordId=${faultRecordId}`);
          }
        }}
        className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
      >
        <Link2 className="h-3 w-3 shrink-0" />
        {value || faultRecordId}
      </button>
    );
  }

  const selectItem = (item: FaultTypeaheadItem) => {
    setSearch(`${item.maLoi} - ${item.tenLoi}`);
    onSelect(item);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={search}
        placeholder={placeholder ?? 'Tìm mã/tên lỗi...'}
        className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs min-h-[38px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
        onChange={(e) => {
          setSearch(e.target.value);
          if (!e.target.value) onSelect(null);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) {
            if (e.key === 'Escape') setOpen(false);
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
          } else if (e.key === 'Enter') {
            if (activeIndex >= 0 && activeIndex < suggestions.length) {
              e.preventDefault();
              selectItem(suggestions[activeIndex]);
            }
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setOpen(false);
            setActiveIndex(-1);
          }
        }}
      />
      {faultRecordId && (
        <button
          type="button"
          title="Bỏ liên kết"
          aria-label="Bỏ liên kết lỗi"
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-red-500"
          onClick={() => { setSearch(''); onSelect(null); }}
        >
          <X className="h-3 w-3" />
        </button>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-xl text-xs max-h-56 overflow-y-auto">
          {suggestions.map((item, idx) => (
            <li key={item.id}>
              <button
                type="button"
                className={`w-full px-3 py-2 text-left transition-colors ${idx === activeIndex ? 'bg-blue-50' : 'hover:bg-blue-50'}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectItem(item)}
              >
                <span className="font-medium text-gray-800">{item.maLoi}</span>
                <span className="ml-1 text-gray-500">{item.tenLoi}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export type StatusHistoryEntry = { id: string; oldStatus: string | null; newStatus: string; actorName: string | null; actorRole: string | null; reason: string | null; createdAt: string };

/** Status history with Vietnamese status/reason labels and the actor — shared by the detail modal and both lists. */
export const StatusTimeline = ({ entries, isLoading, compact, statusLabels }: { entries: StatusHistoryEntry[]; isLoading: boolean; compact?: boolean; statusLabels: Record<string, { label: string }> }) => {
  const labelOf = (code: string | null | undefined) => (code ? statusLabels[String(code)]?.label ?? String(code) : 'Tạo mới');
  if (isLoading) return <p className="px-1 py-3 text-sm text-gray-400">Đang tải...</p>;
  if (!entries || entries.length === 0) return <p className="px-1 py-3 text-sm text-gray-400">Chưa có thay đổi</p>;
  return (
    <div className="relative pl-4">
      <div className="absolute left-1.5 top-2 bottom-2 w-px bg-gray-200" aria-hidden />
      <ul className="space-y-2">
        {entries.map((e) => {
          const reason = formatTimelineReason(e.reason);
          const actor = [e.actorName, e.actorRole ? (ROLE_LABELS[e.actorRole] ?? e.actorRole) : null].filter(Boolean).join(' · ');
          return (
            <li key={e.id} className="relative pl-2">
              <span className="absolute -left-[9px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500 shadow-sm" aria-hidden />
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                {e.oldStatus && e.oldStatus !== e.newStatus && (<><span className="text-gray-500">{labelOf(e.oldStatus)}</span><span className="text-gray-400">→</span></>)}
                <span className="font-medium text-gray-800">{labelOf(e.newStatus)}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                {actor && <span>{actor}</span>}
                <span className="tabular-nums">{formatDateTimeVN(e.createdAt)}</span>
              </div>
              {reason && <p className={compact ? 'mt-0.5 truncate text-xs text-gray-500' : 'mt-1 text-xs text-gray-600'} title={compact ? reason : undefined}>{reason}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

type InitialRepairItem = { tenHeThong: string; tinhTrangThietBi: string; loaiLoi: string; noiDungLoi: string; machineSystemId?: string; machineSystemDetailId?: string; faultRecordId?: string | null; faultRecord?: { maLoi: string; tenLoi: string } | null; sourceInspectionItemId?: string | null };
type InitialRepairData = { sourceInspectionRequestId?: string; items?: InitialRepairItem[]; ghiChu?: string };

interface RepairRequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: RepairRequestFormMode;
  record?: RepairRequest | null;
  // _source ưu tiên cao nhất để phân biệt YCKT/YCSCC sau tách bảng — record._source từ bàn kiểm tra
  _source?: 'inspection' | 'repair';
  lockedMachineSystemId?: string | number;
  lockedRequestType?: 'KIEM_TRA' | 'SUA_CHUA' | string | null;
  hideCodeField?: boolean;
  onSaved?: (info?: RepairRequestSavedInfo) => void;
  onEdit?: () => void;
  initialData?: InitialRepairData | null;
}

type CleanedItem = { id?: string; machineSystemId?: string; machineSystemDetailId?: string; faultRecordId: string | null; sourceInspectionItemId?: string; tenHeThong: string; tinhTrangThietBi: string; loaiLoi: string; noiDungLoi: string };
type AssigneeDraft = { userId: string; userName: string; isLead: boolean };
// YCCC-style: mỗi dòng là 1 hàng hóa (ProductCombobox + soLuong + donViTinh), giống SupplyRequestModal.
// phanLoai lấy từ InternationalProduct.loaiSanPham; nếu hàng mới (isNewProduct) phanLoai có thể trống hoặc 'Vật tư'.
type MaterialDraft = { itemIndex: number; internationalProductId: string | null; tenVatTu: string; phanLoai: string; donVi: string; soLuongDuKien: number | string };

const RepairRequestFormModal = ({
  isOpen,
  onClose,
  mode,
  record,
  _source,
  lockedMachineSystemId,
  lockedRequestType = null,
  hideCodeField,
  onSaved,
  onEdit,
  initialData,
}: RepairRequestFormModalProps) => {
  const lockedSystemIdStr = lockedMachineSystemId != null ? String(lockedMachineSystemId) : undefined;

  const generatedCode = useGeneratedRepairRequestCode();
  const generatedInspectionCode = useGeneratedInspectionCode();
  const systemsQuery = useMachineSystems({ page: 1, limit: 200, hoatDong: true, sortBy: 'maHeThong', sortOrder: 'asc' });
  // Bulk fetch full tree (backend cap raised to 2000, covers current 301 rows). BQ-001 was missing because old cap=100 truncated before cmrt0…
  const detailsQuery = useMachineSystemDetails({ page: 1, limit: 2000, hoatDong: true, sortBy: 'thuTu', sortOrder: 'asc' });
  const systems = systemsQuery.data?.data ?? [];
  const details = detailsQuery.data?.data ?? [];
  const detailOptions = useMemo(() => details, [details]);
  const employeesQuery = useEmployeesForAssignment();
  const employees = employeesQuery.data ?? [];
  // Catalog hàng hóa cho YCCC picker — giống SupplyRequestModal (dùng chung InternationalProduct)
  const [products, setProducts] = useState<InternationalProduct[]>([]);
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    internationalProductService.getAllProducts(1, 10000).then((res) => {
      if (!cancelled) setProducts(res.data ?? []);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen]);

  const createRequest = useCreateRepairRequest();
  const updateRequest = useUpdateRepairRequest();
  const createInspection = useCreateInspectionRequest();
  const updateInspection = useUpdateInspectionRequest();
  const confirmRepairMut = useConfirmAcceptance();
  const confirmInspectionMut = useConfirmInspectionAcceptance();
  const completeRepairMut = useCompleteRepair();

  const [form, setForm] = useState<CreateRepairRequestRequest>(emptyForm());
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  // YCKT multi-file attachments (max INSPECTION_MAX_FILES); YCSC keeps single selectedFile
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  // SUA_CHUA extra sections state
  const [plan, setPlan] = useState<{ keHoachChiTiet: string; phuongAn: string; bienPhapAnToan: string; ngayBatDauKeHoach: string; ngayHoanThienDuKien: string; canNgungMay: boolean }>({ keHoachChiTiet: '', phuongAn: '', bienPhapAnToan: '', ngayBatDauKeHoach: '', ngayHoanThienDuKien: '', canNgungMay: false });
  const [assignees, setAssignees] = useState<AssigneeDraft[]>([]);
  const [materials, setMaterials] = useState<MaterialDraft[]>([]);
  const [planOpen, setPlanOpen] = useState(true);
  const [assigneeOpen, setAssigneeOpen] = useState(true);
  const [materialOpen, setMaterialOpen] = useState(true);

  const isView = mode === 'view';
  const isSaving = createRequest.isPending || updateRequest.isPending || createInspection.isPending || updateInspection.isPending;
  const modalFormId = useId();
  const formDomId = `repair-request-form-${modalFormId.replace(/:/g, '-')}`;
  const formRef = useRef<HTMLFormElement>(null);
  const formRefSubmit = () => formRef.current?.requestSubmit();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: viewUser } = useAuthCtx();
  const roleUpperView = String((viewUser as unknown as { role?: string })?.role ?? '').toUpperCase();
  const isAdminView = roleUpperView === 'ADMIN';
  // Technician = ADMIN or Kỹ thuật member (primary OR secondary department), any role — mirrors backend requireTechnical
  const isToBTView = isTechnicalUser(viewUser as unknown as Parameters<typeof isTechnicalUser>[0]);
  const canDeleteView = canDeleteTechnical(viewUser as unknown as Parameters<typeof canDeleteTechnical>[0]);
  const viewUserId = String((viewUser as unknown as { id?: string; _id?: string })?.id ?? (viewUser as unknown as { _id?: string })?._id ?? '');
  const isOwnerView = String((record as unknown as { createdById?: string })?.createdById ?? '') !== '' && String((record as unknown as { createdById?: string })?.createdById) === viewUserId;
  // Pending acceptance slip (shared shape for YCSC + YCKT) → only its designated confirmer (or ADMIN) sees ĐẠT/KHÔNG ĐẠT
  type PendingSlip = { id: string; maNghiemThu: string; ketQua?: string | null; nguoiXacNhanId?: string | null; nguoiXacNhanTen?: string | null; tinhTrangSauSuaChua?: string; fileDinhKem?: string | null; ghiChu?: string | null; nguoiBanGiao?: string; lyDoXacNhan?: string | null; xacNhanLuc?: string | null; createdAt?: string };
  const viewSlips = ((record as unknown as { acceptanceHandovers?: PendingSlip[] })?.acceptanceHandovers ?? []);
  const viewPendingSlip = pickPendingSlip(viewSlips);
  const canConfirmView = canConfirmAcceptance(viewSlips, viewUserId, isAdminView);
  const gateActor = { isTechnical: isToBTView, isAdmin: isAdminView, isOwner: isOwnerView };
  // Which table this record belongs to (YCKT and YCSC ids overlap — never guess from the code prefix,
  // migrated YCKT rows may still carry a YC-SC code). Priority:
  // 1) record._source / props._source  2) lockedRequestType when a record exists  3) legacy requestType
  const recordSource = (record as unknown as { _source?: string })?._source;
  const effectiveIsKiemTra = !!record && (
    recordSource === 'inspection'
    || _source === 'inspection'
    || (recordSource !== 'repair' && _source !== 'repair' && (
      lockedRequestType === 'KIEM_TRA'
      || (record as unknown as { requestType?: string })?.requestType === 'KIEM_TRA'
    ))
  );
  // viewStatus/viewKetLuan đọc generic để đúng cả shape InspectionRequest lẫn RepairRequest
  const viewStatus = String((record as unknown as { trangThai?: string })?.trangThai ?? '');
  const viewKetLuanStr = String((record as unknown as { ketLuan?: string })?.ketLuan ?? '');
  const [viewHistoryOpen, setViewHistoryOpen] = useState(false);
  const [historyTab, setHistoryTab] = useState<'handover'|'status'>('handover');
  const [viewCancelOpen, setViewCancelOpen] = useState(false);
  const [viewCancelMode, setViewCancelMode] = useState<'cancel'|'reject'>('cancel');
  const [viewCancelReason, setViewCancelReason] = useState('');
  const [viewDeleteOpen, setViewDeleteOpen] = useState(false);
  const [viewInspectForm, setViewInspectForm] = useState({ ketQuaKiemTra: '', mucDoHuHong: '', deXuatXuLy: '', ketLuan: '' });
  // "Đã khắc phục" → technician must enter acceptance data + attach a file
  const [viewFixForm, setViewFixForm] = useState({ tinhTrangSau: '', ghiChu: '' });
  const [viewFixFile, setViewFixFile] = useState<File | null>(null);
  const viewIsFixed = viewInspectForm.ketLuan === 'DA_KHAC_PHUC';
  const viewCanSubmit = !!(viewInspectForm.ketQuaKiemTra.trim() && viewInspectForm.ketLuan.trim())
    && (!viewIsFixed || (!!viewFixForm.tinhTrangSau.trim() && !!viewFixFile));
  const [viewConfirmOpen, setViewConfirmOpen] = useState(false);
  const [viewConfirmForm, setViewConfirmForm] = useState<{ ketQua: 'DAT' | 'KHONG_DAT'; lyDo: string }>({ ketQua: 'DAT', lyDo: '' });
  const [viewConfirmSubmitting, setViewConfirmSubmitting] = useState(false);
  const [viewCreateRepairOpen, setViewCreateRepairOpen] = useState(false);
  const [viewCreateRepairInitial, setViewCreateRepairInitial] = useState<InitialRepairData | null>(null);
  // YCSC footer modals (copy pattern from RepairDetailPanel)
  const [ycscPlanOpen, setYcscPlanOpen] = useState(false);
  const [ycscPlanForm, setYcscPlanForm] = useState({ keHoachChiTiet: '', phuongAn: '', bienPhapAnToan: '', ngayBatDauKeHoach: '', ngayHoanThienDuKien: '', chiPhiDuKien: '', canNgungMay: false, phongBanId: '' });
  const [ycscSubmitOpen, setYcscSubmitOpen] = useState(false);
  // A2+B2: handover draft per item
  type YcscHandoverDraft = AcceptanceHandoverItemInput & { rowId: string };
  const emptyYcscHandoverItem = (item?: { id: string; tinhTrangThietBi: string; noiDungLoi: string }): YcscHandoverDraft => ({
    rowId: `${Date.now()}-${Math.random()}`,
    repairRequestItemId: item?.id ?? '',
    tinhTrangTruocSuaChua: item ? `${item.tinhTrangThietBi} - ${item.noiDungLoi}` : '',
    tinhTrangSauSuaChua: '',
    ghiChu: '',
  });
  const [ycscHandoverItems, setYcscHandoverItems] = useState<YcscHandoverDraft[]>([]);
  const [ycscHandoverGhiChu, setYcscHandoverGhiChu] = useState('');
  const [ycscHandoverNguoiNhan, setYcscHandoverNguoiNhan] = useState('');
  const [ycscHandoverNguoiNhanId, setYcscHandoverNguoiNhanId] = useState('');
  const [ycscHandoverFile, setYcscHandoverFile] = useState<File | null>(null);
  const [ycscHandoverError, setYcscHandoverError] = useState('');
  const [ycscHandoverSubmitting, setYcscHandoverSubmitting] = useState(false);
  const [ycscConfirmOpen, setYcscConfirmOpen] = useState(false);
  // Confirmer sends { ketQua, lyDo } only — actual cost is entered by technicians
  const [ycscConfirmForm, setYcscConfirmForm] = useState({ ketQua: '' as '' | 'DAT' | 'KHONG_DAT', lyDo: '' });
  const ycscPlanOpen2 = ycscPlanOpen; void ycscPlanOpen2;
  // viewRecordId/hasValidRecordId phải khai trước mọi hook dùng nó (TDZ)
  const hasValidRecordId = (record as unknown as { id?: number | string } | null)?.id != null
    && String((record as unknown as { id?: unknown })?.id ?? '') !== '';
  const viewRecordId = hasValidRecordId ? (record as unknown as { id: number | string }).id : null;
  const ycscIdForChain = isView && !effectiveIsKiemTra && hasValidRecordId ? String(viewRecordId) : null;
  const ycscSupplyChainQ = useRepairSupplyChain(ycscIdForChain as unknown as string | null);
  const ycscCostQ = useRepairCostSummary(ycscIdForChain as unknown as string | null);
  const ycscIncidentalQ = useRepairIncidentalCosts(ycscIdForChain as unknown as string | null);
  const createIncidental = useCreateIncidentalCost();
  const updateIncidental = useUpdateIncidentalCost();
  const deleteIncidental = useDeleteIncidentalCost();
  const [incForm, setIncForm] = useState<{ tenKhoan: string; soTien: string; lyDo: string; filePending: File | null }>({ tenKhoan: '', soTien: '', lyDo: '', filePending: null });
  const [incEditId, setIncEditId] = useState<string | null>(null);
  const [incEdit, setIncEdit] = useState<{ tenKhoan: string; soTien: string; lyDo: string; filePending: File | null }>({ tenKhoan: '', soTien: '', lyDo: '', filePending: null });
  const incidentalCosts: { id: string; tenKhoan: string; soTien: number | string; lyDo: string; fileMinhChung?: string | null }[] = ((ycscIncidentalQ.data as unknown as { data?: unknown[] })?.data ?? (record as unknown as { incidentalCosts?: unknown[] })?.incidentalCosts ?? []) as never;
  const formatVND = (n: number | null | undefined) => n == null ? '—' : Number(n).toLocaleString('vi-VN') + ' ₫';
  const formatNum = (n: number | string | null | undefined) => {
    if (n == null || n === '') return '';
    const v = Number(String(n).replace(/[.,\s]/g, ''));
    if (!Number.isFinite(v)) return String(n);
    return v.toLocaleString('vi-VN');
  };
  const vndInputCls = 'w-full rounded border px-2 py-1 text-sm text-right tabular-nums';
  // Technician-entered actual execution data (YCSC, DA_NGHIEM_THU) — PATCH /:id/actual-fields
  type ActualFieldsSource = { chiPhiThucTe?: number | string | null; gioCongThucTe?: number | string | null; noiDungThucHien?: string | null; ngayHoanThanhThucTe?: string | null };
  const toDateInputValue = (v: string | null | undefined) => {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    // Local calendar date (VN) — not the UTC slice of the ISO string
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const actualFormFrom = (src: ActualFieldsSource | null | undefined) => ({
    chiPhiThucTe: src?.chiPhiThucTe != null ? String(src.chiPhiThucTe) : '',
    gioCongThucTe: src?.gioCongThucTe != null ? String(src.gioCongThucTe) : '',
    noiDungThucHien: src?.noiDungThucHien ?? '',
    ngayHoanThanhThucTe: toDateInputValue(src?.ngayHoanThanhThucTe),
  });
  const [actualForm, setActualForm] = useState(() => actualFormFrom(record as unknown as ActualFieldsSource | null));
  const updateActualFields = useUpdateRepairActualFields();
  const actualSrc = record as unknown as ActualFieldsSource | null | undefined;
  useEffect(() => {
    setActualForm(actualFormFrom(actualSrc));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewRecordId, actualSrc?.chiPhiThucTe, actualSrc?.gioCongThucTe, actualSrc?.noiDungThucHien, actualSrc?.ngayHoanThanhThucTe]);
  const saveActualFields = async () => {
    if (!ycscIdForChain) return;
    const parseOptionalNonNegative = (raw: string, label: string): number | null | false => {
      if (!raw.trim()) return null;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) { toast.error(`${label} phải là số ≥ 0`); return false; }
      return n;
    };
    const chiPhi = parseOptionalNonNegative(actualForm.chiPhiThucTe, 'Chi phí thực tế');
    if (chiPhi === false) return;
    const gioCong = parseOptionalNonNegative(actualForm.gioCongThucTe, 'Giờ công thực tế');
    if (gioCong === false) return;
    try {
      const res = await updateActualFields.mutateAsync({
        id: ycscIdForChain,
        payload: {
          chiPhiThucTe: chiPhi,
          gioCongThucTe: gioCong,
          noiDungThucHien: actualForm.noiDungThucHien.trim() || null,
          ngayHoanThanhThucTe: actualForm.ngayHoanThanhThucTe || null,
        },
      });
      if (res?.data) setActualForm(actualFormFrom(res.data as unknown as ActualFieldsSource));
      // Keep the modal open (onSaved closes it in list callers) — the technician completes from the footer next.
      toast.success('Đã lưu thông tin thực tế');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không lưu được thông tin thực tế');
    }
  };

  useEffect(() => {
    if (!isView || !effectiveIsKiemTra) return;
    const a = record as unknown as Record<string, unknown> | null;
    if (!a) return;
    if (viewStatus === 'DANG_KIEM_TRA' || viewStatus === 'DA_KIEM_TRA' || viewStatus === 'CHO_NGHIEM_THU' || viewStatus === 'HOAN_THANH') {
      setViewInspectForm({
        ketQuaKiemTra: String(a.ketQuaKiemTra ?? ''),
        mucDoHuHong: String(a.mucDoHuHong ?? ''),
        deXuatXuLy: String(a.deXuatXuLy ?? ''),
        ketLuan: String(a.ketLuan ?? ''),
      });
      setViewFixForm({ tinhTrangSau: '', ghiChu: '' });
      setViewFixFile(null);
    }
  }, [isView, effectiveIsKiemTra, viewStatus, record]);
  const VIEW_STATUS_LABELS = effectiveIsKiemTra ? INSPECTION_STATUS_LABELS : REPAIR_STATUS_LABELS;
  const statusEntry = isView && record?.trangThai ? (VIEW_STATUS_LABELS as Record<string, { label: string; tone: BadgeTone }>)[String(record.trangThai)] ?? null : null;

  // viewRecordId/hasValidRecordId đã khai ở trên (tránh TDZ cho ycscSupplyChainQ)
  // enabled guard: chỉ fetch khi isView && !!viewRecordId && nhánh tương ứng
  const inspectionHistoryQ = useInspectionStatusHistory(isView && effectiveIsKiemTra && hasValidRecordId ? viewRecordId : null);
  const repairHistoryQ = useRepairStatusHistory(isView && !effectiveIsKiemTra && hasValidRecordId ? viewRecordId : null);
  const activeHistoryQ = effectiveIsKiemTra ? inspectionHistoryQ : repairHistoryQ;

  type HistoryEntry = StatusHistoryEntry;
  const rawHistoryEntries: HistoryEntry[] = ((activeHistoryQ.data as unknown as { data?: HistoryEntry[] })?.data ?? (activeHistoryQ.data as unknown as HistoryEntry[]) ?? []) as HistoryEntry[];
  // Fallback to statusLogs embedded in record if history endpoint empty
  const fallbackEntries: HistoryEntry[] = !rawHistoryEntries.length && (record as unknown as { statusLogs?: HistoryEntry[] })?.statusLogs?.length
    ? ((record as unknown as { statusLogs: HistoryEntry[] }).statusLogs as HistoryEntry[])
    : [];
  const historyEntries: HistoryEntry[] = rawHistoryEntries.length ? rawHistoryEntries : fallbackEntries;
  const inlineEntries = historyEntries.slice(0, 4);
  const hasMoreHistory = historyEntries.length > 4;

  const modalTitle = isView
    ? (effectiveIsKiemTra ? 'Chi tiết yêu cầu kiểm tra' : 'Chi tiết yêu cầu sửa chữa')
    : record
      ? (effectiveIsKiemTra ? 'Sửa yêu cầu kiểm tra' : 'Sửa yêu cầu sửa chữa')
      : (lockedRequestType === 'KIEM_TRA' ? 'Thêm yêu cầu kiểm tra' : 'Thêm yêu cầu sửa chữa');

  const viewFooter = (() => {
    if (!isView || !record) return (
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]">Đóng</button>
        {onEdit && <button type="button" onClick={onEdit} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 min-h-[44px]">Chỉnh sửa</button>}
      </div>
    );
    const s = viewStatus;
    const isTerminal = s === 'HOAN_THANH' || s === 'DA_HUY' || s === 'TU_CHOI';
    const isKiemTraFooter = effectiveIsKiemTra;
    if (!isKiemTraFooter) {
      const repairId = (record as unknown as { id: number | string }).id;
      const existingRepairCheck = (record as unknown as { repairRequests?: { id: number | string; maYeuCau: string; trangThai: string }[] })?.repairRequests;
      void existingRepairCheck;
      const canShowCancelYCSC = canCancelRepair(s, gateActor);
      const canShowDeleteYCSC = canDeleteRequest(s, canDeleteView);
      const showHistoryYCSC = () => setViewHistoryOpen(true);
      const openCancelYCSC = (mode: 'cancel'|'reject') => { setViewCancelMode(mode); setViewCancelReason(''); setViewCancelOpen(true); };
      const doAcceptYCSC = async () => {
        try { await repairRequestService.accept(repairId as never); toast.success('Đã tiếp nhận'); queryClient.invalidateQueries({ queryKey: repairRequestKeys.all }); onSaved?.(); onClose(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không tiếp nhận được'); }
      };
      const doPlanYCSC = () => {
        const rAny = record as unknown as Record<string, unknown>;
        setYcscPlanForm({
          keHoachChiTiet: String(rAny.keHoachChiTiet ?? ''),
          phuongAn: String(rAny.phuongAn ?? ''),
          bienPhapAnToan: String(rAny.bienPhapAnToan ?? ''),
          ngayBatDauKeHoach: rAny.ngayBatDauKeHoach ? String(rAny.ngayBatDauKeHoach).slice(0,10) : '',
          ngayHoanThienDuKien: rAny.ngayHoanThienDuKien ? String(rAny.ngayHoanThienDuKien).slice(0,10) : '',
          chiPhiDuKien: rAny.chiPhiDuKien != null ? String(rAny.chiPhiDuKien) : '',
          canNgungMay: !!rAny.canNgungMay,
          phongBanId: String(rAny.phongBanId ?? ''),
        });
        setYcscPlanOpen(true);
      };
      const doStartYCSC = async () => {
        try { await repairRequestService.start(repairId as never); toast.success('Đã bắt đầu sửa chữa'); queryClient.invalidateQueries({ queryKey: repairRequestKeys.all }); onSaved?.(); onClose(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không bắt đầu được'); }
      };
      const doSubmitYCSC = () => {
        const rItems = ((record as unknown as { items?: { id: string; tenHeThong: string; tinhTrangThietBi: string; noiDungLoi: string }[] })?.items ?? []) as { id: string; tinhTrangThietBi: string; noiDungLoi: string }[];
        setYcscHandoverItems(rItems.length ? rItems.map((it) => emptyYcscHandoverItem(it)) : []);
        setYcscHandoverGhiChu('');
        setYcscHandoverNguoiNhan('');
        setYcscHandoverNguoiNhanId('');
        setYcscHandoverFile(null);
        setYcscHandoverError('');
        setYcscSubmitOpen(true);
      };
      const doCompleteYCSC = async () => {
        // useCompleteRepair also refreshes fault records (closed by complete) and the source YCKT
        try { await completeRepairMut.mutateAsync(repairId); toast.success('Đã hoàn thành'); onSaved?.(); onClose(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không hoàn thành được'); }
      };
      const leftYCSC = (
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={showHistoryYCSC} title="Lịch sử" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"><History className="h-4 w-4" /> Lịch sử</button>
          {canShowCancelYCSC && <button type="button" onClick={() => openCancelYCSC('cancel')} title="Hủy phiếu" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 min-h-[44px]"><Ban className="h-4 w-4" /> Hủy phiếu</button>}
          {canShowDeleteYCSC && <button type="button" onClick={() => setViewDeleteOpen(true)} title="Xóa" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 min-h-[44px]"><Trash2 className="h-4 w-4" /> Xóa</button>}
        </div>
      );
      let rightYCSC: React.ReactNode = null;
      if (s === 'CHO_NGHIEM_THU') {
        // Requester confirms (creator of source YCKT, else creator of this YCSC) — not the technician
        rightYCSC = canConfirmView ? (<div className="flex items-center gap-2">
          <button type="button" onClick={() => { setYcscConfirmForm({ ketQua: 'KHONG_DAT', lyDo: '' }); setYcscConfirmOpen(true); }} className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 min-h-[44px]">KHÔNG ĐẠT</button>
          <button type="button" onClick={() => { setYcscConfirmForm({ ketQua: 'DAT', lyDo: '' }); setYcscConfirmOpen(true); }} className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 min-h-[44px]">ĐẠT</button>
        </div>) : (<span className="text-xs text-amber-700">Chờ {viewPendingSlip?.nguoiXacNhanTen || 'người yêu cầu'} xác nhận nghiệm thu</span>);
      } else if (!isToBTView) {
        // Requester only gets Hủy (left group) — no technician CTA
      } else if (s === 'CHO_XU_LY') {
        rightYCSC = <button type="button" onClick={doAcceptYCSC} className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 min-h-[44px]"><CheckCircle className="h-4 w-4" /> Tiếp nhận</button>;
      } else if (s === 'DA_TIEP_NHAN') {
        rightYCSC = <button type="button" onClick={doPlanYCSC} className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 min-h-[44px]"><Wrench className="h-4 w-4" /> Lên kế hoạch</button>;
      } else if (s === 'LEN_KE_HOACH') {
        rightYCSC = <button type="button" onClick={doStartYCSC} className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 min-h-[44px]"><Play className="h-4 w-4" /> Bắt đầu</button>;
      } else if (s === 'DANG_SUA_CHUA') {
        rightYCSC = <button type="button" onClick={doSubmitYCSC} className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 min-h-[44px]"><Send className="h-4 w-4" /> Đề nghị nghiệm thu</button>;
      } else if (s === 'DA_NGHIEM_THU') {
        const cs2 = (ycscCostQ.data as unknown as { data?: { itemsWithNullPrice: { tenGoi: string }[] } })?.data;
        const hasNull2 = (cs2?.itemsWithNullPrice?.length ?? 0) > 0;
        const tip = hasNull2 ? 'Có món chưa có giá thành — cập nhật giá trước khi hoàn thành' : undefined;
        rightYCSC = <span title={tip}><button type="button" onClick={doCompleteYCSC} disabled={hasNull2} className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed"><CheckCheck className="h-4 w-4" /> Hoàn thành</button></span>;

      }
      const showEditYCSC = !!onEdit && !isTerminal && canEditRepair(s, gateActor);
      return (
        <div className="flex w-full items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {leftYCSC}
            {showEditYCSC && <button type="button" onClick={onEdit} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]">Chỉnh sửa</button>}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {rightYCSC}
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]">Đóng</button>
          </div>
        </div>
      );
    }
    const canShowCancel = canCancelInspection(s, gateActor);
    const canShowDelete = canDeleteRequest(s, canDeleteView);
    const doAccept = async () => {
      const id = (record as unknown as { id: number }).id;
      // YCKT and YCSC are separate tables with overlapping Int ids — never fall back to the repair endpoint
      try { await inspectionRequestService.accept(id); toast.success('Đã tiếp nhận'); queryClient.invalidateQueries({ queryKey: inspectionKeys.all }); onSaved?.(); onClose(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không tiếp nhận được'); }
    };
    const doStart = async () => {
      const id = (record as unknown as { id: number }).id;
      try { await inspectionRequestService.startInspection(id); toast.success('Đã bắt đầu kiểm tra'); queryClient.invalidateQueries({ queryKey: inspectionKeys.all }); onSaved?.(); onClose(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không bắt đầu được'); }
    };
    const doSaveDraft = async () => {
      const id = (record as unknown as { id: number }).id;
      try { await inspectionRequestService.updateDetails(id, { ketQuaKiemTra: viewInspectForm.ketQuaKiemTra || null, mucDoHuHong: viewInspectForm.mucDoHuHong || null, deXuatXuLy: viewInspectForm.deXuatXuLy || null, ketLuan: viewInspectForm.ketLuan || null }); toast.success('Đã lưu nháp'); queryClient.invalidateQueries({ queryKey: inspectionKeys.all }); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không lưu được'); }
    };
    const doSubmit = async () => {
      const id = (record as unknown as { id: number }).id;
      const isFixed = viewInspectForm.ketLuan === 'DA_KHAC_PHUC';
      if (isFixed && (!viewFixForm.tinhTrangSau.trim() || !viewFixFile)) {
        toast.error('Đã khắc phục: nhập tình trạng sau khắc phục và đính kèm tệp nghiệm thu');
        return;
      }
      try {
        await inspectionRequestService.updateDetails(id, { ketQuaKiemTra: viewInspectForm.ketQuaKiemTra || null, mucDoHuHong: viewInspectForm.mucDoHuHong || null, deXuatXuLy: viewInspectForm.deXuatXuLy || null, ketLuan: viewInspectForm.ketLuan || null });
        await inspectionRequestService.submitInspection(id, isFixed && viewFixFile ? { tinhTrangSau: viewFixForm.tinhTrangSau.trim(), ghiChuNghiemThu: viewFixForm.ghiChu.trim() || undefined, file: viewFixFile } : undefined);
        toast.success(isFixed ? 'Đã gửi phiếu nghiệm thu — chờ người tạo yêu cầu xác nhận' : 'Đã gửi kết quả');
        queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
        queryClient.invalidateQueries({ queryKey: ['acceptanceHandovers'] });
        onSaved?.(); onClose();
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Không gửi được — kiểm tra Kết quả/Kết luận'); }
    };
    const openInspectionConfirm = (ketQua: 'DAT' | 'KHONG_DAT') => { setViewConfirmForm({ ketQua, lyDo: '' }); setViewConfirmOpen(true); };
    const doComplete = async () => {
      const id = (record as unknown as { id: number }).id;
      try { await inspectionRequestService.complete(id); toast.success('Đã hoàn thành kiểm tra'); queryClient.invalidateQueries({ queryKey: inspectionKeys.all }); onSaved?.(); onClose(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Không hoàn thành được'); }
    };
    const doCreateRepair = () => {
      type SrcItem = { id: string; tenHeThong: string; tinhTrangThietBi: string; loaiLoi: string; noiDungLoi: string; machineSystemId?: string | null; machineSystemDetailId?: string | null; faultRecordId?: string | null; faultRecord?: { maLoi: string; tenLoi: string } | null };
      const rItems = (record as unknown as { items?: SrcItem[] })?.items ?? [];
      setViewCreateRepairInitial({
        sourceInspectionRequestId: String((record as unknown as { id: number }).id),
        // Carry the YCKT item id + linked fault record so the YCSC item keeps the trace (and complete() closes the fault)
        items: rItems.map((it) => ({
          tenHeThong: it.tenHeThong,
          tinhTrangThietBi: it.tinhTrangThietBi,
          loaiLoi: it.loaiLoi,
          noiDungLoi: it.noiDungLoi,
          machineSystemId: it.machineSystemId ?? undefined,
          machineSystemDetailId: it.machineSystemDetailId ?? undefined,
          faultRecordId: it.faultRecordId ?? null,
          faultRecord: it.faultRecord ?? null,
          sourceInspectionItemId: it.id,
        })),
        ghiChu: `Tạo từ phiếu kiểm tra ${(record as unknown as { maYeuCau?: string })?.maYeuCau ?? ''}`,
      });
      setViewCreateRepairOpen(true);
    };
    const openCancel = (mode: 'cancel'|'reject') => { setViewCancelMode(mode); setViewCancelReason(''); setViewCancelOpen(true); };
    const showHistory = () => setViewHistoryOpen(true);
    const leftGroup = (
      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={showHistory} title="Lịch sử" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"><History className="h-4 w-4" /> Lịch sử</button>
        {canShowCancel && <button type="button" onClick={() => openCancel('cancel')} title="Hủy phiếu" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 min-h-[44px]"><Ban className="h-4 w-4" /> Hủy phiếu</button>}
        {canShowDelete && <button type="button" onClick={() => setViewDeleteOpen(true)} title="Xóa" className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 min-h-[44px]"><Trash2 className="h-4 w-4" /> Xóa</button>}
      </div>
    );
    // Cancelled / rejected YCSC no longer count (mirrors backend complete())
    const existingRepair = activeRepairs((record as unknown as { repairRequests?: { id: number|string; maYeuCau: string; trangThai: string }[] })?.repairRequests)[0] ?? null;
    const goToRepair = (id: number | string) => setSearchParams(buildTechnicalDetailParams(searchParams, 'repair', id));
    let rightCta: React.ReactNode = null;
    // Owner without technician rights only gets Hủy (left group); technician CTAs require isToBTView
    if (!isToBTView) { /* nhân viên thường / người tạo */ } else if (s === 'CHO_XU_LY') {
      rightCta = (<div className="flex items-center gap-2"><button type="button" onClick={() => openCancel('reject')} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"><XCircle className="h-4 w-4" /> Từ chối</button><button type="button" onClick={doAccept} className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 min-h-[44px]"><CheckCircle className="h-4 w-4" /> Tiếp nhận</button></div>);
    } else if (s === 'DA_TIEP_NHAN') {
      rightCta = (<div className="flex items-center gap-2"><button type="button" onClick={() => openCancel('reject')} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"><XCircle className="h-4 w-4" /> Từ chối</button><button type="button" onClick={doStart} className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 min-h-[44px]"><Play className="h-4 w-4" /> Bắt đầu kiểm tra</button></div>);
    } else if (s === 'DANG_KIEM_TRA') {
      rightCta = (<div className="flex items-center gap-2"><button type="button" onClick={doSaveDraft} title="Lưu nháp kết quả kiểm tra" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]"><Save className="h-4 w-4" /> Lưu nháp</button><span title={!viewCanSubmit ? 'Cần nhập Kết quả kiểm tra và Kết luận trước khi gửi' : 'Gửi kết quả kiểm tra'}><button type="button" onClick={doSubmit} disabled={!viewCanSubmit} aria-disabled={!viewCanSubmit} className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"><Send className="h-4 w-4" /> Gửi kết quả</button></span></div>);
    } else if (s === 'DA_KIEM_TRA') {
      if (existingRepair) {
        rightCta = (<button type="button" onClick={() => goToRepair(existingRepair.id)} className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 min-h-[44px]">Đã tạo {existingRepair.maYeuCau} [Xem] <ArrowRight className="h-4 w-4" /></button>);
      } else {
        // Only the saved conclusion counts (server requires DA_KIEM_TRA + CAN_SUA_CHUA)
        if (viewKetLuanStr === 'CAN_SUA_CHUA') rightCta = (<button type="button" onClick={doCreateRepair} className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 min-h-[44px]">Tạo yêu cầu sửa chữa <ArrowRight className="h-4 w-4" /></button>);
      }
    }
    // Requester-confirmation step is independent of technician role
    if (s === 'CHO_NGHIEM_THU') {
      rightCta = canConfirmView ? (<div className="flex items-center gap-2">
        <button type="button" onClick={() => openInspectionConfirm('KHONG_DAT')} className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 min-h-[44px]">KHÔNG ĐẠT</button>
        <button type="button" onClick={() => openInspectionConfirm('DAT')} className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 min-h-[44px]">ĐẠT</button>
      </div>) : (<span className="text-xs text-amber-700">Chờ {viewPendingSlip?.nguoiXacNhanTen || 'người tạo yêu cầu'} xác nhận nghiệm thu</span>);
    }
    // CAN_SUA_CHUA + YCSC đã tạo → kỹ thuật đóng YCKT
    if (s === 'DA_KIEM_TRA' && existingRepair && isToBTView) {
      rightCta = (<div className="flex items-center gap-2">{rightCta}<button type="button" onClick={doComplete} className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 min-h-[44px]"><CheckCheck className="h-4 w-4" /> Hoàn thành kiểm tra</button></div>);
    }
    return (
      <div className="flex w-full items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {leftGroup}
          {!!onEdit && !isTerminal && canEditInspection(s, gateActor) && <button type="button" onClick={onEdit} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]">Chỉnh sửa</button>}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {rightCta}
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 min-h-[44px]">Đóng</button>
        </div>
      </div>
    );
  })();

  // Reset form/items whenever the modal is (re)opened for a given record/mode.
  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setSelectedFile(null);
    setSelectedFiles([]);
    // Prefill plan/assignees/materials reset
    setPlan({ keHoachChiTiet: '', phuongAn: '', bienPhapAnToan: '', ngayBatDauKeHoach: '', ngayHoanThienDuKien: '', canNgungMay: false });
    setAssignees([]);
    setMaterials([]);
    // initialData overrides items/ghiChu when creating SUA_CHUA from YCKT
    const initialItems = initialData?.items?.length ? initialData.items : null;
    const initialGhiChu = initialData?.ghiChu ?? null;
    const hasInitialData = !!initialItems || !!initialData?.sourceInspectionRequestId;
    const expanded = hasInitialData;
    setPlanOpen(expanded || lockedRequestType !== 'KIEM_TRA');
    setAssigneeOpen(expanded || lockedRequestType !== 'KIEM_TRA');
    setMaterialOpen(expanded || lockedRequestType !== 'KIEM_TRA');
    setForm(record ? {
      ngayThang: record.ngayThang?.split('T')[0] ?? '',
      maYeuCau: record.maYeuCau,
      mucDoUuTien: record.mucDoUuTien,
      ghiChu: record.ghiChu ?? '',
    } : emptyForm(mode === 'create' ? ((lockedRequestType === 'KIEM_TRA' ? generatedInspectionCode.data : generatedCode.data) ?? '') : ''));
    // if initialData present, override ghiChu/items after
    if (!record && initialGhiChu) {
      setForm((cur) => ({ ...cur, ghiChu: initialGhiChu }));
    }
    if (!record && initialItems) {
      setItems(initialItems.map((it) => ({
        machineSystemId: it.machineSystemId ?? (it.tenHeThong ? MANUAL_ENTRY : ''),
        machineSystemDetailId: it.machineSystemDetailId ?? '',
        // Keep the YCKT item trace + its fault record (contract: create YCSC from YCKT)
        faultRecordId: it.faultRecordId ?? null,
        faultRecordSearch: it.faultRecord ? `${it.faultRecord.maLoi} - ${it.faultRecord.tenLoi}` : '',
        sourceInspectionItemId: it.sourceInspectionItemId ?? null,
        tenHeThong: it.tenHeThong,
        tinhTrangThietBi: it.tinhTrangThietBi,
        loaiLoi: it.loaiLoi,
        noiDungLoi: it.noiDungLoi,
      })));
    } else {
      setItems(record?.items?.length ? record.items.map((item) => ({
        id: item.id,
        machineSystemId: item.machineSystemId ?? (item.tenHeThong ? MANUAL_ENTRY : ''),
        machineSystemDetailId: item.machineSystemDetailId ?? '',
        faultRecordId: item.faultRecordId ?? null,
        sourceInspectionItemId: item.sourceInspectionItemId ?? null,
        faultRecordSearch: item.faultRecord ? `${item.faultRecord.maLoi} - ${item.faultRecord.tenLoi}` : '',
        tenHeThong: item.tenHeThong,
        tinhTrangThietBi: item.tinhTrangThietBi,
        loaiLoi: item.loaiLoi,
        noiDungLoi: item.noiDungLoi,
        machineSystem: item.machineSystem ?? null,
        machineSystemDetail: item.machineSystemDetail ?? null,
      })) : [emptyItem(lockedSystemIdStr)]);
    }
    // generatedCode.data intentionally excluded: only used as the initial value at open time,
    // handled separately below so it doesn't clobber in-progress edits once it resolves late.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, record, lockedSystemIdStr, initialData]);

  // If opened in create mode before the generated code query resolves, backfill it once ready.
  useEffect(() => {
    if (!isOpen || mode !== 'create' || record) return;
    const code = lockedRequestType === 'KIEM_TRA' ? generatedInspectionCode.data : generatedCode.data;
    if (!code) return;
    setForm((current) => (current.maYeuCau ? current : { ...current, maYeuCau: code ?? '' }));
  }, [isOpen, mode, record, generatedCode.data, generatedInspectionCode.data, lockedRequestType]);

  const patchItem = (index: number, patch: Partial<ItemDraft>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const locationOf = (systemId?: string | null, detailId?: string | null): string => {
    const detail = detailId ? details.find((d) => d.id === detailId) : undefined;
    const system = systems.find((s) => s.id === (detail?.machineSystemId ?? systemId)) ?? detail?.machineSystem;
    return locationLabel(system, detail);
  };

  /**
   * Apply a system/detail pick and auto-fill "Vị trí / khu vực" from the catalog. A value the user
   * typed is kept; only an empty field or the previous auto-filled value gets replaced.
   */
  const pickMachine = (index: number, patch: Partial<ItemDraft>) => {
    setItems((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const next = { ...item, ...patch };
      const prevAuto = locationOf(item.machineSystemId, item.machineSystemDetailId);
      const typed = item.tinhTrangThietBi.trim();
      if (typed && typed !== prevAuto) return next;
      const auto = next.machineSystemId === MANUAL_ENTRY ? '' : locationOf(next.machineSystemId, next.machineSystemDetailId);
      return { ...next, tinhTrangThietBi: auto };
    }));
  };

  const selectSystem = (index: number, systemId: string) => {
    if (systemId === MANUAL_ENTRY) {
      pickMachine(index, {
        machineSystemId: MANUAL_ENTRY,
        machineSystemDetailId: '',
        tenHeThong: '',
      });
      return;
    }
    const effectiveSystemId = lockedSystemIdStr ?? systemId;
    const system = systems.find((item) => item.id === effectiveSystemId);
    pickMachine(index, {
      machineSystemId: effectiveSystemId,
      machineSystemDetailId: '',
      tenHeThong: system ? `${system.maHeThong} - ${system.tenHeThong}` : '',
    });
  };

  const selectDetail = (index: number, detailId: string) => {
    const detail = details.find((item) => item.id === detailId);
    const system = detail?.machineSystem ?? systems.find((item) => item.id === detail?.machineSystemId);
    pickMachine(index, {
      machineSystemId: lockedSystemIdStr ?? detail?.machineSystemId ?? '',
      machineSystemDetailId: detailId,
      tenHeThong: detail
        ? `${system?.maHeThong ?? ''} ${system?.tenHeThong ?? ''} / ${detail.maChiTiet} - ${detail.tenChiTiet}`.trim()
        : '',
    });
  };

  // Whether to show SUA_CHUA extra sections (create mode, not KIEM_TRA)
  // A3: plan block must NOT show on create — only via PATCH /:id/plan after DA_TIEP_NHAN
  const showSuaChuaExtra = !isView && mode === 'create' && lockedRequestType !== 'KIEM_TRA';
  const showAssigneeAndMaterial = showSuaChuaExtra;
  const showPlanOnCreate = false;

  // For confirm modal — cleaned preview helpers
  const previewItems = items.map((item) => ({
    tenHeThong: item.tenHeThong.trim() || (item.machineSystem ? `${item.machineSystem.maHeThong} - ${item.machineSystem.tenHeThong}` : ''),
    tinhTrangThietBi: item.tinhTrangThietBi.trim(),
    loaiLoi: item.loaiLoi,
    noiDungLoi: item.noiDungLoi.trim(),
  })).filter((it) => it.tenHeThong && it.tinhTrangThietBi && it.loaiLoi && it.noiDungLoi);
  const previewPlanEntries = [
    plan.keHoachChiTiet.trim() ? `Kế hoạch: ${plan.keHoachChiTiet.trim()}` : null,
    plan.phuongAn.trim() ? `Phương án: ${plan.phuongAn.trim()}` : null,
    plan.bienPhapAnToan.trim() ? `AT: ${plan.bienPhapAnToan.trim()}` : null,
    plan.ngayBatDauKeHoach ? `BĐ: ${plan.ngayBatDauKeHoach}` : null,
    plan.ngayHoanThienDuKien ? `KT: ${plan.ngayHoanThienDuKien}` : null,
    plan.canNgungMay ? 'Cần ngừng máy' : null,
  ].filter(Boolean) as string[];
  const previewAssignees = assignees.filter((a) => a.userName.trim() || a.userId.trim());
  const previewMaterials = materials.filter((m) => m.tenVatTu.trim());

  const doCreate = async (cleanedItems: CleanedItem[]) => {
    if (showAssigneeAndMaterial) {
      const seenIds = new Set<string>();
      for (const a of assignees) {
        const id = a.userId.trim().toLowerCase();
        if (!id) continue;
        if (seenIds.has(id)) { toast.error('Nhân viên đã được chọn — vui lòng chọn người khác'); throw new Error('Duplicate assignee'); }
        seenIds.add(id);
      }
    }
    const isCreateKiemTra = !record && lockedRequestType === 'KIEM_TRA';
    if (isCreateKiemTra) {
      const deptLabelForInspection =
        String((viewUser as unknown as { subDepartmentName?: string })?.subDepartmentName ?? '').trim() ||
        String((viewUser as unknown as { departmentName?: string })?.departmentName ?? '').trim() ||
        String((viewUser as unknown as { department?: string })?.department ?? '').trim() ||
        undefined;
      await createInspection.mutateAsync({
        data: {
          ngayThang: form.ngayThang,
          maYeuCau: form.maYeuCau,
          mucDoUuTien: form.mucDoUuTien,
          ghiChu: form.ghiChu || undefined,
          ...(deptLabelForInspection ? { phongBanId: deptLabelForInspection } : {}),
          items: cleanedItems.map(({ id: _id, sourceInspectionItemId: _s, ...rest }) => rest),
        } as never,
        files: selectedFiles.length > 0 ? selectedFiles : undefined,
      });
      const _maYCKT = (form.maYeuCau ?? '').trim() || '—';
      onSaved?.({ maYeuCau: _maYCKT });
      toast.success(`Đã tạo yêu cầu kiểm tra ${_maYCKT}`);
      return;
    }

    const sourceInspectionRequestId =
      String((initialData as unknown as { sourceInspectionRequestId?: string } | null)?.sourceInspectionRequestId ?? '').trim() || null;
    const payload: CreateRepairRequestRequest = {
      ...form,
      tenHeThong: cleanedItems[0]?.tenHeThong,
      tinhTrangThietBi: cleanedItems[0]?.tinhTrangThietBi,
      loaiLoi: cleanedItems[0]?.loaiLoi,
      noiDungLoi: cleanedItems[0]?.noiDungLoi,
      items: cleanedItems,
      requestType: 'SUA_CHUA' as const,
      sourceInspectionRequestId: sourceInspectionRequestId ?? null,
    };

    let savedId: string | number | undefined;
    let savedMaYeuCau = '';
    try {
      if (record) {
        // Table is decided by _source / lockedRequestType (see effectiveIsKiemTra), never by code prefix
        if (effectiveIsKiemTra) {
          await updateInspection.mutateAsync({ id: (record as unknown as { id: number }).id, data: { ngayThang: form.ngayThang, mucDoUuTien: form.mucDoUuTien, ghiChu: form.ghiChu || undefined, items: cleanedItems }, files: selectedFiles.length > 0 ? selectedFiles : undefined });
          toast.success('Đã cập nhật yêu cầu kiểm tra');
        } else {
          const { requestType: _rt, sourceInspectionRequestId: _src, maYeuCau: _ma, ...updatePayload } = payload;
          void _rt; void _src; void _ma;
          await updateRequest.mutateAsync({ id: record.id, data: updatePayload, file: selectedFile ?? undefined });
          toast.success('Đã cập nhật yêu cầu sửa chữa');
        }
      } else {
        const res = await createRequest.mutateAsync({ data: payload, file: selectedFile ?? undefined });
        savedId = (res as unknown as { data?: { id?: number | string } })?.data?.id ?? (res as unknown as { id?: number | string })?.id;
        savedMaYeuCau = (res as unknown as { data?: { maYeuCau?: string } })?.data?.maYeuCau
          ?? (res as unknown as { maYeuCau?: string })?.maYeuCau
          ?? payload.maYeuCau
          ?? '';
        const newId = savedId;
        // Toast YCSC ngay sau khi tạo thành công — tách khỏi YCCC flow
        const isYcscFromYckt = !!sourceInspectionRequestId;
        toast.success(isYcscFromYckt ? `Đã tạo YCSC ${savedMaYeuCau} từ YCKT` : `Đã tạo yêu cầu sửa chữa ${savedMaYeuCau}`);
        if (newId && showAssigneeAndMaterial) {
          const cleanedAssignees = assignees.filter((a) => a.userId.trim() || a.userName.trim());
          const cleanedMaterials = materials.filter((m) => m.tenVatTu.trim() && m.itemIndex >= 0 && m.itemIndex < cleanedItems.length);
          // Not atomic yet (needs a single backend endpoint) — at least tell the user what failed
          const failedAssignees: string[] = [];
          for (const a of cleanedAssignees) {
            try {
              await repairRequestService.assignUser(newId, {
                userId: a.userId.trim() || undefined,
                userName: a.userName.trim() || undefined,
                vaiTro: a.isLead ? 'CHINH' : 'PHU',
                isLead: a.isLead,
              });
            } catch {
              failedAssignees.push(a.userName.trim() || a.userId.trim());
            }
          }
          if (failedAssignees.length) toast.error(`YCSC ${savedMaYeuCau} đã tạo nhưng chưa phân công được: ${failedAssignees.join(', ')} — vui lòng phân công lại trong phiếu`);
          const createdItems: Array<{ id: string }> = ((res as unknown as { data?: { items?: Array<{ id: string }> } })?.data?.items ?? (res as unknown as { items?: Array<{ id: string }> })?.items ?? []) as Array<{ id: string }>;
          const failedNeeds: string[] = [];
          for (const m of cleanedMaterials) {
            const itemId = createdItems[m.itemIndex]?.id;
            if (!itemId) { failedNeeds.push(m.tenVatTu.trim()); continue; }
            try {
              await repairRequestService.createMaterialNeed(newId, {
                repairRequestItemId: itemId,
                tenVatTu: m.tenVatTu.trim(),
                donVi: m.donVi.trim() || null,
                soLuongDuKien: Number(m.soLuongDuKien) || 0,
                ghiChu: null,
              });
            } catch {
              failedNeeds.push(m.tenVatTu.trim());
            }
          }
          if (failedNeeds.length) toast.error(`Chưa lưu được nhu cầu vật tư: ${failedNeeds.join(', ')}`);
        }
        // --- Auto-create YCCC flow: chỉ khi SUA_CHUA, có materials, và đã có savedMaYeuCau/newId ---
        // Tách hoàn toàn khỏi toast YCSC ở trên; YCSC đã toast.success rồi, YCCC có toast riêng.
        const shouldTryAutoSupply = showAssigneeAndMaterial && materials.length > 0 && !!savedMaYeuCau && !!newId;
        if (shouldTryAutoSupply) {
          const u = viewUser as unknown as Record<string, unknown> | null;
          const userId = String((u?.id as string) ?? (u?._id as string) ?? '').trim();
          const userFullName = String((u?.fullName as string) ?? (u?.name as string) ?? ([u?.firstName, u?.lastName].filter(Boolean).join(' ').trim()) ?? '').trim();
          // YCCC requester = the person creating/handling this repair request (current user),
          // NOT the lead assignee. Backend also derives requester identity from the JWT.
          type EmpOpt = { id: string; userId?: string; name: string; employeeCode: string; department?: string };
          const catalog = employees as EmpOpt[];
          const viewerEmployeeId = String((u?.employeeId as string) ?? '').trim();
          const viewerEmp: EmpOpt | null = catalog.find((e) => {
            if (viewerEmployeeId && e.id === viewerEmployeeId) return true;
            if (userId && e.userId === userId) return true;
            return false;
          }) ?? null;
          let resolvedEmployeeId: string;
          let resolvedMaNhanVien: string;
          let resolvedTenNhanVien: string;
          let resolvedBoPhan: string;
          if (viewerEmployeeId || viewerEmp) {
            resolvedEmployeeId = viewerEmployeeId || viewerEmp?.id || '';
            resolvedMaNhanVien = String((u?.employeeCode as string) ?? '').trim() || viewerEmp?.employeeCode || resolvedEmployeeId;
            resolvedTenNhanVien = viewerEmp?.name || userFullName;
            resolvedBoPhan = (viewerEmp?.department ?? '').trim();
          } else {
            // Không tìm thấy hồ sơ Employee khớp — báo lỗi rõ, không fallback User.id làm employeeId
            resolvedEmployeeId = '';
            resolvedMaNhanVien = '';
            resolvedTenNhanVien = '';
            resolvedBoPhan = '';
          }

          // Build supplyItems — filter "" và <=0
          const rawSupplyCandidates = materials.filter((m) => m.tenVatTu.trim());
          const supplyItems = rawSupplyCandidates
            .map((m) => ({
              phanLoai: (m.phanLoai || 'Vật tư').trim() || 'Vật tư',
              tenGoi: m.tenVatTu.trim(),
              soLuong: m.soLuongDuKien === '' ? 0 : Number(m.soLuongDuKien) || 0,
              donViTinh: (m.donVi || 'cái').trim() || 'cái',
              _rawQty: m.soLuongDuKien,
            }))
            .filter((it) => {
              if (it._rawQty === '' || it.soLuong <= 0) return false;
              return true;
            })
            .map(({ _rawQty: _omit, ...rest }) => rest);

          // boPhan rỗng do employee.subDepartment null rất phổ biến — không chặn YCCC, fallback
          if (!resolvedBoPhan) {
            const fallbackBoPhan = String((viewUser as unknown as Record<string, unknown>)?.subDepartmentName as string ?? (viewUser as unknown as Record<string, unknown>)?.departmentName as string ?? (viewUser as unknown as Record<string, unknown>)?.department as string ?? '').trim() || 'Kỹ thuật';
            console.warn('auto supply: boPhan empty, fallback to', fallbackBoPhan, { resolvedEmployeeId, resolvedTenNhanVien });
            resolvedBoPhan = fallbackBoPhan;
          }
          // 2.a) supplyItems rỗng sau filter → báo rõ, không silent
          if (supplyItems.length === 0) {
            toast('YCSC đã tạo nhưng không có hàng hóa hợp lệ để tạo YCCC — vui lòng kiểm tra số lượng', { icon: '⚠️' });
          } else if (!resolvedEmployeeId || !resolvedTenNhanVien) {
            toast.error('Không tạo được YCCC: tài khoản của bạn chưa liên kết hồ sơ nhân viên');
            console.warn('auto supply skipped: missing employee info', { userId, employeesCount: catalog.length });
          } else {
            // 2.c) đủ điều kiện → tạo YCCC
            try {
              const supplyRes = await supplyRequestService.createSupplyRequest({
                employeeId: resolvedEmployeeId,
                maNhanVien: resolvedMaNhanVien || resolvedEmployeeId,
                tenNhanVien: resolvedTenNhanVien,
                boPhan: resolvedBoPhan,
                items: supplyItems,
                mucDichYeuCau: `Cung cấp cho ${savedMaYeuCau}`,
                ghiChu: (viewCreateRepairInitial?.ghiChu as string) || `Tự động tạo từ yêu cầu sửa chữa ${savedMaYeuCau}`,
                mucDoUuTien: form.mucDoUuTien,
              });
              const supplyId = String(
                (supplyRes as unknown as { data?: { id?: string; data?: { id?: string } } })?.data?.id ??
                (supplyRes as unknown as { data?: { data?: { id?: string } } })?.data?.data?.id ??
                (supplyRes as unknown as { id?: string })?.id ??
                (supplyRes as unknown as { data?: string })?.data ??
                ''
              ).trim();
              if (supplyId && newId) {
                try {
                  await repairRequestService.linkSupplyRequest(newId, { supplyRequestId: supplyId });
                } catch (linkErr) {
                  console.warn('linkSupplyRequest failed', linkErr);
                  toast('Đã tạo YCCC nhưng liên kết chuỗi YCSC→YCCC thất bại', { icon: '⚠️' });
                }
              }
              if (newId) {
                queryClient.invalidateQueries({ queryKey: ['repairRequests', 'detail', String(newId)] });
                queryClient.invalidateQueries({ queryKey: ['repairRequests', 'supplyChain', String(newId)] });
                await queryClient.invalidateQueries({ queryKey: ['repairRequests'] });
                await queryClient.refetchQueries({ queryKey: ['repairRequests'] });
              }
              await queryClient.invalidateQueries({ queryKey: ['supplyRequests'] });
              await queryClient.refetchQueries({ queryKey: ['supplyRequests'] });
              toast.success(`Đã tự động tạo YCCC cho ${savedMaYeuCau}`);
            } catch (e: unknown) {
              const axiosMsg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
              const msg = axiosMsg?.trim() || (e instanceof Error ? e.message : '') || 'Tự động tạo YCCC thất bại';
              console.warn('auto createSupplyRequest failed', e);
              toast.error(msg);
            }
          }
        }
      }
      onSaved?.(savedId || savedMaYeuCau ? { id: savedId, maYeuCau: savedMaYeuCau } : undefined);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không lưu được yêu cầu';
      setError(msg);
      toast.error(msg);
      throw err;
    }
  };

  /**
   * Item payload for create/update. On edit, existing items keep their `id` so the server updates them
   * in place (material needs, supply links, acceptance items and YCKT→YCSC links survive). New YCSC created
   * from a YCKT carry sourceInspectionItemId (+ faultRecordId) per item.
   */
  const buildCleanedItems = (): CleanedItem[] => {
    const isCreateFromInspection = !record && !!initialData?.sourceInspectionRequestId;
    return items.map((item) => {
      const isManual = item.machineSystemId === MANUAL_ENTRY;
      const out: CleanedItem = {
        machineSystemId: isManual ? undefined : (item.machineSystemId || undefined),
        machineSystemDetailId: isManual ? undefined : (item.machineSystemDetailId || undefined),
        faultRecordId: item.faultRecordId || null,
        tenHeThong: item.tenHeThong.trim(),
        tinhTrangThietBi: item.tinhTrangThietBi.trim(),
        loaiLoi: item.loaiLoi,
        noiDungLoi: item.noiDungLoi.trim(),
      };
      if (record && item.id) out.id = item.id;
      if (isCreateFromInspection && item.sourceInspectionItemId) out.sourceInspectionItemId = item.sourceInspectionItemId;
      return out;
    }).filter((item) => item.tenHeThong && item.tinhTrangThietBi && item.loaiLoi && item.noiDungLoi);
  };

  const handleConfirmCreate = async () => {
    const cleanedItems = buildCleanedItems();
    if (cleanedItems.length === 0) {
      const msg = 'Vui lòng nhập ít nhất một thiết bị lỗi hợp lệ';
      setError(msg);
      toast.error(msg);
      setConfirmOpen(false);
      return;
    }
    setConfirmOpen(false);
    try {
      await doCreate(cleanedItems);
    } catch { /* error already handled in doCreate */ }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const cleanedItems = buildCleanedItems();

    if (cleanedItems.length === 0) {
      const msg = 'Vui lòng nhập ít nhất một thiết bị lỗi hợp lệ';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (showAssigneeAndMaterial) {
      if (plan.ngayBatDauKeHoach && plan.ngayHoanThienDuKien && plan.ngayHoanThienDuKien <= plan.ngayBatDauKeHoach) {
        const msg = 'Ngày hoàn thiện dự kiến phải sau ngày bắt đầu kế hoạch';
        setError(msg);
        toast.error(msg);
        return;
      }
      const seen = new Set<string>();
      for (const m of materials) {
        const key = `${m.itemIndex}::${m.tenVatTu.trim().toLowerCase()}`;
        if (!m.tenVatTu.trim()) continue;
        if (seen.has(key)) {
          const msg = `Vật tư trùng: "${m.tenVatTu}" cho thiết bị #${m.itemIndex + 1}`;
          setError(msg);
          toast.error(msg);
          return;
        }
        seen.add(key);
      }
      if (assignees.filter((a) => a.isLead).length > 1) {
        const msg = 'Chỉ được chọn 1 người phụ trách chính';
        setError(msg);
        toast.error(msg);
        return;
      }
      {
        const seenIds = new Set<string>();
        for (const a of assignees) {
          const id = a.userId.trim().toLowerCase();
          if (!id) continue;
          if (seenIds.has(id)) {
            const msg = 'Nhân viên đã được chọn — vui lòng chọn người khác';
            setError(msg);
            toast.error(msg);
            return;
          }
          seenIds.add(id);
        }
      }
    }

    // 1. VALIDATION TRƯỚC KHI TẠO YCSC (trong save(), trước setConfirmOpen)
    // Chỉ áp dụng khi SUA_CHUA (lockedRequestType !== 'KIEM_TRA'); KIEM_TRA không yêu cầu vật tư
    const isSuaChua = lockedRequestType !== 'KIEM_TRA';
    if (isSuaChua && mode === 'create' && !record) {
      // materials.length>0 requires at least one assignee with valid userId to create YCCC
      if (materials.length > 0) {
        const hasValidAssignee = assignees.some((a) => a.userId.trim());
        if (!hasValidAssignee) {
          const msg = 'Vui lòng chọn ít nhất một người phụ trách để tạo YCCC';
          setError(msg); toast.error(msg); return;
        }
      }
      for (let i = 0; i < assignees.length; i++) {
        const a = assignees[i]!;
        if (!a.userName.trim() && !a.userId.trim()) {
          const msg = `Vui lòng chọn nhân viên cho dòng #${i + 1}`;
          setError(msg); toast.error(msg); return;
        }
      }
      // Nếu user đã thêm dòng vật tư thì phải validate từng dòng; materials.length===0 thì không bắt buộc
      for (let i = 0; i < materials.length; i++) {
        const m = materials[i]!;
        if (!m.tenVatTu.trim()) {
          const msg = `Vui lòng chọn hàng hóa cho dòng #${i + 1}`;
          setError(msg); toast.error(msg); return;
        }
        if (m.soLuongDuKien === '' || !Number.isFinite(Number(m.soLuongDuKien)) || Number(m.soLuongDuKien) <= 0) {
          const msg = `Vui lòng nhập số lượng > 0 cho "${m.tenVatTu.trim()}"`;
          setError(msg); toast.error(msg); return;
        }
        if (!m.donVi.trim()) {
          const msg = `Vui lòng chọn đơn vị tính cho "${m.tenVatTu.trim()}"`;
          setError(msg); toast.error(msg); return;
        }
      }
    }

    // Create mode (KIEM_TRA or SUA_CHUA): show confirm modal instead of saving immediately
    if (mode === 'create' && !record) {
      setConfirmOpen(true);
      return;
    }

    try {
      await doCreate(cleanedItems);
    } catch { /* handled */ }
  };

  return (
    <>
      <ModalForm
        isOpen={isOpen}
        onClose={onClose}
        title={modalTitle}
        maxWidth="5xl"
        footer={isView ? viewFooter : <ModalFooter onClose={onClose} onSubmit={() => formRefSubmit()} submitLabel={record ? 'Lưu' : 'Tạo yêu cầu'} isLoading={isSaving} />}
      >
      <form ref={formRef} id={formDomId} onSubmit={save} className="space-y-2.5 text-sm">
        {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{error}</div>}

        {/* 1C: merged sticky header A+C+D */}
        {isView && (
          <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs">
            {record?.maYeuCau && <span className="font-mono text-[11px] font-semibold text-gray-800">{record.maYeuCau}</span>}
            {statusEntry && <StatusBadge label={statusEntry.label} tone={statusEntry.tone as BadgeTone} size="sm" />}
            <StatusBadge label={form.mucDoUuTien} tone={PRIORITY_TONE[form.mucDoUuTien] ?? 'gray'} size="sm" />
            <span className="text-gray-500 tabular-nums">{formatDateVN((record as unknown as { ngayThang?: string })?.ngayThang || (record as unknown as { createdAt?: string })?.createdAt || form.ngayThang)}</span>
            {record?.createdByName && <span className="text-gray-600">Người yêu cầu: <span className="font-medium text-gray-800">{record.createdByName}</span></span>}
          </div>
        )}

        {isView && (() => {
          // "Đã khắc phục" branch goes through CHO_NGHIEM_THU instead of DA_KIEM_TRA
          const INSPECTION_STEPS = inspectionStepsFor(viewStatus, viewKetLuanStr);
          const REPAIR_STEPS: { key: string; label: string }[] = [
            { key: 'CHO_XU_LY', label: 'Chờ xử lý' },
            { key: 'DA_TIEP_NHAN', label: 'Đã tiếp nhận' },
            { key: 'LEN_KE_HOACH', label: 'Lên kế hoạch' },
            { key: 'DANG_SUA_CHUA', label: 'Đang sửa chữa' },
            { key: 'CHO_NGHIEM_THU', label: 'Chờ nghiệm thu' },
            { key: 'DA_NGHIEM_THU', label: 'Đã nghiệm thu' },
            { key: 'HOAN_THANH', label: 'Hoàn thành' },
          ];
          const BRANCH_STATUSES = new Set(['TU_CHOI', 'DA_HUY']);
          const isBranch = BRANCH_STATUSES.has(viewStatus);
          const steps = effectiveIsKiemTra ? INSPECTION_STEPS : REPAIR_STEPS;
          const currentIndex = steps.findIndex((s) => s.key === viewStatus);
          const branchLabelMap: Record<string, string> = { TU_CHOI: 'Từ chối', DA_HUY: 'Đã hủy' };
          return (
            <div className="rounded-lg border border-gray-200 bg-white px-2.5 py-2">
              {isBranch && (
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 border border-red-200">
                    {branchLabelMap[viewStatus] ?? viewStatus}
                  </span>
                  <span className="text-xs text-gray-500">nhánh rẽ</span>
                </div>
              )}
              <div className="flex items-start gap-0 overflow-x-auto">
                {steps.map((step, idx) => {
                  const isPast = currentIndex !== -1 && idx < currentIndex;
                  const isCurrent = idx === currentIndex && !isBranch;
                  const circleCls = isCurrent
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : isPast
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : 'bg-gray-100 text-gray-500 border-gray-200';
                  const lineCls = idx < steps.length - 1
                    ? (isPast || isCurrent ? 'bg-green-300' : 'bg-gray-200')
                    : '';
                  return (
                    <div key={step.key} className="flex flex-1 items-start">
                      <div className="flex flex-col items-center min-w-0 flex-1">
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors ${circleCls}`}>
                          {isPast ? '✓' : idx + 1}
                        </span>
                        <span className={`mt-1 text-center text-[10px] leading-tight font-medium break-words ${isCurrent ? 'text-blue-700' : isPast ? 'text-green-700' : 'text-gray-500'}`}>
                          {step.label}
                        </span>
                      </div>
                      {idx < steps.length - 1 && (
                        <div className={`mt-3 h-0.5 flex-1 min-w-[8px] mx-0.5 rounded ${lineCls}`} aria-hidden />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {(() => {
          const isKiemTraRequesterBlock = !isView && lockedRequestType === 'KIEM_TRA';
          if (!isKiemTraRequesterBlock) return null;
          const u = viewUser as unknown as Record<string, unknown> | null;
          const tenNhanVien = String((u?.fullName as string) ?? ([(u?.firstName as string) ?? '', (u?.lastName as string) ?? ''].filter(Boolean).join(' ').trim()) ?? '').trim() || String((u?.name as string) ?? '').trim() || '—';
          const boPhan = String((u?.subDepartmentName as string) ?? (u?.departmentName as string) ?? '').trim() || getDepartmentDisplayName(String((u?.department as string) ?? '')) || '—';
          return (
            <div className="grid gap-2 md:grid-cols-2">
              <FormField label="Tên nhân viên"><input readOnly value={tenNhanVien} className={`${readonlyCls} min-h-[44px]`} /></FormField>
              <FormField label="Bộ phận"><input readOnly value={boPhan} className={`${readonlyCls} min-h-[44px]`} /></FormField>
            </div>
          );
        })()}

        {!isView && (
        <div className={`grid gap-2 ${hideCodeField ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          <FormField label="Ngày" required>
            <input required type="date" value={form.ngayThang} onChange={(event) => setForm((value) => ({ ...value, ngayThang: event.target.value }))} className={`${inputCls()} min-h-[44px]`} />
          </FormField>
          {!hideCodeField && (
            <FormField label="Mã yêu cầu" required>
              <input required disabled={!!record} value={form.maYeuCau} onChange={(event) => setForm((value) => ({ ...value, maYeuCau: event.target.value }))} className={`${inputCls()} min-h-[44px] disabled:bg-gray-50`} />
            </FormField>
          )}
          <FormField label="Ưu tiên" required>
            <select value={form.mucDoUuTien} onChange={(event) => setForm((value) => ({ ...value, mucDoUuTien: event.target.value }))} className={`${selectCls()} min-h-[44px]`}>{PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          </FormField>
        </div>
        )}

        <div className="rounded-lg border border-gray-200">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-2.5 py-1">
            <div className="flex items-center gap-2 font-medium text-gray-800 text-sm"><Wrench className="h-4 w-4" /> Thiết bị lỗi <span className="text-xs font-normal text-gray-500">({items.length})</span></div>
            {!isView && <button type="button" onClick={() => setItems((value) => [...value, emptyItem(lockedSystemIdStr)])} title="Thêm thiết bị" aria-label="Thêm thiết bị" className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors min-h-[44px]"><Plus className="h-4 w-4" /> Thêm thiết bị</button>}
          </div>
          {isView ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50 text-left text-[11px] font-medium text-gray-500 border-b"><th className="px-2 py-1 w-6">#</th><th className="px-2 py-1">Hệ thống / Chi tiết</th><th className="px-2 py-1">Vị trí</th><th className="px-2 py-1">Loại lỗi</th><th className="px-2 py-1">{effectiveIsKiemTra || lockedRequestType === 'KIEM_TRA' ? 'Nội dung kiểm tra' : 'Nội dung'}</th><th className="px-2 py-1">{effectiveIsKiemTra || lockedRequestType === 'KIEM_TRA' ? 'Các nguyên nhân' : 'Lỗi liên quan'}</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, index) => {
                    const sysLabel = item.machineSystem ? `${item.machineSystem.maHeThong} - ${item.machineSystem.tenHeThong}` : item.tenHeThong || '—';
                    const detailLabel = item.machineSystemDetail ? `${item.machineSystemDetail.maChiTiet} - ${item.machineSystemDetail.tenChiTiet}` : '';
                    const dotCls = item.loaiLoi === 'Lỗi lặp lại' ? 'bg-amber-400' : item.loaiLoi === 'Lỗi mới' ? 'bg-red-400' : 'bg-gray-300';
                    return (
                      <tr key={item.id ?? index} className="hover:bg-gray-50/60">
                        <td className="px-2 py-1 text-center"><span className={`inline-block h-2 w-2 rounded-full ${dotCls} mr-1 align-middle`} />{index + 1}</td>
                        <td className="px-2 py-1 max-w-[180px]"><span className="line-clamp-2 text-gray-800" title={`${sysLabel}${detailLabel ? ' / ' + detailLabel : ''}`}>{sysLabel}{detailLabel ? ` / ${detailLabel}` : ''}</span></td>
                        <td className="px-2 py-1 max-w-[120px]"><span className="line-clamp-2 text-gray-700" title={item.tinhTrangThietBi}>{item.tinhTrangThietBi || '—'}</span></td>
                        <td className="px-2 py-1 whitespace-nowrap text-gray-700">{item.loaiLoi || '—'}</td>
                        <td className="px-2 py-1 max-w-[180px]"><span className="line-clamp-2 text-gray-700" title={item.noiDungLoi}>{item.noiDungLoi || '—'}</span></td>
                        <td className="px-2 py-1"><FaultRecordTypeaheadCell value={item.faultRecordSearch ?? ''} faultRecordId={item.faultRecordId ?? null} disabled onSelect={() => {}} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
          <div className="space-y-2 p-2.5">
            {items.map((item, index) => {
              const itemDetails = detailOptions.filter((detail) => !hasSystemPicked(item) || detail.machineSystemId === item.machineSystemId);
              const manual = isManualEntry(item);
              const picked = hasSystemPicked(item);
              const systemDropdownValue = !picked && !manual ? '' : (item.machineSystemId ?? '');
              return (
                <div key={item.id ?? index} className={`rounded-lg border border-gray-200 bg-gray-50/50 p-2.5 border-l-4 ${item.loaiLoi === 'Lỗi lặp lại' ? 'border-l-amber-400' : item.loaiLoi === 'Lỗi mới' ? 'border-l-red-400' : 'border-l-gray-300'}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-sm shrink-0 mt-1">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="grid gap-2 md:grid-cols-2">
                            <div className="md:col-span-2">
                              <FormField label="Hệ thống" required>
                                <MachineSystemCombobox
                                  systems={systems}
                                  value={systemDropdownValue}
                                  onSelectSystem={(sid) => selectSystem(index, sid)}
                                  disabled={!!lockedSystemIdStr}
                                  required
                                />
                              </FormField>
                            </div>
                            {picked && (
                              <div className="md:col-span-2">
                                <FormField label="Chi tiết máy (tùy chọn)">
                                  <MachineSystemDetailCombobox
                                    details={itemDetails}
                                    value={item.machineSystemDetailId ?? ''}
                                    onSelectDetail={(did) => selectDetail(index, did)}
                                  />
                                </FormField>
                              </div>
                            )}
                            {manual && (
                              <div className="md:col-span-2">
                                <FormField label="Tên thiết bị" required>
                                  <input required placeholder="VD: Máy sấy tầng 2 khu B" value={item.tenHeThong} onChange={(event) => patchItem(index, { tenHeThong: event.target.value })} className={`${inputCls()} min-h-[44px] text-sm`} />
                                </FormField>
                              </div>
                            )}
                        <FormField label="Vị trí / khu vực" required hint={isView ? undefined : picked && locationOf(item.machineSystemId, item.machineSystemDetailId) ? 'Tự điền từ danh mục hệ thống — có thể sửa' : 'VD: Khu B, tầng 2, dây chuyền 3'}>
                          <input required disabled={isView} placeholder="VD: Khu B, tầng 2" value={item.tinhTrangThietBi} onChange={(event) => patchItem(index, { tinhTrangThietBi: event.target.value })} className={`${inputCls()} min-h-[44px] text-sm disabled:bg-gray-50`} />
                        </FormField>
                        <FormField label="Loại lỗi" required>
                          <select required disabled={isView} value={item.loaiLoi} onChange={(event) => patchItem(index, { loaiLoi: event.target.value })} className={`${selectCls()} min-h-[44px] text-sm disabled:bg-gray-50`}>
                            <option value="">Chọn</option>
                            {FAULT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                          </select>
                        </FormField>
                        <div className="md:col-span-2">
                          <FormField label={lockedRequestType === 'KIEM_TRA' ? 'Nội dung kiểm tra' : 'Nội dung lỗi'} required hint={!isView ? (lockedRequestType === 'KIEM_TRA' ? 'Mô tả nội dung cần kiểm tra, hạng mục, yêu cầu' : 'Mô tả ngắn triệu chứng, ví dụ: kẹt băng tải, rò dầu thủy lực') : undefined}>
                            <input required disabled={isView} placeholder={lockedRequestType === 'KIEM_TRA' ? 'Nhập nội dung cần kiểm tra...' : 'Mô tả ngắn gọn triệu chứng lỗi'} value={item.noiDungLoi} onChange={(event) => patchItem(index, { noiDungLoi: event.target.value })} className={`${inputCls()} min-h-[44px] text-sm disabled:bg-gray-50`} />
                          </FormField>
                        </div>
                        <div className="md:col-span-2">
                          <FormField label={lockedRequestType === 'KIEM_TRA' ? 'Các nguyên nhân (tùy chọn)' : 'Lỗi liên quan (tùy chọn)'}>
                            <FaultRecordTypeaheadCell
                              value={item.faultRecordSearch ?? ''}
                              faultRecordId={item.faultRecordId ?? null}
                              disabled={isView}
                              placeholder={lockedRequestType === 'KIEM_TRA' ? 'Tìm nguyên nhân theo mã/tên...' : undefined}
                              onSelect={(selected) => patchItem(index, {
                                faultRecordId: selected?.id ?? null,
                                faultRecordSearch: selected ? `${selected.maLoi} - ${selected.tenLoi}` : '',
                              })}
                            />
                          </FormField>
                        </div>
                      </div>
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        title="Xóa thiết bị"
                        aria-label="Xóa thiết bị"
                        onClick={() => { if (!window.confirm('Xoá thiết bị này? Hành động không thể hoàn tác.')) return; setItems((value) => value.filter((_, itemIndex) => itemIndex !== index)); }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors mt-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>

        {showAssigneeAndMaterial && (
          <>
            {showPlanOnCreate && (
            <div className="rounded-lg border border-gray-200">
              <button type="button" onClick={() => setPlanOpen((v) => !v)} className="flex w-full items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-1.5 text-left">
                <span className="font-medium text-gray-800">Kế hoạch</span>
                <span className="text-xs text-gray-500">{planOpen ? 'Thu gọn' : 'Mở rộng'}</span>
              </button>
              {planOpen && (
                <div className="p-2.5 space-y-2">
                  <FormField label="Kế hoạch chi tiết"><textarea rows={2} value={plan.keHoachChiTiet} onChange={(e) => setPlan((v) => ({ ...v, keHoachChiTiet: e.target.value }))} className={`${textareaCls()} min-h-[48px]`} placeholder="Mô tả kế hoạch..." /></FormField>
                  <FormField label="Phương án"><textarea rows={2} value={plan.phuongAn} onChange={(e) => setPlan((v) => ({ ...v, phuongAn: e.target.value }))} className={`${textareaCls()} min-h-[48px]`} placeholder="Phương án thực hiện..." /></FormField>
                  <FormField label="Biện pháp an toàn"><textarea rows={2} value={plan.bienPhapAnToan} onChange={(e) => setPlan((v) => ({ ...v, bienPhapAnToan: e.target.value }))} className={`${textareaCls()} min-h-[48px]`} placeholder="Biện pháp an toàn..." /></FormField>
                  <div className="grid gap-2 md:grid-cols-2">
                    <FormField label="Ngày bắt đầu kế hoạch"><input type="date" value={plan.ngayBatDauKeHoach} onChange={(e) => setPlan((v) => ({ ...v, ngayBatDauKeHoach: e.target.value }))} className={`${inputCls()} min-h-[38px]`} /></FormField>
                    <FormField label="Ngày hoàn thiện dự kiến"><input type="date" value={plan.ngayHoanThienDuKien} onChange={(e) => setPlan((v) => ({ ...v, ngayHoanThienDuKien: e.target.value }))} className={`${inputCls()} min-h-[38px]`} /></FormField>
                  </div>
                  <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                    <span className="text-xs font-medium text-gray-500">Chi phí dự kiến: </span>
                    <span className="text-sm text-gray-600">Chưa cập nhật</span>
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={plan.canNgungMay} onChange={(e) => setPlan((v) => ({ ...v, canNgungMay: e.target.checked }))} className="h-4 w-4 rounded border-gray-300" /> Cần ngừng máy</label>
                  {plan.ngayBatDauKeHoach && plan.ngayHoanThienDuKien && plan.ngayHoanThienDuKien <= plan.ngayBatDauKeHoach && (
                    <p className="text-xs text-red-600">Ngày hoàn thiện dự kiến phải sau ngày bắt đầu.</p>
                  )}
                </div>
              )}
            </div>
            )}
            {void showPlanOnCreate}

            {/* 2) Nguoi phu trach */}
            <div className="rounded-lg border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-1.5">
                <button type="button" onClick={() => setAssigneeOpen((v) => !v)} className="font-medium text-gray-800 text-left">Người phụ trách</button>
                <button type="button" onClick={() => setAssignees((prev) => [...prev, { userId: '', userName: '', isLead: prev.length === 0 }])} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 min-h-[32px]"><Plus className="h-4 w-4" /> Thêm người</button>
              </div>
              {assigneeOpen && (
                <div className="p-2.5 space-y-1.5">
                  {assignees.length === 0 && <p className="text-xs text-gray-400">Chưa có người phụ trách. Bấm Thêm người.</p>}
                  {assignees.map((a, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-2 rounded border border-gray-200 bg-gray-50/50 p-2">
                      <div className="flex-1 min-w-[180px]"><FormField label="Nhân viên">
                        <EmployeeCombobox
                          employees={employees}
                          value={a.userName}
                          excludedIds={assignees.filter((_, j) => j !== idx).map((x) => x.userId).filter(Boolean)}
                          currentId={a.userId || undefined}
                          onChange={(name) => {
                            const emp = employees.find((e) => e.name === name);
                            if (emp) {
                              const dup = assignees.some((x, j) => j !== idx && x.userId && x.userId.toLowerCase() === emp.id.toLowerCase());
                              if (dup) { toast.error('Nhân viên đã được chọn'); return; }
                              setAssignees((prev) => prev.map((x, i) => i === idx ? { ...x, userName: emp.name, userId: emp.id } : x));
                            } else if (name === '') {
                              setAssignees((prev) => prev.map((x, i) => i === idx ? { ...x, userName: '', userId: '' } : x));
                            } else {
                              setAssignees((prev) => prev.map((x, i) => i === idx ? { ...x, userName: name } : x));
                            }
                          }}
                          placeholder={employees.length === 0 ? 'Đang tải...' : 'Chọn nhân viên...'}
                        />
                      </FormField>
                      {a.userId && <span className="text-[11px] text-gray-400">{a.userId}</span>}
                      </div>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${a.isLead ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'}`}>{a.isLead ? 'CHÍNH' : 'PHỤ'}</span>
                      <label className="flex items-center gap-1.5 text-xs whitespace-nowrap cursor-pointer"><input type="checkbox" checked={a.isLead} onChange={(e) => {
                        const checked = e.target.checked;
                        setAssignees((prev) => prev.map((x, i) => {
                          if (i === idx) return { ...x, isLead: checked };
                          if (checked) return { ...x, isLead: false };
                          return x;
                        }));
                      }} className="h-3.5 w-3.5 rounded border-gray-300" /> Phụ trách chính</label>
                      <button type="button" onClick={() => setAssignees((prev) => prev.filter((_, i) => i !== idx))} title="Xóa" aria-label="Xóa người phụ trách" className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {assignees.filter((a) => a.isLead).length > 1 && <p className="text-xs text-red-600">Chỉ 1 lead.</p>}
                </div>
              )}
            </div>

            {/* 3) Phieu yeu cau cung cap (YCCC) — dang bang gon nhu YCCC that */}
            <div className="rounded-lg border border-gray-200">
              <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-1.5">
                <div className="min-w-0">
                  <button type="button" onClick={() => setMaterialOpen((v) => !v)} className="font-medium text-gray-800 text-left">Phiếu yêu cầu cung cấp (YCCC)</button>
                  <p className="text-[11px] text-gray-500">Mỗi dòng = 1 hàng hóa (chọn từ danh mục như YCCC). Khi tạo YCSC, các dòng này được lưu vào bảng liên kết và tự động tạo YCCC.</p>
                </div>
                <button type="button" onClick={() => setMaterials((prev) => [...prev, { itemIndex: 0, internationalProductId: null, tenVatTu: '', phanLoai: 'Vật tư', donVi: 'cái', soLuongDuKien: 1 }])} className="ml-3 shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 min-h-[32px]"><Plus className="h-4 w-4" /> Thêm hàng hóa</button>
              </div>
              {materialOpen && (
                <div className="p-2 space-y-1">
                  {materials.length === 0 && <p className="text-xs text-gray-400">Chưa có hàng hóa. Bấm Thêm hàng hóa — picker sẽ gợi ý theo danh mục (phanLoai Vật tư/Thiết bị...), cho phép nhập tên mới như YCCC.</p>}
                  {materials.length > 0 && (
                    <div className="overflow-x-auto rounded border border-gray-200">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-xs text-gray-500">
                            <th className="px-2 py-1.5 font-medium w-24">Thiết bị</th>
                            <th className="px-2 py-1.5 font-medium">Hàng hóa <span className="text-red-500">*</span></th>
                            <th className="px-2 py-1.5 font-medium w-20">SL <span className="text-red-500">*</span></th>
                            <th className="px-2 py-1.5 font-medium w-24">ĐVT <span className="text-red-500">*</span></th>
                            <th className="px-1 py-1.5 w-8 text-center"> </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {materials.map((m, idx) => (
                            <tr key={idx} className="align-top">
                              <td className="px-1.5 py-1.5">
                                <select value={m.itemIndex} onChange={(e) => setMaterials((prev) => prev.map((x, i) => i === idx ? { ...x, itemIndex: Number(e.target.value) } : x))} className={`${selectCls()} min-h-[32px] text-sm w-24`}>{items.map((_, i) => <option key={i} value={i}>#{i + 1}</option>)}</select>
                              </td>
                              <td className="px-1.5 py-1.5">
                                <div className="min-w-[180px] flex-1">
                                  <ProductCombobox
                                    products={products}
                                    value={m.internationalProductId}
                                    onChange={(_pid, product) => {
                                      if (!product) {
                                        setMaterials((prev) => prev.map((x, i) => i === idx ? { ...x, internationalProductId: null, tenVatTu: '', phanLoai: 'Vật tư', donVi: x.donVi || 'cái' } : x));
                                        return;
                                      }
                                      setMaterials((prev) => prev.map((x, i) => i === idx ? { ...x, internationalProductId: product.id, tenVatTu: product.tenSanPham, phanLoai: (product.loaiSanPham || 'Vật tư').trim() || 'Vật tư', donVi: product.donViTinh || x.donVi || 'cái' } : x));
                                    }}
                                    onCreateNew={(name) => setMaterials((prev) => prev.map((x, i) => i === idx ? { ...x, internationalProductId: null, tenVatTu: name, phanLoai: x.phanLoai || 'Vật tư' } : x))}
                                    initialText={m.tenVatTu}
                                    allowCreate
                                    placeholder="Tìm mã/tên/loại..."
                                  />
                                  {(!m.internationalProductId && m.tenVatTu) || m.phanLoai ? (
                                    <p className="mt-0.5 text-[11px] leading-tight truncate">
                                      {!m.internationalProductId && m.tenVatTu && <span className="text-amber-700">Chưa có trong danh mục</span>}
                                      {!m.internationalProductId && m.tenVatTu && m.phanLoai ? <span className="text-gray-400"> · </span> : null}
                                      {m.phanLoai && <span className="text-gray-500">Phân loại: <span className="font-medium text-gray-700">{m.phanLoai}</span></span>}
                                    </p>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-1.5 py-1.5">
                                <input type="number" min={0} step="0.01" value={String(m.soLuongDuKien)} onChange={(e) => setMaterials((prev) => prev.map((x, i) => i === idx ? { ...x, soLuongDuKien: parseNumberInput(e.target.value) } : x))} className={`${inputCls()} min-h-[32px] text-sm w-20`} placeholder="0" />
                              </td>
                              <td className="px-1.5 py-1.5">
                                <UnitSelect value={m.donVi} onChange={(val) => setMaterials((prev) => prev.map((x, i) => i === idx ? { ...x, donVi: val } : x))} className="w-24 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                              </td>
                              <td className="px-1 py-1.5 text-center">
                                <button type="button" onClick={() => setMaterials((prev) => prev.filter((_, i) => i !== idx))} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Xóa" aria-label="Xóa hàng hóa"><Trash2 className="h-4 w-4" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {materials.length > 0 && <p className="text-[11px] text-gray-500">Ghi chú “Cung cấp cho {'{maYeuCau YCSC}'}” sẽ ghi vào <span className="font-mono">YCCC.ghiChu</span>.</p>}
                </div>
              )}
            </div>
          </>
        )}

        {/* ===== READ-ONLY blocks for view YCSC — grid 3B ===== */}
        {isView && !effectiveIsKiemTra && (() => {
          const r = record as RepairRequest | null | undefined;
          const keHoachChiTiet = String((r as unknown as Record<string, unknown> | null)?.keHoachChiTiet ?? '').trim();
          const phuongAn = String((r as unknown as Record<string, unknown> | null)?.phuongAn ?? '').trim();
          const bienPhapAnToan = String((r as unknown as Record<string, unknown> | null)?.bienPhapAnToan ?? '').trim();
          const ngayBatDauKeHoach = (r as unknown as Record<string, unknown> | null)?.ngayBatDauKeHoach as string | null | undefined;
          const ngayHoanThienDuKien = (r as unknown as Record<string, unknown> | null)?.ngayHoanThienDuKien as string | null | undefined;
          const canNgungMay = Boolean((r as unknown as Record<string, unknown> | null)?.canNgungMay);
          const assigneesRO = (r?.assignees ?? []) as NonNullable<RepairRequest['assignees']>;
          const materialNeedsRO = (r?.materialNeeds ?? []) as NonNullable<RepairRequest['materialNeeds']>;
          const supplyLinksRO = (r?.supplyLinks ?? []) as NonNullable<RepairRequest['supplyLinks']>;
          const fmtDate = (v: string | null | undefined) => {
            if (!v) return '—';
            return formatDateVN(v);
          };
          return (
            <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
              <div className="space-y-2.5 min-w-0">

              <div className="grid gap-3 md:grid-cols-2">
              {/* Block: Kế hoạch */}
              <div className="rounded-lg border border-gray-200 bg-white p-2.5 space-y-2">
                <h4 className="text-sm font-semibold text-gray-800">Kế hoạch</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="text-xs font-medium text-gray-500">Kế hoạch chi tiết: </span><span className="text-gray-800 whitespace-pre-wrap">{keHoachChiTiet || '—'}</span></div>
                  <div><span className="text-xs font-medium text-gray-500">Phương án: </span><span className="text-gray-800 whitespace-pre-wrap">{phuongAn || '—'}</span></div>
                  <div><span className="text-xs font-medium text-gray-500">Biện pháp an toàn: </span><span className="text-gray-800 whitespace-pre-wrap">{bienPhapAnToan || '—'}</span></div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div><span className="text-xs font-medium text-gray-500">Ngày bắt đầu kế hoạch: </span><span className="text-gray-800">{fmtDate(ngayBatDauKeHoach ?? null)}</span></div>
                    <div><span className="text-xs font-medium text-gray-500">Ngày hoàn thiện dự kiến: </span><span className="text-gray-800">{fmtDate(ngayHoanThienDuKien ?? null)}</span></div>
                  </div>
                  <div><span className="text-xs font-medium text-gray-500">Cần ngừng máy: </span><span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${canNgungMay ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>{canNgungMay ? 'Có' : 'Không'}</span></div>
                </div>
              </div>

              {/* A3: Chi phí dự kiến (từ YCCC đầu) */}
              <div className="rounded-lg border border-gray-200 bg-white p-2.5">
                <h4 className="text-sm font-semibold text-gray-800">Chi phí dự kiến (từ YCCC đầu)</h4>
                <p className="mt-1 text-sm">{(r as unknown as { chiPhiDuKien?: number | null })?.chiPhiDuKien != null ? <span className="font-semibold text-gray-900">{formatVND(Number((r as unknown as { chiPhiDuKien: number }).chiPhiDuKien))}</span> : <span className="text-gray-400">Chưa có YCCC</span>}</p>
              </div>
              </div>

              {/* Block: YCCC chain — hydrate supplyChain via useRepairSupplyChain */}
              <div className="rounded-lg border border-gray-200 bg-white p-2.5 space-y-2">
                <div className="border-b -mx-3 -mt-3 mb-2 bg-gray-50 px-3 py-1.5">
                  <h4 className="text-sm font-semibold text-gray-800">Yêu cầu cung cấp (YCCC)</h4>
                </div>
                {materialNeedsRO.length === 0 && supplyLinksRO.length === 0 ? (
                  <p className="text-xs text-gray-400">Chưa có nhu cầu vật tư / liên kết YCCC.</p>
                ) : (
                  <>
                    {materialNeedsRO.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-600">Nhu cầu vật tư ({materialNeedsRO.length})</p>
                        <ul className="divide-y divide-gray-100 rounded border border-gray-100">
                          {materialNeedsRO.map((m) => (
                            <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-2.5 py-1.5 text-sm">
                              <span className="font-medium text-gray-800">{m.tenVatTu}</span>
                              <span className="text-xs text-gray-500">{m.soLuongDuKien} {m.donVi ?? ''}</span>
                              {m.maVatTu && <span className="text-xs text-gray-400 font-mono">{m.maVatTu}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {supplyLinksRO.length > 0 ? (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-600">Chuỗi YCCC → YCBS → YCMH</p>
                        <ul className="divide-y divide-gray-100 rounded border border-gray-100">
                          {supplyLinksRO.map((link) => {
                            const chForLink = (ycscSupplyChainQ.data?.data as unknown as { link: { id: string; supplyRequestId: string }; warehouseIssue?: { maPhieu: string } | null }[] | undefined)?.find((c) => c.link.id === link.id);
                            const px = chForLink?.warehouseIssue?.maPhieu;
                            return (
                            <li key={link.id} className="flex flex-wrap items-center gap-2 px-2.5 py-1.5 text-xs">
                              <span className="inline-flex items-center rounded bg-blue-50 border border-blue-200 px-2 py-0.5 font-mono text-blue-700">YCCC #{link.supplyRequestId.slice(0, 8)}</span>
                              <span className="text-gray-400">→</span>
                              <span className="text-gray-500">YCBS / YCMH theo dõi qua YCCC</span>
                              {px && (<><span className="text-gray-400">→</span><span className="inline-flex items-center rounded bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-emerald-700">PX {px}</span></>)}
                              {link.soLuong != null && <span className="text-gray-500">SL: {link.soLuong}</span>}
                            </li>
                          );})}
                        </ul>
                        {ycscSupplyChainQ.data?.data && (ycscSupplyChainQ.data.data as unknown as { supplyRequest?: { maYeuCau: string; trangThai: string } | null; replenishmentRequest?: { maYeuCau: string; trangThai: string } | null; purchaseRequest?: { maYeuCau: string; trangThai: string } | null; warehouseIssue?: { maPhieu: string } | null; decisionsMeta?: { reason?: string | null } | null }[]).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {(ycscSupplyChainQ.data.data as unknown as { supplyRequest?: { maYeuCau: string; trangThai: string } | null; replenishmentRequest?: { maYeuCau: string; trangThai: string } | null; purchaseRequest?: { maYeuCau: string; trangThai: string } | null; warehouseIssue?: { maPhieu: string } | null; decisionsMeta?: { reason?: string | null } | null }[]).map((ch, i) => (
                              <div key={i} className="rounded border bg-white px-2 py-1.5 text-xs flex flex-wrap items-center gap-1">
                                {ch.supplyRequest ? <span className="rounded-full border bg-blue-50 px-1.5 py-0.5">YCCC {ch.supplyRequest.maYeuCau} [{ch.supplyRequest.trangThai}]</span> : <span className="text-gray-400">YCCC —</span>}
                                <span className="text-gray-400">→</span>
                                {ch.replenishmentRequest ? <span className="rounded-full border bg-amber-50 px-1.5 py-0.5">YCBS {ch.replenishmentRequest.maYeuCau} [{ch.replenishmentRequest.trangThai}]</span> : <span className="text-gray-400">Chưa bổ sung</span>}
                                <span className="text-gray-400">→</span>
                                {ch.purchaseRequest ? <span className="rounded-full border bg-green-50 px-1.5 py-0.5">YCMH {ch.purchaseRequest.maYeuCau} [{ch.purchaseRequest.trangThai}]</span> : <span className="text-gray-400">—</span>}
                                {ch.warehouseIssue ? (<><span className="text-gray-400">→</span><span className="rounded-full border bg-emerald-50 px-1.5 py-0.5 text-emerald-700">PX {ch.warehouseIssue.maPhieu}</span></>) : null}
                                {ch.decisionsMeta?.reason && <span className="text-gray-500">({ch.decisionsMeta.reason})</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-[11px] text-gray-400">Chi tiết YCBS/YCMH xem trong phiếu YCCC liên kết.</p>
                      </div>
                    ) : materialNeedsRO.length > 0 ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-medium text-amber-800">Chưa tạo YCCC</div>
                    ) : null}
                  </>
                )}
              </div>


              {/* C2: Chi phí phát sinh */}
              <div className="rounded-lg border border-gray-200 bg-white p-2.5 space-y-2">
                <h4 className="text-sm font-semibold text-gray-800">Chi phí phát sinh</h4>
                <div className="overflow-x-auto rounded border border-gray-200">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 text-left text-xs text-gray-500"><th className="px-2 py-1.5">Tên khoản</th><th className="px-2 py-1.5 w-28">Số tiền</th><th className="px-2 py-1.5">Lý do *</th><th className="px-2 py-1.5 w-24">File</th><th className="px-1 py-1.5 w-12"></th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {incidentalCosts.map((row) => (
                        <tr key={row.id}>
                          {incEditId === row.id ? (
                            <>
                              <td className="px-1.5 py-1"><input value={incEdit.tenKhoan} onChange={e=>setIncEdit(s=>({...s, tenKhoan:e.target.value}))} className="w-full rounded border px-2 py-1 text-sm" /></td>
                              <td className="px-1.5 py-1"><input inputMode="numeric" value={incEdit.soTien ? formatNum(incEdit.soTien) : ''} onChange={e=>{ const v=e.target.value.replace(/[^\d]/g,''); setIncEdit(s=>({...s, soTien: v})); }} className={vndInputCls} /></td>
                              <td className="px-1.5 py-1"><input value={incEdit.lyDo} onChange={e=>setIncEdit(s=>({...s, lyDo:e.target.value}))} className="w-full rounded border px-2 py-1 text-sm" /></td>
                              <td className="px-1.5 py-1"><div className="flex items-center gap-1">{incEdit.filePending ? <span className="truncate text-xs text-gray-700 max-w-[90px]" title={incEdit.filePending.name}>{incEdit.filePending.name}</span> : row.fileMinhChung ? <a href={getFileUrl(String(row.fileMinhChung))} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline truncate max-w-[90px]">Xem</a> : <span className="text-xs text-gray-400">—</span>}<label className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded border bg-white hover:bg-gray-50 cursor-pointer" title="Chọn file"><input type="file" className="hidden" onChange={e=>{ const f=e.target.files?.[0] ?? null; setIncEdit(s=>({...s, filePending: f})); e.target.value=''; }} /><span className="text-[11px]">📎</span></label>{incEdit.filePending && <button type="button" onClick={()=>setIncEdit(s=>({...s, filePending: null}))} className="text-[11px] text-gray-400">✕</button>}</div></td>
                              <td className="px-1 py-1 flex gap-1"><button onClick={async()=>{ if(!ycscIdForChain) return; const soTien=Number(incEdit.soTien); if(!Number.isFinite(soTien)||soTien<0){ toast.error('Số tiền phải >=0'); return; } if(!incEdit.lyDo.trim()){ toast.error('Lý do bắt buộc'); return; } try{ const fd=new FormData(); fd.append('tenKhoan', incEdit.tenKhoan.trim()||row.tenKhoan); fd.append('soTien', String(soTien)); fd.append('lyDo', incEdit.lyDo.trim()); if(incEdit.filePending) fd.append('file', incEdit.filePending); await updateIncidental.mutateAsync({ id: ycscIdForChain, costId: row.id, payload: fd as never }); toast.success('Đã cập nhật'); setIncEditId(null); setIncEdit({ tenKhoan:'', soTien:'', lyDo:'', filePending: null });}catch(e){ toast.error(e instanceof Error?e.message:'Lỗi cập nhật'); } }} className="text-blue-600 text-xs">Lưu</button><button onClick={()=>setIncEditId(null)} className="text-gray-500 text-xs">Hủy</button></td>
                            </>
                          ) : (
                            <>
                              <td className="px-2 py-1.5">{row.tenKhoan}</td>
                              <td className="px-2 py-1.5 text-right">{formatVND(Number(row.soTien))}</td>
                              <td className="px-2 py-1.5 text-xs">{row.lyDo}</td>
                              <td className="px-2 py-1.5 text-xs truncate max-w-[120px]">{row.fileMinhChung ? <a href={String(row.fileMinhChung).startsWith('http') ? String(row.fileMinhChung) : getFileUrl(String(row.fileMinhChung))} target="_blank" rel="noreferrer" className="text-blue-600 underline">Xem</a> : '—'}</td>
                              <td className="px-1 py-1 text-right flex gap-1 justify-end"><button onClick={()=>{ setIncEditId(row.id); setIncEdit({ tenKhoan: row.tenKhoan, soTien: String(row.soTien), lyDo: row.lyDo, filePending: null }); }} className="text-blue-600 text-xs">Sửa</button><button onClick={async()=>{ if(!confirm('Xóa khoản này?')) return; try{ await deleteIncidental.mutateAsync({ id: ycscIdForChain as string, costId: row.id }); toast.success('Đã xóa'); }catch(e){ toast.error(e instanceof Error?e.message:'Lỗi xóa'); } }} className="text-red-500 text-xs">Xóa</button></td>
                            </>
                          )}
                        </tr>
                      ))}
                      <tr className="bg-gray-50/50">
                        <td className="px-1.5 py-1"><input placeholder="Tên khoản" value={incForm.tenKhoan} onChange={e=>setIncForm(s=>({...s, tenKhoan:e.target.value}))} className="w-full rounded border px-2 py-1.5 text-sm" /></td>
                        <td className="px-1.5 py-1"><input inputMode="numeric" placeholder="0" value={incForm.soTien ? formatNum(incForm.soTien) : ''} onChange={e=>{ const v=e.target.value.replace(/[^\d]/g,''); setIncForm(s=>({...s, soTien: v})); }} className={vndInputCls + ' py-1.5'} /></td>
                        <td className="px-1.5 py-1"><input placeholder="Lý do *" value={incForm.lyDo} onChange={e=>setIncForm(s=>({...s, lyDo:e.target.value}))} className="w-full rounded border px-2 py-1.5 text-sm" /></td>
                        <td className="px-1.5 py-1"><div className="flex items-center gap-1">{incForm.filePending ? <span className="truncate text-xs text-gray-700 max-w-[90px]" title={incForm.filePending.name}>{incForm.filePending.name}</span> : <span className="text-xs text-gray-400">—</span>}<label className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded border bg-white hover:bg-gray-50 cursor-pointer" title="Chọn file"><input type="file" className="hidden" onChange={e=>{ const f=e.target.files?.[0] ?? null; setIncForm(s=>({...s, filePending: f})); e.target.value=''; }} /><span className="text-[11px]">📎</span></label>{incForm.filePending && <button type="button" onClick={()=>setIncForm(s=>({...s, filePending: null}))} className="text-[11px] text-gray-400">✕</button>}</div></td>
                        <td className="px-1 py-1"><button onClick={async()=>{ if(!ycscIdForChain) return; const soTien=Number(incForm.soTien); if(!incForm.tenKhoan.trim()){ toast.error('Tên khoản bắt buộc'); return; } if(!Number.isFinite(soTien)||soTien<0){ toast.error('Số tiền phải >=0'); return; } if(!incForm.lyDo.trim()){ toast.error('Lý do bắt buộc'); return; } try{ const fd=new FormData(); fd.append('tenKhoan', incForm.tenKhoan.trim()); fd.append('soTien', String(soTien)); fd.append('lyDo', incForm.lyDo.trim()); if(incForm.filePending) fd.append('file', incForm.filePending); await createIncidental.mutateAsync({ id: ycscIdForChain, payload: fd as never }); toast.success('Đã thêm'); setIncForm({ tenKhoan:'', soTien:'', lyDo:'', filePending: null }); }catch(e){ toast.error(e instanceof Error?e.message:'Lỗi thêm'); } }} className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white">Thêm</button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-gray-400">soTien ≥0, lyDo bắt buộc. Tổng được cộng vào Thực tế.</p>
              </div>
              </div>
              <div className="space-y-2.5 min-w-0">
              {/* Block: Người phụ trách */}
              <div className="rounded-lg border border-gray-200 bg-white p-2.5 space-y-2">
                <h4 className="text-sm font-semibold text-gray-800">Người phụ trách</h4>
                {assigneesRO.length === 0 ? (
                  <p className="text-xs text-gray-400">Chưa phân công.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {assigneesRO.map((a) => (
                      <li key={a.id} className="flex items-center gap-2 rounded border border-gray-100 bg-gray-50 px-2.5 py-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">
                          {(a.userName ?? '?').trim().charAt(0).toUpperCase() || '?'}
                        </span>
                        <span className="flex-1 text-sm font-medium text-gray-800 truncate">{a.userName ?? a.userId ?? '—'}</span>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${a.isLead || a.vaiTro === 'CHINH' ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'}`}>{a.isLead || a.vaiTro === 'CHINH' ? 'CHÍNH' : 'PHỤ'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* B3: Cost summary — Dự kiến | Thực tế | Chênh lệch + null-price banner */}
              {(() => {
                const cs = (ycscCostQ.data as unknown as { data?: { duKien: number | null; thucTe: number; chenhLech: number | null; incidentalTotal: number; itemsWithNullPrice: { tenGoi: string }[] } })?.data ?? null;
                const duKien = cs?.duKien ?? (r as unknown as { chiPhiDuKien?: number | null })?.chiPhiDuKien ?? null;
                const thucTe = cs?.thucTe ?? 0;
                const chenh = cs?.chenhLech ?? (duKien != null ? thucTe - Number(duKien) : null);
                const nullItems: { tenGoi: string }[] = cs?.itemsWithNullPrice ?? [];
                const hasNull = nullItems.length > 0;
                return (
                  <div className="rounded-lg border border-gray-200 bg-white p-2.5 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-800">Tổng hợp chi phí</h4>
                    {hasNull && (
                      <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <p className="font-medium">Cảnh báo: có món chưa có giá thành</p>
                        <p className="mt-1">{nullItems.map(x=>x.tenGoi).join(', ')}</p>
                        <a href="/master-data?tab=products" className="mt-1 inline-block font-medium text-amber-700 underline">Cập nhật giá tại Danh mục sản phẩm (InternationalProduct)</a>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="rounded border bg-gray-50 px-2 py-2"><p className="text-xs text-gray-500">Dự kiến</p><p className="font-semibold">{duKien != null ? formatVND(Number(duKien)) : '—'}</p></div>
                      <div className="rounded border bg-blue-50 px-2 py-2"><p className="text-xs text-gray-500">Thực tế (YCCC + phát sinh)</p><p className="font-semibold">{formatVND(thucTe)}</p></div>
                      <div className={`rounded border px-2 py-2 ${chenh != null && chenh > 0 ? 'bg-red-50 border-red-200' : chenh != null && chenh < 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}><p className="text-xs text-gray-500">Chênh lệch</p><p className="font-semibold">{chenh != null ? (chenh > 0 ? '+' : '') + formatVND(chenh) : '—'}</p></div>
                    </div>
                    <p className="text-[11px] text-gray-400">Thực tế = tổng YCCC (price*qty) + chi phí phát sinh.</p>
                  </div>
                );
              })()}

              {/* Actual execution data — technician edits at DA_NGHIEM_THU, read-only once HOAN_THANH */}
              {viewStatus === 'DA_NGHIEM_THU' && isToBTView && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-3 space-y-3">
                  <h4 className="text-sm font-semibold text-gray-800">Thông tin thực tế</h4>
                  <div className="grid gap-3 md:grid-cols-3">
                    <FormField label="Chi phí thực tế (₫)">
                      <input type="number" min={0} step="any" inputMode="decimal" value={actualForm.chiPhiThucTe} onChange={(e) => setActualForm((v) => ({ ...v, chiPhiThucTe: e.target.value }))} className={`${inputCls()} min-h-[38px]`} placeholder="0" />
                    </FormField>
                    <FormField label="Giờ công thực tế">
                      <input type="number" min={0} step="any" inputMode="decimal" value={actualForm.gioCongThucTe} onChange={(e) => setActualForm((v) => ({ ...v, gioCongThucTe: e.target.value }))} className={`${inputCls()} min-h-[38px]`} placeholder="0" />
                    </FormField>
                    <FormField label="Ngày hoàn thành thực tế">
                      <input type="date" value={actualForm.ngayHoanThanhThucTe} onChange={(e) => setActualForm((v) => ({ ...v, ngayHoanThanhThucTe: e.target.value }))} className={`${inputCls()} min-h-[38px]`} />
                    </FormField>
                  </div>
                  <FormField label="Nội dung thực hiện">
                    <textarea rows={3} value={actualForm.noiDungThucHien} onChange={(e) => setActualForm((v) => ({ ...v, noiDungThucHien: e.target.value }))} className={`${textareaCls()} min-h-[60px]`} placeholder="Mô tả công việc đã thực hiện..." />
                  </FormField>
                  <div className="flex justify-end">
                    <button type="button" onClick={() => { void saveActualFields(); }} disabled={updateActualFields.isPending} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed">
                      <Save className="h-4 w-4" /> {updateActualFields.isPending ? 'Đang lưu...' : 'Lưu thông tin thực tế'}
                    </button>
                  </div>
                </div>
              )}
              {viewStatus === 'HOAN_THANH' && (
                <div className="rounded-lg border border-gray-200 bg-white p-2.5 space-y-2">
                  <h4 className="text-sm font-semibold text-gray-800">Thông tin thực tế</h4>
                  <div className="grid gap-2 text-sm md:grid-cols-3">
                    <div><span className="text-xs font-medium text-gray-500">Chi phí thực tế: </span><span className="text-gray-800">{actualForm.chiPhiThucTe ? formatVND(Number(actualForm.chiPhiThucTe)) : '—'}</span></div>
                    <div><span className="text-xs font-medium text-gray-500">Giờ công thực tế: </span><span className="text-gray-800">{actualForm.gioCongThucTe || '—'}</span></div>
                    <div><span className="text-xs font-medium text-gray-500">Ngày hoàn thành thực tế: </span><span className="text-gray-800">{fmtDate(actualSrc?.ngayHoanThanhThucTe ?? null)}</span></div>
                  </div>
                  <div className="text-sm"><span className="text-xs font-medium text-gray-500">Nội dung thực hiện: </span><span className="text-gray-800 whitespace-pre-wrap">{actualForm.noiDungThucHien || '—'}</span></div>
                </div>
              )}


              </div>
            </div>
          );
        })()}

        {isView && !form.ghiChu?.trim() ? (
          <p className="text-sm text-gray-400"><span className="text-xs font-medium text-gray-500">Ghi chú:</span> —</p>
        ) : (
          <div className={`rounded-lg border p-2.5 ${isView && form.ghiChu?.trim() ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
            <FormField label="Ghi chú">
              <textarea disabled={isView} rows={2} maxLength={500} placeholder="Ghi chú thêm về yêu cầu (tùy chọn, tối đa 500 ký tự)..." value={form.ghiChu ?? ''} onChange={(event) => setForm((value) => ({ ...value, ghiChu: event.target.value }))} className={`${textareaCls()} min-h-[44px] disabled:bg-gray-50`} />
              {!isView && <p className="mt-1 text-right text-[11px] text-gray-400">{(form.ghiChu ?? '').length}/500 ký tự</p>}
            </FormField>
          </div>
        )}
        {isView && effectiveIsKiemTra && (viewStatus === 'DANG_KIEM_TRA' || viewStatus === 'DA_KIEM_TRA' || viewStatus === 'CHO_NGHIEM_THU' || (viewStatus === 'HOAN_THANH' && !!viewKetLuanStr)) && (
          <div className={`rounded-lg border p-3 space-y-3 ${viewStatus === 'DANG_KIEM_TRA' ? 'border-yellow-200 bg-yellow-50' : 'border-green-200 bg-green-50'}`}>
            <h4 className="text-sm font-semibold text-gray-800">Kết quả kiểm tra thực tế</h4>
            {viewStatus === 'DANG_KIEM_TRA' && isToBTView ? (
              <div className="space-y-3">
                <FormField label="Kết quả kiểm tra" required><textarea rows={3} value={viewInspectForm.ketQuaKiemTra} onChange={e=>setViewInspectForm(v=>({...v, ketQuaKiemTra: e.target.value}))} className={`${textareaCls()} min-h-[60px]`} placeholder="Mô tả kết quả thực tế" /></FormField>
                <FormField label="Mức độ hư hỏng"><select value={viewInspectForm.mucDoHuHong} onChange={e=>setViewInspectForm(v=>({...v, mucDoHuHong: e.target.value}))} className={`${selectCls()} min-h-[44px]`}><option value="">— Chọn —</option>{MUC_DO_OPTIONS.map(k => <option key={k} value={k}>{MUC_DO_LABELS[k]}</option>)}</select></FormField>
                <FormField label="Đề xuất xử lý"><textarea rows={2} value={viewInspectForm.deXuatXuLy} onChange={e=>setViewInspectForm(v=>({...v, deXuatXuLy: e.target.value}))} className={`${textareaCls()} min-h-[60px]`} /></FormField>
                <FormField label="Kết luận" required><select value={viewInspectForm.ketLuan} onChange={e=>setViewInspectForm(v=>({...v, ketLuan: e.target.value}))} className={`${selectCls()} min-h-[44px]`}><option value="">— Chọn —</option>{KET_LUAN_OPTIONS.map(k => <option key={k} value={k}>{KET_LUAN_LABELS[k]}</option>)}</select></FormField>
                {viewIsFixed && (
                  <div className="rounded-lg border border-green-200 bg-white p-2.5 space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700">Dữ liệu nghiệm thu — gửi người tạo yêu cầu xác nhận</p>
                    <FormField label="Tình trạng sau khắc phục" required><textarea rows={3} value={viewFixForm.tinhTrangSau} onChange={e=>setViewFixForm(v=>({...v, tinhTrangSau: e.target.value}))} className={`${textareaCls()} min-h-[60px]`} placeholder="Mô tả tình trạng thiết bị sau khi khắc phục" /></FormField>
                    <FormField label="Ghi chú nghiệm thu"><textarea rows={2} value={viewFixForm.ghiChu} onChange={e=>setViewFixForm(v=>({...v, ghiChu: e.target.value}))} className={`${textareaCls()} min-h-[44px]`} placeholder="Tùy chọn" /></FormField>
                    <FileUpload label="Tệp đính kèm nghiệm thu *" files={viewFixFile ? [viewFixFile] : []} onChange={(files) => setViewFixFile(files[0] ?? null)} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar" compact />
                  </div>
                )}
                {!viewCanSubmit && <p className="text-xs text-amber-600">{viewIsFixed ? 'Nhập Kết quả kiểm tra, Tình trạng sau khắc phục và đính kèm tệp để Gửi.' : 'Nhập đủ Kết quả kiểm tra và Kết luận để Gửi kết quả ở footer.'}</p>}
              </div>
            ) : (
              <div className="space-y-2 text-sm text-gray-700">
                <p><span className="text-xs font-medium text-gray-500">Kết quả:</span> {viewInspectForm.ketQuaKiemTra || String((record as unknown as Record<string,unknown>)?.ketQuaKiemTra ?? '—')}</p>
                <p className="flex items-center gap-2"><span className="text-xs font-medium text-gray-500">Mức độ:</span> {(() => { const code = viewInspectForm.mucDoHuHong || String((record as unknown as Record<string,unknown>)?.mucDoHuHong ?? ''); if (!code || code === '—') return <span>—</span>; return <><StatusBadge label={formatMucDo(code)} tone={MUC_DO_TONE[code] ?? 'gray'} /></>; })()}</p>
                <p><span className="text-xs font-medium text-gray-500">Đề xuất:</span> {viewInspectForm.deXuatXuLy || String((record as unknown as Record<string,unknown>)?.deXuatXuLy ?? '—')}</p>
                <p className="flex items-center gap-2"><span className="text-xs font-medium text-gray-500">Kết luận:</span> {(() => { const code = viewInspectForm.ketLuan || String((record as unknown as Record<string,unknown>)?.ketLuan ?? ''); if (!code || code === '—') return <span>—</span>; return <StatusBadge label={formatKetLuan(code)} tone={KET_LUAN_TONE[code] ?? 'gray'} />; })()}</p>
              </div>
            )}
          </div>
        )}
        {!isView && !record && (
          <FileUpload
            label={`File đính kèm (tối đa ${INSPECTION_MAX_FILES} tệp)`}
            helpText="PDF, Word, Excel, ảnh, TXT, ZIP/RAR — mỗi tệp tối đa 100MB"
            files={selectedFiles}
            onChange={(files) => setSelectedFiles(files.slice(0, INSPECTION_MAX_FILES))}
            multiple
            maxFiles={INSPECTION_MAX_FILES}
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
          />
        )}
        {!isView && record && (
          <div className="space-y-2">
            {(() => {
              const kept = ((record as unknown as { tepDinhKem?: string[] })?.tepDinhKem ?? [])
                .concat((record as unknown as { fileDinhKem?: string | null })?.fileDinhKem ? [String((record as unknown as { fileDinhKem?: string })?.fileDinhKem)] : []);
              const remaining = INSPECTION_MAX_FILES - kept.length;
              return kept.length > 0 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                  <p className="mb-1.5 text-xs font-medium text-gray-500">Tệp đã đính kèm ({kept.length}/{INSPECTION_MAX_FILES})</p>
                  <ul className="space-y-1">{kept.map((url) => (<li key={url}><a href={getFileUrl(url)} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate block" title={String(url.split('/').pop())}>{String(url.split('/').pop())}</a></li>))}</ul>
                  {remaining <= 0 && <p className="mt-1 text-xs text-amber-600">Đã đạt tối đa {INSPECTION_MAX_FILES} tệp.</p>}
                </div>
              ) : null;
            })()}
            {(() => {
              const keptCount = ((record as unknown as { tepDinhKem?: string[] })?.tepDinhKem ?? []).length + ((record as unknown as { fileDinhKem?: string | null })?.fileDinhKem ? 1 : 0);
              if (keptCount >= INSPECTION_MAX_FILES) return null;
              return (
                <FileUpload
                  label="Thêm tệp đính kèm"
                  helpText={`Còn thêm được ${INSPECTION_MAX_FILES - keptCount} tệp`}
                  files={selectedFiles}
                  onChange={(files) => setSelectedFiles(files.slice(0, INSPECTION_MAX_FILES - keptCount))}
                  multiple
                  maxFiles={INSPECTION_MAX_FILES - keptCount}
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                />
              );
            })()}
          </div>
        )}
        {isView && (() => {
          const urls = ((record as unknown as { tepDinhKem?: string[] })?.tepDinhKem ?? [])
            .concat((record as unknown as { fileDinhKem?: string | null })?.fileDinhKem ? [String((record as unknown as { fileDinhKem?: string })?.fileDinhKem)] : []);
          if (urls.length === 0) return null;
          return (
            <div className="rounded-lg border border-gray-200 bg-white p-2.5">
              <p className="mb-1.5 text-xs font-medium text-gray-500">File đính kèm ({urls.length})</p>
              <ul className="space-y-1.5">
                {urls.map((url, i) => (
                  <li key={url}>
                    <a href={getFileUrl(url)} target="_blank" rel="noreferrer" title="Mở file trong tab mới" className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors">
                      <FileText className="h-4 w-4 shrink-0" />
                      <span className="truncate">{i + 1}. {String(url.split('/').pop())}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}

        {isView && effectiveIsKiemTra && (
          <div className="rounded-lg border border-gray-200">
            <div className="border-b bg-gray-50 px-3 py-1.5">
              <span className="text-sm font-semibold text-gray-800">Liên kết YCSC đã tạo</span>
            </div>
            {(() => {
              const repairs = (record as unknown as { repairRequests?: { id: number | string; maYeuCau: string; trangThai: string }[] })?.repairRequests ?? [];
              if (repairs.length === 0) return <p className="px-2.5 py-2 text-xs text-gray-400">Chưa tạo YCSC từ phiếu này.</p>;
              return (
                <div className="p-2.5 flex flex-wrap gap-1.5">
                  {repairs.map((rr) => (
                    <button key={String(rr.id)} type="button" onClick={() => setSearchParams(buildTechnicalDetailParams(searchParams, 'repair', rr.id))} className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 whitespace-nowrap"><Link2 className="h-3 w-3" /> <span className="font-mono">{rr.maYeuCau}</span> <StatusBadge label={(REPAIR_STATUS_LABELS as Record<string, { label: string }>)[rr.trangThai]?.label ?? rr.trangThai} tone={((REPAIR_STATUS_LABELS as Record<string, { tone: BadgeTone }>)[rr.trangThai]?.tone ?? 'gray')} size="sm" /></button>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
        {isView && (
          <div className="rounded-lg border border-gray-200">
            <div className="flex items-center gap-1 border-b bg-gray-50 px-2 py-1">
              <button type="button" onClick={() => setHistoryTab('handover')} className={`rounded px-2.5 py-1 text-xs font-medium ${historyTab === 'handover' ? 'bg-white border shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Nghiệm thu</button>
              <button type="button" onClick={() => setHistoryTab('status')} className={`rounded px-2.5 py-1 text-xs font-medium ${historyTab === 'status' ? 'bg-white border shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Trạng thái</button>
              {historyTab === 'status' && hasMoreHistory && <button type="button" onClick={() => setViewHistoryOpen(true)} className="ml-auto text-xs font-medium text-blue-600 hover:underline">Xem tất cả ({historyEntries.length})</button>}
            </div>
            {historyTab === 'handover' ? (
              (record?.acceptanceHandovers?.length ?? 0) === 0 ? <p className="px-3 py-4 text-sm text-gray-400">Chưa có nghiệm thu cho yêu cầu này.</p> : (
              <div className="divide-y divide-gray-100">
                {record!.acceptanceHandovers!.map((nt) => (
                  <div key={nt.id} className="px-3 py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-xs font-medium text-blue-700">{nt.maNghiemThu}</span>
                      <span className="text-xs text-gray-500 tabular-nums">{formatDateVN(nt.ngayNghiemThu)}</span>
                    </div>
                    {nt.tenHeThongThietBi && (<div className="text-gray-700 mb-1"><span className="text-xs font-medium text-gray-500">Hệ thống/thiết bị: </span>{nt.tenHeThongThietBi}</div>)}
                    {nt.tinhTrangTruocSuaChua && (<div className="text-gray-700 mb-1"><span className="text-xs font-medium text-gray-500">Trước sửa: </span>{nt.tinhTrangTruocSuaChua}</div>)}
                    {nt.tinhTrangSauSuaChua && (<div className="text-gray-700 mb-1"><span className="text-xs font-medium text-gray-500">Sau sửa: </span>{nt.tinhTrangSauSuaChua}</div>)}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      {nt.nguoiBanGiao && <span>Người bàn giao: <span className="text-gray-700">{nt.nguoiBanGiao}</span></span>}
                      {(nt.nguoiXacNhanTen || nt.nguoiNhan) && <span>Người xác nhận: <span className="text-gray-700">{nt.nguoiXacNhanTen || nt.nguoiNhan}</span></span>}
                      {nt.fileDinhKem && <a href={getFileUrl(nt.fileDinhKem)} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Tệp nghiệm thu</a>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      {nt.ketQua ? <StatusBadge label={nt.ketQua === 'DAT' ? 'ĐẠT' : 'KHÔNG ĐẠT'} tone={nt.ketQua === 'DAT' ? 'green' : 'red'} /> : <StatusBadge label="Chờ xác nhận" tone="yellow" />}
                      {nt.xacNhanLuc && <span className="text-gray-500 tabular-nums">{formatDateTimeVN(nt.xacNhanLuc)}</span>}
                      {nt.lyDoXacNhan && <span className="text-gray-600">Lý do: {nt.lyDoXacNhan}</span>}
                    </div>
                  </div>
                ))}
              </div>
              )
            ) : (
              <div className="p-2.5">
                <StatusTimeline entries={inlineEntries} isLoading={!!activeHistoryQ.isLoading} compact statusLabels={VIEW_STATUS_LABELS} />
                {hasMoreHistory && (<button type="button" onClick={() => setViewHistoryOpen(true)} className="mt-2 text-xs font-medium text-blue-600 hover:underline">Xem tất cả ({historyEntries.length})</button>)}
              </div>
            )}
          </div>
        )}
      </form>
      {/* Overlays for view footer actions */}
      {viewHistoryOpen && (
        <Modal isOpen onClose={() => setViewHistoryOpen(false)} showBackdrop>
          <div className="bg-white rounded-lg w-full max-w-lg p-4 space-y-3 max-h-[80vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between"><h4 className="font-semibold text-sm">Lịch sử trạng thái</h4><button type="button" onClick={()=>setViewHistoryOpen(false)} aria-label="Đóng" title="Đóng"><X className="h-4 w-4" /></button></div>
            <StatusTimeline entries={historyEntries} isLoading={!!activeHistoryQ.isLoading} statusLabels={VIEW_STATUS_LABELS} />
            <div className="flex justify-end"><button onClick={()=>setViewHistoryOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Đóng</button></div>
          </div>
        </Modal>
      )}
      {viewCancelOpen && (
        <Modal isOpen onClose={()=>setViewCancelOpen(false)} showBackdrop>
          <div className="bg-white rounded-lg w-full max-w-md p-4 space-y-3" onClick={e=>e.stopPropagation()}>
            <h4 className="font-semibold text-sm">{viewCancelMode === 'reject' ? 'Từ chối phiếu' : 'Hủy phiếu'}</h4>
            <label className="block space-y-1 text-sm"><span className="text-xs text-gray-600">Lý do {viewCancelMode === 'reject' ? '*' : '(tuỳ chọn)'}</span><textarea rows={3} value={viewCancelReason} onChange={e=>setViewCancelReason(e.target.value)} placeholder={viewCancelMode==='reject'?'Nhập lý do từ chối...':'Nhập lý do hủy...'} className="w-full rounded border px-2 py-1.5" /></label>
            <div className="flex justify-end gap-2"><button onClick={()=>setViewCancelOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Đóng</button><button onClick={async()=>{ const id=(record as unknown as {id:number}).id; const reason=viewCancelReason.trim()||undefined; if(viewCancelMode==='reject' && !reason){ toast.error('Vui lòng nhập lý do từ chối'); return; } try{ /* route by record type — YCKT/YCSC ids overlap, a fallback would hit the wrong record */ const svc = effectiveIsKiemTra ? inspectionRequestService : repairRequestService; if(viewCancelMode==='reject'){ await svc.reject(id as never, reason); } else { await svc.cancel(id as never, reason); } toast.success(viewCancelMode==='reject'?'Đã từ chối':'Đã hủy phiếu'); setViewCancelOpen(false); queryClient.invalidateQueries({ queryKey: effectiveIsKiemTra ? inspectionKeys.all : repairRequestKeys.all }); onSaved?.(); onClose(); }catch(e){ toast.error(e instanceof Error?e.message:'Không thực hiện được'); } }} className={`rounded px-4 py-2 text-sm font-medium text-white ${viewCancelMode==='reject'?'bg-red-600 hover:bg-red-700':'bg-amber-600 hover:bg-amber-700'}`}>{viewCancelMode==='reject'?'Từ chối':'Hủy phiếu'}</button></div>
          </div>
        </Modal>
      )}
      {viewConfirmOpen && viewPendingSlip && (
        <Modal isOpen onClose={()=>setViewConfirmOpen(false)} showBackdrop>
          <div className="bg-white rounded-lg w-full max-w-lg p-4 space-y-3" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between"><h4 className="font-semibold text-sm">Xác nhận nghiệm thu — {viewPendingSlip.maNghiemThu}</h4><button onClick={()=>setViewConfirmOpen(false)} aria-label="Đóng"><X className="h-4 w-4" /></button></div>
            <div className="rounded border border-gray-200 bg-gray-50 p-3 space-y-1.5 text-sm">
              <p><span className="text-xs font-medium text-gray-500">Kỹ thuật thực hiện:</span> {viewPendingSlip.nguoiBanGiao || '—'}</p>
              <p className="whitespace-pre-wrap"><span className="text-xs font-medium text-gray-500">Tình trạng sau khắc phục:</span> {viewPendingSlip.tinhTrangSauSuaChua || '—'}</p>
              {viewPendingSlip.ghiChu && <p className="whitespace-pre-wrap"><span className="text-xs font-medium text-gray-500">Ghi chú:</span> {viewPendingSlip.ghiChu}</p>}
              {viewPendingSlip.fileDinhKem && <a href={getFileUrl(viewPendingSlip.fileDinhKem)} target="_blank" rel="noreferrer" className="inline-flex text-xs font-medium text-blue-700 hover:underline">Xem tệp nghiệm thu</a>}
            </div>
            <div className="flex gap-2 text-sm">
              {(['DAT','KHONG_DAT'] as const).map(k => (
                <button key={k} type="button" onClick={()=>setViewConfirmForm(f=>({...f, ketQua: k}))} aria-pressed={viewConfirmForm.ketQua===k} className={`flex-1 rounded border px-3 py-2 font-medium ${viewConfirmForm.ketQua===k ? (k==='DAT' ? 'border-green-600 bg-green-50 text-green-700' : 'border-red-600 bg-red-50 text-red-700') : 'border-gray-300 text-gray-600'}`}>{k==='DAT' ? 'ĐẠT' : 'KHÔNG ĐẠT'}</button>
              ))}
            </div>
            <label className="block space-y-1 text-sm"><span className="text-xs text-gray-600">Lý do {viewConfirmForm.ketQua==='KHONG_DAT' ? <span className="text-red-500">*</span> : '(tuỳ chọn)'}</span><textarea rows={3} value={viewConfirmForm.lyDo} onChange={e=>setViewConfirmForm(f=>({...f, lyDo: e.target.value}))} placeholder={viewConfirmForm.ketQua==='KHONG_DAT' ? 'Nêu rõ điểm chưa đạt để kỹ thuật xử lý lại' : 'Nhận xét (tuỳ chọn)'} className="w-full rounded border px-2 py-1.5" /></label>
            <div className="flex justify-end gap-2">
              <button onClick={()=>setViewConfirmOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Hủy</button>
              <button disabled={viewConfirmSubmitting} onClick={async()=>{
                const id=(record as unknown as {id:number}).id;
                if (viewConfirmForm.ketQua==='KHONG_DAT' && !viewConfirmForm.lyDo.trim()) { toast.error('Vui lòng nhập lý do không đạt'); return; }
                setViewConfirmSubmitting(true);
                try {
                  await confirmInspectionMut.mutateAsync({ id, ketQua: viewConfirmForm.ketQua, lyDo: viewConfirmForm.lyDo.trim() || undefined });
                  toast.success(viewConfirmForm.ketQua==='DAT' ? 'Đã xác nhận ĐẠT — phiếu hoàn thành' : 'Đã xác nhận KHÔNG ĐẠT — chuyển lại kỹ thuật');
                  setViewConfirmOpen(false);
                  onSaved?.(); onClose();
                } catch(e) { toast.error(e instanceof Error ? e.message : 'Không xác nhận được'); }
                finally { setViewConfirmSubmitting(false); }
              }} className={`rounded px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${viewConfirmForm.ketQua==='KHONG_DAT' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>Xác nhận</button>
            </div>
          </div>
        </Modal>
      )}
      {viewDeleteOpen && (
        <Modal isOpen onClose={()=>setViewDeleteOpen(false)} showBackdrop>
          <div className="bg-white rounded-lg w-full max-w-md p-4 space-y-3" onClick={e=>e.stopPropagation()}>
            <h4 className="font-semibold text-sm text-red-600">Xóa phiếu?</h4>
            <p className="text-sm text-gray-600">Hành động này không thể hoàn tác.</p>
            <div className="flex justify-end gap-2"><button onClick={()=>setViewDeleteOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Hủy</button><button onClick={async()=>{ const id=(record as unknown as {id:number|string}).id; const isInspection = effectiveIsKiemTra; try{ if(isInspection) await inspectionRequestService.delete(id); else await repairRequestService.delete(id as never); toast.success('Đã xóa'); setViewDeleteOpen(false); queryClient.invalidateQueries({ queryKey: inspectionKeys.all }); queryClient.invalidateQueries({ queryKey: repairRequestKeys.all }); onClose(); }catch(e){ toast.error(e instanceof Error?e.message:'Không xóa được'); } }} className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Xóa</button></div>
          </div>
        </Modal>
      )}
      {/* YCSC Plan modal */}
      {ycscPlanOpen && (
        <Modal isOpen onClose={()=>setYcscPlanOpen(false)} showBackdrop>
          <div className="bg-white rounded-lg w-full max-w-lg p-4 space-y-3" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between"><h4 className="font-semibold text-sm">Lên kế hoạch — {(record as unknown as { maYeuCau?: string })?.maYeuCau}</h4><button onClick={()=>setYcscPlanOpen(false)}><X className="h-4 w-4" /></button></div>
            <div className="space-y-3 text-sm">
              <label className="block space-y-1"><span className="font-medium text-gray-700">Kế hoạch chi tiết</span><textarea rows={2} value={ycscPlanForm.keHoachChiTiet} onChange={e=>setYcscPlanForm(f=>({...f, keHoachChiTiet:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
              <label className="block space-y-1"><span className="font-medium text-gray-700">Phương án</span><input value={ycscPlanForm.phuongAn} onChange={e=>setYcscPlanForm(f=>({...f, phuongAn:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
              <label className="block space-y-1"><span className="font-medium text-gray-700">Biện pháp an toàn</span><input value={ycscPlanForm.bienPhapAnToan} onChange={e=>setYcscPlanForm(f=>({...f, bienPhapAnToan:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1"><span className="font-medium text-gray-700">Ngày BĐKH</span><input type="date" value={ycscPlanForm.ngayBatDauKeHoach} onChange={e=>setYcscPlanForm(f=>({...f, ngayBatDauKeHoach:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
                <label className="space-y-1"><span className="font-medium text-gray-700">Ngày HTDK</span><input type="date" value={ycscPlanForm.ngayHoanThienDuKien} onChange={e=>setYcscPlanForm(f=>({...f, ngayHoanThienDuKien:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
              </div>
              <label className="block space-y-1"><span className="font-medium text-gray-700">Chi phí dự kiến</span><input type="number" min={0} value={ycscPlanForm.chiPhiDuKien} onChange={e=>setYcscPlanForm(f=>({...f, chiPhiDuKien:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={ycscPlanForm.canNgungMay} onChange={e=>setYcscPlanForm(f=>({...f, canNgungMay:e.target.checked}))} /><span>Cần ngừng máy</span></label>
              {(() => {
                const recordAssignees = ((record as unknown as { assignees?: { userId?: string; userName?: string | null; isLead?: boolean; vaiTro?: string }[] })?.assignees ?? []) as { userId?: string; userName?: string | null; isLead?: boolean; vaiTro?: string }[];
                const srcAssignees = recordAssignees.length ? recordAssignees.map(a => ({ userId: String(a.userId ?? ''), userName: String(a.userName ?? ''), isLead: !!(a.isLead || a.vaiTro === 'CHINH') })) : assignees;
                const leadTmp = srcAssignees.find(a => a.isLead) || srcAssignees[0] || null;
                const leadEmpTmp = leadTmp ? employees.find(e => (leadTmp.userId && e.id === leadTmp.userId) || (leadTmp.userName && e.name === leadTmp.userName)) ?? null : null;
                const deptLabel = (leadEmpTmp?.department || (leadEmpTmp as unknown as { subDepartmentName?: string })?.subDepartmentName || 'Chưa xác định') as string;
                return <div className="rounded border bg-gray-50 px-2 py-1.5 text-xs"><span className="font-medium text-gray-700">Phòng ban: </span><span className="text-gray-800">{deptLabel}</span>{leadTmp ? <span className="ml-2 text-gray-500">({leadTmp.userName || leadTmp.userId})</span> : <span className="ml-2 text-amber-600">Chưa chọn người phụ trách chính</span>}</div>;
              })()}
            </div>
            <div className="flex justify-end gap-2"><button onClick={()=>setYcscPlanOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Hủy</button><button onClick={async()=>{ const rid=(record as unknown as {id:number|string}).id; if(ycscPlanForm.ngayBatDauKeHoach && ycscPlanForm.ngayHoanThienDuKien && new Date(ycscPlanForm.ngayHoanThienDuKien).getTime() <= new Date(ycscPlanForm.ngayBatDauKeHoach).getTime()){ toast.error('Ngày hoàn thiện dự kiến phải sau ngày bắt đầu kế hoạch'); return; } const payload: Record<string,unknown>={}; if(ycscPlanForm.keHoachChiTiet.trim()) payload.keHoachChiTiet=ycscPlanForm.keHoachChiTiet.trim(); if(ycscPlanForm.phuongAn.trim()) payload.phuongAn=ycscPlanForm.phuongAn.trim(); if(ycscPlanForm.bienPhapAnToan.trim()) payload.bienPhapAnToan=ycscPlanForm.bienPhapAnToan.trim(); if(ycscPlanForm.ngayBatDauKeHoach) payload.ngayBatDauKeHoach=ycscPlanForm.ngayBatDauKeHoach; if(ycscPlanForm.ngayHoanThienDuKien) payload.ngayHoanThienDuKien=ycscPlanForm.ngayHoanThienDuKien; if(ycscPlanForm.chiPhiDuKien!==''){ const n=Number(ycscPlanForm.chiPhiDuKien); if(!Number.isFinite(n)||n<0){ toast.error('Chi phí dự kiến phải >= 0'); return; } payload.chiPhiDuKien=n; } payload.canNgungMay=ycscPlanForm.canNgungMay; const __recAssignees = ((record as unknown as { assignees?: { userId?: string; userName?: string | null; isLead?: boolean; vaiTro?: string }[] })?.assignees ?? []) as { userId?: string; userName?: string | null; isLead?: boolean; vaiTro?: string }[]; const __srcAssignees = __recAssignees.length ? __recAssignees.map(a=>({ userId: String(a.userId??''), userName: String(a.userName??''), isLead: !!(a.isLead||a.vaiTro==='CHINH')})) : assignees; const __lead = __srcAssignees.find(a=>a.isLead) || __srcAssignees[0] || null; const __leadEmp = __lead ? employees.find(e=> (__lead.userId && e.id===__lead.userId) || (__lead.userName && e.name===__lead.userName)) as unknown as Record<string,unknown>|null ?? null : null; const __deptId = String(((__leadEmp as unknown as Record<string,unknown>|null)?.departmentId as string) ?? ((__leadEmp as unknown as Record<string,unknown>|null)?.subDepartmentId as string) ?? ((__leadEmp as unknown as Record<string,unknown>|null)?.department as string) ?? '').trim(); if(!__deptId){ toast.error('Vui lòng chọn người phụ trách Chính trước khi lên kế hoạch'); return; } payload.phongBanId=__deptId; try{ await repairRequestService.plan(rid as never, payload as never); toast.success('Đã lên kế hoạch'); setYcscPlanOpen(false); queryClient.invalidateQueries({ queryKey: repairRequestKeys.all }); onSaved?.(); onClose(); }catch(e){ toast.error(e instanceof Error?e.message:'Không lên kế hoạch được'); } }} className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">Xác nhận kế hoạch</button></div>
          </div>
        </Modal>
      )}
      {ycscSubmitOpen && (() => {
        const rItems = ((record as unknown as { items?: { id: string; tenHeThong: string; tinhTrangThietBi: string; noiDungLoi: string; machineSystemId?: string; machineSystemDetailId?: string }[] })?.items ?? []) as { id: string; tenHeThong: string; tinhTrangThietBi: string; noiDungLoi: string }[];
        const keHoachVal = String((record as unknown as Record<string, unknown> | null)?.keHoachChiTiet ?? '').trim();
        const phuongAnVal = String((record as unknown as Record<string, unknown> | null)?.phuongAn ?? '').trim();
        const bienPhapVal = String((record as unknown as Record<string, unknown> | null)?.bienPhapAnToan ?? '').trim();
        const ngayBD = (record as unknown as Record<string, unknown> | null)?.ngayBatDauKeHoach as string | null | undefined;
        const ngayKT = (record as unknown as Record<string, unknown> | null)?.ngayHoanThienDuKien as string | null | undefined;
        const canNgung = Boolean((record as unknown as Record<string, unknown> | null)?.canNgungMay);
        const fmtD = (v: string | null | undefined) => formatDateVN(v);
        const giverName = (() => {
          const u = viewUser as unknown as Record<string, unknown> | null;
          const full = String((u?.fullName as string) ?? ([u?.firstName, u?.lastName].filter(Boolean).join(' ').trim()) ?? (u?.name as string) ?? '').trim();
          return full || String((u?.username as string) ?? (u?.email as string) ?? '—');
        })();
        const chainEntries = (ycscSupplyChainQ.data?.data ?? []) as unknown as { warehouseIssue?: { id: string; maPhieu: string } | null }[];
        const chainWarehouseIssues = chainEntries.map((e) => e.warehouseIssue).filter(Boolean) as { id: string; maPhieu: string }[];
        const primaryWi = chainWarehouseIssues[0] ?? null;
        // Confirmer is resolved server-side: creator of the source YCKT, else creator of this YCSC
        const sourceYcktCode = String((record as unknown as { inspectionRequest?: { maYeuCau?: string } | null })?.inspectionRequest?.maYeuCau ?? '').trim();
        const confirmerName = String(
          (record as unknown as { inspectionRequest?: { createdByName?: string } | null })?.inspectionRequest?.createdByName
          ?? (record as unknown as { createdByName?: string })?.createdByName ?? '',
        ).trim();
        const handoverItemRows = ycscHandoverItems.filter((it) => it.repairRequestItemId);
        const allSauFilled = handoverItemRows.length > 0 && handoverItemRows.every((it) => it.tinhTrangSauSuaChua.trim().length > 0);
        const canSubmitHandover = allSauFilled && !ycscHandoverSubmitting;
        const patchYcscItem = (rowId: string, patch: Partial<YcscHandoverDraft>) => {
          setYcscHandoverItems((prev) => prev.map((it) => it.rowId === rowId ? { ...it, ...patch } : it));
        };
        const selectYcscItem = (rowId: string, repairRequestItemId: string) => {
          const ri = rItems.find((x) => x.id === repairRequestItemId);
          patchYcscItem(rowId, {
            repairRequestItemId,
            tinhTrangTruocSuaChua: ri ? `${ri.tinhTrangThietBi} - ${ri.noiDungLoi}` : '',
          });
        };
        const addYcscItem = () => {
          const unused = rItems.find((x) => !ycscHandoverItems.some((d) => d.repairRequestItemId === x.id));
          if (unused) setYcscHandoverItems((prev) => [...prev, emptyYcscHandoverItem(unused)]);
          else if (rItems[0]) setYcscHandoverItems((prev) => [...prev, emptyYcscHandoverItem(rItems[0])]);
        };
        const handleYcscSubmit = async () => {
          setYcscHandoverError('');
          const itemRows = ycscHandoverItems
            .map((it) => ({
              repairRequestItemId: it.repairRequestItemId,
              tinhTrangTruocSuaChua: it.tinhTrangTruocSuaChua.trim(),
              tinhTrangSauSuaChua: it.tinhTrangSauSuaChua.trim(),
              ghiChu: it.ghiChu?.trim() || undefined,
            }))
            .filter((it) => it.repairRequestItemId && it.tinhTrangTruocSuaChua && it.tinhTrangSauSuaChua);
          if (rItems.length > 0 && itemRows.length === 0) {
            setYcscHandoverError('Vui lòng nhập tình trạng sau sửa chữa cho ít nhất một hạng mục');
            return;
          }
          for (const it of ycscHandoverItems) {
            if (it.repairRequestItemId && !it.tinhTrangSauSuaChua.trim()) {
              setYcscHandoverError('Mỗi hạng mục phải có tình trạng sau sửa chữa');
              return;
            }
          }
          const rid = (record as unknown as { id: number | string }).id;
          const deviceNames = rItems.length ? rItems.map((x) => x.tenHeThong).join('; ') : String((record as unknown as { tenHeThong?: string })?.tenHeThong ?? '');
          const beforeSummary = rItems.length ? rItems.map((x) => `${x.tenHeThong}: ${x.tinhTrangThietBi} - ${x.noiDungLoi}`).join('; ') : (keHoachVal || '');
          const tinhTrangSauAll = itemRows.length
            ? itemRows.map((it) => {
                const ri = rItems.find((x) => x.id === it.repairRequestItemId);
                return `${ri ? ri.tenHeThong : 'Thiết bị'}: ${it.tinhTrangSauSuaChua}`;
              }).join('; ')
            : itemRows[0]?.tinhTrangSauSuaChua ?? '';
          const warehouseIssueIdForPayload = primaryWi?.id ?? undefined;
          setYcscHandoverSubmitting(true);
          try {
            await acceptanceHandoverService.createAcceptanceHandover({
              repairRequestId: Number(rid),
              maYeuCauSuaChua: String((record as unknown as { maYeuCau?: string })?.maYeuCau ?? ''),
              tenHeThongThietBi: deviceNames,
              tinhTrangTruocSuaChua: beforeSummary || deviceNames,
              tinhTrangSauSuaChua: tinhTrangSauAll || 'Đã sửa chữa',
              nguoiBanGiao: giverName,
              nguoiNhan: ycscHandoverNguoiNhan.trim(),
              nguoiNhanId: ycscHandoverNguoiNhanId.trim() || undefined,
              ghiChu: ycscHandoverGhiChu.trim() || undefined,
              items: itemRows,
              ...(warehouseIssueIdForPayload ? { warehouseIssueId: warehouseIssueIdForPayload } : {}),
            } as unknown as Parameters<typeof acceptanceHandoverService.createAcceptanceHandover>[0], ycscHandoverFile ?? undefined);
            await repairRequestService.submitAcceptance(rid as never);
            toast.success('Đã đề nghị nghiệm thu');
            setYcscSubmitOpen(false);
            queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
            queryClient.invalidateQueries({ queryKey: ['acceptanceHandovers'] });
            onSaved?.();
            onClose();
          } catch (e) {
            setYcscHandoverError(e instanceof Error ? e.message : 'Không đề nghị được');
          } finally {
            setYcscHandoverSubmitting(false);
          }
        };
        return (
        <Modal isOpen onClose={()=>setYcscSubmitOpen(false)} showBackdrop>
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
              <h4 className="font-semibold text-sm">Đề nghị nghiệm thu — {(record as unknown as { maYeuCau?: string })?.maYeuCau}</h4>
              <button onClick={()=>setYcscSubmitOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
              {ycscHandoverError && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-700">{ycscHandoverError}</div>}
              {/* Read-only block: Nội dung lỗi + Kế hoạch */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2 space-y-3">
                <h5 className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Đối chiếu — Nội dung lỗi &amp; Kế hoạch</h5>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500">Thiết bị lỗi ({rItems.length})</p>
                  {rItems.length === 0 ? <p className="text-xs text-gray-400">—</p> : (
                    <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white">
                      {rItems.map((it) => (
                        <li key={it.id} className="px-2.5 py-2">
                          <p className="font-medium text-gray-800 text-sm">{it.tenHeThong}</p>
                          <p className="text-xs text-gray-600"><span className="text-gray-400">Tình trạng:</span> {it.tinhTrangThietBi} <span className="text-gray-300">·</span> {it.noiDungLoi}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="grid gap-2 text-xs leading-relaxed">
                  <div><span className="font-medium text-gray-500">Kế hoạch chi tiết:</span> <span className="text-gray-800 whitespace-pre-wrap">{keHoachVal || '—'}</span></div>
                  <div><span className="font-medium text-gray-500">Phương án:</span> <span className="text-gray-800 whitespace-pre-wrap">{phuongAnVal || '—'}</span></div>
                  <div><span className="font-medium text-gray-500">Biện pháp an toàn:</span> <span className="text-gray-800 whitespace-pre-wrap">{bienPhapVal || '—'}</span></div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span><span className="font-medium text-gray-500">Ngày BĐKH:</span> {fmtD(ngayBD)}</span>
                    <span><span className="font-medium text-gray-500">Ngày HTDK:</span> {fmtD(ngayKT)}</span>
                    <span><span className="font-medium text-gray-500">Cần ngừng máy:</span> {canNgung ? 'Có' : 'Không'}</span>
                  </div>
                </div>
                {primaryWi ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">Phiếu xuất:</span>
                    {chainWarehouseIssues.map((wi) => (
                      <span key={wi.id} className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        Đã có phiếu xuất {wi.maPhieu} [Xem]
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">Chưa có phiếu xuất kho liên kết.</p>
                )}
              </div>

              {/* Handover items table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-800">Hạng mục nghiệm thu ({handoverItemRows.length}/{rItems.length})</span>
                  <button type="button" onClick={addYcscItem} disabled={rItems.length === 0} className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40">
                    <Plus className="h-3.5 w-3.5" /> Thêm hạng mục
                  </button>
                </div>
                {ycscHandoverItems.length === 0 ? (
                  <p className="rounded border border-dashed border-gray-300 bg-gray-50 px-3 py-4 text-center text-xs text-gray-500">Chưa có hạng mục. Bấm Thêm hạng mục.</p>
                ) : (
                  <div className="space-y-3">
                    {ycscHandoverItems.map((draft, idx) => {
                      const ri = rItems.find((x) => x.id === draft.repairRequestItemId);
                      return (
                      <div key={draft.rowId} className="rounded-lg border border-gray-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">{idx + 1}</span>
                            <select value={draft.repairRequestItemId} onChange={(e) => selectYcscItem(draft.rowId, e.target.value)} className="min-w-0 flex-1 truncate rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm">
                              <option value="">Chọn thiết bị lỗi</option>
                              {rItems.map((opt) => <option key={opt.id} value={opt.id}>{opt.tenHeThong}</option>)}
                            </select>
                          </div>
                          {ycscHandoverItems.length > 1 && (
                            <button type="button" onClick={() => setYcscHandoverItems((prev) => prev.filter((x) => x.rowId !== draft.rowId))} className="shrink-0 rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                          )}
                        </div>
                        <div className="grid gap-3 p-3 md:grid-cols-2">
                          <label className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Trước sửa chữa</span>
                            <textarea rows={3} value={draft.tinhTrangTruocSuaChua} readOnly className="w-full rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-sm text-gray-600" placeholder={ri ? `${ri.tinhTrangThietBi} - ${ri.noiDungLoi}` : '—'} />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">Sau sửa chữa <span className="text-red-500">*</span></span>
                            <textarea rows={3} value={draft.tinhTrangSauSuaChua} onChange={(e) => patchYcscItem(draft.rowId, { tinhTrangSauSuaChua: e.target.value })} placeholder="Mô tả kết quả sau sửa chữa" className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                          </label>
                          <label className="space-y-1 md:col-span-2">
                            <span className="text-xs font-medium text-gray-600">Ghi chú hạng mục</span>
                            <input value={draft.ghiChu ?? ''} onChange={(e) => patchYcscItem(draft.rowId, { ghiChu: e.target.value })} placeholder="Tùy chọn" className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm" />
                          </label>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Người bàn giao / Người nhận / File / Ghi chú chung */}
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="font-medium text-gray-700">Người bàn giao</span>
                  <input value={giverName} disabled className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2" />
                </label>
                <label className="space-y-1">
                  <span className="font-medium text-gray-700">Người xác nhận nghiệm thu</span>
                  <input value={confirmerName || '—'} disabled className="w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2" />
                  <span className="block text-xs text-gray-500">{sourceYcktCode ? `Người tạo yêu cầu kiểm tra ${sourceYcktCode}` : 'Người tạo yêu cầu sửa chữa'} sẽ xác nhận ĐẠT / KHÔNG ĐẠT</span>
                </label>
              </div>
              <label className="block space-y-1">
                <span className="font-medium text-gray-700">Ghi chú chung</span>
                <textarea rows={2} value={ycscHandoverGhiChu} onChange={(e) => setYcscHandoverGhiChu(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Ghi chú chung (tùy chọn)" />
              </label>
              <FileUpload label="File đính kèm" files={ycscHandoverFile ? [ycscHandoverFile] : []} onChange={(files) => setYcscHandoverFile(files[0] ?? null)} accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar" compact />
            </div>
            <div className="flex justify-end gap-2 border-t px-4 py-3 shrink-0">
              <button onClick={()=>setYcscSubmitOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Hủy</button>
              <button onClick={handleYcscSubmit} disabled={!canSubmitHandover} className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">{ycscHandoverSubmitting ? 'Đang gửi...' : 'Gửi'}</button>
            </div>
          </div>
        </Modal>
        );
      })()}
      {ycscConfirmOpen && (
        <Modal isOpen onClose={()=>setYcscConfirmOpen(false)} showBackdrop>
          <div className="bg-white rounded-lg w-full max-w-md p-4 space-y-3" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center justify-between"><h4 className="font-semibold text-sm">Xác nhận nghiệm thu — {(record as unknown as { maYeuCau?: string })?.maYeuCau}</h4><button onClick={()=>setYcscConfirmOpen(false)}><X className="h-4 w-4" /></button></div>
            <div className="space-y-3 text-sm">
              {viewPendingSlip && (
                <div className="rounded border border-gray-200 bg-gray-50 p-3 space-y-1.5">
                  <p><span className="text-xs font-medium text-gray-500">Phiếu nghiệm thu:</span> {viewPendingSlip.maNghiemThu} — {viewPendingSlip.nguoiBanGiao || '—'}</p>
                  <p className="whitespace-pre-wrap"><span className="text-xs font-medium text-gray-500">Sau sửa chữa:</span> {viewPendingSlip.tinhTrangSauSuaChua || '—'}</p>
                  {viewPendingSlip.fileDinhKem && <a href={getFileUrl(viewPendingSlip.fileDinhKem)} target="_blank" rel="noreferrer" className="inline-flex text-xs font-medium text-blue-700 hover:underline">Xem tệp nghiệm thu</a>}
                </div>
              )}
              <label className="block space-y-1"><span className="font-medium text-gray-700">Kết quả <span className="text-red-500">*</span></span><select value={ycscConfirmForm.ketQua} onChange={e=>setYcscConfirmForm(f=>({...f, ketQua:e.target.value as never}))} className="w-full rounded border px-2 py-1.5"><option value="">-- Chọn --</option><option value="DAT">ĐẠT</option><option value="KHONG_DAT">KHÔNG ĐẠT</option></select></label>
              <label className="block space-y-1"><span className="font-medium text-gray-700">Lý do {ycscConfirmForm.ketQua === 'KHONG_DAT' ? <span className="text-red-500">*</span> : <span className="text-gray-400">(tuỳ chọn)</span>}</span><textarea rows={3} value={ycscConfirmForm.lyDo} onChange={e=>setYcscConfirmForm(f=>({...f, lyDo:e.target.value}))} className="w-full rounded border px-2 py-1.5" /></label>
            </div>
            <div className="flex justify-end gap-2"><button onClick={()=>setYcscConfirmOpen(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-50">Hủy</button><button onClick={async()=>{ const rid=(record as unknown as {id:number|string}).id; if(!ycscConfirmForm.ketQua){ toast.error('Vui lòng chọn kết quả'); return; } if(ycscConfirmForm.ketQua==='KHONG_DAT' && !ycscConfirmForm.lyDo.trim()){ toast.error('Vui lòng nhập lý do không đạt'); return; } try{ await confirmRepairMut.mutateAsync({ id: rid, payload: { ketQua: ycscConfirmForm.ketQua as 'DAT' | 'KHONG_DAT', lyDo: ycscConfirmForm.lyDo.trim() || undefined } }); toast.success(ycscConfirmForm.ketQua==='DAT'?'Đã xác nhận nghiệm thu ĐẠT':'Đã xác nhận KHÔNG ĐẠT — chuyển lại kỹ thuật'); setYcscConfirmOpen(false); onSaved?.(); onClose(); }catch(e){ toast.error(e instanceof Error?e.message:'Lỗi nghiệm thu'); } }} className={`rounded px-4 py-2 text-sm font-medium text-white ${ycscConfirmForm.ketQua==='KHONG_DAT'?'bg-red-600 hover:bg-red-700':'bg-green-600 hover:bg-green-700'}`}>Xác nhận</button></div>
          </div>
        </Modal>
      )}
    </ModalForm>
      {viewCreateRepairOpen && viewCreateRepairInitial && (
        <RepairRequestFormModal
          isOpen={viewCreateRepairOpen}
          onClose={()=>{ setViewCreateRepairOpen(false); }}
          mode="create"
          lockedRequestType="SUA_CHUA"
          initialData={viewCreateRepairInitial as unknown as never}
          onSaved={(info?: RepairRequestSavedInfo)=>{
            setViewCreateRepairOpen(false);
            queryClient.invalidateQueries({ queryKey: repairRequestKeys.all });
            queryClient.invalidateQueries({ queryKey: inspectionKeys.all });
            onClose();
            // Open the new YCSC on the Repairs tab (drops inspectionId so the tabs don't bounce)
            if (info?.id != null) setSearchParams(buildTechnicalDetailParams(searchParams, 'repair', info.id));
          }}
        />
      )}
      {confirmOpen && (
        <Modal isOpen onClose={() => setConfirmOpen(false)} showBackdrop>
          <div className="bg-white rounded-lg w-full max-w-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto text-sm" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-semibold text-base text-gray-900">Xác nhận tạo phiếu {lockedRequestType === 'KIEM_TRA' ? 'kiểm tra' : 'sửa chữa'}</h4>
            <p className="text-xs text-gray-500">Vui lòng kiểm tra lại thông tin trước khi tạo. Bấm Quay lại để sửa, hoặc Xác nhận tạo để gửi.</p>
            <div className="grid gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span><span className="text-xs font-medium text-gray-500">Mã:</span> <span className="font-mono font-medium text-gray-800">{form.maYeuCau || '—'}</span></span>
                <span><span className="text-xs font-medium text-gray-500">Ngày:</span> <span className="font-medium text-gray-800">{form.ngayThang || '—'}</span></span>
                <span><span className="text-xs font-medium text-gray-500">Ưu tiên:</span> <StatusBadge label={form.mucDoUuTien || '—'} tone={PRIORITY_TONE[form.mucDoUuTien] ?? 'gray'} /></span>
              </div>
              {form.ghiChu?.trim() && <p className="text-sm text-gray-700"><span className="text-xs font-medium text-gray-500">Ghi chú:</span> {form.ghiChu.trim()}</p>}
            </div>

            <div className="rounded-md border border-gray-200">
              <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5 font-medium text-gray-800">Thiết bị lỗi ({previewItems.length})</div>
              {previewItems.length === 0 ? <p className="px-2.5 py-2 text-xs text-gray-400">Chưa có thiết bị hợp lệ.</p> : (
                <ul className="divide-y divide-gray-100">
                  {previewItems.map((it, i) => (
                    <li key={i} className="px-3 py-2 text-sm">
                      <span className="font-medium text-gray-800">#{i + 1} {it.tenHeThong}</span>
                      <span className="text-gray-500"> — {it.tinhTrangThietBi} · {it.loaiLoi}</span>
                      <p className="mt-0.5 text-xs text-gray-600">{it.noiDungLoi}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {lockedRequestType === 'KIEM_TRA' ? null : (
              <>
                {(previewPlanEntries.length > 0 || plan.canNgungMay) && (
                  <div className="rounded-md border border-gray-200">
                    <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5 font-medium text-gray-800">Kế hoạch</div>
                    <ul className="px-3 py-2 space-y-1 text-sm text-gray-700">
                      {previewPlanEntries.map((line, i) => <li key={i} className="text-xs leading-relaxed">{line}</li>)}
                      {previewPlanEntries.length === 0 && <li className="text-xs text-gray-400">Chỉ có: Cần ngừng máy</li>}
                    </ul>
                  </div>
                )}
                <div className="rounded-md border border-gray-200">
                  <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5 font-medium text-gray-800">Người phụ trách ({previewAssignees.length})</div>
                  {previewAssignees.length === 0 ? <p className="px-2.5 py-2 text-xs text-gray-400">Chưa chọn người phụ trách.</p> : (
                    <ul className="divide-y divide-gray-100">
                      {previewAssignees.map((a, i) => (
                        <li key={i} className="flex items-center justify-between px-3 py-1.5 text-sm">
                          <span className="font-medium text-gray-800">{a.userName || a.userId || '—'}</span>
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${a.isLead ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600'}`}>{a.isLead ? 'CHÍNH' : 'PHỤ'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="rounded-md border border-gray-200">
                  <div className="border-b border-gray-200 bg-gray-50 px-3 py-1.5 font-medium text-gray-800">Hàng hóa / YCCC ({previewMaterials.length})</div>
                  {previewMaterials.length === 0 ? <p className="px-2.5 py-2 text-xs text-gray-400">Chưa có hàng hóa.</p> : (
                    <ul className="divide-y divide-gray-100">
                      {previewMaterials.map((m, i) => (
                        <li key={i} className="px-3 py-1.5 text-sm flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          <span className="font-medium text-gray-800">{m.tenVatTu}</span>
                          <span className="text-xs text-gray-500">{m.soLuongDuKien} {m.donVi}</span>
                          {m.phanLoai && <span className="text-xs text-gray-400">({m.phanLoai})</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={(e) => { e.stopPropagation(); setConfirmOpen(false); }} className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 min-h-[40px]">Quay lại sửa</button>
              <button type="button" onClick={(e) => { e.stopPropagation(); handleConfirmCreate(); }} disabled={isSaving} className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 min-h-[40px]">{isSaving ? 'Đang tạo...' : 'Xác nhận tạo'}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default RepairRequestFormModal;
