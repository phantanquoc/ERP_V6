import { useState, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Plus, Eye, Pencil, Trash2, Check, ChevronLeft, ChevronRight, Download, RefreshCw } from 'lucide-react';
import { useMaintenancePlans, useToggleMonth, useDeleteMaintenancePlan, useUpdateLogNote, useSyncDetails } from '../hooks/useMaintenancePlans';
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
  KHONG_CO_DINH: 'Không cố định',
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
  KHONG_CO_DINH: 0,
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
    case 'KHONG_CO_DINH': return MONTHS;
    default: return MONTHS; // HANG_NGAY, HANG_TUAN, HANG_THANG
  }
}

/** Get times per month for a frequency */
function getTimesPerMonth(frequency: string): number {
  return FREQUENCY_TIMES[frequency] ?? 1;
}

/** Calculate plan progress: completed / total applicable occurrences */
function calculatePlanProgress(items: MaintenancePlanItem[]): { completed: number; total: number } {
  let total = 0;
  let completed = 0;
  for (const item of items) {
    // KHONG_CO_DINH items do not count toward plan progress
    if (item.tanSuat === 'KHONG_CO_DINH') continue;
    const applicableMonths = getApplicableMonths(item.tanSuat, item.thangBatDau ?? 1);
    const timesPerMonth = getTimesPerMonth(item.tanSuat);
    total += applicableMonths.length * timesPerMonth;
    completed += (item.logs ?? []).filter((l) => l.hoanThanh).length;
  }
  return { completed, total };
}

