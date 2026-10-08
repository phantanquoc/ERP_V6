import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench, Settings, AlertTriangle, Layers3,
  RefreshCw, ArrowRight, Package, ClipboardCheck,
  Cog, ShieldCheck, AlertCircle, BarChart3, ChevronDown
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import { useTechnicalSummary } from '../hooks/useTechnicalSummary';
import { hasSubModuleAccess } from '../utils/permissions';
import type { TechnicalSummary } from '../services/technicalSummaryService';
import PageHeader from '../design-system/PageHeader';
import ChartCard from '../design-system/ChartCard';
import { CircularProgress, ProgressBar } from '../design-system/Progress';
import { LoadingSkeleton } from '../design-system/States';
import RepairStatisticsDashboard from '../components/RepairStatisticsDashboard';

// ── Constants ──
const MACHINE_HEALTH_GOOD = 80;
const MACHINE_HEALTH_WARN = 60;

const REPAIR_LABEL: Record<string, string> = {
  CHO_XU_LY: 'Chờ xử lý', DA_TIEP_NHAN: 'Đã tiếp nhận', LEN_KE_HOACH: 'Lên kế hoạch',
  DANG_SUA_CHUA: 'Đang sửa chữa', CHO_NGHIEM_THU: 'Chờ nghiệm thu', DA_NGHIEM_THU: 'Đã nghiệm thu',
  HOAN_THANH: 'Hoàn thành', DA_HUY: 'Đã hủy', TU_CHOI: 'Từ chối',
};
const FAULT_LABEL: Record<string, string> = {
  DANG_THEO_DOI: 'Đang theo dõi', DA_XU_LY: 'Đã xử lý', TAI_PHAT: 'Tái phát',
};
const friendlyLabel = (raw: string) => REPAIR_LABEL[raw] ?? FAULT_LABEL[raw] ?? raw;

const REPAIR_BG: Record<string, string> = {
  'Chờ xử lý': 'bg-amber-500', 'Đã tiếp nhận': 'bg-sky-500', 'Lên kế hoạch': 'bg-violet-500',
  'Đang sửa chữa': 'bg-blue-500', 'Chờ nghiệm thu': 'bg-amber-400', 'Đã nghiệm thu': 'bg-emerald-500',
  'Hoàn thành': 'bg-emerald-500', 'Đã hủy': 'bg-red-500', 'Từ chối': 'bg-gray-400',
};
const REPAIR_HEX: Record<string, string> = {
  'Chờ xử lý': '#F59E0B', 'Đã tiếp nhận': '#0EA5E9', 'Lên kế hoạch': '#8B5CF6',
  'Đang sửa chữa': '#3B82F6', 'Chờ nghiệm thu': '#FBBF24', 'Đã nghiệm thu': '#10B981',
  'Hoàn thành': '#10B981', 'Đã hủy': '#EF4444', 'Từ chối': '#9CA3AF',
};
const FALLBACK_BG = ['bg-emerald-500', 'bg-amber-500', 'bg-red-500', 'bg-gray-400', 'bg-blue-500', 'bg-violet-500'];
const FALLBACK_HEX = ['#10B981', '#F59E0B', '#EF4444', '#9CA3AF', '#3B82F6', '#8B5CF6'];
function repairBg(label: string, i: number) { return REPAIR_BG[label] ?? FALLBACK_BG[i % FALLBACK_BG.length]; }
function repairHex(label: string, i: number) { return REPAIR_HEX[label] ?? FALLBACK_HEX[i % FALLBACK_HEX.length]; }

const MACHINE_COLORS = ['#10B981', '#EF4444'];
const FAULT_HEX: Record<string, string> = { 'Đang theo dõi': '#F59E0B', 'Đã xử lý': '#10B981', 'Tái phát': '#EF4444' };
const FAULT_FALLBACK = ['#F59E0B', '#10B981', '#EF4444'];
function faultHex(label: string, i: number) { return FAULT_HEX[label] ?? FAULT_FALLBACK[i % FAULT_FALLBACK.length]; }
const PROJECT_HEX: Record<string, string> = {
  'Lên kế hoạch': '#6B7280', 'Chờ duyệt': '#8B5CF6', 'Đang thực hiện': '#3B82F6', 'Hoàn thành': '#10B981', 'Tạm dừng': '#F59E0B',
};
const PROJECT_FALLBACK = ['#6B7280', '#3B82F6', '#10B981', '#F59E0B'];
function projectHex(label: string, i: number) { return PROJECT_HEX[label] ?? PROJECT_FALLBACK[i % PROJECT_FALLBACK.length]; }

