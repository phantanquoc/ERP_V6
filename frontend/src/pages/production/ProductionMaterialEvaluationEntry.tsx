import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  Save,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  LogOut,
  Camera,
  Package,
  Beaker,
  Clock,
  ClipboardCheck,
  User,
  X,
} from 'lucide-react';
import {
  markTab,
  isKioskTab,
  hasKioskSession,
  KIOSK_EXPIRED_EVENT,
  getSelection,
  setSelection,
  clearSelection,
} from '../../utils/kioskSession';
import { parseNumberInput } from '../../utils/numberInput';
import { getQuickTimesForShift, computeShiftDatetime } from '../../utils/shiftTime';
import { useRawMaterials, rawMaterialKeys } from '../../hooks/useRawMaterials';
import { useLotsByProduct, lotsByProductKeys } from '../../hooks/useLotsByProduct';
import { useKienByProductAndLot, kienByProductAndLotKeys } from '../../hooks/useKienByProductAndLot';
import materialEvaluationService from '../../services/materialEvaluationService';
import materialEvaluationCriteriaService, { MaterialEvaluationCriteria } from '../../services/materialEvaluationCriteriaService';
import { lotProductKeys } from '../../services/lotProductService';
import DateTimePicker from '../../components/DateTimePicker';
import OperatorSelectionScreen from '../../components/production/OperatorSelectionScreen';
import ShiftSelectionScreen from '../../components/production/ShiftSelectionScreen';
import EvaluationDetailReadOnly from '../../components/production/EvaluationDetailReadOnly';

// ─── Types ───────────────────────────────────────────────────────────────────

type WizardStep = 2 | 3 | 4 | 5;

interface WizardData {
  // Step 2 (Nguyên liệu)
  productId: string;
  lotId: string;
  lotProductId: string;
  tenHangHoa: string;
  soLoKien: string;
  khoiLuong: number;
  // Step 3 (Thời gian)
  thoiGianChien: string;
  // Step 4 (Thông số)
  soLanNgam: number;
  nhietDoNuocTruocNgam: number;
  nhietDoNuocSauVot: number;
  thoiGianNgam: number;
  brixNuocNgam: number;
  // Step 5 (Đánh giá + File)
  danhGiaTruocNgam: string;
  danhGiaSauNgam: string;
  file: File | null;
}

const initialWizardData: WizardData = {
  productId: '',
  lotId: '',
  lotProductId: '',
  tenHangHoa: '',
  soLoKien: '',
  khoiLuong: 0,
  thoiGianChien: '',
  soLanNgam: 0,
  nhietDoNuocTruocNgam: 0,
  nhietDoNuocSauVot: 0,
  thoiGianNgam: 0,
  brixNuocNgam: 0,
  danhGiaTruocNgam: '',
  danhGiaSauNgam: '',
  file: null,
};

const DRAFT_KEY_PREFIX = 'material-eval-draft';

function getDraftKey(operator: string, shift: number, date: string): string {
  return `${DRAFT_KEY_PREFIX}|${operator}|${shift}|${date}`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
}

const NumericInput: React.FC<NumericInputProps> = ({ value, onChange, placeholder, step }) => (
  <input
    type="number"
    inputMode="decimal"
    step={step ?? '0.1'}
    placeholder={placeholder ?? '0'}
    className="w-full min-h-[52px] px-3 py-2 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    value={value === 0 ? '' : value}
    onChange={(e) => onChange(parseNumberInput(e.target.value))}
  />
);

// ─── Step Progress ───────────────────────────────────────────────────────────

interface StepProgressProps {
  currentStep: WizardStep;
}

const STEP_INFO: { step: WizardStep | 1; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { step: 1, icon: User, label: 'Người + Ca' },
  { step: 2, icon: Package, label: 'Nguyên liệu' },
  { step: 3, icon: Clock, label: 'Thời gian' },
  { step: 4, icon: Beaker, label: 'Thông số' },
  { step: 5, icon: ClipboardCheck, label: 'Đánh giá' },
];

