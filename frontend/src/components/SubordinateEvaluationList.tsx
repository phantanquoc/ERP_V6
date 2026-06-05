import React, { useState, useEffect } from 'react';
import { Eye, CheckCircle, Clock, ChevronDown, ChevronRight, Search, ClipboardEdit } from 'lucide-react';
import employeeEvaluationService, { EvaluationDetailsResponse } from '@services/employeeEvaluationService';

interface Subordinate {
  userId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  positionName: string;
  evaluationId: string;
  period: string;
  selfScorePercentage: number;
  supervisorScore1Percentage: number;
  supervisorScore2Percentage: number;
  status: string;
  isSupervisor1: boolean;
  isSupervisor2: boolean;
}

interface SubordinateEvaluationListProps {
  month: number;
  year: number;
  onEvaluate: (subordinate: Subordinate, details: EvaluationDetailsResponse) => void;
}

type FilterOption = 'all' | 'mine' | 'self_pending' | 'other_supervisor' | 'completed';

// Determine which group a subordinate falls into from the current user's perspective
function getGroup(s: Subordinate): 'mine' | 'self_pending' | 'other_supervisor' | 'completed' {
  if (s.status === 'COMPLETED' || s.status === 'ACKNOWLEDGED') return 'completed';
  if (s.status === 'SELF_PENDING') return 'self_pending';
  if (
    (s.status === 'SUPERVISOR1_PENDING' && s.isSupervisor1) ||
    (s.status === 'SUPERVISOR2_PENDING' && s.isSupervisor2)
  ) {
    return 'mine';
  }
  // SUPERVISOR1_PENDING but user is supervisor2, or SUPERVISOR2_PENDING but user is supervisor1
  return 'other_supervisor';
}

function getRoleBadge(s: Subordinate) {
  if (s.isSupervisor1 && s.isSupervisor2) {
    return (
      <span className="inline-flex items-center gap-0.5">
        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">CT1</span>
        <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700">CT2</span>
      </span>
    );
  }
  if (s.isSupervisor1) {
    return <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">CT1</span>;
  }
  if (s.isSupervisor2) {
    return <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-700">CT2</span>;
  }
  return null;
}

function getWaitingFor(s: Subordinate): string {
  if (s.status === 'SUPERVISOR1_PENDING') return 'Chờ cấp trên 1';
  if (s.status === 'SUPERVISOR2_PENDING') return 'Chờ cấp trên 2';
  if (s.status === 'NOT_STARTED') return 'Chưa bắt đầu';
  const statusMap: Record<string, string> = {
    SELF_PENDING: 'Chờ tự đánh giá',
    COMPLETED: 'Hoàn thành',
    ACKNOWLEDGED: 'Đã xác nhận',
  };
  return statusMap[s.status] || s.status;
}

interface SectionProps {
  title: string;
  count: number;
  defaultOpen: boolean;
  accentClass: string;
  children: React.ReactNode;
}

