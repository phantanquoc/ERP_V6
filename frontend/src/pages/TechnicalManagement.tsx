import { useNavigate } from 'react-router-dom';
import {
  Wrench, Settings, AlertTriangle, Layers3,
  RefreshCw, ArrowRight, Package, ClipboardCheck,
  Cog, ShieldCheck, AlertCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useTechnicalSummary } from '../hooks/useTechnicalSummary';
import { hasSubModuleAccess } from '../utils/permissions';
import type { TechnicalSummary } from '../services/technicalSummaryService';
import PageHeader from '../design-system/PageHeader';
import KpiCard from '../design-system/KpiCard';
import ChartCard from '../design-system/ChartCard';
import { CircularProgress, ProgressBar } from '../design-system/Progress';
import { LoadingSkeleton } from '../design-system/States';

// ── Constants ──
const STATUS_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6B7280', '#3B82F6', '#8B5CF6'];
const MACHINE_COLORS = ['#10B981', '#EF4444'];
const FAULT_COLORS = ['#F59E0B', '#10B981', '#EF4444'];
const PROJECT_COLORS = ['#6B7280', '#3B82F6', '#10B981', '#F59E0B'];

const fallbackSummary: TechnicalSummary = {
  qlhtm: {
    machineSystems: { total: 0, active: 0 },
    machineDetails: { total: 0, active: 0, byType: [] },
  },
  coDien: {
    activeFaultTemplates: 0,
    faultRecordsByStatus: [],
    faultRecordTotal: 0,
  },
  repairHandovers: {
    repairRequestsByStatus: [],
    repairRequestTotal: 0,
    acceptanceHandovers: 0,
  },
  projects: {
    projectsByStatus: [],
    phasesByStatus: [],
    activeProjects: 0,
    unphasedTasks: 0,
  },
  spareParts: { total: 0, lowStock: 0, outOfStock: 0 },
};

// ── Nav Card ──
// Kept local to preserve SPA navigation via useNavigate (design-system NavCard uses window.location.href).
// Shell classes aligned with tokens.shell.card: bg-white border border-gray-200 rounded-lg shadow-sm
const NavCard: React.FC<{ title: string; desc: string; icon: React.ReactNode; to: string }> = ({ title, desc, icon, to }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-cyan-300 hover:shadow-md transition-all duration-200 text-left w-full group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-50 rounded-lg text-cyan-600 group-hover:bg-cyan-100 transition-colors">{icon}</div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{title}</p>
            <p className="text-xs text-gray-400">{desc}</p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-cyan-500 transition-colors" />
      </div>
    </button>
  );
};

