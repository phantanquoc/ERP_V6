import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ModalForm, ModalFooter, FormField, inputCls, selectCls, textareaCls } from './ModalForm';
import { useCreateMaintenancePlan, useGeneratedPlanCode } from '../hooks/useMaintenancePlans';
import { useMaintenanceTemplates } from '../hooks/useMaintenanceTemplates';
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
];

const TEAM_OPTIONS = [
  { value: 'CO_KHI', label: 'Cơ khí' },
  { value: 'CO_DIEN', label: 'Cơ điện' },
  { value: 'DIEN', label: 'Điện' },
  { value: 'TONG_HOP', label: 'Tổng hợp' },
];

interface ItemDraft {
  machineSystemDetailId: string;
  maintenanceTemplateId?: string;
  noiDung: string;
  tanSuat: string;
  toThucHien: string;
  soLuong: number;
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

  const { data: codeResponse } = useGeneratedPlanCode();
  const { data: detailsResponse } = useMachineSystemDetails({
    page: 1,
    limit: 500,
    machineSystemId: selectedSystemId || undefined,
    hoatDong: true,
  });
  const { data: templatesResponse } = useMaintenanceTemplates({
    machineSystemId: selectedSystemId || undefined,
    hoatDong: true,
    limit: 200,
  });

  const createPlan = useCreateMaintenancePlan();
  const details = detailsResponse?.data ?? [];
  const templates = templatesResponse?.data ?? [];
  const generatedCode = codeResponse?.data?.code ?? '';

  useEffect(() => {
    if (plan?.items) {
      setItems(plan.items.map((i) => ({
        machineSystemDetailId: i.machineSystemDetailId,
        maintenanceTemplateId: i.maintenanceTemplateId ?? undefined,
        noiDung: i.noiDung,
        tanSuat: i.tanSuat,
        toThucHien: i.toThucHien,
        soLuong: i.soLuong,
      })));
    }
  }, [plan]);

  const handleLoadTemplates = () => {
    if (templates.length === 0) return;
    const newItems: ItemDraft[] = templates.map((t: any) => ({
      machineSystemDetailId: t.machineSystemDetailId ?? '',
      maintenanceTemplateId: t.id,
      noiDung: t.noiDung,
      tanSuat: t.tanSuat,
      toThucHien: t.toThucHien,
      soLuong: 1,
    }));
    setItems((prev) => [...prev, ...newItems]);
  };

  const addItem = () => {
    setItems((prev) => [...prev, { machineSystemDetailId: '', noiDung: '', tanSuat: 'BA_THANG', toThucHien: 'CO_KHI', soLuong: 1 }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemDraft, value: any) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async () => {
    if (!selectedSystemId || items.length === 0) return;
    await createPlan.mutateAsync({
      data: {
        maKeHoach: generatedCode,
        machineSystemId: selectedSystemId,
        nam: year,
        nguoiLap: user?.fullName ?? 'N/A',
        ghiChu: ghiChu || undefined,
        items: items.filter((i) => i.machineSystemDetailId && i.noiDung),
      },
    });
    onClose();
  };

  return (
    <ModalForm
      isOpen
      onClose={onClose}
      title={viewOnly ? `Chi tiết: ${plan?.maKeHoach}` : 'Tạo kế hoạch bảo dưỡng'}
      maxWidth="6xl"
      footer={viewOnly ? undefined : (
        <ModalFooter
          onClose={onClose}
          onSubmit={handleSubmit}
          submitLabel="Lưu kế hoạch"
          isLoading={createPlan.isPending}
          submitDisabled={!selectedSystemId || items.length === 0}
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
              disabled={viewOnly || !!lockedMachineSystemId}
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

        {/* Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700">Nội dung bảo dưỡng</h4>
            {!viewOnly && (
              <div className="flex gap-2">
                {templates.length > 0 && (
                  <button
                    type="button"
                    onClick={handleLoadTemplates}
                    className="text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
                  >
                    Nạp từ template ({templates.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Thêm dòng
                </button>
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              {selectedSystemId ? 'Chưa có nội dung. Nạp từ template hoặc thêm thủ công.' : 'Vui lòng chọn hệ thống trước.'}
            </p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-2 py-2 text-left w-[180px]">Thiết bị</th>
                    <th className="px-2 py-2 text-left">Nội dung BD</th>
                    <th className="px-2 py-2 text-center w-[120px]">Tần suất</th>
                    <th className="px-2 py-2 text-center w-[100px]">Tổ TH</th>
                    <th className="px-2 py-2 text-center w-[60px]">SL</th>
                    {!viewOnly && <th className="px-2 py-2 w-[40px]"></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="px-2 py-1.5">
                        <select
                          value={item.machineSystemDetailId}
                          onChange={(e) => updateItem(idx, 'machineSystemDetailId', e.target.value)}
                          disabled={viewOnly}
                          className="w-full text-xs border border-gray-200 rounded px-1 py-1"
                        >
                          <option value="">-- Chọn --</option>
                          {details.map((d: any) => (
                            <option key={d.id} value={d.id}>{d.tenChiTiet}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={item.noiDung}
                          onChange={(e) => updateItem(idx, 'noiDung', e.target.value)}
                          disabled={viewOnly}
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1"
                          placeholder="Nội dung bảo dưỡng..."
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={item.tanSuat}
                          onChange={(e) => updateItem(idx, 'tanSuat', e.target.value)}
                          disabled={viewOnly}
                          className="w-full text-xs border border-gray-200 rounded px-1 py-1"
                        >
                          {FREQUENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={item.toThucHien}
                          onChange={(e) => updateItem(idx, 'toThucHien', e.target.value)}
                          disabled={viewOnly}
                          className="w-full text-xs border border-gray-200 rounded px-1 py-1"
                        >
                          {TEAM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={item.soLuong}
                          onChange={(e) => updateItem(idx, 'soLuong', parseInt(e.target.value, 10) || 1)}
                          disabled={viewOnly}
                          min={1}
                          className="w-full text-xs border border-gray-200 rounded px-2 py-1 text-center"
                        />
                      </td>
                      {!viewOnly && (
                        <td className="px-2 py-1.5 text-center">
                          <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
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

