import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useActiveFryerMachineSystems } from '../../hooks/useMachineSystemDetails';
import {
  useFryBatchCodes,
  useAllFinishedProducts,
  useBatchUpdateFinishedProducts,
  filterBatchesByShiftAndDate,
  indexFinishedProducts,
  DirtyRecord,
} from '../../hooks/useProductionDataEntry';
import { useProductionEmployees } from '../../hooks/useProductionEmployees';
import { markTab, isKioskTab, hasKioskSession, KIOSK_EXPIRED_EVENT } from '../../utils/kioskSession';
import { parseNumberInput } from '../../utils/numberInput';
import { FinishedProduct } from '../../services/finishedProductService';
import { Loader2, Save, CheckCircle, AlertTriangle, User, Eye, ArrowLeft, Calendar } from 'lucide-react';
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
// Notes: cellKey -> ghiChu text
type NotesData = Record<CellKey, string>;
// Waste total for the shift
type WasteTotal = number;

// Draft stored in localStorage
interface DraftData {
  board: BoardData;
  notes: NotesData;
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
}

const NumericInput: React.FC<NumericInputProps> = ({ value, onChange, placeholder, className }) => (
  <input
    type="number"
    inputMode="decimal"
    placeholder={placeholder || '0'}
    className={`w-full min-h-[44px] px-2 py-1 border border-gray-300 rounded-lg text-base text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${className || ''}`}
    value={value === 0 ? '' : value}
    onChange={(e) => onChange(parseNumberInput(e.target.value))}
  />
);

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

// ─── Operator Selection Screen ───────────────────────────────────────────────

interface OperatorSelectionProps {
  onSelect: (name: string) => void;
}

