import { AlertTriangle, CalendarClock, CheckCircle2, TrendingUp, Wallet } from 'lucide-react';
import { useProjectCosts } from '../hooks/useProjectPhases';
import type { Project, ProjectPhase } from '../services/projectService';

const COST_CATEGORIES = ['Nhân công', 'Vật tư', 'Phụ liệu', 'Khác'];

interface ProjectOverviewProps {
  project: Project;
  phases: ProjectPhase[];
}

const fmt = (val: number) =>
  val ? val.toLocaleString('vi-VN') + 'đ' : '0đ';

const daysLeft = (end?: string | null) => {
  if (!end) return null;
  const diff = new Date(end).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const ProjectOverview = ({ project, phases }: ProjectOverviewProps) => {
  const costsQuery = useProjectCosts(project.id);
  const costs = costsQuery.data?.data ?? [];

  const totalKH = costs.reduce((s, c) => s + (c.thanhTienKeHoach ?? 0), 0);
  const totalTT = costs.reduce((s, c) => s + (c.thanhTienThucTe ?? 0), 0);
  const overBudget = totalKH > 0 && totalTT > totalKH;

  const remaining = daysLeft(project.ngayKetThuc);

  const costSummary = COST_CATEGORIES.map((cat) => {
    const rows = costs.filter((c) => c.loaiChiPhi === cat);
    const kh = rows.reduce((s, c) => s + (c.thanhTienKeHoach ?? 0), 0);
    const tt = rows.reduce((s, c) => s + (c.thanhTienThucTe ?? 0), 0);
    return { cat, kh, tt, over: kh > 0 && tt > kh };
  });

  const phaseSummary = phases.map((phase) => {
    const phaseCostsKH = costs.filter((c) => c.projectPhaseId === phase.id)
      .reduce((s, c) => s + (c.thanhTienKeHoach ?? 0), 0);
    const phaseCostsTT = costs.filter((c) => c.projectPhaseId === phase.id)
      .reduce((s, c) => s + (c.thanhTienThucTe ?? 0), 0);
    return { phase, phaseCostsKH, phaseCostsTT };
  });

  return (
    <div className="space-y-4">
      {/* Dashboard cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <p className="text-xs text-blue-700 font-medium">Tiến độ tổng</p>
          </div>
          <p className="text-2xl font-bold text-blue-700">{project.tienDoTongThe ?? 0}%</p>
          <div className="mt-2 h-2 w-full rounded-full bg-blue-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${project.tienDoTongThe ?? 0}%` }}
            />
          </div>
        </div>

        <div className={`rounded-lg border p-4 ${overBudget ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className={`h-4 w-4 ${overBudget ? 'text-red-600' : 'text-emerald-600'}`} />
            <p className={`text-xs font-medium ${overBudget ? 'text-red-700' : 'text-emerald-700'}`}>
              Ngân sách kế hoạch
            </p>
          </div>
          <p className={`text-lg font-bold ${overBudget ? 'text-red-700' : 'text-emerald-700'}`}>
            {fmt(totalKH)}
          </p>
          {overBudget && (
            <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle className="h-3 w-3" /> Vượt ngân sách
            </p>
          )}
        </div>

        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-orange-600" />
            <p className="text-xs text-orange-700 font-medium">Chi phí thực tế</p>
          </div>
          <p className="text-lg font-bold text-orange-700">{fmt(totalTT)}</p>
          {totalKH > 0 && (
            <p className="mt-1 text-xs text-orange-600">
              {Math.round((totalTT / totalKH) * 100)}% so với kế hoạch
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
      </div>

      {/* Cost by category */}
      <div>
        <h4 className="mb-2 font-semibold text-gray-900">Chi phí theo loại</h4>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="border-b px-3 py-2.5 text-left">Loại chi phí</th>
                <th className="border-b px-3 py-2.5 text-right">Kế hoạch</th>
                <th className="border-b px-3 py-2.5 text-right">Thực tế</th>
                <th className="border-b px-3 py-2.5 text-right">Chênh lệch</th>
                <th className="border-b px-3 py-2.5 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {costSummary.map(({ cat, kh, tt, over }) => (
                <tr key={cat} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2.5 font-medium text-gray-900">{cat}</td>
                  <td className="px-3 py-2.5 text-right text-gray-600">{kh ? fmt(kh) : '—'}</td>
                  <td className={`px-3 py-2.5 text-right font-medium ${over ? 'text-red-600' : 'text-gray-700'}`}>
                    {tt ? fmt(tt) : '—'}
                  </td>
                  <td className={`px-3 py-2.5 text-right text-xs ${over ? 'text-red-600' : tt < kh && kh > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                    {kh > 0 ? (over ? `+${fmt(tt - kh)}` : tt < kh ? `-${fmt(kh - tt)}` : '±0đ') : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {over ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs text-red-700">
                        <AlertTriangle className="h-3 w-3" /> Vượt
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-xs text-green-700">OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phases progress */}
      {phases.length > 0 && (
        <div>
          <h4 className="mb-2 font-semibold text-gray-900">Tiến độ giai đoạn</h4>
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
                          <AlertTriangle className="h-3 w-3" /> Chi phí vượt
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-2 flex-1 max-w-xs rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{ width: `${phase.tienDo}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700">{phase.tienDo}%</span>
                    </div>
                  </div>
                  {phaseCostsKH > 0 && (
                    <div className="text-right text-xs text-gray-500">
                      <p>KH: {fmt(phaseCostsKH)}</p>
                      <p className={phaseCostsTT > phaseCostsKH ? 'text-red-600 font-medium' : ''}>
                        TT: {fmt(phaseCostsTT)}
                      </p>
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
