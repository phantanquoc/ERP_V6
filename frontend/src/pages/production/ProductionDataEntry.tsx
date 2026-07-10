import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useActiveFryerMachineSystems } from '../../hooks/useMachineSystemDetails';
import {
  useFryBatchCodes,
  useSystemOperationByBatchAndFryer,
  useFinishedProductByBatchAndFryer,
  useUpdateSystemOperationEntry,
  useUpdateFinishedProductEntry,
} from '../../hooks/useProductionDataEntry';
import { parseNumberInput } from '../../utils/numberInput';
import { Loader2, Save, CheckCircle } from 'lucide-react';
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

// ─── PLACEHOLDER_MAIN_CONTENT ────────────────────────────────────────────────

const ProductionDataEntry: React.FC = () => {
  const { user } = useAuth();
  const [selectedMaChien, setSelectedMaChien] = useState('');
  const [selectedFryerId, setSelectedFryerId] = useState('');
  const [activeTab, setActiveTab] = useState<'operation' | 'output'>('operation');

  // Data hooks
  const { data: batches, isLoading: batchesLoading } = useFryBatchCodes();
  const { data: fryers, isLoading: fryersLoading } = useActiveFryerMachineSystems();
  const { data: systemOp, isLoading: sysOpLoading } = useSystemOperationByBatchAndFryer(selectedMaChien, selectedFryerId);
  const { data: finishedProduct, isLoading: fpLoading } = useFinishedProductByBatchAndFryer(selectedMaChien, selectedFryerId);

  const updateSystemOp = useUpdateSystemOperationEntry();
  const updateFinishedProd = useUpdateFinishedProductEntry();

  // nguoiThucHien from auth
  const nguoiThucHien = useMemo(() => {
    if (!user) return '';
    return `${user.lastName} ${user.firstName}`;
  }, [user]);

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
  React.useEffect(() => {
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
  React.useEffect(() => {
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
  React.useEffect(() => {
    setSelectedFryerId('');
  }, [selectedMaChien]);

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

  // ─── Save handlers ───────────────────────────────────────────────────────
  const handleSaveOperation = () => {
    if (!systemOp) return;
    if (!validateOpForm()) return;

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
        onSuccess: () => toast.success('Đã lưu thông số vận hành'),
        onError: () => toast.error('Lỗi khi lưu thông số vận hành'),
      },
    );
  };

  const handleSaveOutput = () => {
    if (!finishedProduct) return;
    if (!validateOutputForm()) return;

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
        onSuccess: () => toast.success('Đã lưu thành phẩm đầu ra'),
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

  // ─── Render ──────────────────────────────────────────────────────────────
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
                    {updateSystemOp.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Lưu
                  </button>
                )}
                {activeTab === 'output' && finishedProduct && (
                  <button
                    className="flex items-center gap-2 px-5 min-h-[44px] bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50"
                    onClick={handleSaveOutput}
                    disabled={updateFinishedProd.isPending}
                  >
                    {updateFinishedProd.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