const Section = ({ title, count, defaultOpen, accentClass, children }: SectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  if (count === 0) return null;
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left ${accentClass} hover:brightness-95 transition-all`}
      >
        <span className="flex items-center gap-2 font-medium text-sm">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {title}
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-white/60">{count}</span>
        </span>
      </button>
      {open && <div className="overflow-x-auto">{children}</div>}
    </div>
  );
};

const SubordinateEvaluationList = ({ month, year, onEvaluate }: SubordinateEvaluationListProps) => {
  const [subordinates, setSubordinates] = useState<Subordinate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    loadSubordinates();
  }, [month, year]);

  const loadSubordinates = async () => {
    try {
      setLoading(true);
      setActionError('');
      const data = await employeeEvaluationService.getSubordinatesForEvaluation(month, year);
      setSubordinates(data || []);
      setError('');
    } catch (err) {
      setError('Lỗi tải danh sách nhân viên cấp dưới');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewEvaluation = async (subordinate: Subordinate) => {
    if (!subordinate.evaluationId) {
      setActionError('Chưa có đánh giá cho nhân viên này trong kỳ này');
      return;
    }
    try {
      setActionError('');
      const details = await employeeEvaluationService.getEvaluationDetails(subordinate.evaluationId, true);
      onEvaluate(subordinate, details);
    } catch (err) {
      setActionError('Lỗi tải chi tiết đánh giá');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Đang tải...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  // --- Derived counts (before search filter) ---
  const mineCount = subordinates.filter(s => getGroup(s) === 'mine').length;
  const selfPendingCount = subordinates.filter(s => getGroup(s) === 'self_pending').length;
  const otherSupervisorCount = subordinates.filter(s => getGroup(s) === 'other_supervisor').length;
  const completedCount = subordinates.filter(s => getGroup(s) === 'completed').length;

  // --- Search + filter ---
  const q = search.toLowerCase().trim();
  const filtered = subordinates.filter(s => {
    const matchSearch =
      !q ||
      s.employeeCode.toLowerCase().includes(q) ||
      s.employeeName.toLowerCase().includes(q);
    const group = getGroup(s);
    const matchFilter = filter === 'all' || filter === group;
    return matchSearch && matchFilter;
  });

  const grouped = {
    mine: filtered.filter(s => getGroup(s) === 'mine'),
    self_pending: filtered.filter(s => getGroup(s) === 'self_pending'),
    other_supervisor: filtered.filter(s => getGroup(s) === 'other_supervisor'),
    completed: filtered.filter(s => getGroup(s) === 'completed'),
  };

  const totalFiltered = filtered.length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          onClick={() => setFilter(filter === 'mine' ? 'all' : 'mine')}
          className={`flex flex-col items-start p-3 rounded-lg border-2 text-left transition-colors ${
            filter === 'mine'
              ? 'border-blue-500 bg-blue-50'
              : 'border-transparent bg-blue-50 hover:border-blue-300'
          }`}
        >
          <span className="text-2xl font-bold text-blue-600">{mineCount}</span>
          <span className="text-xs text-blue-700 font-medium mt-0.5">Cần đánh giá</span>
        </button>
        <button
          onClick={() => setFilter(filter === 'self_pending' ? 'all' : 'self_pending')}
          className={`flex flex-col items-start p-3 rounded-lg border-2 text-left transition-colors ${
            filter === 'self_pending'
              ? 'border-yellow-500 bg-yellow-50'
              : 'border-transparent bg-yellow-50 hover:border-yellow-300'
          }`}
        >
          <span className="text-2xl font-bold text-yellow-600">{selfPendingCount}</span>
          <span className="text-xs text-yellow-700 font-medium mt-0.5">Chờ NV tự đánh giá</span>
        </button>
        <button
          onClick={() => setFilter(filter === 'other_supervisor' ? 'all' : 'other_supervisor')}
          className={`flex flex-col items-start p-3 rounded-lg border-2 text-left transition-colors ${
            filter === 'other_supervisor'
              ? 'border-purple-500 bg-purple-50'
              : 'border-transparent bg-purple-50 hover:border-purple-300'
          }`}
        >
          <span className="text-2xl font-bold text-purple-600">{otherSupervisorCount}</span>
          <span className="text-xs text-purple-700 font-medium mt-0.5">Chờ cấp trên khác</span>
        </button>
        <button
          onClick={() => setFilter(filter === 'completed' ? 'all' : 'completed')}
          className={`flex flex-col items-start p-3 rounded-lg border-2 text-left transition-colors ${
            filter === 'completed'
              ? 'border-green-500 bg-green-50'
              : 'border-transparent bg-green-50 hover:border-green-300'
          }`}
        >
          <span className="text-2xl font-bold text-green-600">{completedCount}</span>
          <span className="text-xs text-green-700 font-medium mt-0.5">Hoàn thành</span>
        </button>
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã NV..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as FilterOption)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">Tất cả ({subordinates.length})</option>
          <option value="mine">Cần đánh giá ({mineCount})</option>
          <option value="self_pending">Chờ NV tự đánh giá ({selfPendingCount})</option>
          <option value="other_supervisor">Chờ cấp trên khác ({otherSupervisorCount})</option>
          <option value="completed">Hoàn thành ({completedCount})</option>
        </select>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="px-3 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {actionError}
        </div>
      )}

      {/* Empty state */}
      {totalFiltered === 0 && (
        <div className="py-10 text-center text-sm text-gray-500">
          {search || filter !== 'all'
            ? 'Không có kết quả phù hợp với bộ lọc.'
            : 'Không có nhân viên cấp dưới trong kỳ này.'}
        </div>
      )}

      {/* Grouped sections */}
      <div className="space-y-3">
        {/* Section: Cần bạn đánh giá */}
        <Section
          title="Cần bạn đánh giá"
          count={grouped.mine.length}
          defaultOpen={true}
          accentClass="bg-blue-50 text-blue-800"
        >
          <table className="w-full">
            <thead className="bg-blue-50 border-b border-blue-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">MNV</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Tên NV</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Vị trí</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Tự ĐG</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Vai trò</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {grouped.mine.map(s => (
                <tr key={s.employeeId} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-sm text-gray-700 font-mono">{s.employeeCode}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{s.employeeName}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600">{s.positionName}</td>
                  <td className="px-4 py-2.5 text-center text-sm text-gray-700">{s.selfScorePercentage.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-center">{getRoleBadge(s)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={() => handleViewEvaluation(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                      title="Đánh giá nhân viên này"
                    >
                      <ClipboardEdit className="w-3.5 h-3.5" />
                      Đánh giá
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Section: Chờ nhân viên tự đánh giá */}
        <Section
          title="Chờ nhân viên tự đánh giá"
          count={grouped.self_pending.length}
          defaultOpen={true}
          accentClass="bg-yellow-50 text-yellow-800"
        >
          <table className="w-full">
            <thead className="bg-yellow-50 border-b border-yellow-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">MNV</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Tên NV</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Vị trí</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Vai trò</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Trạng thái</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {grouped.self_pending.map(s => (
                <tr key={s.employeeId} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-sm text-gray-700 font-mono">{s.employeeCode}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{s.employeeName}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600">{s.positionName}</td>
                  <td className="px-4 py-2.5 text-center">{getRoleBadge(s)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Clock className="w-3 h-3" />
                      Chờ tự đánh giá
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={() => handleViewEvaluation(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Section: Chờ cấp trên khác */}
        <Section
          title="Chờ cấp trên khác"
          count={grouped.other_supervisor.length}
          defaultOpen={true}
          accentClass="bg-purple-50 text-purple-800"
        >
          <table className="w-full">
            <thead className="bg-purple-50 border-b border-purple-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">MNV</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Tên NV</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Vị trí</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Vai trò</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Đang chờ</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {grouped.other_supervisor.map(s => (
                <tr key={s.employeeId} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-sm text-gray-700 font-mono">{s.employeeCode}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{s.employeeName}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600">{s.positionName}</td>
                  <td className="px-4 py-2.5 text-center">{getRoleBadge(s)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      <Clock className="w-3 h-3" />
                      {getWaitingFor(s)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={() => handleViewEvaluation(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        {/* Section: Hoàn thành (collapsed by default) */}
        <Section
          title="Hoàn thành"
          count={grouped.completed.length}
          defaultOpen={false}
          accentClass="bg-green-50 text-green-800"
        >
          <table className="w-full">
            <thead className="bg-green-50 border-b border-green-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">MNV</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Tên NV</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Vị trí</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Vai trò</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Tự ĐG</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">CT1</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">CT2</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {grouped.completed.map(s => (
                <tr key={s.employeeId} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-sm text-gray-700 font-mono">{s.employeeCode}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-900">{s.employeeName}</td>
                  <td className="px-4 py-2.5 text-sm text-gray-600">{s.positionName}</td>
                  <td className="px-4 py-2.5 text-center">{getRoleBadge(s)}</td>
                  <td className="px-4 py-2.5 text-center text-sm text-gray-700">{s.selfScorePercentage.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-center text-sm text-gray-700">{s.supervisorScore1Percentage.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-center text-sm text-gray-700">{s.supervisorScore2Percentage.toFixed(1)}%</td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={() => handleViewEvaluation(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Xem
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>
    </div>
  );
};

export default SubordinateEvaluationList;
