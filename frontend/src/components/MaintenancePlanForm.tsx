import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { ModalForm, ModalFooter, FormField, inputCls, selectCls, textareaCls } from './ModalForm';
import { useCreateMaintenancePlan, useUpdateMaintenancePlan, useGeneratedPlanCode } from '../hooks/useMaintenancePlans';
import { useMachineSystemDetails } from '../hooks/useMachineSystemDetails';
import { useAuth } from '../contexts/AuthContext';
import { MaintenancePlan } from '../services/maintenancePlanService';

const FREQUENCY_OPTIONS = [
  { value: 'HANG_NGAY', label: 'Hàng ngày' },
  { value: 'HANG_TUAN', label: 'Hàng tuần' },
  { value: 'HANG_THANG', label: 'Hàng tháng' },
  { value: 'HAI_THANG', label: '2 tháng/lần' },
  { value: 'BA_THANG', label: '3 tháng/lần' },
  { value: 'SAU_THANG', label: '6 tháng/lần' },
  { value: 'HANG_NAM', label: 'Hàng năm' },
  { value: 'KHONG_CO_DINH', label: 'Không lịch cố định' },
];

const TEAM_OPTIONS = [
  { value: 'CO_KHI', label: 'Cơ khí' },
  { value: 'CO_DIEN', label: 'Cơ điện' },
  { value: 'DIEN', label: 'Điện' },
  { value: 'TONG_HOP', label: 'Tổng hợp' },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }));

/** Frequencies where thangBatDau matters (not every month) */
const NEEDS_START_MONTH = new Set(['HAI_THANG', 'BA_THANG', 'SAU_THANG', 'HANG_NAM']);

interface ItemDraft {
  id?: string;
  machineSystemDetailId: string;
  tenChiTiet: string;
  hoatDong: boolean;
  noiDung: string;
  tanSuat: string;
  toThucHien: string;
  soLuong: number;
  thangBatDau: number;
  completedCount: number;
}

interface Props {
  onClose: () => void;
  systems: any[];
  year: number;
  plan?: MaintenancePlan;
  viewOnly?: boolean;
  lockedMachineSystemId?: string;
}

