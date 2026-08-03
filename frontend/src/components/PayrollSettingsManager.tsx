import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import { usePayrollSettings, useUpdatePayrollSettings } from '../hooks/usePayroll';
import { parseNumberInput } from '../utils/numberInput';

const EMPTY_FORM = {
  standardWorkDays: 26,
  overtimeRate: 0,
  mealAllowancePerDay: 0,
  overtimeMealAllowance: 25000,
  sundayMealAllowance: 0,
  fuelPricePerKm: 0,
  otRateWeekday: 1.5,
  otRateWeekdayExtra: 2.1,
  otRateSunday: 2,
  otRateSundayExtra: 2.7,
  otRateHoliday: 3,
};

/** Số tiền và số ngày — nhập số nguyên. */
const AMOUNT_FIELDS = [
  { key: 'mealAllowancePerDay', label: 'Cơm/ngày (₫)' },
  { key: 'overtimeMealAllowance', label: 'Cơm tăng ca (₫)' },
  { key: 'sundayMealAllowance', label: 'Cơm chủ nhật (₫)' },
  { key: 'fuelPricePerKm', label: 'Xăng (₫/km)' },
] as const;

/** Hệ số nhân lương tăng ca — nhập số thập phân. */
const RATE_FIELDS = [
  { key: 'otRateWeekday', label: 'Ngày thường' },
  { key: 'otRateWeekdayExtra', label: 'Ngày thường (ngoài giờ)' },
  { key: 'otRateSunday', label: 'Chủ nhật' },
  { key: 'otRateSundayExtra', label: 'Chủ nhật (ngoài giờ)' },
  { key: 'otRateHoliday', label: 'Ngày lễ' },
] as const;

const PayrollSettingsManager: React.FC = () => {
  const { data: settings, isLoading } = usePayrollSettings();
  const updateMutation = useUpdatePayrollSettings();
  const [form, setForm] = useState(EMPTY_FORM);

  // Settings về sau khi fetch xong, nên form phải đồng bộ lại thay vì chỉ lấy giá trị khởi tạo.
  useEffect(() => {
    if (settings) {
      setForm({
        standardWorkDays: settings.standardWorkDays ?? EMPTY_FORM.standardWorkDays,
        overtimeRate: settings.overtimeRate ?? EMPTY_FORM.overtimeRate,
        mealAllowancePerDay: settings.mealAllowancePerDay ?? EMPTY_FORM.mealAllowancePerDay,
        overtimeMealAllowance: settings.overtimeMealAllowance ?? EMPTY_FORM.overtimeMealAllowance,
        sundayMealAllowance: settings.sundayMealAllowance ?? EMPTY_FORM.sundayMealAllowance,
        fuelPricePerKm: settings.fuelPricePerKm ?? EMPTY_FORM.fuelPricePerKm,
        otRateWeekday: settings.otRateWeekday ?? EMPTY_FORM.otRateWeekday,
        otRateWeekdayExtra: settings.otRateWeekdayExtra ?? EMPTY_FORM.otRateWeekdayExtra,
        otRateSunday: settings.otRateSunday ?? EMPTY_FORM.otRateSunday,
        otRateSundayExtra: settings.otRateSundayExtra ?? EMPTY_FORM.otRateSundayExtra,
        otRateHoliday: settings.otRateHoliday ?? EMPTY_FORM.otRateHoliday,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    if (form.standardWorkDays < 1) {
      toast.error('Số ngày công chuẩn phải lớn hơn 0');
      return;
    }
    try {
      await updateMutation.mutateAsync(form);
      toast.success('Cập nhật cài đặt bảng lương thành công');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi lưu cài đặt');
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500 text-sm">Đang tải...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Số ngày công chuẩn / tháng</label>
          <input
            type="number"
            min={1}
            value={form.standardWorkDays}
            onChange={(e) => setForm({ ...form, standardWorkDays: parseNumberInput(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            Khấu trừ ngày nghỉ = Lương cơ bản / ngày công chuẩn × số ngày nghỉ
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Giá tiền OT (₫/giờ)</label>
          <input
            type="number"
            min={0}
            value={form.overtimeRate}
            onChange={(e) => setForm({ ...form, overtimeRate: parseNumberInput(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">Tiền OT = Giá OT × Số giờ OT</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Hệ số tăng ca (chấm công)</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {RATE_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1">{label}</label>
              <input
                type="number"
                step="0.1"
                min={0}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: parseFloat(e.target.value) || 0 })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-700 mb-2">Phụ cấp</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {AMOUNT_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1">{label}</label>
              <input
                type="number"
                min={0}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: parseNumberInput(e.target.value) })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm disabled:bg-gray-400"
        >
          <Save size={16} />
          {updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}
        </button>
      </div>
    </div>
  );
};

export default PayrollSettingsManager;