// ══════════════════════════════════════════════════════════════
// ██  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
const TechnicalManagement = () => {
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useTechnicalSummary();
  const summary = data?.data ?? fallbackSummary;

  const canOpen = (subModule: string) =>
    !!user && hasSubModuleAccess('technical', subModule, user.department, user.subDepartment, user.role, user.secondaryDepartments);

  // ── Computed ──
  const machineActiveRate = summary.qlhtm.machineSystems.total > 0
    ? Math.round((summary.qlhtm.machineSystems.active / summary.qlhtm.machineSystems.total) * 100)
    : 0;

  const repairTotal = summary.repairHandovers.repairRequestTotal ?? summary.repairHandovers.repairRequestsByStatus.reduce((s, r) => s + r.total, 0);
  const pendingRepairs = summary.repairHandovers.repairRequestsByStatus.find((r) => r.trangThai === 'Chờ xử lý')?.total ?? 0;

  const spareParts = summary.spareParts ?? { total: 0, lowStock: 0, outOfStock: 0 };
  const faultRecordTotal = summary.coDien.faultRecordTotal ?? summary.coDien.faultRecordsByStatus.reduce((s, r) => s + r.total, 0);

  // ── Chart data ──
  const machineDonutData = [
    { name: 'Hoạt động', value: summary.qlhtm.machineSystems.active },
    { name: 'Ngừng HĐ', value: summary.qlhtm.machineSystems.total - summary.qlhtm.machineSystems.active },
  ];

  const faultDonutData = summary.coDien.faultRecordsByStatus.map((item) => ({
    name: item.trangThai,
    value: item.total,
  }));

  const repairSegments = summary.repairHandovers.repairRequestsByStatus.map((item, i) => ({
    label: item.trangThai,
    value: item.total,
    color: STATUS_COLORS[i % STATUS_COLORS.length],
  }));

  const machineDot = machineActiveRate >= 80 ? 'bg-emerald-500' : machineActiveRate >= 60 ? 'bg-amber-400' : 'bg-red-500';

  if (isLoading) return <LoadingSkeleton />;

  if (isError) return (
    <div className="flex flex-col items-center justify-center py-20">
      <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
      <p className="text-gray-600 mb-2">Không thể tải dữ liệu tổng quan</p>
      <button onClick={() => refetch()} className="text-sm text-blue-600 hover:text-blue-800">Thử lại</button>
    </div>
  );

  return (
    <div>
      {/* ── HEADER ── */}
      <PageHeader
        title="Tổng quan Kỹ thuật"
        description="Theo dõi vận hành hệ thống máy, sửa chữa, lỗi và dự án"
        icon={<Wrench className="w-6 h-6 text-cyan-500" />}
        actions={
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 bg-white rounded-lg px-3 py-2 hover:bg-gray-50 hover:border-gray-200 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Đang tải...' : 'Làm mới'}
          </button>
        }
      />

      {/* ── KPI ROW (6 cards) — semantic tones ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <KpiCard
          label="Hệ thống máy"
          value={summary.qlhtm.machineSystems.active}
          icon={<Cog className="w-4 h-4" />}
          tone="cyan"
          dot={machineDot}
          sub={`${summary.qlhtm.machineSystems.active}/${summary.qlhtm.machineSystems.total} hoạt động`}
        />
        <KpiCard
          label="Chi tiết máy"
          value={summary.qlhtm.machineDetails.active}
          icon={<Settings className="w-4 h-4" />}
          tone="blue"
          sub={`Tổng: ${summary.qlhtm.machineDetails.total}`}
        />
        <KpiCard
          label="Yêu cầu sửa chữa"
          value={pendingRepairs}
          icon={<ClipboardCheck className="w-4 h-4" />}
          tone="amber"
          dot={pendingRepairs > 0 ? 'bg-amber-400' : 'bg-emerald-500'}
          sub={`${repairTotal} tổng`}
        />
        <KpiCard
          label="Nghiệm thu"
          value={summary.repairHandovers.acceptanceHandovers}
          icon={<ShieldCheck className="w-4 h-4" />}
          tone="green"
          sub={`trên ${repairTotal} yêu cầu`}
        />
        <KpiCard
          label="Mẫu lỗi"
          value={summary.coDien.activeFaultTemplates}
          icon={<AlertCircle className="w-4 h-4" />}
          tone="orange"
          sub={`${faultRecordTotal} bản ghi lỗi`}
        />
        <KpiCard
          label="Linh kiện"
          value={spareParts.total}
          icon={<Package className="w-4 h-4" />}
          tone="purple"
          dot={spareParts.outOfStock > 0 ? 'bg-red-500' : spareParts.lowStock > 0 ? 'bg-amber-400' : 'bg-emerald-500'}
          sub={spareParts.outOfStock > 0 ? `${spareParts.outOfStock} hết hàng` : spareParts.lowStock > 0 ? `${spareParts.lowStock} sắp hết` : 'Đủ hàng'}
        />
      </div>

      {/* ── BENTO ROW A: Machine donut + Repair status ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <ChartCard
          title="Trạng thái hệ thống"
          to={canOpen('quality') ? '/technical/quality' : undefined}
        >
          {summary.qlhtm.machineSystems.total === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-xs text-gray-400">Chưa có dữ liệu hệ thống máy</div>
          ) : (
          <div className="relative">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={machineDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {machineDonutData.map((_, i) => (
                    <Cell key={i} fill={MACHINE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#6b7280' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginBottom: '24px' }}>
              <span className="text-2xl font-bold text-gray-800">{machineActiveRate}%</span>
              <span className="text-xs text-gray-400">vận hành</span>
            </div>
          </div>
          )}
          <div className="mt-2 text-center">
            <p className="text-xs text-gray-400">
              {summary.qlhtm.machineDetails.active} chi tiết máy hoạt động
            </p>
          </div>
        </ChartCard>

        <ChartCard
          title="Yêu cầu sửa chữa"
          to={canOpen('quality') ? '/technical/quality?tab=repairAndFault&sub=repair' : undefined}
          action={<span className="text-xs text-gray-400">Tổng: {repairTotal}</span>}
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
            {summary.repairHandovers.repairRequestsByStatus.map((item, i) => (
              <div key={item.trangThai} className="text-center p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[i % STATUS_COLORS.length] }} />
                  <span className="text-xs text-gray-500">{item.trangThai}</span>
                </div>
                <span className="text-lg font-bold text-gray-800">{item.total}</span>
              </div>
            ))}
            {summary.repairHandovers.repairRequestsByStatus.length === 0 && (
              <div className="col-span-full text-center text-xs text-gray-400 py-4">Chưa có yêu cầu sửa chữa</div>
            )}
          </div>
          {repairTotal > 0 && (
            <ProgressBar segments={repairSegments} total={repairTotal} />
          )}
        </ChartCard>
      </div>

      {/* ── BENTO ROW B: Fault Records + Projects ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <ChartCard
          title="Bản ghi lỗi"
          to={canOpen('quality') ? '/technical/quality?tab=repairAndFault&sub=fault' : undefined}
          action={<span className="text-xs text-gray-400">Tổng: {faultRecordTotal}</span>}
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid grid-cols-1 gap-2">
              {summary.coDien.faultRecordsByStatus.map((item, i) => (
                <div key={item.trangThai} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: FAULT_COLORS[i % FAULT_COLORS.length] }} />
                    <span className="text-sm text-gray-700">{item.trangThai}</span>
                  </div>
                  <span className="text-lg font-bold text-gray-800">{item.total}</span>
                </div>
              ))}
              {summary.coDien.faultRecordsByStatus.length === 0 && (
                <div className="text-center text-xs text-gray-400 py-4">Chưa có bản ghi lỗi</div>
              )}
            </div>
            {faultDonutData.length > 0 && (
              <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={faultDonutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {faultDonutData.map((_, i) => (
                        <Cell key={i} fill={FAULT_COLORS[i % FAULT_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#6b7280' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
            <span>Mẫu lỗi đang dùng: <strong className="text-gray-600">{summary.coDien.activeFaultTemplates}</strong></span>
            <span>|</span>
            <span>Nghiệm thu: <strong className="text-gray-600">{summary.repairHandovers.acceptanceHandovers}</strong></span>
          </div>
        </ChartCard>

        <ChartCard
          title="Phòng phát triển"
          to={canOpen('projects') ? '/technical/projects' : undefined}
        >
          <div className="flex flex-col items-center">
            <CircularProgress
              value={summary.projects.projectsByStatus.length > 0
                ? Math.round(((summary.projects.projectsByStatus.find((p) => p.trangThai === 'Hoàn thành')?.total ?? 0) /
                    Math.max(summary.projects.projectsByStatus.reduce((sum, p) => sum + p.total, 0), 1)) * 100)
                : 0}
              size={110}
              strokeWidth={10}
              color="#10B981"
              label={`${summary.projects.projectsByStatus.reduce((s, p) => s + p.total, 0)} dự án tổng`}
            />
            <div className="grid grid-cols-2 gap-2 mt-4 w-full">
              {summary.projects.projectsByStatus.map((item, i) => (
                <div key={item.trangThai} className="text-center p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: PROJECT_COLORS[i % PROJECT_COLORS.length] }} />
                    <span className="text-xs text-gray-500">{item.trangThai}</span>
                  </div>
                  <span className="text-base font-bold text-gray-800">{item.total}</span>
                </div>
              ))}
            </div>
            {summary.projects.unphasedTasks > 0 && (
              <div className="mt-3 w-full flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs text-amber-700">{summary.projects.unphasedTasks} công việc chưa phân giai đoạn</span>
              </div>
            )}
          </div>
        </ChartCard>
      </div>

      {/* ── NAV CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { key: 'quality', title: 'Đảm bảo & Cải tiến', desc: 'Hệ thống máy, sửa chữa, lỗi, bảo dưỡng, linh kiện', icon: <Settings className="w-5 h-5" />, path: '/technical/quality' },
          { key: 'projects', title: 'Phòng phát triển', desc: 'Dự án, giai đoạn, công việc', icon: <Layers3 className="w-5 h-5" />, path: '/technical/projects' },
        ]
          .filter((item) => canOpen(item.key))
          .map((item) => (
            <NavCard key={item.key} title={item.title} desc={item.desc} icon={item.icon} to={item.path} />
          ))}
      </div>
    </div>
  );
};

export default TechnicalManagement;
