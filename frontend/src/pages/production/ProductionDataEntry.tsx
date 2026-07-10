import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useActiveFryerMachineSystems } from '../../hooks/useMachineSystemDetails';
import {
  useFryBatchCodes,
  useSystemOperationByBatchAndFryer,
  useFinishedProductByBatchAndFryer,
  useUpdateSystemOperationEntry,
  useUpdateFinishedProductEntry,
} from '../../hooks/useProductionDataEntry';
import { useProductionEmployees } from '../../hooks/useProductionEmployees';
import { markTab, isKioskTab, hasKioskSession, KIOSK_EXPIRED_EVENT } from '../../utils/kioskSession';
import { parseNumberInput } from '../../utils/numberInput';
import { Loader2, Save, CheckCircle, AlertTriangle, User, Eye, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import FryBatchPicker from '../../components/production/FryBatchPicker';

// ─── Numeric Input Component ─────────────────────────────────────────────────

interface NumericInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  unit?: string;
  isInteger?: boolean;
  error?: string;
}

const NumericInput: React.FC<NumericInputProps> = ({ label, value, onChange, unit, isInteger, error }) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="number"
        inputMode="decimal"
        placeholder="0"
        className={`w-full min-h-[44px] px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${error ? 'border-red-400' : 'border-gray-300'}`}
        value={value === 0 ? '' : value}
        onChange={(e) => onChange(parseNumberInput(e.target.value, !isInteger))}
      />
      {unit && <span className="text-sm text-gray-500 whitespace-nowrap">{unit}</span>}
    </div>
    {error && <span className="text-xs text-red-500">{error}</span>}
  </div>
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

// ─── Preview components ──────────────────────────────────────────────────────

interface OperationPreviewProps {
  data: {
    khoiLuongDauVao: number;
    giaiDoan1: { thoiGian: number; nhietDo: number; apSuat: number };
    giaiDoan2: { thoiGian: number; nhietDo: number; apSuat: number };
    giaiDoan3: { thoiGian: number; nhietDo: number; apSuat: number };
    giaiDoan4: { thoiGian: number; nhietDo: number; apSuat: number };
    ghiChu: string;
  };
  nguoiThucHien: string;
  onConfirm: () => void;
  onEdit: () => void;
  isPending: boolean;
}

// PLACEHOLDER_PREVIEW_COMPONENTS