const fallbackSummary: TechnicalSummary = {
  qlhtm: { machineSystems: { total: 0, active: 0 }, machineDetails: { total: 0, active: 0, byType: [] } },
  coDien: { activeFaultTemplates: 0, faultRecordsByStatus: [], faultRecordTotal: 0 },
  repairHandovers: { repairRequestsByStatus: [], repairRequestTotal: 0, acceptanceHandovers: 0 },
  projects: { projectsByStatus: [], phasesByStatus: [], activeProjects: 0, unphasedTasks: 0 },
  spareParts: { total: 0, lowStock: 0, outOfStock: 0 },
};

// ── Compact KPI — horizontal icon|value layout ──
const CompactKpi: React.FC<{ label: string; value: number | string; icon: React.ReactNode; tone: string; dot?: string; sub: string }> = ({ label, value, icon, tone, dot, sub }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-2.5 flex items-center gap-2.5 min-w-0">
    <span className={`p-1.5 rounded-md bg-gray-50 ${tone} shrink-0`}>{icon}</span>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <span className="text-base font-bold text-gray-800 leading-none">{value}</span>
        {dot && <span className={`w-2 h-2 rounded-full shrink-0 ${dot} animate-pulse`} />}
      </div>
      <p className="text-[11px] font-medium text-gray-500 leading-none mt-0.5 truncate" title={label}>{label}</p>
      <p className="text-[10px] text-gray-400 leading-none mt-0.5 truncate" title={sub}>{sub}</p>
    </div>
  </div>
);

const toneMap: Record<string, string> = {
  cyan: 'text-cyan-600', blue: 'text-blue-600', amber: 'text-amber-600',
  green: 'text-emerald-600', orange: 'text-orange-500', purple: 'text-violet-600',
};

const TechnicalManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading, isFetching, isError, error, refetch } = useTechnicalSummary();
  const summary = data?.data ?? fallbackSummary;
  const [analysisOpen, setAnalysisOpen] = useState(true);

  const canOpen = (subModule: string) =>
    !!user && hasSubModuleAccess('technical', subModule, user.department, user.subDepartment, user.role, user.secondaryDepartments);

  const machineActiveRate = summary.qlhtm.machineSystems.total > 0
    ? Math.round((summary.qlhtm.machineSystems.active / summary.qlhtm.machineSystems.total) * 100)
    : 0;

  const repairTotal = summary.repairHandovers.repairRequestTotal ?? summary.repairHandovers.repairRequestsByStatus.reduce((s, r) => s + r.total, 0);
  const pendingRepairs = summary.repairHandovers.repairRequestsByStatus.find((r) => friendlyLabel(r.trangThai) === 'Chờ xử lý')?.total ?? 0;
  const spareParts = summary.spareParts ?? { total: 0, lowStock: 0, outOfStock: 0 };
  const faultRecordTotal = summary.coDien.faultRecordTotal ?? summary.coDien.faultRecordsByStatus.reduce((s, r) => s + r.total, 0);

  const machineDonutData = [
    { name: 'Hoạt động', value: summary.qlhtm.machineSystems.active },
    { name: 'Ngừng HĐ', value: Math.max(0, summary.qlhtm.machineSystems.total - summary.qlhtm.machineSystems.active) },
  ];
  const faultDonutData = summary.coDien.faultRecordsByStatus.map((item) => ({
    name: friendlyLabel(item.trangThai),
    value: item.total,
  }));
  const repairSegments = summary.repairHandovers.repairRequestsByStatus.map((item, i) => {
    const label = friendlyLabel(item.trangThai);
    return { label, value: item.total, color: repairBg(label, i) };
  });

  const machineDot = summary.qlhtm.machineSystems.total === 0 ? undefined
    : machineActiveRate >= MACHINE_HEALTH_GOOD ? 'bg-emerald-500' : machineActiveRate >= MACHINE_HEALTH_WARN ? 'bg-amber-400' : 'bg-red-500';
  const spareDot = spareParts.total === 0 ? undefined
    : spareParts.outOfStock > 0 ? 'bg-red-500' : spareParts.lowStock > 0 ? 'bg-amber-400' : undefined;
  const pendingDot = pendingRepairs > 0 ? 'bg-amber-400' : undefined;

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    const apiErr = error as unknown as { statusCode?: number; message?: string } | null;
    const isForbidden = apiErr?.statusCode === 403;
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
        <p className="text-gray-600 mb-1">{isForbidden ? 'Bạn không có quyền xem tổng quan kỹ thuật' : 'Không thể tải dữ liệu tổng quan'}</p>
        {apiErr?.message && <p className="text-xs text-gray-400 mb-2">{apiErr.message}{apiErr.statusCode ? ` (${apiErr.statusCode})` : ''}</p>}
        <button onClick={() => refetch()} className="text-sm text-blue-600 hover:text-blue-800">Thử lại</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Tổng quan Kỹ thuật"
        description="Vận hành hệ thống máy · sửa chữa · lỗi · dự án"
        icon={<Wrench className="w-5 h-5 text-cyan-500" />}
        actions={
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Đang tải...' : 'Làm mới'}
          </button>
        }
      />

      {/* KPI strip — 6 inline desktop, 3+3 mobile */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
        <CompactKpi label="Hệ thống máy" value={summary.qlhtm.machineSystems.active} icon={<Cog className="w-3.5 h-3.5" />} tone={toneMap.cyan} dot={machineDot} sub={`${summary.qlhtm.machineSystems.active}/${summary.qlhtm.machineSystems.total} hoạt động`} />
        <CompactKpi label="Chi tiết máy" value={summary.qlhtm.machineDetails.active} icon={<Settings className="w-3.5 h-3.5" />} tone={toneMap.blue} sub={`Tổng ${summary.qlhtm.machineDetails.total}`} />
        <CompactKpi label="YC sửa chữa" value={pendingRepairs} icon={<ClipboardCheck className="w-3.5 h-3.5" />} tone={toneMap.amber} dot={pendingDot} sub={`${repairTotal} tổng`} />
        <CompactKpi label="Nghiệm thu" value={summary.repairHandovers.acceptanceHandovers} icon={<ShieldCheck className="w-3.5 h-3.5" />} tone={toneMap.green} sub={`trên ${repairTotal} yêu cầu`} />
        <CompactKpi label="Mẫu lỗi" value={summary.coDien.activeFaultTemplates} icon={<AlertCircle className="w-3.5 h-3.5" />} tone={toneMap.orange} sub={`${faultRecordTotal} bản ghi`} />
        <CompactKpi label="Linh kiện" value={spareParts.total} icon={<Package className="w-3.5 h-3.5" />} tone={toneMap.purple} dot={spareDot} sub={spareParts.total === 0 ? 'Chưa có dữ liệu' : spareParts.outOfStock > 0 ? `${spareParts.outOfStock} hết hàng` : spareParts.lowStock > 0 ? `${spareParts.lowStock} sắp hết` : 'Đủ hàng'} />
      </div>

      {/* BENTO — single 4-col row: machine | repair | fault | projects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">

        {/* Machine donut — compact 130px */}
        <ChartCard title="Hệ thống máy" to={canOpen('quality') ? '/technical/quality' : undefined}>
          {summary.qlhtm.machineSystems.total === 0 ? (
            <div className="flex items-center justify-center h-[130px] text-xs text-gray-400">Chưa có dữ liệu</div>
          ) : (
            <div className="relative">
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={machineDonutData} cx="50%" cy="50%" innerRadius={36} outerRadius={58} paddingAngle={4} dataKey="value">
                    {machineDonutData.map((_, i) => <Cell key={i} fill={MACHINE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-bold text-gray-800 leading-none">{machineActiveRate}%</span>
                <span className="text-[10px] text-gray-400">vận hành</span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-center gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Hoạt động</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Ngừng HĐ</span>
            <span className="text-gray-400">· {summary.qlhtm.machineDetails.active} chi tiết</span>
          </div>
        </ChartCard>

        {/* Repair — stacked bar + legend dots */}
        <ChartCard title="Yêu cầu sửa chữa" to={canOpen('quality') ? '/technical/quality?tab=repairs' : undefined} action={<span className="text-[11px] text-gray-400">{repairTotal} phiếu</span>}>
          {summary.repairHandovers.repairRequestsByStatus.length === 0 ? (
            <div className="flex items-center justify-center h-[130px] text-xs text-gray-400">Chưa có yêu cầu</div>
          ) : (
            <div className="space-y-2">
              <ProgressBar segments={repairSegments} total={repairTotal} />
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {summary.repairHandovers.repairRequestsByStatus.map((item, i) => {
                  const label = friendlyLabel(item.trangThai);
                  return (
                    <span key={item.trangThai} className="flex items-center gap-1 text-[11px] text-gray-500">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: repairHex(label, i) }} />
                      {label} <strong className="text-gray-700">{item.total}</strong>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </ChartCard>

        {/* Fault — list + tiny donut */}
        <ChartCard title="Bản ghi lỗi" to={canOpen('quality') ? '/technical/quality?tab=faults' : undefined} action={<span className="text-[11px] text-gray-400">{faultRecordTotal} bản ghi</span>}>
          {summary.coDien.faultRecordsByStatus.length === 0 ? (
            <div className="flex items-center justify-center h-[130px] text-xs text-gray-400">Chưa có bản ghi lỗi</div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1 space-y-1">
                {summary.coDien.faultRecordsByStatus.map((item, i) => {
                  const label = friendlyLabel(item.trangThai);
                  return (
                    <div key={item.trangThai} className="flex items-center justify-between px-2 py-1 bg-gray-50 rounded text-xs">
                      <span className="flex items-center gap-1.5 text-gray-600">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: faultHex(label, i) }} />
                        {label}
                      </span>
                      <strong className="text-gray-800">{item.total}</strong>
                    </div>
                  );
                })}
                <p className="text-[10px] text-gray-400 pt-1">{summary.coDien.activeFaultTemplates} mẫu đang dùng · {summary.repairHandovers.acceptanceHandovers} nghiệm thu</p>
              </div>
              <div className="shrink-0">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie data={faultDonutData} cx="50%" cy="50%" innerRadius={22} outerRadius={38} paddingAngle={3} dataKey="value">
                      {faultDonutData.map((d, i) => <Cell key={i} fill={faultHex(String(d.name), i)} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </ChartCard>

        {/* Projects — circular + mini grid */}
        <ChartCard title="Dự án" to={canOpen('projects') ? '/technical/projects' : undefined}>
          {summary.projects.projectsByStatus.length === 0 ? (
            <div className="flex items-center justify-center h-[130px] text-xs text-gray-400">Chưa có dự án</div>
          ) : (
            <div className="flex gap-2 items-start">
              <CircularProgress
                value={Math.round(((summary.projects.projectsByStatus.find((p) => friendlyLabel(p.trangThai) === 'Hoàn thành' || p.trangThai === 'Hoàn thành')?.total ?? 0) /
                  Math.max(summary.projects.projectsByStatus.reduce((sum, p) => sum + p.total, 0), 1)) * 100)}
                size={86}
                strokeWidth={7}
                color="#10B981"
                label={`${summary.projects.projectsByStatus.reduce((s, p) => s + p.total, 0)} dự án`}
              />
              <div className="flex-1 grid grid-cols-2 gap-1">
                {summary.projects.projectsByStatus.map((item, i) => {
                  const label = friendlyLabel(item.trangThai);
                  return (
                    <div key={item.trangThai} className="text-center px-1 py-1 bg-gray-50 rounded">
                      <span className="flex items-center justify-center gap-1 text-[10px] text-gray-500 leading-none">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: projectHex(label, i) }} />
                        {label}
                      </span>
                      <span className="text-xs font-bold text-gray-800">{item.total}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {summary.projects.unphasedTasks > 0 && (
            <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded border border-amber-200 text-[11px] text-amber-700">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{summary.projects.unphasedTasks} việc chưa phân giai đoạn
            </div>
          )}
        </ChartCard>
      </div>

      {/* PHAN TICH SUA CHUA — collapsible */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <button
          onClick={() => setAnalysisOpen(!analysisOpen)}
          className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 rounded-lg transition-colors"
        >
          <span className="flex items-center gap-2">
            <span className="p-1 bg-cyan-50 rounded"><BarChart3 className="w-3.5 h-3.5 text-cyan-600" /></span>
            <span className="text-sm font-semibold text-gray-800">Phân tích sửa chữa</span>
            <span className="text-xs text-gray-400 hidden sm:inline">· YCSC theo thời gian, khu vực, chi phí</span>
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${analysisOpen ? 'rotate-180' : ''}`} />
        </button>
        {analysisOpen && (
          <div className="px-3 pb-3 border-t border-gray-100 pt-3">
            <RepairStatisticsDashboard compact onOpenDetail={(id) => navigate(`/technical/quality?tab=repairs&repairId=${id}`)} />
          </div>
        )}
      </div>

      {/* NAV — thin footer strip */}
      {(() => {
        const filteredCards = [
          { key: 'quality', title: 'Vận hành & Sửa chữa', desc: 'Hệ thống máy · sửa chữa · lỗi · bảo dưỡng · linh kiện', icon: <Settings className="w-4 h-4" />, path: '/technical/quality' },
          { key: 'projects', title: 'Dự án', desc: 'Dự án, giai đoạn, công việc', icon: <Layers3 className="w-4 h-4" />, path: '/technical/projects' },
        ].filter((item) => canOpen(item.key));
        if (filteredCards.length === 0) return <div className="text-center py-6 text-sm text-gray-400">Bạn chưa được phân quyền truy cập module kỹ thuật.</div>;
        return (
          <div className="flex flex-wrap gap-2">
            {filteredCards.map((item) => (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-left hover:border-cyan-300 hover:shadow-sm transition-all group flex-1 min-w-[200px]"
              >
                <span className="p-1.5 bg-cyan-50 rounded text-cyan-600 group-hover:bg-cyan-100 transition-colors shrink-0">{item.icon}</span>
                <span className="min-w-0">
                  <span className="text-xs font-semibold text-gray-800 block leading-none">{item.title}</span>
                  <span className="text-[11px] text-gray-400 truncate block">{item.desc}</span>
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-cyan-500 ml-auto shrink-0" />
              </button>
            ))}
          </div>
        );
      })()}
    </div>
  );
};

export default TechnicalManagement;
