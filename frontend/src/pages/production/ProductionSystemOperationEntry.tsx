import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Loader2,
  Save,
  AlertTriangle,
  ArrowLeft,
  User,
  CalendarClock,
  ChevronRight,
  Gauge,
  Package,
} from 'lucide-react';
import {
  markTab,
  isKioskTab,
  hasKioskSession,
  KIOSK_EXPIRED_EVENT,
  getSelection,
  setSelection,
  clearSelection,
  getDeviceKey,
  setDeviceKey,
} from '../../utils/kioskSession';
import useVirtualKeyboard from '../../hooks/useVirtualKeyboard';
import { parseNumberInput, PRODUCTION_LIMITS } from '../../utils/numberInput';
import {
  useFryBatchCodes,
  filterBatchesByShiftAndDate,
  useSystemOperationsByMaChien,
  useUpdateSystemOperationEntry,
} from '../../hooks/useProductionDataEntry';
import type { SystemOperation } from '../../services/systemOperationService';
import { useAttendedOperatorsByShift } from '../../hooks/useAttendedOperators';
import { useAuth } from '../../contexts/AuthContext';
import { isAdmin } from '../../utils/permissions';
import faceAttendanceService from '../../services/faceAttendanceService';
import OperatorSelectionScreen from '../../components/production/OperatorSelectionScreen';
import ShiftSelectionScreen from '../../components/production/ShiftSelectionScreen';
import KioskFooter from '../../components/production/KioskFooter';
import FieldFocusEditor from '../../components/production/FieldFocusEditor';

// ─── Types ───────────────────────────────────────────────────────────────────

type WizardStep = 'batch' | 'machine' | 'form';

interface FormData {
  giaiDoan1ThoiGian: number;
  giaiDoan1NhietDo: number;
  giaiDoan1ApSuat: number;
  giaiDoan2ThoiGian: number;
  giaiDoan2NhietDo: number;
  giaiDoan2ApSuat: number;
  giaiDoan3ThoiGian: number;
  giaiDoan3NhietDo: number;
  giaiDoan3ApSuat: number;
  giaiDoan4ThoiGian: number;
  giaiDoan4NhietDo: number;
  giaiDoan4ApSuat: number;
  khoiLuongDauVao: number;
  tongThoiGianSay: number;
}

const emptyForm: FormData = {
  giaiDoan1ThoiGian: 0,
  giaiDoan1NhietDo: 0,
  giaiDoan1ApSuat: 0,
  giaiDoan2ThoiGian: 0,
  giaiDoan2NhietDo: 0,
  giaiDoan2ApSuat: 0,
  giaiDoan3ThoiGian: 0,
  giaiDoan3NhietDo: 0,
  giaiDoan3ApSuat: 0,
  giaiDoan4ThoiGian: 0,
  giaiDoan4NhietDo: 0,
  giaiDoan4ApSuat: 0,
  khoiLuongDauVao: 0,
  tongThoiGianSay: 0,
};

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateVN(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Extract "Máy 01" from "HT-CCK-01"
function getMachineLabel(maHeThong: string): string {
  const match = maHeThong.match(/(\d+)$/);
  return match ? `Máy ${match[1]}` : maHeThong;
}

type MachineStatus = 'HOAT_DONG' | 'BAO_TRI' | 'NGUNG_HOAT_DONG';

// A machine is editable only while it is running; maintenance/stopped rows are view-only.
function isMachineEditable(status?: MachineStatus): boolean {
  return status === 'HOAT_DONG' || status === undefined;
}

// Vietnamese status label + badge classes for the machine card.
function getStatusBadge(status?: MachineStatus): { label: string; className: string } | null {
  if (status === 'BAO_TRI') {
    return { label: 'Bảo trì', className: 'bg-amber-100 text-amber-700' };
  }
  if (status === 'NGUNG_HOAT_DONG') {
    return { label: 'Ngưng', className: 'bg-red-100 text-red-700' };
  }
  return null; // HOAT_DONG (or unknown): no badge
}

// A seeded operation row counts as "entered" once a worker has stamped it.
function isOperationEntered(op: SystemOperation): boolean {
  return (op.nguoiThucHien?.trim() ?? '') !== '' || (op.tongThoiGianSay ?? 0) > 0;
}

// ─── Draft persistence helpers ──────────────────────────────────────────────

function getDraftKey(productionDate: string, shift: number, maChien: string, machineSystemId: string): string {
  return `sysop-draft|${productionDate}|${shift}|${maChien}|${machineSystemId}`;
}

function saveDraft(key: string, data: FormData): void {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota exceeded — ignore */ }
}

function loadDraft(key: string): FormData | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as FormData;
  } catch { return null; }
}

function clearDraft(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

// ─── Session guard screens ───────────────────────────────────────────────────

const NotActivatedScreen: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div className="bg-white rounded-lg shadow-sm border p-8 max-w-md w-full text-center">
      <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Phiên chưa được kích hoạt</h2>
      <p className="text-gray-600">Nhờ admin mở lại trang này từ hệ thống ERP.</p>
    </div>
  </div>
);