const OperatorSelection: React.FC<OperatorSelectionProps> = ({ onSelect }) => {
  const { data: employees, isLoading } = useProductionEmployees();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <User className="w-10 h-10 text-blue-600 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-gray-800">Chọn người thực hiện</h1>
          <p className="text-sm text-gray-500 mt-1">Chọn tên của bạn trước khi nhập liệu</p>
        </div>
        <div className="space-y-2">
          {employees?.map((emp) => (
            <button
              key={emp.id}
              onClick={() => onSelect(emp.name)}
              className="w-full min-h-[52px] px-4 py-3 bg-white border border-gray-200 rounded-xl text-left hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <span className="text-base font-medium text-gray-800">{emp.name}</span>
              <span className="text-sm text-gray-400 ml-2">({emp.employeeCode})</span>
            </button>
          ))}
          {(!employees || employees.length === 0) && (
            <p className="text-center text-gray-500 py-8">Không tìm thấy nhân viên sản xuất.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Shift Selection Screen ──────────────────────────────────────────────────

interface ShiftSelectionProps {
  onSelect: (shift: number) => void;
  onBack: () => void;
  operatorName: string;
}

const ShiftSelection: React.FC<ShiftSelectionProps> = ({ onSelect, onBack, operatorName }) => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <Calendar className="w-10 h-10 text-blue-600 mx-auto mb-3" />
        <h1 className="text-xl font-semibold text-gray-800">Chọn ca làm việc</h1>
        <p className="text-sm text-gray-500 mt-1">Người thực hiện: {operatorName}</p>
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((shift) => (
          <button
            key={shift}
            onClick={() => onSelect(shift)}
            className="w-full min-h-[64px] px-6 py-4 bg-white border border-gray-200 rounded-xl text-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <span className="text-lg font-semibold text-gray-800">Ca {shift}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onBack}
        className="mt-6 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mx-auto"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại chọn người
      </button>
    </div>
  </div>
);

// ─── Full-Grid Editable Preview ─────────────────────────────────────────────

interface FullGridPreviewProps {
  board: BoardData;
  baseline: BaselineData;
  updateCell: (tab: QualityTab, cellKey: CellKey, value: number) => void;
  filteredBatches: { maChien: string; thoiGianChien: string; tenHangHoa: string }[];
  fryers: { id: string; maHeThong: string }[];
  wasteTotal: number;
  nguoiThucHien: string;
  onConfirm: () => void;
  onEdit: () => void;
  isPending: boolean;
  getMachineLabel: (maHeThong: string) => string;
}

const FullGridPreview: React.FC<FullGridPreviewProps> = ({
  board,
  baseline,
  updateCell,
  filteredBatches,
  fryers,
  wasteTotal,
  nguoiThucHien,
  onConfirm,
  onEdit,
  isPending,
  getMachineLabel,
}) => {
  const NON_WASTE_TABS: { key: QualityTab; label: string }[] = [
    { key: 'A', label: 'Hàng A' },
    { key: 'B', label: 'Hàng B' },
    { key: 'B_DAU', label: 'Hàng B dầu' },
    { key: 'C', label: 'Hàng C' },
    { key: 'UOT', label: 'Ướt' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">Xem lại sản lượng</h2>
          </div>
          <p className="text-sm text-gray-600">
            <strong>Người thực hiện:</strong> {nguoiThucHien}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Có thể nhập/sửa trực tiếp trong bảng bên dưới trước khi xác nhận.
          </p>
        </div>

        {/* Grid tables for each non-waste tab */}
        {NON_WASTE_TABS.map(({ key: tab, label }) => (
          <div key={tab} className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r min-w-[100px]">
                    Mã chiên
                    </th>
                    {fryers.map((f) => (
                      <th key={f.id} className="px-1 py-2 text-center font-semibold text-gray-700 border-r min-w-[70px]">
                        {getMachineLabel(f.maHeThong)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBatches.map((batch) => (
                    <tr key={batch.maChien} className="border-b">
                      <td className="px-2 py-1 text-gray-800 font-medium border-r">
                        {batch.maChien}
                      </td>
                      {fryers.map((f) => {
                        const cellKey = `${batch.maChien}|${f.id}`;
                        const value = board[tab]?.[cellKey] ?? 0;
                        const baselineVal = baseline[tab]?.[cellKey] ?? 0;
                        const isDirty = value !== baselineVal;
                        return (
                          <td key={f.id} className="px-1 py-1 border-r">
                            <input
                              type="number"
                              inputMode="decimal"
                              placeholder="0"
                              className={`w-full min-h-[44px] px-2 py-1 rounded-lg text-base text-center focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                isDirty
                                  ? 'border-2 border-blue-400 bg-blue-50'
                                  : 'border border-gray-200 bg-white'
                              }`}
                              value={value === 0 ? '' : value}
                              onChange={(e) => updateCell(tab, cellKey, parseNumberInput(e.target.value))}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Waste summary (read-only distribution display) */}
        <div className="bg-white rounded-xl border p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Vụn - Phế phẩm</h3>
          {wasteTotal > 0 && filteredBatches.length > 0 ? (
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <p>
                Tổng: {wasteTotal} kg (chia đều cho {filteredBatches.length} mã chiên x {fryers.length} máy = {filteredBatches.length * fryers.length} ô)
              </p>
              <p>
                Mỗi ô: {(wasteTotal / (filteredBatches.length * fryers.length)).toFixed(3)} kg
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Không có vụn/phế phẩm.</p>
          )}
        </div>

        {/* Action buttons - sticky bottom */}
        <div className="sticky bottom-0 bg-white border-t p-4 rounded-xl flex gap-3">
          <button
            onClick={onEdit}
            className="flex-1 min-h-[44px] px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
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
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const ProductionDataEntry: React.FC = () => {
  const [kioskExpired, setKioskExpired] = useState(false);
  const [nguoiThucHien, setNguoiThucHien] = useState('');
  const [selectedShift, setSelectedShift] = useState<number>(0);
  const [productionDate, setProductionDate] = useState(todayStr());
  const [activeTab, setActiveTab] = useState<QualityTab>('A');
  const [showPreview, setShowPreview] = useState(false);

  // Board state: weight values per tab per cell
  const [board, setBoard] = useState<BoardData>(() => ({
    A: {}, B: {}, B_DAU: {}, C: {}, UOT: {}, VUN_PHE: {},
  }));
  const [notes, setNotes] = useState<NotesData>({});
  const [wasteTotal, setWasteTotal] = useState<WasteTotal>(0);

  // Baseline: loaded DB values (for dirty tracking)
  const [baseline, setBaseline] = useState<BaselineData>(() => ({
    A: {}, B: {}, B_DAU: {}, C: {}, UOT: {}, VUN_PHE: {},
  }));
  const baselineLoaded = useRef(false);

  // Mark this tab as kiosk on mount
  useEffect(() => {
    markTab();
  }, []);

  // Listen for kiosk-expired events from apiClient
  useEffect(() => {
    const handler = () => setKioskExpired(true);
    window.addEventListener(KIOSK_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(KIOSK_EXPIRED_EVENT, handler);
  }, []);

  // Data hooks
  const { data: allBatches, isLoading: batchesLoading } = useFryBatchCodes();
  const { data: fryersResult, isLoading: fryersLoading } = useActiveFryerMachineSystems();
  const { data: allFinishedProducts, isLoading: fpLoading } = useAllFinishedProducts();
  const batchUpdate = useBatchUpdateFinishedProducts();

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
    if (!selectedShift || filteredBatches.length === 0 || fpIndex.size === 0) {
      baselineLoaded.current = false;
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
    if (savedDraft) {
      try {
        const draft: DraftData = JSON.parse(savedDraft);
        // Start with DB values, overlay draft for cells that have draft values
        const merged: BoardData = { ...newBoard };
        for (const tab of Object.keys(draft.board) as QualityTab[]) {
          merged[tab] = { ...newBoard[tab] };
          for (const [key, val] of Object.entries(draft.board[tab])) {
            // Only overlay draft if the cell differs from baseline (i.e., user had entered something)
            if (val !== (newBaseline[tab]?.[key] ?? 0)) {
              merged[tab][key] = val;
            }
          }
        }
        setBoard(merged);
        setNotes(draft.notes || {});
        setWasteTotal(draft.wasteTotal || 0);
      } catch {
        setBoard(newBoard);
      }
    } else {
      setBoard(newBoard);
    }
    baselineLoaded.current = true;
  }, [selectedShift, productionDate, filteredBatches, fryerIds, fpIndex]);

  // Auto-save draft to localStorage on board/notes/wasteTotal change
  useEffect(() => {
    if (!selectedShift || !baselineLoaded.current) return;
    const draftKey = getDraftKey(productionDate, selectedShift);
    const draft: DraftData = { board, notes, wasteTotal };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [board, notes, wasteTotal, productionDate, selectedShift]);

  // ─── Cell update handler ─────────────────────────────────────────────────
  const updateCell = useCallback((tab: QualityTab, cellKey: CellKey, value: number) => {
    setBoard((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], [cellKey]: value },
    }));
  }, []);

  const updateNote = useCallback((cellKey: CellKey, value: string) => {
    setNotes((prev) => ({ ...prev, [cellKey]: value }));
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
        }
      }
    }

    // Check waste tab
    for (const [cellKey, value] of Object.entries(board.VUN_PHE)) {
      const baselineVal = baseline.VUN_PHE?.[cellKey] ?? 0;
      if (value !== baselineVal) {
        const existing = dirtyMap.get(cellKey) || {};
        // Split evenly into 3 waste fields
        const perField = Math.round((value / 3) * 100) / 100;
        existing.vunLonKhoiLuong = perField;
        existing.vunNhoKhoiLuong = perField;
        existing.phePhamKhoiLuong = perField;
        dirtyMap.set(cellKey, existing);
      }
    }

    // Convert to DirtyRecord[] with id + recomputed fields
    const records: DirtyRecord[] = [];
    for (const [cellKey, partialData] of dirtyMap) {
      const fp = fpIndex.get(cellKey);
      if (!fp) continue; // No record to patch

      // Build the full record values for recomputing tongKhoiLuong + tiLe
      const aVal = board.A[cellKey] ?? fp.aKhoiLuong ?? 0;
      const bVal = board.B[cellKey] ?? fp.bKhoiLuong ?? 0;
      const bDauVal = board.B_DAU[cellKey] ?? fp.bDauKhoiLuong ?? 0;
      const cVal = board.C[cellKey] ?? fp.cKhoiLuong ?? 0;
      const uotVal = board.UOT[cellKey] ?? fp.uotKhoiLuong ?? 0;
      const vunLon = partialData.vunLonKhoiLuong ?? fp.vunLonKhoiLuong ?? 0;
      const vunNho = partialData.vunNhoKhoiLuong ?? fp.vunNhoKhoiLuong ?? 0;
      const phePham = partialData.phePhamKhoiLuong ?? fp.phePhamKhoiLuong ?? 0;

      const tongKhoiLuong = aVal + bVal + bDauVal + cVal + uotVal + vunLon + vunNho + phePham;
      const calcPercent = (v: number) => tongKhoiLuong === 0 ? 0 : Math.round((v / tongKhoiLuong) * 100 * 100) / 100;

      const patchData: Partial<FinishedProduct> = {
        ...partialData,
        tongKhoiLuong,
        nguoiThucHien,
      };

      // Recompute tiLe for changed fields
      if ('aKhoiLuong' in partialData) patchData.aTiLe = calcPercent(aVal);
      if ('bKhoiLuong' in partialData) patchData.bTiLe = calcPercent(bVal);
      if ('bDauKhoiLuong' in partialData) patchData.bDauTiLe = calcPercent(bDauVal);
      if ('cKhoiLuong' in partialData) patchData.cTiLe = calcPercent(cVal);
      if ('uotKhoiLuong' in partialData) patchData.uotTiLe = calcPercent(uotVal);
      if ('vunLonKhoiLuong' in partialData) {
        patchData.vunLonTiLe = calcPercent(vunLon);
        patchData.vunNhoTiLe = calcPercent(vunNho);
        patchData.phePhamTiLe = calcPercent(phePham);
      }

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

      records.push({ id: fp.id, data: patchData });
    }

    return records;
  }, [board, baseline, fpIndex, nguoiThucHien]);

  // Helper: convert system code (e.g. "HT-CCK-01") to display label ("Máy 01")
  const getMachineLabel = (maHeThong: string): string => {
    const match = maHeThong.match(/(\d+)$/);
    return match ? `Máy ${match[1]}` : maHeThong;
  };


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
      setNguoiThucHien('');
      setSelectedShift(0);
      setShowPreview(false);
      return;
    }

    batchUpdate.mutate(dirtyRecords, {
      onSuccess: () => {
        toast.success(`Đã lưu ${dirtyRecords.length} bản ghi sản lượng`);
        // Clear draft
        const draftKey = getDraftKey(productionDate, selectedShift);
        localStorage.removeItem(draftKey);
        // Reset to name selection
        setNguoiThucHien('');
        setSelectedShift(0);
        setShowPreview(false);
        setBoard({ A: {}, B: {}, B_DAU: {}, C: {}, UOT: {}, VUN_PHE: {} });
        setBaseline({ A: {}, B: {}, B_DAU: {}, C: {}, UOT: {}, VUN_PHE: {} });
        setNotes({});
        setWasteTotal(0);
        baselineLoaded.current = false;
      },
      onError: () => {
        toast.error('Lỗi khi lưu sản lượng');
      },
    });
  }, [computeDirtyRecords, batchUpdate, productionDate, selectedShift]);

  // ─── Session guards ──────────────────────────────────────────────────────
  if (!isKioskTab() && !hasKioskSession()) {
    return <NotActivatedScreen />;
  }

  if (kioskExpired) {
    return <ExpiredScreen />;
  }

  if (isKioskTab() && !hasKioskSession()) {
    return <NotActivatedScreen />;
  }

  // ─── Operator selection gate ─────────────────────────────────────────────
  if (!nguoiThucHien) {
    return <OperatorSelection onSelect={setNguoiThucHien} />;
  }

  // ─── Shift selection gate ────────────────────────────────────────────────
  if (!selectedShift) {
    return (
      <ShiftSelection
        onSelect={setSelectedShift}
        onBack={() => setNguoiThucHien('')}
        operatorName={nguoiThucHien}
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
        onConfirm={handleConfirm}
        onEdit={() => setShowPreview(false)}
        isPending={batchUpdate.isPending}
        getMachineLabel={getMachineLabel}
      />
    );
  }

  // ─── Loading state ───────────────────────────────────────────────────────
  const isLoading = batchesLoading || fryersLoading || fpLoading;

  // ─── Main board render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-full mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-semibold text-gray-800">Bảng sản lượng thành phẩm</h1>
              <p className="text-sm text-gray-500">
                {nguoiThucHien} - Ca {selectedShift}
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={batchUpdate.isPending}
              className="flex items-center gap-2 px-5 min-h-[44px] bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Lưu
            </button>
          </div>

          {/* Date picker */}
          <div className="flex items-center gap-2 mb-3">
            <label className="text-sm font-medium text-gray-600">Ngày sản xuất:</label>
            <input
              type="date"
              value={productionDate}
              onChange={(e) => setProductionDate(e.target.value)}
              className="min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => setProductionDate(todayStr())}
              className="min-h-[44px] px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Hôm nay
            </button>
            <span className="text-sm text-gray-500 ml-2">{formatDateVN(productionDate)}</span>
          </div>

          {/* Quality tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {QUALITY_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 min-h-[40px] rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
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
            {filteredBatches.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <p className="text-gray-500">Không có mã chiên nào cho Ca {selectedShift} ngày {formatDateVN(productionDate)}.</p>
                <p className="text-sm text-gray-400 mt-1">Hãy kiểm tra lại ca và ngày sản xuất.</p>
              </div>
            ) : (
              <div className="overflow-x-auto bg-white rounded-lg border">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r w-10">STT</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r min-w-[100px]">Mã chiên</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r min-w-[70px]">Giờ chiên</th>
                      <th className="px-2 py-2 text-left font-semibold text-gray-700 border-r min-w-[120px]">Nguyên liệu</th>
                      {fryers.map((f) => (
                        <th key={f.id} className="px-1 py-2 text-center font-semibold text-gray-700 border-r min-w-[70px]">
                          {getMachineLabel(f.maHeThong)}
                        </th>
                      ))}
                      <th className="px-2 py-2 text-left font-semibold text-gray-700 min-w-[100px]">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBatches.map((batch, idx) => (
                      <tr key={batch.maChien} className="border-b hover:bg-gray-50">
                        <td className="px-2 py-1 text-gray-600 border-r">{idx + 1}</td>
                        <td className="px-2 py-1 text-gray-800 font-medium border-r">{batch.maChien}</td>
                        <td className="px-2 py-1 text-gray-600 border-r">{formatTime(batch.thoiGianChien)}</td>
                        <td className="px-2 py-1 text-gray-600 border-r truncate max-w-[150px]">{batch.tenHangHoa}</td>
                        {fryers.map((f) => {
                          const cellKey = `${batch.maChien}|${f.id}`;
                          const value = board[activeTab]?.[cellKey] ?? 0;
                          return (
                            <td key={f.id} className="px-1 py-1 border-r">
                              <NumericInput
                                value={value}
                                onChange={(v) => updateCell(activeTab, cellKey, v)}
                              />
                            </td>
                          );
                        })}
                        <td className="px-1 py-1">
                          <input
                            type="text"
                            value={notes[`${batch.maChien}|${fryers[0]?.id ?? ''}`] || ''}
                            onChange={(e) => updateNote(`${batch.maChien}|${fryers[0]?.id ?? ''}`, e.target.value)}
                            className="w-full min-h-[44px] px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ghi chú"
                          />
                        </td>
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
                  />
                </div>
              </div>
              {filteredBatches.length > 0 && wasteTotal > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                  <p>
                    Mỗi ô: {(wasteTotal / (filteredBatches.length * fryerIds.length)).toFixed(3)} kg
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
    </div>
  );
};

export default ProductionDataEntry;
