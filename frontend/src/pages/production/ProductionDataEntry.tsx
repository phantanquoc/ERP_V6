import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useActiveFryerMachineSystems } from '../../hooks/useMachineSystemDetails';
import {
  useFryBatchCodes,
  useAllFinishedProducts,
  useBatchUpdateFinishedProducts,
  filterBatchesByShiftAndDate,
  indexFinishedProducts,
  DirtyRecord,
  SaveResult,
  EntryHistoryRow,
} from '../../hooks/useProductionDataEntry';
import { useAttendedOperatorsByShift } from '../../hooks/useAttendedOperators';
import useVirtualKeyboard from '../../hooks/useVirtualKeyboard';
import useIsNarrowScreen from '../../hooks/useIsNarrowScreen';
import { useDebounce } from '../../hooks/useDebounce';
import { markTab, isKioskTab, hasKioskSession, KIOSK_EXPIRED_EVENT, getSelection, setSelection, clearSelection, getDeviceKey, setDeviceKey } from '../../utils/kioskSession';
import { parseNumberInput, PRODUCTION_LIMITS } from '../../utils/numberInput';
import { FinishedProduct } from '../../services/finishedProductService';
import OperatorSelectionScreen from '../../components/production/OperatorSelectionScreen';
import ShiftSelectionScreen from '../../components/production/ShiftSelectionScreen';
import KioskFooter from '../../components/production/KioskFooter';
import FieldFocusEditor from '../../components/production/FieldFocusEditor';
import { useAuth } from '../../contexts/AuthContext';
import { isAdmin } from '../../utils/permissions';
import faceAttendanceService from '../../services/faceAttendanceService';
import { Loader2, Save, CheckCircle, AlertTriangle, Eye, ArrowLeft, User, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Types ───────────────────────────────────────────────────────────────────

type QualityTab = 'A' | 'B' | 'B_DAU' | 'C' | 'UOT' | 'VUN_PHE';

interface TabConfig {
  key: QualityTab;
  label: string;
  field: keyof FinishedProduct | null; // null for waste tab
}

const QUALITY_TABS: TabConfig[] = [
  { key: 'A', label: 'Hàng A', field: 'aKhoiLuong' },
  { key: 'B', label: 'Hàng B', field: 'bKhoiLuong' },
  { key: 'B_DAU', label: 'Hàng B dầu', field: 'bDauKhoiLuong' },
  { key: 'C', label: 'Hàng C', field: 'cKhoiLuong' },
  { key: 'UOT', label: 'Ướt', field: 'uotKhoiLuong' },
  { key: 'VUN_PHE', label: 'Vụn - Phế phẩm', field: null },
];

// Cell key: `${maChien}|${machineSystemId}`
type CellKey = string;
// Board data: tab -> cellKey -> value (kg)
type BoardData = Record<QualityTab, Record<CellKey, number>>;
// Waste total for the shift
type WasteTotal = number;

// Draft stored in localStorage
interface DraftData {
  board: BoardData;
  wasteTotal: WasteTotal;
}

// Baseline: the loaded DB values per tab per cell
type BaselineData = Record<QualityTab, Record<CellKey, number>>;

const DRAFT_KEY_PREFIX = 'prod-output-draft';

function getDraftKey(date: string, shift: number): string {
  return `${DRAFT_KEY_PREFIX}|${date}|${shift}`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const VALID_TABS: QualityTab[] = ['A', 'B', 'B_DAU', 'C', 'UOT', 'VUN_PHE'];
function isValidTab(v: string): v is QualityTab {
  return (VALID_TABS as string[]).includes(v);
}

/**
 * Parse a stored draft, keeping only the shape we expect. A draft written before a
 * tab key changed, or one that is corrupt, must not be cast blindly into the board.
 * Returns null when nothing usable can be recovered.
 */
function parseDraft(raw: string): DraftData | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;

  const candidate = parsed as Partial<DraftData>;
  const board: BoardData = { A: {}, B: {}, B_DAU: {}, C: {}, UOT: {}, VUN_PHE: {} };

  if (candidate.board && typeof candidate.board === 'object') {
    for (const [tabKey, cells] of Object.entries(candidate.board)) {
      if (!isValidTab(tabKey) || !cells || typeof cells !== 'object') continue;
      for (const [cellKey, value] of Object.entries(cells as Record<string, unknown>)) {
        if (typeof value === 'number' && Number.isFinite(value)) {
          board[tabKey][cellKey] = value;
        }
      }
    }
  }

  const wasteTotal =
    typeof candidate.wasteTotal === 'number' && Number.isFinite(candidate.wasteTotal)
      ? candidate.wasteTotal
      : 0;

  return { board, wasteTotal };
}

function formatDateVN(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ─── Numeric Input Component ─────────────────────────────────────────────────

interface NumericInputProps {
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
  /** Called on tap to open FieldFocusEditor */
  onTap?: () => void;
}

// Memoized: the matrix renders batches × machines inputs (~64 on a full shift) and
// every keystroke replaces the board object, so without this one keystroke re-renders
// every cell.
const NumericInput: React.FC<NumericInputProps> = React.memo(({ value, onChange, placeholder, className, onTap }) => (
  <input
    type="number"
    inputMode="decimal"
    min={0}
    max={PRODUCTION_LIMITS.sanLuong.max}
    placeholder={placeholder || '0'}
    className={`w-full min-h-[44px] px-2 py-1 border border-gray-200 rounded-lg text-base text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${className || ''}`}
    value={value === 0 ? '' : value}
    onFocus={onTap ? (e) => { e.target.blur(); onTap(); } : undefined}
    onClick={onTap ? () => onTap() : undefined}
    onChange={(e) => onChange(parseNumberInput(e.target.value, { min: 0, max: PRODUCTION_LIMITS.sanLuong.max }))}
  />
));
NumericInput.displayName = 'NumericInput';

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

// ─── Full-Grid Editable Preview ─────────────────────────────────────────────

/** A fry batch as the board and preview need it. */
interface BatchRow {
  maChien: string;
  thoiGianChien: string;
  tenHangHoa: string;
  maSanPham?: string | null;
}

interface FullGridPreviewProps {
  board: BoardData;
  baseline: BaselineData;
  updateCell: (tab: QualityTab, cellKey: CellKey, value: number) => void;
  filteredBatches: BatchRow[];
  fryers: { id: string; maHeThong: string }[];
  wasteTotal: number;
  nguoiThucHien: string;
  productionDate: string;
  selectedShift: number;
  onConfirm: () => void;
  onEdit: () => void;
  isPending: boolean;
  getMachineLabel: (maHeThong: string) => string;
  /** Progress while a multi-cell save is running, so a long save is not a blank wait. */
  saveProgress?: { done: number; total: number } | null;
}

const FullGridPreview: React.FC<FullGridPreviewProps> = ({
  board,
  baseline,
  updateCell,
  filteredBatches,
  fryers,
  wasteTotal,
  nguoiThucHien,
  productionDate,
  selectedShift,
  onConfirm,
  onEdit,
  isPending,
  getMachineLabel,
  saveProgress,
}) => {
  const NON_WASTE_TABS: { key: QualityTab; label: string }[] = [
    { key: 'A', label: 'Hàng A' },
    { key: 'B', label: 'Hàng B' },
    { key: 'B_DAU', label: 'B dầu' },
    { key: 'C', label: 'Hàng C' },
    { key: 'UOT', label: 'Ướt' },
  ];

  const [showAll, setShowAll] = useState(false);
  // Focus editor state for preview cells
  const [previewEditorCell, setPreviewEditorCell] = useState<{ tab: QualityTab; cellKey: CellKey; label: string } | null>(null);

  // A cell qualifies when it holds a value or differs from the loaded baseline.
  const cellQualifies = useCallback(
    (tab: QualityTab, cellKey: CellKey): boolean => {
      const val = board[tab]?.[cellKey] ?? 0;
      const baseVal = baseline[tab]?.[cellKey] ?? 0;
      return val !== 0 || baseVal !== 0;
    },
    [board, baseline],
  );

  // Which grade columns of each card have qualifying cells. Memoized: this is
  // O(batches × grades × machines) and the preview re-renders on every keystroke
  // in its own focus editor.
  const cardsData = useMemo(
    () =>
      filteredBatches.map((batch) => {
        const qualifyingTabs: { key: QualityTab; label: string }[] = [];
        for (const tab of NON_WASTE_TABS) {
          const tabHasQualifying = fryers.some((f) =>
            cellQualifies(tab.key, `${batch.maChien}|${f.id}`),
          );
          if (tabHasQualifying) qualifyingTabs.push(tab);
        }
        return { batch, qualifyingTabs, hasAnyQualifying: qualifyingTabs.length > 0 };
      }),
    // NON_WASTE_TABS is a module-invariant literal rebuilt per render; excluded on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredBatches, fryers, cellQualifies],
  );

  const visibleCards = useMemo(
    () =>
      showAll
        ? filteredBatches.map((batch) => ({ batch, qualifyingTabs: NON_WASTE_TABS, hasAnyQualifying: true }))
        : cardsData.filter((c) => c.hasAnyQualifying),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showAll, filteredBatches, cardsData],
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-3 pt-0 pb-4 space-y-4">
        {/* Sticky header: action buttons + preview info */}
        <div className="sticky top-0 z-30 bg-gray-50 pt-3 pb-2 -mx-3 px-3 border-b border-gray-200 shadow-sm">
          <div className="bg-white border rounded-lg p-2 flex gap-3 mb-2">
            <button
              onClick={onEdit}
              className="flex-1 min-h-[44px] px-4 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Sửa lại
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {isPending && saveProgress && saveProgress.total > 0
                ? `Đang lưu ${saveProgress.done}/${saveProgress.total}`
                : 'Xác nhận'}
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-700 px-1 overflow-hidden min-w-0">
            <Eye className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="font-semibold flex-shrink-0 hidden sm:inline">Xem lại sản lượng</span>
            <span className="mx-1 text-gray-300 hidden sm:inline">|</span>
            <span className="truncate min-w-0">{nguoiThucHien}</span>
            <span className="mx-1 text-gray-300 flex-shrink-0">|</span>
            <span className="flex-shrink-0 whitespace-nowrap">{formatDateVN(productionDate)}</span>
            <span className="mx-1 text-gray-300 flex-shrink-0">|</span>
            <span className="flex-shrink-0 whitespace-nowrap">Ca {selectedShift}</span>
          </div>
        </div>

        {/* Reveal-all control */}
        {!showAll && visibleCards.length < filteredBatches.length && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full min-h-[44px] px-4 py-2 bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            Hiện tất cả ô để điền bù ({filteredBatches.length - visibleCards.length} mã chiên ẩn)
          </button>
        )}
        {showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="w-full min-h-[44px] px-4 py-2 bg-gray-100 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
          >
            Chỉ hiện ô đã nhập
          </button>
        )}

        {/* Cards - one per fry batch */}
        {visibleCards.length === 0 && (
          <div className="text-center py-8 bg-white rounded-lg border">
            <p className="text-gray-500">Không có dữ liệu sản lượng nào được nhập.</p>
            <p className="text-sm text-gray-400 mt-1">Quay lại bảng nhập để bắt đầu nhập liệu.</p>
          </div>
        )}

        {visibleCards.map(({ batch, qualifyingTabs }) => {
          const displayTabs = showAll ? NON_WASTE_TABS : qualifyingTabs;
          return (
            <div key={batch.maChien} className="bg-white rounded-lg border overflow-hidden">
              {/* Card header */}
              <div className="px-3 py-2 bg-gray-50 border-b">
                <p className="text-sm font-bold text-gray-800">{batch.maChien}</p>
                <p className="text-xs text-gray-500">
                  {formatTime(batch.thoiGianChien)}
                  {batch.maSanPham ? ` · ${batch.maSanPham}` : ''}
                </p>
              </div>
              {/* Sub-table: machines (rows) × grades (columns) */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse" style={{ minWidth: '300px' }}>
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="px-1 py-1.5 text-left font-semibold text-gray-700 border-r" style={{ width: '60px' }}>
                        Máy
                      </th>
                      {displayTabs.map((tab) => (
                        <th key={tab.key} className="px-1 py-1.5 text-center font-semibold text-gray-700 border-r" style={{ width: '80px' }}>
                          {tab.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fryers.map((f) => (
                      <tr key={f.id} className="border-b">
                        <td className="px-1 py-1 text-gray-700 font-medium border-r text-xs">
                          {getMachineLabel(f.maHeThong)}
                        </td>
                        {displayTabs.map((tab) => {
                          const cellKey = `${batch.maChien}|${f.id}`;
                          const val = board[tab.key]?.[cellKey] ?? 0;
                          const baseVal = baseline[tab.key]?.[cellKey] ?? 0;
                          const isDirty = val !== baseVal;
                          const hasValue = val !== 0;
                          return (
                            <td
                              key={tab.key}
                              className={`px-1 py-1 border-r text-center cursor-pointer min-h-[40px] ${
                                isDirty
                                  ? 'bg-blue-50 text-blue-700 font-semibold'
                                  : hasValue
                                  ? 'text-gray-800'
                                  : 'text-gray-300'
                              }`}
                              onClick={() => setPreviewEditorCell({
                                tab: tab.key,
                                cellKey,
                                label: `${getMachineLabel(f.maHeThong)} · ${batch.maChien}${
                                  batch.maSanPham ? ` · ${batch.maSanPham}` : ''
                                } · ${tab.label}`,
                              })}
                            >
                              <div className="min-h-[36px] flex items-center justify-center">
                                {hasValue ? val : '—'}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* Waste summary (unchanged behavior) */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Vụn - Phế phẩm</h3>
          {wasteTotal > 0 && filteredBatches.length > 0 ? (
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <p>
                Tổng: {wasteTotal} kg (chia đều cho {filteredBatches.length} mã chiên x {fryers.length} máy = {filteredBatches.length * fryers.length} ô)
              </p>
              <p>
                Mỗi ô: {(Math.round((wasteTotal / (filteredBatches.length * fryers.length)) * 100) / 100).toFixed(2)} kg
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Không có vụn/phế phẩm.</p>
          )}
        </div>
      </div>

      {/* Preview FieldFocusEditor — no onNext */}
      <FieldFocusEditor
        open={!!previewEditorCell}
        label={previewEditorCell?.label ?? ''}
        value={
          previewEditorCell
            ? (board[previewEditorCell.tab]?.[previewEditorCell.cellKey] ?? 0)
            : 0
        }
        unit="kg"
        min={0}
        max={PRODUCTION_LIMITS.sanLuong.max}
        onChange={(v) => {
          if (!previewEditorCell) return;
          updateCell(previewEditorCell.tab, previewEditorCell.cellKey, v);
        }}
        onClose={() => setPreviewEditorCell(null)}
      />
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const ProductionDataEntry: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [kioskExpired, setKioskExpired] = useState(false);
  const { keyboardOpen } = useVirtualKeyboard();
  const isNarrow = useIsNarrowScreen();
  const [selectedShift, setSelectedShift] = useState<number>(() => getSelection()?.shift ?? 0);
  const [nguoiThucHien, setNguoiThucHien] = useState<string>(() => getSelection()?.operator ?? '');
  const [operatorId, setOperatorId] = useState<string>(() => getSelection()?.operatorId ?? '');
  const [productionDate, setProductionDate] = useState<string>(() => {
    const stored = getSelection()?.date;
    return stored && stored.length > 0 ? stored : todayStr();
  });
  const [activeTab, setActiveTab] = useState<QualityTab>(() => {
    const stored = getSelection()?.activeTab;
    return stored && isValidTab(stored) ? stored : 'A';
  });
  const [showPreview, setShowPreview] = useState(false);
  const [deviceKeyInput, setDeviceKeyInput] = useState('');

  // FieldFocusEditor state: tracks active cell being edited
  const [editorCell, setEditorCell] = useState<{ tab: QualityTab; cellKey: CellKey; label: string } | null>(null);

  // Admin self-registration state
  const { user } = useAuth();
  const userIsAdmin = user ? isAdmin(user.department) : false;
  const [deviceName, setDeviceName] = useState('');
  const [registering, setRegistering] = useState(false);

  // Attended operators hook (shift-first gate)
  const {
    data: attendedOperators,
    isLoading: isLoadingAttended,
  } = useAttendedOperatorsByShift(productionDate, selectedShift, 'PRODUCTION_OUTPUT');

  // Board state: weight values per tab per cell
  const [board, setBoard] = useState<BoardData>(() => ({
    A: {}, B: {}, B_DAU: {}, C: {}, UOT: {}, VUN_PHE: {},
  }));
  const [wasteTotal, setWasteTotal] = useState<WasteTotal>(0);

  // Baseline: loaded DB values (for dirty tracking)
  const [baseline, setBaseline] = useState<BaselineData>(() => ({
    A: {}, B: {}, B_DAU: {}, C: {}, UOT: {}, VUN_PHE: {},
  }));
  const baselineLoaded = useRef(false);
  // Tracks whether the board holds unsaved edits, so a background refetch cannot
  // replace them with database values mid-entry. A ref, not state: the baseline
  // effect reads it without wanting to re-run when it flips.
  const boardDirtyRef = useRef(false);
  // How many cells a running save has left to go, so a 60-cell save is not a blank wait.
  const [saveProgress, setSaveProgress] = useState<{ done: number; total: number } | null>(null);

  // Mark this tab as kiosk on mount + read device key from URL query param
  useEffect(() => {
    markTab();
    const paramKey = searchParams.get('deviceKey');
    if (paramKey && !getDeviceKey()) {
      setDeviceKey(paramKey);
    }
  }, [searchParams]);

  // Listen for kiosk-expired events from apiClient
  useEffect(() => {
    const handler = () => setKioskExpired(true);
    window.addEventListener(KIOSK_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(KIOSK_EXPIRED_EVENT, handler);
  }, []);

  // Persist selection state to sessionStorage so reload restores the entry screen
  useEffect(() => {
    if (!selectedShift) return; // Don't write rác khi chưa chọn shift
    setSelection({
      shift: selectedShift,
      operator: nguoiThucHien,
      operatorId,
      date: productionDate,
      activeTab,
    });
  }, [selectedShift, nguoiThucHien, operatorId, productionDate, activeTab]);

  // Data hooks
  const {
    data: allBatches,
    isLoading: batchesLoading,
    isError: batchesError,
    refetch: refetchBatches,
  } = useFryBatchCodes(productionDate, selectedShift);
  const {
    data: fryersResult,
    isLoading: fryersLoading,
    isError: fryersError,
    refetch: refetchFryers,
  } = useActiveFryerMachineSystems();
  const {
    data: allFinishedProducts,
    isLoading: fpLoading,
    isError: fpError,
    refetch: refetchFinishedProducts,
  } = useAllFinishedProducts(productionDate, selectedShift);
  const batchUpdate = useBatchUpdateFinishedProducts();

  // A failed request must not read as "no data": the worker would go looking for an
  // admin about missing fry batches when the real problem is the network.
  const loadFailed = batchesError || fryersError || fpError;

  const handleRetryLoad = useCallback(() => {
    if (batchesError) void refetchBatches();
    if (fryersError) void refetchFryers();
    if (fpError) void refetchFinishedProducts();
  }, [batchesError, fryersError, fpError, refetchBatches, refetchFryers, refetchFinishedProducts]);

  const fryers = useMemo(() => fryersResult?.data ?? [], [fryersResult?.data]);
  const fryerIds = useMemo(() => fryers.map((f) => f.id), [fryers]);

  // Filter batches by shift + date (client-side, local date)
  const filteredBatches = useMemo(
    () => filterBatchesByShiftAndDate(allBatches, selectedShift, productionDate),
    [allBatches, selectedShift, productionDate],
  );

  // Index existing FinishedProduct by (maChien, machineSystemId)
  const fpIndex = useMemo(
    () => indexFinishedProducts(allFinishedProducts, filteredBatches, fryerIds),
    [allFinishedProducts, filteredBatches, fryerIds],
  );

  // Load existing DB values into board + set baseline when data changes
  useEffect(() => {
    // A shift with no FinishedProduct rows yet is a valid EMPTY baseline, not an
    // unloaded state: it is the normal condition of every new shift. Treating it as
    // unloaded used to suppress draft writing entirely, so a reload lost the whole
    // shift — exactly when the worker had typed the most.
    if (!selectedShift || filteredBatches.length === 0) {
      baselineLoaded.current = false;
      return;
    }

    // Do not overwrite values the worker has typed but not yet saved. A background
    // refetch (any invalidation of the production keys) re-runs this effect, and
    // without this guard it would replace the in-progress board with DB values.
    if (baselineLoaded.current && boardDirtyRef.current) {
      return;
    }

    const newBoard: BoardData = { A: {}, B: {}, B_DAU: {}, C: {}, UOT: {}, VUN_PHE: {} };
    const newBaseline: BaselineData = { A: {}, B: {}, B_DAU: {}, C: {}, UOT: {}, VUN_PHE: {} };

    for (const batch of filteredBatches) {
      for (const fryerId of fryerIds) {
        const cellKey = `${batch.maChien}|${fryerId}`;
        const fp = fpIndex.get(cellKey);
        if (fp) {
          newBoard.A[cellKey] = fp.aKhoiLuong ?? 0;
          newBoard.B[cellKey] = fp.bKhoiLuong ?? 0;
          newBoard.B_DAU[cellKey] = fp.bDauKhoiLuong ?? 0;
          newBoard.C[cellKey] = fp.cKhoiLuong ?? 0;
          newBoard.UOT[cellKey] = fp.uotKhoiLuong ?? 0;
          // Waste: sum of 3 waste fields for display
          newBoard.VUN_PHE[cellKey] = (fp.vunLonKhoiLuong ?? 0) + (fp.vunNhoKhoiLuong ?? 0) + (fp.phePhamKhoiLuong ?? 0);

          newBaseline.A[cellKey] = fp.aKhoiLuong ?? 0;
          newBaseline.B[cellKey] = fp.bKhoiLuong ?? 0;
          newBaseline.B_DAU[cellKey] = fp.bDauKhoiLuong ?? 0;
          newBaseline.C[cellKey] = fp.cKhoiLuong ?? 0;
          newBaseline.UOT[cellKey] = fp.uotKhoiLuong ?? 0;
          newBaseline.VUN_PHE[cellKey] = (fp.vunLonKhoiLuong ?? 0) + (fp.vunNhoKhoiLuong ?? 0) + (fp.phePhamKhoiLuong ?? 0);
        }
      }
    }

    setBaseline(newBaseline);

    // Load draft overlay (if exists for this date+shift)
    const draftKey = getDraftKey(productionDate, selectedShift);
    const savedDraft = localStorage.getItem(draftKey);
    const draft = savedDraft ? parseDraft(savedDraft) : null;
    if (draft) {
      // Start with DB values, overlay draft for cells that have draft values
      const merged: BoardData = { ...newBoard };
      for (const tab of VALID_TABS) {
        merged[tab] = { ...newBoard[tab] };
        const draftTab = draft.board[tab];
        if (!draftTab) continue;
        for (const [key, val] of Object.entries(draftTab)) {
          // Only overlay draft if the cell differs from baseline (i.e., user had entered something)
          if (val !== (newBaseline[tab]?.[key] ?? 0)) {
            merged[tab][key] = val;
          }
        }
      }
      setBoard(merged);
      setWasteTotal(draft.wasteTotal);
    } else {
      setBoard(newBoard);
    }
    baselineLoaded.current = true;
  }, [selectedShift, productionDate, filteredBatches, fryerIds, fpIndex]);

  // Auto-save draft to localStorage on board/wasteTotal change.
  // Debounced: the board can hold ~64 cells and serializing on every keystroke
  // blocks the main thread on a tablet.
  const draftPayload = useMemo<DraftData>(
    () => ({ board, wasteTotal }),
    [board, wasteTotal],
  );
  const debouncedDraft = useDebounce(draftPayload, 400);

  useEffect(() => {
    if (!selectedShift || !baselineLoaded.current) return;
    const draftKey = getDraftKey(productionDate, selectedShift);
    try {
      localStorage.setItem(draftKey, JSON.stringify(debouncedDraft));
    } catch {
      // Quota exceeded or storage blocked. Throwing here would crash the screen,
      // so tell the worker their draft is not protected and keep going.
      toast.error('Không lưu được bản nháp — vui lòng lưu sớm để tránh mất dữ liệu', {
        id: 'draft-write-failed',
      });
    }
  }, [debouncedDraft, productionDate, selectedShift]);

  // ─── Cell update handler ─────────────────────────────────────────────────
  const updateCell = useCallback((tab: QualityTab, cellKey: CellKey, value: number) => {
    setBoard((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], [cellKey]: value },
    }));
  }, []);

  // ─── Apply waste total evenly ────────────────────────────────────────────
  const applyWasteDistribution = useCallback(() => {
    if (filteredBatches.length === 0) return;
    const totalCells = filteredBatches.length * fryerIds.length;
    if (totalCells === 0) return;
    const perCell = wasteTotal / totalCells;
    // Each cell's 3 waste fields get perCell/3
    // But in our board model we store total waste per cell for the VUN_PHE tab
    const newWasteBoard: Record<CellKey, number> = {};
    for (const batch of filteredBatches) {
      for (const fryerId of fryerIds) {
        const cellKey = `${batch.maChien}|${fryerId}`;
        newWasteBoard[cellKey] = Math.round(perCell * 100) / 100;
      }
    }
    setBoard((prev) => ({ ...prev, VUN_PHE: newWasteBoard }));
  }, [filteredBatches, fryerIds, wasteTotal]);

  // ─── Compute dirty records ───────────────────────────────────────────────
  const computeDirtyRecords = useCallback((): DirtyRecord[] => {
    const dirtyMap = new Map<CellKey, Partial<FinishedProduct>>();
    // Track which cell keys have at least one grade-tab change (not waste-only)
    const gradeTabDirty = new Set<CellKey>();

    // Check non-waste tabs
    const nonWasteTabs: { tab: QualityTab; field: string }[] = [
      { tab: 'A', field: 'aKhoiLuong' },
      { tab: 'B', field: 'bKhoiLuong' },
      { tab: 'B_DAU', field: 'bDauKhoiLuong' },
      { tab: 'C', field: 'cKhoiLuong' },
      { tab: 'UOT', field: 'uotKhoiLuong' },
    ];

    for (const { tab, field } of nonWasteTabs) {
      for (const [cellKey, value] of Object.entries(board[tab])) {
        const baselineVal = baseline[tab]?.[cellKey] ?? 0;
        if (value !== baselineVal) {
          const existing = dirtyMap.get(cellKey) || {};
          (existing as Record<string, number>)[field] = value;
          dirtyMap.set(cellKey, existing);
          gradeTabDirty.add(cellKey);
        }
      }
    }

    // Check waste tab
    for (const [cellKey, value] of Object.entries(board.VUN_PHE)) {
      const baselineVal = baseline.VUN_PHE?.[cellKey] ?? 0;
      if (value !== baselineVal) {
        const existing = dirtyMap.get(cellKey) || {};
        // Split into 3 waste fields. Rounding each share independently loses up to
        // 0.02 kg per cell, so the last field absorbs the remainder and the three
        // fields sum to exactly the cell's share.
        const perField = Math.round((value / 3) * 100) / 100;
        existing.vunLonKhoiLuong = perField;
        existing.vunNhoKhoiLuong = perField;
        existing.phePhamKhoiLuong = Math.round((value - perField * 2) * 100) / 100;
        dirtyMap.set(cellKey, existing);
      }
    }

    // Convert to DirtyRecord[] with id + recomputed fields
    const records: DirtyRecord[] = [];
    for (const [cellKey, partialData] of dirtyMap) {
      const fp = fpIndex.get(cellKey);

      // Build the full record values for recomputing tongKhoiLuong + tiLe
      const aVal = board.A[cellKey] ?? fp?.aKhoiLuong ?? 0;
      const bVal = board.B[cellKey] ?? fp?.bKhoiLuong ?? 0;
      const bDauVal = board.B_DAU[cellKey] ?? fp?.bDauKhoiLuong ?? 0;
      const cVal = board.C[cellKey] ?? fp?.cKhoiLuong ?? 0;
      const uotVal = board.UOT[cellKey] ?? fp?.uotKhoiLuong ?? 0;
      const vunLon = partialData.vunLonKhoiLuong ?? fp?.vunLonKhoiLuong ?? 0;
      const vunNho = partialData.vunNhoKhoiLuong ?? fp?.vunNhoKhoiLuong ?? 0;
      const phePham = partialData.phePhamKhoiLuong ?? fp?.phePhamKhoiLuong ?? 0;

      const tongKhoiLuong = aVal + bVal + bDauVal + cVal + uotVal + vunLon + vunNho + phePham;
      const calcPercent = (v: number) => tongKhoiLuong === 0 ? 0 : Math.round((v / tongKhoiLuong) * 100 * 100) / 100;

      const patchData: Partial<FinishedProduct> = {
        ...partialData,
        tongKhoiLuong,
        // Only stamp operator when at least one grade tab changed for this cell
        ...(gradeTabDirty.has(cellKey) ? { nguoiThucHien } : {}),
      };

      // Always recompute all tiLe since tongKhoiLuong changed
      patchData.aTiLe = calcPercent(aVal);
      patchData.bTiLe = calcPercent(bVal);
      patchData.bDauTiLe = calcPercent(bDauVal);
      patchData.cTiLe = calcPercent(cVal);
      patchData.uotTiLe = calcPercent(uotVal);
      patchData.vunLonTiLe = calcPercent(vunLon);
      patchData.vunNhoTiLe = calcPercent(vunNho);
      patchData.phePhamTiLe = calcPercent(phePham);

      // Remove undefined waste fields if not dirty
      if (!('vunLonKhoiLuong' in partialData)) {
        delete patchData.vunLonKhoiLuong;
        delete patchData.vunNhoKhoiLuong;
        delete patchData.phePhamKhoiLuong;
        delete patchData.vunLonTiLe;
        delete patchData.vunNhoTiLe;
        delete patchData.phePhamTiLe;
      }

      // Build per-grade entry-history rows ONLY for grade-tab-dirty cells (task 5.4/5.5).
      // Cells dirty only through waste distribution produce NO entry-history rows.
      let entryHistory: EntryHistoryRow[] | undefined;
      if (gradeTabDirty.has(cellKey)) {
        entryHistory = [];
        // Check each grade tab for this cell
        for (const { tab, field } of nonWasteTabs) {
          const currentVal = board[tab][cellKey];
          const baselineVal = baseline[tab]?.[cellKey] ?? 0;
          if (currentVal !== undefined && currentVal !== baselineVal) {
            entryHistory.push({
              grade: field,
              khoiLuong: currentVal,
              employeeId: operatorId || undefined,
              employeeName: nguoiThucHien || undefined,
            });
          }
        }
        if (entryHistory.length === 0) entryHistory = undefined;
      }

      // Always use upsert path so entry history flows through
      const [maChien, machineSystemId] = cellKey.split('|');
      records.push({ upsert: { maChien, machineSystemId }, data: patchData, entryHistory });
    }

    return records;
  }, [board, baseline, fpIndex, nguoiThucHien, operatorId]);

  // Helper: convert system code (e.g. "HT-CCK-01") to display label ("Máy 01")
  const getMachineLabel = useCallback((maHeThong: string): string => {
    const match = maHeThong.match(/(\d+)$/);
    return match ? `Máy ${match[1]}` : maHeThong;
  }, []);

  // A cell key holds the machine's id, not its code. Resolving through this map is
  // what keeps error messages naming a machine instead of a CUID fragment.
  const machineLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of fryers) {
      map.set(f.id, getMachineLabel(f.maHeThong));
    }
    return map;
  }, [fryers, getMachineLabel]);

  // Traversal order for the editor's "next field" control: every machine of a batch,
  // batch by batch. Memoized because it is O(batches × machines) and the editor's
  // onNext prop is evaluated on every render of this component, editor open or not.
  const cellTraversal = useMemo(() => {
    const order: { cellKey: CellKey; label: string }[] = [];
    for (const batch of filteredBatches) {
      for (const f of fryers) {
        order.push({
          cellKey: `${batch.maChien}|${f.id}`,
          label: `${getMachineLabel(f.maHeThong)} · ${batch.maChien}${
            batch.maSanPham ? ` · ${batch.maSanPham}` : ''
          }`,
        });
      }
    }
    return order;
  }, [filteredBatches, fryers, getMachineLabel]);

  const nextCellHandler = useMemo(() => {
    if (!editorCell || editorCell.tab === 'VUN_PHE' || editorCell.cellKey === '__waste_total__') {
      return undefined;
    }
    const currentIdx = cellTraversal.findIndex((t) => t.cellKey === editorCell.cellKey);
    const nextIdx = currentIdx + 1;
    // Hidden at the last cell of the tab rather than advancing into another tab.
    if (currentIdx < 0 || nextIdx >= cellTraversal.length) return undefined;
    return () => {
      const next = cellTraversal[nextIdx];
      setEditorCell({ tab: editorCell.tab, cellKey: next.cellKey, label: next.label });
    };
  }, [editorCell, cellTraversal]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    // Apply waste distribution before preview
    if (wasteTotal > 0 && filteredBatches.length > 0) {
      applyWasteDistribution();
    }
    setShowPreview(true);
  }, [wasteTotal, filteredBatches, applyWasteDistribution]);

  const handleConfirm = useCallback(() => {
    const dirtyRecords = computeDirtyRecords();
    if (dirtyRecords.length === 0) {
      toast.success('Không có thay đổi nào cần lưu');
      // Reset anyway
      const draftKey = getDraftKey(productionDate, selectedShift);
      localStorage.removeItem(draftKey);
      clearSelection();
      setNguoiThucHien('');
      setOperatorId('');
      setSelectedShift(0);
      setActiveTab('A');
      setProductionDate(todayStr());
      setShowPreview(false);
      return;
    }

    setSaveProgress({ done: 0, total: dirtyRecords.length });
    batchUpdate.mutate({
      records: dirtyRecords,
      onProgress: (done, total) => setSaveProgress({ done, total }),
    }, {
      onSuccess: (results: SaveResult[]) => {
        setSaveProgress(null);
        const successes = results.filter(r => r.ok);
        const failures = results.filter(r => !r.ok);

        if (failures.length === 0) {
          // All OK
          toast.success(`Đã lưu ${successes.length} bản ghi sản lượng`);
          // Clear draft
          const draftKey = getDraftKey(productionDate, selectedShift);
          localStorage.removeItem(draftKey);
          clearSelection();
          // Reset to name selection
          setNguoiThucHien('');
          setOperatorId('');
          setSelectedShift(0);
          setActiveTab('A');
          setProductionDate(todayStr());
          setShowPreview(false);
          setBoard({ A: {}, B: {}, B_DAU: {}, C: {}, UOT: {}, VUN_PHE: {} });
          setBaseline({ A: {}, B: {}, B_DAU: {}, C: {}, UOT: {}, VUN_PHE: {} });
          setWasteTotal(0);
          baselineLoaded.current = false;
        } else {
          // Partial failure — report counts, keep board + draft
          const failedCells = failures.map(f => {
            const [maChien, machineSystemId] = f.cellKey.split('|');
            const machineLabel = machineLabelById.get(machineSystemId ?? '') ?? 'Máy không xác định';
            return `${maChien} - ${machineLabel}`;
          }).join(', ');
          toast.error(
            `Lưu thành công ${successes.length}/${results.length} bản ghi. ` +
            `Lỗi tại: ${failedCells}`,
            { duration: 8000 },
          );
          // Update baseline only for successful records
          setBaseline(prev => {
            const newBaseline = { ...prev };
            for (const s of successes) {
              const [, tab] = Object.entries(board).find(([, tabData]) => s.cellKey in tabData) ?? [];
              if (tab) {
                // Mark this cell as synced
                const tabs: QualityTab[] = ['A', 'B', 'B_DAU', 'C', 'UOT', 'VUN_PHE'];
                for (const t of tabs) {
                  if (s.cellKey in board[t]) {
                    newBaseline[t] = { ...newBaseline[t], [s.cellKey]: board[t][s.cellKey] };
                  }
                }
              }
            }
            return newBaseline;
          });
          setShowPreview(false);
        }
      },
      onError: () => {
        setSaveProgress(null);
        toast.error('Lỗi khi lưu sản lượng');
      },
    });
  }, [computeDirtyRecords, batchUpdate, productionDate, selectedShift, board, machineLabelById]);

  // ─── Change operator/shift handlers ──────────────────────────────────────
  // Check if any cell diverges from the loaded DB baseline
  const hasDirtyData = useCallback((): boolean => {
    const tabs: QualityTab[] = ['A', 'B', 'B_DAU', 'C', 'UOT', 'VUN_PHE'];
    for (const tab of tabs) {
      for (const [key, val] of Object.entries(board[tab])) {
        if (val !== (baseline[tab]?.[key] ?? 0)) return true;
      }
    }
    return wasteTotal > 0;
  }, [board, baseline, wasteTotal]);

  // Mirror the dirty state into a ref the baseline-loading effect can read without
  // taking it as a dependency, so a background refetch never clobbers live input.
  useEffect(() => {
    boardDirtyRef.current = hasDirtyData();
  }, [hasDirtyData]);

  const handleChangeShift = useCallback(() => {
    if (hasDirtyData()) {
      toast.error('Vui lòng lưu dữ liệu trước khi đổi ca.');
      return;
    }
    setSelectedShift(0);
    setActiveTab('A');
    // Effect sync ngược sẽ tự cập nhật sessionStorage với shift=0, activeTab='A', giữ operator + date
  }, [hasDirtyData]);

  const handleChangeOperator = useCallback(() => {
    if (hasDirtyData()) {
      toast.error('Vui lòng lưu dữ liệu trước khi đổi người thực hiện.');
      return;
    }
    clearSelection();
    setNguoiThucHien('');
    setOperatorId('');
    setSelectedShift(0);
    setActiveTab('A');
    // Giữ nguyên productionDate — user thường vẫn nhập cho ngày đang xem
  }, [hasDirtyData]);

  // ─── Session guards ──────────────────────────────────────────────────────
  if (!isKioskTab() && !hasKioskSession()) {
    return <NotActivatedScreen />;
  }

  if (kioskExpired) {
    return <ExpiredScreen />;
  }

  if (isKioskTab() && !hasKioskSession()) {
    // No device key — prompt for entry
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
            onClick={() => { setDeviceKey(deviceKeyInput.trim()); setDeviceKeyInput(''); }}
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

  // ─── Shift selection gate (FIRST GATE) ───────────────────────────────────
  if (!selectedShift) {
    return (
      <ShiftSelectionScreen
        onSelect={setSelectedShift}
        onBack={() => { clearSelection(); setSelectedShift(0); setNguoiThucHien(''); setOperatorId(''); setActiveTab('A'); navigate('/production/nhap-lieu-hub'); }}
      />
    );
  }

  // ─── Operator selection gate (SECOND GATE) ────────────────────────────────
  if (!nguoiThucHien) {
    return (
      <OperatorSelectionScreen
        onSelect={(sel) => { setNguoiThucHien(sel.name); setOperatorId(sel.id); }}
        onBack={() => { setNguoiThucHien(''); setOperatorId(''); setSelectedShift(0); }}
        attendedOperators={attendedOperators}
        isLoadingAttended={isLoadingAttended}
      />
    );
  }

  // ─── Preview screen ──────────────────────────────────────────────────────
  if (showPreview) {
    return (
      <FullGridPreview
        board={board}
        baseline={baseline}
        updateCell={updateCell}
        filteredBatches={filteredBatches}
        fryers={fryers}
        wasteTotal={wasteTotal}
        nguoiThucHien={nguoiThucHien}
        productionDate={productionDate}
        selectedShift={selectedShift}
        onConfirm={handleConfirm}
        onEdit={() => setShowPreview(false)}
        isPending={batchUpdate.isPending}
        getMachineLabel={getMachineLabel}
        saveProgress={saveProgress}
      />
    );
  }

  // ─── Loading state ───────────────────────────────────────────────────────
  const isLoading = batchesLoading || fryersLoading || fpLoading;

  // ─── Main board render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm transition-all duration-150">
        <div className={`max-w-full mx-auto px-4 ${keyboardOpen ? 'py-2' : 'py-3'}`}>
          <div className={`flex items-center justify-between gap-3 ${keyboardOpen ? 'mb-0' : 'mb-3'}`}>
            <div className="flex items-center gap-3 min-w-0">
              <img src="/abf-logo.png" alt="An Bình Foods" className={`h-9 object-contain ${keyboardOpen ? 'hidden' : 'hidden sm:block'}`} />
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-gray-800 truncate">Bảng sản lượng thành phẩm</h1>
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
                className="flex items-center gap-1.5 min-h-[44px] px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Đổi người</span>
              </button>
              <button
                type="button"
                onClick={handleChangeShift}
                title="Đổi ca làm việc"
                className="flex items-center gap-1.5 min-h-[44px] px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <CalendarClock className="w-4 h-4" />
                <span className="hidden sm:inline">Đổi ca</span>
              </button>
              <button
                onClick={handleSave}
                disabled={batchUpdate.isPending}
                className="flex items-center gap-2 px-5 min-h-[44px] bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Lưu
              </button>
            </div>
          </div>

          {/* Date picker */}
          <div className={`flex items-center gap-2 mb-3 ${keyboardOpen ? 'hidden' : ''}`}>
            <label className="text-sm font-medium text-gray-600">Ngày sản xuất:</label>
            <input
              type="date"
              value={productionDate}
              onChange={(e) => {
                if (hasDirtyData() && !window.confirm('Có dữ liệu chưa lưu. Bạn có chắc muốn đổi ngày? Dữ liệu chưa lưu sẽ bị mất.')) return;
                setProductionDate(e.target.value);
              }}
              className="min-h-[44px] px-3 py-2 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                if (hasDirtyData() && !window.confirm('Có dữ liệu chưa lưu. Bạn có chắc muốn đổi ngày? Dữ liệu chưa lưu sẽ bị mất.')) return;
                setProductionDate(todayStr());
              }}
              className="min-h-[44px] px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Hôm nay
            </button>
            <span className="text-sm text-gray-500 ml-2">{formatDateVN(productionDate)}</span>
          </div>

          {/* Quality tabs */}
          <div className={`flex gap-1 overflow-x-auto pb-1 ${keyboardOpen ? 'hidden' : ''}`}>
            {QUALITY_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 min-h-[44px] rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Board content */}
      <div className="px-4 py-4">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {!isLoading && activeTab !== 'VUN_PHE' && (
          <>
            {loadFailed ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <p className="text-gray-700 font-medium">Không tải được dữ liệu</p>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  Kiểm tra kết nối mạng rồi thử lại. Đây không phải là "chưa có mã chiên".
                </p>
                <button
                  onClick={handleRetryLoad}
                  className="min-h-[44px] px-5 py-2 bg-blue-600 text-white rounded-lg font-medium"
                >
                  Thử lại
                </button>
              </div>
            ) : fryers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                <p className="text-gray-700 font-medium">Chưa có máy sản xuất nào đang hoạt động</p>
                <p className="text-sm text-gray-500 mt-1">
                  Không thể nhập sản lượng khi chưa có máy. Nhờ admin kiểm tra trạng thái hệ thống máy.
                </p>
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <p className="text-gray-500">Không có mã chiên nào cho Ca {selectedShift} ngày {formatDateVN(productionDate)}.</p>
                <p className="text-sm text-gray-400 mt-1">Hãy kiểm tra lại ca và ngày sản xuất.</p>
              </div>
            ) : isNarrow ? (
              /* ─── Card layout (portrait / narrow) ─── */
              <div className="space-y-4">
                {filteredBatches.map((batch) => (
                  <div key={batch.maChien} className="bg-white border rounded-lg p-4 space-y-3">
                    {/* Card header */}
                    <div>
                      <p className="text-lg font-bold text-gray-800">{batch.maChien}</p>
                      <p className="text-sm text-gray-500">
                        {formatTime(batch.thoiGianChien)}
                        {batch.maSanPham ? ` · ${batch.maSanPham}` : ''}
                      </p>
                    </div>
                    {/* Machine rows */}
                    <div className="space-y-2">
                      {fryers.map((f) => {
                        const cellKey = `${batch.maChien}|${f.id}`;
                        const value = board[activeTab]?.[cellKey] ?? 0;
                        return (
                          <div key={f.id} className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700 w-16 shrink-0">
                              {getMachineLabel(f.maHeThong)}
                            </span>
                            <div className="flex-1">
                              <NumericInput
                                value={value}
                                onChange={(v) => updateCell(activeTab, cellKey, v)}
                                onTap={() => setEditorCell({
                                  tab: activeTab,
                                  cellKey,
                                  label: `${getMachineLabel(f.maHeThong)} · ${batch.maChien}${
                                    batch.maSanPham ? ` · ${batch.maSanPham}` : ''
                                  }`,
                                })}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ─── Table layout (landscape / wide) with sticky ─── */
              <div className="overflow-x-auto bg-white rounded-lg border">
                <table className="w-full text-sm border-collapse">
                  <thead className="sticky top-0 z-10 bg-gray-100">
                    <tr className="bg-gray-100 border-b">
                      <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r w-10">STT</th>
                      <th className="sticky left-0 z-30 bg-gray-100 px-2 py-2 text-left font-semibold text-gray-700 border-r min-w-[100px]">Mã chiên</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r min-w-[70px]">Giờ chiên</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r min-w-[120px]">Mã hàng hóa</th>
                      {fryers.map((f) => (
                        <th key={f.id} className="px-1 py-2 text-center font-semibold text-gray-700 border-r min-w-[70px]">
                          {getMachineLabel(f.maHeThong)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBatches.map((batch, idx) => (
                      <tr key={batch.maChien} className="border-b hover:bg-gray-50">
                        <td className="px-2 py-1 text-gray-600 border-r">{idx + 1}</td>
                        <td className="sticky left-0 z-20 bg-white px-2 py-1 text-gray-800 font-medium border-r">{batch.maChien}</td>
                        <td className="px-2 py-1 text-gray-600 border-r">{formatTime(batch.thoiGianChien)}</td>
                        <td className="px-2 py-1 text-gray-700 border-r font-medium">{batch.maSanPham || '—'}</td>
                        {fryers.map((f) => {
                          const cellKey = `${batch.maChien}|${f.id}`;
                          const value = board[activeTab]?.[cellKey] ?? 0;
                          return (
                            <td key={f.id} className="px-1 py-1 border-r">
                              <NumericInput
                                value={value}
                                onChange={(v) => updateCell(activeTab, cellKey, v)}
                                onTap={() => setEditorCell({
                                  tab: activeTab,
                                  cellKey,
                                  label: `${getMachineLabel(f.maHeThong)} · ${batch.maChien}${
                                    batch.maSanPham ? ` · ${batch.maSanPham}` : ''
                                  }`,
                                })}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Waste tab */}
        {!isLoading && activeTab === 'VUN_PHE' && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-lg border p-6 space-y-4">
              <h3 className="text-base font-semibold text-gray-800">Vụn - Phế phẩm (tổng ca)</h3>
              <p className="text-sm text-gray-500">
                Nhập tổng khối lượng vụn + phế phẩm cho toàn ca. Hệ thống sẽ chia đều cho tất cả mã chiên và máy.
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Tổng khối lượng (kg)</label>
                  <NumericInput
                    value={wasteTotal}
                    onChange={setWasteTotal}
                    placeholder="0"
                    className="text-lg"
                    onTap={() => setEditorCell({ tab: 'VUN_PHE', cellKey: '__waste_total__', label: 'Vụn - Phế phẩm (tổng ca)' })}
                  />
                </div>
              </div>
              {filteredBatches.length > 0 && wasteTotal > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                  <p>
                    Mỗi ô: {(Math.round((wasteTotal / (filteredBatches.length * fryerIds.length)) * 100) / 100).toFixed(2)} kg
                    ({filteredBatches.length} mã x {fryerIds.length} máy = {filteredBatches.length * fryerIds.length} ô)
                  </p>
                  <p>Mỗi loại (vụn lớn/nhỏ/phế phẩm): {(wasteTotal / (filteredBatches.length * fryerIds.length) / 3).toFixed(3)} kg</p>
                </div>
              )}
              {filteredBatches.length === 0 && (
                <p className="text-sm text-amber-600">
                  Không có mã chiên cho ca và ngày này. Tổng sẽ không được chia.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <KioskFooter />

      {/* FieldFocusEditor overlay — with onNext traversal for non-waste tabs */}
      <FieldFocusEditor
        open={!!editorCell}
        label={editorCell?.label ?? ''}
        value={
          editorCell
            ? editorCell.cellKey === '__waste_total__'
              ? wasteTotal
              : (board[editorCell.tab]?.[editorCell.cellKey] ?? 0)
            : 0
        }
        unit="kg"
        min={0}
        max={PRODUCTION_LIMITS.sanLuong.max}
        onChange={(v) => {
          if (!editorCell) return;
          if (editorCell.cellKey === '__waste_total__') {
            setWasteTotal(v);
          } else {
            updateCell(editorCell.tab, editorCell.cellKey, v);
          }
        }}
        onClose={() => setEditorCell(null)}
        onNext={nextCellHandler}
      />
    </div>
  );
};

export default ProductionDataEntry;