const ExpiredScreen: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div className="bg-white rounded-lg shadow-sm border p-8 max-w-md w-full text-center">
      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Phiên hết hạn</h2>
      <p className="text-gray-600">Nhờ admin mở lại trang này từ hệ thống ERP.</p>
    </div>
  </div>
);

// ─── Numeric input ───────────────────────────────────────────────────────────

interface NumericFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  integer?: boolean;
  min?: number;
  max?: number;
  /** When true, the field is display-only (e.g. auto-computed total). */
  readOnly?: boolean;
  /** Called when field is tapped — used to open FieldFocusEditor */
  onTap?: () => void;
}

const NumericField: React.FC<NumericFieldProps> = ({ label, value, onChange, unit, integer, readOnly, onTap, min = 0, max }) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-700 mb-1">
      {label}
      {unit ? <span className="text-gray-400 font-normal"> ({unit})</span> : null}
    </span>
    <input
      type="number"
      inputMode={integer ? 'numeric' : 'decimal'}
      min={min}
      max={max}
      readOnly={readOnly}
      className={`w-full min-h-[52px] px-4 py-2 border border-gray-200 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        readOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''
      }`}
      value={value === 0 ? '' : value}
      placeholder="0"
      onFocus={!readOnly && onTap ? (e) => { e.target.blur(); onTap(); } : undefined}
      onClick={!readOnly && onTap ? () => onTap() : undefined}
      onChange={readOnly ? undefined : (e) => onChange(parseNumberInput(e.target.value, { min, max, integer }))}
    />
  </label>
);

// ─── Field Focus Editor: field order + suggestions ──────────────────────────

interface FieldConfig {
  key: keyof FormData;
  label: string;
  unit?: string;
  integer?: boolean;
  suggestions?: number[];
  min?: number;
  max?: number;
}

const SYSTEM_OP_FIELDS: FieldConfig[] = [
  { key: 'khoiLuongDauVao', label: 'Khối lượng đầu vào', unit: 'kg', suggestions: [300, 350, 400], min: 0, max: PRODUCTION_LIMITS.khoiLuongDauVao.max },
  { key: 'giaiDoan1ThoiGian', label: 'GĐ1 - Thời gian', unit: 'phút', integer: true, suggestions: [30, 60, 90, 120], min: 0, max: PRODUCTION_LIMITS.giaiDoan1ThoiGian.max },
  { key: 'giaiDoan1NhietDo', label: 'GĐ1 - Nhiệt độ', unit: '°C', suggestions: [60, 70, 80, 90], min: 0, max: PRODUCTION_LIMITS.giaiDoan1NhietDo.max },
  { key: 'giaiDoan1ApSuat', label: 'GĐ1 - Áp suất', unit: 'bar', suggestions: [0.5, 0.8, 1.0], min: 0, max: PRODUCTION_LIMITS.giaiDoan1ApSuat.max },
  { key: 'giaiDoan2ThoiGian', label: 'GĐ2 - Thời gian', unit: 'phút', integer: true, suggestions: [30, 60, 90, 120], min: 0, max: PRODUCTION_LIMITS.giaiDoan2ThoiGian.max },
  { key: 'giaiDoan2NhietDo', label: 'GĐ2 - Nhiệt độ', unit: '°C', suggestions: [60, 70, 80, 90], min: 0, max: PRODUCTION_LIMITS.giaiDoan2NhietDo.max },
  { key: 'giaiDoan2ApSuat', label: 'GĐ2 - Áp suất', unit: 'bar', suggestions: [0.5, 0.8, 1.0], min: 0, max: PRODUCTION_LIMITS.giaiDoan2ApSuat.max },
  { key: 'giaiDoan3ThoiGian', label: 'GĐ3 - Thời gian', unit: 'phút', integer: true, suggestions: [30, 60, 90, 120], min: 0, max: PRODUCTION_LIMITS.giaiDoan3ThoiGian.max },
  { key: 'giaiDoan3NhietDo', label: 'GĐ3 - Nhiệt độ', unit: '°C', suggestions: [60, 70, 80, 90], min: 0, max: PRODUCTION_LIMITS.giaiDoan3NhietDo.max },
  { key: 'giaiDoan3ApSuat', label: 'GĐ3 - Áp suất', unit: 'bar', suggestions: [0.5, 0.8, 1.0], min: 0, max: PRODUCTION_LIMITS.giaiDoan3ApSuat.max },
  { key: 'giaiDoan4ThoiGian', label: 'GĐ4 - Thời gian', unit: 'phút', integer: true, suggestions: [30, 60, 90, 120], min: 0, max: PRODUCTION_LIMITS.giaiDoan4ThoiGian.max },
  { key: 'giaiDoan4NhietDo', label: 'GĐ4 - Nhiệt độ', unit: '°C', suggestions: [60, 70, 80, 90], min: 0, max: PRODUCTION_LIMITS.giaiDoan4NhietDo.max },
  { key: 'giaiDoan4ApSuat', label: 'GĐ4 - Áp suất', unit: 'bar', suggestions: [0.5, 0.8, 1.0], min: 0, max: PRODUCTION_LIMITS.giaiDoan4ApSuat.max },
  // tongThoiGianSay is readOnly — excluded
];

