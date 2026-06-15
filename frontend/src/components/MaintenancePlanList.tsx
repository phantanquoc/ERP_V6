import { useState, useMemo } from 'react';
import { Plus, Eye, Trash2, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMaintenancePlans, useToggleMonth, useDeleteMaintenancePlan, useUpdateLogNote } from '../hooks/useMaintenancePlans';
import { useMachineSystems } from '../hooks/useMachineSystemDetails';
import MaintenancePlanForm from './MaintenancePlanForm';
import MaintenanceLogModal from './MaintenanceLogModal';
import { MaintenancePlan, MaintenancePlanItem, MaintenancePlanItemLog } from '../services/maintenancePlanService';

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const FREQUENCY_LABELS: Record<string, string> = {
  HANG_NGAY: 'Hàng ngày',
  HANG_TUAN: 'Hàng tuần',
  HANG_THANG: 'Hàng tháng',
  HAI_THANG: '2 tháng/lần',
  BA_THANG: '3 tháng/lần',
  SAU_THANG: '6 tháng/lần',
  HANG_NAM: 'Hàng năm',
};
const TEAM_LABELS: Record<string, string> = {
  CO_KHI: 'Cơ khí',
  CO_DIEN: 'Cơ điện',
  DIEN: 'Điện',
  TONG_HOP: 'Tổng hợp',
};

/** Number of occurrences per applicable month for each frequency */
const FREQUENCY_TIMES: Record<string, number> = {
  HANG_NGAY: 22,
  HANG_TUAN: 4,
  HANG_THANG: 1,
  HAI_THANG: 1,
  BA_THANG: 1,
  SAU_THANG: 1,
  HANG_NAM: 1,
};

/** Which months are applicable for each frequency, starting from thangBatDau */
function getApplicableMonths(frequency: string, thangBatDau: number = 1): number[] {
  switch (frequency) {
    case 'HAI_THANG': {
      const months: number[] = [];
      for (let m = thangBatDau; m <= 12; m += 2) months.push(m);
      return months;
    }
    case 'BA_THANG': {
      const months: number[] = [];
      for (let m = thangBatDau; m <= 12; m += 3) months.push(m);
      return months;
    }
    case 'SAU_THANG': {
      const months: number[] = [];
      for (let m = thangBatDau; m <= 12; m += 6) months.push(m);
      return months;
    }
    case 'HANG_NAM': return [thangBatDau];
    default: return MONTHS; // HANG_NGAY, HANG_TUAN, HANG_THANG
  }
}

/** Get times per month for a frequency */
function getTimesPerMonth(frequency: string): number {
  return FREQUENCY_TIMES[frequency] ?? 1;
}

type ModalMode = 'create' | 'view' | null;

interface LogModalState {
  planId: string;
  itemId: string;
  month: number;
  timesPerMonth: number;
  logs: MaintenancePlanItemLog[];
  noiDung: string;
  tenThietBi: string;
  nguoiLap: string;
}

