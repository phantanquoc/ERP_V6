import { AlertTriangle, CalendarClock, ListTodo, TrendingUp, Users, Wallet } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useProjectCosts } from '../hooks/useProjectPhases';
import type { Project, ProjectPhase } from '../services/projectService';

const COST_CATEGORIES = ['Nhân công', 'Vật tư', 'Phụ liệu', 'Khác'];
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

interface ProjectOverviewProps {
  project: Project;
  phases: ProjectPhase[];
  users?: { id: string; firstName: string; lastName: string; role?: string }[];
}

const fmt = (val: number) =>
  val ? val.toLocaleString('vi-VN') + 'đ' : '0đ';

const daysLeft = (end?: string | null) => {
  if (!end) return null;
  const diff = new Date(end).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const ProjectOverview = ({ project, phases, users = [] }: ProjectOverviewProps) => {
  const costsQuery = useProjectCosts(project.id);
  const costs = costsQuery.data?.data ?? [];

  const totalKH = costs.reduce((s, c) => s + (c.thanhTienKeHoach ?? 0), 0);
  const totalTT = costs.reduce((s, c) => s + (c.thanhTienThucTe ?? 0), 0);
  const overBudget = totalKH > 0 && totalTT > totalKH;

  const remaining = daysLeft(project.ngayKetThuc);

  // Task statistics
  const allTasks = phases.flatMap((p) => p.tasks ?? []).concat(project.unphasedTasks ?? []);
  const taskStats = {
    total: allTasks.length,
    done: allTasks.filter((t) => t.trangThai === 'Hoàn thành').length,
    inProgress: allTasks.filter((t) => t.trangThai === 'Đang làm').length,
    pending: allTasks.filter((t) => t.trangThai === 'Chưa bắt đầu').length,
    late: allTasks.filter((t) => t.trangThai === 'Trễ').length,
  };

  // Cost by category for pie chart
  const costByCategory = COST_CATEGORIES.map((cat) => {
    const rows = costs.filter((c) => c.loaiChiPhi === cat);
    const value = rows.reduce((s, c) => s + (c.thanhTienKeHoach ?? 0), 0);
    return { name: cat, value };
  }).filter((d) => d.value > 0);

  // Cost KH vs TT by phase for bar chart
  const costByPhase = phases.map((phase) => {
    const kh = costs.filter((c) => c.projectPhaseId === phase.id)
      .reduce((s, c) => s + (c.thanhTienKeHoach ?? 0), 0);
    const tt = costs.filter((c) => c.projectPhaseId === phase.id)
      .reduce((s, c) => s + (c.thanhTienThucTe ?? 0), 0);
    return { name: phase.tenGiaiDoan.length > 12 ? phase.tenGiaiDoan.slice(0, 12) + '…' : phase.tenGiaiDoan, 'Kế hoạch': kh, 'Thực tế': tt };
  }).filter((d) => d['Kế hoạch'] > 0 || d['Thực tế'] > 0);

  // Phase progress summary
  const phaseSummary = phases.map((phase) => {
    const phaseCostsKH = costs.filter((c) => c.projectPhaseId === phase.id)
      .reduce((s, c) => s + (c.thanhTienKeHoach ?? 0), 0);
    const phaseCostsTT = costs.filter((c) => c.projectPhaseId === phase.id)
      .reduce((s, c) => s + (c.thanhTienThucTe ?? 0), 0);
    return { phase, phaseCostsKH, phaseCostsTT };
  });

  // Members
  const members = project.members ?? [];
  const getUserName = (userId: string) => {
    const u = users.find((u) => u.id === userId);
    return u ? `${u.lastName} ${u.firstName}` : userId;
  };
  const getUserInitial = (userId: string) => {
    const u = users.find((u) => u.id === userId);
    return u ? (u.lastName[0] || u.firstName[0] || '?').toUpperCase() : '?';
  };

  return (
    <div className="space-y-5">
      {/* Dashboard cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <p className="text-xs text-blue-700 font-medium">Tiến độ tổng</p>
          </div>
          <p className="text-2xl font-bold text-blue-700">{project.tienDoTongThe ?? 0}%</p>
          <div className="mt-2 h-2 w-full rounded-full bg-blue-200 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${project.tienDoTongThe ?? 0}%` }} />
          </div>
        </div>

        <div className={`rounded-lg border p-4 ${overBudget ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className={`h-4 w-4 ${overBudget ? 'text-red-600' : 'text-emerald-600'}`} />
            <p className={`text-xs font-medium ${overBudget ? 'text-red-700' : 'text-emerald-700'}`}>Ngân sách</p>
          </div>
          <p className={`text-lg font-bold ${overBudget ? 'text-red-700' : 'text-emerald-700'}`}>{fmt(totalKH)}</p>
          <p className="mt-1 text-xs text-gray-600">Thực tế: {fmt(totalTT)}</p>
          {overBudget && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle className="h-3 w-3" /> Vượt {fmt(totalTT - totalKH)}
            </p>
          )}
        </div>

        <div className={`rounded-lg border p-4 ${remaining == null ? 'border-gray-200 bg-gray-50' : remaining < 0 ? 'border-red-200 bg-red-50' : remaining <= 7 ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock className={`h-4 w-4 ${remaining == null ? 'text-gray-500' : remaining < 0 ? 'text-red-600' : remaining <= 7 ? 'text-yellow-600' : 'text-gray-600'}`} />
            <p className="text-xs font-medium text-gray-600">Thời gian còn lại</p>
          </div>
          {remaining == null ? (
            <p className="text-lg font-bold text-gray-500">Không xác định</p>
          ) : remaining < 0 ? (
            <p className="text-lg font-bold text-red-600">Quá hạn {Math.abs(remaining)} ngày</p>
          ) : (
            <p className="text-lg font-bold text-gray-900">{remaining} ngày</p>
          )}
        </div>

        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <ListTodo className="h-4 w-4 text-indigo-600" />
            <p className="text-xs text-indigo-700 font-medium">Công việc</p>
          </div>
          <p className="text-2xl font-bold text-indigo-700">{taskStats.total}</p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
            {taskStats.done > 0 && <span className="text-green-700">{taskStats.done} xong</span>}
            {taskStats.inProgress > 0 && <span className="text-blue-700">{taskStats.inProgress} đang làm</span>}
            {taskStats.pending > 0 && <span className="text-gray-600">{taskStats.pending} chờ</span>}
            {taskStats.late > 0 && <span className="text-red-600">{taskStats.late} trễ</span>}
          </div>
        </div>
      </div>

      {/* Task progress bar */}
      {taskStats.total > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-sm font-semibold text-gray-900">Tiến độ công việc</h4>
            <span className="text-xs text-gray-500">{taskStats.done}/{taskStats.total} hoàn thành</span>
          </div>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-200">
            {taskStats.done > 0 && <div className="bg-green-500 transition-all" style={{ width: `${(taskStats.done / taskStats.total) * 100}%` }} />}
            {taskStats.inProgress > 0 && <div className="bg-blue-500 transition-all" style={{ width: `${(taskStats.inProgress / taskStats.total) * 100}%` }} />}
            {taskStats.late > 0 && <div className="bg-red-500 transition-all" style={{ width: `${(taskStats.late / taskStats.total) * 100}%` }} />}
            {taskStats.pending > 0 && <div className="bg-gray-300 transition-all" style={{ width: `${(taskStats.pending / taskStats.total) * 100}%` }} />}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />Hoàn thành</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />Đang làm</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />Trễ</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300" />Chưa bắt đầu</span>
          </div>
        </div>
      )}

      {/* Charts row */}
      {(costByCategory.length > 0 || costByPhase.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Pie chart - cost by category */}
          {costByCategory.length > 0 && (
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-900">Chi phí theo loại</h4>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={costByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {costByCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => fmt(value)} />
                  <Legend formatter={(value) => <span className="text-xs text-gray-700">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Bar chart - KH vs TT by phase */}
          {costByPhase.length > 0 && (
            <div className="rounded-lg border border-gray-200 p-4">
              <h4 className="mb-3 text-sm font-semibold text-gray-900">Ngân sách theo giai đoạn</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={costByPhase} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(0)}tr` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => fmt(value)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Kế hoạch" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Thực tế" fill="#f97316" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Members */}
      {members.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-900 flex items-center gap-1.5">
            <Users className="h-4 w-4 text-gray-500" /> Thành viên ({members.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <div key={m.id} className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                  {getUserInitial(m.userId)}
                </span>
                <span className="text-sm text-gray-800">{getUserName(m.userId)}</span>
                <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">{m.vaiTro}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Phases progress */}
      {phases.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-900">Tiến độ giai đoạn</h4>
          <div className="space-y-2">
            {phaseSummary.map(({ phase, phaseCostsKH, phaseCostsTT }) => (
              <div key={phase.id} className="rounded-lg border border-gray-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">{phase.tenGiaiDoan}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${
                        phase.trangThai === 'Hoàn thành' ? 'bg-green-100 text-green-700 border-green-200' :
                        phase.trangThai === 'Đang thực hiện' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                        'bg-gray-100 text-gray-600 border-gray-200'
                      }`}>{phase.trangThai}</span>
                      {phaseCostsKH > 0 && phaseCostsTT > phaseCostsKH && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs text-red-700">
                          <AlertTriangle className="h-3 w-3" /> Vượt
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 flex-1 max-w-xs rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${phase.tienDo}%` }} />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{phase.tienDo}%</span>
                    </div>
                  </div>
                  {phaseCostsKH > 0 && (
                    <div className="text-right text-xs text-gray-500">
                      <p>KH: {fmt(phaseCostsKH)}</p>
                      <p className={phaseCostsTT > phaseCostsKH ? 'text-red-600 font-medium' : ''}>TT: {fmt(phaseCostsTT)}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectOverview;