// ─── Main component ──────────────────────────────────────────────────────────

const ProductionSystemOperationEntry: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [kioskExpired, setKioskExpired] = useState(false);
  const { keyboardOpen } = useVirtualKeyboard();
  const [selectedShift, setSelectedShift] = useState<number>(() => getSelection()?.shift ?? 0);
  const [nguoiThucHien, setNguoiThucHien] = useState<string>(() => getSelection()?.operator ?? '');
  const [operatorId, setOperatorId] = useState<string>(() => getSelection()?.operatorId ?? '');
  const [productionDate, setProductionDate] = useState<string>(() => {
    const stored = getSelection()?.date;
    return stored && stored.length > 0 ? stored : todayStr();
  });

  const [step, setStep] = useState<WizardStep>('batch');
  const [selectedMaChien, setSelectedMaChien] = useState<string>('');
  const [selectedMachineSystemId, setSelectedMachineSystemId] = useState<string>('');
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deviceKeyInput, setDeviceKeyInput] = useState('');

  // Admin self-registration state
  const { user } = useAuth();
  const userIsAdmin = user ? isAdmin(user.department) : false;
  const [deviceName, setDeviceName] = useState('');
  const [registering, setRegistering] = useState(false);

  // FieldFocusEditor state
  const [activeEditorField, setActiveEditorField] = useState<keyof FormData | null>(null);

  // Attended operators for the shift
  const {
    data: attendedOperators,
    isLoading: isLoadingAttended,
  } = useAttendedOperatorsByShift(productionDate, selectedShift, 'SYSTEM_OPERATION');

  // Mark tab as kiosk on mount + capture device key from URL
  useEffect(() => {
    markTab();
    const paramKey = searchParams.get('deviceKey');
    if (paramKey && !getDeviceKey()) {
      setDeviceKey(paramKey);
    }
  }, [searchParams]);

  // Listen for kiosk-expired events
  useEffect(() => {
    const handler = () => setKioskExpired(true);
    window.addEventListener(KIOSK_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(KIOSK_EXPIRED_EVENT, handler);
  }, []);

  // Persist selection to sessionStorage
  useEffect(() => {
    if (!selectedShift) return;
    setSelection({
      shift: selectedShift,
      operator: nguoiThucHien,
      operatorId,
      date: productionDate,
      activeTab: '',
    });
  }, [selectedShift, nguoiThucHien, operatorId, productionDate]);

  // Auto-recompute total drying time from stage times
  useEffect(() => {
    const total =
      Number(form.giaiDoan1ThoiGian || 0) +
      Number(form.giaiDoan2ThoiGian || 0) +
      Number(form.giaiDoan3ThoiGian || 0) +
      Number(form.giaiDoan4ThoiGian || 0);
    if (total !== form.tongThoiGianSay) {
      setForm((prev) => ({ ...prev, tongThoiGianSay: total }));
    }
  }, [
    form.giaiDoan1ThoiGian,
    form.giaiDoan2ThoiGian,
    form.giaiDoan3ThoiGian,
    form.giaiDoan4ThoiGian,
    form.tongThoiGianSay,
  ]);

  // ─── Draft auto-save & load ───────────────────────────────────────────────
  const [usingDraft, setUsingDraft] = useState(false);

  // Auto-save draft when form is dirty (debounced via form change)
  useEffect(() => {
    if (step !== 'form' || !selectedMaChien || !selectedMachineSystemId) return;
    const hasAnyValue =
      form.giaiDoan1ThoiGian > 0 || form.giaiDoan1NhietDo > 0 || form.giaiDoan1ApSuat > 0 ||
      form.giaiDoan2ThoiGian > 0 || form.giaiDoan2NhietDo > 0 || form.giaiDoan2ApSuat > 0 ||
      form.giaiDoan3ThoiGian > 0 || form.giaiDoan3NhietDo > 0 || form.giaiDoan3ApSuat > 0 ||
      form.giaiDoan4ThoiGian > 0 || form.giaiDoan4NhietDo > 0 || form.giaiDoan4ApSuat > 0 ||
      form.khoiLuongDauVao > 0;
    if (hasAnyValue) {
      const key = getDraftKey(productionDate, selectedShift, selectedMaChien, selectedMachineSystemId);
      saveDraft(key, form);
    }
  }, [step, form, productionDate, selectedShift, selectedMaChien, selectedMachineSystemId]);

  // Load draft when entering form step (if available and newer than DB data)
  useEffect(() => {
    if (step !== 'form' || !selectedMaChien || !selectedMachineSystemId) return;
    const key = getDraftKey(productionDate, selectedShift, selectedMaChien, selectedMachineSystemId);
    const draft = loadDraft(key);
    if (draft) {
      // Draft exists — check if it has meaningful data
      const draftHasValue =
        draft.giaiDoan1ThoiGian > 0 || draft.giaiDoan1NhietDo > 0 || draft.giaiDoan1ApSuat > 0 ||
        draft.giaiDoan2ThoiGian > 0 || draft.giaiDoan2NhietDo > 0 || draft.giaiDoan2ApSuat > 0 ||
        draft.giaiDoan3ThoiGian > 0 || draft.giaiDoan3NhietDo > 0 || draft.giaiDoan3ApSuat > 0 ||
        draft.giaiDoan4ThoiGian > 0 || draft.giaiDoan4NhietDo > 0 || draft.giaiDoan4ApSuat > 0 ||
        draft.khoiLuongDauVao > 0;
      if (draftHasValue) {
        setForm(draft);
        setUsingDraft(true);
        return;
      }
    }
    setUsingDraft(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selectedMaChien, selectedMachineSystemId]);

  // Data hooks
  const {
    data: allBatches,
    isLoading: batchesLoading,
    isError: batchesError,
    refetch: refetchBatches,
  } = useFryBatchCodes(
    productionDate,
    selectedShift,
  );
  // Machines come from the rows seeded for THIS batch (not the current active list),
  // so a machine that stopped mid-shift keeps its row and a reactivated machine never
  // shows up without one.
  const { data: batchOperations, isLoading: machinesLoading } = useSystemOperationsByMaChien(selectedMaChien);
  const machineRows = useMemo(() => batchOperations ?? [], [batchOperations]);

  const filteredBatches = useMemo(
    () => filterBatchesByShiftAndDate(allBatches, selectedShift, productionDate),
    [allBatches, selectedShift, productionDate],
  );

  // The row for the chosen machine is already in machineRows — deriving it avoids a
  // second request to the same endpoint that useSystemOperationsByMaChien just made.
  const existingOperation = useMemo(
    () =>
      selectedMachineSystemId
        ? machineRows.find((op) => op.machineSystemId === selectedMachineSystemId) ?? null
        : null,
    [machineRows, selectedMachineSystemId],
  );
  const existingLoading = machinesLoading;

  // When the existing operation loads, hydrate the form with its values — unless a
  // draft is already in the form. The draft is what the worker typed and has not
  // saved; letting a later-arriving DB response overwrite it lost their input while
  // the "đang dùng nháp" banner still claimed the draft was in use.
  useEffect(() => {
    if (!existingOperation) return;
    if (usingDraft) return;
    setForm({
      giaiDoan1ThoiGian: existingOperation.giaiDoan1?.thoiGian ?? 0,
      giaiDoan1NhietDo: existingOperation.giaiDoan1?.nhietDo ?? 0,
      giaiDoan1ApSuat: existingOperation.giaiDoan1?.apSuat ?? 0,
      giaiDoan2ThoiGian: existingOperation.giaiDoan2?.thoiGian ?? 0,
      giaiDoan2NhietDo: existingOperation.giaiDoan2?.nhietDo ?? 0,
      giaiDoan2ApSuat: existingOperation.giaiDoan2?.apSuat ?? 0,
      giaiDoan3ThoiGian: existingOperation.giaiDoan3?.thoiGian ?? 0,
      giaiDoan3NhietDo: existingOperation.giaiDoan3?.nhietDo ?? 0,
      giaiDoan3ApSuat: existingOperation.giaiDoan3?.apSuat ?? 0,
      giaiDoan4ThoiGian: existingOperation.giaiDoan4?.thoiGian ?? 0,
      giaiDoan4NhietDo: existingOperation.giaiDoan4?.nhietDo ?? 0,
      giaiDoan4ApSuat: existingOperation.giaiDoan4?.apSuat ?? 0,
      khoiLuongDauVao: existingOperation.khoiLuongDauVao ?? 0,
      tongThoiGianSay: existingOperation.tongThoiGianSay ?? 0,
    });
  }, [existingOperation, usingDraft]);

  const updateSysOp = useUpdateSystemOperationEntry();

  const setField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSelectBatch = useCallback((maChien: string) => {
    setSelectedMaChien(maChien);
    setSelectedMachineSystemId('');
    setForm(emptyForm);
    setStep('machine');
  }, []);

  const handleSelectMachine = useCallback((machineSystemId: string) => {
    // Check if this machine already has entered data
    const op = machineRows.find(r => r.machineSystemId === machineSystemId);
    if (op && isOperationEntered(op)) {
      if (!window.confirm('Máy này đã có dữ liệu vận hành. Bạn muốn xem và chỉnh sửa?')) return;
    }
    setSelectedMachineSystemId(machineSystemId);
    setStep('form');
  }, [machineRows]);

  const handleBackToBatch = useCallback(() => {
    setSelectedMaChien('');
    setSelectedMachineSystemId('');
    setForm(emptyForm);
    setStep('batch');
  }, []);

  const handleBackToMachine = useCallback(() => {
    setSelectedMachineSystemId('');
    setForm(emptyForm);
    setStep('machine');
  }, []);

  const handleSubmit = useCallback(() => {
    if (!existingOperation?.id) {
      toast.error('Không tìm thấy dòng thông số vận hành cho máy này. Vui lòng thử lại.');
      return;
    }
    // Chặn lưu khi máy đang bảo trì/ngưng (chỉ xem)
    if (!isMachineEditable(existingOperation.machineSystem?.trangThai as MachineStatus | undefined)) {
      toast.error('Máy đang bảo trì/ngưng — không thể lưu thông số.');
      return;
    }
    // Chặn lưu khi tất cả trường đều = 0 (công nhân bấm Lưu mà chưa nhập gì)
    const hasAnyValue =
      form.giaiDoan1ThoiGian > 0 || form.giaiDoan1NhietDo > 0 || form.giaiDoan1ApSuat > 0 ||
      form.giaiDoan2ThoiGian > 0 || form.giaiDoan2NhietDo > 0 || form.giaiDoan2ApSuat > 0 ||
      form.giaiDoan3ThoiGian > 0 || form.giaiDoan3NhietDo > 0 || form.giaiDoan3ApSuat > 0 ||
      form.giaiDoan4ThoiGian > 0 || form.giaiDoan4NhietDo > 0 || form.giaiDoan4ApSuat > 0 ||
      form.khoiLuongDauVao > 0;
    if (!hasAnyValue) {
      toast.error('Vui lòng nhập ít nhất một thông số trước khi lưu.');
      return;
    }
    updateSysOp.mutate(
      {
        id: existingOperation.id,
        data: {
          giaiDoan1: {
            thoiGian: form.giaiDoan1ThoiGian,
            nhietDo: form.giaiDoan1NhietDo,
            apSuat: form.giaiDoan1ApSuat,
          },
          giaiDoan2: {
            thoiGian: form.giaiDoan2ThoiGian,
            nhietDo: form.giaiDoan2NhietDo,
            apSuat: form.giaiDoan2ApSuat,
          },
          giaiDoan3: {
            thoiGian: form.giaiDoan3ThoiGian,
            nhietDo: form.giaiDoan3NhietDo,
            apSuat: form.giaiDoan3ApSuat,
          },
          giaiDoan4: {
            thoiGian: form.giaiDoan4ThoiGian,
            nhietDo: form.giaiDoan4NhietDo,
            apSuat: form.giaiDoan4ApSuat,
          },
          khoiLuongDauVao: form.khoiLuongDauVao,
          tongThoiGianSay: form.tongThoiGianSay,
          nguoiThucHien,
        },
      },
      {
        onSuccess: () => {
          toast.success('Đã lưu thông số vận hành');
          // Clear draft on success
          const key = getDraftKey(productionDate, selectedShift, selectedMaChien, selectedMachineSystemId);
          clearDraft(key);
          setUsingDraft(false);
          // Return to batch selection for next entry
          handleBackToBatch();
        },
        onError: (err: any) => {
          toast.error(err?.message || 'Lỗi khi lưu thông số vận hành');
        },
      },
    );
  }, [existingOperation?.id, updateSysOp, form, nguoiThucHien, handleBackToBatch, productionDate, selectedShift, selectedMaChien, selectedMachineSystemId]);

  // True when the worker is mid-entry on the form step with at least one value typed.
  const isFormDirty = useCallback((): boolean => {
    if (step !== 'form') return false;
    return (
      form.giaiDoan1ThoiGian > 0 || form.giaiDoan1NhietDo > 0 || form.giaiDoan1ApSuat > 0 ||
      form.giaiDoan2ThoiGian > 0 || form.giaiDoan2NhietDo > 0 || form.giaiDoan2ApSuat > 0 ||
      form.giaiDoan3ThoiGian > 0 || form.giaiDoan3NhietDo > 0 || form.giaiDoan3ApSuat > 0 ||
      form.giaiDoan4ThoiGian > 0 || form.giaiDoan4NhietDo > 0 || form.giaiDoan4ApSuat > 0 ||
      form.khoiLuongDauVao > 0
    );
  }, [step, form]);

  const handleChangeShift = useCallback(() => {
    if (isFormDirty() && !window.confirm('Thông số đang nhập dở sẽ mất. Đổi ca?')) {
      return;
    }
    setSelectedShift(0);
    handleBackToBatch();
  }, [handleBackToBatch, isFormDirty]);

  const handleChangeOperator = useCallback(() => {
    if (isFormDirty() && !window.confirm('Thông số đang nhập dở sẽ mất. Đổi người?')) {
      return;
    }
    clearSelection();
    setNguoiThucHien('');
    setOperatorId('');
    setSelectedShift(0);
    handleBackToBatch();
  }, [handleBackToBatch, isFormDirty]);

  // ─── Session guards ────────────────────────────────────────────────────────
  if (!isKioskTab() && !hasKioskSession()) {
    return <NotActivatedScreen />;
  }

  if (kioskExpired) {
    return <ExpiredScreen />;
  }

  if (isKioskTab() && !hasKioskSession()) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <h1 className="text-lg font-semibold text-gray-800 text-center">Nhập Device Key</h1>
          <p className="text-sm text-gray-500 text-center">Liên hệ quản trị viên để lấy mã thiết bị.</p>
          <input
            type="text"
            value={deviceKeyInput}
            onChange={(e) => setDeviceKeyInput(e.target.value)}
            placeholder="Dán device key..."
            className="w-full min-h-[48px] px-4 py-3 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            disabled={!deviceKeyInput.trim()}
            onClick={() => {
              setDeviceKey(deviceKeyInput.trim());
              setDeviceKeyInput('');
            }}
            className="w-full min-h-[48px] bg-blue-600 text-white rounded-lg font-medium disabled:opacity-40"
          >
            Xác nhận
          </button>

          {userIsAdmin && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-xs text-gray-400">hoặc</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="VD: Tablet Kho 1"
                className="w-full min-h-[48px] px-4 py-3 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                disabled={!deviceName.trim() || registering}
                onClick={async () => {
                  setRegistering(true);
                  try {
                    const res = await faceAttendanceService.createDevice(
                      deviceName.trim(),
                      undefined,
                      'DATA_ENTRY',
                    );
                    const key = res.data?.apiKey;
                    if (!key) throw new Error('Không nhận được device key');
                    setDeviceKey(key);
                    toast.success('Đã đăng ký & kích hoạt thiết bị');
                  } catch (err: any) {
                    toast.error(err instanceof Error ? err.message : 'Đăng ký thiết bị thất bại');
                  } finally {
                    setRegistering(false);
                  }
                }}
                className="w-full min-h-[48px] bg-green-600 text-white rounded-lg font-medium disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {registering && <Loader2 className="w-4 h-4 animate-spin" />}
                Đăng ký & kích hoạt
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Shift gate (FIRST) ────────────────────────────────────────────────────
  if (!selectedShift) {
    return (
      <ShiftSelectionScreen
        onSelect={setSelectedShift}
        onBack={() => {
          clearSelection();
          setSelectedShift(0);
          setNguoiThucHien('');
          setOperatorId('');
          navigate('/production/nhap-lieu-hub');
        }}
      />
    );
  }

  // ─── Operator gate (SECOND) ───────────────────────────────────────────────
  if (!nguoiThucHien) {
    return (
      <OperatorSelectionScreen
        onSelect={(sel) => {
          setNguoiThucHien(sel.name);
          setOperatorId(sel.id);
        }}
        onBack={() => {
          setNguoiThucHien('');
          setOperatorId('');
          setSelectedShift(0);
        }}
        attendedOperators={attendedOperators}
        isLoadingAttended={isLoadingAttended}
      />
    );
  }

  // ─── Wizard shell ─────────────────────────────────────────────────────────
  const selectedBatch = filteredBatches.find((b) => b.maChien === selectedMaChien);
  const selectedRow = machineRows.find((op) => op.machineSystemId === selectedMachineSystemId);
  const selectedMachine = selectedRow?.machineSystem ?? null;
  const selectedMachineStatus = selectedMachine?.trangThai;
  const formLocked = !isMachineEditable(selectedMachineStatus);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm transition-all duration-150">
        <div className={`max-w-4xl mx-auto px-4 ${keyboardOpen ? 'py-2' : 'py-3'}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/abf-logo.png" alt="An Bình Foods" className={`h-9 object-contain ${keyboardOpen ? 'hidden' : 'hidden sm:block'}`} />
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-gray-800 truncate flex items-center gap-2">
                  <Gauge className="w-5 h-5 text-blue-600" />
                  Thông số vận hành
                </h1>
                <p className={`text-sm text-gray-600 truncate ${keyboardOpen ? 'hidden' : ''}`}>
                  {nguoiThucHien} <span className="text-gray-400">·</span> Ca {selectedShift}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleChangeOperator}
                title="Đổi người thực hiện"
                className="flex items-center gap-1.5 min-h-[44px] px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium border border-gray-200"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Đổi người</span>
              </button>
              <button
                type="button"
                onClick={handleChangeShift}
                title="Đổi ca làm việc"
                className="flex items-center gap-1.5 min-h-[44px] px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium border border-gray-200"
              >
                <CalendarClock className="w-4 h-4" />
                <span className="hidden sm:inline">Đổi ca</span>
              </button>
            </div>
          </div>

          {/* Date picker (only visible while picking a batch) */}
          {step === 'batch' && (
            <div className={`flex items-center gap-2 mt-3 ${keyboardOpen ? 'hidden' : ''}`}>
              <label className="text-sm font-medium text-gray-600">Ngày sản xuất:</label>
              <input
                type="date"
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
                className="min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => setProductionDate(todayStr())}
                className="min-h-[44px] px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Hôm nay
              </button>
              <span className="text-sm text-gray-500 ml-2">{formatDateVN(productionDate)}</span>
            </div>
          )}

          {/* Breadcrumb */}
          {step !== 'batch' && (
            <div className="flex items-center gap-1 mt-2 text-sm text-gray-500 flex-wrap">
              <button onClick={handleBackToBatch} className="text-blue-600 hover:underline">
                Mã chiên
              </button>
              <ChevronRight className="w-4 h-4" />
              {selectedBatch ? (
                <span className="text-gray-700 font-medium">{selectedBatch.maChien}</span>
              ) : (
                <span>{selectedMaChien}</span>
              )}
              {step === 'form' && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <button onClick={handleBackToMachine} className="text-blue-600 hover:underline">
                    Máy
                  </button>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-gray-700 font-medium">
                    {selectedMachine ? getMachineLabel(selectedMachine.maHeThong) : ''}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 pb-24">
        {step === 'batch' && (
          <>
            {batchesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : batchesError ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-gray-700 font-medium">Không tải được danh sách mã chiên</p>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  Kiểm tra kết nối mạng rồi thử lại.
                </p>
                <button
                  onClick={() => void refetchBatches()}
                  className="min-h-[44px] px-5 py-2 bg-blue-600 text-white rounded-lg font-medium"
                >
                  Thử lại
                </button>
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <p className="text-gray-500">
                  Không có mã chiên cho Ca {selectedShift} ngày {formatDateVN(productionDate)}.
                </p>
                <p className="text-sm text-gray-400 mt-1">Hãy kiểm tra lại ca và ngày sản xuất.</p>
              </div>
            ) : (
              <>
                <h2 className="text-base font-semibold text-gray-700 mb-3">Chọn mã chiên</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredBatches.map((batch) => (
                    <button
                      key={batch.maChien}
                      onClick={() => handleSelectBatch(batch.maChien)}
                      className="min-h-[80px] px-5 py-4 bg-white border border-gray-200 rounded-2xl text-left shadow-sm hover:border-blue-400 hover:bg-blue-50 hover:shadow-md transition-all flex items-center gap-4"
                    >
                      <div className="bg-blue-100 rounded-full p-3 flex-shrink-0">
                        <Package className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-lg font-semibold text-gray-800 truncate">{batch.maChien}</div>
                        <div className="text-sm text-gray-500 truncate">
                          {formatTime(batch.thoiGianChien)}
                          {batch.maSanPham ? ` · ${batch.maSanPham}` : ''}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {step === 'machine' && (
          <>
            {machinesLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : machineRows.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <p className="text-gray-600">Chưa có máy nào được tạo dòng cho mã chiên này.</p>
                <p className="text-sm text-gray-400 mt-1">Vui lòng liên hệ admin.</p>
              </div>
            ) : (
              <>
                <h2 className="text-base font-semibold text-gray-700 mb-3">
                  Chọn máy cho mã chiên <span className="text-blue-600">{selectedMaChien}</span>
                  {selectedBatch?.maSanPham && (
                    <span className="text-gray-500 font-normal"> · {selectedBatch.maSanPham}</span>
                  )}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {machineRows.map((op) => {
                    const ms = op.machineSystem;
                    const status = ms?.trangThai as MachineStatus | undefined;
                    const badge = getStatusBadge(status);
                    const locked = !isMachineEditable(status);
                    const entered = isOperationEntered(op);
                    return (
                      <button
                        key={op.id}
                        onClick={() => op.machineSystemId && handleSelectMachine(op.machineSystemId)}
                        className={`relative min-h-[110px] px-5 py-4 rounded-2xl border shadow-sm transition-all flex flex-col items-center justify-center gap-2 ${
                          locked
                            ? 'bg-gray-50 border-gray-200 hover:border-gray-200'
                            : 'bg-white border-gray-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md'
                        }`}
                      >
                        {badge && (
                          <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.className}`}>
                            {badge.label}
                          </span>
                        )}
                        <Gauge className={`w-8 h-8 ${locked ? 'text-gray-400' : 'text-blue-600'}`} />
                        <div className={`text-lg font-semibold ${locked ? 'text-gray-500' : 'text-gray-800'}`}>
                          {ms ? getMachineLabel(ms.maHeThong) : 'Máy ?'}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            entered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {entered ? '✓ Đã nhập' : 'Chưa nhập'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {step === 'form' && (
          <div className="space-y-6">
            {existingLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : !existingOperation ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <p className="text-gray-600">
                  Chưa có dòng thông số vận hành sẵn cho mã chiên và máy này.
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Vui lòng liên hệ admin hoặc chọn mã chiên/máy khác.
                </p>
              </div>
            ) : (
              <>
                {/* Context strip — 14 parameter fields with only a small grey breadcrumb
                    left the worker unsure which batch and machine they were filling in. */}
                <div className="bg-white rounded-lg border px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="text-base font-bold text-gray-800">{selectedMaChien}</span>
                  {selectedBatch?.maSanPham && (
                    <span className="text-base font-semibold text-blue-700">{selectedBatch.maSanPham}</span>
                  )}
                  {selectedMachine && (
                    <span className="text-base font-semibold text-gray-700">
                      {getMachineLabel(selectedMachine.maHeThong)}
                    </span>
                  )}
                  {selectedBatch && (
                    <span className="text-sm text-gray-500">
                      {formatTime(selectedBatch.thoiGianChien)}
                    </span>
                  )}
                  <span className="text-sm text-gray-500">Ca {selectedShift}</span>
                </div>

                {/* Locked banner — máy đang bảo trì/ngưng: chỉ xem, không sửa */}
                {formLocked && (
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                    <p className="text-sm text-amber-800">
                      Máy đang {selectedMachineStatus === 'BAO_TRI' ? 'bảo trì' : 'ngưng hoạt động'} —
                      chỉ xem thông số đã lưu, không thể chỉnh sửa.
                    </p>
                  </div>
                )}

                {/* Draft indicator */}
                {usingDraft && !formLocked && (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                    <span className="text-sm text-blue-700">Đang dùng nháp chưa lưu</span>
                  </div>
                )}

                {/* Weight + total time */}
                <section className="bg-white rounded-lg border p-4 space-y-4">
                  <h3 className="text-base font-semibold text-gray-700">Thông tin chung</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <NumericField
                      label="Khối lượng đầu vào"
                      unit="kg"
                      readOnly={formLocked}
                      value={form.khoiLuongDauVao}
                      min={0}
                      max={PRODUCTION_LIMITS.khoiLuongDauVao.max}
                      onChange={(v) => setField('khoiLuongDauVao', v)}
                      onTap={!formLocked ? () => setActiveEditorField('khoiLuongDauVao') : undefined}
                    />
                    <NumericField
                      label="Tổng thời gian sấy"
                      unit="phút · tự tính"
                      integer
                      readOnly
                      value={form.tongThoiGianSay}
                      onChange={(v) => setField('tongThoiGianSay', v)}
                    />
                  </div>
                </section>

                {/* Stage 1-4 */}
                {[1, 2, 3, 4].map((stage) => {
                  const keyThoiGian = `giaiDoan${stage}ThoiGian` as keyof FormData;
                  const keyNhietDo = `giaiDoan${stage}NhietDo` as keyof FormData;
                  const keyApSuat = `giaiDoan${stage}ApSuat` as keyof FormData;
                  const limitTG = PRODUCTION_LIMITS[keyThoiGian as keyof typeof PRODUCTION_LIMITS];
                  const limitND = PRODUCTION_LIMITS[keyNhietDo as keyof typeof PRODUCTION_LIMITS];
                  const limitAS = PRODUCTION_LIMITS[keyApSuat as keyof typeof PRODUCTION_LIMITS];
                  return (
                    <section key={stage} className="bg-white rounded-lg border p-4 space-y-4">
                      <h3 className="text-base font-semibold text-gray-700">Giai đoạn {stage}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <NumericField
                          label="Thời gian"
                          unit="phút"
                          integer
                          readOnly={formLocked}
                          value={form[keyThoiGian] as number}
                          min={0}
                          max={limitTG?.max}
                          onChange={(v) => setField(keyThoiGian, v)}
                          onTap={!formLocked ? () => setActiveEditorField(keyThoiGian) : undefined}
                        />
                        <NumericField
                          label="Nhiệt độ"
                          unit="°C"
                          readOnly={formLocked}
                          value={form[keyNhietDo] as number}
                          min={0}
                          max={limitND?.max}
                          onChange={(v) => setField(keyNhietDo, v)}
                          onTap={!formLocked ? () => setActiveEditorField(keyNhietDo) : undefined}
                        />
                        <NumericField
                          label="Áp suất"
                          unit="bar"
                          readOnly={formLocked}
                          value={form[keyApSuat] as number}
                          min={0}
                          max={limitAS?.max}
                          onChange={(v) => setField(keyApSuat, v)}
                          onTap={!formLocked ? () => setActiveEditorField(keyApSuat) : undefined}
                        />
                      </div>
                    </section>
                  );
                })}

              </>
            )}
          </div>
        )}
      </div>

      {/* Footer — nút điều hướng: Quay lại (trái) + Lưu (phải), chỉ ở bước form */}
      {step === 'form' && (
        <div className={`fixed bottom-0 left-0 right-0 bg-white border-t z-10 transition-transform duration-200 ${keyboardOpen ? 'translate-y-full' : ''}`}>
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleBackToMachine}
              className="min-h-[52px] px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-lg text-base font-medium flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
              Quay lại
            </button>
            {/* Máy đang bảo trì/ngưng: chỉ xem, ẩn nút Lưu */}
            {!formLocked && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={updateSysOp.isPending}
                className="min-h-[52px] px-8 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-base font-semibold flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                {updateSysOp.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Lưu thông số
              </button>
            )}
          </div>
        </div>
      )}

      <KioskFooter />

      {/* FieldFocusEditor overlay */}
      {(() => {
        const fieldIdx = activeEditorField ? SYSTEM_OP_FIELDS.findIndex(f => f.key === activeEditorField) : -1;
        const fieldCfg = fieldIdx >= 0 ? SYSTEM_OP_FIELDS[fieldIdx] : null;
        const nextField = fieldIdx >= 0 && fieldIdx < SYSTEM_OP_FIELDS.length - 1 ? SYSTEM_OP_FIELDS[fieldIdx + 1] : null;
        return (
          <FieldFocusEditor
            open={!!activeEditorField && !!fieldCfg}
            label={fieldCfg?.label ?? ''}
            value={activeEditorField ? (form[activeEditorField] as number) : 0}
            unit={fieldCfg?.unit}
            integer={fieldCfg?.integer}
            min={fieldCfg?.min}
            max={fieldCfg?.max}
            suggestions={fieldCfg?.suggestions}
            onChange={(v) => { if (activeEditorField) setField(activeEditorField, v); }}
            onNext={nextField ? () => setActiveEditorField(nextField.key) : undefined}
            onClose={() => setActiveEditorField(null)}
          />
        );
      })()}
    </div>
  );
};

export default ProductionSystemOperationEntry;