const MaintenancePlanList = () => {
  const [page, setPage] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSystemId, setSelectedSystemId] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [viewingPlan, setViewingPlan] = useState<MaintenancePlan | null>(null);
  const [logModal, setLogModal] = useState<LogModalState | null>(null);

  const filters = useMemo(() => ({
    page,
    limit: 5,
    nam: selectedYear,
    ...(selectedSystemId && { machineSystemId: selectedSystemId }),
  }), [page, selectedYear, selectedSystemId]);

  const { data: plansResponse, isLoading } = useMaintenancePlans(filters);
  const { data: systemsResponse } = useMachineSystems({ page: 1, limit: 200, hoatDong: true });
  const toggleMonth = useToggleMonth();
  const deletePlan = useDeleteMaintenancePlan();
  const updateLogNote = useUpdateLogNote();

  const plans = plansResponse?.data ?? [];
  const pagination = plansResponse?.pagination;
  const systems = systemsResponse?.data ?? [];

  const handleToggle = (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string) => {
    toggleMonth.mutate({ planId, itemId, month, lanThu, nguoiThucHien });
  };

  const handleUpdateNote = (logId: string, data: { ghiChu?: string; nguoiThucHien?: string }) => {
    updateLogNote.mutate({ logId, data });
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa kế hoạch này?')) {
      deletePlan.mutate(id);
    }
  };

  const handleOpenLogModal = (state: LogModalState) => {
    setLogModal(state);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => { setSelectedYear(Number(e.target.value)); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>
          <select
            value={selectedSystemId}
            onChange={(e) => { setSelectedSystemId(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
          >
            <option value="">Tất cả hệ thống</option>
            {systems.map((s: any) => (
              <option key={s.id} value={s.id}>{s.tenHeThong}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setModalMode('create')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Tạo kế hoạch
        </button>
      </div>

      {/* Plans */}
      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Đang tải...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Chưa có kế hoạch bảo dưỡng nào</div>
      ) : (
        plans.map((plan: MaintenancePlan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            onToggle={handleToggle}
            onOpenLogModal={handleOpenLogModal}
            onView={() => { setViewingPlan(plan); setModalMode('view'); }}
            onDelete={() => handleDelete(plan.id)}
          />
        ))
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">Trang {page} / {pagination.totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal */}
      {modalMode === 'create' && (
        <MaintenancePlanForm
          onClose={() => setModalMode(null)}
          systems={systems}
          year={selectedYear}
        />
      )}
      {modalMode === 'view' && viewingPlan && (
        <MaintenancePlanForm
          onClose={() => { setModalMode(null); setViewingPlan(null); }}
          systems={systems}
          year={selectedYear}
          plan={viewingPlan}
          viewOnly
        />
      )}

      {logModal && (
        <MaintenanceLogModal
          isOpen
          onClose={() => setLogModal(null)}
          planId={logModal.planId}
          itemId={logModal.itemId}
          month={logModal.month}
          timesPerMonth={logModal.timesPerMonth}
          logs={logModal.logs}
          noiDung={logModal.noiDung}
          tenThietBi={logModal.tenThietBi}
          nguoiLap={logModal.nguoiLap}
          onToggle={handleToggle}
          onUpdateNote={handleUpdateNote}
        />
      )}
    </div>
  );
};

interface PlanCardProps {
  plan: MaintenancePlan;
  onToggle: (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string) => void;
  onOpenLogModal: (state: LogModalState) => void;
  onView: () => void;
  onDelete: () => void;
}

const PlanCard = ({ plan, onToggle, onOpenLogModal, onView, onDelete }: PlanCardProps) => (
  <div className="border border-gray-200 rounded-lg overflow-hidden">
    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
      <div>
        <span className="text-sm font-semibold text-gray-900">{plan.maKeHoach}</span>
        <span className="mx-2 text-gray-300">|</span>
        <span className="text-sm text-gray-600">{plan.machineSystem?.tenHeThong}</span>
        <span className="mx-2 text-gray-300">|</span>
        <span className="text-xs text-gray-500">{plan.machineSystem?.khuVuc} - {plan.machineSystem?.viTri}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
          plan.trangThai === 'Đang thực hiện' ? 'bg-green-100 text-green-700' :
          plan.trangThai === 'Hoàn thành' ? 'bg-blue-100 text-blue-700' :
          'bg-yellow-100 text-yellow-700'
        }`}>
          {plan.trangThai}
        </span>
        <button onClick={onView} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
          <Eye className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>

    {/* Items table with month columns */}
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">Thiết bị</th>
            <th className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">Nội dung BD</th>
            <th className="px-2 py-2 text-center font-medium text-gray-600 whitespace-nowrap">Tần suất</th>
            <th className="px-2 py-2 text-center font-medium text-gray-600 whitespace-nowrap">Tổ TH</th>
            {MONTHS.map((m) => (
              <th key={m} className="px-1 py-2 text-center font-medium text-gray-600 min-w-[2rem]">T{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(plan.items ?? []).map((item) => (
            <PlanItemRow
              key={item.id}
              planId={plan.id}
              item={item}
              nguoiLap={plan.nguoiLap}
              onToggle={onToggle}
              onOpenLogModal={onOpenLogModal}
            />
          ))}
        </tbody>
      </table>
    </div>

    {/* Footer */}
    <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
      Người lập: {plan.nguoiLap} | Ngày: {new Date(plan.ngayLap).toLocaleDateString('vi-VN')}
      {plan._count?.records ? ` | ${plan._count.records} biên bản` : ''}
    </div>
  </div>
);

interface PlanItemRowProps {
  planId: string;
  item: MaintenancePlanItem;
  nguoiLap: string;
  onToggle: (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string) => void;
  onOpenLogModal: (state: LogModalState) => void;
}

const PlanItemRow = ({ planId, item, nguoiLap, onToggle, onOpenLogModal }: PlanItemRowProps) => {
  const applicableMonths = getApplicableMonths(item.tanSuat, item.thangBatDau ?? 1);
  const timesPerMonth = getTimesPerMonth(item.tanSuat);
  const logs = item.logs ?? [];

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-2 whitespace-nowrap text-gray-900">
        {item.machineSystemDetail?.tenChiTiet ?? '—'}
      </td>
      <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate">{item.noiDung}</td>
      <td className="px-2 py-2 text-center text-gray-600">{FREQUENCY_LABELS[item.tanSuat] ?? item.tanSuat}</td>
      <td className="px-2 py-2 text-center text-gray-600">{TEAM_LABELS[item.toThucHien] ?? item.toThucHien}</td>
      {MONTHS.map((m) => {
        const isApplicable = applicableMonths.includes(m);
        if (!isApplicable) {
          return <td key={m} className="px-1 py-2 text-center"><span className="text-gray-300">&mdash;</span></td>;
        }
        const monthLogs = logs.filter((l) => l.thang === m);
        return (
          <td key={m} className="px-1 py-2">
            <MonthCell
              planId={planId}
              itemId={item.id}
              month={m}
              timesPerMonth={timesPerMonth}
              logs={monthLogs}
              noiDung={item.noiDung}
              tenThietBi={item.machineSystemDetail?.tenChiTiet ?? '—'}
              nguoiLap={nguoiLap}
              onToggle={onToggle}
              onOpenLogModal={onOpenLogModal}
            />
          </td>
        );
      })}
    </tr>
  );
};

interface MonthCellProps {
  planId: string;
  itemId: string;
  month: number;
  timesPerMonth: number;
  logs: MaintenancePlanItemLog[];
  noiDung: string;
  tenThietBi: string;
  nguoiLap: string;
  onToggle: (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string) => void;
  onOpenLogModal: (state: LogModalState) => void;
}

const MonthCell = ({ planId, itemId, month, timesPerMonth, logs, noiDung, tenThietBi, nguoiLap, onToggle, onOpenLogModal }: MonthCellProps) => {
  const openModal = () => {
    onOpenLogModal({ planId, itemId, month, timesPerMonth, logs, noiDung, tenThietBi, nguoiLap });
  };

  if (timesPerMonth === 1) {
    const log = logs.find((l) => l.lanThu === 1);
    const checked = log?.hoanThanh ?? false;
    const hasNote = !!log?.ghiChu;
    return (
      <div className="flex flex-col items-center gap-0.5 relative">
        <button
          onClick={openModal}
          className={`w-6 h-6 rounded border flex items-center justify-center transition-colors ${
            checked
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          {checked && <Check className="w-3 h-3" />}
        </button>
        {hasNote && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" title={log?.ghiChu ?? ''} />
        )}
      </div>
    );
  }

  const completedCount = logs.filter((l) => l.hoanThanh).length;
  const allDone = completedCount === timesPerMonth;

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={openModal}
        className={`w-6 h-6 rounded border text-[10px] font-medium flex items-center justify-center transition-colors ${
          allDone
            ? 'bg-green-500 border-green-500 text-white'
            : completedCount > 0
            ? 'bg-green-100 border-green-300 text-green-700'
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-500'
        }`}
        title={`${completedCount}/${timesPerMonth} hoàn thành`}
      >
        {allDone ? <Check className="w-3 h-3" /> : completedCount > 0 ? `${completedCount}` : ''}
      </button>
    </div>
  );
};

export default MaintenancePlanList;

