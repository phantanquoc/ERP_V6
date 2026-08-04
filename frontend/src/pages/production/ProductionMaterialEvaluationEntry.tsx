import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Save,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Camera,
  Package,
  Beaker,
  Clock,
  ClipboardCheck,
  User,
  CalendarClock,
  X,
} from 'lucide-react';
import RawMaterialPicker from '../../components/production/RawMaterialPicker';
import CascadePicker from '../../components/production/CascadePicker';
import type { CascadeOption } from '../../components/production/CascadePicker';
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
import { useRawMaterials, rawMaterialKeys } from '../../hooks/useRawMaterials';
import { useAttendedOperatorsByShift } from '../../hooks/useAttendedOperators';
import { useLotsByProduct, lotsByProductKeys } from '../../hooks/useLotsByProduct';
import { useKienByProductAndLot, kienByProductAndLotKeys } from '../../hooks/useKienByProductAndLot';
import materialEvaluationService, { MaterialEvaluation } from '../../services/materialEvaluationService';
import materialEvaluationCriteriaService from '../../services/materialEvaluationCriteriaService';
import { materialEvaluationKeys } from '../../hooks/useProductionEntities';
import { lotProductKeys } from '../../services/lotProductService';
import OperatorSelectionScreen from '../../components/production/OperatorSelectionScreen';
import ShiftSelectionScreen from '../../components/production/ShiftSelectionScreen';
import EvaluationDetailReadOnly from '../../components/production/EvaluationDetailReadOnly';
import KioskFooter from '../../components/production/KioskFooter';
import FieldFocusEditor from '../../components/production/FieldFocusEditor';
import { useAuth } from '../../contexts/AuthContext';
import { isAdmin } from '../../utils/permissions';
import faceAttendanceService from '../../services/faceAttendanceService';
import { useDailyFrySchedule, ScheduledBatch } from '../../hooks/useDailyFrySchedule';
import { productionDayRange, getCurrentProductionDay } from '../../utils/productionDay';
import { deriveThoiGianChien } from './deriveThoiGianChien';

// ─── Types ───────────────────────────────────────────────────────────────────

type WizardStep = 2 | 3 | 4;
const FIRST_STEP: WizardStep = 2;
const LAST_STEP: WizardStep = 4;

interface WizardData {
  // Step 2 (Nguyên liệu)
  productId: string;
  lotId: string;
  lotProductId: string;
  tenHangHoa: string;
  /** Commodity code — the identifier the kiosk screens display. */
  maSanPham: string;
  soLoKien: string;
  khoiLuong: number;
  // Step 3 (Thông số)
  soLanNgam: number;
  nhietDoNuocTruocNgam: number;
  nhietDoNuocSauVot: number;
  thoiGianNgam: number;
  brixNuocNgam: number;
  // Step 4 (Đánh giá + File + Ghi chú)
  danhGiaTruocNgam: string;
  danhGiaSauNgam: string;
  ghiChu: string;
  file: File | null;
}

const initialWizardData: WizardData = {
  productId: '',
  lotId: '',
  lotProductId: '',
  tenHangHoa: '',
  maSanPham: '',
  soLoKien: '',
  khoiLuong: 0,
  soLanNgam: 0,
  nhietDoNuocTruocNgam: 0,
  nhietDoNuocSauVot: 0,
  thoiGianNgam: 0,
  brixNuocNgam: 0,
  danhGiaTruocNgam: '',
  danhGiaSauNgam: '',
  ghiChu: '',
  file: null,
};

const DRAFT_KEY_PREFIX = 'material-eval-draft';

function getDraftKey(operator: string, shift: number, date: string): string {
  return `${DRAFT_KEY_PREFIX}|${operator}|${shift}|${date}`;
}

// ─── Session guard screens ───────────────────────────────────────────────────

const NotActivatedScreen: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md w-full text-center">
      <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Phiên chưa được kích hoạt</h2>
      <p className="text-gray-600">Nhờ admin mở lại trang này từ hệ thống ERP.</p>
    </div>
  </div>
);

const ExpiredScreen: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
    <div className="bg-white rounded-xl shadow-sm border p-8 max-w-md w-full text-center">
      <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Phiên hết hạn</h2>
      <p className="text-gray-600">Nhờ admin mở lại trang này từ hệ thống ERP.</p>
    </div>
  </div>
);

// ─── Numeric Input (tablet friendly) ────────────────────────────────────────

interface NumericInputProps {
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  step?: string;
  /** Called on tap to open FieldFocusEditor */
  onTap?: () => void;
  min?: number;
  max?: number;
  integer?: boolean;
}

const NumericInput: React.FC<NumericInputProps> = ({ value, onChange, placeholder, step, onTap, min = 0, max, integer }) => (
  <input
    type="number"
    inputMode={integer ? 'numeric' : 'decimal'}
    step={step ?? (integer ? '1' : '0.1')}
    min={min}
    max={max}
    placeholder={placeholder ?? '0'}
    className="w-full min-h-[52px] px-3 py-2 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    value={value === 0 ? '' : value}
    onFocus={onTap ? (e) => { e.target.blur(); onTap(); } : undefined}
    onClick={onTap ? () => onTap() : undefined}
    onChange={(e) => onChange(parseNumberInput(e.target.value, { min, max, integer }))}
  />
);

// ─── Step Progress ───────────────────────────────────────────────────────────

interface StepProgressProps {
  currentStep: WizardStep;
  className?: string;
}

const STEP_INFO: { step: WizardStep | 1; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { step: 1, icon: User, label: 'Người + Ca' },
  { step: 2, icon: Package, label: 'Nguyên liệu' },
  { step: 3, icon: Beaker, label: 'Thông số' },
  { step: 4, icon: ClipboardCheck, label: 'Đánh giá' },
];