const StepProgress: React.FC<StepProgressProps> = ({ currentStep }) => (
  <div className="w-full max-w-3xl mx-auto px-4 py-4">
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
                className={`text-xs font-medium text-center ${
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

// ─── Main Component ──────────────────────────────────────────────────────────

const ProductionMaterialEvaluationEntry: React.FC = () => {
  const queryClient = useQueryClient();
  const [kioskExpired, setKioskExpired] = useState(false);
  const [nguoiThucHien, setNguoiThucHien] = useState<string>(() => getSelection()?.operator ?? '');
  const [selectedShift, setSelectedShift] = useState<number>(() => getSelection()?.shift ?? 0);
  const [productionDate, setProductionDate] = useState<string>(() => {
    const stored = getSelection()?.date;
    return stored && stored.length > 0 ? stored : todayStr();
  });

  const [currentStep, setCurrentStep] = useState<WizardStep>(2);
  const [wizardData, setWizardData] = useState<WizardData>(initialWizardData);
  const [submitting, setSubmitting] = useState(false);
  const [criteria, setCriteria] = useState<MaterialEvaluationCriteria[]>([]);
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [viewingEvalId, setViewingEvalId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftLoaded = useRef<boolean>(false);
  const previewUrlRef = useRef<string | null>(null);

  // ─── Today's evaluations (chip list) ──────────────────────────────────────
  const todayStartISO = useMemo(() => {
    const [y, m, d] = productionDate.split('-').map(Number);
    if (!y || !m || !d) return new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
  }, [productionDate]);

  const { data: todayEvalsResult } = useQuery({
    queryKey: ['material-eval-today', nguoiThucHien, productionDate],
    queryFn: () =>
      materialEvaluationService.getAllMaterialEvaluations(1, 100, {
        nguoiThucHien,
        dateFrom: todayStartISO,
      }),
    enabled: !!nguoiThucHien,
    staleTime: 0,
  });
  const todayEvals = todayEvalsResult?.data ?? [];

  // ─── Mark tab as kiosk ────────────────────────────────────────────────────
  useEffect(() => {
    markTab();
  }, []);

  // ─── Listen for kiosk-expired events ──────────────────────────────────────
  useEffect(() => {
    const handler = () => setKioskExpired(true);
    window.addEventListener(KIOSK_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(KIOSK_EXPIRED_EVENT, handler);
  }, []);

  // ─── Persist selection to sessionStorage ──────────────────────────────────
  useEffect(() => {
    if (!nguoiThucHien) return;
    setSelection({
      operator: nguoiThucHien,
      shift: selectedShift,
      date: productionDate,
      activeTab: '',
    });
  }, [nguoiThucHien, selectedShift, productionDate]);

  // ─── Load criteria on mount ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setCriteriaLoading(true);
        const data = await materialEvaluationCriteriaService.getAllCriteria();
        if (!cancelled) setCriteria(data);
      } catch (err) {
        console.error('Load criteria failed', err);
      } finally {
        if (!cancelled) setCriteriaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Data hooks (cascade kho) ─────────────────────────────────────────────
  const { data: rawMaterials = [], isLoading: loadingRawMaterials } = useRawMaterials();
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
    localStorage.setItem(draftKey, JSON.stringify(rest));
  }, [wizardData, draftKey]);

  // ─── File preview URL cleanup ─────────────────────────────────────────────
  const filePreviewUrl = useMemo(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (wizardData.file) {
      const url = URL.createObjectURL(wizardData.file);
      previewUrlRef.current = url;
      return url;
    }
    return null;
  }, [wizardData.file]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, []);

  // ─── Handlers: operator + shift + session end ─────────────────────────────
  const handleOperatorSelect = useCallback((name: string) => {
    setNguoiThucHien(name);
  }, []);

  const handleShiftSelect = useCallback((shift: number) => {
    setSelectedShift(shift);
  }, []);

  const handleBackToOperator = useCallback(() => {
    clearSelection();
    setNguoiThucHien('');
    setSelectedShift(0);
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
      wizardData.thoiGianChien !== '' ||
      wizardData.soLanNgam > 0 ||
      wizardData.nhietDoNuocTruocNgam > 0 ||
      wizardData.nhietDoNuocSauVot > 0 ||
      wizardData.thoiGianNgam > 0 ||
      wizardData.brixNuocNgam > 0 ||
      wizardData.danhGiaTruocNgam !== '' ||
      wizardData.danhGiaSauNgam !== '' ||
      wizardData.file !== null
    );
  }, [wizardData]);

  const handleEndSession = useCallback(() => {
    if (isWizardDirty() && !window.confirm('Đánh giá đang nhập dở sẽ mất. Kết thúc phiên?')) {
      return;
    }
    if (draftKey) localStorage.removeItem(draftKey);
    clearSelection();
    setNguoiThucHien('');
    setSelectedShift(0);
    setProductionDate(todayStr());
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
      if (step === 3) {
        return wizardData.thoiGianChien.length > 0;
      }
      // step 4 (thông số) và step 5 (đánh giá + file): không bắt buộc, cho lưu ngay cả khi rỗng
      return true;
    },
    [wizardData, khoiLuongExceeded],
  );

  const handleNext = useCallback(() => {
    if (!isStepValid(currentStep)) return;
    setCurrentStep(prev => (prev < 5 ? ((prev + 1) as WizardStep) : prev));
  }, [currentStep, isStepValid]);

  const handleBack = useCallback(() => {
    setCurrentStep(prev => (prev > 2 ? ((prev - 1) as WizardStep) : prev));
  }, []);

  // ─── Step-2 (Nguyên liệu) field handlers ──────────────────────────────────
  const handleProductChange = useCallback((productId: string) => {
    setWizardData(prev => ({
      ...prev,
      productId,
      lotId: '',
      lotProductId: '',
      tenHangHoa: '',
      soLoKien: '',
      khoiLuong: 0,
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
          soLoKien: '',
          khoiLuong: 0,
        }));
        return;
      }
      const lot = lots.find(l => l.id === wizardData.lotId);
      const soLoKienLabel = `${lot?.tenLo ?? ''}-${kienId.slice(-4)}`;
      setWizardData(prev => ({
        ...prev,
        lotProductId: kienId,
        tenHangHoa: chosen.internationalProduct?.tenSanPham ?? prev.tenHangHoa,
        soLoKien: soLoKienLabel,
        khoiLuong: 0,
      }));
    },
    [kienList, lots, wizardData.lotId],
  );

  const handleKhoiLuongChange = useCallback((val: number) => {
    setWizardData(prev => ({ ...prev, khoiLuong: val }));
  }, []);

  // ─── Step-3 (Thời gian) ──────────────────────────────────────────────────
  const handleThoiGianChange = useCallback((datetime: string) => {
    setWizardData(prev => ({ ...prev, thoiGianChien: datetime }));
  }, []);

  const handleQuickTime = useCallback(
    (time: string) => {
      if (!selectedShift) return;
      setWizardData(prev => ({
        ...prev,
        thoiGianChien: computeShiftDatetime(selectedShift, time),
      }));
    },
    [selectedShift],
  );

  // ─── Step-5 (Đánh giá + File) ────────────────────────────────────────────
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
    setWizardData(prev => ({ ...prev, file: f }));
    // reset input để cùng file có thể chọn lại
    e.target.value = '';
  }, []);

  const handleFileRemove = useCallback(() => {
    setWizardData(prev => ({ ...prev, file: null }));
  }, []);

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (khoiLuongExceeded) {
      toast.error('Khối lượng xuất vượt tồn kho');
      return;
    }

    const iso = wizardData.thoiGianChien
      ? new Date(wizardData.thoiGianChien).toISOString()
      : '';

    // Sinh mã chiên trước khi build payload để tránh conflict unique key
    // (backend maChien là String @unique — nếu gửi '' sẽ đụng row đầu tiên).
    let maChien: string;
    try {
      maChien = await materialEvaluationService.generateMaChien();
    } catch (err) {
      toast.error('Không thể sinh mã chiên. Vui lòng thử lại.');
      return;
    }

    const payload = {
      maChien,
      thoiGianChien: iso,
      ca: selectedShift,
      tenHangHoa: wizardData.tenHangHoa,
      soLoKien: wizardData.soLoKien,
      khoiLuong: wizardData.khoiLuong,
      soLanNgam: wizardData.soLanNgam,
      nhietDoNuocTruocNgam: wizardData.nhietDoNuocTruocNgam,
      nhietDoNuocSauVot: wizardData.nhietDoNuocSauVot,
      thoiGianNgam: wizardData.thoiGianNgam,
      brixNuocNgam: wizardData.brixNuocNgam,
      danhGiaTruocNgam: wizardData.danhGiaTruocNgam,
      danhGiaSauNgam: wizardData.danhGiaSauNgam,
      nguoiThucHien,
      ...(wizardData.lotProductId ? { lotProductId: wizardData.lotProductId } : {}),
    };

    try {
      setSubmitting(true);
      await materialEvaluationService.createMaterialEvaluation(
        payload,
        wizardData.file ?? undefined,
      );

      // Invalidate stock-related caches so the next entry sees fresh tồn
      queryClient.invalidateQueries({ queryKey: ['materialEvaluations'] });
      queryClient.invalidateQueries({ queryKey: ['material-eval-today'] });
      queryClient.invalidateQueries({ queryKey: rawMaterialKeys.list() });
      queryClient.invalidateQueries({ queryKey: lotsByProductKeys.lists() });
      queryClient.invalidateQueries({ queryKey: kienByProductAndLotKeys.lists() });
      queryClient.invalidateQueries({ queryKey: lotProductKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['warehouseIssues'] });

      toast.success('Đã lưu đánh giá nguyên liệu');
      if (draftKey) localStorage.removeItem(draftKey);
      draftLoaded.current = true;
      setWizardData(initialWizardData);
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
    nguoiThucHien,
    draftKey,
    queryClient,
  ]);

  // ─── Session guards ──────────────────────────────────────────────────────
  if (!isKioskTab() && !hasKioskSession()) return <NotActivatedScreen />;
  if (kioskExpired) return <ExpiredScreen />;
  if (isKioskTab() && !hasKioskSession()) return <NotActivatedScreen />;
  if (!nguoiThucHien) return <OperatorSelectionScreen onSelect={handleOperatorSelect} />;
  if (!selectedShift) {
    return (
      <ShiftSelectionScreen
        onSelect={handleShiftSelect}
        onBack={handleBackToOperator}
        operatorName={nguoiThucHien}
      />
    );
  }

  const quickTimes = getQuickTimesForShift(selectedShift);

  // ─── Wizard shell ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleEndSession}
            className="flex items-center gap-1.5 min-h-[44px] px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <LogOut className="w-4 h-4" />
            Kết thúc phiên
          </button>
          <div className="text-center flex-1">
            <p className="text-sm text-gray-700 font-medium">
              Đánh giá nguyên liệu · {nguoiThucHien} · Ca {selectedShift}
            </p>
          </div>
          <div className="w-[132px]" aria-hidden="true" />
        </div>

        {/* Today's evaluations — chip list */}
        <div className="max-w-4xl mx-auto px-4 pb-2 pt-1 border-t border-gray-100">
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
                    className="px-3 py-1 min-h-[36px] bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm font-medium hover:bg-blue-100 whitespace-nowrap flex-shrink-0"
                    title={`Xem chi tiết ${ev.maChien}`}
                  >
                    {ev.maChien}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <StepProgress currentStep={currentStep} />
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
                Sản phẩm nguyên liệu <span className="text-red-500">*</span>
              </label>
              <select
                value={wizardData.productId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full min-h-[52px] px-3 py-2 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">
                  {loadingRawMaterials ? 'Đang tải...' : '-- Chọn sản phẩm --'}
                </option>
                {rawMaterials.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.maSanPham} – {p.tenSanPham}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lô <span className="text-red-500">*</span>
              </label>
              <select
                value={wizardData.lotId}
                onChange={(e) => handleLotChange(e.target.value)}
                disabled={!wizardData.productId}
                className="w-full min-h-[52px] px-3 py-2 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!wizardData.productId
                    ? '-- Chọn sản phẩm trước --'
                    : loadingLots
                    ? 'Đang tải...'
                    : lots.length === 0
                    ? 'Không có lô tồn kho'
                    : '-- Chọn lô --'}
                </option>
                {lots.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.tenLo}{l.warehouse ? ` (${l.warehouse.tenKho})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kiện <span className="text-red-500">*</span>
              </label>
              <select
                value={wizardData.lotProductId}
                onChange={(e) => handleKienChange(e.target.value)}
                disabled={!wizardData.lotId}
                className="w-full min-h-[52px] px-3 py-2 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!wizardData.lotId
                    ? '-- Chọn lô trước --'
                    : loadingKien
                    ? 'Đang tải...'
                    : kienList.length === 0
                    ? 'Không có kiện tồn kho'
                    : '-- Chọn kiện --'}
                </option>
                {kienList.map((k, idx) => (
                  <option key={k.id} value={k.id}>
                    Kiện {idx + 1} · Tồn {k.soLuong} {k.donViTinh}
                  </option>
                ))}
              </select>
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
                onChange={(e) => handleKhoiLuongChange(parseNumberInput(e.target.value))}
                placeholder="0"
                disabled={!wizardData.lotProductId}
                className={`w-full min-h-[52px] px-3 py-2 border rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  khoiLuongExceeded ? 'border-red-500' : 'border-gray-300'
                }`}
              />
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
              <Clock className="w-5 h-5 text-blue-600" />
              Thời gian chiên
            </h2>
            <DateTimePicker
              label="Thời gian chiên"
              value={wizardData.thoiGianChien}
              onChange={handleThoiGianChange}
              required
              placeholder="Chọn ngày và giờ chiên"
              allowClear
            />
            <div>
              <span className="text-xs text-gray-500 mb-2 block">Chọn nhanh giờ chiên cho Ca {selectedShift}:</span>
              <div className="flex flex-wrap gap-2">
                {quickTimes.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleQuickTime(time)}
                    className="px-3 py-2 min-h-[44px] text-base font-medium border border-blue-200 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 hover:border-blue-300 transition-colors"
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="max-w-2xl mx-auto px-4 space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Beaker className="w-5 h-5 text-blue-600" />
              Thông số chiên
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số lần ngâm</label>
                <NumericInput
                  value={wizardData.soLanNgam}
                  onChange={(v) => setWizardData(prev => ({ ...prev, soLanNgam: v }))}
                  step="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nhiệt độ nước trước ngâm (°C)</label>
                <NumericInput
                  value={wizardData.nhietDoNuocTruocNgam}
                  onChange={(v) => setWizardData(prev => ({ ...prev, nhietDoNuocTruocNgam: v }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nhiệt độ nước sau vớt (°C)</label>
                <NumericInput
                  value={wizardData.nhietDoNuocSauVot}
                  onChange={(v) => setWizardData(prev => ({ ...prev, nhietDoNuocSauVot: v }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian ngâm (Phút)</label>
                <NumericInput
                  value={wizardData.thoiGianNgam}
                  onChange={(v) => setWizardData(prev => ({ ...prev, thoiGianNgam: v }))}
                  step="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Brix nước ngâm</label>
                <NumericInput
                  value={wizardData.brixNuocNgam}
                  onChange={(v) => setWizardData(prev => ({ ...prev, brixNuocNgam: v }))}
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
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
                      <p className="text-xs text-gray-500 mt-0.5">
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

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {currentStep > 2 ? (
            <button
              type="button"
              onClick={handleBack}
              className="min-h-[52px] px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg text-base font-medium flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại
            </button>
          ) : (
            <span />
          )}

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!isStepValid(currentStep)}
              className="min-h-[52px] px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-base font-medium flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Tiếp tục
              <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || khoiLuongExceeded}
              className="min-h-[52px] px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-base font-semibold flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Xác nhận &amp; Lưu
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
    </div>
  );
};

export default ProductionMaterialEvaluationEntry;