const OperationPreview: React.FC<OperationPreviewProps> = ({ data, nguoiThucHien, onConfirm, onEdit, isPending }) => (
  <div className="max-w-3xl mx-auto px-4 py-6">
    <div className="bg-white rounded-xl border p-6 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Eye className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-800">Xem lại thông số vận hành</h2>
      </div>
      <div className="text-sm space-y-2 text-gray-700">
        <p><strong>Người thực hiện:</strong> {nguoiThucHien}</p>
        <p><strong>Khối lượng đầu vào:</strong> {data.khoiLuongDauVao} kg</p>
        {[1, 2, 3, 4].map((i) => {
          const gd = data[`giaiDoan${i}` as keyof typeof data] as { thoiGian: number; nhietDo: number; apSuat: number };
          return (
            <div key={i} className="pl-3 border-l-2 border-blue-200">
              <p className="font-medium">Giai đoạn {i}:</p>
              <p className="pl-2">Thời gian: {gd.thoiGian} phút | Nhiệt độ: {gd.nhietDo} °C | Áp suất: {gd.apSuat}</p>
            </div>
          );
        })}
        {data.ghiChu && <p><strong>Ghi chú:</strong> {data.ghiChu}</p>}
      </div>
      <div className="flex gap-3 pt-4">
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

interface OutputPreviewProps {
  data: {
    aKhoiLuong: number;
    bKhoiLuong: number;
    bDauKhoiLuong: number;
    cKhoiLuong: number;
    vunLonKhoiLuong: number;
    vunNhoKhoiLuong: number;
    phePhamKhoiLuong: number;
    uotKhoiLuong: number;
  };
  nguoiThucHien: string;
  onConfirm: () => void;
  onEdit: () => void;
  isPending: boolean;
}

const OutputPreview: React.FC<OutputPreviewProps> = ({ data, nguoiThucHien, onConfirm, onEdit, isPending }) => {
  const tongKhoiLuong =
    data.aKhoiLuong + data.bKhoiLuong + data.bDauKhoiLuong +
    data.cKhoiLuong + data.vunLonKhoiLuong + data.vunNhoKhoiLuong +
    data.phePhamKhoiLuong + data.uotKhoiLuong;

  const calcPercent = (val: number) => tongKhoiLuong === 0 ? 0 : Math.round((val / tongKhoiLuong) * 100 * 100) / 100;

  const items = [
    { label: 'Thành phẩm A', value: data.aKhoiLuong },
    { label: 'Thành phẩm B', value: data.bKhoiLuong },
    { label: 'Thành phẩm B Dầu', value: data.bDauKhoiLuong },
    { label: 'Thành phẩm C', value: data.cKhoiLuong },
    { label: 'Vụn lớn', value: data.vunLonKhoiLuong },
    { label: 'Vụn nhỏ', value: data.vunNhoKhoiLuong },
    { label: 'Phế phẩm', value: data.phePhamKhoiLuong },
    { label: 'Ướt', value: data.uotKhoiLuong },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">Xem lại thành phẩm đầu ra</h2>
        </div>
        <div className="text-sm space-y-2 text-gray-700">
          <p><strong>Người thực hiện:</strong> {nguoiThucHien}</p>
          <p><strong>Tổng khối lượng:</strong> {tongKhoiLuong.toFixed(2)} kg</p>
          <div className="grid grid-cols-1 gap-1 pt-2">
            {items.map(({ label, value }) => (
              <div key={label} className="flex justify-between py-1 border-b border-gray-100">
                <span>{label}</span>
                <span className="font-medium">{value} kg ({calcPercent(value)}%)</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-4">
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
  const [selectedMaChien, setSelectedMaChien] = useState('');
  const [selectedFryerId, setSelectedFryerId] = useState('');
  const [activeTab, setActiveTab] = useState<'operation' | 'output'>('operation');
  const [previewMode, setPreviewMode] = useState<'none' | 'operation' | 'output'>('none');

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
  const { data: batches, isLoading: batchesLoading } = useFryBatchCodes();
  const { data: fryers, isLoading: fryersLoading } = useActiveFryerMachineSystems();
  const { data: systemOp, isLoading: sysOpLoading } = useSystemOperationByBatchAndFryer(selectedMaChien, selectedFryerId);
  const { data: finishedProduct, isLoading: fpLoading } = useFinishedProductByBatchAndFryer(selectedMaChien, selectedFryerId);

  const updateSystemOp = useUpdateSystemOperationEntry();
  const updateFinishedProd = useUpdateFinishedProductEntry();

  // ─── Operation form state ────────────────────────────────────────────────
  const [opForm, setOpForm] = useState({
    khoiLuongDauVao: 0,
    giaiDoan1: { thoiGian: 0, nhietDo: 0, apSuat: 0 },
    giaiDoan2: { thoiGian: 0, nhietDo: 0, apSuat: 0 },
    giaiDoan3: { thoiGian: 0, nhietDo: 0, apSuat: 0 },
    giaiDoan4: { thoiGian: 0, nhietDo: 0, apSuat: 0 },
    ghiChu: '',
  });

  // ─── Output form state ───────────────────────────────────────────────────
  const [outputForm, setOutputForm] = useState({
    aKhoiLuong: 0,
    bKhoiLuong: 0,
    bDauKhoiLuong: 0,
    cKhoiLuong: 0,
    vunLonKhoiLuong: 0,
    vunNhoKhoiLuong: 0,
    phePhamKhoiLuong: 0,
    uotKhoiLuong: 0,
  });

  // Sync form when systemOp loads
  useEffect(() => {
    if (systemOp) {
      setOpForm({
        khoiLuongDauVao: systemOp.khoiLuongDauVao ?? 0,
        giaiDoan1: { ...systemOp.giaiDoan1 },
        giaiDoan2: { ...systemOp.giaiDoan2 },
        giaiDoan3: { ...systemOp.giaiDoan3 },
        giaiDoan4: { ...systemOp.giaiDoan4 },
        ghiChu: systemOp.ghiChu ?? '',
      });
    }
  }, [systemOp]);

  // Sync form when finishedProduct loads
  useEffect(() => {
    if (finishedProduct) {
      setOutputForm({
        aKhoiLuong: finishedProduct.aKhoiLuong ?? 0,
        bKhoiLuong: finishedProduct.bKhoiLuong ?? 0,
        bDauKhoiLuong: finishedProduct.bDauKhoiLuong ?? 0,
        cKhoiLuong: finishedProduct.cKhoiLuong ?? 0,
        vunLonKhoiLuong: finishedProduct.vunLonKhoiLuong ?? 0,
        vunNhoKhoiLuong: finishedProduct.vunNhoKhoiLuong ?? 0,
        phePhamKhoiLuong: finishedProduct.phePhamKhoiLuong ?? 0,
        uotKhoiLuong: finishedProduct.uotKhoiLuong ?? 0,
      });
    }
  }, [finishedProduct]);

  // Reset fryer when batch changes
  useEffect(() => {
    setSelectedFryerId('');
  }, [selectedMaChien]);

  // ─── Reset to operator selection ─────────────────────────────────────────
  const resetToOperatorSelection = useCallback(() => {
    setNguoiThucHien('');
    setSelectedMaChien('');
    setSelectedFryerId('');
    setActiveTab('operation');
    setPreviewMode('none');
  }, []);

  // ─── Validation ──────────────────────────────────────────────────────────
  const validateOpForm = (): boolean => {
    if (opForm.khoiLuongDauVao < 0) { toast.error('Khối lượng đầu vào không được âm'); return false; }
    for (let i = 1; i <= 4; i++) {
      const gd = opForm[`giaiDoan${i}` as keyof typeof opForm] as { thoiGian: number; nhietDo: number; apSuat: number };
      if (gd.thoiGian < 0 || gd.nhietDo < 0 || gd.apSuat < 0) {
        toast.error(`Giai đoạn ${i}: giá trị không được âm`);
        return false;
      }
    }
    return true;
  };

  const validateOutputForm = (): boolean => {
    const fields = Object.entries(outputForm);
    for (const [, val] of fields) {
      if (val < 0) { toast.error('Khối lượng không được âm'); return false; }
    }
    return true;
  };

  // ─── Save handlers (now show preview first) ──────────────────────────────
  const handleSaveOperation = () => {
    if (!systemOp) return;
    if (!validateOpForm()) return;
    setPreviewMode('operation');
  };

  const handleConfirmOperation = () => {
    if (!systemOp) return;
    updateSystemOp.mutate(
      {
        id: systemOp.id,
        data: {
          khoiLuongDauVao: opForm.khoiLuongDauVao,
          giaiDoan1: { thoiGian: Math.round(opForm.giaiDoan1.thoiGian), nhietDo: opForm.giaiDoan1.nhietDo, apSuat: opForm.giaiDoan1.apSuat },
          giaiDoan2: { thoiGian: Math.round(opForm.giaiDoan2.thoiGian), nhietDo: opForm.giaiDoan2.nhietDo, apSuat: opForm.giaiDoan2.apSuat },
          giaiDoan3: { thoiGian: Math.round(opForm.giaiDoan3.thoiGian), nhietDo: opForm.giaiDoan3.nhietDo, apSuat: opForm.giaiDoan3.apSuat },
          giaiDoan4: { thoiGian: Math.round(opForm.giaiDoan4.thoiGian), nhietDo: opForm.giaiDoan4.nhietDo, apSuat: opForm.giaiDoan4.apSuat },
          ghiChu: opForm.ghiChu || undefined,
          nguoiThucHien,
        },
      },
      {
        onSuccess: () => {
          toast.success('Đã lưu thông số vận hành');
          resetToOperatorSelection();
        },
        onError: () => toast.error('Lỗi khi lưu thông số vận hành'),
      },
    );
  };

  const handleSaveOutput = () => {
    if (!finishedProduct) return;
    if (!validateOutputForm()) return;
    setPreviewMode('output');
  };

  const handleConfirmOutput = () => {
    if (!finishedProduct) return;

    const tongKhoiLuong =
      outputForm.aKhoiLuong + outputForm.bKhoiLuong + outputForm.bDauKhoiLuong +
      outputForm.cKhoiLuong + outputForm.vunLonKhoiLuong + outputForm.vunNhoKhoiLuong +
      outputForm.phePhamKhoiLuong + outputForm.uotKhoiLuong;

    const calcPercent = (val: number) => tongKhoiLuong === 0 ? 0 : Math.round((val / tongKhoiLuong) * 100 * 100) / 100;

    updateFinishedProd.mutate(
      {
        id: finishedProduct.id,
        data: {
          aKhoiLuong: outputForm.aKhoiLuong,
          aTiLe: calcPercent(outputForm.aKhoiLuong),
          bKhoiLuong: outputForm.bKhoiLuong,
          bTiLe: calcPercent(outputForm.bKhoiLuong),
          bDauKhoiLuong: outputForm.bDauKhoiLuong,
          bDauTiLe: calcPercent(outputForm.bDauKhoiLuong),
          cKhoiLuong: outputForm.cKhoiLuong,
          cTiLe: calcPercent(outputForm.cKhoiLuong),
          vunLonKhoiLuong: outputForm.vunLonKhoiLuong,
          vunLonTiLe: calcPercent(outputForm.vunLonKhoiLuong),
          vunNhoKhoiLuong: outputForm.vunNhoKhoiLuong,
          vunNhoTiLe: calcPercent(outputForm.vunNhoKhoiLuong),
          phePhamKhoiLuong: outputForm.phePhamKhoiLuong,
          phePhamTiLe: calcPercent(outputForm.phePhamKhoiLuong),
          uotKhoiLuong: outputForm.uotKhoiLuong,
          uotTiLe: calcPercent(outputForm.uotKhoiLuong),
          tongKhoiLuong,
          nguoiThucHien,
        },
      },
      {
        onSuccess: () => {
          toast.success('Đã lưu thành phẩm đầu ra');
          resetToOperatorSelection();
        },
        onError: () => toast.error('Lỗi khi lưu thành phẩm đầu ra'),
      },
    );
  };

  // ─── Computed values for output ──────────────────────────────────────────
  const tongKhoiLuongComputed = useMemo(() =>
    outputForm.aKhoiLuong + outputForm.bKhoiLuong + outputForm.bDauKhoiLuong +
    outputForm.cKhoiLuong + outputForm.vunLonKhoiLuong + outputForm.vunNhoKhoiLuong +
    outputForm.phePhamKhoiLuong + outputForm.uotKhoiLuong,
    [outputForm],
  );

  // ─── Loading states ──────────────────────────────────────────────────────
  const isSelectionLoading = batchesLoading || fryersLoading;
  const isFormLoading = sysOpLoading || fpLoading;
  const showForm = !!selectedMaChien && !!selectedFryerId;

  // ─── Session guards ──────────────────────────────────────────────────────
  // Check if this tab is marked as kiosk; if not kiosk AND no session, show not-activated
  if (!isKioskTab() && !hasKioskSession()) {
    return <NotActivatedScreen />;
  }

  if (kioskExpired) {
    return <ExpiredScreen />;
  }

  // After markTab, check kiosk session validity
  if (isKioskTab() && !hasKioskSession()) {
    return <NotActivatedScreen />;
  }

  // ─── Operator selection gate ─────────────────────────────────────────────
  if (!nguoiThucHien) {
    return <OperatorSelection onSelect={setNguoiThucHien} />;
  }

  // ─── Preview screens ─────────────────────────────────────────────────────
  if (previewMode === 'operation') {
    return (
      <OperationPreview
        data={opForm}
        nguoiThucHien={nguoiThucHien}
        onConfirm={handleConfirmOperation}
        onEdit={() => setPreviewMode('none')}
        isPending={updateSystemOp.isPending}
      />
    );
  }

  if (previewMode === 'output') {
    return (
      <OutputPreview
        data={outputForm}
        nguoiThucHien={nguoiThucHien}
        onConfirm={handleConfirmOutput}
        onEdit={() => setPreviewMode('none')}
        isPending={updateFinishedProd.isPending}
      />
    );
  }

  // ─── Main form render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky top header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <h1 className="text-lg font-semibold text-gray-800 mb-3">Nhập liệu sản xuất</h1>

          {/* Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <FryBatchPicker
              batches={batches ?? []}
              selectedMaChien={selectedMaChien}
              onSelect={setSelectedMaChien}
              disabled={isSelectionLoading}
              loading={batchesLoading}
            />
            <div>
              <label className="text-sm font-medium text-gray-600">Nồi chiên</label>
              <select
                className="w-full min-h-[44px] mt-1 px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedFryerId}
                onChange={(e) => setSelectedFryerId(e.target.value)}
                disabled={!selectedMaChien || isSelectionLoading}
              >
                <option value="">-- Chọn nồi --</option>
                {fryers?.data?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.maHeThong} - {f.tenHeThong}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabs + Save (in upper half) */}
          {showForm && !isFormLoading && (
            <div className="flex items-center gap-2">
              <button
                className={`px-4 min-h-[44px] rounded-lg font-medium text-sm transition-colors ${activeTab === 'operation' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setActiveTab('operation')}
              >
                Thông số vận hành
              </button>
              <button
                className={`px-4 min-h-[44px] rounded-lg font-medium text-sm transition-colors ${activeTab === 'output' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setActiveTab('output')}
              >
                Thành phẩm đầu ra
              </button>
              <div className="ml-auto">
                {activeTab === 'operation' && systemOp && (
                  <button
                    className="flex items-center gap-2 px-5 min-h-[44px] bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
                    onClick={handleSaveOperation}
                    disabled={updateSystemOp.isPending}
                  >
                    <Save className="w-4 h-4" />
                    Lưu
                  </button>
                )}
                {activeTab === 'output' && finishedProduct && (
                  <button
                    className="flex items-center gap-2 px-5 min-h-[44px] bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
                    onClick={handleSaveOutput}
                    disabled={updateFinishedProd.isPending}
                  >
                    <Save className="w-4 h-4" />
                    Lưu
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form content */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        {!showForm && !isSelectionLoading && (
          <div className="text-center py-12 text-gray-500">
            Chọn mã chiên và nồi chiên để bắt đầu nhập liệu.
          </div>
        )}

        {isSelectionLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {showForm && isFormLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Tab: Operation */}
        {showForm && !isFormLoading && activeTab === 'operation' && (
          <>
            {!systemOp ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <p className="text-gray-500">Chưa có bản ghi vận hành cho mã chiên và nồi này.</p>
                <p className="text-sm text-gray-400 mt-1">Quản lý cần tạo mã chiên trước khi nhập liệu.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* nguoiThucHien display */}
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-800">Người thực hiện: <strong>{nguoiThucHien}</strong></span>
                </div>

                <NumericInput
                  label="Khối lượng đầu vào"
                  value={opForm.khoiLuongDauVao}
                  onChange={(v) => setOpForm({ ...opForm, khoiLuongDauVao: v })}
                  unit="kg"
                />

                {/* 4 stages */}
                {[1, 2, 3, 4].map((i) => {
                  const key = `giaiDoan${i}` as 'giaiDoan1' | 'giaiDoan2' | 'giaiDoan3' | 'giaiDoan4';
                  const gd = opForm[key];
                  return (
                    <div key={i} className="bg-white p-4 rounded-lg border">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Giai đoạn {i}</h3>
                      <div className="grid grid-cols-3 gap-3">
                        <NumericInput
                          label="Thời gian"
                          value={gd.thoiGian}
                          onChange={(v) => setOpForm({ ...opForm, [key]: { ...gd, thoiGian: v } })}
                          unit="phút"
                          isInteger
                        />
                        <NumericInput
                          label="Nhiệt độ"
                          value={gd.nhietDo}
                          onChange={(v) => setOpForm({ ...opForm, [key]: { ...gd, nhietDo: v } })}
                          unit="°C"
                        />
                        <NumericInput
                          label="Áp suất"
                          value={gd.apSuat}
                          onChange={(v) => setOpForm({ ...opForm, [key]: { ...gd, apSuat: v } })}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Note */}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Ghi chú</label>
                  <textarea
                    className="w-full min-h-[44px] px-3 py-2 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={opForm.ghiChu}
                    onChange={(e) => setOpForm({ ...opForm, ghiChu: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Tab: Output */}
        {showForm && !isFormLoading && activeTab === 'output' && (
          <>
            {!finishedProduct ? (
              <div className="text-center py-12 bg-white rounded-lg border">
                <p className="text-gray-500">Chưa có bản ghi thành phẩm cho mã chiên và nồi này.</p>
                <p className="text-sm text-gray-400 mt-1">Quản lý cần tạo mã chiên trước khi nhập liệu.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* nguoiThucHien display */}
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-blue-800">Người thực hiện: <strong>{nguoiThucHien}</strong></span>
                </div>

                {/* Total display */}
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="text-sm font-medium text-green-800">
                    Tổng khối lượng: {tongKhoiLuongComputed.toFixed(2)} kg
                  </span>
                </div>

                {/* 8 output weight fields */}
                {([
                  { key: 'aKhoiLuong', label: 'Thành phẩm A' },
                  { key: 'bKhoiLuong', label: 'Thành phẩm B' },
                  { key: 'bDauKhoiLuong', label: 'Thành phẩm B Dầu' },
                  { key: 'cKhoiLuong', label: 'Thành phẩm C' },
                  { key: 'vunLonKhoiLuong', label: 'Vụn lớn' },
                  { key: 'vunNhoKhoiLuong', label: 'Vụn nhỏ' },
                  { key: 'phePhamKhoiLuong', label: 'Phế phẩm' },
                  { key: 'uotKhoiLuong', label: 'Ướt' },
                ] as const).map(({ key, label }) => {
                  const val = outputForm[key];
                  const percent = tongKhoiLuongComputed === 0 ? 0 : Math.round((val / tongKhoiLuongComputed) * 100 * 100) / 100;
                  return (
                    <div key={key} className="flex items-end gap-3">
                      <div className="flex-1">
                        <NumericInput
                          label={label}
                          value={val}
                          onChange={(v) => setOutputForm({ ...outputForm, [key]: v })}
                          unit="kg"
                        />
                      </div>
                      <div className="pb-1 min-w-[60px] text-right">
                        <span className="text-sm text-gray-500">{percent}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProductionDataEntry;