const StepProgress: React.FC<StepProgressProps> = ({ currentStep, className }) => (
  <div className={`w-full max-w-full sm:max-w-3xl mx-auto px-4 py-4 ${className || ''}`}>
    <div className="flex items-center justify-between">
      {STEP_INFO.map((info, idx) => {
        const Icon = info.icon;
        const isDone = info.step < currentStep;
        const isCurrent = info.step === currentStep;
        const isFuture = info.step > currentStep;
        const showLine = idx < STEP_INFO.length - 1;
        const nextIsPast = STEP_INFO[idx + 1]?.step && STEP_INFO[idx + 1].step <= currentStep;
        return (
          <React.Fragment key={info.step}>
            <div className="flex flex-col items-center gap-1 min-w-[64px]">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                  isDone
                    ? 'bg-blue-600 text-white'
                    : isCurrent
                    ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isDone ? <CheckCircle className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
              </div>
              <span
                className={`text-sm font-medium text-center ${
                  isFuture ? 'text-gray-400' : 'text-gray-700'
                }`}
              >
                {info.label}
              </span>
            </div>
            {showLine && (
              <div
                className={`flex-1 h-1 mx-1 rounded ${
                  nextIsPast ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

// ─── Field Focus Editor: field configs per wizard step ──────────────────────

type MaterialNumericField = 'khoiLuong' | 'soLanNgam' | 'nhietDoNuocTruocNgam' | 'nhietDoNuocSauVot' | 'thoiGianNgam' | 'brixNuocNgam';

interface MaterialFieldConfig {
  key: MaterialNumericField;
  label: string;
  unit?: string;
  integer?: boolean;
  suggestions?: number[];
  step: 2 | 3;
  min?: number;
  max?: number;
}

const MATERIAL_EVAL_FIELDS: MaterialFieldConfig[] = [
  { key: 'khoiLuong', label: 'Khối lượng xuất', unit: 'kg', step: 2, suggestions: [300, 350, 400], min: 0, max: PRODUCTION_LIMITS.khoiLuong.max },
  { key: 'soLanNgam', label: 'Số lần ngâm', integer: true, step: 3, min: 0, max: PRODUCTION_LIMITS.soLanNgam.max },
  { key: 'nhietDoNuocTruocNgam', label: 'Nhiệt độ nước trước ngâm', unit: '°C', step: 3, min: 0, max: PRODUCTION_LIMITS.nhietDoNuocTruocNgam.max },
  { key: 'nhietDoNuocSauVot', label: 'Nhiệt độ nước sau vớt', unit: '°C', step: 3, min: 0, max: PRODUCTION_LIMITS.nhietDoNuocSauVot.max },
  { key: 'thoiGianNgam', label: 'Thời gian ngâm', unit: 'phút', integer: true, step: 3, min: 0, max: PRODUCTION_LIMITS.thoiGianNgam.max },
  { key: 'brixNuocNgam', label: 'Brix nước ngâm', step: 3, min: 0, max: PRODUCTION_LIMITS.brixNuocNgam.max },
];

// ─── Main Component ──────────────────────────────────────────────────────────

const ProductionMaterialEvaluationEntry: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [kioskExpired, setKioskExpired] = useState(false);
  const { keyboardOpen } = useVirtualKeyboard();
  const [selectedShift, setSelectedShift] = useState<number>(() => getSelection()?.shift ?? 0);
  const [nguoiThucHien, setNguoiThucHien] = useState<string>(() => getSelection()?.operator ?? '');
  const [operatorId, setOperatorId] = useState<string>(() => getSelection()?.operatorId ?? '');
  const [productionDate, setProductionDate] = useState<string>(() => {
    const stored = getSelection()?.date;
    return stored && stored.length > 0 ? stored : getCurrentProductionDay();
  });

  // ─── Batch code selection state ─────────────────────────────────────────────
  const [selectedMaChien, setSelectedMaChien] = useState<string>('');

  const [currentStep, setCurrentStep] = useState<WizardStep>(2);
  const [wizardData, setWizardData] = useState<WizardData>(initialWizardData);
  const [submitting, setSubmitting] = useState(false);
  const [viewingEvalId, setViewingEvalId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftLoaded = useRef<boolean>(false);
  const [deviceKeyInput, setDeviceKeyInput] = useState('');

  // FieldFocusEditor state
  const [activeEditorField, setActiveEditorField] = useState<MaterialNumericField | null>(null);

  // Admin self-registration state
  const { user } = useAuth();
  const userIsAdmin = user ? isAdmin(user.department) : false;
  const [deviceName, setDeviceName] = useState('');
  const [registering, setRegistering] = useState(false);

  // Attended operators hook (shift-first gate)
  const {
    data: attendedOperators,
    isLoading: isLoadingAttended,
  } = useAttendedOperatorsByShift(productionDate, selectedShift, 'MATERIAL_EVALUATION');

  // ─── Daily schedule for batch code selection ──────────────────────────────
  // Derive production day from the worker's selected date (Defect 1 fix)
  const scheduleProductionDay = productionDate;
  const { data: scheduledBatches = [], isLoading: isLoadingSchedule } = useDailyFrySchedule(
    scheduleProductionDay,
    selectedShift || undefined,
  );

  // Fetch all evaluations for the production day (to detect existing records for task 4.4)
  const { from: productionDayStart, to: productionDayEnd } = useMemo(
    () => productionDayRange(scheduleProductionDay),
    [scheduleProductionDay],
  );

  const { data: dayEvalsResult } = useQuery({
    queryKey: [...materialEvaluationKeys.lists(), 'byDay', scheduleProductionDay],
    queryFn: () =>
      materialEvaluationService.getAllMaterialEvaluations(1, 100, {
        thoiGianChienFrom: productionDayStart,
        thoiGianChienTo: productionDayEnd,
      }),
    enabled: !!selectedShift && !!nguoiThucHien,
    staleTime: 0,
  });
  const dayEvals = dayEvalsResult?.data ?? [];

  // Map maChien -> existing record for quick lookup
  const existingByCode = useMemo(() => {
    const map = new Map<string, MaterialEvaluation>();
    for (const ev of dayEvals) {
      map.set(ev.maChien, ev);
    }
    return map;
  }, [dayEvals]);

  // ─── Today's evaluations (chip list) ──────────────────────────────────────
  const todayStartISO = useMemo(() => {
    const [y, m, d] = productionDate.split('-').map(Number);
    if (!y || !m || !d) return new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
  }, [productionDate]);

  const { data: todayEvalsResult } = useQuery({
    queryKey: materialEvaluationKeys.today(nguoiThucHien, productionDate),
    queryFn: () =>
      materialEvaluationService.getAllMaterialEvaluations(1, 100, {
        nguoiThucHien,
        dateFrom: todayStartISO,
      }),
    enabled: !!nguoiThucHien,
    staleTime: 0,
  });
  const todayEvals = todayEvalsResult?.data ?? [];

  // ─── Mark tab as kiosk + read device key from URL ─────────────────────────
  useEffect(() => {
    markTab();
    const paramKey = searchParams.get('deviceKey');
    if (paramKey && !getDeviceKey()) {
      setDeviceKey(paramKey);
    }
  }, [searchParams]);

  // ─── Listen for kiosk-expired events ──────────────────────────────────────
  useEffect(() => {
    const handler = () => setKioskExpired(true);
    window.addEventListener(KIOSK_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(KIOSK_EXPIRED_EVENT, handler);
  }, []);

  // ─── Persist selection to sessionStorage ──────────────────────────────────
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

  // ─── Criteria ─────────────────────────────────────────────────────────────
  // react-query rather than a hand-rolled effect: this gets caching across mounts and
  // a real error state. The previous version only console.error'd, so a failed load
  // showed the worker an empty criteria list with no explanation.
  const {
    data: criteria = [],
    isLoading: criteriaLoading,
    isError: criteriaError,
    refetch: refetchCriteria,
  } = useQuery({
    queryKey: ['materialEvaluationCriteria', 'list'] as const,
    queryFn: () => materialEvaluationCriteriaService.getAllCriteria(),
    staleTime: 5 * 60 * 1000,
  });

  // ─── Data hooks (cascade kho) ─────────────────────────────────────────────
  const {
    data: rawMaterials = [],
    isLoading: loadingRawMaterials,
    isError: rawMaterialsError,
    refetch: refetchRawMaterials,
  } = useRawMaterials();
  const { data: lots = [], isLoading: loadingLots } = useLotsByProduct(wizardData.productId || null);
  const { data: kienList = [], isLoading: loadingKien } = useKienByProductAndLot(
    wizardData.productId || null,
    wizardData.lotId || null,
  );
  const selectedKien = useMemo(
    () => kienList.find(k => k.id === wizardData.lotProductId) ?? null,
    [kienList, wizardData.lotProductId],
  );

  const stockPreview = useMemo(() => {
    if (!selectedKien) return null;
    const current = selectedKien.soLuong;
    const exporting = wizardData.khoiLuong || 0;
    const remaining = current - exporting;
    const percentage = current > 0 ? (remaining / current) * 100 : 0;
    return { current, exporting, remaining, percentage };
  }, [selectedKien, wizardData.khoiLuong]);

  const khoiLuongExceeded = useMemo(
    () => selectedKien !== null && wizardData.khoiLuong > selectedKien.soLuong,
    [selectedKien, wizardData.khoiLuong],
  );

  // ─── CascadePicker option lists for Lot and Kien ──────────────────────────
  const lotOptions: CascadeOption[] = useMemo(
    () => lots.map(l => ({
      id: l.id,
      primary: l.tenLo,
      secondary: l.warehouse?.maKho,
    })),
    [lots],
  );

  // Label packages by their real code so the label matches what gets saved as
  // soLoKien. A positional label ("Kiện 2") shifts whenever the API reorders and
  // matches nothing the worker can look up afterwards.
  const kienOptions: CascadeOption[] = useMemo(
    () => kienList.map((k, idx) => ({
      id: k.id,
      primary: k.maKien || `Kiện ${idx + 1}`,
      secondary: `Tồn ${k.soLuong} ${k.donViTinh}`,
    })),
    [kienList],
  );

  // ─── Draft persistence (localStorage) ─────────────────────────────────────
  const draftKey = useMemo(() => {
    if (!nguoiThucHien || !selectedShift) return null;
    return getDraftKey(nguoiThucHien, selectedShift, productionDate);
  }, [nguoiThucHien, selectedShift, productionDate]);

  // Load draft when operator+shift+date first become available
  useEffect(() => {
    if (!draftKey) return;
    if (draftLoaded.current) return;
    const raw = localStorage.getItem(draftKey);
    if (!raw) {
      draftLoaded.current = true;
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<WizardData>;
      setWizardData(prev => ({ ...prev, ...parsed, file: null }));
    } catch {
      // ignore corrupted draft
    }
    draftLoaded.current = true;
  }, [draftKey]);

  // Auto-save draft (excluding file, which can't be JSON serialized)
  useEffect(() => {
    if (!draftKey || !draftLoaded.current) return;
    const { file: _file, ...rest } = wizardData;
    void _file;
    try {
      localStorage.setItem(draftKey, JSON.stringify(rest));
    } catch {
      // Storage full or blocked — the screen must keep working, but the worker
      // needs to know a reload would lose what they typed.
      toast.error('Không lưu được bản nháp — vui lòng lưu sớm để tránh mất dữ liệu', {
        id: 'draft-write-failed',
      });
    }
  }, [wizardData, draftKey]);

  // ─── File preview URL ─────────────────────────────────────────────────────
  // An effect, not a memo: creating and revoking an object URL is a side effect,
  // and React may discard or re-run a memo, revoking a URL that is still rendered.
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!wizardData.file) {
      setFilePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(wizardData.file);
    setFilePreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [wizardData.file]);

  // ─── Handlers: operator + shift + session end ─────────────────────────────
  const handleShiftSelect = useCallback((shift: number) => {
    setSelectedShift(shift);
  }, []);

  const handleOperatorSelect = useCallback((sel: { id: string; name: string }) => {
    setNguoiThucHien(sel.name);
    setOperatorId(sel.id);
  }, []);

  const handleBackToRoot = useCallback(() => {
    clearSelection();
    setSelectedShift(0);
    setNguoiThucHien('');
    setOperatorId('');
    setCurrentStep(2);
    setWizardData(initialWizardData);
    draftLoaded.current = false;
    navigate('/production/nhap-lieu-hub');
  }, [navigate]);

  const handleBackToOperator = useCallback(() => {
    setNguoiThucHien('');
    setOperatorId('');
    setViewingEvalId(null);
    setCurrentStep(2);
    setWizardData(initialWizardData);
    draftLoaded.current = false;
  }, []);

  const isWizardDirty = useCallback((): boolean => {
    return (
      wizardData.productId !== '' ||
      wizardData.lotId !== '' ||
      wizardData.lotProductId !== '' ||
      wizardData.khoiLuong > 0 ||
      wizardData.soLanNgam > 0 ||
      wizardData.nhietDoNuocTruocNgam > 0 ||
      wizardData.nhietDoNuocSauVot > 0 ||
      wizardData.thoiGianNgam > 0 ||
      wizardData.brixNuocNgam > 0 ||
      wizardData.danhGiaTruocNgam !== '' ||
      wizardData.danhGiaSauNgam !== '' ||
      wizardData.ghiChu !== '' ||
      wizardData.file !== null
    );
  }, [wizardData]);

  const handleChangeOperator = useCallback(() => {
    if (isWizardDirty() && !window.confirm('Đánh giá đang nhập dở sẽ mất. Đổi người?')) {
      return;
    }
    if (draftKey) localStorage.removeItem(draftKey);
    clearSelection();
    setNguoiThucHien('');
    setOperatorId('');
    setSelectedShift(0);
    setSelectedMaChien('');
    setViewingEvalId(null);
    setCurrentStep(2);
    setWizardData(initialWizardData);
    draftLoaded.current = false;
    // Giữ nguyên productionDate — user thường vẫn nhập cho ngày đang xem
  }, [draftKey, isWizardDirty]);

  const handleChangeShift = useCallback(() => {
    if (isWizardDirty() && !window.confirm('Đánh giá đang nhập dở sẽ mất. Đổi ca?')) {
      return;
    }
    if (draftKey) localStorage.removeItem(draftKey);
    setSelectedShift(0);
    setSelectedMaChien('');
    setViewingEvalId(null);
    setCurrentStep(2);
    setWizardData(initialWizardData);
    draftLoaded.current = false;
    // Giữ nguyên nguoiThucHien + productionDate
  }, [draftKey, isWizardDirty]);

  // ─── Production day change handler ──────────────────────────────────────────
  const handleProductionDayChange = useCallback((newDay: string) => {
    if (newDay === productionDate) return;
    setProductionDate(newDay);
    // Reset batch selection since schedule changes with production day
    setSelectedMaChien('');
    setViewingEvalId(null);
    setWizardData(initialWizardData);
    draftLoaded.current = false;
    // Persist to session
    setSelection({
      shift: selectedShift,
      operator: nguoiThucHien,
      operatorId,
      date: newDay,
      activeTab: '',
    });
  }, [productionDate, selectedShift, nguoiThucHien, operatorId]);

  // ─── Batch code selection handler ─────────────────────────────────────────
  const handleBatchSelect = useCallback((code: string) => {
    const existing = existingByCode.get(code);
    if (existing) {
      // Already saved — open read-only detail view (no editing on kiosk)
      setViewingEvalId(existing.id);
      return;
    }
    // New record — enter the wizard to create
    setViewingEvalId(null);
    setSelectedMaChien(code);
    setWizardData(initialWizardData);
    draftLoaded.current = false;
    setCurrentStep(2);
  }, [existingByCode]);

  const handleBackToBatchSelect = useCallback(() => {
    if (isWizardDirty() && !window.confirm('Dữ liệu đang nhập sẽ mất. Quay lại chọn mã?')) {
      return;
    }
    if (draftKey) localStorage.removeItem(draftKey);
    setSelectedMaChien('');
    setViewingEvalId(null);
    setCurrentStep(2);
    setWizardData(initialWizardData);
    draftLoaded.current = false;
  }, [draftKey, isWizardDirty]);

  // ─── Step navigation ──────────────────────────────────────────────────────
  const isStepValid = useCallback(
    (step: WizardStep): boolean => {
      if (step === 2) {
        return (
          wizardData.productId !== '' &&
          wizardData.lotId !== '' &&
          wizardData.lotProductId !== '' &&
          wizardData.khoiLuong > 0 &&
          !khoiLuongExceeded
        );
      }
      // step 3 (thông số) và step 4 (đánh giá + file): không bắt buộc, cho lưu ngay cả khi rỗng
      return true;
    },
    [wizardData, khoiLuongExceeded],
  );

  const handleNext = useCallback(() => {
    if (!isStepValid(currentStep)) return;
    setCurrentStep(prev => (prev < LAST_STEP ? ((prev + 1) as WizardStep) : prev));
  }, [currentStep, isStepValid]);

  const handleBack = useCallback(() => {
    setCurrentStep(prev => (prev > FIRST_STEP ? ((prev - 1) as WizardStep) : prev));
  }, []);

  // ─── Step-2 (Nguyên liệu) field handlers ──────────────────────────────────
  const handleProductChange = useCallback((productId: string) => {
    setWizardData(prev => ({
      ...prev,
      productId,
      lotId: '',
      lotProductId: '',
      tenHangHoa: '',
      maSanPham: '',
      soLoKien: '',
      khoiLuong: 0,
      // Reset step 3 (thông số ngâm)
      soLanNgam: 0,
      nhietDoNuocTruocNgam: 0,
      nhietDoNuocSauVot: 0,
      thoiGianNgam: 0,
      brixNuocNgam: 0,
      // Reset step 4 (đánh giá + file)
      danhGiaTruocNgam: '',
      danhGiaSauNgam: '',
      file: null,
    }));
  }, []);

  const handleLotChange = useCallback((lotId: string) => {
    setWizardData(prev => ({
      ...prev,
      lotId,
      lotProductId: '',
      soLoKien: '',
      khoiLuong: 0,
    }));
  }, []);

  const handleKienChange = useCallback(
    (kienId: string) => {
      const chosen = kienList.find(k => k.id === kienId) ?? null;
      if (!chosen) {
        setWizardData(prev => ({
          ...prev,
          lotProductId: kienId,
          tenHangHoa: '',
          maSanPham: '',
          soLoKien: '',
          khoiLuong: 0,
        }));
        return;
      }
      const lot = lots.find(l => l.id === wizardData.lotId);
      // Prefer the package's own code: it is what the picker showed and what the
      // worker can look the package up by later. The lot-plus-id-fragment form is
      // only a fallback for packages recorded before maKien existed.
      const soLoKienLabel = chosen.maKien || `${lot?.tenLo ?? ''}-${kienId.slice(-4)}`;
      setWizardData(prev => ({
        ...prev,
        lotProductId: kienId,
        tenHangHoa: chosen.internationalProduct?.tenSanPham ?? prev.tenHangHoa,
        maSanPham: chosen.internationalProduct?.maSanPham ?? prev.maSanPham,
        soLoKien: soLoKienLabel,
        khoiLuong: 0,
      }));
    },
    [kienList, lots, wizardData.lotId],
  );

  const handleKhoiLuongChange = useCallback((val: number) => {
    setWizardData(prev => ({ ...prev, khoiLuong: val }));
  }, []);

  // ─── Step-4 (Đánh giá + File) ────────────────────────────────────────────
  const handleDanhGiaToggle = useCallback(
    (field: 'danhGiaTruocNgam' | 'danhGiaSauNgam', code: string) => {
      setWizardData(prev => {
        const current = (prev[field] || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        const idx = current.indexOf(code);
        const updated = idx >= 0 ? current.filter(s => s !== code) : [...current, code];
        return { ...prev, [field]: updated.join(', ') };
      });
    },
    [],
  );

  const handleFilePick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > 20 * 1024 * 1024) {
      toast.error('File vượt quá 20MB. Vui lòng chọn file nhỏ hơn.');
      e.target.value = '';
      return;
    }
    setWizardData(prev => ({ ...prev, file: f }));
    // reset input để cùng file có thể chọn lại
    e.target.value = '';
  }, []);

  const handleFileRemove = useCallback(() => {
    setWizardData(prev => ({ ...prev, file: null }));
  }, []);

  // ─── Derive thoiGianChien from the selected scheduled batch (Defect 2) ────
  const selectedBatch: ScheduledBatch | undefined = useMemo(
    () => scheduledBatches.find(b => b.code === selectedMaChien),
    [scheduledBatches, selectedMaChien],
  );

  /** Build naive local-time string from production day + batch startTime.
   * MC-13 to MC-16 have isNextCalendarDay=true (00:30, 02:00, 03:30, 05:00),
   * meaning their clock time falls on the calendar day AFTER the production day.
   * Emits "YYYY-MM-DDTHH:mm:00" (no timezone suffix) — backend interprets via APP_TZ. */
  const derivedThoiGianChien: string = useMemo(() => {
    if (!selectedBatch) return '';
    const { hour, minute } = selectedBatch.startTime;
    return deriveThoiGianChien(scheduleProductionDay, hour, minute, selectedBatch.isNextCalendarDay);
  }, [selectedBatch, scheduleProductionDay]);

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (khoiLuongExceeded) {
      toast.error('Khối lượng xuất vượt tồn kho');
      return;
    }
    if (!selectedMaChien) {
      toast.error('Chưa chọn mã chiên');
      return;
    }
    if (!derivedThoiGianChien) {
      toast.error('Không xác định được thời gian chiên cho mã này');
      return;
    }

    const payload = {
      maChien: selectedMaChien,
      thoiGianChien: derivedThoiGianChien,
      ca: selectedShift,
      tenHangHoa: wizardData.tenHangHoa,
      maSanPham: wizardData.maSanPham || undefined,
      soLoKien: wizardData.soLoKien,
      khoiLuong: wizardData.khoiLuong,
      soLanNgam: wizardData.soLanNgam,
      nhietDoNuocTruocNgam: wizardData.nhietDoNuocTruocNgam,
      nhietDoNuocSauVot: wizardData.nhietDoNuocSauVot,
      thoiGianNgam: wizardData.thoiGianNgam,
      brixNuocNgam: wizardData.brixNuocNgam,
      danhGiaTruocNgam: wizardData.danhGiaTruocNgam,
      danhGiaSauNgam: wizardData.danhGiaSauNgam,
      ghiChu: wizardData.ghiChu || undefined,
      nguoiThucHien,
      ...(wizardData.lotProductId ? { lotProductId: wizardData.lotProductId } : {}),
    };

    try {
      setSubmitting(true);
      // Create new record
      await materialEvaluationService.createMaterialEvaluation(
        payload,
        wizardData.file ?? undefined,
      );

      // Invalidate all materialEvaluation-rooted caches (desktop list + kiosk batches + today chips)
      queryClient.invalidateQueries({ queryKey: materialEvaluationKeys.all });
      queryClient.invalidateQueries({ queryKey: rawMaterialKeys.list() });
      queryClient.invalidateQueries({ queryKey: lotsByProductKeys.lists() });
      queryClient.invalidateQueries({ queryKey: kienByProductAndLotKeys.lists() });
      queryClient.invalidateQueries({ queryKey: lotProductKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['warehouseIssues'] });

      toast.success('Đã lưu đánh giá nguyên liệu');
      if (draftKey) localStorage.removeItem(draftKey);
      draftLoaded.current = true;
      setWizardData(initialWizardData);
      setSelectedMaChien('');
      setCurrentStep(2);
    } catch (err: any) {
      toast.error('Lỗi khi lưu: ' + (err?.message ?? 'Không xác định'));
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    khoiLuongExceeded,
    wizardData,
    selectedShift,
    selectedMaChien,
    nguoiThucHien,
    derivedThoiGianChien,
    draftKey,
    queryClient,
  ]);

  // ─── Session guards ──────────────────────────────────────────────────────
  if (!isKioskTab() && !hasKioskSession()) return <NotActivatedScreen />;
  if (kioskExpired) return <ExpiredScreen />;
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
            className="w-full min-h-[48px] px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            disabled={!deviceKeyInput.trim()}
            onClick={() => { setDeviceKey(deviceKeyInput.trim()); setDeviceKeyInput(''); }}
            className="w-full min-h-[48px] bg-blue-600 text-white rounded-xl font-medium disabled:opacity-40"
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
                className="w-full min-h-[48px] px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                disabled={!deviceName.trim() || registering}
                onClick={async () => {
                  setRegistering(true);
                  try {
                    const res = await faceAttendanceService.createDevice(deviceName.trim(), undefined, 'DATA_ENTRY');
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
                className="w-full min-h-[48px] bg-green-600 text-white rounded-xl font-medium disabled:opacity-40 flex items-center justify-center gap-2"
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
  // ─── Shift selection gate (FIRST GATE) ───────────────────────────────────
  if (!selectedShift) {
    return (
      <ShiftSelectionScreen
        onSelect={handleShiftSelect}
        onBack={handleBackToRoot}
      />
    );
  }
  // ─── Operator selection gate (SECOND GATE) ────────────────────────────────
  if (!nguoiThucHien) {
    return (
      <OperatorSelectionScreen
        onSelect={handleOperatorSelect}
        onBack={() => { setNguoiThucHien(''); setOperatorId(''); setSelectedShift(0); }}
        attendedOperators={attendedOperators}
        isLoadingAttended={isLoadingAttended}
      />
    );
  }

  // ─── Batch code selection gate (THIRD GATE) ─────────────────────────────
  if (!selectedMaChien) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 flex flex-col">
        {/* Header: back button + logo + spacer */}
        <div className="flex-shrink-0 flex items-center py-2">
          <button
            onClick={handleBackToOperator}
            className="flex items-center gap-2 text-base font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-6 h-6" />
            Quay lại
          </button>
          <img src="/abf-logo.png" alt="An Bình Foods" className="h-12 sm:h-16 object-contain mx-auto" />
          <div className="w-[110px]" aria-hidden />
        </div>

        {/* Title + context line */}
        <div className="flex-shrink-0 text-center py-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Chọn mã chiên</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {nguoiThucHien} <span className="text-gray-400">·</span> Ca {selectedShift}
            <span className="text-gray-400 mx-1">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="text-gray-500">Ngày SX:</span>
              <input
                type="date"
                value={productionDate}
                onChange={(e) => handleProductionDayChange(e.target.value)}
                className="min-h-[36px] px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </span>
          </p>
        </div>

        {/* Batch grid — fills remaining height */}
        {isLoadingSchedule ? (
          <div className="flex-1 flex items-center justify-center gap-3 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-xl">Đang tải lịch trình...</span>
          </div>
        ) : scheduledBatches.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <AlertTriangle className="w-12 h-12 mb-3 text-amber-500" />
            <p className="text-xl">Không có mã chiên nào cho ca này</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-3 mt-2">
            <div className="grid flex-1 min-h-0 w-full grid-cols-2 landscape:grid-cols-3 gap-3 sm:gap-4">
              {scheduledBatches.map((batch) => {
                const hasRecord = existingByCode.has(batch.code);
                const startLabel = `${String(batch.startTime.hour).padStart(2, '0')}:${String(batch.startTime.minute).padStart(2, '0')}`;
                return (
                  <button
                    key={batch.code}
                    type="button"
                    onClick={() => handleBatchSelect(batch.code)}
                    className={`h-full w-full rounded-3xl shadow-lg transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl flex flex-col items-center justify-center text-center p-4 ${
                      hasRecord
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                  >
                    <span className="text-4xl sm:text-5xl font-black mb-1">{batch.code}</span>
                    <span className="text-xl sm:text-2xl font-bold opacity-80">{startLabel}</span>
                    {hasRecord && (
                      <CheckCircle className="w-7 h-7 mt-2 opacity-90" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex-shrink-0 flex items-center justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-lg bg-blue-500" />
                <span>Chưa nhập</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-lg bg-green-500 flex items-center justify-center">
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                </div>
                <span>Đã có dữ liệu (xem)</span>
              </div>
            </div>
          </div>
        )}

        {/* Powered by Koola */}
        <div className="flex-shrink-0 flex items-center justify-center gap-2 py-2 opacity-60">
          <span className="text-xs text-gray-500">Powered by</span>
          <img src="/koola-logo.png" alt="Koola" className="h-4 object-contain" />
          <span className="text-xs font-semibold text-gray-400">KOOLA</span>
        </div>

        {viewingEvalId && (
          <EvaluationDetailReadOnly
            id={viewingEvalId}
            onClose={() => setViewingEvalId(null)}
          />
        )}
      </div>
    );
  }

  // ─── Wizard shell ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm transition-all duration-150">
        <div className={`max-w-4xl mx-auto px-4 flex items-center justify-between gap-3 ${keyboardOpen ? 'py-2' : 'py-3'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <img src="/abf-logo.png" alt="An Bình Foods" className={`h-9 object-contain ${keyboardOpen ? 'hidden' : 'hidden sm:block'}`} />
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-gray-800 truncate">
                Nhập {selectedMaChien}
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
              className="flex items-center gap-1.5 min-h-[44px] px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Đổi người</span>
            </button>
            <button
              type="button"
              onClick={handleChangeShift}
              title="Đổi ca làm việc"
              className="flex items-center gap-1.5 min-h-[44px] px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <CalendarClock className="w-4 h-4" />
              <span className="hidden sm:inline">Đổi ca</span>
            </button>
          </div>
        </div>

        {/* Today's evaluations — chip list */}
        <div className={`max-w-4xl mx-auto px-4 pb-2 pt-1 border-t border-gray-100 ${keyboardOpen ? 'hidden' : ''}`}>
          {todayEvals.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
              <span aria-hidden="true">📋</span>
              <span>Chưa có đánh giá nào hôm nay</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 shrink-0 text-xs text-gray-500 whitespace-nowrap">
                <span aria-hidden="true">📋</span>
                <span>Hôm nay đã tạo ({todayEvals.length}):</span>
              </div>
              <div className="flex gap-2 overflow-x-auto py-1 flex-1">
                {todayEvals.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => setViewingEvalId(ev.id)}
                    className="px-3 py-1 min-h-[44px] bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm font-medium hover:bg-blue-100 whitespace-nowrap flex-shrink-0"
                    title={`Xem chi tiết ${ev.maChien}`}
                  >
                    {ev.maChien}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <StepProgress currentStep={currentStep} className={keyboardOpen ? 'hidden' : ''} />
      </div>

      {/* Content */}
      <div className="flex-1 py-6 pb-24">
        {currentStep === 2 && (
          <div className="max-w-2xl mx-auto px-4 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Nguyên liệu xuất từ kho
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mã hàng hóa <span className="text-red-500">*</span>
              </label>
              <RawMaterialPicker
                products={rawMaterials}
                value={wizardData.productId}
                onChange={handleProductChange}
                loading={loadingRawMaterials}
                isError={rawMaterialsError}
                onRetry={refetchRawMaterials}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lô <span className="text-red-500">*</span>
              </label>
              <CascadePicker
                options={lotOptions}
                value={wizardData.lotId}
                onChange={handleLotChange}
                disabled={!wizardData.productId}
                loading={loadingLots}
                placeholderDisabled="-- Chọn sản phẩm trước --"
                placeholderReady="-- Chọn lô --"
                emptyMessage="Không có lô tồn kho"
                overlayTitle="Chọn lô"
                searchPlaceholder="Tìm theo tên lô hoặc kho..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kiện <span className="text-red-500">*</span>
              </label>
              <CascadePicker
                options={kienOptions}
                value={wizardData.lotProductId}
                onChange={handleKienChange}
                disabled={!wizardData.lotId}
                loading={loadingKien}
                placeholderDisabled="-- Chọn lô trước --"
                placeholderReady="-- Chọn kiện --"
                emptyMessage="Không có kiện tồn kho"
                overlayTitle="Chọn kiện"
                searchPlaceholder="Tìm theo kiện..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Khối lượng xuất (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                max={selectedKien?.soLuong ?? undefined}
                value={wizardData.khoiLuong === 0 ? '' : wizardData.khoiLuong}
                onChange={(e) => handleKhoiLuongChange(parseNumberInput(e.target.value, { min: 0, max: PRODUCTION_LIMITS.khoiLuong.max }))}
                placeholder="0"
                disabled={!wizardData.lotProductId}
                onFocus={wizardData.lotProductId ? (e) => { e.target.blur(); setActiveEditorField('khoiLuong'); } : undefined}
                onClick={wizardData.lotProductId ? () => setActiveEditorField('khoiLuong') : undefined}
                className={`w-full min-h-[52px] px-3 py-2 border rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  khoiLuongExceeded ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {/* Quick-select buttons */}
              <div className="mt-2 flex flex-wrap gap-2">
                {[300, 350, 400].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleKhoiLuongChange(preset)}
                    disabled={!wizardData.lotProductId}
                    className={`min-h-[44px] px-4 py-2 rounded-lg text-base font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      wizardData.khoiLuong === preset
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {preset} kg
                  </button>
                ))}
              </div>
              {khoiLuongExceeded && selectedKien && (
                <p className="mt-1 text-xs text-red-600">
                  Vượt quá tồn kho ({selectedKien.soLuong} {selectedKien.donViTinh})
                </p>
              )}
            </div>

            {stockPreview && selectedKien && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tồn kiện hiện tại:</span>
                  <span className="font-medium">{stockPreview.current} {selectedKien.donViTinh}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Khối lượng xuất:</span>
                  <span className="font-medium text-orange-600">-{stockPreview.exporting} {selectedKien.donViTinh}</span>
                </div>
                <div className="border-t border-gray-200 pt-2">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Còn lại sau xuất:</span>
                    <span className={`font-medium ${
                      stockPreview.percentage > 20
                        ? 'text-green-600'
                        : stockPreview.percentage > 5
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }`}>
                      {stockPreview.remaining.toFixed(2)} {selectedKien.donViTinh} ({Math.max(0, stockPreview.percentage).toFixed(0)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-200 ${
                        stockPreview.percentage > 20
                          ? 'bg-green-500'
                          : stockPreview.percentage > 5
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, stockPreview.percentage))}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="max-w-2xl mx-auto px-4 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Beaker className="w-5 h-5 text-blue-600" />
              Thông số ngâm
            </h2>

            {/* Read-only derived time display (Defect 2) */}
            {selectedBatch && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  Thời gian chiên: <strong>{String(selectedBatch.startTime.hour).padStart(2, '0')}:{String(selectedBatch.startTime.minute).padStart(2, '0')}</strong>
                  {selectedBatch.isNextCalendarDay && <span className="ml-1 text-blue-600">(ngày kế)</span>}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số lần ngâm</label>
                <NumericInput
                  value={wizardData.soLanNgam}
                  onChange={(v) => setWizardData(prev => ({ ...prev, soLanNgam: v }))}
                  step="1"
                  integer
                  min={0}
                  max={PRODUCTION_LIMITS.soLanNgam.max}
                  onTap={() => setActiveEditorField('soLanNgam')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nhiệt độ nước trước ngâm (°C)</label>
                <NumericInput
                  value={wizardData.nhietDoNuocTruocNgam}
                  onChange={(v) => setWizardData(prev => ({ ...prev, nhietDoNuocTruocNgam: v }))}
                  min={0}
                  max={PRODUCTION_LIMITS.nhietDoNuocTruocNgam.max}
                  onTap={() => setActiveEditorField('nhietDoNuocTruocNgam')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nhiệt độ nước sau vớt (°C)</label>
                <NumericInput
                  value={wizardData.nhietDoNuocSauVot}
                  onChange={(v) => setWizardData(prev => ({ ...prev, nhietDoNuocSauVot: v }))}
                  min={0}
                  max={PRODUCTION_LIMITS.nhietDoNuocSauVot.max}
                  onTap={() => setActiveEditorField('nhietDoNuocSauVot')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian ngâm (Phút)</label>
                <NumericInput
                  value={wizardData.thoiGianNgam}
                  onChange={(v) => setWizardData(prev => ({ ...prev, thoiGianNgam: v }))}
                  step="1"
                  integer
                  min={0}
                  max={PRODUCTION_LIMITS.thoiGianNgam.max}
                  onTap={() => setActiveEditorField('thoiGianNgam')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brix nước ngâm</label>
                <NumericInput
                  value={wizardData.brixNuocNgam}
                  onChange={(v) => setWizardData(prev => ({ ...prev, brixNuocNgam: v }))}
                  min={0}
                  max={PRODUCTION_LIMITS.brixNuocNgam.max}
                  onTap={() => setActiveEditorField('brixNuocNgam')}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="max-w-2xl mx-auto px-4 space-y-6">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
              Đánh giá &amp; File
            </h2>

            {criteriaLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Đang tải danh mục đánh giá...
              </div>
            ) : criteriaError ? (
              <div className="border border-red-200 bg-red-50 rounded-lg p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <p className="text-sm text-red-800 mb-3">
                  Không tải được danh mục đánh giá. Không thể chấm điểm khi thiếu danh mục.
                </p>
                <button
                  type="button"
                  onClick={() => void refetchCriteria()}
                  className="min-h-[44px] px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium"
                >
                  Thử lại
                </button>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Đánh giá trước ngâm
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-3 border border-gray-300 rounded-lg bg-white">
                    {criteria.map(c => {
                      const selected = (wizardData.danhGiaTruocNgam || '')
                        .split(',')
                        .map(s => s.trim())
                        .includes(String(c.code));
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 text-base cursor-pointer hover:bg-gray-50 px-2 py-2 rounded min-h-[44px]"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleDanhGiaToggle('danhGiaTruocNgam', String(c.code))}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{c.code}. {c.description}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Đánh giá sau ngâm
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-3 border border-gray-300 rounded-lg bg-white">
                    {criteria.map(c => {
                      const selected = (wizardData.danhGiaSauNgam || '')
                        .split(',')
                        .map(s => s.trim())
                        .includes(String(c.code));
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 text-base cursor-pointer hover:bg-gray-50 px-2 py-2 rounded min-h-[44px]"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => handleDanhGiaToggle('danhGiaSauNgam', String(c.code))}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{c.code}. {c.description}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ghi chú (tuỳ chọn)
              </label>
              <textarea
                value={wizardData.ghiChu}
                onChange={(e) => setWizardData(prev => ({ ...prev, ghiChu: e.target.value }))}
                placeholder="Nhập ghi chú nếu có..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ảnh nguyên liệu (tuỳ chọn)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              {!wizardData.file && (
                <button
                  type="button"
                  onClick={handleFilePick}
                  className="w-full min-h-[64px] flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-base font-medium">Chụp ảnh hoặc chọn ảnh</span>
                </button>
              )}
              {wizardData.file && (
                <div className="border border-gray-200 rounded-lg p-3 bg-white">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{wizardData.file.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {(wizardData.file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleFileRemove}
                      className="shrink-0 p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-red-600"
                      title="Xoá ảnh"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {filePreviewUrl && (
                    <img
                      src={filePreviewUrl}
                      alt="Ảnh nguyên liệu"
                      className="mt-3 max-h-48 rounded-lg border border-gray-200"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer — nút điều hướng: Quay lại (trái) + Tiếp tục/Xác nhận (phải) */}
      <div className={`fixed bottom-0 left-0 right-0 bg-white border-t z-10 transition-transform duration-200 ${keyboardOpen ? 'translate-y-full' : ''}`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {currentStep > FIRST_STEP ? (
            <button
              type="button"
              onClick={handleBack}
              className="min-h-[52px] px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg text-base font-medium flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
              Quay lại
            </button>
          ) : (
            <button
              type="button"
              onClick={handleBackToBatchSelect}
              className="min-h-[52px] px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg text-base font-medium flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
              Chọn mã khác
            </button>
          )}
          {currentStep < LAST_STEP ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!isStepValid(currentStep)}
              className="min-h-[52px] px-8 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-base font-semibold flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Tiếp tục
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || khoiLuongExceeded}
              className="min-h-[52px] px-8 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-base font-semibold flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Xác nhận & Lưu
            </button>
          )}
        </div>
      </div>

      {viewingEvalId && (
        <EvaluationDetailReadOnly
          id={viewingEvalId}
          onClose={() => setViewingEvalId(null)}
        />
      )}

      {/* FieldFocusEditor overlay */}
      {(() => {
        const fieldsForStep = MATERIAL_EVAL_FIELDS.filter(f => f.step === currentStep);
        const fieldIdx = activeEditorField ? fieldsForStep.findIndex(f => f.key === activeEditorField) : -1;
        const fieldCfg = fieldIdx >= 0 ? fieldsForStep[fieldIdx] : null;
        const nextField = fieldIdx >= 0 && fieldIdx < fieldsForStep.length - 1 ? fieldsForStep[fieldIdx + 1] : null;
        return (
          <FieldFocusEditor
            open={!!activeEditorField && !!fieldCfg}
            label={fieldCfg?.label ?? ''}
            value={activeEditorField ? (wizardData[activeEditorField] as number) : 0}
            unit={fieldCfg?.unit}
            integer={fieldCfg?.integer}
            min={fieldCfg?.min}
            max={fieldCfg?.max}
            suggestions={fieldCfg?.suggestions}
            onChange={(v) => { if (activeEditorField) setWizardData(prev => ({ ...prev, [activeEditorField]: v })); }}
            onNext={nextField ? () => setActiveEditorField(nextField.key) : undefined}
            onClose={() => setActiveEditorField(null)}
          />
        );
      })()}

      <KioskFooter />
    </div>
  );
};

export default ProductionMaterialEvaluationEntry;