/** Export plan as CSV download */
function exportPlanCSV(plan: MaintenancePlan) {
  const items = plan.items ?? [];
  const headers = ['Thiết bị', 'Nội dung BD', 'Tần suất', 'Tổ TH', ...MONTHS.map((m) => `T${m}`)];
  const rows = items.map((item) => {
    const applicableMonths = getApplicableMonths(item.tanSuat, item.thangBatDau ?? 1);
    const timesPerMonth = getTimesPerMonth(item.tanSuat);
    const logs = item.logs ?? [];
    const monthCells = MONTHS.map((m) => {
      if (!applicableMonths.includes(m)) return '';
      const monthLogs = logs.filter((l) => l.thang === m);
      const doneCount = monthLogs.filter((l) => l.hoanThanh).length;
      if (doneCount === timesPerMonth) return '✓';
      if (doneCount > 0) return `${doneCount}/${timesPerMonth}`;
      return '0/' + timesPerMonth;
    });
    return [
      item.machineSystemDetail?.tenChiTiet ?? '',
      item.noiDung,
      FREQUENCY_LABELS[item.tanSuat] ?? item.tanSuat,
      TEAM_LABELS[item.toThucHien] ?? item.toThucHien,
      ...monthCells,
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const bom = '﻿';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${plan.maKeHoach}_bao-duong.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

const CURRENT_MONTH = new Date().getMonth() + 1;

type ModalMode = 'create' | 'view' | 'edit' | null;

interface LogModalState {
  planId: string;
  itemId: string;
  month: number;
  timesPerMonth: number;
  noiDung: string;
  tenThietBi: string;
  nguoiLap: string;
}

interface MaintenancePlanListProps {
  lockedMachineSystemId?: string;
}

const MaintenancePlanList = ({ lockedMachineSystemId }: MaintenancePlanListProps = {}) => {
  const [page, setPage] = useState(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSystemId, setSelectedSystemId] = useState(lockedMachineSystemId ?? '');
  const [selectedTrangThai, setSelectedTrangThai] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [viewingPlan, setViewingPlan] = useState<MaintenancePlan | null>(null);
  const [logModal, setLogModal] = useState<LogModalState | null>(null);

  useEffect(() => {
    if (lockedMachineSystemId) {
      setSelectedSystemId(lockedMachineSystemId);
      setPage(1);
    }
  }, [lockedMachineSystemId]);

  const filters = useMemo(() => ({
    page,
    limit: 5,
    nam: selectedYear,
    ...(selectedSystemId && { machineSystemId: selectedSystemId }),
    ...(selectedTrangThai && { trangThai: selectedTrangThai }),
  }), [page, selectedYear, selectedSystemId, selectedTrangThai]);

  const { data: plansResponse, isLoading } = useMaintenancePlans(filters);
  const { data: systemsResponse } = useMachineSystems({ page: 1, limit: 200, hoatDong: true });
  const toggleMonth = useToggleMonth();
  const deletePlan = useDeleteMaintenancePlan();
  const updateLogNote = useUpdateLogNote();
  const syncDetails = useSyncDetails();

  const plans = plansResponse?.data ?? [];
  const pagination = plansResponse?.pagination;
  const systems = systemsResponse?.data ?? [];

  const handleToggle = (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string, nguoiPhu?: string[]) => {
    toggleMonth.mutate({ planId, itemId, month, lanThu, nguoiThucHien, nguoiPhu }, {
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Cập nhật tháng thất bại'),
    });
  };

  const handleUpdateNote = (logId: string, data: { ghiChu?: string; nguoiThucHien?: string; nguoiPhu?: string[] }) => {
    updateLogNote.mutate({ logId, data }, {
      onSuccess: () => toast.success('Đã cập nhật ghi chú'),
      onError: (err) => toast.error(err instanceof Error ? err.message : 'Cập nhật ghi chú thất bại'),
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc muốn xóa kế hoạch này?')) {
      deletePlan.mutate(id, {
        onSuccess: () => toast.success('Đã xóa kế hoạch'),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Xóa kế hoạch thất bại'),
      });
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
          {!lockedMachineSystemId && (
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
          )}
          <select
            value={selectedTrangThai}
            onChange={(e) => { setSelectedTrangThai(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Đang thực hiện">Đang thực hiện</option>
            <option value="Hoàn thành">Hoàn thành</option>
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
            onEdit={() => { setViewingPlan(plan); setModalMode('edit'); }}
            onDelete={() => handleDelete(plan.id)}
            onSync={() => syncDetails.mutate(plan.id, {
              onSuccess: () => toast.success('Đồng bộ linh kiện thành công'),
              onError: (err) => toast.error(err instanceof Error ? err.message : 'Đồng bộ thất bại'),
            })}
            isSyncing={syncDetails.isPending}
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
          lockedMachineSystemId={lockedMachineSystemId}
        />
      )}
      {modalMode === 'view' && viewingPlan && (
        <MaintenancePlanForm
          onClose={() => { setModalMode(null); setViewingPlan(null); }}
          systems={systems}
          year={selectedYear}
          plan={viewingPlan}
          viewOnly
          lockedMachineSystemId={lockedMachineSystemId}
        />
      )}
      {modalMode === 'edit' && viewingPlan && (
        <MaintenancePlanForm
          onClose={() => { setModalMode(null); setViewingPlan(null); }}
          systems={systems}
          year={selectedYear}
          plan={viewingPlan}
          lockedMachineSystemId={lockedMachineSystemId}
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
          logs={
            plans
              .find((p) => p.id === logModal.planId)
              ?.items?.find((i) => i.id === logModal.itemId)
              ?.logs?.filter((l) => l.thang === logModal.month) ?? []
          }
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
  onToggle: (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string, nguoiPhu?: string[]) => void;
  onOpenLogModal: (state: LogModalState) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSync: () => void;
  isSyncing: boolean;
}

const PlanCard = ({ plan, onToggle, onOpenLogModal, onView, onEdit, onDelete, onSync, isSyncing }: PlanCardProps) => {
  const { completed, total } = calculatePlanProgress(plan.items ?? []);
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const items = plan.items ?? [];

  // Build parent-child groups for display
  // Parents: items where machineSystemDetail.parentDetailId === null (or undefined)
  // Children: items where parentDetailId is set
  // Standalone: items with no parent and no children themselves
  const parentItems = items.filter((i) => !i.machineSystemDetail?.parentDetailId);
  const childItemsByParentDetailId = new Map<string, MaintenancePlanItem[]>();
  for (const item of items) {
    const pid = item.machineSystemDetail?.parentDetailId;
    if (pid) {
      const arr = childItemsByParentDetailId.get(pid) ?? [];
      arr.push(item);
      childItemsByParentDetailId.set(pid, arr);
    }
  }

  // Determine which parentItems actually have children
  const renderedRows: Array<{ type: 'parent-header'; item: MaintenancePlanItem; children: MaintenancePlanItem[] } | { type: 'child' | 'standalone'; item: MaintenancePlanItem }> = [];
  for (const parentItem of parentItems) {
    const children = childItemsByParentDetailId.get(parentItem.machineSystemDetailId) ?? [];
    if (children.length > 0) {
      renderedRows.push({ type: 'parent-header', item: parentItem, children });
      for (const child of children) {
        renderedRows.push({ type: 'child', item: child });
      }
    } else {
      renderedRows.push({ type: 'standalone', item: parentItem });
    }
  }

  // Orphan sweep: render children whose parentDetailId points to a device
  // not present in the plan (parent was never added or was removed).
  const parentDetailIdSet = new Set(parentItems.map((p) => p.machineSystemDetailId));
  for (const [key, orphans] of childItemsByParentDetailId) {
    if (!parentDetailIdSet.has(key)) {
      for (const child of orphans) {
        renderedRows.push({ type: 'standalone', item: child });
      }
    }
  }

  return (
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
          {plan.trangThai === 'Đang thực hiện' && (
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="p-1.5 text-gray-400 hover:text-indigo-600 rounded disabled:opacity-50"
              title="Đồng bộ linh kiện mới"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button onClick={() => exportPlanCSV(plan)} className="p-1.5 text-gray-400 hover:text-green-600 rounded" title="Export CSV">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-amber-600 rounded" title="Sửa kế hoạch">
            <Pencil className="w-4 h-4" />
          </button>
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
                <th key={m} className={`px-1 py-2 text-center font-medium text-gray-600 min-w-[2rem] ${m === CURRENT_MONTH ? 'bg-blue-50 border-b-2 border-blue-400' : ''}`}>T{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderedRows.map((row) => {
              if (row.type === 'parent-header') {
                // Calculate group progress for current month
                const groupChildren = row.children;
                const groupTotal = groupChildren.length;
                const groupCompleted = groupChildren.filter((child) => {
                  const logs = child.logs ?? [];
                  const monthLogs = logs.filter((l) => l.thang === CURRENT_MONTH && l.hoanThanh);
                  return monthLogs.length > 0;
                }).length;
                return (
                  <tr key={`parent-${row.item.id}`} className="bg-gray-50/70 border-b border-gray-200">
                    <td className="px-3 py-1.5 font-medium text-gray-700" colSpan={4}>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded font-semibold uppercase tracking-wide">
                          {row.item.machineSystemDetail?.loaiChiTiet ?? 'Cụm'}
                        </span>
                        <span>{row.item.machineSystemDetail?.tenChiTiet ?? '—'}</span>
                        {row.item.machineSystemDetail?.hoatDong === false && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-600 rounded-full leading-none">
                            Ngừng HĐ
                          </span>
                        )}
                        <span className="text-gray-400 text-[10px]">
                          T{CURRENT_MONTH}: {groupCompleted}/{groupTotal}
                        </span>
                      </div>
                    </td>
                    {MONTHS.map((m) => (
                      <td key={m} className={`px-1 py-1.5 ${m === CURRENT_MONTH ? 'bg-blue-50/30' : ''}`} />
                    ))}
                  </tr>
                );
              }

              const indent = row.type === 'child';
              return (
                <PlanItemRow
                  key={row.item.id}
                  planId={plan.id}
                  item={row.item}
                  nguoiLap={plan.nguoiLap}
                  onToggle={onToggle}
                  onOpenLogModal={onOpenLogModal}
                  indent={indent}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer with progress bar */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Người lập: {plan.nguoiLap} | Ngày: {new Date(plan.ngayLap).toLocaleDateString('vi-VN')}
            {plan._count?.records ? ` | ${plan._count.records} biên bản` : ''}
          </span>
          <span className="text-gray-600 font-medium">{completed}/{total} hoàn thành ({percent}%)</span>
        </div>
        <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5">
          <div
            className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
};

interface PlanItemRowProps {
  planId: string;
  item: MaintenancePlanItem;
  nguoiLap: string;
  onToggle: (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string, nguoiPhu?: string[]) => void;
  onOpenLogModal: (state: LogModalState) => void;
  indent?: boolean;
}

const PlanItemRow = ({ planId, item, nguoiLap, onToggle, onOpenLogModal, indent }: PlanItemRowProps) => {
  const applicableMonths = getApplicableMonths(item.tanSuat, item.thangBatDau ?? 1);
  const timesPerMonth = getTimesPerMonth(item.tanSuat);
  const logs = item.logs ?? [];
  const isKhongCoDinh = item.tanSuat === 'KHONG_CO_DINH';

  // Smart suggestion: skip for KHONG_CO_DINH
  const suggestedMonth = isKhongCoDinh ? null : (applicableMonths.find((m) => {
    const monthLogs = logs.filter((l) => l.thang === m);
    const completedCount = monthLogs.filter((l) => l.hoanThanh).length;
    return completedCount < timesPerMonth;
  }) ?? null);

  const hoatDong = item.machineSystemDetail?.hoatDong !== false;

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-2 whitespace-nowrap text-gray-900">
        <div className={`flex items-center gap-1.5 ${indent ? 'pl-4' : ''}`}>
          <span>{item.machineSystemDetail?.tenChiTiet ?? '—'}</span>
          {!hoatDong && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-600 rounded-full leading-none">
              Ngừng HĐ
            </span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate">{item.noiDung}</td>
      <td className="px-2 py-2 text-center text-gray-600">{FREQUENCY_LABELS[item.tanSuat] ?? item.tanSuat}</td>
      <td className="px-2 py-2 text-center text-gray-600">{TEAM_LABELS[item.toThucHien] ?? item.toThucHien}</td>
      {MONTHS.map((m) => {
        const isApplicable = applicableMonths.includes(m);
        const isCurrentMonth = m === CURRENT_MONTH;
        const isSuggested = isApplicable && m === suggestedMonth;
        const monthLogs = logs.filter((l) => l.thang === m);
        return (
          <td key={m} className={`px-1 py-2 ${isCurrentMonth ? 'bg-blue-50/30' : ''}`}>
            <MonthCell
              planId={planId}
              itemId={item.id}
              month={m}
              timesPerMonth={timesPerMonth}
              logs={monthLogs}
              noiDung={item.noiDung}
              tenThietBi={item.machineSystemDetail?.tenChiTiet ?? '—'}
              nguoiLap={nguoiLap}
              isApplicable={isApplicable}
              isSuggested={isSuggested}
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
  isApplicable: boolean;
  isSuggested: boolean;
  onToggle: (planId: string, itemId: string, month: number, lanThu: number, nguoiThucHien?: string, nguoiPhu?: string[]) => void;
  onOpenLogModal: (state: LogModalState) => void;
}

const MonthCell = ({ planId, itemId, month, timesPerMonth, logs, noiDung, tenThietBi, nguoiLap, isApplicable, isSuggested, onToggle: _onToggle, onOpenLogModal }: MonthCellProps) => {
  const openModal = () => {
    onOpenLogModal({ planId, itemId, month, timesPerMonth, noiDung, tenThietBi, nguoiLap });
  };

  // Non-applicable months: clickable but styled with dashed border to indicate "extra"
  if (!isApplicable) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <button
          onClick={openModal}
          className="w-6 h-6 rounded border border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-gray-400 hover:text-gray-400 transition-colors"
          title="Tháng không áp dụng — nhấn để xem / ghi chú"
        >
          <span className="text-[9px]">+</span>
        </button>
      </div>
    );
  }

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
              : isSuggested
              ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300 hover:bg-blue-100'
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
            : isSuggested
            ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300 hover:bg-blue-100 text-gray-500'
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