const MaintenancePlanForm = ({ onClose, systems, year, plan, viewOnly, lockedMachineSystemId }: Props) => {
  const { user } = useAuth();
  const [selectedSystemId, setSelectedSystemId] = useState(plan?.machineSystemId ?? lockedMachineSystemId ?? '');
  const [ghiChu, setGhiChu] = useState(plan?.ghiChu ?? '');
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [bulkTanSuat, setBulkTanSuat] = useState('BA_THANG');
  const [bulkThangBatDau, setBulkThangBatDau] = useState(1);
  const [bulkToThucHien, setBulkToThucHien] = useState('CO_KHI');

  const isEdit = !!plan && !viewOnly;

  const applyBulk = () => {
    setItems((prev) => prev.map((item) => ({
      ...item,
      tanSuat: bulkTanSuat,
      thangBatDau: NEEDS_START_MONTH.has(bulkTanSuat) ? bulkThangBatDau : 1,
      toThucHien: bulkToThucHien,
    })));
  };

  const { data: codeResponse } = useGeneratedPlanCode();
  // Fetch ALL details (including hoatDong=false) for the selected system
  const { data: detailsResponse } = useMachineSystemDetails({
    page: 1,
    limit: 500,
    machineSystemId: selectedSystemId || undefined,
  });

  const createPlan = useCreateMaintenancePlan();
  const updatePlan = useUpdateMaintenancePlan();
  const details = detailsResponse?.data ?? [];
  const generatedCode = codeResponse?.data?.code ?? '';

  // When editing an existing plan, populate items from plan data
  useEffect(() => {
    if (plan?.items) {
      setItems(plan.items.map((i) => ({
        id: i.id,
        machineSystemDetailId: i.machineSystemDetailId,
        tenChiTiet: i.machineSystemDetail?.tenChiTiet ?? '',
        hoatDong: i.machineSystemDetail?.hoatDong !== false,
        noiDung: i.noiDung,
        tanSuat: i.tanSuat,
        toThucHien: i.toThucHien,
        soLuong: i.soLuong,
        thangBatDau: i.thangBatDau ?? 1,
        completedCount: (i.logs ?? []).filter((l) => l.hoanThanh).length,
      })));
    }
  }, [plan]);

  // When system changes (create mode), auto-populate from fetched details
  useEffect(() => {
    if (plan) return; // skip for existing plan — items come from plan.items
    if (!selectedSystemId || details.length === 0) return;
    setItems(details.map((d: any) => ({
      id: undefined,
      machineSystemDetailId: d.id,
      tenChiTiet: d.tenChiTiet,
      hoatDong: d.hoatDong !== false,
      noiDung: '',
      tanSuat: 'BA_THANG',
      toThucHien: 'CO_KHI',
      soLuong: 1,
      thangBatDau: 1,
      completedCount: 0,
    })));
  }, [details, selectedSystemId, plan]);

  const updateItem = (index: number, field: keyof ItemDraft, value: any) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleRemoveItem = (index: number) => {
    const item = items[index];
    if (item.completedCount > 0) {
      const ok = confirm(`Dòng "${item.tenChiTiet || 'thiết bị'}" có ${item.completedCount} tháng đã tick, ${item.completedCount} biên bản tự sinh sẽ bị xóa theo. Xác nhận xóa dòng này?`);
      if (!ok) return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedSystemId) return;
    if (isEdit) {
      await updatePlan.mutateAsync({
        id: plan!.id,
        data: {
          nguoiLap: user?.fullName ?? plan!.nguoiLap,
          ghiChu: ghiChu || undefined,
          items: items.map((i) => ({
            id: i.id,
            machineSystemDetailId: i.machineSystemDetailId,
            noiDung: i.noiDung,
            tanSuat: i.tanSuat,
            toThucHien: i.toThucHien,
            soLuong: i.soLuong,
            thangBatDau: NEEDS_START_MONTH.has(i.tanSuat) ? i.thangBatDau : 1,
          })),
        },
      });
      onClose();
    } else {
      await createPlan.mutateAsync({
        data: {
          maKeHoach: generatedCode,
          machineSystemId: selectedSystemId,
          nam: year,
          nguoiLap: user?.fullName ?? 'N/A',
          ghiChu: ghiChu || undefined,
          items: items.map((i) => ({
            machineSystemDetailId: i.machineSystemDetailId,
            noiDung: i.noiDung,
            tanSuat: i.tanSuat,
            toThucHien: i.toThucHien,
            soLuong: i.soLuong,
            thangBatDau: NEEDS_START_MONTH.has(i.tanSuat) ? i.thangBatDau : 1,
          })),
        },
      });
      onClose();
    }
  };

  return (
    <ModalForm
      isOpen
      onClose={onClose}
      title={isEdit ? `Sửa kế hoạch: ${plan?.maKeHoach}` : viewOnly ? `Chi tiết: ${plan?.maKeHoach}` : 'Tạo kế hoạch bảo dưỡng'}
      maxWidth="6xl"
      footer={viewOnly ? undefined : (
        <ModalFooter
          onClose={onClose}
          onSubmit={handleSubmit}
          submitLabel={isEdit ? 'Lưu thay đổi' : 'Lưu kế hoạch'}
          isLoading={isEdit ? updatePlan.isPending : createPlan.isPending}
          submitDisabled={!selectedSystemId}
        />
      )}
    >
      <div className="space-y-5">
        {/* Header info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField label="Mã kế hoạch">
            <input value={plan?.maKeHoach ?? generatedCode} readOnly className={inputCls() + ' bg-gray-50'} />
          </FormField>
          <FormField label="Hệ thống" required>
            <select
              value={selectedSystemId}
              onChange={(e) => { setSelectedSystemId(e.target.value); setItems([]); }}
              disabled={viewOnly || isEdit || !!lockedMachineSystemId}
              className={selectCls()}
            >
              <option value="">-- Chọn hệ thống --</option>
              {systems.map((s: any) => (
                <option key={s.id} value={s.id}>{s.tenHeThong} ({s.khuVuc})</option>
              ))}
            </select>
          </FormField>
          <FormField label="Năm">
            <input value={year} readOnly className={inputCls() + ' bg-gray-50'} />
          </FormField>
        </div>

        <FormField label="Ghi chú">
          <textarea
            value={ghiChu}
            onChange={(e) => setGhiChu(e.target.value)}
            disabled={viewOnly}
            rows={2}
            className={textareaCls()}
          />
        </FormField>

        {/* Items table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">
              Nội dung bảo dưỡng
              {items.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400">({items.length} thiết bị)</span>
              )}
            </h4>
          </div>

          {/* Bulk apply controls */}
          {!viewOnly && items.length > 0 && (
            <div className="flex items-end gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-blue-700 uppercase tracking-wide">Tần suất</label>
                <select
                  value={bulkTanSuat}
                  onChange={(e) => setBulkTanSuat(e.target.value)}
                  className="text-xs border border-blue-200 rounded px-2 py-1.5 bg-white"
                >
                  {FREQUENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {NEEDS_START_MONTH.has(bulkTanSuat) && (
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium text-blue-700 uppercase tracking-wide">Bắt đầu</label>
                  <select
                    value={bulkThangBatDau}
                    onChange={(e) => setBulkThangBatDau(Number(e.target.value))}
                    className="text-xs border border-blue-200 rounded px-2 py-1.5 bg-white"
                  >
                    {MONTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-blue-700 uppercase tracking-wide">Tổ TH</label>
                <select
                  value={bulkToThucHien}
                  onChange={(e) => setBulkToThucHien(e.target.value)}
                  className="text-xs border border-blue-200 rounded px-2 py-1.5 bg-white"
                >
                  {TEAM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <button
                type="button"
                onClick={applyBulk}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 whitespace-nowrap"
              >
                Áp dụng tất cả
              </button>
            </div>
          )}

          {items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              {selectedSystemId ? 'Đang tải danh sách thiết bị...' : 'Vui lòng chọn hệ thống trước.'}
            </p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-2 py-2 text-left w-[200px]">Thiết bị</th>
                    <th className="px-2 py-2 text-left">Nội dung BD</th>
                    <th className="px-2 py-2 text-center w-[140px]">Tần suất</th>
                    <th className="px-2 py-2 text-center w-[80px]">Bắt đầu</th>
                    <th className="px-2 py-2 text-center w-[100px]">Tổ TH</th>
                    {!viewOnly && <th className="px-2 py-2 w-[40px]"></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={item.machineSystemDetailId + '-' + idx} className="border-b border-gray-100">
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-gray-800">{item.tenChiTiet || '—'}</span>
                          {!item.hoatDong && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-600 rounded-full leading-none">
                              Ngừng HĐ
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        {viewOnly ? (
                          <span className="text-gray-700">{item.noiDung || <span className="text-gray-300 italic">—</span>}</span>
                        ) : (
                          <input
                            value={item.noiDung}
                            onChange={(e) => updateItem(idx, 'noiDung', e.target.value)}
                            className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                            placeholder="Nội dung bảo dưỡng (tuỳ chọn)..."
                          />
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {viewOnly ? (
                          <span className="text-gray-600">
                            {FREQUENCY_OPTIONS.find((o) => o.value === item.tanSuat)?.label ?? item.tanSuat}
                          </span>
                        ) : (
                          <select
                            value={item.tanSuat}
                            onChange={(e) => updateItem(idx, 'tanSuat', e.target.value)}
                            className="w-full text-xs border border-gray-200 rounded px-1 py-1"
                          >
                            {FREQUENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {NEEDS_START_MONTH.has(item.tanSuat) ? (
                          viewOnly ? (
                            <span className="text-gray-600">T{item.thangBatDau}</span>
                          ) : (
                            <select
                              value={item.thangBatDau}
                              onChange={(e) => updateItem(idx, 'thangBatDau', Number(e.target.value))}
                              className="w-full text-xs border border-gray-200 rounded px-1 py-1"
                            >
                              {MONTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          )
                        ) : (
                          <span className="block text-center text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {viewOnly ? (
                          <span className="text-gray-600">
                            {TEAM_OPTIONS.find((o) => o.value === item.toThucHien)?.label ?? item.toThucHien}
                          </span>
                        ) : (
                          <select
                            value={item.toThucHien}
                            onChange={(e) => updateItem(idx, 'toThucHien', e.target.value)}
                            className="w-full text-xs border border-gray-200 rounded px-1 py-1"
                          >
                            {TEAM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        )}
                      </td>
                      {!viewOnly && (
                        <td className="px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded"
                            title="Xóa dòng"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ModalForm>
  );
};

export default MaintenancePlanForm;
